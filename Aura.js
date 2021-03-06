import React, {useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import AsyncStorage from '@react-native-community/async-storage';
import Home from './components/Home';
import Auth from './components/Auth';

import {UserContext, ThemeContext, CircleContext, MoodContext} from './context';

const Stack = createStackNavigator();

const Aura = (props) => {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const [currentUserNumber, setCurrentUserNumber] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(3);
  const [circleText, setCircleText] = useState([]);
  const [mood, setMood] = useState({
    mood: 4,
    act: [],
    title: '',
    content: '',
  });

  const userContextValue = {
    currentUserId,
    setCurrentUserId,
    currentUserName,
    setCurrentUserName,
    currentUserNumber,
    setCurrentUserNumber,
  };

  const themeContextValue = {
    currentTheme,
    setCurrentTheme,
  };

  const circleContextValue = {
    circleText,
    setCircleText,
  };

  const moodContextValue = {
    mood,
    setMood,
  };
  return (
    <UserContext.Provider value={userContextValue}>
      <ThemeContext.Provider value={themeContextValue}>
        <CircleContext.Provider value={circleContextValue}>
          <MoodContext.Provider value={moodContextValue}>
            <NavigationContainer style={{backgroundColor: 'transparent'}}>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                }}>
                <Stack.Screen name="Home" component={Home} />
                <Stack.Screen name="Auth" component={Auth} />
              </Stack.Navigator>
            </NavigationContainer>
          </MoodContext.Provider>
        </CircleContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
};

export default Aura;
