import React, { useEffect, useRef, useState, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../store/gameStore';
import { InputBus } from '../core/InputBus';
import { classifyReaction } from '../core/ScoreEngine';

// ─── FPS Counter ──────────────────────────────────────────────────────────────
// Solo monta si showFPS está activo. Usa RAF, no React state por frame.
const FPSCounter = memo(() => {
  const divRef    = useRef(null);
  const frames    = useRef(0);
  const lastTime  = useRef(performance.now());

  useEffect(() => {
    let rafId;
    const loop = () => {
      frames.current++;
      const now = performance.now();
      if (now - lastTime.current >= 500) {
        const fps = Math.round(frames.current / ((now - lastTime.current) / 1000));
        if (divRef.current) divRef.current.textContent = `${fps} FPS`;
        frames.current = 0;
        lastTime.current = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div ref={divRef} style={{
      position: 'absolute', bottom: 8, left: 12,
      fontFamily: 'var(--font-hud)', fontSize: 11,
      color: 'rgba(0,212,255,0.5)', letterSpacing: 1,
      pointerEvents: 'none', zIndex: 25,
    }}>
      -- FPS
    </div>
  );
});

// ─── HitMarker ────────────────────────────────────────────────────────────────
// Memoizado: solo re-renderiza cuando hit/miss cambian (vía InputBus, no store)
const HitMarker = memo(() => {
  const [state, setState] = useState('idle'); // 'idle' | 'hit' | 'miss'
  const timerRef = useRef(null);

  useEffect(() => {
    const setHit  = () => { clearTimeout(timerRef.current); setState('hit');  timerRef.current = setTimeout(() => setState('idle'), 160); };
    const setMiss = () => { clearTimeout(timerRef.current); setState('miss'); timerRef.current = setTimeout(() => setState('idle'), 160); };
    const u1 = InputBus.on('hit',  setHit);
    const u2 = InputBus.on('miss', setMiss);
    return () => { u1(); u2(); clearTimeout(timerRef.current); };
  }, []);

  if (state === 'idle') return null;

  const color = state === 'hit' ? '#00ff88' : '#ff4444';
  const size  = state === 'hit' ? 18 : 14;
  const s     = size * 0.8;

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: size * 3, height: size * 3,
      pointerEvents: 'none', zIndex: 30,
    }}>
      <div style={{ position:'absolute', left:'50%', top:0,      width:2, height:s, background:color, transform:'translateX(-50%)' }} />
      <div style={{ position:'absolute', left:'50%', bottom:0,   width:2, height:s, background:color, transform:'translateX(-50%)' }} />
      <div style={{ position:'absolute', top:'50%',  left:0,     width:s, height:2, background:color, transform:'translateY(-50%)' }} />
      <div style={{ position:'absolute', top:'50%',  right:0,    width:s, height:2, background:color, transform:'translateY(-50%)' }} />
    </div>
  );
});

// ─── FloatingScore ────────────────────────────────────────────────────────────
// Memoizado: solo re-renderiza cuando llega un hit event
const FloatingScore = memo(() => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsub = InputBus.on('hit', ({ reactionMs } = {}) => {
      const reaction = reactionMs ?? useGameStore.getState().lastReactionMs ?? 500;
      const { label, color } = classifyReaction(reaction);
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-3), { id, label, color, reaction }]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 900);
    });
    return unsub;
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: '38%', left: '50%',
      transform: 'translateX(-50%)',
      pointerEvents: 'none', zIndex: 31,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    }}>
      {items.map((item) => (
        <div key={item.id} style={{
          color: item.color,
          fontFamily: 'var(--font-hud)',
          fontSize: 'clamp(11px, 1.5vw, 16px)',
          fontWeight: 700,
          letterSpacing: 1,
          textShadow: `0 0 10px ${item.color}`,
          animation: 'floatUp 0.9s ease forwards',
        }}>
          {item.label} · {item.reaction}ms
        </div>
      ))}
    </div>
  );
});

