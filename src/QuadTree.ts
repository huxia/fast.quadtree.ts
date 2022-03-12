import {Collection, Iterable} from './collection';
import {Vec2, AABB, Shape} from './shape';

export type QuadTreeUnitKeyFunc<T> = (
  vec: Vec2, unit: T | undefined, quadTree: QuadTree<T>
) => string | number;
export type ReduceCallbackFunc<T, A> = (
    acc: A,
    previous: {vec: Vec2, unit?: T},
    index: number,
) => A | undefined;
export interface QuadTreeOptions<T> {
  unitKeyGetter: QuadTreeUnitKeyFunc<T>,
  integerCoordinate?: boolean,
}
export interface ReadonlyQuadTree<T> {
  readonly bounds: AABB;
  readonly size: number
  has(vec: Vec2, unit?: T): boolean;
  queryIteratable<A>(
      mapFunc: (v: {vec: Vec2, unit?: T}) => A,
      shape?: Shape | undefined,
  ): Iterable<A>;
  queryIteratable(
      shape?: Shape | undefined,
  ): Iterable<{vec: Vec2, unit?: T}>;
  queryReduce<A>(
      callbackFunc: ReduceCallbackFunc<T, A>,
      initialValue?: A): A;
  queryReduce<A>(
      shape: Shape,
      callbackFunc: ReduceCallbackFunc<T, A>,
      initialValue?: A): A;
  queryArray(
      shape?: Shape,
  ): Array<{vec: Vec2, unit?: T}>;
  queryForEach(
      shape: Shape,
      foreachFunc: (v: {vec: Vec2, unit?: T}, index: number) => void,
  ): void;
  queryForEach(
      foreachFunc: (v: {vec: Vec2, unit?: T}, index: number) => void,
  ): void;

  queryMap<A>(
      mapFunc: (v: {vec: Vec2, unit?: T}, index: number) => A,
  ): Array<A>;
  queryMap<A>(
      shape: Shape,
      mapFunc: (v: {vec: Vec2, unit?: T}, index: number) => A,
  ): Array<A>;
}
export class QuadTree<T> implements ReadonlyQuadTree<T> {
  static MaxElements = 8;
  static MaxDepth = 8;
  static UniqueUnitAtPositionKeyFunc = (
      vec: Vec2,
      _: any,
      quadTree: QuadTree<any>,
  ) =>
    quadTree.options.integerCoordinate ?
      vec.x + (quadTree.bounds.size.x * 2) * vec.y :
      `${vec.x},${vec.y}`;

  bounds: AABB;

  private depth: number;

  private divided: boolean;

  private units: {[key: string | number]: {unit?: T, vec: Vec2}};

  private northWest!: QuadTree<T>;
  private northEast!: QuadTree<T>;
  private southWest!: QuadTree<T>;
  private southEast!: QuadTree<T>;

  size: number;

  readonly options: QuadTreeOptions<T>;

