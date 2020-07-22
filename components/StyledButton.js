import React from 'react';
import styled from 'styled-components/native';

const StyledButton = styled.TouchableOpacity`
  align-items: center;
  border: #900 2px;
  border-radius: 20px;
  padding: 10px;
  margin: 10px;
  width: 60%;
`;

const StyledText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #900;
`;

const Button = ({onPress, title}) => {
  return (
    <StyledButton onPress={onPress}>
      <StyledText>{title}</StyledText>
    </StyledButton>
  );
};

export default Button;
