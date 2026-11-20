/* ArquiSpec · usuarios: correo + contraseña y cuenta de Google (Firebase Authentication)
 * Las contraseñas las procesa y guarda Firebase (con hash); nunca pasan por este repositorio. */
import { firebaseConfig } from './firebase-config.js';

const CONFIGURADO = !!(firebaseConfig && firebaseConfig.apiKey && !/^PEGA/i.test(firebaseConfig.apiKey));
const VERSION = '10.14.1';
const CDN = 'https://www.gstatic.com/firebasejs/' + VERSION + '/';

const $ = (s, r) => (r || document).querySelector(s);
const ES = {
  'auth/invalid-email': 'El correo no tiene un formato válido.',
  'auth/missing-password': 'Escribe tu contraseña.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Inicia sesión o usa "¿Olvidaste tu contraseña?".',
  'auth/weak-password': 'La contraseña es muy débil. Usa al menos 8 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'No hay conexión con el servidor. Revisa tu internet.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes e inténtalo otra vez.',
  'auth/account-exists-with-different-credential': 'Ese correo ya está registrado con otro método. Inicia sesión con tu contraseña.',
  'auth/operation-not-allowed': 'Este método de acceso no está activado en Firebase.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.'
};
const SILENCIOSOS = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
const msgError = (e) => ES[e && e.code] || 'No se pudo completar la operación. Inténtalo de nuevo.';

let A = null;       // módulo firebase-auth
let auth = null;    // instancia de Auth
let modo = 'login'; // 'login' | 'registro'
let abridor = null;
const oyentes = [];

/* ---------- Interfaz ---------- */
function el(tag, attrs, hijos) {
  const n = document.createElement(tag);
  Object.keys(attrs || {}).forEach(k => {
    if (k === 'text') n.textContent = attrs[k];
    else n.setAttribute(k, attrs[k]);
  });
  (hijos || []).forEach(h => n.appendChild(h));
  return n;
}

function campo(id, etiqueta, tipo, extra, solo) {
  const wrap = el('div', solo ? { 'data-solo': solo } : {});
  wrap.appendChild(el('label', { for: id, text: etiqueta }));
  const inp = el('input', Object.assign({ id: id, type: tipo }, extra || {}));
  wrap.appendChild(inp);
  return wrap;
}

function construirModal() {
  const overlay = el('div', { class: 'au-overlay', hidden: '' });
  const modal = el('div', { class: 'au-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'au-titulo' });
  modal.appendChild(el('button', { type: 'button', class: 'au-close', 'aria-label': 'Cerrar', text: '×' }));
  modal.appendChild(el('h2', { id: 'au-titulo', text: 'Accede a ArquiSpec' }));

  const tabs = el('div', { class: 'au-tabs', role: 'tablist' }, [
    el('button', { type: 'button', role: 'tab', 'data-tab': 'login', 'aria-selected': 'true', text: 'Iniciar sesión' }),
    el('button', { type: 'button', role: 'tab', 'data-tab': 'registro', 'aria-selected': 'false', text: 'Crear cuenta' })
  ]);
  modal.appendChild(tabs);

  modal.appendChild(el('button', { type: 'button', class: 'au-google' }, [
    el('span', { class: 'au-g', 'aria-hidden': 'true', text: 'G' }),
    el('span', { text: 'Continuar con Google' })
  ]));
  modal.appendChild(el('div', { class: 'au-sep' }, [el('span', { text: 'o con tu correo' })]));

  const form = el('form', { class: 'au-form', novalidate: '' });
  form.appendChild(campo('au-nombre', 'Nombre', 'text', { autocomplete: 'name', maxlength: '60' }, 'registro'));
  form.appendChild(campo('au-email', 'Correo electrónico', 'email', { autocomplete: 'email', required: '' }));
  form.appendChild(campo('au-pass', 'Contraseña', 'password', { autocomplete: 'current-password', required: '' }));
  form.appendChild(campo('au-pass2', 'Repite la contraseña', 'password', { autocomplete: 'new-password' }, 'registro'));
  form.appendChild(el('p', { class: 'au-hint', 'data-solo': 'registro', text: 'Mínimo 8 caracteres.' }));
  form.appendChild(el('p', { class: 'au-msg', role: 'alert', 'aria-live': 'polite' }));
  form.appendChild(el('button', { type: 'submit', class: 'au-submit', text: 'Entrar' }));
  form.appendChild(el('button', { type: 'button', class: 'au-link', 'data-solo': 'login', text: '¿Olvidaste tu contraseña?' }));
  modal.appendChild(form);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  return overlay;
}

let overlay = null;

function msg(texto, ok) {
  const m = $('.au-msg', overlay);
  m.textContent = texto || '';
  m.className = 'au-msg' + (texto ? (ok ? ' ok' : ' err') : '');
}

function ocupado(si) {
  overlay.querySelectorAll('button, input').forEach(n => { n.disabled = si; });
  overlay.classList.toggle('au-busy', si);
}

function aplicarModo(m) {
  modo = m;
  overlay.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === m ? 'true' : 'false'));
  overlay.querySelectorAll('[data-solo]').forEach(n => { n.hidden = n.dataset.solo !== m; });
  $('#au-pass', overlay).setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
  $('.au-submit', overlay).textContent = m === 'login' ? 'Entrar' : 'Crear cuenta';
  $('#au-titulo', overlay).textContent = m === 'login' ? 'Accede a ArquiSpec' : 'Crea tu cuenta';
  msg('');
}

