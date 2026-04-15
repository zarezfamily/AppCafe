import { Text, TextInput } from 'react-native';

export function CommunityTitleField({
  s,
  value,
  onChangeText,
  marginTop = 4,
  placeholder = 'Máximo 120 caracteres',
}) {
  return (
    <>
      <Text style={[s.label, { marginTop }]}>Título</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={(nextValue) => onChangeText(nextValue.slice(0, 120))}
        placeholder={placeholder}
        placeholderTextColor="#b3a9a0"
      />
    </>
  );
}

export function CommunityBodyField({ s, value, onChangeText, marginTop = -6, placeholder }) {
  return (
    <>
      <Text style={[s.label, { marginTop }]}>Contenido</Text>
      <TextInput
        style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={(nextValue) => onChangeText(nextValue.slice(0, 1000))}
        placeholder={placeholder}
        placeholderTextColor="#b3a9a0"
        multiline
      />
    </>
  );
}

export function CommunityCountText({ s, titleLength, bodyLength, showTitleLength = true }) {
  return (
    <Text style={s.forumCountText}>
      {showTitleLength ? `${titleLength}/120 · ` : ''}
      {bodyLength}/1000
    </Text>
  );
}