  constructor(
      bounds: AABB,
      options?: QuadTreeOptions<T>,
      depth: number = 0,
  ) {
    this.bounds = bounds;
    this.depth = depth;
    this.divided = false;
    this.units = {};
    this.size = 0;
    this.options = options || {
      unitKeyGetter: QuadTree.UniqueUnitAtPositionKeyFunc,
    };
  }
  _add(vec: Vec2, unit?: T): false | 'added' | 'existing' {
    if (!AABB.overlapsVec(this.bounds, vec)) return false;
    if (this.depth == QuadTree.MaxDepth ||
      !this.divided && this.size < QuadTree.MaxElements) {
      const key = this.options.unitKeyGetter(vec, unit, this);
      let result: 'existing' | 'added' = 'existing';
      if (!this.units[key]) {
        this.size ++;
        result = 'added';
      }
      this.units[key] = {vec, unit};
      return result;
    }
    if (!this.divided) this.divide();
    const inserted = this.northWest._add(vec, unit) ||
      this.northEast._add(vec, unit) ||
      this.southWest._add(vec, unit) ||
      this.southEast._add(vec, unit);
    if (inserted === 'added') this.size ++;
    return inserted;
  }
  add(vec: Vec2, unit?: T): boolean {
    return !!this._add(vec, unit);
  }
  private _move(
      from: Vec2,
      to: Vec2 | undefined,
      unit?: T,
  ): false | 'removed' | 'moved' {
    if (!AABB.overlapsVec(this.bounds, from)) return false;
    if (!this.divided) {
      const key = this.options.unitKeyGetter(from, unit, this);
      if (!this.units[key]) {
        return false;
      }
      if (to && AABB.overlapsVec(this.bounds, to)) {
        // update in-place
        const newKey = this.options.unitKeyGetter(to, unit, this);
        if (newKey !== key) {
          delete this.units[key];
          this.units[newKey] = {vec: to, unit};
        } else {
          this.units[key] = {vec: to, unit};
        }
        return 'moved';
      }
      delete this.units[key];
      this.size --;
      return 'removed';
    }
    const result = this.northWest._move(from, to, unit) ||
          this.northEast._move(from, to, unit) ||
          this.southWest._move(from, to, unit) ||
          this.southEast._move(from, to, unit);
    if (result === 'removed') {
      this.size --;
      if (to) {
        if (this.add(to, unit)) return 'moved';
        return 'removed';
      }
    }
    return result;
  }
  move(from: Vec2, to: Vec2, unit?: T): boolean {
    if (!AABB.overlapsVec(this.bounds, to)) return false;
    if (this._move(from, to, unit) === 'removed') throw new Error('unexpected');
    return true;
  }
  delete(vec: Vec2, unit?: T): boolean {
    return this._move(vec, undefined, unit) === 'removed';
  }
  clear() {
    this.units = {};
    this.size = 0;
    this.divided = false;
    this.northWest =
      this.northEast =
      this.southWest =
      this.southEast = undefined!;
  }
  has(vec: Vec2, unit?: T): boolean {
    if (!AABB.overlapsVec(this.bounds, vec)) return false;
    if (!this.divided) {
      const key = this.options.unitKeyGetter(vec, unit, this);
      return !!this.units[key];
    }
    return this.northWest.has(vec, unit) ||
      this.northEast.has(vec, unit) ||
      this.southWest.has(vec, unit) ||
      this.southEast.has(vec, unit);
  }
  private divide() {
    this.divided = true;
    const hw = this.bounds.size.x / 2;
    const hh = this.bounds.size.y / 2;

    this.northWest = new QuadTree({
      center: {x: this.bounds.center.x - hw, y: this.bounds.center.y - hh},
      size: {x: hw, y: hh}}, this.options, this.depth + 1);
    this.northEast = new QuadTree({
      center: {x: this.bounds.center.x + hw, y: this.bounds.center.y - hh},
      size: {x: hw, y: hh}}, this.options, this.depth + 1);
    this.southWest = new QuadTree({
      center: {x: this.bounds.center.x - hw, y: this.bounds.center.y + hh},
      size: {x: hw, y: hh}}, this.options, this.depth + 1);
    this.southEast = new QuadTree({
      center: {x: this.bounds.center.x + hw, y: this.bounds.center.y + hh},
      size: {x: hw, y: hh}}, this.options, this.depth + 1);

    for (const {vec, unit} of Object.values(this.units)) {
      this.northWest.add(vec, unit) ||
      this.northEast.add(vec, unit) ||
      this.southWest.add(vec, unit) ||
      this.southEast.add(vec, unit);
    }
    this.units = {};
  }
  queryIteratable<A>(
      mapFunc: (v: {vec: Vec2, unit?: T}) => A,
      shape?: Shape | undefined,
  ): Iterable<A>;
  queryIteratable(
      shape?: Shape | undefined,
  ): Iterable<{vec: Vec2, unit?: T}>;
  queryIteratable<A>(
      mapFuncOrShape?: ((v: {vec: Vec2, unit?: T}) => A) | Shape | undefined,
      shape?: Shape | undefined,
  ): Iterable<A> {
    const mapFunc = typeof mapFuncOrShape === 'function' ?
      mapFuncOrShape :
      undefined;
    if (shape && !Shape.possiblelyOverlapsAABB(shape, this.bounds)) return [];

    if (!this.divided) {
      let arr = Object.values(this.units);
      if (shape) {
        arr = arr.filter((r) => Shape.overlapsVec(shape, r.vec));
      }
      if (mapFunc) return arr.map(mapFunc);
      return arr as any;
    }
    if (mapFunc) {
      return Collection.toIterableWithMap(
          mapFunc,
          () => this.northWest.queryIteratable(shape),
          () => this.northEast.queryIteratable(shape),
          () => this.southWest.queryIteratable(shape),
          () => this.southEast.queryIteratable(shape),
      ) as any;
    }
    return Collection.toIterable(
        () => this.northWest.queryIteratable(shape),
        () => this.northEast.queryIteratable(shape),
        () => this.southWest.queryIteratable(shape),
        () => this.southEast.queryIteratable(shape),
    ) as any;
  }
  private _queryReduce<A>(
      shape: Shape | undefined,
      callbackFunc: ReduceCallbackFunc<T, A>,
      initialValue?: A): A {
    if (shape && !Shape.possiblelyOverlapsAABB(shape, this.bounds)) {
      return initialValue!;
    }
    if (!this.divided) {
      let arr = Object.values(this.units);
      if (shape) {
        arr = arr.filter((r) => Shape.overlapsVec(shape!, r.vec));
      }
      return arr.reduce(callbackFunc as any, initialValue) as unknown as A;
    }
    let value: A = initialValue!;
    value = this.northWest._queryReduce(shape, callbackFunc, value);
    value = this.northEast._queryReduce(shape, callbackFunc, value);
    value = this.southWest._queryReduce(shape, callbackFunc, value);
    value = this.southEast._queryReduce(shape, callbackFunc, value);
    return value;
  }

