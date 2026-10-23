// Refill reminder as a calendar event: from when the last box is used until the refill deadline.
// iOS and desktop get an .ics file (opens the system calendar's "add event" sheet),
// Android opens Google Calendar's new-event page, since it does not import .ics files itself.

const Calendar = (() => {
  const pad = n => String(n).padStart(2, '0');

  /** UTC time as calendars want it: 20261024T053000Z */
  function utc(date) {
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
      + `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
  }

  function escapeIcs(text) {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function ics({ title, details, start, end }) {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Feed My Horse//EN',
      'BEGIN:VEVENT',
      `UID:refill-${start.getTime()}@feed-my-horse`,
      `DTSTAMP:${utc(new Date())}`,
      `DTSTART:${utc(start)}`,
      `DTEND:${utc(end)}`,
      `SUMMARY:${escapeIcs(title)}`,
      `DESCRIPTION:${escapeIcs(details)}`,
      // Reminders a day ahead and two hours ahead of the last box.
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcs(title)}`, 'TRIGGER:-P1D', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcs(title)}`, 'TRIGGER:-PT2H', 'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }

  function googleCalendarUrl({ title, details, start, end }) {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details,
      dates: `${utc(start)}/${utc(end)}`,
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  /** @param {{title: string, details: string, start: Date, end: Date}} event */
  function addToCalendar(event) {
    if (/android/i.test(navigator.userAgent)) {
      window.open(googleCalendarUrl(event), '_blank', 'noopener');
      return;
    }

    // iOS shows its "add to calendar" sheet when it opens the event itself, rather than downloading a file.
    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (iOS) {
      window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics(event))}`;
      return;
    }

    const blob = new Blob([ics(event)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'feed-my-horse-refill.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  }

  return { addToCalendar };
})();
