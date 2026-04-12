import { useEffect, useState } from 'react';

import {
  configureRevenueCat,
  getCurrentPremiumPurchase,
  isRevenueCatCancellation,
  isRevenueCatConfigured,
  purchasePremiumPlan,
  restorePremiumPurchases,
} from '../core/purchases';

export default function useMainScreenPremium({
  user,
  premium,
  showDialog,
}) {
  const [purchasesReady, setPurchasesReady] = useState(false);
  const [purchasingPlan, setPurchasingPlan] = useState('');
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const initRevenueCat = async () => {
      if (!user?.uid || !isRevenueCatConfigured()) {
        if (!cancelled) setPurchasesReady(false);
        return;
      }

      try {
        const ready = await configureRevenueCat(user.uid);
        if (cancelled) return;
        setPurchasesReady(ready);

        const currentPurchase = await getCurrentPremiumPurchase();
        if (cancelled || !currentPurchase?.plan) return;

        await premium.activatePremium(currentPurchase.plan, currentPurchase.transactionId, {
          expiresAt: currentPurchase.expiresAt,
          provider: currentPurchase.source,
          productId: currentPurchase.productId,
        });
      } catch (error) {
        if (!cancelled) {
          setPurchasesReady(false);
          console.warn('[RevenueCat] Init error:', error?.message || error);
        }
      }
    };

    initRevenueCat();

    return () => {
      cancelled = true;
    };
  }, [premium, user?.uid]);

  const handlePremiumPurchase = async (plan) => {
    if (!purchasesReady) {
      showDialog('Compras no disponibles', 'Configura las claves públicas de RevenueCat para esta plataforma y vuelve a intentarlo.');
      return;
    }

    setPurchasingPlan(plan);
    try {
      const purchase = await purchasePremiumPlan(plan);
      if (!purchase?.plan) throw new Error('premium_purchase_not_found');

      const activated = await premium.activatePremium(purchase.plan, purchase.transactionId, {
        expiresAt: purchase.expiresAt,
        provider: purchase.source,
        productId: purchase.productId,
      });

      if (!activated) throw new Error('premium_firestore_sync_failed');

      premium.closePaywall();
      showDialog(
        'Premium activado',
        purchase.plan === 'lifetime'
          ? 'Tu plan de por vida ya está activo.'
          : 'Tu suscripción Premium ya está activa.'
      );
    } catch (error) {
      if (!isRevenueCatCancellation(error)) {
        showDialog('No se pudo completar la compra', 'La compra no se completó o no se pudo sincronizar con tu cuenta.');
      }
    } finally {
      setPurchasingPlan('');
    }
  };

  const handleRestorePurchases = async () => {
    if (!purchasesReady) {
      showDialog('Compras no disponibles', 'Configura las claves públicas de RevenueCat para esta plataforma y vuelve a intentarlo.');
      return;
    }

    setRestoringPurchases(true);
    try {
      const restoredPurchase = await restorePremiumPurchases();
      if (!restoredPurchase?.plan) {
        showDialog('Sin compras para restaurar', 'No encontramos compras Premium asociadas a tu cuenta de App Store o Google Play.');
        return;
      }

      const activated = await premium.activatePremium(restoredPurchase.plan, restoredPurchase.transactionId, {
        expiresAt: restoredPurchase.expiresAt,
        provider: restoredPurchase.source,
        productId: restoredPurchase.productId,
      });

      if (!activated) throw new Error('premium_restore_sync_failed');

      premium.closePaywall();
      showDialog(
        'Compras restauradas',
        restoredPurchase.plan === 'lifetime'
          ? 'Hemos restaurado tu plan Premium de por vida.'
          : 'Hemos restaurado tu suscripción Premium.'
      );
    } catch (error) {
      if (!isRevenueCatCancellation(error)) {
        showDialog('No se pudieron restaurar tus compras', 'Inténtalo de nuevo más tarde.');
      }
    } finally {
      setRestoringPurchases(false);
    }
  };

  return {
    purchasesReady,
    purchasingPlan,
    restoringPurchases,
    handlePremiumPurchase,
    handleRestorePurchases,
  };
}
