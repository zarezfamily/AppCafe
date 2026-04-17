const {
  projectId: FIREBASE_PROJECT_ID,
  apiKey: FIREBASE_API_KEY,
  iosBundleId: FIREBASE_IOS_BUNDLE_ID,
  authUrl: AUTH_URL,
  baseUrl: BASE_URL,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  uploadFunctionUrl: UPLOAD_FUNCTION_URL,
} = window.ETIOVE_CONFIG;

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
  emailVerified: localStorage.getItem('etiove_web_email_verified') === 'true',
};

// ─── ANTI-SPAM / SUBMIT GUARD ─────────────────────────────────────────────────
// Prevents double-submits on threads, replies, votes and edits while an
// async operation is in flight. Each key is independent so e.g. voting
// doesn't block typing a reply.
const _submitting = {
  thread: false,
  reply: false,
  vote: false,
  edit: false,
};

const withSubmitGuard = async (key, btn, loadingText, fn) => {
  if (_submitting[key]) return;
  _submitting[key] = true;
  const originalText = btn ? btn.textContent : '';
  const originalDisabled = btn ? btn.disabled : false;
  if (btn) {
    btn.disabled = true;
    if (loadingText) btn.textContent = loadingText;
  }
  try {
    await fn();
  } finally {
    _submitting[key] = false;
    if (btn) {
      btn.disabled = originalDisabled;
      btn.textContent = originalText;
    }
  }
};

// ─── DETECCIÓN OFFLINE ───────────────────────────────────────────────────────
const isOffline = () => !navigator.onLine;

const showOfflineBanner = () => {
  if (document.getElementById('offlineBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'offlineBanner';
  banner.style.cssText = [
    'position:fixed;top:0;left:0;right:0;z-index:9998',
    'background:#4d3529;color:#fff9f1',
    'padding:10px 20px',
    'display:flex;align-items:center;justify-content:space-between;gap:16px',
    'font-size:13px;font-family:-apple-system,BlinkMacSystemFont,sans-serif',
    'box-shadow:0 2px 12px rgba(0,0,0,0.2)',
  ].join(';');
  banner.innerHTML = `
    <span>📶 Sin conexión — Los cambios no se guardarán hasta que vuelvas a estar en línea.</span>
    <button id="offlineBannerClose" style="background:transparent;color:rgba(255,249,241,0.6);border:none;font-size:18px;line-height:1;cursor:pointer;padding:0 4px;">×</button>`;
  document.body.prepend(banner);
  document.getElementById('offlineBannerClose').onclick = () => banner.remove();
};

const hideOfflineBanner = () => {
  const banner = document.getElementById('offlineBanner');
  if (banner) banner.remove();
};

// Guard that checks connectivity before any write operation
const requireOnline = () => {
  if (isOffline()) {
    showOfflineBanner();
    return false;
  }
  return true;
};

const VERIFIED_BADGE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-left:4px;flex-shrink:0;" aria-label="Email verificado" title="Email verificado"><circle cx="12" cy="12" r="12" fill="#1d9bf0"/><path d="M8.5 12.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let canonicalAlias = String(localStorage.getItem('etiove_web_alias') || '').trim();
let aliasSyncDone = false;

const setCanonicalAlias = (alias) => {
  const safeAlias = String(alias || '').trim();
  if (!safeAlias) return '';
  canonicalAlias = safeAlias;
  localStorage.setItem('etiove_web_alias', safeAlias);
  return safeAlias;
};

// Nunca usar email/prefijo como nombre visible.
const getAuthorName = () =>
  canonicalAlias || String(localStorage.getItem('etiove_web_alias') || '').trim() || 'Catador';

// Busca en foro_hilos un hilo del usuario para obtener su alias real
const resolveAuthorAlias = async () => {
  const stored = String(localStorage.getItem('etiove_web_alias') || '').trim();
  if (stored) {
    canonicalAlias = stored;
    return stored;
  }

  if (!auth.uid) return 'Catador';

  const profile = await getDocument('user_profiles', auth.uid).catch(() => null);
  const fromProfile = String(
    (profile && (profile.displayName || profile.alias || profile.nickname)) || ''
  ).trim();
  if (fromProfile) return setCanonicalAlias(fromProfile);

  const allThreads = await getCollection('foro_hilos', 200).catch(() => []);
  const mine = allThreads.find(
    (t) => t.authorUid === auth.uid && String(t.authorName || '').trim()
  );
  if (mine) return setCanonicalAlias(mine.authorName);

  return getAuthorName();
};

// ─── MODAL PERFIL ─────────────────────────────────────────────────────────────
const openProfileModal = async (authorUid, authorName) => {
  if (!auth.token) return; // solo para registrados
  const modal = document.getElementById('profileModal');
  if (!modal) return;

  // Mostrar modal con datos básicos inmediatamente
  document.getElementById('profileModalName').textContent = authorName || 'Catador';
  document.getElementById('profileModalSub').textContent = 'Miembro de la comunidad';
  const initial = (authorName || '?')[0].toUpperCase();
  document.getElementById('profileModalAvatar').innerHTML = initial;
  document.getElementById('profileModalStats').innerHTML =
    '<span style="color:#ccc;font-size:13px;">Cargando...</span>';
  document.getElementById('profileModalBody').innerHTML = '';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Buscar hilos y respuestas del usuario
  try {
    const [allThreads, allReplies] = await Promise.all([
      getCollection('foro_hilos', 500),
      getCollection('foro_respuestas', 1200),
    ]);
    const userThreads = allThreads.filter((t) => t.authorUid === authorUid);
    const userReplies = allReplies.filter((r) => r.authorUid === authorUid);
    const totalVotes = userThreads.reduce((s, t) => s + Number(t.upvotes || 0), 0);

    document.getElementById('profileModalStats').innerHTML = `
      <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:#1c120d;">${userThreads.length}</div><div style="font-size:11px;color:#8b7355;letter-spacing:1px;text-transform:uppercase;">Hilos</div></div>
      <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:#1c120d;">${userReplies.length}</div><div style="font-size:11px;color:#8b7355;letter-spacing:1px;text-transform:uppercase;">Respuestas</div></div>
      <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:#1c120d;">${totalVotes}</div><div style="font-size:11px;color:#8b7355;letter-spacing:1px;text-transform:uppercase;">Votos</div></div>
    `;

    if (userThreads.length > 0) {
      const recent = userThreads
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);
      document.getElementById('profileModalBody').innerHTML = `
        <p style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8b7355;margin-bottom:8px;">Últimos hilos</p>
        ${recent.map((t) => `<div style="padding:8px 0;border-bottom:1px solid #f0e8df;font-size:13px;color:#1c120d;">${escapeHtml(t.title)}</div>`).join('')}
      `;
    }
  } catch (_) {
    /* no bloquear */
  }
};

const closeProfileModal = () => {
  const modal = document.getElementById('profileModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
};

let selectedCategory = 'general';
let threads = [];
let replies = [];
// Ajusta el tamaño de página para que la paginación se adapte visualmente a la member card y sección de nuevo hilo
const THREADS_PAGE_SIZE = 7;
let currentListPage = 1;
let editingThreadId = '';
let editingThreadDraft = null;
let editingThreadFocusField = 'title';
// Búsqueda persistente: se mantiene al paginar y al cambiar de categoría
let activeSearchTerm = '';
let activeSortOrder = 'recent'; // 'recent' | 'votes' | 'replies'
// Edición inline de respuestas
let editingReplyId = '';
let editingReplyDraft = '';
let pendingThreadAnchorY = null;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

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
  threadImageStatus: document.getElementById('threadImageStatus'),
  threadComposerTitle: document.getElementById('threadComposerTitle'),
  threadEditBanner: document.getElementById('threadEditBanner'),
  threadEditBannerText: document.getElementById('threadEditBannerText'),
  createThreadBtn: document.getElementById('createThreadBtn'),
  cancelThreadEditBtn: document.getElementById('cancelThreadEditBtn'),
  threadStatus: document.getElementById('threadStatus'),

  categoryChips: document.getElementById('categoryChips'),
  refreshBtn: document.getElementById('refreshBtn'),
  threadsWrap: document.getElementById('threadsWrap'),

  memberEvolutionCard: document.getElementById('memberEvolutionCard'),
  authSection: document.getElementById('authSection'),
  memberAvatar: document.getElementById('memberAvatar'),
  memberAvatarImg: document.getElementById('memberAvatarImg'),
  memberAvatarFallback: document.getElementById('memberAvatarFallback'),
  memberEvolutionName: document.getElementById('memberEvolutionName'),
  memberEvolutionTier: document.getElementById('memberEvolutionTier'),
  memberEvolutionStats: document.getElementById('memberEvolutionStats'),
  memberEvolutionBadges: document.getElementById('memberEvolutionBadges'),
  memberEvolutionEmpty: document.getElementById('memberEvolutionEmpty'),
};

const escapeHtml = (text) =>
  String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Permite espacios entre palabras, solo limpia extremos y múltiples espacios
const normalizeThreadTitle = (text) =>
  String(text || '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toLocaleUpperCase('es-ES');

const splitCsv = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const BADGE_LIBRARY = {
  first_thread: {
    icon: '🌱',
    label: 'Primer hilo',
    desc: 'Iniciaste tu primera conversación en la comunidad.',
  },
  first_reply: {
    icon: '💬',
    label: 'Primera respuesta',
    desc: 'Participaste ayudando en un hilo de otro miembro.',
  },
  curator: {
    icon: '🧠',
    label: 'Curador',
    desc: 'Tus aportes reciben interés y aportan criterio al foro.',
  },
  active_voice: {
    icon: '⚡',
    label: 'Voz activa',
    desc: 'Mantienes presencia frecuente en la conversación.',
  },
  top_contributor: {
    icon: '🏆',
    label: 'Top contribuidor',
    desc: 'Acumulaste una participación destacada en hilos y respuestas.',
  },
  community_pillar: {
    icon: '🛡️',
    label: 'Pilar',
    desc: 'Eres uno de los perfiles más constantes de la comunidad.',
  },
  espresso_scholar: {
    icon: '📚',
    label: 'Scholar',
    desc: 'Tu evolución refleja dominio y aprendizaje continuo.',
  },
};

const normalizeBadgeId = (rawBadge) =>
  normalizeText(rawBadge)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const deriveTierLabel = (xp) => {
  if (xp >= 2500) return 'Reserve V';
  if (xp >= 1600) return 'Reserve IV';
  if (xp >= 900) return 'Reserve III';
  if (xp >= 350) return 'Reserve II';
  return 'Reserve I';
};

const fallbackBadgeIds = (stats) => {
  const badges = [];
  if (stats.threadCount >= 1) badges.push('first_thread');
  if (stats.replyCount >= 1) badges.push('first_reply');
  if (stats.voteReceived >= 12) badges.push('curator');
  if (stats.replyCount >= 8) badges.push('active_voice');
  if (stats.threadCount >= 6 || stats.replyCount >= 20) badges.push('top_contributor');
  if (stats.threadCount + stats.replyCount >= 30) badges.push('community_pillar');
  if (stats.xp >= 900) badges.push('espresso_scholar');
  return badges;
};

const formatBadgeUnlockDate = (iso) => {
  const safe = String(iso || '').trim();
  if (!safe) return '';
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const extractBadgeUnlockMap = (profile) => {
  const out = {};
  if (!profile) return out;

  const rawJson = String(
    profile.badgeUnlockedAtJson || profile.achievementUnlockedAtJson || ''
  ).trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach((k) => {
          const key = normalizeBadgeId(k);
          const value = String(parsed[k] || '').trim();
          if (key && value) out[key] = value;
        });
      }
    } catch {
      // Ignore malformed JSON payloads from older profiles.
    }
  }

  const rawCsv = String(profile.badgeUnlockedAtCsv || profile.achievementDatesCsv || '').trim();
  splitCsv(rawCsv).forEach((entry) => {
    const sep = entry.includes('|') ? '|' : entry.includes(':') ? ':' : '';
    if (!sep) return;
    const idx = entry.indexOf(sep);
    if (idx < 1) return;
    const id = normalizeBadgeId(entry.slice(0, idx));
    const date = String(entry.slice(idx + 1) || '').trim();
    if (id && date && !out[id]) out[id] = date;
  });

  return out;
};

