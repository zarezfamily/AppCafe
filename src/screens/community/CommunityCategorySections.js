import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function MotivationCard({ icon, label, xp }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#faf8f5',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#e8dcc8',
      }}
    >
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#1f140f' }}>{label}</Text>
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#d4a574' }}>{xp}</Text>
    </View>
  );
}

export function CommunityAchievementsSection({ gamification, achievementDefs }) {
  if (!gamification) return null;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 20, gap: 12 }}>
      <View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f140f', marginBottom: 8 }}>
          🏆 Logros desbloqueados
        </Text>
        <Text style={{ fontSize: 12, color: '#8b7355', marginBottom: 10 }}>
          {gamification.achievementIds.length > 0
            ? `${gamification.achievementIds.length} de ${achievementDefs.length} logros`
            : 'Desbloquea logros interactuando en la comunidad'}
        </Text>
      </View>

      {gamification.achievementIds.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {gamification.achievementIds.map((achievementId) => {
            const achievement = achievementDefs.find((item) => item.id === achievementId);
            return achievement ? (
              <View key={achievementId} style={{ flex: 1, minWidth: 90 }}>
                <View
                  style={{
                    backgroundColor: '#faf8f5',
                    borderRadius: 14,
                    padding: 12,
                    alignItems: 'center',
                    gap: 8,
                    borderWidth: 1.5,
                    borderColor: '#d4a574',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{achievement.icon}</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: '#1f140f',
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
            backgroundColor: '#faf8f5',
            borderRadius: 14,
            padding: 16,
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: '#e8dcc8',
          }}
        >
          <Text style={{ fontSize: 28 }}>🎯</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1f140f', textAlign: 'center' }}>
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
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1f140f', marginBottom: 4 }}>⚡ Gana puntos</Text>
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
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1f140f', marginBottom: 12 }}>Categorías</Text>
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
