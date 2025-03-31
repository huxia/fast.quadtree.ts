import {Collection} from '../src/collection';
import {QuadTree} from '../src/QuadTree';

describe('test QuadTree functionality', () => {
  const tree = new QuadTree<undefined>({
    size: {x: 500, y: 500},
    center: {x: 500, y: 500},
  });
  test('entries\'s iteratable', () => {
    const xySet = {} as {[key: string]: boolean};
    tree.clear();
    for (let x=0; x<1000; x++) {
      tree.add({x, y: x/2}, undefined!);
      xySet[`${x},${x/2}`] = true;
    }
    expect(tree.size).toBe(1000);
    for (const {vec} of tree.queryIteratable()) {
      expect(xySet[`${vec.x},${vec.y}`]).toBe(true);
      delete xySet[`${vec.x},${vec.y}`];
    }
    expect(Object.values(xySet).length).toBe(0);
  });
  test('query', () => {
    const xySet = {} as {[key: string]: boolean};
    tree.clear();
    for (let x=0; x<1000; x++) {
      tree.add({x, y: x}, undefined!);
      xySet[`${x},${x}`] = true;
    }
    expect(tree.size).toBe(1000);
    expect(tree.querySize(
        {type: 'square', center: {x: 500, y: 500}, size: 500},
    )).toBe(1000);
    expect(tree.querySize(
        {type: 'circle', center: {x: 500, y: 500}, size: 0.5},
    )).toBe(1);
    expect(tree.querySize(
        {type: 'square', center: {x: 500, y: 500}, size: 1},
    )).toBe(3);
    expect(tree.querySize(
        {type: 'circle', center: {x: 500, y: 500}, size: 2},
    )).toBe(3);
    expect(tree.querySize(
        {type: 'square', center: {x: 500, y: 500}, size: 100},
    )).toBe(201);
    expect(tree.querySize(
        {type: 'square', center: {x: 250, y: 250}, size: 250},
    )).toBe(501);
    expect(tree.querySize(
        {type: 'rectangle',
          center: {x: 501.5, y: 501.5}, size: {x: 0.4, y: 1000}},
    )).toBe(0);
  });
  test('copyToArray & clear', () => {
    tree.clear();
    const count = 20;
    for (let x=0; x<count; x++) {
      tree.add({x, y: x/2}, undefined!);
    }
    expect(tree.queryArray().length).toBe(count);
    expect(
        tree.queryArray()
            .map((c) => `${c.vec.x},${c.vec.y}`)
            .join(';')).toBe(
        Collection.toArray(tree.queryIteratable())
            .map((c) => `${c.vec.x},${c.vec.y}`)
            .join(';'));
    tree.clear();
    expect(tree.queryArray().length).toBe(0);
  });
});
