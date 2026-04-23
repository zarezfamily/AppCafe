/**
 * useOfflineSync
 *
 * Registers a sync handler with NetworkContext so that the pending action
 * queue is processed automatically whenever the app goes back online.
 *
 * Supported queue action types:
 *   - add_tasting     → addDocument('diario_catas', payload)
 *   - toggle_favorite → update push_subscriptions (allFavs) via setDocument
 *   - add_cafe        → addDocument('cafes', payload)
 *   - delete_cafe     → deleteDocument('cafes', cafeId)
 */
import { useEffect, useRef } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { processSyncQueue } from '../core/syncQueue';
import { syncPendingCatas } from '../core/offlineCatas';

export default function useOfflineSync({
  user,
  addDocument,
  deleteDocument,
  setDocument,
  cargarCatas,
}) {
  const { registerSyncHandler, unregisterSyncHandler } = useNetwork();

  // Keep latest service refs so the handler always uses current values
  // without needing to re-register on every render.
  const servicesRef = useRef({});
  useEffect(() => {
    servicesRef.current = { user, addDocument, deleteDocument, setDocument, cargarCatas };
  });

  useEffect(() => {
    const handler = async () => {
      const {
        user: u,
        addDocument: add,
        deleteDocument: del,
        setDocument: set,
        cargarCatas: reload,
      } = servicesRef.current;

      if (!u?.uid) return;

      // 1. Sync legacy offlineCatas (CataFormModal path)
      try {
        await syncPendingCatas(async (cata) => {
          await add('diario_catas', {
            uid: u.uid,
            cafeNombre: cata.cafeNombre,
            cafeId: cata.cafeId || '',
            fechaHora: cata.fechaHora,
            metodoPreparacion: cata.metodoPreparacion,
            dosis: Number(cata.dosis) || 0,
            agua: Number(cata.agua) || 0,
            temperatura: Number(cata.temperatura) || 0,
            tiempoExtraccion: Number(cata.tiempoExtraccion) || 0,
            puntuacion: cata.puntuacion,
            notas: cata.notas,
            foto: cata.foto || '',
            contexto: cata.contexto,
            createdAt: new Date().toISOString(),
          });
        });
      } catch {}

      // 2. Process generic syncQueue actions
      await processSyncQueue({
        add_tasting: async (payload) => {
          await add('diario_catas', payload);
        },
        toggle_favorite: async (payload) => {
          if (!payload?.uid) return;
          // allFavs is the full array after the optimistic toggle
          await set('push_subscriptions', payload.uid, {
            uid: payload.uid,
            favoriteCafeIds: Array.isArray(payload.allFavs) ? payload.allFavs : [],
            updatedAt: new Date().toISOString(),
          });
        },
        add_cafe: async (payload) => {
          await add('cafes', payload);
        },
        delete_cafe: async (payload) => {
          await del('cafes', payload.cafeId);
        },
      });

      // 3. Reload catas so the UI reflects synced data
      try {
        await reload();
      } catch {}
    };

    registerSyncHandler(handler);
    return () => unregisterSyncHandler(handler);
  }, [registerSyncHandler, unregisterSyncHandler]);
}
