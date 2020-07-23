import React, {useEffect, useState, useContext} from 'react';
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
  border-radius: 300px;
  align-items: center;
  background-color: #454f8a;
  width: 70%;
`;

const EmojiText = styled.Text`
  color: white;
  font-size: 20px;
`;

const EmojiImage = styled.Image`
  width: 60%;
  height: 60%;
  border-radius: 300px;
  resize-mode: contain;
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
  const [Emoji, setEmoji] = useState();

  const MoodText = [
    "I'm feeling terrible.",
    "I'm not happy.",
    "I'm fine.",
    "I'm good!",
    "I'm great!",
  ];

  useEffect(() => {
    setCircleText([`Nice to see you ${currentUserName}`, 'How are you today?']);
    switch (mood.mood) {
      case 5:
        setEmoji(<EmojiImage source={require('../../Images/Emoji/5.png')} />);
        break;
      case 3:
        setEmoji(<EmojiImage source={require('../../Images/Emoji/3.png')} />);
        break;
      case 2:
        setEmoji(<EmojiImage source={require('../../Images/Emoji/2.png')} />);
        break;
      case 1:
        setEmoji(<EmojiImage source={require('../../Images/Emoji/1.png')} />);
        break;
      default:
        setEmoji(<EmojiImage source={require('../../Images/Emoji/4.png')} />);
    }
  }, [currentUserName, mood.mood]);

  return (
    <RangeWrapper>
      <EmojiWrapper>
        {Emoji}
        <EmojiText>{MoodText[mood.mood - 1]}</EmojiText>
      </EmojiWrapper>
      <Slider
        style={style.range}
        minimumValue={1}
        maximumValue={5}
        value={mood.mood}
        onValueChange={(value) => {
          setMood({...mood, mood: Math.floor(value)});
        }}
        minimumTrackTintColor="#454f8a"
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
