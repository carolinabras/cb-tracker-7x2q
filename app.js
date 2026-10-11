'use strict';

const STORE_KEY = 'habit-tracker-v1';
const IMAGES_KEY = 'habit-tracker-images-v1'; // photos are kept apart so everyday saves stay small
const $ = (sel) => document.querySelector(sel);

// ---------- Style options ----------
const DEFAULT_SETTINGS = {
  theme: 'auto', tint: null, done: null, font: 'system', scale: 1, round: 1,
  bgType: 'default', bgColor: null, bgDim: 0.35, myColors: [], custom: null,
};

// Colors you can set yourself in "Custom" appearance mode.
const CUSTOM_KEYS = [
  ['bg', 'Page background'],
  ['card', 'Cards'],
  ['title', 'Page titles'],
  ['heading', 'Habit names & headings'],
  ['text', 'Text'],
  ['muted', 'Secondary text'],
  ['tabbar', 'Tab bar'],
  ['miss', '"Missed" color'],
];

const PRESETS = {
  light: { label: 'Light', colors: { bg: '#f2f2f7', card: '#ffffff', title: '#1c1c1e', heading: '#1c1c1e', text: '#1c1c1e', muted: '#8e8e93', tabbar: '#f9f9f9', miss: '#ff3b30' } },
  dark: { label: 'Dark', colors: { bg: '#000000', card: '#1c1c1e', title: '#f2f2f7', heading: '#f2f2f7', text: '#f2f2f7', muted: '#8e8e93', tabbar: '#161618', miss: '#ff453a' } },
  ocean: { label: 'Ocean', colors: { bg: '#e3f2f7', card: '#ffffff', title: '#0b4f6c', heading: '#0b4f6c', text: '#1d3540', muted: '#5f8796', tabbar: '#f2fafc', miss: '#e5534b' } },
  rose: { label: 'Rose', colors: { bg: '#fdeef2', card: '#fffafb', title: '#9d174d', heading: '#831843', text: '#3f1d2b', muted: '#a26f82', tabbar: '#fff5f8', miss: '#dc2626' } },
  sand: { label: 'Sand', colors: { bg: '#f5efe4', card: '#fffaf2', title: '#7c4a1e', heading: '#5b3716', text: '#3b2a1a', muted: '#9c8670', tabbar: '#faf5ec', miss: '#c2410c' } },
  forest: { label: 'Forest', colors: { bg: '#1f2d24', card: '#2b3d31', title: '#d9f2c4', heading: '#e8f5dc', text: '#e1ebdd', muted: '#93a897', tabbar: '#18231c', miss: '#f87171' } },
  midnight: { label: 'Midnight', colors: { bg: '#0f1226', card: '#1b1f3b', title: '#c4b5fd', heading: '#e0e7ff', text: '#e0e7ff', muted: '#8b90b8', tabbar: '#0c0f20', miss: '#fb7185' } },
};

// Extra greys/black/white offered when picking text and background colors.
const NEUTRALS = ['#ffffff', '#f2f2f7', '#d1d1d6', '#8e8e93', '#48484a', '#1c1c1e', '#000000'];

// iOS ships all of these, so they work offline. On other devices the fallbacks are used.
const FONTS = {
  system: { label: 'System', stack: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", sans-serif' },
  rounded: { label: 'Rounded', stack: 'ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif' },
  serif: { label: 'Serif', stack: 'ui-serif, "New York", Georgia, serif' },
  mono: { label: 'Monospace', stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
  avenir: { label: 'Avenir Next', stack: '"Avenir Next", Avenir, "Segoe UI", sans-serif' },
  futura: { label: 'Futura', stack: 'Futura, "Century Gothic", "Trebuchet MS", sans-serif' },
  noteworthy: { label: 'Noteworthy', stack: 'Noteworthy, "Bradley Hand", "Segoe Print", cursive' },
  chalkboard: { label: 'Chalkboard', stack: '"Chalkboard SE", "Comic Sans MS", cursive' },
};

const COLORS = ['#007aff', '#5856d6', '#af52de', '#ff2d55', '#ff3b30', '#ff9500',
  '#ffcc00', '#34c759', '#00c7be', '#30b0c7', '#a2845e', '#8e8e93'];

const EMOJIS = ['💧', '📚', '🚶', '🏃', '🧘', '💪', '🚴', '🏊',
  '🍎', '🥗', '☕', '🚭', '😴', '🛏️', '☀️', '🌙',
  '✍️', '📝', '🧠', '💻', '🎸', '🎨', '📵', '🧹',
  '💊', '🦷', '🧴', '🙏', '💰', '🌱', '🐶', '❤️'];

// "Add to Google Calendar" choices for to-dos.
const DURATIONS = [[15, '15 min'], [30, '30 min'], [60, '1 hour'], [90, '1½ hours'], [120, '2 hours'], [180, '3 hours']];
const CAL_REPEATS = { none: "Doesn't repeat", DAILY: 'Every day', WEEKLY: 'Every week', MONTHLY: 'Every month' };

// ---------- Storage ----------
// Shape: { habits: [{ id, name, createdAt, emoji?, color? }],
//          log: { 'YYYY-MM-DD': { [habitId]: 'done' | 'missed' } },
//          settings: { theme, tint, done, font, scale, round, bgType, bgColor, bgDim, myColors, custom },
//          todos: [{ id, text, done, doneAt }],
//          notes: [{ id, title, body, createdAt, updatedAt }] }
// Images live under IMAGES_KEY: { bg: dataURL | null, icons: { [habitId]: dataURL } }
function load() {
  let data = null;
  try {
    data = JSON.parse(localStorage.getItem(STORE_KEY));
  } catch (e) { /* fall through to empty state */ }
  return isValidData(data) ? normalize(data) : normalize({ habits: [], log: {} });
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    alert('Could not save your data: ' + e.message);
  }
}

function isValidData(data) {
  return data && Array.isArray(data.habits) && data.log && typeof data.log === 'object' &&
    data.habits.every((h) => h && typeof h.id === 'string' && typeof h.name === 'string');
}

const validColor = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : null);

