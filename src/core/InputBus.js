/**
 * InputBus — emisor de eventos de input unificado.
 * Reemplaza window.dispatchEvent(new CustomEvent(...)) en todo el proyecto.
 * Un solo punto de entrada para mouse, touch y cualquier futuro input (giroscopio, gamepad).
 */

const _listeners = {
  shoot: new Set(),
  hit:   new Set(),
  miss:  new Set(),
  look:  new Set(),
};

export const InputBus = {
  /**
   * Emite un evento con payload opcional.
   * @param {'shoot'|'hit'|'miss'|'look'} event
   * @param {any} [payload]
   */
  emit(event, payload) {
    const handlers = _listeners[event];
    if (!handlers) return;
    handlers.forEach((fn) => fn(payload));
  },

  /**
   * Registra un listener. Devuelve una función de cleanup (unsuscribe).
   * @param {'shoot'|'hit'|'miss'|'look'} event
   * @param {Function} fn
   * @returns {Function} cleanup
   */
  on(event, fn) {
    if (!_listeners[event]) _listeners[event] = new Set();
    _listeners[event].add(fn);
    return () => _listeners[event].delete(fn);
  },
};
