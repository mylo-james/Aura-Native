import React from 'react';
import {Text, SafeAreaView} from 'react-native';
import styled from 'styled-components';

const AccountWrapper = styled.View`
  height: 100%;
  width: 100%;
  z-index: 3;
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
