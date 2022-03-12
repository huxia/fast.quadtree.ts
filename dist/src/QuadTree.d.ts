import { Iterable } from './collection';
import { Vec2, AABB, Shape } from './shape';
export declare type QuadTreeUnitKeyFunc<T> = (vec: Vec2, unit: T | undefined, quadTree: QuadTree<T>) => string | number;
export declare type ReduceCallbackFunc<T, A> = (acc: A, previous: {
    vec: Vec2;
    unit?: T;
}, index: number) => A | undefined;
export interface QuadTreeOptions<T> {
    unitKeyGetter: QuadTreeUnitKeyFunc<T>;
    integerCoordinate?: boolean;
}
export declare class QuadTree<T> {
    static MaxElements: number;
    static MaxDepth: number;
    static UniqueUnitAtPositionKeyFunc: (vec: Vec2, _: any, quadTree: QuadTree<any>) => string | number;
    bounds: AABB;
    private depth;
    private divided;
    private units;
    private northWest;
    private northEast;
    private southWest;
    private southEast;
    size: number;
    readonly options: QuadTreeOptions<T>;
    constructor(bounds: AABB, options?: QuadTreeOptions<T>, depth?: number);
    _add(vec: Vec2, unit?: T): false | 'added' | 'existing';
    add(vec: Vec2, unit?: T): boolean;
    private _move;
    move(from: Vec2, to: Vec2, unit?: T): boolean;
    delete(vec: Vec2, unit?: T): boolean;
    clear(): void;
    has(vec: Vec2, unit?: T): boolean;
    private divide;
    queryIteratable<A>(mapFunc: (v: {
        vec: Vec2;
        unit?: T;
    }) => A, shape?: Shape | undefined): Iterable<A>;
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
    _dumpToString(result: string[]): string[];
    toString(): string;
}
