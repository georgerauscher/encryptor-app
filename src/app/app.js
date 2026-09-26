/*!
 * encryptor 3.0 · https://encryptor.app
 *
 * George A. Rauscher:
 * "Unencrypted data talks. I listened for 25 years.
 *  Make yours silent."
 *
 * Copyright (c) 2026 George A. Rauscher, intelligent piXel GmbH
 * Free to use, study, and share under the MIT License.
 * Keep the credit, keep the link: https://github.com/georgerauscher/encryptor-app
 */
// Offline edition: one page, four tools. User data reaches the document only
// through textContent or value, never as HTML.
import { encryptStream, decryptStream, encryptText, decryptText, FormatError } from '../core/format-v3.js';
import { decryptTextV2, decryptFileV2 } from '../core/legacy-v2.js';
import { detectText, detectFile } from '../core/detect.js';
import { generatePassword, canonicalPassword, formatPassword } from '../core/generator.js';
import { sanitizeFileName, riskOf } from '../core/sanitize.js';

const $ = (id) => document.getElementById(id);
const I18N = JSON.parse($('i18n').textContent);
const LIMIT_BLOB = 2 * 1024 * 1024 * 1024;
const RING = 339.3;
const root = document.documentElement;

let lang = 'en';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
};

function t(path) {
  let o = I18N[lang];
  for (const part of path.split('.')) { if (o == null) break; o = o[part]; }
  if (o == null && lang !== 'en') { o = I18N.en; for (const part of path.split('.')) { if (o == null) break; o = o[part]; } }
  return o == null ? '' : o;
}

// ---------------------------------------------------------------- language

function applyTexts(scope = document) {
  scope.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  scope.querySelectorAll('[data-tp]').forEach((el) => { el.setAttribute('placeholder', t(el.dataset.tp)); });
  scope.querySelectorAll('[data-ta]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.ta)); });
  scope.querySelectorAll('[data-tt]').forEach((el) => { el.setAttribute('title', t(el.dataset.tt)); });
  scope.querySelectorAll('[data-notes]').forEach((ul) => {
    ul.replaceChildren(...[].concat(t(ul.dataset.notes) || []).map((s) => { const li = document.createElement('li'); li.textContent = s; return li; }));
  });
}

function setLang(l) {
  lang = l === 'de' ? 'de' : 'en';
  root.lang = lang;
  document.title = t('app.title');
  const sw = document.querySelector('.lang-switch');
  sw.dataset.active = lang;
  sw.querySelectorAll('.lang-link').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'));
  applyTexts();
  updateCount();
  document.querySelectorAll('.pw-input').forEach((i) => checkPassword(i));
  paintTheme();
  store.set('encryptor-lang', lang);
}

// ---------------------------------------------------------------- theme

const THEMES = ['system', 'light', 'dark'];
function theme() { return root.getAttribute('data-theme') || 'system'; }
function paintTheme() {
  const b = $('theme');
  const m = theme();
  b.setAttribute('aria-label', t('app.theme.' + m));
  b.querySelector('use').setAttribute('href', '#i-' + ({ system: 'sun-moon', light: 'sun', dark: 'moon' })[m]);
}
function setTheme(m) {
  if (m === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
  store.set('encryptor-theme', m === 'system' ? null : m);
  paintTheme();
}

// ---------------------------------------------------------------- tabs

const state = { mode: 'encrypt', kind: 'file' };

function placeIndicator(seg) {
  const on = seg.querySelector('[aria-selected="true"]');
  const ind = seg.querySelector('.seg-ind');
  ind.style.width = on.offsetWidth + 'px';
  ind.style.transform = 'translateX(' + (on.offsetLeft - 4) + 'px)';
}

function showPanel() {
  const id = { 'encrypt-file': 'p-ef', 'encrypt-text': 'p-et', 'decrypt-file': 'p-df', 'decrypt-text': 'p-dt' }[state.mode + '-' + state.kind];
  document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== id; });
  say('');
  document.querySelectorAll('.seg').forEach(placeIndicator);
}

function bindSeg(seg, key) {
  seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
    state[key] = b.dataset[key];
    showPanel();
  }));
}

// ---------------------------------------------------------------- helpers

