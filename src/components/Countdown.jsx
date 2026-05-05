import React, { useEffect, useState, useRef } from 'react';
import useGameStore from '../store/gameStore';
import { soundEngine } from '../core/SoundEngine';

/**
 * Countdown — Animación 3-2-1-GO! antes de iniciar la partida.
 * Se muestra en fase 'countdown', luego transiciona a 'playing'.
 */
const Countdown = () => {
  const phase = useGameStore((s) => s.phase);
  const beginPlaying = useGameStore((s) => s.beginPlaying);
  const [count, setCount] = useState(3);
  const [show, setShow] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase !== 'countdown') return;
    setCount(3);
    setShow(true);

    soundEngine.playCountdown();

    let current = 3;
    timerRef.current = setInterval(() => {
      current--;
      if (current > 0) {
        setCount(current);
        soundEngine.playCountdown();
      } else if (current === 0) {
        setCount(0); // "GO!"
      } else {
        clearInterval(timerRef.current);
        setShow(false);
        // Forzar resize antes de entrar a playing — previene pantalla negra
        // porque beginPlaying() se llama desde un setInterval, no de un evento
        // de usuario, así que el navegador puede no haber estabilizado el viewport
        window.dispatchEvent(new Event('resize-safe'));
        beginPlaying();
      }
    }, 800);

    return () => clearInterval(timerRef.current);
  }, [phase, beginPlaying]);

  if (phase !== 'countdown' || !show) return null;

  const isGo = count === 0;
  const colors = ['#ff2d78', '#ffb800', '#00ff88', '#00d4ff'];
  const color = isGo ? colors[3] : colors[3 - count] || colors[0];

  return (
    <div className="countdown-overlay">
      <div
        key={count}
        className="countdown-number"
        style={{
          color,
          textShadow: `0 0 40px ${color}, 0 0 80px ${color}40`,
        }}
      >
        {isGo ? 'GO!' : count}
      </div>

      {/* Pulse ring */}
      <div
        key={`ring-${count}`}
        className="countdown-ring"
        style={{ borderColor: color }}
      />
    </div>
  );
};

export default Countdown;
