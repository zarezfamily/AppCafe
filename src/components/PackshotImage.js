import { Image, View } from 'react-native';
import { getCleanCoffeePhoto } from '../core/utils';
import { shared } from '../styles/sharedStyles';

export default function PackshotImage({ uri, frameStyle, imageStyle }) {
  const finalUri = getCleanCoffeePhoto(uri);

  return (
    <View style={[shared.packshotFrame, frameStyle]}>
      <View
        style={[
          shared.packshotInner,
          {
            backgroundColor: '#f4efe9', // fondo tipo café premium
          },
        ]}
      >
        <Image
          source={{ uri: finalUri }}
          style={[shared.packshotImage, imageStyle]}
          resizeMode="cover" // 🔥 CLAVE (antes era contain)
        />
      </View>
    </View>
  );
}
