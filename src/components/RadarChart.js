import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { G, Line, Polygon, Svg, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');
const size = Math.min(width, 320);
const center = size / 2;
const radius = center - 32;
const levels = 5;
const attributes = [
  { key: 'acidez', label: 'Acidez' },
  { key: 'cuerpo', label: 'Cuerpo' },
  { key: 'regusto', label: 'Regusto' },
  { key: 'dulzor', label: 'Dulzor' },
  { key: 'amargor', label: 'Amargor' },
];

function getPoints(values) {
  return attributes.map((attr, i) => {
    const angle = (2 * Math.PI * i) / attributes.length - Math.PI / 2;
    const value = Math.max(0, Math.min(1, values[attr.key] || 0));
    const r = value * radius;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  });
}

export default function RadarChart({
  cafe,
  compareCafe,
  accent = '#007aff',
  compareColor = '#ffb300',
}) {
  // Normaliza valores de 0-10 a 0-1
  const normalize = (v) => (v ? Math.max(0, Math.min(1, v / 10)) : 0);
  const values = Object.fromEntries(attributes.map((a) => [a.key, normalize(cafe[a.key])]));
  const compareValues = compareCafe
    ? Object.fromEntries(attributes.map((a) => [a.key, normalize(compareCafe[a.key])]))
    : null;

  const mainPoints = getPoints(values)
    .map((p) => p.join(','))
    .join(' ');
  const comparePoints = compareValues
    ? getPoints(compareValues)
        .map((p) => p.join(','))
        .join(' ')
    : null;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G>
          {/* Draw grid */}
          {[...Array(levels)].map((_, l) => {
            const r = radius * ((l + 1) / levels);
            const points = attributes.map((attr, i) => {
              const angle = (2 * Math.PI * i) / attributes.length - Math.PI / 2;
              return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
            });
            return (
              <Polygon
                key={l}
                points={points.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke="#e0e0e0"
                strokeWidth={1}
              />
            );
          })}
          {/* Draw axes */}
          {attributes.map((attr, i) => {
            const angle = (2 * Math.PI * i) / attributes.length - Math.PI / 2;
            return (
              <Line
                key={attr.key}
                x1={center}
                y1={center}
                x2={center + radius * Math.cos(angle)}
                y2={center + radius * Math.sin(angle)}
                stroke="#bdbdbd"
                strokeWidth={1}
              />
            );
          })}
          {/* Draw compare polygon */}
          {comparePoints && (
            <Polygon
              points={comparePoints}
              fill={compareColor + '33'}
              stroke={compareColor}
              strokeWidth={2}
            />
          )}
          {/* Draw main polygon */}
          <Polygon points={mainPoints} fill={accent + '55'} stroke={accent} strokeWidth={3} />
          {/* Draw attribute labels */}
          {attributes.map((attr, i) => {
            const angle = (2 * Math.PI * i) / attributes.length - Math.PI / 2;
            const x = center + (radius + 18) * Math.cos(angle);
            const y = center + (radius + 18) * Math.sin(angle);
            return (
              <SvgText
                key={attr.key}
                x={x}
                y={y}
                fontSize="13"
                fill="#333"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {attr.label}
              </SvgText>
            );
          })}
        </G>
      </Svg>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: accent }]} />
        <Text style={styles.legendText}>{cafe.nombre || 'Café 1'}</Text>
        {compareCafe && (
          <>
            <View style={[styles.legendDot, { backgroundColor: compareColor }]} />
            <Text style={styles.legendText}>{compareCafe.nombre || 'Café 2'}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 6,
  },
  legendText: {
    fontSize: 15,
    color: '#333',
    marginRight: 12,
  },
});
