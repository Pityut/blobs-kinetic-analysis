export function euclideanDistance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

export function groupBy(array, key) {
  return array.reduce((result, currentValue) => {
    const k = currentValue[key];
    if (!result[k]) result[k] = [];
    result[k].push(currentValue);
    return result;
  }, {});
}
