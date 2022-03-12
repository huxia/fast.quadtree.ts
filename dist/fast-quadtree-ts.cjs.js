
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.0.7
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
    function* toIterableWithFilter(filterFunc, ...childIterators) {
        for (const func of childIterators) {
            if (!func)
                continue;
            const iterator = func();
            if (iterator instanceof Array) {
                for (const result of iterator) {
                    if (!filterFunc || filterFunc(result)) {
                        yield result;
                    }
                }
            }
            else {
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
    Collection.toIterableWithFilter = toIterableWithFilter;
    function* toIterableWithMap(mapFunc, ...childIterators) {
        for (const func of childIterators) {
            if (!func)
                continue;
            const iterator = func();
            if (iterator instanceof Array) {
                for (const result of iterator) {
                    yield mapFunc(result);
                }
            }
            else {
                let result = iterator.next();
                while (!result.done) {
                    yield mapFunc(result.value);
                    result = iterator.next();
                }
            }
        }
    }
    Collection.toIterableWithMap = toIterableWithMap;
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
    static MaxElements = 8;
    static MaxDepth = 8;
    static UniqueUnitAtPositionKeyFunc = (vec, _, quadTree) => quadTree.options.integerCoordinate ?
        vec.x + (quadTree.bounds.size.x * 2) * vec.y :
        `${vec.x},${vec.y}`;
    bounds;
    depth;
    divided;
    units;
    northWest;
    northEast;
    southWest;
    southEast;
    size;
    options;
    constructor(bounds, options, depth = 0) {
        this.bounds = bounds;
        this.depth = depth;
        this.divided = false;
        this.units = {};
        this.size = 0;
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
                this.size++;
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
            this.size++;
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
            this.size--;
            return 'removed';
        }
        const result = this.northWest._move(from, to, unit) ||
            this.northEast._move(from, to, unit) ||
            this.southWest._move(from, to, unit) ||
            this.southEast._move(from, to, unit);
        if (result === 'removed') {
            this.size--;
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
        this.size = 0;
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
    queryIteratable(mapFuncOrShape, shape) {
        const mapFunc = typeof mapFuncOrShape === 'function' ?
            mapFuncOrShape :
            undefined;
        if (shape && !exports.Shape.possiblelyOverlapsAABB(shape, this.bounds))
            return [];
        if (!this.divided) {
            let arr = Object.values(this.units);
            if (shape) {
                arr = arr.filter((r) => exports.Shape.overlapsVec(shape, r.vec));
            }
            if (mapFunc)
                return arr.map(mapFunc);
            return arr;
        }
        if (mapFunc) {
            return exports.Collection.toIterableWithMap(mapFunc, () => this.northWest.queryIteratable(shape), () => this.northEast.queryIteratable(shape), () => this.southWest.queryIteratable(shape), () => this.southEast.queryIteratable(shape));
        }
        return exports.Collection.toIterable(() => this.northWest.queryIteratable(shape), () => this.northEast.queryIteratable(shape), () => this.southWest.queryIteratable(shape), () => this.southEast.queryIteratable(shape));
    }
    _queryReduce(shape, callbackFunc, initialValue) {
        if (shape && !exports.Shape.possiblelyOverlapsAABB(shape, this.bounds)) {
            return initialValue;
        }
        if (!this.divided) {
            let arr = Object.values(this.units);
            if (shape) {
                arr = arr.filter((r) => exports.Shape.overlapsVec(shape, r.vec));
            }
            return arr.reduce(callbackFunc, initialValue);
        }
        let value = initialValue;
        value = this.northWest._queryReduce(shape, callbackFunc, value);
        value = this.northEast._queryReduce(shape, callbackFunc, value);
        value = this.southWest._queryReduce(shape, callbackFunc, value);
        value = this.southEast._queryReduce(shape, callbackFunc, value);
        return value;
    }
    queryReduce(shapeOrCallbackFunc, callbackFuncOrInitialValue, initialValue) {
        if (typeof shapeOrCallbackFunc === 'function') {
            return this._queryReduce(undefined, shapeOrCallbackFunc, callbackFuncOrInitialValue);
        }
        else {
            return this._queryReduce(shapeOrCallbackFunc, callbackFuncOrInitialValue, initialValue);
        }
    }
    queryArray(shape) {
        return this._queryReduce(shape, (arr, v) => {
            arr.push(v);
            return arr;
        }, []);
    }
    queryForEach(shapeOrForeachFunc, foreachFunc) {
        if (typeof shapeOrForeachFunc === 'function') {
            this._queryReduce(undefined, (_, v, index) => shapeOrForeachFunc(v, index));
        }
        else {
            if (!foreachFunc)
                return;
            this._queryReduce(shapeOrForeachFunc, (_, v, index) => foreachFunc(v, index));
        }
    }
    queryMap(shapeOrMapFunc, mapFunc) {
        if (typeof shapeOrMapFunc === 'function') {
            if (!mapFunc)
                return [];
            return this._queryReduce(undefined, (arr, v, index) => {
                arr.push(shapeOrMapFunc(v, index));
                return arr;
            }, []);
        }
        else {
            if (!mapFunc)
                return [];
            return this._queryReduce(shapeOrMapFunc, (arr, v, index) => {
                arr.push(mapFunc(v, index));
                return arr;
            }, []);
        }
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

class QuadTreePositionOutOfBoundsError extends Error {
    constructor(message) {
        super(message);
    }
}
class QuadTreeSet {
    static UniqueUnitAtVecKeyFunc = QuadTree.UniqueUnitAtPositionKeyFunc;
    quardTree;
    unitPositionGetter;
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
    forEach(callbackfn) {
        return this.quardTree.queryReduce((_, p) => callbackfn(p.unit, p.unit, this));
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
}

exports.QuadTree = QuadTree;
exports.QuadTreeSet = QuadTreeSet;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5janMuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb2xsZWN0aW9uLnRzIiwiLi4vLi4vc3JjL3NoYXBlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlU2V0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbjxUPiA9IEl0ZXJhdG9yPFQ+IHwgQXJyYXk8VD47XG5leHBvcnQgdHlwZSBJdGVyYWJsZTxUPiA9IEl0ZXJhYmxlSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCBuYW1lc3BhY2UgQ29sbGVjdGlvbiB7XG4gIGV4cG9ydCBmdW5jdGlvbiB0b0FycmF5PFQ+KGM6IENvbGxlY3Rpb248VD4pIHtcbiAgICBpZiAoYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgY29uc3QgcjogVFtdID0gW107XG4gICAgaWYgKChjIGFzIEdlbmVyYXRvcjxUPilbU3ltYm9sLml0ZXJhdG9yXSkge1xuICAgICAgZm9yIChjb25zdCBpIG9mIChjIGFzIEdlbmVyYXRvcjxUPikpIHtcbiAgICAgICAgci5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGxldCBpID0gYy5uZXh0KCk7XG4gICAgd2hpbGUgKCFpLmRvbmUpIHtcbiAgICAgIHIucHVzaChpLnZhbHVlKTtcbiAgICAgIGkgPSBjLm5leHQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlPFQ+KFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gZnVuYygpO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiogdG9JdGVyYWJsZVdpdGhGaWx0ZXI8VD4oXG4gICAgICBmaWx0ZXJGdW5jOiAoKG86IFQpID0+IGJvb2xlYW4pLFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gZnVuYygpO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmMgfHwgZmlsdGVyRnVuYyhyZXN1bHQpKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgaWYgKCFmaWx0ZXJGdW5jIHx8IGZpbHRlckZ1bmMocmVzdWx0LnZhbHVlKSkge1xuICAgICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aE1hcDxULCBBPihcbiAgICAgIG1hcEZ1bmM6ICgobzogVCkgPT4gQSksXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKCgpID0+IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImV4cG9ydCBpbnRlcmZhY2UgVmVjMiB7XG4gIHg6IG51bWJlcjtcbiAgeTogbnVtYmVyO1xufVxuZXhwb3J0IGludGVyZmFjZSBBQUJCIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBWZWMyO1xufVxuZXhwb3J0IG5hbWVzcGFjZSBBQUJCIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKGFhYmI6IEFBQkIsIHZlYzogVmVjMik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhYWJiLmNlbnRlci54IC0gYWFiYi5zaXplLnggPD0gdmVjLnggJiZcbiAgICAgIHZlYy54IDw9IGFhYmIuY2VudGVyLnggKyBhYWJiLnNpemUueCAmJlxuICAgICAgYWFiYi5jZW50ZXIueSAtIGFhYmIuc2l6ZS55IDw9IHZlYy55ICYmXG4gICAgICB2ZWMueSA8PSBhYWJiLmNlbnRlci55ICsgYWFiYi5zaXplLnk7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzQUFCQihvbmU6IEFBQkIsIGFub3RoZXI6IEFBQkIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIShcbiAgICAgIGFub3RoZXIuY2VudGVyLnggLSBhbm90aGVyLnNpemUueCA+IG9uZS5jZW50ZXIueCArIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnggKyBhbm90aGVyLnNpemUueCA8IG9uZS5jZW50ZXIueCAtIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgLSBhbm90aGVyLnNpemUueSA+IG9uZS5jZW50ZXIueSArIG9uZS5zaXplLnkgfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgKyBhbm90aGVyLnNpemUueSA8IG9uZS5jZW50ZXIueSAtIG9uZS5zaXplLnlcbiAgICApO1xuICB9XG59XG50eXBlIFJlY3RhbmdsZVNoYXBlID0ge1xuICB0eXBlOiAncmVjdGFuZ2xlJ1xufSAmIEFBQkI7XG50eXBlIEVsbGlwc2VTaGFwZSA9IHtcbiAgdHlwZTogJ2VsbGlwc2UnXG59ICYgQUFCQjtcbnR5cGUgQ2lyY2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdjaXJjbGUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG50eXBlIFNxdWFyZVNoYXBlID0ge1xuICB0eXBlOiAnc3F1YXJlJ1xufSAmIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBudW1iZXI7XG59O1xuZXhwb3J0IHR5cGUgU2hhcGUgPSBSZWN0YW5nbGVTaGFwZSB8IEVsbGlwc2VTaGFwZSB8IENpcmNsZVNoYXBlIHwgU3F1YXJlU2hhcGU7XG5leHBvcnQgbmFtZXNwYWNlIFNoYXBlIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKHNoYXBlOiBTaGFwZSwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoIChzaGFwZS50eXBlKSB7XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOiByZXR1cm4gQUFCQi5vdmVybGFwc1ZlYyhzaGFwZSwgdmVjKTtcbiAgICAgIGNhc2UgJ3NxdWFyZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHtcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdjaXJjbGUnOiByZXR1cm4gU2hhcGUub3ZlcmxhcHNWZWMoe1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICB9LCB2ZWMpO1xuICAgICAgY2FzZSAnZWxsaXBzZSc6IHtcbiAgICAgICAgY29uc3QgcCA9XG4gICAgICAgICAgTWF0aC5wb3codmVjLnggLSBzaGFwZS5jZW50ZXIueCwgMikgLyBNYXRoLnBvdyhzaGFwZS5zaXplLngsIDIpICtcbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueSAtIHNoYXBlLmNlbnRlci55LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueSwgMik7XG4gICAgICAgIHJldHVybiBwIDw9IDE7XG4gICAgICB9XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gcG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZTogU2hhcGUsIGFhYmI6IEFBQkIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2VsbGlwc2UnOlxuICAgICAgY2FzZSAncmVjdGFuZ2xlJzpcbiAgICAgICAgcmV0dXJuIEFBQkIub3ZlcmxhcHNBQUJCKHNoYXBlLCBhYWJiKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6XG4gICAgICBjYXNlICdzcXVhcmUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoe1xuICAgICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgICAgfSwgYWFiYik7XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVjdGFuZ2xlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnc3F1YXJlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3JlY3RhbmdsZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGxpcHNlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnY2lyY2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2VsbGlwc2UnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHtDb2xsZWN0aW9uLCBJdGVyYWJsZX0gZnJvbSAnLi9jb2xsZWN0aW9uJztcbmltcG9ydCB7VmVjMiwgQUFCQiwgU2hhcGV9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+ID0gKFxuICB2ZWM6IFZlYzIsIHVuaXQ6IFQgfCB1bmRlZmluZWQsIHF1YWRUcmVlOiBRdWFkVHJlZTxUPlxuKSA9PiBzdHJpbmcgfCBudW1iZXI7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gICAgYWNjOiBBLFxuICAgIHByZXZpb3VzOiB7dmVjOiBWZWMyLCB1bml0PzogVH0sXG4gICAgaW5kZXg6IG51bWJlcixcbikgPT4gQSB8IHVuZGVmaW5lZDtcbmV4cG9ydCBpbnRlcmZhY2UgUXVhZFRyZWVPcHRpb25zPFQ+IHtcbiAgdW5pdEtleUdldHRlcjogUXVhZFRyZWVVbml0S2V5RnVuYzxUPixcbiAgaW50ZWdlckNvb3JkaW5hdGU/OiBib29sZWFuLFxufVxuZXhwb3J0IGNsYXNzIFF1YWRUcmVlPFQ+IHtcbiAgc3RhdGljIE1heEVsZW1lbnRzID0gODtcbiAgc3RhdGljIE1heERlcHRoID0gODtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyA9IChcbiAgICAgIHZlYzogVmVjMixcbiAgICAgIF86IGFueSxcbiAgICAgIHF1YWRUcmVlOiBRdWFkVHJlZTxhbnk+LFxuICApID0+XG4gICAgcXVhZFRyZWUub3B0aW9ucy5pbnRlZ2VyQ29vcmRpbmF0ZSA/XG4gICAgICB2ZWMueCArIChxdWFkVHJlZS5ib3VuZHMuc2l6ZS54ICogMikgKiB2ZWMueSA6XG4gICAgICBgJHt2ZWMueH0sJHt2ZWMueX1gO1xuXG4gIGJvdW5kczogQUFCQjtcblxuICBwcml2YXRlIGRlcHRoOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBkaXZpZGVkOiBib29sZWFuO1xuXG4gIHByaXZhdGUgdW5pdHM6IHtba2V5OiBzdHJpbmcgfCBudW1iZXJdOiB7dW5pdD86IFQsIHZlYzogVmVjMn19O1xuXG4gIHByaXZhdGUgbm9ydGhXZXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgbm9ydGhFYXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgc291dGhXZXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgc291dGhFYXN0ITogUXVhZFRyZWU8VD47XG5cbiAgc2l6ZTogbnVtYmVyO1xuXG4gIHJlYWRvbmx5IG9wdGlvbnM6IFF1YWRUcmVlT3B0aW9uczxUPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIGJvdW5kczogQUFCQixcbiAgICAgIG9wdGlvbnM/OiBRdWFkVHJlZU9wdGlvbnM8VD4sXG4gICAgICBkZXB0aDogbnVtYmVyID0gMCxcbiAgKSB7XG4gICAgdGhpcy5ib3VuZHMgPSBib3VuZHM7XG4gICAgdGhpcy5kZXB0aCA9IGRlcHRoO1xuICAgIHRoaXMuZGl2aWRlZCA9IGZhbHNlO1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLnNpemUgPSAwO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge1xuICAgICAgdW5pdEtleUdldHRlcjogUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jLFxuICAgIH07XG4gIH1cbiAgX2FkZCh2ZWM6IFZlYzIsIHVuaXQ/OiBUKTogZmFsc2UgfCAnYWRkZWQnIHwgJ2V4aXN0aW5nJyB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB2ZWMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZGVwdGggPT0gUXVhZFRyZWUuTWF4RGVwdGggfHxcbiAgICAgICF0aGlzLmRpdmlkZWQgJiYgdGhpcy5zaXplIDwgUXVhZFRyZWUuTWF4RWxlbWVudHMpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKHZlYywgdW5pdCwgdGhpcyk7XG4gICAgICBsZXQgcmVzdWx0OiAnZXhpc3RpbmcnIHwgJ2FkZGVkJyA9ICdleGlzdGluZyc7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICB0aGlzLnNpemUgKys7XG4gICAgICAgIHJlc3VsdCA9ICdhZGRlZCc7XG4gICAgICB9XG4gICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjLCB1bml0fTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB0aGlzLmRpdmlkZSgpO1xuICAgIGNvbnN0IGluc2VydGVkID0gdGhpcy5ub3J0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpO1xuICAgIGlmIChpbnNlcnRlZCA9PT0gJ2FkZGVkJykgdGhpcy5zaXplICsrO1xuICAgIHJldHVybiBpbnNlcnRlZDtcbiAgfVxuICBhZGQodmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuX2FkZCh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgX21vdmUoXG4gICAgICBmcm9tOiBWZWMyLFxuICAgICAgdG86IFZlYzIgfCB1bmRlZmluZWQsXG4gICAgICB1bml0PzogVCxcbiAgKTogZmFsc2UgfCAncmVtb3ZlZCcgfCAnbW92ZWQnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIGZyb20pKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKGZyb20sIHVuaXQsIHRoaXMpO1xuICAgICAgaWYgKCF0aGlzLnVuaXRzW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHRvICYmIEFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHRvKSkge1xuICAgICAgICAvLyB1cGRhdGUgaW4tcGxhY2VcbiAgICAgICAgY29uc3QgbmV3S2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodG8sIHVuaXQsIHRoaXMpO1xuICAgICAgICBpZiAobmV3S2V5ICE9PSBrZXkpIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy51bml0c1trZXldO1xuICAgICAgICAgIHRoaXMudW5pdHNbbmV3S2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjOiB0bywgdW5pdH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdtb3ZlZCc7XG4gICAgICB9XG4gICAgICBkZWxldGUgdGhpcy51bml0c1trZXldO1xuICAgICAgdGhpcy5zaXplIC0tO1xuICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ub3J0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5ub3J0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpO1xuICAgIGlmIChyZXN1bHQgPT09ICdyZW1vdmVkJykge1xuICAgICAgdGhpcy5zaXplIC0tO1xuICAgICAgaWYgKHRvKSB7XG4gICAgICAgIGlmICh0aGlzLmFkZCh0bywgdW5pdCkpIHJldHVybiAnbW92ZWQnO1xuICAgICAgICByZXR1cm4gJ3JlbW92ZWQnO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIG1vdmUoZnJvbTogVmVjMiwgdG86IFZlYzIsIHVuaXQ/OiBUKTogYm9vbGVhbiB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB0bykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5fbW92ZShmcm9tLCB0bywgdW5pdCkgPT09ICdyZW1vdmVkJykgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRlKHZlYzogVmVjMiwgdW5pdD86IFQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZSh2ZWMsIHVuZGVmaW5lZCwgdW5pdCkgPT09ICdyZW1vdmVkJztcbiAgfVxuICBjbGVhcigpIHtcbiAgICB0aGlzLnVuaXRzID0ge307XG4gICAgdGhpcy5zaXplID0gMDtcbiAgICB0aGlzLmRpdmlkZWQgPSBmYWxzZTtcbiAgICB0aGlzLm5vcnRoV2VzdCA9XG4gICAgICB0aGlzLm5vcnRoRWFzdCA9XG4gICAgICB0aGlzLnNvdXRoV2VzdCA9XG4gICAgICB0aGlzLnNvdXRoRWFzdCA9IHVuZGVmaW5lZCE7XG4gIH1cbiAgaGFzKHZlYzogVmVjMiwgdW5pdD86IFQpOiBib29sZWFuIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIHJldHVybiAhIXRoaXMudW5pdHNba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9ydGhXZXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhFYXN0Lmhhcyh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgZGl2aWRlKCkge1xuICAgIHRoaXMuZGl2aWRlZCA9IHRydWU7XG4gICAgY29uc3QgaHcgPSB0aGlzLmJvdW5kcy5zaXplLnggLyAyO1xuICAgIGNvbnN0IGhoID0gdGhpcy5ib3VuZHMuc2l6ZS55IC8gMjtcblxuICAgIHRoaXMubm9ydGhXZXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54IC0gaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLm5vcnRoRWFzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCArIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSAtIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMuc291dGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55ICsgaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcblxuICAgIGZvciAoY29uc3Qge3ZlYywgdW5pdH0gb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnVuaXRzKSkge1xuICAgICAgdGhpcy5ub3J0aFdlc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuYWRkKHZlYywgdW5pdCk7XG4gICAgfVxuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgfVxuICBxdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9KSA9PiBBLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmNPclNoYXBlPzogKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEpIHwgU2hhcGUgfCB1bmRlZmluZWQsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPiB7XG4gICAgY29uc3QgbWFwRnVuYyA9IHR5cGVvZiBtYXBGdW5jT3JTaGFwZSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICBtYXBGdW5jT3JTaGFwZSA6XG4gICAgICB1bmRlZmluZWQ7XG4gICAgaWYgKHNoYXBlICYmICFTaGFwZS5wb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlLCB0aGlzLmJvdW5kcykpIHJldHVybiBbXTtcblxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBsZXQgYXJyID0gT2JqZWN0LnZhbHVlcyh0aGlzLnVuaXRzKTtcbiAgICAgIGlmIChzaGFwZSkge1xuICAgICAgICBhcnIgPSBhcnIuZmlsdGVyKChyKSA9PiBTaGFwZS5vdmVybGFwc1ZlYyhzaGFwZSwgci52ZWMpKTtcbiAgICAgIH1cbiAgICAgIGlmIChtYXBGdW5jKSByZXR1cm4gYXJyLm1hcChtYXBGdW5jKTtcbiAgICAgIHJldHVybiBhcnIgYXMgYW55O1xuICAgIH1cbiAgICBpZiAobWFwRnVuYykge1xuICAgICAgcmV0dXJuIENvbGxlY3Rpb24udG9JdGVyYWJsZVdpdGhNYXAoXG4gICAgICAgICAgbWFwRnVuYyxcbiAgICAgICAgICAoKSA9PiB0aGlzLm5vcnRoV2VzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgICAgICgpID0+IHRoaXMubm9ydGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICAgKCkgPT4gdGhpcy5zb3V0aFdlc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgICAoKSA9PiB0aGlzLnNvdXRoRWFzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgKSBhcyBhbnk7XG4gICAgfVxuICAgIHJldHVybiBDb2xsZWN0aW9uLnRvSXRlcmFibGUoXG4gICAgICAgICgpID0+IHRoaXMubm9ydGhXZXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICgpID0+IHRoaXMubm9ydGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICgpID0+IHRoaXMuc291dGhXZXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICgpID0+IHRoaXMuc291dGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgKSBhcyBhbnk7XG4gIH1cbiAgcHJpdmF0ZSBfcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkge1xuICAgICAgcmV0dXJuIGluaXRpYWxWYWx1ZSE7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBsZXQgYXJyID0gT2JqZWN0LnZhbHVlcyh0aGlzLnVuaXRzKTtcbiAgICAgIGlmIChzaGFwZSkge1xuICAgICAgICBhcnIgPSBhcnIuZmlsdGVyKChyKSA9PiBTaGFwZS5vdmVybGFwc1ZlYyhzaGFwZSEsIHIudmVjKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJyLnJlZHVjZShjYWxsYmFja0Z1bmMgYXMgYW55LCBpbml0aWFsVmFsdWUpIGFzIHVua25vd24gYXMgQTtcbiAgICB9XG4gICAgbGV0IHZhbHVlOiBBID0gaW5pdGlhbFZhbHVlITtcbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhXZXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSk7XG4gICAgdmFsdWUgPSB0aGlzLm5vcnRoRWFzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUpO1xuICAgIHZhbHVlID0gdGhpcy5zb3V0aFdlc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlKTtcbiAgICB2YWx1ZSA9IHRoaXMuc291dGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYzogU2hhcGUgfCBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZTogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+IHwgQSxcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JDYWxsYmFja0Z1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZShcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyxcbiAgICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBBKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgICAgIGluaXRpYWxWYWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+PihcbiAgICAgICAgc2hhcGUsXG4gICAgICAgIChhcnIsIHYpID0+IHtcbiAgICAgICAgICBhcnIucHVzaCh2KTtcbiAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICB9LCBbXSk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckZvcmVhY2hGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBzaGFwZU9yRm9yZWFjaEZ1bmModiwgaW5kZXgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFmb3JlYWNoRnVuYykgcmV0dXJuO1xuICAgICAgdGhpcy5fcXVlcnlSZWR1Y2U8dm9pZD4oXG4gICAgICAgICAgc2hhcGVPckZvcmVhY2hGdW5jLFxuICAgICAgICAgIChfLCB2LCBpbmRleCkgPT4gZm9yZWFjaEZ1bmModiwgaW5kZXgpKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yTWFwRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2goc2hhcGVPck1hcEZ1bmModiwgaW5kZXgpKTtcbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBbXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghbWFwRnVuYykgcmV0dXJuIFtdO1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PEE+PihcbiAgICAgICAgICBzaGFwZU9yTWFwRnVuYyxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2gobWFwRnVuYyh2LCBpbmRleCkpO1xuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdKTtcbiAgICB9XG4gIH1cbiAgX2R1bXBUb1N0cmluZyhyZXN1bHQ6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgcHJlZml4ID0gJyAgICAgICAgICAgICcuc3Vic3RyaW5nKDAsIHRoaXMuZGVwdGgpO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICByZXN1bHQucHVzaChwcmVmaXgpO1xuICAgICAgcmVzdWx0LnB1c2goSlNPTi5zdHJpbmdpZnkodGhpcy51bml0cykpO1xuICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBbXG4gICAgICB7c3RyOiAnTlcnLCBxdDogdGhpcy5ub3J0aFdlc3R9LFxuICAgICAge3N0cjogJ05FJywgcXQ6IHRoaXMubm9ydGhFYXN0fSxcbiAgICAgIHtzdHI6ICdTVycsIHF0OiB0aGlzLnNvdXRoV2VzdH0sXG4gICAgICB7c3RyOiAnU0UnLCBxdDogdGhpcy5zb3V0aEVhc3R9LFxuICAgIF0pIHtcbiAgICAgIHJlc3VsdC5wdXNoKHByZWZpeCk7XG4gICAgICByZXN1bHQucHVzaChjaGlsZC5zdHIpO1xuICAgICAgcmVzdWx0LnB1c2goYCAoJHtjaGlsZC5xdC5zaXplfSk6XFxuYCk7XG4gICAgICBjaGlsZC5xdC5fZHVtcFRvU3RyaW5nKHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZHVtcFRvU3RyaW5nKFtdKS5qb2luKCcnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtcbiAgUXVhZFRyZWUsXG4gIFF1YWRUcmVlT3B0aW9ucyxcbn0gZnJvbSAnLi9RdWFkVHJlZSc7XG5pbXBvcnQge0FBQkIsIFNoYXBlLCBWZWMyfSBmcm9tICcuL3NoYXBlJztcblxuZXhwb3J0IHR5cGUgUXVhZE1hcFVuaXRQb3NpdGlvbkdldHRlckZ1bmM8VD4gPSAobzogVCkgPT4gVmVjMjtcbmV4cG9ydCB0eXBlIFF1YWRNYXBVbml0UG9zaXRpb25TZXR0ZXJGdW5jPFQ+ID0gKG86IFQsIHBvc2l0aW9uOiBWZWMyKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+ID0gKFxuICBhY2M6IEEsXG4gIHByZXZpb3VzOiB7dmVjOiBWZWMyLCB1bml0OiBUfSxcbiAgaW5kZXg6IG51bWJlcixcbikgPT4gQSB8IHVuZGVmaW5lZDtcbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVBvc2l0aW9uT3V0T2ZCb3VuZHNFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVNldDxUPiBpbXBsZW1lbnRzIFNldDxUPiB7XG4gIHN0YXRpYyBVbmlxdWVVbml0QXRWZWNLZXlGdW5jID0gUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jO1xuICBwcml2YXRlIHF1YXJkVHJlZTogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPjtcbiAgY29uc3RydWN0b3IoYm91bmRzOiBBQUJCLCBvcHRpb25zOiBRdWFkVHJlZU9wdGlvbnM8VD4gJiB7XG4gICAgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPixcbiAgfSkge1xuICAgIHRoaXMucXVhcmRUcmVlID0gbmV3IFF1YWRUcmVlKGJvdW5kcywgb3B0aW9ucyk7XG4gICAgdGhpcy51bml0UG9zaXRpb25HZXR0ZXIgPSBvcHRpb25zLnVuaXRQb3NpdGlvbkdldHRlcjtcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuc2l6ZTtcbiAgfVxuICBnZXQgYm91bmRzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5ib3VuZHM7XG4gIH1cbiAgYWRkKHQ6IFQpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpO1xuICAgIGlmICghdGhpcy5xdWFyZFRyZWUuYWRkKHBvc2l0aW9uLCB0KSkge1xuICAgICAgdGhyb3cgbmV3IFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yKFxuICAgICAgICAgIGBwb3NpdGlvbiAke0pTT04uc3RyaW5naWZ5KHBvc2l0aW9uKX0gaXMgb3V0IG9mIGJvdW5kczpgICtcbiAgICAgICAgICBgICR7SlNPTi5zdHJpbmdpZnkodGhpcy5xdWFyZFRyZWUuYm91bmRzKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgbW92ZSh0OiBULCB0bzogVmVjMikge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5tb3ZlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0bywgdCk7XG4gIH1cbiAgZGVsZXRlKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuZGVsZXRlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBoYXModDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5oYXModGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMucXVhcmRUcmVlLmNsZWFyKCk7XG4gIH1cbiAgZm9yRWFjaChjYWxsYmFja2ZuOiAodmFsdWU6IFQsIHZhbHVlMjogVCwgc2V0OiBTZXQ8VD4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlSZWR1Y2UoXG4gICAgICAgIChfLCBwKSA9PiBjYWxsYmFja2ZuKHAudW5pdCEsIHAudW5pdCEsIHRoaXMpKTtcbiAgfVxuICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W1QsIFRdPiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZTxbVCwgVF0+KFxuICAgICAgICAocCkgPT4gW3AudW5pdCEsIHAudW5pdCFdKSBhcyBhbnk7XG4gIH1cbiAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMoKTtcbiAgfVxuICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZTxUPihcbiAgICAgICAgKHApID0+IHAudW5pdCEpIGFzIGFueTtcbiAgfVxuICBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUudG9TdHJpbmcoKTtcbiAgfVxuICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMoKTtcbiAgfVxuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSkgYXNcbiAgICAgIEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PjtcbiAgfVxuXG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmM6IFNoYXBlIHwgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWU6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiB8IEEsXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5UmVkdWNlKFxuICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jIGFzIFNoYXBlLFxuICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBhbnksXG4gICAgICAgIGluaXRpYWxWYWx1ZSk7XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdDogVH0+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlBcnJheShzaGFwZSkgYXMgYW55O1xuICB9XG5cbiAgcXVlcnlGb3JFYWNoKFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGVPckZvcmVhY2hGdW5jOlxuICAgICAgICBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQpLFxuICAgICAgZm9yZWFjaEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIHRoaXMucXVhcmRUcmVlLnF1ZXJ5Rm9yRWFjaChzaGFwZU9yRm9yZWFjaEZ1bmMgYXMgYW55LCBmb3JlYWNoRnVuYyBhcyBhbnkpO1xuICB9XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGVPck1hcEZ1bmM6IFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSksXG4gICAgICBtYXBGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5TWFwKHNoYXBlT3JNYXBGdW5jIGFzIFNoYXBlLCBtYXBGdW5jIGFzIGFueSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJDb2xsZWN0aW9uIiwiQUFCQiIsIlNoYXBlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFHaUJBLDRCQWtGaEI7QUFsRkQsV0FBaUIsVUFBVTtJQUN6QixTQUFnQixPQUFPLENBQUksQ0FBZ0I7UUFDekMsSUFBSSxDQUFDLFlBQVksS0FBSyxFQUFFO1lBQ3RCLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFDRCxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUM7UUFDbEIsSUFBSyxDQUFrQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN4QyxLQUFLLE1BQU0sQ0FBQyxJQUFLLENBQWtCLEVBQUU7Z0JBQ25DLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDWDtZQUNELE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakIsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7WUFDZCxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoQixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ2Q7UUFDRCxPQUFPLENBQUMsQ0FBQztLQUNWO0lBakJlLGtCQUFPLFVBaUJ0QixDQUFBO0lBQ0QsVUFBaUIsVUFBVSxDQUN2QixHQUFHLGNBQXVDO1FBRTVDLEtBQUssTUFBTSxJQUFJLElBQUksY0FBYyxFQUFFO1lBQ2pDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFDcEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxFQUFFLENBQUM7WUFDeEIsSUFBSSxRQUFRLFlBQVks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QUFJLFFBQVEsQ0FBQztZQUM1QixNQUFNLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQztZQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7U0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksUUFBUSxDQUFDO1lBQzVCLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO1lBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQztTQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUM7WUFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7WUFDcEUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFDO1NBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFD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
