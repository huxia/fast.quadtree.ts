
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.1.1
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
        this.options = options || {
            unitKeyGetter: QuadTree.UniqueUnitAtPositionKeyFunc,
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
        for (const { vec, unit } of Object.values(this.units)) {
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
            return exports.Collection.toIterableWithMap(mapFunc, index, () => this.northWest._queryIteratable(shape, undefined, index), () => this.northEast._queryIteratable(shape, undefined, index), () => this.southWest._queryIteratable(shape, undefined, index), () => this.southEast._queryIteratable(shape, undefined, index));
        }
        return exports.Collection.toIterable(() => this.northWest._queryIteratable(shape, undefined, index), () => this.northEast._queryIteratable(shape, undefined, index), () => this.southWest._queryIteratable(shape, undefined, index), () => this.southEast._queryIteratable(shape, undefined, index));
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

exports.QuadTree = QuadTree;
exports.QuadTreeSet = QuadTreeSet;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5janMuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb2xsZWN0aW9uLnRzIiwiLi4vLi4vc3JjL3NoYXBlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlU2V0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbjxUPiA9IEl0ZXJhdG9yPFQ+IHwgQXJyYXk8VD47XG5leHBvcnQgdHlwZSBJdGVyYWJsZTxUPiA9IEl0ZXJhYmxlSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCBuYW1lc3BhY2UgQ29sbGVjdGlvbiB7XG4gIGV4cG9ydCBmdW5jdGlvbiB0b0FycmF5PFQ+KGM6IENvbGxlY3Rpb248VD4pIHtcbiAgICBpZiAoYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgY29uc3QgcjogVFtdID0gW107XG4gICAgaWYgKChjIGFzIEdlbmVyYXRvcjxUPilbU3ltYm9sLml0ZXJhdG9yXSkge1xuICAgICAgZm9yIChjb25zdCBpIG9mIChjIGFzIEdlbmVyYXRvcjxUPikpIHtcbiAgICAgICAgci5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGxldCBpID0gYy5uZXh0KCk7XG4gICAgd2hpbGUgKCFpLmRvbmUpIHtcbiAgICAgIHIucHVzaChpLnZhbHVlKTtcbiAgICAgIGkgPSBjLm5leHQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlPFQ+KFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICh1bmRlZmluZWQgfCAoKCkgPT4gQ29sbGVjdGlvbjxUPikpW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aEZpbHRlcjxUPihcbiAgICAgIGZpbHRlckZ1bmM6ICgobzogVCwgaWR4OiBudW1iZXIpID0+IGJvb2xlYW4pLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgICAgIC4uLmNoaWxkSXRlcmF0b3JzOiAodW5kZWZpbmVkIHwgQ29sbGVjdGlvbjxUPiB8ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KSlbXVxuICApIHtcbiAgICBpZiAoIWZpbHRlckZ1bmMpIHtcbiAgICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IHR5cGVvZiBmdW5jID09PSAnZnVuY3Rpb24nID8gZnVuYygpIDogZnVuYztcbiAgICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgICAgeWllbGQgcmVzdWx0O1xuICAgICAgICAgICAgaW5kZXguaW5kZXgrKztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgICBpbmRleC5pbmRleCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IGZ1bmMgb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJyA/IGZ1bmMoKSA6IGZ1bmM7XG4gICAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJGdW5jKHJlc3VsdCwgaW5kZXguaW5kZXgrKykpIHtcbiAgICAgICAgICAgICAgeWllbGQgcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJGdW5jKHJlc3VsdC52YWx1ZSwgaW5kZXguaW5kZXgrKykpIHtcbiAgICAgICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGVXaXRoTWFwPFQsIEE+KFxuICAgICAgbWFwRnVuYzogKChvOiBULCBpZHg6IG51bWJlcikgPT4gQSksXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICh1bmRlZmluZWQgfCBDb2xsZWN0aW9uPFQ+IHwgKCgpID0+IENvbGxlY3Rpb248VD4pKVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gdHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbicgPyBmdW5jKCkgOiBmdW5jO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICB5aWVsZCBtYXBGdW5jKHJlc3VsdCwgaW5kZXguaW5kZXgrKyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICB5aWVsZCBtYXBGdW5jKHJlc3VsdC52YWx1ZSwgaW5kZXguaW5kZXgrKyk7XG4gICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiogb2JqZWN0VmFsdWVzVG9JdGVyYWJsZTxULCBBPihcbiAgICAgIG9iamVjdDogUmVjb3JkPHN0cmluZywgVD4sXG4gICAgICBmaWx0ZXJGdW5jOiB1bmRlZmluZWQgfCAoKG86IFQsIGlkeDogbnVtYmVyKSA9PiBib29sZWFuKSxcbiAgICAgIG1hcEZ1bmM6IHVuZGVmaW5lZCB8ICgobzogVCwgaWR4OiBudW1iZXIpID0+IEEpLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgKSB7XG4gICAgaWYgKGZpbHRlckZ1bmMpIHtcbiAgICAgIGlmIChtYXBGdW5jKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmModmFsdWUsIGluZGV4LmluZGV4KSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHlpZWxkIG1hcEZ1bmModmFsdWUsIGluZGV4LmluZGV4KyspO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgICAgICAgaWYgKCFmaWx0ZXJGdW5jKHZhbHVlLCBpbmRleC5pbmRleCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB5aWVsZCB2YWx1ZTtcbiAgICAgICAgICBpbmRleC5pbmRleCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChtYXBGdW5jKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhvYmplY3Rba2V5XSwgaW5kZXguaW5kZXgrKyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgeWllbGQgb2JqZWN0W2tleV07XG4gICAgICAgICAgaW5kZXguaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiZXhwb3J0IGludGVyZmFjZSBWZWMyIHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG59XG5leHBvcnQgaW50ZXJmYWNlIEFBQkIge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IFZlYzI7XG59XG5leHBvcnQgbmFtZXNwYWNlIEFBQkIge1xuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNWZWMoYWFiYjogQUFCQiwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGFhYmIuY2VudGVyLnggLSBhYWJiLnNpemUueCA8PSB2ZWMueCAmJlxuICAgICAgdmVjLnggPD0gYWFiYi5jZW50ZXIueCArIGFhYmIuc2l6ZS54ICYmXG4gICAgICBhYWJiLmNlbnRlci55IC0gYWFiYi5zaXplLnkgPD0gdmVjLnkgJiZcbiAgICAgIHZlYy55IDw9IGFhYmIuY2VudGVyLnkgKyBhYWJiLnNpemUueTtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNBQUJCKG9uZTogQUFCQiwgYW5vdGhlcjogQUFCQik6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhKFxuICAgICAgYW5vdGhlci5jZW50ZXIueCAtIGFub3RoZXIuc2l6ZS54ID4gb25lLmNlbnRlci54ICsgb25lLnNpemUueCB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueCArIGFub3RoZXIuc2l6ZS54IDwgb25lLmNlbnRlci54IC0gb25lLnNpemUueCB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueSAtIGFub3RoZXIuc2l6ZS55ID4gb25lLmNlbnRlci55ICsgb25lLnNpemUueSB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueSArIGFub3RoZXIuc2l6ZS55IDwgb25lLmNlbnRlci55IC0gb25lLnNpemUueVxuICAgICk7XG4gIH1cbn1cbnR5cGUgUmVjdGFuZ2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdyZWN0YW5nbGUnXG59ICYgQUFCQjtcbnR5cGUgRWxsaXBzZVNoYXBlID0ge1xuICB0eXBlOiAnZWxsaXBzZSdcbn0gJiBBQUJCO1xudHlwZSBDaXJjbGVTaGFwZSA9IHtcbiAgdHlwZTogJ2NpcmNsZSdcbn0gJiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogbnVtYmVyO1xufTtcbnR5cGUgU3F1YXJlU2hhcGUgPSB7XG4gIHR5cGU6ICdzcXVhcmUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG5leHBvcnQgdHlwZSBTaGFwZSA9IFJlY3RhbmdsZVNoYXBlIHwgRWxsaXBzZVNoYXBlIHwgQ2lyY2xlU2hhcGUgfCBTcXVhcmVTaGFwZTtcbmV4cG9ydCBuYW1lc3BhY2UgU2hhcGUge1xuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNWZWMoc2hhcGU6IFNoYXBlLCB2ZWM6IFZlYzIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHNoYXBlLCB2ZWMpO1xuICAgICAgY2FzZSAnc3F1YXJlJzogcmV0dXJuIEFBQkIub3ZlcmxhcHNWZWMoe1xuICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgfSwgdmVjKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6IHJldHVybiBTaGFwZS5vdmVybGFwc1ZlYyh7XG4gICAgICAgIHR5cGU6ICdlbGxpcHNlJyxcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdlbGxpcHNlJzoge1xuICAgICAgICBjb25zdCBwID1cbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueCAtIHNoYXBlLmNlbnRlci54LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueCwgMikgK1xuICAgICAgICAgIE1hdGgucG93KHZlYy55IC0gc2hhcGUuY2VudGVyLnksIDIpIC8gTWF0aC5wb3coc2hhcGUuc2l6ZS55LCAyKTtcbiAgICAgICAgcmV0dXJuIHAgPD0gMTtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBwb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlOiBTaGFwZSwgYWFiYjogQUFCQik6IGJvb2xlYW4ge1xuICAgIHN3aXRjaCAoc2hhcGUudHlwZSkge1xuICAgICAgY2FzZSAnZWxsaXBzZSc6XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoc2hhcGUsIGFhYmIpO1xuICAgICAgY2FzZSAnY2lyY2xlJzpcbiAgICAgIGNhc2UgJ3NxdWFyZSc6XG4gICAgICAgIHJldHVybiBBQUJCLm92ZXJsYXBzQUFCQih7XG4gICAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgICB9LCBhYWJiKTtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWN0YW5nbGUoY2VudGVyOiBWZWMyLCBzaXplOiBWZWMyIHwgbnVtYmVyKTogU2hhcGUge1xuICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdzcXVhcmUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAncmVjdGFuZ2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsbGlwc2UoY2VudGVyOiBWZWMyLCBzaXplOiBWZWMyIHwgbnVtYmVyKTogU2hhcGUge1xuICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdjaXJjbGUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQge0NvbGxlY3Rpb24sIEl0ZXJhYmxlfSBmcm9tICcuL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtWZWMyLCBBQUJCLCBTaGFwZX0gZnJvbSAnLi9zaGFwZSc7XG5cbmV4cG9ydCB0eXBlIFF1YWRUcmVlVW5pdEtleUZ1bmM8VD4gPSAoXG4gIHZlYzogVmVjMiwgdW5pdDogVCwgcXVhZFRyZWU6IFF1YWRUcmVlPFQ+XG4pID0+IHN0cmluZyB8IG51bWJlcjtcbmV4cG9ydCB0eXBlIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiA9IChcbiAgICBhY2M6IEEsXG4gICAgcHJldmlvdXM6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSxcbiAgICBpbmRleDogbnVtYmVyLFxuKSA9PiBBIHwgdW5kZWZpbmVkO1xuZXhwb3J0IGludGVyZmFjZSBRdWFkVHJlZU9wdGlvbnM8VD4ge1xuICB1bml0S2V5R2V0dGVyOiBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+LFxuICBpbnRlZ2VyQ29vcmRpbmF0ZT86IGJvb2xlYW4sXG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICByZWFkb25seSBib3VuZHM6IEFBQkI7XG4gIHJlYWRvbmx5IHNpemU6IG51bWJlclxuICBoYXModmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlTaXplKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICApOiBudW1iZXI7XG59XG5leHBvcnQgY2xhc3MgUXVhZFRyZWU8VD4gaW1wbGVtZW50cyBSZWFkb25seVF1YWRUcmVlPFQ+IHtcbiAgc3RhdGljIE1heEVsZW1lbnRzID0gODtcbiAgc3RhdGljIE1heERlcHRoID0gODtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyA9IChcbiAgICAgIHZlYzogVmVjMixcbiAgICAgIF86IGFueSxcbiAgICAgIHF1YWRUcmVlOiBRdWFkVHJlZTxhbnk+LFxuICApID0+XG4gICAgcXVhZFRyZWUub3B0aW9ucy5pbnRlZ2VyQ29vcmRpbmF0ZSA/XG4gICAgICB2ZWMueCArIChxdWFkVHJlZS5ib3VuZHMuc2l6ZS54ICogMikgKiB2ZWMueSA6XG4gICAgICBgJHt2ZWMueH0sJHt2ZWMueX1gO1xuXG4gIGJvdW5kczogQUFCQjtcblxuICBwcml2YXRlIGRlcHRoOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBkaXZpZGVkOiBib29sZWFuO1xuXG4gIHByaXZhdGUgdW5pdHM6IHtba2V5OiBzdHJpbmcgfCBudW1iZXJdOiB7dW5pdDogVCwgdmVjOiBWZWMyfX07XG5cbiAgcHJpdmF0ZSBub3J0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBub3J0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBfc2l6ZTogbnVtYmVyO1xuXG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLl9zaXplO1xuICB9XG5cbiAgcmVhZG9ubHkgb3B0aW9uczogUXVhZFRyZWVPcHRpb25zPFQ+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgYm91bmRzOiBBQUJCLFxuICAgICAgb3B0aW9ucz86IFF1YWRUcmVlT3B0aW9uczxUPixcbiAgICAgIGRlcHRoOiBudW1iZXIgPSAwLFxuICApIHtcbiAgICB0aGlzLmJvdW5kcyA9IGJvdW5kcztcbiAgICB0aGlzLmRlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5kaXZpZGVkID0gZmFsc2U7XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICAgIHRoaXMuX3NpemUgPSAwO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge1xuICAgICAgdW5pdEtleUdldHRlcjogUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jLFxuICAgIH07XG4gIH1cbiAgX2FkZCh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBmYWxzZSB8ICdhZGRlZCcgfCAnZXhpc3RpbmcnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5kZXB0aCA9PSBRdWFkVHJlZS5NYXhEZXB0aCB8fFxuICAgICAgIXRoaXMuZGl2aWRlZCAmJiB0aGlzLnNpemUgPCBRdWFkVHJlZS5NYXhFbGVtZW50cykge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIGxldCByZXN1bHQ6ICdleGlzdGluZycgfCAnYWRkZWQnID0gJ2V4aXN0aW5nJztcbiAgICAgIGlmICghdGhpcy51bml0c1trZXldKSB7XG4gICAgICAgIHRoaXMuX3NpemUgKys7XG4gICAgICAgIHJlc3VsdCA9ICdhZGRlZCc7XG4gICAgICB9XG4gICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjLCB1bml0fTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB0aGlzLmRpdmlkZSgpO1xuICAgIGNvbnN0IGluc2VydGVkID0gdGhpcy5ub3J0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpO1xuICAgIGlmIChpbnNlcnRlZCA9PT0gJ2FkZGVkJykgdGhpcy5fc2l6ZSArKztcbiAgICByZXR1cm4gaW5zZXJ0ZWQ7XG4gIH1cbiAgYWRkKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuX2FkZCh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgX21vdmUoXG4gICAgICBmcm9tOiBWZWMyLFxuICAgICAgdG86IFZlYzIgfCB1bmRlZmluZWQsXG4gICAgICB1bml0OiBULFxuICApOiBmYWxzZSB8ICdyZW1vdmVkJyB8ICdtb3ZlZCcge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgZnJvbSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIoZnJvbSwgdW5pdCwgdGhpcyk7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodG8gJiYgQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdG8pKSB7XG4gICAgICAgIC8vIHVwZGF0ZSBpbi1wbGFjZVxuICAgICAgICBjb25zdCBuZXdLZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih0bywgdW5pdCwgdGhpcyk7XG4gICAgICAgIGlmIChuZXdLZXkgIT09IGtleSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICAgICAgdGhpcy51bml0c1tuZXdLZXldID0ge3ZlYzogdG8sIHVuaXR9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudW5pdHNba2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ21vdmVkJztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICB0aGlzLl9zaXplIC0tO1xuICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ub3J0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5ub3J0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpO1xuICAgIGlmIChyZXN1bHQgPT09ICdyZW1vdmVkJykge1xuICAgICAgdGhpcy5fc2l6ZSAtLTtcbiAgICAgIGlmICh0bykge1xuICAgICAgICBpZiAodGhpcy5hZGQodG8sIHVuaXQpKSByZXR1cm4gJ21vdmVkJztcbiAgICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBtb3ZlKGZyb206IFZlYzIsIHRvOiBWZWMyLCB1bml0OiBUKTogYm9vbGVhbiB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB0bykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5fbW92ZShmcm9tLCB0bywgdW5pdCkgPT09ICdyZW1vdmVkJykgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRlKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9tb3ZlKHZlYywgdW5kZWZpbmVkLCB1bml0KSA9PT0gJ3JlbW92ZWQnO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLl9zaXplID0gMDtcbiAgICB0aGlzLmRpdmlkZWQgPSBmYWxzZTtcbiAgICB0aGlzLm5vcnRoV2VzdCA9XG4gICAgICB0aGlzLm5vcnRoRWFzdCA9XG4gICAgICB0aGlzLnNvdXRoV2VzdCA9XG4gICAgICB0aGlzLnNvdXRoRWFzdCA9IHVuZGVmaW5lZCE7XG4gIH1cbiAgaGFzKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdmVjKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih2ZWMsIHVuaXQsIHRoaXMpO1xuICAgICAgcmV0dXJuICEhdGhpcy51bml0c1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub3J0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuaGFzKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBkaXZpZGUoKSB7XG4gICAgdGhpcy5kaXZpZGVkID0gdHJ1ZTtcbiAgICBjb25zdCBodyA9IHRoaXMuYm91bmRzLnNpemUueCAvIDI7XG4gICAgY29uc3QgaGggPSB0aGlzLmJvdW5kcy5zaXplLnkgLyAyO1xuXG4gICAgdGhpcy5ub3J0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgLSBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMubm9ydGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLnNvdXRoV2VzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCAtIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSArIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aEVhc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggKyBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuXG4gICAgZm9yIChjb25zdCB7dmVjLCB1bml0fSBvZiBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpKSB7XG4gICAgICB0aGlzLm5vcnRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5hZGQodmVjLCB1bml0KTtcbiAgICB9XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICB9XG4gIHByaXZhdGUgX3F1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIG1hcEZ1bmM6ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpZHg6IG51bWJlcikgPT4gQSkgfCB1bmRlZmluZWQsXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApOiBJdGVyYWJsZTxBPiB7XG4gICAgaWYgKHNoYXBlICYmICFTaGFwZS5wb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlLCB0aGlzLmJvdW5kcykpIHJldHVybiBbXTtcblxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICByZXR1cm4gQ29sbGVjdGlvbi5vYmplY3RWYWx1ZXNUb0l0ZXJhYmxlKFxuICAgICAgICAgIHRoaXMudW5pdHMsXG4gICAgICAgICAgc2hhcGUgPyAodikgPT4gU2hhcGUub3ZlcmxhcHNWZWMoc2hhcGUsIHYudmVjKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBtYXBGdW5jLFxuICAgICAgICAgIGluZGV4LFxuICAgICAgKSBhcyBJdGVyYWJsZTxBPjtcbiAgICB9XG4gICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgIHJldHVybiBDb2xsZWN0aW9uLnRvSXRlcmFibGVXaXRoTWFwKFxuICAgICAgICAgIG1hcEZ1bmMsXG4gICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgKCkgPT4gdGhpcy5ub3J0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgKCkgPT4gdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgKCkgPT4gdGhpcy5zb3V0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgKCkgPT4gdGhpcy5zb3V0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gQ29sbGVjdGlvbi50b0l0ZXJhYmxlKFxuICAgICAgICAoKSA9PiB0aGlzLm5vcnRoV2VzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICAgKCkgPT4gdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICgpID0+IHRoaXMuc291dGhXZXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICAoKSA9PiB0aGlzLnNvdXRoRWFzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICApO1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGlkeDogbnVtYmVyKSA9PiBBLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmNPclNoYXBlPzogKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGlkeDogbnVtYmVyKSA9PiBBKSB8IFNoYXBlLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT4ge1xuICAgIGlmICh0eXBlb2YgbWFwRnVuY09yU2hhcGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIG1hcEZ1bmNPclNoYXBlLCB7aW5kZXg6IDB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5SXRlcmF0YWJsZSh1bmRlZmluZWQsIHVuZGVmaW5lZCwge2luZGV4OiAwfSk7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgX3F1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU6IEEgfCB1bmRlZmluZWQsXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApOiBBIHtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkge1xuICAgICAgcmV0dXJuIGluaXRpYWxWYWx1ZSE7XG4gICAgfVxuICAgIGxldCB2YWx1ZTogQSA9IGluaXRpYWxWYWx1ZSE7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGlmIChzaGFwZSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3QgayBpbiB0aGlzLnVuaXRzKSB7XG4gICAgICAgICAgY29uc3QgdW5pdCA9IHRoaXMudW5pdHNba107XG4gICAgICAgICAgaWYgKFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlLCB1bml0LnZlYykpIHtcbiAgICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2tGdW5jKHZhbHVlLCB1bml0LCBpbmRleC5pbmRleCsrKSE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3QgayBpbiB0aGlzLnVuaXRzKSB7XG4gICAgICAgICAgY29uc3QgdW5pdCA9IHRoaXMudW5pdHNba107XG4gICAgICAgICAgdmFsdWUgPSBjYWxsYmFja0Z1bmModmFsdWUsIHVuaXQsIGluZGV4LmluZGV4KyspITtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhXZXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHZhbHVlID0gdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlLCBpbmRleCk7XG4gICAgdmFsdWUgPSB0aGlzLnNvdXRoV2VzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUsIGluZGV4KTtcbiAgICB2YWx1ZSA9IHRoaXMuc291dGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmM6IFNoYXBlIHwgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWU6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiB8IEEsXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQSB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yQ2FsbGJhY2tGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2UoXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgQSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgICAgIGluaXRpYWxWYWx1ZSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4+KFxuICAgICAgICBzaGFwZSxcbiAgICAgICAgKGFyciwgdikgPT4ge1xuICAgICAgICAgIGFyci5wdXNoKHYpO1xuICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgIH0sXG4gICAgICAgIFtdLFxuICAgICAgICB7aW5kZXg6IDB9LFxuICAgICk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckZvcmVhY2hGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBzaGFwZU9yRm9yZWFjaEZ1bmModiwgaW5kZXgpLFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFmb3JlYWNoRnVuYykgcmV0dXJuO1xuICAgICAgdGhpcy5fcXVlcnlSZWR1Y2U8dm9pZD4oXG4gICAgICAgICAgc2hhcGVPckZvcmVhY2hGdW5jLFxuICAgICAgICAgIChfLCB2LCBpbmRleCkgPT4gZm9yZWFjaEZ1bmModiwgaW5kZXgpLFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yTWFwRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2goc2hhcGVPck1hcEZ1bmModiwgaW5kZXgpKTtcbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBbXSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHNoYXBlT3JNYXBGdW5jLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChtYXBGdW5jKHYsIGluZGV4KSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10sXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHF1ZXJ5U2l6ZShcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8bnVtYmVyPihcbiAgICAgICAgc2hhcGUsXG4gICAgICAgIChzaXplKSA9PiBzaXplICsgMSxcbiAgICAgICAgMCxcbiAgICAgICAge2luZGV4OiAwfSxcbiAgICApO1xuICB9XG4gIF9kdW1wVG9TdHJpbmcocmVzdWx0OiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHByZWZpeCA9ICcgICAgICAgICAgICAnLnN1YnN0cmluZygwLCB0aGlzLmRlcHRoKTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgcmVzdWx0LnB1c2gocHJlZml4KTtcbiAgICAgIHJlc3VsdC5wdXNoKEpTT04uc3RyaW5naWZ5KHRoaXMudW5pdHMpKTtcbiAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgW1xuICAgICAge3N0cjogJ05XJywgcXQ6IHRoaXMubm9ydGhXZXN0fSxcbiAgICAgIHtzdHI6ICdORScsIHF0OiB0aGlzLm5vcnRoRWFzdH0sXG4gICAgICB7c3RyOiAnU1cnLCBxdDogdGhpcy5zb3V0aFdlc3R9LFxuICAgICAge3N0cjogJ1NFJywgcXQ6IHRoaXMuc291dGhFYXN0fSxcbiAgICBdKSB7XG4gICAgICByZXN1bHQucHVzaChwcmVmaXgpO1xuICAgICAgcmVzdWx0LnB1c2goY2hpbGQuc3RyKTtcbiAgICAgIHJlc3VsdC5wdXNoKGAgKCR7Y2hpbGQucXQuc2l6ZX0pOlxcbmApO1xuICAgICAgY2hpbGQucXQuX2R1bXBUb1N0cmluZyhyZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2R1bXBUb1N0cmluZyhbXSkuam9pbignJyk7XG4gIH1cbn1cbiIsImltcG9ydCB7XG4gIFF1YWRUcmVlLFxuICBRdWFkVHJlZU9wdGlvbnMsXG59IGZyb20gJy4vUXVhZFRyZWUnO1xuaW1wb3J0IHtBQUJCLCBTaGFwZSwgVmVjMn0gZnJvbSAnLi9zaGFwZSc7XG5cbmV4cG9ydCB0eXBlIFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+ID0gKG86IFQpID0+IFZlYzI7XG5leHBvcnQgdHlwZSBRdWFkTWFwVW5pdFBvc2l0aW9uU2V0dGVyRnVuYzxUPiA9IChvOiBULCBwb3NpdGlvbjogVmVjMikgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiA9IChcbiAgYWNjOiBBLFxuICBwcmV2aW91czoge3ZlYzogVmVjMiwgdW5pdDogVH0sXG4gIGluZGV4OiBudW1iZXIsXG4pID0+IEEgfCB1bmRlZmluZWQ7XG5leHBvcnQgY2xhc3MgUXVhZFRyZWVQb3NpdGlvbk91dE9mQm91bmRzRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICB9XG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWVTZXQ8VD4gZXh0ZW5kcyBSZWFkb25seVNldDxUPiB7XG4gIHJlYWRvbmx5IGJvdW5kczogQUFCQjtcbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogU2V0SXRlcmF0b3I8VD47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeU1hcDxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVNldDxUPiBpbXBsZW1lbnRzIFNldDxUPiwgUmVhZG9ubHlRdWFkVHJlZVNldDxUPiB7XG4gIHN0YXRpYyBVbmlxdWVVbml0QXRWZWNLZXlGdW5jID0gUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jO1xuICBwcml2YXRlIHF1YXJkVHJlZTogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPjtcbiAgY29uc3RydWN0b3IoYm91bmRzOiBBQUJCLCBvcHRpb25zOiBRdWFkVHJlZU9wdGlvbnM8VD4gJiB7XG4gICAgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPixcbiAgfSkge1xuICAgIHRoaXMucXVhcmRUcmVlID0gbmV3IFF1YWRUcmVlKGJvdW5kcywgb3B0aW9ucyk7XG4gICAgdGhpcy51bml0UG9zaXRpb25HZXR0ZXIgPSBvcHRpb25zLnVuaXRQb3NpdGlvbkdldHRlcjtcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuc2l6ZTtcbiAgfVxuICBnZXQgYm91bmRzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5ib3VuZHM7XG4gIH1cbiAgYWRkKHQ6IFQpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpO1xuICAgIGlmICghdGhpcy5xdWFyZFRyZWUuYWRkKHBvc2l0aW9uLCB0KSkge1xuICAgICAgdGhyb3cgbmV3IFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yKFxuICAgICAgICAgIGBwb3NpdGlvbiAke0pTT04uc3RyaW5naWZ5KHBvc2l0aW9uKX0gaXMgb3V0IG9mIGJvdW5kczpgICtcbiAgICAgICAgICBgICR7SlNPTi5zdHJpbmdpZnkodGhpcy5xdWFyZFRyZWUuYm91bmRzKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgbW92ZSh0OiBULCB0bzogVmVjMikge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5tb3ZlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0bywgdCk7XG4gIH1cbiAgZGVsZXRlKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuZGVsZXRlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBoYXModDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5oYXModGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMucXVhcmRUcmVlLmNsZWFyKCk7XG4gIH1cbiAgZm9yRWFjaChcbiAgICAgIGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgdmFsdWUyOiBULCBzZXQ6IFNldDxUPikgPT4gdm9pZCxcbiAgICAgIHRoaXNBcmc/OiBhbnksXG4gICk6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgKF8sIHApID0+IHZvaWQoY2FsbGJhY2tmbihwLnVuaXQhLCBwLnVuaXQhLCB0aGlzQXJnKSksXG4gICAgICAgIHZvaWQoMCksXG4gICAgKTtcbiAgfVxuICBlbnRyaWVzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8W1QsIFRdPihcbiAgICAgICAgKHApID0+IFtwLnVuaXQhLCBwLnVuaXQhXSkgYXMgYW55O1xuICB9XG4gIGtleXMoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgdmFsdWVzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8VD4oXG4gICAgICAgIChwKSA9PiBwLnVuaXQhKSBhcyBhbnk7XG4gIH1cbiAgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpIGFzXG4gICAgICBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT47XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyBhcyBTaGFwZSxcbiAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgYW55LFxuICAgICAgICBpbml0aWFsVmFsdWUpO1xuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5QXJyYXkoc2hhcGUpIGFzIGFueTtcbiAgfVxuXG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkKSxcbiAgICAgIGZvcmVhY2hGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApIHtcbiAgICB0aGlzLnF1YXJkVHJlZS5xdWVyeUZvckVhY2goc2hhcGVPckZvcmVhY2hGdW5jIGFzIGFueSwgZm9yZWFjaEZ1bmMgYXMgYW55KTtcbiAgfVxuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEpLFxuICAgICAgbWFwRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeU1hcChzaGFwZU9yTWFwRnVuYyBhcyBTaGFwZSwgbWFwRnVuYyBhcyBhbnkpO1xuICB9XG4gIHF1ZXJ5U2l6ZShcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlTaXplKHNoYXBlKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbIkNvbGxlY3Rpb24iLCJBQUJCIiwiU2hhcGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUdpQkEsNEJBa0poQjtBQWxKRCxDQUFBLFVBQWlCLFVBQVUsRUFBQTtJQUN6QixTQUFnQixPQUFPLENBQUksQ0FBZ0IsRUFBQTtBQUN6QyxRQUFBLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRTtBQUN0QixZQUFBLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFDRCxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUM7QUFDbEIsUUFBQSxJQUFLLENBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO0FBQ3hDLFlBQUEsS0FBSyxNQUFNLENBQUMsSUFBSyxDQUFrQixFQUFFO0FBQ25DLGdCQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDWDtBQUNELFlBQUEsT0FBTyxDQUFDLENBQUM7U0FDVjtBQUNELFFBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2pCLFFBQUEsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJ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QUUsRUFBRSxFQUFDO1NBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdkQsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksUUFBUSxDQUFDO1lBQzVCLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO1lBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQztTQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztZQUM1QixNQUFNLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQztZQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7U0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2RCxRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUM7WUFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7WUFDcEUsSUFB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
