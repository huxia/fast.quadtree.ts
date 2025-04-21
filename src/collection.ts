
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
      ...childIterators: (undefined | (() => Collection<T>) | Collection<T>)[]
  ) {
    for (const funcOrCollection of childIterators) {
      if (!funcOrCollection) continue;
      const iterator = typeof funcOrCollection === 'function' ?
        funcOrCollection() : funcOrCollection;
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
      filterFunc: ((o: T, idx: number) => boolean),
      index: {index: number},
      ...childIterators: (undefined | Collection<T> |
        (() => Collection<T>) | Collection<T>)[]
  ) {
    if (!filterFunc) {
      for (const funcOrCollection of childIterators) {
        if (!funcOrCollection) continue;
        const iterator = typeof funcOrCollection === 'function' ?
          funcOrCollection() : funcOrCollection;
        if (iterator instanceof Array) {
          for (const result of iterator) {
            yield result;
            index.index++;
          }
        } else {
          let result = iterator.next();
          while (!result.done) {
            yield result.value;
            result = iterator.next();
            index.index++;
          }
        }
      }
    } else {
      for (const func of childIterators) {
        if (!func) continue;
        const iterator = typeof func === 'function' ? func() : func;
        if (iterator instanceof Array) {
          for (const result of iterator) {
            if (filterFunc(result, index.index++)) {
              yield result;
            }
          }
        } else {
          let result = iterator.next();
          while (!result.done) {
            if (filterFunc(result.value, index.index++)) {
              yield result.value;
            }
            result = iterator.next();
          }
        }
      }
    }
  }
  export function* toIterableWithMap<T, A>(
      mapFunc: ((o: T, idx: number) => A),
      index: {index: number},
      ...childIterators: (undefined | Collection<T>
        | (() => Collection<T>) | Collection<T>)[]
  ) {
    for (const funcOrCollection of childIterators) {
      if (!funcOrCollection) continue;
      const iterator = typeof funcOrCollection === 'function' ?
        funcOrCollection() : funcOrCollection;
      if (iterator instanceof Array) {
        for (const result of iterator) {
          yield mapFunc(result, index.index++);
        }
      } else {
        let result = iterator.next();
        while (!result.done) {
          yield mapFunc(result.value, index.index++);
          result = iterator.next();
        }
      }
    }
  }
  export function* objectValuesToIterable<T, A>(
      object: Record<string, T>,
      filterFunc: undefined | ((o: T, idx: number) => boolean),
      mapFunc: undefined | ((o: T, idx: number) => A),
      index: {index: number},
  ) {
    if (filterFunc) {
      if (mapFunc) {
        // eslint-disable-next-line guard-for-in
        for (const key in object) {
          const value = object[key];
          if (!filterFunc(value, index.index)) {
            continue;
          }
          yield mapFunc(value, index.index++);
        }
      } else {
        // eslint-disable-next-line guard-for-in
        for (const key in object) {
          const value = object[key];
          if (!filterFunc(value, index.index)) {
            continue;
          }
          yield value;
          index.index++;
        }
      }
    } else {
      if (mapFunc) {
        // eslint-disable-next-line guard-for-in
        for (const key in object) {
          yield mapFunc(object[key], index.index++);
        }
      } else {
        // eslint-disable-next-line guard-for-in
        for (const key in object) {
          yield object[key];
          index.index++;
        }
      }
    }
  }
}
