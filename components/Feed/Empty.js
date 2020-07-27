import React from 'react';
import styled from 'styled-components/native';
import StyledButton from '../StyledButton';
import {useNavigation} from '@react-navigation/native';
import MoodItem from './Friend';

const EmptyWrapper = styled.View`
  height: 100%;
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

  return (
    <EmptyWrapper>
      <MoonImage source={require('../../Images/Emoji/2.png')} />
      <EmptyText>No friends yet...</EmptyText>
      <EmptyText>Add one by phone number!</EmptyText>
    </EmptyWrapper>
  );
};

export default Empty;
