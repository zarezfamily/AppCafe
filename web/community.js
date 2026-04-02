const FIREBASE_PROJECT_ID = 'miappdecafe';
const FIREBASE_API_KEY = 'AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24';
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts`;
const BASE_URL = `https://europe-west1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const FIREBASE_STORAGE_BUCKET = `${FIREBASE_PROJECT_ID}.appspot.com`;

const FORUM_CATEGORIES = [
  { id: 'general', emoji: '💬', label: 'General' },
  { id: 'metodos', emoji: '☕', label: 'Métodos de preparación' },
  { id: 'compras', emoji: '🛒', label: 'Compras y tostadores' },
  { id: 'novedades', emoji: '🆕', label: 'Novedades' },
  { id: 'aprende', emoji: '🎓', label: 'Aprende' },
];

let auth = {
  uid: localStorage.getItem('etiove_web_uid') || '',
  email: localStorage.getItem('etiove_web_email') || '',
  token: localStorage.getItem('etiove_web_token') || '',
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

const escapeHtml = (text) => String(text || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
  categorySelect: document.getElementById('categorySelect'),
  threadTitle: document.getElementById('threadTitle'),
  threadBody: document.getElementById('threadBody'),
  createThreadBtn: document.getElementById('createThreadBtn'),
  threadStatus: document.getElementById('threadStatus'),
  categoryChips: document.getElementById('categoryChips'),
  refreshBtn: document.getElementById('refreshBtn'),
  threadsWrap: document.getElementById('threadsWrap'),
};

const toFirestoreValue = (val) => {

const deleteDocument = async (name, id) => {
  const res = await fetch(`${BASE_URL}/${name}/${id}?key=${FIREBASE_API_KEY}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return res.ok;
};

const uploadImageToStorage = async (file, folder) => {
  if (!file) return '';
  if (!auth.token) throw new Error('UNAUTHENTICATED');

  const safeFolder = String(folder || 'uploads').replace(/[^a-zA-Z0-9_\-/]/g, '');
  const ext = String(file.type || '').includes('png') ? 'png' : 'jpg';
  const fileName = `${safeFolder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bucketCandidates = Array.from(new Set([
    FIREBASE_STORAGE_BUCKET,
    `${FIREBASE_PROJECT_ID}.appspot.com`,
    `${FIREBASE_PROJECT_ID}.firebasestorage.app`,
  ]));

  let lastError = null;
  for (const bucketName of bucketCandidates) {
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}&key=${FIREBASE_API_KEY}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
        Authorization: `Bearer ${auth.token}`,
      },
      body: file,
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      const objectName = json.name || fileName;
      const encodedName = encodeURIComponent(objectName);
      const token = json.downloadTokens || (json.metadata && json.metadata.downloadTokens) || '';
      return token
        ? `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedName}?alt=media&token=${token}`
        : `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedName}?alt=media`;
    }

    lastError = (json.error && json.error.message) || `storage_upload_failed_${res.status}`;
    if (res.status !== 404) break;
  }

  throw new Error(lastError || 'storage_upload_failed');
};
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
    const repliesHtml = threadReplies.map((r) => {
      const isReplyOwner = !!auth.uid && r.authorUid === auth.uid;
      return `<div class="reply">
        <div class="meta">${escapeHtml(r.authorName || 'Catador')} · ${fmt(r.createdAt)}</div>
        <p>${escapeHtml(r.body || '')}</p>
        ${r.image ? `<img class="reply-image" src="${escapeHtml(r.image)}" alt="Imagen de respuesta" />` : ''}
        ${isReplyOwner ? `<div class="actions-row" style="margin-top:8px"><button class="link-btn" data-edit-reply="${r.id}">Editar</button><button class="link-btn" data-delete-reply="${r.id}">Eliminar</button></div>` : ''}
      </div>`;
    }).join('');
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
  const headers = { 'Content-Type': 'application/json' };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  return headers;
};