function say(text, kind = 'error') {
  const m = $('msg');
  m.textContent = text;
  m.dataset.kind = kind;
  m.hidden = !text;
  m.setAttribute('role', kind === 'error' ? 'alert' : 'status');
}

function errorText(e, prefix) {
  const code = e instanceof FormatError ? e.code : '';
  const map = { auth: 'wrong_or_damaged', corrupt: 'wrong_or_damaged', unknown: 'unknown_format', typo: 'password_typo', aborted: null };
  if (code === 'aborted') return t('cancelled');
  const own = map[code] && t(prefix + '.errors.' + map[code]);
  return own || t('errors.' + code) || t('errors.generic');
}

function bytes(n) {
  const u = t('units');
  if (n < 1024) return n + ' ' + u[0];
  const i = Math.min(4, Math.floor(Math.log(n) / Math.log(1024)));
  return (n / 1024 ** i).toLocaleString(lang, { maximumFractionDigits: 1 }) + ' ' + u[i];
}

async function copy(text, btn) {
  const label = btn.querySelector('.label-text');
  try {
    await navigator.clipboard.writeText(text);
    const old = label.textContent;
    label.textContent = t('common_ui.copied');
    setTimeout(() => { label.textContent = old; }, 1600);
  } catch (e) {
    say(t('common_ui.copy_failed'));
  }
}

function download(parts, name) {
  const url = URL.createObjectURL(new Blob(parts, { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function todayName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  // Date and time down to the second: a second file on the same day would
  // otherwise get a browser suffix after the extension (.encrypted-2).
  return `encryptor-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.encrypted`;
}

function reader(file) {
  return async (o, l) => new Uint8Array(await file.slice(o, o + l).arrayBuffer());
}

function setRing(el, fraction) {
  el.style.strokeDashoffset = String(RING * (1 - Math.max(0, Math.min(1, fraction))));
}

// Secret block: password chips, strength, notes. Built from a template so
// both encrypt panels share the same markup.
function mountSecret(slot, prefix) {
  const tpl = $('tpl-secret').content.cloneNode(true);
  tpl.querySelectorAll('[data-t]').forEach((el) => { el.dataset.t = el.dataset.t.replace('{{P}}', prefix); });
  tpl.querySelectorAll('[data-notes]').forEach((el) => { el.dataset.notes = el.dataset.notes.replace('{{P}}', prefix); });
  slot.replaceChildren(tpl);
}

function showPassword(slot, pw) {
  const chips = slot.querySelector('[data-chips]');
  chips.replaceChildren(...formatPassword(pw).split(' ').map((g, i) => {
    const s = document.createElement('span');
    s.textContent = g;
    s.style.animationDelay = (i * 55) + 'ms';
    return s;
  }));
}

function mountPasswordField(slot, prefix) {
  const tpl = $('tpl-pw').content.cloneNode(true);
  tpl.querySelectorAll('[data-t],[data-tp],[data-ta]').forEach((el) => {
    for (const k of ['t', 'tp', 'ta']) if (el.dataset[k]) el.dataset[k] = el.dataset[k].replace('{{P}}', prefix);
  });
  slot.replaceChildren(tpl);
  const input = slot.querySelector('.pw-input');
  const toggle = slot.querySelector('.pw-toggle');
  input.dataset.prefix = prefix;
  input.addEventListener('input', () => checkPassword(input));
  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
    toggle.dataset.ta = prefix + (show ? '.hide_password' : '.show_password');
    toggle.setAttribute('aria-label', t(toggle.dataset.ta));
    toggle.querySelector('use').setAttribute('href', show ? '#i-eye-off' : '#i-eye');
  });
  return input;
}

// Live check of the two check characters while typing.
function checkPassword(input) {
  const box = input.closest('.pw-field').querySelector('.pw-check');
  const text = box.querySelector('.pw-text');
  const v = input.value;
  const c = v ? canonicalPassword(v) : null;
  if (!c) { box.dataset.state = ''; text.textContent = t(input.dataset.prefix + '.password_hint'); return; }
  box.dataset.state = c.kind === 'code' ? 'ok' : c.kind === 'typo' ? 'typo' : '';
  text.textContent = t(c.kind === 'code' ? 'app.pw_valid' : c.kind === 'typo' ? 'app.pw_typo' : 'app.pw_free');
}

function dropZone(zone, input, onFile) {
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); if (e.dataTransfer.files.length) onFile(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => { if (input.files.length) onFile(input.files[0]); });
}

