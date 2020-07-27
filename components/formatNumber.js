const formatNumber = (text) => {
  const numbers = text.split('');
  const format = numbers.map((number, i) => {
    if ((i === 3 || i === 7) && number !== '-') {
      return `-${number}`;
    } else {
      return number;
    }
  });
  return format.join('').slice(0, 12);
};

export default formatNumber;
