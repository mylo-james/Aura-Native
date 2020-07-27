import React, {useContext, useState, useEffect} from 'react';

import styled from 'styled-components';
import {CircleContext, UserContext} from '../../context';
import {backendURL} from '../../config';
import Friend from './Friend';
import Empty from './Empty';
import formatNumber from '../formatNumber';
import {Alert} from 'react-native';

const FeedWrapper = styled.View`
  position: absolute;
  background-color: #fff;
  padding: 20px;
  padding-bottom: 89px;
  bottom: 0;
  border-radius: 10px;
  height: 80%;
  width: 100%;
  box-shadow: 0 2px 3px #222;
  align-items: center;
`;

const StyledFlatList = styled.FlatList`
  width: 111%;
`;

const SearchView = styled.View`
  flex-flow: row;
  justify-content: space-around;
  align-items: center;
  height: 60px;
  margin-bottom: 20px;
`;

const SearchInput = styled.TextInput`
  border: #9e9e9e 1px;
  border-radius: 5px;
  font-size: 20px;
  padding: 5px;
  flex: 2;
  height: 40px;
  margin: 0px 7%;
  background-color: #dfdfdf;
`;

const SearchButton = styled.TouchableOpacity`
  flex: 1;
  background-color: #454f8a;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  padding: 10px;
  height: 40px;
  width: 60%;
`;

const FindText = styled.Text``;

const SearchText = styled.Text`
  color: white;
  font-weight: 700;
`;

const Feed = () => {
  const [data, setData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [numberInput, setNumberInput] = useState(null);
  const {currentUserId} = useContext(UserContext);

  useEffect(() => {
    (async () => {
      await getData(0);
      setLoaded(true);
    })();
  }, []);

  const getData = async () => {
    setRefreshing(true);
    const res = await fetch(`${backendURL}/follow/user/${currentUserId}`);
    if (!res.ok) {
      const error = await res.json();
      setRefreshing(false);
      console.error(error);
      return;
    } else {
      const {moods} = await res.json();

      setRefreshing(false);

      setData([...moods]);
    }
  };

  const renderItem = (mood) => (
    <Friend
      data={data}
      length={data.length}
      setData={setData}
      mood={mood.item.mood}
      user={mood.item.user}
    />
  );

  const handleUpdate = (text) => {
    const format = formatNumber(text);
    setNumberInput(format);
  };

  const search = async () => {
    if (!numberInput) return;
    setRefreshing(true);
    const body = {
      phoneNumber: numberInput,
      currentUserId,
    };
    const res = await fetch(`${backendURL}/follow`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json();
      setRefreshing(false);
      Alert.alert(error.error);
      return;
    } else {
      const {message} = await res.json();
      setRefreshing(false);
      Alert.alert(message, 'Friend was added');
      getData();
    }
  };

  return (
    <FeedWrapper>
      <FindText>Add a friend by phone number...</FindText>
      <SearchView>
        <SearchInput value={numberInput} onChangeText={handleUpdate} />
        <SearchButton onPress={search}>
          <SearchText>Search</SearchText>
        </SearchButton>
      </SearchView>
      {loaded ? (
        <StyledFlatList
          contentContainerStyle={{
            width: '100%',
          }}
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => `moodid-${index}`}
          ListEmptyComponent={<Empty />}
          refreshing={refreshing}
        />
      ) : null}
    </FeedWrapper>
  );
};

export default Feed;
