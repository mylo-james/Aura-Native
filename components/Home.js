import React, {useEffect, useContext} from 'react';
import styled from 'styled-components';
import AsyncStorage from '@react-native-community/async-storage';
import {createStackNavigator} from '@react-navigation/stack';
import {backendURL} from '../config';
import {UserContext, CircleContext} from '../context';
import Nav from './Nav/Nav';
import Feed from './Feed/Feed';
import Stats from './Stats/Stats';
import Mood from './Mood/Mood';
import Resources from './Resources/Resources';
import Account from './Account/Account';
import TopNav from './Nav/TopNav';

const HomeWrapper = styled.View`
  position: relative;
  flex: 1;
  width: 100%;
`;

const Home = ({navigation}) => {
  const Stack = createStackNavigator();
  const {
    setCurrentUserId,
    setCurrentUserName,
    setCurrentUserNumber,
  } = useContext(UserContext);
  const {setCircleText} = useContext(CircleContext);
  useEffect(() => {
    (async () => {
      const token = JSON.parse(await AsyncStorage.getItem('aura_token'));

      if (!token) {
        navigation.reset({
          index: 0,
          routes: [{name: 'Auth'}],
        });
      } else {
        try {
          const res = await fetch(`${backendURL}/session/check`, {
            method: 'POST',
            Authorization: token,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({access_token: token}),
          });
          if (!res.ok) {
            navigation.reset({
              index: 0,
              routes: [{name: 'Auth'}],
            });
            return;
          }

          const {user} = await res.json();
          setCurrentUserId(user.id);
          setCurrentUserName(user.name);
          setCurrentUserNumber(user.phoneNumber);
        } catch (e) {
          navigation.reset({
            index: 0,
            routes: [{name: 'Auth'}],
          });
        }
      }
    })();
  }, []);

  return (
    <HomeWrapper>
      <Nav />
      <TopNav />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: {backgroundColor: 'transparent'},
        }}>
        <Stack.Screen name="Mood" component={Mood} />
        <Stack.Screen name="Feed" component={Feed} />
        <Stack.Screen name="Stats" component={Stats} />
        <Stack.Screen name="Resources" component={Resources} />
        <Stack.Screen name="Account" component={Account} />
      </Stack.Navigator>
    </HomeWrapper>
  );
};

export default Home;
