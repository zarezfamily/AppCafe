import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';

export default function CommunityModalActions({
  s,
  onCancel,
  onSubmit,
  cancelLabel = 'Cancelar',
  submitLabel,
  loading,
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
        paddingBottom: Platform.OS === 'ios' ? 8 : 14,
      }}
    >
      <TouchableOpacity style={[s.authSecondaryBtn, { flex: 1, marginTop: 0 }]} onPress={onCancel}>
        <Text style={s.authSecondaryBtnText}>{cancelLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.redBtn, { flex: 1, marginTop: 0 }]}
        onPress={onSubmit}
        disabled={!!loading}
      >
        {!!loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.redBtnText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