function normalize(data) {
  const s = { ...DEFAULT_SETTINGS, ...(data.settings && typeof data.settings === 'object' ? data.settings : {}) };
  if (!['auto', 'light', 'dark', 'custom'].includes(s.theme)) s.theme = 'auto';
  const custom = s.custom && typeof s.custom === 'object' ? s.custom : {};
  s.custom = Object.fromEntries(CUSTOM_KEYS.map(([k]) => [k, validColor(custom[k]) || PRESETS.light.colors[k]]));
  if (!FONTS[s.font]) s.font = 'system';
  s.tint = validColor(s.tint);
  s.done = validColor(s.done);
  s.scale = Number(s.scale) || 1;
  s.round = Number(s.round) || 1;
  if (!['default', 'color', 'image'].includes(s.bgType)) s.bgType = 'default';
  s.bgColor = validColor(s.bgColor);
  s.bgDim = Math.min(0.9, Math.max(0, Number(s.bgDim) || 0));
  s.myColors = (Array.isArray(s.myColors) ? s.myColors : []).map(validColor).filter(Boolean).slice(-24);

  const habits = data.habits.map((h) => {
    const out = { id: h.id, name: h.name, createdAt: h.createdAt || '' };
    if (typeof h.emoji === 'string' && h.emoji) out.emoji = h.emoji.slice(0, 16);
    if (validColor(h.color)) out.color = validColor(h.color);
    return out;
  });
  // Older versions had "reminders"; they carry over as to-dos.
  const rawTodos = Array.isArray(data.todos) ? data.todos : Array.isArray(data.reminders) ? data.reminders : [];
  const todos = rawTodos
    .filter((t) => t && typeof t.id === 'string' && typeof t.text === 'string')
    .map((t) => {
      const out = { id: t.id, text: t.text.slice(0, 200), done: !!t.done, doneAt: typeof t.doneAt === 'string' ? t.doneAt : null };
      const cal = validCal(t.cal);
      if (cal) out.cal = cal;
      return out;
    });

  const now = new Date().toISOString();
  const notes = (Array.isArray(data.notes) ? data.notes : [])
    .filter((n) => n && typeof n.id === 'string')
    .map((n) => ({
      id: n.id,
      title: typeof n.title === 'string' ? n.title.slice(0, 120) : '',
      body: typeof n.body === 'string' ? n.body : '',
      createdAt: typeof n.createdAt === 'string' ? n.createdAt : now,
      updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : now,
    }));
  return { habits, log: data.log, settings: s, todos, notes };
}

const DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const validImage = (x) => (typeof x === 'string' && DATA_URL.test(x) ? x : null);

function normalizeImages(x) {
  const out = { bg: null, icons: {} };
  if (!x || typeof x !== 'object') return out;
  out.bg = validImage(x.bg);
  if (x.icons && typeof x.icons === 'object') {
    for (const [id, url] of Object.entries(x.icons)) if (validImage(url)) out.icons[id] = url;
  }
  return out;
}

function loadImages() {
  try {
    return normalizeImages(JSON.parse(localStorage.getItem(IMAGES_KEY)));
  } catch (e) {
    return normalizeImages(null);
  }
}

function saveImages() {
  try {
    localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
    return true;
  } catch (e) {
    alert('There is not enough space to save this picture. Try a smaller one, or remove some other pictures first.');
    return false;
  }
}

// Shrinks a picked photo so it fits comfortably in the phone's app storage.
function resizeImage(file, { max, square = false, type = 'image/jpeg', quality = 0.82 }) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (square) {
        const side = Math.min(sw, sh);
        sx = (sw - side) / 2;
        sy = (sh - side) / 2;
        sw = sh = side;
      }
      const scale = Math.min(1, max / Math.max(sw, sh));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(type, quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not open that picture. Try a JPEG or PNG image.'));
    };
    img.src = url;
  });
}

// ---------- Dates (always local midnight) ----------
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const today = () => startOfDay(new Date());
const sameDay = (a, b) => a.getTime() === b.getTime();
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const daysBetween = (a, b) => Math.round((b - a) / 86400000);

// ---------- State ----------
let state = load();
let images = loadImages();
let shownBg = null; // background photo currently on screen, so we only swap it when it changes
let viewDate = today();
let lastSeenDay = dayKey(viewDate);
let currentTab = 'today';
let editingHabitId = null; // habit whose icon/color editor is open in the Style tab
let editingCustomKey = null; // custom theme color whose swatches are open in the Style tab
let editingTodoId = null; // to-do whose text is being edited
let calTodoId = null; // to-do whose "add to Google Calendar" panel is open
let todoView = 'list'; // 'list' or 'calendar' in the To-do tab
let calMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1); // month shown in the calendar
let calDay = viewDate; // day selected in the calendar
let openNoteId = null; // note open in the editor (null = notes list)
let noteQuery = '';
let noteSaveTimer = null;

function getStatus(id, d) {
  const day = state.log[dayKey(d)];
  return day ? day[id] : undefined;
}

// Tapping the same status again clears it.
function toggleStatus(id, d, value) {
  const k = dayKey(d);
  const day = state.log[k] || (state.log[k] = {});
  if (day[id] === value) delete day[id];
  else day[id] = value;
  if (!Object.keys(day).length) delete state.log[k];
  save();
}

function currentStreak(id) {
  let d = today();
  // Not having marked today yet shouldn't break the streak.
  if (getStatus(id, d) !== 'done') d = addDays(d, -1);
  let n = 0;
  while (getStatus(id, d) === 'done') { n++; d = addDays(d, -1); }
  return n;
}

function bestStreak(id) {
  const days = Object.keys(state.log).filter((k) => state.log[k][id] === 'done').sort();
  let best = 0, run = 0, prev = null;
  for (const k of days) {
    const d = parseKey(k);
    run = prev && sameDay(addDays(prev, 1), d) ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

function doneInLast(id, n) {
  const t = today();
  let count = 0;
  for (let i = 0; i < n; i++) if (getStatus(id, addDays(t, -i)) === 'done') count++;
  return count;
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- Theme ----------
// Black or white text, whichever reads better on the given color.
function textOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#000000' : '#ffffff';
}

function setColorVar(style, name, color) {
  if (color) {
    style.setProperty(name, color);
    style.setProperty(`${name}-text`, textOn(color));
  } else {
    style.removeProperty(name);
    style.removeProperty(`${name}-text`);
  }
}

// Blend two hex colors; t = 0 gives a, t = 1 gives b.
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  return '#' + [16, 8, 0].map((shift) => {
    const v = Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
    return v.toString(16).padStart(2, '0');
  }).join('');
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Page colors that Custom mode or a background color can override.
const MANAGED_VARS = ['--bg', '--card', '--text', '--muted', '--heading', '--line', '--empty',
  '--miss', '--miss-soft', '--tabbar', '--on-bg', '--on-bg-muted'];

// CSS variables that give a habit its own "done" color.
const habitVars = (h) => (h.color ? `--accent:${h.color};--accent-text:${textOn(h.color)}` : null);

function applySettings() {
  const s = state.settings;
  const root = document.documentElement;
  if (s.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = s.theme;
  setColorVar(root.style, '--tint', s.tint);
  setColorVar(root.style, '--accent', s.done);
  root.style.setProperty('--font', FONTS[s.font].stack);
  root.style.setProperty('--scale', s.scale);
  root.style.setProperty('--round', s.round);

  const vars = {};
  if (s.theme === 'custom') {
    const c = s.custom;
    Object.assign(vars, {
      '--bg': c.bg, '--card': c.card, '--text': c.text, '--muted': c.muted, '--heading': c.heading,
      '--line': mix(c.card, c.text, 0.14), '--empty': mix(c.card, c.text, 0.09),
      '--miss': c.miss, '--miss-soft': mix(c.card, c.miss, 0.45), '--tabbar': rgba(c.tabbar, 0.92),
      '--on-bg': c.title, '--on-bg-muted': mix(c.bg, c.title, 0.7),
    });
    root.style.colorScheme = textOn(c.bg) === '#000000' ? 'light' : 'dark';
  } else {
    root.style.colorScheme = '';
  }

  // Background: theme default, a solid color, or a photo.
  const bgColor = s.bgType === 'color' ? s.bgColor : null;
  if (bgColor) {
    vars['--bg'] = bgColor;
    if (s.theme !== 'custom') { // in Custom mode your own title colors win
      const t = textOn(bgColor);
      vars['--on-bg'] = t;
      vars['--on-bg-muted'] = t === '#000000' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.75)';
    }
  }
  for (const name of MANAGED_VARS) {
    if (vars[name]) root.style.setProperty(name, vars[name]);
    else root.style.removeProperty(name);
  }
  const photo = s.bgType === 'image' ? images.bg : null;
  root.classList.toggle('has-bg-image', !!photo);
  root.style.setProperty('--dim', s.bgDim);
  if (photo !== shownBg) {
    $('#backdrop').style.backgroundImage = photo ? `url("${photo}")` : '';
    shownBg = photo;
  }

  const bg = getComputedStyle(root).backgroundColor;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.content = s.theme === 'auto' && !bgColor ? m.dataset.default : bg;
  });
}