const renderMemberEvolutionCard = ({ profile = null, allThreads = [], allReplies = [] } = {}) => {
  if (!el.memberEvolutionCard) return;
  if (!auth.uid || !auth.token) {
    el.memberEvolutionCard.style.display = 'none';
    if (el.authSection) el.authSection.style.display = 'block';
    return;
  }
  // Mostrar card premium, ocultar acceso
  el.memberEvolutionCard.style.display = 'block';
  if (el.authSection) el.authSection.style.display = 'none';

  // Avatar premium
  let avatarUrl =
    (profile && (profile.photoURL || profile.avatarUrl || profile.avatar || profile.photo || '')) ||
    '';
  let displayName = String(
    (profile && (profile.displayName || profile.alias || profile.nickname)) ||
      getAuthorName() ||
      'Catador'
  ).trim();
  // Avatar premium: buscar nuevos elementos DOM
  el.memberAvatarImg = document.getElementById('memberAvatarImg');
  el.memberAvatarFallback = document.getElementById('memberAvatarFallback');
  if (el.memberAvatarImg && el.memberAvatarFallback) {
    if (avatarUrl) {
      el.memberAvatarImg.src = avatarUrl;
      el.memberAvatarImg.style.display = 'block';
      el.memberAvatarFallback.style.display = 'none';
      el.memberAvatarImg.onerror = function () {
        el.memberAvatarImg.style.display = 'none';
        el.memberAvatarFallback.textContent = displayName.charAt(0).toUpperCase();
        el.memberAvatarFallback.style.display = 'block';
      };
    } else {
      el.memberAvatarImg.src = '';
      el.memberAvatarImg.style.display = 'none';
      el.memberAvatarFallback.textContent = displayName.charAt(0).toUpperCase();
      el.memberAvatarFallback.style.display = 'block';
    }
  }

  const myThreads = allThreads.filter((item) => item.authorUid === auth.uid);
  const myReplies = allReplies.filter((item) => item.authorUid === auth.uid);
  const votesFromThreads = myThreads.reduce((sum, item) => sum + Number(item.upvotes || 0), 0);
  const votesFromReplies = myReplies.reduce((sum, item) => sum + Number(item.upvotes || 0), 0);
  const voteReceived = votesFromThreads + votesFromReplies;

  const profileXp = Number(
    (profile && (profile.xp || profile.totalXp || profile.communityXp || 0)) || 0
  );
  const calculatedXp = myThreads.length * 40 + myReplies.length * 18 + voteReceived * 4;
  const xp = Math.max(profileXp, calculatedXp);
  const tier =
    String(
      (profile && (profile.memberLevel || profile.tierLabel || profile.communityTier)) || ''
    ).trim() || deriveTierLabel(xp);

  const rawAchievementCsv = String(
    (profile && (profile.achievementCsv || profile.achievementsCsv || profile.badgeCsv)) || ''
  ).trim();
  const parsedBadges = splitCsv(rawAchievementCsv).map(normalizeBadgeId).filter(Boolean);
  const badgeUnlockMap = extractBadgeUnlockMap(profile);
  const computedBadges =
    parsedBadges.length > 0
      ? parsedBadges
      : fallbackBadgeIds({
          threadCount: myThreads.length,
          replyCount: myReplies.length,
          voteReceived,
          xp,
        });
  const uniqueBadges = Array.from(new Set(computedBadges)).slice(0, 8);

  const aliasDisplay =
    '@' +
    String(displayName || 'catador')
      .replace(/^@+/, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  const verifyBadgeOrBtn = auth.emailVerified
    ? VERIFIED_BADGE
    : ` <button id="communityVerifyBtn" style="margin-left:5px;font-size:10px;letter-spacing:1px;text-transform:uppercase;background:rgba(201,149,87,0.15);border:1px solid rgba(201,149,87,0.4);color:#9e6a42;border-radius:6px;padding:2px 7px;cursor:pointer;font-family:inherit;vertical-align:middle;">Verificar email</button>`;
  el.memberEvolutionName.innerHTML =
    `<button class="link-btn member-alias-btn" id="memberAliasBtn"
       style="font-family:inherit;font-size:inherit;font-weight:inherit;
              color:inherit;letter-spacing:inherit;background:none;border:none;
              cursor:pointer;padding:0;text-decoration:none;
              transition:opacity 0.2s;" title="Ver tu perfil">${escapeHtml(aliasDisplay)}</button>` +
    verifyBadgeOrBtn;
  // Wire click after DOM settles
  setTimeout(() => {
    const aliasBtn = document.getElementById('memberAliasBtn');
    if (aliasBtn && !aliasBtn.dataset.bound) {
      aliasBtn.addEventListener('click', () => goToProfilePage(auth.uid, getAuthorName()));
      aliasBtn.addEventListener('mouseenter', () => {
        aliasBtn.style.opacity = '0.65';
      });
      aliasBtn.addEventListener('mouseleave', () => {
        aliasBtn.style.opacity = '1';
      });
      aliasBtn.dataset.bound = '1';
    }
  }, 0);
  // Wire verify button
  setTimeout(() => {
    const vBtn = document.getElementById('communityVerifyBtn');
    if (vBtn)
      vBtn.addEventListener('click', () => {
        vBtn.disabled = true;
        vBtn.textContent = 'Enviando...';
        fetch(
          'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' + FIREBASE_API_KEY,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Ios-Bundle-Identifier': FIREBASE_IOS_BUNDLE_ID,
            },
            body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: auth.token }),
          }
        )
          .then(() => {
            vBtn.textContent = '✔ Email enviado';
          })
          .catch(() => {
            vBtn.textContent = 'Error, reintenta';
            vBtn.disabled = false;
          });
      });
  }, 0);
  const TIER_DESC = {
    'Reserve I': 'Nivel 1 de 5 · 0–349 XP\nEstás comenzando tu viaje en la comunidad Etiove.',
    'Reserve II': 'Nivel 2 de 5 · 350–899 XP\nMiembro activo con criterio en crecimiento.',
    'Reserve III': 'Nivel 3 de 5 · 900–1599 XP\nVoz reconocida en el Salón Etiove.',
    'Reserve IV': 'Nivel 4 de 5 · 1600–2499 XP\nReferente de la comunidad.',
    'Reserve V': 'Nivel 5 de 5 · 2500+ XP\nÉlite del café de especialidad.',
  };
  el.memberEvolutionTier.textContent = tier;
  el.memberEvolutionTier.setAttribute('data-tooltip', TIER_DESC[tier] || tier);

  el.memberEvolutionStats.innerHTML = [
    { label: 'XP', value: Math.round(xp) },
    { label: 'Hilos', value: myThreads.length },
    { label: 'Respuestas', value: myReplies.length },
    { label: 'Votos', value: voteReceived },
  ]
    .map(
      (item) => `
    <div class="member-evo-stat">
      <p class="member-evo-stat-label">${escapeHtml(item.label)}</p>
      <p class="member-evo-stat-value">${escapeHtml(String(item.value))}</p>
    </div>
  `
    )
    .join('');

  if (uniqueBadges.length === 0) {
    el.memberEvolutionBadges.innerHTML = '';
    el.memberEvolutionEmpty.style.display = 'block';
  } else {
    // Barra de progreso XP
    const XP_TIERS = [
      { label: 'Reserve I', min: 0 },
      { label: 'Reserve II', min: 350 },
      { label: 'Reserve III', min: 900 },
      { label: 'Reserve IV', min: 1600 },
      { label: 'Reserve V', min: 2500 },
    ];
    const currentTierIdx = XP_TIERS.reduce((acc, t, i) => (xp >= t.min ? i : acc), 0);
    const nextTier = XP_TIERS[currentTierIdx + 1] || null;
    const currentMin = XP_TIERS[currentTierIdx].min;
    const progressPct = nextTier
      ? Math.min(100, Math.round(((xp - currentMin) / (nextTier.min - currentMin)) * 100))
      : 100;
    const xpLeft = nextTier ? nextTier.min - Math.round(xp) : 0;

    let progressEl = document.getElementById('memberEvoProgressWrap');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.id = 'memberEvoProgressWrap';
      progressEl.className = 'member-evo-progress-wrap';
      el.memberEvolutionCard.insertBefore(progressEl, el.memberEvolutionBadges);
    }
    progressEl.innerHTML = `
    <div class="member-evo-progress-labels">
      <span class="member-evo-progress-xp">${Math.round(xp)} XP</span>
      <span class="member-evo-progress-next">${nextTier ? xpLeft + ' XP para ' + nextTier.label : 'Nivel máximo'}</span>
    </div>
    <div class="member-evo-progress-track">
      <div class="member-evo-progress-fill" style="width:${progressPct}%"></div>
    </div>`;

    el.memberEvolutionBadges.innerHTML = uniqueBadges
      .map((badgeId) => {
        const badge = BADGE_LIBRARY[badgeId] || {
          icon: '✦',
          label: badgeId.replace(/_/g, ' '),
          desc: 'Insignia desbloqueada por tu evolución en la comunidad.',
        };
        const unlockedAt = formatBadgeUnlockDate(badgeUnlockMap[badgeId]);
        const tooltip = unlockedAt
          ? `${badge.label} · ${badge.desc} · Desbloqueada ${unlockedAt}`
          : `${badge.label} · ${badge.desc}`;
        return `<span class="member-evo-badge" data-tip="${escapeHtml(tooltip)}" tabindex="0"><span>${escapeHtml(badge.icon)} ${escapeHtml(badge.label)}</span></span>`;
      })
      .join('');
    // Tooltips: handled via CSS ::after data-tip attribute
    el.memberEvolutionEmpty.style.display = 'none';
  }

  el.memberEvolutionCard.style.display = 'block';
};

const canManageItem = (item) =>
  !!auth.uid && item && String(item.authorUid).trim() === String(auth.uid).trim();

const setThreadImageStatus = (text, kind = '') => {
  if (!el.threadImageStatus) return;
  el.threadImageStatus.textContent = text || 'Imagen opcional para el hilo';
  el.threadImageStatus.className = `file-note ${kind}`.trim();
};

const transitionThreadsView = (renderFn, afterRender) => {
  if (!el.threadsWrap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    renderFn();
    if (typeof afterRender === 'function') afterRender();
    return;
  }

  el.threadsWrap.classList.add('threads-is-switching');
  window.setTimeout(() => {
    renderFn();
    el.threadsWrap.classList.remove('threads-is-switching');
    el.threadsWrap.classList.add('threads-is-entering');
    window.requestAnimationFrame(() => {
      el.threadsWrap.classList.remove('threads-is-entering');
      if (typeof afterRender === 'function') afterRender();
    });
  }, 110);
};

const resetThreadComposer = (options = {}) => {
  const { preserveStatus = false } = options;
  const composerSection = document.getElementById('newThreadSection');
  if (el.threadComposerTitle) el.threadComposerTitle.textContent = 'Nuevo hilo';
  if (composerSection) composerSection.classList.remove('thread-composer-is-editing');
  if (el.threadEditBanner) el.threadEditBanner.classList.remove('is-visible');
  if (el.threadEditBannerText)
    el.threadEditBannerText.textContent =
      'Aquí editarás el título y el mensaje del hilo seleccionado.';
  if (el.createThreadBtn) el.createThreadBtn.textContent = 'Publicar hilo';
  if (el.cancelThreadEditBtn) el.cancelThreadEditBtn.style.display = 'none';
  if (el.threadTitle) el.threadTitle.value = '';
  if (el.threadBody) el.threadBody.value = '';
  if (el.threadImage) {
    el.threadImage.value = '';
    el.threadImage.disabled = false;
  }
  if (el.threadAccessLevel) el.threadAccessLevel.value = 'public';
  if (el.categorySelect && selectedCategory) el.categorySelect.value = selectedCategory;
  setThreadImageStatus('Imagen opcional para el hilo');
  if (!preserveStatus) setStatus(el.threadStatus, '', '');
};

const focusInlineThreadEditor = () => {
  if (!editingThreadId) return;
  const selector =
    editingThreadFocusField === 'body'
      ? `[data-inline-edit-body="${editingThreadId}"]`
      : `[data-inline-edit-title="${editingThreadId}"]`;
  const target = el.threadsWrap ? el.threadsWrap.querySelector(selector) : null;
  if (!target) return;
  target.focus({ preventScroll: true });
  if (typeof target.setSelectionRange === 'function') {
    if (editingThreadFocusField === 'body') {
      const end = String(target.value || '').length;
      target.setSelectionRange(end, end);
    } else {
      const end = String(target.value || '').length;
      target.setSelectionRange(0, end);
    }
  }
};

const resetInlineThreadEdit = (options = {}) => {
  const { preserveStatus = false, rerender = true } = options;
  editingThreadId = '';
  editingThreadDraft = null;
  editingThreadFocusField = 'title';
  if (!preserveStatus) setStatus(el.threadStatus, '', '');
  if (rerender) renderThreads();
};

const renderInlineThreadEditor = (item, options = {}) => {
  const { compact = false } = options;
  const draft = editingThreadDraft || item;
  const categoryValue = String(draft.categoryId || item.categoryId || 'general');
  const accessValue = draft.accessLevel === 'registered_only' ? 'registered_only' : 'public';
  const activeImageUrl = draft.imageRemoved
    ? ''
    : normalizeStorageImageUrl(draft.image || item.image || '');
  const imageStatusKind = String(draft.imageStatusKind || '');
  const imageStatusText = String(
    draft.imageStatus || (activeImageUrl ? 'Imagen actual del hilo.' : 'Este hilo no tiene imagen.')
  );
  return `
    <div class="thread-inline-editor${compact ? ' compact' : ''}">
      <div class="field"><select data-inline-edit-category="${item.id}">${FORUM_CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === categoryValue ? 'selected' : ''}>${c.emoji} ${c.label}</option>`).join('')}</select></div>
      <div class="field"><select data-inline-edit-access="${item.id}"><option value="public" ${accessValue === 'public' ? 'selected' : ''}>Público (cualquiera puede leer)</option><option value="registered_only" ${accessValue === 'registered_only' ? 'selected' : ''}>Solo registrados</option></select></div>
      <div class="field"><input data-inline-edit-title="${item.id}" maxlength="120" value="${escapeHtml(normalizeThreadTitle(draft.title || ''))}" /></div>
      <div class="field"><textarea data-inline-edit-body="${item.id}" maxlength="1000">${escapeHtml(draft.body || '')}</textarea></div>
      <div class="thread-inline-image-tools">
        ${activeImageUrl ? `<img class="thread-inline-image-preview" src="${escapeHtml(activeImageUrl)}" alt="Imagen actual del hilo" loading="lazy" decoding="async" />` : ''}
        <div class="field"><input type="file" accept="image/*" data-inline-edit-image="${item.id}" /></div>
        <p class="file-note ${imageStatusKind}">${escapeHtml(imageStatusText)}</p>
        ${activeImageUrl ? `<button class="btn ghost" data-inline-remove-image="${item.id}">Quitar imagen</button>` : ''}
      </div>
      <div class="thread-inline-actions">
        <button class="btn primary" data-thread-save="${item.id}">Guardar cambios</button>
        <button class="btn ghost" data-thread-cancel="${item.id}">Cancelar</button>
      </div>
    </div>
  `;
};

const startThreadEdit = (item) => {
  if (!item) return;
  editingThreadId = item.id;
  editingThreadDraft = {
    title: normalizeThreadTitle(item.title || ''),
    body: item.body || '',
    categoryId: item.categoryId || 'general',
    accessLevel: item.accessLevel === 'registered_only' ? 'registered_only' : 'public',
    image: item.image || '',
    imageFile: null,
    imageRemoved: false,
    imageStatus: '',
    imageStatusKind: '',
  };
  editingThreadFocusField = getActiveThreadId() === item.id ? 'body' : 'title';
  setStatus(el.threadStatus, `Editando: ${item.title || 'hilo sin título'}`, '');
  renderThreads();
  window.requestAnimationFrame(() => focusInlineThreadEditor());
};

const hasUserVote = (item) => splitCsv(item && item.voterUids).includes(auth.uid);

const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number')
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
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
  // Solo enviar Authorization si hay token
  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }
  return headers;
};

const setStatus = (target, text, kind = '') => {
  target.textContent = text || '';
  target.className = `status ${kind}`.trim();
};

const fmt = (iso) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso || '';
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (diff < 60000) return 'ahora mismo';
    if (mins < 60) return `hace ${mins} min`;
    if (hours < 24) return `hace ${hours}h`;
    if (days === 1) return 'ayer';
    if (days < 7) return `hace ${days} días`;
    if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso || '';
  }
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getActiveThreadId = () => {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const fromQuery = String(params.get('hilo') || '').trim();
    if (fromQuery) return fromQuery;

    const pathname = String(window.location.pathname || '');
    const marker = '/comunidad/hilo/';
    if (!pathname.startsWith(marker)) return '';

    const rawId = pathname.slice(marker.length).split('/')[0];
    return decodeURIComponent(String(rawId || '').trim());
  } catch {
    return '';
  }
};

const threadDetailUrl = (threadId) => {
  const safeId = encodeURIComponent(String(threadId || '').trim());
  return `/comunidad/hilo/${safeId}?hilo=${safeId}`;
};

const metaDefaults = {
  title: document.title,
  description: '',
  ogTitle: '',
  ogDescription: '',
  ogUrl: '',
  twitterTitle: '',
  twitterDescription: '',
  canonical: '',
};

const getMetaTag = (selector) => document.querySelector(selector);

const initializeMetaDefaults = () => {
  const desc = getMetaTag('meta[name="description"]');
  const ogTitle = getMetaTag('meta[property="og:title"]');
  const ogDescription = getMetaTag('meta[property="og:description"]');
  const ogUrl = getMetaTag('meta[property="og:url"]');
  const twitterTitle = getMetaTag('meta[name="twitter:title"]');
  const twitterDescription = getMetaTag('meta[name="twitter:description"]');
  const canonical = getMetaTag('link[rel="canonical"]');

  metaDefaults.description = desc ? desc.getAttribute('content') || '' : '';
  metaDefaults.ogTitle = ogTitle ? ogTitle.getAttribute('content') || '' : '';
  metaDefaults.ogDescription = ogDescription ? ogDescription.getAttribute('content') || '' : '';
  metaDefaults.ogUrl = ogUrl ? ogUrl.getAttribute('content') || '' : '';
  metaDefaults.twitterTitle = twitterTitle ? twitterTitle.getAttribute('content') || '' : '';
  metaDefaults.twitterDescription = twitterDescription
    ? twitterDescription.getAttribute('content') || ''
    : '';
  metaDefaults.canonical = canonical ? canonical.getAttribute('href') || '' : '';
};

const setMetaContent = (selector, value) => {
  const node = getMetaTag(selector);
  if (node) node.setAttribute('content', value);
};

const resetCommunityMeta = () => {
  document.title = metaDefaults.title;
  setMetaContent('meta[name="description"]', metaDefaults.description);
  setMetaContent('meta[property="og:title"]', metaDefaults.ogTitle);
  setMetaContent('meta[property="og:description"]', metaDefaults.ogDescription);
  setMetaContent('meta[property="og:url"]', metaDefaults.ogUrl);
  setMetaContent('meta[name="twitter:title"]', metaDefaults.twitterTitle);
  setMetaContent('meta[name="twitter:description"]', metaDefaults.twitterDescription);
  const canonical = getMetaTag('link[rel="canonical"]');
  if (canonical && metaDefaults.canonical) canonical.setAttribute('href', metaDefaults.canonical);
};

const updateCommunityMetaForThread = (thread) => {
  if (!thread) {
    resetCommunityMeta();
    return;
  }

  const safeTitle = String(thread.title || 'Hilo de comunidad').trim() || 'Hilo de comunidad';
  const bodyText = String(thread.body || '')
    .replace(/\s+/g, ' ')
    .trim();
  const summary = bodyText
    ? bodyText.slice(0, 150)
    : 'Participa en el hilo de la comunidad Etiove.';
  const fullTitle = `${safeTitle} | Comunidad Etiove`;
  const detailUrl = `https://etiove.com${threadDetailUrl(thread.id)}`;

  document.title = fullTitle;
  setMetaContent('meta[name="description"]', summary);
  setMetaContent('meta[property="og:title"]', fullTitle);
  setMetaContent('meta[property="og:description"]', summary);
  setMetaContent('meta[property="og:url"]', detailUrl);
  setMetaContent('meta[name="twitter:title"]', fullTitle);
  setMetaContent('meta[name="twitter:description"]', summary);
  const canonical = getMetaTag('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', detailUrl);
};

