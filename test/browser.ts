import {QuadTreeSet} from '../src/QuadTreeSet';
import {AABB, Shape, Vec2} from '../src/shape';


const cancasAll =
  window.document.getElementById('all') as HTMLCanvasElement;
const ctxAll = cancasAll.getContext('2d')!;

const cancasQueryResult =
  window.document.getElementById('queryResult') as HTMLCanvasElement;
const ctxQueryResult = cancasQueryResult.getContext('2d')!;

class Unit {
  id: number;
  _position: Vec2;
  get position() {
    return this._position;
  }
  set position(v) {
    if (qtSet.move(this, v)) {
      this._position = v;
    } else {
      throw new Error(`failed to move ${this.id} to ${JSON.stringify(v)}, ` +
        `stays at: ${JSON.stringify(this._position)}`);
    }
  }
  constructor(id: number, position: Vec2) {
    this.id = id;
    this._position = position;
    qtSet.add(this);
  }
}

const qtSet = new QuadTreeSet<Unit>({
  size: {x: cancasAll.width / 2, y: cancasAll.height / 2},
  center: {x: cancasAll.width / 2, y: cancasAll.height / 2},
}, {
  unitKeyGetter: (_, unit) => unit!.id,
  unitPositionGetter: (u) => u.position,
});

let currentId = 0;
function generateId(): number {
  if (currentId == Number.MAX_SAFE_INTEGER) {
    currentId = 0;
    qtSet.clear();
  }
  return ++currentId;
}
function randomPosition(): Vec2 {
  return {
    x: Math.floor(Math.random() * cancasAll.width as any),
    y: Math.floor(Math.random() * cancasAll.height as any),
  };
}

const totalUnit = 500000;
const unitToMoveEachFrame = Math.floor(totalUnit * 0.005);
const unitToAddEachFrame = Math.floor(totalUnit * 0.005);

const units: (Unit|undefined)[] = [];
let lastEmptyIndex = -1;
function recordUnit(u: Unit): Unit {
  if (units.length > 1.5 * totalUnit) {
    if (lastEmptyIndex > -1 && units[lastEmptyIndex] === undefined) {
      units[lastEmptyIndex] = u;
      lastEmptyIndex = -1;
    } else {
      units[units.findIndex((uu) => uu === undefined)] = u;
    }
  } else {
    units.push(u);
  }
  return u;
}
function takeAUnit(): Unit {
  while (true) {
    const index = Math.floor(Math.random() * units.length);
    const unit = units[index];
    if (unit !== undefined) {
      units[index] = undefined;
      lastEmptyIndex = index;
      return unit;
    }
  }
}
function moveRandomDirection(v: Vec2) {
  while (true) {
    const vec = {
      x: v.x + Math.floor(Math.random() * 4) - 2,
      y: v.y + Math.floor(Math.random() * 4) - 2,
    };
    if (AABB.overlapsVec(qtSet.bounds, vec)) return vec;
  }
}
function getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}
let mousePos: Vec2 = {x: 0, y: 0};
cancasAll.onmousemove = function(evt: MouseEvent) {
  mousePos = getMousePos(cancasAll, evt);
};
cancasQueryResult.onmousemove = function(evt: MouseEvent) {
  mousePos = getMousePos(cancasQueryResult, evt);
};

let previousTimeStamp: DOMHighResTimeStamp;
function animate(timestamp: DOMHighResTimeStamp) {
  ctxAll.clearRect(0, 0, cancasAll.width, cancasAll.height);
  ctxAll.save();
  ctxAll.fillStyle = 'red';
  while (qtSet.size < totalUnit) {
    console.log(qtSet.size);
    recordUnit(new Unit(generateId(), randomPosition()));
  }
  for (let i=0; i<unitToMoveEachFrame; i++) {
    const unit = takeAUnit();
    unit.position = moveRandomDirection(unit.position);
    recordUnit(unit);
  }
  for (let i=0; i<unitToAddEachFrame; i++) {
    const unit = takeAUnit();
    if (!qtSet.delete(unit)) {
      throw new Error(`delete failed: ` +
        `${unit.id} ${JSON.stringify(unit.position)}`);
    }
    recordUnit(new Unit(generateId(), randomPosition()));
  }
  // qtSet.queryForEach((v) => ctxAll.fillRect(v.vec.x, v.vec.y, 1, 1));
  if (previousTimeStamp) {
    ctxAll.fillStyle = 'blue';
    ctxAll.font = '15px Arial';
    ctxAll.fillText(
        `${Math.round(1000/(timestamp - previousTimeStamp))} fps`, 10, 50);
  }
  ctxAll.restore();

  ctxQueryResult.clearRect(0, 0,
      cancasQueryResult.width, cancasQueryResult.height);
  ctxQueryResult.save();
  ctxQueryResult.fillStyle = 'green';
  let queryCount = 0;
  qtSet.queryForEach(Shape.createEllipse(mousePos, {x: 12, y: 8}), ({vec}) => {
    ctxQueryResult.fillRect(vec.x, vec.y, 1, 1);
    queryCount ++;
  });
  ctxQueryResult.fillStyle = 'black';
  ctxQueryResult.font = '15px Arial';
  ctxQueryResult.fillText(
      `${queryCount}/${qtSet.size} queried`, cancasQueryResult.width - 100, 50);
  ctxQueryResult.restore();
  previousTimeStamp = timestamp;
  requestAnimationFrame(animate);
}
window.requestAnimationFrame(animate);
