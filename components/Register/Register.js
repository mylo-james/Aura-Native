import React, {useState, useEffect} from 'react';
import styled from 'styled-components/native';
import {Text, Button} from 'react-native';
import Name from './Name';
import Login from './Login';

const RegisterWrapper = styled.View`
  flex: 2;
  width: 70%;
  justify-content: space-evenly;
  align-items: center;
  margin: auto;
  margin-top: 20px;
`;

const SwitchWrapper = styled.View`
  flex: 1;
`;

const Register = (props) => {
  const [comp, setComp] = useState();
  const [register, setRegister] = useState(true);
  useEffect(() => {
    setComp(<Name setComp={setComp} />);
  }, [setComp]);
  return (
    <RegisterWrapper>
      {comp}

      {register ? (
        <SwitchWrapper>
          <Text>I already have an account</Text>
          <Button
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
          <Button
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
