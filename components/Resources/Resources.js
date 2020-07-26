import React from 'react';
import {Text, ScrollView} from 'react-native';
import styled from 'styled-components';
import Link from '../Link';

const ResourcesWrapper = styled.View`
  position: absolute;
  background-color: #fff;
  padding: 20px;
  bottom: 0;
  border-radius: 10px;
  height: 80%;
  width: 100%;
  box-shadow: 0 2px 3px #222;
`;
const Resources = () => {
  return (
    <ResourcesWrapper>
      <Text>If you are experiencing an Emergency please dial 911</Text>
      <Text>
        Suicide Prevention Hotline:{' '}
        <Link url="tel:+18002738255" title="1-800-237-TALK" />
      </Text>
      <Text>
        Resources from{' '}
        <Link
          url={'https://www.mhanational.org/'}
          title="Mental Health America"
        />{' '}
      </Text>
      <ScrollView>
        <Text>Sadness Or Something More?</Text>
        <Text>
          If you're not sure if you have depression, take a{' '}
          <Link
            url="https://screening.mhanational.org/screening-tools/depression?ref=KaiserPermanente"
            title="depression screen"
          />
          .
        </Text>
        <Text>Basic Facts about Depression</Text>
        <Text>
          Major depression is one of the most common mental illnesses, affecting
          6.7% (more than 16 million) of American adults each year.[1] [2]
        </Text>
        <Text>
          Depression causes people to lose pleasure from daily life, can
          complicate other medical conditions, and can even be serious enough to
          lead to suicide.
        </Text>
        <Text>
          Depression can occur to anyone, at any age, and to people of any race
          or ethnic group. Depression is never a "normal" part of life, no
          matter what your age, gender or health situation. While the majority
          of individuals with depression have a full remission of the disorder
          with effective treatment, only about a third (35.3%) of those
          suffering from severe depression seek treatment from a mental health
          professional.
        </Text>
        <Text>
          Too many people resist treatment because they believe depression isn't
          serious, that they can treat it themselves or that it is a personal
          weakness rather than a serious medical illness.
        </Text>
      </ScrollView>
    </ResourcesWrapper>
  );
};

export default Resources;