// ---------- DOM helpers ----------
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v; // only used with the static icons below
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...children.filter((c) => c != null));
  return node;
}

const ICONS = {
  up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4"/></svg>',
};

// A habit's icon: uploaded picture first, then emoji, otherwise nothing.
function tile(h, extra = '') {
  const img = images.icons[h.id];
  if (img) return el('div', { class: `tile has-img ${extra}` }, el('img', { src: img, alt: '' }));
  return h.emoji ? el('div', { class: `tile ${extra}`, text: h.emoji }) : null;
}

// A button that opens the photo picker (a real <label>+<input>, which iPhone Safari handles reliably).
function fileButton(label, className, onFile) {
  const input = el('input', { type: 'file', accept: 'image/*', hidden: true });
  input.addEventListener('change', () => {
    const file = input.files[0];
    input.value = '';
    if (file) onFile(file);
  });
  return el('label', { class: className }, label, input);
}

// ---------- Today ----------
function habitCard(h, status, meta, onMark) {
  const mark = (value, label, symbol) => el('button', {
    class: `mark ${value}${status === value ? ' on' : ''}`,
    'aria-label': `${label}: ${h.name}`,
    'aria-pressed': String(status === value),
    onclick: () => onMark(value),
  }, symbol);

  return el('li', { class: `card habit ${status || ''}`, style: habitVars(h) },
    tile(h),
    el('div', { class: 'info' },
      el('div', { class: 'name', text: h.name }),
      el('div', { class: 'meta', text: meta })),
    el('div', { class: 'actions' }, mark('done', 'Done', '✓'), mark('missed', 'Missed', '✕')));
}

function renderToday() {
  const t = today();
  const diff = daysBetween(viewDate, t);
  const heading = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday'
    : viewDate.toLocaleDateString(undefined, { weekday: 'long' });

  $('#date-label').replaceChildren(
    el('strong', { text: heading }),
    el('span', { text: viewDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) })
  );
  $('#next-day').disabled = diff === 0;

  const habits = state.habits;
  $('#today-empty').hidden = habits.length > 0;
  $('#progress').hidden = habits.length === 0;

  const done = habits.filter((h) => getStatus(h.id, viewDate) === 'done').length;
  $('#progress-fill').style.width = habits.length ? `${(done / habits.length) * 100}%` : '0';
  $('#progress-text').textContent = done === habits.length && done > 0
    ? `All ${done} done — nice work! 🎉`
    : `${done} of ${habits.length} done`;

  $('#today-list').replaceChildren(...habits.map((h) => {
    const streak = currentStreak(h.id);
    return habitCard(h, getStatus(h.id, viewDate), streak ? `🔥 ${streak} day streak` : 'No streak yet',
      (value) => { toggleStatus(h.id, viewDate, value); renderToday(); });
  }));
}

// ---------- History ----------
function renderHistory() {
  const box = $('#history');
  if (!state.habits.length) {
    box.replaceChildren(el('p', { class: 'empty', text: 'No habits yet. Add one in the Habits tab.' }));
    return;
  }

  const t = today();
  const weeks = 5;
  const mondayOffset = (t.getDay() + 6) % 7;
  const start = addDays(t, -mondayOffset - 7 * (weeks - 1));
  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const stat = (label, value) => el('div', { class: 'stat' }, el('b', { text: String(value) }), el('small', { text: label }));

  box.replaceChildren(...state.habits.map((h) => {
    const cells = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(start, i);
      const future = d > t;
      const s = future ? 'future' : (getStatus(h.id, d) || '');
      cells.push(el('button', {
        class: `cell ${s}${sameDay(d, t) ? ' today' : ''}`,
        'aria-label': `${d.toLocaleDateString()}: ${s || 'not marked'}`,
        disabled: future,
        onclick: () => { viewDate = d; showTab('today'); },
      }, future ? '' : String(d.getDate())));
    }
    return el('div', { class: 'card hist', style: habitVars(h) },
      el('div', { class: 'hist-head' }, tile(h, 'small'), el('div', { class: 'name', text: h.name })),
      el('div', { class: 'stats' },
        stat('Current streak', currentStreak(h.id)),
        stat('Best streak', bestStreak(h.id)),
        stat('Last 30 days', `${doneInLast(h.id, 30)}/30`)),
      el('div', { class: 'grid' }, ...weekdays.map((w) => el('div', { class: 'wd', text: w })), ...cells));
  }));
}

// ---------- Manage habits ----------
function renderHabits() {
  const habits = state.habits;
  $('#habits-empty').hidden = habits.length > 0;
  $('#habit-list').replaceChildren(...habits.map((h, i) => el('li', { class: 'card row', style: habitVars(h) },
    tile(h, 'small'),
    el('span', { class: 'name', text: h.name }),
    el('div', { class: 'row-actions' },
      el('button', { class: 'icon', 'aria-label': 'Move up', disabled: i === 0, html: ICONS.up, onclick: () => moveHabit(i, -1) }),
      el('button', { class: 'icon', 'aria-label': 'Move down', disabled: i === habits.length - 1, html: ICONS.down, onclick: () => moveHabit(i, 1) }),
      el('button', { class: 'icon', 'aria-label': 'Rename', html: ICONS.edit, onclick: () => renameHabit(h) }),
      el('button', { class: 'icon danger', 'aria-label': 'Delete', html: ICONS.trash, onclick: () => deleteHabit(h) })))));
}

