import React from 'react';
import {SafeAreaView} from 'react-native';
import styled from 'styled-components/native';
import Circle from './Circle';
import Register from './Register/Register';

const AuthWrapper = styled.View`
  width: 100%;
  height: 100%;
`;

const Auth = () => {
  return (
    <SafeAreaView>
      <AuthWrapper>
        <Circle />
        <Register />
      </AuthWrapper>
    </SafeAreaView>
  );
};

export default Auth;
