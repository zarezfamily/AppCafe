import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PREMIUM_ACCENT, PREMIUM_SURFACE_SOFT, THEME, H } from '../constants/theme';
import { PAISES } from '../core/paises';

export default function PaisPicklist({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = PAISES.find((p) => p.value === value) || PAISES[0];
  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>{selected.label}</Text>
        <Ionicons name="chevron-down" size={18} color={THEME.icon.inactive} />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Selecciona tu país</Text>
              <TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={24} color="#111" /></TouchableOpacity>
            </View>
            <FlatList
              data={PAISES}
              keyExtractor={(item, index) => `${item.value}_${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, item.value === value && styles.itemActive]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  <Text style={styles.itemText}>{item.label}</Text>
                  {item.value === value && <Ionicons name="checkmark" size={20} color={PREMIUM_ACCENT} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger:     { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  triggerText: { fontSize: 15, color: '#111' },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: H * 0.7 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: THEME.border.soft },
  sheetTitle:  { fontSize: 17, fontWeight: '700', color: '#111' },
  item:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  itemActive:  { backgroundColor: PREMIUM_SURFACE_SOFT },
  itemText:    { fontSize: 15, color: '#111' },
});
