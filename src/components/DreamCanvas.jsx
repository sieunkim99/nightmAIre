import { useEffect, useRef } from "react";

// '꿈 영상' 렌더러 — 각 컷을 짧은 단편영화의 쇼트처럼 그린다.
// 쇼트 = 세트(setting) + 인물(me/friends의 포즈) + 사건(events) + 카메라(camera).
// 인물은 얼굴 없는 역광 실루엣: 구체적이되 해석의 여지를 남긴다.
// scene이 없으면 예전 모티프 방식으로 폴백.

const MOODS = {
  fog:   { speed: 0.12, dark: 0.9 },
  sink:  { speed: 0.08, dark: 1.0 },
  swirl: { speed: 0.3,  dark: 0.8 },
  maze:  { speed: 0.18, dark: 0.9 },
  echo:  { speed: 0.22, dark: 0.85 },
  dawn:  { speed: 0.1,  dark: 0 },
  glow:  { speed: 0.14, dark: 0.6 },
};

const CUT_MS = 7000;
const GLYPH_SET = "가나다라마바사아자차카타파하기니디리미비시간꿈답말나너우리생각마음";

export default function DreamCanvas({
  palette = ["#0b0718", "#2a1545", "#c03468"],
  mood = "fog",
  scene = null,
  motifs = [],
}) {
  const ref = useRef(null);
  const state = useRef({});
  state.current = { palette, mood, scene, motifs };

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let t = Math.random() * 1000;
    let cutStart = performance.now();
    let lastSig = "";
    const glyphs = Array.from({ length: 30 }, () => ({
      x: Math.random(),
      y: Math.random(),
      v: 0.2 + Math.random() * 0.6,
      ch: GLYPH_SET[Math.floor(Math.random() * GLYPH_SET.length)],
      s: 0.5 + Math.random() * 0.9,
    }));
    const shadows = Array.from({ length: 2 }, (_, i) => ({
      ph: i * 2.3 + Math.random() * 2,
      s: 0.08 + Math.random() * 0.1,
      r: 0.3 + Math.random() * 0.15,
    }));
    let current = state.current.palette.map(hexToRgb);
    let glitchLeft = 0;

    function frame(now) {
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width * 2 || canvas.height !== height * 2) {
        canvas.width = width * 2;
        canvas.height = height * 2;
      }
      const W = canvas.width;
      const H = canvas.height;
      const { palette: paletteNow, mood: moodNow, scene: sceneNow, motifs: motifsNow } = state.current;
      const m = MOODS[moodNow] || MOODS.fog;
      const target = paletteNow.map(hexToRgb);
      current = current.map((c, i) => lerpRgb(c, target[i % target.length], 0.035));
      const nightmare = m.dark > 0;

      const sig = JSON.stringify(sceneNow || motifsNow);
      if (sig !== lastSig) {
        lastSig = sig;
        cutStart = now;
      }
      const p = Math.min(1, (now - cutStart) / CUT_MS); // 컷 진행도 0→1
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

      t += m.speed * 0.016;

      // 배경
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, rgbStr(scale(current[0], nightmare ? 0.85 : 1.05)));
      bg.addColorStop(1, rgbStr(scale(current[0], nightmare ? 0.25 : 0.6)));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 분위기 블롭 (은은하게)
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const cx = W * (0.25 + i * 0.25) + Math.sin(t * 0.3 + i * 2) * W * 0.06;
        const cy = H * 0.35 + Math.cos(t * 0.25 + i) * H * 0.08;
        const col = current[1 + (i % (current.length - 1))];
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.3);
        g.addColorStop(0, rgbaStr(col, nightmare ? 0.16 : 0.3));
        g.addColorStop(1, rgbaStr(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = "source-over";

      // ── 카메라 ──
      const cam = (sceneNow && sceneNow.camera) || "static";
      ctx.save();
      let s = 1;
      let tx = 0;
      if (cam === "push") s = 1 + ease * 0.12;
      else if (cam === "pull") s = 1.14 - ease * 0.12;
      else if (cam === "pan-left") { s = 1.08; tx = W * 0.05 - ease * W * 0.1; }
      else if (cam === "pan-right") { s = 1.08; tx = -W * 0.05 + ease * W * 0.1; }
      const beat = nightmare ? 1 + Math.max(0, Math.sin(t * 2.6)) ** 10 * 0.01 : 1;
      s *= beat;
      ctx.translate(W / 2 + tx, H * 0.6);
      ctx.scale(s, s);
      ctx.translate(-W / 2, -H * 0.6);

      if (sceneNow && sceneNow.setting && sceneNow.setting !== "void") {
        drawShot(ctx, sceneNow, t, p, W, H, current, glyphs, nightmare);
      } else if (motifsNow && motifsNow.length) {
        drawMotifs(ctx, motifsNow, t, W, H, current, glyphs, nightmare);
      }

      // 떠다니는 어둠 (악몽의 공기)
      if (nightmare) {
        for (const sh of shadows) {
          const cx = W * (0.5 + Math.sin(t * sh.s + sh.ph) * 0.4);
          const cy = H * (0.4 + Math.cos(t * sh.s * 0.7 + sh.ph) * 0.25);
          const rad = Math.min(W, H) * sh.r;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
          g.addColorStop(0, `rgba(2,0,8,${0.32 * m.dark})`);
          g.addColorStop(1, "rgba(2,0,8,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 플리커 + 글리치 (오래된 꿈 필름)
      if (nightmare) {
        const flick = 0.04 + Math.random() * 0.045 + (Math.random() < 0.013 ? 0.2 : 0);
        ctx.fillStyle = `rgba(0,0,2,${flick * m.dark})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (nightmare && (glitchLeft > 0 || Math.random() < 0.02)) {
        if (glitchLeft <= 0) glitchLeft = 1 + Math.floor(Math.random() * 2);
        glitchLeft--;
        for (let i = 0; i < 2; i++) {
          const y = Math.random() * H;
          const h = 6 + Math.random() * 22;
          const dx = (Math.random() - 0.5) * 60 * m.dark;
          try {
            ctx.drawImage(canvas, 0, y, W, h, dx, y, W, h);
          } catch { /* 리사이즈 프레임 스킵 */ }
        }
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} />;
}

// ═════════════════════════════════════════════════════════════
// 쇼트 렌더링
// scene = { setting, me, friends, events[], camera }
//  setting: classroom | bedroom | corridor | playground | mirrorRoom | void
//  me: sit | stand | phone | raise | none
//  friends: none | normal | turn | blur | screens
//  events: lettersFall, screenFloat, soundRings-me, soundRings-phone,
//          soundRings-friends, shadowGrow, crackLight, paper
// ═════════════════════════════════════════════════════════════
function drawShot(ctx, scene, t, p, W, H, pal, glyphs, nightmare) {
  const U = Math.min(W, H);
  const hi = pal[pal.length - 1];
  const ink = nightmare ? "rgba(4,2,12,0.95)" : "rgba(22,20,52,0.8)";
  const line = rgbaStr(hi, nightmare ? 0.3 : 0.45);
  const floorY = H * 0.84;
  const ev = (e) => (scene.events || []).includes(e);

  // 바닥
  const fg = ctx.createLinearGradient(0, floorY - U * 0.02, 0, H);
  fg.addColorStop(0, rgbaStr(pal[1], nightmare ? 0.16 : 0.3));
  fg.addColorStop(1, rgbaStr(pal[0], 0.1));
  ctx.fillStyle = fg;
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.strokeStyle = rgbaStr(pal[1], 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(W, floorY);
  ctx.stroke();

  // 인물 위치 기본값
  let meX = W * 0.42;
  let meH = U * 0.3;
  let meBase = floorY + U * 0.01;
  let phonePos = null;

  // ── 세트 ──
  if (scene.setting === "classroom") {
    // 칠판
    ctx.fillStyle = rgbaStr(pal[1], 0.22);
    ctx.beginPath();
    roundRect(ctx, W * 0.07, H * 0.12, W * 0.32, H * 0.26, U * 0.012);
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = U * 0.006;
    ctx.stroke();
    ctx.strokeStyle = rgbaStr(hi, 0.18);
    ctx.lineWidth = U * 0.006;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(W * 0.1, H * (0.12 + 0.07 * i));
      ctx.lineTo(W * (0.1 + 0.1 + 0.08 * Math.abs(Math.sin(t * 0.3 + i))), H * (0.12 + 0.07 * i));
      ctx.stroke();
    }
    drawWindow(ctx, W * 0.68, H * 0.1, W * 0.2, H * 0.3, line, hi, nightmare);
    // 뒷줄 책상 + 앞줄 책상
    drawDeskRow(ctx, W, H, U, 0.64, 0.75, ink, line, [0.2, 0.5, 0.8]);
    drawDeskRow(ctx, W, H, U, 0.76, 1.0, ink, line, [0.25, 0.75]);
    // 내 책상 (중앙 앞)
    meX = W * 0.5;
    meBase = H * 0.8;
    meH = U * 0.26;
  } else if (scene.setting === "bedroom") {
    drawWindow(ctx, W * 0.66, H * 0.1, W * 0.22, H * 0.3, line, hi, nightmare, true);
    // 침대
    ctx.fillStyle = ink;
    ctx.beginPath();
    roundRect(ctx, W * 0.06, floorY - U * 0.16, U * 0.06, U * 0.16, U * 0.015); // 헤드보드
    ctx.fill();
    ctx.beginPath();
    roundRect(ctx, W * 0.08, floorY - U * 0.1, W * 0.3, U * 0.09, U * 0.02); // 매트리스
    ctx.fill();
    ctx.fillStyle = rgbaStr(hi, 0.2);
    ctx.beginPath();
    roundRect(ctx, W * 0.1, floorY - U * 0.13, U * 0.08, U * 0.04, U * 0.015); // 베개
    ctx.fill();
    meX = W * 0.52;
    meH = U * 0.3;
  } else if (scene.setting === "corridor") {
    // 소실점 복도
    const vpx = W * 0.5;
    const vpy = H * 0.42;
    ctx.strokeStyle = rgbaStr(pal[1], 0.5);
    ctx.lineWidth = 2;
    for (const sx of [0, W]) {
      ctx.beginPath();
      ctx.moveTo(sx, floorY + (sx === 0 ? U * 0.04 : U * 0.04));
      ctx.lineTo(vpx, vpy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx, H * 0.06);
      ctx.lineTo(vpx, vpy);
      ctx.stroke();
    }
    // 문들
    ctx.fillStyle = rgbaStr(pal[1], 0.2);
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.28;
      const dw = U * 0.1 * k;
      const dh = U * 0.26 * k;
      const yb = floorY - (floorY - vpy) * (i * 0.26);
      ctx.fillRect(W * 0.1 + i * W * 0.1, yb - dh, dw, dh);
      ctx.fillRect(W * 0.9 - i * W * 0.1 - dw, yb - dh, dw, dh);
    }
    meX = W * 0.38;
    meH = U * 0.3;
  } else if (scene.setting === "playground") {
    drawMoon(ctx, W * 0.8, H * 0.14, U, hi);
    // 멀리 학교 건물
    ctx.fillStyle = rgbaStr(pal[1], 0.22);
    ctx.fillRect(W * 0.04, floorY - U * 0.17, W * 0.3, U * 0.17);
    ctx.fillStyle = rgbaStr(hi, 0.14);
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 5; c++)
        ctx.fillRect(W * 0.06 + c * W * 0.055, floorY - U * 0.14 + r * U * 0.07, U * 0.025, U * 0.035);
    drawSwing(ctx, W * 0.22, floorY, U, ink, t);
    meX = W * 0.56;
    meH = U * 0.3;
  } else if (scene.setting === "mirrorRoom") {
    drawWindow(ctx, W * 0.06, H * 0.1, W * 0.16, H * 0.26, line, hi, nightmare);
    // 거울
    const mw = U * 0.3;
    const mh = U * 0.52;
    const mx = W * 0.58;
    const my = floorY - mh;
    const g = ctx.createLinearGradient(mx, my, mx + mw, floorY);
    g.addColorStop(0, rgbaStr(pal[1], 0.5));
    g.addColorStop(1, rgbaStr(pal[0], 0.75));
    ctx.fillStyle = g;
    ctx.beginPath();
    roundRect(ctx, mx, my, mw, mh, mw * 0.16);
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = U * 0.008;
    ctx.stroke();
    // 거울 속 반사: 머리가 화면인 나 (조금 어긋나 흔들린다)
    const rx = mx + mw / 2 + Math.sin(t * 0.9) * 4;
    const rh = mh * 0.62;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, mx, my, mw, mh, mw * 0.16);
    ctx.clip();
    ctx.fillStyle = "rgba(6,2,14,0.9)";
    ctx.beginPath();
    roundRect(ctx, rx - rh * 0.18, floorY - rh * 0.66, rh * 0.36, rh * 0.66, rh * 0.09);
    ctx.fill();
    const hw = rh * 0.22;
    const hy = floorY - rh * 0.66 - hw * 0.75;
    ctx.fillStyle = rgbaStr(hexToRgb("#d8ccff"), 0.55 + 0.3 * Math.abs(Math.sin(t * 2)));
    ctx.beginPath();
    roundRect(ctx, rx - hw / 2, hy, hw, hw * 0.78, hw * 0.12);
    ctx.fill();
    ctx.restore();
    meX = W * 0.32;
    meH = U * 0.32;
  }

  // ── 사건: 뒤에 그릴 것들 ──
  if (ev("shadowGrow")) {
    // 내 뒤 벽의 그림자가 컷이 흐를수록 자란다
    const gh = meH * (1.15 + p * 1.1);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "rgba(1,0,6,1)";
    kidSilhouette(ctx, meX - U * 0.07, meBase - U * 0.012, gh, "stand", 0);
    ctx.restore();
  }
  if (ev("screenFloat")) {
    const sw = U * 0.26;
    const sh = sw * 0.66;
    const sx = W * 0.5 - sw / 2 + Math.sin(t * 0.6) * U * 0.008;
    const sy = H * 0.2 + Math.cos(t * 0.5) * U * 0.01;
    const flicker = 0.75 + Math.random() * 0.25;
    glowAt(ctx, sx + sw / 2, sy + sh / 2, sw * 1.2, hi, 0.3 * flicker);
    ctx.fillStyle = rgbaStr(lerpRgb(hexToRgb("#dcd2ff"), pal[1], 0.4), 0.85 * flicker);
    ctx.beginPath();
    roundRect(ctx, sx, sy, sw, sh, U * 0.014);
    ctx.fill();
    ctx.strokeStyle = "rgba(10,6,22,0.5)";
    ctx.lineWidth = U * 0.007;
    for (let i = 1; i <= 3; i++) {
      const ly = sy + (sh * i) / 4;
      ctx.beginPath();
      ctx.moveTo(sx + sw * 0.1, ly);
      ctx.lineTo(sx + sw * (0.38 + 0.45 * Math.abs(Math.sin(t * 0.7 + i))), ly);
      ctx.stroke();
    }
    if (ev("crackLight")) drawCrack(ctx, sx + sw * 0.55, sy + sh * 0.4, U * 0.6, t);
  } else if (ev("crackLight")) {
    drawCrack(ctx, W * 0.55, H * 0.4, U, t);
  }

  // ── 친구들 ──
  if (scene.friends && scene.friends !== "none") {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const fx = W * (0.6 + (i * 0.32) / (n - 1)) + Math.sin(t * 0.4 + i * 2) * 3;
      const fh = U * (0.22 + (i % 2) * 0.02);
      glowAt(ctx, fx, floorY - fh * 0.5, fh * 0.8, hi, 0.12); // 역광으로 실루엣 분리
      ctx.fillStyle = ink;
      const sway = scene.friends === "turn" ? -4 : Math.sin(t * 0.5 + i) * 2;
      kidSilhouette(ctx, fx, floorY + U * 0.005, fh, "stand", sway);
      const headY = floorY - fh + fh * 0.12;
      if (scene.friends === "screens") {
        const hw = fh * 0.2;
        glowAt(ctx, fx, headY, hw * 3, hi, 0.3);
        ctx.fillStyle = rgbaStr(hexToRgb("#d8ccff"), 0.85);
        ctx.beginPath();
        roundRect(ctx, fx - hw, headY - hw * 0.7, hw * 2, hw * 1.5, hw * 0.2);
        ctx.fill();
      } else if (scene.friends === "blur") {
        glowAt(ctx, fx, headY, fh * 0.3, pal[1], 0.65);
      }
    }
  }

  // ── 나 ──
  if (scene.me && scene.me !== "none") {
    glowAt(ctx, meX, meBase - meH * 0.5, meH * 0.85, hi, 0.13);
    ctx.fillStyle = "rgba(3,1,10,0.97)";
    if (scene.setting === "classroom" && scene.me === "sit") {
      // 앉은 상반신 + 내 책상
      kidSilhouette(ctx, meX, meBase, meH, "sit", Math.sin(t * 0.6) * 2);
      drawDesk(ctx, meX, meBase, U * 0.2, U, ink, line);
      if (ev("paper")) {
        ctx.fillStyle = rgbaStr(hexToRgb("#e8e2ff"), 0.75);
        ctx.beginPath();
        roundRect(ctx, meX - U * 0.05, meBase - U * 0.005, U * 0.1, U * 0.035, U * 0.005);
        ctx.fill();
      }
      phonePos = [meX, meBase - U * 0.02];
    } else {
      const pose = scene.me === "sit" ? "sit" : scene.me;
      kidSilhouette(ctx, meX, meBase, meH, pose, Math.sin(t * 0.6) * 2);
      if (scene.me === "phone") {
        const px = meX + meH * 0.14;
        const py = meBase - meH * 0.42;
        phonePos = [px, py];
        glowAt(ctx, px, py, meH * 0.3, hi, 0.4 + 0.12 * Math.sin(t * 3));
        ctx.fillStyle = rgbaStr(hexToRgb("#dcd2ff"), 0.9);
        ctx.beginPath();
        roundRect(ctx, px - meH * 0.045, py - meH * 0.07, meH * 0.09, meH * 0.14, meH * 0.015);
        ctx.fill();
      }
    }
  }

  // ── 사건: 앞에 그릴 것들 ──
  if (ev("lettersFall")) {
    ctx.textAlign = "center";
    const cx0 = scene.setting === "classroom" ? meX : W * 0.5;
    const fromY = scene.setting === "classroom" ? meBase : H * 0.3;
    for (const g of glyphs.slice(0, 18)) {
      const fall = (g.y + t * g.v * 0.12) % 1;
      const y = fromY + fall * (floorY + U * 0.1 - fromY);
      const x = cx0 + (g.x - 0.5) * U * 0.3 + Math.sin(t + g.y * 9) * 4;
      const size = U * 0.03 * g.s;
      ctx.font = `${size}px "Gowun Dodum", sans-serif`;
      ctx.fillStyle = rgbaStr(hi, 0.4 * (1 - fall));
      ctx.fillText(g.ch, x, y);
    }
  }
  const ringSrc = ev("soundRings-me")
    ? [meX, meBase - meH * 0.86]
    : ev("soundRings-phone") && phonePos
      ? phonePos
      : null;
  if (ringSrc) drawRings(ctx, ringSrc[0], ringSrc[1], t, U, hi, 0.35);
  if (ev("soundRings-friends")) drawRings(ctx, W * 0.76, floorY - U * 0.18, t + 0.5, U, pal[1], 0.5, true);
}

// ── 부품들 ──
function kidSilhouette(ctx, cx, baseY, h, pose, sway = 0) {
  const headR = h * 0.125;
  const bw = h * 0.34;
  if (pose === "sit") {
    const th = h * 0.42;
    ctx.beginPath();
    ctx.arc(cx + sway, baseY - th - headR * 1.6, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    roundRect(ctx, cx - bw / 2 + sway * 0.6, baseY - th, bw, th, bw * 0.3);
    ctx.fill();
    return;
  }
  // 머리
  ctx.beginPath();
  ctx.arc(cx + sway, baseY - h + headR, headR, 0, Math.PI * 2);
  ctx.fill();
  // 몸통
  ctx.beginPath();
  roundRect(ctx, cx - bw / 2 + sway * 0.6, baseY - h * 0.76, bw, h * 0.5, bw * 0.3);
  ctx.fill();
  // 다리
  const lw = bw * 0.26;
  ctx.fillRect(cx - bw * 0.32, baseY - h * 0.28, lw, h * 0.28);
  ctx.fillRect(cx + bw * 0.06, baseY - h * 0.28, lw, h * 0.28);
  // 팔
  if (pose === "raise") {
    ctx.save();
    ctx.translate(cx + bw * 0.4, baseY - h * 0.7);
    ctx.rotate(-0.9);
    ctx.fillRect(0, 0, lw * 0.8, h * 0.34);
    ctx.restore();
  } else if (pose === "phone") {
    ctx.beginPath();
    roundRect(ctx, cx + bw * 0.3, baseY - h * 0.56, lw * 0.8, h * 0.2, lw * 0.3);
    ctx.fill();
  }
}

function drawDesk(ctx, cx, topY, w, U, ink, line) {
  ctx.fillStyle = ink;
  ctx.fillRect(cx - w / 2, topY, w, U * 0.022);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - w / 2, topY, w, U * 0.022);
  ctx.fillRect(cx - w / 2 + w * 0.06, topY + U * 0.022, w * 0.05, U * 0.08);
  ctx.fillRect(cx + w / 2 - w * 0.11, topY + U * 0.022, w * 0.05, U * 0.08);
}

function drawDeskRow(ctx, W, H, U, yRatio, k, ink, line, xs) {
  for (const xr of xs) drawDesk(ctx, W * xr, H * yRatio, U * 0.16 * k, U, ink, line);
}

function drawWindow(ctx, x, y, w, h, line, hi, nightmare, withMoon = false) {
  const g = ctx.createLinearGradient(x, y, x - w * 0.6, y + h * 2);
  g.addColorStop(0, rgbaStr(hi, nightmare ? 0.12 : 0.28));
  g.addColorStop(1, rgbaStr(hi, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w * 0.2, y + h * 2.2);
  ctx.lineTo(x - w * 0.9, y + h * 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(2, w * 0.03);
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  if (withMoon) {
    ctx.fillStyle = "rgba(235,228,255,0.7)";
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h * 0.28, w * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMoon(ctx, cx, cy, U, hi) {
  glowAt(ctx, cx, cy, U * 0.16, hi, 0.3);
  ctx.fillStyle = "rgba(235,228,255,0.8)";
  ctx.beginPath();
  ctx.arc(cx, cy, U * 0.045, 0, Math.PI * 2);
  ctx.fill();
}

function drawSwing(ctx, gx, gy, U, ink, t) {
  const gh = U * 0.3;
  ctx.strokeStyle = ink;
  ctx.lineWidth = U * 0.012;
  ctx.beginPath();
  ctx.moveTo(gx - gh * 0.42, gy);
  ctx.lineTo(gx - gh * 0.18, gy - gh);
  ctx.lineTo(gx + gh * 0.18, gy - gh);
  ctx.lineTo(gx + gh * 0.42, gy);
  ctx.stroke();
  const ang = Math.sin(t * 0.9) * 0.2;
  const px = gx + Math.sin(ang) * gh * 0.7;
  const py = gy - gh + Math.cos(ang) * gh * 0.7;
  ctx.lineWidth = U * 0.005;
  ctx.beginPath();
  ctx.moveTo(gx - gh * 0.08, gy - gh);
  ctx.lineTo(px - gh * 0.08, py);
  ctx.moveTo(gx + gh * 0.08, gy - gh);
  ctx.lineTo(px + gh * 0.08, py);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.fillRect(px - gh * 0.12, py, gh * 0.24, U * 0.013);
}

function drawRings(ctx, cx, cy, t, U, col, alpha, muffled = false) {
  for (let k = 0; k < 3; k++) {
    const pr = (t * 0.3 + k / 3) % 1;
    const r = pr * U * (muffled ? 0.22 : 0.34);
    ctx.strokeStyle = rgbaStr(col, (1 - pr) * alpha);
    ctx.lineWidth = muffled ? 5 : 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(r, 2), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCrack(ctx, cx, cy, U, t) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,220,150,0.8)";
  ctx.lineWidth = U * 0.006;
  ctx.shadowColor = "rgba(255,220,150,0.9)";
  ctx.shadowBlur = U * 0.03;
  const branches = [
    [0.9, -0.5, 1.6, -0.9],
    [-0.7, -0.8, -1.3, -1.5],
    [0.4, 0.9, 0.9, 1.7],
    [-0.9, 0.4, -1.7, 0.8],
  ];
  for (const [x1, y1, x2, y2] of branches) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + x1 * U * 0.07, cy + y1 * U * 0.07);
    ctx.lineTo(cx + x2 * U * 0.07 + Math.sin(t * 2) * 2, cy + y2 * U * 0.07);
    ctx.stroke();
  }
  ctx.restore();
}

function glowAt(ctx, cx, cy, r, col, alpha) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(r, 4));
  g.addColorStop(0, rgbaStr(col, alpha));
  g.addColorStop(1, rgbaStr(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(r, 4), 0, Math.PI * 2);
  ctx.fill();
}

// ── 레거시 모티프 폴백 (scene이 없는 컷용, 축약판) ──
function drawMotifs(ctx, motifs, t, W, H, pal, glyphs, nightmare) {
  const hi = pal[pal.length - 1];
  const U = Math.min(W, H);
  const ink = nightmare ? "rgba(3,1,10,0.92)" : "rgba(20,16,50,0.55)";
  if (motifs.includes("screen")) {
    const sw = U * 0.3;
    const sh = sw * 0.66;
    const sx = W * 0.5 - sw / 2;
    const sy = H * 0.3;
    glowAt(ctx, sx + sw / 2, sy + sh / 2, sw * 1.15, hi, 0.3);
    ctx.fillStyle = rgbaStr(hexToRgb("#dcd2ff"), 0.8);
    ctx.beginPath();
    roundRect(ctx, sx, sy, sw, sh, U * 0.015);
    ctx.fill();
  }
  if (motifs.includes("figure")) {
    ctx.fillStyle = ink;
    kidSilhouette(ctx, W * 0.5, H * 0.95, U * 0.3, "stand", Math.sin(t * 0.6) * 2);
  }
  if (motifs.includes("letters")) {
    ctx.textAlign = "center";
    for (const g of glyphs.slice(0, 16)) {
      const fall = (g.y + t * g.v * 0.08) % 1.1;
      ctx.font = `${U * 0.034 * g.s}px "Gowun Dodum", sans-serif`;
      ctx.fillStyle = rgbaStr(hi, 0.25 * (1 - fall));
      ctx.fillText(g.ch, g.x * W, fall * H);
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lerpRgb(a, b, k) {
  return a.map((v, i) => v + (b[i] - v) * k);
}
function scale(c, k) {
  return c.map((v) => v * k);
}
function rgbStr(c) {
  return `rgb(${c.map((v) => Math.round(v)).join(",")})`;
}
function rgbaStr(c, a) {
  return `rgba(${c.map((v) => Math.round(v)).join(",")},${a})`;
}
