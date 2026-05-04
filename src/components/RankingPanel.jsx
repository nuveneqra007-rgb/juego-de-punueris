import React, { useState, useMemo } from 'react';
import { loadAllRankings } from '../utils/storage';
import { soundEngine } from '../core/SoundEngine';

const MODES = [
  { id: 'gridshot', label: 'GRIDSHOT', color: '#00d4ff' },
  { id: 'flick',    label: 'FLICK',    color: '#ff2d78' },
  { id: 'tracking', label: 'TRACKING', color: '#ffb800' },
  { id: 'speed',    label: 'SPEED',    color: '#00ff88' },
];

const DIFF_COLORS = { easy: '#00ff88', normal: '#00d4ff', hard: '#ff2d78' };
const DIFF_LABELS = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' };

/**
 * RankingPanel — Panel de ranking/leaderboard con tabs por modo.
 * Muestra Top 10 para cada modo de juego.
 */
const RankingPanel = ({ onClose }) => {
  const [activeMode, setActiveMode] = useState('gridshot');
  const allRankings = useMemo(() => loadAllRankings(), []);
  const entries = allRankings[activeMode] || [];

  return (
    <div className="ranking-overlay" onClick={onClose}>
      <div className="ranking-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ranking-header">
          <h2>🏆 RANKING</h2>
          <button className="ranking-close" onClick={onClose}>✕</button>
        </div>

        {/* Mode tabs */}
        <div className="ranking-tabs">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`ranking-tab ${activeMode === m.id ? 'active' : ''}`}
              style={{ '--tab-color': m.color }}
              onClick={() => { setActiveMode(m.id); soundEngine.playUIClick(); }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {entries.length === 0 ? (
          <div className="ranking-empty">
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
            <div>No hay registros aún</div>
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 4 }}>
              ¡Juega una partida en modo {MODES.find(m => m.id === activeMode)?.label} para aparecer aquí!
            </div>
          </div>
        ) : (
          <div className="ranking-table-wrap">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jugador</th>
                  <th>Score</th>
                  <th>ACC</th>
                  <th>Dificultad</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => {
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                  return (
                    <tr
                      key={i}
                      className={`ranking-row ${i < 3 ? 'top-three' : ''}`}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <td className="ranking-pos">
                        {medal || (i + 1)}
                      </td>
                      <td className="ranking-name">{entry.name}</td>
                      <td className="ranking-score">{entry.score?.toLocaleString()}</td>
                      <td className="ranking-acc">{entry.accuracy}%</td>
                      <td>
                        <span
                          className="ranking-diff-badge"
                          style={{ color: DIFF_COLORS[entry.difficulty], borderColor: `${DIFF_COLORS[entry.difficulty]}44` }}
                        >
                          {DIFF_LABELS[entry.difficulty] || entry.difficulty}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingPanel;
