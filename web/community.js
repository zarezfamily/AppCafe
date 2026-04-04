const FIREBASE_PROJECT_ID = 'miappdecafe';
const FIREBASE_API_KEY = 'AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24';
const FIREBASE_IOS_BUNDLE_ID = 'com.zarezfamily.etiove';
const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';
const BASE_URL = `https://europe-west1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const FIREBASE_STORAGE_BUCKET = `${FIREBASE_PROJECT_ID}.appspot.com`;

const FORUM_CATEGORIES = [
  { id: 'general', emoji: '💬', label: 'General' },
  { id: 'metodos', emoji: '☕', label: 'Métodos de preparación' },
  { id: 'compras', emoji: '🛒', label: 'Compras y tostadores' },
  { id: 'novedades', emoji: '🆕', label: 'Novedades' },
  { id: 'aprende', emoji: '🎓', label: 'Aprende' },
];

const ACCESS_LABELS = {
  public: 'Público',
  registered_only: 'Solo registrados',
};

const CATEGORY_LABEL_BY_ID = FORUM_CATEGORIES.reduce((acc, c) => {
  acc[c.id] = c.label;
  return acc;
}, {});

let auth = {
  uid: localStorage.getItem('etiove_web_uid') || '',
  email: localStorage.getItem('etiove_web_email') || '',
  token: localStorage.getItem('etiove_web_token') || '',
};

// Alias resuelto desde hilos previos de la app
const getAuthorName = () =>
  localStorage.getItem('etiove_web_alias') || auth.email.split('@')[0] || 'Catador';

// Busca en foro_hilos un hilo del usuario para obtener su alias real
const resolveAuthorAlias = async () => {
  const stored = localStorage.getItem('etiove_web_alias');
  if (stored) return; // ya lo tenemos
  const allThreads = await getCollection('foro_hilos', 50);
  const mine = allThreads.find((t) => t.authorUid === auth.uid && t.authorName && t.authorName !== auth.email.split('@')[0]);
  if (mine) {
    localStorage.setItem('etiove_web_alias', mine.authorName);
  }
};

let selectedCategory = 'general';
let threads = [];
let replies = [];

const el = {
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  loginBtn: document.getElementById('loginBtn'),
  registerBtn: document.getElementById('registerBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  authStatus: document.getElementById('authStatus'),

  categorySelect: document.getElementById('categorySelect'),
  threadAccessLevel: document.getElementById('threadAccessLevel'),
  threadTitle: document.getElementById('threadTitle'),
  threadBody: document.getElementById('threadBody'),
  threadImage: document.getElementById('threadImage'),
  createThreadBtn: document.getElementById('createThreadBtn'),
  threadStatus: document.getElementById('threadStatus'),

  categoryChips: document.getElementById('categoryChips'),
  refreshBtn: document.getElementById('refreshBtn'),
  threadsWrap: document.getElementById('threadsWrap'),
};

const escapeHtml = (text) => String(text || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val)
    ? { integerValue: String(val) }
    : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  return { stringValue: String(val) };
};

const fromFirestoreValue = (val = {}) => {
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  return null;
};

const docToObject = (doc) => {
  const out = {};
  const fields = doc && doc.fields ? doc.fields : {};
  Object.keys(fields).forEach((k) => {
    out[k] = fromFirestoreValue(fields[k]);
  });
  out.id = (doc.name || '').split('/').pop();
  return out;
};

const toFields = (obj) => {
  const fields = {};
  Object.keys(obj).forEach((k) => {
    fields[k] = toFirestoreValue(obj[k]);
  });
  return { fields };
};

const authHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Ios-Bundle-Identifier': FIREBASE_IOS_BUNDLE_ID,
  };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  return headers;
};

const setStatus = (target, text, kind = '') => {
  target.textContent = text || '';
  target.className = `status ${kind}`.trim();
};

const fmt = (iso) => {
  try {
    return new Date(iso).toLocaleString('es-ES');
  } catch {
    return iso || '';
  }
};

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const inferCategoryId = (thread) => {
  const rawId = normalizeText(thread.categoryId);
  if (FORUM_CATEGORIES.some((c) => c.id === rawId)) return rawId;

  const rawLabel = normalizeText(thread.categoryLabel);
  if (rawLabel.includes('metodo') || rawLabel.includes('preparacion')) return 'metodos';
  if (rawLabel.includes('compra') || rawLabel.includes('tostador')) return 'compras';
  if (rawLabel.includes('novedad') || rawLabel.includes('evento')) return 'novedades';
  if (rawLabel.includes('aprende') || rawLabel.includes('novato') || rawLabel.includes('tecnica')) return 'aprende';
  return 'general';
};

const normalizeThread = (thread) => {
  const categoryId = inferCategoryId(thread);
  return {
    ...thread,
    categoryId,
    categoryLabel: thread.categoryLabel || CATEGORY_LABEL_BY_ID[categoryId] || 'General',
  };
};

const isThreadVisible = (thread) => thread.accessLevel !== 'registered_only' || !!auth.token;

const getCollection = async (name, pageSize = 400) => {
  const res = await fetch(`${BASE_URL}/${name}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`No se pudo cargar ${name}`);
  const json = await res.json();
  return (json.documents || []).map(docToObject);
};

