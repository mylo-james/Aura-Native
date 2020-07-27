import React, {useState, useEffect} from 'react';
import styled from 'styled-components/native';
import {Alert, Linking} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {backendURL} from '../../config';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MoodItemWrapper = styled.View`
  position: relative;
  width: 100%;
  height: 80px;
  flex-flow: row;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 20px;
`;

const MoodImage = styled.Image`
  position: absolute;
  flex: 1;
  padding: 10px;
  top: 2px;
  right: 30px;
  width: 75px;
  height: 75px;
  overflow: visible;
  resize-mode: contain;
  box-shadow: 2px 3px 4px #000;
  z-index: 0;
`;

const MoodTextView = styled.TouchableOpacity`
  height: 100%;
  width: 70%;
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
  justify-content: space-between;
  background-color: #454f8a;
  padding: 10px 20px 20px 20px;
`;

const MoodText = styled.Text`
  color: white;
  font-size: 16px;
  height: 50%;
`;
const MoodDate = styled.Text`
  color: white;
  font-size: 12px;
  text-align: right;
  height: 20%;
`;
const MoodHeader = styled.Text`
  color: white;
  font-weight: 900;
  font-size: 20px;
  height: 50%;
`;
const MoodHeaderInput = styled.TextInput`
  color: white;
  border: #9e9e9e 1px;
  border-radius: 5px;
  width: 80%;
  font-size: 20px;
  margin: 10px auto;
  padding: 5px;
`;
const MoodTextInput = styled.TextInput`
  color: white;
  height: 60%;
  width: 80%;
  border: #9e9e9e 1px;
  border-radius: 5px;
  font-size: 20px;
  padding: 5px;
  margin: 10px auto;
`;

const IconWrapper = styled.TouchableOpacity`
  width: 50px;
  height: 50px;
  position: absolute;
  right: 15px;
  top: 20px;
  z-index: 5;
`;

const MoodItem = ({user, mood}) => {
  const navigation = useNavigation();
  const [Emoji, setEmoji] = useState();
  const [formattedDate, setFormattedDate] = useState();

  useEffect(() => {
    if (!mood.level) {
      console.log('here');
      mood = {
        level: 3,
        title: 'Mood not set',
        created_at: new Date(),
      };
    }
    switch (mood.level) {
      case 5:
        setEmoji(<MoodImage source={require('../../Images/Emoji/5.png')} />);
        break;
      case 3:
        setEmoji(<MoodImage source={require('../../Images/Emoji/3.png')} />);
        break;
      case 2:
        setEmoji(<MoodImage source={require('../../Images/Emoji/2.png')} />);
        break;
      case 1:
        setEmoji(<MoodImage source={require('../../Images/Emoji/1.png')} />);
        break;
      default:
        setEmoji(<MoodImage source={require('../../Images/Emoji/4.png')} />);
    }

    const date = new Date(mood.created_at);
    const month = new Intl.DateTimeFormat('en-US', {month: 'short'}).format(
      date,
    );
    setFormattedDate(`${month} ${date.getDate()}`);
  }, []);

  const messageUser = () => {
    const number = `1${user.phoneNumber.split('-').join('')}`;
    console.log(number);
    Linking.openURL(`sms:${number}`);
  };

  return (
    <MoodItemWrapper>
      <MoodTextView>
        <IconWrapper>
          <Icon
            onPress={messageUser}
            name="message-outline"
            size={35}
            color="#fff"
          />
        </IconWrapper>
        <MoodHeader numberOfLines={1}>{user.name}</MoodHeader>
        <MoodText numberOfLines={4}>{mood.title}</MoodText>
        {/* <MoodDate numberOfLines={1}>{formattedDate}</MoodDate> */}
      </MoodTextView>
      {Emoji}
    </MoodItemWrapper>
  );
};

export default MoodItem;