function addHabit(name) {
  state.habits.push({ id: newId(), name, createdAt: dayKey(today()) });
  save();
  renderHabits();
}

function moveHabit(i, delta) {
  const list = state.habits;
  [list[i], list[i + delta]] = [list[i + delta], list[i]];
  save();
  renderHabits();
}

function renameHabit(h) {
  const name = prompt('Rename habit', h.name);
  if (name == null || !name.trim()) return;
  h.name = name.trim().slice(0, 60);
  save();
  renderHabits();
}

function deleteHabit(h) {
  if (!confirm(`Delete "${h.name}" and all of its history?`)) return;
  state.habits = state.habits.filter((x) => x.id !== h.id);
  for (const k of Object.keys(state.log)) {
    delete state.log[k][h.id];
    if (!Object.keys(state.log[k]).length) delete state.log[k];
  }
  save();
  if (images.icons[h.id]) {
    delete images.icons[h.id];
    saveImages();
  }
  renderHabits();
}

// ---------- Style ----------
function segmented(options, value, onPick) {
  return el('div', { class: 'seg', role: 'group' }, ...options.map(([v, label]) =>
    el('button', { class: v === value ? 'on' : '', 'aria-pressed': String(v === value), text: label, onclick: () => onPick(v) })));
}

// The rainbow circle: a real color input, so tapping it opens the iPhone color picker.
// onPick(color, final): final is false while dragging in the picker, so we don't re-render under it.
function colorPicker(initial, onPick) {
  const input = el('input', { type: 'color', class: 'swatch picker', value: initial, 'aria-label': 'Pick any color', title: 'Pick any color' });
  input.addEventListener('input', () => onPick(input.value, false));
  input.addEventListener('change', () => onPick(input.value, true));
  return input;
}

// Colors made with the picker are remembered in "My colors" and offered everywhere.
function addMyColor(c) {
  const mine = state.settings.myColors;
  c = validColor(c);
  if (!c || COLORS.includes(c) || mine.includes(c)) return;
  mine.push(c);
  if (mine.length > 24) mine.shift();
}

// defaultLabel: text for the "use the default" button, or null to leave it out.
function swatches(value, defaultLabel, onPick, extra = []) {
  const palette = [...new Set([...extra, ...COLORS, ...state.settings.myColors])];
  if (value && !palette.includes(value)) palette.push(value);

  return el('div', { class: 'swatches' },
    defaultLabel ? el('button', { class: `swatch default${value ? '' : ' on'}`, text: defaultLabel, onclick: () => onPick(null, true) }) : null,
    ...palette.map((c) => el('button', {
      class: `swatch${value === c ? ' on' : ''}`, style: `background:${c}`, 'aria-label': c, onclick: () => onPick(c, true),
    })),
    colorPicker(value || '#007aff', (c, final) => {
      if (final) addMyColor(c);
      onPick(c, final);
    }));
}

function setSetting(patch, final = true) {
  Object.assign(state.settings, patch);
  save();
  applySettings();
  if (final) renderStyle();
}

function updateHabitStyle(h, patch, final = true) {
  Object.assign(h, patch);
  for (const k of Object.keys(patch)) if (patch[k] == null) delete h[k];
  save();
  if (final) renderStyle();
}

function setHabitIcon(h, { emoji = null, image = null }) {
  if (image) {
    const prev = images.icons[h.id];
    images.icons[h.id] = image;
    if (!saveImages()) {
      if (prev) images.icons[h.id] = prev;
      else delete images.icons[h.id];
      return;
    }
  } else if (images.icons[h.id]) {
    delete images.icons[h.id];
    saveImages();
  }
  updateHabitStyle(h, { emoji });
}

async function uploadHabitImage(h, file) {
  try {
    setHabitIcon(h, { image: await resizeImage(file, { max: 160, square: true, type: 'image/png' }) });
  } catch (e) {
    alert(e.message);
  }
}

async function uploadBackground(file) {
  try {
    const url = await resizeImage(file, { max: 1800 });
    const prev = images.bg;
    images.bg = url;
    if (!saveImages()) {
      images.bg = prev;
      return;
    }
    setSetting({ bgType: 'image' });
  } catch (e) {
    alert(e.message);
  }
}

function removeBackground() {
  images.bg = null;
  saveImages();
  setSetting({ bgType: 'default' });
}

function firstGrapheme(text) {
  if (window.Intl && Intl.Segmenter) {
    const first = new Intl.Segmenter().segment(text)[Symbol.iterator]().next().value;
    return first ? first.segment : '';
  }
  return Array.from(text)[0] || '';
}

function habitStyleRows() {
  if (!state.habits.length) return [el('p', { class: 'meta', text: 'Add habits in the Habits tab, then give each one an icon and color here.' })];

  return state.habits.flatMap((h) => {
    const open = editingHabitId === h.id;
    const row = el('button', {
      class: 'hs-row', style: habitVars(h), 'aria-expanded': String(open),
      onclick: () => { editingHabitId = open ? null : h.id; renderStyle(); },
    },
      tile(h) || el('div', { class: 'tile placeholder', text: '+' }),
      el('span', { class: 'name', text: h.name }),
      el('span', { class: 'chev', text: open ? '▴' : '▾' }));
    if (!open) return [row];

    const hasImage = !!images.icons[h.id];
    const emojiInput = el('input', { class: 'emoji-input', placeholder: 'Or type any emoji…', enterkeyhint: 'done', 'aria-label': 'Custom icon' });
    emojiInput.addEventListener('change', () => {
      const e = firstGrapheme(emojiInput.value.trim());
      if (e) setHabitIcon(h, { emoji: e });
    });

    const editor = el('div', { class: 'hs-editor' },
      el('div', { class: 'sub', text: 'Icon (emoji or your own picture)' }),
      el('div', { class: 'emoji-grid' },
        el('button', { class: `wide${h.emoji || hasImage ? '' : ' on'}`, text: 'None', onclick: () => setHabitIcon(h, {}) }),
        fileButton(hasImage ? 'Change photo' : '📷 Photo', `wide${hasImage ? ' on' : ''}`, (file) => uploadHabitImage(h, file)),
        ...EMOJIS.map((e) => el('button', { class: h.emoji === e && !hasImage ? 'on' : '', text: e, onclick: () => setHabitIcon(h, { emoji: e }) }))),
      emojiInput,
      el('div', { class: 'sub', text: 'Color' }),
      swatches(h.color || null, 'Default', (c, final) => updateHabitStyle(h, { color: c }, final)));
    return [row, editor];
  });
}