function busy(prefix, on) {
  $('wrap').classList.toggle('working', on);
  const drop = $(prefix + '-drop');
  if (drop) drop.classList.toggle('busy', on);
  $(prefix + '-status').hidden = !on;
}

// ---------------------------------------------------------------- encrypt file

const ef = { file: null, pw: '', parts: null, ctl: null, name: '' };

dropZone($('ef-drop'), $('ef-file'), (f) => {
  ef.file = f;
  $('ef-name').textContent = f.name;
  $('ef-size').textContent = bytes(f.size);
  $('ef-info').hidden = false;
  $('ef-go').disabled = false;
  say('');
});
$('ef-remove').addEventListener('click', () => { ef.file = null; $('ef-file').value = ''; $('ef-info').hidden = true; $('ef-go').disabled = true; });

$('ef-go').addEventListener('click', async () => {
  const file = ef.file;
  if (!file) return;
  const big = file.size > LIMIT_BLOB;
  if (big && !window.showSaveFilePicker) { say(t('encrypt_file.errors.too_large')); return; }
  ef.name = todayName();
  let sink = null;
  try { if (big) sink = await (await window.showSaveFilePicker({ suggestedName: ef.name })).createWritable(); } catch (e) { return; }
  ef.ctl = new AbortController();
  ef.pw = generatePassword();
  ef.parts = [];
  $('ef-go').disabled = true;
  $('ef-cancel').hidden = false;
  $('ef-status-text').textContent = t('app.kdf');
  $('ef-pct').textContent = '';
  busy('ef', true);
  setRing($('ef-ring'), 0);
  try {
    await encryptStream({
      password: ef.pw,
      meta: { kind: 'file', name: file.name, size: file.size, type: file.type, mtime: file.lastModified || 0 },
      readContent: reader(file),
      write: async (b) => { if (sink) await sink.write(b); else ef.parts.push(b); },
      onProgress: (d, total) => {
        const f = total ? d / total : 1;
        setRing($('ef-ring'), f);
        $('ef-status-text').textContent = t('encrypt_file.progress.label');
        $('ef-pct').textContent = t('encrypt_file.progress.percent').replace('{percent}', Math.floor(f * 100));
      },
      signal: ef.ctl.signal,
    });
    if (sink) await sink.close();
    setRing($('ef-ring'), 1);
    $('ef-out').textContent = ef.name;
    $('ef-save').hidden = !!sink;
    showPassword(document.querySelector('[data-secret="ef"]'), ef.pw);
    $('ef-stage').hidden = true;
    $('ef-result').hidden = false;
  } catch (e) {
    if (sink) await sink.abort().catch(() => {});
    ef.parts = null; ef.pw = '';
    say(errorText(e, 'encrypt_file'));
    $('ef-go').disabled = false;
  } finally {
    busy('ef', false);
    $('ef-cancel').hidden = true;
    ef.ctl = null;
  }
});
$('ef-cancel').addEventListener('click', () => ef.ctl && ef.ctl.abort());
$('ef-save').addEventListener('click', () => ef.parts && download(ef.parts, ef.name));
$('ef-again').addEventListener('click', () => {
  Object.assign(ef, { file: null, pw: '', parts: null, name: '' });
  $('ef-file').value = '';
  $('ef-info').hidden = true;
  $('ef-go').disabled = true;
  document.querySelector('[data-secret="ef"] [data-chips]').replaceChildren();
  setRing($('ef-ring'), 0);
  $('ef-result').hidden = true;
  $('ef-stage').hidden = false;
});

// ---------------------------------------------------------------- encrypt text

