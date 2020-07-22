import React from 'react';
import {View, Text} from 'react-native';
import styled from 'styled-components/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Card = styled.View`
  justify-content: center;
  width: 70%;
  flex-flow: row wrap;
`;

const IconWrapper = styled.View`
  margin-bottom: 10px;
  justify-content: center;
  align-items: center;
  width: 30%;
`;

const ActivityCard = () => {
  return (
    <Card>
      <IconWrapper>
        <Icon name="briefcase-outline" size={60} color="#900" />
        <Text>Work</Text>
      </IconWrapper>
      <IconWrapper>
        <Icon name="school-outline" size={60} color="#900" />
        <Text>School</Text>
      </IconWrapper>
      <IconWrapper>
        <Icon name="gamepad-variant-outline" size={60} color="#900" />
        <Text>Hobbies</Text>
      </IconWrapper>
      <IconWrapper>
        <Icon name="home-outline" size={60} color="#900" />
        <Text>Family</Text>
      </IconWrapper>
      <IconWrapper>
        <Icon name="heart-outline" size={60} color="#900" />
        <Text>Relationships</Text>
      </IconWrapper>
      <IconWrapper>
        <Icon name="account-group-outline" size={60} color="#900" />
        <Text>Friends</Text>
      </IconWrapper>
      <IconWrapper>
        <Icon name="bed-outline" size={60} color="#900" />
        <Text>Sleep</Text>
      </IconWrapper>
      <IconWrapper>
        <Icon name="hospital-box-outline" size={60} color="#900" />
        <Text>Health</Text>
      </IconWrapper>
      <IconWrapper>
        <Icon name="run-fast" size={60} color="#900" />
        <Text>Exercise</Text>
      </IconWrapper>
    </Card>
  );
};

export default ActivityCard;
