import React, {useEffect, useContext} from 'react';
import {Button, View} from 'react-native';
import styled from 'styled-components';
import {CircleContext, UserContext, MoodContext} from '../../context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Range from './Range';
import ActivityCard from './ActivityCard';

const ActivityWrapper = styled.View`
  flex: 2;
  width: 100%;
  z-index: 3;
  justify-content: space-evenly;
  align-items: center;
  padding-bottom: 75px;
`;

const Activity = ({setComp}) => {
  const {setCircleText} = useContext(CircleContext);
  const {currentUserName} = useContext(UserContext);
  const {mood, setMood} = useContext(MoodContext);

  const Emoji = [
    <Icon name="emoticon-cry-outline" size={200} color="#900" />,
    <Icon name="emoticon-sad-outline" size={200} color="#900" />,
    <Icon name="emoticon-neutral-outline" size={200} color="#900" />,
    <Icon name="emoticon-happy-outline" size={200} color="#900" />,
    <Icon name="emoticon-excited-outline" size={200} color="#900" />,
  ];
  useEffect(() => {
    const MoodText = ['so terrible', 'not good', 'fine', 'so good', 'so great'];
    setCircleText([`What makes today ${MoodText[mood.mood - 1]}?`]);
  }, [mood.mood, currentUserName, setCircleText]);
  return (
    <ActivityWrapper>
      <ActivityCard />
      <View>
        <Button
          onPress={() => {
            setComp(<Activity setComp={setComp} />);
          }}
          title="Continue"
        />
        <Button
          onPress={() => {
            setComp(<Range setComp={setComp} />);
          }}
          title="Back"
        />
      </View>
    </ActivityWrapper>
  );
};

export default Activity;
