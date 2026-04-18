import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const CAFES_COLLECTION = 'cafes';

export function normalizeEan(raw) {
  return String(raw || '')
    .replace(/\D/g, '')
    .trim();
}

export function sanitizeCafePayload(payload = {}) {
  return {
    ean: normalizeEan(payload.ean),
    normalizedEan: normalizeEan(payload.ean || payload.normalizedEan),
    name: String(payload.name || '').trim(),
    roaster: String(payload.roaster || '').trim(),
    origin: String(payload.origin || '').trim(),
    process: String(payload.process || '').trim(),
    variety: String(payload.variety || '').trim(),
    notes: String(payload.notes || '').trim(),
    imageUrl: String(payload.imageUrl || '').trim(),
  };
}

export function isCafeIncomplete(cafe) {
  if (!cafe) return true;

  return !(
    String(cafe.ean || '').trim() &&
    String(cafe.name || '').trim() &&
    String(cafe.roaster || '').trim() &&
    String(cafe.imageUrl || '').trim()
  );
}

export function canBeApproved(cafe) {
  return !isCafeIncomplete(cafe);
}

export function buildCompletionStatus(cafe) {
  return isCafeIncomplete(cafe) ? 'incomplete' : 'ready';
}

export async function findCafeByEan(rawEan) {
  const normalizedEan = normalizeEan(rawEan);
  if (!normalizedEan) return null;

  const ref = doc(db, CAFES_COLLECTION, normalizedEan);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

/**
 * Compatibilidad por si ya tienes docs antiguos con auto-id.
 * Busca por normalizedEan si no existe docId = EAN.
 */
export async function findLegacyCafeByEan(rawEan) {
  const normalizedEan = normalizeEan(rawEan);
  if (!normalizedEan) return null;

  const q = query(collection(db, CAFES_COLLECTION), where('normalizedEan', '==', normalizedEan));

  const snap = await getDocs(q);

  if (snap.empty) return null;

  const first = snap.docs[0];
  return {
    id: first.id,
    ...first.data(),
  };
}

export async function findAnyCafeByEan(rawEan) {
  const byDocId = await findCafeByEan(rawEan);
  if (byDocId) return byDocId;

  return await findLegacyCafeByEan(rawEan);
}

export async function createOrGetPendingCafeFromScan(rawEan, userId = null) {
  const normalizedEan = normalizeEan(rawEan);

  if (!normalizedEan) {
    throw new Error('EAN inválido');
  }

  const ref = doc(db, CAFES_COLLECTION, normalizedEan);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      tx.set(ref, {
        ean: normalizedEan,
        normalizedEan,
        name: '',
        roaster: '',
        origin: '',
        process: '',
        variety: '',
        notes: '',
        imageUrl: '',
        status: 'pending',
        completionStatus: 'incomplete',
        provisional: true,
        createdFrom: 'scan',
        createdBy: userId,
        updatedBy: userId,
        approvedBy: null,
        approvedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });

  return normalizedEan;
}

export async function getCafeById(cafeId) {
  if (!cafeId) return null;

  const ref = doc(db, CAFES_COLLECTION, cafeId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

export async function saveCafeDraft(cafeId, payload, userId = null) {
  if (!cafeId) {
    throw new Error('Falta cafeId');
  }

  const clean = sanitizeCafePayload(payload);

  if (!clean.normalizedEan) {
    throw new Error('EAN inválido');
  }

  const ref = doc(db, CAFES_COLLECTION, cafeId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error('El café no existe');
    }

    const current = snap.data();

    const merged = {
      ...current,
      ...clean,
    };

    const completionStatus = buildCompletionStatus(merged);

    tx.set(
      ref,
      {
        ...clean,
        status: 'pending',
        completionStatus,
        provisional: true,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  return cafeId;
}

export async function approveCafe(cafeId, userId = null) {
  if (!cafeId) {
    throw new Error('Falta cafeId');
  }

  const ref = doc(db, CAFES_COLLECTION, cafeId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error('El café no existe');
    }

    const data = snap.data();

    if (!canBeApproved(data)) {
      throw new Error('No se puede aprobar: faltan campos obligatorios');
    }

    tx.update(ref, {
      status: 'approved',
      completionStatus: 'complete',
      provisional: false,
      approvedBy: userId,
      approvedAt: serverTimestamp(),
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function rejectCafe(cafeId, userId = null) {
  if (!cafeId) {
    throw new Error('Falta cafeId');
  }

  const ref = doc(db, CAFES_COLLECTION, cafeId);

  await updateDoc(ref, {
    status: 'rejected',
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });
}

export async function resolveScan(rawEan, userId = null) {
  const normalizedEan = normalizeEan(rawEan);

  if (!normalizedEan) {
    throw new Error('EAN inválido');
  }

  const existing = await findAnyCafeByEan(normalizedEan);

  if (!existing) {
    const cafeId = await createOrGetPendingCafeFromScan(normalizedEan, userId);

    return {
      action: 'edit_new_pending',
      cafeId,
    };
  }

  const incomplete =
    existing.status === 'pending' &&
    (existing.completionStatus === 'incomplete' || isCafeIncomplete(existing));

  if (incomplete) {
    return {
      action: 'continue_pending',
      cafeId: existing.id,
    };
  }

  if (existing.status === 'pending') {
    return {
      action: 'view_pending',
      cafeId: existing.id,
    };
  }

  if (existing.status === 'approved') {
    return {
      action: 'view_approved',
      cafeId: existing.id,
    };
  }

  return {
    action: 'view_existing',
    cafeId: existing.id,
  };
}