const et = { pw: '' };
function updateCount() {
  const n = $('et-msg').value.length;
  $('et-count').textContent = n === 1 ? t('encrypt_text.counter_one') : t('encrypt_text.counter').replace('{count}', n.toLocaleString(lang));
}
$('et-msg').addEventListener('input', updateCount);
$('et-go').addEventListener('click', async () => {
  const msg = $('et-msg').value;
  if (!msg.trim()) { say(t('encrypt_text.errors.empty')); $('et-msg').focus(); return; }
  $('et-go').disabled = true;
  $('et-status').hidden = false;
  $('wrap').classList.add('working');
  say('');
  try {
    et.pw = generatePassword();
    $('et-cipher').value = await encryptText(et.pw, msg);
    showPassword(document.querySelector('[data-secret="et"]'), et.pw);
    $('et-stage').hidden = true;
    $('et-result').hidden = false;
  } catch (e) {
    et.pw = '';
    say(errorText(e, 'encrypt_text'));
  } finally {
    $('et-go').disabled = false;
    $('et-status').hidden = true;
    $('wrap').classList.remove('working');
  }
});
$('et-copy').addEventListener('click', (e) => copy($('et-cipher').value, e.currentTarget));
$('et-again').addEventListener('click', () => {
  et.pw = '';
  $('et-msg').value = '';
  $('et-cipher').value = '';
  document.querySelector('[data-secret="et"] [data-chips]').replaceChildren();
  updateCount();
  $('et-result').hidden = true;
  $('et-stage').hidden = false;
  $('et-msg').focus();
});

// ---------------------------------------------------------------- decrypt file

const df = { file: null, parts: null, ctl: null, name: '' };
let dfPw, dtPw;

dropZone($('df-drop'), $('df-file'), (f) => {
  df.file = f;
  $('df-name').textContent = f.name;
  $('df-size').textContent = bytes(f.size);
  $('df-info').hidden = false;
  $('df-go').disabled = false;
  say('');
});
$('df-remove').addEventListener('click', () => { df.file = null; $('df-file').value = ''; $('df-info').hidden = true; $('df-go').disabled = true; });

$('df-go').addEventListener('click', async () => {
  const file = df.file;
  if (!file) return;
  const raw = dfPw.value;
  if (!raw) { say(t('decrypt_file.errors.empty_password')); dfPw.focus(); return; }
  const kind = detectFile(new Uint8Array(await file.slice(0, 4).arrayBuffer()), file.size);
  if (kind === 'unknown') { say(t('decrypt_file.errors.unknown_format')); return; }
  let password = raw;
  if (kind === 'v3') {
    const c = canonicalPassword(raw);
    if (c.kind === 'typo') { say(t('decrypt_file.errors.password_typo')); return; }
    password = c.password;
  }
  const big = file.size > LIMIT_BLOB;
  if (big && !window.showSaveFilePicker) { say(t('decrypt_file.errors.too_large')); return; }
  let sink = null;
  try { if (big) sink = await (await window.showSaveFilePicker({ suggestedName: 'decrypted-file' })).createWritable(); } catch (e) { return; }
  df.ctl = new AbortController();
  df.parts = [];
  $('df-go').disabled = true;
  $('df-cancel').hidden = false;
  $('df-status-text').textContent = kind === 'v3' ? t('app.kdf') : t('decrypt_file.progress.label');
  $('df-pct').textContent = '';
  busy('df', true);
  setRing($('df-ring'), 0);
  const job = {
    password, size: file.size, read: reader(file), signal: df.ctl.signal,
    onMeta: (m) => {
      const s = sanitizeFileName(m.name);
      df.name = s.name;
      $('df-w-ren').hidden = !s.changed;
      $('df-w-exe').hidden = !riskOf(df.name).executable;
    },
    onContent: async (b) => { if (sink) await sink.write(b); else df.parts.push(b); },
    onProgress: (d, total) => {
      const f = total > 0 ? d / total : 1;
      setRing($('df-ring'), f);
      $('df-status-text').textContent = t('decrypt_file.progress.label');
      $('df-pct').textContent = t('decrypt_file.progress.percent').replace('{percent}', Math.floor(f * 100));
    },
  };
  try {
    let complete = true;
    if (kind === 'v3') await decryptStream(job);
    else ({ complete } = await decryptFileV2(job));
    if (sink) await sink.close();
    $('df-out').textContent = df.name;
    $('df-w-v2').hidden = kind !== 'v2';
    $('df-w-inc').hidden = complete;
    $('df-save').hidden = !!sink;
    dfPw.value = '';
    checkPassword(dfPw);
    $('df-stage').hidden = true;
    $('df-result').hidden = false;
  } catch (e) {
    // Discard partially written output: it is not authenticated.
    if (sink) await sink.abort().catch(() => {});
    df.parts = null;
    say(errorText(e, 'decrypt_file'));
    $('df-go').disabled = false;
  } finally {
    busy('df', false);
    $('df-cancel').hidden = true;
    df.ctl = null;
  }
});
$('df-cancel').addEventListener('click', () => df.ctl && df.ctl.abort());
$('df-save').addEventListener('click', () => df.parts && download(df.parts, df.name));
$('df-again').addEventListener('click', () => {
  Object.assign(df, { file: null, parts: null, name: '' });
  $('df-file').value = '';
  $('df-info').hidden = true;
  $('df-go').disabled = true;
  ['df-w-v2', 'df-w-inc', 'df-w-ren', 'df-w-exe'].forEach((id) => { $(id).hidden = true; });
  setRing($('df-ring'), 0);
  $('df-result').hidden = true;
  $('df-stage').hidden = false;
});

