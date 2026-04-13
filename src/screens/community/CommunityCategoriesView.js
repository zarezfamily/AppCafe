import { ScrollView, View } from 'react-native';
import {
  CommunityAchievementsSection,
  CommunityCategoryList,
  CommunityMotivationSection,
} from './CommunityCategorySections';

export default function CommunityCategoriesView({
  s,
  gamification,
  getAchievementDefs,
  forumCategories,
  categoryRowAnimsRef,
  getPressAnim,
  categoryPressAnimsRef,
  handleOpenCategory,
  animatePressIn,
  animatePressOut,
}) {
  const achievementDefs = getAchievementDefs();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110, gap: 0 }}>
        <CommunityAchievementsSection gamification={gamification} achievementDefs={achievementDefs} />
        <CommunityMotivationSection />
        <CommunityCategoryList
          s={s}
          forumCategories={forumCategories}
          categoryRowAnimsRef={categoryRowAnimsRef}
          getPressAnim={getPressAnim}
          categoryPressAnimsRef={categoryPressAnimsRef}
          handleOpenCategory={handleOpenCategory}
          animatePressIn={animatePressIn}
          animatePressOut={animatePressOut}
        />
      </ScrollView>
    </View>
  );
}
