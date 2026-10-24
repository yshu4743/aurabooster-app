import { useEffect, useReducer, useRef, useState } from 'react'
import {
  Home, Utensils, Bed, Dumbbell, Eye, Crown, Flame,
  Star, Camera, Volume2, VolumeX, Play, Pause, Swords, RotateCcw,
  TrendingUp, Users, Radio, Gavel, Trophy,
} from 'lucide-react'

/* ============================== CONFIG ================================= */

const ZONE_META = {
  living:    { icon: Home,     label: 'LIVING ROOM',    x: 24,  y: 18, w: 312, h: 238, floor: '#171026', accent: '#4436c0', room: true },
  kitchen:   { icon: Utensils, label: 'KITCHEN',        x: 352, y: 18, w: 196, h: 150, floor: '#200a16', accent: '#b8336a', room: true },
  garden:    { icon: Dumbbell, label: 'GARDEN / GYM',   x: 352, y: 184,w: 196, h: 308, floor: '#0e1f12', accent: '#2fa86a', room: true },
  bedroom:   { icon: Bed,      label: 'BEDROOM',        x: 564, y: 18, w: 312, h: 190, floor: '#141031', accent: '#6a4ae0', room: true },
  confession:{ icon: Eye,      label: 'CONFESSION ROOM',x: 564, y: 224,w: 156, h: 268, floor: '#2c0a1e', accent: '#ff2ea6', room: true },
  tasks:     { icon: Swords,   label: 'TASK GROUNDS',   x: 736, y: 224,w: 140, h: 268, floor: '#2b1d08', accent: '#ffb703', room: true },
}

const PALETTES = {
  mastermind:   { skin: '#f2c79b', skinS: '#dcab7b', hair: '#241542', top: '#7c3aed', topS: '#5b21b6', pants: '#1b1030', shoes: '#0d0814' },
  moralhero:    { skin: '#f8d0ad', skinS: '#e6b48d', hair: '#3d2b1f', top: '#2563eb', topS: '#1d4ed8', pants: '#16294d', shoes: '#0c1a33' },
  victim:       { skin: '#f8d6b2', skinS: '#e6bc92', hair: '#54411f', top: '#0d9488', topS: '#0f766e', pants: '#0f473f', shoes: '#08231f' },
  entertainer:  { skin: '#ffdcae', skinS: '#f0c18d', hair: '#e8993d', top: '#ff4fa8', topS: '#dc2f86', pants: '#6d1f60', shoes: '#370f31' },
  provocateur:  { skin: '#eec199', skinS: '#d6a276', hair: '#101012', top: '#ef4444', topS: '#b91c1c', pants: '#47120f', shoes: '#2a0706' },
}

const TRAITS = {
  mastermind:  { aggr: 0.55, charm: 0.85, plot: 0.95 },
  moralhero:   { aggr: 0.30, charm: 0.80, plot: 0.40 },
  victim:      { aggr: 0.25, charm: 0.60, plot: 0.35 },
  entertainer: { aggr: 0.40, charm: 0.95, plot: 0.30 },
  provocateur: { aggr: 0.92, charm: 0.50, plot: 0.70 },
}

const CAST = [
  ['ARJUN MALHOTRA', 'mastermind'],
  ['PRIYA SHARMA',    'moralhero'],
  ['VIKRAM RATHORE',  'provocateur'],
  ['SANJANA KAPOOR',  'entertainer'],
  ['ROHAN MEHRA',     'victim'],
  ['KAVYA IYER',      'mastermind'],
  ['DEV RAJPUT',      'provocateur'],
  ['MEERA JOSHI',     'moralhero'],
  ['FARHAN QURESHI',  'entertainer'],
  ['NEHA BOSE',       'victim'],
]

const FEEDBACK = [
  'BIGG BOSS EYES THE HOUSE. DRAMA IS HIGH, EMPATHY DIPS. THE NOMINATED MUST IMPRESS THE STREETS.',
  'THE PUBLIC HAS BEEN VOTING LIVE FOR 48 HOURS. TRP HITS PEAKS, ALLIANCES BLEED. SOMEONE WILL BE LOGGED OUT.',
  'FINAL DECISION LOCKED. THE EVICTED NAME WILL NOT RETURN. HOUSE, SAY YOUR GOODBYES.',
]

const EVENTS = [
  ['provocateur', 'victim',      'gabbar threatened rohan over the kitchen ration', '⚡'],
  ['entertainer', 'moralhero',   'sanjana cracked priya open, and the whole living room howled', '😂'],
  ['mastermind',  'provocateur', 'kavya brokered a truce... while quietly drafting her plan', '🕶️'],
  ['moralhero',   'victim',      'priya shielded rohan from vikram taunts', '❤️'],
  ['mastermind',  'moralhero',   'arjun and priya formed a secret understanding', '🤝'],
  ['provocateur', 'entertainer', 'vikram vs farhan: a screaming match over the pool', '😡'],
  ['victim',      'victim',      'rohan and neha cried together in the garden', '😭'],
  ['entertainer', 'mastermind',  'sanjana sassed arjun to the confession room', '💅'],
  ['provocateur', 'moralhero',   'dev accused meera of playing the saint', '🔥'],
]

const SCHEDULE = [
  { from: 0,   to: 420,  zone: 'bedroom',  label: 'DEEP NIGHT' },
  { from: 420, to: 480,  zone: 'garden',   label: 'MORNING EXERCISE' },
  { from: 480, to: 600,  zone: 'kitchen',  label: 'KITCHEN CHORES' },
  { from: 600, to: 720,  zone: 'living',   label: 'FREE ROAMING' },
  { from: 720, to: 840,  zone: 'kitchen',  label: 'LUNCH = CORE CONTENT' },
  { from: 840, to: 960,  zone: 'tasks',    label: 'DAILY TASK' },
  { from: 960, to: 1080, zone: 'garden',   label: 'FREE ROAMING' },
  { from: 1080,to: 1140, zone: 'living',   label: 'NIGHT PLOTTING' },
  { from: 1140,to: 1200, zone: 'confession', label: 'NOMINATION HOUR' },
  { from: 1200,to: 1320, zone: 'bedroom',  label: 'LATE-NIGHT RUMBLINGS' },
  { from: 1320,to: 1440, zone: 'bedroom',  label: 'SLEEP' },
]

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const rnd = (a, b) => a + Math.random() * (b - a)
const fmt = (m) => {
  const h = Math.floor(m / 60) % 24
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/* ============================== AUDIO ================================== */

const AudioFX = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC) this.ctx = new AC()
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()
  },
  tone(freq, dur, type, vol, slide, delay = 0) {
    if (!this.ctx) return
    {
      const o = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      const t0 = this.ctx.currentTime + delay
      o.type = type || 'square'
      o.frequency.setValueAtTime(freq, t0)
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      o.connect(g).connect(this.ctx.destination)
      o.start(t0)
      o.stop(t0 + dur + 0.03)
    }
  },
  pop() { this.tone(620, 0.07, 'square', 0.10, 420) },
  click() { this.tone(360, 0.05, 'triangle', 0.12, 300) },
  chime() { this.tone(523, 0.09, 'square', 0.10); this.tone(659, 0.09, 'square', 0.10, null, 0.12) },
  buzz() { this.tone(132, 0.28, 'sawtooth', 0.14, 96) },
  gong() { this.tone(96, 0.9, 'sine', 0.3, 44); this.tone(48, 1.3, 'triangle', 0.22, 26, 0.05) },
  fanfare() {
    ;[523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'square', 0.09, null, i * 0.12))
  },
}

/* =========================== STATE SHAPE =============================== */

