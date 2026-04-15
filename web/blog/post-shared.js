// Etiove · post-shared.js
// Shared logic for all blog posts: share buttons, scroll-to-top,
// reading progress bar, and Firebase-backed comments.

(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────────────────────────
  const {
    apiKey: FIREBASE_API_KEY,
    iosBundleId: FIREBASE_IOS_BUNDLE,
    baseUrl: BASE_URL,
  } = window.ETIOVE_CONFIG;

  const cfg = window.ETIOVE_BLOG_POST_CONFIG || {};
  const postSlug =
    String(cfg.postSlug || '').trim() ||
    window.location.pathname.replace(/.*\//, '').replace(/\.html$/, '');
  const postUrl = window.location.href.split('?')[0].split('#')[0];
  const postTitle = document.title.replace(' | Blog Etiove', '').trim();

  // ─── TIEMPO DE LECTURA DINÁMICO ─────────────────────────────────────────────
  const updateReadingTime = () => {
    // Contar palabras del cuerpo del artículo
    const articleEl = document.querySelector('.post-body, article, .article-body, main');
    if (!articleEl) return;

    const text = articleEl.innerText || articleEl.textContent || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.round(words / 200)); // 200 palabras/min

    // Actualizar el hero-tag (reemplaza solo el fragmento "X min de lectura")
    const heroTag = document.querySelector('.hero-tag');
    if (heroTag) {
      heroTag.textContent = heroTag.textContent.replace(
        /\d+\s*min\s+de\s+lectura/i,
        `${mins} min de lectura`
      );
    }

    // Actualizar el schema JSON-LD si existe (timeRequired y wordCount)
    document.querySelectorAll('script[type="application/ld+json"]').forEach((tag) => {
      try {
        const schema = JSON.parse(tag.textContent);
        if (schema['@type'] === 'Article' || schema['@type'] === 'BlogPosting') {
          schema.timeRequired = `PT${mins}M`;
          schema.wordCount = words;
          tag.textContent = JSON.stringify(schema);
        }
        // Handle @graph
        if (schema['@graph']) {
          schema['@graph'].forEach((node) => {
            if (node['@type'] === 'Article' || node['@type'] === 'BlogPosting') {
              node.timeRequired = `PT${mins}M`;
              node.wordCount = words;
            }
          });
          tag.textContent = JSON.stringify(schema);
        }
      } catch (_) {}
    });
  };

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateReadingTime);
  } else {
    updateReadingTime();
  }

  // ─── AUTH (read-only from localStorage) ───────────────────────────────────
  const getAuth = () => ({
    uid: localStorage.getItem('etiove_web_uid') || '',
    alias: localStorage.getItem('etiove_web_alias') || '',
    token: localStorage.getItem('etiove_web_token') || '',
  });

  // ─── FIRESTORE HELPERS ────────────────────────────────────────────────────
  const toFirestoreValue = (val) => {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number')
      return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    return { stringValue: String(val) };
  };

  const fromFirestoreValue = (v = {}) => {
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return v.booleanValue;
    return null;
  };

  const docToObject = (doc) => {
    const out = {};
    const fields = (doc && doc.fields) || {};
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

  const baseHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Ios-Bundle-Identifier': FIREBASE_IOS_BUNDLE,
  });

  const getComments = async () => {
    const url = `${BASE_URL}/blog_comentarios?key=${FIREBASE_API_KEY}&pageSize=200`;
    try {
      const res = await fetch(url, { headers: baseHeaders() });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.documents || [])
        .map(docToObject)
        .filter((c) => String(c.postSlug || '') === postSlug)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } catch {
      return [];
    }
  };

  const addComment = async (data) => {
    const auth = getAuth();
    const headers = { ...baseHeaders() };
    if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
    const res = await fetch(`${BASE_URL}/blog_comentarios?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(toFields(data)),
    });
    if (!res.ok) throw new Error('save_failed');
    return docToObject(await res.json());
  };

  const deleteComment = async (docId) => {
    const auth = getAuth();
    const headers = { ...baseHeaders() };
    if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
    const res = await fetch(`${BASE_URL}/blog_comentarios/${docId}?key=${FIREBASE_API_KEY}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('delete_failed');
  };

  // ─── READING PROGRESS BAR ─────────────────────────────────────────────────
  const initReadingProgress = () => {
    const bar = document.createElement('div');
    bar.id = 'readingProgressBar';
    bar.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'height:3px',
      'width:0%',
      'background:linear-gradient(90deg,#9e6a42,#c99557)',
      'z-index:9999',
      'transition:width 0.1s linear',
      'border-radius:0 2px 2px 0',
      'pointer-events:none',
    ].join(';');
    document.body.prepend(bar);

    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      bar.style.width = pct + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  };

  // ─── SCROLL TO TOP ─────────────────────────────────────────────────────────
  const initScrollTop = () => {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    window.addEventListener(
      'scroll',
      () => {
        btn.classList.toggle('visible', window.scrollY > 400);
      },
      { passive: true }
    );
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  // ─── SHARE BUTTONS ────────────────────────────────────────────────────────
  const initShareButtons = () => {
    // X (Twitter)
    const shareX = document.getElementById('shareX');
    if (shareX) {
      const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(postUrl)}&via=etiove_app`;
      shareX.href = xUrl;
    }

    // Instagram — no direct share URL; use native share API or copy
    const shareIG = document.getElementById('shareInstagram');
    if (shareIG) {
      shareIG.addEventListener('click', async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title: postTitle, url: postUrl });
          } catch (e) {
            if (e.name !== 'AbortError') copyToClipboard(shareIG);
          }
        } else {
          copyToClipboard(shareIG);
        }
      });
    }

    // Copy link
    const copyBtn = document.getElementById('copyLink');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => copyToClipboard(copyBtn));
    }
  };

  const copyToClipboard = async (btn) => {
    const original = btn.innerHTML;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(postUrl);
      } else {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = postUrl;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      btn.textContent = '✓ Enlace copiado';
      btn.style.color = '#4f7a53';
      btn.style.borderColor = '#4f7a53';
    } catch {
      btn.textContent = 'No se pudo copiar';
    }
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2200);
  };

  // ─── COMMENTS ─────────────────────────────────────────────────────────────
  const escapeHtml = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const renderComments = (list, listEl) => {
    if (!listEl) return;
    if (!list.length) {
      listEl.innerHTML =
        '<p style="font-size:14px;color:#9a7963;margin-top:8px;">Sé el primero en comentar este artículo.</p>';
      return;
    }
    const auth = getAuth();
    const normAlias = (s) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .replace(/^@/, '');
    console.log('[etiove] auth uid:', auth.uid, '| alias:', auth.alias, '| !!token:', !!auth.token);
    list.forEach((c) =>
      console.log('[etiove] comment authorUid:', c.authorUid, '| authorName:', c.authorName)
    );
    listEl.innerHTML = list
      .map((c) => {
        const isOwner =
          auth.token &&
          ((auth.uid && c.authorUid && c.authorUid === auth.uid) ||
            (auth.alias && normAlias(c.authorName) === normAlias(auth.alias)));
        const deleteBtn = isOwner
          ? `<button class="comment-delete-btn" data-id="${escapeHtml(c.id)}" title="Borrar comentario" style="background:none;border:none;cursor:pointer;font-size:13px;color:#c0554a;margin-left:10px;padding:0;font-family:inherit;opacity:0.7;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">✕ Borrar</button>`
          : '';
        return `
      <div class="comment-item" data-comment-id="${escapeHtml(c.id)}">
        <p class="comment-meta">
          <strong>${escapeHtml(c.authorName || 'Catador')}</strong>
          · ${fmtDate(c.createdAt)}${deleteBtn}
        </p>
        <p class="comment-body">${escapeHtml(c.body || '')}</p>
      </div>
    `;
      })
      .join('');

    // Attach delete handlers
    listEl.querySelectorAll('.comment-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Borrar este comentario?')) return;
        const docId = btn.dataset.id;
        btn.disabled = true;
        btn.textContent = 'Borrando…';
        try {
          await deleteComment(docId);
          const item = listEl.querySelector(`[data-comment-id="${docId}"]`);
          if (item) item.remove();
          if (!listEl.querySelector('.comment-item')) {
            listEl.innerHTML =
              '<p style="font-size:14px;color:#9a7963;margin-top:8px;">Sé el primero en comentar este artículo.</p>';
          }
        } catch {
          btn.disabled = false;
          btn.textContent = '✕ Borrar';
          alert('No se pudo borrar. Inténtalo de nuevo.');
        }
      });
    });
  };

  const initComments = async () => {
    const helpEl = document.getElementById('commentHelp');
    const bodyEl = document.getElementById('commentBody');
    const sendBtn = document.getElementById('sendComment');
    const statusEl = document.getElementById('commentStatus');
    const listEl = document.getElementById('commentList');
    if (!sendBtn || !bodyEl || !listEl) return;

    const auth = getAuth();

    // Help text
    if (helpEl) {
      if (auth.uid && auth.alias) {
        helpEl.innerHTML = `Comentando como <strong>${escapeHtml(auth.alias)}</strong>. Los comentarios son públicos.`;
      } else if (auth.uid) {
        helpEl.innerHTML = 'Comentando como miembro. Los comentarios son públicos.';
      } else {
        helpEl.innerHTML = `<a href="/comunidad.html">Inicia sesión</a> para comentar con tu alias. Los comentarios de invitados también son bienvenidos.`;
      }
    }

    // Load existing comments
    const comments = await getComments();
    renderComments(comments, listEl);

    // Send comment
    let sending = false;
    sendBtn.addEventListener('click', async () => {
      if (sending) return;
      const body = (bodyEl.value || '').trim();
      if (!body || body.length < 3) {
        if (statusEl) statusEl.textContent = 'Escribe al menos 3 caracteres.';
        return;
      }

      sending = true;
      sendBtn.disabled = true;
      sendBtn.textContent = 'Publicando...';
      if (statusEl) statusEl.textContent = '';

      const currentAuth = getAuth();
      const authorName = currentAuth.alias || 'Catador';

      try {
        await addComment({
          postSlug,
          postUrl,
          body,
          authorUid: currentAuth.uid || '',
          authorName,
          createdAt: new Date().toISOString(),
          approved: true,
        });
        bodyEl.value = '';
        if (statusEl) {
          statusEl.textContent = '✓ Comentario publicado.';
          statusEl.style.color = '#4f7a53';
        }
        const updated = await getComments();
        renderComments(updated, listEl);
      } catch {
        if (statusEl) {
          statusEl.textContent = 'No se pudo publicar. Inténtalo de nuevo.';
          statusEl.style.color = '#a44f45';
        }
      } finally {
        sending = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Publicar respuesta';
        setTimeout(() => {
          if (statusEl) statusEl.textContent = '';
        }, 4000);
      }
    });
  };

  // ─── INIT ──────────────────────────────────────────────────────────────────

  // ─── TOC SCROLL SPY ───────────────────────────────────────────────────────
  const initTocScrollSpy = () => {
    const toc = document.querySelector('.toc');
    if (!toc || !window.IntersectionObserver) return;

    const headings = Array.from(document.querySelectorAll('h2[id], h3[id]'));
    if (!headings.length) return;

    const tocLinks = Array.from(toc.querySelectorAll('a[href^="#"]'));
    if (!tocLinks.length) return;

    // Highlight style for active TOC link
    const setActive = (id) => {
      tocLinks.forEach((a) => {
        const isActive = a.getAttribute('href') === '#' + id;
        a.style.color = isActive ? 'var(--ink, #1c120d)' : '';
        a.style.fontWeight = isActive ? '700' : '';
      });
    };

    let currentId = '';
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            currentId = entry.target.id;
            setActive(currentId);
          }
        });
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    );

    headings.forEach((h) => observer.observe(h));
  };

  const init = () => {
    initReadingProgress();
    initTocScrollSpy();
    initScrollTop();
    initShareButtons();
    initComments();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
