export declare type Collection<T> = Iterator<T> | Array<T>;
export declare type Iterable<T> = IterableIterator<T> | Array<T>;
export declare namespace Collection {
    function toArray<T>(c: Collection<T>): T[];
    function toIterable<T>(...childIterators: (() => Collection<T>)[]): Generator<T, void, unknown>;
    function toIterableWithFilter<T>(filterFunc: ((o: T) => boolean), ...childIterators: (() => Collection<T>)[]): Generator<T, void, unknown>;
    function toIterableWithMap<T, A>(mapFunc: ((o: T) => A), ...childIterators: (() => Collection<T>)[]): Generator<A, void, unknown>;
}
