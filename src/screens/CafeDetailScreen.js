import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppDialogModal from '../components/AppDialogModal';
import PackshotImage from '../components/PackshotImage';
import Stars from '../components/Stars';
import { updateDocument } from '../services/firestoreService';

export default function CafeDetailScreen({
  cafe,
  onClose,
  onDelete,
  favs = [],
  onToggleFav,
  votes = [],
  setVotes,
  onVote,
  theme,
  premiumAccent,
  s,
  keyVotes,
}) {
  if (!cafe) return null;

  const coffeeCategory = cafe.coffeeCategory === 'daily' ? 'daily' : 'specialty';
  const isDaily = coffeeCategory === 'daily';
  const isFav = favs.includes(cafe.id);
  const yaVotado = votes.includes(cafe.id);

  const [miVoto, setMiVoto] = useState(0);
  const [votando, setVotando] = useState(false);
  const [votosActuales, setVotosActuales] = useState(Number(cafe.votos || 0));
  const [puntuacionActual, setPuntuacionActual] = useState(Number(cafe.puntuacion || 0));
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', description: '', actions: [] });

  const fotoCafe = cafe.bestPhoto || cafe.officialPhoto || cafe.foto || cafe.image || null;
  const precioTexto = cafe.precio !== undefined && cafe.precio !== null ? `${cafe.precio} €` : null;
  const originText = [cafe.pais || cafe.origen, cafe.region].filter(Boolean).join(', ');
  const votedStarsValue = miVoto || (yaVotado ? puntuacionActual : 0);

  const chips = useMemo(() => {
    if (isDaily) {
      return [
        cafe.formato ? { icon: 'bag-outline', label: cafe.formato } : null,
        cafe.tueste ? { icon: 'flame-outline', label: `Tueste ${cafe.tueste}` } : null,
        cafe.preparacion ? { icon: 'cafe-outline', label: cafe.preparacion } : null,
      ].filter(Boolean);
    }

    return [
      cafe.variedad ? { icon: 'leaf-outline', label: cafe.variedad } : null,
      cafe.proceso ? { icon: 'water-outline', label: cafe.proceso } : null,
      cafe.tueste ? { icon: 'flame-outline', label: `Tueste ${cafe.tueste}` } : null,
      cafe.altura ? { icon: 'trending-up-outline', label: `${cafe.altura} msnm` } : null,
    ].filter(Boolean);
  }, [
    cafe.altura,
    cafe.formato,
    cafe.preparacion,
    cafe.proceso,
    cafe.tueste,
    cafe.variedad,
    isDaily,
  ]);

  const showDialog = (title, description, actions = [{ label: 'Cerrar' }]) => {
    setDialogConfig({ title, description, actions });
    setDialogVisible(true);
  };

  const votar = async (estrellas) => {
    if (votando || yaVotado || miVoto > 0) return;

    setVotando(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      setMiVoto(estrellas);

      const nuevosVotos = votosActuales + 1;
      const nuevaPuntuacion = Math.round(
        (puntuacionActual * votosActuales + estrellas) / nuevosVotos
      );

      await updateDocument('cafes', cafe.id, {
        votos: nuevosVotos,
        puntuacion: nuevaPuntuacion,
      });

      setVotosActuales(nuevosVotos);
      setPuntuacionActual(nuevaPuntuacion);

      const newVotes = [...votes, cafe.id];
      setVotes?.(newVotes);
      await SecureStore.setItemAsync(keyVotes, JSON.stringify(newVotes)).catch(() => {});

      onVote?.(cafe);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      showDialog(
        'Gracias',
        `Has valorado este café con ${estrellas} estrellas.\nNueva puntuación media: ${nuevaPuntuacion}.0`
      );
    } catch {
      showDialog('Error', 'No se pudo guardar tu voto');
      setMiVoto(0);
    } finally {
      setVotando(false);
    }
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

      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={det.hero}>
            <View style={[StyleSheet.absoluteFillObject, styles.packshotBg]}>
              <PackshotImage
                uri={fotoCafe}
                frameStyle={s?.packshotHeroFrame}
                imageStyle={s?.packshotHeroImage}
              />
            </View>

            <View style={det.heroOverlayTop} />
            <View style={det.heroOverlayBottom} />

            <TouchableOpacity style={det.backBtn} onPress={onClose}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            {onToggleFav ? (
              <TouchableOpacity style={det.favBtn} onPress={() => onToggleFav(cafe)}>
                <Ionicons
                  name={isFav ? 'star' : 'star-outline'}
                  size={22}
                  color={isFav ? theme.status.favorite : '#fff'}
                />
              </TouchableOpacity>
            ) : null}

            {onDelete ? (
              <TouchableOpacity style={det.deleteBtn} onPress={() => onDelete(cafe)}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            ) : null}

            <View style={det.scoreBox}>
              <View
                style={[
                  styles.categoryHeroBadge,
                  isDaily ? styles.categoryHeroDaily : styles.categoryHeroSpecialty,
                ]}
              >
                <Text
                  style={[
                    styles.categoryHeroBadgeText,
                    isDaily ? styles.categoryHeroDailyText : styles.categoryHeroSpecialtyText,
                  ]}
                >
                  {isDaily ? 'Café diario' : 'Especialidad'}
                </Text>
              </View>
              <Text style={det.scoreNum}>{puntuacionActual}.0</Text>
              <Stars value={puntuacionActual} size={16} />
              <Text style={det.scoreVotos}>
                {votosActuales} {votosActuales === 1 ? 'valoración' : 'valoraciones'}
              </Text>
            </View>
          </View>

          <View style={det.body}>
            {!!(cafe.roaster || cafe.marca) && (
              <Text style={det.roaster}>
                {isDaily ? cafe.marca || cafe.roaster : cafe.roaster || cafe.marca}
              </Text>
            )}

            <Text style={det.nombre}>{cafe.nombre}</Text>

            {!!cafe.finca && !isDaily ? <Text style={det.finca}>{cafe.finca}</Text> : null}

            {originText ? (
              <View style={det.originRow}>
                <Ionicons name="earth-outline" size={14} color="#8b6d57" />
                <Text style={det.originText}>{originText}</Text>
              </View>
            ) : null}

            {precioTexto ? (
              <View style={det.priceHeroPill}>
                <Text style={det.priceHeroLabel}>Precio orientativo</Text>
                <Text style={det.priceHeroValue}>{precioTexto}</Text>
              </View>
            ) : null}

            {chips.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={det.chipsWrap}
                contentContainerStyle={{ paddingRight: 4 }}
              >
                {chips.map((chip) => (
                  <Chip
                    key={`${chip.icon}-${chip.label}`}
                    det={det}
                    label={chip.label}
                    icon={chip.icon}
                    premiumAccent={premiumAccent}
                  />
                ))}
              </ScrollView>
            ) : null}

            <View style={det.voteBox}>
              {yaVotado || miVoto > 0 ? (
                <>
                  <Text style={det.voteTitle}>¡Ya has valorado este café!</Text>
                  <Text style={det.voteSub}>Tu voto ha quedado registrado.</Text>
                </>
              ) : (
                <>
                  <Text style={det.voteTitle}>¿Qué te parece este café?</Text>
                  <Text style={det.voteSub}>Toca las estrellas para dejar tu valoración</Text>
                </>
              )}

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = n <= votedStarsValue;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => votar(n)}
                      disabled={yaVotado || miVoto > 0 || votando}
                      style={styles.starTap}
                    >
                      <Ionicons
                        name={active ? 'star' : 'star-outline'}
                        size={34}
                        color={active ? premiumAccent : '#d8d1ca'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {votando ? (
                <ActivityIndicator color={premiumAccent} style={styles.voteSpinner} />
              ) : null}
            </View>

            <View style={det.divider} />

            {isDaily ? (
              <>
                <Text style={det.sectionTitle}>Tu café diario</Text>

                {cafe.notas ? (
                  <View style={det.notasBox}>
                    <Text style={det.notasLabel}>Perfil esperado</Text>
                    <Text style={det.notasText}>{cafe.notas}</Text>
                  </View>
                ) : null}

                <InfoRow
                  det={det}
                  icon="storefront-outline"
                  label="Marca"
                  value={cafe.marca || cafe.roaster}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="bag-outline"
                  label="Formato"
                  value={cafe.formato}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="earth-outline"
                  label="Origen"
                  value={cafe.origen || originText}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="flame-outline"
                  label="Tueste"
                  value={cafe.tueste}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="cafe-outline"
                  label="Preparación"
                  value={cafe.preparacion}
                  premiumAccent={premiumAccent}
                />

                <View style={det.divider} />
                <Text style={det.sectionTitle}>Da el salto</Text>
                <View style={det.prepBox}>
                  <Ionicons name="rocket-outline" size={20} color={premiumAccent} />
                  <Text style={det.prepText}>
                    Si te gusta este perfil, aquí puedes descubrir cafés de especialidad con mejor
                    trazabilidad, más matices y menos amargor.
                  </Text>
                </View>
              </>
            ) : (
              <>
                {cafe.sca ? (
                  <>
                    <View style={det.scaBox}>
                      <View style={det.scaTop}>
                        <View style={det.scaLeft}>
                          <Text style={det.scaScore}>{cafe.sca}</Text>
                          <Text style={det.scaLabel}>Puntuación SCA</Text>
                        </View>
                        <Text style={det.scaCat}>
                          {cafe.sca >= 90
                            ? '☕ Excepcional'
                            : cafe.sca >= 85
                              ? '⭐ Excelente'
                              : '✓ Especialidad'}
                        </Text>
                      </View>

                      <View style={det.scaBar}>
                        <View
                          style={[
                            det.scaFill,
                            {
                              width: `${Math.min(Math.max(((cafe.sca - 80) / 20) * 100, 0), 100)}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={det.divider} />
                  </>
                ) : null}

                {cafe.notas || cafe.acidez || cafe.cuerpo || cafe.regusto ? (
                  <>
                    <Text style={det.sectionTitle}>Perfil sensorial</Text>

                    {cafe.notas ? (
                      <View style={det.notasBox}>
                        <Text style={det.notasLabel}>Notas de cata</Text>
                        <Text style={det.notasText}>{cafe.notas}</Text>
                      </View>
                    ) : null}

                    <View style={det.sensRow}>
                      {!!cafe.acidez && (
                        <SensItem
                          det={det}
                          label="Acidez"
                          value={cafe.acidez}
                          icon="flash-outline"
                          premiumAccent={premiumAccent}
                        />
                      )}
                      {!!cafe.cuerpo && (
                        <SensItem
                          det={det}
                          label="Cuerpo"
                          value={cafe.cuerpo}
                          icon="fitness-outline"
                          premiumAccent={premiumAccent}
                        />
                      )}
                      {!!cafe.regusto && (
                        <SensItem
                          det={det}
                          label="Regusto"
                          value={cafe.regusto}
                          icon="time-outline"
                          premiumAccent={premiumAccent}
                        />
                      )}
                    </View>

                    <View style={det.divider} />
                  </>
                ) : null}

                <Text style={det.sectionTitle}>Origen y proceso</Text>

                <InfoRow
                  det={det}
                  icon="location-outline"
                  label="País / Región"
                  value={originText}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="person-outline"
                  label="Productor"
                  value={cafe.productor}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="home-outline"
                  label="Finca"
                  value={cafe.finca}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="trending-up-outline"
                  label="Altura"
                  value={cafe.altura ? `${cafe.altura} msnm` : null}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="leaf-outline"
                  label="Variedad"
                  value={cafe.variedad}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="water-outline"
                  label="Proceso"
                  value={cafe.proceso}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="sunny-outline"
                  label="Secado"
                  value={cafe.secado}
                  premiumAccent={premiumAccent}
                />

                {cafe.tueste || cafe.fechaTueste ? (
                  <>
                    <View style={det.divider} />
                    <Text style={det.sectionTitle}>Tueste</Text>

                    <InfoRow
                      det={det}
                      icon="flame-outline"
                      label="Nivel"
                      value={cafe.tueste}
                      premiumAccent={premiumAccent}
                    />
                    <InfoRow
                      det={det}
                      icon="calendar-outline"
                      label="Fecha de tueste"
                      value={cafe.fechaTueste}
                      premiumAccent={premiumAccent}
                    />
                  </>
                ) : null}

                {cafe.preparacion ? (
                  <>
                    <View style={det.divider} />
                    <Text style={det.sectionTitle}>Preparación recomendada</Text>
                    <View style={det.prepBox}>
                      <Ionicons name="cafe-outline" size={20} color={premiumAccent} />
                      <Text style={det.prepText}>{cafe.preparacion}</Text>
                    </View>
                  </>
                ) : null}

                {cafe.certificaciones ? (
                  <>
                    <View style={det.divider} />
                    <Text style={det.sectionTitle}>Certificaciones</Text>
                    <Text style={det.certText}>{cafe.certificaciones}</Text>
                  </>
                ) : null}

                <View style={det.divider} />
                <Text style={det.sectionTitle}>Puente con tu café diario</Text>
                <View style={det.prepBox}>
                  <Ionicons name="swap-horizontal-outline" size={20} color={premiumAccent} />
                  <Text style={det.prepText}>
                    Este café puede ser una buena evolución si buscas más limpieza, más dulzor
                    natural y mejor trazabilidad.
                  </Text>
                </View>
              </>
            )}

            {precioTexto ? (
              <>
                <View style={det.divider} />
                <View style={det.priceBox}>
                  <View>
                    <Text style={det.priceBoxLabel}>Precio</Text>
                    <Text style={det.priceBoxHint}>Valor orientativo</Text>
                  </View>
                  <Text style={det.priceBoxValue}>{precioTexto}</Text>
                </View>
              </>
            ) : null}

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Chip({ det, label, icon, premiumAccent }) {
  return (
    <View style={det.chip}>
      <Ionicons name={icon} size={12} color={premiumAccent} />
      <Text style={det.chipText}>{label}</Text>
    </View>
  );
}

function SensItem({ det, label, value, icon, premiumAccent }) {
  return (
    <View style={det.sensItem}>
      <Ionicons name={icon} size={18} color={premiumAccent} />
      <Text style={det.sensLabel}>{label}</Text>
      <Text style={det.sensVal}>{value}</Text>
    </View>
  );
}

function InfoRow({ det, icon, label, value, premiumAccent }) {
  if (!value) return null;

  return (
    <View style={det.infoRow}>
      <Ionicons name={icon} size={16} color={premiumAccent} style={styles.infoIcon} />
      <Text style={det.infoLabel}>{label}</Text>
      <Text style={det.infoVal}>{value}</Text>
    </View>
  );
}

const det = StyleSheet.create({
  hero: {
    width: '100%',
    minHeight: 360,
    backgroundColor: '#f6f0e9',
    overflow: 'hidden',
  },
  heroOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  heroOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },

  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16, 10, 7, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtn: {
    position: 'absolute',
    top: 52,
    right: 66,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16, 10, 7, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(150, 44, 37, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreBox: {
    position: 'absolute',
    left: 20,
    bottom: 22,
    gap: 4,
  },
  scoreNum: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 44,
  },
  scoreVotos: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
  },

  body: {
    padding: 20,
    backgroundColor: '#fff',
  },

  roaster: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8f5e3b',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  nombre: {
    fontSize: 29,
    fontWeight: '900',
    color: '#16110d',
    lineHeight: 34,
  },
  finca: {
    marginTop: 6,
    fontSize: 15,
    color: '#6f5a4b',
  },
  originRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  originText: {
    fontSize: 14,
    color: '#8b6d57',
    fontWeight: '600',
  },

  priceHeroPill: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#faf5ef',
    borderWidth: 1,
    borderColor: '#eadbce',
  },
  priceHeroLabel: {
    fontSize: 10,
    color: '#8b6d57',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  priceHeroValue: {
    marginTop: 2,
    fontSize: 16,
    color: '#2a1a12',
    fontWeight: '900',
  },

  chipsWrap: {
    marginTop: 16,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f6ede3',
    borderWidth: 1,
    borderColor: '#e4d3c2',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    color: '#5d4030',
    fontWeight: '700',
  },

  voteBox: {
    marginTop: 8,
    backgroundColor: '#fcf7f1',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eedfd0',
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  voteTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1b130f',
  },
  voteSub: {
    fontSize: 13,
    color: '#7e6959',
    textAlign: 'center',
  },

  scaBox: {
    backgroundColor: '#faf8f5',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee4d9',
    gap: 10,
  },
  scaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  scaLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  scaScore: {
    fontSize: 36,
    fontWeight: '900',
    color: '#17120e',
  },
  scaLabel: {
    fontSize: 13,
    color: '#7d6a5a',
  },
  scaBar: {
    height: 9,
    backgroundColor: '#eadfd3',
    borderRadius: 999,
    overflow: 'hidden',
  },
  scaFill: {
    height: '100%',
    backgroundColor: '#8f5e3b',
    borderRadius: 999,
  },
  scaCat: {
    fontSize: 13,
    color: '#5d4030',
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: '#f1ece6',
    marginVertical: 22,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a130e',
    marginBottom: 14,
  },

  notasBox: {
    backgroundColor: '#fbf5ee',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f0e2d4',
    marginBottom: 14,
  },
  notasLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5d4030',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  notasText: {
    fontSize: 15,
    color: '#30241c',
    lineHeight: 22,
  },

  sensRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sensItem: {
    flex: 1,
    backgroundColor: '#faf8f5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee4d9',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  sensLabel: {
    fontSize: 11,
    color: '#8b7665',
    fontWeight: '700',
  },
  sensVal: {
    fontSize: 12,
    color: '#31251d',
    textAlign: 'center',
    fontWeight: '600',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f4eee8',
  },
  infoLabel: {
    fontSize: 14,
    color: '#887263',
    flex: 1,
  },
  infoVal: {
    fontSize: 14,
    color: '#17120e',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },

  prepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fbf5ee',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f0e2d4',
  },
  prepText: {
    fontSize: 14,
    color: '#31251d',
    flex: 1,
    lineHeight: 20,
    fontWeight: '600',
  },

  certText: {
    fontSize: 14,
    color: '#4a3b30',
    lineHeight: 22,
  },

  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#faf8f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee4d9',
    padding: 16,
  },
  priceBoxLabel: {
    fontSize: 14,
    color: '#7d6a5a',
    fontWeight: '700',
  },
  priceBoxHint: {
    marginTop: 2,
    fontSize: 12,
    color: '#a18c7c',
  },
  priceBoxValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#8f5e3b',
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  packshotBg: {
    backgroundColor: '#f7f2eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  categoryHeroSpecialty: {
    backgroundColor: 'rgba(245, 232, 214, 0.96)',
    borderColor: '#eadbce',
  },
  categoryHeroDaily: {
    backgroundColor: 'rgba(231, 243, 255, 0.96)',
    borderColor: '#c8def7',
  },
  categoryHeroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryHeroSpecialtyText: {
    color: '#8f5e3b',
  },
  categoryHeroDailyText: {
    color: '#245b91',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  starTap: {
    padding: 2,
  },
  voteSpinner: {
    marginTop: 8,
  },
  infoIcon: {
    width: 22,
  },
  bottomSpacer: {
    height: 40,
  },
});
