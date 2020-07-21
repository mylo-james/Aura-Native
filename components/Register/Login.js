import React, {useContext, useState, useEffect} from 'react';
import {Text, Alert, View} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {CircleContext, UserContext} from '../../context';
import {backendURL} from '../../config';
import Email from './Email';

const LoginWrapper = styled.View`
  flex: 2;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
`;

const LoginText = styled.Text`
  font-size: 20px;
  margin-top: 20px;
`;

const LoginInput = styled.TextInput`
  margin-top: 20px;
  font-size: 20px;
  border-bottom-color: #dfdfdf;
  border-bottom-width: 1px;
  margin-bottom: 5px;
`;

const LoginButton = styled.Button`
  font-size: 40px;
`;

const QuestionWrapper = styled.View`
  width: 100%;
`;

const Login = ({setComp}) => {
  const [emailInput, setEmailInput] = useState(null);
  const [passwordInput, setPasswordInput] = useState(null);
  const navigation = useNavigation();
  const {setCircleText} = useContext(CircleContext);
  const {
    setCurrentUserId,
    setCurrentUserName,
    setCurrentUserEmail,
    currentUserName,
    currentUserEmail,
  } = useContext(UserContext);

  useEffect(() => {
    setCircleText(['Nice to see you again!']);
  }, [currentUserEmail, setCircleText]);

  const handleUpdate = (text, input) => {
    if (input === 'email') {
      setEmailInput(text.toLowerCase());
    } else {
      setPasswordInput(text);
    }
  };

  const handleSubmit = async () => {
    if (!emailInput) {
      Alert.alert('Invalid Response', 'Please provide an Email.');
    } else if (!passwordInput) {
      Alert.alert('Invalid Response', 'Please confirm your Login.');
    } else {
      const body = {
        email: emailInput,
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
      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email);
      setCurrentUserName(user.name);
      await AsyncStorage.setItem('aura_token', JSON.stringify(access_token));
      navigation.navigate('Home');
    }
  };

  return (
    <LoginWrapper>
      <QuestionWrapper>
        <LoginText>Please Log In</LoginText>
        <LoginInput
          onChangeText={(text) => handleUpdate(text, 'email')}
          placeholder="Email"
        />
        <LoginInput
          onChangeText={(text) => handleUpdate(text, 'password')}
          placeholder="Password"
        />
      </QuestionWrapper>
      <View>
        <LoginButton onPress={handleSubmit} title="Continue" />
      </View>
    </LoginWrapper>
  );
};

export default Login;