// ─── ComboDisplay ─────────────────────────────────────────────────────────────
// Suscripción única y granular a combo
const ComboDisplay = memo(() => {
  const combo = useGameStore((s) => s.combo);
  if (combo < 2) return null;

  const heat  = Math.min(combo / 10, 1);
  const hue   = 30 - heat * 30;
  const light = 50 + heat * 10;
  const color = `hsl(${hue}, 100%, ${light}%)`;

  return (
    <div style={{
      position: 'absolute', bottom: 80, left: '50%',
      transform: 'translateX(-50%)',
      fontFamily: 'var(--font-hud)', fontWeight: 700,
      fontSize: `clamp(15px, ${1.8 + Math.min(combo, 10) * 0.15}vw, 34px)`,
      color, textShadow: `0 0 14px ${color}`,
      letterSpacing: 2,
      pointerEvents: 'none', zIndex: 30,
      transition: 'color 0.15s',
    }}>
      COMBO ×{combo}
    </div>
  );
});

// ─── HUD Principal ────────────────────────────────────────────────────────────
// *** FASE 4: useShallow batea score + timeLeft + hits + shots + mode en UNA
//     sola suscripción con shallow equality. Antes eran 5 re-renders separados. ***
const HUD = () => {
  const { score, timeLeft, hits, shots, mode, showFPS } = useGameStore(
    useShallow((s) => ({
      score:   s.score,
      timeLeft:s.timeLeft,
      hits:    s.hits,
      shots:   s.shots,
      mode:    s.mode,
      showFPS: s.showFPS,
    }))
  );
  const accuracy = shots > 0 ? ((hits / shots) * 100).toFixed(1) : '100';
  const urgent   = timeLeft <= 5;

  return (
    <>
      {/* Barra superior */}
      <div className="hud-top-bar" style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(5,8,16,0.78)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        borderBottom: '1px solid rgba(0,212,255,0.15)',
        pointerEvents: 'none', zIndex: 20,
        fontFamily: 'var(--font-hud)',
      }}>
        {/* Score */}
        <div className="hud-score" style={{ color: 'var(--c-primary)', fontSize: 'clamp(14px, 2vw, 22px)', fontWeight: 700 }}>
          {score.toLocaleString()}
        </div>

        {/* Tiempo */}
        <div className="hud-time" style={{
          fontWeight: 700, letterSpacing: 2,
          fontSize: 'clamp(18px, 3vw, 28px)',
          color:      urgent ? 'var(--c-danger)' : '#fff',
          textShadow: urgent ? '0 0 14px var(--c-danger)' : 'none',
          transition: 'color 0.3s, text-shadow 0.3s',
          animation:  urgent ? 'pulse 0.6s ease infinite' : 'none',
        }}>
          {timeLeft}s
        </div>

        {/* ACC + Modo */}
        <div style={{ textAlign: 'right', fontSize: 'clamp(11px, 1.5vw, 15px)' }}>
          <div style={{ color: '#aaa' }}>{accuracy}%</div>
          <div style={{ color: 'var(--c-primary)', fontSize: '0.85em', letterSpacing: 1 }}>
            {mode.toUpperCase()}
          </div>
        </div>
      </div>

      <HitMarker />
      <FloatingScore />
      <ComboDisplay />

      {/* ── Crosshair CSS (siempre centrado, independiente del 3D) ── */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none', zIndex: 29,
      }}>
        {/* Dot central */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 4, height: 4, borderRadius: '50%',
          background: '#00d4ff',
          boxShadow: '0 0 6px rgba(0,212,255,0.8)',
          transform: 'translate(-50%, -50%)',
        }} />
        {/* Línea superior */}
        <div style={{ position: 'absolute', left: '50%', top: -12, width: 2, height: 8, background: 'rgba(0,212,255,0.6)', transform: 'translateX(-50%)' }} />
        {/* Línea inferior */}
        <div style={{ position: 'absolute', left: '50%', bottom: -12, width: 2, height: 8, background: 'rgba(0,212,255,0.6)', transform: 'translateX(-50%)' }} />
        {/* Línea izquierda */}
        <div style={{ position: 'absolute', top: '50%', left: -12, width: 8, height: 2, background: 'rgba(0,212,255,0.6)', transform: 'translateY(-50%)' }} />
        {/* Línea derecha */}
        <div style={{ position: 'absolute', top: '50%', right: -12, width: 8, height: 2, background: 'rgba(0,212,255,0.6)', transform: 'translateY(-50%)' }} />
      </div>

      {showFPS && <FPSCounter />}

      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-44px); }
        }
      `}</style>
    </>
  );
};

export default HUD;
