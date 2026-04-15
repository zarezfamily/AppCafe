import { Platform } from 'react-native';
import { PREMIUM_PLANS } from './premium';

let configuredUserId = null;
let configured = false;
let purchasesModule = undefined;
const REVENUECAT_TEST_API_KEY = 'test_cSzLKDiWVBSZqtHxscEKhRLkqRA';

const PLAN_PRODUCT_IDS = {
  monthly: [
    PREMIUM_PLANS.monthly.appleId,
    PREMIUM_PLANS.monthly.googleId,
    PREMIUM_PLANS.monthly.id,
  ],
  lifetime: [
    PREMIUM_PLANS.lifetime.appleId,
    PREMIUM_PLANS.lifetime.googleId,
    PREMIUM_PLANS.lifetime.id,
  ],
};

function getRevenueCatApiKey() {
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || REVENUECAT_TEST_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || REVENUECAT_TEST_API_KEY,
    default: '',
  });
}

function getPurchasesModule() {
  if (purchasesModule !== undefined) return purchasesModule;
  try {
    const module = require('react-native-purchases');
    purchasesModule = module?.default || module;
  } catch {
    purchasesModule = null;
  }
  return purchasesModule;
}

function getAllPackageCandidates(offerings) {
  const current = offerings?.current;
  if (!current) return [];

  const directPackages = [
    current.monthly,
    current.annual,
    current.lifetime,
    current.weekly,
    current.twoMonth,
    current.sixMonth,
    current.threeMonth,
  ].filter(Boolean);

  const availablePackages = Array.isArray(current.availablePackages)
    ? current.availablePackages
    : [];
  return [...directPackages, ...availablePackages].filter(Boolean);
}

function getExpirationDate(customerInfo, plan) {
  if (plan !== 'monthly') return null;

  const entitlementExpirations = Object.values(customerInfo?.entitlements?.active || {})
    .map((entitlement) => entitlement?.expirationDate)
    .filter(Boolean)
    .sort()
    .reverse();

  if (entitlementExpirations.length > 0) return entitlementExpirations[0];

  const subscriptionExpirations = Object.values(customerInfo?.allExpirationDates || {})
    .filter(Boolean)
    .sort()
    .reverse();

  return subscriptionExpirations[0] || null;
}

export function isRevenueCatConfigured() {
  return !!getRevenueCatApiKey() && !!getPurchasesModule();
}

export function isRevenueCatCancellation(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return code.includes('PURCHASE_CANCELLED') || message.includes('cancel');
}

export async function configureRevenueCat(userId) {
  const Purchases = getPurchasesModule();
  const apiKey = getRevenueCatApiKey();
  if (!Purchases || !apiKey || !userId) return false;

  if (Purchases.LOG_LEVEL?.VERBOSE && typeof Purchases.setLogLevel === 'function') {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE);
  }

  if (!configured) {
    Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
    configuredUserId = userId;
    return true;
  }

  if (configuredUserId !== userId && typeof Purchases.logIn === 'function') {
    await Purchases.logIn(userId);
    configuredUserId = userId;
  }

  return true;
}

export function getPremiumStatusFromCustomerInfo(customerInfo) {
  if (!customerInfo) return null;

  const purchasedProductIds = new Set([
    ...(customerInfo.activeSubscriptions || []),
    ...(customerInfo.allPurchasedProductIdentifiers || []),
    ...Object.values(customerInfo.entitlements?.active || {})
      .map((entitlement) => entitlement?.productIdentifier)
      .filter(Boolean),
  ]);

  const hasLifetime = PLAN_PRODUCT_IDS.lifetime.some((id) => purchasedProductIds.has(id));
  if (hasLifetime) {
    return {
      plan: 'lifetime',
      expiresAt: null,
      transactionId: customerInfo.originalAppUserId || 'revenuecat',
      productId:
        PLAN_PRODUCT_IDS.lifetime.find((id) => purchasedProductIds.has(id)) ||
        PREMIUM_PLANS.lifetime.id,
      source: 'revenuecat',
    };
  }

  const hasMonthly = PLAN_PRODUCT_IDS.monthly.some((id) => purchasedProductIds.has(id));
  if (hasMonthly) {
    return {
      plan: 'monthly',
      expiresAt: getExpirationDate(customerInfo, 'monthly'),
      transactionId: customerInfo.originalAppUserId || 'revenuecat',
      productId:
        PLAN_PRODUCT_IDS.monthly.find((id) => purchasedProductIds.has(id)) ||
        PREMIUM_PLANS.monthly.id,
      source: 'revenuecat',
    };
  }

  return null;
}

export async function getCurrentPremiumPurchase() {
  const Purchases = getPurchasesModule();
  if (!Purchases) return null;
  const customerInfo = await Purchases.getCustomerInfo();
  return getPremiumStatusFromCustomerInfo(customerInfo);
}

export async function purchasePremiumPlan(plan) {
  const Purchases = getPurchasesModule();
  if (!Purchases) throw new Error('revenuecat_native_unavailable');
  const offerings = await Purchases.getOfferings();
  const packages = getAllPackageCandidates(offerings);
  const productIds = new Set(PLAN_PRODUCT_IDS[plan] || []);
  const selectedPackage = packages.find((pkg) => {
    const productIdentifier = pkg?.product?.identifier || pkg?.product?.productIdentifier;
    return productIds.has(productIdentifier);
  });

  if (!selectedPackage) {
    throw new Error(`No RevenueCat package found for plan: ${plan}`);
  }

  const purchaseResult = await Purchases.purchasePackage(selectedPackage);
  const summary = getPremiumStatusFromCustomerInfo(purchaseResult?.customerInfo);
  return {
    ...(summary || { plan }),
    productId:
      purchaseResult?.productIdentifier ||
      selectedPackage?.product?.identifier ||
      selectedPackage?.product?.productIdentifier,
  };
}

export async function restorePremiumPurchases() {
  const Purchases = getPurchasesModule();
  if (!Purchases) throw new Error('revenuecat_native_unavailable');
  const customerInfo = await Purchases.restorePurchases();
  return getPremiumStatusFromCustomerInfo(customerInfo);
}
