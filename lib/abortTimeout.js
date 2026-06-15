/**
 * AbortSignal.timeout polyfill for older mobile Safari (pre-16.4).
 * @param {number} ms
 * @returns {AbortSignal}
 */
export function fetchTimeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort(new DOMException('Timeout', 'TimeoutError'));
  }, ms);
  controller.signal.addEventListener('abort', () => clearTimeout(id), { once: true });
  return controller.signal;
}
