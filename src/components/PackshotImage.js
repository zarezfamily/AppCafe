import { Image, View } from 'react-native';
import { getCleanCoffeePhoto } from '../core/utils';
import { shared } from '../styles/sharedStyles';

export default function PackshotImage({ uri, frameStyle, imageStyle }) {
  return (
    <View style={[shared.packshotFrame, frameStyle]}>
      <View style={shared.packshotInner}>
        <Image
          source={{ uri: getCleanCoffeePhoto(uri) }}
          style={[shared.packshotImage, imageStyle]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
