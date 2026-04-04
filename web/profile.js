(() => {
  const FIREBASE_PROJECT_ID = 'miappdecafe';
  const FIREBASE_API_KEY = 'AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24';
  const FIREBASE_IOS_BUNDLE_ID = 'com.zarezfamily.etiove';
  const BASE_URL = `https://europe-west1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

  const params = new URLSearchParams(window.location.search);
  const uid = String(params.get('uid') || '').trim();
  const queryName = String(params.get('name') || '').trim();

  const state = {
    threads: [],
    replies: [],
    blogComments: [],
  };

  const el = {
    avatar: document.getElementById('profileAvatar'),
    name: document.getElementById('profileName'),
    since: document.getElementById('profileSince'),
    counters: document.getElementById('profileCounters'),
    quote: document.getElementById('profileQuote'),
    content: document.getElementById('tabContent'),
    tabs: Array.from(document.querySelectorAll('[data-tab]')),
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
    Object.keys(fields).forEach((key) => {
      out[key] = fromFirestoreValue(fields[key]);
    });
    out.id = (doc.name || '').split('/').pop();
    return out;
  };

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Ios-Bundle-Identifier': FIREBASE_IOS_BUNDLE_ID,
  });

  const getCollection = async (name, pageSize = 1000) => {
    const res = await fetch(`${BASE_URL}/${name}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}`, {
      headers: authHeaders(),
    });
    if (res.status === 404 || !res.ok) return [];
    const json = await res.json();
    return (json.documents || []).map((doc) => docToObject(doc));
  };

  const esc = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleString('es-ES');
    } catch {
      return String(iso || '');
    }
  };

  const short = (text, max = 160) => {
    const raw = String(text || '').trim();
    if (raw.length <= max) return raw;
    return `${raw.slice(0, max - 1)}...`;
  };

  const yearsSince = (dateText) => {
    const dt = new Date(dateText);
    if (Number.isNaN(dt.getTime())) return 'Miembro reciente';
    const diffYears = Math.max(0, Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
    if (diffYears === 0) return 'Miembro desde hace menos de 1 ano';
    if (diffYears === 1) return 'Miembro desde hace 1 ano';
    return `Miembro desde hace ${diffYears} anos`;
  };

  const getAuthorName = () => {
    const names = [
      queryName,
      ...state.threads.map((item) => item.authorName),
      ...state.replies.map((item) => item.authorName),
      ...state.blogComments.map((item) => item.authorName),
    ].map((value) => String(value || '').trim()).filter(Boolean);
    return names[0] || 'Catador';
  };

  const collectDates = () => {
    const dates = [
      ...state.threads.map((item) => item.createdAt),
      ...state.replies.map((item) => item.createdAt),
      ...state.blogComments.map((item) => item.createdAt),
    ].filter(Boolean).map((text) => new Date(text)).filter((dt) => !Number.isNaN(dt.getTime()));
    dates.sort((a, b) => a - b);
    return dates;
  };

  const totalUpvotes = () => {
    const sumThreads = state.threads.reduce((acc, item) => acc + Number(item.upvotes || 0), 0);
    const sumReplies = state.replies.reduce((acc, item) => acc + Number(item.upvotes || 0), 0);
    const sumBlogUp = state.blogComments.reduce((acc, item) => acc + Number(item.upvotes || 0), 0);
    return sumThreads + sumReplies + sumBlogUp;
  };

  const totalDownvotes = () => state.blogComments.reduce((acc, item) => acc + Number(item.downvotes || 0), 0);

  const renderHeader = () => {
    const name = getAuthorName();
    const first = name.slice(0, 1).toUpperCase() || '?';
    const allDates = collectDates();
    const sinceText = allDates.length ? yearsSince(allDates[0].toISOString()) : 'Miembro reciente';

    if (el.avatar) el.avatar.textContent = first;
    if (el.name) el.name.textContent = name;
    if (el.since) el.since.textContent = sinceText;
    if (el.counters) {
      el.counters.innerHTML = `${state.threads.length} hilos <span>•</span> ${state.replies.length} respuestas <span>•</span> ${state.blogComments.length} comentarios`;
    }
    if (el.quote) {
      el.quote.textContent = '"Ninguno de nosotros es tan listo como todos nosotros."';
    }
    document.title = `${name} | Perfil Etiove`;
  };

  const renderEmpty = (message) => {
    if (!el.content) return;
    el.content.innerHTML = `<div class="empty-state">${esc(message)}</div>`;
  };

  const renderActivity = () => {
    const mixed = [
      ...state.threads.map((item) => ({ type: 'hilo', title: item.title || 'Sin titulo', body: item.body || '', createdAt: item.createdAt, emoji: '💬' })),
      ...state.replies.map((item) => ({ type: 'respuesta', title: 'Ha respondido en el foro', body: item.body || '', createdAt: item.createdAt, emoji: '☕' })),
      ...state.blogComments.map((item) => ({ type: 'comentario', title: `Comentario en ${item.postSlug || 'blog'}`, body: item.body || '', createdAt: item.createdAt, emoji: '📝' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!mixed.length) {
      renderEmpty('Este perfil aun no tiene actividad publica.');
      return;
    }

    el.content.innerHTML = mixed.slice(0, 40).map((item) => `
      <article class="feed-item">
        <div class="feed-thumb">${item.emoji}</div>
        <div class="feed-body">
          <p class="feed-meta">Actividad: ${esc(item.type)} · ${esc(fmtDate(item.createdAt))}</p>
          <p class="feed-title">${esc(item.title)} — ${esc(short(item.body, 200))}</p>
        </div>
      </article>
    `).join('');
  };

  const renderThreadList = () => {
    if (!state.threads.length) {
      renderEmpty('No hay hilos publicados por este usuario.');
      return;
    }

    el.content.innerHTML = state.threads
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => `
        <article class="feed-item">
          <div class="feed-thumb">💬</div>
          <div class="feed-body">
            <p class="feed-meta">Hilo · ${esc(fmtDate(item.createdAt))}</p>
            <p class="feed-title">${esc(item.title || 'Sin titulo')} — ${esc(short(item.body, 220))}</p>
          </div>
        </article>
      `).join('');
  };

  const renderReplyList = () => {
    if (!state.replies.length) {
      renderEmpty('No hay respuestas de foro para este usuario.');
      return;
    }

    el.content.innerHTML = state.replies
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => `
        <article class="feed-item">
          <div class="feed-thumb">☕</div>
          <div class="feed-body">
            <p class="feed-meta">Respuesta en foro · ${esc(fmtDate(item.createdAt))}</p>
            <p class="feed-title">${esc(short(item.body, 260))}</p>
          </div>
        </article>
      `).join('');
  };

  const renderBlogList = () => {
    if (!state.blogComments.length) {
      renderEmpty('No hay comentarios de blog para este usuario.');
      return;
    }

    el.content.innerHTML = state.blogComments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => `
        <article class="feed-item">
          <div class="feed-thumb">📝</div>
          <div class="feed-body">
            <p class="feed-meta">Comentario de blog · ${esc(item.postSlug || 'post')} · ${esc(fmtDate(item.createdAt))}</p>
            <p class="feed-title">${esc(short(item.body, 260))}</p>
          </div>
        </article>
      `).join('');
  };

  const renderStats = () => {
    const firstDate = collectDates()[0];
    const memberFor = firstDate ? yearsSince(firstDate.toISOString()) : 'Sin actividad';

    el.content.innerHTML = `
      <div class="stats-grid">
        <article class="stat-card"><p class="stat-label">Hilos</p><p class="stat-value">${state.threads.length}</p></article>
        <article class="stat-card"><p class="stat-label">Respuestas</p><p class="stat-value">${state.replies.length}</p></article>
        <article class="stat-card"><p class="stat-label">Comentarios blog</p><p class="stat-value">${state.blogComments.length}</p></article>
        <article class="stat-card"><p class="stat-label">Votos positivos recibidos</p><p class="stat-value">${totalUpvotes()}</p></article>
        <article class="stat-card"><p class="stat-label">Votos negativos en blog</p><p class="stat-value">${totalDownvotes()}</p></article>
        <article class="stat-card"><p class="stat-label">Antiguedad</p><p class="stat-value" style="font-size:20px;line-height:1.3;">${esc(memberFor)}</p></article>
      </div>
    `;
  };

  const renderTab = (tabName) => {
    if (!el.tabs.length) return;
    el.tabs.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    if (tabName === 'threads') {
      renderThreadList();
      return;
    }
    if (tabName === 'replies') {
      renderReplyList();
      return;
    }
    if (tabName === 'blog') {
      renderBlogList();
      return;
    }
    if (tabName === 'stats') {
      renderStats();
      return;
    }
    renderActivity();
  };

  const attachTabEvents = () => {
    el.tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        renderTab(btn.getAttribute('data-tab') || 'activity');
      });
    });
  };

  const init = async () => {
    if (!uid) {
      renderEmpty('Falta el usuario del perfil. Vuelve a Comunidad o Blog y pulsa un alias.');
      return;
    }

    const [threads, replies, blogComments] = await Promise.all([
      getCollection('foro_hilos', 1200),
      getCollection('foro_respuestas', 2000),
      getCollection('blog_comentarios', 2000),
    ]);

    state.threads = threads.filter((item) => item.authorUid === uid);
    state.replies = replies.filter((item) => item.authorUid === uid);
    state.blogComments = blogComments.filter((item) => item.authorUid === uid);

    renderHeader();
    attachTabEvents();
    renderTab('activity');
  };

  init().catch(() => {
    renderEmpty('No se pudo cargar este perfil en este momento.');
  });
})();
