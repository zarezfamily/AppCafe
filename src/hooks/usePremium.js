import { useCallback, useEffect, useRef, useState } from 'react';
import { isPremiumActive, premiumDaysLeft } from '../core/premium';

export default function usePremium({ user, getDocument, setDocument }) {
  const [premiumData, setPremiumData] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState(null);
  const loadedRef = useRef(false);

  const loadPremium = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    try {
      const doc = await getDocument('premium_users', user.uid);
      setPremiumData(doc || null);
      setIsPremium(isPremiumActive(doc));
    } catch {
      setPremiumData(null);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, [getDocument, user?.uid]);

  useEffect(() => {
    if (user?.uid && !loadedRef.current) {
      loadedRef.current = true;
      loadPremium();
    }
    if (!user?.uid) {
      setPremiumData(null);
      setIsPremium(false);
      setLoading(false);
      loadedRef.current = false;
    }
  }, [loadPremium, user?.uid]);

  const activatePremium = useCallback(
    async (plan, transactionId, options = {}) => {
      if (!user?.uid) return false;
      try {
        const now = new Date();
        const expiresAt =
          options.expiresAt ||
          (plan === 'monthly'
            ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString()
            : null);

        const data = {
          uid: user.uid,
          plan,
          activatedAt: now.toISOString(),
          expiresAt: expiresAt || null,
          transactionId: transactionId || 'manual',
          provider: options.provider || 'manual',
          productId: options.productId || '',
          updatedAt: now.toISOString(),
        };

        await setDocument('premium_users', user.uid, data);
        setPremiumData(data);
        setIsPremium(true);
        return true;
      } catch {
        return false;
      }
    },
    [setDocument, user?.uid]
  );

  const requirePremium = useCallback(
    (trigger) => {
      if (isPremium) return true;
      setPaywallTrigger(trigger || null);
      setShowPaywall(true);
      return false;
    },
    [isPremium]
  );

  const closePaywall = useCallback(() => {
    setShowPaywall(false);
    setPaywallTrigger(null);
  }, []);

  const openPaywall = useCallback((trigger) => {
    setPaywallTrigger(trigger || null);
    setShowPaywall(true);
  }, []);

  const daysLeft = premiumDaysLeft(premiumData);

  return {
    isPremium,
    premiumData,
    loading,
    showPaywall,
    paywallTrigger,
    daysLeft,
    loadPremium,
    activatePremium,
    requirePremium,
    closePaywall,
    openPaywall,
  };
}
