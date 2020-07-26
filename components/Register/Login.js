import React, {useContext, useState, useEffect} from 'react';
import {Alert, View} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {CircleContext, UserContext} from '../../context';
import {backendURL} from '../../config';
import StyledButton from '../StyledButton';

const LoginWrapper = styled.View`
  flex: 2;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
`;

const LoginText = styled.Text`
  font-size: 18px;
  color: #fff;
`;

const LoginInput = styled.TextInput`
  background-color: white;
  border: #9e9e9e 1px;
  border-radius: 5px;
  width: 80%;
  font-size: 20px;
  margin-bottom: 10px;
  padding: 5px;
`;

const QuestionWrapper = styled.View`
  flex: 0.5;
  justify-content: space-evenly;
  align-items: center;
  width: 80%;
  background-color: #454f8a;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 3px #222;
`;

const Login = () => {
  const [numberInput, setNumberInput] = useState(null);
  const [passwordInput, setPasswordInput] = useState(null);
  const navigation = useNavigation();
  const {setCircleText} = useContext(CircleContext);
  const {
    setCurrentUserId,
    setCurrentUserName,
    setCurrentUserNumber,
    currentUserNumber,
  } = useContext(UserContext);

  useEffect(() => {
    setCircleText(['Please login to continue.']);
  }, [currentUserNumber, setCircleText]);

  const handleUpdate = (text, input) => {
    if (input === 'number') {
      setNumberInput(text.toLowerCase());
    } else {
      setPasswordInput(text);
    }
  };

  const handleSubmit = async () => {
    if (!numberInput) {
      Alert.alert('Invalid Response', 'Please provide an Number.');
    } else if (!passwordInput) {
      Alert.alert('Invalid Response', 'Please confirm your Login.');
    } else {
      const body = {
        phoneNumber: numberInput,
        password: passwordInput,
      };
      const res = await fetch(`${backendURL}/session/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const {error} = await res.json();
        Alert.alert('Invalid Response', error);
        return;
      }
      const {access_token, user} = await res.json();
      await setCurrentUserId(user.id);
      await setCurrentUserNumber(user.number);
      await setCurrentUserName(user.name);
      await AsyncStorage.setItem('aura_token', JSON.stringify(access_token));
      setCircleText([`Nice to see you, ${user.name}`, 'How are you today?']);
      navigation.navigate('Home');
    }
  };

  return (
    <LoginWrapper>
      <QuestionWrapper>
        <LoginText>Please Log In</LoginText>
        <LoginInput
          onChangeText={(text) => handleUpdate(text, 'number')}
          placeholder="Phone Number"
        />
        <LoginInput
          secureTextEntry={true}
          onChangeText={(text) => handleUpdate(text, 'password')}
          placeholder="Password"
        />
      </QuestionWrapper>

      <StyledButton onPress={handleSubmit} title="Continue" />
    </LoginWrapper>
  );
};

export default Login;
