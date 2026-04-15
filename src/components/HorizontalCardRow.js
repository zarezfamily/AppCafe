import { ScrollView, Text } from 'react-native';
import { SkeletonHorizontalRow } from './SkeletonLoader';

export default function HorizontalCardRow({ s, loading, items, renderItem, emptyText }) {
  if (loading) {
    return <SkeletonHorizontalRow />;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}
    >
      {items.map(renderItem)}
      {items.length === 0 && !!emptyText && (
        <Text style={[s.empty, { marginLeft: 0 }]}>{emptyText}</Text>
      )}
    </ScrollView>
  );
}
