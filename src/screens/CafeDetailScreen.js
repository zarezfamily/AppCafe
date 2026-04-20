import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useMemo, useState, useRef } from 'react';
import { FlatList } from 'react-native';
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
  // Si hay lista de cafés, usamos el índice para mostrar el café actual
  const [currentIndex, setCurrentIndex] = useState(cafeIndex);
  const flatListRef = useRef(null);
  const cafeToShow = cafes && cafes.length > 0 ? cafes[currentIndex] : cafe;
  if (!cafeToShow) return null;

  const c = cafeToShow.coffeeCategory;
  const coffeeCategory = c === 'daily' ? 'daily' : c === 'commercial' ? 'commercial' : 'specialty';
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
    cafeToShow.bestPhoto || cafeToShow.officialPhoto || cafeToShow.foto || cafeToShow.image || null;
  const precioTexto =
    cafeToShow.precio !== undefined && cafeToShow.precio !== null ? `${cafeToShow.precio} €` : null;
  const originText = [cafeToShow.pais || cafeToShow.origen, cafeToShow.region]
    .filter(Boolean)
    .join(', ');
  const votedStarsValue = miVoto || (yaVotado ? puntuacionActual : 0);

  const chips = useMemo(() => {
    if (isDaily) {
      return [
        cafeToShow.formato ? { icon: 'bag-outline', label: cafeToShow.formato } : null,
        cafeToShow.tueste ? { icon: 'flame-outline', label: `Tueste ${cafeToShow.tueste}` } : null,
        cafeToShow.preparacion ? { icon: 'cafe-outline', label: cafeToShow.preparacion } : null,
      ].filter(Boolean);
    }
    return [
      cafeToShow.variedad ? { icon: 'leaf-outline', label: cafeToShow.variedad } : null,
      cafeToShow.proceso ? { icon: 'water-outline', label: cafeToShow.proceso } : null,
      cafeToShow.tueste ? { icon: 'flame-outline', label: `Tueste ${cafeToShow.tueste}` } : null,
      cafeToShow.altura
        ? { icon: 'trending-up-outline', label: `${cafeToShow.altura} msnm` }
        : null,
    ].filter(Boolean);
  }, [
    cafeToShow.altura,
    cafeToShow.formato,
    cafeToShow.preparacion,
    cafeToShow.proceso,
    cafeToShow.tueste,
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

  // Si hay lista de cafés, renderizamos FlatList horizontal paginada
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
        {cafes && cafes.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={cafes}
            horizontal
            pagingEnabled
            initialScrollIndex={cafeIndex}
            getItemLayout={(_, index) => ({ length: 400, offset: 400 * index, index })}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / 400);
              setCurrentIndex(newIndex);
              if (onChangeCafe) onChangeCafe(newIndex);
            }}
            renderItem={({ item }) => {
              const c = item.coffeeCategory;
              const coffeeCategory =
                c === 'daily' ? 'daily' : c === 'commercial' ? 'commercial' : 'specialty';
              const isDaily = coffeeCategory === 'daily';
              const isFav = favs.includes(item.id);
              const yaVotado = votes.includes(item.id);
              const votedStarsValue = miVoto || (yaVotado ? Number(item.puntuacion || 0) : 0);
              const chips = isDaily
                ? [
                    item.formato ? { icon: 'bag-outline', label: item.formato } : null,
                    item.tueste ? { icon: 'flame-outline', label: `Tueste ${item.tueste}` } : null,
                    item.preparacion ? { icon: 'cafe-outline', label: item.preparacion } : null,
                  ].filter(Boolean)
                : [
                    item.variedad ? { icon: 'leaf-outline', label: item.variedad } : null,
                    item.proceso ? { icon: 'water-outline', label: item.proceso } : null,
                    item.tueste ? { icon: 'flame-outline', label: `Tueste ${item.tueste}` } : null,
                    item.altura
                      ? { icon: 'trending-up-outline', label: `${item.altura} msnm` }
                      : null,
                  ].filter(Boolean);
              const precioTexto =
                item.precio !== undefined && item.precio !== null ? `${item.precio} €` : null;
              const originText = [item.pais || item.origen, item.region].filter(Boolean).join(', ');
              return (
                <ScrollView style={{ width: 400 }} showsVerticalScrollIndicator={false}>
                  <View style={det.hero}>
                    <View style={[StyleSheet.absoluteFillObject, styles.packshotBg]}>
                      <PackshotImage
                        uri={
                          item.bestPhoto || item.officialPhoto || item.foto || item.image || null
                        }
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
                      <TouchableOpacity style={det.favBtn} onPress={() => onToggleFav(item)}>
                        <Ionicons
                          name={isFav ? 'star' : 'star-outline'}
                          size={22}
                          color={isFav ? theme.status.favorite : '#fff'}
                        />
                      </TouchableOpacity>
                    ) : null}
                    {onDelete ? (
                      <TouchableOpacity style={det.deleteBtn} onPress={() => onDelete(item)}>
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
                            isDaily
                              ? styles.categoryHeroDailyText
                              : styles.categoryHeroSpecialtyText,
                          ]}
                        >
                          {isDaily ? 'Café diario' : 'Especialidad'}
                        </Text>
                      </View>
                      <Text style={det.scoreNum}>{Number(item.puntuacion || 0).toFixed(1)}</Text>
                      <Stars value={Number(item.puntuacion || 0)} size={16} />
                      <Text style={det.scoreVotos}>
                        {item.votos || 0} {item.votos === 1 ? 'valoración' : 'valoraciones'}
                      </Text>
                    </View>
                  </View>
                  <View style={det.body}>
                    {!!(item.roaster || item.marca) && (
                      <Text style={det.roaster}>
                        {isDaily ? item.marca || item.roaster : item.roaster || item.marca}
                      </Text>
                    )}
                    <Text style={det.nombre}>{item.nombre}</Text>
                    {!!item.finca && !isDaily ? <Text style={det.finca}>{item.finca}</Text> : null}
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
                          <Text style={det.voteSub}>
                            Toca las estrellas para dejar tu valoración
                          </Text>
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
                        {item.notas ? (
                          <View style={det.notasBox}>
                            <Text style={det.notasLabel}>Perfil esperado</Text>
                            <Text style={det.notasText}>{item.notas}</Text>
                          </View>
                        ) : null}
                        <InfoRow
                          det={det}
                          icon="storefront-outline"
                          label="Marca"
                          value={item.marca || item.roaster}
                          premiumAccent={premiumAccent}
                        />
                        <InfoRow
                          det={det}
                          icon="bag-outline"
                          label="Formato"
                          value={item.formato}
                          premiumAccent={premiumAccent}
                        />
                        <InfoRow
                          det={det}
                          icon="earth-outline"
                          label="Origen"
                          value={item.origen || originText}
                          premiumAccent={premiumAccent}
                        />
                        <InfoRow
                          det={det}
                          icon="flame-outline"
                          label="Tueste"
                          value={item.tueste}
                          premiumAccent={premiumAccent}
                        />
                        <InfoRow
                          det={det}
                          icon="cafe-outline"
                          label="Preparación"
                          value={item.preparacion}
                          premiumAccent={premiumAccent}
                        />
                        <View style={det.divider} />
                        <Text style={det.sectionTitle}>Da el salto</Text>
                        <View style={det.prepBox}>
                          <Ionicons name="rocket-outline" size={20} color={premiumAccent} />
                          <Text style={det.prepText}>
                            Si te gusta este perfil, aquí puedes descubrir cafés de especialidad con
                            mejor trazabilidad, más matices y menos amargor.
                          </Text>
                        </View>
                      </>
                    ) : (
                      <>
                        {item.sca ? (
                          <>
                            <View style={det.scaBox}>
                              <View style={det.scaTop}>
                                <View style={det.scaLeft}>
                                  <Text style={det.scaScore}>{item.sca}</Text>
                                  <Text style={det.scaLabel}>Puntuación SCA</Text>
                                </View>
                                <Text style={det.scaCat}>
                                  {item.sca >= 90
                                    ? '☕ Excepcional'
                                    : item.sca >= 85
                                      ? '⭐ Excelente'
                                      : '✓ Especialidad'}
                                </Text>
                              </View>
                              <View style={det.scaBar}>
                                <View
                                  style={[
                                    det.scaFill,
                                    {
                                      width: `${Math.min(Math.max(((item.sca - 80) / 20) * 100, 0), 100)}%`,
                                    },
                                  ]}
                                />
                              </View>
                            </View>
                            <View style={det.divider} />
                          </>
                        ) : null}
                        {item.notas || item.acidez || item.cuerpo || item.regusto ? (
                          <>
                            <Text style={det.sectionTitle}>Perfil sensorial</Text>
                            {item.notas ? (
                              <View style={det.notasBox}>
                                <Text style={det.notasLabel}>Notas de cata</Text>
                                <Text style={det.notasText}>{item.notas}</Text>
                              </View>
                            ) : null}
                            <View style={det.sensRow}>
                              {!!item.acidez && (
                                <SensItem
                                  det={det}
                                  label="Acidez"
                                  value={item.acidez}
                                  icon="flash-outline"
                                  premiumAccent={premiumAccent}
                                />
                              )}
                              {!!item.cuerpo && (
                                <SensItem
                                  det={det}
                                  label="Cuerpo"
                                  value={item.cuerpo}
                                  icon="fitness-outline"
                                  premiumAccent={premiumAccent}
                                />
                              )}
                              {!!item.regusto && (
                                <SensItem
                                  det={det}
                                  label="Regusto"
                                  value={item.regusto}
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
                          value={item.productor}
                          premiumAccent={premiumAccent}
                        />
                        <InfoRow
                          det={det}
                          icon="home-outline"
                          label="Finca"
                          value={item.finca}
                          premiumAccent={premiumAccent}
                        />
                        <InfoRow
                          det={det}
                          icon="trending-up-outline"
                          label="Altura"
                          value={item.altura ? `${item.altura} msnm` : null}
                          premiumAccent={premiumAccent}
                        />
                        <InfoRow
                          det={det}
                          icon="leaf-outline"
                          label="Variedad"
                          value={item.variedad}
                          premiumAccent={premiumAccent}
                        />
                        <InfoRow
                          det={det}
                          icon="water-outline"
                          label="Proceso"
                          value={item.proceso}
                          premiumAccent={premiumAccent}
                        />
                        <InfoRow
                          det={det}
                          icon="sunny-outline"
                          label="Secado"
                          value={item.secado}
                          premiumAccent={premiumAccent}
                        />
                        {item.tueste || item.fechaTueste ? (
                          <>
                            <View style={det.divider} />
                            <Text style={det.sectionTitle}>Tueste</Text>
                            <InfoRow
                              det={det}
                              icon="flame-outline"
                              label="Nivel"
                              value={item.tueste}
                              premiumAccent={premiumAccent}
                            />
                            <InfoRow
                              det={det}
                              icon="calendar-outline"
                              label="Fecha de tueste"
                              value={item.fechaTueste}
                              premiumAccent={premiumAccent}
                            />
                          </>
                        ) : null}
                        {item.preparacion ? (
                          <>
                            <View style={det.divider} />
                            <Text style={det.sectionTitle}>Preparación recomendada</Text>
                            <View style={det.prepBox}>
                              <Ionicons name="cafe-outline" size={20} color={premiumAccent} />
                              <Text style={det.prepText}>{item.preparacion}</Text>
                            </View>
                          </>
                        ) : null}
                        {item.certificaciones ? (
                          <>
                            <View style={det.divider} />
                            <Text style={det.sectionTitle}>Certificaciones</Text>
                            <Text style={det.certText}>{item.certificaciones}</Text>
                          </>
                        ) : null}
                        <View style={det.divider} />
                        <Text style={det.sectionTitle}>Puente con tu café diario</Text>
                        <View style={det.prepBox}>
                          <Ionicons
                            name="swap-horizontal-outline"
                            size={20}
                            color={premiumAccent}
                          />
                          <Text style={det.prepText}>
                            Este café puede ser una buena evolución si buscas más limpieza, más
                            dulzor natural y mejor trazabilidad.
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
              );
            }}
            keyExtractor={(item) => item.id}
          />
        ) : (
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
                    color={isFav ? theme.status.favorite : '#fff'}
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
                    {isDaily ? 'Café diario' : 'Especialidad'}
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

              <Text style={det.nombre}>{cafeToShow.nombre}</Text>

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

                  {cafeToShow.notas ? (
                    <View style={det.notasBox}>
                      <Text style={det.notasLabel}>Perfil esperado</Text>
                      <Text style={det.notasText}>{cafeToShow.notas}</Text>
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
                    value={cafeToShow.formato}
                    premiumAccent={premiumAccent}
                  />
                  <InfoRow
                    det={det}
                    icon="earth-outline"
                    label="Origen"
                    value={cafeToShow.origen || originText}
                    premiumAccent={premiumAccent}
                  />
                  <InfoRow
                    det={det}
                    icon="flame-outline"
                    label="Tueste"
                    value={cafeToShow.tueste}
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
                  {cafeToShow.sca ? (
                    <>
                      <View style={det.scaBox}>
                        <View style={det.scaTop}>
                          <View style={det.scaLeft}>
                            <Text style={det.scaScore}>{cafeToShow.sca}</Text>
                            <Text style={det.scaLabel}>Puntuación SCA</Text>
                          </View>
                          <Text style={det.scaCat}>
                            {cafeToShow.sca >= 90
                              ? '☕ Excepcional'
                              : cafeToShow.sca >= 85
                                ? '⭐ Excelente'
                                : '✓ Especialidad'}
                          </Text>
                        </View>

                        <View style={det.scaBar}>
                          <View
                            style={[
                              det.scaFill,
                              {
                                width: `${Math.min(Math.max(((cafeToShow.sca - 80) / 20) * 100, 0), 100)}%`,
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

                      {cafeToShow.notas ? (
                        <View style={det.notasBox}>
                          <Text style={det.notasLabel}>Notas de cata</Text>
                          <Text style={det.notasText}>{cafeToShow.notas}</Text>
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
                    value={cafeToShow.altura ? `${cafeToShow.altura} msnm` : null}
                    premiumAccent={premiumAccent}
                  />
                  <InfoRow
                    det={det}
                    icon="leaf-outline"
                    label="Variedad"
                    value={cafeToShow.variedad}
                    premiumAccent={premiumAccent}
                  />
                  <InfoRow
                    det={det}
                    icon="water-outline"
                    label="Proceso"
                    value={cafeToShow.proceso}
                    premiumAccent={premiumAccent}
                  />
                  <InfoRow
                    det={det}
                    icon="sunny-outline"
                    label="Secado"
                    value={cafeToShow.secado}
                    premiumAccent={premiumAccent}
                  />

                  {cafeToShow.tueste || cafeToShow.fechaTueste ? (
                    <>
                      <View style={det.divider} />
                      <Text style={det.sectionTitle}>Tueste</Text>

                      <InfoRow
                        det={det}
                        icon="flame-outline"
                        label="Nivel"
                        value={cafeToShow.tueste}
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
        )}
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