function makeRoster() {
  return CAST.map(([name, arch], i) => {
    const r = ZONE_META.living
    return {
      id: i,
      name,
      arch,
      palette: PALETTES[arch],
      alive: true,
      defeated: false,
      captain: false,
      winCount: 0,
      speed: 0.6 + ((i * 37) % 40) / 100,
      x: r.x + r.w / 2 - 30 + (i % 3) * 22,
      y: r.y + r.h - 40 - Math.floor(i / 3) * 26,
      tx: r.x + r.w / 2 - 30 + (i % 3) * 22,
      ty: r.y + r.h - 40 - Math.floor(i / 3) * 26,
      room: 'living',
      targetRoom: 'living',
      facing: i % 2 ? -1 : 1,
      action: 0,
      arrived: true,
      emote: null,
      emotet: 0,
      energy: rnd(62, 96),
      popularity: rnd(20, 72),
      drama: rnd(20, 70),
      loyalty: rnd(25, 75),
      stress: rnd(15, 45),
    }
  })
}

const boot = () => ({
  phase: 'arrival',
  paused: false,
  day: 1,
  minutes: 420,
  speed: 2,
  trp: 41,
  trpDelta: 0.4,
  seq: 1,
  captain: null,
  immune: null,
  nano: { active: false, idx: 0, votes: {}, revealed: false, candidates: [] },
  task: null,
  weekend: null,
  evicting: null,
  won: null,
  flags: { task: false, nan: false, week: false },
  sound: true,
  contestants: makeRoster(),
  feed: [
    { id: 0, text: '🔴 LIVE. THE HOUSE DOORS SLAM SHUT. SEASON 11 SIMULATION BEGINS.', min: 420 },
  ],
})

/* ============================= REDUCER ================================= */

function scheduleZone(state) {
  const m = state.minutes
  return SCHEDULE.find((s) => m >= s.from && m < s.to) || SCHEDULE[SCHEDULE.length - 1]
}

function spotFor(zoneName, id) {
  const z = ZONE_META[zoneName]
  const ox = ((id * 47) % Math.max(20, z.w - 80)) + 18
  const oy = ((id * 31) % Math.max(16, z.h - 70)) + 26
  return { x: z.x + ox + 12, y: z.y + oy + 20 }
}

function pairInteraction(state, list) {
  const s = { ...state, contestants: list.slice() }
  if (Math.random() > 0.16) return s
  const roomers = s.contestants.filter((c) => c.alive && c.arrived && c.room === s.contestants[0]?.room)
  void roomers
  const candidates = s.contestants.filter((c) => c.alive && c.arrived)
  if (candidates.length < 2) return s
  const a = candidates[Math.floor(Math.random() * candidates.length)]
  const others = candidates.filter((c) => c.id !== a.id && c.room === a.room && c.arrived && c.action < 2)
  if (!others.length) return s
  const b = others[Math.floor(Math.random() * others.length)]
  const pool = EVENTS.filter((e) => (e[0] === a.arch || e[1] === a.arch) || (e[0] === b.arch || e[1] === b.arch))
  const chosen = pool[Math.floor(Math.random() * pool.length)] || EVENTS[0]
  a.action = 1
  b.action = 1
  a.facing = 1
  b.facing = -1
  a.emote = chosen[3]
  a.emotet = 4
  b.emote = chosen[3] === '⚡' ? '⚡' : '💬'
  b.emotet = 4
  a.drama = clamp(a.drama + 3, 0, 100)
  b.drama = clamp(b.drama + 4, 0, 100)
  a.stress = clamp(a.stress + 7, 0, 100)
  b.stress = clamp(b.stress + 7, 0, 100)
  if (TRAITS[a.arch].plot > 0.8 || TRAITS[b.arch].plot > 0.8) {
    a.loyalty = clamp(a.loyalty + 2, 0, 100)
    b.loyalty = clamp(b.loyalty + 2, 0, 100)
  }
  if (a.arch === 'entertainer' || b.arch === 'entertainer') {
    a.drama = clamp(a.drama - 3, 0, 100)
    b.drama = clamp(b.drama - 3, 0, 100)
  }
  if (a.arch === 'provocateur' && (b.arch === 'victim' || b.arch === 'moralhero')) a.popularity = clamp(a.popularity - 2, 0, 100)
  s.trp = clamp(s.trp + rnd(1, 3), 5, 100)
  s.feed = [{ id: s.seq++, text: `${chosen[3]} ${a.name} X ${b.name}: ${chosen[2]}`, min: s.minutes }, ...s.feed].slice(0, 30)
  return s
}

function movePeople(s) {
  const list = s.contestants.map((c) => {
    const n = { ...c }
    if (!n.alive || n.arrived || n.defeated) return n
    const dx = n.tx - n.x
    const dy = n.ty - n.y
    const dist = Math.hypot(dx, dy)
    const step = 1.6 + s.speed * 0.9
    if (dist <= step + 0.5) {
      n.x = n.tx
      n.y = n.ty
      n.arrived = true
      n.action = n.action >= 0 ? n.action : 0
    } else {
      n.x += (dx / dist) * step
      n.y += (dy / dist) * step
      n.facing = dx > 0 ? 1 : -1
    }
    return n
  })
  return { ...s, contestants: list }
}

function tripPeople(s) {
  const sl = s.contestants.map((c) => {
    const n = { ...c }
    if (!n.alive || n.defeated) return n
    const zone = scheduleZone(s)
    n.targetRoom = zone.zone
    let action = 0
    if (zone.zone === 'garden') action = 2
    else if (zone.zone === 'kitchen') action = 3
    else if (zone.zone === 'tasks' && n.action === 3 && n.arrived) action = 2
    else if (zone.zone === 'confession') {
      action = 4
      n.emote = '✖'
      n.emotet = 2
    } else if (zone.zone === 'bedroom' && s.minutes > 1200) {
      action = 0
    } else if (zone.zone === 'living' && s.minutes > 1020) {
      action = Math.random() > 0.55 ? 1 : 0
    }
    if (s.phase === 'arrival') {
      action = 0
      n.targetRoom = 'living'
    }
    if (n.room !== n.targetRoom) {
      const target = spotFor(n.targetRoom, n.id)
      n.tx = target.x
      n.ty = target.y
      n.arrived = false
      n.action = Math.floor(Math.random() * 2)
    } else if (n.arrived && n.action !== 4) {
      n.action = action
    }
    n.room = n.arrived ? n.room : zone.zone
    return n
  })
  return { ...s, contestants: sl }
}

function tickStats(s) {
  const sched = scheduleZone(s)
  return {
    ...s,
    contestants: s.contestants.map((c) => {
      const n = { ...c }
      if (!n.alive) return n
      let E = n.energy, X = n.stress, P = n.popularity, D = n.drama
      if (sched.zone === 'bedroom') { E = clamp(E + 4, 0, 100); X = clamp(X - 3, 0, 100) }
      else if (sched.zone === 'garden') { E = clamp(E - 1, 0, 100); X = clamp(X - 2, 0, 100) }
      else if (sched.zone === 'kitchen') { E = clamp(E + 1, 0, 100); X = clamp(X + 1, 0, 100) }
      else if (sched.zone === 'tasks') { E = clamp(E - 3.5, 0, 100); X = clamp(X + 3, 0, 100) }
      else { E = clamp(E - 0.4, 0, 100); X = clamp(X - 0.3, 0, 100) }
      if (n.emote) {
        n.emotet -= 1
        if (n.emotet <= 0) { n.emote = null; n.action = Math.random() > 0.5 ? 0 : 1 }
      }
      P += (n.arch === 'entertainer' ? 0.5 : 0) + (n.winCount ? 0.2 : 0)
      D = clamp(D - (n.arch === 'moralhero' ? 0.6 : 0.25), 0, 100)
      return { ...n, energy: E, stress: X, popularity: clamp(P, 0, 100), drama: clamp(D + rnd(-0.4, 0.6), 0, 100) }
    }),
  }
}

