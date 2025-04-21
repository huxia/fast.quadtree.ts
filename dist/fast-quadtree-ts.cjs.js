
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.1.2
   * Released under the MIT license.
   */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

exports.Collection = void 0;
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
        for (const funcOrCollection of childIterators) {
            if (!funcOrCollection)
                continue;
            const iterator = typeof funcOrCollection === 'function' ?
                funcOrCollection() : funcOrCollection;
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
            for (const funcOrCollection of childIterators) {
                if (!funcOrCollection)
                    continue;
                const iterator = typeof funcOrCollection === 'function' ?
                    funcOrCollection() : funcOrCollection;
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
        for (const funcOrCollection of childIterators) {
            if (!funcOrCollection)
                continue;
            const iterator = typeof funcOrCollection === 'function' ?
                funcOrCollection() : funcOrCollection;
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
})(exports.Collection || (exports.Collection = {}));

exports.AABB = void 0;
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
})(exports.AABB || (exports.AABB = {}));
exports.Shape = void 0;
(function (Shape) {
    function overlapsVec(shape, vec) {
        switch (shape.type) {
            case 'rectangle': return exports.AABB.overlapsVec(shape, vec);
            case 'square': return exports.AABB.overlapsVec({
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
                return exports.AABB.overlapsAABB(shape, aabb);
            case 'circle':
            case 'square':
                return exports.AABB.overlapsAABB({
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
})(exports.Shape || (exports.Shape = {}));

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
        this.options = {
            unitKeyGetter: (options === null || options === void 0 ? void 0 : options.unitKeyGetter) || QuadTree.UniqueUnitAtPositionKeyFunc,
        };
    }
    _add(vec, unit) {
        if (!exports.AABB.overlapsVec(this.bounds, vec))
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
        if (!exports.AABB.overlapsVec(this.bounds, from))
            return false;
        if (!this.divided) {
            const key = this.options.unitKeyGetter(from, unit, this);
            if (!this.units[key]) {
                return false;
            }
            if (to && exports.AABB.overlapsVec(this.bounds, to)) {
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
        if (!exports.AABB.overlapsVec(this.bounds, to))
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
        if (!exports.AABB.overlapsVec(this.bounds, vec))
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
        // eslint-disable-next-line guard-for-in
        for (const k in this.units) {
            const { vec, unit } = this.units[k];
            this.northWest.add(vec, unit) ||
                this.northEast.add(vec, unit) ||
                this.southWest.add(vec, unit) ||
                this.southEast.add(vec, unit);
        }
        this.units = {};
    }
    _queryIteratable(shape, mapFunc, index) {
        if (shape && !exports.Shape.possiblelyOverlapsAABB(shape, this.bounds))
            return [];
        if (!this.divided) {
            return exports.Collection.objectValuesToIterable(this.units, shape ? (v) => exports.Shape.overlapsVec(shape, v.vec) : undefined, mapFunc, index);
        }
        if (mapFunc) {
            return exports.Collection.toIterableWithMap(mapFunc, index, this.northWest._queryIteratable(shape, undefined, index), this.northEast._queryIteratable(shape, undefined, index), this.southWest._queryIteratable(shape, undefined, index), this.southEast._queryIteratable(shape, undefined, index));
        }
        return exports.Collection.toIterable(this.northWest._queryIteratable(shape, undefined, index), this.northEast._queryIteratable(shape, undefined, index), this.southWest._queryIteratable(shape, undefined, index), this.southEast._queryIteratable(shape, undefined, index));
    }
    queryIteratable(mapFuncOrShape, shape) {
        if (typeof mapFuncOrShape === 'function') {
            return this._queryIteratable(shape, mapFuncOrShape, { index: 0 });
        }
        else {
            return this._queryIteratable(mapFuncOrShape, undefined, { index: 0 });
        }
    }
    _queryReduce(shape, callbackFunc, initialValue, index) {
        if (shape && !exports.Shape.possiblelyOverlapsAABB(shape, this.bounds)) {
            return initialValue;
        }
        let value = initialValue;
        if (!this.divided) {
            if (shape) {
                // eslint-disable-next-line guard-for-in
                for (const k in this.units) {
                    const unit = this.units[k];
                    if (exports.Shape.overlapsVec(shape, unit.vec)) {
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
QuadTree.UniqueUnitAtPositionKeyFunc = (vec, _, quadTree) => `${vec.x},${vec.y}`;

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

exports.QuadTree = QuadTree;
exports.QuadTreeSet = QuadTreeSet;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5janMuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb2xsZWN0aW9uLnRzIiwiLi4vLi4vc3JjL3NoYXBlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlU2V0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbjxUPiA9IEl0ZXJhdG9yPFQ+IHwgQXJyYXk8VD47XG5leHBvcnQgdHlwZSBJdGVyYWJsZTxUPiA9IEl0ZXJhYmxlSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCBuYW1lc3BhY2UgQ29sbGVjdGlvbiB7XG4gIGV4cG9ydCBmdW5jdGlvbiB0b0FycmF5PFQ+KGM6IENvbGxlY3Rpb248VD4pIHtcbiAgICBpZiAoYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgY29uc3QgcjogVFtdID0gW107XG4gICAgaWYgKChjIGFzIEdlbmVyYXRvcjxUPilbU3ltYm9sLml0ZXJhdG9yXSkge1xuICAgICAgZm9yIChjb25zdCBpIG9mIChjIGFzIEdlbmVyYXRvcjxUPikpIHtcbiAgICAgICAgci5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGxldCBpID0gYy5uZXh0KCk7XG4gICAgd2hpbGUgKCFpLmRvbmUpIHtcbiAgICAgIHIucHVzaChpLnZhbHVlKTtcbiAgICAgIGkgPSBjLm5leHQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlPFQ+KFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICh1bmRlZmluZWQgfCAoKCkgPT4gQ29sbGVjdGlvbjxUPikgfCBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuY09yQ29sbGVjdGlvbiBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jT3JDb2xsZWN0aW9uKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gdHlwZW9mIGZ1bmNPckNvbGxlY3Rpb24gPT09ICdmdW5jdGlvbicgP1xuICAgICAgICBmdW5jT3JDb2xsZWN0aW9uKCkgOiBmdW5jT3JDb2xsZWN0aW9uO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiogdG9JdGVyYWJsZVdpdGhGaWx0ZXI8VD4oXG4gICAgICBmaWx0ZXJGdW5jOiAoKG86IFQsIGlkeDogbnVtYmVyKSA9PiBib29sZWFuKSxcbiAgICAgIGluZGV4OiB7aW5kZXg6IG51bWJlcn0sXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKHVuZGVmaW5lZCB8IENvbGxlY3Rpb248VD4gfFxuICAgICAgICAoKCkgPT4gQ29sbGVjdGlvbjxUPikgfCBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGlmICghZmlsdGVyRnVuYykge1xuICAgICAgZm9yIChjb25zdCBmdW5jT3JDb2xsZWN0aW9uIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICAgIGlmICghZnVuY09yQ29sbGVjdGlvbikgY29udGludWU7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0gdHlwZW9mIGZ1bmNPckNvbGxlY3Rpb24gPT09ICdmdW5jdGlvbicgP1xuICAgICAgICAgIGZ1bmNPckNvbGxlY3Rpb24oKSA6IGZ1bmNPckNvbGxlY3Rpb247XG4gICAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgICAgIGluZGV4LmluZGV4Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgICAgaW5kZXguaW5kZXgrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICAgIGlmICghZnVuYykgY29udGludWU7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0gdHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbicgPyBmdW5jKCkgOiBmdW5jO1xuICAgICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGl0ZXJhdG9yKSB7XG4gICAgICAgICAgICBpZiAoZmlsdGVyRnVuYyhyZXN1bHQsIGluZGV4LmluZGV4KyspKSB7XG4gICAgICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICBpZiAoZmlsdGVyRnVuYyhyZXN1bHQudmFsdWUsIGluZGV4LmluZGV4KyspKSB7XG4gICAgICAgICAgICAgIHlpZWxkIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aE1hcDxULCBBPihcbiAgICAgIG1hcEZ1bmM6ICgobzogVCwgaWR4OiBudW1iZXIpID0+IEEpLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgICAgIC4uLmNoaWxkSXRlcmF0b3JzOiAodW5kZWZpbmVkIHwgQ29sbGVjdGlvbjxUPlxuICAgICAgICB8ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KSB8IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jT3JDb2xsZWN0aW9uIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmNPckNvbGxlY3Rpb24pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuY09yQ29sbGVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgIGZ1bmNPckNvbGxlY3Rpb24oKSA6IGZ1bmNPckNvbGxlY3Rpb247XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0LCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0LnZhbHVlLCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiBvYmplY3RWYWx1ZXNUb0l0ZXJhYmxlPFQsIEE+KFxuICAgICAgb2JqZWN0OiBSZWNvcmQ8c3RyaW5nLCBUPixcbiAgICAgIGZpbHRlckZ1bmM6IHVuZGVmaW5lZCB8ICgobzogVCwgaWR4OiBudW1iZXIpID0+IGJvb2xlYW4pLFxuICAgICAgbWFwRnVuYzogdW5kZWZpbmVkIHwgKChvOiBULCBpZHg6IG51bWJlcikgPT4gQSksXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApIHtcbiAgICBpZiAoZmlsdGVyRnVuYykge1xuICAgICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgICAgICAgIGlmICghZmlsdGVyRnVuYyh2YWx1ZSwgaW5kZXguaW5kZXgpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyh2YWx1ZSwgaW5kZXguaW5kZXgrKyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmModmFsdWUsIGluZGV4LmluZGV4KSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHlpZWxkIHZhbHVlO1xuICAgICAgICAgIGluZGV4LmluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICB5aWVsZCBtYXBGdW5jKG9iamVjdFtrZXldLCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICB5aWVsZCBvYmplY3Rba2V5XTtcbiAgICAgICAgICBpbmRleC5pbmRleCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCJleHBvcnQgaW50ZXJmYWNlIFZlYzIge1xuICB4OiBudW1iZXI7XG4gIHk6IG51bWJlcjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgQUFCQiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogVmVjMjtcbn1cbmV4cG9ydCBuYW1lc3BhY2UgQUFCQiB7XG4gIGV4cG9ydCBmdW5jdGlvbiBvdmVybGFwc1ZlYyhhYWJiOiBBQUJCLCB2ZWM6IFZlYzIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYWFiYi5jZW50ZXIueCAtIGFhYmIuc2l6ZS54IDw9IHZlYy54ICYmXG4gICAgICB2ZWMueCA8PSBhYWJiLmNlbnRlci54ICsgYWFiYi5zaXplLnggJiZcbiAgICAgIGFhYmIuY2VudGVyLnkgLSBhYWJiLnNpemUueSA8PSB2ZWMueSAmJlxuICAgICAgdmVjLnkgPD0gYWFiYi5jZW50ZXIueSArIGFhYmIuc2l6ZS55O1xuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBvdmVybGFwc0FBQkIob25lOiBBQUJCLCBhbm90aGVyOiBBQUJCKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEoXG4gICAgICBhbm90aGVyLmNlbnRlci54IC0gYW5vdGhlci5zaXplLnggPiBvbmUuY2VudGVyLnggKyBvbmUuc2l6ZS54IHx8XG4gICAgICBhbm90aGVyLmNlbnRlci54ICsgYW5vdGhlci5zaXplLnggPCBvbmUuY2VudGVyLnggLSBvbmUuc2l6ZS54IHx8XG4gICAgICBhbm90aGVyLmNlbnRlci55IC0gYW5vdGhlci5zaXplLnkgPiBvbmUuY2VudGVyLnkgKyBvbmUuc2l6ZS55IHx8XG4gICAgICBhbm90aGVyLmNlbnRlci55ICsgYW5vdGhlci5zaXplLnkgPCBvbmUuY2VudGVyLnkgLSBvbmUuc2l6ZS55XG4gICAgKTtcbiAgfVxufVxudHlwZSBSZWN0YW5nbGVTaGFwZSA9IHtcbiAgdHlwZTogJ3JlY3RhbmdsZSdcbn0gJiBBQUJCO1xudHlwZSBFbGxpcHNlU2hhcGUgPSB7XG4gIHR5cGU6ICdlbGxpcHNlJ1xufSAmIEFBQkI7XG50eXBlIENpcmNsZVNoYXBlID0ge1xuICB0eXBlOiAnY2lyY2xlJ1xufSAmIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBudW1iZXI7XG59O1xudHlwZSBTcXVhcmVTaGFwZSA9IHtcbiAgdHlwZTogJ3NxdWFyZSdcbn0gJiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogbnVtYmVyO1xufTtcbmV4cG9ydCB0eXBlIFNoYXBlID0gUmVjdGFuZ2xlU2hhcGUgfCBFbGxpcHNlU2hhcGUgfCBDaXJjbGVTaGFwZSB8IFNxdWFyZVNoYXBlO1xuZXhwb3J0IG5hbWVzcGFjZSBTaGFwZSB7XG4gIGV4cG9ydCBmdW5jdGlvbiBvdmVybGFwc1ZlYyhzaGFwZTogU2hhcGUsIHZlYzogVmVjMik6IGJvb2xlYW4ge1xuICAgIHN3aXRjaCAoc2hhcGUudHlwZSkge1xuICAgICAgY2FzZSAncmVjdGFuZ2xlJzogcmV0dXJuIEFBQkIub3ZlcmxhcHNWZWMoc2hhcGUsIHZlYyk7XG4gICAgICBjYXNlICdzcXVhcmUnOiByZXR1cm4gQUFCQi5vdmVybGFwc1ZlYyh7XG4gICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICB9LCB2ZWMpO1xuICAgICAgY2FzZSAnY2lyY2xlJzogcmV0dXJuIFNoYXBlLm92ZXJsYXBzVmVjKHtcbiAgICAgICAgdHlwZTogJ2VsbGlwc2UnLFxuICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgfSwgdmVjKTtcbiAgICAgIGNhc2UgJ2VsbGlwc2UnOiB7XG4gICAgICAgIGNvbnN0IHAgPVxuICAgICAgICAgIE1hdGgucG93KHZlYy54IC0gc2hhcGUuY2VudGVyLngsIDIpIC8gTWF0aC5wb3coc2hhcGUuc2l6ZS54LCAyKSArXG4gICAgICAgICAgTWF0aC5wb3codmVjLnkgLSBzaGFwZS5jZW50ZXIueSwgMikgLyBNYXRoLnBvdyhzaGFwZS5zaXplLnksIDIpO1xuICAgICAgICByZXR1cm4gcCA8PSAxO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIHBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGU6IFNoYXBlLCBhYWJiOiBBQUJCKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoIChzaGFwZS50eXBlKSB7XG4gICAgICBjYXNlICdlbGxpcHNlJzpcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6XG4gICAgICAgIHJldHVybiBBQUJCLm92ZXJsYXBzQUFCQihzaGFwZSwgYWFiYik7XG4gICAgICBjYXNlICdjaXJjbGUnOlxuICAgICAgY2FzZSAnc3F1YXJlJzpcbiAgICAgICAgcmV0dXJuIEFBQkIub3ZlcmxhcHNBQUJCKHtcbiAgICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICAgIH0sIGFhYmIpO1xuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlY3RhbmdsZShjZW50ZXI6IFZlYzIsIHNpemU6IFZlYzIgfCBudW1iZXIpOiBTaGFwZSB7XG4gICAgaWYgKHR5cGVvZiBzaXplID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3NxdWFyZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdyZWN0YW5nbGUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlRWxsaXBzZShjZW50ZXI6IFZlYzIsIHNpemU6IFZlYzIgfCBudW1iZXIpOiBTaGFwZSB7XG4gICAgaWYgKHR5cGVvZiBzaXplID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2NpcmNsZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdlbGxpcHNlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7Q29sbGVjdGlvbiwgSXRlcmFibGV9IGZyb20gJy4vY29sbGVjdGlvbic7XG5pbXBvcnQge1ZlYzIsIEFBQkIsIFNoYXBlfSBmcm9tICcuL3NoYXBlJztcblxuZXhwb3J0IHR5cGUgUXVhZFRyZWVVbml0S2V5RnVuYzxUPiA9IChcbiAgdmVjOiBWZWMyLCB1bml0OiBULCBxdWFkVHJlZTogUXVhZFRyZWU8VD5cbikgPT4gc3RyaW5nIHwgbnVtYmVyO1xuZXhwb3J0IHR5cGUgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+ID0gKFxuICAgIGFjYzogQSxcbiAgICBwcmV2aW91czoge3ZlYzogVmVjMiwgdW5pdD86IFR9LFxuICAgIGluZGV4OiBudW1iZXIsXG4pID0+IEEgfCB1bmRlZmluZWQ7XG5leHBvcnQgaW50ZXJmYWNlIFF1YWRUcmVlT3B0aW9uczxUPiB7XG4gIHVuaXRLZXlHZXR0ZXI6IFF1YWRUcmVlVW5pdEtleUZ1bmM8VD4sXG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICByZWFkb25seSBib3VuZHM6IEFBQkI7XG4gIHJlYWRvbmx5IHNpemU6IG51bWJlclxuICBoYXModmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlTaXplKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICApOiBudW1iZXI7XG59XG5leHBvcnQgY2xhc3MgUXVhZFRyZWU8VD4gaW1wbGVtZW50cyBSZWFkb25seVF1YWRUcmVlPFQ+IHtcbiAgc3RhdGljIE1heEVsZW1lbnRzID0gODtcbiAgc3RhdGljIE1heERlcHRoID0gODtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyA9IChcbiAgICAgIHZlYzogVmVjMixcbiAgICAgIF86IGFueSxcbiAgICAgIHF1YWRUcmVlOiBRdWFkVHJlZTxhbnk+LFxuICApID0+IGAke3ZlYy54fSwke3ZlYy55fWA7XG5cbiAgYm91bmRzOiBBQUJCO1xuXG4gIHByaXZhdGUgZGVwdGg6IG51bWJlcjtcblxuICBwcml2YXRlIGRpdmlkZWQ6IGJvb2xlYW47XG5cbiAgcHJpdmF0ZSB1bml0czoge1trZXk6IHN0cmluZyB8IG51bWJlcl06IHt1bml0OiBULCB2ZWM6IFZlYzJ9fTtcblxuXG4gIHByaXZhdGUgbm9ydGhXZXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgbm9ydGhFYXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgc291dGhXZXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgc291dGhFYXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgX3NpemU6IG51bWJlcjtcblxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbiAgfVxuXG4gIHJlYWRvbmx5IG9wdGlvbnM6IFF1YWRUcmVlT3B0aW9uczxUPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIGJvdW5kczogQUFCQixcbiAgICAgIG9wdGlvbnM/OiBQYXJ0aWFsPFF1YWRUcmVlT3B0aW9uczxUPj4sXG4gICAgICBkZXB0aDogbnVtYmVyID0gMCxcbiAgKSB7XG4gICAgdGhpcy5ib3VuZHMgPSBib3VuZHM7XG4gICAgdGhpcy5kZXB0aCA9IGRlcHRoO1xuICAgIHRoaXMuZGl2aWRlZCA9IGZhbHNlO1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLl9zaXplID0gMDtcbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICB1bml0S2V5R2V0dGVyOlxuICAgICAgICBvcHRpb25zPy51bml0S2V5R2V0dGVyIHx8IFF1YWRUcmVlLlVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyxcbiAgICB9O1xuICB9XG4gIF9hZGQodmVjOiBWZWMyLCB1bml0OiBUKTogZmFsc2UgfCAnYWRkZWQnIHwgJ2V4aXN0aW5nJyB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB2ZWMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZGVwdGggPT0gUXVhZFRyZWUuTWF4RGVwdGggfHxcbiAgICAgICF0aGlzLmRpdmlkZWQgJiYgdGhpcy5zaXplIDwgUXVhZFRyZWUuTWF4RWxlbWVudHMpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKHZlYywgdW5pdCwgdGhpcyk7XG4gICAgICBsZXQgcmVzdWx0OiAnZXhpc3RpbmcnIHwgJ2FkZGVkJyA9ICdleGlzdGluZyc7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICB0aGlzLl9zaXplICsrO1xuICAgICAgICByZXN1bHQgPSAnYWRkZWQnO1xuICAgICAgfVxuICAgICAgdGhpcy51bml0c1trZXldID0ge3ZlYywgdW5pdH07XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkgdGhpcy5kaXZpZGUoKTtcbiAgICBjb25zdCBpbnNlcnRlZCA9IHRoaXMubm9ydGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhFYXN0Ll9hZGQodmVjLCB1bml0KTtcbiAgICBpZiAoaW5zZXJ0ZWQgPT09ICdhZGRlZCcpIHRoaXMuX3NpemUgKys7XG4gICAgcmV0dXJuIGluc2VydGVkO1xuICB9XG4gIGFkZCh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLl9hZGQodmVjLCB1bml0KTtcbiAgfVxuICBwcml2YXRlIF9tb3ZlKFxuICAgICAgZnJvbTogVmVjMixcbiAgICAgIHRvOiBWZWMyIHwgdW5kZWZpbmVkLFxuICAgICAgdW5pdDogVCxcbiAgKTogZmFsc2UgfCAncmVtb3ZlZCcgfCAnbW92ZWQnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIGZyb20pKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKGZyb20sIHVuaXQsIHRoaXMpO1xuICAgICAgaWYgKCF0aGlzLnVuaXRzW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHRvICYmIEFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHRvKSkge1xuICAgICAgICAvLyB1cGRhdGUgaW4tcGxhY2VcbiAgICAgICAgY29uc3QgbmV3S2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodG8sIHVuaXQsIHRoaXMpO1xuICAgICAgICBpZiAobmV3S2V5ICE9PSBrZXkpIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy51bml0c1trZXldO1xuICAgICAgICAgIHRoaXMudW5pdHNbbmV3S2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjOiB0bywgdW5pdH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdtb3ZlZCc7XG4gICAgICB9XG4gICAgICBkZWxldGUgdGhpcy51bml0c1trZXldO1xuICAgICAgdGhpcy5fc2l6ZSAtLTtcbiAgICAgIHJldHVybiAncmVtb3ZlZCc7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMubm9ydGhXZXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KSB8fFxuICAgICAgICAgIHRoaXMubm9ydGhFYXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KSB8fFxuICAgICAgICAgIHRoaXMuc291dGhXZXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KSB8fFxuICAgICAgICAgIHRoaXMuc291dGhFYXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KTtcbiAgICBpZiAocmVzdWx0ID09PSAncmVtb3ZlZCcpIHtcbiAgICAgIHRoaXMuX3NpemUgLS07XG4gICAgICBpZiAodG8pIHtcbiAgICAgICAgaWYgKHRoaXMuYWRkKHRvLCB1bml0KSkgcmV0dXJuICdtb3ZlZCc7XG4gICAgICAgIHJldHVybiAncmVtb3ZlZCc7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgbW92ZShmcm9tOiBWZWMyLCB0bzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdG8pKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuX21vdmUoZnJvbSwgdG8sIHVuaXQpID09PSAncmVtb3ZlZCcpIHRocm93IG5ldyBFcnJvcigndW5leHBlY3RlZCcpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGRlbGV0ZSh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZSh2ZWMsIHVuZGVmaW5lZCwgdW5pdCkgPT09ICdyZW1vdmVkJztcbiAgfVxuICBjbGVhcigpIHtcbiAgICB0aGlzLnVuaXRzID0ge307XG4gICAgdGhpcy5fc2l6ZSA9IDA7XG4gICAgdGhpcy5kaXZpZGVkID0gZmFsc2U7XG4gICAgdGhpcy5ub3J0aFdlc3QgPVxuICAgICAgdGhpcy5ub3J0aEVhc3QgPVxuICAgICAgdGhpcy5zb3V0aFdlc3QgPVxuICAgICAgdGhpcy5zb3V0aEVhc3QgPSB1bmRlZmluZWQhO1xuICB9XG4gIGhhcyh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBib29sZWFuIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIHJldHVybiAhIXRoaXMudW5pdHNba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9ydGhXZXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhFYXN0Lmhhcyh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgZGl2aWRlKCkge1xuICAgIHRoaXMuZGl2aWRlZCA9IHRydWU7XG4gICAgY29uc3QgaHcgPSB0aGlzLmJvdW5kcy5zaXplLnggLyAyO1xuICAgIGNvbnN0IGhoID0gdGhpcy5ib3VuZHMuc2l6ZS55IC8gMjtcblxuICAgIHRoaXMubm9ydGhXZXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54IC0gaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLm5vcnRoRWFzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCArIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSAtIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMuc291dGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55ICsgaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICBmb3IgKGNvbnN0IGsgaW4gdGhpcy51bml0cykge1xuICAgICAgY29uc3Qge3ZlYywgdW5pdH0gPSB0aGlzLnVuaXRzW2tdO1xuICAgICAgdGhpcy5ub3J0aFdlc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuYWRkKHZlYywgdW5pdCk7XG4gICAgfVxuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgfVxuICBwcml2YXRlIF9xdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICAgICBtYXBGdW5jOiAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaWR4OiBudW1iZXIpID0+IEEpIHwgdW5kZWZpbmVkLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgKTogSXRlcmFibGU8QT4ge1xuICAgIGlmIChzaGFwZSAmJiAhU2hhcGUucG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZSwgdGhpcy5ib3VuZHMpKSByZXR1cm4gW107XG5cbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgcmV0dXJuIENvbGxlY3Rpb24ub2JqZWN0VmFsdWVzVG9JdGVyYWJsZShcbiAgICAgICAgICB0aGlzLnVuaXRzLFxuICAgICAgICAgIHNoYXBlID8gKHYpID0+IFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlLCB2LnZlYykgOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWFwRnVuYyxcbiAgICAgICAgICBpbmRleCxcbiAgICAgICkgYXMgSXRlcmFibGU8QT47XG4gICAgfVxuICAgIGlmIChtYXBGdW5jKSB7XG4gICAgICByZXR1cm4gQ29sbGVjdGlvbi50b0l0ZXJhYmxlV2l0aE1hcChcbiAgICAgICAgICBtYXBGdW5jLFxuICAgICAgICAgIGluZGV4LFxuICAgICAgICAgIHRoaXMubm9ydGhXZXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICAgIHRoaXMubm9ydGhFYXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICAgIHRoaXMuc291dGhXZXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICAgIHRoaXMuc291dGhFYXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIENvbGxlY3Rpb24udG9JdGVyYWJsZShcbiAgICAgICAgdGhpcy5ub3J0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgIHRoaXMubm9ydGhFYXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICB0aGlzLnNvdXRoV2VzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICAgdGhpcy5zb3V0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgKTtcbiAgfVxuICBxdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpZHg6IG51bWJlcikgPT4gQSxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+O1xuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBtYXBGdW5jT3JTaGFwZT86ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpZHg6IG51bWJlcikgPT4gQSkgfCBTaGFwZSxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+IHtcbiAgICBpZiAodHlwZW9mIG1hcEZ1bmNPclNoYXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCBtYXBGdW5jT3JTaGFwZSwge2luZGV4OiAwfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeUl0ZXJhdGFibGUoXG4gICAgICAgIG1hcEZ1bmNPclNoYXBlIGFzIFNoYXBlLFxuICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgIHtpbmRleDogMH0sXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBwcml2YXRlIF9xdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlOiBBIHwgdW5kZWZpbmVkLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgKTogQSB7XG4gICAgaWYgKHNoYXBlICYmICFTaGFwZS5wb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlLCB0aGlzLmJvdW5kcykpIHtcbiAgICAgIHJldHVybiBpbml0aWFsVmFsdWUhO1xuICAgIH1cbiAgICBsZXQgdmFsdWU6IEEgPSBpbml0aWFsVmFsdWUhO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBpZiAoc2hhcGUpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGsgaW4gdGhpcy51bml0cykge1xuICAgICAgICAgIGNvbnN0IHVuaXQgPSB0aGlzLnVuaXRzW2tdO1xuICAgICAgICAgIGlmIChTaGFwZS5vdmVybGFwc1ZlYyhzaGFwZSwgdW5pdC52ZWMpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrRnVuYyh2YWx1ZSwgdW5pdCwgaW5kZXguaW5kZXgrKykhO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGsgaW4gdGhpcy51bml0cykge1xuICAgICAgICAgIGNvbnN0IHVuaXQgPSB0aGlzLnVuaXRzW2tdO1xuICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2tGdW5jKHZhbHVlLCB1bml0LCBpbmRleC5pbmRleCsrKSE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgdmFsdWUgPSB0aGlzLm5vcnRoV2VzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUsIGluZGV4KTtcbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHZhbHVlID0gdGhpcy5zb3V0aFdlc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlLCBpbmRleCk7XG4gICAgdmFsdWUgPSB0aGlzLnNvdXRoRWFzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUsIGluZGV4KTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckNhbGxiYWNrRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jLFxuICAgICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIEEsXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZShcbiAgICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jLFxuICAgICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgICAgICBpbml0aWFsVmFsdWUsXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+PihcbiAgICAgICAgc2hhcGUsXG4gICAgICAgIChhcnIsIHYpID0+IHtcbiAgICAgICAgICBhcnIucHVzaCh2KTtcbiAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICB9LFxuICAgICAgICBbXSxcbiAgICAgICAge2luZGV4OiAwfSxcbiAgICApO1xuICB9XG5cbiAgcXVlcnlGb3JFYWNoKFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZU9yRm9yZWFjaEZ1bmM6XG4gICAgICAgIFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQpLFxuICAgICAgZm9yZWFjaEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApIHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JGb3JlYWNoRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fcXVlcnlSZWR1Y2U8dm9pZD4oXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIChfLCB2LCBpbmRleCkgPT4gc2hhcGVPckZvcmVhY2hGdW5jKHYsIGluZGV4KSxcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghZm9yZWFjaEZ1bmMpIHJldHVybjtcbiAgICAgIHRoaXMuX3F1ZXJ5UmVkdWNlPHZvaWQ+KFxuICAgICAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYyxcbiAgICAgICAgICAoXywgdiwgaW5kZXgpID0+IGZvcmVhY2hGdW5jKHYsIGluZGV4KSxcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZU9yTWFwRnVuYzogU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSksXG4gICAgICBtYXBGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT4ge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPck1hcEZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmICghbWFwRnVuYykgcmV0dXJuIFtdO1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PEE+PihcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgKGFyciwgdiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGFyci5wdXNoKHNoYXBlT3JNYXBGdW5jKHYsIGluZGV4KSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10sXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghbWFwRnVuYykgcmV0dXJuIFtdO1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PEE+PihcbiAgICAgICAgICBzaGFwZU9yTWFwRnVuYyxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2gobWFwRnVuYyh2LCBpbmRleCkpO1xuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdLFxuICAgICAgICAgIHtpbmRleDogMH0sXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBxdWVyeVNpemUoXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPG51bWJlcj4oXG4gICAgICAgIHNoYXBlLFxuICAgICAgICAoc2l6ZSkgPT4gc2l6ZSArIDEsXG4gICAgICAgIDAsXG4gICAgICAgIHtpbmRleDogMH0sXG4gICAgKTtcbiAgfVxuICBfZHVtcFRvU3RyaW5nKHJlc3VsdDogc3RyaW5nW10pIHtcbiAgICBjb25zdCBwcmVmaXggPSAnICAgICAgICAgICAgJy5zdWJzdHJpbmcoMCwgdGhpcy5kZXB0aCk7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHByZWZpeCk7XG4gICAgICByZXN1bHQucHVzaChKU09OLnN0cmluZ2lmeSh0aGlzLnVuaXRzKSk7XG4gICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIFtcbiAgICAgIHtzdHI6ICdOVycsIHF0OiB0aGlzLm5vcnRoV2VzdH0sXG4gICAgICB7c3RyOiAnTkUnLCBxdDogdGhpcy5ub3J0aEVhc3R9LFxuICAgICAge3N0cjogJ1NXJywgcXQ6IHRoaXMuc291dGhXZXN0fSxcbiAgICAgIHtzdHI6ICdTRScsIHF0OiB0aGlzLnNvdXRoRWFzdH0sXG4gICAgXSkge1xuICAgICAgcmVzdWx0LnB1c2gocHJlZml4KTtcbiAgICAgIHJlc3VsdC5wdXNoKGNoaWxkLnN0cik7XG4gICAgICByZXN1bHQucHVzaChgICgke2NoaWxkLnF0LnNpemV9KTpcXG5gKTtcbiAgICAgIGNoaWxkLnF0Ll9kdW1wVG9TdHJpbmcocmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9kdW1wVG9TdHJpbmcoW10pLmpvaW4oJycpO1xuICB9XG59XG4iLCJpbXBvcnQge1xuICBRdWFkVHJlZSxcbiAgUXVhZFRyZWVPcHRpb25zLFxufSBmcm9tICcuL1F1YWRUcmVlJztcbmltcG9ydCB7QUFCQiwgU2hhcGUsIFZlYzJ9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPiA9IChvOiBUKSA9PiBWZWMyO1xuZXhwb3J0IHR5cGUgUXVhZE1hcFVuaXRQb3NpdGlvblNldHRlckZ1bmM8VD4gPSAobzogVCwgcG9zaXRpb246IFZlYzIpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gIGFjYzogQSxcbiAgcHJldmlvdXM6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LFxuICBpbmRleDogbnVtYmVyLFxuKSA9PiBBIHwgdW5kZWZpbmVkO1xuZXhwb3J0IGNsYXNzIFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgfVxufVxuZXhwb3J0IGludGVyZmFjZSBSZWFkb25seVF1YWRUcmVlU2V0PFQ+IGV4dGVuZHMgUmVhZG9ubHlTZXQ8VD4ge1xuICByZWFkb25seSBib3VuZHM6IEFBQkI7XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCk6IFNldEl0ZXJhdG9yPFQ+O1xuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PjtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PjtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG59XG5leHBvcnQgY2xhc3MgUXVhZFRyZWVTZXQ8VD4gaW1wbGVtZW50cyBTZXQ8VD4sIFJlYWRvbmx5UXVhZFRyZWVTZXQ8VD4ge1xuICBzdGF0aWMgVW5pcXVlVW5pdEF0VmVjS2V5RnVuYyA9IFF1YWRUcmVlLlVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYztcbiAgcHJpdmF0ZSBxdWFyZFRyZWU6IFF1YWRUcmVlPFQ+O1xuICBwcml2YXRlIHVuaXRQb3NpdGlvbkdldHRlcjogUXVhZE1hcFVuaXRQb3NpdGlvbkdldHRlckZ1bmM8VD47XG4gIGNvbnN0cnVjdG9yKGJvdW5kczogQUFCQiwgb3B0aW9uczogUGFydGlhbDxRdWFkVHJlZU9wdGlvbnM8VD4+ICYge1xuICAgIHVuaXRQb3NpdGlvbkdldHRlcjogUXVhZE1hcFVuaXRQb3NpdGlvbkdldHRlckZ1bmM8VD4sXG4gIH0pIHtcbiAgICB0aGlzLnF1YXJkVHJlZSA9IG5ldyBRdWFkVHJlZShib3VuZHMsIG9wdGlvbnMpO1xuICAgIHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyID0gb3B0aW9ucy51bml0UG9zaXRpb25HZXR0ZXI7XG4gIH1cbiAgZ2V0IHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnNpemU7XG4gIH1cbiAgZ2V0IGJvdW5kcygpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuYm91bmRzO1xuICB9XG4gIGFkZCh0OiBUKSB7XG4gICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KTtcbiAgICBpZiAoIXRoaXMucXVhcmRUcmVlLmFkZChwb3NpdGlvbiwgdCkpIHtcbiAgICAgIHRocm93IG5ldyBRdWFkVHJlZVBvc2l0aW9uT3V0T2ZCb3VuZHNFcnJvcihcbiAgICAgICAgICBgcG9zaXRpb24gJHtKU09OLnN0cmluZ2lmeShwb3NpdGlvbil9IGlzIG91dCBvZiBib3VuZHM6YCArXG4gICAgICAgICAgYCAke0pTT04uc3RyaW5naWZ5KHRoaXMucXVhcmRUcmVlLmJvdW5kcyl9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIG1vdmUodDogVCwgdG86IFZlYzIpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUubW92ZSh0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KSwgdG8sIHQpO1xuICB9XG4gIGRlbGV0ZSh0OiBUKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLmRlbGV0ZSh0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KSwgdCk7XG4gIH1cbiAgaGFzKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuaGFzKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBjbGVhcigpIHtcbiAgICB0aGlzLnF1YXJkVHJlZS5jbGVhcigpO1xuICB9XG4gIGZvckVhY2goXG4gICAgICBjYWxsYmFja2ZuOiAodmFsdWU6IFQsIHZhbHVlMjogVCwgc2V0OiBTZXQ8VD4pID0+IHZvaWQsXG4gICAgICB0aGlzQXJnPzogYW55LFxuICApOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlSZWR1Y2UoXG4gICAgICAgIChfLCBwKSA9PiB2b2lkKGNhbGxiYWNrZm4ocC51bml0ISwgcC51bml0ISwgdGhpc0FyZykpLFxuICAgICAgICB2b2lkKDApLFxuICAgICk7XG4gIH1cbiAgZW50cmllcygpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlPFtULCBUXT4oXG4gICAgICAgIChwKSA9PiBbcC51bml0ISwgcC51bml0IV0pIGFzIGFueTtcbiAgfVxuICBrZXlzKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlcygpO1xuICB9XG4gIHZhbHVlcygpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlPFQ+KFxuICAgICAgICAocCkgPT4gcC51bml0ISkgYXMgYW55O1xuICB9XG4gIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS50b1N0cmluZygpO1xuICB9XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlcygpO1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSBhc1xuICAgICAgSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICB9XG5cbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYzogU2hhcGUgfCBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZTogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+IHwgQSxcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlSZWR1Y2UoXG4gICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMgYXMgU2hhcGUsXG4gICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIGFueSxcbiAgICAgICAgaW5pdGlhbFZhbHVlKTtcbiAgfVxuXG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUFycmF5KHNoYXBlKSBhcyBhbnk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZU9yRm9yZWFjaEZ1bmM6XG4gICAgICAgIFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKSB7XG4gICAgdGhpcy5xdWFyZFRyZWUucXVlcnlGb3JFYWNoKHNoYXBlT3JGb3JlYWNoRnVuYyBhcyBhbnksIGZvcmVhY2hGdW5jIGFzIGFueSk7XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZU9yTWFwRnVuYzogU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlNYXAoc2hhcGVPck1hcEZ1bmMgYXMgU2hhcGUsIG1hcEZ1bmMgYXMgYW55KTtcbiAgfVxuICBxdWVyeVNpemUoXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5U2l6ZShzaGFwZSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJDb2xsZWN0aW9uIiwiQUFCQiIsIlNoYXBlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFHaUJBLDRCQXVKaEI7QUF2SkQsQ0FBQSxVQUFpQixVQUFVLEVBQUE7SUFDekIsU0FBZ0IsT0FBTyxDQUFJLENBQWdCLEVBQUE7QUFDekMsUUFBQSxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUU7QUFDdEIsWUFBQSxPQUFPLENBQUMsQ0FBQztTQUNWO1FBQ0Qs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QUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO1lBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQztTQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztZQUM1QixNQUFNLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQztZQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7U0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQzs7QUFHdkQsUUFBQSxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7QUFDMUIsWUFBQSxNQUFNLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENB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