function abrir(modoInicial) {
  if (!overlay) return;
  abridor = document.activeElement;
  aplicarModo(modoInicial === 'registro' ? 'registro' : 'login');
  overlay.hidden = false;
  document.body.classList.add('au-abierto');
  setTimeout(() => { const f = $('#au-email', overlay); if (f) f.focus(); }, 30);
}

function cerrar() {
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  document.body.classList.remove('au-abierto');
  overlay.querySelectorAll('input').forEach(i => { i.value = ''; });
  msg('');
  if (abridor && abridor.focus) abridor.focus();
}

/* ---------- Acciones ---------- */
async function conGoogle() {
  msg('');
  ocupado(true);
  try {
    const prov = new A.GoogleAuthProvider();
    prov.setCustomParameters({ prompt: 'select_account' });
    await A.signInWithPopup(auth, prov);
    cerrar();
  } catch (e) {
    if (e && e.code === 'auth/popup-blocked') {
      try { await A.signInWithRedirect(auth, new A.GoogleAuthProvider()); return; } catch (e2) { e = e2; }
    }
    if (SILENCIOSOS.indexOf(e && e.code) < 0) msg(msgError(e));
  } finally { ocupado(false); }
}

async function enviarFormulario(ev) {
  ev.preventDefault();
  msg('');
  const email = $('#au-email', overlay).value.trim();
  const pass = $('#au-pass', overlay).value;
  if (!email) return msg('Escribe tu correo.');
  if (!pass) return msg('Escribe tu contraseña.');
  if (modo === 'registro') {
    const nombre = $('#au-nombre', overlay).value.trim();
    if (pass.length < 8) return msg('La contraseña debe tener al menos 8 caracteres.');
    if (pass !== $('#au-pass2', overlay).value) return msg('Las contraseñas no coinciden.');
    ocupado(true);
    try {
      const cred = await A.createUserWithEmailAndPassword(auth, email, pass);
      if (nombre) await A.updateProfile(cred.user, { displayName: nombre });
      try { await A.sendEmailVerification(cred.user); } catch (e) { /* no bloquea el registro */ }
      cerrar();
      refrescarUI(auth.currentUser);
    } catch (e) { msg(msgError(e)); } finally { ocupado(false); }
  } else {
    ocupado(true);
    try {
      await A.signInWithEmailAndPassword(auth, email, pass);
      cerrar();
    } catch (e) { msg(msgError(e)); } finally { ocupado(false); }
  }
}