const goToThreadDetail = (threadId) => {
  const safeId = String(threadId || '').trim();
  if (!safeId) return;
  window.history.replaceState(
    { ...(window.history.state || {}), communityScrollY: window.scrollY },
    '',
    window.location.href
  );
  window.history.pushState(
    {
      communityView: 'thread',
      threadId: safeId,
      communityScrollY: window.scrollY,
      communityAnchorY: pendingThreadAnchorY,
    },
    '',
    threadDetailUrl(safeId)
  );
  transitionThreadsView(
    () => renderThreads(),
    () => {
      // Scroll to top of main-card so thread is fully visible from the start
      const mainCard = document.querySelector('.main-card');
      if (mainCard) {
        const rect = mainCard.getBoundingClientRect();
        const scrollY = window.scrollY + rect.top - 90;
        window.scrollTo({ top: Math.max(0, scrollY), behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      pendingThreadAnchorY = null;
    }
  );
};

const goToThreadList = ({
  replace = false,
  restoreScroll = true,
  scrollToThreadId = null,
} = {}) => {
  const scrollY = Number((window.history.state && window.history.state.communityScrollY) || 0);
  // Always replaceState first to clear the thread URL, so getActiveThreadId() returns ''
  window.history.replaceState(
    { communityView: 'list', communityScrollY: scrollY },
    '',
    '/comunidad.html'
  );
  if (!replace) {
    window.history.pushState(
      { communityView: 'list', communityScrollY: scrollY },
      '',
      '/comunidad.html'
    );
  }
  transitionThreadsView(
    () => renderThreads(),
    () => {
      if (scrollToThreadId) {
        // Scroll to the specific thread in the list
        setTimeout(() => {
          const article = document.querySelector(`[data-thread-id="${scrollToThreadId}"]`);
          if (article) {
            const rect = article.getBoundingClientRect();
            window.scrollTo({ top: window.scrollY + rect.top - 120, behavior: 'smooth' });
          }
        }, 300);
      } else if (restoreScroll) {
        window.scrollTo({ top: scrollY, behavior: 'auto' });
      }
    }
  );
};

const goBackFromThreadDetail = () => {
  goToThreadList({ replace: false });
};

const goToProfilePage = (uid, name) => {
  const safeUid = String(uid || '').trim();
  if (!safeUid) return;
  const safeAlias = String(name || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
  // URL limpia: /perfil/@alias (Cloudflare _redirects hace el rewrite)
  const slug = safeAlias || safeUid;
  window.location.href = `/perfil/@${encodeURIComponent(slug)}`;
};

const resolveUidByAlias = async (uid, name) => {
  const safeUid = String(uid || '').trim();
  if (safeUid) return safeUid;

  const aliasKey = normalizeText(name);
  if (!aliasKey) return '';

  const profiles = await getCollection('user_profiles', 2000).catch(() => []);
  const hit = profiles.find((profile) => {
    const candidates = [profile.displayName, profile.alias, profile.nickname].map((value) =>
      normalizeText(value)
    );
    return candidates.includes(aliasKey) && String(profile.uid || '').trim();
  });
  return String((hit && hit.uid) || '').trim();
};

const inferCategoryId = (thread) => {
  const rawId = normalizeText(thread.categoryId);
  if (FORUM_CATEGORIES.some((c) => c.id === rawId)) return rawId;

  const rawLabel = normalizeText(thread.categoryLabel);
  if (rawLabel.includes('metodo') || rawLabel.includes('preparacion')) return 'metodos';
  if (rawLabel.includes('compra') || rawLabel.includes('tostador')) return 'compras';
  if (rawLabel.includes('novedad') || rawLabel.includes('evento')) return 'novedades';
  if (rawLabel.includes('aprende') || rawLabel.includes('novato') || rawLabel.includes('tecnica'))
    return 'aprende';
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

const normalizeStorageImageUrl = (rawUrl) => {
  const raw = String(rawUrl || '').trim();
  if (!raw) return '';

  if (raw.startsWith('gs://')) {
    const withoutPrefix = raw.slice(5);
    const slashIdx = withoutPrefix.indexOf('/');
    if (slashIdx > 0) {
      const bucket = withoutPrefix.slice(0, slashIdx);
      const objectPath = withoutPrefix.slice(slashIdx + 1);
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
    }
  }

  if (/^[\w-]+\/(?:[\w.-]+\/)*[\w.-]+$/.test(raw) && !raw.startsWith('http')) {
    return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(raw)}?alt=media`;
  }

  try {
    const url = new URL(raw);
    if (url.hostname.includes('firebasestorage.googleapis.com') && !url.searchParams.has('alt')) {
      url.searchParams.set('alt', 'media');
    }
    return url.toString();
  } catch {
    return raw;
  }
};

const isThreadVisible = (thread) => thread.accessLevel !== 'registered_only' || !!auth.token;

const clearAuthToken = () => {
  try {
    localStorage.removeItem('etiove_web_token');
    localStorage.removeItem('etiove_web_uid');
    localStorage.removeItem('etiove_web_email');
    localStorage.removeItem('etiove_web_alias');
    localStorage.removeItem('etiove_web_email_verified');
    localStorage.removeItem('etiove_web_refresh_token');
  } catch (e) {}
  auth = { uid: '', email: '', token: '', emailVerified: false };
  canonicalAlias = '';
  aliasSyncDone = false;
};

const getCollection = async (name, pageSize = 400) => {
  const url = `${BASE_URL}/${name}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}`;
  let headers = auth.token ? authHeaders() : { 'Content-Type': 'application/json' };
  let res = await fetch(url, { headers });
  // Si 401, reintenta sin Authorization y limpia token
  if (res.status === 401 && headers.Authorization) {
    clearAuthToken();
    headers = { 'Content-Type': 'application/json' };
    res = await fetch(url, { headers });
  }
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`No se pudo cargar ${name}`);
  const json = await res.json();
  return (json.documents || []).map(docToObject);
};

const getDocument = async (name, id) => {
  const url = `${BASE_URL}/${name}/${id}?key=${FIREBASE_API_KEY}`;
  let headers = auth.token ? authHeaders() : { 'Content-Type': 'application/json' };
  let res = await fetch(url, { headers });
  if (res.status === 401 && headers.Authorization) {
    clearAuthToken();
    headers = { 'Content-Type': 'application/json' };
    res = await fetch(url, { headers });
  }
  if (res.status === 404 || !res.ok) return null;
  return docToObject(await res.json());
};

const runStructuredQuery = async (structuredQuery) => {
  const url = `${BASE_URL}:runQuery?key=${FIREBASE_API_KEY}`;
  let headers = auth.token ? authHeaders() : { 'Content-Type': 'application/json' };
  let res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ structuredQuery }),
  });
  if (res.status === 401 && headers.Authorization) {
    clearAuthToken();
    headers = { 'Content-Type': 'application/json' };
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ structuredQuery }),
    });
  }
  if (!res.ok) throw new Error(`runQuery_failed_${res.status}`);
  const json = await res.json();
  return (json || []).filter((row) => row.document).map((row) => docToObject(row.document));
};

const getPublicThreads = async (limit = 500) =>
  runStructuredQuery({
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

  if (!IMAGE_ALLOWED_TYPES.has(String(file.type || '').toLowerCase())) {
    throw new Error('UNSUPPORTED_IMAGE_TYPE');
  }

  const compressImageIfNeeded = async (inputFile) => {
    if (!inputFile || inputFile.size <= IMAGE_MAX_BYTES) return inputFile;

    const mime = String(inputFile.type || '').toLowerCase();
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)) {
      throw new Error('IMAGE_TOO_LARGE_UNCOMPRESSIBLE');
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('IMAGE_READ_FAILED'));
      reader.readAsDataURL(inputFile);
    });

    const img = await new Promise((resolve, reject) => {
      const probe = new Image();
      probe.onload = () => resolve(probe);
      probe.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'));
      probe.src = String(dataUrl || '');
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    const maxDim = 1800;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.max(1, Math.floor(width * ratio));
      height = Math.max(1, Math.floor(height * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('IMAGE_CANVAS_FAILED');
    ctx.drawImage(img, 0, 0, width, height);

    const outputType = mime === 'image/png' ? 'image/png' : 'image/jpeg';
    let quality = 0.86;
    let blob = null;
    while (quality >= 0.5) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));
      if (blob && blob.size <= IMAGE_MAX_BYTES) break;
      quality -= 0.08;
    }

    if (!blob || blob.size > IMAGE_MAX_BYTES) {
      throw new Error('IMAGE_TOO_LARGE');
    }

    const safeName = String(inputFile.name || 'upload').replace(/\.[^/.]+$/, '');
    return new File([blob], `${safeName}.${outputType === 'image/png' ? 'png' : 'jpg'}`, {
      type: outputType,
    });
  };

  const fileToUpload = await compressImageIfNeeded(file);
  if (fileToUpload.size > IMAGE_MAX_BYTES) throw new Error('IMAGE_TOO_LARGE');

  const safeFolder = String(folder || 'uploads').replace(/[^a-zA-Z0-9_\-/]/g, '');
  const mime = String(fileToUpload.type || 'image/jpeg').toLowerCase();

  // Convert file to base64 and send to Cloud Function (avoids browser CORS on Storage)
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const comma = dataUrl.indexOf(',');
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () => reject(new Error('IMAGE_READ_FAILED'));
    reader.readAsDataURL(fileToUpload);
  });

  const res = await fetch(UPLOAD_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: auth.token, base64, mimeType: mime, folder: safeFolder }),
  });

  const raw = await res.text();
  let json = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    throw new Error(json.error || `storage_upload_failed_${res.status}`);
  }

  return String(json.downloadUrl || '');
};

const uploadImageWithRetry = async (file, folder, maxAttempts = 3) => {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await uploadImageToStorage(file, folder);
    } catch (err) {
      lastError = err;
      const message = String((err && err.message) || '').toUpperCase();
      const nonRetryable =
        message.includes('UNSUPPORTED_IMAGE_TYPE') ||
        message.includes('IMAGE_TOO_LARGE') ||
        message.includes('IMAGE_TOO_LARGE_UNCOMPRESSIBLE') ||
        message.includes('UNAUTHENTICATED');
      if (nonRetryable || attempt >= maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
    }
  }
  throw lastError || new Error('storage_upload_failed');
};

const renderAuthState = () => {
  // Sesión fantasma: hay uid/token en localStorage pero sin refresh token → limpiar
  if (auth.uid && auth.token && !localStorage.getItem('etiove_web_refresh_token')) {
    clearAuthToken();
  }
  const logged = !!auth.token;
  // Ocultar bloque login completo si está logueado
  const loginSection = document.querySelector('.login-section');
  if (loginSection) loginSection.style.display = logged ? 'none' : '';
  el.logoutBtn.style.display = 'none'; // siempre oculto en auth-row; se mueve a member card
  el.loginBtn.disabled = logged;
  el.registerBtn.disabled = logged;
  // Botón salir en member card
  const cardLogout = document.getElementById('memberCardLogoutBtn');
  if (cardLogout) cardLogout.style.display = logged ? 'block' : 'none';
  el.createThreadBtn.disabled = !logged;
  el.authStatus.innerHTML = '';
  if (logged) {
    const badge = auth.emailVerified
      ? VERIFIED_BADGE
      : ' <span style="font-size:11px;color:#b07a52;margin-left:3px;">(sin verificar)</span>';
    el.authStatus.innerHTML = `<span style="color:var(--success);font-size:12px;">Sesión activa: <strong>${escapeHtml(getAuthorName())}</strong>${badge}</span>`;
    if (!auth.emailVerified) {
      const resendBtn = document.createElement('button');
      resendBtn.className = 'btn ghost';
      resendBtn.style.cssText = 'margin-top:8px;font-size:12px;width:100%;';
      resendBtn.textContent = 'Reenviar email de verificación';
      resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        resendBtn.textContent = 'Enviando...';
        try {
          const res = await fetch(`${AUTH_URL}:sendOobCode?key=${FIREBASE_API_KEY}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Ios-Bundle-Identifier': FIREBASE_IOS_BUNDLE_ID,
            },
            body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: auth.token }),
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok) {
            resendBtn.textContent = '✔ Email enviado — revisa tu bandeja de entrada';
          } else {
            const code = (json.error && json.error.message) || '';
            if (code.includes('TOO_MANY_ATTEMPTS') || code.includes('too_many_attempts')) {
              resendBtn.textContent =
                'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
            } else {
              resendBtn.textContent = 'No se pudo enviar el email. Inténtalo más tarde.';
            }
            resendBtn.disabled = false;
          }
        } catch {
          resendBtn.textContent = 'No se pudo enviar el email. Inténtalo más tarde.';
          resendBtn.disabled = false;
        }
      });
      el.authStatus.appendChild(resendBtn);
    }
  } else {
    el.authStatus.innerHTML =
      '<span style="color:var(--ink-muted);font-size:12px;">Sesión no iniciada</span>';
  }

  // Mostrar/ocultar bloque "Nuevo hilo"
  const newThreadSection = document.getElementById('newThreadSection');
  if (newThreadSection) newThreadSection.style.display = logged ? 'block' : 'none';
  if (!logged) {
    resetThreadComposer({ preserveStatus: true });
    resetInlineThreadEdit({ preserveStatus: true, rerender: false });
  }
  if (!logged && el.memberEvolutionCard) el.memberEvolutionCard.style.display = 'none';
};

