import {Collection} from '../src/collection';

function* generatorFunc() {
  yield 1;
  yield 2;
  yield 3;
}
describe('test Collection.toArray', () => {
  test('generator to array', () => {
    expect(Collection.toArray(generatorFunc()).join(',')).toBe('1,2,3');
  });
});

describe('test Collection.toIterableWithFilter', () => {
  test('iterate iteratable', () => {
    const iteratable = Collection.toIterable(
        generatorFunc(),
        [4, 5, 6],
        generatorFunc,
    );
    let str = '';
    for (const o of iteratable) {
      str += o;
    }
    expect(str).toBe('123456123');
  });
  test('iteratable with filters', () => {
    const iteratable = Collection.toIterableWithFilter(
        (i) => !!(i%2),
        {index: 0},
        generatorFunc,
        () => [4, 5, 6],
        generatorFunc,
    );
    expect(Collection.toArray(iteratable).join(',')).toBe('1,3,5,1,3');
  });
});
