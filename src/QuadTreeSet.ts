import {
  QuadTree,
  QuadTreeOptions,
} from './QuadTree';
import {AABB, Shape, Vec2} from './shape';

export type QuadMapUnitPositionGetterFunc<T> = (o: T) => Vec2;
export type QuadMapUnitPositionSetterFunc<T> = (o: T, position: Vec2) => void;
export type ReduceCallbackFunc<T, A> = (
  acc: A,
  previous: {vec: Vec2, unit: T},
  index: number,
) => A | undefined;
export class QuadTreePositionOutOfBoundsError extends Error {
  constructor(message: string) {
    super(message);
  }
}
export interface ReadonlyQuadTreeSet<T> extends ReadonlySet<T> {
  readonly bounds: AABB;
  [Symbol.iterator](): SetIterator<T>;
  queryIteratable(
      shape: Shape | undefined,
  ): Iterable<{vec: Vec2, unit: T}>;
  queryReduce<A>(
    callbackFunc: ReduceCallbackFunc<T, A>,
    initialValue?: A): A;
  queryReduce<A>(
      shape: Shape,
      callbackFunc: ReduceCallbackFunc<T, A>,
      initialValue?: A): A;
  queryArray(
      shape?: Shape,
  ): Array<{vec: Vec2, unit: T}>;
  queryForEach(
      shape: Shape,
      foreachFunc: (v: {vec: Vec2, unit: T}, index: number) => void,
  ): void;
  queryForEach(
      foreachFunc: (v: {vec: Vec2, unit: T}, index: number) => void,
  ): void;
  queryMap<A>(
      mapFunc: (v: {vec: Vec2, unit: T}, index: number) => A,
  ): Array<A>;
  queryMap<A>(
      shape: Shape,
      mapFunc: (v: {vec: Vec2, unit: T}, index: number) => A,
  ): Array<A>;
}
export class QuadTreeSet<T> implements Set<T>, ReadonlyQuadTreeSet<T> {
  static UniqueUnitAtVecKeyFunc = QuadTree.UniqueUnitAtPositionKeyFunc;
  private quardTree: QuadTree<T>;
  private unitPositionGetter: QuadMapUnitPositionGetterFunc<T>;
  constructor(bounds: AABB, options: Partial<QuadTreeOptions<T>> & {
    unitPositionGetter: QuadMapUnitPositionGetterFunc<T>,
  }) {
    this.quardTree = new QuadTree(bounds, options);
    this.unitPositionGetter = options.unitPositionGetter;
  }
  get size() {
    return this.quardTree.size;
  }
  get bounds() {
    return this.quardTree.bounds;
  }
  add(t: T) {
    const position = this.unitPositionGetter(t);
    if (!this.quardTree.add(position, t)) {
      throw new QuadTreePositionOutOfBoundsError(
          `position ${JSON.stringify(position)} is out of bounds:` +
          ` ${JSON.stringify(this.quardTree.bounds)}`);
    }
    return this;
  }
  move(t: T, to: Vec2) {
    return this.quardTree.move(this.unitPositionGetter(t), to, t);
  }
  delete(t: T) {
    return this.quardTree.delete(this.unitPositionGetter(t), t);
  }
  has(t: T) {
    return this.quardTree.has(this.unitPositionGetter(t), t);
  }
  clear() {
    this.quardTree.clear();
  }
  forEach(
      callbackfn: (value: T, value2: T, set: Set<T>) => void,
      thisArg?: any,
  ): void {
    return this.quardTree.queryReduce(
        (_, p) => void(callbackfn(p.unit!, p.unit!, thisArg)),
        void(0),
    );
  }
  entries() {
    return this.quardTree.queryIteratable<[T, T]>(
        (p) => [p.unit!, p.unit!]) as any;
  }
  keys() {
    return this.values();
  }
  values() {
    return this.quardTree.queryIteratable<T>(
        (p) => p.unit!) as any;
  }
  get [Symbol.toStringTag](): string {
    return this.quardTree.toString();
  }
  [Symbol.iterator]() {
    return this.values();
  }
  queryIteratable(
      shape: Shape | undefined,
  ): Iterable<{vec: Vec2, unit: T}> {
    return this.quardTree.queryIteratable(shape) as
      Iterable<{vec: Vec2, unit: T}>;
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
    return this.quardTree.queryReduce(
        shapeOrCallbackFunc as Shape,
        callbackFuncOrInitialValue as any,
        initialValue);
  }

  queryArray(
      shape?: Shape,
  ): Array<{vec: Vec2, unit: T}> {
    return this.quardTree.queryArray(shape) as any;
  }

  queryForEach(
    shape: Shape,
    foreachFunc: (v: {vec: Vec2, unit: T}, index: number) => void,
  ): void;
  queryForEach(
    foreachFunc: (v: {vec: Vec2, unit: T}, index: number) => void,
  ): void;
  queryForEach(
      shapeOrForeachFunc:
        Shape | ((v: {vec: Vec2, unit: T}, index: number) => void),
      foreachFunc?: (v: {vec: Vec2, unit: T}, index: number) => void,
  ) {
    this.quardTree.queryForEach(shapeOrForeachFunc as any, foreachFunc as any);
  }

  queryMap<A>(
    mapFunc: (v: {vec: Vec2, unit: T}, index: number) => A,
  ): Array<A>;
  queryMap<A>(
    shape: Shape,
    mapFunc: (v: {vec: Vec2, unit: T}, index: number) => A,
  ): Array<A>;
  queryMap<A>(
      shapeOrMapFunc: Shape | ((v: {vec: Vec2, unit: T}, index: number) => A),
      mapFunc?: (v: {vec: Vec2, unit: T}, index: number) => A,
  ): Array<A> {
    return this.quardTree.queryMap(shapeOrMapFunc as Shape, mapFunc as any);
  }
  querySize(
      shape: Shape,
  ): number {
    return this.quardTree.querySize(shape);
  }
}
