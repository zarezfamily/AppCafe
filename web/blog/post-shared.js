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

  const BLOG_VOTE_MAX_IDS = 200;

  const escapeHtml = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const splitCsv = (value) => String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const uniqCsv = (value) => Array.from(new Set(splitCsv(value)));

  const shortPreview = (text, max = 180) => {
    const raw = String(text || '').trim();
    if (raw.length <= max) return raw;
    return `${raw.slice(0, max - 1)}…`;
  };

  const goToProfilePage = (uid, name) => {
    const safeUid = String(uid || '').trim();
    if (!safeUid) return;
    const url = `/perfil.html?uid=${encodeURIComponent(safeUid)}&name=${encodeURIComponent(String(name || 'Catador'))}`;
    window.location.href = url;
  };

  const ensureBlogStyles = () => {
    if (document.getElementById('etioveBlogSharedStyles')) return;
    const style = document.createElement('style');
    style.id = 'etioveBlogSharedStyles';
    style.textContent = `
      .comment-head { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap; }
      .comment-author-btn { border:0; background:transparent; color:#7b6049; font:inherit; font-weight:700; cursor:pointer; padding:0; }
      .comment-author-btn:hover { color:#5d4030; text-decoration:underline; }
      .comment-actions { display:flex; align-items:center; gap:10px; margin-top:10px; flex-wrap:wrap; }
      .comment-vote-btn, .comment-manage-btn { border:0; background:transparent; color:#5d4030; font:inherit; font-size:13px; font-weight:700; cursor:pointer; padding:0; }
      .comment-vote-btn[disabled] { opacity:0.5; cursor:not-allowed; }
      .comment-manage-btn.delete { color:#8c3b2f; }
      .blog-author-modal { position:fixed; inset:0; background:rgba(0,0,0,0.44); display:none; align-items:center; justify-content:center; z-index:900; padding:14px; }
      .blog-author-modal.is-open { display:flex; }
      .blog-author-panel { width:min(560px, 100%); max-height:85vh; overflow:auto; background:#fffaf5; border:1px solid #e4d3c2; border-radius:16px; box-shadow:0 18px 48px rgba(28,18,13,0.25); padding:18px; }
      .blog-author-top { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
      .blog-author-name { font-family:'Playfair Display', serif; font-size:22px; color:#1c120d; }
      .blog-author-close { border:0; background:transparent; color:#5d4030; font-size:24px; line-height:1; cursor:pointer; }
      .blog-author-stats { display:flex; gap:14px; margin-bottom:12px; flex-wrap:wrap; }
      .blog-author-stat { border:1px solid #e4d3c2; border-radius:12px; padding:8px 10px; background:#fff; min-width:102px; }
      .blog-author-stat strong { display:block; font-size:20px; color:#1c120d; }
      .blog-author-stat span { font-size:11px; text-transform:uppercase; letter-spacing:1.2px; color:#8b7355; }
      .blog-author-list { display:grid; gap:8px; }
      .blog-author-item { border:1px solid #e4d3c2; border-radius:10px; padding:10px; background:#fff; }
      .blog-author-meta { font-size:12px; color:#8b7355; margin-bottom:4px; }
      .blog-author-body { font-size:14px; color:#38251c; line-height:1.45; margin:0; }
    `;
    document.head.appendChild(style);
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

  const updateDocument = async (name, id, data) => {
    const params = new URLSearchParams({ key: FIREBASE_API_KEY });
    Object.keys(data).forEach((field) => params.append('updateMask.fieldPaths', field));
    const res = await fetch(`${BASE_URL}/${name}/${id}?${params.toString()}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(toFields(data)),
    });
    return res.ok;
  };

  const deleteDocument = async (name, id) => {
    const res = await fetch(`${BASE_URL}/${name}/${id}?key=${FIREBASE_API_KEY}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.ok;
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

  const ensureAuthorModal = () => {
    let modal = document.getElementById('blogAuthorModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'blogAuthorModal';
    modal.className = 'blog-author-modal';
    modal.innerHTML = `
      <div class="blog-author-panel" role="dialog" aria-modal="true" aria-label="Perfil del autor">
        <div class="blog-author-top">
          <strong id="blogAuthorName" class="blog-author-name">Catador</strong>
          <button id="blogAuthorClose" class="blog-author-close" type="button" aria-label="Cerrar">×</button>
        </div>
        <div id="blogAuthorStats" class="blog-author-stats"></div>
        <div id="blogAuthorList" class="blog-author-list"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.classList.remove('is-open');
    });

    const closeBtn = modal.querySelector('#blogAuthorClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('is-open');
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') modal.classList.remove('is-open');
    });

    return modal;
  };

  const openAuthorModal = async (uid, name) => {
    const safeUid = String(uid || '').trim();
    if (!safeUid) return;

    const modal = ensureAuthorModal();
    const titleEl = modal.querySelector('#blogAuthorName');
    const statsEl = modal.querySelector('#blogAuthorStats');
    const listEl = modal.querySelector('#blogAuthorList');
    if (!titleEl || !statsEl || !listEl) return;

    titleEl.textContent = name || 'Catador';
    statsEl.innerHTML = '<div class="blog-author-stat"><strong>…</strong><span>Cargando</span></div>';
    listEl.innerHTML = '<div class="blog-author-item"><p class="blog-author-body">Buscando aportes recientes...</p></div>';
    modal.classList.add('is-open');

    const comments = await getCollection('blog_comentarios', 1000);
    const mine = comments
      .filter((item) => item.authorUid === safeUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalUp = mine.reduce((acc, item) => acc + Number(item.upvotes || 0), 0);
    const totalDown = mine.reduce((acc, item) => acc + Number(item.downvotes || 0), 0);
    statsEl.innerHTML = `
      <div class="blog-author-stat"><strong>${mine.length}</strong><span>Comentarios</span></div>
      <div class="blog-author-stat"><strong>${totalUp}</strong><span>Votos +</span></div>
      <div class="blog-author-stat"><strong>${totalDown}</strong><span>Votos -</span></div>
    `;

    if (!mine.length) {
      listEl.innerHTML = '<div class="blog-author-item"><p class="blog-author-body">Este usuario todavía no tiene comentarios públicos en el blog.</p></div>';
      return;
    }

    listEl.innerHTML = mine.slice(0, 6).map((item) => `
      <article class="blog-author-item">
        <div class="blog-author-meta">${escapeHtml(item.postSlug || 'Post')} · ${escapeHtml(formatDate(item.createdAt))}</div>
        <p class="blog-author-body">${escapeHtml(shortPreview(item.body || ''))}</p>
      </article>
    `).join('');
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

    el.commentList.innerHTML = comments.map((comment) => {
      const upvoters = uniqCsv(comment.upvoterUids || comment.voterUids);
      const downvoters = uniqCsv(comment.downvoterUids);
      const hasUp = auth.uid ? upvoters.includes(auth.uid) : false;
      const hasDown = auth.uid ? downvoters.includes(auth.uid) : false;
      const canManage = !!auth.uid && comment.authorUid === auth.uid;
      const upvotes = Number(comment.upvotes || 0);
      const downvotes = Number(comment.downvotes || 0);
      const voteLocked = !auth.uid;

      return `
      <article class="comment-item">
        <div class="comment-head">
          <div class="comment-meta"><button class="comment-author-btn" type="button" data-author-uid="${escapeHtml(comment.authorUid || '')}" data-author-name="${escapeHtml(comment.authorName || 'Catador')}">${escapeHtml(comment.authorName || 'Catador')}</button> · ${escapeHtml(formatDate(comment.createdAt))}</div>
          ${canManage ? `<div class="comment-actions"><button class="comment-manage-btn" type="button" data-comment-edit="${comment.id}">Editar</button><button class="comment-manage-btn delete" type="button" data-comment-delete="${comment.id}">Eliminar</button></div>` : ''}
        </div>
        <p class="comment-body">${escapeHtml(comment.body || '')}</p>
        <div class="comment-actions">
          <button class="comment-vote-btn" type="button" data-comment-vote-up="${comment.id}" ${voteLocked || hasUp ? 'disabled' : ''}>👍 ${upvotes}</button>
          <button class="comment-vote-btn" type="button" data-comment-vote-down="${comment.id}" ${voteLocked || hasDown ? 'disabled' : ''}>👎 ${downvotes}</button>
        </div>
      </article>
    `;
    }).join('');

    el.commentList.querySelectorAll('[data-comment-vote-up]').forEach((btn) => {
      btn.addEventListener('click', () => voteComment(btn.getAttribute('data-comment-vote-up'), 'up'));
    });

    el.commentList.querySelectorAll('[data-comment-vote-down]').forEach((btn) => {
      btn.addEventListener('click', () => voteComment(btn.getAttribute('data-comment-vote-down'), 'down'));
    });

    el.commentList.querySelectorAll('[data-comment-edit]').forEach((btn) => {
      btn.addEventListener('click', () => editComment(btn.getAttribute('data-comment-edit')));
    });

    el.commentList.querySelectorAll('[data-comment-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteComment(btn.getAttribute('data-comment-delete')));
    });

    el.commentList.querySelectorAll('[data-author-uid]').forEach((btn) => {
      btn.addEventListener('click', () => goToProfilePage(btn.getAttribute('data-author-uid'), btn.getAttribute('data-author-name')));
    });
  };

  const voteComment = async (commentId, direction) => {
    if (!auth.token || !auth.uid) {
      setStatus('Inicia sesión para votar comentarios.');
      return;
    }

    const all = await getCollection('blog_comentarios', 1000);
    const comment = all.find((item) => item.id === commentId && item.postSlug === postSlug);
    if (!comment) {
      setStatus('No se encontró ese comentario.');
      return;
    }

    const upvoters = uniqCsv(comment.upvoterUids || comment.voterUids);
    const downvoters = uniqCsv(comment.downvoterUids);

    if (direction === 'up' && upvoters.includes(auth.uid)) {
      setStatus('Ya votaste positivo este comentario.');
      return;
    }
    if (direction === 'down' && downvoters.includes(auth.uid)) {
      setStatus('Ya votaste negativo este comentario.');
      return;
    }

    const nextUp = upvoters.filter((uid) => uid !== auth.uid);
    const nextDown = downvoters.filter((uid) => uid !== auth.uid);

    if (direction === 'up') nextUp.push(auth.uid);
    if (direction === 'down') nextDown.push(auth.uid);

    const ok = await updateDocument('blog_comentarios', commentId, {
      upvotes: nextUp.length,
      downvotes: nextDown.length,
      upvoterUids: nextUp.slice(0, BLOG_VOTE_MAX_IDS).join(','),
      downvoterUids: nextDown.slice(0, BLOG_VOTE_MAX_IDS).join(','),
    });

    if (!ok) {
      setStatus('No se pudo guardar tu voto.');
      return;
    }

    setStatus(direction === 'up' ? 'Voto positivo guardado.' : 'Voto negativo guardado.');
    await loadComments();
  };

  const editComment = async (commentId) => {
    if (!auth.token || !auth.uid) {
      setStatus('Inicia sesión para editar.');
      return;
    }

    const all = await getCollection('blog_comentarios', 1000);
    const comment = all.find((item) => item.id === commentId && item.postSlug === postSlug);
    if (!comment || comment.authorUid !== auth.uid) {
      setStatus('Solo puedes editar tus propios comentarios.');
      return;
    }

    const nextBody = window.prompt('Edita tu respuesta', comment.body || '');
    if (nextBody === null) return;

    const body = String(nextBody || '').trim();
    if (body.length < 3) {
      setStatus('La respuesta debe tener al menos 3 caracteres.');
      return;
    }

    const ok = await updateDocument('blog_comentarios', commentId, {
      body,
      updatedAt: new Date().toISOString(),
    });

    if (!ok) {
      setStatus('No se pudo actualizar la respuesta.');
      return;
    }

    setStatus('Respuesta actualizada.');
    await loadComments();
  };

  const deleteComment = async (commentId) => {
    if (!auth.token || !auth.uid) {
      setStatus('Inicia sesión para eliminar.');
      return;
    }

    const all = await getCollection('blog_comentarios', 1000);
    const comment = all.find((item) => item.id === commentId && item.postSlug === postSlug);
    if (!comment || comment.authorUid !== auth.uid) {
      setStatus('Solo puedes eliminar tus propios comentarios.');
      return;
    }

    if (!window.confirm('Se eliminará tu respuesta.')) return;

    const ok = await deleteDocument('blog_comentarios', commentId);
    if (!ok) {
      setStatus('No se pudo eliminar la respuesta.');
      return;
    }

    setStatus('Respuesta eliminada.');
    await loadComments();
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
        upvotes: 0,
        downvotes: 0,
        upvoterUids: '',
        downvoterUids: '',
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
    ensureBlogStyles();
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