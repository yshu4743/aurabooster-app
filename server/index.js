import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';

const PORT = process.env.PORT || 4242;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI || `http://localhost:${PORT}/auth/callback`;

const SCOPES = [
  'user-read-recently-played',
  'user-top-read',
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-private',
].join(' ');

const TOKEN_COOKIE = 'auracast_token';
const STATE_COOKIE = 'auracast_state';

const app = express();
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

function getToken(req) {
  return req.headers['x-access-token'] || req.cookies?.[TOKEN_COOKIE] || null;
}

function readCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );
}

function setCookie(res, name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.secure) parts.push('Secure');
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

/* ---------------- Spotify helpers (Node 18+ global fetch) ---------------- */

async function spotifyFetch(path, token) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Spotify ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function exchangeToken({ code, grantType, refreshToken }) {
  const body = new URLSearchParams();
  if (grantType === 'authorization_code') {
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', REDIRECT_URI);
  } else {
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
  }
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

async function withRefresh(tokens, apiCall) {
  try {
    return await apiCall(tokens.access_token);
  } catch (err) {
    if (err.status !== 401 || !tokens.refresh_token) throw err;
    const fresh = await exchangeToken({
      grantType: 'refresh_token',
      refreshToken: tokens.refresh_token,
    });
    return apiCall(fresh.access_token);
  }
}

/* ------------------------------- Routes ------------------------------- */

app.get('/auth/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  setCookie(res, STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state,
    scope: SCOPES,
    show_dialog: 'false',
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const cookies = readCookies(req);
  if (error || !code || state !== cookies[STATE_COOKIE]) {
    return res.redirect(`${FRONTEND_URL}?auth=error`);
  }
  try {
    const tokens = await exchangeToken({ code, grantType: 'authorization_code' });
    const payload = JSON.stringify(tokens);
    setCookie(res, TOKEN_COOKIE, Buffer.from(payload).toString('base64url'), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.expires_in,
      path: '/',
    });
    setCookie(res, STATE_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
    });
    res.redirect(`${FRONTEND_URL}?auth=success`);
  } catch (err) {
    console.error('callback failed:', err.message);
    res.redirect(`${FRONTEND_URL}?auth=error`);
  }
});

app.get('/api/profile', async (req, res) => {
  const rawToken = getToken(req);
  if (!rawToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify.' });
  }
  try {
    let tokens;
    try {
      tokens = JSON.parse(Buffer.from(rawToken, 'base64url').toString('utf8'));
    } catch {
      tokens = { access_token: rawToken, refresh_token: null };
    }
    const api = (fn) => withRefresh(tokens, fn);

    const [user, topTracks, recentlyPlayed, nowPlaying] = await Promise.all([
      api((t) => spotifyFetch('/me', t)),
      api((t) =>
        spotifyFetch(
          '/me/top/tracks?time_range=short_term&limit=20',
          t
        )
      ),
      api((t) =>
        spotifyFetch('/me/player/recently-played?limit=20', t)
      ),
      api((t) => spotifyFetch('/me/player/currently-playing', t)),
    ]);

    const seen = new Map();
    for (const item of topTracks?.items ?? []) {
      if (!seen.has(item.id)) {
        seen.set(item.id, {
          id: item.id,
          name: item.name,
          artists: item.artists.map((a) => a.name),
          album: item.album?.name,
          albumImage: item.album?.images?.[0]?.url ?? null,
        });
      }
    }
    for (const item of recentlyPlayed?.items ?? []) {
      const t = item.track;
      if (!seen.has(t.id)) {
        seen.set(t.id, {
          id: t.id,
          name: t.name,
          artists: t.artists.map((a) => a.name),
          album: t.album?.name,
          albumImage: t.album?.images?.[0]?.url ?? null,
          playedAt: item.played_at,
        });
      }
    }

    const trackIds = [...seen.keys()].slice(0, 20);
    let features = {};
    if (trackIds.length) {
      const feat = await api((t) =>
        spotifyFetch(`/audio-features?ids=${trackIds.join(',')}`, t)
      );
      for (const f of feat?.audio_features ?? []) {
        if (f) features[f.id] = f;
      }
    }

    res.json({
      user: { name: user.display_name, id: user.id },
      topTracks: topTracks?.items?.map((t) => ({
        id: t.id,
        name: t.name,
        artists: t.artists.map((a) => a.name),
        albumImage: t.album?.images?.[0]?.url ?? null,
      })),
      recentlyPlayed: recentlyPlayed?.items?.map((item) => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((a) => a.name),
        playedAt: item.played_at,
      })),
      nowPlaying:
        nowPlaying?.item?.id && nowPlaying.item.type === 'track'
          ? {
              id: nowPlaying.item.id,
              name: nowPlaying.item.name,
              artists: nowPlaying.item.artists.map((a) => a.name),
              albumImage: nowPlaying.item.album?.images?.[0]?.url ?? null,
            }
          : null,
      audioFeatures: features,
    });
  } catch (err) {
    console.error('profile failed:', err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/logout', (req, res) => {
  setCookie(res, TOKEN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
  res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🎧  AuraCast API listening on http://localhost:${PORT}`);
  console.log(`    Frontend: ${FRONTEND_URL}`);
  if (!process.env.SPOTIFY_CLIENT_ID) {
    console.warn('    ⚠️  SPOTIFY_CLIENT_ID is not set — copy .env.example to .env');
  }
});