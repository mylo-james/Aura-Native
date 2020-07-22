import React, {useEffect, useContext} from 'react';
import {Text, Button} from 'react-native';
import styled from 'styled-components';
import {CircleContext, UserContext, MoodContext} from '../../context';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import StyledButton from '../StyledButton';
import Activity from './Activity';

const RangeWrapper = styled.View`
  flex: 2;
  width: 100%;
  justify-content: space-evenly;
  align-items: center;
  padding-bottom: 100px;
`;

const style = {
  range: {
    width: '60%',
  },
};
const Range = ({setComp}) => {
  const {setCircleText} = useContext(CircleContext);
  const {currentUserName} = useContext(UserContext);
  const {mood, setMood} = useContext(MoodContext);
  const Emoji = [
    <Icon name="emoticon-cry-outline" size={150} color="#900" />,
    <Icon name="emoticon-sad-outline" size={150} color="#900" />,
    <Icon name="emoticon-neutral-outline" size={150} color="#900" />,
    <Icon name="emoticon-happy-outline" size={150} color="#900" />,
    <Icon name="emoticon-excited-outline" size={150} color="#900" />,
  ];

  const MoodText = ['Terrible', 'Not Good', 'Fine', 'Good', 'Great'];

  useEffect(() => {
    setCircleText([`Nice to see you ${currentUserName}`, 'How are you today?']);
  }, [currentUserName, setCircleText]);
  return (
    <RangeWrapper>
      {Emoji[mood.mood - 1]}
      <Text>{MoodText[mood.mood - 1]}</Text>
      <Slider
        style={style.range}
        minimumValue={1}
        maximumValue={5}
        step={1}
        value={mood.mood}
        onValueChange={(value) => {
          setMood({...mood, mood: value});
        }}
        minimumTrackTintColor="#FFFFFF"
        maximumTrackTintColor="#900"
      />
      <StyledButton
        onPress={() => {
          setComp(<Activity setComp={setComp} />);
        }}
        title="Continue"
      />
    </RangeWrapper>
  );
};

export default Range;
