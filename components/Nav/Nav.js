import React from 'react';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const NavWrapper = styled.View`
  position: absolute;
  flex-direction: row;
  justify-content: space-between;
  height: 10%;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: white;
  z-index: 2;
`;

const Left = styled.View`
  width: 40%;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
`;

const Right = styled.View`
  width: 40%;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
`;

const Center = styled.View`
  position: absolute;
  justify-content: center;
  align-items: center;
  width: 75px;
  height: 75px;
  border: #262626 2px;
  border-radius: 10px;
  background-color: white;
  left: 41%;
  top: -25px;
  z-index: 3;
`;
const Nav = () => {
  const navigation = useNavigation();
  const feedIcon = (
    <Icon
      onPress={() => {
        navigation.navigate('Feed');
      }}
      name="view-list"
      size={30}
      color="#900"
    />
  );
  const resourcesIcon = (
    <Icon
      onPress={() => {
        navigation.navigate('Resources');
      }}
      name="newspaper"
      size={30}
      color="#900"
    />
  );
  const statsIcon = (
    <Icon
      onPress={() => {
        navigation.navigate('Stats');
      }}
      name="chart-areaspline-variant"
      size={30}
      color="#900"
    />
  );
  const accountIcon = (
    <Icon
      onPress={() => {
        navigation.navigate('Account');
      }}
      name="account-box"
      size={30}
      color="#900"
    />
  );
  const journalIcon = (
    <Icon
      onPress={() => {
        navigation.navigate('Mood');
      }}
      name="pencil-plus"
      size={30}
      color="#900"
    />
  );
  return (
    <NavWrapper>
      <Left>
        {feedIcon}
        {statsIcon}
      </Left>
      <Center>{journalIcon}</Center>
      <Right>
        {resourcesIcon}
        {accountIcon}
      </Right>
    </NavWrapper>
  );
};

export default Nav;
