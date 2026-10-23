// Main screen, refill dialog and options. Uses the Texts, Schedule, Store and Calendar scripts loaded before it.

(() => {
  const { addToCalendar } = Calendar;
  const { FeedingSchedule, addDays, startOfDay } = Schedule;
  const store = Store;
  const { dateLabel, dayDateTime, dayName, language, onLanguageChanged, setLanguage, t } = Texts;

  const MEAL_SPRITES = ['img/morning.png', 'img/day.png', 'img/night.png'];
  const FLAGS = { fr: 'img/language_french.png', de: 'img/language_german.png', en: 'img/language_english.png', hu: 'img/language_hungarian.png' };
  const FLAG_ORDER = ['fr', 'de', 'en', 'hu']; // as drawn on the sprite sheet

  const $ = id => document.getElementById(id);

  let config = store.loadConfig();
  let schedule = null;
  let boxes = []; // { image, box }
  let shownMinute = -1; // minutes since 1970 of the last refresh

  /** The icon of a meal: morning, day, night; other meal counts pick evenly spread sprites. */
  function mealSprite(meal, meals) {
    if (meals === 1)
      return MEAL_SPRITES[0];
    return MEAL_SPRITES[Math.round(meal * (MEAL_SPRITES.length - 1) / (meals - 1))];
  }

  function el(tag, className, parent) {
    const element = document.createElement(tag);
    if (className)
      element.className = className;
    parent?.appendChild(element);
    return element;
  }

  // ---- Board ----

  function buildView() {
    const now = new Date();
    schedule = new FeedingSchedule(config.mealTimes, config.soakMinutes, config.boxCount, store.loadRefill(), now);
    const meals = schedule.mealsPerDay;
    const days = schedule.dayCount;

    const board = $('board');
    board.replaceChildren();
    board.style.setProperty('--days', days);
    board.style.setProperty('--meals', meals);
    boxes = [];

    // Header row: the clock in the corner, then one header per day.
    const corner = el('div', 'corner', board);
    const clock = el('div', 'clock', corner);
    for (const layer of ['clock_face', 'clock_hour_hand', 'clock_minute_hand']) {
      const image = el('img', layer, clock);
      image.src = `img/${layer}.png`;
      image.alt = '';
    }
    for (let d = 0; d < days; d++) {
      const date = addDays(schedule.firstDay, d);
      const header = el('div', 'day-header', board);
      el('span', 'day-name', header).textContent = dayName(date);
      el('span', 'day-date', header).textContent = dateLabel(date);
    }

    // One row per meal: its icon, then a box (or nothing) per day.
    for (let m = 0; m < meals; m++) {
      const icon = el('img', null, el('div', 'meal-icon', board));
      icon.src = mealSprite(m, meals);
      icon.alt = '';
      for (let d = 0; d < days; d++) {
        const cell = el('div', 'cell', board);
        const box = schedule.boxAt(d, m);
        if (box == null)
          continue; // keeps the grid aligned on partially covered days
        const image = el('img', null, cell);
        image.alt = '';
        boxes.push({ image, box });
      }
    }

    refresh(now);
  }

  /** Shows each box full or empty, the clock and the status line for the given time. */
  function refresh(now) {
    if (!schedule)
      return;
    shownMinute = Math.floor(now / 60000);

    for (const { image, box } of boxes) {
      const src = schedule.isEaten(box, now) ? 'img/box_empty.png' : 'img/box_full.png';
      if (image.getAttribute('src') !== src)
        image.setAttribute('src', src);
    }

    const minutes = now.getHours() * 60 + now.getMinutes();
    document.querySelector('.clock_hour_hand').style.transform = `rotate(${(minutes % 720) / 2}deg)`;
    document.querySelector('.clock_minute_hand').style.transform = `rotate(${now.getMinutes() * 6}deg)`;

    $('status').textContent = statusLine(now);
    $('calendar-button').hidden = !(schedule.isRefilled && schedule.refillBy > now);
  }

  function statusLine(now) {
    if (!schedule.isRefilled)
      return t('status_not_refilled');
    const emptyAt = dayDateTime(schedule.emptyAt);
    const left = schedule.boxesLeft(now);
    return left > 0
      ? t('status_left', left, schedule.boxCount, emptyAt)
      : t('status_empty_since', schedule.boxCount, emptyAt);
  }

  function tick() {
    // Box states only change at meal times; checking each minute is plenty.
    const now = new Date();
    if (Math.floor(now / 60000) === shownMinute)
      return;
    // Before any refill the calendar starts today, so it moves on at midnight.
    if (schedule && !schedule.isRefilled && schedule.firstDay.getTime() !== startOfDay(now).getTime())
      buildView();
    else
      refresh(now);
  }

  // ---- Modals ----

  function showModal(modal) {
    modal.hidden = false;
  }

  function hideModal(modal) {
    modal.hidden = true;
  }

  let onConfirm = null;

  function askRefill() {
    // Tell which meal the first box will cover: with the soaking lead time this is not always the next meal.
    const now = new Date();
    const preview = new FeedingSchedule(config.mealTimes, config.soakMinutes, config.boxCount, now, now);
    let message = t('confirm_message', config.boxCount, dayDateTime(preview.mealTimeOf(0)));
    const left = schedule?.isRefilled ? schedule.boxesLeft(now) : 0;
    if (left > 0)
      message += '\n' + t('confirm_restart', left);

    $('confirm-title').textContent = t('confirm_title');
    $('confirm-message').textContent = message;
    onConfirm = refill;
    showModal($('confirm-dialog'));
  }

  function refill() {
    store.saveRefill(new Date());
    buildView();
  }

  function addReminder() {
    const name = $('horse-name').textContent;
    addToCalendar({
      title: t('event_title', name),
      details: t('event_details', dayDateTime(schedule.emptyAt), dayDateTime(schedule.refillBy)),
      start: schedule.emptyAt,
      end: schedule.refillBy,
    });
  }

  // ---- Options ----

  // The values being edited; applied when the panel closes.
  let editing = null;

  function showOptions() {
    editing = { ...config };
    $('horse-name-input').value = $('horse-name').textContent;
    $('meal-rows').replaceChildren();
    for (const minutes of config.mealTimes)
      addMealRow(minutes);
    updateMealControls();
    setBoxCount(config.boxCount);
    showLanguage();
    showModal($('options-panel'));
  }

  function closeOptions() {
    const times = [...$('meal-rows').querySelectorAll('.time-field')]
      .map(input => input.value)
      .filter(value => /^\d{2}:\d{2}/.test(value))
      .map(value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)));
    config = store.validate({ ...editing, mealTimes: times.length ? times : config.mealTimes });
    store.saveConfig(config);

    const name = $('horse-name-input').value.trim();
    if (name && name !== $('horse-name').textContent) {
      $('horse-name').textContent = name;
      store.saveHorseName(name);
    }

    hideModal($('options-panel'));
    buildView(); // new meal times or box count redraw the calendar from the same refill time
  }

  const pad = n => String(n).padStart(2, '0');

  function addMealRow(minutes) {
    const row = $('meal-row-template').content.firstElementChild.cloneNode(true);
    row.querySelector('.time-field').value = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    const remove = row.querySelector('[data-remove]');
    remove.setAttribute('aria-label', t('remove_meal'));
    remove.addEventListener('click', () => {
      if ($('meal-rows').children.length <= 1)
        return;
      row.remove();
      updateMealControls();
    });
    $('meal-rows').appendChild(row);
  }

  function addMeal() {
    const inputs = [...$('meal-rows').querySelectorAll('.time-field')];
    if (inputs.length >= store.MAX_MEALS)
      return;
    // A few hours after the latest meal, but still on the same day.
    const latest = Math.max(9 * 60, ...inputs.map(i => Number(i.value.slice(0, 2)) * 60 + Number(i.value.slice(3, 5)) || 0));
    addMealRow(Math.min(latest + 180, 23 * 60 + latest % 60));
    updateMealControls();
  }

  /** At least one meal, at most MAX_MEALS; icons follow the meal count like on the board. */
  function updateMealControls() {
    const rows = [...$('meal-rows').children];
    rows.forEach((row, i) => {
      row.querySelector('.meal-row-icon').src = mealSprite(i, rows.length);
      row.querySelector('[data-remove]').disabled = rows.length <= 1;
    });
    $('add-meal').disabled = rows.length >= store.MAX_MEALS;
  }

  function setBoxCount(count) {
    editing.boxCount = Math.min(Math.max(count, 1), store.MAX_BOXES);
    $('box-count').textContent = editing.boxCount;
    $('box-minus').disabled = editing.boxCount <= 1;
    $('box-plus').disabled = editing.boxCount >= store.MAX_BOXES;
  }

  function buildLanguageButtons() {
    for (const code of FLAG_ORDER) {
      const button = el('button', null, $('languages'));
      button.type = 'button';
      button.dataset.language = code;
      button.setAttribute('aria-label', code.toUpperCase());
      const image = el('img', null, button);
      image.src = FLAGS[code];
      image.alt = '';
      button.addEventListener('click', () => setLanguage(code));
    }
  }

  /** The chosen flag at full strength, the others faded. */
  function showLanguage() {
    for (const button of $('languages').children)
      button.setAttribute('aria-pressed', String(button.dataset.language === language()));
  }

  // ---- Texts ----

  function applyTexts() {
    document.documentElement.lang = language();
    for (const element of document.querySelectorAll('[data-text]'))
      element.textContent = t(element.dataset.text);
    $('options-button').setAttribute('aria-label', t('options'));
    $('calendar-button').setAttribute('aria-label', t('calendar_button'));
    $('calendar-button').title = t('calendar_button');
    $('add-meal').setAttribute('aria-label', t('add_meal'));
    for (const close of document.querySelectorAll('.close-button'))
      close.setAttribute('aria-label', t('close'));
    for (const remove of document.querySelectorAll('[data-remove]'))
      remove.setAttribute('aria-label', t('remove_meal'));
  }

  // ---- Start ----

  function start() {
    $('horse-name').textContent = store.loadHorseName($('horse-name').textContent);

    $('refill-button').addEventListener('click', askRefill);
    $('calendar-button').addEventListener('click', addReminder);
    $('confirm-ok').addEventListener('click', () => {
      const confirmed = onConfirm;
      onConfirm = null;
      hideModal($('confirm-dialog'));
      confirmed?.();
    });
    for (const close of $('confirm-dialog').querySelectorAll('[data-close]'))
      close.addEventListener('click', () => {
        onConfirm = null;
        hideModal($('confirm-dialog'));
      });

    $('options-button').addEventListener('click', showOptions);
    $('options-panel').querySelector('[data-close]').addEventListener('click', closeOptions);
    $('add-meal').addEventListener('click', addMeal);
    $('box-minus').addEventListener('click', () => setBoxCount(editing.boxCount - 1));
    $('box-plus').addEventListener('click', () => setBoxCount(editing.boxCount + 1));
    buildLanguageButtons();

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape')
        return;
      if (!$('confirm-dialog').hidden)
        hideModal($('confirm-dialog'));
      else if (!$('options-panel').hidden)
        closeOptions();
    });

    onLanguageChanged(() => {
      applyTexts();
      showLanguage();
      buildView(); // day names and the status line are language dependent
    });

    applyTexts();
    buildView();
    setInterval(tick, 10 * 1000);
    // Timers sleep while the app is in the background; catch up as soon as it is shown again.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden)
        tick();
    });

    store.requestPersistence();
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.register('sw.js').catch(error => console.warn('Offline mode unavailable:', error));
  }

  start();
})();