const getCollection = async (name, pageSize = 400) => {
  const res = await fetch(`${BASE_URL}/${name}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`No se pudo cargar ${name}`);
  const json = await res.json();
  return (json.documents || []).map(docToObject);
};

const addDocument = async (name, data) => {
  const res = await fetch(`${BASE_URL}/${name}?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(toFields(data)),
  });
  if (!res.ok) {
    const txt = await res.text();
  const imageFile = el.threadImage.files && el.threadImage.files[0] ? el.threadImage.files[0] : null;
    throw new Error(txt || 'No se pudo guardar');
  }
  return docToObject(await res.json());
};

const updateDocument = async (name, id, data) => {
  const params = new URLSearchParams({ key: FIREBASE_API_KEY });
  Object.keys(data).forEach((f) => params.append('updateMask.fieldPaths', f));
  const res = await fetch(`${BASE_URL}/${name}/${id}?${params.toString()}`, {
    const imageUrl = imageFile ? await uploadImageToStorage(imageFile, 'foro_hilos') : '';
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(toFields(data)),
  });
  return res.ok;
      image: imageUrl,

const setStatus = (target, text, kind) => {
  target.textContent = text || '';
  target.className = `status ${kind || ''}`.trim();
};

const renderAuthState = () => {
  const logged = !!auth.token;
  el.logoutBtn.style.display = logged ? 'inline-block' : 'none';
  el.loginBtn.disabled = logged;
  el.registerBtn.disabled = logged;
  el.createThreadBtn.disabled = !logged;
  setStatus(el.authStatus, logged ? `Sesión activa: ${auth.email}` : 'Sesión no iniciada', logged ? 'ok' : '');
    el.threadImage.value = '';
};

const fmt = (iso) => {
  try { return new Date(iso).toLocaleString('es-ES'); } catch { return iso || ''; }
};

const renderCategories = () => {
  el.categorySelect.innerHTML = FORUM_CATEGORIES.map((c) => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('');
  el.categorySelect.value = selectedCategory;

  el.categoryChips.innerHTML = FORUM_CATEGORIES.map((c) => (
    `<button class="chip ${selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.emoji} ${c.label}</button>`
  )).join('');
  const fileInput = el.threadsWrap.querySelector(`[data-reply-file="${threadId}"]`);

  el.categoryChips.querySelectorAll('[data-cat]').forEach((btn) => {
  const imageFile = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
  if (!body && !imageFile) return;
      selectedCategory = btn.getAttribute('data-cat');
      el.categorySelect.value = selectedCategory;
    const imageUrl = imageFile ? await uploadImageToStorage(imageFile, 'foro_respuestas') : '';
      renderCategories();
      renderThreads();
    });
  });
      image: imageUrl,
};

const renderThreads = () => {
  const list = threads
    .filter((t) => t.categoryId === selectedCategory)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (list.length === 0) {
    el.threadsWrap.innerHTML = '<p class="empty">Aún no hay hilos en esta categoría.</p>';
    return;
  }

  el.threadsWrap.innerHTML = list.map((t) => {
    const threadReplies = replies
      .filter((r) => r.threadId === t.id)
    if (fileInput) fileInput.value = '';
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const repliesHtml = threadReplies.slice(0, 4).map((r) => (
      `<div class="reply"><div class="meta">${r.authorName || 'Catador'} · ${fmt(r.createdAt)}</div><p>${(r.body || '').replace(/</g, '&lt;')}</p></div>`
    )).join('');

    return `
      <article class="thread" data-thread-id="${t.id}">
        <h3>${(t.title || '').replace(/</g, '&lt;')}</h3>
        <div class="meta">${t.categoryLabel || ''} · ${t.authorName || 'Catador'} · ${fmt(t.createdAt)} · ${Number(t.upvotes || 0)} votos</div>
        <p>${(t.body || '').replace(/</g, '&lt;')}</p>
        <div class="thread-foot">
          <button class="link-btn" data-vote="${t.id}">Votar</button>
          <span class="muted">${threadReplies.length} respuestas</span>
        </div>
        <div class="reply-box">
          ${repliesHtml || '<p class="muted">Sin respuestas aún.</p>'}
          <div class="field"><textarea data-reply-input="${t.id}" maxlength="1000" placeholder="Responder..."></textarea></div>
          <button class="btn ghost" data-reply-send="${t.id}">Enviar respuesta</button>
        </div>
      </article>
    `;
  }).join('');

  el.threadsWrap.querySelectorAll('[data-vote]').forEach((btn) => {
    btn.addEventListener('click', () => voteThread(btn.getAttribute('data-vote')));
  });
  el.threadsWrap.querySelectorAll('[data-reply-send]').forEach((btn) => {
    btn.addEventListener('click', () => sendReply(btn.getAttribute('data-reply-send')));
  });
};