// ---------------------------------------------------------------- decrypt text

$('dt-go').addEventListener('click', async () => {
  const text = $('dt-cipher').value;
  const raw = dtPw.value;
  if (!text.trim()) { say(t('decrypt_text.errors.empty_text')); $('dt-cipher').focus(); return; }
  if (!raw) { say(t('decrypt_text.errors.empty_password')); dtPw.focus(); return; }
  const kind = detectText(text);
  if (kind === 'unknown') { say(t('decrypt_text.errors.unknown_format')); return; }
  $('dt-go').disabled = true;
  $('dt-status').hidden = false;
  $('wrap').classList.add('working');
  say('');
  try {
    let plain;
    if (kind === 'v3') {
      const c = canonicalPassword(raw);
      if (c.kind === 'typo') throw new FormatError('typo');
      plain = await decryptText(c.password, text);
    } else {
      plain = await decryptTextV2(raw, text);
    }
    $('dt-plain').value = plain;
    $('dt-w-v2').hidden = kind !== 'v2';
    dtPw.value = '';
    checkPassword(dtPw);
    $('dt-stage').hidden = true;
    $('dt-result').hidden = false;
  } catch (e) {
    say(errorText(e, 'decrypt_text'));
  } finally {
    $('dt-go').disabled = false;
    $('dt-status').hidden = true;
    $('wrap').classList.remove('working');
  }
});
$('dt-copy').addEventListener('click', (e) => copy($('dt-plain').value, e.currentTarget));
$('dt-again').addEventListener('click', () => {
  $('dt-plain').value = '';
  $('dt-cipher').value = '';
  $('dt-result').hidden = true;
  $('dt-stage').hidden = false;
  $('dt-cipher').focus();
});

// ---------------------------------------------------------------- start

mountSecret(document.querySelector('[data-secret="ef"]'), 'encrypt_file');
mountSecret(document.querySelector('[data-secret="et"]'), 'encrypt_text');
dfPw = mountPasswordField(document.querySelector('[data-pw="df"]'), 'decrypt_file');
dtPw = mountPasswordField(document.querySelector('[data-pw="dt"]'), 'decrypt_text');
document.querySelectorAll('[data-copy-pw]').forEach((b) => b.addEventListener('click', (e) => {
  copy(e.currentTarget.closest('[data-secret]').dataset.secret === 'ef' ? ef.pw : et.pw, e.currentTarget);
}));
bindSeg($('seg-mode'), 'mode');
bindSeg($('seg-kind'), 'kind');
document.querySelectorAll('.lang-link').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
$('theme').addEventListener('click', () => setTheme(THEMES[(THEMES.indexOf(theme()) + 1) % THEMES.length]));
const savedTheme = store.get('encryptor-theme');
if (savedTheme === 'light' || savedTheme === 'dark') root.setAttribute('data-theme', savedTheme);
const savedLang = store.get('encryptor-lang');
setLang(savedLang || ((navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en'));
showPanel();
// Web Crypto exists only in a secure context; without it every action would fail later.
if (!(window.crypto && crypto.subtle)) {
  say(t('errors.no_crypto'));
  document.querySelectorAll('.window button').forEach((b) => { b.disabled = true; });
}
window.addEventListener('resize', () => document.querySelectorAll('.seg').forEach(placeIndicator));
