import React, {useState, useEffect} from 'react';
import styled from 'styled-components/native';
import {Text, Button} from 'react-native';
import Name from './Name';
import Login from './Login';
import StyledButton from '../StyledButton';

const RegisterWrapper = styled.View`
  position: absolute;
  justify-content: space-around;
  align-items: center;
  background-color: #fff;
  padding: 20px;
  padding-top: 50px;
  bottom: 0;
  border-radius: 10px;
  height: 80%;
  width: 100%;
  box-shadow: 0 2px 3px #222;
`;

const Header = styled.Text`
  color: #673ab7;
  font-size: 25px;
`;

const SwitchWrapper = styled.View`
  align-items: center;
  justify-content: flex-end;
  flex: 0.3;
  width: 100%;
`;

const Register = (props) => {
  const [comp, setComp] = useState();
  const [register, setRegister] = useState(true);
  useEffect(() => {
    setComp(<Name setComp={setComp} />);
  }, [setComp]);
  return (
    <RegisterWrapper>
      <Header>Welcome to Aura</Header>
      <Header>Your Daily Mood Tracker</Header>
      {comp}

      {register ? (
        <SwitchWrapper>
          <Text>I already have an account</Text>
          <StyledButton
            onPress={() => {
              setRegister(false);
              setComp(<Login setComp={setComp} />);
            }}
            title="Login"
          />
        </SwitchWrapper>
      ) : (
        <SwitchWrapper>
          <Text>I don't have an account</Text>
          <StyledButton
            onPress={() => {
              setRegister(true);
              setComp(<Name setComp={setComp} />);
            }}
            title="Register"
          />
        </SwitchWrapper>
      )}
    </RegisterWrapper>
  );
};

export default Register;
