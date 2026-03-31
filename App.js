// ─────────────────────────────────────────────────────────────────────────────
//  App.js — Etiove ☕  v2.1
// ─────────────────────────────────────────────────────────────────────────────

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions,
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
  setDocument, updateDocument,
} from './firebaseConfig';

const { width: W, height: H } = Dimensions.get('window');
const APP_VERSION = '2.1.0';
const GOOGLE_PLACES_KEY = 'AIzaSyDWW3lsdg7jgKYtVNcji-5gyDtv-QUWOpA';

const KEY_EMAIL    = 'etiove_email';
const KEY_PASSWORD = 'etiove_password';
const KEY_REMEMBER = 'etiove_remember';
const KEY_FAVS     = 'etiove_favorites';
const KEY_PREFS    = 'etiove_preferences';
const KEY_PROFILE  = 'etiove_profile';
const KEY_VOTES    = 'etiove_votes'; // cafés ya votados por el usuario

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── PAÍSES ───────────────────────────────────────────────────────────────────
const PAISES = [
  { label: '🇪🇸 España',           value: 'España',           flag: '🇪🇸' },
  { label: '🇲🇽 México',            value: 'México',           flag: '🇲🇽' },
  { label: '🇨🇴 Colombia',          value: 'Colombia',         flag: '🇨🇴' },
  { label: '🇦🇷 Argentina',         value: 'Argentina',        flag: '🇦🇷' },
  { label: '🇨🇱 Chile',             value: 'Chile',            flag: '🇨🇱' },
  { label: '🇵🇪 Perú',              value: 'Perú',             flag: '🇵🇪' },
  { label: '🇻🇪 Venezuela',         value: 'Venezuela',        flag: '🇻🇪' },
  { label: '🇪🇨 Ecuador',           value: 'Ecuador',          flag: '🇪🇨' },
  { label: '🇧🇴 Bolivia',           value: 'Bolivia',          flag: '🇧🇴' },
  { label: '🇵🇾 Paraguay',          value: 'Paraguay',         flag: '🇵🇾' },
  { label: '🇺🇾 Uruguay',           value: 'Uruguay',          flag: '🇺🇾' },
  { label: '🇧🇷 Brasil',            value: 'Brasil',           flag: '🇧🇷' },
  { label: '🇺🇸 Estados Unidos',    value: 'Estados Unidos',   flag: '🇺🇸' },
  { label: '🇬🇧 Reino Unido',       value: 'Reino Unido',      flag: '🇬🇧' },
  { label: '🇫🇷 Francia',           value: 'Francia',          flag: '🇫🇷' },
  { label: '🇩🇪 Alemania',          value: 'Alemania',         flag: '🇩🇪' },
  { label: '🇮🇹 Italia',            value: 'Italia',           flag: '🇮🇹' },
  { label: '🇵🇹 Portugal',          value: 'Portugal',         flag: '🇵🇹' },
  { label: '🇳🇱 Países Bajos',      value: 'Países Bajos',     flag: '🇳🇱' },
  { label: '🇧🇪 Bélgica',           value: 'Bélgica',          flag: '🇧🇪' },
  { label: '🇨🇭 Suiza',             value: 'Suiza',            flag: '🇨🇭' },
  { label: '🇸🇪 Suecia',            value: 'Suecia',           flag: '🇸🇪' },
  { label: '🇳🇴 Noruega',           value: 'Noruega',          flag: '🇳🇴' },
  { label: '🇩🇰 Dinamarca',         value: 'Dinamarca',        flag: '🇩🇰' },
  { label: '🇫🇮 Finlandia',         value: 'Finlandia',        flag: '🇫🇮' },
  { label: '🇵🇱 Polonia',           value: 'Polonia',          flag: '🇵🇱' },
  { label: '🇯🇵 Japón',             value: 'Japón',            flag: '🇯🇵' },
  { label: '🇰🇷 Corea del Sur',     value: 'Corea del Sur',    flag: '🇰🇷' },
  { label: '🇨🇳 China',             value: 'China',            flag: '🇨🇳' },
  { label: '🇦🇺 Australia',         value: 'Australia',        flag: '🇦🇺' },
  { label: '🇨🇦 Canadá',            value: 'Canadá',           flag: '🇨🇦' },
  { label: '🇲🇦 Marruecos',         value: 'Marruecos',        flag: '🇲🇦' },
  { label: '🇪🇹 Etiopía',           value: 'Etiopía',          flag: '🇪🇹' },
];

