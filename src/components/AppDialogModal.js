import { Modal, Text, TouchableOpacity, View } from 'react-native';

export default function AppDialogModal({ visible, onClose, title, description, actions = [] }) {
  const safeActions = actions.length > 0 ? actions : [{ label: 'Cerrar', onPress: onClose }];
  const isNeutralLabel = (label) => /(^|\s)(cancelar|cerrar|volver|atras|atrás)(\s|$)/i.test(String(label || '').trim().toLowerCase());
  const orderedActions = [
    ...safeActions.filter((a) => !isNeutralLabel(a?.label)),
    ...safeActions.filter((a) => isNeutralLabel(a?.label)),
  ];
  const compactActions = orderedActions.length >= 3;
  const hasExplicitPrimary = orderedActions.some((a) => a.variant === 'primary');

  const getTone = (action, idx) => {
    const variant = action?.variant;
    const label = String(action?.label || '').trim().toLowerCase();
    if (variant === 'danger') return 'danger';
    if (variant === 'neutral' || variant === 'cancel') return 'neutral';
    if (isNeutralLabel(label)) return 'neutral';
    if (variant === 'primary') return 'primary';
    if (hasExplicitPrimary) return 'secondary';
    return idx === 0 ? 'primary' : 'secondary';
  };

  const toneStyles = {
    primary: { backgroundColor: '#8f5e3b', borderColor: '#b38766', textColor: '#fff' },
    secondary: { backgroundColor: '#3a271b', borderColor: '#6f4c36', textColor: '#f6e8d8' },
    neutral: { backgroundColor: '#f6ede3', borderColor: '#d5bfa9', textColor: '#5f3f2d' },
    danger: { backgroundColor: '#7a2d25', borderColor: '#9e3e35', textColor: '#fff' },
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(16, 10, 7, 0.62)', justifyContent: 'center', padding: 20 }}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} activeOpacity={1} onPress={onClose} />
        <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, backgroundColor: '#1f140f', borderWidth: 1, borderColor: '#4e3426', padding: compactActions ? 16 : 18, gap: 12 }}>
          <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -48, top: -70, backgroundColor: 'rgba(209, 139, 74, 0.2)' }} />
          <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, left: -28, bottom: -30, backgroundColor: 'rgba(255, 233, 210, 0.08)' }} />

          <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: '#d4a574' }}>ETIOVE SETTINGS</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff8f0' }}>{title}</Text>
          {!!description && <Text style={{ fontSize: 13, lineHeight: compactActions ? 18 : 20, color: '#f4dfc8' }}>{description}</Text>}

          <View
            style={{
              marginTop: 4,
              flexDirection: compactActions ? 'row' : 'column',
              flexWrap: compactActions ? 'wrap' : 'nowrap',
              justifyContent: compactActions ? 'space-between' : 'flex-start',
              gap: 8,
            }}
          >
            {orderedActions.map((action, idx) => (
              (() => {
                const tone = getTone(action, idx);
                const colors = toneStyles[tone];
                return (
              <TouchableOpacity
                key={`${action.label}-${idx}`}
                onPress={() => {
                  onClose?.();
                  action.onPress?.();
                }}
                style={{
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  width: compactActions
                    ? (orderedActions.length % 2 === 1 && idx === orderedActions.length - 1 ? '100%' : '48.5%')
                    : '100%',
                  borderColor: colors.borderColor,
                  backgroundColor: colors.backgroundColor,
                }}
              >
                <Text style={{ color: colors.textColor, fontSize: 13, fontWeight: '800' }}>{action.label}</Text>
              </TouchableOpacity>
                );
              })()
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}