const runStructuredQuery = async (structuredQuery) => {
  const res = await fetch(`${BASE_URL}:runQuery?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ structuredQuery }),
  });
  if (!res.ok) throw new Error(`runQuery_failed_${res.status}`);
  const json = await res.json();
  return (json || []).filter((row) => row.document).map((row) => docToObject(row.document));
};

const getPublicThreads = async (limit = 500) => runStructuredQuery({
  from: [{ collectionId: 'foro_hilos' }],
  where: {
    fieldFilter: {
      field: { fieldPath: 'accessLevel' },
      op: 'EQUAL',
      value: { stringValue: 'public' },
    },
  },
  orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
  limit,
});

const addDocument = async (name, data) => {
  const res = await fetch(`${BASE_URL}/${name}?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(toFields(data)),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'No se pudo guardar');
  }
  return docToObject(await res.json());
};

const updateDocument = async (name, id, data) => {
  const params = new URLSearchParams({ key: FIREBASE_API_KEY });
  Object.keys(data).forEach((f) => params.append('updateMask.fieldPaths', f));
  const res = await fetch(`${BASE_URL}/${name}/${id}?${params.toString()}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(toFields(data)),
  });
  return res.ok;
};

const uploadImageToStorage = async (file, folder) => {
  if (!file) return '';
  if (!auth.token) throw new Error('UNAUTHENTICATED');

  const safeFolder = String(folder || 'uploads').replace(/[^a-zA-Z0-9_\-/]/g, '');
  const ext = String(file.type || '').includes('png') ? 'png' : 'jpg';
  const fileName = `${safeFolder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o?uploadType=media&name=${encodeURIComponent(fileName)}&key=${FIREBASE_API_KEY}`;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'image/jpeg',
      'X-Ios-Bundle-Identifier': FIREBASE_IOS_BUNDLE_ID,
      Authorization: `Bearer ${auth.token}`,
    },
    body: file,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json.error && json.error.message) || 'storage_upload_failed');
  }

  const objectName = json.name || fileName;
  const encodedName = encodeURIComponent(objectName);
  const token = json.downloadTokens || (json.metadata && json.metadata.downloadTokens) || '';
  return token
    ? `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodedName}?alt=media&token=${token}`
    : `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodedName}?alt=media`;
};

const renderAuthState = () => {
  const logged = !!auth.token;
  el.logoutBtn.style.display = logged ? 'inline-block' : 'none';
  el.loginBtn.disabled = logged;
  el.registerBtn.disabled = logged;
  el.createThreadBtn.disabled = !logged;
  setStatus(el.authStatus, logged ? `Sesión activa: ${auth.email}` : 'Sesión no iniciada', logged ? 'ok' : '');
};

const renderCategories = () => {
  el.categorySelect.innerHTML = FORUM_CATEGORIES
    .map((c) => `<option value="${c.id}">${c.emoji} ${c.label}</option>`)
    .join('');
  el.categorySelect.value = selectedCategory;

  el.categoryChips.innerHTML = FORUM_CATEGORIES
    .map((c) => `<button class="chip ${selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.emoji} ${c.label}</button>`)
    .join('');

  el.categoryChips.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.getAttribute('data-cat');
      el.categorySelect.value = selectedCategory;
      renderCategories();
      renderThreads();
    });
  });
};

