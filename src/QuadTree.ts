import {Collection, Iterable} from './collection';
import {Vec2, AABB, Shape} from './shape';

export type QuadTreeUnitKeyFunc<T> = (
  vec: Vec2, unit: T, quadTree: QuadTree<T>
) => string | number;
export type ReduceCallbackFunc<T, A> = (
    acc: A,
    previous: {vec: Vec2, unit?: T},
    index: number,
) => A | undefined;
export interface QuadTreeOptions<T> {
  unitKeyGetter: QuadTreeUnitKeyFunc<T>,
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
  querySize(
      shape: Shape,
  ): number;
}
export class QuadTree<T> implements ReadonlyQuadTree<T> {
  static MaxElements = 8;
  static MaxDepth = 8;
  static UniqueUnitAtPositionKeyFunc = (
      vec: Vec2,
      _: any,
      quadTree: QuadTree<any>,
  ) => `${vec.x},${vec.y}`;

  bounds: AABB;

  private depth: number;

  private divided: boolean;

  private units: {[key: string | number]: {unit: T, vec: Vec2}};


  private northWest!: QuadTree<T>;
  private northEast!: QuadTree<T>;
  private southWest!: QuadTree<T>;
  private southEast!: QuadTree<T>;
  private _size: number;

  get size() {
    return this._size;
  }

  readonly options: QuadTreeOptions<T>;