function tickTrp(s) {
  const alive = s.contestants.filter((c) => c.alive)
  const dAvg = alive.reduce((a, c) => a + c.drama, 0) / Math.max(1, alive.length)
  const pAvg = alive.reduce((a, c) => a + c.popularity, 0) / Math.max(1, alive.length)
  const drift = (dAvg * 0.4 + pAvg * 0.15 - s.trp * 0.5) * 0.02
  const t = clamp(s.trp + drift + rnd(-0.3, 0.4), 5, 100)
  return { ...s, trp: t, trpDelta: t - s.trp }
}

function startTask(s) {
  const alive = s.contestants.filter((c) => c.alive && c.id !== s.captain)
  if (alive.length < 2) return s
  const sorted = [...alive].sort((a, b) => b.energy - a.energy)
  const one = sorted[0]
  const two = sorted[1] || sorted[0]
  return {
    ...s,
    phase: 'task',
    flags: { ...s.flags, task: true },
    task: {
      runners: [one.id, two.id],
      home: null,
      power: [Math.floor(rnd(5, 18)), Math.floor(rnd(5, 18))],
      pick: null,
      burst: 0,
    },
    feed: [{ id: s.seq++, text: `⚔️ CAPTAINCY TASK: ${one.name} vs ${two.name}. RATINGS FIRST, REST LATER.`, min: s.minutes }, ...s.feed].slice(0, 30),
  }
}

function taskTick(s) {
  const t = s.task
  if (!t) return s
  const cpu = t.pick === null ? 0 : t.pick === 0 ? 1 : 0
  t.power[cpu] = clamp(t.power[cpu] + rnd(1.5, 5.5), 0, 100)
  if (t.pick !== null) t.burst -= 0.4
  const wIdx = t.power[0] >= 100 ? 0 : t.power[1] >= 100 ? 1 : -1
  if (wIdx === -1) return { ...s, task: t }
  const winnerId = t.runners[wIdx]
  const winner = s.contestants.find((c) => c.id === winnerId)
  const loseId = t.runners[1 - wIdx]
  return {
    ...s,
    phase: 'daily',
    task: null,
    captain: winnerId,
    immune: winnerId,
    flags: { ...s.flags, task: true },
    trp: clamp(s.trp + 6, 5, 100),
    contestants: s.contestants.map((c) => {
      if (c.id === winnerId) return { ...c, captain: true, winCount: (c.winCount || 0) + 1, popularity: clamp(c.popularity + 8, 0, 100), energy: clamp(c.energy + 15, 0, 100) }
      if (c.id === loseId) return { ...c, stress: clamp(c.stress + 14, 0, 100), energy: clamp(c.energy - 8, 0, 100) }
      if (c.captain && c.id !== winnerId) return { ...c, captain: false }
      return c
    }),
    feed: [
      {
        id: s.seq++,
        text: `👑 ${winner.name} WINS THE TASK. CAPTAINC + IMMUNITY. THE HOUSE RUMBLES.`,
        min: s.minutes,
      },
      ...s.feed,
    ].slice(0, 30),
  }
}

function startNan(s) {
  const voters = s.contestants.filter((c) => c.alive && c.id !== s.immune)
  if (voters.length < 2) return { ...s, phase: 'daily', flags: { ...s.flags, nan: true } }
  return {
    ...s,
    phase: 'nomination',
    flags: { ...s.flags, nan: true },
    nano: { active: true, idx: 0, votes: {}, revealed: false, candidates: [] },
    feed: [{ id: s.seq++, text: '🎙️ CONFESSION ROOM OPENS. SECRET BALLOT. TWO NOMINATIONS EACH.', min: s.minutes }, ...s.feed].slice(0, 30),
  }
}

function startWeekend(s) {
  return {
    ...s,
    phase: 'weekend',
    flags: { ...s.flags, week: true },
    weekend: { step: 0, votes: {}, evicted: null },
  }
}

function computeWeekendVotes(s) {
  const alive = s.contestants.filter((c) => c.alive)
  const raw = alive.map((c) => ({
    id: c.id,
    v: 10 + c.popularity * 0.55 + c.drama * 0.2 + (c.id === s.captain ? 9 : 0) + rnd(0, 45),
  }))
  const sum = raw.reduce((a, r) => a + r.v, 0)
  const votes = raw.map((r) => ({ ...r, pct: (r.v / sum) * 100 }))
  const candidates = alive.filter((c) => (s.nano.candidates || []).includes(c.id))
  let evicted
  if (candidates.length) {
    const cands = candidates.map((c) => ({ id: c.id, pct: (votes.find((v) => v.id === c.id)?.pct) || 0 }))
    cands.sort((a, b) => a.pct - b.pct)
    evicted = cands[0].id
  } else {
    votes.sort((a, b) => a.pct - b.pct)
    evicted = votes[0].id
  }
  return { ...s, weekend: { ...s.weekend, votes, evicted } }
}

