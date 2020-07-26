import React, {useContext, useState, useEffect} from 'react';
import {Alert} from 'react-native';
import styled from 'styled-components/native';
import {CircleContext, UserContext} from '../../context';
import Number from './Number';
import StyledButton from '../StyledButton';

const NameWrapper = styled.View`
  flex: 2;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
`;

const NameText = styled.Text`
  font-size: 18px;
  color: #fff;
`;

const NameInput = styled.TextInput`
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

const Name = ({setComp}) => {
  const [input, setInput] = useState();

  const {setCircleText} = useContext(CircleContext);
  const {currentUserName, setCurrentUserName} = useContext(UserContext);

  useEffect(() => {
    setInput(currentUserName);
    setCircleText(['Please register', 'to continue.']);
  }, [currentUserName, setCircleText]);

  const handleUpdate = (text) => {
    setInput(text);
  };

  const handleContinue = () => {
    if (!input) {
      Alert.alert('Invalid Response', 'Please provide a name.');
    } else {
      setCurrentUserName(input);
      setComp(<Number setComp={setComp} />);
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
      <StyledButton onPress={handleContinue} title="Continue" />
    </NameWrapper>
  );
};

export default Name;
