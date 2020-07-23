import React from 'react';
import styled from 'styled-components/native';

const StyledButton = styled.TouchableOpacity`
  background-color: #454f8a;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  padding: 10px;
  margin: 10px;
  height: 55px;
  width: 60%;
`;

const StyledText = styled.Text`
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 2px;
  color: white;
`;

const Button = ({onPress, title}) => {
  return (
    <StyledButton onPress={onPress}>
      <StyledText>{title}</StyledText>
    </StyledButton>
  );
};

export default Button;
