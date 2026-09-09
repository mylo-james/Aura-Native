import {Platform} from 'react-native';

export const backendURL = Platform.OS === 'web' ? '/api' : 'http://localhost:5051/api';
