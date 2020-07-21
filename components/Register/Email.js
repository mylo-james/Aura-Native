import React, {useContext, useState, useEffect} from 'react';
import {Alert, View} from 'react-native';
import styled from 'styled-components/native';
import {CircleContext, UserContext} from '../../context';
import Name from './Name';
import Password from './Password';

const EmailWrapper = styled.View`
  flex: 2;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
`;

const EmailText = styled.Text`
  font-size: 20px;
`;

const EmailInput = styled.TextInput`
  margin-top: 20px;
  font-size: 20px;
  border-bottom-color: #dfdfdf;
  border-bottom-width: 1px;
`;

const EmailButton = styled.Button`
  font-size: 40px;
`;

const QuestionWrapper = styled.View`
  width: 100%;
`;

const Email = ({setComp}) => {
  const [input, setInput] = useState(null);

  const {setCircleText} = useContext(CircleContext);
  const {currentUserName, setCurrentUserEmail} = useContext(UserContext);

  useEffect(() => {
    setCircleText([`Nice to meet you, ${currentUserName}`]);
  }, [currentUserName, setCircleText]);

  const handleUpdate = (text) => {
    setInput(text);
  };

  const handleContinue = () => {
    if (!input) {
      Alert.alert('Invalid Response', 'Please provide an email.');
    } else {
      setCurrentUserEmail(input.toLowerCase());
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
        />
      </QuestionWrapper>
      <View>
        <EmailButton onPress={handleContinue} title="Continue" />
        <EmailButton onPress={handleBack} title="Back" />
      </View>
    </EmailWrapper>
  );
};

export default Email;
