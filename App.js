import { LogBox } from 'react-native';
import AppBootstrap from './src/bootstrap/AppBootstrap';
import AppProviders from './src/providers/AppProviders';

// React 19 dev-only warning — cosmetic, does not affect functionality
// https://github.com/facebook/react/issues/29391
LogBox.ignoreLogs(['Expected static flag was missing']);

export default function App() {
  return (
    <AppProviders>
      <AppBootstrap />
    </AppProviders>
  );
}
