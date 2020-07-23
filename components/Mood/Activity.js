import React, {useEffect, useContext} from 'react';
import {Button, View} from 'react-native';
import styled from 'styled-components';
import {CircleContext, UserContext, MoodContext} from '../../context';
import StyledButton from '../StyledButton';
import Range from './Range';
import Journal from './Journal';
import ActivityCard from './ActivityCard';

const ActivityWrapper = styled.View`
  flex: 2;
  z-index: 3;
  justify-content: space-evenly;
  align-items: center;
  padding-bottom: 75px;
`;

const ButtonWrapper = styled.View`
  align-items: center;
  width: 100%;
`;

const Activity = ({setComp}) => {
  const {setCircleText} = useContext(CircleContext);
  const {currentUserName} = useContext(UserContext);
  const {mood} = useContext(MoodContext);

  useEffect(() => {
    const MoodText = ['so terrible', 'not good', 'fine', 'good', 'so great'];
    setCircleText(['What makes you feel', `${MoodText[mood.mood - 1]} today?`]);
  }, [mood.mood, currentUserName, setCircleText]);
  return (
    <ActivityWrapper>
      <ActivityCard />
      <ButtonWrapper>
        <StyledButton
          onPress={() => {
            setComp(<Journal setComp={setComp} />);
          }}
          title="Continue"
        />
        <StyledButton
          onPress={() => {
            setComp(<Range setComp={setComp} />);
          }}
          title="Back"
        />
      </ButtonWrapper>
    </ActivityWrapper>
  );
};

export default Activity;
