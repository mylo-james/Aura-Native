import React, {useState, useEffect} from 'react';

import styled from 'styled-components';
import Circle from '../Circle';
import Range from './Range';

const MoodWrapper = styled.SafeAreaView`
  height: 100%;
  width: 100%;
  z-index: 3;
`;
const Mood = () => {
  const [comp, setComp] = useState();
  useEffect(() => {
    setComp(<Range setComp={setComp} />);
  }, []);

  return (
    <MoodWrapper>
      <Circle />
      {comp}
    </MoodWrapper>
  );
};

export default Mood;
