import { useAuth } from '../context/AuthContext';
import {
  registerForPushNotificationsAsync,
  scheduleEtioveNotification,
} from '../core/notifications';
import { formatRelativeTime } from '../core/utils';
import useGamification from '../hooks/useGamification';
import {
  buildMainScreenBootstrapInput,
  buildMainScreenDomainInput,
  buildMainScreenForumInput,
  buildMainScreenTabPropsInput,
} from './buildMainScreenCompositionInputs';
import {
  KEY_FAVS,
  KEY_GAMIFICATION,
  KEY_INTERACTION_FEEDBACK,
  KEY_INTERACTION_FEEDBACK_SETTINGS,
  KEY_NOTIFY_COMMUNITY_SNAPSHOT,
  KEY_NOTIFY_FAVORITES_SNAPSHOT,
  KEY_NOTIFY_FORUM_SNAPSHOT,
  KEY_OFFERS_CACHE,
  KEY_ONBOARDING_DONE,
  KEY_PROFILE,
  KEY_VOTES,
} from './mainScreenConfig';
import useMainScreenBootstrap from './useMainScreenBootstrap';
import useMainScreenDomain from './useMainScreenDomain';
import useMainScreenEffects from './useMainScreenEffects';
import useMainScreenForum from './useMainScreenForum';
import useMainScreenProfileSummary from './useMainScreenProfileSummary';
import useMainScreenTabProps from './useMainScreenTabProps';
import useMainScreenUiState from './useMainScreenUiState';

const BOOTSTRAP_KEYS = {
  favs: KEY_FAVS,
  votes: KEY_VOTES,
  profile: KEY_PROFILE,
  offersCache: KEY_OFFERS_CACHE,
  onboardingDone: KEY_ONBOARDING_DONE,
  feedbackEnabled: KEY_INTERACTION_FEEDBACK,
  feedbackSettings: KEY_INTERACTION_FEEDBACK_SETTINGS,
  notifyCommunitySnapshot: KEY_NOTIFY_COMMUNITY_SNAPSHOT,
  notifyForumSnapshot: KEY_NOTIFY_FORUM_SNAPSHOT,
  notifyFavoritesSnapshot: KEY_NOTIFY_FAVORITES_SNAPSHOT,
};

export default function useMainScreenComposition({ onLogout, services, ui }) {
  const { user } = useAuth();
  const { restoreAuthTokenFromSecureStore, setDocument, addDocument, queryCollection } = services;

  const {
    CardHorizontal,
    CardVertical,
    DiarioCatasSection,
    PackshotImage,
    PremiumBadge,
    SearchInput,
    styles,
  } = ui;

  const createPendingCoffee = async (scanResult) => {
    if (!scanResult?.ean) {
      throw new Error('SCAN_RESULT_WITHOUT_EAN');
    }

    const existing = await queryCollection('cafes', 'ean', scanResult.ean);
    if (existing?.length) {
      return existing[0];
    }

    return addDocument('cafes', {
      ean: scanResult.ean,

      nombre: scanResult.name || '',
      origen: '',
      puntuacion: 0,
      notas: '',
      foto: scanResult.foto || '',

      reviewStatus: 'pending',
      sourceType: 'scanner_pending',

      aiGenerated: false,
      aiConfidenceScore: 0,
      aiSuggestion: {},
      aiStatus: 'queued',

      imageValidation: {
        status: 'pending',
      },

      isSpecialty: false,
      appVisible: false,
      scannerVisible: true,

      uid: user?.uid || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const screenUi = useMainScreenUiState({
    keyProfile: KEY_PROFILE,
    createPendingCoffee,
  });

  const gamification = useGamification({ storageKey: KEY_GAMIFICATION });

  const domain = useMainScreenDomain(
    buildMainScreenDomainInput({
      user,
      screenUi,
      gamification,
      services,
    })
  );

  const profileSummary = useMainScreenProfileSummary({
    user,
    perfil: screenUi.perfil,
    gamification: gamification.gamification,
    brandCardAnim: screenUi.brandCardAnim,
    brandProgressAnim: screenUi.brandProgressAnim,
    setDocument,
  });

  const forum = useMainScreenForum(
    buildMainScreenForumInput({
      user,
      screenUi,
      profileSummary,
      domain,
      services,
    })
  );

  const bootstrap = useMainScreenBootstrap(
    buildMainScreenBootstrapInput({
      user,
      screenUi,
      domain,
      forum,
      services,
      notifications: {
        registerForPushNotificationsAsync,
        scheduleEtioveNotification,
      },
      bootstrapKeys: BOOTSTRAP_KEYS,
    })
  );

  useMainScreenEffects({
    brandCardAnim: screenUi.brandCardAnim,
    brandProgressAnim: screenUi.brandProgressAnim,
    levelProgress: profileSummary.levelProgress,
    userId: user?.uid,
    restoreAuthTokenFromSecureStore,
    cargarCatas: domain.cargarCatas,
    activeTab: screenUi.activeTab,
    forumThreadsLength: forum.forumThreads.length,
    forumLoading: forum.forumLoading,
    cargarForo: forum.cargarForo,
  });

  const tabProps = useMainScreenTabProps(
    buildMainScreenTabPropsInput({
      styles,
      components: {
        SearchInput,
        CardVertical,
        CardHorizontal,
        PackshotImage,
        PremiumBadge,
        DiarioCatasSection,
      },
      screenUi,
      domain,
      forum: {
        ...forum,
        formatRelativeTime,
      },
      bootstrap,
      gamification,
      profileSummary,
      onLogout,
    })
  );

  return {
    user,
    ui: screenUi,
    domain,
    forum,
    bootstrap,
    gamification,
    profileSummary,
    tabProps,
  };
}
