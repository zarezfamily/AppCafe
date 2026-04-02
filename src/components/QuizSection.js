import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PREMIUM_ACCENT, PREMIUM_ACCENT_DEEP, THEME, W } from '../constants/theme';
import { KEY_FAVS, KEY_PREFS, KEY_VOTES } from '../constants/storageKeys';
import { normalize } from '../core/utils';
import { CardHorizontal } from './Cards';
import CafeDetailScreen from '../screens/CafeDetailScreen';

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
      { label: 'Especias',  desc: 'Canela, cardamomo, vainilla', value: 'especias', icon: '🌶️' },
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
    if (prefs.acidez === 'alta'  && (a.includes('brillante') || a.includes('alta') || a.includes('viva'))) score += 2;
    if (prefs.acidez === 'media' && (a.includes('media') || a.includes('equilibrada')))                     score += 2;
    if (prefs.acidez === 'baja'  && (a.includes('baja') || a.includes('suave')))                            score += 2;
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

export default function QuizSection({ allCafes, onGamifyEvent }) {
  const [step, setStep]             = useState(0);
  const [prefs, setPrefs]           = useState({});
  const [resultados, setResultados] = useState([]);
  const [cafeDetalle, setCafeDetalle] = useState(null);
  const [favs, setFavs]             = useState([]);
  const [votes, setVotes]           = useState([]);

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
      {cafeDetalle && (
        <CafeDetailScreen
          cafe={cafeDetalle}
          onClose={() => setCafeDetalle(null)}
          favs={favs}
          onToggleFav={toggleFav}
          votes={votes}
          setVotes={setVotes}
          onVote={(c) => onGamifyEvent?.('vote', { cafe: c })}
        />
      )}
      <View style={q.resultsHeader}>
        <View><Text style={q.resultsTitle}>Cafés para ti ✨</Text><Text style={q.resultsSub}>Basado en tus preferencias</Text></View>
        <TouchableOpacity onPress={reiniciar} style={q.resetBtn}>
          <Ionicons name="refresh-outline" size={16} color={PREMIUM_ACCENT_DEEP} />
          <Text style={q.resetText}>Repetir</Text>
        </TouchableOpacity>
      </View>
      {resultados.length === 0
        ? <Text style={[{ color: THEME.text.muted, textAlign: 'center', marginTop: 40, fontSize: 14 }, { marginHorizontal: 16 }]}>No hay coincidencias aún.</Text>
        : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
            {resultados.map(item => (
              <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0`} onPress={setCafeDetalle} favs={favs} onToggleFav={toggleFav} />
            ))}
          </ScrollView>
      }
    </View>
  );
}

const q = StyleSheet.create({
  introBox:          { margin: 16, backgroundColor: '#f6ede3', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
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
  opcion:            { width: (W - 80) / 2, backgroundColor: '#f9f9f9', borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: '#f0f0f0' },
  opcionIcon:        { fontSize: 28 },
  opcionLabel:       { fontSize: 15, fontWeight: '700', color: '#111' },
  opcionDesc:        { fontSize: 11, color: THEME.text.secondary, textAlign: 'center' },
  resultsHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, marginTop: 16 },
  resultsTitle:      { fontSize: 20, fontWeight: '700', color: '#111' },
  resultsSub:        { fontSize: 13, color: THEME.text.secondary },
  resetBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f6ede3', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  resetText:         { color: PREMIUM_ACCENT_DEEP, fontSize: 13, fontWeight: '600' },
});
