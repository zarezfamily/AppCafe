import { useEffect } from 'react';
import { getDocument } from '../../firestoreService';

export function useProfileRealtimeSync(user, setPerfil) {
  useEffect(() => {
    if (!user?.uid) return;

    let active = true;

    const syncProfile = async () => {
      try {
        const profile = await getDocument('user_profiles', user.uid);
        if (active && profile) {
          setPerfil(profile);
        }
      } catch {
        // noop
      }
    };

    syncProfile();
    const intervalId = setInterval(syncProfile, 15000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [user?.uid]);
}
