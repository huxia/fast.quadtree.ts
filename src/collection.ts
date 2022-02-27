
export type Collection<T> = Iterator<T> | Array<T>;
export type Iterable<T> = IterableIterator<T> | Array<T>;
export namespace Collection {
  export function toArray<T>(c: Collection<T>) {
    if (c instanceof Array) {
      return c;
    }
    const r: T[] = [];
    if ((c as Generator<T>)[Symbol.iterator]) {
      for (const i of (c as Generator<T>)) {
        r.push(i);
      }
      return r;
    }
    let i = c.next();
    while (!i.done) {
      r.push(i.value);
      i = c.next();
    }
    return r;
  }
  export function* toIterable<T>(
      ...childIterators: (() => Collection<T>)[]
  ) {
    for (const func of childIterators) {
      if (!func) continue;
      const iterator = func();
      if (iterator instanceof Array) {
        for (const result of iterator) {
          yield result;
        }
      } else {
        let result = iterator.next();
        while (!result.done) {
          yield result.value;
          result = iterator.next();
        }
      }
    }
  }
  export function* toIterableWithFilter<T>(
      filterFunc: ((o: T) => boolean),
      ...childIterators: (() => Collection<T>)[]
  ) {
    for (const func of childIterators) {
      if (!func) continue;
      const iterator = func();
      if (iterator instanceof Array) {
        for (const result of iterator) {
          if (!filterFunc || filterFunc(result)) {
            yield result;
          }
        }
      } else {
        let result = iterator.next();
        while (!result.done) {
          if (!filterFunc || filterFunc(result.value)) {
            yield result.value;
          }
          result = iterator.next();
        }
      }
    }
  }
  export function* toIterableWithMap<T, A>(
      mapFunc: ((o: T) => A),
      ...childIterators: (() => Collection<T>)[]
  ) {
    for (const func of childIterators) {
      if (!func) continue;
      const iterator = func();
      if (iterator instanceof Array) {
        for (const result of iterator) {
          yield mapFunc(result);
        }
      } else {
        let result = iterator.next();
        while (!result.done) {
          yield mapFunc(result.value);
          result = iterator.next();
        }
      }
    }
  }
}
