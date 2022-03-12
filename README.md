# fast-quadtree-ts
Hyper-performent quadtree implementation for typescript/javascript.

## Note
This is a work in progress, lack of testing & docs for now. 

Checkout `dist/test.html` after clone, it demonstrate a QuadTreeSet w/ 
- 500000 entries
- 5000 entries changed each frame (move / regenerate)
- copy free query & iteration

## Key feature
1. Move operation support (prevent rebuilding)
2. Non-copy query (memory efficient)
3. Typed custom data association & multi custom data objects (e.g. game objects) at same position

## Install
```bash
yarn add fast-quadtree-ts
```

## Usage
### QuadTree<T>
The core quad tree implementation.
```typescript
import {
  QuadTree, QuadTreeSet,
  AABB, Shape,
} from 'QuadTree.ts';
import {} from './shape';
// optional custom data class
class RobotData {
  id: string,
  hp: number,
  constructor(id: string) {
    this.id = id;
    this.hp = 100;
  }
}
// create a 800*600 area quad tree
const qt = new QuadTree<RobotData>(
  {center: {x: 0, y: 0}, size: {x: 400, y: 300}}
);
// add
const wallE = new RobotData('WallE');
const eve = new RobotData('EVE');
qt.add({x: 100, y: 30}, wallE) // => true
qt.add({x: 401, y: 30}, new RobotData()) // => false, out of bounds
qt.add({x: 200, y: 49}, eve) // => true
// get size
qt.size // => 2
// move
qt.move({x: 100, y: 30}, {x: 200, y: 50}, wallE) // => true, WallE gets moved to near EVE
// check for a single position
qt.has({x: 200, y: 50}, wallE) // => true
// queries as iterable, will not create arrays for memory efficiency
for (const {vec, unit} of qt.queryIteratable(Shape.createRectangle(
  {x: 200, y: 40}, // center
  {x: 30, y: 30}, // size
))) {
  console.log(`${unit.id} is near by WallE`);
}
// remove
qt.delete({x: 200, y: 49}, eve)
```
### QuadTreeSet<T>
Implemeting **ES Set<T>** protocol w/ QuarTree, suggested for production usage.

```typescript
// create a 800*600 area QuadTreeSet, binded to Robot class
const qtSet = new QuadTreeSet<Robot>(
  {center: {x: 0, y: 0}, size: {x: 400, y: 300}},
  {
    // implement key getter, supporting multi robot at same point
    unitKeyGetter: (r: Robot) => r.id,
    // unit position getter & setters,
    unitPositionGetter: (r: Robot) => r.position,
  }
);
class Robot extends RobotData {
  _position: {x: number, y: number};
  
  constructor(id: string, newPosition: {x: number, y: number}) {
    super(id);
    this._position = newPosition;
    qtSet.add(this);
  }
  get position() {
    return this._position;
  }
  set position(newPosition: {x: number, y: number}) {
    // Note: only updating unit position after QuadTreeSet.move() returns true
    if (qtSet.move(this, newPosition)) {
      this._position = newPosition;
    }
  }
}
// create & add
const wallE = new RobotData('WallE', {x: 100, y: 30}); // added
const errorRobot = new RobotData('WallE', {x: 401, y: 30}); // will throw QuadTreePositionOutOfBoundsError
const eve = new RobotData('EVE', {x: 200, y: 49});
// move
wallE.position = {x: 200, y: 50};
// check for exists
qtSet.has(wallE); // true
// call Set<T>.forEach
qtSet.forEach((r: Robot) => console.log(r.id, r.position));
// queries & reduce, will not create arrays for memory efficiency
qt.queryReduce(
  Shape.createEllipse(
    {x: 200, y: 40}, // center
    30, // size
  ),
  (acc, {unit}) => `${acc} ${unit.id}`,
  ""
).trim(); // => "WallE EVE"

```