function backgroundOptions() {
  const s = state.settings;
  const content = [segmented([['default', 'Default'], ['color', 'Color'], ['image', 'Photo']], s.bgType, (v) => setSetting({ bgType: v }))];

  if (s.bgType === 'color') {
    content.push(swatches(s.bgColor, 'None', (c, final) => setSetting({ bgColor: c }, final), NEUTRALS));
  } else if (s.bgType === 'image') {
    if (images.bg) {
      const fade = el('input', { type: 'range', min: '0', max: '0.9', step: '0.05', value: String(s.bgDim) });
      fade.addEventListener('input', () => setSetting({ bgDim: Number(fade.value) }, false));
      content.push(
        el('div', { class: 'bg-thumb', style: `background-image:url("${images.bg}")` }),
        el('label', { class: 'slider-label' }, 'Fade the photo (makes text easier to read)', fade),
        el('div', { class: 'button-row' },
          fileButton('Change photo', 'secondary btn', uploadBackground),
          el('button', { class: 'secondary', text: 'Remove photo', onclick: removeBackground })));
    } else {
      content.push(fileButton('Choose a photo…', 'primary btn', uploadBackground));
    }
  }
  return el('div', { class: 'bg-options' }, ...content);
}

function customThemeEditor() {
  const c = state.settings.custom;
  const preset = ([, p]) => el('button', {
    class: 'preset', style: `background:${p.colors.bg};color:${p.colors.title}`,
    onclick: () => setSetting({ custom: { ...p.colors } }),
  },
    el('span', { class: 'preset-card', style: `background:${p.colors.card};color:${p.colors.heading}`, text: 'Aa' }),
    el('span', { text: p.label }));

  const rows = CUSTOM_KEYS.flatMap(([key, label]) => {
    const open = editingCustomKey === key;
    const row = el('button', {
      class: 'hs-row', 'aria-expanded': String(open),
      onclick: () => { editingCustomKey = open ? null : key; renderStyle(); },
    },
      el('span', { class: 'swatch dot', style: `background:${c[key]}` }),
      el('span', { class: 'name', text: label }),
      el('span', { class: 'chev', text: open ? '▴' : '▾' }));
    if (!open) return [row];
    return [row, el('div', { class: 'hs-editor' },
      swatches(c[key], null, (color, final) => { c[key] = color; setSetting({}, final); }, NEUTRALS))];
  });

  return el('div', { class: 'custom-editor' },
    el('div', { class: 'sub', text: 'Start from a preset' }),
    el('div', { class: 'presets' }, ...Object.entries(PRESETS).map(preset)),
    el('div', { class: 'sub', text: 'Your colors (tap one to change it)' }),
    el('div', {}, ...rows));
}

function myColorsEditor() {
  const s = state.settings;
  return el('div', {},
    el('div', { class: 'swatches' },
      ...s.myColors.map((c) => el('div', { class: 'mycolor' },
        el('div', { class: 'swatch', style: `background:${c}` }),
        el('button', {
          class: 'x', text: '×', 'aria-label': `Remove ${c}`,
          onclick: () => setSetting({ myColors: s.myColors.filter((x) => x !== c) }),
        }))),
      colorPicker('#ff6b9d', (c, final) => {
        if (!final) return;
        addMyColor(c);
        setSetting({});
      })),
    el('p', { class: 'hint', text: 'Tap the rainbow circle to make your own color. It is saved here and shows up in every color list.' }));
}

function renderStyle() {
  const s = state.settings;
  const section = (label, ...content) => [
    el('div', { class: 'section-label', text: label }),
    el('div', { class: 'card settings-card' }, ...content),
  ];
  const sample = state.habits[0] || { id: '_', name: 'Drink water', emoji: '💧' };

  $('#style').replaceChildren(
    el('div', { class: 'section-label', text: 'Preview' }),
    el('ul', { class: 'list preview', 'aria-hidden': 'true' }, habitCard(sample, 'done', '🔥 5 day streak', () => {})),

    ...section('Appearance',
      segmented([['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark'], ['custom', 'Custom']], s.theme, (v) => setSetting({ theme: v })),
      s.theme === 'custom' ? customThemeEditor() : null),
    ...section('Background', backgroundOptions()),
    ...section('App color', swatches(s.tint, 'Blue', (c, final) => setSetting({ tint: c }, final)),
      el('p', { class: 'hint', text: 'Used for buttons, tabs, arrows and selected options.' })),
    ...section('Done color', swatches(s.done, 'Green', (c, final) => setSetting({ done: c }, final)),
      el('p', { class: 'hint', text: 'Used for ✓ marks, the progress bar and the history calendar.' })),
    ...section('My colors', myColorsEditor()),
    ...section('Font', el('div', { class: 'font-list' }, ...Object.entries(FONTS).map(([key, f]) =>
      el('button', { style: `font-family:${f.stack}`, 'aria-pressed': String(s.font === key), onclick: () => setSetting({ font: key }) },
        el('span', { text: f.label }),
        s.font === key ? el('span', { class: 'check', text: '✓' }) : null)))),
    ...section('Text size', segmented([[0.9, 'Small'], [1, 'Medium'], [1.12, 'Large'], [1.25, 'Huge']], s.scale, (v) => setSetting({ scale: v }))),
    ...section('Corners', segmented([[1, 'Round'], [0.5, 'Soft'], [0.12, 'Square']], s.round, (v) => setSetting({ round: v }))),
    ...section('Habit icons & colors', ...habitStyleRows()),

    el('button', {
      class: 'secondary reset', text: 'Reset style to defaults',
      onclick: () => {
        if (confirm('Reset theme, background, colors, font, text size and corners? Habit icons, My colors and your Custom theme colors are kept.')) {
          setSetting({ ...DEFAULT_SETTINGS, myColors: s.myColors, custom: s.custom });
        }
      },
    })
  );
}

// ---------- To-do ----------
function addTodo(text) {
  state.todos.push({ id: newId(), text, done: false, doneAt: null });
  save();
  renderTodos();
}

function toggleTodo(t) {
  t.done = !t.done;
  t.doneAt = t.done ? new Date().toISOString() : null;
  save();
  renderTodos();
}

function deleteTodo(t) {
  state.todos = state.todos.filter((x) => x.id !== t.id);
  save();
  renderTodos();
}

