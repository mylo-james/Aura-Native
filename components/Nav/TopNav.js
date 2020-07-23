import React from 'react';
import styled from 'styled-components/native';
import Circle from '../Circle';

const TopNavWrapper = styled.View`
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;

  background-color: #454f8a;
`;

const TopNav = () => {
  return (
    <TopNavWrapper>
      <Circle />
    </TopNavWrapper>
  );
};

export default TopNav;
