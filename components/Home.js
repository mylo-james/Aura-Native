import React, {useEffect, useState} from 'react';
import {Text, SafeAreaView} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';

const Home = ({navigation}) => {
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('aura_token');
      if (!token) {
        navigation.navigate('Auth');
      }
    })();
  }, [navigation]);

  return (
    <SafeAreaView>
      <Text>Home</Text>
    </SafeAreaView>
  );
};

export default Home;