async function recuperar() {
  const email = $('#au-email', overlay).value.trim();
  if (!email) return msg('Escribe tu correo arriba y vuelve a pulsar "¿Olvidaste tu contraseña?".');
  ocupado(true);
  try {
    await A.sendPasswordResetEmail(auth, email);
  } catch (e) {
    if (e && (e.code === 'auth/invalid-email' || e.code === 'auth/network-request-failed' || e.code === 'auth/too-many-requests')) {
      msg(msgError(e)); ocupado(false); return;
    }
  }
  /* Respuesta idéntica exista o no la cuenta, para no revelar qué correos están registrados */
  msg('Si ese correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa también spam.', true);
  ocupado(false);
}

async function salir() {
  try { await A.signOut(auth); } catch (e) { /* ignorar */ }
}

/* ---------- Barra: botón de acceso / chip de usuario ---------- */
function refrescarUI(user) {
  const slot = $('#auSlot');
  if (!slot) return;
  slot.textContent = '';
  if (!user) {
    const b = el('button', { type: 'button', class: 'secondary au-open', text: '👤 Iniciar sesión' });
    b.addEventListener('click', () => abrir('login'));
    slot.appendChild(b);
    return;
  }
  const nombre = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
  const chip = el('div', { class: 'au-chip' });
  const ini = el('span', { class: 'au-avatar', 'aria-hidden': 'true', text: nombre.charAt(0).toUpperCase() });
  if (user.photoURL) {
    const img = el('img', { class: 'au-avatar', alt: '', referrerpolicy: 'no-referrer', src: user.photoURL });
    img.addEventListener('error', () => img.replaceWith(ini));
    chip.appendChild(img);
  } else { chip.appendChild(ini); }
  const info = el('span', { class: 'au-info' }, [
    el('strong', { text: nombre }),
    el('small', { text: user.emailVerified || !user.email ? (user.email || '') : (user.email + ' · sin verificar') })
  ]);
  chip.appendChild(info);
  const out = el('button', { type: 'button', class: 'secondary au-out', text: 'Salir' });
  out.addEventListener('click', salir);
  chip.appendChild(out);
  slot.appendChild(chip);
}

function notificar(user) {
  document.dispatchEvent(new CustomEvent('arquispec:auth', { detail: { user: user || null } }));
  oyentes.forEach(fn => { try { fn(user || null); } catch (e) { /* ignorar */ } });
}

/* ---------- Arranque ---------- */
async function iniciar() {
  const slot = $('#auSlot');
  if (!slot) return;
  if (!CONFIGURADO) {
    console.info('[ArquiSpec] Usuarios desactivados: completa assets/firebase-config.js con los datos de tu proyecto de Firebase.');
    return; // botón oculto hasta configurar
  }
  try {
    const [appMod, authMod] = await Promise.all([import(CDN + 'firebase-app.js'), import(CDN + 'firebase-auth.js')]);
    A = authMod;
    auth = A.getAuth(appMod.initializeApp(firebaseConfig));
    auth.languageCode = 'es';
  } catch (e) {
    console.error('[ArquiSpec] No se pudo cargar Firebase Authentication.', e);
    return;
  }

  overlay = construirModal();
  aplicarModo('login');
  slot.hidden = false;

  overlay.addEventListener('mousedown', e => { if (e.target === overlay) cerrar(); });
  $('.au-close', overlay).addEventListener('click', cerrar);
  overlay.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => aplicarModo(b.dataset.tab)));
  $('.au-google', overlay).addEventListener('click', conGoogle);
  $('.au-form', overlay).addEventListener('submit', enviarFormulario);
  $('.au-link', overlay).addEventListener('click', recuperar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });

  A.onAuthStateChanged(auth, user => { refrescarUI(user); notificar(user); });
  try { await A.getRedirectResult(auth); } catch (e) { console.warn('[ArquiSpec] Redirección de Google:', msgError(e)); }

  window.ArquiAuth = {
    abrir: abrir,
    cerrar: cerrar,
    salir: salir,
    usuario: () => (auth ? auth.currentUser : null),
    onCambio: fn => { oyentes.push(fn); fn(auth.currentUser); }
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
