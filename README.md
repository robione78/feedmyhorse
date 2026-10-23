# Feed My Horse

Installable web app (PWA) that tracks the horse's feed boxes and shows when they run out.
It runs on iOS and Android from the home screen, works offline and keeps its data on the device.
It is the web version of the Unity app in `feed_my_horse`. The schedule rules live in `js/schedule.js`, the same rules as `FeedingSchedule.cs`.

## Files

- `index.html`, `css/app.css`: the screen, laid out like the Unity scene (1080 wide reference, `cqw` units)
- `js/app.js`: board, refill dialog, options panel (plain scripts, not modules, so `index.html` also opens straight from disk)
- `js/schedule.js`: which box feeds which meal, when boxes are used
- `js/texts.js`: texts in English, Hungarian, German, French
- `js/store.js`: settings, refill time and horse name in local storage
- `js/calendar.js`: refill reminder (.ics on iOS/desktop, Google Calendar on Android)
- `sw.js`: offline cache. **Bump `VERSION` on every release**, or installed apps keep the old files.
- `img/`: sprites exported from the Unity sprite sheet

## Run locally

```
python -m http.server 8000
```

Then open http://localhost:8000. The service worker needs `localhost` or HTTPS.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository (on the free plan it must be public for Pages).
2. Repository → Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The app is at `https://<user>.github.io/<repo>/`.
4. Install it on a phone:
   - iOS: open it in Safari, then Share → *Add to Home Screen*.
   - Android: open it in Chrome, then menu → *Install app*.
