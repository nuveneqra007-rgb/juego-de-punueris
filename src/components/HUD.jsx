import React from 'react';
import useGameStore from '../store/gameStore';

const HUD = () => {
  const { score, timeLeft, hits, shots, combo } = useGameStore();
  const accuracy = shots > 0 ? ((hits / shots) * 100).toFixed(1) : '100';

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      color: 'white',
      fontFamily: 'monospace',
      fontSize: 'clamp(14px, 2vw, 24px)',
      textShadow: '1px 1px 2px black',
      pointerEvents: 'none',
      userSelect: 'none'
    }}>
      <div>SCORE: {score}</div>
      <div>TIME: {timeLeft}s</div>
      <div>ACC: {accuracy}%</div>
      {combo > 1 && <div>COMBO x{combo}</div>}
    </div>
  );
};

export default HUD;
