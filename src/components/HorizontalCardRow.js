import { ActivityIndicator, ScrollView, Text } from 'react-native';

export default function HorizontalCardRow({
  s,
  loading,
  loadingColor,
  loadingMargin = 30,
  items,
  renderItem,
  emptyText,
}) {
  if (loading) {
    return <ActivityIndicator color={loadingColor} style={{ margin: loadingMargin }} />;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
      {items.map(renderItem)}
      {items.length === 0 && !!emptyText && <Text style={[s.empty, { marginLeft: 0 }]}>{emptyText}</Text>}
    </ScrollView>
  );
}
