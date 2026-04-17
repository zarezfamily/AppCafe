import { ScrollView, Text, View } from 'react-native';
import { SkeletonHorizontalRow } from './SkeletonLoader';

export default function HorizontalCardRow({
  s,
  loading,
  items = [],
  renderItem,
  emptyText,
  header,
  subheader,
  contentContainerStyle,
}) {
  if (loading) {
    return <SkeletonHorizontalRow />;
  }

  const hasItems = Array.isArray(items) && items.length > 0;

  return (
    <View style={{ marginTop: 8 }}>
      {!!header && (
        <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '800',
              color: '#24160f',
            }}
          >
            {header}
          </Text>

          {!!subheader && (
            <Text
              style={{
                marginTop: 4,
                fontSize: 12,
                lineHeight: 18,
                color: '#7e6959',
              }}
            >
              {subheader}
            </Text>
          )}
        </View>
      )}

      {hasItems ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="start"
          contentContainerStyle={[
            {
              paddingLeft: 16,
              paddingRight: 12,
              gap: 14,
            },
            contentContainerStyle,
          ]}
        >
          {items.map(renderItem)}
        </ScrollView>
      ) : (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 2,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#eadbce',
            backgroundColor: '#faf7f2',
            padding: 14,
          }}
        >
          <Text style={s?.empty || { color: '#7e6959' }}>
            {emptyText || 'No hay elementos para mostrar todavía.'}
          </Text>
        </View>
      )}
    </View>
  );
}
