import React, {useContext} from 'react';
import styled from 'styled-components/native';
import StyledButton from '../StyledButton';
import {useNavigation} from '@react-navigation/native';
import {CircleContext, UserContext} from '../../context';
import MoodItem from './MoodItem';

const EmptyWrapper = styled.View`
  margin-top: 125px;
  justify-content: center;
  align-items: center;
`;

const MoonImage = styled.Image`
  width: 50%;
  height: 50%;
  resize-mode: contain;
  margin-bottom: 10px;
`;

const EmptyText = styled.Text`
  margin: 20px;
  font-size: 20px;
  color: #454f8a;
  font-weight: 700;
`;
const Empty = () => {
  const navigation = useNavigation();
  const {setCircleText} = useContext(CircleContext);
  const {currentUserName} = useContext(UserContext);

  return (
    <EmptyWrapper>
      <MoonImage source={require('../../Images/Emoji/2.png')} />
      <EmptyText>No moments...</EmptyText>
      <EmptyText>Let's record one!</EmptyText>
      <StyledButton
        onPress={() => {
          setCircleText([
            `Nice to see you, ${currentUserName}`,
            'How are you today?',
          ]);
          navigation.navigate('Mood');
        }}
        title={'How are you today?'}
      />
    </EmptyWrapper>
  );
};

export default Empty;
