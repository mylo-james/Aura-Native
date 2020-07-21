import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import AsyncStorage from '@react-native-community/async-storage';
import Home from './components/Home';
import Auth from './components/Auth';
import {UserContext, ThemeContext, CircleContext, MoodContext} from './context';

const Stack = createStackNavigator();

const Aura = (props) => {
  // AsyncStorage.clear();
  const [token, setToken] = useState();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(3);
  const [circleText, setCircleText] = useState([]);
  const [mood, setMood] = useState({
    mood: 3,
    activites: [],
    title: '',
    content: '',
  });

  const userContextValue = {
    currentUserId,
    setCurrentUserId,
    currentUserName,
    setCurrentUserName,
    currentUserEmail,
    setCurrentUserEmail,
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
  useEffect(() => {
    (async () => {
      const userToken = JSON.parse(await AsyncStorage.getItem('aura_token'));
      setToken(userToken);
    })();
  }, []);
  return (
    <UserContext.Provider value={userContextValue}>
      <ThemeContext.Provider value={themeContextValue}>
        <CircleContext.Provider value={circleContextValue}>
          <MoodContext.Provider value={moodContextValue}>
            <NavigationContainer>
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