const loadForum = async () => {
  setStatus(el.threadStatus, 'Cargando comunidad...', '');
  try {
    const [h, r] = await Promise.all([
      getCollection('foro_hilos', 400),
      getCollection('foro_respuestas', 1200),
    ]);
    threads = h;
    replies = r;
    renderThreads();
    setStatus(el.threadStatus, 'Comunidad actualizada.', 'ok');
  } catch (e) {
    setStatus(el.threadStatus, 'No se pudo cargar la comunidad.', 'error');
  }
};

const mapAuthError = (msg) => {
  const m = String(msg || '');
  if (m.includes('INVALID_LOGIN_CREDENTIALS') || m.includes('EMAIL_NOT_FOUND') || m.includes('INVALID_PASSWORD')) return 'Email o contraseña incorrectos.';
  if (m.includes('EMAIL_EXISTS')) return 'Ese email ya está registrado.';
  return 'No se pudo completar la autenticación.';
};

const signIn = async (registerMode) => {
  const email = (el.email.value || '').trim();
  const password = (el.password.value || '').trim();
  if (!email || !password) {
    setStatus(el.authStatus, 'Completa email y contraseña.', 'error');
    return;
  }
  try {
    const endpoint = registerMode ? 'signUp' : 'signInWithPassword';
    const res = await fetch(`${AUTH_URL}:${endpoint}?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json && json.error ? json.error.message : 'auth_error');

    auth = { uid: json.localId, email: json.email, token: json.idToken };
    localStorage.setItem('etiove_web_uid', auth.uid);
    localStorage.setItem('etiove_web_email', auth.email);
    localStorage.setItem('etiove_web_token', auth.token);
    renderAuthState();
    setStatus(el.authStatus, registerMode ? 'Cuenta creada y sesión iniciada.' : 'Sesión iniciada.', 'ok');
  } catch (e) {
    setStatus(el.authStatus, mapAuthError(e.message), 'error');
  }
};

const logout = () => {
  auth = { uid: '', email: '', token: '' };
  localStorage.removeItem('etiove_web_uid');
  localStorage.removeItem('etiove_web_email');
  localStorage.removeItem('etiove_web_token');
  renderAuthState();
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

  if (title.length < 3 || body.length < 3) {
    setStatus(el.threadStatus, 'Título y contenido deben tener mínimo 3 caracteres.', 'error');
    return;
  }

  try {
    await addDocument('foro_hilos', {
      categoryId,
      categoryLabel: category ? category.label : 'General',
      title,
      body,
      image: '',
      authorUid: auth.uid,
      authorName: auth.email.split('@')[0],
      authorLevel: 'Web',
      createdAt: new Date().toISOString(),
      upvotes: 0,
      voterUids: '',
      replyCount: 0,
      reportedCount: 0,
      reporterUids: '',
    });

    el.threadTitle.value = '';
    el.threadBody.value = '';
    setStatus(el.threadStatus, 'Hilo publicado.', 'ok');
    await loadForum();
  } catch (e) {
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
      authorName: auth.email.split('@')[0],
      authorLevel: 'Web',
      createdAt: new Date().toISOString(),
      upvotes: 0,
      voterUids: '',
      reportedCount: 0,
      reporterUids: '',
    });

    const thread = threads.find((t) => t.id === threadId);
    if (thread) {
      await updateDocument('foro_hilos', threadId, { replyCount: Number(thread.replyCount || 0) + 1 });
    }
    input.value = '';
    await loadForum();
  } catch (e) {
    setStatus(el.threadStatus, 'No se pudo enviar la respuesta.', 'error');
  }
};

const init = async () => {
  renderCategories();
  renderAuthState();

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