const renderCategories = () => {
  el.categorySelect.innerHTML = FORUM_CATEGORIES.map(
    (c) => `<option value="${c.id}">${c.emoji} ${c.label}</option>`
  ).join('');
  el.categorySelect.value = selectedCategory;

  // Buscador junto a Aprende
  el.categoryChips.innerHTML = FORUM_CATEGORIES.map((c) => {
    if (c.id === 'aprende') {
      return `<button class="chip ${selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.emoji} ${c.label}</button>`;
      // search input is injected separately below
    }
    return `<button class="chip ${selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.emoji} ${c.label}</button>`;
  }).join('');

  // Inject search input below chips in its wrapper
  const chipsWrap =
    el.categoryChips.closest('.chips-search-wrap') || el.categoryChips.parentElement;
  let searchInput = document.getElementById('threadSearchInput');
  if (!searchInput) {
    searchInput = document.createElement('input');
    searchInput.id = 'threadSearchInput';
    searchInput.type = 'search';
    searchInput.placeholder = 'Buscar en hilos...';
    searchInput.className = 'thread-search-input';
    chipsWrap.appendChild(searchInput);
  }

  el.categoryChips.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.getAttribute('data-cat');
      currentListPage = 1;
      el.categorySelect.value = selectedCategory;
      renderCategories();
      loadForum();
    });
  });

  // Restore persisted search term on re-render
  const searchInputEl = document.getElementById('threadSearchInput');
  if (searchInputEl) searchInputEl.value = activeSearchTerm;

  // Clear-search button — shown when there's an active term
  const chipsWrapEl =
    searchInputEl && (searchInputEl.closest('.chips-search-wrap') || searchInputEl.parentElement);
  let clearBtn = document.getElementById('threadSearchClear');
  if (!clearBtn && chipsWrapEl) {
    clearBtn = document.createElement('button');
    clearBtn.id = 'threadSearchClear';
    clearBtn.type = 'button';
    clearBtn.setAttribute('aria-label', 'Limpiar búsqueda');
    clearBtn.style.cssText = [
      'display:none',
      'background:var(--accent)',
      'color:#fff9f1',
      'border:none',
      'border-radius:20px',
      'padding:5px 12px',
      'font-size:11px',
      'font-weight:700',
      'letter-spacing:1px',
      'cursor:pointer',
      'font-family:-apple-system,sans-serif',
      'margin-top:6px',
      'transition:background 0.2s',
    ].join(';');
    clearBtn.textContent = '× Limpiar búsqueda';
    chipsWrapEl.appendChild(clearBtn);
  }
  if (clearBtn) {
    clearBtn.style.display = activeSearchTerm ? 'inline-block' : 'none';
    if (!clearBtn.dataset.bound) {
      clearBtn.addEventListener('click', () => {
        activeSearchTerm = '';
        currentListPage = 1;
        const si = document.getElementById('threadSearchInput');
        if (si) si.value = '';
        clearBtn.style.display = 'none';
        renderThreads();
      });
      clearBtn.dataset.bound = '1';
    }
  }

  // ─── SELECTOR DE ORDENACIÓN ──────────────────────────────────────────────
  const chipsWrapRef =
    searchInputEl && (searchInputEl.closest('.chips-search-wrap') || searchInputEl.parentElement);
  let sortSelect = document.getElementById('threadSortSelect');
  if (!sortSelect && chipsWrapRef) {
    sortSelect = document.createElement('select');
    sortSelect.id = 'threadSortSelect';
    sortSelect.style.cssText = [
      'font-size:11px',
      'font-weight:500',
      'letter-spacing:1px',
      'color:var(--ink-muted)',
      'background:transparent',
      'border:1px solid var(--border-soft)',
      'border-radius:6px',
      'padding:5px 10px',
      'cursor:pointer',
      'font-family:inherit',
      'margin-top:6px',
      'appearance:none',
    ].join(';');
    sortSelect.innerHTML = [
      '<option value="recent">Más recientes</option>',
      '<option value="votes">Más votados</option>',
      '<option value="replies">Más respuestas</option>',
    ].join('');
    chipsWrapRef.appendChild(sortSelect);
  }
  if (sortSelect) {
    sortSelect.value = activeSortOrder;
    if (!sortSelect.dataset.bound) {
      sortSelect.addEventListener('change', () => {
        activeSortOrder = sortSelect.value;
        currentListPage = 1;
        renderThreads();
      });
      sortSelect.dataset.bound = '1';
    }
  }

  // Buscador funcional con debounce (200ms) — persiste término y busca en todas las categorías
  if (searchInputEl && !searchInputEl.dataset.bound) {
    let searchDebounceTimer = null;
    searchInputEl.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        activeSearchTerm = searchInputEl.value.trim();
        currentListPage = 1;
        const cb = document.getElementById('threadSearchClear');
        if (cb) cb.style.display = activeSearchTerm ? 'inline-block' : 'none';
        renderThreads();
      }, 200);
    });
    searchInputEl.dataset.bound = '1';
  }
};

