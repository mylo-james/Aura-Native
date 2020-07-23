import React from 'react';
import {SafeAreaView} from 'react-native';
import styled from 'styled-components/native';
import Circle from './Circle';
import Register from './Register/Register';
import TopNav from './Nav/TopNav';

const AuthWrapper = styled.View`
  position: relative;
  flex: 1;
  width: 100%;
`;

const Auth = () => {
  return (
    <AuthWrapper>
      <TopNav />
      <Register />
    </AuthWrapper>
  );
};

export default Auth;