const getFlagForPais = (pais) => PAISES.find(p => p.value === pais)?.flag || '🌍';

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
const normalize = (str) =>
  (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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
              <Ionicons name="search-outline" size={14} color="#aaa" />
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
function QuizSection({ allCafes }) {
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
    const nf = favs.includes(cafe.id) ? favs.filter(f => f !== cafe.id) : [...favs, cafe.id];
    setFavs(nf);
    await SecureStore.setItemAsync(KEY_FAVS, JSON.stringify(nf)).catch(() => {});
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
        {step > 1 && <TouchableOpacity onPress={() => setStep(step - 1)} style={{ alignItems: 'center', marginTop: 8 }}><Text style={{ color: '#aaa', fontSize: 13 }}>← Anterior</Text></TouchableOpacity>}
      </View>
    );
  }

  return (
    <View>
      {cafeDetalle && <CafeDetailScreen cafe={cafeDetalle} onClose={() => setCafeDetalle(null)} favs={favs} onToggleFav={toggleFav} votes={votes} setVotes={setVotes} />}
      <View style={q.resultsHeader}>
        <View><Text style={q.resultsTitle}>Cafés para ti ✨</Text><Text style={q.resultsSub}>Basado en tus preferencias</Text></View>
        <TouchableOpacity onPress={reiniciar} style={q.resetBtn}>
          <Ionicons name="refresh-outline" size={16} color="#e8590c" />
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
function CafeDetailScreen({ cafe, onClose, onDelete, favs = [], onToggleFav, votes = [], setVotes }) {
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
      // Recalcular puntuación media
      const nuevaPuntuacion = Math.round(((puntuacionActual * votosActuales) + estrellas) / nuevosVotos);
      await updateDocument('cafes', cafe.id, { votos: nuevosVotos, puntuacion: nuevaPuntuacion });
      setVotosActuales(nuevosVotos);
      setPuntuacionActual(nuevaPuntuacion);
      // Guardar que este café ya fue votado
      const newVotes = [...votes, cafe.id];
      setVotes?.(newVotes);
      await SecureStore.setItemAsync(KEY_VOTES, JSON.stringify(newVotes)).catch(() => {});
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
            {cafe.foto
              ? <Image source={{ uri: cafe.foto }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f5f0eb', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="cafe" size={80} color="#e8590c" />
                </View>
            }
            <View style={det.heroGrad} />
            <TouchableOpacity style={det.backBtn} onPress={onClose}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
            {onToggleFav && <TouchableOpacity style={det.favBtn} onPress={() => onToggleFav(cafe)}><Ionicons name={isFav ? 'star' : 'star-outline'} size={22} color={isFav ? '#FFD700' : '#fff'} /></TouchableOpacity>}
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

            {/* VOTAR */}
            <View style={det.votarBox}>
              {yaVotado || miVoto > 0
                ? <><Text style={det.votarTitle}>¡Ya has valorado este café!</Text><Text style={det.votarSub}>Tu voto ha sido registrado ⭐</Text></>
                : <><Text style={det.votarTitle}>¿Qué te parece este café?</Text><Text style={det.votarSub}>Toca las estrellas para valorarlo</Text></>
              }
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity key={n} onPress={() => votar(n)} disabled={yaVotado || miVoto > 0 || votando}>
                    <Ionicons name={n <= (miVoto || (yaVotado ? puntuacionActual : 0)) ? 'star' : 'star-outline'} size={36} color={n <= (miVoto || (yaVotado ? puntuacionActual : 0)) ? '#e8590c' : '#ddd'} />
                  </TouchableOpacity>
                ))}
              </View>
              {votando && <ActivityIndicator color="#e8590c" style={{ marginTop: 8 }} />}
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

            {cafe.preparacion && <><View style={det.divider} /><Text style={det.sectionTitle}>Preparación recomendada</Text><View style={det.prepBox}><Ionicons name="cafe-outline" size={20} color="#e8590c" /><Text style={det.prepText}>{cafe.preparacion}</Text></View></>}
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
        <Ionicons name="chevron-down" size={18} color="#888" />
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
                  {item.value === value && <Ionicons name="checkmark" size={20} color="#e8590c" />}
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
    setGuardando(true);
    try {
      await SecureStore.setItemAsync(KEY_PROFILE, JSON.stringify({ nombre, alias, apellidos, email, telefono, pais, foto }));
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
            <Text style={{ fontSize: 12, color: '#aaa' }}>Toca para cambiar foto</Text>
          </TouchableOpacity>

          <Text style={s.label}>Nombre</Text>
          <TextInput style={s.input} placeholder="Tu nombre" placeholderTextColor="#bbb" value={nombre} onChangeText={setNombre} />
          <Text style={s.label}>Apellidos</Text>
          <TextInput style={s.input} placeholder="Tus apellidos" placeholderTextColor="#bbb" value={apellidos} onChangeText={setApellidos} />
          <Text style={s.label}>Alias</Text>
          <TextInput style={s.input} placeholder="@tu_alias" placeholderTextColor="#bbb" value={alias} onChangeText={setAlias} autoCapitalize="none" />
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor="#bbb" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={s.label}>Teléfono</Text>
          <TextInput style={s.input} placeholder="+34 600 000 000" placeholderTextColor="#bbb" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
          <Text style={s.label}>País</Text>
          <PaisPicklist value={pais} onChange={setPais} />

          <TouchableOpacity style={[s.redBtn, { marginTop: 24 }]} onPress={guardar} disabled={guardando}>
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
      <ActivityIndicator color="#e8590c" size="large" />
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
                  <View style={[caf.badgeEstado, { backgroundColor: seleccionada.abierto ? '#27ae60' : '#e74c3c' }]}>
                    <Text style={caf.badgeEstadoText}>{seleccionada.abierto ? '🟢 Abierto ahora' : '🔴 Cerrado'}</Text>
                  </View>
                )}
                {/* Info básica sobre foto */}
                <View style={caf.detOverlay}>
                  <Text style={caf.detNombre}>{seleccionada.nombre}</Text>
                  <Text style={caf.detTipo}>{seleccionada.tipo}</Text>
                  <View style={caf.detRatingRow}>
                    {[1,2,3,4,5].map(n => (
                      <Ionicons key={n} name={n <= Math.round(seleccionada.rating) ? 'star' : 'star-outline'} size={14} color="#FFD700" />
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
                    <Ionicons name="location" size={20} color="#e8590c" />
                    <Text style={caf.detInfoLabel}>{seleccionada.distancia < 1000 ? `${seleccionada.distancia}m` : `${(seleccionada.distancia/1000).toFixed(1)}km`}</Text>
                  </View>
                  {seleccionada.wifi && <View style={caf.detInfoItem}><Ionicons name="wifi" size={20} color="#e8590c" /><Text style={caf.detInfoLabel}>WiFi</Text></View>}
                  {seleccionada.terraza && <View style={caf.detInfoItem}><Ionicons name="sunny" size={20} color="#e8590c" /><Text style={caf.detInfoLabel}>Terraza</Text></View>}
                  {seleccionada.takeaway && <View style={caf.detInfoItem}><Ionicons name="bag-handle" size={20} color="#e8590c" /><Text style={caf.detInfoLabel}>Para llevar</Text></View>}
                  {seleccionada.vegano && <View style={caf.detInfoItem}><Ionicons name="leaf" size={20} color="#27ae60" /><Text style={[caf.detInfoLabel, { color: '#27ae60' }]}>Vegano</Text></View>}
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
                        <Ionicons name="call-outline" size={16} color="#e8590c" />
                        <Text style={caf.contactText}>{seleccionada.telefono}</Text>
                      </TouchableOpacity>
                    )}
                    {seleccionada.web && (
                      <TouchableOpacity onPress={() => Linking.openURL(seleccionada.web.startsWith('http') ? seleccionada.web : `https://${seleccionada.web}`)} style={caf.contactBtn}>
                        <Ionicons name="globe-outline" size={16} color="#e8590c" />
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
                          <Text style={{ fontSize: 11, color: '#aaa' }}>{r.tiempo}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 2, marginBottom: 4 }}>
                          {[1,2,3,4,5].map(n => <Ionicons key={n} name={n <= r.nota ? 'star' : 'star-outline'} size={11} color="#FFD700" />)}
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
          <Text style={{ fontSize: 13, color: '#888' }}>{cafeterias.length} cerca de ti · ordenadas por distancia</Text>
        </View>
        <TouchableOpacity onPress={cargarCafeterias} style={caf.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color="#e8590c" />
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
                <View style={[caf.cardEstado, { backgroundColor: item.abierto ? '#27ae60' : '#e74c3c' }]}>
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
                {[1,2,3,4,5].map(n => <Ionicons key={n} name={n <= Math.round(item.rating) ? 'star' : 'star-outline'} size={12} color="#FFD700" />)}
                <Text style={caf.cardRatingNum}>{item.rating}</Text>
                <Text style={caf.cardReseñas}>({item.numResenas})</Text>
              </View>
              {/* Tags */}
              <View style={caf.cardTags}>
                <View style={caf.cardTag}><Ionicons name="location-outline" size={11} color="#e8590c" /><Text style={caf.cardTagText}>{item.distancia < 1000 ? `${item.distancia}m` : `${(item.distancia/1000).toFixed(1)}km`}</Text></View>
                {item.wifi     && <View style={caf.cardTag}><Ionicons name="wifi-outline"       size={11} color="#555" /><Text style={caf.cardTagText}>WiFi</Text></View>}
                {item.terraza  && <View style={caf.cardTag}><Ionicons name="sunny-outline"      size={11} color="#555" /><Text style={caf.cardTagText}>Terraza</Text></View>}
                {item.takeaway && <View style={caf.cardTag}><Ionicons name="bag-handle-outline" size={11} color="#555" /><Text style={caf.cardTagText}>Para llevar</Text></View>}
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
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={n <= value ? '#e8590c' : '#ccc'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Chip({ label, icon }) {
  return (
    <View style={det.chip}>
      <Ionicons name={icon} size={12} color="#e8590c" />
      <Text style={det.chipText}>{label}</Text>
    </View>
  );
}

function SensItem({ label, value, icon }) {
  return (
    <View style={det.sensItem}>
      <Ionicons name={icon} size={18} color="#e8590c" />
      <Text style={det.sensLabel}>{label}</Text>
      <Text style={det.sensVal}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={det.infoRow}>
      <Ionicons name={icon} size={16} color="#e8590c" style={{ width: 22 }} />
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
        {item.foto ? <Image source={{ uri: item.foto }} style={StyleSheet.absoluteFillObject} borderRadius={10} resizeMode="cover" /> : <Ionicons name="cafe" size={36} color="#ccc" />}
        <View style={s.badgeRed}><Text style={s.badgeText}>{badge}</Text></View>
        {onToggleFav && (
          <TouchableOpacity style={q.favBtnCard} onPress={() => onToggleFav(item)}>
            <Ionicons name={isFav ? 'star' : 'star-outline'} size={16} color={isFav ? '#FFD700' : '#fff'} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={s.cardHOrigin} numberOfLines={1}>{item.region || item.pais || item.origen || 'Sin origen'}</Text>
      <Text style={s.cardHName} numberOfLines={2}>{item.nombre}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Ionicons name="star" size={13} color="#e8590c" />
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
        {item.foto ? <Image source={{ uri: item.foto }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" /> : <Ionicons name="cafe" size={32} color="#ccc" />}
        <View style={s.badgeRed}><Text style={s.badgeText}>{item.puntuacion}.0</Text></View>
        {onToggleFav && (
          <TouchableOpacity style={[q.favBtnCard, { top: 'auto', bottom: 6, right: 6 }]} onPress={() => onToggleFav(item)}>
            <Ionicons name={isFav ? 'star' : 'star-outline'} size={14} color={isFav ? '#FFD700' : '#fff'} />
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
        <Ionicons name="trash-outline" size={18} color="#ccc" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function TabBtn({ icon, label, tab, active, onPress, badge }) {
  const isActive = active === tab;
  return (
    <TouchableOpacity style={s.tabBtn} onPress={() => onPress(tab)}>
      <View>
        <Ionicons name={isActive ? icon : `${icon}-outline`} size={22} color={isActive ? '#e8590c' : '#888'} />
        {badge > 0 && <View style={s.tabBadge}><Text style={s.tabBadgeText}>{badge}</Text></View>}
      </View>
      <Text style={[s.tabLabel, isActive && { color: '#e8590c' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MasItem({ icon, label, sub, onPress }) {
  return (
    <TouchableOpacity style={mas.item} onPress={onPress} activeOpacity={0.7}>
      <View style={mas.iconWrap}><Ionicons name={icon} size={22} color="#e8590c" /></View>
      <View style={{ flex: 1 }}>
        <Text style={mas.label}>{label}</Text>
        {sub && <Text style={mas.sub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );
}

// ─── WELCOME ──────────────────────────────────────────────────────────────────
function WelcomeScreen() {
  return (
    <SafeAreaView style={s.welcomeScreen}>
      <StatusBar barStyle="light-content" backgroundColor="#1a0a00" />
      <Ionicons name="cafe" size={80} color="#e8590c" />
      <Text style={s.welcomeTitle}>Etiove</Text>
      <Text style={s.welcomeSub}>Tu colección de cafés</Text>
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

  useEffect(() => {
    (async () => {
      try {
        const ok = await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync();
        setFID(ok);
        if (await SecureStore.getItemAsync(KEY_REMEMBER) === 'true') {
          const em = await SecureStore.getItemAsync(KEY_EMAIL);
          const pw = await SecureStore.getItemAsync(KEY_PASSWORD);
          if (em && pw) { setEmail(em); setPassword(pw); setRecordar(true); setFIG(true); }
        }
      } catch {}
    })();
  }, []);

  const guardarCreds = async (em, pw) => { await SecureStore.setItemAsync(KEY_EMAIL, em); await SecureStore.setItemAsync(KEY_PASSWORD, pw); await SecureStore.setItemAsync(KEY_REMEMBER, 'true'); };
  const borrarCreds  = async () => { await SecureStore.deleteItemAsync(KEY_EMAIL); await SecureStore.deleteItemAsync(KEY_PASSWORD); await SecureStore.setItemAsync(KEY_REMEMBER, 'false'); setFIG(false); };

  const handleSubmit = async () => {
    if (!email.trim() || (!password.trim() && modo !== 'reset')) return Alert.alert('Aviso', 'Rellena todos los campos');
    setCargando(true);
    try {
      if (modo === 'login') { const user = await loginUser(email.trim(), password); if (recordar) await guardarCreds(email.trim(), password); else await borrarCreds(); onAuth(user); }
      else if (modo === 'register') { onAuth(await registerUser(email.trim(), password)); }
      else { await resetPassword(email.trim()); Alert.alert('✅ Email enviado', 'Revisa tu bandeja de entrada'); setModo('login'); }
    } catch (e) { Alert.alert('Error', e.message || 'Algo salió mal'); }
    finally { setCargando(false); }
  };

  const handleFaceId = async () => {
    try {
      if (!(await LocalAuthentication.authenticateAsync({ promptMessage: 'Accede a Etiove' })).success) return;
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
          <Ionicons name="cafe" size={64} color="#e8590c" style={{ marginBottom: 8 }} />
          <Text style={s.authTitle}>Etiove ☕</Text>
          <Text style={s.authSub}>{modo === 'login' ? 'Inicia sesión para continuar' : modo === 'register' ? 'Crea tu cuenta gratuita' : 'Recupera tu contraseña'}</Text>
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor="#bbb" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          {modo !== 'reset' && <><Text style={s.label}>Contraseña</Text><TextInput style={s.input} placeholder="Mínimo 6 caracteres" placeholderTextColor="#bbb" value={password} onChangeText={setPassword} secureTextEntry /></>}
          {modo === 'login' && <View style={s.rememberRow}><Switch value={recordar} onValueChange={v => { setRecordar(v); if (!v) borrarCreds(); }} trackColor={{ false: '#ddd', true: '#e8590c' }} thumbColor="#fff" /><Text style={s.rememberText}>Recordar contraseña</Text></View>}
          <TouchableOpacity style={s.redBtn} onPress={handleSubmit} disabled={cargando}>
            {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>{modo === 'login' ? 'Entrar' : modo === 'register' ? 'Crear cuenta' : 'Enviar enlace'}</Text>}
          </TouchableOpacity>
          {modo === 'login' && faceIdDisponible && faceIdGuardado && <TouchableOpacity style={s.faceIdBtn} onPress={handleFaceId} disabled={cargando}><Ionicons name="scan-outline" size={22} color="#e8590c" /><Text style={s.faceIdText}>Entrar con Face ID</Text></TouchableOpacity>}
          <View style={s.authLinks}>
            {modo === 'login' && <><TouchableOpacity onPress={() => setModo('register')}><Text style={s.authLink}>¿Sin cuenta? Regístrate</Text></TouchableOpacity><TouchableOpacity onPress={() => setModo('reset')}><Text style={[s.authLink, { color: '#888' }]}>¿Olvidaste la contraseña?</Text></TouchableOpacity></>}
            {modo !== 'login' && <TouchableOpacity onPress={() => setModo('login')}><Text style={s.authLink}>← Volver</Text></TouchableOpacity>}
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
function FormScreen({ onSave, onBack }) {
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
      Alert.alert('✅ Guardado', 'Café añadido a tu colección');
      onSave();
    } catch { Alert.alert('Error', 'No se pudo conectar con Firebase'); }
    finally { setSubiendo(false); }
  };

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.formScroll}>
        <TouchableOpacity onPress={onBack} style={s.backRow}><Ionicons name="chevron-back" size={20} color="#e8590c" /><Text style={s.backText}>Volver</Text></TouchableOpacity>
        <Text style={s.formTitle}>Nuevo café</Text>
        <TouchableOpacity style={foto ? {} : s.fotoEmpty} onPress={hacerFoto}>
          {foto ? <Image source={{ uri: foto }} style={s.fotoFull} /> : <><Ionicons name="camera-outline" size={32} color="#aaa" /><Text style={s.fotoEmptyText}>Añadir foto</Text></>}
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
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    SecureStore.getItemAsync(KEY_FAVS).then(v => v && setFavs(JSON.parse(v))).catch(() => {});
    SecureStore.getItemAsync(KEY_VOTES).then(v => v && setVotes(JSON.parse(v))).catch(() => {});
    SecureStore.getItemAsync(KEY_PROFILE).then(v => v && setPerfil(JSON.parse(v))).catch(() => {});
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const cafes   = await getUserCafes(user.uid);
      const ranking = await getCollection('cafes', 'puntuacion', 50);
      const todos   = await getCollection('cafes', 'fecha', 100);
      // Ordenar mis cafés por fecha más reciente
      const cafesPorFecha = [...cafes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setMisCafes(cafesPorFecha);
      setTopCafes(ranking);
      setAllCafes(todos);
    } catch (e) { console.error('Error de carga:', e); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const toggleFav = async (cafe) => {
    const nf = favs.includes(cafe.id) ? favs.filter(f => f !== cafe.id) : [...favs, cafe.id];
    setFavs(nf);
    await SecureStore.setItemAsync(KEY_FAVS, JSON.stringify(nf)).catch(() => {});
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
  // Últimos 10 de toda la BD: allCafes viene ordenado por fecha desc (ver cargarDatos)
  const ultimosGlobal = allCafes.slice(0, 10);

  const flag = getFlagForPais(perfil.pais || 'España');

  if (!permission?.granted) {
    return (
      <SafeAreaView style={s.permScreen}>
        <Ionicons name="cafe" size={72} color="#e8590c" />
        <Text style={s.permTitle}>Etiove necesita la cámara</Text>
        <Text style={s.permSub}>Para escanear paquetes de café</Text>
        <TouchableOpacity style={s.redBtn} onPress={requestPermission}><Text style={s.redBtnText}>Activar cámara</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (scanning) return <ScannerScreen onScanned={() => { setScanning(false); setShowForm(true); }} onSkip={() => { setScanning(false); setShowForm(true); }} onBack={() => setScanning(false)} />;
  if (showForm) return <FormScreen onBack={() => setShowForm(false)} onSave={() => { setShowForm(false); setActiveTab('Mis Cafés'); cargarDatos(); }} />;

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

      {activeTab !== 'Cafeterías' && (
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── INICIO ── */}
        {activeTab === 'Inicio' && (
          <View>
            <View style={s.topBar}>
              <TouchableOpacity style={s.locationPill} onPress={() => setShowProfile(true)}>
                <Text style={s.locationText}>{flag}  Etiove</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowProfile(true)} style={s.profileBtn}>
                {perfil.foto
                  ? <Image source={{ uri: perfil.foto }} style={s.profileAvatar} />
                  : <View style={s.profileAvatar}><Text style={s.profileAvatarText}>{(perfil.nombre || user?.email || '?')[0].toUpperCase()}</Text></View>
                }
              </TouchableOpacity>
            </View>

            <SearchInput
              value={busqueda}
              onChangeText={setBusqueda}
              onSearch={(q) => { setBusqueda(q); }}
              allCafes={allCafes}
              placeholder="Buscar cualquier café..."
            />

            {busqueda.trim()
              ? <>
                  <View style={s.sectionHeader}><Text style={s.sectionTitle}>Resultados ({filtrar(allCafes, busqueda).length})</Text></View>
                  <View style={{ paddingHorizontal: 16 }}>
                    {filtrar(allCafes, busqueda).map(item => <CardVertical key={item.id} item={item} onDelete={() => {}} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />)}
                  </View>
                </>
              : <>
                  <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Últimos añadidos</Text>
                    <TouchableOpacity onPress={() => setActiveTab('Mis Cafés')}><Ionicons name="chevron-forward" size={20} color="#555" /></TouchableOpacity>
                  </View>
                  <Text style={s.sectionSub}>Los 10 más recientes de la comunidad</Text>
                  {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
                      {ultimosGlobal.map(item => <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0`} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />)}
                      {ultimosGlobal.length === 0 && <Text style={[s.empty, { marginLeft: 0 }]}>Aún no hay cafés.</Text>}
                    </ScrollView>
                  )}

                  <View style={[s.sectionHeader, { marginTop: 28 }]}>
                    <Text style={s.sectionTitle}>Top cafés en {perfil.pais || 'España'} {flag}</Text>
                    <TouchableOpacity onPress={() => setActiveTab('Más')}><Ionicons name="chevron-forward" size={20} color="#555" /></TouchableOpacity>
                  </View>
                  <Text style={s.sectionSub}>Los mejor puntuados · filtrando por tu país</Text>
                  {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
                      {topCafesPais.slice(0, 10).map(item => <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0 ⭐`} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />)}
                      {topCafesPais.length === 0 && (
                        <View style={{ paddingLeft: 0 }}>
                          <Text style={[s.empty, { marginLeft: 0 }]}>Aún no hay cafés de {perfil.pais || 'España'}</Text>
                          <Text style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>Mostrando top global</Text>
                          {topCafes.slice(0, 10).map(item => <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0 ⭐`} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />)}
                        </View>
                      )}
                    </ScrollView>
                  )}

                  {favCafes.length > 0 && <>
                    <View style={[s.sectionHeader, { marginTop: 28 }]}><Text style={s.sectionTitle}>⭐ Mis favoritos</Text></View>
                    <Text style={s.sectionSub}>{favCafes.length} cafés guardados</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
                      {favCafes.map(item => <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0`} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />)}
                    </ScrollView>
                  </>}
                </>
            }
          </View>
        )}

        {/* ── MIS CAFÉS ── */}
        {activeTab === 'Mis Cafés' && (
          <View style={{ paddingTop: 20 }}>
            <View style={{ paddingHorizontal: 16 }}><Text style={s.pageTitle}>Mis Cafés</Text></View>
            {!cargando && <QuizSection allCafes={allCafes} />}
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Mi colección</Text>
              <SearchInput value={busquedaMis} onChangeText={setBusquedaMis} onSearch={setBusquedaMis} allCafes={misCafes} placeholder="Buscar en tu colección" />
            </View>
            {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : (
              <View style={{ paddingHorizontal: 16 }}>
                {cafesFiltrados.map(item => <CardVertical key={item.id} item={item} onDelete={eliminarCafe} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />)}
                {cafesFiltrados.length === 0 && <Text style={s.empty}>{busquedaMis ? 'Sin resultados' : 'No has añadido cafés aún'}</Text>}
              </View>
            )}
          </View>
        )}

        {/* ── MÁS ── */}
        {activeTab === 'Más' && (
          <View style={{ paddingTop: 20 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={s.pageTitle}>Más</Text>
              <Text style={[s.sectionTitle, { marginBottom: 16, marginTop: 8 }]}>Mi cuenta</Text>
              <MasItem icon="person-circle-outline" label="Mi perfil" sub={`${perfil.nombre || ''} ${perfil.apellidos || ''}`.trim() || 'Configura tu perfil'} onPress={() => setShowProfile(true)} />
              <MasItem icon="heart-outline"         label="Mis favoritos"    sub={`${favs.length} cafés guardados`} onPress={() => {}} />
              <MasItem icon="stats-chart-outline"   label="Mis estadísticas" sub={`${misCafes.length} cafés en tu colección`} onPress={() => Alert.alert('Estadísticas', `☕ Cafés añadidos: ${misCafes.length}\n⭐ Favoritos: ${favs.length}\n🗳️ Votos emitidos: ${votes.length}`)} />

              <View style={[det.divider, { marginVertical: 16 }]} />
              <Text style={[s.sectionTitle, { marginBottom: 16 }]}>Sobre Etiove</Text>
              <MasItem icon="information-circle-outline" label="Versión" sub={`Etiove v${APP_VERSION}`} onPress={() => Alert.alert('Etiove', `Versión ${APP_VERSION}\n\nReact Native + Expo\nFirebase Firestore\nOpenStreetMap\n\n☕ Hecha con amor por los amantes del café.`)} />
              <MasItem icon="book-outline"               label="Guía de cata"          sub="Aprende a identificar sabores" onPress={() => Alert.alert('Guía de cata ☕', '🌸 Floral: jazmín, rosa, bergamota\n🍒 Frutal: cereza, naranja, fresa\n🍫 Chocolate: cacao, caramelo\n🌿 Herbal: té, hierbas\n⚡ Acidez brillante: limón, pomelo\n🌊 Acidez suave: manzana, melocotón\n\nEspecialty > 80 puntos SCA.')} />
              <MasItem icon="globe-outline"              label="Orígenes del café"      sub="Conoce los países productores" onPress={() => Alert.alert('Top orígenes', '🇪🇹 Etiopía — el origen del café\n🇰🇪 Kenia — acidez brillante\n🇨🇴 Colombia — equilibrio perfecto\n🇵🇦 Panamá — la Geisha más famosa\n🇾🇪 Yemen — el más histórico\n🇯🇲 Jamaica — Blue Mountain legendario')} />
              <MasItem icon="cafe-outline"               label="Métodos de preparación" sub="V60, Chemex, Espresso y más" onPress={() => Alert.alert('Métodos', '☕ Espresso: 25-30s, concentrado\n🫧 V60: filtro limpio y floral\n🧪 Chemex: cuerpo ligero\n🔵 Aeropress: versátil y rápido\n🫙 Prensa francesa: cuerpo denso\n❄️ Cold brew: 12h, suave')} />

              <View style={[det.divider, { marginVertical: 16 }]} />
              <TouchableOpacity style={mas.logoutBtn} onPress={() => Alert.alert('Cerrar sesión', '¿Seguro?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Salir', style: 'destructive', onPress: onLogout }])}>
                <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
                <Text style={mas.logoutText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 20 }} />
          </View>
        )}
      </ScrollView>
      )}

      <View style={s.bottomBar}>
        <TabBtn icon="home"           label="Inicio"      tab="Inicio"      active={activeTab} onPress={setActiveTab} />
        <TabBtn icon="storefront"     label="Cafeterías"  tab="Cafeterías"  active={activeTab} onPress={setActiveTab} />
        <TouchableOpacity style={s.camBtn} onPress={() => setScanning(true)}>
          <Ionicons name="camera" size={28} color="#fff" />
        </TouchableOpacity>
        <TabBtn icon="cafe"           label="Mis Cafés"   tab="Mis Cafés"   active={activeTab} onPress={setActiveTab} />
        <TabBtn icon="ellipsis-horizontal" label="Más"   tab="Más"         active={activeTab} onPress={setActiveTab} badge={favs.length} />
      </View>
    </SafeAreaView>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]               = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShowWelcome(false), 2000); return () => clearTimeout(t); }, []);
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
  welcomeScreen:    { flex: 1, backgroundColor: '#1a0a00', alignItems: 'center', justifyContent: 'center', gap: 16 },
  welcomeTitle:     { fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  welcomeSub:       { fontSize: 16, color: '#e8590c', fontWeight: '500', letterSpacing: 1 },
  permScreen:       { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permTitle:        { fontSize: 22, fontWeight: '700', color: '#111', textAlign: 'center' },
  permSub:          { fontSize: 15, color: '#888', textAlign: 'center' },
  authScroll:       { padding: 32, paddingTop: 60, flexGrow: 1, justifyContent: 'center' },
  authTitle:        { fontSize: 32, fontWeight: '800', color: '#111', marginBottom: 6 },
  authSub:          { fontSize: 15, color: '#888', marginBottom: 32 },
  authLinks:        { marginTop: 20, gap: 12, alignItems: 'center' },
  authLink:         { color: '#e8590c', fontSize: 14, fontWeight: '500' },
  rememberRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  rememberText:     { fontSize: 14, color: '#555' },
  faceIdBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 14, borderWidth: 1.5, borderColor: '#e8590c', borderRadius: 30 },
  faceIdText:       { color: '#e8590c', fontWeight: '600', fontSize: 15 },
  topBar:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  locationPill:     { borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  locationText:     { fontSize: 14, fontWeight: '500', color: '#222' },
  profileBtn:       { padding: 2 },
  profileAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e8590c', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileAvatarText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  searchWrap:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 10, backgroundColor: '#f5f5f5', borderRadius: 25, paddingHorizontal: 14, height: 44 },
  searchInput:      { flex: 1, fontSize: 15, color: '#222', marginLeft: 8 },
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 2 },
  sectionTitle:     { fontSize: 20, fontWeight: '700', color: '#111' },
  sectionSub:       { fontSize: 13, color: '#888', paddingHorizontal: 16, marginBottom: 14 },
  pageTitle:        { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 12 },
  empty:            { color: '#aaa', textAlign: 'center', marginTop: 40, fontSize: 14 },
  cardH:            { width: 160, marginRight: 4 },
  cardHImg:         { width: 160, height: 200, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  cardHOrigin:      { fontSize: 12, color: '#888', marginBottom: 2 },
  cardHName:        { fontSize: 14, fontWeight: '700', color: '#111', lineHeight: 19 },
  cardHRating:      { fontSize: 13, fontWeight: '600', color: '#e8590c' },
  cardHVotos:       { fontSize: 12, color: '#888' },
  cardV:            { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  cardVImg:         { width: 80, height: 100, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  cardVOrigin:      { fontSize: 12, color: '#888', marginBottom: 2 },
  cardVName:        { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 5 },
  cardVNotas:       { fontSize: 12, color: '#aaa', marginTop: 5, lineHeight: 17 },
  badgeRed:         { position: 'absolute', top: 8, left: 8, backgroundColor: '#e8590c', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:        { color: '#fff', fontSize: 11, fontWeight: '700' },
  rankRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  rankNum:          { fontSize: 22, fontWeight: '700', color: '#ccc', width: 28 },
  rankName:         { fontSize: 15, fontWeight: '600', color: '#111' },
  rankVotos:        { fontSize: 12, color: '#888', marginTop: 2 },
  redBtn:           { backgroundColor: '#e8590c', borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 8 },
  redBtnText:       { color: '#fff', fontWeight: '700', fontSize: 15 },
  bottomBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'center', paddingBottom: 20, paddingTop: 10 },
  tabBtn:           { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel:         { fontSize: 10, color: '#888' },
  tabBadge:         { position: 'absolute', top: -4, right: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#e8590c', alignItems: 'center', justifyContent: 'center' },
  tabBadgeText:     { color: '#fff', fontSize: 9, fontWeight: '700' },
  camBtn:           { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e8590c', alignItems: 'center', justifyContent: 'center', marginTop: -20, shadowColor: '#e8590c', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  formScroll:       { padding: 20, paddingTop: 52, paddingBottom: 50 },
  backRow:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  backText:         { color: '#e8590c', fontSize: 15 },
  formTitle:        { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 20 },
  fotoEmpty:        { backgroundColor: '#f5f5f5', borderRadius: 14, height: 140, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  fotoEmptyText:    { color: '#aaa', fontSize: 14 },
  fotoFull:         { width: '100%', height: 200, borderRadius: 14, marginBottom: 8 },
  retake:           { color: '#e8590c', fontSize: 13, textAlign: 'right', marginBottom: 20 },
  label:            { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input:            { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', marginBottom: 18 },
});

const srch = StyleSheet.create({
  dropdown:  { position: 'absolute', top: 54, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5, zIndex: 200 },
  suggItem:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  suggText:  { fontSize: 14, color: '#333', flex: 1 },
});

const q = StyleSheet.create({
  introBox:          { margin: 16, backgroundColor: '#fff5f0', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
  introEmoji:        { fontSize: 40 },
  introTitle:        { fontSize: 22, fontWeight: '800', color: '#111', textAlign: 'center' },
  introSub:          { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  startBtn:          { backgroundColor: '#e8590c', borderRadius: 30, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  startBtnText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
  quizBox:           { margin: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  progressRow:       { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  progressDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#eee' },
  progressDotActive: { backgroundColor: '#e8590c', width: 24 },
  quizEmoji:         { fontSize: 36, textAlign: 'center' },
  quizPregunta:      { fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center' },
  opcionesGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  opcion:            { width: (W-80)/2, backgroundColor: '#f9f9f9', borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: '#f0f0f0' },
  opcionIcon:        { fontSize: 28 },
  opcionLabel:       { fontSize: 15, fontWeight: '700', color: '#111' },
  opcionDesc:        { fontSize: 11, color: '#888', textAlign: 'center' },
  resultsHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, marginTop: 16 },
  resultsTitle:      { fontSize: 20, fontWeight: '700', color: '#111' },
  resultsSub:        { fontSize: 13, color: '#888' },
  resetBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff5f0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  resetText:         { color: '#e8590c', fontSize: 13, fontWeight: '600' },
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
  originText:   { fontSize: 14, color: '#888' },
  chipsWrap:    { marginBottom: 20 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff5f0', borderWidth: 1, borderColor: '#fdd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  chipText:     { fontSize: 12, color: '#e8590c', fontWeight: '600' },
  votarBox:     { backgroundColor: '#fff5f0', borderRadius: 16, padding: 18, alignItems: 'center', gap: 4, marginBottom: 4 },
  votarTitle:   { fontSize: 17, fontWeight: '700', color: '#111' },
  votarSub:     { fontSize: 13, color: '#888' },
  scaBox:       { backgroundColor: '#f9f9f9', borderRadius: 16, padding: 16, marginBottom: 4, gap: 8 },
  scaLeft:      { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  scaScore:     { fontSize: 36, fontWeight: '800', color: '#111' },
  scaLabel:     { fontSize: 13, color: '#888' },
  scaBar:       { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  scaFill:      { height: '100%', backgroundColor: '#e8590c', borderRadius: 4 },
  scaCat:       { fontSize: 13, color: '#555', fontWeight: '600' },
  divider:      { height: 0.5, backgroundColor: '#eee', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 14 },
  notasBox:     { backgroundColor: '#fff5f0', borderRadius: 12, padding: 14, marginBottom: 14 },
  notasLabel:   { fontSize: 11, fontWeight: '700', color: '#e8590c', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  notasText:    { fontSize: 15, color: '#333', lineHeight: 22 },
  sensRow:      { flexDirection: 'row', gap: 10 },
  sensItem:     { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  sensLabel:    { fontSize: 11, color: '#888', fontWeight: '600' },
  sensVal:      { fontSize: 12, color: '#333', textAlign: 'center' },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  infoLabel:    { fontSize: 14, color: '#888', flex: 1 },
  infoVal:      { fontSize: 14, color: '#111', fontWeight: '500', flex: 2, textAlign: 'right' },
  prepBox:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff5f0', borderRadius: 12, padding: 14 },
  prepText:     { fontSize: 14, color: '#333', flex: 1 },
  certText:     { fontSize: 14, color: '#555', lineHeight: 22 },
  precioBox:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginTop: 20 },
  precioLabel:  { fontSize: 14, color: '#888' },
  precioVal:    { fontSize: 20, fontWeight: '800', color: '#e8590c' },
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
  corner:          { position: 'absolute', width: 24, height: 24, borderColor: '#e8590c', borderWidth: 3 },
  tl:              { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  tr:              { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bl:              { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  br:              { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  scanLine:        { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: '#e8590c', opacity: 0.8 },
  backBtn:         { position: 'absolute', top: 52, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  galleryBtn:      { position: 'absolute', bottom: 60, left: 40, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});

const prf = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  closeBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 18, fontWeight: '700', color: '#111' },
  body:        { padding: 24 },
  avatarWrap:  { alignItems: 'center', marginBottom: 32, gap: 6 },
  avatar:      { width: 90, height: 90, borderRadius: 45, backgroundColor: '#e8590c', alignItems: 'center', justifyContent: 'center' },
  avatarImg:   { width: 90, height: 90, borderRadius: 45 },
  avatarText:  { fontSize: 40, fontWeight: '800', color: '#fff' },
  avatarEmail: { fontSize: 13, color: '#888' },
  avatarBadge: { position: 'absolute', bottom: 52, right: W/2 - 55, width: 26, height: 26, borderRadius: 13, backgroundColor: '#e8590c', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
});

const pick = StyleSheet.create({
  trigger:     { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  triggerText: { fontSize: 15, color: '#111' },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: H * 0.7 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  sheetTitle:  { fontSize: 17, fontWeight: '700', color: '#111' },
  item:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  itemActive:  { backgroundColor: '#fff5f0' },
  itemText:    { fontSize: 15, color: '#111' },
});

const mas = StyleSheet.create({
  item:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  iconWrap:    { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff5f0', alignItems: 'center', justifyContent: 'center' },
  label:       { fontSize: 15, fontWeight: '600', color: '#111' },
  sub:         { fontSize: 12, color: '#aaa', marginTop: 2 },
  logoutBtn:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  logoutText:  { fontSize: 15, fontWeight: '600', color: '#e74c3c' },
});

const caf = StyleSheet.create({
  // Loading & error
  loadBox:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadEmoji:       { fontSize: 48 },
  loadTitle:       { fontSize: 20, fontWeight: '700', color: '#111' },
  loadSub:         { fontSize: 14, color: '#888', textAlign: 'center' },
  errorBox:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorTitle:      { fontSize: 22, fontWeight: '700', color: '#111' },
  errorText:       { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
  // Header
  headerBox:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  refreshBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff5f0', alignItems: 'center', justifyContent: 'center' },
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
  cardTipo:        { fontSize: 12, color: '#e8590c', fontWeight: '600', marginBottom: 2 },
  cardRatingRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardRatingNum:   { fontSize: 13, fontWeight: '700', color: '#333', marginLeft: 4 },
  cardReseñas:     { fontSize: 12, color: '#aaa' },
  cardTags:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  cardTag:         { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  cardTagText:     { fontSize: 11, color: '#555' },
  cardEspec:       { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  // Detalle hero
  detHero:         { height: H * 0.38, position: 'relative' },
  detHeroGrad:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, backgroundColor: 'rgba(0,0,0,0.55)' },
  detPlaceholder:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1a0a00', alignItems: 'center', justifyContent: 'center' },
  detPlaceholderEmoji: { fontSize: 72, opacity: 0.4 },
  cardPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1a0a00', alignItems: 'center', justifyContent: 'center', padding: 12 },
  cardPlaceholderEmoji: { fontSize: 32, opacity: 0.5, marginBottom: 6 },
  cardPlaceholderNombre: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 18 },
  detBack:         { position: 'absolute', top: 52, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  detNavBtn:       { position: 'absolute', top: 52, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#e8590c', alignItems: 'center', justifyContent: 'center' },
  badgeEstado:     { position: 'absolute', top: 52, left: 70, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  badgeEstadoText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  detOverlay:      { position: 'absolute', bottom: 16, left: 16, right: 16 },
  detNombre:       { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 2 },
  detTipo:         { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  detRatingRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detRatingNum:    { fontSize: 15, fontWeight: '700', color: '#FFD700', marginLeft: 4 },
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
  contactText:     { fontSize: 14, color: '#e8590c', fontWeight: '500' },
  // Reseñas
  resena:          { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, marginBottom: 8 },
  resenaAutor:     { fontSize: 13, fontWeight: '700', color: '#111' },
  resenaTexto:     { fontSize: 13, color: '#555', marginTop: 4, lineHeight: 19 },

  item:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  rank:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff5f0', alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 14, fontWeight: '700', color: '#e8590c' },
  nombre:  { fontSize: 15, fontWeight: '600', color: '#111' },
  dir:     { fontSize: 12, color: '#888', marginTop: 2 },
  navBtn:  { padding: 8 },
  mapBox:  { marginBottom: 16 },
});