const renderThreads = () => {
  const activeThreadId = getActiveThreadId();
  const searchTerm = activeSearchTerm;
  // Si hay búsqueda activa, buscar en TODAS las categorías; si no, solo en la seleccionada
  let list = searchTerm
    ? threads.slice()
    : threads.filter((t) => t.categoryId === selectedCategory);
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    list = list.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(term)) ||
        (t.body && t.body.toLowerCase().includes(term))
    );
  }
  list = list.sort((a, b) => {
    if (activeSortOrder === 'votes') return Number(b.upvotes || 0) - Number(a.upvotes || 0);
    if (activeSortOrder === 'replies') {
      const ra = replies.filter((r) => r.threadId === a.id).length;
      const rb = replies.filter((r) => r.threadId === b.id).length;
      return rb - ra;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  const displayList = list;

  if (activeThreadId) {
    // Oculta encabezado y filtros al crear/editar hilo
    const sectionLead = document.getElementById('mainCardHeader');
    const searchStatus = document.getElementById('searchStatus');
    if (sectionLead) sectionLead.style.display = 'none';
    if (searchStatus) searchStatus.style.display = 'none';
    const activeThread = threads.find((thread) => thread.id === activeThreadId);

    if (!activeThread) {
      resetCommunityMeta();
      el.threadsWrap.innerHTML =
        '<p class="empty">Este hilo no está disponible.</p><div style="margin-top:10px"><button class="btn ghost" data-back-detail="1">Volver atrás</button></div>';
      const backBtn = el.threadsWrap.querySelector('[data-back-detail]');
      if (backBtn) backBtn.addEventListener('click', goBackFromThreadDetail);
      return;
    }

    if (activeThread.accessLevel === 'registered_only' && !auth.token) {
      resetCommunityMeta();
      showPrivateThreadGate(activeThread);
      return;
    }

    updateCommunityMetaForThread(activeThread);

    const threadReplies = replies
      .filter((r) => r.threadId === activeThread.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const threadCanManage = canManageItem(activeThread);
    const threadVoted = hasUserVote(activeThread);
    const accessTagColor = activeThread.accessLevel === 'registered_only' ? '#8f5e3b' : '#4f7a53';
    const accessTagBg = activeThread.accessLevel === 'registered_only' ? '#f3e9de' : '#edf7ee';

    const repliesHtml = threadReplies
      .map((r) => {
        const isEditingThis = editingReplyId === r.id;
        if (isEditingThis) {
          return `<div class="reply reply-is-editing">
          <div class="meta"><span style="font-weight:600;">${escapeHtml(r.authorName || 'Catador')}</span> · ${fmt(r.createdAt)}</div>
          <textarea data-reply-edit-body="${r.id}" maxlength="1000" style="width:100%;min-height:90px;resize:vertical;border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:14px;font-family:inherit;background:rgba(255,255,255,.9);color:var(--ink);margin:8px 0;">${escapeHtml(editingReplyDraft)}</textarea>
          <div class="actions-row" style="margin-top:6px;gap:10px;">
            <button class="btn primary" data-reply-save="${r.id}" style="font-size:12px;padding:8px 18px;">Guardar</button>
            <button class="btn ghost" data-reply-cancel-edit="${r.id}" style="font-size:12px;padding:8px 18px;">Cancelar</button>
          </div>
        </div>`;
        }
        return `<div class="reply">
        <div class="meta"><button class="link-btn author-btn" data-author-uid="${escapeHtml(r.authorUid || '')}" data-author-name="${escapeHtml(r.authorName || 'Catador')}" style="font-weight:600;">${escapeHtml(r.authorName || 'Catador')}</button> · ${fmt(r.createdAt)}</div>
        <p>${escapeHtml(r.body || '')}</p>
        <div style="font-size:11px;color:#b00;background:#fff3f3;padding:2px 6px;border-radius:4px;margin-bottom:2px;">
          <strong>DEBUG:</strong> authorUid=<span style="color:#333">${escapeHtml(String(r.authorUid))}</span> | auth.uid=<span style="color:#333">${escapeHtml(String(auth.uid))}</span>
        </div>
        <div class="thread-foot">
          <div class="actions-row">
            <button class="link-btn" data-reply-vote="${r.id}">${hasUserVote(r) ? 'Ya te interesa' : 'Me interesa'}</button>
            <span class="muted">${Number(r.upvotes || 0)} votos</span>
          </div>
          <div class="actions-row">
            ${
              canManageItem(r)
                ? `<button class="link-btn" data-reply-edit="${r.id}">Editar</button><button class="link-btn" data-reply-delete="${r.id}">Eliminar</button>`
                : auth.token && r.authorUid !== auth.uid
                  ? `<button class="link-btn" data-report-reply="${r.id}" style="color:var(--ink-muted);font-size:11px;opacity:0.6;">Reportar</button>`
                  : ''
            }
          </div>
        </div>
      </div>`;
      })
      .join('');

    const detailBodyHtml =
      editingThreadId === activeThread.id
        ? renderInlineThreadEditor(activeThread)
        : `<h3 class="thread-detail-title">${escapeHtml(normalizeThreadTitle(activeThread.title || ''))}</h3>
        <div class="meta"><button class="link-btn author-btn" data-author-uid="${escapeHtml(activeThread.authorUid || '')}" data-author-name="${escapeHtml(activeThread.authorName || 'Catador')}" style="font-weight:600;">${escapeHtml(activeThread.authorName || 'Catador')}</button> · ${fmt(activeThread.createdAt)} <span class="meta-cat">${escapeHtml(activeThread.categoryLabel || 'General')}</span> <span class="meta-access" style="margin-left:4px;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;background:${accessTagBg};color:${accessTagColor};border:1px solid ${activeThread.accessLevel === 'registered_only' ? '#e2c7a7' : '#b7e2c7'};">${escapeHtml(ACCESS_LABELS[activeThread.accessLevel] || 'Público')}</span> · ${Number(activeThread.upvotes || 0)} votos</div>
        <p>${escapeHtml(activeThread.body || '')}</p>`;

    el.threadsWrap.innerHTML = `
      <article class="thread${editingThreadId === activeThread.id ? ' thread-is-editing' : ''}" data-thread-id="${activeThread.id}">
        ${detailBodyHtml}
        ${editingThreadId !== activeThread.id && normalizeStorageImageUrl(activeThread.image) ? `<img class=\"thread-image\" src=\"${escapeHtml(normalizeStorageImageUrl(activeThread.image))}\" alt=\"Imagen del hilo\" loading=\"lazy\" decoding=\"async\" />` : ''}
        <div class="thread-foot">
          <div class="actions-row">
            <button class="link-btn" data-vote="${activeThread.id}">${threadVoted ? 'Ya te interesa' : 'Me interesa'}</button>
            <span class="muted">${threadReplies.length} respuestas</span>
            <button class="link-btn" data-copy-thread-link="${activeThread.id}" title="Copiar enlace al hilo">🔗 Copiar enlace</button>
          </div>
          ${
            threadCanManage
              ? `<div class=\"actions-row\"><button class=\"link-btn\" data-thread-edit=\"${activeThread.id}\">Editar</button><button class=\"link-btn\" data-thread-delete=\"${activeThread.id}\">Eliminar</button></div>`
              : auth.token && activeThread.authorUid !== auth.uid
                ? `<div class=\"actions-row\"><button class=\"link-btn\" data-report-thread=\"${activeThread.id}\" style=\"color:var(--ink-muted);font-size:11px;opacity:0.6;\">Reportar</button></div>`
                : ''
          }
        </div>
        <div class="reply-box">
          ${repliesHtml || '<p class="muted">Sin respuestas aún.</p>'}
          ${
            auth.token
              ? `
            <div class="reply-composer">
              <textarea data-reply-input="${activeThread.id}" maxlength="1000" placeholder="Escribe tu respuesta..." class="reply-textarea"></textarea>
              <div class="reply-actions">
                <button class="btn ghost" data-back-detail="1">← Volver</button>
                <button class="btn primary" data-reply-send="${activeThread.id}">Enviar respuesta</button>
              </div>
            </div>
          `
              : `
            <div class="reply-actions" style="margin-top:16px;">
              <button class="btn ghost" data-back-detail="1">← Volver</button>
            </div>
          `
          }
        </div>
      </article>
    `;
  } else {
    if (displayList.length === 0) {
      const category = FORUM_CATEGORIES.find((c) => c.id === selectedCategory);
      const categoryLabel = (category && category.label) || 'esta categoría';
      const cta = searchTerm
        ? `No se encontraron hilos para «${searchTerm}» en ninguna categoría.`
        : auth.token
          ? `Todavía no hay hilos en ${categoryLabel}. Sé la primera voz y escribe el primer post de esta categoría.`
          : `Todavía no hay hilos en ${categoryLabel}. Inicia sesión y abre el primer post de esta categoría.`;
      el.threadsWrap.innerHTML = `<p class="empty">${escapeHtml(cta)}</p>`;
      return;
    }

    // Mostrar encabezado y filtros si no hay hilo activo
    const sectionLead = document.getElementById('mainCardHeader');
    const searchStatus = document.getElementById('searchStatus');
    if (sectionLead) sectionLead.style.display = '';
    if (searchStatus) searchStatus.style.display = '';
    resetCommunityMeta();

    const totalPages = Math.max(1, Math.ceil(displayList.length / THREADS_PAGE_SIZE));
    if (currentListPage > totalPages) currentListPage = totalPages;
    const start = (currentListPage - 1) * THREADS_PAGE_SIZE;
    const end = Math.min(start + THREADS_PAGE_SIZE, displayList.length);
    const pagedList = displayList.slice(start, end);

    // Sliding window of page numbers (max 11 visible)
    const maxBtns = 11;
    let pageFrom = Math.max(1, currentListPage - Math.floor(maxBtns / 2));
    let pageTo = Math.min(totalPages, pageFrom + maxBtns - 1);
    if (pageTo - pageFrom < maxBtns - 1) pageFrom = Math.max(1, pageTo - maxBtns + 1);
    const pageNums = [];
    for (let p = pageFrom; p <= pageTo; p++) pageNums.push(p);

    const prevDisabled = currentListPage === 1 ? 'disabled' : '';
    const nextDisabled = currentListPage === totalPages ? 'disabled' : '';
    const pagerHtml =
      totalPages <= 1
        ? ''
        : `
      <div class="threads-pager">
        <div class="pager-nav">
          <button class="pager-btn pager-arrow" data-page="1" ${prevDisabled} aria-label="Primera página">«</button>
          <button class="pager-btn pager-arrow" data-page="${currentListPage - 1}" ${prevDisabled} aria-label="Página anterior">‹</button>
          ${pageNums.map((p) => `<button class="pager-btn${p === currentListPage ? ' active' : ''}" data-page="${p}">${p}</button>`).join('')}
          <button class="pager-btn pager-arrow" data-page="${currentListPage + 1}" ${nextDisabled} aria-label="Página siguiente">›</button>
          <button class="pager-btn pager-arrow" data-page="${totalPages}" ${nextDisabled} aria-label="Última página">»</button>
        </div>
        <p class="pager-info">${searchTerm ? `${displayList.length} resultado${displayList.length !== 1 ? 's' : ''} en todas las categorías` : `Mostrando temas del ${start + 1} al ${end} de ${displayList.length}`}</p>
      </div>
    `;

    el.threadsWrap.innerHTML = `${pagedList
      .map((t, idx) => {
        const delay = Math.min(idx * 0.03, 0.21);
        const threadReplies = replies
          .filter((r) => r.threadId === t.id)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const threadCanManage = canManageItem(t);
        const threadVoted = hasUserVote(t);

        const accessTagColor = t.accessLevel === 'registered_only' ? '#8f5e3b' : '#4f7a53';
        const accessTagBg = t.accessLevel === 'registered_only' ? '#f3e9de' : '#edf7ee';

        const rawBody = String(t.body || '')
          .replace(/\s+/g, ' ')
          .trim();
        const isLongBody = rawBody.length > 110;

        if (editingThreadId === t.id) {
          return `
        <article class="thread thread-is-editing" data-thread-id="${t.id}" style="animation-delay:${delay}s">
          <div class="thread-compact-head">
            <span class="thread-edit-chip">Editando</span>
            ${!!normalizeStorageImageUrl(t.image) ? '<span class="thread-img-badge" title="Incluye imagen">📷</span>' : ''}
          </div>
          ${renderInlineThreadEditor(t, { compact: true })}
        </article>
      `;
        }

        return `
      <article class="thread${editingThreadId === t.id ? ' thread-is-editing' : ''}" data-thread-id="${t.id}" style="animation-delay:${delay}s">
        <div class="thread-compact-head">
          ${editingThreadId === t.id ? '<span class="thread-edit-chip">Editando</span>' : ''}
          ${!!normalizeStorageImageUrl(t.image) ? '<span class="thread-img-badge" title="Incluye imagen">📷</span>' : ''}
        </div>
        <h3><a class="thread-title-link" data-thread-open="${t.id}" href="${threadDetailUrl(t.id)}" aria-label="Abrir hilo ${escapeHtml(normalizeThreadTitle(t.title || ''))}">${escapeHtml(normalizeThreadTitle(t.title || ''))}</a></h3>
        <div class="thread-preview-row">
          <p class="thread-body-preview">${escapeHtml(rawBody)}</p>
          ${isLongBody ? `<a class="thread-read-more" data-thread-open="${t.id}" href="${threadDetailUrl(t.id)}" aria-label="Seguir leyendo ${escapeHtml(t.title || '')}">Seguir leyendo</a>` : ''}
        </div>
        <div class="thread-compact-foot">
          <span class="thread-compact-meta"><button class="link-btn author-btn" data-author-uid="${escapeHtml(t.authorUid || '')}" data-author-name="${escapeHtml(t.authorName || 'Catador')}">${escapeHtml(t.authorName || 'Catador')}</button> · ${fmt(t.createdAt)} <span class="meta-cat">${escapeHtml(t.categoryLabel || 'General')}</span> <span class="meta-access" style="margin-left:6px;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;background:${t.accessLevel === 'registered_only' ? '#f3e9de' : '#edf7ee'};color:${t.accessLevel === 'registered_only' ? '#8f5e3b' : '#4f7a53'};border:1px solid ${t.accessLevel === 'registered_only' ? '#e2c7a7' : '#b7e2c7'};">${t.accessLevel === 'registered_only' ? 'Privado' : 'Público'}</span></span>
          <span class="thread-compact-stats">
            <button class="link-btn" data-vote="${t.id}">${threadVoted ? '✓ Interesa' : 'Me interesa'}</button>
            <span class="muted">${Number(t.upvotes || 0)} votos · ${threadReplies.length} respuestas</span>
            ${threadCanManage ? `<button class="link-btn" data-thread-edit="${t.id}">Editar</button><button class="link-btn" data-thread-delete="${t.id}">Eliminar</button>` : ''}
          </span>
        </div>
      </article>
    `;
      })
      .join('')}${pagerHtml}`;
  }

  el.threadsWrap.querySelectorAll('[data-vote]').forEach((btn) => {
    btn.addEventListener('click', () => voteThread(btn.getAttribute('data-vote')));
  });

  el.threadsWrap.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newPage = parseInt(btn.getAttribute('data-page'), 10);
      if (!btn.disabled && newPage >= 1) {
        currentListPage = newPage;
        renderThreads();
        el.threadsWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const backBtn = el.threadsWrap.querySelector('[data-back-list]');
  if (backBtn) backBtn.addEventListener('click', goToThreadList);

  const backDetailBtn = el.threadsWrap.querySelector('[data-back-detail]');
  if (backDetailBtn) backDetailBtn.addEventListener('click', goBackFromThreadDetail);

  el.threadsWrap.querySelectorAll('[data-reply-vote]').forEach((btn) => {
    btn.addEventListener('click', () => voteReply(btn.getAttribute('data-reply-vote')));
  });

  el.threadsWrap.querySelectorAll('[data-reply-send]').forEach((btn) => {
    btn.addEventListener('click', () => sendReply(btn.getAttribute('data-reply-send')));
  });

  // Auto-resize reply + inline-edit textareas
  el.threadsWrap.querySelectorAll('.reply-textarea, [data-reply-edit-body]').forEach((ta) => {
    if (typeof wireAutoResize === 'function') wireAutoResize(ta);
    initMentionAutocomplete(ta);
  });

  // Ctrl+Enter / Cmd+Enter to submit reply
  el.threadsWrap.querySelectorAll('.reply-textarea').forEach((ta) => {
    if (ta.dataset.ctrlEnter) return;
    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const threadId = ta.getAttribute('data-reply-input');
        if (threadId) sendReply(threadId);
      }
    });
    ta.dataset.ctrlEnter = '1';
  });

  if (!el.threadsWrap.dataset.boundDelegatedClicks) {
    el.threadsWrap.addEventListener('click', (event) => {
      const saveBtn = event.target.closest('[data-thread-save]');
      if (saveBtn) {
        event.preventDefault();
        saveInlineThreadEdit(saveBtn.getAttribute('data-thread-save'));
        return;
      }

      const cancelBtn = event.target.closest('[data-thread-cancel]');
      if (cancelBtn) {
        event.preventDefault();
        resetInlineThreadEdit({ preserveStatus: true });
        setStatus(el.threadStatus, 'Edición cancelada.', '');
        return;
      }

      const removeImageBtn = event.target.closest('[data-inline-remove-image]');
      if (removeImageBtn && editingThreadDraft) {
        event.preventDefault();
        editingThreadDraft.imageRemoved = true;
        editingThreadDraft.imageFile = null;
        editingThreadDraft.imageStatus = 'Se quitará la imagen al guardar.';
        editingThreadDraft.imageStatusKind = 'error';
        renderThreads();
        window.requestAnimationFrame(() => focusInlineThreadEditor());
        return;
      }

      const editBtn = event.target.closest('[data-thread-edit]');
      if (editBtn) {
        event.preventDefault();
        editThread(editBtn.getAttribute('data-thread-edit'));
        return;
      }

      const deleteBtn = event.target.closest('[data-thread-delete]');
      if (deleteBtn) {
        event.preventDefault();
        deleteThread(deleteBtn.getAttribute('data-thread-delete'));
        return;
      }

      const openLink = event.target.closest('[data-thread-open]');
      if (openLink) {
        event.preventDefault();
        const threadId = openLink.getAttribute('data-thread-open');
        const thread = threads.find((t) => t.id === threadId);
        // Hilo privado sin login → gate premium
        if (thread && thread.accessLevel === 'registered_only' && !auth.token) {
          showPrivateThreadGate(thread);
          return;
        }
        const article = openLink.closest('[data-thread-id]');
        pendingThreadAnchorY = article
          ? Math.max(0, window.scrollY + article.getBoundingClientRect().top - 20)
          : window.scrollY;
        goToThreadDetail(threadId);
      }
    });
    el.threadsWrap.dataset.boundDelegatedClicks = '1';
  }

  if (!el.threadsWrap.dataset.boundDelegatedInputs) {
    el.threadsWrap.addEventListener('input', (event) => {
      const titleInput = event.target.closest('[data-inline-edit-title]');
      if (titleInput && editingThreadDraft) {
        editingThreadDraft.title = titleInput.value;
        editingThreadFocusField = 'title';
        return;
      }

      const bodyInput = event.target.closest('[data-inline-edit-body]');
      if (bodyInput && editingThreadDraft) {
        editingThreadDraft.body = bodyInput.value;
        editingThreadFocusField = 'body';
      }
    });

    el.threadsWrap.addEventListener('change', (event) => {
      const categoryInput = event.target.closest('[data-inline-edit-category]');
      if (categoryInput && editingThreadDraft) {
        editingThreadDraft.categoryId = categoryInput.value;
        return;
      }

      const accessInput = event.target.closest('[data-inline-edit-access]');
      if (accessInput && editingThreadDraft) {
        editingThreadDraft.accessLevel = accessInput.value;
        return;
      }

      const imageInput = event.target.closest('[data-inline-edit-image]');
      if (imageInput && editingThreadDraft) {
        const selected = imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;
        if (!selected) {
          editingThreadDraft.imageFile = null;
          editingThreadDraft.imageStatus = '';
          editingThreadDraft.imageStatusKind = '';
          return;
        }

        const fileType = String(selected.type || '').toLowerCase();
        if (!IMAGE_ALLOWED_TYPES.has(fileType)) {
          editingThreadDraft.imageFile = null;
          editingThreadDraft.imageStatus = 'Formato no compatible. Usa JPG, PNG, WEBP, GIF o HEIC.';
          editingThreadDraft.imageStatusKind = 'error';
          imageInput.value = '';
          renderThreads();
          window.requestAnimationFrame(() => focusInlineThreadEditor());
          return;
        }

        const sizeMb = (selected.size / (1024 * 1024)).toFixed(2);
        editingThreadDraft.imageFile = selected;
        editingThreadDraft.imageRemoved = false;
        editingThreadDraft.imageStatus =
          selected.size > IMAGE_MAX_BYTES
            ? `Imagen seleccionada (${sizeMb} MB). Se intentará comprimir al guardar.`
            : `Imagen lista para reemplazar (${sizeMb} MB).`;
        editingThreadDraft.imageStatusKind = selected.size > IMAGE_MAX_BYTES ? '' : 'ok';
        renderThreads();
        window.requestAnimationFrame(() => focusInlineThreadEditor());
      }
    });

    el.threadsWrap.dataset.boundDelegatedInputs = '1';
  }

  // Copy thread link
  el.threadsWrap.querySelectorAll('[data-copy-thread-link]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const threadId = btn.getAttribute('data-copy-thread-link');
      const url = `https://etiove.com${threadDetailUrl(threadId)}`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const ta = document.createElement('textarea');
          ta.value = url;
          ta.style.cssText = 'position:fixed;opacity:0;';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        const orig = btn.textContent;
        btn.textContent = '✓ Enlace copiado';
        setTimeout(() => {
          btn.textContent = orig;
        }, 2000);
      } catch {
        btn.textContent = 'No se pudo copiar';
      }
    });
  });

  // Report buttons
  el.threadsWrap.querySelectorAll('[data-report-thread]').forEach((btn) => {
    btn.addEventListener('click', () =>
      reportItem('foro_hilos', btn.getAttribute('data-report-thread'), 'hilo')
    );
  });
  el.threadsWrap.querySelectorAll('[data-report-reply]').forEach((btn) => {
    btn.addEventListener('click', () =>
      reportItem('foro_respuestas', btn.getAttribute('data-report-reply'), 'respuesta')
    );
  });

  el.threadsWrap.querySelectorAll('[data-reply-save]').forEach((btn) => {
    btn.addEventListener('click', () => saveReplyEdit(btn.getAttribute('data-reply-save')));
  });

  el.threadsWrap.querySelectorAll('[data-reply-cancel-edit]').forEach((btn) => {
    btn.addEventListener('click', () => cancelReplyEdit());
  });

  el.threadsWrap.querySelectorAll('[data-reply-edit-body]').forEach((ta) => {
    ta.addEventListener('input', () => {
      editingReplyDraft = ta.value;
    });
  });

  el.threadsWrap.querySelectorAll('[data-reply-edit]').forEach((btn) => {
    btn.addEventListener('click', () => editReply(btn.getAttribute('data-reply-edit')));
  });

  el.threadsWrap.querySelectorAll('[data-reply-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteReply(btn.getAttribute('data-reply-delete')));
  });

  // Clic en nombre de autor → modal perfil (solo logueados)
  el.threadsWrap.querySelectorAll('.author-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      // Bloquear acceso al perfil si no está logueado
      if (!auth.token) {
        showProfileGate();
        return;
      }
      const authorName = btn.getAttribute('data-author-name') || 'Catador';
      const resolvedUid = await resolveUidByAlias(btn.getAttribute('data-author-uid'), authorName);
      if (!resolvedUid) {
        setStatus(el.threadStatus, 'No se pudo abrir el perfil de este alias.', 'error');
        return;
      }
      goToProfilePage(resolvedUid, authorName);
    });
    btn.style.cursor = 'pointer';
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

  if (editingThreadId) {
    window.requestAnimationFrame(() => focusInlineThreadEditor());
  }

  // Estampar badge verificado en los botones del usuario actual
  if (auth.uid && auth.emailVerified) {
    el.threadsWrap.querySelectorAll(`.author-btn[data-author-uid="${auth.uid}"]`).forEach((btn) => {
      if (!btn.querySelector('.verified-badge')) {
        const badge = document.createElement('span');
        badge.className = 'verified-badge';
        badge.innerHTML = VERIFIED_BADGE;
        btn.appendChild(badge);
      }
    });
  }
};

const renderThreadSkeletons = (count = 3) => {
  el.threadsWrap.innerHTML = Array.from({ length: count })
    .map(
      () => `
    <article class="thread-skeleton" aria-hidden="true">
      <div class="skeleton-line w70"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line w40"></div>
    </article>
  `
    )
    .join('');
};