const renderThreads = () => {
  const list = threads
    .filter((t) => t.categoryId === selectedCategory)
    .filter(isThreadVisible)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const fallbackList = threads
    .filter(isThreadVisible)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const usingFallback = list.length === 0 && fallbackList.length > 0;
  const displayList = usingFallback ? fallbackList : list;

  if (displayList.length === 0) {
    el.threadsWrap.innerHTML = '<p class="empty">Aún no hay hilos en esta categoría.</p>';
    return;
  }

  const fallbackNote = usingFallback
    ? '<p class="muted" style="margin-top:10px">No hay hilos en esta categoría ahora mismo. Mostrando los más recientes de toda la comunidad.</p>'
    : '';

  el.threadsWrap.innerHTML = `${fallbackNote}${displayList.map((t, idx) => {
    const delay = Math.min(idx * 0.03, 0.21);
    const threadReplies = replies
      .filter((r) => r.threadId === t.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const repliesHtml = threadReplies.slice(0, 4).map((r, replyIdx) => (
      `<div class="reply" style="animation-delay:${Math.min(delay + (replyIdx * 0.02), 0.26).toFixed(3)}s"><div class="meta">${escapeHtml(r.authorName || 'Catador')} · ${fmt(r.createdAt)}</div><p>${escapeHtml(r.body || '')}</p></div>`
    )).join('');

    const accessTagColor = t.accessLevel === 'registered_only' ? '#8f5e3b' : '#4f7a53';
    const accessTagBg = t.accessLevel === 'registered_only' ? '#f3e9de' : '#edf7ee';

    return `
      <article class="thread" data-thread-id="${t.id}" style="animation-delay:${delay}s">
        <h3>${escapeHtml(t.title || '')}</h3>
        <div class="meta">${escapeHtml(t.categoryLabel || '')} · ${escapeHtml(t.authorName || 'Catador')} · ${fmt(t.createdAt)} · ${Number(t.upvotes || 0)} votos</div>
        <div class="thread-tags">
          <span class="pill category">${escapeHtml(t.categoryLabel || 'General')}</span>
          <span class="pill" style="background:${accessTagBg};color:${accessTagColor}">${escapeHtml(ACCESS_LABELS[t.accessLevel] || 'Público')}</span>
        </div>
        <p>${escapeHtml(t.body || '')}</p>
        ${t.image ? `<img class="thread-image" src="${escapeHtml(t.image)}" alt="Imagen del hilo" loading="lazy" decoding="async" />` : ''}
        <div class="thread-foot">
          <button class="link-btn" data-vote="${t.id}">Votar</button>
          <span class="muted">${threadReplies.length} respuestas</span>
        </div>
        <div class="reply-box">
          ${repliesHtml || '<p class="muted">Sin respuestas aún.</p>'}
          ${auth.token
            ? `<div class="field"><textarea data-reply-input="${t.id}" maxlength="1000" placeholder="Responder..."></textarea></div><button class="btn ghost" data-reply-send="${t.id}">Enviar respuesta</button>`
            : '<p class="muted">Inicia sesión para responder.</p>'}
        </div>
      </article>
    `;
  }).join('')}`;

  el.threadsWrap.querySelectorAll('[data-vote]').forEach((btn) => {
    btn.addEventListener('click', () => voteThread(btn.getAttribute('data-vote')));
  });

  el.threadsWrap.querySelectorAll('[data-reply-send]').forEach((btn) => {
    btn.addEventListener('click', () => sendReply(btn.getAttribute('data-reply-send')));
  });

  const markLoaded = (img) => img.classList.add('loaded');
  el.threadsWrap.querySelectorAll('.thread-image, .reply-image').forEach((img) => {
    if (img.complete) {
      markLoaded(img);
    } else {
      img.addEventListener('load', () => markLoaded(img), { once: true });
      img.addEventListener('error', () => markLoaded(img), { once: true });
    }
  });
};

const renderThreadSkeletons = (count = 3) => {
  el.threadsWrap.innerHTML = Array.from({ length: count }).map(() => `
    <article class="thread-skeleton" aria-hidden="true">
      <div class="skeleton-line w70"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line w40"></div>
    </article>
  `).join('');
};

const loadForum = async () => {
  setStatus(el.threadStatus, 'Cargando comunidad...', '');
  renderThreadSkeletons(4);
  const isLogged = !!auth.token;
  // Ahora las reglas permiten lectura pública: siempre cargamos todo y filtramos en cliente.
  const [hRes, rRes] = await Promise.allSettled([
    getCollection('foro_hilos', 500),
    getCollection('foro_respuestas', 1200),
  ]);

  if (hRes.status !== 'fulfilled') {
    threads = [];
    replies = [];
    setStatus(el.threadStatus, 'No se pudo cargar la comunidad.', 'error');
    el.threadsWrap.innerHTML = '<p class="empty">No se pudieron cargar los hilos en este momento.</p>';
    return;
  }

  const h = hRes.value || [];
  const visibleThreads = h.filter(isThreadVisible);
  const visibleIds = new Set(visibleThreads.map((t) => t.id));

  threads = visibleThreads.map(normalizeThread);
  replies = rRes.status === 'fulfilled'
    ? (rRes.value || []).filter((reply) => visibleIds.has(reply.threadId))
    : [];

  renderThreads();

  if (rRes.status === 'fulfilled') {
    setStatus(el.threadStatus, 'Comunidad actualizada.', 'ok');
  } else {
    setStatus(el.threadStatus, 'Hilos cargados. Algunas respuestas no pudieron cargarse.', '');
  }
};

