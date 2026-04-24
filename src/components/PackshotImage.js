import { Image, View } from 'react-native';
import { CLEAN_COFFEE_IMAGE, getCleanCoffeePhoto } from '../core/utils';
import { shared } from '../styles/sharedStyles';

function isValidUri(uri) {
  return typeof uri === 'string' && uri.startsWith('http') && uri.length > 10;
}

export default function PackshotImage({ uri, frameStyle, imageStyle }) {
  let finalUri = getCleanCoffeePhoto(uri);
  if (!isValidUri(finalUri)) {
    finalUri = CLEAN_COFFEE_IMAGE;
  }

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
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
