import React, {useState, useEffect} from 'react';
import styled from 'styled-components/native';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {backendURL} from '../../config';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MoodItemWrapper = styled.View`
  position: relative;
  width: 97%;
  height: 150px;
  flex-flow: row;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 20px;
`;

const MoodImage = styled.Image`
  position: absolute;
  flex: 1;
  padding: 10px;
  top: 35px;
  left: 35px;
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
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;

  background-color: #454f8a;
  padding: 10px 20px 20px 20px;
`;

const MoodText = styled.Text`
  color: white;
  font-size: 16px;
  height: 60%;
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
  height: 20%;
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

const Buttons = styled.View`
  width: 90%;
  margin: auto;
  align-items: center;
  justify-content: space-around;
  flex-flow: row;
`;

const MoodButton = styled.TouchableOpacity`
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  padding: 5px;
  margin: 10px;
  height: 40px;
  width: 40%;
`;
const IconWrapper = styled.View`
  width: 100%;
  align-items: flex-end;
  justify-content: flex-end;
`;
const StyledText = styled.Text`
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 2px;
  color: white;
`;
const MoodItem = ({setData, data, length, mood}) => {
  const navigation = useNavigation();
  const [response, setResponse] = useState();
  const [Emoji, setEmoji] = useState();
  const [formattedDate, setFormattedDate] = useState();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
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

  const handleOpen = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setResponse({title: mood.title, content: mood.content});
    }
  };

  const deleteMood = async () => {
    const res = await fetch(`${backendURL}/mood/${mood.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      Alert.alert('Error', 'Server Error');
    } else {
      const newData = data.filter((dataMood) => {
        return dataMood.id !== mood.id;
      });
      Alert.alert('Deleted', 'Moment was deleted');
      setIsOpen(false);
      setData(() => newData);
    }
  };

  const putMood = async () => {
    const res = await fetch(`${backendURL}/mood/${mood.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    });
    if (!res.ok) {
      Alert.alert('Error', 'Server Error');
    } else {
      const newMood = await res.json();
      Alert.alert('Update', 'Moment was updated');
      const newData = data.map((dataMood) => {
        if (dataMood.id === mood.id) {
          return newMood;
        } else {
          return dataMood;
        }
      });
      setData(newData);
      setIsOpen(false);
    }
  };

  const style = {
    isOpen: {
      wrapper: {height: 400, justifyContent: 'center'},
      text: {whiteSpace: 'wrap', width: '100%'},
    },
    isClosed: {},
  };

  return (
    <MoodItemWrapper style={isOpen ? style.isOpen.wrapper : style.isClosed}>
      {Emoji}
      <MoodTextView
        style={isOpen ? style.isOpen.text : style.isClosed}
        onPress={handleOpen}>
        {isOpen ? (
          <>
            <IconWrapper>
              <Icon name="close-circle-outline" size={30} color="white" />
            </IconWrapper>
            <MoodHeaderInput
              onChangeText={(input) => setResponse({...response, title: input})}
              placeholder="Title"
              placeholderTextColor="#bbb"
              value={response.title}
            />
            <MoodTextInput
              onChangeText={(input) =>
                setResponse({...response, content: input})
              }
              numberOfLines={4}
              multiline={true}
              placeholder="What was you day like today?"
              placeholderTextColor="#bbb"
              value={response.content}
            />
            <Buttons>
              <MoodButton onPress={deleteMood}>
                <StyledText>Delete</StyledText>
              </MoodButton>
              <MoodButton>
                <StyledText onPress={putMood}>Save</StyledText>
              </MoodButton>
            </Buttons>
          </>
        ) : (
          <>
            <MoodHeader numberOfLines={1}>{mood.title}</MoodHeader>
            <MoodText numberOfLines={4}>{mood.content}</MoodText>
            <MoodDate numberOfLines={1}>{formattedDate}</MoodDate>
          </>
        )}
      </MoodTextView>
    </MoodItemWrapper>
  );
};

export default MoodItem;
