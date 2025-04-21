export type Collection<T> = Iterator<T> | Array<T>;
export type Iterable<T> = IterableIterator<T> | Array<T>;
export declare namespace Collection {
    function toArray<T>(c: Collection<T>): T[];
    function toIterable<T>(...childIterators: (undefined | (() => Collection<T>) | Collection<T>)[]): Generator<T, void, unknown>;
    function toIterableWithFilter<T>(filterFunc: ((o: T, idx: number) => boolean), index: {
        index: number;
    }, ...childIterators: (undefined | Collection<T> | (() => Collection<T>) | Collection<T>)[]): Generator<T, void, unknown>;
    function toIterableWithMap<T, A>(mapFunc: ((o: T, idx: number) => A), index: {
        index: number;
    }, ...childIterators: (undefined | Collection<T> | (() => Collection<T>) | Collection<T>)[]): Generator<A, void, unknown>;
    function objectValuesToIterable<T, A>(object: Record<string, T>, filterFunc: undefined | ((o: T, idx: number) => boolean), mapFunc: undefined | ((o: T, idx: number) => A), index: {
        index: number;
    }): Generator<T | A, void, unknown>;
}
