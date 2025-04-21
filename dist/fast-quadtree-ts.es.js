
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.1.1
   * Released under the MIT license.
   */

var Collection;
(function (Collection) {
    function toArray(c) {
        if (c instanceof Array) {
            return c;
        }
        const r = [];
        if (c[Symbol.iterator]) {
            for (const i of c) {
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
    Collection.toArray = toArray;
    function* toIterable(...childIterators) {
        for (const func of childIterators) {
            if (!func)
                continue;
            const iterator = func();
            if (iterator instanceof Array) {
                for (const result of iterator) {
                    yield result;
                }
            }
            else {
                let result = iterator.next();
                while (!result.done) {
                    yield result.value;
                    result = iterator.next();
                }
            }
        }
    }
    Collection.toIterable = toIterable;
    function* toIterableWithFilter(filterFunc, index, ...childIterators) {
        if (!filterFunc) {
            for (const func of childIterators) {
                if (!func)
                    continue;
                const iterator = typeof func === 'function' ? func() : func;
                if (iterator instanceof Array) {
                    for (const result of iterator) {
                        yield result;
                        index.index++;
                    }
                }
                else {
                    let result = iterator.next();
                    while (!result.done) {
                        yield result.value;
                        result = iterator.next();
                        index.index++;
                    }
                }
            }
        }
        else {
            for (const func of childIterators) {
                if (!func)
                    continue;
                const iterator = typeof func === 'function' ? func() : func;
                if (iterator instanceof Array) {
                    for (const result of iterator) {
                        if (filterFunc(result, index.index++)) {
                            yield result;
                        }
                    }
                }
                else {
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
    Collection.toIterableWithFilter = toIterableWithFilter;
    function* toIterableWithMap(mapFunc, index, ...childIterators) {
        for (const func of childIterators) {
            if (!func)
                continue;
            const iterator = typeof func === 'function' ? func() : func;
            if (iterator instanceof Array) {
                for (const result of iterator) {
                    yield mapFunc(result, index.index++);
                }
            }
            else {
                let result = iterator.next();
                while (!result.done) {
                    yield mapFunc(result.value, index.index++);
                    result = iterator.next();
                }
            }
        }
    }
    Collection.toIterableWithMap = toIterableWithMap;
    function* objectValuesToIterable(object, filterFunc, mapFunc, index) {
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
            }
            else {
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
        }
        else {
            if (mapFunc) {
                // eslint-disable-next-line guard-for-in
                for (const key in object) {
                    yield mapFunc(object[key], index.index++);
                }
            }
            else {
                // eslint-disable-next-line guard-for-in
                for (const key in object) {
                    yield object[key];
                    index.index++;
                }
            }
        }
    }
    Collection.objectValuesToIterable = objectValuesToIterable;
})(Collection || (Collection = {}));

var AABB;
(function (AABB) {
    function overlapsVec(aabb, vec) {
        return aabb.center.x - aabb.size.x <= vec.x &&
            vec.x <= aabb.center.x + aabb.size.x &&
            aabb.center.y - aabb.size.y <= vec.y &&
            vec.y <= aabb.center.y + aabb.size.y;
    }
    AABB.overlapsVec = overlapsVec;
    function overlapsAABB(one, another) {
        return !(another.center.x - another.size.x > one.center.x + one.size.x ||
            another.center.x + another.size.x < one.center.x - one.size.x ||
            another.center.y - another.size.y > one.center.y + one.size.y ||
            another.center.y + another.size.y < one.center.y - one.size.y);
    }
    AABB.overlapsAABB = overlapsAABB;
})(AABB || (AABB = {}));
var Shape;
(function (Shape) {
    function overlapsVec(shape, vec) {
        switch (shape.type) {
            case 'rectangle': return AABB.overlapsVec(shape, vec);
            case 'square': return AABB.overlapsVec({
                center: shape.center,
                size: { x: shape.size, y: shape.size },
            }, vec);
            case 'circle': return Shape.overlapsVec({
                type: 'ellipse',
                center: shape.center,
                size: { x: shape.size, y: shape.size },
            }, vec);
            case 'ellipse': {
                const p = Math.pow(vec.x - shape.center.x, 2) / Math.pow(shape.size.x, 2) +
                    Math.pow(vec.y - shape.center.y, 2) / Math.pow(shape.size.y, 2);
                return p <= 1;
            }
            default: throw new Error('not implemented');
        }
    }
    Shape.overlapsVec = overlapsVec;
    function possiblelyOverlapsAABB(shape, aabb) {
        switch (shape.type) {
            case 'ellipse':
            case 'rectangle':
                return AABB.overlapsAABB(shape, aabb);
            case 'circle':
            case 'square':
                return AABB.overlapsAABB({
                    center: shape.center,
                    size: { x: shape.size, y: shape.size },
                }, aabb);
            default: throw new Error('not implemented');
        }
    }
    Shape.possiblelyOverlapsAABB = possiblelyOverlapsAABB;
    function createRectangle(center, size) {
        if (typeof size === 'number') {
            return {
                type: 'square',
                center,
                size,
            };
        }
        else {
            return {
                type: 'rectangle',
                center,
                size,
            };
        }
    }
    Shape.createRectangle = createRectangle;
    function createEllipse(center, size) {
        if (typeof size === 'number') {
            return {
                type: 'circle',
                center,
                size,
            };
        }
        else {
            return {
                type: 'ellipse',
                center,
                size,
            };
        }
    }
    Shape.createEllipse = createEllipse;
})(Shape || (Shape = {}));

class QuadTree {
    get size() {
        return this._size;
    }
    constructor(bounds, options, depth = 0) {
        this.bounds = bounds;
        this.depth = depth;
        this.divided = false;
        this.units = {};
        this._size = 0;
        this.options = options || {
            unitKeyGetter: QuadTree.UniqueUnitAtPositionKeyFunc,
        };
    }
    _add(vec, unit) {
        if (!AABB.overlapsVec(this.bounds, vec))
            return false;
        if (this.depth == QuadTree.MaxDepth ||
            !this.divided && this.size < QuadTree.MaxElements) {
            const key = this.options.unitKeyGetter(vec, unit, this);
            let result = 'existing';
            if (!this.units[key]) {
                this._size++;
                result = 'added';
            }
            this.units[key] = { vec, unit };
            return result;
        }
        if (!this.divided)
            this.divide();
        const inserted = this.northWest._add(vec, unit) ||
            this.northEast._add(vec, unit) ||
            this.southWest._add(vec, unit) ||
            this.southEast._add(vec, unit);
        if (inserted === 'added')
            this._size++;
        return inserted;
    }
    add(vec, unit) {
        return !!this._add(vec, unit);
    }
    _move(from, to, unit) {
        if (!AABB.overlapsVec(this.bounds, from))
            return false;
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
                    this.units[newKey] = { vec: to, unit };
                }
                else {
                    this.units[key] = { vec: to, unit };
                }
                return 'moved';
            }
            delete this.units[key];
            this._size--;
            return 'removed';
        }
        const result = this.northWest._move(from, to, unit) ||
            this.northEast._move(from, to, unit) ||
            this.southWest._move(from, to, unit) ||
            this.southEast._move(from, to, unit);
        if (result === 'removed') {
            this._size--;
            if (to) {
                if (this.add(to, unit))
                    return 'moved';
                return 'removed';
            }
        }
        return result;
    }
    move(from, to, unit) {
        if (!AABB.overlapsVec(this.bounds, to))
            return false;
        if (this._move(from, to, unit) === 'removed')
            throw new Error('unexpected');
        return true;
    }
    delete(vec, unit) {
        return this._move(vec, undefined, unit) === 'removed';
    }
    clear() {
        this.units = {};
        this._size = 0;
        this.divided = false;
        this.northWest =
            this.northEast =
                this.southWest =
                    this.southEast = undefined;
    }
    has(vec, unit) {
        if (!AABB.overlapsVec(this.bounds, vec))
            return false;
        if (!this.divided) {
            const key = this.options.unitKeyGetter(vec, unit, this);
            return !!this.units[key];
        }
        return this.northWest.has(vec, unit) ||
            this.northEast.has(vec, unit) ||
            this.southWest.has(vec, unit) ||
            this.southEast.has(vec, unit);
    }
    divide() {
        this.divided = true;
        const hw = this.bounds.size.x / 2;
        const hh = this.bounds.size.y / 2;
        this.northWest = new QuadTree({
            center: { x: this.bounds.center.x - hw, y: this.bounds.center.y - hh },
            size: { x: hw, y: hh }
        }, this.options, this.depth + 1);
        this.northEast = new QuadTree({
            center: { x: this.bounds.center.x + hw, y: this.bounds.center.y - hh },
            size: { x: hw, y: hh }
        }, this.options, this.depth + 1);
        this.southWest = new QuadTree({
            center: { x: this.bounds.center.x - hw, y: this.bounds.center.y + hh },
            size: { x: hw, y: hh }
        }, this.options, this.depth + 1);
        this.southEast = new QuadTree({
            center: { x: this.bounds.center.x + hw, y: this.bounds.center.y + hh },
            size: { x: hw, y: hh }
        }, this.options, this.depth + 1);
        for (const { vec, unit } of Object.values(this.units)) {
            this.northWest.add(vec, unit) ||
                this.northEast.add(vec, unit) ||
                this.southWest.add(vec, unit) ||
                this.southEast.add(vec, unit);
        }
        this.units = {};
    }
    _queryIteratable(shape, mapFunc, index) {
        if (shape && !Shape.possiblelyOverlapsAABB(shape, this.bounds))
            return [];
        if (!this.divided) {
            return Collection.objectValuesToIterable(this.units, shape ? (v) => Shape.overlapsVec(shape, v.vec) : undefined, mapFunc, index);
        }
        if (mapFunc) {
            return Collection.toIterableWithMap(mapFunc, index, () => this.northWest._queryIteratable(shape, undefined, index), () => this.northEast._queryIteratable(shape, undefined, index), () => this.southWest._queryIteratable(shape, undefined, index), () => this.southEast._queryIteratable(shape, undefined, index));
        }
        return Collection.toIterable(() => this.northWest._queryIteratable(shape, undefined, index), () => this.northEast._queryIteratable(shape, undefined, index), () => this.southWest._queryIteratable(shape, undefined, index), () => this.southEast._queryIteratable(shape, undefined, index));
    }
    queryIteratable(mapFuncOrShape, shape) {
        if (typeof mapFuncOrShape === 'function') {
            return this._queryIteratable(shape, mapFuncOrShape, { index: 0 });
        }
        else {
            return this._queryIteratable(undefined, undefined, { index: 0 });
        }
    }
    _queryReduce(shape, callbackFunc, initialValue, index) {
        if (shape && !Shape.possiblelyOverlapsAABB(shape, this.bounds)) {
            return initialValue;
        }
        let value = initialValue;
        if (!this.divided) {
            if (shape) {
                // eslint-disable-next-line guard-for-in
                for (const k in this.units) {
                    const unit = this.units[k];
                    if (Shape.overlapsVec(shape, unit.vec)) {
                        value = callbackFunc(value, unit, index.index++);
                    }
                }
            }
            else {
                // eslint-disable-next-line guard-for-in
                for (const k in this.units) {
                    const unit = this.units[k];
                    value = callbackFunc(value, unit, index.index++);
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
    queryReduce(shapeOrCallbackFunc, callbackFuncOrInitialValue, initialValue) {
        if (typeof shapeOrCallbackFunc === 'function') {
            return this._queryReduce(undefined, shapeOrCallbackFunc, callbackFuncOrInitialValue, { index: 0 });
        }
        else {
            return this._queryReduce(shapeOrCallbackFunc, callbackFuncOrInitialValue, initialValue, { index: 0 });
        }
    }
    queryArray(shape) {
        return this._queryReduce(shape, (arr, v) => {
            arr.push(v);
            return arr;
        }, [], { index: 0 });
    }
    queryForEach(shapeOrForeachFunc, foreachFunc) {
        if (typeof shapeOrForeachFunc === 'function') {
            this._queryReduce(undefined, (_, v, index) => shapeOrForeachFunc(v, index), undefined, { index: 0 });
        }
        else {
            if (!foreachFunc)
                return;
            this._queryReduce(shapeOrForeachFunc, (_, v, index) => foreachFunc(v, index), undefined, { index: 0 });
        }
    }
    queryMap(shapeOrMapFunc, mapFunc) {
        if (typeof shapeOrMapFunc === 'function') {
            if (!mapFunc)
                return [];
            return this._queryReduce(undefined, (arr, v, index) => {
                arr.push(shapeOrMapFunc(v, index));
                return arr;
            }, [], { index: 0 });
        }
        else {
            if (!mapFunc)
                return [];
            return this._queryReduce(shapeOrMapFunc, (arr, v, index) => {
                arr.push(mapFunc(v, index));
                return arr;
            }, [], { index: 0 });
        }
    }
    querySize(shape) {
        return this._queryReduce(shape, (size) => size + 1, 0, { index: 0 });
    }
    _dumpToString(result) {
        const prefix = '            '.substring(0, this.depth);
        if (!this.divided) {
            result.push(prefix);
            result.push(JSON.stringify(this.units));
            result.push('\n');
            return result;
        }
        for (const child of [
            { str: 'NW', qt: this.northWest },
            { str: 'NE', qt: this.northEast },
            { str: 'SW', qt: this.southWest },
            { str: 'SE', qt: this.southEast },
        ]) {
            result.push(prefix);
            result.push(child.str);
            result.push(` (${child.qt.size}):\n`);
            child.qt._dumpToString(result);
        }
        return result;
    }
    toString() {
        return this._dumpToString([]).join('');
    }
}
QuadTree.MaxElements = 8;
QuadTree.MaxDepth = 8;
QuadTree.UniqueUnitAtPositionKeyFunc = (vec, _, quadTree) => quadTree.options.integerCoordinate ?
    vec.x + (quadTree.bounds.size.x * 2) * vec.y :
    `${vec.x},${vec.y}`;

class QuadTreePositionOutOfBoundsError extends Error {
    constructor(message) {
        super(message);
    }
}
class QuadTreeSet {
    constructor(bounds, options) {
        this.quardTree = new QuadTree(bounds, options);
        this.unitPositionGetter = options.unitPositionGetter;
    }
    get size() {
        return this.quardTree.size;
    }
    get bounds() {
        return this.quardTree.bounds;
    }
    add(t) {
        const position = this.unitPositionGetter(t);
        if (!this.quardTree.add(position, t)) {
            throw new QuadTreePositionOutOfBoundsError(`position ${JSON.stringify(position)} is out of bounds:` +
                ` ${JSON.stringify(this.quardTree.bounds)}`);
        }
        return this;
    }
    move(t, to) {
        return this.quardTree.move(this.unitPositionGetter(t), to, t);
    }
    delete(t) {
        return this.quardTree.delete(this.unitPositionGetter(t), t);
    }
    has(t) {
        return this.quardTree.has(this.unitPositionGetter(t), t);
    }
    clear() {
        this.quardTree.clear();
    }
    forEach(callbackfn, thisArg) {
        return this.quardTree.queryReduce((_, p) => void (callbackfn(p.unit, p.unit, thisArg)), void (0));
    }
    entries() {
        return this.quardTree.queryIteratable((p) => [p.unit, p.unit]);
    }
    keys() {
        return this.values();
    }
    values() {
        return this.quardTree.queryIteratable((p) => p.unit);
    }
    get [Symbol.toStringTag]() {
        return this.quardTree.toString();
    }
    [Symbol.iterator]() {
        return this.values();
    }
    queryIteratable(shape) {
        return this.quardTree.queryIteratable(shape);
    }
    queryReduce(shapeOrCallbackFunc, callbackFuncOrInitialValue, initialValue) {
        return this.quardTree.queryReduce(shapeOrCallbackFunc, callbackFuncOrInitialValue, initialValue);
    }
    queryArray(shape) {
        return this.quardTree.queryArray(shape);
    }
    queryForEach(shapeOrForeachFunc, foreachFunc) {
        this.quardTree.queryForEach(shapeOrForeachFunc, foreachFunc);
    }
    queryMap(shapeOrMapFunc, mapFunc) {
        return this.quardTree.queryMap(shapeOrMapFunc, mapFunc);
    }
    querySize(shape) {
        return this.quardTree.querySize(shape);
    }
}
QuadTreeSet.UniqueUnitAtVecKeyFunc = QuadTree.UniqueUnitAtPositionKeyFunc;

export { AABB, Collection, QuadTree, QuadTreeSet, Shape };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5lcy5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbGxlY3Rpb24udHMiLCIuLi8uLi9zcmMvc2hhcGUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWVTZXQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgdHlwZSBDb2xsZWN0aW9uPFQ+ID0gSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCB0eXBlIEl0ZXJhYmxlPFQ+ID0gSXRlcmFibGVJdGVyYXRvcjxUPiB8IEFycmF5PFQ+O1xuZXhwb3J0IG5hbWVzcGFjZSBDb2xsZWN0aW9uIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIHRvQXJyYXk8VD4oYzogQ29sbGVjdGlvbjxUPikge1xuICAgIGlmIChjIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIHJldHVybiBjO1xuICAgIH1cbiAgICBjb25zdCByOiBUW10gPSBbXTtcbiAgICBpZiAoKGMgYXMgR2VuZXJhdG9yPFQ+KVtTeW1ib2wuaXRlcmF0b3JdKSB7XG4gICAgICBmb3IgKGNvbnN0IGkgb2YgKGMgYXMgR2VuZXJhdG9yPFQ+KSkge1xuICAgICAgICByLnB1c2goaSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgbGV0IGkgPSBjLm5leHQoKTtcbiAgICB3aGlsZSAoIWkuZG9uZSkge1xuICAgICAgci5wdXNoKGkudmFsdWUpO1xuICAgICAgaSA9IGMubmV4dCgpO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGU8VD4oXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKHVuZGVmaW5lZCB8ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KSlbXVxuICApIHtcbiAgICBmb3IgKGNvbnN0IGZ1bmMgb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgIGlmICghZnVuYykgY29udGludWU7XG4gICAgICBjb25zdCBpdGVyYXRvciA9IGZ1bmMoKTtcbiAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGl0ZXJhdG9yKSB7XG4gICAgICAgICAgeWllbGQgcmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGVXaXRoRmlsdGVyPFQ+KFxuICAgICAgZmlsdGVyRnVuYzogKChvOiBULCBpZHg6IG51bWJlcikgPT4gYm9vbGVhbiksXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICh1bmRlZmluZWQgfCBDb2xsZWN0aW9uPFQ+IHwgKCgpID0+IENvbGxlY3Rpb248VD4pKVtdXG4gICkge1xuICAgIGlmICghZmlsdGVyRnVuYykge1xuICAgICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICAgIGlmICghZnVuYykgY29udGludWU7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0gdHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbicgPyBmdW5jKCkgOiBmdW5jO1xuICAgICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGl0ZXJhdG9yKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgICAgICBpbmRleC5pbmRleCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICAgIHlpZWxkIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICAgIGluZGV4LmluZGV4Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IHR5cGVvZiBmdW5jID09PSAnZnVuY3Rpb24nID8gZnVuYygpIDogZnVuYztcbiAgICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgICAgaWYgKGZpbHRlckZ1bmMocmVzdWx0LCBpbmRleC5pbmRleCsrKSkge1xuICAgICAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgICAgaWYgKGZpbHRlckZ1bmMocmVzdWx0LnZhbHVlLCBpbmRleC5pbmRleCsrKSkge1xuICAgICAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiogdG9JdGVyYWJsZVdpdGhNYXA8VCwgQT4oXG4gICAgICBtYXBGdW5jOiAoKG86IFQsIGlkeDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIGluZGV4OiB7aW5kZXg6IG51bWJlcn0sXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKHVuZGVmaW5lZCB8IENvbGxlY3Rpb248VD4gfCAoKCkgPT4gQ29sbGVjdGlvbjxUPikpW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJyA/IGZ1bmMoKSA6IGZ1bmM7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0LCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0LnZhbHVlLCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiBvYmplY3RWYWx1ZXNUb0l0ZXJhYmxlPFQsIEE+KFxuICAgICAgb2JqZWN0OiBSZWNvcmQ8c3RyaW5nLCBUPixcbiAgICAgIGZpbHRlckZ1bmM6IHVuZGVmaW5lZCB8ICgobzogVCwgaWR4OiBudW1iZXIpID0+IGJvb2xlYW4pLFxuICAgICAgbWFwRnVuYzogdW5kZWZpbmVkIHwgKChvOiBULCBpZHg6IG51bWJlcikgPT4gQSksXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApIHtcbiAgICBpZiAoZmlsdGVyRnVuYykge1xuICAgICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgICAgICAgIGlmICghZmlsdGVyRnVuYyh2YWx1ZSwgaW5kZXguaW5kZXgpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyh2YWx1ZSwgaW5kZXguaW5kZXgrKyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmModmFsdWUsIGluZGV4LmluZGV4KSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHlpZWxkIHZhbHVlO1xuICAgICAgICAgIGluZGV4LmluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICB5aWVsZCBtYXBGdW5jKG9iamVjdFtrZXldLCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICB5aWVsZCBvYmplY3Rba2V5XTtcbiAgICAgICAgICBpbmRleC5pbmRleCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCJleHBvcnQgaW50ZXJmYWNlIFZlYzIge1xuICB4OiBudW1iZXI7XG4gIHk6IG51bWJlcjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgQUFCQiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogVmVjMjtcbn1cbmV4cG9ydCBuYW1lc3BhY2UgQUFCQiB7XG4gIGV4cG9ydCBmdW5jdGlvbiBvdmVybGFwc1ZlYyhhYWJiOiBBQUJCLCB2ZWM6IFZlYzIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYWFiYi5jZW50ZXIueCAtIGFhYmIuc2l6ZS54IDw9IHZlYy54ICYmXG4gICAgICB2ZWMueCA8PSBhYWJiLmNlbnRlci54ICsgYWFiYi5zaXplLnggJiZcbiAgICAgIGFhYmIuY2VudGVyLnkgLSBhYWJiLnNpemUueSA8PSB2ZWMueSAmJlxuICAgICAgdmVjLnkgPD0gYWFiYi5jZW50ZXIueSArIGFhYmIuc2l6ZS55O1xuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBvdmVybGFwc0FBQkIob25lOiBBQUJCLCBhbm90aGVyOiBBQUJCKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEoXG4gICAgICBhbm90aGVyLmNlbnRlci54IC0gYW5vdGhlci5zaXplLnggPiBvbmUuY2VudGVyLnggKyBvbmUuc2l6ZS54IHx8XG4gICAgICBhbm90aGVyLmNlbnRlci54ICsgYW5vdGhlci5zaXplLnggPCBvbmUuY2VudGVyLnggLSBvbmUuc2l6ZS54IHx8XG4gICAgICBhbm90aGVyLmNlbnRlci55IC0gYW5vdGhlci5zaXplLnkgPiBvbmUuY2VudGVyLnkgKyBvbmUuc2l6ZS55IHx8XG4gICAgICBhbm90aGVyLmNlbnRlci55ICsgYW5vdGhlci5zaXplLnkgPCBvbmUuY2VudGVyLnkgLSBvbmUuc2l6ZS55XG4gICAgKTtcbiAgfVxufVxudHlwZSBSZWN0YW5nbGVTaGFwZSA9IHtcbiAgdHlwZTogJ3JlY3RhbmdsZSdcbn0gJiBBQUJCO1xudHlwZSBFbGxpcHNlU2hhcGUgPSB7XG4gIHR5cGU6ICdlbGxpcHNlJ1xufSAmIEFBQkI7XG50eXBlIENpcmNsZVNoYXBlID0ge1xuICB0eXBlOiAnY2lyY2xlJ1xufSAmIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBudW1iZXI7XG59O1xudHlwZSBTcXVhcmVTaGFwZSA9IHtcbiAgdHlwZTogJ3NxdWFyZSdcbn0gJiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogbnVtYmVyO1xufTtcbmV4cG9ydCB0eXBlIFNoYXBlID0gUmVjdGFuZ2xlU2hhcGUgfCBFbGxpcHNlU2hhcGUgfCBDaXJjbGVTaGFwZSB8IFNxdWFyZVNoYXBlO1xuZXhwb3J0IG5hbWVzcGFjZSBTaGFwZSB7XG4gIGV4cG9ydCBmdW5jdGlvbiBvdmVybGFwc1ZlYyhzaGFwZTogU2hhcGUsIHZlYzogVmVjMik6IGJvb2xlYW4ge1xuICAgIHN3aXRjaCAoc2hhcGUudHlwZSkge1xuICAgICAgY2FzZSAncmVjdGFuZ2xlJzogcmV0dXJuIEFBQkIub3ZlcmxhcHNWZWMoc2hhcGUsIHZlYyk7XG4gICAgICBjYXNlICdzcXVhcmUnOiByZXR1cm4gQUFCQi5vdmVybGFwc1ZlYyh7XG4gICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICB9LCB2ZWMpO1xuICAgICAgY2FzZSAnY2lyY2xlJzogcmV0dXJuIFNoYXBlLm92ZXJsYXBzVmVjKHtcbiAgICAgICAgdHlwZTogJ2VsbGlwc2UnLFxuICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgfSwgdmVjKTtcbiAgICAgIGNhc2UgJ2VsbGlwc2UnOiB7XG4gICAgICAgIGNvbnN0IHAgPVxuICAgICAgICAgIE1hdGgucG93KHZlYy54IC0gc2hhcGUuY2VudGVyLngsIDIpIC8gTWF0aC5wb3coc2hhcGUuc2l6ZS54LCAyKSArXG4gICAgICAgICAgTWF0aC5wb3codmVjLnkgLSBzaGFwZS5jZW50ZXIueSwgMikgLyBNYXRoLnBvdyhzaGFwZS5zaXplLnksIDIpO1xuICAgICAgICByZXR1cm4gcCA8PSAxO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIHBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGU6IFNoYXBlLCBhYWJiOiBBQUJCKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoIChzaGFwZS50eXBlKSB7XG4gICAgICBjYXNlICdlbGxpcHNlJzpcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6XG4gICAgICAgIHJldHVybiBBQUJCLm92ZXJsYXBzQUFCQihzaGFwZSwgYWFiYik7XG4gICAgICBjYXNlICdjaXJjbGUnOlxuICAgICAgY2FzZSAnc3F1YXJlJzpcbiAgICAgICAgcmV0dXJuIEFBQkIub3ZlcmxhcHNBQUJCKHtcbiAgICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICAgIH0sIGFhYmIpO1xuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlY3RhbmdsZShjZW50ZXI6IFZlYzIsIHNpemU6IFZlYzIgfCBudW1iZXIpOiBTaGFwZSB7XG4gICAgaWYgKHR5cGVvZiBzaXplID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3NxdWFyZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdyZWN0YW5nbGUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlRWxsaXBzZShjZW50ZXI6IFZlYzIsIHNpemU6IFZlYzIgfCBudW1iZXIpOiBTaGFwZSB7XG4gICAgaWYgKHR5cGVvZiBzaXplID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2NpcmNsZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdlbGxpcHNlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7Q29sbGVjdGlvbiwgSXRlcmFibGV9IGZyb20gJy4vY29sbGVjdGlvbic7XG5pbXBvcnQge1ZlYzIsIEFBQkIsIFNoYXBlfSBmcm9tICcuL3NoYXBlJztcblxuZXhwb3J0IHR5cGUgUXVhZFRyZWVVbml0S2V5RnVuYzxUPiA9IChcbiAgdmVjOiBWZWMyLCB1bml0OiBULCBxdWFkVHJlZTogUXVhZFRyZWU8VD5cbikgPT4gc3RyaW5nIHwgbnVtYmVyO1xuZXhwb3J0IHR5cGUgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+ID0gKFxuICAgIGFjYzogQSxcbiAgICBwcmV2aW91czoge3ZlYzogVmVjMiwgdW5pdD86IFR9LFxuICAgIGluZGV4OiBudW1iZXIsXG4pID0+IEEgfCB1bmRlZmluZWQ7XG5leHBvcnQgaW50ZXJmYWNlIFF1YWRUcmVlT3B0aW9uczxUPiB7XG4gIHVuaXRLZXlHZXR0ZXI6IFF1YWRUcmVlVW5pdEtleUZ1bmM8VD4sXG4gIGludGVnZXJDb29yZGluYXRlPzogYm9vbGVhbixcbn1cbmV4cG9ydCBpbnRlcmZhY2UgUmVhZG9ubHlRdWFkVHJlZTxUPiB7XG4gIHJlYWRvbmx5IGJvdW5kczogQUFCQjtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyXG4gIGhhcyh2ZWM6IFZlYzIsIHVuaXQ/OiBUKTogYm9vbGVhbjtcbiAgcXVlcnlJdGVyYXRhYmxlPEE+KFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSkgPT4gQSxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+O1xuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcblxuICBxdWVyeU1hcDxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeVNpemUoXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICk6IG51bWJlcjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZTxUPiBpbXBsZW1lbnRzIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICBzdGF0aWMgTWF4RWxlbWVudHMgPSA4O1xuICBzdGF0aWMgTWF4RGVwdGggPSA4O1xuICBzdGF0aWMgVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jID0gKFxuICAgICAgdmVjOiBWZWMyLFxuICAgICAgXzogYW55LFxuICAgICAgcXVhZFRyZWU6IFF1YWRUcmVlPGFueT4sXG4gICkgPT5cbiAgICBxdWFkVHJlZS5vcHRpb25zLmludGVnZXJDb29yZGluYXRlID9cbiAgICAgIHZlYy54ICsgKHF1YWRUcmVlLmJvdW5kcy5zaXplLnggKiAyKSAqIHZlYy55IDpcbiAgICAgIGAke3ZlYy54fSwke3ZlYy55fWA7XG5cbiAgYm91bmRzOiBBQUJCO1xuXG4gIHByaXZhdGUgZGVwdGg6IG51bWJlcjtcblxuICBwcml2YXRlIGRpdmlkZWQ6IGJvb2xlYW47XG5cbiAgcHJpdmF0ZSB1bml0czoge1trZXk6IHN0cmluZyB8IG51bWJlcl06IHt1bml0OiBULCB2ZWM6IFZlYzJ9fTtcblxuICBwcml2YXRlIG5vcnRoV2VzdCE6IFF1YWRUcmVlPFQ+O1xuICBwcml2YXRlIG5vcnRoRWFzdCE6IFF1YWRUcmVlPFQ+O1xuICBwcml2YXRlIHNvdXRoV2VzdCE6IFF1YWRUcmVlPFQ+O1xuICBwcml2YXRlIHNvdXRoRWFzdCE6IFF1YWRUcmVlPFQ+O1xuICBwcml2YXRlIF9zaXplOiBudW1iZXI7XG5cbiAgZ2V0IHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NpemU7XG4gIH1cblxuICByZWFkb25seSBvcHRpb25zOiBRdWFkVHJlZU9wdGlvbnM8VD47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBib3VuZHM6IEFBQkIsXG4gICAgICBvcHRpb25zPzogUXVhZFRyZWVPcHRpb25zPFQ+LFxuICAgICAgZGVwdGg6IG51bWJlciA9IDAsXG4gICkge1xuICAgIHRoaXMuYm91bmRzID0gYm91bmRzO1xuICAgIHRoaXMuZGVwdGggPSBkZXB0aDtcbiAgICB0aGlzLmRpdmlkZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVuaXRzID0ge307XG4gICAgdGhpcy5fc2l6ZSA9IDA7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7XG4gICAgICB1bml0S2V5R2V0dGVyOiBRdWFkVHJlZS5VbmlxdWVVbml0QXRQb3NpdGlvbktleUZ1bmMsXG4gICAgfTtcbiAgfVxuICBfYWRkKHZlYzogVmVjMiwgdW5pdDogVCk6IGZhbHNlIHwgJ2FkZGVkJyB8ICdleGlzdGluZycge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdmVjKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLmRlcHRoID09IFF1YWRUcmVlLk1heERlcHRoIHx8XG4gICAgICAhdGhpcy5kaXZpZGVkICYmIHRoaXMuc2l6ZSA8IFF1YWRUcmVlLk1heEVsZW1lbnRzKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih2ZWMsIHVuaXQsIHRoaXMpO1xuICAgICAgbGV0IHJlc3VsdDogJ2V4aXN0aW5nJyB8ICdhZGRlZCcgPSAnZXhpc3RpbmcnO1xuICAgICAgaWYgKCF0aGlzLnVuaXRzW2tleV0pIHtcbiAgICAgICAgdGhpcy5fc2l6ZSArKztcbiAgICAgICAgcmVzdWx0ID0gJ2FkZGVkJztcbiAgICAgIH1cbiAgICAgIHRoaXMudW5pdHNba2V5XSA9IHt2ZWMsIHVuaXR9O1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHRoaXMuZGl2aWRlKCk7XG4gICAgY29uc3QgaW5zZXJ0ZWQgPSB0aGlzLm5vcnRoV2VzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5fYWRkKHZlYywgdW5pdCk7XG4gICAgaWYgKGluc2VydGVkID09PSAnYWRkZWQnKSB0aGlzLl9zaXplICsrO1xuICAgIHJldHVybiBpbnNlcnRlZDtcbiAgfVxuICBhZGQodmVjOiBWZWMyLCB1bml0OiBUKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5fYWRkKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBfbW92ZShcbiAgICAgIGZyb206IFZlYzIsXG4gICAgICB0bzogVmVjMiB8IHVuZGVmaW5lZCxcbiAgICAgIHVuaXQ6IFQsXG4gICk6IGZhbHNlIHwgJ3JlbW92ZWQnIHwgJ21vdmVkJyB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCBmcm9tKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcihmcm9tLCB1bml0LCB0aGlzKTtcbiAgICAgIGlmICghdGhpcy51bml0c1trZXldKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0byAmJiBBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB0bykpIHtcbiAgICAgICAgLy8gdXBkYXRlIGluLXBsYWNlXG4gICAgICAgIGNvbnN0IG5ld0tleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKHRvLCB1bml0LCB0aGlzKTtcbiAgICAgICAgaWYgKG5ld0tleSAhPT0ga2V5KSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMudW5pdHNba2V5XTtcbiAgICAgICAgICB0aGlzLnVuaXRzW25ld0tleV0gPSB7dmVjOiB0bywgdW5pdH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy51bml0c1trZXldID0ge3ZlYzogdG8sIHVuaXR9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnbW92ZWQnO1xuICAgICAgfVxuICAgICAgZGVsZXRlIHRoaXMudW5pdHNba2V5XTtcbiAgICAgIHRoaXMuX3NpemUgLS07XG4gICAgICByZXR1cm4gJ3JlbW92ZWQnO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLm5vcnRoV2VzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLm5vcnRoRWFzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLnNvdXRoV2VzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLnNvdXRoRWFzdC5fbW92ZShmcm9tLCB0bywgdW5pdCk7XG4gICAgaWYgKHJlc3VsdCA9PT0gJ3JlbW92ZWQnKSB7XG4gICAgICB0aGlzLl9zaXplIC0tO1xuICAgICAgaWYgKHRvKSB7XG4gICAgICAgIGlmICh0aGlzLmFkZCh0bywgdW5pdCkpIHJldHVybiAnbW92ZWQnO1xuICAgICAgICByZXR1cm4gJ3JlbW92ZWQnO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIG1vdmUoZnJvbTogVmVjMiwgdG86IFZlYzIsIHVuaXQ6IFQpOiBib29sZWFuIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHRvKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLl9tb3ZlKGZyb20sIHRvLCB1bml0KSA9PT0gJ3JlbW92ZWQnKSB0aHJvdyBuZXcgRXJyb3IoJ3VuZXhwZWN0ZWQnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBkZWxldGUodmVjOiBWZWMyLCB1bml0OiBUKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX21vdmUodmVjLCB1bmRlZmluZWQsIHVuaXQpID09PSAncmVtb3ZlZCc7XG4gIH1cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICAgIHRoaXMuX3NpemUgPSAwO1xuICAgIHRoaXMuZGl2aWRlZCA9IGZhbHNlO1xuICAgIHRoaXMubm9ydGhXZXN0ID1cbiAgICAgIHRoaXMubm9ydGhFYXN0ID1cbiAgICAgIHRoaXMuc291dGhXZXN0ID1cbiAgICAgIHRoaXMuc291dGhFYXN0ID0gdW5kZWZpbmVkITtcbiAgfVxuICBoYXModmVjOiBWZWMyLCB1bml0OiBUKTogYm9vbGVhbiB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB2ZWMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKHZlYywgdW5pdCwgdGhpcyk7XG4gICAgICByZXR1cm4gISF0aGlzLnVuaXRzW2tleV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vcnRoV2VzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5oYXModmVjLCB1bml0KTtcbiAgfVxuICBwcml2YXRlIGRpdmlkZSgpIHtcbiAgICB0aGlzLmRpdmlkZWQgPSB0cnVlO1xuICAgIGNvbnN0IGh3ID0gdGhpcy5ib3VuZHMuc2l6ZS54IC8gMjtcbiAgICBjb25zdCBoaCA9IHRoaXMuYm91bmRzLnNpemUueSAvIDI7XG5cbiAgICB0aGlzLm5vcnRoV2VzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCAtIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSAtIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5ub3J0aEVhc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggKyBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgLSBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMuc291dGhXZXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54IC0gaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55ICsgaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLnNvdXRoRWFzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCArIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSArIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG5cbiAgICBmb3IgKGNvbnN0IHt2ZWMsIHVuaXR9IG9mIE9iamVjdC52YWx1ZXModGhpcy51bml0cykpIHtcbiAgICAgIHRoaXMubm9ydGhXZXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aFdlc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhFYXN0LmFkZCh2ZWMsIHVuaXQpO1xuICAgIH1cbiAgICB0aGlzLnVuaXRzID0ge307XG4gIH1cbiAgcHJpdmF0ZSBfcXVlcnlJdGVyYXRhYmxlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICAgICAgbWFwRnVuYzogKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGlkeDogbnVtYmVyKSA9PiBBKSB8IHVuZGVmaW5lZCxcbiAgICAgIGluZGV4OiB7aW5kZXg6IG51bWJlcn0sXG4gICk6IEl0ZXJhYmxlPEE+IHtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkgcmV0dXJuIFtdO1xuXG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIHJldHVybiBDb2xsZWN0aW9uLm9iamVjdFZhbHVlc1RvSXRlcmFibGUoXG4gICAgICAgICAgdGhpcy51bml0cyxcbiAgICAgICAgICBzaGFwZSA/ICh2KSA9PiBTaGFwZS5vdmVybGFwc1ZlYyhzaGFwZSwgdi52ZWMpIDogdW5kZWZpbmVkLFxuICAgICAgICAgIG1hcEZ1bmMsXG4gICAgICAgICAgaW5kZXgsXG4gICAgICApIGFzIEl0ZXJhYmxlPEE+O1xuICAgIH1cbiAgICBpZiAobWFwRnVuYykge1xuICAgICAgcmV0dXJuIENvbGxlY3Rpb24udG9JdGVyYWJsZVdpdGhNYXAoXG4gICAgICAgICAgbWFwRnVuYyxcbiAgICAgICAgICBpbmRleCxcbiAgICAgICAgICAoKSA9PiB0aGlzLm5vcnRoV2VzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICAgICAoKSA9PiB0aGlzLm5vcnRoRWFzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICAgICAoKSA9PiB0aGlzLnNvdXRoV2VzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICAgICAoKSA9PiB0aGlzLnNvdXRoRWFzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBDb2xsZWN0aW9uLnRvSXRlcmFibGUoXG4gICAgICAgICgpID0+IHRoaXMubm9ydGhXZXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICAoKSA9PiB0aGlzLm5vcnRoRWFzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICAgKCkgPT4gdGhpcy5zb3V0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICgpID0+IHRoaXMuc291dGhFYXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICk7XG4gIH1cbiAgcXVlcnlJdGVyYXRhYmxlPEE+KFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaWR4OiBudW1iZXIpID0+IEEsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlJdGVyYXRhYmxlPEE+KFxuICAgICAgbWFwRnVuY09yU2hhcGU/OiAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaWR4OiBudW1iZXIpID0+IEEpIHwgU2hhcGUsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPiB7XG4gICAgaWYgKHR5cGVvZiBtYXBGdW5jT3JTaGFwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgbWFwRnVuY09yU2hhcGUsIHtpbmRleDogMH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlJdGVyYXRhYmxlKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB7aW5kZXg6IDB9KTtcbiAgICB9XG4gIH1cbiAgcHJpdmF0ZSBfcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZTogQSB8IHVuZGVmaW5lZCxcbiAgICAgIGluZGV4OiB7aW5kZXg6IG51bWJlcn0sXG4gICk6IEEge1xuICAgIGlmIChzaGFwZSAmJiAhU2hhcGUucG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZSwgdGhpcy5ib3VuZHMpKSB7XG4gICAgICByZXR1cm4gaW5pdGlhbFZhbHVlITtcbiAgICB9XG4gICAgbGV0IHZhbHVlOiBBID0gaW5pdGlhbFZhbHVlITtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgaWYgKHNoYXBlKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrIGluIHRoaXMudW5pdHMpIHtcbiAgICAgICAgICBjb25zdCB1bml0ID0gdGhpcy51bml0c1trXTtcbiAgICAgICAgICBpZiAoU2hhcGUub3ZlcmxhcHNWZWMoc2hhcGUsIHVuaXQudmVjKSkge1xuICAgICAgICAgICAgdmFsdWUgPSBjYWxsYmFja0Z1bmModmFsdWUsIHVuaXQsIGluZGV4LmluZGV4KyspITtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrIGluIHRoaXMudW5pdHMpIHtcbiAgICAgICAgICBjb25zdCB1bml0ID0gdGhpcy51bml0c1trXTtcbiAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrRnVuYyh2YWx1ZSwgdW5pdCwgaW5kZXguaW5kZXgrKykhO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHZhbHVlID0gdGhpcy5ub3J0aFdlc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlLCBpbmRleCk7XG4gICAgdmFsdWUgPSB0aGlzLm5vcnRoRWFzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUsIGluZGV4KTtcbiAgICB2YWx1ZSA9IHRoaXMuc291dGhXZXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHZhbHVlID0gdGhpcy5zb3V0aEVhc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlLCBpbmRleCk7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYzogU2hhcGUgfCBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZTogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+IHwgQSxcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JDYWxsYmFja0Z1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZShcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyxcbiAgICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBBLFxuICAgICAgICAgIHtpbmRleDogMH0sXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2UoXG4gICAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyxcbiAgICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICAgICAgaW5pdGlhbFZhbHVlLFxuICAgICAgICAgIHtpbmRleDogMH0sXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+IHtcbiAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9Pj4oXG4gICAgICAgIHNoYXBlLFxuICAgICAgICAoYXJyLCB2KSA9PiB7XG4gICAgICAgICAgYXJyLnB1c2godik7XG4gICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgfSxcbiAgICAgICAgW10sXG4gICAgICAgIHtpbmRleDogMH0sXG4gICAgKTtcbiAgfVxuXG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGVPckZvcmVhY2hGdW5jOlxuICAgICAgICBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkKSxcbiAgICAgIGZvcmVhY2hGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKSB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yRm9yZWFjaEZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UmVkdWNlPHZvaWQ+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoXywgdiwgaW5kZXgpID0+IHNoYXBlT3JGb3JlYWNoRnVuYyh2LCBpbmRleCksXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIHtpbmRleDogMH0sXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWZvcmVhY2hGdW5jKSByZXR1cm47XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICBzaGFwZU9yRm9yZWFjaEZ1bmMsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBmb3JlYWNoRnVuYyh2LCBpbmRleCksXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIHtpbmRleDogMH0sXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGVPck1hcEZ1bmM6IFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEpLFxuICAgICAgbWFwRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+IHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JNYXBGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoIW1hcEZ1bmMpIHJldHVybiBbXTtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTxBPj4oXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChzaGFwZU9yTWFwRnVuYyh2LCBpbmRleCkpO1xuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdLFxuICAgICAgICAgIHtpbmRleDogMH0sXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIW1hcEZ1bmMpIHJldHVybiBbXTtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTxBPj4oXG4gICAgICAgICAgc2hhcGVPck1hcEZ1bmMsXG4gICAgICAgICAgKGFyciwgdiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGFyci5wdXNoKG1hcEZ1bmModiwgaW5kZXgpKTtcbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBbXSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgcXVlcnlTaXplKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICApOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxudW1iZXI+KFxuICAgICAgICBzaGFwZSxcbiAgICAgICAgKHNpemUpID0+IHNpemUgKyAxLFxuICAgICAgICAwLFxuICAgICAgICB7aW5kZXg6IDB9LFxuICAgICk7XG4gIH1cbiAgX2R1bXBUb1N0cmluZyhyZXN1bHQ6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgcHJlZml4ID0gJyAgICAgICAgICAgICcuc3Vic3RyaW5nKDAsIHRoaXMuZGVwdGgpO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICByZXN1bHQucHVzaChwcmVmaXgpO1xuICAgICAgcmVzdWx0LnB1c2goSlNPTi5zdHJpbmdpZnkodGhpcy51bml0cykpO1xuICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBbXG4gICAgICB7c3RyOiAnTlcnLCBxdDogdGhpcy5ub3J0aFdlc3R9LFxuICAgICAge3N0cjogJ05FJywgcXQ6IHRoaXMubm9ydGhFYXN0fSxcbiAgICAgIHtzdHI6ICdTVycsIHF0OiB0aGlzLnNvdXRoV2VzdH0sXG4gICAgICB7c3RyOiAnU0UnLCBxdDogdGhpcy5zb3V0aEVhc3R9LFxuICAgIF0pIHtcbiAgICAgIHJlc3VsdC5wdXNoKHByZWZpeCk7XG4gICAgICByZXN1bHQucHVzaChjaGlsZC5zdHIpO1xuICAgICAgcmVzdWx0LnB1c2goYCAoJHtjaGlsZC5xdC5zaXplfSk6XFxuYCk7XG4gICAgICBjaGlsZC5xdC5fZHVtcFRvU3RyaW5nKHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZHVtcFRvU3RyaW5nKFtdKS5qb2luKCcnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtcbiAgUXVhZFRyZWUsXG4gIFF1YWRUcmVlT3B0aW9ucyxcbn0gZnJvbSAnLi9RdWFkVHJlZSc7XG5pbXBvcnQge0FBQkIsIFNoYXBlLCBWZWMyfSBmcm9tICcuL3NoYXBlJztcblxuZXhwb3J0IHR5cGUgUXVhZE1hcFVuaXRQb3NpdGlvbkdldHRlckZ1bmM8VD4gPSAobzogVCkgPT4gVmVjMjtcbmV4cG9ydCB0eXBlIFF1YWRNYXBVbml0UG9zaXRpb25TZXR0ZXJGdW5jPFQ+ID0gKG86IFQsIHBvc2l0aW9uOiBWZWMyKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+ID0gKFxuICBhY2M6IEEsXG4gIHByZXZpb3VzOiB7dmVjOiBWZWMyLCB1bml0OiBUfSxcbiAgaW5kZXg6IG51bWJlcixcbikgPT4gQSB8IHVuZGVmaW5lZDtcbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVBvc2l0aW9uT3V0T2ZCb3VuZHNFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gIH1cbn1cbmV4cG9ydCBpbnRlcmZhY2UgUmVhZG9ubHlRdWFkVHJlZVNldDxUPiBleHRlbmRzIFJlYWRvbmx5U2V0PFQ+IHtcbiAgcmVhZG9ubHkgYm91bmRzOiBBQUJCO1xuICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBTZXRJdGVyYXRvcjxUPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT47XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0OiBUfT47XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xufVxuZXhwb3J0IGNsYXNzIFF1YWRUcmVlU2V0PFQ+IGltcGxlbWVudHMgU2V0PFQ+LCBSZWFkb25seVF1YWRUcmVlU2V0PFQ+IHtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFZlY0tleUZ1bmMgPSBRdWFkVHJlZS5VbmlxdWVVbml0QXRQb3NpdGlvbktleUZ1bmM7XG4gIHByaXZhdGUgcXVhcmRUcmVlOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSB1bml0UG9zaXRpb25HZXR0ZXI6IFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+O1xuICBjb25zdHJ1Y3Rvcihib3VuZHM6IEFBQkIsIG9wdGlvbnM6IFF1YWRUcmVlT3B0aW9uczxUPiAmIHtcbiAgICB1bml0UG9zaXRpb25HZXR0ZXI6IFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+LFxuICB9KSB7XG4gICAgdGhpcy5xdWFyZFRyZWUgPSBuZXcgUXVhZFRyZWUoYm91bmRzLCBvcHRpb25zKTtcbiAgICB0aGlzLnVuaXRQb3NpdGlvbkdldHRlciA9IG9wdGlvbnMudW5pdFBvc2l0aW9uR2V0dGVyO1xuICB9XG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5zaXplO1xuICB9XG4gIGdldCBib3VuZHMoKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLmJvdW5kcztcbiAgfVxuICBhZGQodDogVCkge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCk7XG4gICAgaWYgKCF0aGlzLnF1YXJkVHJlZS5hZGQocG9zaXRpb24sIHQpKSB7XG4gICAgICB0aHJvdyBuZXcgUXVhZFRyZWVQb3NpdGlvbk91dE9mQm91bmRzRXJyb3IoXG4gICAgICAgICAgYHBvc2l0aW9uICR7SlNPTi5zdHJpbmdpZnkocG9zaXRpb24pfSBpcyBvdXQgb2YgYm91bmRzOmAgK1xuICAgICAgICAgIGAgJHtKU09OLnN0cmluZ2lmeSh0aGlzLnF1YXJkVHJlZS5ib3VuZHMpfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBtb3ZlKHQ6IFQsIHRvOiBWZWMyKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLm1vdmUodGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHRvLCB0KTtcbiAgfVxuICBkZWxldGUodDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5kZWxldGUodGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGhhcyh0OiBUKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLmhhcyh0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KSwgdCk7XG4gIH1cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5xdWFyZFRyZWUuY2xlYXIoKTtcbiAgfVxuICBmb3JFYWNoKFxuICAgICAgY2FsbGJhY2tmbjogKHZhbHVlOiBULCB2YWx1ZTI6IFQsIHNldDogU2V0PFQ+KSA9PiB2b2lkLFxuICAgICAgdGhpc0FyZz86IGFueSxcbiAgKTogdm9pZCB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5UmVkdWNlKFxuICAgICAgICAoXywgcCkgPT4gdm9pZChjYWxsYmFja2ZuKHAudW5pdCEsIHAudW5pdCEsIHRoaXNBcmcpKSxcbiAgICAgICAgdm9pZCgwKSxcbiAgICApO1xuICB9XG4gIGVudHJpZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZTxbVCwgVF0+KFxuICAgICAgICAocCkgPT4gW3AudW5pdCEsIHAudW5pdCFdKSBhcyBhbnk7XG4gIH1cbiAga2V5cygpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMoKTtcbiAgfVxuICB2YWx1ZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZTxUPihcbiAgICAgICAgKHApID0+IHAudW5pdCEpIGFzIGFueTtcbiAgfVxuICBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUudG9TdHJpbmcoKTtcbiAgfVxuICBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMoKTtcbiAgfVxuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSkgYXNcbiAgICAgIEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PjtcbiAgfVxuXG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmM6IFNoYXBlIHwgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWU6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiB8IEEsXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5UmVkdWNlKFxuICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jIGFzIFNoYXBlLFxuICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBhbnksXG4gICAgICAgIGluaXRpYWxWYWx1ZSk7XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdDogVH0+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlBcnJheShzaGFwZSkgYXMgYW55O1xuICB9XG5cbiAgcXVlcnlGb3JFYWNoKFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGVPckZvcmVhY2hGdW5jOlxuICAgICAgICBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQpLFxuICAgICAgZm9yZWFjaEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIHRoaXMucXVhcmRUcmVlLnF1ZXJ5Rm9yRWFjaChzaGFwZU9yRm9yZWFjaEZ1bmMgYXMgYW55LCBmb3JlYWNoRnVuYyBhcyBhbnkpO1xuICB9XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGVPck1hcEZ1bmM6IFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSksXG4gICAgICBtYXBGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5TWFwKHNoYXBlT3JNYXBGdW5jIGFzIFNoYXBlLCBtYXBGdW5jIGFzIGFueSk7XG4gIH1cbiAgcXVlcnlTaXplKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICApOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVNpemUoc2hhcGUpO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFHTSxJQUFXLFdBa0poQjtBQWxKRCxDQUFBLFVBQWlCLFVBQVUsRUFBQTtJQUN6QixTQUFnQixPQUFPLENBQUksQ0FBZ0IsRUFBQTtBQUN6QyxRQUFBLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRTtBQUN0QixZQUFBLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFDRCxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUM7QUFDbEIsUUFBQSxJQUFLLENBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO0FBQ3hDLFlBQUEsS0FBSyxNQUFNLENBQUMsSUFBSyxDQUFrQixFQUFFO0FBQ25DLGdCQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDWDtBQUNELFlBQUEsT0FBTyxDQUFDLENBQUM7U0FDVjtBQUNELFFBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2pCLFFBQUEsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7QUFDZCxZQUFBLENBQUMsQ0FBQyxJQUFJ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SUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2RCxRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUM7WUFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7WUFDcEUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFDO1NBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdkQsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksUUFBUSxDQUFDO1lBQzVCLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO1lBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQztTQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztZQUM1QixNQUFNLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQztZQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxF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
