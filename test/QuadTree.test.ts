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
      tree.add({x, y: x/2});
      xySet[`${x},${x/2}`] = true;
    }
    expect(tree.size).toBe(1000);
    for (const {vec} of tree.queryIteratable()) {
      expect(xySet[`${vec.x},${vec.y}`]).toBe(true);
      delete xySet[`${vec.x},${vec.y}`];
    }
    expect(Object.values(xySet).length).toBe(0);
  });
  test('copyToArray & clear', () => {
    tree.clear();
    const count = 20;
    for (let x=0; x<count; x++) {
      tree.add({x, y: x/2});
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
