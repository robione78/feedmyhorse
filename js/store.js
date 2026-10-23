// Everything the app remembers, kept in the browser's local storage on the device.

const Store = (() => {
  const CONFIG_KEY = 'feedingConfig';
  const REFILL_KEY = 'refilledAt';
  const NAME_KEY = 'horseName';

  const MAX_MEALS = 5;
  const MAX_BOXES = 30;

  function defaultConfig() {
    return {
      mealTimes: [7 * 60, 12 * 60, 18 * 60], // minutes after midnight, one per daily meal
      boxCount: 9,
      soakMinutes: 30, // the feed is soaked this long before the meal, so the box is used by then
    };
  }

  /** Keeps the config usable whatever was stored: at least one meal, distinct sorted times, boxes in range. */
  function validate(config) {
    const fallback = defaultConfig();
    const times = Array.isArray(config?.mealTimes) ? config.mealTimes : fallback.mealTimes;
    let mealTimes = [...new Set(times
      .map(Number)
      .filter(Number.isFinite)
      .map(m => Math.min(Math.max(Math.round(m), 0), 24 * 60 - 1)))]
      .sort((a, b) => a - b)
      .slice(0, MAX_MEALS);
    if (mealTimes.length === 0)
      mealTimes = [7 * 60];
    const boxCount = Math.min(Math.max(Math.round(Number(config?.boxCount) || fallback.boxCount), 1), MAX_BOXES);
    const soakMinutes = Math.max(0, Math.round(Number(config?.soakMinutes ?? fallback.soakMinutes) || 0));
    return { mealTimes, boxCount, soakMinutes };
  }

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function write(key, value) {
    try {
      if (value == null)
        localStorage.removeItem(key);
      else
        localStorage.setItem(key, value);
    } catch {
      // Private mode or blocked storage: the app still works for this session.
    }
  }

  function loadConfig() {
    try {
      return validate(JSON.parse(read(CONFIG_KEY)));
    } catch {
      return defaultConfig();
    }
  }

  function saveConfig(config) {
    write(CONFIG_KEY, JSON.stringify(validate(config)));
  }

  /** @returns {Date|null} */
  function loadRefill() {
    const value = Number(read(REFILL_KEY));
    return read(REFILL_KEY) != null && Number.isFinite(value) ? new Date(value) : null;
  }

  function saveRefill(date) {
    write(REFILL_KEY, date ? String(date.getTime()) : null);
  }

  function loadHorseName(fallback) {
    return read(NAME_KEY) || fallback;
  }

  function saveHorseName(name) {
    write(NAME_KEY, name);
  }

  /** Asks the browser not to clear the app's data when space runs low (granted for installed apps). */
  function requestPersistence() {
    navigator.storage?.persist?.().catch(() => {});
  }

  return { MAX_MEALS, MAX_BOXES, defaultConfig, validate, loadConfig, saveConfig, loadRefill, saveRefill, loadHorseName, saveHorseName, requestPersistence };
})();
