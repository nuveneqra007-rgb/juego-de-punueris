/**
 * SoundEngine — Motor de sonido procedural usando Web Audio API.
 * No necesita archivos de audio externos. Todo se genera programáticamente.
 * Singleton exportado como `soundEngine`.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.7;
    this.enabled = true;
    this._masterGain = null;
  }

  /** Inicializar AudioContext (debe llamarse tras interacción del usuario) */
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this.ctx.createGain();
      this._masterGain.gain.value = this.volume;
      this._masterGain.connect(this.ctx.destination);
    } catch {
      this.enabled = false;
    }
  }

  /** Asegurar que el context esté activo */
  _ensureCtx() {
    if (!this.ctx) this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    return this.ctx && this.enabled;
  }

  /** Helper: crear oscilador con envelope */
  _osc({ freq = 440, type = 'sine', duration = 0.1, volume = 0.3, rampDown = true, detune = 0 } = {}) {
    if (!this._ensureCtx()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.value = volume * this.volume;
    if (rampDown) {
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  /** Helper: ruido blanco (para disparos) */
  _noise({ duration = 0.08, volume = 0.15 } = {}) {
    if (!this._ensureCtx()) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.value = volume * this.volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    // Filtro paso alto para hacerlo más "metálico"
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    source.start();
  }

  // ─── Efectos del juego ───────────────────────────────────────────────────

  /** Sonido de disparo — AK-47 (600 RPM) */
  playAK47Shot() {
    this._noise({ duration: 0.04, volume: 0.08 });
    this._osc({ freq: 80, type: 'sawtooth', duration: 0.03, volume: 0.06 });
    this._osc({ freq: 3200, type: 'square', duration: 0.02, volume: 0.04 });
  }

  /** Sonido de disparo — Pistola (semi-auto) */
  playPistolShot() {
    this._noise({ duration: 0.06, volume: 0.12 });
    this._osc({ freq: 800, type: 'square', duration: 0.04, volume: 0.1 });
  }

  /** Hit — "ding" satisfactorio ascendente */
  playHit() {
    this._osc({ freq: 880, type: 'sine', duration: 0.12, volume: 0.25 });
    this._osc({ freq: 1320, type: 'sine', duration: 0.15, volume: 0.15, detune: 5 });
  }

  /** Miss — buzz grave corto */
  playMiss() {
    this._osc({ freq: 150, type: 'sawtooth', duration: 0.12, volume: 0.15 });
    this._osc({ freq: 120, type: 'square', duration: 0.08, volume: 0.1 });
  }

  /** Combo — tono ascendente según nivel (n = combo count) */
  playCombo(n) {
    const baseFreq = 600 + Math.min(n, 15) * 80;
    this._osc({ freq: baseFreq, type: 'sine', duration: 0.1, volume: 0.2 });
    this._osc({ freq: baseFreq * 1.5, type: 'triangle', duration: 0.08, volume: 0.1 });
  }

  /** Countdown beep (3, 2, 1) */
  playCountdown() {
    this._osc({ freq: 440, type: 'square', duration: 0.15, volume: 0.2 });
  }

  /** GO! — acorde mayor */
  playGameStart() {
    this._osc({ freq: 523, type: 'sine', duration: 0.2, volume: 0.25 });
    setTimeout(() => this._osc({ freq: 659, type: 'sine', duration: 0.2, volume: 0.2 }), 50);
    setTimeout(() => this._osc({ freq: 784, type: 'sine', duration: 0.3, volume: 0.25 }), 100);
  }

  /** Fin de partida — descenso melódico */
  playGameEnd() {
    this._osc({ freq: 784, type: 'sine', duration: 0.2, volume: 0.2 });
    setTimeout(() => this._osc({ freq: 659, type: 'sine', duration: 0.2, volume: 0.18 }), 150);
    setTimeout(() => this._osc({ freq: 523, type: 'sine', duration: 0.35, volume: 0.2 }), 300);
  }

  /** Click UI sutil */
  playUIClick() {
    this._osc({ freq: 1200, type: 'sine', duration: 0.04, volume: 0.1 });
  }

  /** Nuevo récord — fanfarria dorada */
  playNewRecord() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this._osc({ freq, type: 'sine', duration: 0.25, volume: 0.25 }), i * 120);
      setTimeout(() => this._osc({ freq: freq * 1.5, type: 'triangle', duration: 0.2, volume: 0.12 }), i * 120 + 30);
    });
  }

  /** Alerta de tiempo (últimos 5 segundos) */
  playTimeWarning() {
    this._osc({ freq: 600, type: 'square', duration: 0.08, volume: 0.15 });
  }

  // ─── Epic Effects ────────────────────────────────────────────────────────
  playDecoyHit() {
    this._osc({ freq: 100, type: 'sawtooth', duration: 0.3, volume: 0.3 });
    this._noise({ duration: 0.5, volume: 0.2 });
  }

  playGhostWhoosh() {
    this._noise({ duration: 0.4, volume: 0.1 });
    this._osc({ freq: 800, type: 'sine', duration: 0.4, volume: 0.1, detune: -400 });
  }

  playBulletTime() {
    this._osc({ freq: 300, type: 'sine', duration: 0.8, volume: 0.2, detune: -1000 });
  }

  // ─── Control ─────────────────────────────────────────────────────────────

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this._masterGain) {
      this._masterGain.gain.value = this.volume;
    }
  }

  setEnabled(v) {
    this.enabled = v;
  }
}

export const soundEngine = new SoundEngine();