const getAuthErrorCode = (errorLike) => {
  const raw = String((errorLike && errorLike.message) || errorLike || '').trim();
  if (!raw) return 'UNKNOWN_AUTH_ERROR';
  const m = raw.match(/[A-Z_]{3,}/);
  return m ? m[0] : raw;
};

const mapAuthError = (errorLike) => {
  const code = getAuthErrorCode(errorLike);
  if (code.includes('INVALID_EMAIL')) return 'El email no tiene un formato válido.';
  if (code.includes('INVALID_LOGIN_CREDENTIALS') || code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_PASSWORD')) return 'Email o contraseña incorrectos.';
  if (code.includes('MISSING_PASSWORD')) return 'Falta la contraseña.';
  if (code.includes('WEAK_PASSWORD')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (code.includes('EMAIL_EXISTS')) return 'Ese email ya está registrado.';
  if (code.includes('OPERATION_NOT_ALLOWED')) return 'El acceso por email/contraseña no está habilitado en Firebase Auth.';
  if (code.includes('USER_DISABLED')) return 'Esta cuenta está deshabilitada.';
  if (code.includes('TOO_MANY_ATTEMPTS_TRY_LATER') || code.includes('HTTP_429')) return 'Demasiados intentos. Prueba otra vez en unos minutos.';
  if (code.includes('NETWORK') || code.includes('FETCH') || code.includes('FAILED_TO_FETCH')) return 'No hay conexión con Firebase. Revisa tu red o desactiva bloqueadores de privacidad para este sitio.';
  if (code.includes('REQUEST_BLOCKED') || code.includes('CLIENT') || code.includes('API_KEY') || code.includes('INVALID_KEY_TYPE') || code.includes('HTTP_403')) {
    return 'Firebase está rechazando la petición de login (API key/restricciones).';
  }
  if (code.includes('CONFIGURATION_NOT_FOUND') || code.includes('PROJECT_NOT_FOUND')) return 'No se encontró la configuración de autenticación en Firebase para este proyecto.';
  return `No se pudo completar la autenticación (${code}).`;
};

const signIn = async (registerMode) => {
  const email = (el.email.value || '').trim();
  const password = (el.password.value || '').trim();
  if (!email || !password) {
    setStatus(el.authStatus, 'Completa email y contraseña.', 'error');
    return;
  }
  if (!email.includes('@')) {
    setStatus(el.authStatus, 'Debes usar tu email de la app (no el alias).', 'error');
    return;
  }

  try {
    const endpoint = registerMode ? 'signUp' : 'signInWithPassword';
    const res = await fetch(`${AUTH_URL}:${endpoint}?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ios-Bundle-Identifier': FIREBASE_IOS_BUNDLE_ID,
      },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const raw = await res.text();
    let json = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      throw new Error('INVALID_AUTH_RESPONSE');
    }

    if (!res.ok) {
      const code = json && json.error ? json.error.message : 'auth_error';
      if (registerMode && code.includes('EMAIL_EXISTS')) {
        setStatus(el.authStatus, 'Esa cuenta ya existe. Intentando iniciar sesión...', '');
        await signIn(false);
        return;
      }
      throw new Error(code);
    }

    if (!json || !json.idToken || !json.localId || !json.email) {
      throw new Error('INVALID_AUTH_RESPONSE');
    }

    auth = { uid: json.localId, email: json.email, token: json.idToken };
    localStorage.setItem('etiove_web_uid', auth.uid);
    localStorage.setItem('etiove_web_email', auth.email);
    localStorage.setItem('etiove_web_token', auth.token);

    // Intentar recuperar el alias real del usuario desde sus hilos anteriores
    try {
      await resolveAuthorAlias();
    } catch (_) { /* no bloquear el login */ }

    renderAuthState();
    setStatus(el.authStatus, registerMode ? 'Cuenta creada y sesión iniciada.' : 'Sesión iniciada.', 'ok');
    await loadForum();
  } catch (e) {
    setStatus(el.authStatus, mapAuthError(e), 'error');
  }
};

const logout = async () => {
  auth = { uid: '', email: '', token: '' };
  localStorage.removeItem('etiove_web_uid');
  localStorage.removeItem('etiove_web_email');
  localStorage.removeItem('etiove_web_token');
  localStorage.removeItem('etiove_web_alias');
  renderAuthState();
  await loadForum();
};

const createThread = async () => {
  if (!auth.token || !auth.uid) {
    setStatus(el.threadStatus, 'Inicia sesión para publicar.', 'error');
    return;
  }

  const title = (el.threadTitle.value || '').trim();
  const body = (el.threadBody.value || '').trim();
  const categoryId = el.categorySelect.value;
  const category = FORUM_CATEGORIES.find((c) => c.id === categoryId);
  const accessLevel = el.threadAccessLevel.value === 'registered_only' ? 'registered_only' : 'public';

  if (title.length < 3 || body.length < 3) {
    setStatus(el.threadStatus, 'Título y contenido deben tener mínimo 3 caracteres.', 'error');
    return;
  }

  try {
    const imageFile = el.threadImage.files && el.threadImage.files[0] ? el.threadImage.files[0] : null;
    const imageUrl = imageFile ? await uploadImageToStorage(imageFile, 'foro_hilos') : '';

    await addDocument('foro_hilos', {
      categoryId,
      categoryLabel: category ? category.label : 'General',
      title,
      body,
      image: imageUrl,
      authorUid: auth.uid,
      authorName: getAuthorName(),
      authorLevel: 'Web',
      accessLevel,
      createdAt: new Date().toISOString(),
      upvotes: 0,
      voterUids: '',
      replyCount: 0,
      reportedCount: 0,
      reporterUids: '',
    });

    el.threadTitle.value = '';
    el.threadBody.value = '';
    el.threadImage.value = '';
    el.threadAccessLevel.value = 'public';

    setStatus(el.threadStatus, 'Hilo publicado.', 'ok');
    await loadForum();
  } catch {
    setStatus(el.threadStatus, 'No se pudo publicar el hilo.', 'error');
  }
};

const voteThread = async (threadId) => {
  if (!auth.token || !auth.uid) {
    setStatus(el.threadStatus, 'Inicia sesión para votar.', 'error');
    return;
  }

  const item = threads.find((t) => t.id === threadId);
  if (!item) return;

  const voters = new Set(String(item.voterUids || '').split(',').map((v) => v.trim()).filter(Boolean));
  if (voters.has(auth.uid)) {
    setStatus(el.threadStatus, 'Ya votaste este hilo.', 'error');
    return;
  }

  voters.add(auth.uid);

  const ok = await updateDocument('foro_hilos', threadId, {
    upvotes: Number(item.upvotes || 0) + 1,
    voterUids: Array.from(voters).join(','),
  });

  if (!ok) {
    setStatus(el.threadStatus, 'No se pudo guardar tu voto.', 'error');
    return;
  }

  await loadForum();
};

const sendReply = async (threadId) => {
  if (!auth.token || !auth.uid) {
    setStatus(el.threadStatus, 'Inicia sesión para responder.', 'error');
    return;
  }

  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return;

  const input = el.threadsWrap.querySelector(`[data-reply-input="${threadId}"]`);
  if (!input) return;

  const body = (input.value || '').trim();
  if (!body) return;

  try {
    await addDocument('foro_respuestas', {
      threadId,
      parentId: '',
      body,
      authorUid: auth.uid,
      authorName: getAuthorName(),
      authorLevel: 'Web',
      createdAt: new Date().toISOString(),
      upvotes: 0,
      voterUids: '',
      reportedCount: 0,
      reporterUids: '',
    });

    await updateDocument('foro_hilos', threadId, {
      replyCount: Number(thread.replyCount || 0) + 1,
    });

    input.value = '';
    await loadForum();
  } catch {
    setStatus(el.threadStatus, 'No se pudo enviar la respuesta.', 'error');
  }
};

const init = async () => {
  renderCategories();
  renderAuthState();

  // Si hay sesión guardada, resolver alias en background
  if (auth.uid && auth.token) {
    resolveAuthorAlias().catch(() => {});
  }

  el.loginBtn.addEventListener('click', () => signIn(false));
  el.registerBtn.addEventListener('click', () => signIn(true));
  el.logoutBtn.addEventListener('click', logout);
  el.createThreadBtn.addEventListener('click', createThread);
  el.refreshBtn.addEventListener('click', loadForum);
  el.categorySelect.addEventListener('change', () => {
    selectedCategory = el.categorySelect.value;
    renderCategories();
    renderThreads();
  });

  await loadForum();
};

init();
