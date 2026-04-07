import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import {
    ActivityIndicator, Modal, SafeAreaView, ScrollView,
    StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { updateDocument } from '../../firebaseConfig';
import AppDialogModal from '../components/AppDialogModal';
import Chip from '../components/Chip';
import InfoRow from '../components/InfoRow';
import PackshotImage from '../components/PackshotImage';
import Stars from '../components/Stars';
import { KEY_VOTES } from '../constants/storageKeys';
import { H, PREMIUM_ACCENT, PREMIUM_ACCENT_DEEP, PREMIUM_BORDER_SOFT, PREMIUM_SURFACE_SOFT, PREMIUM_SURFACE_TINT, THEME, W } from '../constants/theme';
import { shared } from '../styles/sharedStyles';

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

export default function CafeDetailScreen({ cafe, onClose, onDelete, favs = [], onToggleFav, votes = [], setVotes, onVote }) {
  if (!cafe) return null;
  const isFav    = favs.includes(cafe.id);
  const yaVotado = votes.includes(cafe.id);
  const [miVoto, setMiVoto]                       = useState(0);
  const [votando, setVotando]                     = useState(false);
  const [votosActuales, setVotosActuales]         = useState(cafe.votos || 0);
  const [puntuacionActual, setPuntuacionActual]   = useState(cafe.puntuacion || 0);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', description: '', actions: [] });

  const showDialog = (title, description, actions = [{ label: 'Cerrar' }]) => {
    setDialogConfig({ title, description, actions });
    setDialogVisible(true);
  };

  const votar = async (estrellas) => {
    if (votando || yaVotado || miVoto > 0) return;
    setVotando(true);
    try {
      setMiVoto(estrellas);
      const nuevosVotos    = votosActuales + 1;
      const nuevaPuntuacion = Math.round(((puntuacionActual * votosActuales) + estrellas) / nuevosVotos);
      await updateDocument('cafes', cafe.id, { votos: nuevosVotos, puntuacion: nuevaPuntuacion });
      setVotosActuales(nuevosVotos);
      setPuntuacionActual(nuevaPuntuacion);
      const newVotes = [...votes, cafe.id];
      setVotes?.(newVotes);
      await SecureStore.setItemAsync(KEY_VOTES, JSON.stringify(newVotes)).catch(() => {});
      onVote?.(cafe);
      showDialog('Gracias', `Has valorado este café con ${estrellas} estrellas.\nNueva puntuación media: ${nuevaPuntuacion}.0`);
    } catch {
      showDialog('Error', 'No se pudo guardar tu voto');
      setMiVoto(0);
    }
    finally { setVotando(false); }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <AppDialogModal
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        title={dialogConfig.title}
        description={dialogConfig.description}
        actions={dialogConfig.actions}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={det.hero}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f7f4ef', alignItems: 'center', justifyContent: 'center' }]}>
              <PackshotImage uri={cafe.foto} frameStyle={shared.packshotHeroFrame} imageStyle={shared.packshotHeroImage} />
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
              {cafe.variedad  && <Chip label={cafe.variedad}            icon="leaf-outline" />}
              {cafe.proceso   && <Chip label={cafe.proceso}             icon="water-outline" />}
              {cafe.tueste    && <Chip label={`Tueste ${cafe.tueste}`}  icon="flame-outline" />}
              {cafe.altura    && <Chip label={`${cafe.altura} msnm`}    icon="trending-up-outline" />}
            </ScrollView>

            <View style={det.votarBox}>
              {yaVotado || miVoto > 0
                ? <><Text style={det.votarTitle}>¡Ya has valorado este café!</Text><Text style={det.votarSub}>Tu voto ha sido registrado ⭐</Text></>
                : <><Text style={det.votarTitle}>¿Qué te parece este café?</Text><Text style={det.votarSub}>Toca las estrellas para valorarlo</Text></>
              }
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {[1, 2, 3, 4, 5].map((n) => (
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
                <View style={det.scaBar}><View style={[det.scaFill, { width: `${Math.min(((cafe.sca - 80) / 20) * 100, 100)}%` }]} /></View>
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
            <InfoRow icon="location-outline"    label="País / Región" value={[cafe.pais, cafe.region].filter(Boolean).join(', ')} />
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

            {cafe.preparacion    && <><View style={det.divider} /><Text style={det.sectionTitle}>Preparación recomendada</Text><View style={det.prepBox}><Ionicons name="cafe-outline" size={20} color={PREMIUM_ACCENT} /><Text style={det.prepText}>{cafe.preparacion}</Text></View></>}
            {cafe.certificaciones && <><View style={det.divider} /><Text style={det.sectionTitle}>Certificaciones</Text><Text style={det.certText}>{cafe.certificaciones}</Text></>}
            {cafe.precio          && <View style={det.precioBox}><Text style={det.precioLabel}>Precio orientativo</Text><Text style={det.precioVal}>{cafe.precio}€ / 100g</Text></View>}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const det = StyleSheet.create({
  hero:         { width: W, height: H * 0.42, backgroundColor: '#f5f0eb' },
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
