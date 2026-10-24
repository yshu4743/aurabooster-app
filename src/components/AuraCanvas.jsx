import { useEffect, useRef } from 'react';
import { hexToRgb } from '../lib/auraEngine';

const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const MIN_DRAW = 0.08;

function capResolution(cssW, cssH, quality) {
  const scale = window.devicePixelRatio || 1;
  const cap = quality === 'high' ? [1080, 1920] : [780, 1390];
  const w = cssW * scale;
  const h = cssH * scale;
  const k = Math.min(1, cap[0] / w, cap[1] / h);
  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
}

/**
 * AuraCanvas
 * Renders an animated fluid “aura” using layered radial gradient blobs on a
 * low-res canvas, upscaled + CSS-blurred for a silky organic feel. A grain
 * layer (SVG feTurbulence) sits on top as an overlay.
 *
 * Props:
 *  blobs    - array of hex colors
 *  grain    - 0..1 opacity of the film-noise overlay
 *  speed    - animation speed multiplier
 *  quality  - 'preview' (responsive) | 'high' (1080x1920 export frame)
 *  paused   - freeze the animation on the last drawn frame
 */
export default function AuraCanvas({ blobs = [], grain = 0.3, speed = 1, quality = 'preview', paused = false }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const drawRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let start = performance.now();
    let time = 0;

    const seeded = (seed) => {
      let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    const blobsN = blobs.map((c, i) => {
      const rgb = hexToRgb(c);
      return {
        r: rgb.r, g: rgb.g, b: rgb.b,
        ax: seeded(i * 3 + 1),       // anchor x (0..1)
        ay: seeded(i * 3 + 2),       // anchor y (0..1)
        ox: 0.18 + seeded(i * 5) * 0.3, // orbit amplitude x (fraction of width)
        oy: 0.22 + seeded(i * 7) * 0.3, // orbit amplitude y
        fx: 0.5 + seeded(i * 11) * 1.4, // wobble frequencies
        fy: 0.4 + seeded(i * 13) * 1.4,
        fp: 0.7 + seeded(i * 17) * 1.2,
        px: seeded(i * 19) * Math.PI * 2,
        py: seeded(i * 23) * Math.PI * 2,
        pp: seeded(i * 29) * Math.PI * 2,
        br: 0.42 + seeded(i * 31) * 0.35, // base radius (fraction of min dim)
        ph: seeded(i * 37) * Math.PI * 2,
        pulse: 0.5 + seeded(i * 41) * 1.6,
      };
    });

    const onResize = () => {
      const rect = wrap.getBoundingClientRect();
      const [w, h] = capResolution(rect.width, rect.height, quality);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);

    const draw = (now) => {
      time = (now - start) / 1000 * speed;
      const W = canvas.width;
      const H = canvas.height;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);

      const v = ctx.createLinearGradient(0, 0, 0, H);
      v.addColorStop(0, '#050505');
      v.addColorStop(0.55, '#0A0A0A');
      v.addColorStop(1, '#080809');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = 'screen';
      for (const b of blobsN) {
        const x = (b.ax + Math.sin(time * b.fx + b.px) * b.ox) * W;
        const y = (b.ay + Math.cos(time * b.fy + b.py) * b.oy) * H;
        const r = (b.br + Math.sin(time * b.fp + b.pp) * b.pulse * 0.09) * Math.min(W, H);
        if (r <= 0) continue;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        const a = clamp01(0.55 + Math.sin(time * b.pulse + b.ph) * 0.18);
        grad.addColorStop(0, `rgba(${b.r},${b.g},${b.b},${Math.max(a, MIN_DRAW)})`);
        grad.addColorStop(0.5, `rgba(${b.r},${b.g},${b.b},${Math.max(a * 0.28, MIN_DRAW)})`);
        grad.addColorStop(1, `rgba(${b.r},${b.g},${b.b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    drawRef.current = draw;

    const loop = (now) => {
      if (paused) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [blobs, speed, quality, paused]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden"
      style={{ isolation: 'isolate', backgroundColor: '#0A0A0A' }}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ filter: 'blur(26px) saturate(1.35) contrast(1.05)', transform: 'scale(1.08)' }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: NOISE_URI,
          backgroundSize: '160px 160px',
          opacity: Math.max(0.02, Math.min(1, grain)),
          mixBlendMode: 'overlay',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 8%, rgba(255,255,255,0.10), transparent 55%), radial-gradient(130% 100% at 50% 108%, rgba(0,0,0,0.55), transparent 60%)',
        }}
        aria-hidden
      />
    </div>
  );
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}