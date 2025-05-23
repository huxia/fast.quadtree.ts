import { Iterable } from './collection';
import { Vec2, AABB, Shape } from './shape';
export type QuadTreeUnitKeyFunc<T> = (vec: Vec2, unit: T, quadTree: QuadTree<T>) => string | number;
export type ReduceCallbackFunc<T, A> = (acc: A, previous: {
    vec: Vec2;
    unit?: T;
}, index: number) => A | undefined;
export interface QuadTreeOptions<T> {
    unitKeyGetter: QuadTreeUnitKeyFunc<T>;
}
export interface ReadonlyQuadTree<T> {
    readonly bounds: AABB;
    readonly size: number;
    has(vec: Vec2, unit?: T): boolean;
    queryIteratable<A>(mapFunc: (v: {
        vec: Vec2;
        unit?: T;
    }) => A, shape?: Shape | undefined): Iterable<A>;
    queryIteratable(shape?: Shape | undefined): Iterable<{
        vec: Vec2;
        unit?: T;
    }>;
    queryReduce<A>(callbackFunc: ReduceCallbackFunc<T, A>, initialValue?: A): A;
    queryReduce<A>(shape: Shape, callbackFunc: ReduceCallbackFunc<T, A>, initialValue?: A): A;
    queryArray(shape?: Shape): Array<{
        vec: Vec2;
        unit?: T;
    }>;
    queryForEach(shape: Shape, foreachFunc: (v: {
        vec: Vec2;
        unit?: T;
    }, index: number) => void): void;
    queryForEach(foreachFunc: (v: {
        vec: Vec2;
        unit?: T;
    }, index: number) => void): void;
    queryMap<A>(mapFunc: (v: {
        vec: Vec2;
        unit?: T;
    }, index: number) => A): Array<A>;
    queryMap<A>(shape: Shape, mapFunc: (v: {
        vec: Vec2;
        unit?: T;
    }, index: number) => A): Array<A>;
    querySize(shape: Shape): number;
}
export declare class QuadTree<T> implements ReadonlyQuadTree<T> {
    static MaxElements: number;
    static MaxDepth: number;
    static UniqueUnitAtPositionKeyFunc: (vec: Vec2, _: any, quadTree: QuadTree<any>) => string;
    bounds: AABB;
    private depth;
    private divided;
    private units;
    private northWest;
    private northEast;
    private southWest;
    private southEast;
    private _size;
    get size(): number;
    readonly options: QuadTreeOptions<T>;
    constructor(bounds: AABB, options?: Partial<QuadTreeOptions<T>>, depth?: number);
    _add(vec: Vec2, unit: T): false | 'added' | 'existing';
    add(vec: Vec2, unit: T): boolean;
    private _move;
    move(from: Vec2, to: Vec2, unit: T): boolean;
    delete(vec: Vec2, unit: T): boolean;
    clear(): void;
    has(vec: Vec2, unit: T): boolean;
    private divide;
    private _queryIteratable;
    queryIteratable<A>(mapFunc: (v: {
        vec: Vec2;
        unit?: T;
    }, idx: number) => A, shape?: Shape | undefined): Iterable<A>;
    queryIteratable(shape?: Shape | undefined): Iterable<{
        vec: Vec2;
        unit?: T;
    }>;
    private _queryReduce;
    queryReduce<A>(callbackFunc: ReduceCallbackFunc<T, A>, initialValue?: A): A;
    queryReduce<A>(shape: Shape, callbackFunc: ReduceCallbackFunc<T, A>, initialValue?: A): A;
    queryArray(shape?: Shape): Array<{
        vec: Vec2;
        unit?: T;
    }>;
    queryForEach(shape: Shape, foreachFunc: (v: {
        vec: Vec2;
        unit?: T;
    }, index: number) => void): void;
    queryForEach(foreachFunc: (v: {
        vec: Vec2;
        unit?: T;
    }, index: number) => void): void;
    queryMap<A>(mapFunc: (v: {
        vec: Vec2;
        unit?: T;
    }, index: number) => A): Array<A>;
    queryMap<A>(shape: Shape, mapFunc: (v: {
        vec: Vec2;
        unit?: T;
    }, index: number) => A): Array<A>;
    querySize(shape: Shape): number;
    _dumpToString(result: string[]): string[];
    toString(): string;
}
