// The app's texts in every supported language. The choice is saved; until the user picks one,
// the device language is used when supported, English otherwise.

const Texts = (() => {
  const LANGUAGES = ['en', 'hu', 'de', 'fr'];

  // Columns follow LANGUAGES: English, Hungarian, German, French.
  const TABLE = {
    refill_button: ['Boxes Refilled', 'Dobozok feltöltve', 'Boxen aufgefüllt', 'Boîtes remplies'],
    status_not_refilled: ['Boxes - not refilled yet', 'Dobozok - még nincs feltöltve', 'Boxen - noch nicht aufgefüllt', 'Boîtes - pas encore remplies'],
    status_left: ['Boxes {0}/{1} - empty {2}', 'Dobozok {0}/{1} - kiürül {2}', 'Boxen {0}/{1} - leer {2}', 'Boîtes {0}/{1} - vides {2}'],
    status_empty_since: ['Boxes 0/{0} - empty since {1}', 'Dobozok 0/{0} - kiürült {1}', 'Boxen 0/{0} - leer seit {1}', 'Boîtes 0/{0} - vides depuis {1}'],
    confirm_title: ['Boxes refilled?', 'Feltöltötted a dobozokat?', 'Boxen aufgefüllt?', 'Boîtes remplies ?'],
    confirm_message: ['All {0} boxes are full.\nFirst box: {1}', '{0}/{0} doboz tele.\nElső doboz: {1}', 'Alle {0} Boxen sind voll.\nErste Box: {1}', 'Les {0} boîtes sont pleines.\nPremière boîte : {1}'],
    confirm_restart: ['The current count ({0} left) restarts.', 'A mostani számlálás ({0} maradt) újraindul.', 'Die laufende Zählung ({0} übrig) beginnt neu.', 'Le décompte actuel ({0} restantes) recommence.'],
    cancel: ['Cancel', 'Mégse', 'Abbrechen', 'Annuler'],
    refill: ['Refill', 'Feltöltés', 'Auffüllen', 'Remplir'],
    options_title: ['Options', 'Beállítások', 'Einstellungen', 'Options'],
    horse_name: ['Horse name', 'A ló neve', 'Name des Pferdes', 'Nom du cheval'],
    default_horse_name: ['My horse', 'Az én lovam', 'Mein Pferd', 'Mon cheval'],
    meal_times: ['Daily meals', 'Napi etetések', 'Tägliche Mahlzeiten', 'Repas quotidiens'],
    box_count: ['Number of boxes', 'Dobozok száma', 'Anzahl der Boxen', 'Nombre de boîtes'],
    close: ['Close', 'Bezárás', 'Schließen', 'Fermer'],
    options: ['Options', 'Beállítások', 'Einstellungen', 'Options'],
    add_meal: ['Add meal', 'Etetés hozzáadása', 'Mahlzeit hinzufügen', 'Ajouter un repas'],
    remove_meal: ['Remove meal', 'Etetés törlése', 'Mahlzeit entfernen', 'Supprimer le repas'],
    calendar_button: ['Add refill reminder to calendar', 'Feltöltési emlékeztető a naptárba', 'Auffüll-Erinnerung zum Kalender', 'Ajouter un rappel au calendrier'],
    event_title: ['{0}: refill the feed boxes', '{0}: abrakos dobozok feltöltése', '{0}: Futterboxen auffüllen', '{0} : remplir les boîtes'],
    event_details: ['The last box is used {0}.\nRefill before {1}.', 'Az utolsó doboz: {0}.\nTöltsd fel eddig: {1}.', 'Die letzte Box wird {0} verwendet.\nAuffüllen bis {1}.', 'La dernière boîte est utilisée {0}.\nRemplir avant {1}.'],
  };

  // Short day names indexed by Date.getDay() (Sunday first).
  const DAY_NAMES = [
    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'],
    ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
  ];

  const STORAGE_KEY = 'language';
  const listeners = [];
  let current = load();

  function load() {
    const saved = readStorage(STORAGE_KEY);
    if (LANGUAGES.includes(saved))
      return saved;
    const device = (navigator.languages?.[0] ?? navigator.language ?? 'en').slice(0, 2).toLowerCase();
    return LANGUAGES.includes(device) ? device : 'en';
  }

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function language() {
    return current;
  }

  function setLanguage(value) {
    if (value === current || !LANGUAGES.includes(value))
      return;
    current = value;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Not saved; the choice still applies until the app closes.
    }
    listeners.forEach(listener => listener());
  }

  /** Calls the listener after every language change, so on-screen texts can redraw. */
  function onLanguageChanged(listener) {
    listeners.push(listener);
  }

  function t(key, ...args) {
    const texts = TABLE[key];
    if (!texts) {
      console.warn(`Missing text '${key}'.`);
      return key;
    }
    return texts[LANGUAGES.indexOf(current)].replace(/\{(\d+)\}/g, (_, i) => String(args[i]));
  }

  const pad = n => String(n).padStart(2, '0');

  function dayName(date) {
    return DAY_NAMES[LANGUAGES.indexOf(current)][date.getDay()];
  }

  /** "10.21." in English and Hungarian, "21.10." in German, "21/10" in French. */
  function dateLabel(date) {
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    switch (current) {
      case 'de': return `${day}.${month}.`;
      case 'fr': return `${day}/${month}`;
      default: return `${month}.${day}.`;
    }
  }

  function timeLabel(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /** "Mo 10.21. 07:00" */
  function dayDateTime(date) {
    return `${dayName(date)} ${dateLabel(date)} ${timeLabel(date)}`;
  }

  return { LANGUAGES, language, setLanguage, onLanguageChanged, t, dayName, dateLabel, timeLabel, dayDateTime };
})();
