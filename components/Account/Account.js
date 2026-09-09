import React, {useContext, useState, useCallback, useRef} from 'react';
import styled from 'styled-components';
import AsyncStorage from '@react-native-community/async-storage';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {CircleContext, UserContext} from '../../context';
import {backendURL} from '../../config';
import MoodItem from './MoodItem';
import StyledButton from '../StyledButton';
import Empty from './Empty';

const AccountWrapper = styled.View`
  position: absolute;
  background-color: #fff;
  padding: 5px;
  padding-bottom: 89px;
  bottom: 0;
  border-radius: 10px;
  height: 80%;
  width: 100%;
  box-shadow: 0 2px 3px #222;
  align-items: center;
`;

const StyledFlatList = styled.FlatList`
  width: 100%;
`;

const Account = () => {
  const navigation = useNavigation();
  const [data, setData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const {setCircleText} = useContext(CircleContext);
  const {
    setCurrentUserId,
    setCurrentUserName,
    setCurrentUserNumber,
    currentUserId,
  } = useContext(UserContext);

  const pageOffset = useRef(0);
  const loading = useRef(false);
  const hasMore = useRef(true);

  const getData = useCallback(async (reset = false) => {
    if (!currentUserId || loading.current || (!reset && !hasMore.current)) return;
    loading.current = true;
    setRefreshing(true);
    const offset = reset ? 0 : pageOffset.current;
    try {
      const res = await fetch(`${backendURL}/mood/user/${currentUserId}/page/${offset}`);
      if (!res.ok) throw new Error('Could not load your journal.');
      const {moods} = await res.json();
      pageOffset.current = offset + moods.length;
      hasMore.current = moods.length === 3;
      setData(previous => reset ? moods : [...previous, ...moods]);
      setLoaded(true);
    } catch (error) {
      console.error(error);
    } finally {
      loading.current = false;
      setRefreshing(false);
    }
  }, [currentUserId]);

  useFocusEffect(useCallback(() => {
    getData(true);
  }, [getData]));

  const renderItem = (mood) => (
    <MoodItem
      data={data}
      length={data.length}
      setData={setData}
      mood={mood.item}
    />
  );

  const handleLogout = async () => {
    setCurrentUserNumber(null);
    setCurrentUserName(null);
    setCurrentUserId(null);
    await AsyncStorage.clear();
    navigation.reset({
      index: 0,
      routes: [{name: 'Auth'}],
    });
  };

  return (
    <AccountWrapper>
      <StyledButton onPress={handleLogout} title="Logout" />
      {loaded ? (
        <StyledFlatList
          contentContainerStyle={{
            width: '100%',
          }}
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => `moodid-${index}`}
          ListEmptyComponent={<Empty />}
          onEndReached={() => getData()}
          onRefresh={() => getData(true)}
          refreshing={refreshing}
        />
      ) : null}
    </AccountWrapper>
  );
};

export default Account;
