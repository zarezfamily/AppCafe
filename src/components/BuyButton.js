import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  getBuyButtonLabel,
  getStoreIcon,
  getTaggedBuyLinks,
  openBuyLink,
  resolveBestBuyLink,
} from '../services/affiliateService';

/**
 * Primary CTA — opens the best buy link (Amazon preferred).
 */
export function BuyButton({ buyLinks, premiumAccent = '#8b6d57' }) {
  const label = getBuyButtonLabel(buyLinks);
  if (!label) return null;

  const handlePress = () => {
    const resolved = resolveBestBuyLink(buyLinks);
    if (resolved) openBuyLink(resolved);
  };

  return (
    <TouchableOpacity
      style={[s.mainBtn, { backgroundColor: label.accent }]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <Ionicons name={label.icon} size={20} color="#fff" />
      <Text style={s.mainBtnText}>{label.text}</Text>
      <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.7)" />
    </TouchableOpacity>
  );
}

/**
 * Expanded list showing all buy links (Amazon, roaster, etc.).
 */
export function BuyLinksSection({ buyLinks, premiumAccent = '#8b6d57' }) {
  const tagged = getTaggedBuyLinks(buyLinks);
  if (!tagged || tagged.length === 0) return null;

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Comprar este café</Text>
      {tagged.map((link, i) => (
        <TouchableOpacity
          key={`${link.store}-${i}`}
          style={s.linkRow}
          onPress={() => openBuyLink(link)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={getStoreIcon(link.store)}
            size={18}
            color={link.isAffiliate ? '#FF9900' : premiumAccent}
          />
          <Text style={s.linkStore}>{link.store || 'Tienda'}</Text>
          {link.isAffiliate && <Text style={s.affiliateBadge}>Afiliado</Text>}
          <Ionicons name="open-outline" size={14} color="#999" style={s.linkArrow} />
        </TouchableOpacity>
      ))}
      <Text style={s.disclaimer}>
        Al comprar a través de estos enlaces podemos recibir una pequeña comisión sin coste extra
        para ti.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    borderRadius: 14,
  },
  mainBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3b2f2f',
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  linkStore: {
    flex: 1,
    fontSize: 15,
    color: '#3b2f2f',
    fontWeight: '500',
  },
  affiliateBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF9900',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  linkArrow: {
    marginLeft: 4,
  },
  disclaimer: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    lineHeight: 15,
  },
});