  constructor(
      bounds: AABB,
      options?: Partial<QuadTreeOptions<T>>,
      depth: number = 0,
  ) {
    this.bounds = bounds;
    this.depth = depth;
    this.divided = false;
    this.units = {};
    this._size = 0;
    this.options = {
      unitKeyGetter:
        options?.unitKeyGetter || QuadTree.UniqueUnitAtPositionKeyFunc,
    };
  }
  _add(vec: Vec2, unit: T): false | 'added' | 'existing' {
    if (!AABB.overlapsVec(this.bounds, vec)) return false;
    if (this.depth == QuadTree.MaxDepth ||
      !this.divided && this.size < QuadTree.MaxElements) {
      const key = this.options.unitKeyGetter(vec, unit, this);
      let result: 'existing' | 'added' = 'existing';
      if (!this.units[key]) {
        this._size ++;
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
    if (inserted === 'added') this._size ++;
    return inserted;
  }
  add(vec: Vec2, unit: T): boolean {
    return !!this._add(vec, unit);
  }
  private _move(
      from: Vec2,
      to: Vec2 | undefined,
      unit: T,
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
      this._size --;
      return 'removed';
    }
    const result = this.northWest._move(from, to, unit) ||
          this.northEast._move(from, to, unit) ||
          this.southWest._move(from, to, unit) ||
          this.southEast._move(from, to, unit);
    if (result === 'removed') {
      this._size --;
      if (to) {
        if (this.add(to, unit)) return 'moved';
        return 'removed';
      }
    }
    return result;
  }
  move(from: Vec2, to: Vec2, unit: T): boolean {
    if (!AABB.overlapsVec(this.bounds, to)) return false;
    if (this._move(from, to, unit) === 'removed') throw new Error('unexpected');
    return true;
  }
  delete(vec: Vec2, unit: T): boolean {
    return this._move(vec, undefined, unit) === 'removed';
  }
  clear() {
    this.units = {};
    this._size = 0;
    this.divided = false;
    this.northWest =
      this.northEast =
      this.southWest =
      this.southEast = undefined!;
  }
  has(vec: Vec2, unit: T): boolean {
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

    // eslint-disable-next-line guard-for-in
    for (const k in this.units) {
      const {vec, unit} = this.units[k];
      this.northWest.add(vec, unit) ||
      this.northEast.add(vec, unit) ||
      this.southWest.add(vec, unit) ||
      this.southEast.add(vec, unit);
    }
    this.units = {};
  }
  private _queryIteratable<A>(
      shape: Shape | undefined,
      mapFunc: ((v: {vec: Vec2, unit?: T}, idx: number) => A) | undefined,
      index: {index: number},
  ): Iterable<A> {
    if (shape && !Shape.possiblelyOverlapsAABB(shape, this.bounds)) return [];

    if (!this.divided) {
      return Collection.objectValuesToIterable(
          this.units,
          shape ? (v) => Shape.overlapsVec(shape, v.vec) : undefined,
          mapFunc,
          index,
      ) as Iterable<A>;
    }
    if (mapFunc) {
      return Collection.toIterableWithMap(
          mapFunc,
          index,
          this.northWest._queryIteratable(shape, undefined, index),
          this.northEast._queryIteratable(shape, undefined, index),
          this.southWest._queryIteratable(shape, undefined, index),
          this.southEast._queryIteratable(shape, undefined, index),
      );
    }
    return Collection.toIterable(
        this.northWest._queryIteratable(shape, undefined, index),
        this.northEast._queryIteratable(shape, undefined, index),
        this.southWest._queryIteratable(shape, undefined, index),
        this.southEast._queryIteratable(shape, undefined, index),
    );
  }
  queryIteratable<A>(
      mapFunc: (v: {vec: Vec2, unit?: T}, idx: number) => A,
      shape?: Shape | undefined,
  ): Iterable<A>;
  queryIteratable(
      shape?: Shape | undefined,
  ): Iterable<{vec: Vec2, unit?: T}>;
  queryIteratable<A>(
      mapFuncOrShape?: ((v: {vec: Vec2, unit?: T}, idx: number) => A) | Shape,
      shape?: Shape | undefined,
  ): Iterable<A> {
    if (typeof mapFuncOrShape === 'function') {
      return this._queryIteratable(shape, mapFuncOrShape, {index: 0});
    } else {
      return this._queryIteratable(
        mapFuncOrShape as Shape,
        undefined,
        {index: 0},
      );
    }
  }
  private _queryReduce<A>(
      shape: Shape | undefined,
      callbackFunc: ReduceCallbackFunc<T, A>,
      initialValue: A | undefined,
      index: {index: number},
  ): A {
    if (shape && !Shape.possiblelyOverlapsAABB(shape, this.bounds)) {
      return initialValue!;
    }
    let value: A = initialValue!;
    if (!this.divided) {
      if (shape) {
        // eslint-disable-next-line guard-for-in
        for (const k in this.units) {
          const unit = this.units[k];
          if (Shape.overlapsVec(shape, unit.vec)) {
            value = callbackFunc(value, unit, index.index++)!;
          }
        }
      } else {
        // eslint-disable-next-line guard-for-in
        for (const k in this.units) {
          const unit = this.units[k];
          value = callbackFunc(value, unit, index.index++)!;
        }
      }
      return value;
    }
    value = this.northWest._queryReduce(shape, callbackFunc, value, index);
    value = this.northEast._queryReduce(shape, callbackFunc, value, index);
    value = this.southWest._queryReduce(shape, callbackFunc, value, index);
    value = this.southEast._queryReduce(shape, callbackFunc, value, index);
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
          callbackFuncOrInitialValue as A,
          {index: 0},
      );
    } else {
      return this._queryReduce(
          shapeOrCallbackFunc,
          callbackFuncOrInitialValue as ReduceCallbackFunc<T, A>,
          initialValue,
          {index: 0},
      );
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
        },
        [],
        {index: 0},
    );
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
          (_, v, index) => shapeOrForeachFunc(v, index),
          undefined,
          {index: 0},
      );
    } else {
      if (!foreachFunc) return;
      this._queryReduce<void>(
          shapeOrForeachFunc,
          (_, v, index) => foreachFunc(v, index),
          undefined,
          {index: 0},
      );
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
          [],
          {index: 0},
      );
    } else {
      if (!mapFunc) return [];
      return this._queryReduce<Array<A>>(
          shapeOrMapFunc,
          (arr, v, index) => {
            arr.push(mapFunc(v, index));
            return arr;
          },
          [],
          {index: 0},
      );
    }
  }
  querySize(
      shape: Shape,
  ): number {
    return this._queryReduce<number>(
        shape,
        (size) => size + 1,
        0,
        {index: 0},
    );
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