function todoItem(t) {
  const editing = editingTodoId === t.id;
  let body;
  if (editing) {
    body = el('input', { class: 'field todo-input', value: t.text, maxlength: '200', enterkeyhint: 'done', 'aria-label': 'Edit to-do' });
    body.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); body.blur(); }
      if (e.key === 'Escape') { body.value = t.text; body.blur(); }
    });
    body.addEventListener('blur', () => {
      if (editingTodoId !== t.id) return;
      editingTodoId = null;
      const text = body.value.trim();
      if (text && text !== t.text) {
        t.text = text;
        save();
      }
      renderTodos();
    });
  } else {
    body = el('button', { class: 'todo-text', text: t.text, onclick: () => { editingTodoId = t.id; renderTodos(); } });
  }
  const calOpen = calTodoId === t.id && !editing;

  return el('li', { class: `card todo${t.done ? ' done' : ''}` },
    el('button', {
      class: `check-circle${t.done ? ' on' : ''}`, 'aria-label': `${t.done ? 'Mark not done' : 'Mark done'}: ${t.text}`,
      'aria-pressed': String(t.done), onclick: () => toggleTodo(t),
    }, t.done ? '✓' : ''),
    el('div', { class: 'todo-main' },
      body,
      t.cal && !editing ? el('div', { class: 'todo-meta', text: `📅 ${calLabel(t.cal)}` }) : null),
    editing ? null : el('button', {
      class: `icon${calOpen ? ' active' : ''}`, 'aria-label': `Add to Google Calendar: ${t.text}`, 'aria-expanded': String(calOpen),
      html: ICONS.calendar, onclick: () => { calTodoId = calOpen ? null : t.id; renderTodos(); },
    }),
    editing ? null : el('button', { class: 'icon danger', 'aria-label': `Delete: ${t.text}`, html: ICONS.trash, onclick: () => deleteTodo(t) }),
    calOpen ? calendarPanel(t) : null);
}

// ---------- Google Calendar ----------
// Google Calendar's "new event" link opens with the event filled in; you just tap Save.
// Nothing is sent anywhere until you do, and no Google sign-in is needed inside this app.
function validCal(c) {
  if (!c || typeof c !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) return null;
  return {
    date: c.date,
    time: /^\d{2}:\d{2}$/.test(c.time) ? c.time : null,
    dur: DURATIONS.some(([m]) => m === c.dur) ? c.dur : 60,
    repeat: CAL_REPEATS[c.repeat] ? c.repeat : 'none',
  };
}