function doEvict(s) {
  const wid = s.weekend?.evicted
  if (wid == null) return s
  const target = s.contestants.find((c) => c.id === wid)
  return {
    ...s,
    phase: 'evicting',
    evicting: { id: wid, timer: 5 },
    trp: clamp(s.trp + rnd(4, 8), 5, 100),
    contestants: s.contestants.map((c) =>
      c.id === wid ? { ...c, defeated: true, action: 5, emote: '💀', emotet: 5 } : c
    ),
    feed: [
      { id: s.seq++, text: `📉 ${target?.name || '?'} FACES THE GONG. THE PUBLIC HAS SPOKEN.`, min: s.minutes },
      ...s.feed,
    ].slice(0, 30),
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'CPY': return { ...state }
    case 'SET_PHASE': return { ...state, phase: action.phase }
    case 'DAY_STEP':
    case 'TICK': {
      let s = { ...state, contestants: state.contestants.map((c) => ({ ...c })) }

      if (s.phase === 'evicting') {
        s.evicting.timer -= 1
        if (s.evicting.timer <= 0) {
          const dead = s.evicting.id
          s.contestants = s.contestants.map((c) => (c.id === dead ? { ...c, alive: false } : c))
          const remaining = s.contestants.filter((c) => c.alive).length
          if (remaining === 1) {
            const winner = s.contestants.find((c) => c.alive)
            s.won = winner
            s.phase = 'gameover'
            s.feed = [{ id: s.seq++, text: `🏆 ${winner.name} SURVIVES IT ALL. THE WINNER OF BIGG BOSS HOUSE SIM!`, min: s.minutes }, ...s.feed].slice(0, 30)
            return s
          }
          if (s.day >= 28) {
            const winner = [...s.contestants.filter((c) => c.alive)].sort((a, b) => b.popularity - a.popularity)[0]
            s.won = winner
            s.phase = 'gameover'
            s.feed = [{ id: s.seq++, text: `🏆 SEASON 28 FINALE. ${winner.name} CROWNED BY RATINGS.`, min: s.minutes }, ...s.feed].slice(0, 30)
            return s
          }
          s.day += 1
          s.minutes = 420
          s.flags = { task: false, nan: false, week: false }
          s.captain = null
          s.immune = null
          s.evicting = null
          s.phase = 'daily'
          s.feed = [{ id: s.seq++, text: `🚪 ${s.contestants.find((c) => c.id === dead)?.name} LOGGED OUT. ${remaining} REMAIN.`, min: s.minutes }, ...s.feed].slice(0, 30)
        }
        return s
      }

      if (s.phase === 'task') {
        s = taskTick({ ...s, minutes: s.minutes + 3 * s.speed })
        return s
      }

      if (s.phase !== 'daily' && s.phase !== 'arrival') return s

      s.minutes += 4 * s.speed
      if (s.minutes >= 1440) {
        s.day += 1
        s.minutes = 0
        s.flags = { task: false, nan: false, week: false }
        s.captain = null
        if (s.day > 28) {
          const winner = [...s.contestants.filter((c) => c.alive)].sort((a, b) => b.popularity - a.popularity)[0]
          s.won = winner
          s.phase = 'gameover'
          return s
        }
      }
      s = tripPeople(s)
      s = movePeople(s)
      s = pairInteraction(s)
      s = tickStats(s)
      s = tickTrp(s)
      s.contestants = s.contestants.map((c) =>
        c.emote ? { ...c, emotet: c.emotet - 0.5 } : c
      )
      s.contestants = s.contestants.map((c) => {
        if (c.emote && c.emotet <= 0) return { ...c, emote: null, action: Math.random() > 0.5 ? 0 : 1 }
        return c
      })

      if (s.phase === 'arrival' && s.minutes >= 500) s.phase = 'daily'

      if (s.phase === 'daily') {
        if (s.minutes >= 840 && s.minutes < 860 && !s.flags.task && s.contestants.filter((c) => c.alive).length >= 2) {
          s = startTask(s)
        }
        if (s.minutes >= 1140 && s.minutes < 1160 && !s.flags.nan && s.contestants.filter((c) => c.alive).length >= 4) {
          s = startNan(s)
        }
        if (s.minutes >= 1080 && s.minutes < 1100 && s.day % 7 === 0 && !s.flags.week && s.contestants.filter((c) => c.alive).length >= 2) {
          s = startWeekend(s)
        }
      }
      return s
    }

    case 'TASK_PICK':
      if (state.task) return { ...state, task: { ...state.task, pick: action.idx } }
      return state

    case 'TASK_PUSH':
      if (!state.task) return state
      {
        const t = { ...state.task }
        t.power[action.idx] = clamp(t.power[action.idx] + 7 + rnd(0, 5), 0, 100)
        t.burst = 1
        return { ...state, task: t }
      }

    case 'NAN_VOTE':
      {
        const nano = { ...state.nano, votes: { ...state.nano.votes, [action.voter]: action.picks } }
        return { ...state, nano }
      }

    case 'NAN_NEXT':
      {
        const nano = { ...state.nano, idx: state.nano.idx + 1 }
        return { ...state, nano }
      }

    case 'NAN_REVEAL':
      {
        const counts = {}
        state.contestants.filter((c) => c.alive).forEach((c) => (counts[c.id] = 0))
        Object.values(state.nano.votes).flat().forEach((id) => {
          if (counts[id] != null) counts[id] += 1
        })
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
        const candidates = sorted.slice(0, 2).map(([id]) => Number(id))
        return { ...state, nano: { ...state.nano, revealed: true, candidates } }
      }

    case 'NAN_DONE':
      return {
        ...state,
        phase: 'daily',
        minutes: 1200,
        nano: { ...state.nano, active: false },
        feed: [{ id: state.seq++, text: `🗳️ NOMINATED: ${state.nano.candidates.map((id) => state.contestants.find((c) => c.id === id)?.name).join(' & ')}.`, min: state.minutes }, ...state.feed].slice(0, 30),
      }

    case 'WEEK_NEXT':
      {
        const w = state.weekend
        if (!w) return state
        if (w.step < 3) {
          const gw = { ...w, step: w.step + 1 }
          return { ...state, weekend: gw }
        }
        const withVotes = computeWeekendVotes(state)
        return { ...state, weekend: { ...withVotes.weekend, step: 4 } }
      }

    case 'WEEK_EVICT':
      return doEvict(state)

    case 'SOUND': return { ...state, sound: !state.sound }
    case 'SPEED': return { ...state, speed: action.speed }
    case 'PAUSE': return { ...state, paused: !state.paused }
    case 'RESET': return boot()
    default: return state
  }
}

/* ========================= CANVAS SPRITE RENDER ========================= */

const S = 4

function drawGame(ctx, s, canvas, t) {
  if (!s) return
  const W = canvas.width
  const H = canvas.height
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#0d0814'
  ctx.fillRect(0, 0, W, H)

  for (const z of Object.values(ZONE_META)) {
    ctx.fillStyle = z.floor
    ctx.fillRect(z.x, z.y, z.w, z.h)
    ctx.fillStyle = 'rgba(255,255,255,0.035)'
    for (let gx = z.x; gx < z.x + z.w; gx += 24)
      for (let gy = z.y; gy < z.y + z.h; gy += 24)
        if (((gx + gy) / 24) % 2 === 0) ctx.fillRect(gx, gy, 24, 24)
    ctx.strokeStyle = z.accent
    ctx.lineWidth = 3
    ctx.strokeRect(z.x, z.y, z.w, z.h)
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'
    ctx.lineWidth = 6
    ctx.strokeRect(z.x - 3, z.y - 3, z.w + 6, z.h + 6)
  }

  const cv = ZONE_META.confession
  ctx.fillStyle = '#ff2ea6'
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'left'
  for (let i = 0; i < 3; i++) ctx.fillText('✖ ✖ ✖ SECRET BALLOT', cv.x + 8, cv.y + 48 + i * 22)
  ctx.globalAlpha = 1

  ctx.textAlign = 'center'
  ctx.font = 'bold 12px monospace'
  for (const z of Object.values(ZONE_META)) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(z.x + z.w / 2 - ctx.measureText(z.label).width / 2 - 6, z.y + 12, ctx.measureText(z.label).width + 12, 17)
    ctx.fillStyle = z.accent
    ctx.font = 'bold 11px monospace'
    ctx.fillText(z.label, z.x + z.w / 2, z.y + 25)
    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillText('ROOM', z.x + z.w / 2, z.y + 37)
  }

  for (const z of Object.values(ZONE_META)) {
    ctx.strokeStyle = '#0d0814'
    ctx.lineWidth = 2
    if (z.x > 24) {
      ctx.beginPath(); ctx.moveTo(z.x, z.y + 26); ctx.lineTo(z.x, z.y + 34); ctx.stroke()
      ctx.strokeStyle = z.accent
      ctx.font = '8px monospace'
      ctx.fillStyle = z.accent
      ctx.fillText('DOOR', z.x - 6, z.y + 30)
    }
  }

  const ordered = [...s.contestants.filter((c) => c.alive), ...s.contestants.filter((c) => !c.alive)]
  ordered.sort((a, b) => a.y - b.y)
  for (const c of ordered) {
    if (!c.alive) continue
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(c.x, c.y + 2, 16, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    drawSprite(ctx, c, t, c.defeated)
    if (!c.defeated && c.action !== 5) {
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      drawName(ctx, c)
    }
    if (c.defeated) drawLogoOut(ctx, c, t)
    if (c.captain) {
      ctx.font = '12px monospace'
      ctx.fillStyle = '#ffd700'
      ctx.fillText('👑', c.x, c.y - 54)
    }
    if (c.emote) drawBubble(ctx, c, t)
  }

  if (s.phase === 'nomination' && !s.nano.revealed && !s.nano.active) {
    ctx.fillStyle = '#ff2ea6'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('● CONFESSION LIVE ●', W / 2, 16)
  }
  ctx.textAlign = 'start'
  ctx.font = '10px monospace'
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(W / 2 - 130, H - 24, 260, 18)
  const nowLabel = SCHEDULE.find((x) => s.minutes >= x.from && s.minutes < x.to)?.label || ''
  ctx.fillStyle = '#ff2ea6'
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`NOW: ${nowLabel}`, W / 2, H - 10)
}

function drawName(ctx, c) {
  const w = ctx.measureText(c.name).width + 10
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(c.x - w / 2, c.y + 6, w, 13)
  ctx.fillStyle = c.palette.topS
  ctx.font = 'bold 8px monospace'
  ctx.fillText(c.name, c.x, c.y + 16)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(c.x - w / 2, c.y + 19, w, 4)
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(c.x - w / 2, c.y + 19, w * (c.energy / 100), 4)
}

