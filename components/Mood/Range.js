import React, {useEffect, useContext} from 'react';
import {Text, Button} from 'react-native';
import styled from 'styled-components';
import {CircleContext, UserContext, MoodContext} from '../../context';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import StyledButton from '../StyledButton';
import Activity from './Activity';

const RangeWrapper = styled.View`
  flex: 1;
  width: 100%;
  justify-content: space-evenly;
  align-items: center;
  padding-bottom: 100px;
`;

const EmojiWrapper = styled.View`
  flex: 0.65;
  padding: 20px;
  justify-content: space-evenly;
  border-radius: 10px;
  align-items: center;
  background-color: #673ab7;
  width: 70%;
  box-shadow: 0 2px 3px #222;
`;

const EmojiText = styled.Text`
  color: white;
  font-size: 25px;
`;

const style = {
  range: {
    width: '60%',
    height: '20%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,

    elevation: 5,
  },
};
const Range = ({setComp}) => {
  const {setCircleText} = useContext(CircleContext);
  const {currentUserName} = useContext(UserContext);
  const {mood, setMood} = useContext(MoodContext);
  const Emoji = [
    <Icon name="emoticon-cry-outline" size={150} color="#fff" />,
    <Icon name="emoticon-sad-outline" size={150} color="#fff" />,
    <Icon name="emoticon-neutral-outline" size={150} color="#fff" />,
    <Icon name="emoticon-happy-outline" size={150} color="#fff" />,
    <Icon name="emoticon-excited-outline" size={150} color="#fff" />,
  ];

  const MoodText = ['Terrible', 'Not Good', 'Fine', 'Good', 'Great'];

  useEffect(() => {
    setCircleText([`Nice to see you ${currentUserName}`, 'How are you today?']);
  }, [currentUserName, setCircleText]);
  return (
    <RangeWrapper>
      <EmojiWrapper>
        {Emoji[mood.mood - 1]}
        <EmojiText>{MoodText[mood.mood - 1]}</EmojiText>
      </EmojiWrapper>
      <Slider
        style={style.range}
        minimumValue={1}
        maximumValue={5}
        step={1}
        value={mood.mood}
        onValueChange={(value) => {
          setMood({...mood, mood: value});
        }}
        minimumTrackTintColor="#673AB7"
        maximumTrackTintColor="#fff"
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
