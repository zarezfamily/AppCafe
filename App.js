// ─────────────────────────────────────────────────────────────────────────────
//  App.js — Etiove ☕  v2.1
// ─────────────────────────────────────────────────────────────────────────────

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar, StyleSheet,
  Switch,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';

import {
  addDocument, deleteDocument, getCollection, getDocument,
  getUserCafes,
  loginUser, registerUser, resetPassword,
  setDocument, updateDocument, uploadImageToStorage,
} from './firebaseConfig';
import {
  LEVELS,
  defaultGamification,
  getAchievementDefs,
  getLevelFromXp,
  normalizeGamification,
} from './src/core/gamification';
import { PAISES, getFlagForPais } from './src/core/paises';
import {
  csvToSet,
  formatRelativeTime,
  getCleanCoffeePhoto,
  normalize,
  setToCsv,
} from './src/core/utils';
import BottomBarNav from './src/screens/BottomBarNav';
import CommunityTab from './src/screens/CommunityTab';
import InicioTab from './src/screens/InicioTab';
import MasTab from './src/screens/MasTab';
import MisCafesTab from './src/screens/MisCafesTab';
import OfertasTab from './src/screens/OfertasTab';
import TopCafesTab from './src/screens/TopCafesTab';
import UltimosAnadidosTab from './src/screens/UltimosAnadidosTab';

const { width: W, height: H } = Dimensions.get('window');
const APP_VERSION = '2.1.0';
const GOOGLE_PLACES_KEY = 'AIzaSyDWW3lsdg7jgKYtVNcji-5gyDtv-QUWOpA';
const PREMIUM_ACCENT = '#8f5e3b';
const PREMIUM_ACCENT_DEEP = '#5d4030';
const PREMIUM_SURFACE_SOFT = '#f6ede3';
const PREMIUM_SURFACE_TINT = '#fbf5ee';
const PREMIUM_BORDER_SOFT = '#e4d3c2';
const THEME = {
  brand: {
    accent: PREMIUM_ACCENT,
    accentDeep: PREMIUM_ACCENT_DEEP,
    primary: '#2f1d14',
    primaryBorder: '#4f3425',
    primaryBorderStrong: '#5a3c2a',
    onPrimary: '#fff9f1',
    soft: PREMIUM_SURFACE_SOFT,
    tint: PREMIUM_SURFACE_TINT,
    borderSoft: PREMIUM_BORDER_SOFT,
  },
  status: {
    success: '#5f8f61',
    successSoft: '#eaf3ea',
    danger: '#a44f45',
    favorite: '#d0a646',
  },
  text: {
    primary: '#111',
    secondary: '#888',
    muted: '#aaa',
    tertiary: '#555',
    inverse: '#fff',
  },
  surface: {
    base: '#fff',
    subtle: '#f9f9f9',
    soft: '#f5f5f5',
    softAlt: '#f8f7f4',
  },
  border: {
    soft: '#eee',
    subtle: '#f0f0f0',
    muted: '#ddd4cb',
  },
  icon: {
    inactive: '#888',
    muted: '#aaa',
    faint: '#ccc',
  },
};

const KEY_EMAIL    = 'etiove_email';
const KEY_PASSWORD = 'etiove_password';
const KEY_REMEMBER = 'etiove_remember';
const KEY_FAVS     = 'etiove_favorites';
const KEY_PREFS    = 'etiove_preferences';
const KEY_PROFILE  = 'etiove_profile';
const KEY_VOTES    = 'etiove_votes'; // cafés ya votados por el usuario
const KEY_OFFERS_CACHE = 'etiove_offers_cache';
const KEY_GAMIFICATION = 'etiove_gamification';
const KEY_HAS_ACCOUNT = 'etiove_has_account';
const OFFERS_CACHE_TTL_MS = 1000 * 60 * 60 * 8;

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const FORUM_CATEGORIES = [
  { id: 'general', emoji: '💬', label: 'General', desc: 'Todo lo demás relacionado con café' },
  { id: 'metodos', emoji: '☕', label: 'Métodos de preparación', desc: 'V60, espresso, prensa francesa...' },
  { id: 'compras', emoji: '🛒', label: 'Compras y tostadores', desc: 'Recomendaciones y dónde comprar' },
  { id: 'novedades', emoji: '🆕', label: 'Novedades', desc: 'Cafés nuevos, eventos y ferias' },
  { id: 'aprende', emoji: '🎓', label: 'Aprende', desc: 'Dudas de novatos, técnica, agua y molienda' },
];

function PackshotImage({ uri, frameStyle, imageStyle }) {
  return (
    <View style={[s.packshotFrame, frameStyle]}>
      <View style={s.packshotInner}>
        <Image source={{ uri: getCleanCoffeePhoto(uri) }} style={[s.packshotImage, imageStyle]} resizeMode="contain" />
      </View>
    </View>
  );
}

// ─── CUESTIONARIO ─────────────────────────────────────────────────────────────
const QUIZ = [
  { id: 'tueste', pregunta: '¿Qué tueste prefieres?', emoji: '🔥',
    opciones: [
      { label: 'Claro',  desc: 'Más ácido y floral', value: 'claro',  icon: '☀️' },
      { label: 'Medio',  desc: 'Equilibrado',         value: 'medio',  icon: '⚖️' },
      { label: 'Oscuro', desc: 'Amargo y denso',      value: 'oscuro', icon: '🌑' },
    ],
  },
  { id: 'origen', pregunta: '¿De qué origen te gustan más?', emoji: '🌍',
    opciones: [
      { label: 'África',      desc: 'Etiopía, Kenia, Ruanda',       value: 'africa',     icon: '🌺' },
      { label: 'América',     desc: 'Colombia, Costa Rica, Panamá', value: 'america',    icon: '🫘' },
      { label: 'Asia',        desc: 'Indonesia, Yemen, India',      value: 'asia',       icon: '🏔️' },
      { label: 'Sorpréndeme', desc: 'Cualquier origen',             value: 'cualquiera', icon: '✨' },
    ],
  },
  { id: 'acidez', pregunta: '¿Cómo te gusta la acidez?', emoji: '⚡',
    opciones: [
      { label: 'Alta',  desc: 'Viva y brillante', value: 'alta',  icon: '⚡' },
      { label: 'Media', desc: 'Equilibrada',       value: 'media', icon: '〰️' },
      { label: 'Baja',  desc: 'Suave y redonda',  value: 'baja',  icon: '🌊' },
    ],
  },
  { id: 'sabor', pregunta: '¿Qué sabores te atraen?', emoji: '👅',
    opciones: [
      { label: 'Floral',    desc: 'Jazmín, rosa, bergamota',    value: 'floral',    icon: '🌸' },
      { label: 'Frutal',    desc: 'Cereza, arándano, naranja',  value: 'frutal',    icon: '🍒' },
      { label: 'Chocolate', desc: 'Cacao, caramelo, nuez',      value: 'chocolate', icon: '🍫' },
      { label: 'Especias',  desc: 'Canela, cardamomo, vainilla',value: 'especias',  icon: '🌶️' },
    ],
  },
];

function matchScore(cafe, prefs) {
  if (!prefs) return 0;
  let score = 0;
  if (prefs.tueste && cafe.tueste && normalize(cafe.tueste).includes(prefs.tueste)) score += 3;
  if (prefs.origen && prefs.origen !== 'cualquiera') {
    const pais = normalize(cafe.pais || '');
    const m = {
      africa:  ['etiopia','kenia','ruanda','burundi','tanzania','uganda','congo','malawi','zimbabue'],
      america: ['colombia','costa rica','panama','guatemala','brasil','honduras','el salvador','nicaragua','peru','bolivia','ecuador','jamaica'],
      asia:    ['indonesia','yemen','india','china','vietnam','nepal','taiwan','filipinas'],
    };
    if (m[prefs.origen]?.some(p => pais.includes(p))) score += 3;
  } else if (prefs.origen === 'cualquiera') score += 1;
  if (prefs.acidez && cafe.acidez) {
    const a = normalize(cafe.acidez);
    if (prefs.acidez === 'alta'  && (a.includes('brillante')||a.includes('alta')||a.includes('viva'))) score += 2;
    if (prefs.acidez === 'media' && (a.includes('media')||a.includes('equilibrada')))                   score += 2;
    if (prefs.acidez === 'baja'  && (a.includes('baja')||a.includes('suave')))                          score += 2;
  }
  if (prefs.sabor && cafe.notas) {
    const n = normalize(cafe.notas);
    const m2 = {
      floral:    ['jazmin','floral','bergamota','rosa','te blanco'],
      frutal:    ['cereza','fresa','naranja','frutal','arandano','limon','melocoton'],
      chocolate: ['chocolate','cacao','caramelo','nuez','vainilla'],
      especias:  ['especias','canela','cardamomo','vainilla','clavo'],
    };
    if (m2[prefs.sabor]?.some(p => n.includes(p))) score += 3;
  }
  return score;
}

