import React, {useState, useEffect} from 'react';

import styled from 'styled-components';
import Range from './Range';

const MoodWrapper = styled.View`
  position: absolute;
  background-color: #fff;
  padding: 20px;
  bottom: 0;
  border-radius: 10px;
  height: 80%;
  width: 100%;
  box-shadow: 0 2px 3px #222;
`;
const Mood = () => {
  const [comp, setComp] = useState();
  useEffect(() => {
    setComp(<Range setComp={setComp} />);
  }, []);

  return <MoodWrapper>{comp}</MoodWrapper>;
};

export default Mood;
