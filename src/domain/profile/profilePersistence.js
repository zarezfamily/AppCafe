import { getDocument, setDocument } from '../../../firestoreService';
import { uploadImageToStorage } from '../../../storageService';
import { buildProfileDraft } from './profileValidation';

const DEFAULT_MOTTO = '"Ninguno de nosotros es tan listo como todos nosotros."';

export const persistProfile = async ({
  user,
  nombre,
  alias,
  apellidos,
  email,
  telefono,
  pais,
  foto,
}) => {
  const profileDraft = buildProfileDraft({
    nombre,
    alias,
    apellidos,
    email,
    telefono,
    pais,
    foto,
  });

  let fotoPersistida = profileDraft.foto;
  let avatarUrlParaWeb = String(profileDraft.foto || '').startsWith('http') ? String(profileDraft.foto).trim() : '';
  let uploadPendiente = false;

  if (profileDraft.foto && !String(profileDraft.foto).startsWith('http')) {
    try {
      fotoPersistida = await uploadImageToStorage(profileDraft.foto, `profile_avatars/${user?.uid || 'anon'}`);
      avatarUrlParaWeb = String(fotoPersistida || '').trim();
    } catch {
      uploadPendiente = true;
    }
  }

  const storedProfile = {
    ...profileDraft,
    foto: fotoPersistida,
  };

  if (user?.uid) {
    try {
      const existing = await getDocument('user_profiles', user.uid);
      const displayName = storedProfile.alias || storedProfile.nombre || storedProfile.email.split('@')[0] || 'Catador';
      const avatarCloud = avatarUrlParaWeb || String(existing?.avatarUrl || '').trim();

      await setDocument('user_profiles', user.uid, {
        uid: user.uid,
        displayName,
        avatarUrl: avatarCloud,
        motto: String(existing?.motto || '').trim() || DEFAULT_MOTTO,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // noop
    }
  }

  return {
    storedProfile,
    fotoPersistida: fotoPersistida || null,
    uploadPendiente,
  };
};
