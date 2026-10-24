/**
 * auraEngine.js
 * Transforms Spotify audio features (energy, valence, danceability,
 * acousticness, tempo, ...) into the visual DNA of an AuraCast story card:
 * color palettes, blob layout, grain intensity, animation speed and the
 * generated vibe title.
 */

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------ Color utils ------------------------------ */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }) {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.round(clamp(c, 0, 255) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Mix two hex colors, t in [0,1]. */
export function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/* -------------------------------- Palettes ------------------------------- */

const PALETTES = {
  kinetic: {
    name: 'kinetic',
    accent: '#FF3E5B',
    blobs: ['#FF5E3A', '#FF4D6D', '#FFB703', '#FF2E63', '#FF8E3C'],
  },
  midnight: {
    name: 'midnight',
    accent: '#7C6CF0',
    blobs: ['#2B0A4D', '#3B4A6B', '#312E81', '#0F3443', '#1A1A6B'],
  },
  pastel: {
    name: 'pastel',
    accent: '#FF9ECD',
    blobs: ['#FFC8DD', '#A5D8FF', '#FFD8BE', '#E7C9FF', '#B4F2E1'],
  },
  twilight: {
    name: 'twilight',
    accent: '#9A7BD1',
    blobs: ['#342056', '#A96B36', '#4A3B70', '#2E2B45', '#8A5A44'],
  },
};

/* ------------------------------ Mood detection --------------------------- */

function detectMood(avg) {
  const hiEnergy = avg.energy > 0.7;
  const deep = avg.valence < 0.4 && avg.acousticness > 0.45;
  const euphoric = avg.valence > 0.7;
  if (hiEnergy && !deep) return { primary: 'kinetic', secondary: null, blend: 0 };
  if (deep) {
    const secondary = hiEnergy ? 'kinetic' : avg.valence >= 0.5 ? 'pastel' : null;
    return { primary: 'midnight', secondary, blend: secondary ? 0.3 : 0 };
  }
  if (euphoric) return { primary: 'pastel', secondary: 'twilight', blend: 0.15 };
  if (avg.energy > 0.5) return { primary: 'kinetic', secondary: 'twilight', blend: 0.25 };
  if (avg.energy < 0.3) return { primary: 'midnight', secondary: 'twilight', blend: 0.35 };
  return { primary: 'twilight', secondary: 'pastel', blend: 0.2 };
}

/* ------------------------------ Vibe titles ------------------------------ */

function seededRandom(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function timeWord(hour) {
  if (hour < 5) return pick(randSeed('tw' + hour), ['3 AM', '4 AM', 'Midnight', 'After Hours']);
  if (hour < 9) return pick(randSeed('sw' + hour), ['Dawn', 'Sunrise Static', '5 AM', 'Early Light']);
  if (hour < 12) return pick(randSeed('mw' + hour), ['Morning', '10 AM', 'Blue Hour Am', 'Espresso Hour']);
  if (hour < 17) return pick(randSeed('aw' + hour), ['Golden Hour', '2 PM', 'High Noon', 'Midday Drift']);
  if (hour < 21) return pick(randSeed('ew' + hour), ['6 PM Strut', 'Dusk Drive', 'Sunset', 'Rush Hour Reverie']);
  return pick(randSeed('nw' + hour), ['Night Flight', '10 PM Static', 'Midnight Drive', 'After Dark']);
}

const KEYS = [
  'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B',
];

export function toneLabel(features) {
  const key = KEYS[features.key ?? 0] ?? 'C';
  const mode = features.mode === 1 ? 'major' : 'minor';
  const bpm = Math.round(features.tempo ?? 0);
  return `${key} ${mode} · ${bpm} BPM`;
}

/**
 * Deterministic title generator. The seed mixes the hour, the muted track id
 * and the averaged metrics so the same profile always renders the same title
 * while subtly rotating between formats as the day goes on.
 */
export function generateVibeTitle(avg, trackId, hour) {
  const rng = seededRandom(`${hour}|${trackId ?? 'none'}|${avg.energy.toFixed(2)}|${avg.valence.toFixed(2)}`);

  const energyWord =
    avg.energy > 0.7
      ? pick(rng, ['High-Energy', 'Electric', 'Incandescent', 'Kinetic'])
      : avg.energy < 0.35
        ? pick(rng, ['Low-Lying', 'Ambient', 'Weightless', 'Hushed'])
        : pick(rng, ['Rooted', 'Murmuring', 'Unfolding']);

  const valenceWord =
    avg.valence > 0.7
      ? pick(rng, ['Euphoric', 'Gilded', 'Sunlit', 'Weightless Joy'])
      : avg.valence < 0.4
        ? pick(rng, ['Melancholy', 'Wistful', 'Blue', 'Grey-Scale'])
        : pick(rng, ['Neutral', 'Quiet', 'Ambivalent']);

  const textureWord =
    avg.acousticness > 0.5
      ? pick(rng, ['Acoustic', 'Analog', 'Candlelight', 'Synthetic Nostalgia'])
      : pick(rng, ['Synthetic', 'Bass-Heavy', 'Neon', 'Glossy']);

  const bodyWord =
    avg.danceability > 0.6
      ? pick(rng, ['Flow', 'Groove', 'Strut', 'Bloom'])
      : pick(rng, ['Stillness', 'Reverie', 'Static', 'Drift']);

  const nouns = ['Nostalgia', 'Weather', 'Haze', 'Bloom', 'Gravity', 'Tide', 'Reverie', 'Static'];
  const ampm = pick(rng, ['Espresso', 'Neon', 'Low Tide', 'Cigarette Ash', 'Soft Static', 'Radiant Silence']);

  const formats = [
    () => `${timeWord(hour)} ${textureWord} ${pick(rng, nouns)}`,
    () => `${valenceWord} & ${ampm}`,
    () => `${energyWord} ${bodyWord}`,
    () => `${textureWord} ${bodyWord}`,
    () => `${timeWord(hour)} ${valenceWord}`,
  ];

  return pick(rng, formats)();
}

/* ------------------------------- Profile math ---------------------------- */

function average(featureList) {
  const keys = ['energy', 'valence', 'danceability', 'acousticness', 'tempo', 'liveness', 'instrumentalness'];
  const sum = {};
  for (const k of keys) sum[k] = 0;
  if (!featureList.length) {
    for (const k of keys) sum[k] = k === 'tempo' ? 120 : 0.5;
    return sum;
  }
  for (const f of featureList) for (const k of keys) sum[k] += f[k] ?? 0;
  for (const k of keys) sum[k] /= featureList.length;
  return sum;
}

/**
 * Flatten a raw API/mock payload into the shape auraEngine consumes.
 * data = { user, topTracks, recentlyPlayed, nowPlaying, audioFeatures }
 */
export function composeProfile(data) {
  const featureList = Object.values(data.audioFeatures ?? {});
  const avg = average(featureList);
  const track =
    data.nowPlaying ??
    data.recentlyPlayed?.[0] ??
    data.topTracks?.[0] ?? { id: 'track', name: 'Unknown', artists: ['Unknown'] };
  return {
    avg,
    track,
    hour: new Date().getHours(),
    user: data.user ?? { name: 'Listener' },
  };
}

/* ------------------------------ Main entry point ------------------------- */

/**
 * generate(config)
 *   config = { avg, track, hour, user }
 * Returns everything the StoryCard + AuraCanvas + App need to render.
 */
export function generate({ avg, track, hour, user }) {
  const mood = detectMood(avg);
  const base = PALETTES[mood.primary];
  const second = mood.secondary ? PALETTES[mood.secondary] : null;

  const blobs = base.blobs.map((c, i) =>
    second ? mixHex(c, second.blobs[i % second.blobs.length], mood.blend) : c
  );

  const energy = clamp(avg.energy, 0, 1);
  const valence = clamp(avg.valence, 0, 1);
  const acoustic = clamp(avg.acousticness, 0, 1);

  const deep = mood.primary === 'midnight';
  let grain;
  if (deep && valence < 0.4 && acoustic > 0.4) grain = 0.65 + acoustic * 0.2;
  else if (mood.primary === 'kinetic') grain = 0.28 + energy * 0.15;
  else if (mood.primary === 'pastel') grain = 0.1 + valence * 0.08;
  else grain = 0.3;
  grain = clamp(grain, 0.05, 0.85);

  const speed = clamp(0.5 + energy * 2.0 + valence * 0.5 + (1 - acoustic) * 0.4, 0.6, 3);

  const title = generateVibeTitle(avg, track.id, hour);

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const trackLine = `${track.name} — ${Array.isArray(track.artists) ? track.artists.join(', ') : track.artists}`;

  return {
    primary: mood.primary,
    accent: base.accent,
    blobs,
    grain,
    speed,
    title,
    subline: `${Math.round(energy * 100)}% energy · ${Math.round(valence * 100)}% joy · ${toneLabel(avg)}`,
    track,
    trackLine,
    date,
    time,
    user,
    stats: {
      energy: energy.toFixed(2),
      valence: valence.toFixed(2),
      danceability: avg.danceability?.toFixed?.(2),
      tempo: Math.round(avg.tempo ?? 0),
      acousticness: acoustic.toFixed(2),
    },
  };
}