function calLabel(c) {
  const d = parseKey(c.date);
  const diff = daysBetween(today(), d);
  let text = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow'
    : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  if (c.time) {
    const [h, m] = c.time.split(':').map(Number);
    text += ` · ${new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (c.repeat !== 'none') text += ` · ${CAL_REPEATS[c.repeat].toLowerCase()}`;
  return text;
}

function googleCalendarUrl(text, c) {
  const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const day = parseKey(c.date);
  let dates;
  if (c.time) {
    const [h, m] = c.time.split(':').map(Number);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
    const end = new Date(start.getTime() + c.dur * 60000);
    const stamp = (d) => `${ymd(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    dates = `${stamp(start)}/${stamp(end)}`;
  } else {
    dates = `${ymd(day)}/${ymd(addDays(day, 1))}`; // all-day event
  }
  const params = new URLSearchParams({ action: 'TEMPLATE', text, dates });
  try {
    params.set('ctz', Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch (e) { /* Google uses your calendar's time zone instead */ }
  if (c.repeat !== 'none') params.set('recur', `RRULE:FREQ=${c.repeat}`);
  return `https://calendar.google.com/calendar/render?${params}`;
}

function calendarPanel(t) {
  const c = t.cal || { date: dayKey(today()), time: null, dur: 60, repeat: 'none' };
  const date = el('input', { class: 'field', type: 'date', value: c.date, 'aria-label': 'Date' });
  const time = el('input', { class: 'field', type: 'time', value: c.time || '', 'aria-label': 'Time' });
  const dur = el('select', { class: 'field', 'aria-label': 'Duration' },
    ...DURATIONS.map(([m, label]) => el('option', { value: String(m), selected: m === c.dur }, label)));
  const repeat = el('select', { class: 'field', 'aria-label': 'Repeat' },
    ...Object.entries(CAL_REPEATS).map(([v, label]) => el('option', { value: v, selected: v === c.repeat }, label)));
  const hint = el('p', { class: 'hint' });

  const read = () => validCal({ date: date.value || dayKey(today()), time: time.value || null, dur: Number(dur.value), repeat: repeat.value });
  const link = el('a', { class: 'primary btn cal-go', target: '_blank', rel: 'noopener' }, 'Open in Google Calendar');
  const update = () => {
    const cal = read();
    link.href = googleCalendarUrl(t.text, cal);
    dur.disabled = !cal.time;
    hint.textContent = cal.time
      ? 'Google Calendar opens with this event filled in. Check it and tap Save.'
      : 'No time set, so this will be an all-day event. Google Calendar opens with it filled in. Tap Save.';
  };
  for (const input of [date, time, dur, repeat]) {
    input.addEventListener('input', update);
    input.addEventListener('change', update);
  }
  // Remember what was sent so the to-do shows its date. Re-render after the link has opened.
  link.addEventListener('click', () => {
    t.cal = read();
    calTodoId = null;
    save();
    setTimeout(renderTodos, 0);
  });
  update();

  return el('div', { class: 'cal-panel' },
    el('div', { class: 'cal-fields' },
      el('label', {}, 'Date', date),
      el('label', {}, 'Time (optional)', time),
      el('label', {}, 'Duration', dur),
      el('label', {}, 'Repeat', repeat)),
    hint,
    el('div', { class: 'button-row' },
      link,
      el('button', { class: 'secondary', text: 'Cancel', onclick: () => { calTodoId = null; renderTodos(); } })));
}

// ---------- Calendar view of dated to-dos ----------
// Same rules as Google Calendar: a monthly repeat on the 31st skips shorter months.
function occursOn(cal, day) {
  const start = parseKey(cal.date);
  if (day < start) return false;
  if (sameDay(day, start)) return true;
  if (cal.repeat === 'DAILY') return true;
  if (cal.repeat === 'WEEKLY') return daysBetween(start, day) % 7 === 0;
  if (cal.repeat === 'MONTHLY') return day.getDate() === start.getDate();
  return false;
}

// All-day items first, then by time.
const todosOn = (day) => state.todos
  .filter((t) => t.cal && occursOn(t.cal, day))
  .sort((a, b) => (a.cal.time || '').localeCompare(b.cal.time || ''));

function calTimeLabel(c) {
  if (!c.time) return 'All day';
  const [h, m] = c.time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function calendarGrid() {
  const t = today();
  const first = calMonth;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday first
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const start = addDays(first, -offset);
  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    const items = todosOn(d);
    const classes = ['cal-day'];
    if (d.getMonth() !== first.getMonth()) classes.push('other');
    if (sameDay(d, t)) classes.push('today');
    if (sameDay(d, calDay)) classes.push('selected');
    cells.push(el('button', {
      class: classes.join(' '),
      'aria-label': `${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}: ${items.length} item${items.length === 1 ? '' : 's'}`,
      'aria-pressed': String(sameDay(d, calDay)),
      onclick: () => {
        calDay = d;
        if (d.getMonth() !== calMonth.getMonth()) calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        renderTodoCalendar();
      },
    },
      el('span', { class: 'cal-num', text: String(d.getDate()) }),
      el('span', { class: 'cal-dots' }, ...items.slice(0, 3).map((x) => el('i', { class: x.done ? 'done' : '' })))));
  }

  const moveMonth = (n) => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + n, 1);
    renderTodoCalendar();
  };
  return el('div', { class: 'card cal-month' },
    el('div', { class: 'cal-head' },
      el('button', { class: 'nav', 'aria-label': 'Previous month', text: '‹', onclick: () => moveMonth(-1) }),
      el('button', {
        class: 'cal-title', 'aria-label': 'Go to today',
        text: first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        onclick: () => { calDay = today(); calMonth = new Date(calDay.getFullYear(), calDay.getMonth(), 1); renderTodoCalendar(); },
      }),
      el('button', { class: 'nav', 'aria-label': 'Next month', text: '›', onclick: () => moveMonth(1) })),
    el('div', { class: 'cal-grid' }, ...weekdays.map((w) => el('div', { class: 'wd', text: w })), ...cells));
}

function dayItem(t) {
  const meta = [calTimeLabel(t.cal), t.cal.repeat !== 'none' ? CAL_REPEATS[t.cal.repeat].toLowerCase() : ''].filter(Boolean).join(' · ');
  return el('li', { class: `card todo${t.done ? ' done' : ''}` },
    el('button', {
      class: `check-circle${t.done ? ' on' : ''}`, 'aria-label': `${t.done ? 'Mark not done' : 'Mark done'}: ${t.text}`,
      'aria-pressed': String(t.done),
      onclick: () => {
        t.done = !t.done;
        t.doneAt = t.done ? new Date().toISOString() : null;
        save();
        renderTodoCalendar();
      },
    }, t.done ? '✓' : ''),
    el('div', { class: 'todo-main' },
      el('span', { class: 'todo-text static', text: t.text }),
      el('div', { class: 'todo-meta', text: meta })),
    el('a', {
      class: 'icon', href: googleCalendarUrl(t.text, t.cal), target: '_blank', rel: 'noopener',
      'aria-label': `Open in Google Calendar: ${t.text}`, html: ICONS.calendar,
    }));
}

function renderTodoCalendar() {
  const items = todosOn(calDay);
  const text = el('input', { class: 'field', placeholder: 'Add something on this day…', maxlength: '200', autocomplete: 'off', enterkeyhint: 'done', 'aria-label': 'New item for this day' });
  const time = el('input', { class: 'field cal-add-time', type: 'time', 'aria-label': 'Time (optional)' });
  const form = el('form', { class: 'cal-add' }, text, time, el('button', { type: 'submit', class: 'primary', text: 'Add' }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = text.value.trim();
    if (!value) return text.focus();
    state.todos.push({
      id: newId(), text: value, done: false, doneAt: null,
      cal: { date: dayKey(calDay), time: time.value || null, dur: 60, repeat: 'none' },
    });
    save();
    renderTodoCalendar();
  });

  $('#todo-cal').replaceChildren(
    calendarGrid(),
    el('div', { class: 'section-label', text: calDay.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) }),
    items.length
      ? el('ul', { class: 'list' }, ...items.map(dayItem))
      : el('p', { class: 'empty cal-empty', text: 'Nothing on this day.' }),
    form,
    el('p', { class: 'hint cal-note', text: 'Shows your to-dos that have a date. Tap the calendar button on an item to add it to Google Calendar.' }));
}

function renderTodos() {
  // List / Calendar switch at the top of the To-do tab.
  $('#todo-switch').replaceChildren(segmented([['list', 'List'], ['calendar', 'Calendar']], todoView, (v) => {
    todoView = v;
    calTodoId = null;
    editingTodoId = null;
    renderTodos();
  }));
  const calendar = todoView === 'calendar';
  $('#todo-cal').hidden = !calendar;
  $('#todo-form').hidden = calendar;
  $('#todos').hidden = calendar;
  if (calendar) {
    renderTodoCalendar();
    return;
  }

  const open = state.todos.filter((t) => !t.done);
  const done = state.todos.filter((t) => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));

  const out = [];
  if (open.length) {
    out.push(el('div', { class: 'section-label', text: `To do (${open.length})` }), el('ul', { class: 'list' }, ...open.map(todoItem)));
  } else {
    out.push(el('p', { class: 'empty', text: done.length ? 'All done! 🎉' : 'Nothing to do yet. Add something above.' }));
  }
  if (done.length) {
    out.push(
      el('div', { class: 'section-head' },
        el('div', { class: 'section-label', text: `Completed (${done.length})` }),
        el('button', { class: 'link', text: 'Clear', onclick: () => {
          if (!confirm('Delete all completed to-dos?')) return;
          state.todos = state.todos.filter((t) => !t.done);
          save();
          renderTodos();
        } })),
      el('ul', { class: 'list' }, ...done.map(todoItem)));
  }
  $('#todos').replaceChildren(...out);

  // Focus right away (still inside the tap) so the iPhone keyboard opens.
  const input = $('#todos .todo-input');
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

// ---------- Notes ----------
const noteTitle = (n) => n.title.trim() || n.body.trim().split('\n')[0].slice(0, 60) || 'New note';

function notePreview(n) {
  const lines = n.body.trim().split('\n');
  const rest = n.title.trim() ? lines : lines.slice(1); // first line is already the title
  return rest.map((line) => line.trim()).filter(Boolean).join(' · ').replace(/\s+/g, ' ').slice(0, 140);
}

function formatEdited(iso) {
  const d = new Date(iso);
  const t = today();
  const diff = daysBetween(startOfDay(d), t);
  if (diff === 0) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(d.getFullYear() !== t.getFullYear() ? { year: 'numeric' } : {}) });
}

// Notes save a moment after you stop typing, and right away when you leave the note or the app.
function scheduleNoteSave() {
  clearTimeout(noteSaveTimer);
  noteSaveTimer = setTimeout(() => { noteSaveTimer = null; save(); }, 400);
}

function flushNoteSave() {
  if (!noteSaveTimer) return;
  clearTimeout(noteSaveTimer);
  noteSaveTimer = null;
  save();
}

function newNote() {
  const now = new Date().toISOString();
  const n = { id: newId(), title: '', body: '', createdAt: now, updatedAt: now };
  state.notes.push(n);
  openNoteId = n.id;
  save();
  renderNotes();
}

