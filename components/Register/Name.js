import React, {useContext, useState, useEffect} from 'react';
import {Alert} from 'react-native';
import styled from 'styled-components/native';
import {CircleContext, UserContext} from '../../context';
import Email from './Email';

const NameWrapper = styled.View`
  flex: 2;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
`;

const NameText = styled.Text`
  font-size: 20px;
`;

const NameInput = styled.TextInput`
  margin-top: 20px;
  font-size: 20px;
  border-bottom-color: #dfdfdf;
  border-bottom-width: 1px;
`;

const NameButton = styled.Button`
  font-size: 40px;
`;

const QuestionWrapper = styled.View`
  width: 100%;
`;

const Name = ({setComp}) => {
  const [input, setInput] = useState();

  const {setCircleText} = useContext(CircleContext);
  const {currentUserName, setCurrentUserName} = useContext(UserContext);

  useEffect(() => {
    setInput(currentUserName);
    setCircleText(['Welcome to Aura,', 'Your Daily Mood Journal.']);
  }, [currentUserName, setCircleText]);

  const handleUpdate = (text) => {
    setInput(text);
  };

  const handleContinue = () => {
    if (!input) {
      Alert.alert('Invalid Response', 'Please provide a name.');
    } else {
      setCurrentUserName(input);
      setComp(<Email setComp={setComp} />);
    }
  };
  return (
    <NameWrapper>
      <QuestionWrapper>
        <NameText>What do your friends call you?</NameText>
        <NameInput
          defaultValue={currentUserName}
          onChangeText={(text) => handleUpdate(text)}
          placeholder="My friends call me...."
        />
      </QuestionWrapper>
      <NameButton onPress={handleContinue} title="Continue" />
    </NameWrapper>
  );
};

export default Name;
