import React from 'react';
import {Text, SafeAreaView} from 'react-native';
import styled from 'styled-components';

const ResourcesWrapper = styled.View`
  height: 100%;
  width: 100%;
  z-index: 3;
`;
const Resources = () => {
  return (
    <ResourcesWrapper>
      <SafeAreaView>
        <Text>Resources</Text>
      </SafeAreaView>
    </ResourcesWrapper>
  );
};

export default Resources;