function drawBubble(ctx, c) {
  const age = 5 - c.emotet
  const rise = age * 9
  const alpha = c.emotet > 1 ? 1 : Math.max(0, c.emotet)
  const bx = c.x
  const by = c.y - 66 - rise
  ctx.globalAlpha = alpha
  ctx.font = '16px serif'
  const tw = ctx.measureText(c.emote).width
  ctx.fillStyle = 'rgba(255,255,255,0.97)'
  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = 2
  roundRect(ctx, bx - tw / 2 - 9, by - 18, tw + 18, 22, 6)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#111'
  ctx.font = '16px serif'
  ctx.textAlign = 'center'
  ctx.fillText(c.emote, bx, by)
  ctx.beginPath()
  ctx.moveTo(bx - 6, by + 4)
  ctx.lineTo(bx + 6, by + 4)
  ctx.lineTo(bx, by + 12)
  ctx.closePath()
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawLogoOut(ctx, c, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t / 160)
  ctx.globalAlpha = 0.55 + 0.45 * Math.abs(pulse > 0 ? 1 : 0)
  ctx.shadowColor = '#ff2ea6'
  ctx.shadowBlur = 18 + pulse * 22
  ctx.fillStyle = '#ff2ea6'
  ctx.font = 'bold 12px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('LOGOUT', c.x, c.y - 66)
  ctx.fillStyle = '#ffd700'
  ctx.font = 'bold 10px monospace'
  ctx.fillText(`${c.name} EVICTED`, c.x, c.y - 54)
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawSprite(ctx, c, t, defeated) {
  const P = c.palette
  const facing = c.facing >= 0
  const bob = c.action === 0 && !defeated && Math.floor(t / 420) % 2 === 0 ? -S : 0
  const X = c.x - 6 * S
  const Y = c.y + bob
  const px = (cc, rr, w, h, col) => {
    const mx = facing ? cc : 12 - cc - w
    ctx.fillStyle = col
    ctx.fillRect(X + mx * S, Y + rr * S, w * S, h * S)
  }

  const skin = P.skin
  const skinS = P.skinS
  const hair = P.hair
  const top = P.top
  const topS = P.topS
  const pants = P.pants
  const shoes = P.shoes

  if (defeated) {
    px(1, -8, 3, 4, hair)
    px(1, -7, 3, 3, skin)
    px(4, -8, 8, 3, top)
    px(4, -8, 3, 2, topS)
    px(4, -5, 8, 2, pants)
    px(10, -5, 3, 2, shoes)
    return
  }

  const a = c.action

  px(4, -9, 4, 2, skin)
  px(4, -13, 4, 4, hair)
  px(4, -12, 4, 3, skin)
  px(5, -11, 1, 1, '#0d0814')
  px(6, -11, 1, 1, '#0d0814')
  px(4, -10, 4, 1, skinS)
  px(3, -8, 6, 4, top)
  px(3, -7, 6, 1, topS)
  px(4, -5, 2, 1, '#ffd700')
  px(6, -5, 2, 1, '#ffd700')
  px(4, -4, 2, 4, pants)
  px(6, -4, 2, 4, pants)
  px(3, -1, 3, 1, shoes)
  px(6, -1, 3, 1, shoes)

  if (a === 1) {
    px(9, -8, 2, 4, top)
    px(10, -5, 1, 1, skinS)
    px(2, -9, 2, 2, top)
    px(2, -11, 2, 1, skin)
    px(1, -11, 1, 1, skinS)
  } else if (a === 2) {
    px(1, -7, 3, 2, top)
    px(8, -7, 3, 2, top)
    px(8, -7, 2, 1, skinS)
    px(3, -8, 6, 1, '#9aa0b4')
    px(1, -10, 2, 2, '#6b7088')
    px(9, -10, 2, 2, '#6b7088')
  } else if (a === 3) {
    ctx.save()
    ctx.translate(X + 6 * S, Y - 6 * S)
    ctx.rotate(0.6)
    ctx.fillStyle = top
    ctx.fillRect(0, 0, 2 * S, 6 * S)
    px(6, -8, 2, 3, top)
    ctx.fillStyle = '#c9a261'
    ctx.fillRect(10 * S, 2 * S, 3 * S, 2 * S)
    ctx.restore()
    px(2, -8, 2, 4, top)
  } else if (a === 4) {
    px(1, -12, 2, 3, top)
    px(1, -13, 2, 1, skin)
    px(8, -8, 2, 4, top)
    ctx.fillStyle = '#ff2ea6'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('✖', c.x, c.y - 56)
  } else if (a === 5) {
    px(2, -8, 2, 4, top)
    px(8, -8, 2, 4, top)
    px(7, -6, 4, 2, topS)
    ctx.globalAlpha = 0.5
    px(4, -13, 4, 4, hair)
    ctx.globalAlpha = 1
  } else {
    px(2, -8, 2, 4, top)
    px(8, -8, 2, 4, top)
    px(2, -5, 2, 1, skinS)
    px(8, -5, 2, 1, skinS)
  }
}

/* =========================== REACT COMPONENT =========================== */

function StatBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-[9px] font-bold tracking-wider text-zinc-500">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-[2px] border border-black/60 bg-black/40">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${Math.round(value)}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </div>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, boot)
  const canvasRef = useRef(null)
  const stateRef = useRef(state)
  const soundRef = useRef(state.sound)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { soundRef.current = state.sound }, [state.sound])

  useEffect(() => {
    let raf
    const loop = (tm) => {
      const cv = canvasRef.current
      if (cv) {
        const ctx = cv.getContext('2d')
        drawGame(ctx, stateRef.current, cv, tm)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (state.paused) return
    const iv = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(iv)
  }, [state.paused, state.phase])

  const s = state
  const alive = s.contestants.filter((c) => c.alive)
  const zl = SCHEDULE.find((x) => s.minutes >= x.from && s.minutes < x.to)?.label || ''
  const cands = (c) => s.contestants.filter((x) => x.alive && x.id !== c && x.id !== s.immune)

  const play = (fn) => {
    AudioFX.init()
    if (soundRef.current) fn()
  }
  const onReset = () => { play(AudioFX.click); dispatch({ type: 'RESET' }) }
  const onStart = () => { play(AudioFX.fanfare); dispatch({ type: 'SET_PHASE', phase: 'daily' }) }
  const onSound = () => { AudioFX.init(); dispatch({ type: 'SOUND' }) }
  const onVote = (voter, picks) => {
    play(AudioFX.pop)
    dispatch({ type: 'NAN_VOTE', voter, picks })
    dispatch({ type: 'NAN_NEXT' })
  }
  const onReveal = () => { play(AudioFX.buzz); dispatch({ type: 'NAN_REVEAL' }) }
  const onNanDone = () => { play(AudioFX.chime); dispatch({ type: 'NAN_DONE' }) }
  const onTaskPick = (idx) => { play(AudioFX.pop); dispatch({ type: 'TASK_PICK', idx }) }
  const onTaskPush = (idx) => { play(AudioFX.click); dispatch({ type: 'TASK_PUSH', idx }); setCooldown(idx) }

  useEffect(() => {
    if (cooldown !== null && cooldown !== 0) {
      const id = setTimeout(() => setCooldown(0), 260)
      return () => clearTimeout(id)
    }
  }, [cooldown])

  const runner = (id) => s.contestants.find((c) => c.id === id)

  return (
    <div className="min-h-screen bg-[#0d0814] text-white font-mono selection:bg-[#ff2ea6] selection:text-white">
      <div className="mx-auto max-w-[1480px] p-3 md:p-5">

        {/* ------------------------- HEADER ------------------------- */}
        <header className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border-4 px-4 py-3"
          style={{ borderColor: '#ff2ea6', background: 'linear-gradient(90deg,#170b26,#241036 55%,#170b26)', boxShadow: '0 0 0 2px #0d0814, 0 0 24px rgba(255,46,166,.35)' }}>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border-2 border-[#ffd700] bg-black/40 text-[#ffd700] text-xl font-black">BB</div>
            <div>
              <h1 className="text-base font-black tracking-[0.2em] text-[#ffd700] sm:text-lg" style={{ textShadow: '0 0 12px #ffd700' }}>
                BIGG BOSS <span className="text-[#ff2ea6]">HOUSE SIM</span>
              </h1>
              <p className="text-[10px] tracking-widest text-zinc-500">SEASON 11 · 2D REALITY SIMULATION</p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px]">
            <Chip tone="#ffd700">DAY {s.day}</Chip>
            <Chip tone="#9d6bff">{fmt(s.minutes)}</Chip>
            <Chip tone="#ff2ea6">{zl}</Chip>
            <Chip tone="#4ade80">
              <TrendingUp className="mr-1 inline h-3 w-3" /> TRP {s.trp.toFixed(1)}
              <span className="ml-1" style={{ color: s.trpDelta >= 0 ? '#4ade80' : '#f87171' }}>
                {s.trpDelta >= 0 ? '+' : ''}{s.trpDelta.toFixed(1)}
              </span>
            </Chip>
            {s.captain != null && (
              <Chip tone="#ffd700"><Crown className="mr-1 inline h-3 w-3" />{runner(s.captain)?.name.split(' ')[0]}</Chip>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => { play(AudioFX.click); dispatch({ type: 'SPEED', speed: 1 }) }}
              className={`h-8 w-8 rounded-md border-2 text-[11px] font-black ${s.speed === 1 ? 'border-[#ff2ea6] text-[#ff2ea6] bg-black/50' : 'border-white/20 text-zinc-500'}`}>1x</button>
            <button onClick={() => { play(AudioFX.click); dispatch({ type: 'SPEED', speed: 2 }) }}
              className={`h-8 w-8 rounded-md border-2 text-[11px] font-black ${s.speed === 2 ? 'border-[#ff2ea6] text-[#ff2ea6] bg-black/50' : 'border-white/20 text-zinc-500'}`}>2x</button>
            <button onClick={() => { play(AudioFX.click); dispatch({ type: 'SPEED', speed: 4 }) }}
              className={`h-8 w-8 rounded-md border-2 text-[11px] font-black ${s.speed === 4 ? 'border-[#ff2ea6] text-[#ff2ea6] bg-black/50' : 'border-white/20 text-zinc-500'}`}>4x</button>
            <button onClick={() => { play(AudioFX.click); dispatch({ type: 'PAUSE' }) }}
              className="grid h-8 w-8 place-items-center rounded-md border-2 border-white/20 text-zinc-300 hover:border-[#ff2ea6]">
              {s.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button onClick={onSound}
              className="grid h-8 w-8 place-items-center rounded-md border-2 border-white/20 text-zinc-300 hover:border-[#ff2ea6]">
              {s.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button onClick={onReset}
              className="grid h-8 w-8 place-items-center rounded-md border-2 border-white/20 text-zinc-300 hover:border-[#ffd700]">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* --------------------------- MAIN --------------------------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* MAP CARD */}
          <section className="relative lg:col-span-2 overflow-hidden rounded-2xl border-4"
            style={{ borderColor: '#241036', background: '#0d0814', boxShadow: '0 0 40px rgba(124,58,237,.25)' }}>
            <canvas
              ref={canvasRef}
              width={900}
              height={520}
              className="block w-full"
              style={{ imageRendering: 'pixelated', aspectRatio: '900/520' }}
            />
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 text-[10px] tracking-widest text-[#ff2ea6]">
              <Camera className="h-3.5 w-3.5 animate-pulse" /> LIVE FEED
            </div>
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-[10px] text-zinc-300">
              <Users className="h-3.5 w-3.5 text-[#4ade80]" /> {alive.length}/10 IN HOUSE
            </div>
          </section>

          {/* SIDEBAR */}
          <aside className="flex flex-col gap-4">

            {/* TRP */}
            <section className="rounded-xl border-2 p-4" style={{ borderColor: '#241036', background: '#120b1e' }}>
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-black tracking-widest text-[#ffd700]">
                <Radio className="h-4 w-4" /> LIVE TRP RATINGS
              </h3>
              <div className="mb-1 flex items-end justify-between">
                <span className="text-3xl font-black text-[#ff2ea6]" style={{ textShadow: '0 0 14px #ff2ea6' }}>{s.trp.toFixed(1)}</span>
                <span className="text-[10px] text-zinc-500">VS CHANNEL PEAK</span>
              </div>
              <StatBar label="TRP" value={s.trp} color="#ff2ea6" />
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <MiniStat label="DRAMA" value={alive.reduce((a, c) => a + c.drama, 0) / Math.max(1, alive.length)} color="#f59e0b" />
                <MiniStat label="POPULARITY" value={alive.reduce((a, c) => a + c.popularity, 0) / Math.max(1, alive.length)} color="#4ade80" />
              </div>
            </section>

            {/* HOUSEMATES */}
            <section className="roundui flex max-h-[420px] flex-col rounded-xl border-2 p-4" style={{ borderColor: '#241036', background: '#120b1e' }}>
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-black tracking-widest text-[#ffd700]">
                <Users className="h-4 w-4" /> HOUSEMATES
              </h3>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {s.contestants.map((c) => {
                  const aliveC = c.alive
                  return (
                    <div key={c.id} className="rounded-lg border-2 p-3" style={{
                      borderColor: aliveC ? (c.captain ? '#ffd700' : '#2a1c4a') : '#1a1128',
                      background: aliveC ? '#0d0814' : 'rgba(0,0,0,.4)',
                      opacity: aliveC ? 1 : 0.45,
                    }}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-black tracking-wide"
                          style={{ color: aliveC ? '#fff' : '#555' }}>
                          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: c.palette.topS }} />
                          {c.name}
                          {c.captain && <Crown className="h-3 w-3 text-[#ffd700]" />}
                        </span>
                        <span className="rounded bg-black/50 px-1.5 py-0.5 text-[9px] uppercase text-zinc-400">{c.arch}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        <MiniBar label="EN" value={c.energy} color="#4ade80" />
                        <MiniBar label="POP" value={c.popularity} color="#ffd700" />
                        <MiniBar label="DRM" value={c.drama} color="#f59e0b" />
                        <MiniBar label="LOY" value={c.loyalty} color="#9d6bff" />
                        <MiniBar label="STR" value={c.stress} color="#f87171" />
                        <MiniBar label="WIN" value={c.winCount || 0} color="#ff2ea6" max={5} />
                      </div>
                    </div>
                  )
                })}
                {!alive.length && (
                  <div className="py-8 text-center text-sm text-zinc-500">SEASON CLOSED</div>
                )}
              </div>
            </section>

            {/* FEED */}
            <section className="rounded-xl border-2 p-4" style={{ borderColor: '#241036', background: '#120b1e' }}>
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-black tracking-widest text-[#ff2ea6]">
                <Gavel className="h-4 w-4" /> LIVE FEED DOCKET
              </h3>
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {s.feed.slice(0, 10).map((f) => (
                  <div key={f.id} className="flex items-start gap-2 rounded border border-white/5 bg-black/30 px-2 py-1.5 text-[10px] leading-snug text-zinc-300">
                    <span className="shrink-0 tabular-nums text-[#ffd700]">{fmt(f.min)}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {/* ======================= OVERLAYS ======================= */}

        {/* ARRIVAL */}
        {s.phase === 'arrival' && (
          <Overlay>
            <div className="max-w-lg text-center">
              <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full border-4 border-[#ffd700] bg-black/40 text-4xl font-black text-[#ffd700]" style={{ boxShadow: '0 0 40px #ffd700', textShadow: '0 0 20px #ffd700' }}>BB</div>
              <h2 className="text-3xl font-black tracking-widest text-[#ffd700]" style={{ textShadow: '0 0 18px #ffd700' }}>WELCOME</h2>
              <p className="mt-2 text-sm text-zinc-400">Ten strangers. One house. Cameras everywhere.<br />The channel needs a season — the house needs chaos.</p>
              <ul className="mx-auto mt-4 max-w-sm space-y-1.5 text-left text-[11px] text-zinc-300">
                <li>▶ Schedule drives movement — zones light up by game rhythm</li>
                <li>▶ Daily tasks crown a Captain (with immunity)</li>
                <li>▶ Confession-room ballots nominate two each night</li>
                <li>▶ Weekend Ka Vaar: public votes decide the LOGOUT</li>
              </ul>
              <button onClick={onStart}
                className="mt-6 rounded-lg border-2 border-[#ff2ea6] bg-[#ff2ea6]/20 px-8 py-3 text-sm font-black tracking-widest text-[#ff2ea6] transition hover:bg-[#ff2ea6] hover:text-white"
                style={{ boxShadow: '0 0 20px rgba(255,46,166,.5)' }}>
                ▶ START BROADCAST
              </button>
            </div>
          </Overlay>
        )}

        {/* TASK */}
        {s.phase === 'task' && s.task && (
          <Overlay>
            <div className="w-full max-w-md">
              <div className="mb-3 flex items-center justify-center gap-2 text-[#ffd700]">
                <Swords className="h-5 w-5" />
                <h2 className="text-lg font-black tracking-widest">CAPTAINCY TASK</h2>
              </div>
              <p className="mb-4 text-center text-[11px] text-zinc-400">THROW BURSTS INTO YOUR CHAMP. FIRST TO 100 HOLDS THE CROWN.</p>
              <div className="space-y-3">
                {[0, 1].map((i) => {
                  const r = runner(s.task.runners[i])
                  if (!r) return null
                  const power = Math.round(s.task.power[i])
                  const isPick = s.task.pick === i
                  return (
                    <div key={i} className="rounded-xl border-2 border-black/40 p-3" style={{ background: '#0d0814', boxShadow: isPick ? '0 0 16px #ffd700' : 'none' }}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-black" style={{ color: r.palette.topS }}>{r.name}</span>
                        <span className="text-xs font-black text-[#ffd700]">{power}/100</span>
                      </div>
                      <div className="mb-2 h-4 overflow-hidden rounded-[2px] border border-black/60 bg-black/40">
                        <div className="h-full transition-all" style={{ width: `${power}%`, background: `linear-gradient(90deg,${r.palette.topS},#ffd700)`, boxShadow: '0 0 10px #ffd700' }} />
                      </div>
                      <div className="flex gap-2">
                        <button disabled={s.task.pick !== null && !isPick} onClick={() => onTaskPush(i)}
                          className="flex-1 rounded-md border-2 border-[#ff2ea6] py-2 text-xs font-black tracking-widest text-[#ff2ea6] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                          style={cooldown === 0 ? { boxShadow: '0 0 14px rgba(255,46,166,.5)' } : undefined}>
                          PUSH +7
                        </button>
                        <button disabled={s.task.pick !== null && !isPick} onClick={() => onTaskPick(i)}
                          className="rounded-md border-2 border-[#ffd700] px-3 py-2 text-[10px] font-black text-[#ffd700] disabled:cursor-not-allowed disabled:opacity-30">
                          BACK
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-center text-[10px] text-zinc-500">{s.task.pick === null ? 'PICK YOUR CHAMPION FIRST' : 'CPU PUSHES EVERY SECOND — HAMMER THE PUSH BUTTON'}</p>
            </div>
          </Overlay>
        )}

        {/* NOMINATION */}
        {s.phase === 'nomination' && (() => {
          const voters = s.contestants.filter((c) => c.alive && c.id !== s.immune)
          const voter = s.nano.active ? voters[s.nano.idx] : null
          return (
            <Overlay>
              {voter ? (
                <NominationVoter key={voter.id} voter={voter} total={voters.length} idx={s.nano.idx}
                  options={cands(voter.id)}
                  onConfirm={(picks) => onVote(voter.id, picks)} />
              ) : s.nano.revealed ? (
                <div className="w-full max-w-md">
                  <h2 className="mb-4 text-center text-lg font-black tracking-widest text-[#ff2ea6]" style={{ textShadow: '0 0 14px #ff2ea6' }}>BALLOT RESULT</h2>
                  {s.contestants.filter((c) => c.alive).map((c) => {
                    const count = Object.values(s.nano.votes).flat().filter((id) => id === c.id).length
                    const isTop = s.nano.candidates.includes(c.id)
                    return (
                      <div key={c.id} className="mb-1.5 flex items-center justify-between rounded-lg border-2 px-3 py-2 text-xs"
                        style={{ borderColor: isTop ? '#ff2ea6' : '#2a1c4a', background: isTop ? 'rgba(255,46,166,.12)' : '#0d0814' }}>
                        <span className="flex items-center gap-2 font-black">
                          {isTop && <Flame className="h-3.5 w-3.5 text-[#ff2ea6]" />}{c.name}
                        </span>
                        <span className="text-[#ffd700]">{count} VOTES</span>
                      </div>
                    )
                  })}
                  <div className="mt-4 rounded-lg border-2 border-[#ff2ea6]/50 bg-black/40 p-3 text-center text-[11px] text-zinc-300">
                    NOMINATED THIS SEASON: <span className="font-black text-[#ff2ea6]">{s.nano.candidates.map((id) => runner(id)?.name).join(' & ')}</span>
                  </div>
                  <button onClick={onNanDone} className="mt-4 w-full rounded-lg border-2 border-[#ffd700] bg-black/40 py-3 text-xs font-black tracking-widest text-[#ffd700] hover:bg-[#ffd700] hover:text-black">
                    LOCK IN · RATINGS NEXT ➜
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-md text-center">
                  <Eye className="mx-auto mb-3 h-8 w-8 animate-pulse text-[#ff2ea6]" />
                  <h2 className="mb-2 text-lg font-black tracking-widest text-[#ff2ea6]">CONFESSION ROOM</h2>
                  <p className="mb-5 text-xs text-zinc-400">{s.nano.active ? 'All ballots sealed.' : 'Each housemate secretly votes two names into the danger zone.'}<br />You are the channel head — enforce the drama right now.</p>
                  <button onClick={onReveal} className="w-full rounded-lg border-2 border-[#ff2ea6] bg-[#ff2ea6]/20 py-3 text-xs font-black tracking-widest text-[#ff2ea6] hover:bg-[#ff2ea6] hover:text-white">
                    REVEAL BALLOT PANEL
                  </button>
                </div>
              )}
            </Overlay>
          )
        })()}

        {/* WEEKEND */}
        {s.phase === 'weekend' && s.weekend && (
          <Overlay>
            <div className="w-full max-w-lg">
              <div className="mb-3 flex items-center justify-center gap-2 text-[#ffd700]">
                <Star className="h-5 w-5" />
                <h2 className="text-lg font-black tracking-widest">WEEKEND KA VAAR</h2>
                <Star className="h-5 w-5" />
              </div>

              {s.weekend.step <= 2 && (
                <div className="rounded-xl border-2 border-[#ffd700]/40 bg-black/50 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#ffd700] bg-gradient-to-br from-[#ff2ea6] to-[#7c3aed] text-2xl font-black" style={{ boxShadow: '0 0 24px rgba(255,46,166,.7)' }}>B</div>
                    <p className="text-sm font-bold italic leading-snug text-[#ffd700]">"I AM BIGG BOSS."</p>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-300">{FEEDBACK[s.weekend.step]}</p>
                </div>
              )}

              {s.weekend.votes.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-center text-[10px] font-black tracking-widest text-zinc-400">PUBLIC VOTE SHARE</p>
                  {[...s.weekend.votes].sort((a, b) => b.pct - a.pct).map((v) => {
                    const c = runner(v.id)
                    const low = v.id === s.weekend.evicted
                    return (
                      <div key={v.id} className="flex items-center gap-2 text-[10px]">
                        <span className="w-28 truncate text-right font-black" style={{ color: low ? '#f87171' : '#fff' }}>{c?.name}</span>
                        <div className="h-3 flex-1 rounded-sm border border-black/60 bg-black/40">
                          <div className="h-full" style={{ width: `${v.pct}%`, background: low ? '#f87171' : 'linear-gradient(90deg,#4ade80,#ffd700)', boxShadow: low ? '0 0 10px #f87171' : 'none' }} />
                        </div>
                        <span className="w-12 tabular-nums" style={{ color: low ? '#f87171' : '#ffd700' }}>{v.pct.toFixed(1)}%</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {s.weekend.step <= 3 && (
                <button onClick={() => { play(AudioFX.buzz); dispatch({ type: 'WEEK_NEXT' }) }}
                  className="mt-5 w-full rounded-lg border-2 border-[#ff2ea6] bg-[#ff2ea6]/20 py-3 text-xs font-black tracking-widest text-[#ff2ea6] hover:bg-[#ff2ea6] hover:text-white">
                  {s.weekend.step === 3 ? '📊 TALLY PUBLIC VOTES' : 'CONTINUE HOST REVIEW ➜'}
                </button>
              )}
              {s.weekend.step === 4 && (
                <>
                  <div className="mt-5 rounded-xl border-2 border-[#f87171] bg-[#7f1d1d]/20 p-4 text-center">
                    <p className="text-[10px] font-black tracking-widest text-[#f87171]">THE GONG CALLS YOU OUT</p>
                    <p className="mt-1 text-2xl font-black text-white">{runner(s.weekend.evicted)?.name}</p>
                    <p className="mt-1 text-[11px] text-zinc-400">Lowest public support among the nominated.</p>
                  </div>
                  <button onClick={() => { play(AudioFX.gong); dispatch({ type: 'WEEK_EVICT' }) }}
                    className="mt-4 w-full rounded-lg border-2 border-[#ff2ea6] bg-[#ff2ea6] py-3 text-xs font-black tracking-widest text-white"
                    style={{ boxShadow: '0 0 24px rgba(255,46,166,.8)' }}>
                    🔴 BEGIN LOGOUT SEQUENCE
                  </button>
                </>
              )}
            </div>
          </Overlay>
        )}

        {/* EVICTING */}
        {s.phase === 'evicting' && s.evicting && (
          <Overlay>
            <div className="text-center">
              <p className="animate-pulse text-xl font-black tracking-[0.3em] text-[#ff2ea6]" style={{ textShadow: '0 0 24px #ff2ea6' }}>LOGOUT SEQUENCE</p>
              <p className="mt-2 text-xs text-zinc-300">{runner(s.evicting.id)?.name} walks to the doors...</p>
              <div className="mt-4 flex justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="h-2 w-2 animate-pulse rounded-full" style={{ background: '#ff2ea6', animationDelay: `${i * 0.15}s`, opacity: 1 - i * 0.18 }} />
                ))}
              </div>
            </div>
          </Overlay>
        )}

        {/* GAME OVER */}
        {s.phase === 'gameover' && s.won && (
          <Overlay>
            <div className="max-w-md text-center">
              <Trophy className="mx-auto mb-3 h-14 w-14 text-[#ffd700]" style={{ filter: 'drop-shadow(0 0 18px #ffd700)' }} />
              <h2 className="text-2xl font-black tracking-widest text-[#ffd700]">SEASON FINALE</h2>
              <p className="mt-2 text-sm text-zinc-300">WINNER: <span className="font-black text-white">{s.won.name}</span></p>
              <p className="mt-1 text-[11px] text-zinc-500">The house roars. The channel re-ups the contract.</p>
              <button onClick={onReset} className="mt-6 rounded-lg border-2 border-[#ff2ea6] bg-[#ff2ea6]/20 px-8 py-3 text-xs font-black tracking-widest text-[#ff2ea6] hover:bg-[#ff2ea6] hover:text-white">
                NEW SEASON
              </button>
            </div>
          </Overlay>
        )}
      </div>
    </div>
  )
}

/* ============================ UI PRIMITIVES ============================ */

function Chip({ tone, children }) {
  return (
    <span className="flex items-center rounded-md border-2 px-2 py-1 font-bold"
      style={{ borderColor: tone, color: tone, background: 'rgba(0,0,0,.5)', boxShadow: `0 0 10px ${tone}33` }}>
      {children}
    </span>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="rounded-md bg-black/30 p-2">
      <p className="text-[9px] tracking-widest text-zinc-500">{label}</p>
      <p className="text-sm font-black" style={{ color }}>{value.toFixed(0)}</p>
    </div>
  )
}

function MiniBar({ label, value, color, max = 100 }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-6 text-[8px] font-black text-zinc-600">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-black/50">
        <div className="h-full" style={{ width: `${clamp((value / max) * 100, 0, 100)}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      <span className="w-5 text-right text-[8px] tabular-nums text-zinc-400">{Math.round(value)}</span>
    </div>
  )
}

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border-4 overflow-hidden"
        style={{
          borderColor: '#ff2ea6',
          background: 'linear-gradient(160deg,#170b26,#1c0b2e 60%,#0d0814)',
          boxShadow: '0 0 0 3px #0d0814, 0 0 50px rgba(255,46,166,.4)', 
        }}>
        <div className="px-6 py-7 sm:p-8">{children}</div>
      </div>
    </div>
  )
}

function NominationVoter({ voter, options, total, idx, onConfirm }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const pick = (set) => (e) => set(Number(e.target.value))
  return (
    <div className="w-full max-w-md">
      <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-500">
        <span>SECRET BALLOT</span>
        <span className="tabular-nums text-[#ffd700]">{idx + 1} / {total}</span>
      </div>
      <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-black/40 bg-black/40 p-3">
        <span className="grid h-10 w-10 place-items-center rounded-md text-lg" style={{ background: voter.palette.topS }}>🎭</span>
        <div>
          <p className="text-sm font-black" style={{ color: voter.palette.topS }}>{voter.name}</p>
          <p className="text-[10px] tracking-widest text-zinc-500">enters the confession room · votes in secret</p>
        </div>
        <Eye className="ml-auto h-5 w-5 animate-pulse text-[#ff2ea6]" />
      </div>
      <p className="mb-2 text-[11px] font-bold text-zinc-300">WHOM DO YOU NOMINATE?</p>
      <select value={a} onChange={pick(setA)} className="mb-2 w-full rounded-md border-2 border-[#2a1c4a] bg-black/60 px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff2ea6]">
        <option value="">— first nomination —</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.arch}</option>)}
      </select>
      <select value={b} onChange={pick(setB)} className="mb-4 w-full rounded-md border-2 border-[#2a1c4a] bg-black/60 px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff2ea6]">
        <option value="">— second nomination —</option>
        {options.filter((o) => o.id !== a).map((o) => <option key={o.id} value={o.id}>{o.name} · {o.arch}</option>)}
      </select>
      <div className="flex gap-2">
        <button disabled={!a || !b || a === b} onClick={() => onConfirm([a, b])}
          className="flex-1 rounded-lg border-2 border-[#ff2ea6] bg-[#ff2ea6]/20 py-3 text-xs font-black tracking-widest text-[#ff2ea6] hover:bg-[#ff2ea6] hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
          SEAL BALLOT ✖✖
        </button>
        <button onClick={() => {
          const pool = [...options]
          const pickA = pool[Math.floor(Math.random() * pool.length)]
          const pickB = pool[Math.floor(Math.random() * pool.length)]
          setA(pickA.id); setB(pickB.id !== pickA.id ? pickB.id : (pool.find((o) => o.id !== pickA.id) || pickA).id)
        }}
          className="rounded-lg border-2 border-[#9d6bff] px-4 py-3 text-[10px] font-black text-[#9d6bff] hover:bg-[#9d6bff] hover:text-white">
          AUTO
        </button>
      </div>
      <p className="mt-3 text-center text-[9px] text-zinc-600">BALLOT IS SECRET. THE HOUSE IS WATCHING EVERYTHING ELSE.</p>
    </div>
  )
}