const loadForum = async () => {
  setStatus(el.threadStatus, 'Cargando comunidad...', '');
  renderThreadSkeletons(4);
  const isLogged = !!auth.token;
  // Ahora las reglas permiten lectura pública: siempre cargamos todo y filtramos en cliente.
  const [hRes, rRes, pRes] = await Promise.allSettled([
    getCollection('foro_hilos', 500),
    getCollection('foro_respuestas', 1200),
    getCollection('user_profiles', 2000),
  ]);

  if (hRes.status !== 'fulfilled') {
    threads = [];
    replies = [];
    renderMemberEvolutionCard();
    setStatus(el.threadStatus, 'No se pudo cargar la comunidad.', 'error');
    el.threadsWrap.innerHTML =
      '<p class="empty">No se pudieron cargar los hilos en este momento.</p>';
    return;
  }

  const h = hRes.value || [];
  const activeThreadId = getActiveThreadId();

  const profiles = pRes.status === 'fulfilled' ? pRes.value || [] : [];
  const allReplies = rRes.status === 'fulfilled' ? rRes.value || [] : [];
  const aliasByUid = new Map();
  profiles.forEach((profile) => {
    const safeUid = String(profile.uid || '').trim();
    const safeAlias = String(profile.displayName || profile.alias || profile.nickname || '').trim();
    if (safeUid && safeAlias) aliasByUid.set(safeUid, safeAlias);
  });

  if (auth.uid) {
    const meAlias = aliasByUid.get(auth.uid) || getAuthorName();
    if (meAlias) setCanonicalAlias(meAlias);
  }

  const applyCanonicalAlias = (item) => {
    const safeUid = String(item.authorUid || '').trim();
    if (!safeUid) return item;
    const alias = aliasByUid.get(safeUid) || (safeUid === auth.uid ? getAuthorName() : '');
    if (!alias) return item;
    return { ...item, authorName: alias };
  };

  // Guardamos TODOS los hilos — el acceso al detalle se controla en renderThreads
  threads = h.map((item) => normalizeThread(applyCanonicalAlias(item)));
  const allThreadIds = new Set(threads.map((t) => t.id));

  replies =
    rRes.status === 'fulfilled'
      ? (rRes.value || [])
          .filter((reply) => allThreadIds.has(reply.threadId))
          .map((item) => applyCanonicalAlias(item))
      : [];

  // Normalizar y filtrar los hilos visibles para el usuario
  const normalizedVisibleThreads = threads.filter(isThreadVisible);

  const myProfile =
    profiles.find((profile) => String(profile.uid || '').trim() === auth.uid) || null;
  renderMemberEvolutionCard({
    profile: myProfile,
    allThreads: h.map((item) => applyCanonicalAlias(item)),
    allReplies: allReplies.map((item) => applyCanonicalAlias(item)),
  });

  if (
    !aliasSyncDone &&
    auth.uid &&
    auth.token &&
    getAuthorName() &&
    getAuthorName() !== 'Catador'
  ) {
    aliasSyncDone = true;
    const targetAlias = getAuthorName();
    const updateMyName = async (collectionName, items) => {
      const mine = items.filter(
        (row) => row.authorUid === auth.uid && String(row.authorName || '').trim() !== targetAlias
      );
      await Promise.allSettled(
        mine.map((row) =>
          updateDocument(collectionName, row.id, {
            authorName: targetAlias,
            updatedAt: new Date().toISOString(),
          })
        )
      );
    };
    await Promise.allSettled([
      updateMyName('foro_hilos', normalizedVisibleThreads),
      updateMyName('foro_respuestas', replies),
    ]);
  }

  renderThreads();
  // Restore any saved draft once the composer is visible
  if (auth.uid) restoreDraft();

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
  if (
    code.includes('INVALID_LOGIN_CREDENTIALS') ||
    code.includes('EMAIL_NOT_FOUND') ||
    code.includes('INVALID_PASSWORD')
  )
    return 'Email o contraseña incorrectos.';
  if (code.includes('MISSING_PASSWORD')) return 'Falta la contraseña.';
  if (code.includes('WEAK_PASSWORD')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (code.includes('EMAIL_EXISTS')) return 'Ese email ya está registrado.';
  if (code.includes('OPERATION_NOT_ALLOWED'))
    return 'El acceso por email/contraseña no está habilitado en Firebase Auth.';
  if (code.includes('USER_DISABLED')) return 'Esta cuenta está deshabilitada.';
  if (code.includes('TOO_MANY_ATTEMPTS_TRY_LATER') || code.includes('HTTP_429'))
    return 'Demasiados intentos. Prueba otra vez en unos minutos.';
  if (code.includes('NETWORK') || code.includes('FETCH') || code.includes('FAILED_TO_FETCH'))
    return 'No hay conexión con Firebase. Revisa tu red o desactiva bloqueadores de privacidad para este sitio.';
  if (
    code.includes('REQUEST_BLOCKED') ||
    code.includes('CLIENT') ||
    code.includes('API_KEY') ||
    code.includes('INVALID_KEY_TYPE') ||
    code.includes('HTTP_403')
  ) {
    return 'Firebase está rechazando la petición de login (API key/restricciones).';
  }
  if (code.includes('CONFIGURATION_NOT_FOUND') || code.includes('PROJECT_NOT_FOUND'))
    return 'No se encontró la configuración de autenticación en Firebase para este proyecto.';
  return `No se pudo completar la autenticación (${code}).`;
};

const mapThreadPublishError = (errorLike) => {
  const raw = String((errorLike && errorLike.message) || errorLike || '').toUpperCase();
  if (raw.includes('UNSUPPORTED_IMAGE_TYPE'))
    return 'Formato de imagen no compatible. Usa JPG, PNG, WEBP o HEIC.';
  if (raw.includes('IMAGE_TOO_LARGE_UNCOMPRESSIBLE'))
    return 'La imagen supera 5MB y no se pudo comprimir automáticamente. Usa una imagen más ligera.';
  if (raw.includes('IMAGE_TOO_LARGE')) return 'La imagen supera el límite de 5MB.';
  if (raw.includes('UNAUTHENTICATED')) return 'La sesión caducó. Vuelve a iniciar sesión.';
  if (raw.includes('STORAGE_UPLOAD_FAILED_401') || raw.includes('STORAGE_UPLOAD_FAILED_403'))
    return 'Firebase rechazó la subida (permisos/CORS). Cierra sesión y vuelve a entrar.';
  if (raw.includes('STORAGE_UPLOAD_FAILED_429'))
    return 'Demasiados intentos de subida. Prueba otra vez en unos minutos.';
  if (raw.includes('STORAGE_UPLOAD_FAILED_500') || raw.includes('STORAGE_UPLOAD_FAILED_503'))
    return 'Firebase Storage no está disponible temporalmente. Inténtalo de nuevo.';
  if (raw.includes('PERMISSION_DENIED') || raw.includes('UNAUTHORIZED'))
    return 'No hay permisos para subir imágenes con esta sesión.';
  if (raw.includes('STORAGE_UPLOAD_FAILED_413'))
    return 'La imagen es demasiado grande para subirla.';
  if (raw.includes('NETWORK') || raw.includes('FETCH'))
    return 'Error de red al subir la imagen. Inténtalo de nuevo.';
  if (raw.includes('STORAGE_UPLOAD_FAILED_'))
    return `Falló la subida de imagen (${raw.replace('STORAGE_UPLOAD_FAILED_', 'HTTP ')}).`;
  return 'No se pudo publicar el hilo. Revisa la imagen e inténtalo otra vez.';
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

    auth = { uid: json.localId, email: json.email, token: json.idToken, emailVerified: false };
    localStorage.setItem('etiove_web_uid', auth.uid);
    localStorage.setItem('etiove_web_email', auth.email);
    localStorage.setItem('etiove_web_token', auth.token);
    if (json.refreshToken) localStorage.setItem('etiove_web_refresh_token', json.refreshToken);

    // Recordar credenciales si el checkbox está marcado
    const rememberChk = document.getElementById('rememberMe');
    if (rememberChk && rememberChk.checked) {
      localStorage.setItem('etiove_web_saved_email', email);
      localStorage.setItem('etiove_web_saved_pw', password);
    } else {
      localStorage.removeItem('etiove_web_saved_email');
      localStorage.removeItem('etiove_web_saved_pw');
    }

    // Comprobar si el email está verificado
    try {
      const lookupRes = await fetch(`${AUTH_URL}:lookup?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ios-Bundle-Identifier': FIREBASE_IOS_BUNDLE_ID,
        },
        body: JSON.stringify({ idToken: json.idToken }),
      });
      const lookupJson = await lookupRes.json();
      if (lookupJson.users && lookupJson.users[0]) {
        auth.emailVerified = lookupJson.users[0].emailVerified === true;
        localStorage.setItem('etiove_web_email_verified', auth.emailVerified ? 'true' : 'false');
      }
    } catch (_) {
      /* no bloquear */
    }

    // Si es registro nuevo, enviar email de verificación
    if (registerMode) {
      try {
        await fetch(`${AUTH_URL}:sendOobCode?key=${FIREBASE_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Ios-Bundle-Identifier': FIREBASE_IOS_BUNDLE_ID,
          },
          body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: json.idToken }),
        });
      } catch (_) {
        /* no bloquear */
      }
    }

    // Resolver alias canónico del perfil para no exponer prefijos de email.
    try {
      await resolveAuthorAlias();
    } catch (_) {
      /* no bloquear el login */
    }

    renderAuthState();
    if (registerMode) {
      el.authStatus.innerHTML = `<span style="color:var(--success);font-size:12px;">✔ Cuenta creada. Hemos enviado un email de verificación a <strong>${escapeHtml(email)}</strong> — pulsa el enlace para activar la verificación.</span>`;
    }
    await loadForum();
  } catch (e) {
    setStatus(el.authStatus, mapAuthError(e), 'error');
  }
};

const logout = async () => {
  auth = { uid: '', email: '', token: '', emailVerified: false };
  localStorage.removeItem('etiove_web_uid');
  localStorage.removeItem('etiove_web_email');
  localStorage.removeItem('etiove_web_token');
  localStorage.removeItem('etiove_web_alias');
  localStorage.removeItem('etiove_web_email_verified');
  canonicalAlias = '';
  aliasSyncDone = false;
  // No borramos saved_email/saved_pw — son las credenciales de "Recordarme"
  renderAuthState();
  await loadForum();
};

const createThread = async () => {
  if (!auth.token || !auth.uid) {
    setStatus(el.threadStatus, 'Inicia sesión para publicar.', 'error');
    return;
  }

  const title = normalizeThreadTitle(el.threadTitle.value || '');
  const body = (el.threadBody.value || '').trim();
  const categoryId = el.categorySelect.value;
  const category = FORUM_CATEGORIES.find((c) => c.id === categoryId);
  const accessLevel =
    el.threadAccessLevel.value === 'registered_only' ? 'registered_only' : 'public';

  if (title.length < 3 || body.length < 3) {
    setStatus(el.threadStatus, 'Título y contenido deben tener mínimo 3 caracteres.', 'error');
    return;
  }

  if (!requireOnline()) return;
  await withSubmitGuard('thread', el.createThreadBtn, 'Publicando...', async () => {
    try {
      const imageFile =
        el.threadImage.files && el.threadImage.files[0] ? el.threadImage.files[0] : null;
      let imageUrl = '';
      let imageUploadWarning = '';
      if (imageFile) {
        try {
          imageUrl = await uploadImageWithRetry(imageFile, 'foro_hilos', 3);
        } catch (uploadErr) {
          imageUploadWarning = mapThreadPublishError(uploadErr);
          const shouldContinue = window.confirm(
            `No se pudo subir la imagen.\n\n${imageUploadWarning}\n\n¿Quieres publicar el hilo sin imagen?`
          );
          if (!shouldContinue) {
            setStatus(
              el.threadStatus,
              'Publicación cancelada. Inténtalo de nuevo con otra imagen.',
              'error'
            );
            return;
          }
        }
      }

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

      resetThreadComposer({ preserveStatus: true });
      clearDraft();

      if (imageUploadWarning) {
        setStatus(el.threadStatus, `Hilo publicado sin imagen. ${imageUploadWarning}`, 'error');
      } else {
        setStatus(el.threadStatus, 'Hilo publicado.', 'ok');
      }
      await loadForum();
    } catch (e) {
      setStatus(el.threadStatus, mapThreadPublishError(e), 'error');
    }
  });
};

const voteThread = async (threadId) => {
  if (!auth.token || !auth.uid) {
    setStatus(el.threadStatus, 'Inicia sesión para votar.', 'error');
    return;
  }

  const item = threads.find((t) => t.id === threadId);
  if (!item) return;

  const voters = new Set(splitCsv(item.voterUids));
  if (voters.has(auth.uid)) {
    setStatus(el.threadStatus, 'Ya votaste este hilo.', 'error');
    return;
  }

  if (_submitting.vote) return;
  _submitting.vote = true;

  // Optimistic update: reflect the vote immediately in local state and DOM
  voters.add(auth.uid);
  const newUpvotes = Number(item.upvotes || 0) + 1;
  const newVoterUids = Array.from(voters).join(',');
  item.upvotes = newUpvotes;
  item.voterUids = newVoterUids;
  // Update just the vote button and count in the DOM without a full re-render
  el.threadsWrap.querySelectorAll(`[data-vote="${threadId}"]`).forEach((btn) => {
    btn.textContent = btn.textContent.includes('✓') ? btn.textContent : '✓ Interesa';
  });
  el.threadsWrap.querySelectorAll(`[data-vote="${threadId}"]`).forEach((btn) => {
    const sibling = btn.nextElementSibling;
    if (sibling && sibling.classList.contains('muted')) {
      sibling.textContent = sibling.textContent.replace(/\d+ votos/, `${newUpvotes} votos`);
    }
  });

  try {
    const ok = await updateDocument('foro_hilos', threadId, {
      upvotes: newUpvotes,
      voterUids: newVoterUids,
    });
    if (!ok) {
      // Revert optimistic update on failure
      item.upvotes = newUpvotes - 1;
      voters.delete(auth.uid);
      item.voterUids = Array.from(voters).join(',');
      setStatus(el.threadStatus, 'No se pudo guardar tu voto.', 'error');
      renderThreads();
    }
  } finally {
    _submitting.vote = false;
  }
};

const voteReply = async (replyId) => {
  if (!auth.token || !auth.uid) {
    setStatus(el.threadStatus, 'Inicia sesión para votar.', 'error');
    return;
  }

  const item = replies.find((reply) => reply.id === replyId);
  if (!item) return;

  const voters = new Set(splitCsv(item.voterUids));
  if (voters.has(auth.uid)) {
    setStatus(el.threadStatus, 'Ya votaste esta respuesta.', 'error');
    return;
  }

  if (_submitting.vote) return;
  _submitting.vote = true;

  // Optimistic update: reflect the vote immediately
  voters.add(auth.uid);
  const newUpvotes = Number(item.upvotes || 0) + 1;
  const newVoterUids = Array.from(voters).join(',');
  item.upvotes = newUpvotes;
  item.voterUids = newVoterUids;
  el.threadsWrap.querySelectorAll(`[data-reply-vote="${replyId}"]`).forEach((btn) => {
    btn.textContent = 'Ya te interesa';
    const sibling = btn.nextElementSibling;
    if (sibling && sibling.classList.contains('muted')) {
      sibling.textContent = `${newUpvotes} votos`;
    }
  });

  try {
    const ok = await updateDocument('foro_respuestas', replyId, {
      upvotes: newUpvotes,
      voterUids: newVoterUids,
    });
    if (!ok) {
      // Revert on failure
      item.upvotes = newUpvotes - 1;
      voters.delete(auth.uid);
      item.voterUids = Array.from(voters).join(',');
      setStatus(el.threadStatus, 'No se pudo guardar tu voto.', 'error');
      renderThreads();
    }
  } finally {
    _submitting.vote = false;
  }
};

const editThread = async (threadId) => {
  const item = threads.find((thread) => thread.id === threadId);
  if (!canManageItem(item)) return;
  startThreadEdit(item);
};

const saveInlineThreadEdit = async (threadId) => {
  const item = threads.find((thread) => thread.id === threadId);
  if (!canManageItem(item) || !editingThreadDraft || editingThreadId !== threadId) return;

  const title = normalizeThreadTitle(editingThreadDraft.title || '');
  const body = String(editingThreadDraft.body || '').trim();
  const categoryId = String(editingThreadDraft.categoryId || 'general').trim() || 'general';
  const category = FORUM_CATEGORIES.find((c) => c.id === categoryId);
  const accessLevel =
    editingThreadDraft.accessLevel === 'registered_only' ? 'registered_only' : 'public';

  if (title.length < 3 || body.length < 3) {
    setStatus(el.threadStatus, 'Título y contenido deben tener mínimo 3 caracteres.', 'error');
    editingThreadFocusField = title.length < 3 ? 'title' : 'body';
    renderThreads();
    window.requestAnimationFrame(() => focusInlineThreadEditor());
    return;
  }

  // Find the save button inside the inline editor to disable it during the operation
  const saveBtn = el.threadsWrap
    ? el.threadsWrap.querySelector(`[data-thread-save="${threadId}"]`)
    : null;

  await withSubmitGuard('edit', saveBtn, 'Guardando...', async () => {
    let image = String(item.image || '');

    if (editingThreadDraft.imageRemoved) {
      image = '';
    }

    const imageFile = editingThreadDraft.imageFile || null;
    if (imageFile) {
      try {
        image = await uploadImageWithRetry(imageFile, 'foro_hilos', 3);
      } catch (uploadErr) {
        setStatus(el.threadStatus, mapThreadPublishError(uploadErr), 'error');
        return;
      }
    }

    const ok = await updateDocument('foro_hilos', threadId, {
      categoryId,
      categoryLabel: category ? category.label : 'General',
      title,
      body,
      image,
      accessLevel,
      updatedAt: new Date().toISOString(),
    });

    if (!ok) {
      setStatus(el.threadStatus, 'No se pudieron guardar los cambios del hilo.', 'error');
      return;
    }

    setStatus(el.threadStatus, `Cambios guardados en "${title}".`, 'ok');
    resetInlineThreadEdit({ preserveStatus: true, rerender: false });
    applyLocalUpdate({
      updateThread: {
        id: threadId,
        title,
        body,
        categoryId,
        categoryLabel: category ? category.label : 'General',
        image,
        accessLevel,
      },
    });
  });
};

