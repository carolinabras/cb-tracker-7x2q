# Habit Tracker

A small habit tracker you install on your iPhone from Safari ("Add to Home Screen"). No App Store and no Mac needed.

- **Today**: tap ✓ (done) or ✕ (missed) for each habit. Tap again to clear it. Use ‹ › to fill in past days, and tap the date to jump back to today.
- **History**: a 5-week calendar for each habit, plus current streak, best streak and last-30-days score. Tap a day to edit it.
- **To-do**: a simple checklist. Type and tap Add, tap the circle to tick an item off (tap again to undo), tap the text to edit it, and use 🗑 to delete. **Clear** removes everything you've completed.
- **Notes**: write notes with a title and text. They save automatically as you type and are listed newest first. You can search them, and tap **Delete** inside a note to remove it. A new note left empty is thrown away when you leave it.
- **Habits**: add, rename, reorder and delete habits. You can also export and import a backup.
- **Style**: choose Auto, Light, Dark or **Custom**. Custom lets you pick your own colors for the page background, cards, page titles, habit names, text, secondary text, tab bar and the "missed" color, starting from presets like Ocean, Rose, Sand, Forest and Midnight. You can also choose a background (solid color or your own photo), the app color, the "done" color, the font, text size and corner style. You can also make your own colors (saved under "My colors"), and give each habit an emoji or your own picture as its icon, plus its own color. Your style, colors and pictures are included in backups.

Data is stored on the phone only (`localStorage`).

## Try it on your PC

```
python -m http.server 8000
```
Then open http://localhost:8000. Press F12, then Ctrl+Shift+M, to see it at iPhone size.

To open it on your iPhone over home Wi-Fi, run `python -m http.server 8000 --bind 0.0.0.0` instead. Then open `http://<your PC's IP address>:8000` in Safari. To find the IP address, run `ipconfig` and look for the IPv4 address under Wi-Fi.

## Put it on your iPhone (free, with GitHub Pages)

1. Create a free account at https://github.com and make a new **public** repository (e.g. `habits`).
2. On the repo page, click **Add file → Upload files** and drag in everything from this folder (including the `icons` folder). Commit.
3. Go to **Settings → Pages**. Under "Branch", pick `main` and `/ (root)`, then click Save.
4. After about a minute, your app is live at `https://<your-username>.github.io/habits/`.
5. On your iPhone, open that link in **Safari**, tap **Share → Add to Home Screen → Add**.
6. Always open it from the Home Screen icon. That copy keeps its own data, separate from Safari.

## Updating the app

Upload the changed files to GitHub again. The app picks up the new version the next time you open it while online.

## Backups

iPhone storage for Home Screen apps is reliable. However, deleting the icon from the Home Screen also deletes its data. Use **Habits → Export backup → Save to Files** now and then.
