(() => {
  const FIREBASE_PROJECT_ID = 'miappdecafe';
  const FIREBASE_API_KEY = 'AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24';
  const FIREBASE_IOS_BUNDLE_ID = 'com.zarezfamily.etiove';
  const BASE_URL = `https://europe-west1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

  const config = window.ETIOVE_BLOG_POST_CONFIG || {};
  const postSlug = String(config.postSlug || '').trim();

  const auth = {
    uid: localStorage.getItem('etiove_web_uid') || '',
    email: localStorage.getItem('etiove_web_email') || '',
    token: localStorage.getItem('etiove_web_token') || '',
  };

  const el = {
    shareX: document.getElementById('shareX'),
    shareInstagram: document.getElementById('shareInstagram'),
    copyLink: document.getElementById('copyLink'),
    commentHelp: document.getElementById('commentHelp'),
    commentBody: document.getElementById('commentBody'),
    sendComment: document.getElementById('sendComment'),
    commentStatus: document.getElementById('commentStatus'),
    commentList: document.getElementById('commentList'),
    scrollTopBtn: document.getElementById('scrollTopBtn'),
  };

  const hasCommentUI = !!(el.commentHelp && el.commentBody && el.sendComment && el.commentStatus && el.commentList);

  const escapeHtml = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

  const toFirestoreValue = (val) => {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'number') {
      return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    }
    if (typeof val === 'boolean') return { booleanValue: val };
    return { stringValue: String(val) };
  };

  const toFields = (obj) => {
    const fields = {};
    Object.keys(obj).forEach((key) => {
      fields[key] = toFirestoreValue(obj[key]);
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

  const getStoredAlias = () => String(localStorage.getItem('etiove_web_alias') || '').trim();

  const getFallbackAuthorName = () => getStoredAlias() || (auth.email || '').split('@')[0] || 'Catador';

  const rememberAlias = (alias) => {
    const safeAlias = String(alias || '').trim();
    if (safeAlias) localStorage.setItem('etiove_web_alias', safeAlias);
    return safeAlias;
  };

  const getCollection = async (name, pageSize = 500) => {
    const res = await fetch(`${BASE_URL}/${name}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}`, {
      headers: authHeaders(),
    });
    if (res.status === 404 || !res.ok) return [];
    const json = await res.json();
    return (json.documents || []).map((doc) => docToObject(doc));
  };

  const resolveAuthorAlias = async () => {
    if (!auth.uid) return getFallbackAuthorName();

    const storedAlias = getStoredAlias();
    if (storedAlias) return storedAlias;

    const collections = ['foro_hilos', 'foro_respuestas', 'blog_comentarios'];
    for (const collectionName of collections) {
      const items = await getCollection(collectionName, 500);
      const mine = items.find((item) => item.authorUid === auth.uid && String(item.authorName || '').trim());
      if (mine) return rememberAlias(mine.authorName);
    }

    return getFallbackAuthorName();
  };

  const setStatus = (text) => {
    if (el.commentStatus) el.commentStatus.textContent = text || '';
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString('es-ES');
    } catch {
      return iso || '';
    }
  };

  const loadComments = async () => {
    if (!hasCommentUI || !postSlug) return;

    const comments = (await getCollection('blog_comentarios', 1000))
      .filter((comment) => comment.postSlug === postSlug)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 60);

    if (!comments.length) {
      el.commentList.innerHTML = '<p class="comment-help">Todavía no hay respuestas en este post.</p>';
      return;
    }

    el.commentList.innerHTML = comments.map((comment) => `
      <article class="comment-item">
        <div class="comment-meta">${escapeHtml(comment.authorName || 'Catador')} · ${escapeHtml(formatDate(comment.createdAt))}</div>
        <p class="comment-body">${escapeHtml(comment.body || '')}</p>
      </article>
    `).join('');
  };

  const addComment = async () => {
    if (!hasCommentUI || !postSlug) return;
    if (!auth.token || !auth.uid) {
      setStatus('Inicia sesión en Comunidad para publicar respuestas.');
      return;
    }

    const body = (el.commentBody.value || '').trim();
    if (!body) {
      setStatus('Escribe un mensaje antes de publicar.');
      return;
    }
    if (body.length < 3) {
      setStatus('La respuesta debe tener al menos 3 caracteres.');
      return;
    }

    el.sendComment.disabled = true;
    setStatus('Publicando...');

    const authorName = await resolveAuthorAlias();
    const res = await fetch(`${BASE_URL}/blog_comentarios?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(toFields({
        postSlug,
        body,
        authorUid: auth.uid,
        authorName: authorName || getFallbackAuthorName(),
        createdAt: new Date().toISOString(),
      })),
    });

    el.sendComment.disabled = false;

    if (!res.ok) {
      setStatus('No se pudo publicar la respuesta.');
      return;
    }

    el.commentBody.value = '';
    setStatus('Respuesta publicada.');
    rememberAlias(authorName);
    await setupCommentUI();
    await loadComments();
  };

  const setupShare = () => {
    if (!el.shareX || !el.shareInstagram || !el.copyLink) return;

    const postUrl = window.location.href;
    const postTitle = document.title;
    el.shareX.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(postUrl)}`;

    const copyPostUrl = async () => {
      try {
        await navigator.clipboard.writeText(postUrl);
        setStatus('Enlace copiado.');
      } catch {
        setStatus('No se pudo copiar el enlace.');
      }
    };

    el.copyLink.addEventListener('click', copyPostUrl);
    el.shareInstagram.addEventListener('click', async () => {
      await copyPostUrl();
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    });
  };

  async function setupCommentUI() {
    if (!hasCommentUI) return;

    if (auth.token && auth.uid) {
      const authorName = await resolveAuthorAlias();
      el.commentHelp.innerHTML = `Sesión iniciada como <strong>${escapeHtml(authorName)}</strong>.`;
      el.commentBody.disabled = false;
      el.commentBody.readOnly = false;
      el.commentBody.style.display = 'block';
      el.sendComment.disabled = false;
      el.sendComment.style.display = 'inline-flex';
      return;
    }

    el.commentHelp.innerHTML = 'Para responder, <a href="/comunidad.html">inicia sesión en Comunidad</a>.';
    el.commentBody.value = '';
    el.commentBody.disabled = true;
    el.commentBody.readOnly = true;
    el.commentBody.style.display = 'none';
    el.sendComment.disabled = true;
    el.sendComment.style.display = 'none';
  }

  const setupScrollTop = () => {
    if (!el.scrollTopBtn) return;
    window.addEventListener('scroll', () => {
      el.scrollTopBtn.classList.toggle('visible', window.scrollY > 320);
    });
    el.scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const init = async () => {
    setupShare();
    setupScrollTop();

    if (!hasCommentUI || !postSlug) return;

    await setupCommentUI();
    el.sendComment.addEventListener('click', addComment);
    await loadComments();
  };

  init().catch(() => {
    setStatus('No se pudo inicializar este post.');
  });
})();