const deleteThread = async (threadId) => {
  const item = threads.find((thread) => thread.id === threadId);
  if (!canManageItem(item)) return;
  showConfirmModal({
    title: 'Eliminar hilo',
    message: 'Se eliminará el hilo y todas sus respuestas. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    danger: true,
    onConfirm: async () => {
      const relatedReplies = replies.filter((reply) => reply.threadId === threadId);
      const replyResults = await Promise.allSettled(
        relatedReplies.map((reply) => deleteDocument('foro_respuestas', reply.id))
      );
      if (replyResults.some((result) => result.status === 'rejected' || !result.value)) {
        setStatus(el.threadStatus, 'No se pudieron borrar todas las respuestas del hilo.', 'error');
        return;
      }

      const ok = await deleteDocument('foro_hilos', threadId);
      if (!ok) {
        setStatus(el.threadStatus, 'No se pudo borrar el hilo.', 'error');
        return;
      }

      if (editingThreadId === threadId)
        resetInlineThreadEdit({ preserveStatus: true, rerender: false });
      setStatus(el.threadStatus, 'Hilo eliminado.', 'ok');
      if (getActiveThreadId() === threadId) {
        applyLocalUpdate({ removeThreadId: threadId });
        goToThreadList();
        return;
      }
      applyLocalUpdate({ removeThreadId: threadId });
    },
  });
};

const editReply = (replyId) => {
  const item = replies.find((reply) => reply.id === replyId);
  if (!canManageItem(item)) return;
  editingReplyId = replyId;
  editingReplyDraft = item.body || '';
  renderThreads();
  // Focus the textarea after render
  window.requestAnimationFrame(() => {
    const ta =
      el.threadsWrap && el.threadsWrap.querySelector(`[data-reply-edit-body="${replyId}"]`);
    if (ta) {
      ta.focus();
      const end = ta.value.length;
      ta.setSelectionRange(end, end);
    }
  });
};

const saveReplyEdit = async (replyId) => {
  const item = replies.find((reply) => reply.id === replyId);
  if (!canManageItem(item)) return;

  const ta = el.threadsWrap && el.threadsWrap.querySelector(`[data-reply-edit-body="${replyId}"]`);
  const body = (ta ? ta.value : editingReplyDraft).trim();
  if (!body) {
    setStatus(el.threadStatus, 'La respuesta no puede quedar vacía.', 'error');
    return;
  }

  const saveBtn = el.threadsWrap && el.threadsWrap.querySelector(`[data-reply-save="${replyId}"]`);
  if (!requireOnline()) return;
  await withSubmitGuard('edit', saveBtn, 'Guardando...', async () => {
    const ok = await updateDocument('foro_respuestas', replyId, {
      body,
      updatedAt: new Date().toISOString(),
    });
    if (!ok) {
      setStatus(el.threadStatus, 'No se pudo guardar la respuesta.', 'error');
      return;
    }
    // Optimistic update in local state
    item.body = body;
    editingReplyId = '';
    editingReplyDraft = '';
    setStatus(el.threadStatus, 'Respuesta actualizada.', 'ok');
    renderThreads();
  });
};

const cancelReplyEdit = () => {
  editingReplyId = '';
  editingReplyDraft = '';
  renderThreads();
};

const deleteReply = async (replyId) => {
  const item = replies.find((reply) => reply.id === replyId);
  if (!canManageItem(item)) return;
  showConfirmModal({
    title: 'Eliminar respuesta',
    message: 'Se eliminará esta respuesta. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    danger: true,
    onConfirm: async () => {
      const ok = await deleteDocument('foro_respuestas', replyId);
      if (!ok) {
        setStatus(el.threadStatus, 'No se pudo borrar la respuesta.', 'error');
        return;
      }

      setStatus(el.threadStatus, 'Respuesta eliminada.', 'ok');
      applyLocalUpdate({ removeReplyId: replyId });
    },
  });
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

  const sendBtn = el.threadsWrap.querySelector(`[data-reply-send="${threadId}"]`);

  if (!requireOnline()) return;
  await withSubmitGuard('reply', sendBtn, 'Enviando...', async () => {
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

      const newReply = {
        threadId,
        body,
        authorUid: auth.uid,
        authorName: getAuthorName(),
        authorLevel: 'Web',
        createdAt: new Date().toISOString(),
        upvotes: 0,
        voterUids: '',
        reportedCount: 0,
        reporterUids: '',
      };
      input.value = '';
      // Use local update — no full reload needed
      applyLocalUpdate({ addReply: newReply });
      setStatus(el.threadStatus, 'Respuesta enviada.', 'ok');
    } catch {
      setStatus(el.threadStatus, 'No se pudo enviar la respuesta.', 'error');
    }
  });
};

const showProfileGate = () => {
  // Capture the active thread at the moment the alias was clicked
  const activeThreadId = getActiveThreadId();
  el.threadsWrap.innerHTML = `
    <div class="thread-gate private">
      <div class="thread-gate-icon">👤</div>
      <h3 class="thread-gate-title">Perfil privado</h3>
      <p class="thread-gate-text">Los perfiles de la comunidad son exclusivos para miembros registrados. Crea tu cuenta gratis o inicia sesión para verlos.</p>
      <button class="thread-gate-btn" id="profileGateAction">Crear cuenta · Es gratis</button>
      <button class="thread-gate-back" id="profileGateBack">← Volver a los hilos</button>
    </div>`;
  const actionBtn = el.threadsWrap.querySelector('#profileGateAction');
  const backBtn = el.threadsWrap.querySelector('#profileGateBack');
  if (backBtn)
    backBtn.addEventListener('click', () => {
      goToThreadList({
        replace: false,
        restoreScroll: false,
        scrollToThreadId: activeThreadId || null,
      });
    });
  if (actionBtn)
    actionBtn.addEventListener('click', () => {
      const loginSection = document.querySelector('.login-section');
      if (loginSection) {
        loginSection.style.display = '';
        loginSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const emailInput = document.getElementById('email');
      if (emailInput) setTimeout(() => emailInput.focus(), 400);
    });
};

const showPrivateThreadGate = (thread) => {
  const isPrivate = thread && thread.accessLevel === 'registered_only';
  // Save the thread element's scroll position so Back restores it
  const threadId = thread && thread.id;
  el.threadsWrap.innerHTML = `
    <div class="thread-gate ${isPrivate ? 'private' : 'public'}">
      <div class="thread-gate-icon">${isPrivate ? '🔒' : '📖'}</div>
      <h3 class="thread-gate-title">${isPrivate ? 'Hilo privado' : escapeHtml((thread && thread.title) || '')}</h3>
      <p class="thread-gate-text">${
        isPrivate
          ? 'Este hilo es exclusivo para miembros registrados. Crea tu cuenta gratis o inicia sesión para leerlo.'
          : 'Este es un hilo público. Puedes leerlo sin registro.'
      }</p>
      <button class="thread-gate-btn" id="threadGateAction">${isPrivate ? 'Crear cuenta · Es gratis' : 'Leer hilo'}</button>
      <button class="thread-gate-back" id="threadGateBack">← Volver a los hilos</button>
    </div>`;
  const actionBtn = el.threadsWrap.querySelector('#threadGateAction');
  const backBtn = el.threadsWrap.querySelector('#threadGateBack');
  if (backBtn)
    backBtn.addEventListener('click', () => {
      goToThreadList({ replace: false, restoreScroll: false, scrollToThreadId: threadId || null });
    });
  if (actionBtn) {
    if (isPrivate) {
      actionBtn.addEventListener('click', () => {
        const loginSection = document.querySelector('.login-section');
        if (loginSection) {
          loginSection.style.display = '';
          loginSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.focus();
      });
    } else {
      actionBtn.addEventListener('click', () => {
        if (thread && thread.id) goToThreadDetail(thread.id);
      });
    }
  }
};

// ─── TOKEN REFRESH ────────────────────────────────────────────────────────────
const refreshFirebaseToken = async () => {
  const refreshToken = localStorage.getItem('etiove_web_refresh_token');
  if (!refreshToken) return;
  try {
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    });
    if (!res.ok) {
      // Token inválido o revocado → mostrar banner y limpiar sesión
      showSessionExpiredBanner();
      clearAuthToken();
      renderAuthState();
      return;
    }
    const json = await res.json();
    if (json.id_token && json.user_id) {
      auth.token = json.id_token;
      auth.uid = json.user_id;
      localStorage.setItem('etiove_web_token', json.id_token);
      localStorage.setItem('etiove_web_uid', json.user_id);
      if (json.refresh_token) localStorage.setItem('etiove_web_refresh_token', json.refresh_token);
    }
  } catch (_) {
    /* red caída — no limpiar sesión */
  }
};

// ─── BANNER SESIÓN CADUCADA ───────────────────────────────────────────────────
const showSessionExpiredBanner = () => {
  if (document.getElementById('sessionExpiredBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'sessionExpiredBanner';
  banner.style.cssText = [
    'position:fixed;top:0;left:0;right:0;z-index:9999',
    'background:#5f3a25;color:#fff9f1',
    'padding:12px 20px',
    'display:flex;align-items:center;justify-content:space-between;gap:16px',
    'font-size:13px;font-family:-apple-system,BlinkMacSystemFont,sans-serif',
    'box-shadow:0 2px 12px rgba(0,0,0,0.25)',
  ].join(';');
  banner.innerHTML = `
    <span>⏱ Tu sesión ha caducado. Vuelve a iniciar sesión para seguir participando.</span>
    <div style="display:flex;gap:10px;align-items:center;flex-shrink:0;">
      <button id="sessionExpiredLogin"
        style="background:#e8d5be;color:#1a0f08;border:none;padding:7px 16px;border-radius:6px;
               font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
               cursor:pointer;font-family:inherit;">
        Iniciar sesión
      </button>
      <button id="sessionExpiredClose"
        style="background:transparent;color:rgba(255,249,241,0.6);border:none;
               font-size:18px;line-height:1;cursor:pointer;padding:0 4px;">
        ×
      </button>
    </div>`;
  document.body.prepend(banner);
  document.getElementById('sessionExpiredClose').onclick = () => banner.remove();
  document.getElementById('sessionExpiredLogin').onclick = () => {
    banner.remove();
    const loginSection = document.querySelector('.login-section');
    if (loginSection) {
      loginSection.style.display = '';
      loginSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const emailInput = document.getElementById('email');
    if (emailInput) setTimeout(() => emailInput.focus(), 400);
  };
};

// ─── NOTIFICACIONES CON BADGE ─────────────────────────────────────────────────
const checkNotifications = async () => {
  if (!auth.uid || !auth.token) return;
  const badge = document.getElementById('communityNavBadge');
  if (!badge) return;

  try {
    const lastCheck = Number(localStorage.getItem('etiove_notif_last_check') || 0);
    const [allReplies, allMessages] = await Promise.all([
      getCollection('foro_respuestas', 400),
      getCollection('direct_messages', 200),
    ]);

    const myAlias = String(localStorage.getItem('etiove_web_alias') || '')
      .toLowerCase()
      .replace(/^@/, '');

    // 1. Respuestas nuevas en mis hilos
    const myThreadIds = new Set(threads.filter((t) => t.authorUid === auth.uid).map((t) => t.id));
    const newRepliesInMyThreads = allReplies.filter(
      (r) =>
        r.authorUid !== auth.uid &&
        myThreadIds.has(r.threadId) &&
        new Date(r.createdAt).getTime() > lastCheck
    ).length;

    // 2. Menciones @alias en respuestas y títulos
    const mentionPattern = myAlias ? new RegExp(`@${myAlias}\b`, 'i') : null;
    const newMentions = mentionPattern
      ? allReplies.filter(
          (r) =>
            r.authorUid !== auth.uid &&
            new Date(r.createdAt).getTime() > lastCheck &&
            (mentionPattern.test(r.body || '') || mentionPattern.test(r.title || ''))
        ).length
      : 0;

    // 3. Mensajes directos no leídos
    const newDMs = allMessages.filter(
      (m) => m.recipientUid === auth.uid && !m.read && new Date(m.createdAt).getTime() > lastCheck
    ).length;

    const total = newRepliesInMyThreads + newMentions + newDMs;

    // Mostrar badge con desglose en tooltip
    if (total > 0) {
      badge.textContent = total > 9 ? '9+' : String(total);
      badge.style.display = 'inline-flex';
      const parts = [];
      if (newRepliesInMyThreads)
        parts.push(
          `${newRepliesInMyThreads} respuesta${newRepliesInMyThreads > 1 ? 's' : ''} en tus hilos`
        );
      if (newMentions) parts.push(`${newMentions} mención${newMentions > 1 ? 'es' : ''}`);
      if (newDMs)
        parts.push(`${newDMs} mensaje${newDMs > 1 ? 's' : ''} directo${newDMs > 1 ? 's' : ''}`);
      badge.title = parts.join(' · ');
    } else {
      badge.style.display = 'none';
      badge.title = '';
    }

    localStorage.setItem('etiove_notif_last_check', String(Date.now()));
  } catch (_) {
    /* silencioso */
  }
};

// ─── DRAFT DEL COMPOSER ──────────────────────────────────────────────────────
const DRAFT_KEY = 'etiove_thread_draft';

const saveDraft = () => {
  if (!auth.uid) return;
  try {
    const draft = {
      title: el.threadTitle ? el.threadTitle.value : '',
      body: el.threadBody ? el.threadBody.value : '',
      categoryId: el.categorySelect ? el.categorySelect.value : 'general',
      accessLevel: el.threadAccessLevel ? el.threadAccessLevel.value : 'public',
    };
    if (draft.title.trim() || draft.body.trim()) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  } catch (_) {}
};

const restoreDraft = () => {
  if (!auth.uid) return;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft) return;
    if (draft.title && el.threadTitle && !el.threadTitle.value) el.threadTitle.value = draft.title;
    if (draft.body && el.threadBody && !el.threadBody.value) el.threadBody.value = draft.body;
    if (draft.categoryId && el.categorySelect) el.categorySelect.value = draft.categoryId;
    if (draft.accessLevel && el.threadAccessLevel) el.threadAccessLevel.value = draft.accessLevel;
    const notice = document.getElementById('draftRestoredNotice');
    if (notice) {
      notice.style.display = 'block';
      setTimeout(() => {
        notice.style.display = 'none';
      }, 4000);
    }
  } catch (_) {}
};

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (_) {}
};

