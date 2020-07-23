import React, {useContext} from 'react';
import styled from 'styled-components/native';
import {CircleContext} from '../context';

const CircleWrapper = styled.View`
  flex-flow: row;
  height: 20%;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
  top: 0;
  margin: 20px auto;
`;

const CircleImg = styled.Image`
  width: 30%;
  height: 70%;
  border-radius: 200px;
  margin-bottom: 20px;
`;

const CircleTextWrapper = styled.View``;

const CircleText = styled.Text`
  font-size: 22px;
  color: #fff;
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