// ─── BUSCADOR CON SUGERENCIAS ─────────────────────────────────────────────────
function SearchInput({ value, onChangeText, onSearch, allCafes, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow]               = useState(false);

  const handleChange = (text) => {
    onChangeText(text);
    if (text.length < 2) { setSuggestions([]); setShow(false); return; }
    const q = normalize(text);
    const seen = new Set();
    const matches = [];
    allCafes.forEach(c => {
      [c.nombre, c.pais, c.region, c.variedad, c.proceso, c.notas].forEach(field => {
        if (!field) return;
        if (normalize(field).includes(q) && !seen.has(field.toLowerCase())) {
          seen.add(field.toLowerCase());
          matches.push(field);
        }
        field.split(/[\s,·]+/).forEach(w => {
          if (normalize(w).startsWith(q) && w.length > 2 && !seen.has(w.toLowerCase())) {
            seen.add(w.toLowerCase());
            matches.push(w);
          }
        });
      });
    });
    setSuggestions(matches.slice(0, 6));
    setShow(matches.length > 0);
  };

  const selectSuggestion = (word) => {
    onChangeText(word);
    setShow(false);
    onSearch?.(word);
  };

  const handleSearch = () => {
    setShow(false);
    onSearch?.(value);
  };

  return (
    <View style={{ position: 'relative', zIndex: 100 }}>
      <View style={s.searchWrap}>
        <TouchableOpacity onPress={handleSearch}>
          <Ionicons name="search-outline" size={18} color="#999" />
        </TouchableOpacity>
        <TextInput
          style={s.searchInput}
          placeholder={placeholder || 'Buscar...'}
          placeholderTextColor="#999"
          value={value}
          onChangeText={handleChange}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => value.length >= 2 && setShow(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => { onChangeText(''); setSuggestions([]); setShow(false); onSearch?.(''); }}>
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>
      {show && suggestions.length > 0 && (
        <View style={srch.dropdown}>
          {suggestions.map((sg, i) => (
            <TouchableOpacity key={i} style={srch.suggItem} onPress={() => selectSuggestion(sg)}>
              <Ionicons name="search-outline" size={14} color={THEME.icon.muted} />
              <Text style={srch.suggText}>{sg}</Text>
              <Ionicons name="arrow-up-outline" size={12} color="#ddd" style={{ marginLeft: 'auto', transform: [{ rotate: '45deg' }] }} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── QUIZ ─────────────────────────────────────────────────────────────────────
function QuizSection({ allCafes, onGamifyEvent }) {
  const [step, setStep]           = useState(0);
  const [prefs, setPrefs]         = useState({});
  const [resultados, setResultados] = useState([]);
  const [cafeDetalle, setCafeDetalle] = useState(null);
  const [favs, setFavs]           = useState([]);
  const [votes, setVotes]         = useState([]);

  useEffect(() => {
    SecureStore.getItemAsync(KEY_FAVS).then(v => v && setFavs(JSON.parse(v))).catch(() => {});
    SecureStore.getItemAsync(KEY_VOTES).then(v => v && setVotes(JSON.parse(v))).catch(() => {});
    SecureStore.getItemAsync(KEY_PREFS).then(v => {
      if (v) { const p = JSON.parse(v); setPrefs(p); calcular(p); setStep(5); }
    }).catch(() => {});
  }, [allCafes]);

  const calcular = (p) => {
    const scored = allCafes.map(c => ({ ...c, _score: matchScore(c, p) }))
      .filter(c => c._score > 0)
      .sort((a, b) => b._score - a._score || b.puntuacion - a.puntuacion)
      .slice(0, 10);
    setResultados(scored);
  };

  const elegir = (qid, val) => {
    const np = { ...prefs, [qid]: val };
    setPrefs(np);
    if (step < QUIZ.length) { setStep(step + 1); }
    else { calcular(np); SecureStore.setItemAsync(KEY_PREFS, JSON.stringify(np)).catch(() => {}); setStep(5); }
  };

  const toggleFav = async (cafe) => {
    const wasFav = favs.includes(cafe.id);
    const nf = wasFav ? favs.filter(f => f !== cafe.id) : [...favs, cafe.id];
    setFavs(nf);
    await SecureStore.setItemAsync(KEY_FAVS, JSON.stringify(nf)).catch(() => {});
    if (!wasFav) onGamifyEvent?.('favorite_mark', { cafe });
  };

  const reiniciar = () => { setStep(0); setPrefs({}); setResultados([]); SecureStore.deleteItemAsync(KEY_PREFS).catch(() => {}); };

  if (step === 0) return (
    <View style={q.introBox}>
      <Text style={q.introEmoji}>☕</Text>
      <Text style={q.introTitle}>¿Qué café es para ti?</Text>
      <Text style={q.introSub}>4 preguntas y te recomendamos tu café ideal.</Text>
      <TouchableOpacity style={q.startBtn} onPress={() => setStep(1)}><Text style={q.startBtnText}>Empezar →</Text></TouchableOpacity>
    </View>
  );

  if (step >= 1 && step <= QUIZ.length) {
    const pq = QUIZ[step - 1];
    return (
      <View style={q.quizBox}>
        <View style={q.progressRow}>
          {QUIZ.map((_, i) => <View key={i} style={[q.progressDot, i < step && q.progressDotActive]} />)}
        </View>
        <Text style={q.quizEmoji}>{pq.emoji}</Text>
        <Text style={q.quizPregunta}>{pq.pregunta}</Text>
        <View style={q.opcionesGrid}>
          {pq.opciones.map(op => (
            <TouchableOpacity key={op.value} style={q.opcion} onPress={() => elegir(pq.id, op.value)} activeOpacity={0.8}>
              <Text style={q.opcionIcon}>{op.icon}</Text>
              <Text style={q.opcionLabel}>{op.label}</Text>
              <Text style={q.opcionDesc}>{op.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {step > 1 && <TouchableOpacity onPress={() => setStep(step - 1)} style={{ alignItems: 'center', marginTop: 8 }}><Text style={{ color: THEME.text.muted, fontSize: 13 }}>← Anterior</Text></TouchableOpacity>}
      </View>
    );
  }

  return (
    <View>
      {cafeDetalle && <CafeDetailScreen cafe={cafeDetalle} onClose={() => setCafeDetalle(null)} favs={favs} onToggleFav={toggleFav} votes={votes} setVotes={setVotes} onVote={(c) => onGamifyEvent?.('vote', { cafe: c })} />}
      <View style={q.resultsHeader}>
        <View><Text style={q.resultsTitle}>Cafés para ti ✨</Text><Text style={q.resultsSub}>Basado en tus preferencias</Text></View>
        <TouchableOpacity onPress={reiniciar} style={q.resetBtn}>
          <Ionicons name="refresh-outline" size={16} color={PREMIUM_ACCENT_DEEP} />
          <Text style={q.resetText}>Repetir</Text>
        </TouchableOpacity>
      </View>
      {resultados.length === 0
        ? <Text style={[s.empty, { marginHorizontal: 16 }]}>No hay coincidencias aún.</Text>
        : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
            {resultados.map(item => <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0`} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />)}
          </ScrollView>
      }
    </View>
  );
}

// ─── DETALLE CAFÉ ─────────────────────────────────────────────────────────────
function CafeDetailScreen({ cafe, onClose, onDelete, favs = [], onToggleFav, votes = [], setVotes, onVote }) {
  if (!cafe) return null;
  const isFav        = favs.includes(cafe.id);
  const yaVotado     = votes.includes(cafe.id);
  const [miVoto, setMiVoto]               = useState(0);
  const [votando, setVotando]             = useState(false);
  const [votosActuales, setVotosActuales] = useState(cafe.votos || 0);
  const [puntuacionActual, setPuntuacionActual] = useState(cafe.puntuacion || 0);

  const votar = async (estrellas) => {
    if (votando || yaVotado || miVoto > 0) return;
    setVotando(true);
    try {
      setMiVoto(estrellas);
      const nuevosVotos = votosActuales + 1;
      const nuevaPuntuacion = Math.round(((puntuacionActual * votosActuales) + estrellas) / nuevosVotos);
      await updateDocument('cafes', cafe.id, { votos: nuevosVotos, puntuacion: nuevaPuntuacion });
      setVotosActuales(nuevosVotos);
      setPuntuacionActual(nuevaPuntuacion);
      const newVotes = [...votes, cafe.id];
      setVotes?.(newVotes);
      await SecureStore.setItemAsync(KEY_VOTES, JSON.stringify(newVotes)).catch(() => {});
      onVote?.(cafe);
      Alert.alert('¡Gracias!', `Has valorado este café con ${estrellas} ⭐\nNueva puntuación media: ${nuevaPuntuacion}.0`);
    } catch { Alert.alert('Error', 'No se pudo guardar tu voto'); setMiVoto(0); }
    finally { setVotando(false); }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={det.hero}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f7f4ef', alignItems: 'center', justifyContent: 'center' }]}>
              <PackshotImage uri={cafe.foto} frameStyle={s.packshotHeroFrame} imageStyle={s.packshotHeroImage} />
            </View>
            <View style={det.heroGrad} />
            <TouchableOpacity style={det.backBtn} onPress={onClose}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
            {onToggleFav && <TouchableOpacity style={det.favBtn} onPress={() => onToggleFav(cafe)}><Ionicons name={isFav ? 'star' : 'star-outline'} size={22} color={isFav ? THEME.status.favorite : THEME.text.inverse} /></TouchableOpacity>}
            {onDelete && <TouchableOpacity style={det.deleteBtn} onPress={() => onDelete(cafe)}><Ionicons name="trash-outline" size={20} color="#fff" /></TouchableOpacity>}
            <View style={det.scoreBox}>
              <Text style={det.scoreNum}>{puntuacionActual}.0</Text>
              <Stars value={puntuacionActual} size={16} />
              <Text style={det.scoreVotos}>{votosActuales} valoraciones</Text>
            </View>
          </View>

          <View style={det.body}>
            <Text style={det.nombre}>{cafe.nombre}</Text>
            {cafe.finca && <Text style={det.finca}>{cafe.finca}</Text>}
            <View style={det.originRow}>{cafe.pais && <Text style={det.originText}>🌍 {cafe.pais}{cafe.region ? `, ${cafe.region}` : ''}</Text>}</View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={det.chipsWrap}>
              {cafe.variedad && <Chip label={cafe.variedad} icon="leaf-outline" />}
              {cafe.proceso  && <Chip label={cafe.proceso}  icon="water-outline" />}
              {cafe.tueste   && <Chip label={`Tueste ${cafe.tueste}`} icon="flame-outline" />}
              {cafe.altura   && <Chip label={`${cafe.altura} msnm`}   icon="trending-up-outline" />}
            </ScrollView>

            <View style={det.votarBox}>
              {yaVotado || miVoto > 0
                ? <><Text style={det.votarTitle}>¡Ya has valorado este café!</Text><Text style={det.votarSub}>Tu voto ha sido registrado ⭐</Text></>
                : <><Text style={det.votarTitle}>¿Qué te parece este café?</Text><Text style={det.votarSub}>Toca las estrellas para valorarlo</Text></>
              }
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity key={n} onPress={() => votar(n)} disabled={yaVotado || miVoto > 0 || votando}>
                    <Ionicons name={n <= (miVoto || (yaVotado ? puntuacionActual : 0)) ? 'star' : 'star-outline'} size={36} color={n <= (miVoto || (yaVotado ? puntuacionActual : 0)) ? PREMIUM_ACCENT : '#ddd'} />
                  </TouchableOpacity>
                ))}
              </View>
              {votando && <ActivityIndicator color={PREMIUM_ACCENT} style={{ marginTop: 8 }} />}
            </View>

            <View style={det.divider} />
            {cafe.sca && (
              <View style={det.scaBox}>
                <View style={det.scaLeft}><Text style={det.scaScore}>{cafe.sca}</Text><Text style={det.scaLabel}>Puntuación SCA</Text></View>
                <View style={det.scaBar}><View style={[det.scaFill, { width: `${Math.min(((cafe.sca-80)/20)*100, 100)}%` }]} /></View>
                <Text style={det.scaCat}>{cafe.sca >= 90 ? '☕ Excepcional' : cafe.sca >= 85 ? '⭐ Excelente' : '✓ Especialidad'}</Text>
              </View>
            )}

            <View style={det.divider} />
            <Text style={det.sectionTitle}>Perfil sensorial</Text>
            {cafe.notas && <View style={det.notasBox}><Text style={det.notasLabel}>Notas de cata</Text><Text style={det.notasText}>{cafe.notas}</Text></View>}
            <View style={det.sensRow}>
              {cafe.acidez  && <SensItem label="Acidez"  value={cafe.acidez}  icon="flash-outline" />}
              {cafe.cuerpo  && <SensItem label="Cuerpo"  value={cafe.cuerpo}  icon="fitness-outline" />}
              {cafe.regusto && <SensItem label="Regusto" value={cafe.regusto} icon="time-outline" />}
            </View>

            <View style={det.divider} />
            <Text style={det.sectionTitle}>Origen y proceso</Text>
            <InfoRow icon="location-outline"    label="País / Región" value={[cafe.pais,cafe.region].filter(Boolean).join(', ')} />
            <InfoRow icon="person-outline"      label="Productor"     value={cafe.productor} />
            <InfoRow icon="home-outline"        label="Finca"         value={cafe.finca} />
            <InfoRow icon="trending-up-outline" label="Altura"        value={cafe.altura ? `${cafe.altura} msnm` : null} />
            <InfoRow icon="leaf-outline"        label="Variedad"      value={cafe.variedad} />
            <InfoRow icon="water-outline"       label="Proceso"       value={cafe.proceso} />
            <InfoRow icon="sunny-outline"       label="Secado"        value={cafe.secado} />

            <View style={det.divider} />
            <Text style={det.sectionTitle}>Tueste</Text>
            <InfoRow icon="flame-outline"    label="Nivel"        value={cafe.tueste} />
            <InfoRow icon="calendar-outline" label="Fecha tueste" value={cafe.fechaTueste} />

            {cafe.preparacion && <><View style={det.divider} /><Text style={det.sectionTitle}>Preparación recomendada</Text><View style={det.prepBox}><Ionicons name="cafe-outline" size={20} color={PREMIUM_ACCENT} /><Text style={det.prepText}>{cafe.preparacion}</Text></View></>}
            {cafe.certificaciones && <><View style={det.divider} /><Text style={det.sectionTitle}>Certificaciones</Text><Text style={det.certText}>{cafe.certificaciones}</Text></>}
            {cafe.precio && <View style={det.precioBox}><Text style={det.precioLabel}>Precio orientativo</Text><Text style={det.precioVal}>{cafe.precio}€ / 100g</Text></View>}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── PICKLIST PAÍSES ──────────────────────────────────────────────────────────
function PaisPicklist({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = PAISES.find(p => p.value === value) || PAISES[0];
  return (
    <>
      <TouchableOpacity style={pick.trigger} onPress={() => setOpen(true)}>
        <Text style={pick.triggerText}>{selected.label}</Text>
        <Ionicons name="chevron-down" size={18} color={THEME.icon.inactive} />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={pick.overlay}>
          <View style={pick.sheet}>
            <View style={pick.sheetHeader}>
              <Text style={pick.sheetTitle}>Selecciona tu país</Text>
              <TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={24} color="#111" /></TouchableOpacity>
            </View>
            <FlatList
              data={PAISES}
              keyExtractor={(item, index) => `${item.value}_${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={[pick.item, item.value === value && pick.itemActive]} onPress={() => { onChange(item.value); setOpen(false); }}>
                  <Text style={pick.itemText}>{item.label}</Text>
                  {item.value === value && <Ionicons name="checkmark" size={20} color={PREMIUM_ACCENT} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────
function ProfileScreen({ onClose }) {
  const { user } = useAuth();
  const [nombre,    setNombre]    = useState('');
  const [alias,     setAlias]     = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email,     setEmail]     = useState(user?.email || '');
  const [telefono,  setTelefono]  = useState('');
  const [pais,      setPais]      = useState('España');
  const [foto,      setFoto]      = useState(null);
  const [guardando, setGuardando] = useState(false);
  const emailValido = /^\S+@\S+\.\S+$/.test(String(email || '').trim());
  const camposObligatoriosCompletos = !!nombre.trim() && !!apellidos.trim() && !!alias.trim() && !!email.trim();

  useEffect(() => {
    SecureStore.getItemAsync(KEY_PROFILE).then(v => {
      if (v) {
        const p = JSON.parse(v);
        setNombre(p.nombre || ''); setAlias(p.alias || ''); setApellidos(p.apellidos || '');
        setEmail(p.email || user?.email || ''); setTelefono(p.telefono || '');
        setPais(p.pais || 'España'); setFoto(p.foto || null);
      }
    }).catch(() => {});
  }, []);

  const elegirFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitas permitir el acceso a la galería.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  const guardar = async () => {
    if (!camposObligatoriosCompletos) {
      return Alert.alert('Campos obligatorios', 'Nombre, apellidos, alias y email son obligatorios.');
    }
    if (!emailValido) {
      return Alert.alert('Email inválido', 'Introduce un email válido para continuar.');
    }

    setGuardando(true);
    try {
      await SecureStore.setItemAsync(KEY_PROFILE, JSON.stringify({
        nombre: nombre.trim(),
        alias: alias.trim(),
        apellidos: apellidos.trim(),
        email: email.trim(),
        telefono,
        pais,
        foto,
      }));
      Alert.alert('✅ Guardado', 'Tu perfil ha sido actualizado');
      onClose();
    } catch { Alert.alert('Error', 'No se pudo guardar el perfil'); }
    finally { setGuardando(false); }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" />
        <View style={prf.header}>
          <TouchableOpacity onPress={onClose} style={prf.closeBtn}><Ionicons name="chevron-back" size={24} color="#111" /></TouchableOpacity>
          <Text style={prf.title}>Mi perfil</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={prf.body}>
          <TouchableOpacity style={prf.avatarWrap} onPress={elegirFoto}>
            {foto
              ? <Image source={{ uri: foto }} style={prf.avatarImg} />
              : <View style={prf.avatar}><Text style={prf.avatarText}>{(nombre || alias || email || '?')[0].toUpperCase()}</Text></View>
            }
            <View style={prf.avatarBadge}><Ionicons name="camera" size={14} color="#fff" /></View>
            <Text style={prf.avatarEmail}>{user?.email}</Text>
            <Text style={{ fontSize: 12, color: THEME.text.muted }}>Toca para cambiar foto</Text>
          </TouchableOpacity>

          <Text style={s.label}>Nombre *</Text>
          <TextInput style={s.input} placeholder="Tu nombre" placeholderTextColor="#bbb" value={nombre} onChangeText={setNombre} />
          <Text style={s.label}>Apellidos *</Text>
          <TextInput style={s.input} placeholder="Tus apellidos" placeholderTextColor="#bbb" value={apellidos} onChangeText={setApellidos} />
          <Text style={s.label}>Alias *</Text>
          <TextInput style={s.input} placeholder="@tu_alias" placeholderTextColor="#bbb" value={alias} onChangeText={setAlias} autoCapitalize="none" />
          <Text style={s.label}>Email *</Text>
          <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor="#bbb" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={s.label}>Teléfono</Text>
          <TextInput style={s.input} placeholder="+34 600 000 000" placeholderTextColor="#bbb" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
          <Text style={s.label}>País</Text>
          <PaisPicklist value={pais} onChange={setPais} />

          <TouchableOpacity style={[s.redBtn, { marginTop: 24, opacity: guardando || !camposObligatoriosCompletos ? 0.8 : 1 }]} onPress={guardar} disabled={guardando}>
            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── CAFETERÍAS (Google Places API) ─────────────────────────────────────────

function calcDist(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// Obtiene URL de foto real de Google Places
function getGooglePhotoUrl(photoRef) {
  if (!photoRef) return null;
  return 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=' + photoRef + '&key=' + GOOGLE_PLACES_KEY;
}

// Convierte estado de apertura de Google a texto
function estadoApertura(openingHours) {
  if (!openingHours) return null;
  return openingHours.open_now;
}

function CafeteriasScreen() {
  const [cafeterias, setCafeterias]     = useState([]);
  const [cargando, setCargando]         = useState(false);
  const [error, setError]               = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => { cargarCafeterias(); }, []);

  const cargarCafeterias = async () => {
    setCargando(true); setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setError('Activa la ubicacion para ver cafeterias cerca de ti'); setCargando(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lon } = loc.coords;

      // Places API (New) - Nearby Search
      const nearbyRes = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.regularOpeningHours,places.internationalPhoneNumber,places.websiteUri,places.photos,places.editorialSummary,places.types',
        },
        body: JSON.stringify({
          includedTypes: ['cafe', 'coffee_shop'],
          maxResultCount: 10,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lon },
              radius: 2000.0,
            },
          },
          rankPreference: 'POPULARITY',
        }),
      });

      const nearbyJson = await nearbyRes.json();

      if (nearbyJson.error) {
        setError('Error Google Places: ' + (nearbyJson.error.message || 'API no disponible'));
        setCargando(false); return;
      }

      const places = nearbyJson.places || [];

      const result = places.map(function(p) {
        const geo  = p.location || {};
        const dist = calcDist(lat, lon, geo.latitude || lat, geo.longitude || lon);
        const horarioTexto = (p.regularOpeningHours && p.regularOpeningHours.weekdayDescriptions)
          ? p.regularOpeningHours.weekdayDescriptions.join(', ')
          : null;
        const abierto = (p.currentOpeningHours && p.currentOpeningHours.openNow !== undefined)
          ? p.currentOpeningHours.openNow
          : null;
        const fotoUrl = (p.photos && p.photos[0] && p.photos[0].name)
          ? 'https://places.googleapis.com/v1/' + p.photos[0].name + '/media?maxWidthPx=400&key=' + GOOGLE_PLACES_KEY
          : null;
        const fotosUrls = (p.photos || []).slice(0, 4).map(function(ph) {
          return 'https://places.googleapis.com/v1/' + ph.name + '/media?maxWidthPx=400&key=' + GOOGLE_PLACES_KEY;
        });
        return {
          id:          p.id,
          nombre:      (p.displayName && p.displayName.text) || 'Cafeteria',
          lat:         geo.latitude  || lat,
          lon:         geo.longitude || lon,
          distancia:   dist,
          direccion:   p.formattedAddress || null,
          telefono:    p.internationalPhoneNumber || null,
          web:         p.websiteUri || null,
          abierto:     abierto,
          horario:     horarioTexto,
          rating:      p.rating ? p.rating.toFixed(1) : '--',
          numResenas:  p.userRatingCount || 0,
          resenas:     [],
          descripcion: (p.editorialSummary && p.editorialSummary.text) || null,
          foto:        fotoUrl,
          fotos:       fotosUrls,
          wifi:        false,
          terraza:     false,
          takeaway:    (p.types || []).indexOf('meal_takeaway') !== -1,
        };
      }).sort(function(a, b) { return parseFloat(b.rating) - parseFloat(a.rating); });

      setCafeterias(result);
      if (result.length === 0) setError('No encontramos cafeterias cerca. Prueba en otra zona.');
    } catch (e) {
      setError('Error al buscar cafeterias: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  const abrirMaps = (c) => {
    const url = Platform.OS === 'ios'
      ? `maps://maps.apple.com/?q=${encodeURIComponent(c.nombre)}&ll=${c.lat},${c.lon}`
      : `geo:${c.lat},${c.lon}?q=${encodeURIComponent(c.nombre)}`;
    Linking.openURL(url).catch(() => {});
  };

  if (cargando) return (
    <View style={caf.loadBox}>
      <Text style={caf.loadEmoji}>☕</Text>
      <ActivityIndicator color={PREMIUM_ACCENT} size="large" />
      <Text style={caf.loadTitle}>Buscando cafeterías</Text>
      <Text style={caf.loadSub}>Localizando las mejores cerca de ti...</Text>
    </View>
  );

  if (error && cafeterias.length === 0) return (
    <View style={caf.errorBox}>
      <Text style={{ fontSize: 48 }}>📍</Text>
      <Text style={caf.errorTitle}>Ups...</Text>
      <Text style={caf.errorText}>{error}</Text>
      <TouchableOpacity style={[s.redBtn, { paddingHorizontal: 32 }]} onPress={cargarCafeterias}>
        <Text style={s.redBtnText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* DETALLE CAFETERÍA */}
      {seleccionada && (
        <Modal visible animationType="slide" onRequestClose={() => setSeleccionada(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <StatusBar barStyle="dark-content" />
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* HERO — foto real de Google Places o placeholder */}
              <View style={caf.detHero}>
                {seleccionada.foto
                  ? <Image source={{ uri: seleccionada.foto }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  : <View style={caf.detPlaceholder}><Text style={caf.detPlaceholderEmoji}>☕</Text></View>
                }
                <View style={caf.detHeroGrad} />
                <TouchableOpacity style={caf.detBack} onPress={() => setSeleccionada(null)}>
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={caf.detNavBtn} onPress={() => abrirMaps(seleccionada)}>
                  <Ionicons name="navigate" size={20} color="#fff" />
                </TouchableOpacity>
                {/* Badge abierto/cerrado */}
                {seleccionada.abierto !== null && (
                  <View style={[caf.badgeEstado, { backgroundColor: seleccionada.abierto ? THEME.status.success : THEME.status.danger }]}>
                    <Text style={caf.badgeEstadoText}>{seleccionada.abierto ? '🟢 Abierto ahora' : '🔴 Cerrado'}</Text>
                  </View>
                )}
                {/* Info básica sobre foto */}
                <View style={caf.detOverlay}>
                  <Text style={caf.detNombre}>{seleccionada.nombre}</Text>
                  <Text style={caf.detTipo}>{seleccionada.tipo}</Text>
                  <View style={caf.detRatingRow}>
                    {[1,2,3,4,5].map(n => (
                      <Ionicons key={n} name={n <= Math.round(seleccionada.rating) ? 'star' : 'star-outline'} size={14} color={THEME.status.favorite} />
                    ))}
                    <Text style={caf.detRatingNum}>{seleccionada.rating}</Text>
                    <Text style={caf.detReseñas}>({seleccionada.numResenas} reseñas)</Text>
                  </View>
                </View>
              </View>

              <View style={caf.detBody}>
                {/* Distancia y dirección */}
                <View style={caf.detInfoRow}>
                  <View style={caf.detInfoItem}>
                    <Ionicons name="location" size={20} color={PREMIUM_ACCENT} />
                    <Text style={caf.detInfoLabel}>{seleccionada.distancia < 1000 ? `${seleccionada.distancia}m` : `${(seleccionada.distancia/1000).toFixed(1)}km`}</Text>
                  </View>
                  {seleccionada.wifi && <View style={caf.detInfoItem}><Ionicons name="wifi" size={20} color={PREMIUM_ACCENT} /><Text style={caf.detInfoLabel}>WiFi</Text></View>}
                  {seleccionada.terraza && <View style={caf.detInfoItem}><Ionicons name="sunny" size={20} color={PREMIUM_ACCENT} /><Text style={caf.detInfoLabel}>Terraza</Text></View>}
                  {seleccionada.takeaway && <View style={caf.detInfoItem}><Ionicons name="bag-handle" size={20} color={PREMIUM_ACCENT} /><Text style={caf.detInfoLabel}>Para llevar</Text></View>}
                  {seleccionada.vegano && <View style={caf.detInfoItem}><Ionicons name="leaf" size={20} color={THEME.status.success} /><Text style={[caf.detInfoLabel, { color: THEME.status.success }]}>Vegano</Text></View>}
                </View>

                {/* Especialidades */}
                <View style={caf.seccion}>
                  <Text style={caf.secTitulo}>☕ Especialidades</Text>
                  <Text style={caf.secTexto}>{seleccionada.especialidades}</Text>
                </View>

                {/* Galería de fotos */}
                {seleccionada.fotos && seleccionada.fotos.length > 1 && (
                  <View style={caf.seccion}>
                    <Text style={caf.secTitulo}>📸 Fotos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {seleccionada.fotos.map((f, i) => f && (
                        <Image key={i} source={{ uri: f }} style={{ width: 120, height: 90, borderRadius: 10, marginRight: 8 }} resizeMode="cover" />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Horario */}
                {seleccionada.horario && (
                  <View style={caf.seccion}>
                    <Text style={caf.secTitulo}>🕐 Horario</Text>
                    <Text style={caf.secTexto}>{seleccionada.horario}</Text>
                  </View>
                )}

                {/* Dirección */}
                {seleccionada.direccion && (
                  <View style={caf.seccion}>
                    <Text style={caf.secTitulo}>📍 Dirección</Text>
                    <Text style={caf.secTexto}>{seleccionada.direccion}{seleccionada.barrio ? `
${seleccionada.barrio}` : ''}</Text>
                  </View>
                )}

                {/* Contacto */}
                {(seleccionada.telefono || seleccionada.web) && (
                  <View style={caf.seccion}>
                    <Text style={caf.secTitulo}>📞 Contacto</Text>
                    {seleccionada.telefono && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${seleccionada.telefono}`)} style={caf.contactBtn}>
                        <Ionicons name="call-outline" size={16} color={PREMIUM_ACCENT} />
                        <Text style={caf.contactText}>{seleccionada.telefono}</Text>
                      </TouchableOpacity>
                    )}
                    {seleccionada.web && (
                      <TouchableOpacity onPress={() => Linking.openURL(seleccionada.web.startsWith('http') ? seleccionada.web : `https://${seleccionada.web}`)} style={caf.contactBtn}>
                        <Ionicons name="globe-outline" size={16} color={PREMIUM_ACCENT} />
                        <Text style={caf.contactText}>{seleccionada.web.replace('https://','').replace('http://','').split('/')[0]}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Reseñas reales de Google */}
                {seleccionada.resenas && seleccionada.resenas.length > 0 && (
                  <View style={caf.seccion}>
                    <Text style={caf.secTitulo}>💬 Opiniones de Google</Text>
                    {seleccionada.resenas.map((r, i) => (
                      <View key={i} style={caf.resena}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={caf.resenaAutor}>{r.autor}</Text>
                          <Text style={{ fontSize: 11, color: THEME.text.muted }}>{r.tiempo}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 2, marginBottom: 4 }}>
                          {[1,2,3,4,5].map(n => <Ionicons key={n} name={n <= r.nota ? 'star' : 'star-outline'} size={11} color={THEME.status.favorite} />)}
                        </View>
                        <Text style={caf.resenaTexto} numberOfLines={4}>{r.texto}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={[s.redBtn, { marginTop: 8 }]} onPress={() => abrirMaps(seleccionada)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="navigate-outline" size={20} color="#fff" />
                    <Text style={s.redBtnText}>Cómo llegar</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* CABECERA */}
      <View style={caf.headerBox}>
        <View>
          <Text style={s.pageTitle}>Cafeterías ☕</Text>
          <Text style={{ fontSize: 13, color: THEME.text.secondary }}>{cafeterias.length} cerca de ti · ordenadas por distancia</Text>
        </View>
        <TouchableOpacity onPress={cargarCafeterias} style={caf.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color={PREMIUM_ACCENT_DEEP} />
        </TouchableOpacity>
      </View>

      {/* LISTA */}
      <FlatList
        data={cafeterias}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={caf.card} onPress={() => setSeleccionada(item)} activeOpacity={0.88}>
            {/* Foto real de Google Places o placeholder */}
            <View style={caf.cardImgWrap}>
              {item.foto
                ? <Image source={{ uri: item.foto }} style={caf.cardImg} resizeMode="cover" />
                : <View style={caf.cardPlaceholder}>
                    <Text style={caf.cardPlaceholderEmoji}>☕</Text>
                    <Text style={caf.cardPlaceholderNombre} numberOfLines={2}>{item.nombre}</Text>
                  </View>
              }
              <View style={caf.cardNum}><Text style={caf.cardNumText}>{index + 1}</Text></View>
              {item.abierto !== null && (
                <View style={[caf.cardEstado, { backgroundColor: item.abierto ? THEME.status.success : THEME.status.danger }]}>
                  <Text style={caf.cardEstadoText}>{item.abierto ? 'Abierto' : 'Cerrado'}</Text>
                </View>
              )}
            </View>
            {/* Info */}
            <View style={caf.cardInfo}>
              <Text style={caf.cardNombre} numberOfLines={1}>{item.nombre}</Text>
              <Text style={caf.cardTipo}>{item.tipo}</Text>
              {/* Rating */}
              <View style={caf.cardRatingRow}>
                {[1,2,3,4,5].map(n => <Ionicons key={n} name={n <= Math.round(item.rating) ? 'star' : 'star-outline'} size={12} color={THEME.status.favorite} />)}
                <Text style={caf.cardRatingNum}>{item.rating}</Text>
                <Text style={caf.cardReseñas}>({item.numResenas})</Text>
              </View>
              {/* Tags */}
              <View style={caf.cardTags}>
                <View style={caf.cardTag}><Ionicons name="location-outline" size={11} color={PREMIUM_ACCENT} /><Text style={caf.cardTagText}>{item.distancia < 1000 ? `${item.distancia}m` : `${(item.distancia/1000).toFixed(1)}km`}</Text></View>
                {item.wifi     && <View style={caf.cardTag}><Ionicons name="wifi-outline"       size={11} color={THEME.text.tertiary} /><Text style={caf.cardTagText}>WiFi</Text></View>}
                {item.terraza  && <View style={caf.cardTag}><Ionicons name="sunny-outline"      size={11} color={THEME.text.tertiary} /><Text style={caf.cardTagText}>Terraza</Text></View>}
                {item.takeaway && <View style={caf.cardTag}><Ionicons name="bag-handle-outline" size={11} color={THEME.text.tertiary} /><Text style={caf.cardTagText}>Para llevar</Text></View>}
              </View>
              {/* Especialidades */}
              <Text style={caf.cardEspec} numberOfLines={1}>{item.especialidades}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ─── COMPONENTES COMUNES ──────────────────────────────────────────────────────
function Stars({ value, onPress, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <TouchableOpacity key={n} onPress={() => onPress?.(n)} disabled={!onPress}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={n <= value ? THEME.brand.accent : THEME.icon.faint} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Chip({ label, icon }) {
  return (
    <View style={det.chip}>
      <Ionicons name={icon} size={12} color={PREMIUM_ACCENT} />
      <Text style={det.chipText}>{label}</Text>
    </View>
  );
}

function SensItem({ label, value, icon }) {
  return (
    <View style={det.sensItem}>
      <Ionicons name={icon} size={18} color={PREMIUM_ACCENT} />
      <Text style={det.sensLabel}>{label}</Text>
      <Text style={det.sensVal}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={det.infoRow}>
      <Ionicons name={icon} size={16} color={PREMIUM_ACCENT} style={{ width: 22 }} />
      <Text style={det.infoLabel}>{label}</Text>
      <Text style={det.infoVal}>{value}</Text>
    </View>
  );
}

function CardHorizontal({ item, badge, onPress, favs = [], onToggleFav }) {
  const isFav = favs.includes(item.id);
  return (
    <TouchableOpacity style={s.cardH} onPress={() => onPress?.(item)} activeOpacity={0.85}>
      <View style={s.cardHImg}> 
        <PackshotImage uri={item.foto} frameStyle={s.packshotCardFrame} imageStyle={s.packshotCardImage} />
        <View style={s.badgeRed}><Text style={s.badgeText}>{badge}</Text></View>
        {onToggleFav && (
          <TouchableOpacity style={q.favBtnCard} onPress={() => onToggleFav(item)}>
            <Ionicons name={isFav ? 'star' : 'star-outline'} size={16} color={isFav ? THEME.status.favorite : THEME.text.inverse} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={s.cardHOrigin} numberOfLines={1}>{item.region || item.pais || item.origen || 'Sin origen'}</Text>
      <Text style={s.cardHName} numberOfLines={2}>{item.nombre}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Ionicons name="star" size={13} color={PREMIUM_ACCENT} />
        <Text style={s.cardHRating}>{item.puntuacion}.0</Text>
        <Text style={s.cardHVotos}>({item.votos || 1})</Text>
      </View>
    </TouchableOpacity>
  );
}

function CardVertical({ item, onDelete, onPress, favs = [], onToggleFav }) {
  const isFav = favs.includes(item.id);
  return (
    <TouchableOpacity style={s.cardV} onPress={() => onPress?.(item)} activeOpacity={0.85}>
      <View style={s.cardVImg}> 
        <PackshotImage uri={item.foto} frameStyle={s.packshotListFrame} imageStyle={s.packshotListImage} />
        <View style={s.badgeRed}><Text style={s.badgeText}>{item.puntuacion}.0</Text></View>
        {onToggleFav && (
          <TouchableOpacity style={[q.favBtnCard, { top: 'auto', bottom: 6, right: 6 }]} onPress={() => onToggleFav(item)}>
            <Ionicons name={isFav ? 'star' : 'star-outline'} size={14} color={isFav ? THEME.status.favorite : THEME.text.inverse} />
          </TouchableOpacity>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardVOrigin}>{item.region || item.pais || item.origen || 'Sin origen'}</Text>
        <Text style={s.cardVName}>{item.nombre}</Text>
        <Stars value={item.puntuacion} />
        {item.notas ? <Text style={s.cardVNotas} numberOfLines={2}>{item.notas}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => onDelete(item)} style={{ padding: 4 }}>
        <Ionicons name="trash-outline" size={18} color={THEME.icon.faint} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── WELCOME ──────────────────────────────────────────────────────────────────
function WelcomeScreen() {
  const targetText = 'WELCOME TO\nETIOVE';
  const [typedCount, setTypedCount] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const typingTimer = setInterval(() => {
      setTypedCount((prev) => {
        if (prev >= targetText.length) return prev;
        return prev + 1;
      });
    }, 95);
    return () => clearInterval(typingTimer);
  }, []);

  useEffect(() => {
    const cursorTimer = setInterval(() => setCursorOn((v) => !v), 430);
    return () => clearInterval(cursorTimer);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const typed = targetText.slice(0, typedCount);
  const [topRaw = '', bottomRaw = ''] = typed.split('\n');
  const showCursorTop = cursorOn && !typed.includes('\n');
  const showCursorBottom = cursorOn && typed.includes('\n');
  const floatTranslateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  return (
    <SafeAreaView style={s.welcomeScreen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6efe7" />
      <View style={s.welcomeAuraOne} />
      <View style={s.welcomeAuraTwo} />
      <Animated.View style={[s.welcomeCard, { transform: [{ translateY: floatTranslateY }] }]}> 
        <View style={s.welcomeTypeBox}>
          <Text style={s.welcomeLineTop}>{topRaw}{showCursorTop ? '|' : ' '}</Text>
          <Text style={s.welcomeLineBottom}>{bottomRaw}{showCursorBottom ? '|' : ' '}</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [modo, setModo]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [faceIdDisponible, setFID] = useState(false);
  const [faceIdGuardado, setFIG]   = useState(false);
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const hasFaceId = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        setFID(hasHardware && isEnrolled && hasFaceId);
        if (await SecureStore.getItemAsync(KEY_REMEMBER) === 'true') {
          const em = await SecureStore.getItemAsync(KEY_EMAIL);
          const pw = await SecureStore.getItemAsync(KEY_PASSWORD);
          if (em && pw) { setEmail(em); setPassword(pw); setRecordar(true); setFIG(true); }
        }
        setHasAccount((await SecureStore.getItemAsync(KEY_HAS_ACCOUNT)) === 'true');
      } catch {}
    })();
  }, []);

  const guardarCreds = async (em, pw) => { await SecureStore.setItemAsync(KEY_EMAIL, em); await SecureStore.setItemAsync(KEY_PASSWORD, pw); await SecureStore.setItemAsync(KEY_REMEMBER, 'true'); };
  const borrarCreds  = async () => { await SecureStore.deleteItemAsync(KEY_EMAIL); await SecureStore.deleteItemAsync(KEY_PASSWORD); await SecureStore.setItemAsync(KEY_REMEMBER, 'false'); setFIG(false); };
  const marcarCuenta = async () => {
    await SecureStore.setItemAsync(KEY_HAS_ACCOUNT, 'true').catch(() => {});
    setHasAccount(true);
  };

  const handleSubmit = async () => {
    if (!email.trim() || (!password.trim() && modo !== 'reset')) return Alert.alert('Aviso', 'Rellena todos los campos');
    setCargando(true);
    try {
      if (modo === 'login') {
        const user = await loginUser(email.trim(), password);
        await marcarCuenta();
        if (recordar) await guardarCreds(email.trim(), password); else await borrarCreds();
        onAuth(user);
      }
      else if (modo === 'register') {
        const user = await registerUser(email.trim(), password);
        await marcarCuenta();
        onAuth(user);
      }
      else { await resetPassword(email.trim()); Alert.alert('✅ Email enviado', 'Revisa tu bandeja de entrada'); setModo('login'); }
    } catch (e) { Alert.alert('Error', e.message || 'Algo salió mal'); }
    finally { setCargando(false); }
  };

  const handleFaceId = async () => {
    try {
      if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') {
        Alert.alert('Face ID en Expo Go', 'En Expo Go Face ID puede fallar. Usa un build de desarrollo/TestFlight para autenticación biométrica real.');
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFaceId = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);

      if (!hasHardware || !isEnrolled || !hasFaceId) {
        Alert.alert('Face ID no disponible', 'Este dispositivo/app no tiene Face ID listo para usar en este momento.');
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Accede a Etiove',
        disableDeviceFallback: true,
        fallbackLabel: '',
      });
      if (!auth.success) {
        const errorMap = {
          user_cancel: 'Cancelaste la autenticación.',
          app_cancel: 'La app canceló la autenticación.',
          system_cancel: 'iOS interrumpió la autenticación. Inténtalo de nuevo.',
          not_enrolled: 'Face ID no está configurado en este iPhone.',
          passcode_not_set: 'Debes configurar un código de desbloqueo para usar Face ID.',
          lockout: 'Face ID está bloqueado temporalmente. Desbloquea el iPhone con tu código y vuelve a intentarlo.',
          not_available: 'Face ID no está disponible ahora mismo en este dispositivo.',
          authentication_failed: 'No se pudo verificar tu rostro. Vuelve a intentarlo.',
          user_fallback: 'Face ID no está disponible ahora mismo. Revisa su configuración.',
          invalid_context: 'No se pudo iniciar Face ID en este momento.',
        };
        Alert.alert('Face ID', errorMap[auth.error] || `No se pudo completar la autenticación biométrica (${auth.error || 'desconocido'}).`);
        return;
      }
      const em = await SecureStore.getItemAsync(KEY_EMAIL); const pw = await SecureStore.getItemAsync(KEY_PASSWORD);
      if (!em || !pw) return Alert.alert('Aviso', 'Primero inicia sesión y activa "Recordarme"');
      setCargando(true); onAuth(await loginUser(em, pw));
    } catch { Alert.alert('Error', 'No se pudo autenticar'); }
    finally { setCargando(false); }
  };

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.authScroll}>
          <View style={s.authShell}>
            <View style={s.authAuraOne} />
            <View style={s.authAuraTwo} />

            <View style={s.authBrandBlock}>
              <View style={s.wordmarkWrap}>
                <View style={s.wordmarkCrest}>
                  <View style={s.wordmarkMiniLabelWrap}>
                    <Text style={s.wordmarkMiniLabel}>SPECIALTY</Text>
                  </View>
                  <View style={s.wordmarkSealOuter}>
                    <View style={s.wordmarkSealMiddle}>
                      <View style={s.wordmarkSeal}>
                        <Text style={s.wordmarkSealText}>E</Text>
                      </View>
                    </View>
                  </View>
                  <View style={s.wordmarkMiniLabelWrap}>
                    <Text style={s.wordmarkMiniLabel}>ROASTERS</Text>
                  </View>
                </View>
                <Text style={s.wordmark}>ETIOVE</Text>
                <Text style={[s.wordmarkSub, s.authWordmarkSub]}>COFFEE ATELIER</Text>
                <Text style={[s.wordmarkTag, s.authWordmarkTag]}>DONDE EL ORIGEN SE CONVIERTE EN RITUAL</Text>
              </View>
            </View>

            <View style={s.authCard}>
              <Text style={s.authKicker}>{modo === 'login' ? (hasAccount ? 'BIENVENIDO DE NUEVO' : 'BIENVENIDO') : modo === 'register' ? 'NUEVA MEMBRESÍA' : 'RECUPERACIÓN SEGURA'}</Text>
              <Text style={s.authTitle}>{modo === 'login' ? 'Accede a tu cuenta' : modo === 'register' ? 'Crea tu cuenta' : 'Recupera tu acceso'}</Text>
              <Text style={s.authSub}>{modo === 'login' ? 'Entra para seguir tu colección, nivel y ritual de cata.' : modo === 'register' ? 'Únete a Etiove y empieza a construir tu perfil de catador.' : 'Te enviaremos un enlace para restaurar tu contraseña.'}</Text>

              <Text style={[s.label, s.authLabel]}>Email</Text>
              <TextInput style={[s.input, s.authInput]} placeholder="tu@email.com" placeholderTextColor="#9f9388" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              {modo !== 'reset' && <><Text style={[s.label, s.authLabel]}>Contraseña</Text><TextInput style={[s.input, s.authInput]} placeholder="Mínimo 6 caracteres" placeholderTextColor="#9f9388" value={password} onChangeText={setPassword} secureTextEntry /></>}
              {modo === 'login' && <View style={s.rememberRow}><Switch value={recordar} onValueChange={v => { setRecordar(v); if (!v) borrarCreds(); }} trackColor={{ false: THEME.border.muted, true: THEME.brand.accentDeep }} thumbColor="#fffdf8" /><Text style={[s.rememberText, s.authRememberText]}>Recordar contraseña</Text></View>}

              <TouchableOpacity style={s.authPrimaryBtn} onPress={handleSubmit} disabled={cargando}>
                {cargando ? <ActivityIndicator color="#fffaf4" /> : <Text style={s.authPrimaryBtnText}>{modo === 'login' ? 'Entrar' : modo === 'register' ? 'Crear cuenta' : 'Enviar enlace'}</Text>}
              </TouchableOpacity>

              {modo === 'login' && faceIdDisponible && faceIdGuardado && (
                <TouchableOpacity style={s.authSecondaryBtn} onPress={handleFaceId} disabled={cargando}>
                  <Ionicons name="scan-outline" size={22} color={THEME.brand.accentDeep} />
                  <Text style={s.authSecondaryBtnText}>Entrar con Face ID</Text>
                </TouchableOpacity>
              )}

              <View style={s.authLinks}>
                {modo === 'login' && <><TouchableOpacity onPress={() => setModo('register')}><Text style={s.authLink}>¿Sin cuenta? Regístrate</Text></TouchableOpacity><TouchableOpacity onPress={() => setModo('reset')}><Text style={s.authLinkMuted}>¿Olvidaste la contraseña?</Text></TouchableOpacity></>}
                {modo !== 'login' && <TouchableOpacity onPress={() => setModo('login')}><Text style={s.authLink}>← Volver</Text></TouchableOpacity>}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── ESCÁNER ──────────────────────────────────────────────────────────────────
function ScannerScreen({ onScanned, onSkip, onBack }) {
  const [scanned, setScanned] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <CameraView onBarcodeScanned={r => { if (!scanned) { setScanned(true); onScanned(r); } }} style={StyleSheet.absoluteFillObject} barcodeScannerSettings={{ barcodeTypes: ['ean13','ean8','qr','code128'] }} />
      <View style={scan.overlay}>
        <View style={scan.top} />
        <View style={scan.middle}>
          <View style={scan.side} />
          <View style={scan.window}>
            <View style={[scan.corner, scan.tl]} /><View style={[scan.corner, scan.tr]} />
            <View style={[scan.corner, scan.bl]} /><View style={[scan.corner, scan.br]} />
            <View style={scan.scanLine} />
          </View>
          <View style={scan.side} />
        </View>
        <View style={scan.bottom}>
          <Text style={scan.hint}>Coloca la etiqueta del café dentro del marco</Text>
          <View style={scan.tabs}>
            <TouchableOpacity style={scan.tabActive}><Text style={scan.tabTextActive}>Etiqueta del café</Text></TouchableOpacity>
            <TouchableOpacity style={scan.tabInactive} onPress={onSkip}><Text style={scan.tabTextInactive}>Añadir manual</Text></TouchableOpacity>
          </View>
        </View>
      </View>
      <TouchableOpacity style={scan.backBtn} onPress={onBack}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
      <TouchableOpacity style={scan.galleryBtn} onPress={onSkip}><Ionicons name="images-outline" size={26} color="#fff" /></TouchableOpacity>
    </View>
  );
}

// ─── FORMULARIO ───────────────────────────────────────────────────────────────
function FormScreen({ onSave, onBack, onCafeAdded }) {
  const { user } = useAuth();
  const [nombreCafe, setNombreCafe] = useState('');
  const [origen, setOrigen]         = useState('');
  const [notas, setNotas]           = useState('');
  const [rating, setRating]         = useState(0);
  const [foto, setFoto]             = useState(null);
  const [subiendo, setSubiendo]     = useState(false);

  const hacerFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitas permitir la cámara.'); return; }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  const guardarCafe = async () => {
    if (!nombreCafe.trim()) return Alert.alert('Aviso', 'Escribe el nombre del café');
    setSubiendo(true);
    try {
      await addDocument('cafes', { nombre: nombreCafe.trim(), origen: origen.trim(), puntuacion: rating, notas, foto: foto || '', fecha: new Date().toISOString(), uid: user.uid });
      const rankId = nombreCafe.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
      const ex = await getDocument('ranking', rankId);
      if (ex) await updateDocument('ranking', rankId, { votos: (ex.votos||0)+1 });
      else await setDocument('ranking', rankId, { nombre: nombreCafe.trim(), votos: 1 });
      onCafeAdded?.({
        nombre: nombreCafe.trim(),
        pais: '',
        origen: origen.trim(),
        variedad: '',
        foto: foto || '',
        notas: notas || '',
      });
      Alert.alert('✅ Guardado', 'Café añadido a tu colección');
      onSave();
    } catch { Alert.alert('Error', 'No se pudo conectar con Firebase'); }
    finally { setSubiendo(false); }
  };

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.formScroll}>
        <TouchableOpacity onPress={onBack} style={s.backRow}><Ionicons name="chevron-back" size={20} color={PREMIUM_ACCENT} /><Text style={s.backText}>Volver</Text></TouchableOpacity>
        <Text style={s.formTitle}>Nuevo café</Text>
        <TouchableOpacity style={foto ? {} : s.fotoEmpty} onPress={hacerFoto}>
          {foto ? <Image source={{ uri: foto }} style={s.fotoFull} /> : <><Ionicons name="camera-outline" size={32} color={THEME.text.muted} /><Text style={s.fotoEmptyText}>Añadir foto</Text></>}
        </TouchableOpacity>
        {foto && <TouchableOpacity onPress={hacerFoto}><Text style={s.retake}>Cambiar foto</Text></TouchableOpacity>}
        <Text style={s.label}>Nombre del café</Text>
        <TextInput style={s.input} placeholder="Ej: Yirgacheffe Etiopía" placeholderTextColor="#bbb" value={nombreCafe} onChangeText={setNombreCafe} />
        <Text style={s.label}>Origen / Tostado</Text>
        <TextInput style={s.input} placeholder="Ej: Etiopía · Tostado medio" placeholderTextColor="#bbb" value={origen} onChangeText={setOrigen} />
        <Text style={s.label}>Puntuación</Text>
        <View style={{ marginBottom: 20 }}><Stars value={rating} onPress={setRating} size={32} /></View>
        <Text style={s.label}>Notas de cata</Text>
        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Aromas, sabores, acidez..." placeholderTextColor="#bbb" value={notas} onChangeText={setNotas} multiline />
        <TouchableOpacity style={s.redBtn} onPress={guardarCafe} disabled={subiendo}>
          {subiendo ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>Guardar café</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
function MainScreen({ onLogout }) {
  const { user }                  = useAuth();
  const [activeTab, setActiveTab] = useState('Inicio');
  const [scanning, setScanning]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [misCafes, setMisCafes]   = useState([]);
  const [topCafes, setTopCafes]   = useState([]);
  const [allCafes, setAllCafes]   = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [busqueda, setBusqueda]   = useState('');
  const [busquedaTop, setBusquedaTop] = useState('');
  const [busquedaMis, setBusquedaMis] = useState('');
  const [cafeDetalle, setCafeDetalle] = useState(null);
  const [favs, setFavs]           = useState([]);
  const [votes, setVotes]         = useState([]);
  const [perfil, setPerfil]       = useState({ pais: 'España' });
  const [ofertasPorCafe, setOfertasPorCafe] = useState({});
  const [buscandoOfertaId, setBuscandoOfertaId] = useState(null);
  const [openOfferCafeId, setOpenOfferCafeId] = useState(null);
  const [errorOfertas, setErrorOfertas] = useState(null);
  const [gamification, setGamification] = useState(defaultGamification());
  const [cafeteriasInicio, setCafeteriasInicio] = useState([]);
  const [cargandoCafInicio, setCargandoCafInicio] = useState(false);
  const [errorCafInicio, setErrorCafInicio] = useState(null);
  const [forumCategory, setForumCategory] = useState(null);
  const [forumThread, setForumThread] = useState(null);
  const [forumSort, setForumSort] = useState('top');
  const [forumThreads, setForumThreads] = useState([]);
  const [forumReplies, setForumReplies] = useState([]);
  const [forumLoading, setForumLoading] = useState(false);
  const [forumError, setForumError] = useState(null);
  const [forumCreateOpen, setForumCreateOpen] = useState(false);
  const [forumSaving, setForumSaving] = useState(false);
  const [forumTitle, setForumTitle] = useState('');
  const [forumBody, setForumBody] = useState('');
  const [forumPhoto, setForumPhoto] = useState(null);
  const [forumEditOpen, setForumEditOpen] = useState(false);
  const [forumEditing, setForumEditing] = useState(false);
  const [forumEditTarget, setForumEditTarget] = useState(null);
  const [forumEditCollection, setForumEditCollection] = useState('');
  const [forumEditTitle, setForumEditTitle] = useState('');
  const [forumEditBody, setForumEditBody] = useState('');
  const [forumReplyText, setForumReplyText] = useState('');
  const [forumReplyTo, setForumReplyTo] = useState(null);
  const [forumSendingReply, setForumSendingReply] = useState(false);
  const [newsletterState, setNewsletterState] = useState({ subscribed: false, createdAt: '', subscribedAt: '', updatedAt: '' });
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSaving, setNewsletterSaving] = useState(false);
  const forumThreadScrollRef = useRef(null);
  const forumReplyInputRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const brandCardAnim = useRef(new Animated.Value(0)).current;
  const brandProgressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SecureStore.getItemAsync(KEY_FAVS).then(v => v && setFavs(JSON.parse(v))).catch(() => {});
    SecureStore.getItemAsync(KEY_VOTES).then(v => v && setVotes(JSON.parse(v))).catch(() => {});
    SecureStore.getItemAsync(KEY_PROFILE).then(v => v && setPerfil(JSON.parse(v))).catch(() => {});
    SecureStore.getItemAsync(KEY_GAMIFICATION).then((v) => {
      if (!v) return;
      try { setGamification(normalizeGamification(JSON.parse(v))); } catch {}
    }).catch(() => {});
    SecureStore.getItemAsync(KEY_OFFERS_CACHE)
      .then((v) => {
        if (!v) return;
        const parsed = JSON.parse(v);
        const cache = parsed?.byCafe || {};
        const now = Date.now();
        const fresh = {};
        Object.entries(cache).forEach(([cafeId, entry]) => {
          if (!entry?.updatedAt || !Array.isArray(entry?.offers)) return;
          if ((now - entry.updatedAt) <= OFFERS_CACHE_TTL_MS) fresh[cafeId] = entry;
        });
        setOfertasPorCafe(fresh);
      })
      .catch(() => {});
  }, []);

  const cargarCafeteriasInicio = async () => {
    setCargandoCafInicio(true);
    setErrorCafInicio(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorCafInicio('Activa la ubicación para ver cafeterías cercanas.');
        setCafeteriasInicio([]);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lon } = loc.coords;

      const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.photos,places.types',
        },
        body: JSON.stringify({
          includedTypes: ['cafe', 'coffee_shop'],
          maxResultCount: 6,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lon },
              radius: 2000.0,
            },
          },
          rankPreference: 'POPULARITY',
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error.message || 'Google Places no disponible');

      const places = json.places || [];
      const mapped = places.map((p) => {
        const geo = p.location || {};
        const dist = calcDist(lat, lon, geo.latitude || lat, geo.longitude || lon);
        return {
          id: p.id,
          nombre: (p.displayName && p.displayName.text) || 'Cafetería',
          rating: Number(p.rating || 0).toFixed(1),
          numResenas: p.userRatingCount || 0,
          distancia: dist,
          abierto: (p.currentOpeningHours && p.currentOpeningHours.openNow !== undefined) ? p.currentOpeningHours.openNow : null,
          foto: (p.photos && p.photos[0] && p.photos[0].name)
            ? 'https://places.googleapis.com/v1/' + p.photos[0].name + '/media?maxWidthPx=400&key=' + GOOGLE_PLACES_KEY
            : null,
        };
      });

      setCafeteriasInicio(mapped);
      if (mapped.length === 0) setErrorCafInicio('No encontramos cafeterías cerca ahora mismo.');
    } catch (e) {
      setErrorCafInicio('No se pudieron cargar cafeterías cercanas.');
      setCafeteriasInicio([]);
    } finally {
      setCargandoCafInicio(false);
    }
  };

  useEffect(() => {
    cargarCafeteriasInicio();
  }, []);

  const cargarNewsletter = async () => {
    if (!user?.uid) return;
    setNewsletterLoading(true);
    try {
      const doc = await getDocument('newsletter_subscribers', user.uid);
      if (doc) {
        setNewsletterState({
          subscribed: !!doc.subscribed,
          createdAt: doc.createdAt || '',
          subscribedAt: doc.subscribedAt || '',
          updatedAt: doc.updatedAt || '',
        });
      } else {
        setNewsletterState({ subscribed: false, createdAt: '', subscribedAt: '', updatedAt: '' });
      }
    } catch {
      setNewsletterState({ subscribed: false, createdAt: '', subscribedAt: '', updatedAt: '' });
    } finally {
      setNewsletterLoading(false);
    }
  };

  useEffect(() => {
    cargarNewsletter();
  }, [user?.uid]);

  const saveGamification = async (next) => {
    try { await SecureStore.setItemAsync(KEY_GAMIFICATION, JSON.stringify(next)); } catch {}
  };

  const registrarEventoGamificacion = (type, payload = {}) => {
    setGamification((prev) => {
      const base = { ...defaultGamification(), ...prev };
      const next = {
        ...base,
        countriesRated: [...(base.countriesRated || [])],
        specialOriginsTasted: [...(base.specialOriginsTasted || [])],
      };

      if (type === 'vote') {
        next.votesCount += 1;
        const p = payload?.cafe?.pais;
        if (p) next.countriesRated.push(p);
        const sig = normalize(`${payload?.cafe?.nombre || ''} ${payload?.cafe?.variedad || ''} ${payload?.cafe?.pais || ''}`);
        if (sig.includes('geisha')) next.specialOriginsTasted.push('geisha');
        if (sig.includes('bourbon pointu')) next.specialOriginsTasted.push('bourbon_pointu');
        if (sig.includes('yemen')) next.specialOriginsTasted.push('yemen');
      }

      if (type === 'favorite_mark') {
        next.favoritesMarkedCount += 1;
      }

      if (type === 'add_cafe') {
        next.cafesAddedCount += 1;
        if (payload?.hasPhoto) next.photosCount += 1;
        if (payload?.hasReview) next.reviewsCount += 1;
      }

      const normalized = normalizeGamification(next);
      saveGamification(normalized);
      return normalized;
    });
  };

  const guardarCacheOfertas = async (nextByCafe) => {
    try {
      await SecureStore.setItemAsync(KEY_OFFERS_CACHE, JSON.stringify({ byCafe: nextByCafe, savedAt: Date.now() }));
    } catch {}
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const cafes   = await getUserCafes(user.uid);
      const ranking = await getCollection('cafes', 'puntuacion', 100);
      const todos   = await getCollection('cafes', 'fecha', 100);
      // Ordenar mis cafés por fecha más reciente
      const cafesPorFecha = [...cafes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setMisCafes(cafesPorFecha);
      setTopCafes(ranking);
      setAllCafes(todos);
    } catch (e) { console.error('Error de carga:', e); }
    finally { setCargando(false); }
  };

  const parsePrecio = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return Number.POSITIVE_INFINITY;
    const n = Number(String(value).replace(',', '.').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
  };

  const decodeHtmlText = (value) => String(value || '')
    .replace(/\\u003d/g, '=')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u00a0/g, ' ')
    .replace(/\\u20ac/g, '€')
    .replace(/\\\//g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  const stripHtmlTags = (value) => decodeHtmlText(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

  const normalizarGoogleLink = (rawLink) => {
    const clean = decodeHtmlText(rawLink);
    if (!clean) return null;
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.startsWith('/url?')) {
      try {
        const params = new URLSearchParams(clean.split('?')[1] || '');
        return decodeURIComponent(params.get('q') || params.get('url') || '');
      } catch {
        return null;
      }
    }
    if (clean.startsWith('/')) return `https://www.google.com${clean}`;
    return null;
  };

  const inferTiendaFromLink = (link) => {
    try {
      const url = new URL(link);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return 'Google';
    }
  };

  const normalizarOfertaGoogle = (raw) => {
    const precio = parsePrecio(raw.price);
    const link = normalizarGoogleLink(raw.link);
    const tienda = decodeHtmlText(raw.store || raw.merchant || (link ? inferTiendaFromLink(link) : 'Google Shopping'));
    const titulo = stripHtmlTags(raw.title || 'Oferta de café');
    const priceText = decodeHtmlText(raw.price || 'Precio no visible');
    if (!titulo || !link) return null;
    return {
      id: `${titulo}-${tienda}-${priceText}`,
      titulo,
      tienda,
      precio,
      precioTexto: Number.isFinite(precio) ? `${precio.toFixed(2)}€` : priceText,
      link,
      fuente: 'Google',
    };
  };

  const extraerOfertasGoogleBusqueda = (html) => {
    const cards = html.split(/<a\s+href="\/url\?q=/i).slice(1);
    const offers = [];

    cards.forEach((fragment) => {
      const block = `/url?q=${fragment.slice(0, 1800)}`;
      const linkMatch = block.match(/^\/url\?q=([^&"]+)/i);
      const titleMatch = block.match(/<h3[^>]*>(.*?)<\/h3>/i) || block.match(/aria-label="([^"]{8,160})"/i);
      const priceMatch = block.match(/(\d{1,4}(?:[\.,]\d{2})\s?€)/i);
      if (!linkMatch || !titleMatch || !priceMatch) return;

      const link = decodeURIComponent(linkMatch[1]);
      const title = stripHtmlTags(titleMatch[1]);
      const store = inferTiendaFromLink(link);

      offers.push({
        title,
        price: priceMatch[1],
        merchant: store,
        link,
      });
    });

    return offers;
  };

  const extraerOfertasGoogle = (html) => {
    if (/trouble accessing Google Search|unusual traffic|SG_SS|detected unusual traffic/i.test(html)) {
      throw new Error('Google ha bloqueado temporalmente la consulta de ofertas');
    }

    const candidates = [];
    const patterns = [
      /"title":"([^\"]+?)".*?"price":"([^\"]+?)".*?"merchantName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
      /"fullTitle":"([^\"]+?)".*?"price":"([^\"]+?)".*?"merchantName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
      /"title":"([^\"]+?)".*?"merchantName":"([^\"]+?)".*?"price":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
      /"name":"([^\"]+?)".*?"price":"([^\"]+?)".*?"sellerName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
      /"title":"([^\"]+?)".*?"formattedPrice":"([^\"]+?)".*?"merchantName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
      /"productTitle":"([^\"]+?)".*?"price":"([^\"]+?)".*?"storeName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
      /"title":"([^\"]+?)".*?"priceAmount":"([^\"]+?)".*?"merchantName":"([^\"]+?)".*?"url":"([^\"]+?)"/g,
    ];

    patterns.forEach((pattern, index) => {
      for (const match of html.matchAll(pattern)) {
        if (index === 2) {
          candidates.push({ title: match[1], merchant: match[2], price: match[3], link: match[4] });
        } else {
          candidates.push({ title: match[1], price: match[2], merchant: match[3], link: match[4] });
        }
      }
    });

    extraerOfertasGoogleBusqueda(html).forEach((offer) => candidates.push(offer));

    const seen = new Set();
    const ofertas = candidates
      .map(normalizarOfertaGoogle)
      .filter(o => {
        if (!o?.id || seen.has(o.id)) return false;
        seen.add(o.id);
        return Number.isFinite(o.precio) && !!o.link;
      })
      .sort((a, b) => a.precio - b.precio)
      .slice(0, 3);

    return ofertas;
  };

  const buscarOfertasCafe = async (cafe, forceRefresh = false) => {
    if (!cafe?.id || !cafe?.nombre) return;
    const now = Date.now();
    const cached = ofertasPorCafe[cafe.id];
    if (!forceRefresh && cached?.updatedAt && Array.isArray(cached?.offers) && (now - cached.updatedAt) <= OFFERS_CACHE_TTL_MS) {
      return;
    }

    setBuscandoOfertaId(cafe.id);
    setErrorOfertas(null);

    try {
      const query = encodeURIComponent(`${cafe.nombre} café comprar precio`);
      const endpoints = [
        `https://www.google.com/search?tbm=shop&hl=es&gl=es&q=${query}`,
        `https://www.google.com/search?tbm=shop&gbv=1&hl=es&gl=es&q=${query}`,
        `https://www.google.com/search?hl=es&gl=es&q=${query}`,
      ];

      let ofertas = [];
      let lastError = null;

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            headers: {
              'Accept-Language': 'es-ES,es;q=0.9',
            },
          });
          if (!res.ok) {
            lastError = new Error(`Google respondió con ${res.status}`);
            continue;
          }
          const html = await res.text();
          ofertas = extraerOfertasGoogle(html);
          if (ofertas.length > 0) break;
        } catch (error) {
          lastError = error;
        }
      }

      if (ofertas.length === 0 && lastError) throw lastError;

      setOfertasPorCafe(prev => {
        const next = {
          ...prev,
          [cafe.id]: {
            updatedAt: Date.now(),
            offers: ofertas,
          },
        };
        guardarCacheOfertas(next);
        return next;
      });
      if (ofertas.length === 0) setErrorOfertas(`No encontramos ofertas en Google para ${cafe.nombre}.`);
    } catch (e) {
      setErrorOfertas('No se pudieron cargar ofertas de Google: ' + e.message);
    } finally {
      setBuscandoOfertaId(null);
    }
  };

  const abrirOfertasCafe = async (cafe, options = {}) => {
    if (!cafe?.id) return;
    setOpenOfferCafeId(cafe.id);
    if (options.navigate) setActiveTab('Ofertas');
    await buscarOfertasCafe(cafe, !!options.forceRefresh);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const toggleFav = async (cafe) => {
    const wasFav = favs.includes(cafe.id);
    const nf = wasFav ? favs.filter(f => f !== cafe.id) : [...favs, cafe.id];
    setFavs(nf);
    await SecureStore.setItemAsync(KEY_FAVS, JSON.stringify(nf)).catch(() => {});
    if (!wasFav) registrarEventoGamificacion('favorite_mark', { cafe });
  };

  const eliminarCafe = (item) => {
    Alert.alert('Eliminar', `¿Eliminar "${item.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteDocument('cafes', item.id); setCafeDetalle(null); cargarDatos(); }
        catch { Alert.alert('Error', 'No se pudo eliminar'); }
      }},
    ]);
  };

  const filtrar = (lista, query) => {
    if (!query.trim()) return lista;
    const q = normalize(query);
    return lista.filter(c =>
      normalize(c.nombre).includes(q) || normalize(c.pais).includes(q) ||
      normalize(c.region).includes(q) || normalize(c.origen).includes(q) ||
      normalize(c.variedad).includes(q) || normalize(c.proceso).includes(q) ||
      normalize(c.notas).includes(q)
    ).slice(0, 50);
  };

  const favCafes       = allCafes.filter(c => favs.includes(c.id));
  const cafesFiltrados = filtrar(misCafes, busquedaMis);
  const topFiltrados   = filtrar(topCafes, busquedaTop);
  const topCafesPais   = topCafes.filter(c => normalize(c.pais) === normalize(perfil.pais || 'España'));
  const topCafesVista  = topCafesPais.length > 0 ? topCafesPais : topCafes;
  // Últimos 10 de toda la BD: allCafes viene ordenado por fecha desc (ver cargarDatos)
  const ultimosGlobal = allCafes.slice(0, 10);
  const ultimos100    = allCafes.slice(0, 100);
  const top100        = topCafesVista.slice(0, 100);
  const cafesParaOfertas = allCafes.slice(0, 30);
  const forumThreadsByCategory = forumCategory
    ? forumThreads
        .filter((t) => t.categoryId === forumCategory.id)
        .sort((a, b) => {
          if (forumSort === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
          return (b.upvotes || 0) - (a.upvotes || 0);
        })
    : [];
  const forumRepliesByThread = forumThread
    ? forumReplies.filter((r) => r.threadId === forumThread.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : [];
  const forumTopReplies = forumRepliesByThread.filter((r) => !r.parentId);

  const abrirOfertaWeb = (oferta) => {
    if (!oferta?.link) return;
    Linking.openURL(oferta.link).catch(() => {});
  };

  const currentLevel = getLevelFromXp(gamification.xp);
  const nextLevel = LEVELS.find(l => l.minXp > gamification.xp) || null;
  const xpInLevel = nextLevel ? Math.max(0, gamification.xp - currentLevel.minXp) : gamification.xp;
  const xpRange = nextLevel ? Math.max(1, nextLevel.minXp - currentLevel.minXp) : Math.max(1, gamification.xp);
  const levelProgress = Math.min(1, xpInLevel / xpRange);
  const achievementDefs = getAchievementDefs();
  const unlockedAchievements = achievementDefs.filter(a => gamification.achievementIds.includes(a.id));
  const pendingAchievements = achievementDefs.filter(a => !gamification.achievementIds.includes(a.id));
  const achievementTotal = achievementDefs.length;
  const unlockedCount = unlockedAchievements.length;
  const achievementProgress = achievementTotal > 0 ? unlockedCount / achievementTotal : 0;
  const memberStatus = unlockedCount >= achievementTotal
    ? { icon: '👑', label: 'LEYENDA ETIOVE' }
    : unlockedCount >= Math.max(1, Math.ceil(achievementTotal * 0.75))
      ? { icon: '🏆', label: 'MAESTRO DE ORIGEN' }
      : unlockedCount >= Math.max(1, Math.ceil(achievementTotal * 0.4))
        ? { icon: '⭐', label: 'EXPLORADOR DE FINCA' }
        : { icon: '🌱', label: 'APRENDIZ DE TUESTE' };
  const brandCardTranslateY = brandCardAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const brandCardScale = brandCardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
  const brandProgressWidth = brandProgressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const profileAlias = (perfil.alias || perfil.nombre || user?.email?.split('@')[0] || 'Catador').trim();
  const profileName = `${perfil.nombre || ''} ${perfil.apellidos || ''}`.trim() || user?.email || 'Miembro Etiove';
  const profileInitial = (profileAlias || '?')[0].toUpperCase();
  const newsletterEmail = (perfil.email || user?.email || '').trim();
  const newsletterHasEmail = !!newsletterEmail;
  const forumAuthorName = (perfil.alias || perfil.nombre || user?.email?.split('@')[0] || 'Catador').trim();
  const voteWeight = currentLevel.name === 'Maestro' ? 2 : 1;

  const flag = getFlagForPais(perfil.pais || 'España');

  useEffect(() => {
    Animated.timing(brandCardAnim, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [brandCardAnim]);

  useEffect(() => {
    Animated.timing(brandProgressAnim, {
      toValue: levelProgress,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [brandProgressAnim, levelProgress]);

  const cargarForo = async () => {
    setForumLoading(true);
    setForumError(null);
    try {
      const [hilos, respuestas] = await Promise.all([
        getCollection('foro_hilos', 'createdAt', 300),
        getCollection('foro_respuestas', 'createdAt', 1200),
      ]);
      setForumThreads(hilos || []);
      setForumReplies(respuestas || []);
      setForumThread((prev) => {
        if (!prev?.id) return prev;
        const updated = (hilos || []).find((t) => t.id === prev.id);
        return updated || prev;
      });
    } catch (e) {
      setForumError('No se pudo cargar la comunidad.');
    } finally {
      setForumLoading(false);
    }
  };

  const hasUserVotedForoItem = (item) => !!user?.uid && csvToSet(item?.voterUids).has(user.uid);
  const hasUserReportedForoItem = (item) => !!user?.uid && csvToSet(item?.reporterUids).has(user.uid);
  const isForumOwner = (item) => !!user?.uid && item?.authorUid === user.uid;

  useEffect(() => {
    if (activeTab === 'Comunidad' && forumThreads.length === 0 && !forumLoading) {
      cargarForo();
    }
  }, [activeTab]);

  const guardarNewsletter = async (nextSubscribed) => {
    if (!user?.uid) return;
    if (!newsletterHasEmail) {
      Alert.alert('Falta tu email', 'Completa tu perfil antes de suscribirte a la newsletter.');
      return;
    }

    setNewsletterSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        uid: user.uid,
        email: newsletterEmail,
        emailLower: newsletterEmail.toLowerCase(),
        alias: perfil.alias || '',
        nombre: perfil.nombre || '',
        apellidos: perfil.apellidos || '',
        subscribed: nextSubscribed,
        source: 'app_mas',
        createdAt: newsletterState.createdAt || now,
        subscribedAt: nextSubscribed ? (newsletterState.subscribedAt || now) : '',
        unsubscribedAt: nextSubscribed ? '' : now,
        updatedAt: now,
      };

      const ok = await setDocument('newsletter_subscribers', user.uid, payload);
      if (!ok) throw new Error('save_newsletter_failed');

      setNewsletterState({
        subscribed: nextSubscribed,
        createdAt: payload.createdAt,
        subscribedAt: payload.subscribedAt,
        updatedAt: payload.updatedAt,
      });
      Alert.alert(
        nextSubscribed ? 'Newsletter activada' : 'Newsletter pausada',
        nextSubscribed
          ? 'Te avisaremos por email de novedades, lanzamientos y selecciones especiales.'
          : 'Has dejado de recibir emails. Podrás activarlos otra vez cuando quieras.'
      );
    } catch {
      Alert.alert('Error', 'No se pudo guardar tu preferencia de newsletter.');
    } finally {
      setNewsletterSaving(false);
    }
  };

  const seleccionarFotoForo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permiso denegado', 'Necesitas permitir acceso a galería.');
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.7 });
    if (!res.canceled) setForumPhoto(res.assets[0].uri);
  };

  const crearHiloForo = async () => {
    const title = forumTitle.trim();
    const body = forumBody.trim();
    if (!forumCategory) return Alert.alert('Categoría', 'Selecciona una categoría.');
    if (!title || !body) return Alert.alert('Completa el hilo', 'Añade título y contenido.');
    if (title.length > 120) return Alert.alert('Título demasiado largo', 'Máximo 120 caracteres.');
    if (body.length > 1000) return Alert.alert('Contenido demasiado largo', 'Máximo 1000 caracteres.');

    setForumSaving(true);
    try {
      const uploadedImage = forumPhoto ? await uploadImageToStorage(forumPhoto, 'foro_hilos') : '';
      await addDocument('foro_hilos', {
        categoryId: forumCategory.id,
        categoryLabel: forumCategory.label,
        title,
        body,
        image: uploadedImage,
        authorUid: user.uid,
        authorName: forumAuthorName,
        authorLevel: currentLevel.name,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        voterUids: '',
        replyCount: 0,
        reportedCount: 0,
        reporterUids: '',
      });
      setForumCreateOpen(false);
      setForumTitle('');
      setForumBody('');
      setForumPhoto(null);
      await cargarForo();
    } catch {
      Alert.alert('Error', 'No se pudo crear el hilo.');
    } finally {
      setForumSaving(false);
    }
  };

  const votarEnForo = async (collection, item) => {
    if (!item?.id || !user?.uid) return;
    if (hasUserReportedForoItem(item)) return Alert.alert('Acción no permitida', 'Ya reportaste este contenido. No puedes votarlo.');
    const voters = csvToSet(item.voterUids);
    if (voters.has(user.uid)) return Alert.alert('Voto registrado', 'Ya votaste este contenido.');
    voters.add(user.uid);
    const ok = await updateDocument(collection, item.id, {
      upvotes: Number(item.upvotes || 0) + voteWeight,
      voterUids: setToCsv(voters),
    });
    if (!ok) return Alert.alert('Error', 'No se pudo guardar tu voto. Inténtalo de nuevo.');
    await cargarForo();
  };

  const reportarForo = async (collection, item) => {
    if (!item?.id || !user?.uid) return;
    if (hasUserVotedForoItem(item)) return Alert.alert('Acción no permitida', 'Ya votaste este contenido. No puedes reportarlo.');
    const reporters = csvToSet(item.reporterUids);
    if (reporters.has(user.uid)) return Alert.alert('Reporte enviado', 'Ya reportaste este contenido.');
    reporters.add(user.uid);
    const ok = await updateDocument(collection, item.id, {
      reportedCount: Number(item.reportedCount || 0) + 1,
      reporterUids: setToCsv(reporters),
    });
    if (!ok) return Alert.alert('Error', 'No se pudo guardar tu reporte. Inténtalo de nuevo.');
    Alert.alert('Gracias', 'Reporte enviado a moderación.');
    await cargarForo();
  };

  const enviarRespuestaForo = async () => {
    if (!forumThread?.id) return;
    const text = forumReplyText.trim();
    if (!text) return;
    if (text.length > 1000) return Alert.alert('Respuesta demasiado larga', 'Máximo 1000 caracteres.');

    setForumSendingReply(true);
    try {
      await addDocument('foro_respuestas', {
        threadId: forumThread.id,
        parentId: forumReplyTo?.id || '',
        body: text,
        authorUid: user.uid,
        authorName: forumAuthorName,
        authorLevel: currentLevel.name,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        voterUids: '',
        reportedCount: 0,
        reporterUids: '',
      });
      await updateDocument('foro_hilos', forumThread.id, {
        replyCount: Number(forumThread.replyCount || 0) + 1,
      });
      setForumReplyText('');
      setForumReplyTo(null);
      await cargarForo();
    } catch {
      Alert.alert('Error', 'No se pudo enviar tu respuesta.');
    } finally {
      setForumSendingReply(false);
    }
  };

  const prepararRespuestaForo = (targetReply = null) => {
    setForumReplyTo(targetReply);
    requestAnimationFrame(() => {
      forumThreadScrollRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => forumReplyInputRef.current?.focus?.(), 120);
    });
  };

  const abrirEditorForo = (collection, item) => {
    if (!isForumOwner(item)) return;
    setForumEditCollection(collection);
    setForumEditTarget(item);
    setForumEditTitle(collection === 'foro_hilos' ? String(item.title || '') : '');
    setForumEditBody(String(item.body || ''));
    setForumEditOpen(true);
  };

  const guardarEdicionForo = async () => {
    if (!forumEditTarget?.id || !forumEditCollection) return;
    const body = forumEditBody.trim();
    if (!body) return Alert.alert('Contenido vacío', 'Escribe contenido para guardar.');
    if (body.length > 1000) return Alert.alert('Contenido demasiado largo', 'Máximo 1000 caracteres.');

    let payload = { body };
    if (forumEditCollection === 'foro_hilos') {
      const title = forumEditTitle.trim();
      if (!title) return Alert.alert('Título vacío', 'Escribe un título para el hilo.');
      if (title.length > 120) return Alert.alert('Título demasiado largo', 'Máximo 120 caracteres.');
      payload = { title, body };
    }

    setForumEditing(true);
    try {
      const ok = await updateDocument(forumEditCollection, forumEditTarget.id, payload);
      if (!ok) return Alert.alert('Error', 'No se pudo guardar la edición.');
      setForumEditOpen(false);
      setForumEditTarget(null);
      setForumEditCollection('');
      await cargarForo();
    } finally {
      setForumEditing(false);
    }
  };

  const eliminarItemForo = (collection, item) => {
    if (!item?.id || !isForumOwner(item)) return;
    Alert.alert('Eliminar', 'Esta acción no se puede deshacer. ¿Deseas continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            if (collection === 'foro_hilos') {
              const relatedReplies = forumReplies.filter((r) => r.threadId === item.id);
              if (relatedReplies.length > 0) {
                await Promise.allSettled(relatedReplies.map((r) => deleteDocument('foro_respuestas', r.id)));
              }
              await deleteDocument('foro_hilos', item.id);
              if (forumThread?.id === item.id) setForumThread(null);
            } else {
              const repliesToDelete = [item.id];
              if (!item.parentId) {
                forumReplies
                  .filter((r) => r.parentId === item.id)
                  .forEach((r) => repliesToDelete.push(r.id));
              }
              await Promise.allSettled(repliesToDelete.map((id) => deleteDocument('foro_respuestas', id)));
              if (forumThread?.id === item.threadId) {
                await updateDocument('foro_hilos', item.threadId, {
                  replyCount: Math.max(0, Number(forumThread.replyCount || 0) - repliesToDelete.length),
                });
              }
            }
            await cargarForo();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el contenido.');
          }
        },
      },
    ]);
  };

  const abrirMenuAutorForo = (collection, item) => {
    if (!isForumOwner(item)) return;
    Alert.alert('Opciones', 'Elige una acción', [
      { text: 'Editar', onPress: () => abrirEditorForo(collection, item) },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarItemForo(collection, item) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={s.permScreen}>
        <Ionicons name="cafe" size={72} color={PREMIUM_ACCENT} />
        <Text style={s.permTitle}>Etiove necesita la cámara</Text>
        <Text style={s.permSub}>Para escanear paquetes de café</Text>
        <TouchableOpacity style={s.redBtn} onPress={requestPermission}><Text style={s.redBtnText}>Activar cámara</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (scanning) return <ScannerScreen onScanned={() => { setScanning(false); setShowForm(true); }} onSkip={() => { setScanning(false); setShowForm(true); }} onBack={() => setScanning(false)} />;
  if (showForm) return <FormScreen onBack={() => setShowForm(false)} onSave={() => { setShowForm(false); setActiveTab('Mis Cafés'); cargarDatos(); }} onCafeAdded={(cafe) => registrarEventoGamificacion('add_cafe', { hasPhoto: !!cafe?.foto, hasReview: !!String(cafe?.notas || '').trim() })} />;

  const communityTabProps = {
    s,
    theme: THEME,
    premiumAccent: PREMIUM_ACCENT,
    forumCategories: FORUM_CATEGORIES,
    forumCategory,
    setForumCategory,
    forumThread,
    setForumThread,
    forumCreateOpen,
    setForumCreateOpen,
    forumSort,
    setForumSort,
    forumLoading,
    forumThreadsByCategory,
    forumError,
    formatRelativeTime,
    forumThreadScrollRef,
    hasUserVotedForoItem,
    hasUserReportedForoItem,
    isForumOwner,
    abrirMenuAutorForo,
    votarEnForo,
    reportarForo,
    forumTopReplies,
    forumRepliesByThread,
    prepararRespuestaForo,
    setForumReplyTo,
    forumReplyTo,
    forumReplyInputRef,
    forumReplyText,
    setForumReplyText,
    enviarRespuestaForo,
    forumSendingReply,
    forumTitle,
    setForumTitle,
    forumBody,
    setForumBody,
    forumPhoto,
    seleccionarFotoForo,
    crearHiloForo,
    forumSaving,
    forumEditOpen,
    setForumEditOpen,
    forumEditCollection,
    forumEditTitle,
    setForumEditTitle,
    forumEditBody,
    setForumEditBody,
    guardarEdicionForo,
    forumEditing,
  };

  const inicioTabProps = {
    s,
    perfil,
    setShowProfile,
    brandCardAnim,
    brandCardTranslateY,
    brandCardScale,
    profileInitial,
    profileAlias,
    profileName,
    currentLevel,
    gamification,
    nextLevel,
    brandProgressWidth,
    busqueda,
    setBusqueda,
    SearchInput,
    allCafes,
    filtrar,
    CardVertical,
    setCafeDetalle,
    favs,
    toggleFav,
    ultimosGlobal,
    setActiveTab,
    cargando,
    premiumAccent: PREMIUM_ACCENT,
    CardHorizontal,
    topCafesVista,
    flag,
    cargandoCafInicio,
    errorCafInicio,
    cafeteriasInicio,
    theme: THEME,
    cafesParaOfertas,
    abrirOfertasCafe,
    PackshotImage,
    abrirOfertaWeb,
    ofertasPorCafe,
    buscandoOfertaId,
    openOfferCafeId,
    errorOfertas,
  };

  const misCafesTabProps = {
    s,
    cargando,
    allCafes,
    registrarEventoGamificacion,
    QuizSection,
    favCafes,
    CardHorizontal,
    setCafeDetalle,
    favs,
    toggleFav,
    busquedaMis,
    setBusquedaMis,
    misCafes,
    SearchInput,
    cafesFiltrados,
    CardVertical,
    eliminarCafe,
    premiumAccent: PREMIUM_ACCENT,
  };

  const ultimosAnadidosTabProps = {
    s,
    setActiveTab,
    premiumAccent: PREMIUM_ACCENT,
    cargando,
    ultimos100,
    CardVertical,
    setCafeDetalle,
    favs,
    toggleFav,
  };

  const topCafesTabProps = {
    s,
    setActiveTab,
    premiumAccent: PREMIUM_ACCENT,
    perfil,
    cargando,
    top100,
    CardVertical,
    setCafeDetalle,
    favs,
    toggleFav,
  };

  const ofertasTabProps = {
    s,
    setActiveTab,
    premiumAccent: PREMIUM_ACCENT,
    cafesParaOfertas,
    ofertasPorCafe,
    buscandoOfertaId,
    openOfferCafeId,
    abrirOfertasCafe,
    PackshotImage,
    abrirOfertaWeb,
    theme: THEME,
    premiumAccentDeep: PREMIUM_ACCENT_DEEP,
    errorOfertas,
  };

  const masTabProps = {
    s,
    mas,
    perfil,
    profileInitial,
    profileAlias,
    profileName,
    memberStatus,
    unlockedCount,
    achievementTotal,
    pendingAchievements,
    achievementProgress,
    setShowProfile,
    setActiveTab,
    premiumAccentDeep: PREMIUM_ACCENT_DEEP,
    unlockedAchievements,
    newsletterState,
    guardarNewsletter,
    newsletterLoading,
    newsletterSaving,
    newsletterHasEmail,
    newsletterEmail,
    onLogout,
    appVersion: APP_VERSION,
    premiumAccent: PREMIUM_ACCENT,
    iconFaint: THEME.icon.faint,
  };

  const bottomBarProps = {
    s,
    activeTab,
    setActiveTab,
    setScanning,
    favs,
    accentColor: PREMIUM_ACCENT,
    inactiveColor: THEME.icon.inactive,
  };

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {cafeDetalle && (
        <CafeDetailScreen
          cafe={cafeDetalle}
          onClose={() => { setCafeDetalle(null); cargarDatos(); }}
          onDelete={cafeDetalle.uid === user.uid ? eliminarCafe : null}
          favs={favs} onToggleFav={toggleFav}
          votes={votes} setVotes={setVotes}
          onVote={(cafe) => registrarEventoGamificacion('vote', { cafe })}
        />
      )}
      {showProfile && (
        <ProfileScreen onClose={() => { setShowProfile(false); SecureStore.getItemAsync(KEY_PROFILE).then(v => v && setPerfil(JSON.parse(v))).catch(() => {}); }} />
      )}

      {/* Cafeterías se renderiza fuera del ScrollView para evitar FlatList anidado */}
      {activeTab === 'Cafeterías' && (
        <View style={{ flex: 1 }}>
          <CafeteriasScreen />
        </View>
      )}

      {activeTab === 'Comunidad' && (
        <CommunityTab {...communityTabProps} />
      )}

      {activeTab !== 'Cafeterías' && activeTab !== 'Comunidad' && (
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── INICIO ── */}
        {activeTab === 'Inicio' && (
          <InicioTab {...inicioTabProps} />
        )}

        {/* ── MIS CAFÉS ── */}
        {activeTab === 'Mis Cafés' && (
          <MisCafesTab {...misCafesTabProps} />
        )}

        {/* ── ÚLTIMOS AÑADIDOS (100) ── */}
        {activeTab === 'Últimos añadidos' && (
          <UltimosAnadidosTab {...ultimosAnadidosTabProps} />
        )}

        {/* ── TOP CAFÉS (100) ── */}
        {activeTab === 'Top cafés' && (
          <TopCafesTab {...topCafesTabProps} />
        )}

        {/* ── OFERTAS WEB ── */}
        {activeTab === 'Ofertas' && (
          <OfertasTab {...ofertasTabProps} />
        )}

        {/* ── MÁS ── */}
        {activeTab === 'Más' && (
          <MasTab {...masTabProps} />
        )}
      </ScrollView>
      )}

      {!(activeTab === 'Comunidad' && !!forumThread) && (
        <BottomBarNav {...bottomBarProps} />
      )}
    </SafeAreaView>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]               = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShowWelcome(false), 4000); return () => clearTimeout(t); }, []);
  if (showWelcome) return <WelcomeScreen />;
  return (
    <AuthContext.Provider value={{ user }}>
      {user ? <MainScreen onLogout={() => setUser(null)} /> : <AuthScreen onAuth={setUser} />}
    </AuthContext.Provider>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#fff' },
  welcomeScreen:    { flex: 1, backgroundColor: '#f6efe7', alignItems: 'center', justifyContent: 'center', padding: 24 },
  welcomeAuraOne:   { position: 'absolute', top: 90, right: -20, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(119, 82, 57, 0.08)' },
  welcomeAuraTwo:   { position: 'absolute', bottom: 80, left: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255, 248, 241, 0.76)' },
  welcomeCard:      { width: '100%', borderRadius: 30, backgroundColor: '#fffaf5', borderWidth: 1, borderColor: '#eadbce', paddingVertical: 34, paddingHorizontal: 22, alignItems: 'center', shadowColor: '#3a2416', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  welcomeTypeBox:   { width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 130, gap: 6 },
  welcomeLineTop:   { fontSize: 24, fontWeight: '900', letterSpacing: 4.1, color: '#5e4332' },
  welcomeLineBottom:{ fontSize: 44, fontWeight: '900', letterSpacing: 5.8, color: '#1c120d' },
  welcomeTitle:     { fontSize: 44, fontWeight: '900', letterSpacing: 5.8, color: '#1c120d' },
  welcomeSub:       { fontSize: 10, color: '#6f5444', fontWeight: '800', letterSpacing: 2.1, textAlign: 'center', marginTop: 2 },
  welcomeCaption:   { marginTop: 18, fontSize: 13, color: '#8a6d5b', fontWeight: '600', letterSpacing: 0.4, textAlign: 'center' },
  permScreen:       { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permTitle:        { fontSize: 22, fontWeight: '700', color: '#111', textAlign: 'center' },
  permSub:          { fontSize: 15, color: THEME.text.secondary, textAlign: 'center' },
  authScroll:       { padding: 24, paddingTop: 36, paddingBottom: 40, flexGrow: 1, justifyContent: 'center', backgroundColor: '#f6efe7' },
  authShell:        { position: 'relative', gap: 22 },
  authAuraOne:      { position: 'absolute', top: -28, right: -18, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(119, 82, 57, 0.09)' },
  authAuraTwo:      { position: 'absolute', bottom: 90, left: -36, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255, 248, 241, 0.72)' },
  authBrandBlock:   { paddingTop: 8, paddingBottom: 2 },
  authTitle:        { fontSize: 30, fontWeight: '800', color: '#1f140f', marginBottom: 8 },
  authSub:          { fontSize: 15, color: '#7e6b5f', marginBottom: 24, lineHeight: 22 },
  authKicker:       { fontSize: 11, fontWeight: '800', color: '#8d6d58', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 10 },
  authCard:         { backgroundColor: '#fffaf5', borderRadius: 28, padding: 22, borderWidth: 1, borderColor: '#eadbce', shadowColor: '#3a2416', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  authLinks:        { marginTop: 20, gap: 12, alignItems: 'center' },
  authLink:         { color: THEME.brand.accentDeep, fontSize: 14, fontWeight: '700' },
  authLinkMuted:    { color: '#8f837a', fontSize: 14, fontWeight: '600' },
  rememberRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  rememberText:     { fontSize: 14, color: THEME.text.tertiary },
  authRememberText: { color: '#5f534b' },
  faceIdBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 14, borderWidth: 1.5, borderColor: THEME.brand.accentDeep, borderRadius: 30, backgroundColor: '#f9f2ea' },
  faceIdText:       { color: THEME.brand.accentDeep, fontWeight: '700', fontSize: 15 },
  authLabel:        { color: '#836e61' },
  authInput:        { backgroundColor: '#f8f1ea', borderWidth: 1, borderColor: '#e8dacd', color: '#221610' },
  authPrimaryBtn:   { backgroundColor: THEME.brand.primary, borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 8, shadowColor: THEME.brand.primary, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  authPrimaryBtnText:{ color: THEME.brand.onPrimary, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  authSecondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, padding: 14, borderWidth: 1.2, borderColor: '#dcc8b7', borderRadius: 30, backgroundColor: '#f9f2ea' },
  authSecondaryBtnText:{ color: THEME.brand.accentDeep, fontWeight: '700', fontSize: 15 },
  topBar:           { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 10 },
  homeBrandWrap:    { alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 2, paddingBottom: 2 },
  homeWordmark:     { fontSize: 42, fontWeight: '900', letterSpacing: 6, color: '#1c120d', textShadowColor: 'rgba(111, 84, 68, 0.08)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  homeLoverRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  homeLoverText:    { fontSize: 10, fontWeight: '800', color: '#6f5444', letterSpacing: 2.2 },
  homeMiniSealOuter:{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#c4a18a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf7f1' },
  homeMiniSealMiddle:{ width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(154, 121, 99, 0.4)', alignItems: 'center', justifyContent: 'center' },
  homeMiniSealInner:{ width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#8f6a53', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2e7dc' },
  homeMiniSealText: { fontSize: 8, fontWeight: '900', color: '#6f5444', letterSpacing: 0.5 },
  wordmarkWrap:     { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 2, paddingTop: 4 },
  wordmarkCrest:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 3 },
  wordmarkMiniLabelWrap:{ minWidth: 78, alignItems: 'center' },
  wordmarkMiniLabel:{ fontSize: 9, fontWeight: '800', color: '#9a7963', letterSpacing: 2.2 },
  wordmarkSealOuter:{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#c4a18a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf7f1' },
  wordmarkSealMiddle:{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(154, 121, 99, 0.38)', alignItems: 'center', justifyContent: 'center' },
  wordmarkSeal:     { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#8f6a53', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2e7dc' },
  wordmarkSealText: { fontSize: 11, fontWeight: '900', color: '#6f5444', letterSpacing: 1.1 },
  wordmark:         { fontSize: 40, fontWeight: '900', letterSpacing: 5.8, color: '#1c120d', textShadowColor: 'rgba(111, 84, 68, 0.08)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  wordmarkSub:      { fontSize: 10, color: '#8a6b57', fontWeight: '800', letterSpacing: 3.2, marginTop: -2 },
  wordmarkTag:      { fontSize: 10, color: '#6f5444', fontWeight: '800', letterSpacing: 2.1, textAlign: 'center', marginTop: 2 },
  authWordmarkSub:  { marginBottom: 10 },
  authWordmarkTag:  { marginTop: 0 },
  locationPill:     { position: 'relative', overflow: 'hidden', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10, minWidth: 210, backgroundColor: '#1f140f', borderWidth: 1, borderColor: '#4e3426', shadowColor: '#170d08', shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  locationText:     { fontSize: 15, fontWeight: '800', color: '#f8ead9', letterSpacing: 0.2 },
  brandPillContent: { gap: 6 },
  brandEyebrow:     { fontSize: 9, fontWeight: '700', color: '#d6b89b', textTransform: 'uppercase', letterSpacing: 1.1 },
  brandRow:         { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  brandMemberRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  brandMemberIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  brandMemberAvatar:{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.2, borderColor: 'rgba(255, 236, 220, 0.2)' },
  brandMemberAvatarFallback:{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 248, 241, 0.1)', borderWidth: 1.2, borderColor: 'rgba(255, 236, 220, 0.14)', alignItems: 'center', justifyContent: 'center' },
  brandMemberAvatarText:{ color: '#fff1e4', fontSize: 15, fontWeight: '800' },
  brandMemberCopy:  { flex: 1, gap: 2 },
  brandAlias:       { fontSize: 14, fontWeight: '800', color: '#fff4ea' },
  brandName:        { fontSize: 10, color: '#d2bead' },
  brandTitleWrap:   { flex: 1, gap: 3 },
  brandLevelBadge:  { backgroundColor: 'rgba(248, 225, 198, 0.12)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(248, 225, 198, 0.18)' },
  brandLevelText:   { fontSize: 10, fontWeight: '800', color: '#fff4ea' },
  brandXpText:      { fontSize: 11, color: '#d4c1b1', fontWeight: '600' },
  brandMetaRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  brandMetaText:    { fontSize: 10, color: '#c9ab90' },
  brandProgressTrack:{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255, 244, 234, 0.12)', overflow: 'hidden' },
  brandProgressFill:{ height: '100%', borderRadius: 999, backgroundColor: '#d18b4a' },
  brandStatsRow:    { flexDirection: 'row', gap: 6 },
  brandStatCard:    { flex: 1, backgroundColor: 'rgba(255, 248, 241, 0.06)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255, 234, 214, 0.08)', alignItems: 'center' },
  brandStatValue:   { fontSize: 13, fontWeight: '800', color: '#fff1e4' },
  brandStatLabel:   { fontSize: 9, color: '#cfb39a', marginTop: 1 },
  brandDecorOne:    { position: 'absolute', top: -30, right: -20, width: 94, height: 94, borderRadius: 47, backgroundColor: 'rgba(209, 139, 74, 0.13)' },
  brandDecorTwo:    { position: 'absolute', bottom: -48, left: -26, width: 98, height: 98, borderRadius: 49, backgroundColor: 'rgba(255, 244, 234, 0.06)' },
  brandTopRule:     { position: 'absolute', top: 0, left: 14, right: 14, height: 1, backgroundColor: 'rgba(255, 238, 220, 0.18)' },
  profileBtn:       { padding: 2 },
  profileAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: PREMIUM_ACCENT, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileAvatarText:{ color: THEME.text.inverse, fontWeight: '700', fontSize: 16 },
  searchWrap:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 10, backgroundColor: '#f5f5f5', borderRadius: 25, paddingHorizontal: 14, height: 44 },
  searchInput:      { flex: 1, fontSize: 15, color: '#222', marginLeft: 8 },
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 2 },
  sectionTitle:     { fontSize: 20, fontWeight: '700', color: '#111' },
  sectionSub:       { fontSize: 13, color: THEME.text.secondary, paddingHorizontal: 16, marginBottom: 14 },
  pageTitle:        { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 12 },
  empty:            { color: THEME.text.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  packshotFrame:    { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#f1ece4', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2, alignItems: 'center', justifyContent: 'center' },
  packshotInner:    { width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  packshotImage:    { width: '84%', height: '84%' },
  packshotHeroFrame:{ width: '68%', height: '72%', borderRadius: 28, padding: 14 },
  packshotHeroImage:{ width: '88%', height: '88%' },
  packshotCardFrame:{ width: 132, height: 172, marginTop: 14, borderRadius: 18, padding: 10 },
  packshotCardImage:{ width: '86%', height: '86%' },
  packshotListFrame:{ width: 68, height: 88, borderRadius: 14, padding: 8 },
  packshotListImage:{ width: '88%', height: '88%' },
  cardH:            { width: 160, marginRight: 4 },
  cardHImg:         { width: 160, height: 200, borderRadius: 10, backgroundColor: '#f8f7f4', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  cardHOrigin:      { fontSize: 12, color: THEME.text.secondary, marginBottom: 2 },
  cardHName:        { fontSize: 14, fontWeight: '700', color: '#111', lineHeight: 19 },
  cardHRating:      { fontSize: 13, fontWeight: '600', color: PREMIUM_ACCENT },
  cardHVotos:       { fontSize: 12, color: THEME.text.secondary },
  cardV:            { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: THEME.border.soft },
  cardVImg:         { width: 80, height: 100, borderRadius: 10, backgroundColor: '#f8f7f4', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  cardVOrigin:      { fontSize: 12, color: THEME.text.secondary, marginBottom: 2 },
  cardVName:        { fontSize: 15, fontWeight: '700', color: THEME.text.primary, marginBottom: 5 },
  cardVNotas:       { fontSize: 12, color: THEME.text.muted, marginTop: 5, lineHeight: 17 },
  offerHint:        { fontSize: 12, color: '#666', marginTop: 8 },
  offerMetaRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  offerSourceBadge: { fontSize: 10, fontWeight: '800', color: '#fff', backgroundColor: '#111', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 3 },
  badgeRed:         { position: 'absolute', top: 8, left: 8, backgroundColor: PREMIUM_ACCENT, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:        { color: '#fff', fontSize: 11, fontWeight: '700' },
  rankRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: THEME.border.soft },
  rankNum:          { fontSize: 22, fontWeight: '700', color: '#ccc', width: 28 },
  rankName:         { fontSize: 15, fontWeight: '600', color: '#111' },
  rankVotos:        { fontSize: 12, color: THEME.text.secondary, marginTop: 2 },
  redBtn:           { backgroundColor: THEME.brand.primary, borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: THEME.brand.primaryBorder, shadowColor: THEME.brand.primary, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  redBtnText:       { color: THEME.brand.onPrimary, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  bottomBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.surface.base, borderTopWidth: 0.5, borderTopColor: THEME.border.soft, flexDirection: 'row', alignItems: 'center', paddingBottom: 20, paddingTop: 10 },
  tabBtn:           { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel:         { fontSize: 10, color: THEME.text.secondary },
  tabBadge:         { position: 'absolute', top: -4, right: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: THEME.brand.accent, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText:     { color: THEME.text.inverse, fontSize: 9, fontWeight: '700' },
  camBtn:           { width: 60, height: 60, borderRadius: 30, backgroundColor: THEME.brand.primary, borderWidth: 1.5, borderColor: THEME.brand.primaryBorderStrong, alignItems: 'center', justifyContent: 'center', marginTop: -20, shadowColor: THEME.brand.primary, shadowOpacity: 0.34, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  formScroll:       { padding: 20, paddingTop: 52, paddingBottom: 50 },
  backRow:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  backText:         { color: PREMIUM_ACCENT_DEEP, fontSize: 15 },
  formTitle:        { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 20 },
  fotoEmpty:        { backgroundColor: '#f5f5f5', borderRadius: 14, height: 140, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  fotoEmptyText:    { color: THEME.text.muted, fontSize: 14 },
  fotoFull:         { width: '100%', height: 200, borderRadius: 14, marginBottom: 8 },
  retake:           { color: PREMIUM_ACCENT_DEEP, fontSize: 13, textAlign: 'right', marginBottom: 20 },
  label:            { fontSize: 12, fontWeight: '600', color: THEME.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input:            { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', marginBottom: 18 },
  forumCatCard:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ece2d8', padding: 14 },
  forumCatEmoji:    { fontSize: 22 },
  forumCatTitle:    { fontSize: 15, fontWeight: '800', color: THEME.text.primary },
  forumCatDesc:     { fontSize: 12, color: THEME.text.secondary, marginTop: 2 },
  forumHeaderRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  forumNewBtn:      { backgroundColor: THEME.brand.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  forumNewBtnText:  { color: THEME.brand.onPrimary, fontWeight: '700', fontSize: 12 },
  forumSortRow:     { flexDirection: 'row', gap: 8, marginTop: 8 },
  forumSortChip:    { borderRadius: 999, borderWidth: 1, borderColor: '#e0d0c1', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  forumSortChipActive:{ backgroundColor: '#2f1d14', borderColor: '#2f1d14' },
  forumSortText:    { fontSize: 12, color: THEME.brand.accentDeep, fontWeight: '700' },
  forumSortTextActive:{ color: '#fff' },
  forumThreadCard:  { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ece2d8', padding: 12 },
  forumThreadTitle: { fontSize: 15, fontWeight: '800', color: THEME.text.primary, marginBottom: 4 },
  forumThreadBody:  { fontSize: 13, color: '#4a3f36', lineHeight: 20 },
  forumMetaRow:     { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forumAuthorRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  forumAvatar:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9ddcf' },
  forumAvatarText:  { fontSize: 12, fontWeight: '800', color: THEME.brand.accentDeep },
  forumAuthorName:  { fontSize: 12, fontWeight: '700', color: THEME.text.primary },
  forumAuthorLevel: { fontSize: 10, color: THEME.brand.accentDeep, fontWeight: '700' },
  forumMetaText:    { fontSize: 11, color: THEME.text.secondary },
  forumCountersRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  forumCounter:     { fontSize: 12, color: THEME.text.tertiary, fontWeight: '600' },
  forumMainPost:    { marginTop: 4, backgroundColor: PREMIUM_SURFACE_SOFT, borderRadius: 14, borderWidth: 1, borderColor: PREMIUM_BORDER_SOFT, padding: 14 },
  forumMainPostHead:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  forumMainPostImage:{ marginTop: 8, width: '100%', height: 160, borderRadius: 10 },
  forumReplyCard:   { marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#efe6dc', padding: 10 },
  forumChildReplyCard:{ marginTop: 8, marginLeft: 14, backgroundColor: '#faf6f1', borderRadius: 10, borderWidth: 1, borderColor: '#f0e6db', padding: 9 },
  forumActionBtn:   { backgroundColor: '#f7efe6', borderWidth: 1, borderColor: '#e6d5c4', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  forumActionText:  { fontSize: 12, color: THEME.brand.accentDeep, fontWeight: '700' },
  forumActionBtnDisabled:{ backgroundColor: '#f3f0eb', borderColor: '#e3ddd6' },
  forumActionTextDisabled:{ color: '#a39a90' },
  forumMetaActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  forumDotsBtn:     { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7efe6', borderWidth: 1, borderColor: '#e6d5c4' },
  forumComposerWrap:{ borderTopWidth: 1, borderTopColor: '#e8ddd2', backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 34 : 86 },
  forumReplyingTag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f5ece2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8 },
  forumReplyingText:{ fontSize: 12, color: THEME.brand.accentDeep, fontWeight: '600' },
  forumComposerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  forumComposerInput:{ flex: 1, minHeight: 42, maxHeight: 110, backgroundColor: '#f5f0e9', borderRadius: 12, borderWidth: 1, borderColor: '#e3d8cc', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#2a1d14' },
  forumSendBtn:     { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.brand.primary, alignItems: 'center', justifyContent: 'center' },
  forumModalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  forumModalCard:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, borderWidth: 1, borderColor: '#ebdfd3' },
  forumCountText:   { fontSize: 12, color: THEME.text.secondary, textAlign: 'right', marginTop: -8, marginBottom: 10 },
});

const srch = StyleSheet.create({
  dropdown:  { position: 'absolute', top: 54, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5, zIndex: 200 },
  suggItem:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  suggText:  { fontSize: 14, color: '#333', flex: 1 },
});

const q = StyleSheet.create({
  introBox:          { margin: 16, backgroundColor: PREMIUM_SURFACE_SOFT, borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
  introEmoji:        { fontSize: 40 },
  introTitle:        { fontSize: 22, fontWeight: '800', color: '#111', textAlign: 'center' },
  introSub:          { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  startBtn:          { backgroundColor: PREMIUM_ACCENT_DEEP, borderRadius: 30, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  startBtnText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
  quizBox:           { margin: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  progressRow:       { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  progressDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.border.soft },
  progressDotActive: { backgroundColor: PREMIUM_ACCENT, width: 24 },
  quizEmoji:         { fontSize: 36, textAlign: 'center' },
  quizPregunta:      { fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center' },
  opcionesGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  opcion:            { width: (W-80)/2, backgroundColor: '#f9f9f9', borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: '#f0f0f0' },
  opcionIcon:        { fontSize: 28 },
  opcionLabel:       { fontSize: 15, fontWeight: '700', color: '#111' },
  opcionDesc:        { fontSize: 11, color: THEME.text.secondary, textAlign: 'center' },
  resultsHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, marginTop: 16 },
  resultsTitle:      { fontSize: 20, fontWeight: '700', color: '#111' },
  resultsSub:        { fontSize: 13, color: THEME.text.secondary },
  resetBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PREMIUM_SURFACE_SOFT, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  resetText:         { color: PREMIUM_ACCENT_DEEP, fontSize: 13, fontWeight: '600' },
  favBtnCard:        { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
});

const det = StyleSheet.create({
  hero:         { width: W, height: H*0.42, backgroundColor: '#f5f0eb' },
  heroGrad:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(0,0,0,0.45)' },
  backBtn:      { position: 'absolute', top: 52, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  favBtn:       { position: 'absolute', top: 52, right: 64, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  deleteBtn:    { position: 'absolute', top: 52, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(220,50,50,0.7)', alignItems: 'center', justifyContent: 'center' },
  scoreBox:     { position: 'absolute', bottom: 20, left: 20, gap: 4 },
  scoreNum:     { fontSize: 42, fontWeight: '800', color: '#fff' },
  scoreVotos:   { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  body:         { padding: 20 },
  nombre:       { fontSize: 26, fontWeight: '800', color: '#111', marginBottom: 4 },
  finca:        { fontSize: 15, color: '#555', marginBottom: 4 },
  originRow:    { marginBottom: 14 },
  originText:   { fontSize: 14, color: THEME.text.secondary },
  chipsWrap:    { marginBottom: 20 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PREMIUM_SURFACE_SOFT, borderWidth: 1, borderColor: PREMIUM_BORDER_SOFT, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  chipText:     { fontSize: 12, color: PREMIUM_ACCENT_DEEP, fontWeight: '600' },
  votarBox:     { backgroundColor: PREMIUM_SURFACE_TINT, borderRadius: 16, padding: 18, alignItems: 'center', gap: 4, marginBottom: 4 },
  votarTitle:   { fontSize: 17, fontWeight: '700', color: '#111' },
  votarSub:     { fontSize: 13, color: THEME.text.secondary },
  scaBox:       { backgroundColor: '#f9f9f9', borderRadius: 16, padding: 16, marginBottom: 4, gap: 8 },
  scaLeft:      { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  scaScore:     { fontSize: 36, fontWeight: '800', color: '#111' },
  scaLabel:     { fontSize: 13, color: THEME.text.secondary },
  scaBar:       { height: 8, backgroundColor: THEME.border.soft, borderRadius: 4, overflow: 'hidden' },
  scaFill:      { height: '100%', backgroundColor: PREMIUM_ACCENT, borderRadius: 4 },
  scaCat:       { fontSize: 13, color: '#555', fontWeight: '600' },
  divider:      { height: 0.5, backgroundColor: THEME.border.soft, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 14 },
  notasBox:     { backgroundColor: PREMIUM_SURFACE_TINT, borderRadius: 12, padding: 14, marginBottom: 14 },
  notasLabel:   { fontSize: 11, fontWeight: '700', color: PREMIUM_ACCENT_DEEP, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  notasText:    { fontSize: 15, color: '#333', lineHeight: 22 },
  sensRow:      { flexDirection: 'row', gap: 10 },
  sensItem:     { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  sensLabel:    { fontSize: 11, color: THEME.text.secondary, fontWeight: '600' },
  sensVal:      { fontSize: 12, color: '#333', textAlign: 'center' },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  infoLabel:    { fontSize: 14, color: THEME.text.secondary, flex: 1 },
  infoVal:      { fontSize: 14, color: '#111', fontWeight: '500', flex: 2, textAlign: 'right' },
  prepBox:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: PREMIUM_SURFACE_TINT, borderRadius: 12, padding: 14 },
  prepText:     { fontSize: 14, color: '#333', flex: 1 },
  certText:     { fontSize: 14, color: '#555', lineHeight: 22 },
  precioBox:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginTop: 20 },
  precioLabel:  { fontSize: 14, color: THEME.text.secondary },
  precioVal:    { fontSize: 20, fontWeight: '800', color: PREMIUM_ACCENT },
});

const scan = StyleSheet.create({
  overlay:         { flex: 1 },
  top:             { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middle:          { flexDirection: 'row', height: W*0.72 },
  side:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  window:          { width: W*0.72, height: W*0.72 },
  bottom:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 24, gap: 20 },
  hint:            { color: '#fff', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  tabs:            { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 25, padding: 4 },
  tabActive:       { backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10 },
  tabInactive:     { paddingHorizontal: 20, paddingVertical: 10 },
  tabTextActive:   { color: '#111', fontWeight: '700', fontSize: 14 },
  tabTextInactive: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  corner:          { position: 'absolute', width: 24, height: 24, borderColor: PREMIUM_ACCENT, borderWidth: 3 },
  tl:              { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  tr:              { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bl:              { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  br:              { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  scanLine:        { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: PREMIUM_ACCENT, opacity: 0.8 },
  backBtn:         { position: 'absolute', top: 52, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  galleryBtn:      { position: 'absolute', bottom: 60, left: 40, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});

const prf = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: THEME.border.soft },
  closeBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 18, fontWeight: '700', color: '#111' },
  body:        { padding: 24 },
  avatarWrap:  { alignItems: 'center', marginBottom: 32, gap: 6 },
  avatar:      { width: 90, height: 90, borderRadius: 45, backgroundColor: PREMIUM_ACCENT, alignItems: 'center', justifyContent: 'center' },
  avatarImg:   { width: 90, height: 90, borderRadius: 45 },
  avatarText:  { fontSize: 40, fontWeight: '800', color: '#fff' },
  avatarEmail: { fontSize: 13, color: THEME.text.secondary },
  avatarBadge: { position: 'absolute', bottom: 52, right: W/2 - 55, width: 26, height: 26, borderRadius: 13, backgroundColor: PREMIUM_ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
});

const pick = StyleSheet.create({
  trigger:     { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  triggerText: { fontSize: 15, color: '#111' },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: H * 0.7 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: THEME.border.soft },
  sheetTitle:  { fontSize: 17, fontWeight: '700', color: '#111' },
  item:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  itemActive:  { backgroundColor: PREMIUM_SURFACE_SOFT },
  itemText:    { fontSize: 15, color: '#111' },
});

const mas = StyleSheet.create({
  premiumCard:  { position: 'relative', overflow: 'hidden', marginTop: 8, marginBottom: 18, backgroundColor: '#1f140f', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#4a3022' },
  premiumGlow:  { position: 'absolute', width: 170, height: 170, borderRadius: 85, right: -44, top: -68, backgroundColor: 'rgba(209, 139, 74, 0.2)' },
  premiumGlowTwo:{ position: 'absolute', width: 120, height: 120, borderRadius: 60, left: -30, bottom: -24, backgroundColor: 'rgba(255, 233, 210, 0.08)' },
  clubTag:      { color: '#caa487', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  premiumTopRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  premiumIdentity:{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  premiumAvatar:{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.2, borderColor: 'rgba(255, 232, 212, 0.28)' },
  premiumAvatarFallback:{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 248, 241, 0.13)', borderWidth: 1.2, borderColor: 'rgba(255, 232, 212, 0.22)' },
  premiumAvatarText:{ color: '#fff3e8', fontSize: 16, fontWeight: '800' },
  premiumAlias: { color: '#fff4ea', fontSize: 14, fontWeight: '800' },
  premiumName:  { color: '#d8c0ad', fontSize: 12, marginTop: 1 },
  premiumLevelBadge:{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(250, 229, 206, 0.32)', backgroundColor: 'rgba(255, 248, 241, 0.1)' },
  premiumLevelText:{ color: '#fff4ea', fontSize: 11, fontWeight: '700' },
  premiumExplain:{ color: '#d8c0ad', fontSize: 12, lineHeight: 18, marginTop: 10 },
  premiumStatsRow:{ flexDirection: 'row', gap: 8, marginTop: 14 },
  premiumStatCard:{ flex: 1, borderRadius: 12, backgroundColor: 'rgba(255, 248, 241, 0.08)', borderWidth: 1, borderColor: 'rgba(250, 229, 206, 0.12)', paddingVertical: 8, alignItems: 'center' },
  premiumStatValue:{ color: '#fff4ea', fontSize: 16, fontWeight: '800' },
  premiumStatLabel:{ color: '#d0b8a4', fontSize: 10, marginTop: 2 },
  memberProgressRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  memberProgressText:{ color: '#edd8c5', fontSize: 11, fontWeight: '700' },
  memberProgressBar:{ height: 8, borderRadius: 999, backgroundColor: 'rgba(255, 248, 241, 0.12)', overflow: 'hidden' },
  memberProgressFill:{ height: '100%', borderRadius: 999, backgroundColor: '#d18b4a' },
  quickGrid:    { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickCard:    { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1 },
  quickCardDark:{ backgroundColor: '#2a1a12', borderColor: '#4d3222' },
  quickCardSoft:{ backgroundColor: '#f8efe6', borderColor: '#e9d8c7' },
  quickTitleDark:{ marginTop: 8, color: '#fff3e8', fontSize: 14, fontWeight: '800' },
  quickSubDark: { marginTop: 3, color: '#d8bcaa', fontSize: 11 },
  quickTitle:   { marginTop: 8, color: '#2d1d13', fontSize: 14, fontWeight: '800' },
  quickSub:     { marginTop: 3, color: '#7d6a5f', fontSize: 11 },
  blockTitle:   { fontSize: 12, fontWeight: '800', color: '#876a56', textTransform: 'uppercase', letterSpacing: 0.9, marginTop: 4, marginBottom: 8 },
  listCard:     { backgroundColor: '#fffaf6', borderRadius: 16, borderWidth: 1, borderColor: '#eadbce', paddingHorizontal: 14, marginBottom: 16 },
  achievementsCard:{ backgroundColor: '#fffaf6', borderRadius: 16, borderWidth: 1, borderColor: '#eadbce', padding: 12, gap: 8, marginBottom: 14 },
  newsletterCard:{ backgroundColor: '#fffaf6', borderRadius: 18, borderWidth: 1, borderColor: '#eadbce', padding: 14, marginBottom: 14 },
  newsletterTopRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  newsletterTitleWrap:{ flex: 1, paddingRight: 4 },
  newsletterTitle:{ color: '#2c1c14', fontSize: 15, fontWeight: '800' },
  newsletterSub:{ color: '#7d6a5f', fontSize: 12, lineHeight: 18, marginTop: 3 },
  newsletterMetaRow:{ gap: 8, marginTop: 12 },
  newsletterStatusPill:{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  newsletterStatusOn:{ backgroundColor: '#f3e8db', borderColor: '#d6b798' },
  newsletterStatusOff:{ backgroundColor: '#f6f1eb', borderColor: '#e6d8c9' },
  newsletterStatusText:{ fontSize: 11, fontWeight: '800' },
  newsletterStatusTextOn:{ color: '#6b4a37' },
  newsletterStatusTextOff:{ color: '#8d7a6c' },
  newsletterEmail:{ color: '#3a2a20', fontSize: 13, fontWeight: '600' },
  newsletterNote:{ color: '#8c847d', fontSize: 12, lineHeight: 18, marginTop: 10 },
  newsletterBtn:{ alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 14, backgroundColor: '#2f1d14', marginTop: 14 },
  newsletterBtnDisabled:{ opacity: 0.45 },
  newsletterBtnText:{ color: '#fff5eb', fontSize: 14, fontWeight: '800' },
  item:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#efe6dd' },
  iconWrap:     { width: 40, height: 40, borderRadius: 12, backgroundColor: PREMIUM_SURFACE_SOFT, alignItems: 'center', justifyContent: 'center' },
  label:        { fontSize: 15, fontWeight: '700', color: '#111' },
  sub:          { fontSize: 12, color: '#8c847d', marginTop: 2 },
  achievementOn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f0e5d9', padding: 10 },
  achievementOff:{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8f3ee', borderRadius: 12, borderWidth: 1, borderColor: '#efe4d7', padding: 10 },
  achievementIcon:{ fontSize: 22 },
  achievementIconOff:{ fontSize: 20, opacity: 0.75 },
  achievementTitle:{ fontSize: 13, fontWeight: '700', color: '#222' },
  achievementTitleOff:{ fontSize: 13, fontWeight: '700', color: '#8f7e70' },
  achievementDesc:{ fontSize: 12, color: '#777', marginTop: 1 },
  emptyAchText: { color: '#8c847d', fontSize: 13, lineHeight: 19 },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 30, paddingVertical: 14, backgroundColor: '#2f1d14', borderWidth: 1, borderColor: '#513728', marginBottom: 4 },
  logoutText:   { fontSize: 15, fontWeight: '800', color: '#fff5eb' },
});

const caf = StyleSheet.create({
  // Loading & error
  loadBox:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadEmoji:       { fontSize: 48 },
  loadTitle:       { fontSize: 20, fontWeight: '700', color: '#111' },
  loadSub:         { fontSize: 14, color: THEME.text.secondary, textAlign: 'center' },
  errorBox:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorTitle:      { fontSize: 22, fontWeight: '700', color: '#111' },
  errorText:       { fontSize: 15, color: THEME.text.secondary, textAlign: 'center', lineHeight: 22 },
  // Header
  headerBox:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  refreshBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: PREMIUM_SURFACE_SOFT, alignItems: 'center', justifyContent: 'center' },
  // Card lista
  card:            { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  cardImgWrap:     { position: 'relative', height: 140 },
  cardImg:         { width: '100%', height: '100%' },
  cardNum:         { position: 'absolute', top: 10, left: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  cardNumText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardEstado:      { position: 'absolute', top: 10, right: 10, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  cardEstadoText:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardInfo:        { padding: 12, gap: 4 },
  cardNombre:      { fontSize: 17, fontWeight: '800', color: '#111' },
  cardTipo:        { fontSize: 12, color: PREMIUM_ACCENT, fontWeight: '600', marginBottom: 2 },
  cardRatingRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardRatingNum:   { fontSize: 13, fontWeight: '700', color: '#333', marginLeft: 4 },
  cardReseñas:     { fontSize: 12, color: THEME.text.muted },
  cardTags:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  cardTag:         { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  cardTagText:     { fontSize: 11, color: '#555' },
  cardEspec:       { fontSize: 12, color: THEME.text.secondary, marginTop: 4, fontStyle: 'italic' },
  // Detalle hero
  detHero:         { height: H * 0.38, position: 'relative' },
  detHeroGrad:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, backgroundColor: 'rgba(0,0,0,0.55)' },
  detPlaceholder:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1a0a00', alignItems: 'center', justifyContent: 'center' },
  detPlaceholderEmoji: { fontSize: 72, opacity: 0.4 },
  cardPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1a0a00', alignItems: 'center', justifyContent: 'center', padding: 12 },
  cardPlaceholderEmoji: { fontSize: 32, opacity: 0.5, marginBottom: 6 },
  cardPlaceholderNombre: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 18 },
  detBack:         { position: 'absolute', top: 52, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  detNavBtn:       { position: 'absolute', top: 52, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: PREMIUM_ACCENT_DEEP, alignItems: 'center', justifyContent: 'center' },
  badgeEstado:     { position: 'absolute', top: 52, left: 70, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  badgeEstadoText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  detOverlay:      { position: 'absolute', bottom: 16, left: 16, right: 16 },
  detNombre:       { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 2 },
  detTipo:         { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  detRatingRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detRatingNum:    { fontSize: 15, fontWeight: '700', color: THEME.status.favorite, marginLeft: 4 },
  detReseñas:      { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  // Detalle body
  detBody:         { padding: 20 },
  detInfoRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, backgroundColor: '#f9f9f9', borderRadius: 14, padding: 14 },
  detInfoItem:     { alignItems: 'center', gap: 4, minWidth: 56 },
  detInfoLabel:    { fontSize: 11, color: '#555', fontWeight: '600' },
  // Secciones
  seccion:         { marginBottom: 20 },
  secTitulo:       { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  secTexto:        { fontSize: 14, color: '#555', lineHeight: 22 },
  contactBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  contactText:     { fontSize: 14, color: PREMIUM_ACCENT_DEEP, fontWeight: '500' },
  // Reseñas
  resena:          { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, marginBottom: 8 },
  resenaAutor:     { fontSize: 13, fontWeight: '700', color: '#111' },
  resenaTexto:     { fontSize: 13, color: '#555', marginTop: 4, lineHeight: 19 },

  item:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: THEME.border.soft },
  rank:    { width: 32, height: 32, borderRadius: 16, backgroundColor: PREMIUM_SURFACE_SOFT, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 14, fontWeight: '700', color: PREMIUM_ACCENT_DEEP },
  nombre:  { fontSize: 15, fontWeight: '600', color: '#111' },
  dir:     { fontSize: 12, color: THEME.text.secondary, marginTop: 2 },
  navBtn:  { padding: 8 },
  mapBox:  { marginBottom: 16 },
});
