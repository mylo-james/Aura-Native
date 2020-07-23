import React from 'react';
import {Text, SafeAreaView} from 'react-native';
import styled from 'styled-components';

const AccountWrapper = styled.View`
  position: absolute;
  background-color: #fff;
  padding: 20px;
  bottom: 0;
  border-radius: 10px;
  height: 80%;
  width: 100%;
  box-shadow: 0 2px 3px #222;
`;
const Account = () => {
  return (
    <AccountWrapper>
      <SafeAreaView>
        <Text>Account</Text>
      </SafeAreaView>
    </AccountWrapper>
  );
};

export default Account;
