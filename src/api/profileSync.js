// Sincronización en tiempo real del perfil de usuario entre Web y App
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import { db } from '../../firebaseConfig';

export function useProfileRealtimeSync(user, setPerfil) {
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'user_profiles', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setPerfil(docSnap.data());
      }
    });
    return unsub;
  }, [user?.uid]);
}
