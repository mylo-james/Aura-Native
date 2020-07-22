import React, {useContext} from 'react';
import {Text} from 'react-native';
import styled from 'styled-components/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {MoodContext} from '../../context';

const Card = styled.View`
  justify-content: center;
  width: 70%;
  flex-flow: row wrap;
  background-color: #900;
  border-radius: 10px;
  padding: 20px;
`;

const IconWrapper = styled.TouchableOpacity`
  margin: 2%;
  justify-content: center;
  align-items: center;
  width: 28%;
  border-radius: 10px;
`;

const style = {
  selected: {
    backgroundColor: '#fff',
    color: '#900',
  },
  notSelected: {
    backgroundColor: 'transparent',
    color: '#fff',
  },
};

const ActivityCard = () => {
  const {mood, setMood} = useContext(MoodContext);

  const handlePress = (num) => {
    const oldSet = new Set(mood.act);
    if (oldSet.has(num)) {
      oldSet.delete(num);
    } else {
      oldSet.add(num);
    }
    setMood({...mood, act: [...oldSet]});
  };
  return (
    <Card>
      <IconWrapper
        style={mood.act.includes(1) ? style.selected : style.notSelected}
        onPress={() => {
          handlePress(1);
        }}>
        <Icon
          name="briefcase-outline"
          size={50}
          color={mood.act.includes(1) ? '#900' : '#fff'}
        />
        <Text style={mood.act.includes(1) ? style.selected : style.notSelected}>
          Work
        </Text>
      </IconWrapper>
      <IconWrapper
        style={mood.act.includes(2) ? style.selected : style.notSelected}
        onPress={() => {
          handlePress(2);
        }}>
        <Icon
          name="school-outline"
          size={50}
          color={mood.act.includes(2) ? '#900' : '#fff'}
        />
        <Text style={mood.act.includes(2) ? style.selected : style.notSelected}>
          School
        </Text>
      </IconWrapper>
      <IconWrapper
        style={mood.act.includes(3) ? style.selected : style.notSelected}
        onPress={() => {
          handlePress(3);
        }}>
        <Icon
          name="gamepad-variant-outline"
          size={50}
          color={mood.act.includes(3) ? '#900' : '#fff'}
        />
        <Text style={mood.act.includes(3) ? style.selected : style.notSelected}>
          Hobbies
        </Text>
      </IconWrapper>
      <IconWrapper
        style={mood.act.includes(4) ? style.selected : style.notSelected}
        onPress={() => {
          handlePress(4);
        }}>
        <Icon
          name="home-outline"
          size={50}
          color={mood.act.includes(4) ? '#900' : '#fff'}
        />
        <Text style={mood.act.includes(4) ? style.selected : style.notSelected}>
          Family
        </Text>
      </IconWrapper>
      <IconWrapper
        style={mood.act.includes(5) ? style.selected : style.notSelected}
        onPress={() => {
          handlePress(5);
        }}>
        <Icon
          name="heart-outline"
          size={50}
          color={mood.act.includes(5) ? '#900' : '#fff'}
        />
        <Text style={mood.act.includes(5) ? style.selected : style.notSelected}>
          Love
        </Text>
      </IconWrapper>
      <IconWrapper
        style={mood.act.includes(6) ? style.selected : style.notSelected}
        onPress={() => {
          handlePress(6);
        }}>
        <Icon
          name="account-group-outline"
          size={50}
          color={mood.act.includes(6) ? '#900' : '#fff'}
        />
        <Text style={mood.act.includes(6) ? style.selected : style.notSelected}>
          Friends
        </Text>
      </IconWrapper>
      <IconWrapper
        style={mood.act.includes(7) ? style.selected : style.notSelected}
        onPress={() => {
          handlePress(7);
        }}>
        <Icon
          name="bed-outline"
          size={50}
          color={mood.act.includes(7) ? '#900' : '#fff'}
        />
        <Text style={mood.act.includes(7) ? style.selected : style.notSelected}>
          Sleep
        </Text>
      </IconWrapper>
      <IconWrapper
        style={mood.act.includes(8) ? style.selected : style.notSelected}
        onPress={() => {
          handlePress(8);
        }}>
        <Icon
          name="hospital-box-outline"
          size={50}
          color={mood.act.includes(8) ? '#900' : '#fff'}
        />
        <Text style={mood.act.includes(8) ? style.selected : style.notSelected}>
          Health
        </Text>
      </IconWrapper>
      <IconWrapper
        style={mood.act.includes(9) ? style.selected : style.notSelected}
        onPress={() => {
          handlePress(9);
        }}>
        <Icon
          name="run-fast"
          size={50}
          color={mood.act.includes(9) ? '#900' : '#fff'}
        />
        <Text style={mood.act.includes(9) ? style.selected : style.notSelected}>
          Exercise
        </Text>
      </IconWrapper>
    </Card>
  );
};

export default ActivityCard;