// Leaving a note: save it, and throw it away if nothing was written.
function closeNote() {
  flushNoteSave();
  const n = state.notes.find((x) => x.id === openNoteId);
  if (n && !n.title.trim() && !n.body.trim()) {
    state.notes = state.notes.filter((x) => x !== n);
    save();
  }
  openNoteId = null;
}

function noteCards() {
  const q = noteQuery.trim().toLowerCase();
  const notes = [...state.notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((n) => !q || `${n.title}\n${n.body}`.toLowerCase().includes(q));
  if (!notes.length) {
    return [el('li', { class: 'empty', text: state.notes.length ? 'No notes match your search.' : 'No notes yet. Tap “New note” to write one.' })];
  }
  return notes.map((n) => {
    const preview = notePreview(n);
    return el('li', {}, el('button', {
      class: 'card note-card',
      onclick: () => { openNoteId = n.id; renderNotes(); window.scrollTo(0, 0); },
    },
      el('div', { class: 'note-head' },
        el('span', { class: 'name', text: noteTitle(n) }),
        el('span', { class: 'note-date', text: formatEdited(n.updatedAt) })),
      preview ? el('div', { class: 'note-preview', text: preview }) : null));
  });
}

function notesList() {
  const search = el('input', { class: 'field', type: 'search', placeholder: 'Search notes', value: noteQuery, 'aria-label': 'Search notes' });
  search.addEventListener('input', () => {
    noteQuery = search.value;
    $('#notes-list').replaceChildren(...noteCards()); // only the list, so the search box keeps focus
  });
  return [
    el('div', { class: 'notes-top' },
      state.notes.length ? search : null,
      el('button', { class: 'primary', text: '+ New note', onclick: newNote })),
    el('ul', { class: 'list', id: 'notes-list' }, ...noteCards()),
  ];
}

function noteEditor(n) {
  const title = el('input', { class: 'note-title', value: n.title, placeholder: 'Title', maxlength: '120', 'aria-label': 'Note title' });
  const body = el('textarea', { class: 'note-body', placeholder: 'Start writing…', 'aria-label': 'Note' });
  body.value = n.body;
  const stamp = el('div', { class: 'note-stamp', text: `Edited ${formatEdited(n.updatedAt)}` });
  const grow = () => {
    body.style.height = 'auto';
    body.style.height = `${body.scrollHeight}px`;
  };
  const onEdit = () => {
    n.title = title.value;
    n.body = body.value;
    n.updatedAt = new Date().toISOString();
    stamp.textContent = 'Edited just now';
    scheduleNoteSave();
  };
  title.addEventListener('input', onEdit);
  title.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); body.focus(); }
  });
  body.addEventListener('input', () => { onEdit(); grow(); });
  requestAnimationFrame(grow);

  return [
    el('div', { class: 'note-bar' },
      el('button', { class: 'link back', text: '‹ All notes', onclick: () => { closeNote(); renderNotes(); } }),
      el('button', { class: 'link danger-text', text: 'Delete', onclick: () => {
        if ((n.title.trim() || n.body.trim()) && !confirm('Delete this note?')) return;
        clearTimeout(noteSaveTimer);
        noteSaveTimer = null;
        state.notes = state.notes.filter((x) => x.id !== n.id);
        openNoteId = null;
        save();
        renderNotes();
      } })),
    el('div', { class: 'card note-editor' }, title, body),
    stamp,
  ];
}

function renderNotes() {
  const n = openNoteId && state.notes.find((x) => x.id === openNoteId);
  if (!n) openNoteId = null;
  $('#notes').replaceChildren(...(n ? noteEditor(n) : notesList()));
  // A brand-new note: jump straight into the title (still inside the tap, so the keyboard opens).
  if (n && !n.title && !n.body) $('#notes .note-title').focus();
}

// ---------- Backup ----------
async function exportData() {
  const json = JSON.stringify({ app: 'habit-tracker', version: 1, exportedAt: new Date().toISOString(), ...state, images });
  const name = `habits-backup-${dayKey(today())}.json`;
  const file = new File([json], name, { type: 'application/json' });

  // On iPhone the share sheet lets you "Save to Files".
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!isValidData(data)) throw new Error('This is not a habit tracker backup file.');
    if (!confirm(`Replace your current data with this backup (${data.habits.length} habits)?`)) return;
    // Older backups have no style settings; keep the current ones in that case.
    // Older backups may lack to-dos or notes; keep the current ones in that case.
    state = normalize({
      ...data,
      settings: data.settings || state.settings,
      todos: data.todos || data.reminders || state.todos,
      notes: data.notes || state.notes,
    });
    openNoteId = null;
    images = data.images ? normalizeImages(data.images) : { bg: images.bg, icons: {} };
    save();
    saveImages();
    applySettings();
    render();
    alert('Backup restored.');
  } catch (e) {
    alert('Import failed: ' + e.message);
  }
}

// ---------- Tabs & wiring ----------
const TITLES = { today: 'Check-in', history: 'History', todos: 'To-do', notes: 'Notes', habits: 'My habits', style: 'Style' };

function render() {
  if (currentTab === 'today') renderToday();
  else if (currentTab === 'history') renderHistory();
  else if (currentTab === 'todos') renderTodos();
  else if (currentTab === 'notes') renderNotes();
  else if (currentTab === 'habits') renderHabits();
  else renderStyle();
}

function showTab(tab) {
  // Leaving a note (or tapping Notes again) goes back to the notes list.
  if (currentTab === 'notes' && openNoteId) closeNote();
  currentTab = tab;
  for (const name of Object.keys(TITLES)) $(`#view-${name}`).hidden = name !== tab;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#title').textContent = TITLES[tab];
  render();
  window.scrollTo(0, 0);
}

document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

$('#prev-day').addEventListener('click', () => { viewDate = addDays(viewDate, -1); renderToday(); });
$('#next-day').addEventListener('click', () => {
  if (viewDate < today()) viewDate = addDays(viewDate, 1);
  renderToday();
});
$('#date-label').addEventListener('click', () => { viewDate = today(); renderToday(); });

$('#todo-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#todo-input');
  const text = input.value.trim();
  if (!text) return;
  addTodo(text);
  input.value = '';
});

$('#add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#add-input');
  const name = input.value.trim();
  if (!name) return;
  addHabit(name);
  input.value = '';
});

$('#export-btn').addEventListener('click', exportData);
$('#import-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (file) importData(file);
});

// When the app is reopened on a new day, jump to the new "today".
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    flushNoteSave();
    return;
  }
  if (currentTab === 'notes' && openNoteId) return; // don't interrupt typing in a note
  const k = dayKey(today());
  if (k !== lastSeenDay) {
    if (dayKey(viewDate) === lastSeenDay) viewDate = today();
    lastSeenDay = k;
  }
  render();
});

applySettings();
showTab('today');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable, app still works */ });
}