  queryReduce<A>(
      callbackFunc: ReduceCallbackFunc<T, A>,
      initialValue?: A): A;
  queryReduce<A>(
      shape: Shape,
      callbackFunc: ReduceCallbackFunc<T, A>,
      initialValue?: A): A;
  queryReduce<A>(
      shapeOrCallbackFunc: Shape | ReduceCallbackFunc<T, A>,
      callbackFuncOrInitialValue: ReduceCallbackFunc<T, A> | A,
      initialValue?: A): A {
    if (typeof shapeOrCallbackFunc === 'function') {
      return this._queryReduce(
          undefined,
          shapeOrCallbackFunc,
          callbackFuncOrInitialValue as A);
    } else {
      return this._queryReduce(
          shapeOrCallbackFunc,
          callbackFuncOrInitialValue as ReduceCallbackFunc<T, A>,
          initialValue);
    }
  }

  queryArray(
      shape?: Shape,
  ): Array<{vec: Vec2, unit?: T}> {
    return this._queryReduce<Array<{vec: Vec2, unit?: T}>>(
        shape,
        (arr, v) => {
          arr.push(v);
          return arr;
        }, []);
  }

  queryForEach(
    shape: Shape,
    foreachFunc: (v: {vec: Vec2, unit?: T}, index: number) => void,
  ): void;
  queryForEach(
    foreachFunc: (v: {vec: Vec2, unit?: T}, index: number) => void,
  ): void;
  queryForEach(
      shapeOrForeachFunc:
        Shape | ((v: {vec: Vec2, unit?: T}, index: number) => void),
      foreachFunc?: (v: {vec: Vec2, unit?: T}, index: number) => void,
  ) {
    if (typeof shapeOrForeachFunc === 'function') {
      this._queryReduce<void>(
          undefined,
          (_, v, index) => shapeOrForeachFunc(v, index));
    } else {
      if (!foreachFunc) return;
      this._queryReduce<void>(
          shapeOrForeachFunc,
          (_, v, index) => foreachFunc(v, index));
    }
  }

  queryMap<A>(
    mapFunc: (v: {vec: Vec2, unit?: T}, index: number) => A,
  ): Array<A>;
  queryMap<A>(
    shape: Shape,
    mapFunc: (v: {vec: Vec2, unit?: T}, index: number) => A,
  ): Array<A>;
  queryMap<A>(
      shapeOrMapFunc: Shape | ((v: {vec: Vec2, unit?: T}, index: number) => A),
      mapFunc?: (v: {vec: Vec2, unit?: T}, index: number) => A,
  ): Array<A> {
    if (typeof shapeOrMapFunc === 'function') {
      if (!mapFunc) return [];
      return this._queryReduce<Array<A>>(
          undefined,
          (arr, v, index) => {
            arr.push(shapeOrMapFunc(v, index));
            return arr;
          },
          []);
    } else {
      if (!mapFunc) return [];
      return this._queryReduce<Array<A>>(
          shapeOrMapFunc,
          (arr, v, index) => {
            arr.push(mapFunc(v, index));
            return arr;
          },
          []);
    }
  }
  _dumpToString(result: string[]) {
    const prefix = '            '.substring(0, this.depth);
    if (!this.divided) {
      result.push(prefix);
      result.push(JSON.stringify(this.units));
      result.push('\n');
      return result;
    }
    for (const child of [
      {str: 'NW', qt: this.northWest},
      {str: 'NE', qt: this.northEast},
      {str: 'SW', qt: this.southWest},
      {str: 'SE', qt: this.southEast},
    ]) {
      result.push(prefix);
      result.push(child.str);
      result.push(` (${child.qt.size}):\n`);
      child.qt._dumpToString(result);
    }
    return result;
  }
  toString(): string {
    return this._dumpToString([]).join('');
  }
}
