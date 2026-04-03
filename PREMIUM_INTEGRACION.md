# Cómo integrar Premium en App.js

## 1. Importar en App.js

```js
import usePremium from './src/hooks/usePremium';
import PaywallModal from './src/screens/PaywallModal';
import PremiumBadge from './src/screens/PremiumBadge';
```

## 2. Usar el hook en MainScreen

```js
const premium = usePremium({ user, getDocument, setDocument });
```

## 3. Pasar isPremium a los tabs que lo necesitan

```js
<DiarioCatasSection
  isPremium={premium.isPremium}
  onPaywallTrigger={() => premium.requirePremium('diario_limit')}
  ...
/>

<MasTab
  isPremium={premium.isPremium}
  onOpenPaywall={() => premium.openPaywall('mas_tab')}
  premiumDaysLeft={premium.daysLeft}
  ...
/>
```

## 4. Mostrar PaywallModal

```js
<PaywallModal
  visible={premium.showPaywall}
  onClose={premium.closePaywall}
  onRestore={handleRestorePurchases}
  trigger={premium.paywallTrigger}
  isPremium={premium.isPremium}
  purchasingPlan={purchasingPlan}
  restoring={restoringPurchases}
  revenueCatReady={purchasesReady}
  onPurchase={handlePremiumPurchase}
/>
```

## 5. Limitar diario de catas

En el punto donde se abre la nueva cata:

```js
import { FREE_LIMITS } from './src/core/premium';

if (!premium.isPremium && notebook.catas.length >= FREE_LIMITS.diarioCatasMax) {
  premium.requirePremium('diario_limit');
  return;
}
```

## 6. Badge Premium en foro

En los autores del foro:

```js
{thread.authorIsPremium && <PremiumBadge />}
```

## 7. Estructura Firestore

Colección: `premium_users`
Documento ID: `{uid}`

Campos:
- `plan`: `monthly` | `lifetime`
- `activatedAt`: ISO string
- `expiresAt`: ISO string | null
- `transactionId`: string
- `updatedAt`: ISO string

## 8. RevenueCat real

```bash
npx expo install react-native-purchases -- --legacy-peer-deps
```

Variables requeridas:

- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`

Importante:

- El flujo real de compra requiere una build nativa. En Expo Go queda desactivado de forma segura.
- La offering actual de RevenueCat debe incluir los productos mensual y lifetime definidos en `src/core/premium.js`.

Documentación: https://www.revenuecat.com/docs/getting-started/installation/expo
