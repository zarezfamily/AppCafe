(() => {
  const FIREBASE_PROJECT_ID = 'miappdecafe';
  const FIREBASE_API_KEY = 'AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24';
  const FIREBASE_IOS_BUNDLE_ID = 'com.zarezfamily.etiove';
  const BASE_URL = `https://europe-west1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const FIREBASE_STORAGE_BUCKET = `${FIREBASE_PROJECT_ID}.appspot.com`;

  const params = new URLSearchParams(window.location.search);
  const requestedUid = String(params.get('uid') || '').trim();
  const requestedName = String(params.get('name') || '').trim();

  const auth = {
    uid: localStorage.getItem('etiove_web_uid') || '',
    email: localStorage.getItem('etiove_web_email') || '',
    token: localStorage.getItem('etiove_web_token') || '',
  };

  const uid = requestedUid || auth.uid || '';
  const queryName = requestedName || String(localStorage.getItem('etiove_web_alias') || '').trim();

  if (!requestedUid && uid) {
    const desiredSearch = `?uid=${encodeURIComponent(uid)}${queryName ? `&name=${encodeURIComponent(queryName)}` : ''}`;
    const nextUrl = `/perfil/${desiredSearch}`;
    if (window.location.pathname !== '/perfil/' || window.location.search !== desiredSearch) {
      window.history.replaceState(null, '', nextUrl);
    }
  }

  const state = {
    threads: [],
    replies: [],
    blogComments: [],
    follows: [],
    messages: [],
    profiles: [],
    profile: null,
    isFollowing: false,
    followersCount: 0,
    followingCount: 0,
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
    statReviews: document.getElementById('statReviews'),
    statFavorites: document.getElementById('statFavorites'),
    since: document.getElementById('profileSince'),
    counters: document.getElementById('profileCounters'),
    followers: document.getElementById('profileFollowers'),
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

  const normalizeName = (value) => String(value || '')
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
    const res = await fetch(`${BASE_URL}/${name}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}`, {
      headers: authedHeaders(),
    });
    if (res.status === 404 || !res.ok) return [];
    const json = await res.json();
    return (json.documents || []).map((doc) => docToObject(doc));
  };

  const toFirestoreValue = (val) => {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'number') return Number.isInteger(val)
      ? { integerValue: String(val) }
      : { doubleValue: val };
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
    const query = new URLSearchParams({ key: FIREBASE_API_KEY });
    Object.keys(data).forEach((field) => query.append('updateMask.fieldPaths', field));
    const res = await fetch(`${BASE_URL}/${name}/${id}?${query.toString()}`, {
      method: 'PATCH',
      headers: authedHeaders(),
      body: JSON.stringify(toFields(data)),
    });
    return res.ok;
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
    const res = await fetch(`${BASE_URL}/${name}/${id}?key=${FIREBASE_API_KEY}`, {
      headers: authedHeaders(),
    });
    if (res.status === 404 || !res.ok) return null;
    const json = await res.json();
    return docToObject(json);
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

  const readDisplayNameFromRecord = (record) => {
    if (!record || typeof record !== 'object') return '';
    const candidates = [record.displayName, record.alias, record.authorName, record.nombre, record.nickname];
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

  const fetchAuthPhotoUrl = async () => {
    if (!auth.token) return '';
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ idToken: auth.token }),
      });
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
    const docs = await Promise.all(collections.map((name) => getDocument(name, uid).catch(() => null)));
    return docs.filter(Boolean);
  };

  const resolvedProfileAvatar = () => {
    const fromProfile = readAvatarFromRecord(state.profile);
    if (fromProfile) return fromProfile;

    const authored = [
      ...state.threads,
      ...state.replies,
      ...state.blogComments,
    ];
    const fromAuthored = authored
      .map((item) => readAvatarFromRecord(item))
      .find((value) => !!value);
    return String(fromAuthored || '').trim();
  };

  const syncOwnerProfileIfNeeded = async () => {
    if (!isOwner()) return;

    const currentAvatar = resolvedProfileAvatar();
    const currentMotto = String(state.profile && state.profile.motto || '').trim();
    const currentName = String(state.profile && state.profile.displayName || '').trim();
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

    const fallbackMotto = [
      currentMotto,
      readMottoFromRecord(local),
      ...privateDocs.map((doc) => readMottoFromRecord(doc)),
    ].find((value) => String(value || '').trim()) || '';

    const fallbackName = [
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
    const diffYears = Math.max(0, Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
    if (diffYears === 0) return 'Miembro desde hace menos de 1 ano';
    if (diffYears === 1) return 'Miembro desde hace 1 ano';
    return `Miembro desde hace ${diffYears} anos`;
  };

  const getAuthorName = () => {
    const names = [
      state.profile && state.profile.displayName,
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

  const countPhotos = () => {
    const authored = [...state.threads, ...state.replies, ...state.blogComments];
    return authored.reduce((acc, item) => {
      const hasPhoto = !!String(item.image || item.photoUrl || item.foto || item.authorPhoto || '').trim();
      return acc + (hasPhoto ? 1 : 0);
    }, 0);
  };

  const computeMemberStats = () => {
    const votesCount = totalUpvotes();
    const photosCount = countPhotos();
    const reviewsCount = state.blogComments.length;
    const cafesAddedCount = state.threads.length;
    const favoritesMarkedCount = state.followingCount;
    const xp = (
      votesCount * XP_RULES.vote +
      photosCount * XP_RULES.photo +
      reviewsCount * XP_RULES.review +
      cafesAddedCount * XP_RULES.addCafe +
      favoritesMarkedCount * XP_RULES.favorite
    );
    return { votesCount, photosCount, reviewsCount, cafesAddedCount, favoritesMarkedCount, xp };
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
    const aliasHandle = `@${String(aliasValue || 'catador').replace(/^@+/, '').trim().replace(/\s+/g, '_')}`;
    const first = name.slice(0, 1).toUpperCase() || '?';
    const allDates = collectDates();
    const sinceText = allDates.length ? yearsSince(allDates[0].toISOString()) : 'Miembro reciente';
    const avatarUrl = resolvedProfileAvatar();
    const quote = String(state.profile && state.profile.motto || '').trim();
    const quoteText = quote || (isOwner() ? 'Añade una frase' : '');
    const member = computeMemberStats();
    const currentLevel = getLevelFromXp(member.xp);
    const nextLevel = LEVELS.find((level) => level.minXp > member.xp) || null;
    const levelStartXp = currentLevel.minXp;
    const levelRange = nextLevel ? Math.max(1, nextLevel.minXp - levelStartXp) : Math.max(1, member.xp);
    const progress = nextLevel ? Math.max(0, Math.min(100, ((member.xp - levelStartXp) / levelRange) * 100)) : 100;

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
    if (el.alias) el.alias.textContent = aliasHandle;
    if (el.name) {
      el.name.textContent = isOwner() ? ownerFullName : '';
      el.name.style.display = isOwner() && ownerFullName ? '' : 'none';
    }
    if (el.since) el.since.textContent = sinceText;
    if (el.level) el.level.textContent = `${currentLevel.icon} ${currentLevel.name}`;
    if (el.xp) el.xp.textContent = `${member.xp} XP acumulados`;
    if (el.nextLevel) el.nextLevel.textContent = nextLevel ? `Proximo nivel: ${nextLevel.name}` : 'Nivel maximo alcanzado';
    if (el.nextXp) el.nextXp.textContent = nextLevel ? `${nextLevel.minXp} XP` : '';
    if (el.progressFill) el.progressFill.style.width = `${progress.toFixed(1)}%`;
    if (el.statVotes) el.statVotes.textContent = String(member.votesCount);
    if (el.statPhotos) el.statPhotos.textContent = String(member.photosCount);
    if (el.statReviews) el.statReviews.textContent = String(member.reviewsCount);
    if (el.statFavorites) el.statFavorites.textContent = String(member.favoritesMarkedCount);
    if (el.counters) {
      el.counters.innerHTML = `${state.threads.length} hilos <span>•</span> ${state.replies.length} respuestas <span>•</span> ${state.blogComments.length} comentarios`;
    }
    if (el.followers) {
      const suffix = state.followersCount === 1 ? 'seguidor' : 'seguidores';
      el.followers.textContent = `${state.followersCount} ${suffix}`;
    }
    if (el.quote) {
      el.quote.textContent = quoteText;
      el.quote.style.display = quoteText ? '' : 'none';
      el.quote.classList.toggle('editable', isOwner());
      el.quote.classList.toggle('placeholder', !quote);
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
        el.followBtn.textContent = 'Inicia sesion para seguir';
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
        el.dmBtn.textContent = isOwner() ? 'No puedes escribirte' : 'Inicia sesion para escribir';
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
    state.isFollowing = !!auth.uid && state.follows.some((row) => row.targetUid === uid && row.followerUid === auth.uid);
  };

  const profileMap = () => {
    const map = new Map();
    state.profiles.forEach((profile) => {
      if (profile && profile.uid) map.set(profile.uid, profile);
    });
    return map;
  };

  const userNameByUid = (targetUid) => {
    if (!targetUid) return 'Usuario';
    if (targetUid === uid) return getAuthorName();
    const map = profileMap();
    const hit = map.get(targetUid);
    if (hit && hit.displayName) return String(hit.displayName);
    const fromForum = state.threads.find((item) => item.authorUid === targetUid)
      || state.replies.find((item) => item.authorUid === targetUid)
      || state.blogComments.find((item) => item.authorUid === targetUid);
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
    const url = `/perfil/?uid=${encodeURIComponent(safeUid)}&name=${encodeURIComponent(String(name || 'Catador'))}`;
    window.location.href = url;
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
        <article class="stat-card"><p class="stat-label">Seguidores</p><p class="stat-value">${state.followersCount}</p></article>
        <article class="stat-card"><p class="stat-label">Siguiendo</p><p class="stat-value">${state.followingCount}</p></article>
        <article class="stat-card"><p class="stat-label">Antiguedad</p><p class="stat-value" style="font-size:20px;line-height:1.3;">${esc(memberFor)}</p></article>
      </div>
    `;
  };

  const renderFollowers = () => {
    const incoming = state.follows.filter((row) => row.targetUid === uid);
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
          <article class="feed-item">
            <div class="feed-thumb">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}" style="width:100%;height:100%;object-fit:cover;display:block;" />` : esc(initial)}</div>
            <div class="feed-body">
              <p class="feed-meta">Seguidor desde ${esc(fmtDate(row.createdAt))}</p>
              <p class="feed-title">${esc(name)}</p>
              <div class="feed-aux"><button class="mini-btn" type="button" data-open-profile="${esc(row.followerUid)}" data-open-name="${esc(name)}">Ver perfil</button></div>
            </div>
          </article>
        `;
      }).join('');
  };

  const renderFollowing = () => {
    const outgoing = state.follows.filter((row) => row.followerUid === uid);
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
          <article class="feed-item">
            <div class="feed-thumb">${avatar ? `<img src="${esc(avatar)}" alt="${esc(name)}" style="width:100%;height:100%;object-fit:cover;display:block;" />` : esc(initial)}</div>
            <div class="feed-body">
              <p class="feed-meta">Siguiendo desde ${esc(fmtDate(row.createdAt))}</p>
              <p class="feed-title">${esc(name)}</p>
              <div class="feed-aux"><button class="mini-btn" type="button" data-open-profile="${esc(row.targetUid)}" data-open-name="${esc(name)}">Ver perfil</button></div>
            </div>
          </article>
        `;
      }).join('');
  };

  const renderMessages = () => {
    if (!auth.uid) {
      renderEmpty('Inicia sesion para ver y responder mensajes.');
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

    el.content.innerHTML = rows
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 120)
      .map((row) => {
        const mine = row.senderUid === auth.uid;
        const otherUid = mine ? row.recipientUid : row.senderUid;
        const otherName = mine ? (row.recipientName || userNameByUid(otherUid)) : (row.senderName || userNameByUid(otherUid));
        return `
          <article class="feed-item">
            <div class="feed-thumb">${mine ? '↗' : '↘'}</div>
            <div class="feed-body">
              <p class="feed-meta">${mine ? 'Enviado a' : 'Recibido de'} ${esc(otherName)} · ${esc(fmtDate(row.createdAt))}</p>
              <p class="feed-title">${esc(short(row.body || '', 400))}</p>
              <div class="feed-aux">
                <button class="mini-btn" type="button" data-reply-dm="${esc(otherUid)}" data-reply-name="${esc(otherName)}">Responder</button>
                <button class="mini-btn" type="button" data-open-profile="${esc(otherUid)}" data-open-name="${esc(otherName)}">Ver perfil</button>
              </div>
            </div>
          </article>
        `;
      }).join('');
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

    const existing = state.follows.find((row) => row.targetUid === uid && row.followerUid === auth.uid);
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

  const handleSendDirectMessage = async () => {
    if (!auth.uid || isOwner()) return;
    const message = window.prompt('Escribe tu mensaje directo');
    if (message === null) return;

    const body = String(message || '').trim();
    if (body.length < 2) {
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
    if (el.tabs.some((btn) => btn.classList.contains('active') && btn.getAttribute('data-tab') === 'messages')) {
      renderMessages();
    }
    setStatus('Mensaje directo enviado.');
  };

  const replyDirectMessage = async (targetUid, targetName) => {
    if (!auth.uid) {
      setStatus('Inicia sesion para responder mensajes.');
      return;
    }

    const safeTargetUid = String(targetUid || '').trim();
    if (!safeTargetUid) return;

    const message = window.prompt(`Responder a ${targetName || 'usuario'}`);
    if (message === null) return;

    const body = String(message || '').trim();
    if (body.length < 2) {
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
  };

  const handleEditQuote = async () => {
    if (!isOwner()) return;
    const current = String(state.profile && state.profile.motto || '').trim();
    const next = window.prompt('Edita tu frase', current);
    if (next === null) return;
    const motto = String(next || '').trim();

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
  };

  const handlePhotoSelected = async (event) => {
    if (!isOwner()) return;
    const file = event.target && event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (!file) return;

    setStatus('Subiendo foto...');
    try {
      const avatarUrl = await uploadAvatar(file);
      const ok = await updateDocument('user_profiles', uid, {
        uid,
        displayName: getAuthorName(),
        avatarUrl,
        motto: String(state.profile && state.profile.motto || '').trim(),
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

    if (el.content) {
      el.content.addEventListener('click', (event) => {
        const openBtn = event.target.closest('[data-open-profile]');
        if (openBtn) {
          openProfile(openBtn.getAttribute('data-open-profile'), openBtn.getAttribute('data-open-name'));
          return;
        }

        const replyBtn = event.target.closest('[data-reply-dm]');
        if (replyBtn) {
          replyDirectMessage(replyBtn.getAttribute('data-reply-dm'), replyBtn.getAttribute('data-reply-name'));
        }
      });
    }
  };

  const init = async () => {
    if (!uid) {
      renderEmpty('Falta el usuario del perfil. Vuelve a Comunidad o Blog y pulsa un alias.');
      return;
    }

    const [threads, replies, blogComments, follows, profile, messages, profiles] = await Promise.all([
      getCollection('foro_hilos', 1200),
      getCollection('foro_respuestas', 2000),
      getCollection('blog_comentarios', 2000),
      getCollection('profile_follows', 4000),
      getDocument('user_profiles', uid),
      auth.uid ? getCollection('direct_messages', 4000) : Promise.resolve([]),
      getCollection('user_profiles', 2000),
    ]);

    state.threads = threads.filter((item) => item.authorUid === uid);
    state.replies = replies.filter((item) => item.authorUid === uid);
    state.blogComments = blogComments.filter((item) => item.authorUid === uid);
    state.follows = follows;
    state.profile = profile;
    state.messages = messages;
    state.profiles = profiles;

    // Para el dueño del perfil: importar foto/nombre/frase desde fuentes legacy o Auth.
    await syncOwnerProfileIfNeeded();

    refreshFollowState();

    renderHeader();
    attachTabEvents();
    attachActionEvents();
    renderButtons();
    renderTab('activity');
    state.loaded = true;
  };

  init().catch(() => {
    renderEmpty('No se pudo cargar este perfil en este momento.');
  });
})();
