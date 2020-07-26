import React, {useContext} from 'react';
import styled from 'styled-components/native';
import {SafeAreaView} from 'react-native';
import {CircleContext} from '../context';

const CircleWrapper = styled.SafeAreaView`
  flex-flow: row;
  height: 20%;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  top: 0;
`;

const CircleImg = styled.Image`
  flex: 1;
  width: 30%;
  height: 70%;
  border-radius: 200px;
  margin-bottom: 20px;
  margin-left: 30px;
  resize-mode: contain;
`;

const CircleTextWrapper = styled.View`
  flex: 2;
  padding-left: 25px;
  padding-right: 10px;
`;

const CircleText = styled.Text`
  font-size: 22px;
  color: #fff;
`;
const Circle = (props) => {
  const {circleText} = useContext(CircleContext);
  return (
    <CircleWrapper>
      <CircleImg source={require('../Images/Emoji/6.png')} />
      <CircleTextWrapper className="circleText">
        {circleText.map((line, i) => {
          return <CircleText key={`circleTheme-${i}`}>{line}</CircleText>;
        })}
      </CircleTextWrapper>
    </CircleWrapper>
  );
};

export default Circle;
