/**
 * WeaponSystem — Configuración y lógica de cadencia para todas las armas.
 * AK-47: disparo automático (hold-to-fire), 600 RPM = 100ms por disparo.
 * Pistol: semiautomático (un disparo por clic).
 * Singleton exportado como `weaponSystem`.
 */

import { InputBus } from './InputBus';
import { soundEngine } from './SoundEngine';

// ─── Weapon Definitions ──────────────────────────────────────────────────────
export const WEAPONS = {
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    fireRate: 100,          // ms between shots (600 RPM)
    damage: 10,             // HP per hit
    recoilAmount: 0.008,    // Radians per shot (pitch kick)
    recoilRecovery: 6,      // Recovery speed (units/sec)
    spread: 0.003,          // Base spread (radians)
    automatic: true,        // Hold to fire
    icon: '🔫',
  },
  pistol: {
    id: 'pistol',
    name: 'PISTOLA',
    fireRate: 180,          // ms between shots (~333 RPM)
    damage: 0,              // Not used for non-tracking modes
    recoilAmount: 0.015,    // More kick per shot (slower rate)
    recoilRecovery: 10,     // Faster recovery
    spread: 0.001,          // Tighter spread
    automatic: false,       // One shot per click
    icon: '🔫',
  },
};

// Map game modes to their weapon
export const MODE_WEAPON = {
  tracking: 'ak47',
  gridshot: 'pistol',
  flick:    'pistol',
  speed:    'pistol',
};

export function getWeaponForMode(mode) {
  return WEAPONS[MODE_WEAPON[mode]] || WEAPONS.pistol;
}

// ─── Weapon System Singleton ─────────────────────────────────────────────────
class WeaponSystem {
  constructor() {
    this.isFiring = false;
    this._fireInterval = null;
    this._currentWeapon = WEAPONS.pistol;
    this._shotsFired = 0;
    this._consecutiveHits = 0;

    // Recoil state (consumed by GameCanvas)
    this.recoilOffset = 0;    // Current pitch offset in radians
    this.muzzleFlash = false;  // True for ~50ms after each shot
    this._flashTimer = null;

    // Epic states
    this.recoilMult = 1.0;
    this.noRecoil = false;
    this.overheatEnabled = false;
    this.heat = 0;             // 0 to 1
    this.jammedTimer = 0;      // > 0 means jammed
  }

  /** Set active weapon by mode */
  setMode(mode, epicConfig = {}) {
    this._currentWeapon = getWeaponForMode(mode);
    this.recoilMult = epicConfig.recoilMult ?? 1.0;
    this.noRecoil = epicConfig.noRecoil ?? false;
    this.overheatEnabled = epicConfig.overheat ?? false;
    this.reset();
  }

  /** Get current weapon config */
  get weapon() {
    return this._currentWeapon;
  }

  /** Start automatic firing (AK-47 mode) */
  startFiring() {
    if (this.isFiring || this.jammedTimer > 0) return;
    this.isFiring = true;
    InputBus.emit('fire-start');

    if (this._currentWeapon.automatic) {
      // Immediate first shot
      this._doShot();
      // Continuous fire at weapon fire rate
      this._fireInterval = setInterval(() => {
        if (this.jammedTimer > 0) {
          this.stopFiring();
          return;
        }
        this._doShot();
      }, this._currentWeapon.fireRate);
    } else {
      // Semi-auto: single shot
      this._doShot();
    }
  }

  /** Stop firing */
  stopFiring() {
    if (!this.isFiring) return;
    this.isFiring = false;
    InputBus.emit('fire-stop');

    if (this._fireInterval) {
      clearInterval(this._fireInterval);
      this._fireInterval = null;
    }
  }

  /** Internal: execute one shot */
  _doShot() {
    this._shotsFired++;

    // Trigger recoil
    if (!this.noRecoil) {
      this.recoilOffset += this._currentWeapon.recoilAmount * this.recoilMult;
    }

    // Trigger muzzle flash (50ms)
    this.muzzleFlash = true;
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this.muzzleFlash = false;
    }, 50);

    // Play weapon-specific sound
    if (this._currentWeapon.id === 'ak47') {
      soundEngine.playAK47Shot();
    } else {
      soundEngine.playPistolShot();
    }

    // Emit shoot event for target hit detection
    InputBus.emit('shoot');
    InputBus.emit('weapon-shot', {
      weapon: this._currentWeapon.id,
      shotNumber: this._shotsFired,
    });
  }

  /** Called every frame to recover recoil smoothly and manage heat */
  update(delta) {
    // Recoil recovery
    if (this.recoilOffset > 0) {
      this.recoilOffset -= this._currentWeapon.recoilRecovery * delta;
      if (this.recoilOffset < 0) this.recoilOffset = 0;
    }

    // Overheat logic
    if (this.overheatEnabled) {
      if (this.jammedTimer > 0) {
        this.jammedTimer -= delta;
        this.heat = Math.max(0, this.jammedTimer / 2); // Cools down over 2s
      } else {
        if (!this.isFiring) {
          // Cool down naturally
          this.heat -= delta * 0.5;
          if (this.heat < 0) this.heat = 0;
        } else {
          // Heat up if firing (missing increases heat fast)
          // `registerHit` resets heat. So just firing without hitting increases heat.
          this.heat += delta * 0.4; // takes 2.5s to overheat
          if (this.heat >= 1) {
            this.jammedTimer = 2; // 2 seconds penalty
            this.heat = 1;
            this.stopFiring();
            soundEngine.playMiss(); // Use miss sound for jam
          }
        }
      }
    }
  }

  /** Register a hit (for tracking consecutive hits) */
  registerHit() {
    this._consecutiveHits++;
    if (this.overheatEnabled) {
      this.heat = 0; // instantly cool down on hit
    }
  }

  /** Register a miss */
  registerMiss() {
    this._consecutiveHits = 0;
  }

  get consecutiveHits() {
    return this._consecutiveHits;
  }

  /** Reset state */
  reset() {
    this.stopFiring();
    this.recoilOffset = 0;
    this.muzzleFlash = false;
    this._shotsFired = 0;
    this._consecutiveHits = 0;
    this.heat = 0;
    this.jammedTimer = 0;
    clearTimeout(this._flashTimer);
  }
}

export const weaponSystem = new WeaponSystem();
