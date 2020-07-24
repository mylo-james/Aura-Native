import React, {useContext, useState, useEffect} from 'react';
import {Text, Alert, View} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {CircleContext, UserContext} from '../../context';
import {backendURL} from '../../config';
import Email from './Email';
import StyledButton from '../StyledButton';

const PasswordWrapper = styled.View`
  flex: 2;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
`;

const PasswordText = styled.Text`
  font-size: 18px;
  color: #fff;
`;

const PasswordInput = styled.TextInput`
  background-color: white;
  border: #9e9e9e 1px;
  border-radius: 5px;
  width: 80%;
  font-size: 20px;
  margin-bottom: 0px;
  padding: 5px;
`;

const QuestionWrapper = styled.View`
  flex: 0.7;
  justify-content: space-evenly;
  align-items: center;
  width: 80%;
  background-color: #454f8a;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 3px #222;
`;

const Password = ({setComp}) => {
  const [passwordInput, setPasswordInput] = useState(null);
  const [confirmInput, setConfirmInput] = useState(null);
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
    setCircleText(['Got it! You email is:', `${currentUserEmail}`]);
  }, [currentUserEmail, setCircleText]);

  const handleUpdate = (text, input) => {
    if (input === 'password') {
      setPasswordInput(text);
    } else {
      setConfirmInput(text);
    }
  };

  const handleSubmit = async () => {
    if (!passwordInput) {
      Alert.alert('Invalid Response', 'Please provide a password.');
    } else if (!confirmInput) {
      Alert.alert('Invalid Response', 'Please confirm your password.');
    } else {
      const body = {
        name: currentUserName,
        email: currentUserEmail,
        password: passwordInput,
        confirmPassword: confirmInput,
      };
      const res = await fetch(`${backendURL}/session/register`, {
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

  const handleBack = () => {
    setComp(<Email setComp={setComp} />);
  };
  return (
    <PasswordWrapper>
      <QuestionWrapper>
        <PasswordText>Let's make a password...</PasswordText>
        <PasswordInput
          onChangeText={(text) => handleUpdate(text, 'password')}
          placeholder="Password"
        />
        <PasswordText multiline={true}>
          8 characters, 1 uppercase, 1 lowercase, 1 digit, 1 symbol.
        </PasswordText>
        <PasswordInput
          onChangeText={(text) => handleUpdate(text, 'confrim')}
          placeholder="Confirm Password"
        />
      </QuestionWrapper>
      <View
        style={{width: '100%', alignItems: 'center', justifyContent: 'center'}}>
        <StyledButton onPress={handleSubmit} title="Continue" />
        <StyledButton onPress={handleBack} title="Back" />
      </View>
    </PasswordWrapper>
  );
};

export default Password;
