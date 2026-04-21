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

function normalizeCoffeeCategory(cafeToShow) {
  if (cafeToShow.category === 'supermarket') return 'daily';
  if (cafeToShow.category === 'bio') return 'specialty';
  if (cafeToShow.category === 'specialty') return 'specialty';

  const c = cafeToShow.coffeeCategory;
  return c === 'daily' ? 'daily' : c === 'commercial' ? 'commercial' : 'specialty';
}

function getScaInfo(cafeToShow) {
  if (cafeToShow?.sca && typeof cafeToShow.sca === 'object') {
    const score = Number(cafeToShow.sca.score || 0);
    if (Number.isFinite(score) && score > 0) {
      return {
        score,
        type: cafeToShow.sca.type || 'estimated',
        confidence: Number(cafeToShow.sca.confidence || 0),
        reasons: Array.isArray(cafeToShow.sca.reasons) ? cafeToShow.sca.reasons : [],
      };
    }
  }

  const legacyScore = Number(cafeToShow?.sca || 0);
  if (Number.isFinite(legacyScore) && legacyScore > 0) {
    return {
      score: legacyScore,
      type: 'official',
      confidence: 1,
      reasons: [],
    };
  }

  return null;
}

function formatCategoryBadgeLabel(isDaily, cafeToShow) {
  if (isDaily) return 'Café diario';
  if (cafeToShow.category === 'bio') return 'Café bio';
  return 'Especialidad';
}

function formatScaCategory(score) {
  if (score >= 90) return '☕ Excepcional';
  if (score >= 85) return '⭐ Excelente';
  if (score >= 80) return '✓ Especialidad';
  return '◎ Correcto';
}

