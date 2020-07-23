import React from 'react';
import styled from 'styled-components/native';

const StyledButton = styled.TouchableOpacity`
  background-color: #673ab7;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  padding: 10px;
  margin: 10px;
  height: 55px;
  width: 60%;
  box-shadow: 0 2px 3px #222;
`;

const StyledText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #fff;
`;

const Button = ({onPress, title}) => {
  return (
    <StyledButton onPress={onPress}>
      <StyledText>{title}</StyledText>
    </StyledButton>
  );
};

export default Button;
