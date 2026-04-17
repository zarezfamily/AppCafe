(() => {
  const {
    projectId: FIREBASE_PROJECT_ID,
    apiKey: FIREBASE_API_KEY,
    iosBundleId: FIREBASE_IOS_BUNDLE_ID,
    baseUrl: BASE_URL,
    storageBucket: FIREBASE_STORAGE_BUCKET,
  } = window.ETIOVE_CONFIG;

  const params = new URLSearchParams(window.location.search);

  // Extraer alias de URL limpia: /perfil/@zarez
  const pathAlias = (() => {
    const seg = window.location.pathname.replace(/\/+$/, '').split('/').pop() || '';
    return seg.startsWith('@') ? seg.slice(1) : seg !== 'perfil' && seg !== '' ? seg : '';
  })();

  const requestedUid = String(params.get('uid') || '').trim();
  const requestedName = String(params.get('name') || pathAlias || '').trim();

  const auth = {
    uid: localStorage.getItem('etiove_web_uid') || '',
    email: localStorage.getItem('etiove_web_email') || '',
    token: localStorage.getItem('etiove_web_token') || '',
    emailVerified: localStorage.getItem('etiove_web_email_verified') === 'true',
  };

  let uid = requestedUid || (pathAlias ? '' : auth.uid) || '';
  const queryName = requestedName || String(localStorage.getItem('etiove_web_alias') || '').trim();
  let resolvedProfilesCache = null;

  // Si el usuario visita su propio perfil sin URL limpia, redirigir a @alias
  if (!requestedUid && !pathAlias && auth.uid) {
    const ownAlias = String(localStorage.getItem('etiove_web_alias') || '')
      .trim()
      .replace(/^@/, '');
    const slug = ownAlias || auth.uid;
    window.history.replaceState(null, '', `/perfil/@${encodeURIComponent(slug)}`);
  }

  const state = {
    threads: [],
    replies: [],
    blogComments: [],
    follows: [],
    messages: [],
    profiles: [],
    messagesLoaded: false,
    profilesLoaded: false,
    profile: null,
    isFollowing: false,
    followersCount: 0,
    followingCount: 0,
    selectedAchievementId: '',
    loaded: false,
  };

  const el = {
    avatar: document.getElementById('profileAvatar'),
    avatarBadge: document.getElementById('avatarCameraBadge'),
    alias: document.getElementById('profileAlias'),
    name: document.getElementById('profileName'),
    level: document.getElementById('profileLevel'),
    xp: document.getElementById('profileXp'),
    nextLevel: document.getElementById('profileNextLevel'),
    nextXp: document.getElementById('profileNextXp'),
    progressFill: document.getElementById('profileProgressFill'),
    statVotes: document.getElementById('statVotes'),
    statPhotos: document.getElementById('statPhotos'),
    statPosts: document.getElementById('statPosts'),
    statRepliesWritten: document.getElementById('statRepliesWritten'),
    statReviews: document.getElementById('statReviews'),
    statFavorites: document.getElementById('statFavorites'),
    since: document.getElementById('profileSince'),
    counters: document.getElementById('profileCounters'),
    followers: document.getElementById('profileFollowers'),
    achievements: document.getElementById('profileAchievements'),
    achievementsMeta: document.getElementById('profileAchievementsMeta'),
    achievementsGrid: document.getElementById('profileAchievementsGrid'),
    scrollTopBtn: document.getElementById('scrollTopBtn'),
    quote: document.getElementById('profileQuote'),
    status: document.getElementById('profileStatus'),
    actions: document.getElementById('profileActions'),
    followBtn: document.getElementById('followBtn'),
    dmBtn: document.getElementById('dmBtn'),
    photoInput: document.getElementById('photoInput'),
    content: document.getElementById('tabContent'),
    tabs: Array.from(document.querySelectorAll('[data-tab]')),
  };

  const isOwner = () => !!auth.uid && auth.uid === uid;

  const XP_RULES = {
    vote: 8,
    photo: 15,
    review: 14,
    addCafe: 18,
    favorite: 3,
  };

  const LEVELS = [
    { name: 'Novato', icon: '🌱', minXp: 0 },
    { name: 'Aficionado', icon: '☕', minXp: 220 },
    { name: 'Catador', icon: '🎯', minXp: 700 },
    { name: 'Experto', icon: '⭐', minXp: 1700 },
    { name: 'Maestro', icon: '👑', minXp: 3400 },
  ];

  const ACHIEVEMENT_DEFS = [
    {
      id: 'primera_cata',
      icon: '🥇',
      title: 'Ritual de inicio',
      desc: 'Valora 3 cafes y desbloquea tu primera insignia.',
    },
    {
      id: 'fotografo',
      icon: '📸',
      title: 'Ojo barista',
      desc: 'Sube 12 fotos de tus cafes para destacar tu lado visual.',
    },
    {
      id: 'viajero',
      icon: '🌍',
      title: 'Ruta de origen',
      desc: 'Prueba cafes de 8 paises distintos y amplia tu mapa sensorial.',
    },
    {
      id: 'adicto',
      icon: '🔥',
      title: 'Tueste constante',
      desc: 'Valora 30 cafes y demuestra constancia de catador.',
    },
    {
      id: 'maestro_catador',
      icon: '👑',
      title: 'Paladar Etiove',
      desc: 'Alcanza el nivel Maestro y corona tu perfil.',
    },
    {
      id: 'coleccionista',
      icon: '❤️',
      title: 'Bodega signature',
      desc: 'Marca 25 favoritos y construye tu propia coleccion.',
    },
    {
      id: 'critico',
      icon: '✍️',
      title: 'Cuaderno de cata',
      desc: 'Escribe 12 reseñas y convierte tu perfil en referencia.',
    },
    {
      id: 'origen_unico',
      icon: '🌱',
      title: 'Lote de autor',
      desc: 'Prueba un origen especial como Geisha, Bourbon Pointu o Yemen.',
    },
  ];

  const normalizeName = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const setStatus = (text) => {
    if (el.status) el.status.textContent = text || '';
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

  const authedHeaders = () => {
    const headers = authHeaders();
    if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
    return headers;
  };

  const getCollection = async (name, pageSize = 1000) => {
    try {
      const res = await fetch(`${BASE_URL}/${name}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}`, {
        headers: authedHeaders(),
      });
      if (res.status === 404 || !res.ok) return [];
      const json = await res.json();
      return (json.documents || []).map((doc) => docToObject(doc));
    } catch {
      return [];
    }
  };

  const toFirestoreValue = (val) => {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'number')
      return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    if (typeof val === 'boolean') return { booleanValue: val };
    return { stringValue: String(val) };
  };

  const toFields = (obj) => {
    const fields = {};
    Object.keys(obj).forEach((k) => {
      fields[k] = toFirestoreValue(obj[k]);
    });
    return { fields };
  };

  const updateDocument = async (name, id, data) => {
    try {
      const query = new URLSearchParams({ key: FIREBASE_API_KEY });
      Object.keys(data).forEach((field) => query.append('updateMask.fieldPaths', field));
      const res = await fetch(`${BASE_URL}/${name}/${id}?${query.toString()}`, {
        method: 'PATCH',
        headers: authedHeaders(),
        body: JSON.stringify(toFields(data)),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const addDocument = async (name, data) => {
    const res = await fetch(`${BASE_URL}/${name}?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: authedHeaders(),
      body: JSON.stringify(toFields(data)),
    });
    return res.ok;
  };

  const deleteDocument = async (name, id) => {
    const res = await fetch(`${BASE_URL}/${name}/${id}?key=${FIREBASE_API_KEY}`, {
      method: 'DELETE',
      headers: authedHeaders(),
    });
    return res.ok;
  };

  const getDocument = async (name, id) => {
    try {
      const res = await fetch(`${BASE_URL}/${name}/${id}?key=${FIREBASE_API_KEY}`, {
        headers: authedHeaders(),
      });
      if (res.status === 404 || !res.ok) return null;
      const json = await res.json();
      return docToObject(json);
    } catch {
      return null;
    }
  };

  const uploadAvatar = async (file) => {
    if (!auth.token || !auth.uid || !file) throw new Error('UNAUTHENTICATED');
    const ext = String(file.type || '').includes('png') ? 'png' : 'jpg';
    const fileName = `profile_avatars/${auth.uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

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
    if (!res.ok) throw new Error((json.error && json.error.message) || 'storage_upload_failed');

    const objectName = json.name || fileName;
    const encodedName = encodeURIComponent(objectName);
    const token = json.downloadTokens || (json.metadata && json.metadata.downloadTokens) || '';
    return token
      ? `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodedName}?alt=media&token=${token}`
      : `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodedName}?alt=media`;
  };

  const esc = (text) =>
    String(text || '')
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

  const readAvatarFromRecord = (record) => {
    if (!record || typeof record !== 'object') return '';
    const candidates = [
      record.avatarUrl,
      record.avatar,
      record.photoURL,
      record.photoUrl,
      record.photo,
      record.image,
      record.picture,
      record.foto,
      record.fotoPerfil,
      record.authorPhoto,
      record.authorAvatar,
    ];
    const hit = candidates.find((value) => String(value || '').trim());
    return normalizeAvatarUrl(String(hit || '').trim());
  };

  const normalizeAvatarUrl = (rawValue) => {
    const raw = String(rawValue || '').trim();
    if (!raw) return '';

    // Local/mobile-only schemes are not reachable from web browsers.
    if (/^(file:|content:|ph:|assets-library:|blob:)/i.test(raw)) return '';

    // Storage object path saved without full URL.
    if (/^profile_avatars\//i.test(raw)) {
      return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(raw)}?alt=media`;
    }

    if (raw.startsWith('gs://')) {
      const withoutScheme = raw.replace(/^gs:\/\//i, '');
      const slashIndex = withoutScheme.indexOf('/');
      if (slashIndex > 0) {
        const bucket = withoutScheme.slice(0, slashIndex);
        const objectPath = withoutScheme.slice(slashIndex + 1);
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
      }
      return '';
    }

    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        const host = String(url.hostname || '').toLowerCase();
        if (host.includes('firebasestorage.googleapis.com') && !url.searchParams.has('alt')) {
          url.searchParams.set('alt', 'media');
          return url.toString();
        }
        if (host.includes('firebasestorage.googleapis.com')) return url.toString();
        return url.toString();
      } catch {
        return '';
      }
    }

    return '';
  };

  const readMottoFromRecord = (record) => {
    if (!record || typeof record !== 'object') return '';
    const candidates = [record.motto, record.frase, record.bio, record.tagline];
    const hit = candidates.find((value) => String(value || '').trim());
    return String(hit || '').trim();
  };

  const formatMottoForDisplay = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.replace(/^(["'])\s*(.*?)\s*\1$/, '$2').trim();
  };

  const readDisplayNameFromRecord = (record) => {
    if (!record || typeof record !== 'object') return '';
    const candidates = [
      record.displayName,
      record.alias,
      record.authorName,
      record.nombre,
      record.nickname,
    ];
    const hit = candidates.find((value) => String(value || '').trim());
    return String(hit || '').trim();
  };

  const getStoredProfileLocal = () => {
    try {
      const raw = localStorage.getItem('etiove_profile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const getOwnerFullName = () => {
    if (!isOwner()) return '';
    const local = getStoredProfileLocal();
    if (!local || typeof local !== 'object') return '';
    return [local.nombre, local.apellidos]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
  };

  const parseCsvList = (value) =>
    String(value || '')
      .split(',')
      .map((item) => String(item || '').trim())
      .filter(Boolean);

  const computeAchievementIds = (input) => {
    const stateLike = {
      xp: Number((input && input.xp) || 0),
      votesCount: Number((input && input.votesCount) || 0),
      photosCount: Number((input && input.photosCount) || 0),
      reviewsCount: Number((input && input.reviewsCount) || 0),
      favoritesMarkedCount: Number((input && input.favoritesMarkedCount) || 0),
      countriesRated: Array.isArray(input && input.countriesRated) ? input.countriesRated : [],
      specialOriginsTasted: Array.isArray(input && input.specialOriginsTasted)
        ? input.specialOriginsTasted
        : [],
    };
    const level = getLevelFromXp(stateLike.xp);
    const out = [];
    if (stateLike.votesCount >= 3) out.push('primera_cata');
    if (stateLike.photosCount >= 12) out.push('fotografo');
    if (stateLike.countriesRated.length >= 8) out.push('viajero');
    if (stateLike.votesCount >= 30) out.push('adicto');
    if (level.name === 'Maestro') out.push('maestro_catador');
    if (stateLike.favoritesMarkedCount >= 25) out.push('coleccionista');
    if (stateLike.reviewsCount >= 12) out.push('critico');
    if (stateLike.specialOriginsTasted.length >= 1) out.push('origen_unico');
    return out;
  };

  const fetchAuthPhotoUrl = async () => {
    if (!auth.token) return '';
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ idToken: auth.token }),
        }
      );
      if (!res.ok) return '';
      const json = await res.json();
      const user = Array.isArray(json.users) ? json.users[0] : null;
      return String((user && user.photoUrl) || '').trim();
    } catch {
      return '';
    }
  };

  const fetchPrivateProfileCandidates = async () => {
    if (!auth.token || !isOwner()) return [];
    const collections = ['usuarios', 'users', 'profiles', 'perfiles'];
    const docs = await Promise.all(
      collections.map((name) => getDocument(name, uid).catch(() => null))
    );
    return docs.filter(Boolean);
  };

  const resolvedProfileAvatar = () => {
    const fromProfile = readAvatarFromRecord(state.profile);
    if (fromProfile) return fromProfile;

    const authored = [...state.threads, ...state.replies, ...state.blogComments];
    const fromAuthored = authored
      .map((item) => readAvatarFromRecord(item))
      .find((value) => !!value);
    return String(fromAuthored || '').trim();
  };

  const syncOwnerProfileIfNeeded = async () => {
    if (!isOwner()) return;

    const currentAvatar = resolvedProfileAvatar();
    const currentMotto = String((state.profile && state.profile.motto) || '').trim();
    const currentName = String((state.profile && state.profile.displayName) || '').trim();
    if (currentAvatar && currentMotto && currentName) return;

    const local = getStoredProfileLocal();
    const privateDocs = await fetchPrivateProfileCandidates();
    const authPhotoUrl = await fetchAuthPhotoUrl();

    const fallbackAvatar = [
      currentAvatar,
      readAvatarFromRecord(local),
      ...privateDocs.map((doc) => readAvatarFromRecord(doc)),
      normalizeAvatarUrl(authPhotoUrl),
    ].find((value) => String(value || '').trim());

    const fallbackMotto =
      [
        currentMotto,
        readMottoFromRecord(local),
        ...privateDocs.map((doc) => readMottoFromRecord(doc)),
      ].find((value) => String(value || '').trim()) || '';

    const fallbackName =
      [
        currentName,
        readDisplayNameFromRecord(local),
        ...privateDocs.map((doc) => readDisplayNameFromRecord(doc)),
        getAuthorName(),
      ].find((value) => String(value || '').trim()) || 'Catador';

    if (!fallbackAvatar && !fallbackMotto && !fallbackName) return;

    const patch = {
      uid,
      updatedAt: new Date().toISOString(),
    };

    if (fallbackName) patch.displayName = fallbackName;
    if (fallbackMotto) patch.motto = fallbackMotto;
    if (fallbackAvatar) patch.avatarUrl = String(fallbackAvatar || '').trim();
    if (Object.keys(patch).length <= 2) return;

    const ok = await updateDocument('user_profiles', uid, patch);

    if (!ok) return;
    state.profile = await getDocument('user_profiles', uid);
  };

  const yearsSince = (dateText) => {
    const dt = new Date(dateText);
    if (Number.isNaN(dt.getTime())) return 'Miembro reciente';
    const diffYears = Math.max(
      0,
      Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    );
    if (diffYears === 0) return 'Miembro desde hace menos de 1 año';
    if (diffYears === 1) return 'Miembro desde hace 1 año';
    return `Miembro desde hace ${diffYears} años`;
  };

  const getAuthorName = () => {
    const names = [
      state.profile && state.profile.displayName,
      queryName,
      ...state.threads.map((item) => item.authorName),
      ...state.replies.map((item) => item.authorName),
      ...state.blogComments.map((item) => item.authorName),
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    return names[0] || 'Catador';
  };

  const collectDates = () => {
    const dates = [
      ...state.threads.map((item) => item.createdAt),
      ...state.replies.map((item) => item.createdAt),
      ...state.blogComments.map((item) => item.createdAt),
    ]
      .filter(Boolean)
      .map((text) => new Date(text))
      .filter((dt) => !Number.isNaN(dt.getTime()));
    dates.sort((a, b) => a - b);
    return dates;
  };

  const totalUpvotes = () => {
    const sumThreads = state.threads.reduce((acc, item) => acc + Number(item.upvotes || 0), 0);
    const sumReplies = state.replies.reduce((acc, item) => acc + Number(item.upvotes || 0), 0);
    const sumBlogUp = state.blogComments.reduce((acc, item) => acc + Number(item.upvotes || 0), 0);
    return sumThreads + sumReplies + sumBlogUp;
  };

  const totalDownvotes = () =>
    state.blogComments.reduce((acc, item) => acc + Number(item.downvotes || 0), 0);

  const countPhotos = () => {
    const authored = [...state.threads, ...state.replies, ...state.blogComments];
    return authored.reduce((acc, item) => {
      const hasPhoto = !!String(
        item.image || item.photoUrl || item.foto || item.authorPhoto || ''
      ).trim();
      return acc + (hasPhoto ? 1 : 0);
    }, 0);
  };

  const computeMemberStats = () => {
    const votesCount = totalUpvotes();
    const photosCount = countPhotos();
    const reviewsCount = state.blogComments.length;
    const cafesAddedCount = state.threads.length;
    const favoritesMarkedCount = state.followingCount;
    const xp =
      votesCount * XP_RULES.vote +
      photosCount * XP_RULES.photo +
      reviewsCount * XP_RULES.review +
      cafesAddedCount * XP_RULES.addCafe +
      favoritesMarkedCount * XP_RULES.favorite;
    return { votesCount, photosCount, reviewsCount, cafesAddedCount, favoritesMarkedCount, xp };
  };

  const resolveUnlockedAchievements = () => {
    const syncedIds = parseCsvList(state.profile && state.profile.achievementCsv);
    const ids = syncedIds.length
      ? syncedIds
      : computeAchievementIds({
          ...computeMemberStats(),
          countriesRated: parseCsvList(state.profile && state.profile.countriesRatedCsv),
          specialOriginsTasted: parseCsvList(state.profile && state.profile.specialOriginsCsv),
        });

    return ids.map((id) => ACHIEVEMENT_DEFS.find((item) => item.id === id)).filter(Boolean);
  };

  const getLevelFromXp = (xp) => {
    let current = LEVELS[0];
    LEVELS.forEach((level) => {
      if (xp >= level.minXp) current = level;
    });
    return current;
  };

  const renderHeader = () => {
    const aliasValue = getAuthorName();
    const ownerFullName = getOwnerFullName();
    const name = aliasValue;
    const aliasHandle = `@${String(aliasValue || 'catador')
      .replace(/^@+/, '')
      .trim()
      .replace(/\s+/g, '_')}`;
    const first = name.slice(0, 1).toUpperCase() || '?';
    const allDates = collectDates();
    const sinceText = allDates.length ? yearsSince(allDates[0].toISOString()) : 'Miembro reciente';
    const avatarUrl = resolvedProfileAvatar();
    const quote = String((state.profile && state.profile.motto) || '').trim();
    const quoteText = formatMottoForDisplay(quote) || (isOwner() ? 'Añade una frase breve' : '');
    const member = computeMemberStats();
    const unlockedAchievements = resolveUnlockedAchievements();
    const currentLevel = getLevelFromXp(member.xp);
    const nextLevel = LEVELS.find((level) => level.minXp > member.xp) || null;
    const levelStartXp = currentLevel.minXp;
    const levelRange = nextLevel
      ? Math.max(1, nextLevel.minXp - levelStartXp)
      : Math.max(1, member.xp);
    const progress = nextLevel
      ? Math.max(0, Math.min(100, ((member.xp - levelStartXp) / levelRange) * 100))
      : 100;

    if (el.avatar) {
      const paintInitial = () => {
        el.avatar.innerHTML = '';
        el.avatar.textContent = first;
      };

      if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = `Foto de ${name}`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        img.loading = 'eager';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.onerror = paintInitial;
        el.avatar.innerHTML = '';
        el.avatar.appendChild(img);
      } else {
        paintInitial();
      }
    }
    if (el.alias) {
      const VERIFIED_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-left:5px;flex-shrink:0;" aria-label="Email verificado" title="Email verificado"><circle cx="12" cy="12" r="12" fill="#1d9bf0"/><path d="M8.5 12.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      if (isOwner()) {
        // Owner: show alias + verified badge or verify button
        if (auth.emailVerified) {
          el.alias.innerHTML = esc(aliasHandle) + VERIFIED_SVG;
        } else {
          el.alias.innerHTML =
            esc(aliasHandle) +
            ` <button id="profileVerifyBtn" style="margin-left:7px;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:rgba(255,232,198,0.18);border:1px solid rgba(245,202,156,0.4);color:#f4dfc8;border-radius:6px;padding:2px 8px;cursor:pointer;font-family:inherit;vertical-align:middle;transition:all 0.2s;" title="Verifica tu email">Verificar</button>`;
          setTimeout(() => {
            const vBtn = document.getElementById('profileVerifyBtn');
            if (!vBtn) return;
            vBtn.addEventListener('click', async () => {
              vBtn.disabled = true;
              vBtn.textContent = 'Enviando...';
              try {
                const res = await fetch(
                  'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Ios-Bundle-Identifier': 'com.zarezfamily.etiove',
                    },
                    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: auth.token }),
                  }
                );
                if (res.ok) {
                  vBtn.textContent = '✔ Email enviado';
                } else {
                  vBtn.textContent = 'Error — reintenta';
                  vBtn.disabled = false;
                }
              } catch {
                vBtn.textContent = 'Error — reintenta';
                vBtn.disabled = false;
              }
            });
          }, 0);
        }
      } else {
        el.alias.textContent = aliasHandle;
      }
    }
    if (el.name) {
      el.name.textContent = isOwner() ? ownerFullName : '';
      el.name.style.display = isOwner() && ownerFullName ? '' : 'none';
    }
    if (el.since) el.since.textContent = sinceText;
    if (el.level) el.level.textContent = `${currentLevel.icon} ${currentLevel.name}`;
    if (el.xp) el.xp.textContent = `${member.xp} XP acumulados`;
    if (el.nextLevel)
      el.nextLevel.textContent = nextLevel
        ? `Próximo nivel: ${nextLevel.name}`
        : 'Nivel máximo alcanzado';
    if (el.nextXp) el.nextXp.textContent = nextLevel ? `${nextLevel.minXp} XP` : '';
    if (el.progressFill) el.progressFill.style.width = `${progress.toFixed(1)}%`;
    if (el.statVotes) el.statVotes.textContent = String(member.votesCount);
    if (el.statPhotos) el.statPhotos.textContent = String(member.photosCount);
    if (el.statPosts) el.statPosts.textContent = String(state.threads.length);
    if (el.statRepliesWritten) el.statRepliesWritten.textContent = String(state.replies.length);
    if (el.statReviews) el.statReviews.textContent = String(member.reviewsCount);
    if (el.statFavorites) el.statFavorites.textContent = String(member.favoritesMarkedCount);
    if (el.counters) {
      el.counters.innerHTML = `${state.threads.length} hilos <span>•</span> ${state.replies.length} respuestas <span>•</span> ${state.blogComments.length} comentarios`;
    }
    if (el.followers) {
      const suffix = state.followersCount === 1 ? 'seguidor' : 'seguidores';
      el.followers.textContent = `${state.followersCount} ${suffix}`;
    }
    if (el.achievements && el.achievementsMeta && el.achievementsGrid) {
      if (unlockedAchievements.length) {
        const selectedAchievement =
          unlockedAchievements.find((item) => item.id === state.selectedAchievementId) ||
          unlockedAchievements[0];
        state.selectedAchievementId = selectedAchievement.id;
        el.achievements.style.display = '';
        el.achievementsMeta.textContent = `${unlockedAchievements.length} insignias desbloqueadas`;
        el.achievementsGrid.innerHTML = unlockedAchievements
          .map(
            (item) => `
          <button class="achievement-chip${item.id === selectedAchievement.id ? ' active' : ''}" type="button" data-achievement-id="${esc(item.id)}" aria-pressed="${item.id === selectedAchievement.id ? 'true' : 'false'}" title="${esc(item.title)}">
            <span class="achievement-chip-icon">${esc(item.icon)}</span>
            <span class="achievement-chip-label">${esc(item.title)}</span>
          </button>
        `
          )
          .join('');
        const existingHint = el.achievements.querySelector('.profile-achievement-hint');
        if (existingHint) existingHint.remove();
        const hint = document.createElement('p');
        hint.className = 'profile-achievement-hint';
        hint.textContent = selectedAchievement.desc || '';
        el.achievements.appendChild(hint);
      } else {
        el.achievements.style.display = 'none';
        el.achievementsMeta.textContent = '';
        el.achievementsGrid.innerHTML = '';
        const existingHint = el.achievements.querySelector('.profile-achievement-hint');
        if (existingHint) existingHint.remove();
      }
    }
    if (el.quote) {
      el.quote.textContent = quoteText;
      el.quote.style.display = quoteText ? '' : 'none';
      el.quote.classList.toggle('editable', isOwner());
      el.quote.classList.toggle('placeholder', !formatMottoForDisplay(quote));
      el.quote.setAttribute('role', isOwner() ? 'button' : 'note');
      el.quote.setAttribute('tabindex', isOwner() ? '0' : '-1');
      el.quote.setAttribute('aria-label', isOwner() ? 'Editar frase de perfil' : 'Frase de perfil');
    }
    document.title = `${name} | Perfil Etiove`;
  };

  const renderButtons = () => {
    if (el.actions) el.actions.style.display = isOwner() ? 'none' : 'flex';

    if (el.avatar) {
      el.avatar.classList.toggle('editable', isOwner());
      el.avatar.setAttribute('role', isOwner() ? 'button' : 'img');
      el.avatar.setAttribute('tabindex', isOwner() ? '0' : '-1');
      el.avatar.setAttribute('aria-label', isOwner() ? 'Cambiar foto de perfil' : 'Foto de perfil');
    }
    if (el.avatarBadge) {
      el.avatarBadge.style.display = isOwner() ? 'inline-flex' : 'none';
    }

    if (el.followBtn) {
      if (!auth.uid) {
        el.followBtn.style.display = '';
        el.followBtn.textContent = 'Inicia sesión para seguir';
        el.followBtn.disabled = true;
      } else if (isOwner()) {
        el.followBtn.style.display = 'none';
        el.followBtn.textContent = 'Este es tu perfil';
        el.followBtn.disabled = true;
      } else {
        el.followBtn.style.display = '';
        el.followBtn.disabled = false;
        el.followBtn.textContent = state.isFollowing ? 'Siguiendo' : 'Seguir';
      }
    }

    if (el.dmBtn) {
      if (!auth.uid || isOwner()) {
        el.dmBtn.style.display = isOwner() ? 'none' : '';
        el.dmBtn.disabled = true;
        el.dmBtn.textContent = isOwner() ? 'No puedes escribirte' : 'Inicia sesión para escribir';
      } else {
        el.dmBtn.style.display = '';
        el.dmBtn.disabled = false;
        el.dmBtn.textContent = 'Mensaje directo';
      }
    }
  };

  const refreshFollowState = () => {
    state.followersCount = state.follows.filter((row) => row.targetUid === uid).length;
    state.followingCount = state.follows.filter((row) => row.followerUid === uid).length;
    state.isFollowing =
      !!auth.uid &&
      state.follows.some((row) => row.targetUid === uid && row.followerUid === auth.uid);
  };

  const profileMap = () => {
    const map = new Map();
    state.profiles.forEach((profile) => {
      if (profile && profile.uid) map.set(profile.uid, profile);
    });
    return map;
  };

  const ensureProfilesLoaded = async () => {
    if (state.profilesLoaded) return state.profiles;

    if (Array.isArray(resolvedProfilesCache) && resolvedProfilesCache.length) {
      state.profiles = resolvedProfilesCache;
      state.profilesLoaded = true;
      return state.profiles;
    }

    state.profiles = await getCollection('user_profiles', 2000);
    state.profilesLoaded = true;
    return state.profiles;
  };

  const ensureMessagesLoaded = async () => {
    if (state.messagesLoaded) return state.messages;
    state.messages = auth.uid ? await getCollection('direct_messages', 4000) : [];
    state.messagesLoaded = true;
    updateUnreadBadge(state.messages);
    return state.messages;
  };

  const userNameByUid = (targetUid) => {
    if (!targetUid) return 'Usuario';
    if (targetUid === uid) return getAuthorName();
    const map = profileMap();
    const hit = map.get(targetUid);
    if (hit && hit.displayName) return String(hit.displayName);
    const fromForum =
      state.threads.find((item) => item.authorUid === targetUid) ||
      state.replies.find((item) => item.authorUid === targetUid) ||
      state.blogComments.find((item) => item.authorUid === targetUid);
    if (fromForum && fromForum.authorName) return String(fromForum.authorName);
    return queryName || 'Catador';
  };

  const avatarByUid = (targetUid) => {
    const map = profileMap();
    const hit = map.get(targetUid);
    return readAvatarFromRecord(hit);
  };

  const openProfile = (targetUid, name) => {
    const safeUid = String(targetUid || '').trim();
    if (!safeUid) return;
    const safeAlias = String(name || '')
      .trim()
      .replace(/^@+/, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    const slug = safeAlias || safeUid;
    window.location.href = `/perfil/@${encodeURIComponent(slug)}`;
  };

  const renderEmpty = (message) => {
    if (!el.content) return;
    el.content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">☕</div>
        <p class="empty-state-text">${esc(message)}</p>
      </div>`;
  };

  const renderActivity = () => {
    const mixed = [
      ...state.threads.map((item) => ({
        type: 'hilo',
        title: item.title || 'Sin titulo',
        body: item.body || '',
        createdAt: item.createdAt,
        emoji: '💬',
      })),
      ...state.replies.map((item) => ({
        type: 'respuesta',
        title: 'Ha respondido en el foro',
        body: item.body || '',
        createdAt: item.createdAt,
        emoji: '☕',
      })),
      ...state.blogComments.map((item) => ({
        type: 'comentario',
        title: `Comentario en ${item.postSlug || 'blog'}`,
        body: item.body || '',
        createdAt: item.createdAt,
        emoji: '📝',
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!mixed.length) {
      renderEmpty('Este perfil aun no tiene actividad publica.');
      return;
    }

    const PAGE_SIZE = 20;
    let actPage = 0;
    const renderActivityPage = () => {
      const page = mixed.slice(0, (actPage + 1) * PAGE_SIZE);
      const hasMore = page.length < mixed.length;
      el.content.innerHTML =
        page
          .map((item) => {
            const typeClass =
              item.type === 'hilo' ? 'hilo' : item.type === 'respuesta' ? 'reply' : 'blog';
            const typeLabel =
              item.type === 'hilo'
                ? 'Hilo'
                : item.type === 'respuesta'
                  ? 'Respuesta'
                  : 'Comentario';
            return `
      <article class="post-card">
        <div class="post-icon">${item.emoji}</div>
        <div class="post-body">
          <div class="post-meta">
            <span class="post-type-pill ${typeClass}">${typeLabel}</span>
            <span class="post-date">${esc(fmtDate(item.createdAt))}</span>
          </div>
          <p class="post-title">${esc(item.title)}</p>
          ${item.body ? `<p class="post-body-text">${esc(item.body)}</p>` : ''}
        </div>
      </article>`;
          })
          .join('') +
        (hasMore
          ? `<div style="text-align:center;padding:20px 0;"><button class="mini-btn" id="actLoadMore" style="padding:10px 24px;font-size:13px;">Ver más</button></div>`
          : '');
      const loadMoreBtn = document.getElementById('actLoadMore');
      if (loadMoreBtn)
        loadMoreBtn.addEventListener('click', () => {
          actPage++;
          renderActivityPage();
        });
    };
    renderActivityPage();
  };

  const renderThreadList = () => {
    if (!state.threads.length) {
      renderEmpty('No hay hilos publicados por este usuario.');
      return;
    }

    el.content.innerHTML = state.threads
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(
        (item) => `
        <article class="post-card">
          <div class="post-icon">💬</div>
          <div class="post-body">
            <div class="post-meta">
              <span class="post-type-pill hilo">Hilo</span>
              <span class="post-date">${esc(fmtDate(item.createdAt))}</span>
            </div>
            <p class="post-title">${esc(item.title || 'Sin título')}</p>
            ${item.body ? `<p class="post-body-text">${esc(short(item.body, 220))}</p>` : ''}
          </div>
        </article>
      `
      )
      .join('');
  };

  const renderReplyList = () => {
    if (!state.replies.length) {
      renderEmpty('No hay respuestas de foro para este usuario.');
      return;
    }

    el.content.innerHTML = state.replies
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(
        (item) => `
        <article class="post-card">
          <div class="post-icon">☕</div>
          <div class="post-body">
            <div class="post-meta">
              <span class="post-type-pill reply">Respuesta</span>
              <span class="post-date">${esc(fmtDate(item.createdAt))}</span>
            </div>
            <p class="post-body-text" style="-webkit-line-clamp:4;">${esc(short(item.body, 260))}</p>
          </div>
        </article>
      `
      )
      .join('');
  };

  const renderBlogList = () => {
    if (!state.blogComments.length) {
      renderEmpty('No hay comentarios de blog para este usuario.');
      return;
    }

    el.content.innerHTML = state.blogComments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(
        (item) => `
        <article class="post-card">
          <div class="post-icon">📝</div>
          <div class="post-body">
            <div class="post-meta">
              <span class="post-type-pill blog">Blog</span>
              ${item.postSlug ? `<span class="post-date">${esc(item.postSlug)}</span>` : ''}
              <span class="post-date">${esc(fmtDate(item.createdAt))}</span>
            </div>
            <p class="post-body-text" style="-webkit-line-clamp:4;">${esc(short(item.body, 260))}</p>
          </div>
        </article>
      `
      )
      .join('');
  };

  const renderStats = () => {
    const firstDate = collectDates()[0];
    const memberFor = firstDate ? yearsSince(firstDate.toISOString()) : 'Sin actividad';

    el.content.innerHTML = `
      <div class="stats-grid">
        <article class="stat-card"><p class="stat-label">Hilos</p><p class="stat-value">${state.threads.length}</p></article>
        <article class="stat-card"><p class="stat-label">Respuestas</p><p class="stat-value">${state.replies.length}</p></article>
        <article class="stat-card"><p class="stat-label">Comentarios</p><p class="stat-value">${state.blogComments.length}</p></article>
        <article class="stat-card"><p class="stat-label">Votos recibidos</p><p class="stat-value">${totalUpvotes()}</p></article>
        <article class="stat-card"><p class="stat-label">Seguidores</p><p class="stat-value">${state.followersCount}</p></article>
        <article class="stat-card"><p class="stat-label">Siguiendo</p><p class="stat-value">${state.followingCount}</p></article>
        <article class="stat-card" style="grid-column:span 2;"><p class="stat-label">Antigüedad</p><p class="stat-value small">${esc(memberFor)}</p></article>
      </div>
    `;
  };

  const renderFollowers = () => {
    const incoming = state.follows.filter((row) => row.targetUid === uid);
    if (!state.profilesLoaded) {
      renderEmpty('Cargando seguidores...');
      ensureProfilesLoaded()
        .then(() => renderFollowers())
        .catch(() => {
          renderEmpty('No se pudieron cargar los seguidores.');
        });
      return;
    }
    if (!incoming.length) {
      renderEmpty('Este perfil aun no tiene seguidores.');
      return;
    }

    el.content.innerHTML = incoming
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((row) => {
        const name = userNameByUid(row.followerUid);
        const avatar = avatarByUid(row.followerUid);
        const initial = (name || '?').slice(0, 1).toUpperCase();
        return `
          <article class="people-card">
            <div class="people-avatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}" />` : esc(initial)}</div>
            <div class="people-info">
              <p class="people-name">${esc(name)}</p>
              <p class="people-since">Seguidor desde ${esc(fmtDate(row.createdAt))}</p>
            </div>
            <button class="mini-btn" type="button" data-open-profile="${esc(row.followerUid)}" data-open-name="${esc(name)}">Ver perfil</button>
          </article>
        `;
      })
      .join('');
  };

  const renderFollowing = () => {
    const outgoing = state.follows.filter((row) => row.followerUid === uid);
    if (!state.profilesLoaded) {
      renderEmpty('Cargando seguidos...');
      ensureProfilesLoaded()
        .then(() => renderFollowing())
        .catch(() => {
          renderEmpty('No se pudieron cargar los seguidos.');
        });
      return;
    }
    if (!outgoing.length) {
      renderEmpty('Este perfil aun no sigue a nadie.');
      return;
    }

    el.content.innerHTML = outgoing
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((row) => {
        const name = userNameByUid(row.targetUid);
        const avatar = avatarByUid(row.targetUid);
        const initial = (name || '?').slice(0, 1).toUpperCase();
        return `
          <article class="people-card">
            <div class="people-avatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}" />` : esc(initial)}</div>
            <div class="people-info">
              <p class="people-name">${esc(name)}</p>
              <p class="people-since">Siguiendo desde ${esc(fmtDate(row.createdAt))}</p>
            </div>
            <button class="mini-btn" type="button" data-open-profile="${esc(row.targetUid)}" data-open-name="${esc(name)}">Ver perfil</button>
          </article>
        `;
      })
      .join('');
  };

  // ─── BADGE DE MENSAJES NO LEÍDOS ─────────────────────────────────────────
  const updateUnreadBadge = (messages) => {
    if (!auth.uid || !isOwner()) return;
    const unread = messages.filter((m) => m.recipientUid === auth.uid && !m.read).length;
    const tab = el.tabs.find((b) => b.getAttribute('data-tab') === 'messages');
    if (!tab) return;

    let badge = tab.querySelector('.tab-unread-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tab-unread-badge';
      badge.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'min-width:16px',
        'height:16px',
        'background:#c0392b',
        'color:#fff',
        'font-size:9px',
        'font-weight:700',
        'border-radius:8px',
        'padding:0 4px',
        'margin-left:5px',
        'font-family:-apple-system,sans-serif',
        'vertical-align:middle',
        'letter-spacing:0',
      ].join(';');
      tab.appendChild(badge);
    }

    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  };

  // Mark messages as read when user opens the messages tab
  const markMessagesAsRead = async () => {
    if (!auth.uid || !isOwner()) return;
    const unreadMsgs = state.messages.filter((m) => m.recipientUid === auth.uid && !m.read);
    if (!unreadMsgs.length) return;

    // Optimistic update
    unreadMsgs.forEach((m) => {
      m.read = true;
    });
    updateUnreadBadge(state.messages);

    // Persist to Firestore (fire and forget)
    await Promise.allSettled(
      unreadMsgs.map((m) => updateDocument('direct_messages', m.id, { read: true }))
    );
  };

  const renderMessages = () => {
    if (!auth.uid) {
      renderEmpty('Inicia sesión para ver y responder mensajes.');
      return;
    }

    if (!state.messagesLoaded) {
      renderEmpty('Cargando mensajes...');
      ensureMessagesLoaded()
        .then(() => renderMessages())
        .catch(() => {
          renderEmpty('No se pudieron cargar los mensajes.');
        });
      return;
    }

    const rows = isOwner()
      ? state.messages.filter((row) => row.senderUid === auth.uid || row.recipientUid === auth.uid)
      : state.messages.filter((row) => {
          const meAndProfile = row.senderUid === auth.uid && row.recipientUid === uid;
          const profileAndMe = row.senderUid === uid && row.recipientUid === auth.uid;
          return meAndProfile || profileAndMe;
        });

    if (!rows.length) {
      renderEmpty('No hay mensajes en esta vista.');
      return;
    }

    const MSG_PAGE = 30;
    let msgPage = 0;
    const renderMsgPage = () => {
      const sorted = rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const page = sorted.slice(0, (msgPage + 1) * MSG_PAGE);
      const hasMoreMsgs = page.length < sorted.length;
      el.content.innerHTML =
        page
          .map((row) => {
            const mine = row.senderUid === auth.uid;
            const isUnread = !mine && !row.read;
            const otherUid = mine ? row.recipientUid : row.senderUid;
            const otherName = mine
              ? row.recipientName || userNameByUid(otherUid)
              : row.senderName || userNameByUid(otherUid);
            return `
          <article class="msg-card${isUnread ? ' msg-unread' : ''}">
            <div class="msg-direction">
              <div class="msg-arrow ${mine ? 'out' : 'in'}">${mine ? '↗' : '↘'}</div>
              <span class="msg-who">${mine ? 'Para' : 'De'} ${esc(otherName)}</span>
              <span class="msg-date">${esc(fmtDate(row.createdAt))}</span>
            </div>
            <p class="msg-text">${esc(short(row.body || '', 400))}</p>
            <div class="msg-footer">
              <button class="mini-btn" type="button" data-reply-dm="${esc(otherUid)}" data-reply-name="${esc(otherName)}">Responder</button>
              <button class="mini-btn" type="button" data-open-profile="${esc(otherUid)}" data-open-name="${esc(otherName)}">Ver perfil</button>
            </div>
          </article>
        `;
          })
          .join('') +
        (hasMoreMsgs
          ? `<div style="text-align:center;padding:20px 0;"><button class="mini-btn" id="msgLoadMore" style="padding:10px 24px;font-size:13px;">Ver más mensajes</button></div>`
          : '');
      const lmBtn = document.getElementById('msgLoadMore');
      if (lmBtn)
        lmBtn.addEventListener('click', () => {
          msgPage++;
          renderMsgPage();
        });
      // Re-wire DM reply buttons
      el.content.querySelectorAll('[data-reply-dm]').forEach((btn) => {
        btn.addEventListener('click', () =>
          replyDirectMessage(btn.dataset.replyDm, btn.dataset.replyName)
        );
      });
      el.content.querySelectorAll('[data-open-profile]').forEach((btn) => {
        btn.addEventListener('click', () =>
          openProfile(btn.dataset.openProfile, btn.dataset.openName)
        );
      });
    };
    renderMsgPage();
  };

  // ─── SCHEMA PERSON (SEO dinámico) ────────────────────────────────────────
  const injectPersonSchema = (profile, displayName) => {
    const existing = document.getElementById('personSchemaTag');
    if (existing) existing.remove();

    if (!uid || !displayName) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: displayName,
      url: `https://etiove.com/perfil/@${encodeURIComponent(queryName || uid)}`,
      description: `Perfil de ${displayName} en la comunidad Etiove de café de especialidad.`,
      memberOf: {
        '@type': 'Organization',
        name: 'Etiove',
        url: 'https://etiove.com',
      },
    };

    if (profile && (profile.photoURL || profile.avatarUrl)) {
      schema.image = profile.photoURL || profile.avatarUrl;
    }

    const tag = document.createElement('script');
    tag.id = 'personSchemaTag';
    tag.type = 'application/ld+json';
    tag.textContent = JSON.stringify(schema);
    document.head.appendChild(tag);
  };

  const renderTab = (tabName) => {
    if (!el.tabs.length) return;
    setHashForTab(tabName);
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
    if (tabName === 'followers') {
      renderFollowers();
      return;
    }
    if (tabName === 'following') {
      renderFollowing();
      return;
    }
    if (tabName === 'messages') {
      renderMessages();
      markMessagesAsRead();
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

  const handleFollowToggle = async () => {
    if (!auth.uid || isOwner()) return;

    el.followBtn.disabled = true;
    setStatus(state.isFollowing ? 'Quitando seguimiento...' : 'Guardando seguimiento...');

    const existing = state.follows.find(
      (row) => row.targetUid === uid && row.followerUid === auth.uid
    );
    let ok = false;
    if (existing) {
      ok = await deleteDocument('profile_follows', existing.id);
    } else {
      ok = await addDocument('profile_follows', {
        targetUid: uid,
        followerUid: auth.uid,
        createdAt: new Date().toISOString(),
      });
    }

    if (!ok) {
      setStatus('No se pudo actualizar el seguimiento.');
      renderButtons();
      return;
    }

    state.follows = await getCollection('profile_follows', 4000);
    refreshFollowState();
    renderHeader();
    renderButtons();
    setStatus(state.isFollowing ? 'Ahora sigues a este usuario.' : 'Ya no sigues a este usuario.');
  };

  // ─── INLINE MODAL (reemplaza window.prompt) ───────────────────────────────
  const showInlineModal = ({
    title,
    placeholder,
    initialValue = '',
    maxLength = 600,
    onConfirm,
  }) => {
    // Remove any existing modal
    const existing = document.getElementById('profileInlineModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'profileInlineModal';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:10000',
      'background:rgba(28,18,13,0.55)',
      'backdrop-filter:blur(4px)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:24px',
    ].join(';');

    overlay.innerHTML = `
      <div style="background:#fdf8f1;border-radius:16px;padding:28px 24px;max-width:440px;width:100%;box-shadow:0 24px 64px rgba(28,18,13,0.22);">
        <p style="font-family:'Playfair Display',serif;font-size:18px;font-weight:500;color:#1c120d;margin-bottom:16px;">${title}</p>
        <textarea id="profileModalInput"
          maxlength="${maxLength}"
          placeholder="${placeholder}"
          style="width:100%;min-height:90px;resize:vertical;border:1px solid #deccb6;border-radius:10px;padding:10px 14px;font-size:14px;font-family:inherit;background:#fff;color:#1c120d;line-height:1.6;"
        >${initialValue}</textarea>
        <p id="profileModalCounter" style="font-size:11px;color:#9a7963;text-align:right;margin-top:4px;font-family:-apple-system,sans-serif;">
          ${initialValue.length} / ${maxLength}
        </p>
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
          <button id="profileModalCancel"
            style="background:transparent;border:1px solid #deccb6;border-radius:8px;padding:9px 20px;font-size:13px;font-weight:600;color:#5d4030;cursor:pointer;font-family:inherit;">
            Cancelar
          </button>
          <button id="profileModalConfirm"
            style="background:#1c120d;border:none;border-radius:8px;padding:9px 20px;font-size:13px;font-weight:700;color:#fff9f1;cursor:pointer;font-family:inherit;">
            Enviar
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#profileModalInput');
    const counter = overlay.querySelector('#profileModalCounter');
    const cancelBtn = overlay.querySelector('#profileModalCancel');
    const confirmBtn = overlay.querySelector('#profileModalConfirm');

    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);

    input.addEventListener('input', () => {
      counter.textContent = `${input.value.length} / ${maxLength}`;
    });

    const close = () => overlay.remove();

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', esc);
      }
    });

    // Focus trap
    const focusEls = [input, cancelBtn, confirmBtn].filter(Boolean);
    const firstEl = focusEls[0],
      lastEl = focusEls[focusEls.length - 1];
    overlay.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    });

    confirmBtn.addEventListener('click', () => {
      const val = input.value.trim();
      close();
      onConfirm(val);
    });
  };

  const handleSendDirectMessage = () => {
    if (!auth.uid || isOwner()) return;
    showInlineModal({
      title: 'Mensaje directo',
      placeholder: 'Escribe tu mensaje...',
      maxLength: 600,
      onConfirm: async (body) => {
        if (!body || body.length < 2) {
          setStatus('El mensaje es demasiado corto.');
          return;
        }
        setStatus('Enviando mensaje...');
        const ok = await addDocument('direct_messages', {
          senderUid: auth.uid,
          senderName: String(localStorage.getItem('etiove_web_alias') || 'Catador'),
          recipientUid: uid,
          recipientName: getAuthorName(),
          body,
          createdAt: new Date().toISOString(),
          read: false,
        });

        if (!ok) {
          setStatus('No se pudo enviar el mensaje.');
          return;
        }
        state.messages = await getCollection('direct_messages', 4000);
        if (
          el.tabs.some(
            (btn) => btn.classList.contains('active') && btn.getAttribute('data-tab') === 'messages'
          )
        ) {
          renderMessages();
        }
        setStatus('Mensaje directo enviado.');
      },
    });
  };

  const replyDirectMessage = async (targetUid, targetName) => {
    if (!auth.uid) {
      setStatus('Inicia sesión para responder mensajes.');
      return;
    }

    const safeTargetUid = String(targetUid || '').trim();
    if (!safeTargetUid) return;

    showInlineModal({
      title: `Responder a ${targetName || 'usuario'}`,
      placeholder: 'Escribe tu respuesta...',
      maxLength: 600,
      onConfirm: async (body) => {
        if (!body || body.length < 2) {
          setStatus('El mensaje es demasiado corto.');
          return;
        }
        const ok = await addDocument('direct_messages', {
          senderUid: auth.uid,
          senderName: String(localStorage.getItem('etiove_web_alias') || 'Catador'),
          recipientUid: safeTargetUid,
          recipientName: String(targetName || userNameByUid(safeTargetUid) || 'Catador'),
          body,
          createdAt: new Date().toISOString(),
          read: false,
        });
        if (!ok) {
          setStatus('No se pudo enviar la respuesta.');
          return;
        }
        state.messages = await getCollection('direct_messages', 4000);
        renderMessages();
        setStatus('Respuesta enviada.');
      },
    });
  };

  const handleEditQuote = () => {
    if (!isOwner()) return;
    const current = formatMottoForDisplay(
      String((state.profile && state.profile.motto) || '').trim()
    );
    showInlineModal({
      title: 'Tu frase de perfil',
      placeholder: 'Una frase que te defina como catador...',
      initialValue: current,
      maxLength: 200,
      onConfirm: async (motto) => {
        const ok = await updateDocument('user_profiles', uid, {
          uid,
          displayName: getAuthorName(),
          avatarUrl: resolvedProfileAvatar(),
          motto,
          updatedAt: new Date().toISOString(),
        });

        if (!ok) {
          setStatus('No se pudo guardar la frase.');
          return;
        }

        state.profile = await getDocument('user_profiles', uid);
        renderHeader();
        setStatus(motto ? 'Frase actualizada.' : 'Frase eliminada.');
      },
    });
  };

  const handlePhotoSelected = async (event) => {
    if (!isOwner()) return;
    const file =
      event.target && event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (!file) return;

    setStatus('Subiendo foto...');
    try {
      const avatarUrl = await uploadAvatar(file);
      const ok = await updateDocument('user_profiles', uid, {
        uid,
        displayName: getAuthorName(),
        avatarUrl,
        motto: String((state.profile && state.profile.motto) || '').trim(),
        updatedAt: new Date().toISOString(),
      });

      if (!ok) {
        setStatus('No se pudo guardar la foto.');
        return;
      }

      state.profile = await getDocument('user_profiles', uid);
      renderHeader();
      setStatus('Foto de perfil actualizada.');
    } catch {
      setStatus('No se pudo subir la foto.');
    } finally {
      if (el.photoInput) el.photoInput.value = '';
    }
  };

  const attachActionEvents = () => {
    if (el.followBtn) el.followBtn.addEventListener('click', handleFollowToggle);
    if (el.dmBtn) el.dmBtn.addEventListener('click', handleSendDirectMessage);
    if (el.avatar && el.photoInput) {
      const openPicker = () => {
        if (!isOwner()) return;
        el.photoInput.click();
      };
      el.avatar.addEventListener('click', openPicker);
      el.avatar.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPicker();
        }
      });
      el.photoInput.addEventListener('change', handlePhotoSelected);
    }
    if (el.quote) {
      el.quote.addEventListener('click', () => {
        if (!isOwner()) return;
        handleEditQuote();
      });
      el.quote.addEventListener('keydown', (event) => {
        if (!isOwner()) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleEditQuote();
        }
      });
    }
    if (el.achievementsGrid) {
      el.achievementsGrid.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-achievement-id]');
        if (!chip) return;
        state.selectedAchievementId = String(chip.getAttribute('data-achievement-id') || '').trim();
        renderHeader();
      });
    }

    if (el.content) {
      el.content.addEventListener('click', (event) => {
        const openBtn = event.target.closest('[data-open-profile]');
        if (openBtn) {
          openProfile(
            openBtn.getAttribute('data-open-profile'),
            openBtn.getAttribute('data-open-name')
          );
          return;
        }

        const replyBtn = event.target.closest('[data-reply-dm]');
        if (replyBtn) {
          replyDirectMessage(
            replyBtn.getAttribute('data-reply-dm'),
            replyBtn.getAttribute('data-reply-name')
          );
        }
      });
    }
  };

  const setupScrollTop = () => {
    if (!el.scrollTopBtn) return;
    const sync = () => {
      el.scrollTopBtn.classList.toggle('visible', window.scrollY > 320);
    };
    window.addEventListener('scroll', sync);
    el.scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    sync();
  };

  const init = async () => {
    // Wire up navigation immediately — tabs and scroll work regardless of data load result
    attachTabEvents();
    setupScrollTop();

    if (!uid && !pathAlias) {
      if (!el.content) {
        window.location.replace('/comunidad.html');
        return;
      }
      el.content.innerHTML = `
        <div class="empty-state" style="padding:48px 24px;text-align:center;">
          <div class="empty-state-icon" style="font-size:40px;margin-bottom:16px;">☕</div>
          <p style="font-family:'Playfair Display',serif;font-size:22px;font-weight:500;color:#1c120d;margin-bottom:10px;">Perfil no encontrado</p>
          <p style="font-size:15px;color:#5d4030;margin-bottom:24px;line-height:1.6;">Para ver un perfil, pulsa sobre el alias de cualquier miembro en la comunidad o el blog.</p>
          <a href="/comunidad.html" style="display:inline-flex;align-items:center;gap:8px;background:#1c120d;color:#fff9f1;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:700;font-family:-apple-system,sans-serif;letter-spacing:1px;text-transform:uppercase;">
            Ir a la comunidad
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>`;
      return;
    }

    try {
      // ── Resolver uid desde alias si viene de URL limpia /perfil/@alias ──
      if (!uid && pathAlias) {
        const normAlias = (v) =>
          String(v || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
        const needle = normAlias(pathAlias);
        const profiles = await getCollection('user_profiles', 2000);
        resolvedProfilesCache = profiles;
        const hit =
          profiles.find((p) =>
            [p.displayName, p.alias, p.nickname].some((v) => normAlias(v) === needle)
          ) || profiles.find((p) => String(p.uid || '').trim() === pathAlias);
        if (hit && hit.uid) uid = String(hit.uid).trim();
      }

      const [threads, replies, blogComments, follows, profile] = await Promise.all([
        getCollection('foro_hilos', 1200),
        getCollection('foro_respuestas', 2000),
        getCollection('blog_comentarios', 2000),
        getCollection('profile_follows', 4000),
        getDocument('user_profiles', uid),
      ]);

      state.threads = threads.filter((item) => item.authorUid === uid);
      state.replies = replies.filter((item) => item.authorUid === uid);
      state.blogComments = blogComments.filter((item) => item.authorUid === uid);
      state.follows = follows;
      state.profile = profile;

      const pName = state.profile
        ? String(state.profile.displayName || state.profile.alias || queryName || '').trim()
        : String(queryName || '').trim();
      if (pName) injectPersonSchema(state.profile, pName);
      if (Array.isArray(resolvedProfilesCache) && resolvedProfilesCache.length) {
        state.profiles = resolvedProfilesCache;
        state.profilesLoaded = true;
      }

      await syncOwnerProfileIfNeeded();

      refreshFollowState();
      renderHeader();
      attachActionEvents();
      renderButtons();
      state.loaded = true;
      try {
        const initialTab = getTabFromHash() || 'activity';
        renderTab(initialTab);
      } catch {
        renderEmpty('No hay actividad para mostrar.');
      }
    } catch {
      renderEmpty('No se pudieron cargar los datos de este perfil.');
    }
  };

  init();
})();
