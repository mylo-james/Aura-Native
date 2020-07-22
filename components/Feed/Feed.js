import React from 'react';
import {Text, SafeAreaView} from 'react-native';
import styled from 'styled-components';

const FeedWrapper = styled.View`
  height: 100%;
  width: 100%;
  z-index: 3;
`;
const Feed = () => {
  return (
    <FeedWrapper>
      <SafeAreaView>
        <Text>Feed</Text>
      </SafeAreaView>
    </FeedWrapper>
  );
};

export default Feed;
