import { QuadTree, QuadTreeOptions } from './QuadTree';
import { AABB, Shape, Vec2 } from './shape';
export declare type QuadMapUnitPositionGetterFunc<T> = (o: T) => Vec2;
export declare type QuadMapUnitPositionSetterFunc<T> = (o: T, position: Vec2) => void;
export declare type ReduceCallbackFunc<T, A> = (acc: A, previous: {
    vec: Vec2;
    unit: T;
}, index: number) => A | undefined;
export declare class QuadTreePositionOutOfBoundsError extends Error {
    constructor(message: string);
}
export declare class QuadTreeSet<T> implements Set<T> {
    static UniqueUnitAtVecKeyFunc: (vec: Vec2, _: any, quadTree: QuadTree<any>) => string | number;
    private quardTree;
    private unitPositionGetter;
    constructor(bounds: AABB, options: QuadTreeOptions<T> & {
        unitPositionGetter: QuadMapUnitPositionGetterFunc<T>;
    });
    get size(): number;
    get bounds(): AABB;
    add(t: T): this;
    move(t: T, to: Vec2): boolean;
    delete(t: T): boolean;
    has(t: T): boolean;
    clear(): void;
    forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void): void;
    entries(): IterableIterator<[T, T]>;
    keys(): IterableIterator<T>;
    values(): IterableIterator<T>;
    get [Symbol.toStringTag](): string;
    [Symbol.iterator](): IterableIterator<T>;
    queryIteratable(shape: Shape | undefined): Iterable<{
        vec: Vec2;
        unit: T;
    }>;
    queryReduce<A>(callbackFunc: ReduceCallbackFunc<T, A>, initialValue?: A): A;
    queryReduce<A>(shape: Shape, callbackFunc: ReduceCallbackFunc<T, A>, initialValue?: A): A;
    queryArray(shape?: Shape): Array<{
        vec: Vec2;
        unit: T;
    }>;
    queryForEach(shape: Shape, foreachFunc: (v: {
        vec: Vec2;
        unit: T;
    }, index: number) => void): void;
    queryForEach(foreachFunc: (v: {
        vec: Vec2;
        unit: T;
    }, index: number) => void): void;
    queryMap<A>(mapFunc: (v: {
        vec: Vec2;
        unit: T;
    }, index: number) => A): Array<A>;
    queryMap<A>(shape: Shape, mapFunc: (v: {
        vec: Vec2;
        unit: T;
    }, index: number) => A): Array<A>;
}
