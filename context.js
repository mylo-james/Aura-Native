import {createContext} from 'react';

export const UserContext = createContext({
  currentUserId: '',
  updateCurrentUser: () => {},
});

export const ThemeContext = createContext({});
export const CircleContext = createContext({});
export const MoodContext = createContext({});
