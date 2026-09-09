import 'react-native-gesture-handler';
import {AppRegistry, Alert} from 'react-native';
import Aura from '../Aura';

// React Native Web has no built-in browser alert implementation.
Alert.alert = (title, message = '') => window.alert([title, message].filter(Boolean).join('\n'));
AppRegistry.registerComponent('Aura', () => Aura);
AppRegistry.runApplication('Aura', {rootTag: document.getElementById('root')});
