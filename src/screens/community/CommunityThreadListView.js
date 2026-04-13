import { Animated, View } from 'react-native';
import {
  CommunityThreadListContent,
  CommunityThreadListHeader,
  CommunityThreadListSkeleton,
} from './CommunityThreadListParts';

export default function CommunityThreadListView({
  s,
  PremiumBadge,
  forumCategory,
  setForumCategory,
  handleOpenCreate,
  forumSort,
  setForumSort,
  forumLoading,
  forumThreadsByCategory,
  forumError,
  formatRelativeTime,
  threadListEnterAnim,
  skeletonShimmerAnim,
  threadRowAnimsRef,
  getPressAnim,
  threadPressAnimsRef,
  animatePressIn,
  animatePressOut,
  handleOpenThread,
}) {
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: threadListEnterAnim,
        transform: [
          {
            translateX: threadListEnterAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      }}
    >
      <CommunityThreadListHeader
        s={s}
        forumCategory={forumCategory}
        setForumCategory={setForumCategory}
        handleOpenCreate={handleOpenCreate}
        forumSort={forumSort}
        setForumSort={setForumSort}
      />
      {forumLoading ? (
        <CommunityThreadListSkeleton s={s} skeletonShimmerAnim={skeletonShimmerAnim} />
      ) : (
        <CommunityThreadListContent
          s={s}
          PremiumBadge={PremiumBadge}
          forumThreadsByCategory={forumThreadsByCategory}
          forumError={forumError}
          formatRelativeTime={formatRelativeTime}
          threadRowAnimsRef={threadRowAnimsRef}
          getPressAnim={getPressAnim}
          threadPressAnimsRef={threadPressAnimsRef}
          animatePressIn={animatePressIn}
          animatePressOut={animatePressOut}
          handleOpenThread={handleOpenThread}
        />
      )}
    </Animated.View>
  );
}
