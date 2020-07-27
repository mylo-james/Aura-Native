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

const ResourceScroll = styled.ScrollView`
  padding-top: 20px;
`;

const ResourceText = styled.Text`
  margin-bottom: 10px;
  font-size: 15px;
`;

const ResourceHeader = styled.Text`
  font-size: 20px;
  margin-bottom: 5px;
`;

const ResourceListItem = styled.Text`
  font-size: 15px;
  text-align: justify;
  padding: 0 10px 0 20px;
  margin-bottom: 20px;
`;
const Resources = () => {
  return (
    <ResourcesWrapper>
      <ResourceText>Have an emergency?: Dial 911</ResourceText>
      <ResourceText>
        Suicide Prevention Hotline:{' '}
        <Link url="tel:+18002738255" title="1-800-237-TALK" />
      </ResourceText>
      <ResourceText>
        Resources from{' '}
        <Link
          url={'https://www.mhanational.org/'}
          title="Mental Health America"
        />{' '}
      </ResourceText>
      <ResourceScroll>
        <ResourceHeader>Sadness Or Something More?</ResourceHeader>
        <ResourceListItem>
          Take a{' '}
          <Link
            url="https://screening.mhanational.org/screening-tools/depression?ref=KaiserPermanente"
            title="depression screen"
          />
          .
        </ResourceListItem>
        <ResourceHeader>Basic Facts about Depression</ResourceHeader>
        <ResourceListItem>
          Major depression is one of the most common mental illnesses, affecting
          6.7% (more than 16 million) of American adults each year.
        </ResourceListItem>
        <ResourceListItem>
          Depression causes people to lose pleasure from daily life, can
          complicate other medical conditions, and can even be serious enough to
          lead to suicide.
        </ResourceListItem>
        <ResourceListItem>
          Depression can occur to anyone, at any age, and to people of any race
          or ethnic group. Depression is never a "normal" part of life, no
          matter what your age, gender or health situation. While the majority
          of individuals with depression have a full remission of the disorder
          with effective treatment, only about a third (35.3%) of those
          suffering from severe depression seek treatment from a mental health
          professional.
        </ResourceListItem>
        <ResourceListItem>
          Too many people resist treatment because they believe depression isn't
          serious, that they can treat it themselves or that it is a personal
          weakness rather than a serious medical illness.
        </ResourceListItem>
      </ResourceScroll>
    </ResourcesWrapper>
  );
};

export default Resources;