// ─── MODAL DE CONFIRMACIÓN (reemplaza window.confirm) ────────────────────────
const showConfirmModal = ({
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
}) => {
  const existing = document.getElementById('etioveConfirmModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'etioveConfirmModal';
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:10001',
    'background:rgba(28,18,13,0.52)',
    'backdrop-filter:blur(4px)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:24px',
  ].join(';');

  const confirmColor = danger ? '#a44f45' : 'var(--accent-deep, #5f3a25)';
  overlay.innerHTML = `
    <div style="background:#fdf8f1;border-radius:12px;padding:28px 24px;max-width:380px;
                width:100%;box-shadow:0 24px 64px rgba(28,18,13,0.22);font-family:-apple-system,sans-serif;">
      <p style="font-family:'Playfair Display',serif;font-size:17px;font-weight:700;
                color:#1c120d;margin-bottom:10px;">${escapeHtml(title)}</p>
      <p style="font-size:14px;color:#5d4030;line-height:1.65;margin-bottom:24px;">${escapeHtml(message)}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="etioveConfirmCancel"
          style="background:transparent;border:1px solid #deccb6;border-radius:8px;
                 padding:9px 20px;font-size:13px;font-weight:600;color:#5d4030;
                 cursor:pointer;font-family:inherit;">Cancelar</button>
        <button id="etioveConfirmOk"
          style="background:${confirmColor};border:none;border-radius:8px;
                 padding:9px 20px;font-size:13px;font-weight:700;color:#fff9f1;
                 cursor:pointer;font-family:inherit;">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#etioveConfirmCancel').onclick = close;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Focus trap — keep focus inside modal
  const focusables = overlay.querySelectorAll('button');
  const firstF = focusables[0];
  const lastF = focusables[focusables.length - 1];
  setTimeout(() => {
    if (lastF) lastF.focus();
  }, 0);
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === firstF) {
        e.preventDefault();
        lastF.focus();
      }
    } else {
      if (document.activeElement === lastF) {
        e.preventDefault();
        firstF.focus();
      }
    }
  });

  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', esc);
    }
  });
  overlay.querySelector('#etioveConfirmOk').onclick = () => {
    close();
    onConfirm();
  };
};

// ─── ACTUALIZACIÓN LOCAL DE ESTADO (evita recargar todo el foro) ─────────────
// Después de operaciones que ya conocemos el resultado, actualizamos el estado
// local y re-renderizamos sin ir a Firestore.
const applyLocalUpdate = ({
  addThread,
  removeThreadId,
  addReply,
  removeReplyId,
  updateThread,
  updateReply,
} = {}) => {
  if (addThread) {
    threads = [normalizeThread(addThread), ...threads];
  }
  if (removeThreadId) {
    threads = threads.filter((t) => t.id !== removeThreadId);
    replies = replies.filter((r) => r.threadId !== removeThreadId);
  }
  if (addReply) {
    replies = [...replies, addReply];
    // Increment replyCount on the parent thread
    const parent = threads.find((t) => t.id === addReply.threadId);
    if (parent) parent.replyCount = (Number(parent.replyCount) || 0) + 1;
  }
  if (removeReplyId) {
    replies = replies.filter((r) => r.id !== removeReplyId);
  }
  if (updateThread) {
    threads = threads.map((t) => (t.id === updateThread.id ? { ...t, ...updateThread } : t));
  }
  if (updateReply) {
    replies = replies.map((r) => (r.id === updateReply.id ? { ...r, ...updateReply } : r));
  }
  renderThreads();
};

// ─── REPORTAR CONTENIDO ───────────────────────────────────────────────────────
const reportItem = async (collection, itemId, itemType) => {
  if (!auth.token || !auth.uid) {
    setStatus(el.threadStatus, 'Inicia sesión para reportar.', 'error');
    return;
  }

  // Find the item in local state
  const item =
    collection === 'foro_hilos'
      ? threads.find((t) => t.id === itemId)
      : replies.find((r) => r.id === itemId);
  if (!item) return;

  // Prevent self-report
  if (item.authorUid === auth.uid) {
    setStatus(el.threadStatus, 'No puedes reportar tu propio contenido.', 'error');
    return;
  }

  // Check if already reported
  const reporters = new Set(
    String(item.reporterUids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (reporters.has(auth.uid)) {
    setStatus(el.threadStatus, 'Ya has reportado este contenido.', 'error');
    return;
  }

  showConfirmModal({
    title: `Reportar ${itemType}`,
    message: '¿Reportar este contenido como inapropiado? El equipo de Etiove lo revisará.',
    confirmLabel: 'Reportar',
    danger: false,
    onConfirm: async () => {
      reporters.add(auth.uid);
      const newCount = Number(item.reportedCount || 0) + 1;
      const ok = await updateDocument(collection, itemId, {
        reportedCount: newCount,
        reporterUids: Array.from(reporters).join(','),
      });
      if (!ok) {
        setStatus(el.threadStatus, 'No se pudo enviar el reporte.', 'error');
        return;
      }
      item.reportedCount = newCount;
      item.reporterUids = Array.from(reporters).join(',');
      setStatus(
        el.threadStatus,
        'Reporte enviado. Gracias por ayudar a mantener la comunidad.',
        'ok'
      );
      renderThreads();
    },
  });
};

// ─── MENCIONES @USUARIO (autocomplete) ────────────────────────────────────────
const initMentionAutocomplete = (textarea) => {
  if (!textarea || textarea.dataset.mentionBound) return;
  textarea.dataset.mentionBound = '1';

  let dropdown = null;
  let mentionStart = -1;

  const closeDropdown = () => {
    if (dropdown) {
      dropdown.remove();
      dropdown = null;
    }
    mentionStart = -1;
  };

  const buildDropdown = (matches, pos) => {
    closeDropdown();
    if (!matches.length) return;

    dropdown = document.createElement('div');
    dropdown.style.cssText = [
      'position:fixed',
      'z-index:9999',
      'background:#fffaf5',
      'border:1px solid #e4d3c2',
      'border-radius:8px',
      'box-shadow:0 8px 24px rgba(28,18,13,0.12)',
      'max-height:200px',
      'overflow-y:auto',
      'min-width:200px',
      'font-family:-apple-system,sans-serif',
    ].join(';');

    // Position below the textarea cursor
    const rect = textarea.getBoundingClientRect();
    dropdown.style.top = rect.bottom + 4 + 'px';
    dropdown.style.left = rect.left + 'px';

    matches.slice(0, 6).forEach((user) => {
      const item = document.createElement('div');
      item.style.cssText =
        'padding:10px 14px;cursor:pointer;font-size:13px;color:#1c120d;display:flex;align-items:center;gap:8px;';
      item.innerHTML = `<span style="color:#9a7963;font-size:11px;">@</span><strong>${escapeHtml(user.alias || user.name)}</strong><span style="color:#9a7963;font-size:11px;margin-left:4px;">${escapeHtml(user.name)}</span>`;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const val = textarea.value;
        const before = val.slice(0, mentionStart);
        const after = val.slice(textarea.selectionStart);
        const insert = `@${user.alias || user.name} `;
        textarea.value = before + insert + after;
        textarea.selectionStart = textarea.selectionEnd = before.length + insert.length;
        textarea.dispatchEvent(new Event('input'));
        closeDropdown();
      });
      item.addEventListener('mouseover', () => {
        item.style.background = '#f6efe7';
      });
      item.addEventListener('mouseout', () => {
        item.style.background = '';
      });
      dropdown.appendChild(item);
    });

    document.body.appendChild(dropdown);
  };

  textarea.addEventListener('input', () => {
    const val = textarea.value;
    const cur = textarea.selectionStart;
    // Find the @ before the cursor
    let i = cur - 1;
    while (i >= 0 && val[i] !== ' ' && val[i] !== '\n' && val[i] !== '@') i--;
    if (i < 0 || val[i] !== '@') {
      closeDropdown();
      return;
    }
    mentionStart = i;
    const query = val.slice(i + 1, cur).toLowerCase();
    if (!query) {
      closeDropdown();
      return;
    }

    // Search in loaded profiles
    const matches = profiles
      .map((p) => ({
        uid: p.uid || '',
        name: String(p.displayName || p.alias || '').trim(),
        alias: String(p.alias || '')
          .replace(/^@/, '')
          .trim(),
      }))
      .filter(
        (u) =>
          u.name && (u.name.toLowerCase().includes(query) || u.alias.toLowerCase().includes(query))
      );

    buildDropdown(matches);
  });

  textarea.addEventListener('keydown', (e) => {
    if (!dropdown) return;
    const items = dropdown.querySelectorAll('div');
    const active = dropdown.querySelector('.mention-active');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = active ? active.nextElementSibling : items[0];
      if (active) (active.classList.remove('mention-active'), (active.style.background = ''));
      if (next) (next.classList.add('mention-active'), (next.style.background = '#f6efe7'));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = active ? active.previousElementSibling : items[items.length - 1];
      if (active) (active.classList.remove('mention-active'), (active.style.background = ''));
      if (prev) (prev.classList.add('mention-active'), (prev.style.background = '#f6efe7'));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (active) {
        e.preventDefault();
        active.dispatchEvent(new MouseEvent('mousedown'));
      } else {
        closeDropdown();
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  textarea.addEventListener('blur', () => setTimeout(closeDropdown, 150));
};

const init = async () => {
  initializeMetaDefaults();
  renderCategories();

  // Validar sesión al inicio: evita mostrar "Sesión activa" con token caducado
  if (auth.uid && auth.token) {
    const rt = localStorage.getItem('etiove_web_refresh_token');
    if (!rt) {
      clearAuthToken();
    } else {
      await refreshFirebaseToken();
    }
  }

  renderAuthState();

  // Pre-rellenar campos de login si hay credenciales guardadas (Recordarme)
  const savedEmail = localStorage.getItem('etiove_web_saved_email');
  const savedPw = localStorage.getItem('etiove_web_saved_pw');
  if (savedEmail && el.email) {
    el.email.value = savedEmail;
    if (savedPw && el.password) el.password.value = savedPw;
    const chk = document.getElementById('rememberMe');
    if (chk) chk.checked = true;
  }

  // Offline/online detection
  window.addEventListener('offline', () => showOfflineBanner());
  window.addEventListener('online', () => hideOfflineBanner());
  if (isOffline()) showOfflineBanner();

  // ─── TEXTAREA AUTO-RESIZE ────────────────────────────────────────────────
  const autoResize = (ta) => {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 400) + 'px';
  };
  const wireAutoResize = (ta) => {
    if (!ta || ta.dataset.autoResize) return;
    ta.style.overflow = 'hidden';
    ta.addEventListener('input', () => autoResize(ta));
    autoResize(ta);
    ta.dataset.autoResize = '1';
  };
  wireAutoResize(el.threadBody);
  initMentionAutocomplete(el.threadBody);

  // Ctrl+Enter to publish thread
  if (el.threadBody) {
    el.threadBody.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (el.createThreadBtn && !el.createThreadBtn.disabled) createThread();
      }
    });
  }

  // ─── DRAFT AUTO-SAVE ──────────────────────────────────────────────────────
  if (el.threadTitle) el.threadTitle.addEventListener('input', saveDraft);
  if (el.threadBody) el.threadBody.addEventListener('input', saveDraft);
  if (el.categorySelect) el.categorySelect.addEventListener('change', saveDraft);
  if (el.threadAccessLevel) el.threadAccessLevel.addEventListener('change', saveDraft);

  el.loginBtn.addEventListener('click', async () => {
    await signIn(false);
    renderAuthState();
    if (typeof renderMemberEvolutionCard === 'function') {
      renderMemberEvolutionCard({ profile: null, allThreads: [], allReplies: [] });
    }
  });
  el.registerBtn.addEventListener('click', async () => {
    await signIn(true);
    renderAuthState();
    if (typeof renderMemberEvolutionCard === 'function') {
      renderMemberEvolutionCard({ profile: null, allThreads: [], allReplies: [] });
    }
  });
  el.logoutBtn.addEventListener('click', async () => {
    await logout();
    renderAuthState();
    if (typeof renderMemberEvolutionCard === 'function') {
      renderMemberEvolutionCard({ profile: null, allThreads: [], allReplies: [] });
    }
  });
  el.createThreadBtn.addEventListener('click', createThread);
  if (el.cancelThreadEditBtn) {
    el.cancelThreadEditBtn.addEventListener('click', () => {
      resetThreadComposer();
    });
  }
  // No normalizar el título mientras escribe — se normaliza al guardar
  el.threadImage.addEventListener('change', () => {
    const selected =
      el.threadImage.files && el.threadImage.files[0] ? el.threadImage.files[0] : null;
    // Remove previous preview if exists
    let preview = document.getElementById('threadImagePreview');
    if (preview) preview.remove();

    if (!selected) {
      setThreadImageStatus('Imagen opcional para el hilo');
      return;
    }

    const fileType = String(selected.type || '').toLowerCase();
    if (!IMAGE_ALLOWED_TYPES.has(fileType)) {
      setThreadImageStatus('Formato no compatible. Usa JPG, PNG, WEBP, GIF o HEIC.', 'error');
      return;
    }

    const sizeMb = (selected.size / (1024 * 1024)).toFixed(2);
    if (selected.size > IMAGE_MAX_BYTES) {
      setThreadImageStatus(
        `Imagen seleccionada (${sizeMb} MB). Se intentará comprimir al publicar.`,
        ''
      );
      return;
    }

    setThreadImageStatus(`Imagen lista: ${selected.name} (${sizeMb} MB).`, 'ok');

    // Show image preview
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement('img');
      img.id = 'threadImagePreview';
      img.src = e.target.result;
      img.alt = 'Vista previa de la imagen';
      img.style.maxWidth = '120px';
      img.style.maxHeight = '120px';
      img.style.display = 'block';
      img.style.marginTop = '10px';
      img.style.borderRadius = '8px';
      // Insert after the input
      if (el.threadImage && el.threadImage.parentNode) {
        el.threadImage.parentNode.insertBefore(img, el.threadImage.nextSibling);
      }
    };
    reader.readAsDataURL(selected);
  });
  // ─── CONTADORES DE CARACTERES ────────────────────────────────────────────
  const wireCharCounter = (inputEl, maxLen, counterId) => {
    if (!inputEl) return;
    // Create counter element if it doesn't exist
    let counter = document.getElementById(counterId);
    if (!counter) {
      counter = document.createElement('span');
      counter.id = counterId;
      counter.style.cssText =
        'font-size:11px;color:var(--ink-muted);float:right;margin-top:3px;font-family:-apple-system,sans-serif;transition:color 0.2s;';
      inputEl.parentNode.appendChild(counter);
    }
    const update = () => {
      const remaining = maxLen - inputEl.value.length;
      counter.textContent = `${inputEl.value.length} / ${maxLen}`;
      counter.style.color =
        remaining <= 20 ? 'var(--danger)' : remaining <= 50 ? '#b07a52' : 'var(--ink-muted)';
    };
    inputEl.addEventListener('input', update);
    update();
  };
  wireCharCounter(el.threadTitle, 120, 'threadTitleCounter');
  wireCharCounter(el.threadBody, 1000, 'threadBodyCounter');

  if (el.refreshBtn) el.refreshBtn.addEventListener('click', loadForum);
  el.categorySelect.addEventListener('change', () => {
    selectedCategory = el.categorySelect.value;
    currentListPage = 1;
    renderCategories();
    loadForum();
  });

  // Cerrar modal de perfil
  const closeBtn = document.getElementById('profileModalClose');
  if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);
  const modal = document.getElementById('profileModal');
  if (modal)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeProfileModal();
    });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProfileModal();
  });

  window.addEventListener('popstate', () => {
    transitionThreadsView(
      () => renderThreads(),
      () => {
        if (!getActiveThreadId()) {
          const scrollY = Number(
            (window.history.state && window.history.state.communityScrollY) || 0
          );
          window.scrollTo({ top: scrollY, behavior: 'auto' });
        }
      }
    );
  });

  await loadForum();

  // Resolver alias y refrescar emailVerified en segundo plano para no penalizar el arranque
  if (auth.uid && auth.token) {
    const runBackgroundAuthTasks = () => {
      resolveAuthorAlias().catch(() => {});
      fetch(`${AUTH_URL}:lookup?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ios-Bundle-Identifier': FIREBASE_IOS_BUNDLE_ID,
        },
        body: JSON.stringify({ idToken: auth.token }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.users && data.users[0]) {
            const verified = data.users[0].emailVerified === true;
            if (verified !== auth.emailVerified) {
              auth.emailVerified = verified;
              localStorage.setItem('etiove_web_email_verified', verified ? 'true' : 'false');
              renderAuthState();
            }
          }
        })
        .catch(() => {});
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(runBackgroundAuthTasks, { timeout: 2000 });
    } else {
      window.setTimeout(runBackgroundAuthTasks, 800);
    }
  }

  // Comprobar notificaciones en segundo plano para no penalizar el primer render
  if (auth.uid && auth.token) {
    const scheduleNotificationsCheck = () => {
      checkNotifications().catch(() => {});
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(scheduleNotificationsCheck, { timeout: 2500 });
    } else {
      window.setTimeout(scheduleNotificationsCheck, 1200);
    }
  }
};

init();

// Refresca el token cada 55 minutos mientras la página está abierta
setInterval(
  async () => {
    if (auth.token && localStorage.getItem('etiove_web_refresh_token')) {
      await refreshFirebaseToken();
    }
  },
  55 * 60 * 1000
);