export default function CafeDetailScreen({
  cafe,
  cafes = null,
  cafeIndex = 0,
  onChangeCafe,
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
  const cafeToShow = cafes && cafes.length > 0 ? cafes[cafeIndex] : cafe;
  if (!cafeToShow) return null;

  const coffeeCategory = normalizeCoffeeCategory(cafeToShow);
  const isDaily = coffeeCategory === 'daily';
  const isFav = favs.includes(cafeToShow.id);
  const yaVotado = votes.includes(cafeToShow.id);

  const [miVoto, setMiVoto] = useState(0);
  const [votando, setVotando] = useState(false);
  const [votosActuales, setVotosActuales] = useState(Number(cafeToShow.votos || 0));
  const [puntuacionActual, setPuntuacionActual] = useState(Number(cafeToShow.puntuacion || 0));
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', description: '', actions: [] });

  const fotoCafe =
    cafeToShow.bestPhoto ||
    cafeToShow.officialPhoto ||
    cafeToShow.imageUrl ||
    cafeToShow.foto ||
    cafeToShow.image ||
    null;

  const precioTexto =
    cafeToShow.precio !== undefined && cafeToShow.precio !== null ? `${cafeToShow.precio} €` : null;

  const originText = [cafeToShow.pais || cafeToShow.origin || cafeToShow.origen, cafeToShow.region]
    .filter(Boolean)
    .join(', ');

  const votedStarsValue = miVoto || (yaVotado ? puntuacionActual : 0);
  const scaInfo = getScaInfo(cafeToShow);

  const chips = useMemo(() => {
    if (isDaily) {
      return [
        cafeToShow.formato || cafeToShow.format
          ? { icon: 'bag-outline', label: cafeToShow.formato || cafeToShow.format }
          : null,
        cafeToShow.tueste || cafeToShow.roastLevel
          ? {
              icon: 'flame-outline',
              label: `Tueste ${cafeToShow.tueste || cafeToShow.roastLevel}`,
            }
          : null,
        cafeToShow.preparacion ? { icon: 'cafe-outline', label: cafeToShow.preparacion } : null,
      ].filter(Boolean);
    }

    return [
      cafeToShow.variedad || cafeToShow.variety
        ? { icon: 'leaf-outline', label: cafeToShow.variedad || cafeToShow.variety }
        : null,
      cafeToShow.proceso || cafeToShow.process
        ? { icon: 'water-outline', label: cafeToShow.proceso || cafeToShow.process }
        : null,
      cafeToShow.tueste || cafeToShow.roastLevel
        ? {
            icon: 'flame-outline',
            label: `Tueste ${cafeToShow.tueste || cafeToShow.roastLevel}`,
          }
        : null,
      cafeToShow.altura || cafeToShow.altitude
        ? {
            icon: 'trending-up-outline',
            label: `${cafeToShow.altura || cafeToShow.altitude} msnm`,
          }
        : null,
    ].filter(Boolean);
  }, [
    cafeToShow.altitude,
    cafeToShow.altura,
    cafeToShow.format,
    cafeToShow.formato,
    cafeToShow.preparacion,
    cafeToShow.process,
    cafeToShow.proceso,
    cafeToShow.roastLevel,
    cafeToShow.tueste,
    cafeToShow.variety,
    cafeToShow.variedad,
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

      await updateDocument('cafes', cafeToShow.id, {
        votos: nuevosVotos,
        puntuacion: nuevaPuntuacion,
      });

      setVotosActuales(nuevosVotos);
      setPuntuacionActual(nuevaPuntuacion);

      const newVotes = [...votes, cafeToShow.id];
      setVotes?.(newVotes);
      await SecureStore.setItemAsync(keyVotes, JSON.stringify(newVotes)).catch(() => {});

      onVote?.(cafeToShow);
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
              <TouchableOpacity style={det.favBtn} onPress={() => onToggleFav(cafeToShow)}>
                <Ionicons
                  name={isFav ? 'star' : 'star-outline'}
                  size={22}
                  color={isFav ? theme?.status?.favorite || premiumAccent : '#fff'}
                />
              </TouchableOpacity>
            ) : null}

            {onDelete ? (
              <TouchableOpacity style={det.deleteBtn} onPress={() => onDelete(cafeToShow)}>
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
                  {formatCategoryBadgeLabel(isDaily, cafeToShow)}
                </Text>
              </View>
              <Text style={det.scoreNum}>{Number(puntuacionActual).toFixed(1)}</Text>
              <Stars value={puntuacionActual} size={16} />
              <Text style={det.scoreVotos}>
                {votosActuales} {votosActuales === 1 ? 'valoración' : 'valoraciones'}
              </Text>
            </View>
          </View>

          <View style={det.body}>
            {!!(cafeToShow.roaster || cafeToShow.marca) && (
              <Text style={det.roaster}>
                {isDaily
                  ? cafeToShow.marca || cafeToShow.roaster
                  : cafeToShow.roaster || cafeToShow.marca}
              </Text>
            )}

            <Text style={det.nombre}>{cafeToShow.nombre || cafeToShow.name}</Text>

            {!!cafeToShow.finca && !isDaily ? (
              <Text style={det.finca}>{cafeToShow.finca}</Text>
            ) : null}

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

                {cafeToShow.notas || cafeToShow.notes ? (
                  <View style={det.notasBox}>
                    <Text style={det.notasLabel}>Perfil esperado</Text>
                    <Text style={det.notasText}>{cafeToShow.notas || cafeToShow.notes}</Text>
                  </View>
                ) : null}

                <InfoRow
                  det={det}
                  icon="storefront-outline"
                  label="Marca"
                  value={cafeToShow.marca || cafeToShow.roaster}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="bag-outline"
                  label="Formato"
                  value={cafeToShow.formato || cafeToShow.format}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="earth-outline"
                  label="Origen"
                  value={cafeToShow.origen || cafeToShow.origin || originText}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="flame-outline"
                  label="Tueste"
                  value={cafeToShow.tueste || cafeToShow.roastLevel}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="cafe-outline"
                  label="Preparación"
                  value={cafeToShow.preparacion}
                  premiumAccent={premiumAccent}
                />
              </>
            ) : (
              <>
                {scaInfo ? (
                  <>
                    <View style={det.scaBox}>
                      <View style={det.scaTop}>
                        <View style={det.scaLeftBlock}>
                          <View style={det.scaLeft}>
                            <Text style={det.scaScore}>{Number(scaInfo.score).toFixed(1)}</Text>
                            <Text style={det.scaLabel}>
                              {scaInfo.type === 'official' ? 'SCA oficial' : 'SCA estimado'}
                            </Text>
                          </View>

                          {scaInfo.type === 'estimated' ? (
                            <Text style={det.scaConfidence}>
                              Confianza {Math.round(Number(scaInfo.confidence || 0) * 100)}%
                            </Text>
                          ) : null}
                        </View>

                        <Text style={det.scaCat}>{formatScaCategory(scaInfo.score)}</Text>
                      </View>

                      <View style={det.scaBar}>
                        <View
                          style={[
                            det.scaFill,
                            {
                              width: `${Math.min(
                                Math.max(((Number(scaInfo.score) - 80) / 20) * 100, 0),
                                100
                              )}%`,
                            },
                          ]}
                        />
                      </View>

                      {Array.isArray(scaInfo.reasons) && scaInfo.reasons.length ? (
                        <View style={det.scaReasonsWrap}>
                          {scaInfo.reasons.map((reason) => (
                            <View key={reason} style={det.scaReasonPill}>
                              <Text style={det.scaReasonText}>{reason}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                    <View style={det.divider} />
                  </>
                ) : null}

                {cafeToShow.notas ||
                cafeToShow.notes ||
                cafeToShow.acidez ||
                cafeToShow.cuerpo ||
                cafeToShow.regusto ? (
                  <>
                    <Text style={det.sectionTitle}>Perfil sensorial</Text>

                    {cafeToShow.notas || cafeToShow.notes ? (
                      <View style={det.notasBox}>
                        <Text style={det.notasLabel}>Notas de cata</Text>
                        <Text style={det.notasText}>{cafeToShow.notas || cafeToShow.notes}</Text>
                      </View>
                    ) : null}

                    <View style={det.sensRow}>
                      {!!cafeToShow.acidez && (
                        <SensItem
                          det={det}
                          label="Acidez"
                          value={cafeToShow.acidez}
                          icon="flash-outline"
                          premiumAccent={premiumAccent}
                        />
                      )}
                      {!!cafeToShow.cuerpo && (
                        <SensItem
                          det={det}
                          label="Cuerpo"
                          value={cafeToShow.cuerpo}
                          icon="fitness-outline"
                          premiumAccent={premiumAccent}
                        />
                      )}
                      {!!cafeToShow.regusto && (
                        <SensItem
                          det={det}
                          label="Regusto"
                          value={cafeToShow.regusto}
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
                  value={cafeToShow.productor}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="home-outline"
                  label="Finca"
                  value={cafeToShow.finca}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="trending-up-outline"
                  label="Altura"
                  value={
                    cafeToShow.altura || cafeToShow.altitude
                      ? `${cafeToShow.altura || cafeToShow.altitude} msnm`
                      : null
                  }
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="leaf-outline"
                  label="Variedad"
                  value={cafeToShow.variedad || cafeToShow.variety}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="water-outline"
                  label="Proceso"
                  value={cafeToShow.proceso || cafeToShow.process}
                  premiumAccent={premiumAccent}
                />
                <InfoRow
                  det={det}
                  icon="sunny-outline"
                  label="Secado"
                  value={cafeToShow.secado}
                  premiumAccent={premiumAccent}
                />

                {cafeToShow.tueste || cafeToShow.roastLevel || cafeToShow.fechaTueste ? (
                  <>
                    <View style={det.divider} />
                    <Text style={det.sectionTitle}>Tueste</Text>

                    <InfoRow
                      det={det}
                      icon="flame-outline"
                      label="Nivel"
                      value={cafeToShow.tueste || cafeToShow.roastLevel}
                      premiumAccent={premiumAccent}
                    />
                    <InfoRow
                      det={det}
                      icon="calendar-outline"
                      label="Fecha de tueste"
                      value={cafeToShow.fechaTueste}
                      premiumAccent={premiumAccent}
                    />
                  </>
                ) : null}

                {cafeToShow.preparacion ? (
                  <>
                    <View style={det.divider} />
                    <Text style={det.sectionTitle}>Preparación recomendada</Text>
                    <View style={det.prepBox}>
                      <Ionicons name="cafe-outline" size={20} color={premiumAccent} />
                      <Text style={det.prepText}>{cafeToShow.preparacion}</Text>
                    </View>
                  </>
                ) : null}

                {cafeToShow.certificaciones ? (
                  <>
                    <View style={det.divider} />
                    <Text style={det.sectionTitle}>Certificaciones</Text>
                    <Text style={det.certText}>{cafeToShow.certificaciones}</Text>
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
  scaLeftBlock: {
    flex: 1,
    gap: 6,
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
  scaConfidence: {
    fontSize: 12,
    color: '#8b7665',
    fontWeight: '700',
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
  scaReasonsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  scaReasonPill: {
    backgroundColor: '#F3ECE4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scaReasonText: {
    fontSize: 12,
    color: '#6A5140',
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
