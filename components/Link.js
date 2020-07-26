import React from 'react';
import {Linking} from 'react-native';
import styled from 'styled-components';

const LinkTitle = styled.Text`
  text-decoration: underline;
  color: blue;
`;

const Link = ({url, title}) => {
  return (
    <LinkTitle
      onPress={() => {
        Linking.openURL(url);
      }}>
      {title}
    </LinkTitle>
  );
};

export default Link;
