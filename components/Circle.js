import React, {useContext} from 'react';
import styled from 'styled-components/native';
import {CircleContext} from '../context';

const CircleWrapper = styled.View`
  flex: 1;
  align-items: center;
  width: 100%;
  top: 0;
  margin: 20px auto;
`;

const CircleImg = styled.Image`
  flex: 7;
  width: 50%;
  height: 100%;
  border-radius: 200px;
  margin-bottom: 50px;
`;

const CircleTextWrapper = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const CircleText = styled.Text`
  font-size: 22px;
`;
const Circle = (props) => {
  const {circleText} = useContext(CircleContext);
  return (
    <CircleWrapper>
      <CircleImg source={require('../Images/circle.png')} />
      <CircleTextWrapper className="circleText">
        {circleText.map((line, i) => {
          return <CircleText key={`circleTheme-${i}`}>{line}</CircleText>;
        })}
      </CircleTextWrapper>
    </CircleWrapper>
  );
};

export default Circle;
