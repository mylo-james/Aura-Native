import React, {useEffect, useContext} from 'react';
import Alert from 'react-native';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import StyledButton from '../StyledButton';
import {backendURL} from '../../config';
import {CircleContext, UserContext, MoodContext} from '../../context';
import Activity from './Activity';

const JournalWrapper = styled.View`
  flex: 2;
  justify-content: space-evenly;
  align-items: center;
  padding-bottom: 100px;
`;

const Title = styled.TextInput`
  border: #900 1px;
  border-radius: 5px;
  width: 60%;
  font-size: 20px;
  margin-bottom: 10px;
  padding: 5px;
`;
const Entry = styled.TextInput`
  flex: 2;
  width: 60%;
  border: #900 1px;
  border-radius: 5px;
  font-size: 20px;
  padding: 5px;
  margin-bottom: 20px;
`;

const Journal = ({setComp}) => {
  const {setCircleText} = useContext(CircleContext);
  const {currentUserId} = useContext(UserContext);
  const {mood} = useContext(MoodContext);
  const navigation = useNavigation();

  useEffect(() => {
    setCircleText(["Let's record this moment."]);
  }, [setCircleText]);

  const handleSubmit = async () => {
    const body = {
      currentUserId,
      level: mood.mood,
      title: mood.title,
      content: mood.content,
      actions: mood.act,
    };
    const res = await fetch(`${backendURL}/mood`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      Alert.alert('Server Error', 'Please try again.');
    } else {
      navigation.navigate('Account');
    }
  };
  const handleBack = () => {
    console.log('here');
    setComp(<Activity setComp={setComp} />);
  };
  return (
    <JournalWrapper>
      <Title placeholder="Title" />
      <Entry
        placeholder="Write about your day here..."
        multiline={true}
        numberOfLines={4}
      />
      <StyledButton title="Submit" onPress={handleSubmit} />
      <StyledButton title="Back" onPress={handleBack} />
    </JournalWrapper>
  );
};

export default Journal;
