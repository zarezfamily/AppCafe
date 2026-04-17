import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function MotivationCard({ icon, label, xp }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 8,
        shadowColor: '#5a2d0c',
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#180d06' }}>{label}</Text>
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#a8603c' }}>{xp}</Text>
    </View>
  );
}

export function CommunityAchievementsSection({ gamification, achievementDefs }) {
  if (!gamification) return null;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, gap: 12 }}>
      <View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '800',
            color: '#9e6540',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Logros desbloqueados
        </Text>
        <Text style={{ fontSize: 12, color: '#6b5244' }}>
          {gamification.achievementIds.length > 0
            ? `${gamification.achievementIds.length} de ${achievementDefs.length} logros`
            : 'Interactúa en la comunidad para desbloquear logros'}
        </Text>
      </View>

      {gamification.achievementIds.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {gamification.achievementIds.map((achievementId) => {
            const achievement = achievementDefs.find((item) => item.id === achievementId);
            return achievement ? (
              <View key={achievementId} style={{ flex: 1, minWidth: 90 }}>
                <View
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 14,
                    padding: 12,
                    alignItems: 'center',
                    gap: 8,
                    shadowColor: '#5a2d0c',
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{achievement.icon}</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: '#180d06',
                      textAlign: 'center',
                      lineHeight: 14,
                    }}
                  >
                    {achievement.title}
                  </Text>
                </View>
              </View>
            ) : null;
          })}
        </View>
      ) : (
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 14,
            padding: 18,
            alignItems: 'center',
            gap: 8,
            shadowColor: '#5a2d0c',
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          <Text style={{ fontSize: 28 }}>🎯</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#180d06', textAlign: 'center' }}>
            Empieza a interactuar para desbloquear logros
          </Text>
        </View>
      )}
    </View>
  );
}

export function CommunityMotivationSection() {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          color: '#9e6540',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        Gana puntos
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <MotivationCard icon="💬" label="Responder" xp="+14 XP" />
        <MotivationCard icon="🆕" label="Crear tema" xp="+18 XP" />
        <MotivationCard icon="👍" label="Votar" xp="+8 XP" />
      </View>
    </View>
  );
}

export function CommunityCategoryList({
  s,
  forumCategories,
  categoryRowAnimsRef,
  getPressAnim,
  categoryPressAnimsRef,
  handleOpenCategory,
  animatePressIn,
  animatePressOut,
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          color: '#9e6540',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Categorías
      </Text>
      <View style={{ gap: 10 }}>
        {forumCategories.map((cat, idx) => {
          const rowAnim = categoryRowAnimsRef.current[idx] || new Animated.Value(1);
          const pressAnim = getPressAnim(categoryPressAnimsRef, idx);
          return (
            <Animated.View
              key={cat.id}
              style={{
                opacity: rowAnim,
                transform: [
                  { translateY: rowAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
                  { scale: pressAnim },
                ],
              }}
            >
              <TouchableOpacity
                style={s.forumCatCard}
                activeOpacity={0.96}
                onPress={() => handleOpenCategory(cat)}
                onPressIn={() => animatePressIn(pressAnim)}
                onPressOut={() => animatePressOut(pressAnim)}
              >
                <Text style={s.forumCatEmoji}>{cat.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.forumCatTitle}>{cat.label}</Text>
                  {!!cat.desc && <Text style={s.forumCatDesc}>{cat.desc}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#d4a574" />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
