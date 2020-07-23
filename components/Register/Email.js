import React, {useContext, useState, useEffect} from 'react';
import {Alert, View} from 'react-native';
import styled from 'styled-components/native';
import {CircleContext, UserContext} from '../../context';
import Name from './Name';
import Password from './Password';
import StyledButton from '../StyledButton';

const EmailWrapper = styled.View`
  flex: 2;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
`;

const EmailText = styled.Text`
  font-size: 18px;
  color: #fff;
`;

const EmailInput = styled.TextInput`
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

const Email = ({setComp}) => {
  const [input, setInput] = useState(null);

  const {setCircleText} = useContext(CircleContext);
  const {currentUserName, currentUserEmail, setCurrentUserEmail} = useContext(
    UserContext,
  );

  useEffect(() => {
    setCircleText([`Nice to meet you, ${currentUserName}`]);
  }, [currentUserName, setCircleText]);

  const handleUpdate = (text) => {
    setCurrentUserEmail(text);
  };

  const handleContinue = () => {
    if (!currentUserEmail) {
      Alert.alert('Invalid Response', 'Please provide an email.');
    } else {
      setComp(<Password setComp={setComp} />);
    }
  };

  const handleBack = () => {
    setComp(<Name setComp={setComp} />);
  };
  return (
    <EmailWrapper>
      <QuestionWrapper>
        <EmailText>What's your email?</EmailText>
        <EmailInput
          onChangeText={(text) => handleUpdate(text)}
          placeholder="My email is..."
          value={currentUserEmail}
        />
      </QuestionWrapper>
      <View
        style={{width: '100%', alignItems: 'center', justifyContent: 'center'}}>
        <StyledButton onPress={handleContinue} title="Continue" />
        <StyledButton onPress={handleBack} title="Back" />
      </View>
    </EmailWrapper>
  );
};

export default Email;
