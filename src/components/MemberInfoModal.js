import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { XP_RULES } from '../core/gamification';

export default function MemberInfoModal({ visible, onClose }) {
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(16, 10, 7, 0.62)', justifyContent: 'center', padding: 20 }}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} activeOpacity={1} onPress={onClose} />
        <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, backgroundColor: '#1f140f', borderWidth: 1, borderColor: '#4e3426', padding: 18, gap: 12 }}>
          <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -48, top: -70, backgroundColor: 'rgba(209, 139, 74, 0.2)' }} />
          <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, left: -28, bottom: -30, backgroundColor: 'rgba(255, 233, 210, 0.08)' }} />
          <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: '#d4a574' }}>ETIOVE MEMBER GUIDE</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff8f0' }}>Cómo sube tu Member Roast Card</Text>

          <View style={{ gap: 8, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf8f5', borderRadius: 10, borderWidth: 1, borderColor: '#e8dcc8', paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1f140f' }}>Votos</Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#8f5e3b' }}>+{XP_RULES.vote} XP</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf8f5', borderRadius: 10, borderWidth: 1, borderColor: '#e8dcc8', paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1f140f' }}>Fotos</Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#8f5e3b' }}>+{XP_RULES.photo} XP</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf8f5', borderRadius: 10, borderWidth: 1, borderColor: '#e8dcc8', paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1f140f' }}>Reseñas</Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#8f5e3b' }}>+{XP_RULES.review} XP</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf8f5', borderRadius: 10, borderWidth: 1, borderColor: '#e8dcc8', paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1f140f' }}>Cafés añadidos</Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#8f5e3b' }}>+{XP_RULES.addCafe} XP</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf8f5', borderRadius: 10, borderWidth: 1, borderColor: '#e8dcc8', paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1f140f' }}>Favoritos</Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#8f5e3b' }}>+{XP_RULES.favorite} XP</Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, lineHeight: 18, color: '#f4dfc8', marginTop: 2 }}>Ahora mismo los posts y respuestas del foro no suman XP todavía.</Text>

          <TouchableOpacity style={{ marginTop: 2, borderRadius: 12, backgroundColor: '#8f5e3b', borderWidth: 1, borderColor: '#b38766', paddingVertical: 10, alignItems: 'center' }} onPress={onClose}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
