import React, {useContext} from 'react';
import {useNavigation} from '@react-navigation/native';
import {CircleContext, UserContext} from '../../context';
import styled from 'styled-components/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const NavWrapper = styled.View`
  position: absolute;
  flex-direction: row;
  justify-content: space-between;
  height: 10%;
  padding-bottom: 10px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #454f8a;
  z-index: 2;
  box-shadow: 0 2px 3px #222;
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
  width: 65px;
  height: 65px;
  border-radius: 50px;
  background-color: #9e9e9e;
  left: 43%;
  top: -15px;
  z-index: 3;
  box-shadow: 0 2px 3px #222;
`;
const Nav = () => {
  const {setCircleText} = useContext(CircleContext);
  const {currentUserName} = useContext(UserContext);
  const navigation = useNavigation();
  const feedIcon = (
    <Icon
      onPress={() => {
        setCircleText(["Let's checkup on your friends."]);
        navigation.navigate('Feed');
      }}
      name="view-list"
      size={30}
      color="#fff"
    />
  );
  const resourcesIcon = (
    <Icon
      onPress={() => {
        setCircleText(['Here are some resources that could help.']);
        navigation.navigate('Resources');
      }}
      name="newspaper"
      size={30}
      color="#fff"
    />
  );
  const statsIcon = (
    <Icon
      onPress={() => {
        setCircleText(["Here are some statistics we've collected."]);
        navigation.navigate('Stats');
      }}
      name="chart-areaspline-variant"
      size={30}
      color="#fff"
    />
  );
  const accountIcon = (
    <Icon
      onPress={() => {
        setCircleText(["Here are your past moments we've collected."]);
        navigation.navigate('Account');
      }}
      name="account-box"
      size={30}
      color="#fff"
    />
  );
  const journalIcon = (
    <Icon
      onPress={() => {
        setCircleText([
          `Nice to see you, ${currentUserName}`,
          'How are you today?',
        ]);
        navigation.navigate('Mood');
      }}
      name="plus"
      size={30}
      color="#fff"
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
