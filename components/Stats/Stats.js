import React from 'react';
import {Text, SafeAreaView} from 'react-native';
import styled from 'styled-components';

const StatsWrapper = styled.View`
  height: 100%;
  width: 100%;
  z-index: 3;
`;
const Stats = () => {
  return (
    <StatsWrapper>
      <SafeAreaView>
        <Text>Stats</Text>
      </SafeAreaView>
    </StatsWrapper>
  );
};

export default Stats;
