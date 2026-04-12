import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { PREMIUM_ACCENT } from '../constants/theme';
import { PAISES } from '../core/paises';
import { profilePickStyles as pick } from './profileScreenStyles';

export default function PaisPicklist({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = PAISES.find((pais) => pais.value === value) || PAISES[0];

  return (
    <>
      <TouchableOpacity style={pick.trigger} onPress={() => setOpen(true)}>
        <Text style={pick.triggerText}>{selected.label}</Text>
        <Ionicons name="chevron-down" size={18} color="#777" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={pick.overlay}>
          <View style={pick.sheet}>
            <View style={pick.sheetHeader}>
              <Text style={pick.sheetTitle}>Selecciona tu país</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {PAISES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[pick.item, item.value === value && pick.itemActive]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={pick.itemText}>{item.label}</Text>
                  {item.value === value && <Ionicons name="checkmark" size={20} color={PREMIUM_ACCENT} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
