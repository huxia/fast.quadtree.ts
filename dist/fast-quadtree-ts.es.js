
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.0.7
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
        if (!AABB.overlapsVec(this.bounds, vec))
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
        this.size = 0;
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
    queryIteratable(mapFuncOrShape, shape) {
        const mapFunc = typeof mapFuncOrShape === 'function' ?
            mapFuncOrShape :
            undefined;
        if (shape && !Shape.possiblelyOverlapsAABB(shape, this.bounds))
            return [];
        if (!this.divided) {
            let arr = Object.values(this.units);
            if (shape) {
                arr = arr.filter((r) => Shape.overlapsVec(shape, r.vec));
            }
            if (mapFunc)
                return arr.map(mapFunc);
            return arr;
        }
        if (mapFunc) {
            return Collection.toIterableWithMap(mapFunc, () => this.northWest.queryIteratable(shape), () => this.northEast.queryIteratable(shape), () => this.southWest.queryIteratable(shape), () => this.southEast.queryIteratable(shape));
        }
        return Collection.toIterable(() => this.northWest.queryIteratable(shape), () => this.northEast.queryIteratable(shape), () => this.southWest.queryIteratable(shape), () => this.southEast.queryIteratable(shape));
    }
    _queryReduce(shape, callbackFunc, initialValue) {
        if (shape && !Shape.possiblelyOverlapsAABB(shape, this.bounds)) {
            return initialValue;
        }
        if (!this.divided) {
            let arr = Object.values(this.units);
            if (shape) {
                arr = arr.filter((r) => Shape.overlapsVec(shape, r.vec));
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

export { AABB, Collection, QuadTree, QuadTreeSet, Shape };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5lcy5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbGxlY3Rpb24udHMiLCIuLi8uLi9zcmMvc2hhcGUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWVTZXQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgdHlwZSBDb2xsZWN0aW9uPFQ+ID0gSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCB0eXBlIEl0ZXJhYmxlPFQ+ID0gSXRlcmFibGVJdGVyYXRvcjxUPiB8IEFycmF5PFQ+O1xuZXhwb3J0IG5hbWVzcGFjZSBDb2xsZWN0aW9uIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIHRvQXJyYXk8VD4oYzogQ29sbGVjdGlvbjxUPikge1xuICAgIGlmIChjIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIHJldHVybiBjO1xuICAgIH1cbiAgICBjb25zdCByOiBUW10gPSBbXTtcbiAgICBpZiAoKGMgYXMgR2VuZXJhdG9yPFQ+KVtTeW1ib2wuaXRlcmF0b3JdKSB7XG4gICAgICBmb3IgKGNvbnN0IGkgb2YgKGMgYXMgR2VuZXJhdG9yPFQ+KSkge1xuICAgICAgICByLnB1c2goaSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgbGV0IGkgPSBjLm5leHQoKTtcbiAgICB3aGlsZSAoIWkuZG9uZSkge1xuICAgICAgci5wdXNoKGkudmFsdWUpO1xuICAgICAgaSA9IGMubmV4dCgpO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGU8VD4oXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKCgpID0+IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aEZpbHRlcjxUPihcbiAgICAgIGZpbHRlckZ1bmM6ICgobzogVCkgPT4gYm9vbGVhbiksXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKCgpID0+IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIGlmICghZmlsdGVyRnVuYyB8fCBmaWx0ZXJGdW5jKHJlc3VsdCkpIHtcbiAgICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmMgfHwgZmlsdGVyRnVuYyhyZXN1bHQudmFsdWUpKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGVXaXRoTWFwPFQsIEE+KFxuICAgICAgbWFwRnVuYzogKChvOiBUKSA9PiBBKSxcbiAgICAgIC4uLmNoaWxkSXRlcmF0b3JzOiAoKCkgPT4gQ29sbGVjdGlvbjxUPilbXVxuICApIHtcbiAgICBmb3IgKGNvbnN0IGZ1bmMgb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgIGlmICghZnVuYykgY29udGludWU7XG4gICAgICBjb25zdCBpdGVyYXRvciA9IGZ1bmMoKTtcbiAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGl0ZXJhdG9yKSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhyZXN1bHQudmFsdWUpO1xuICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiZXhwb3J0IGludGVyZmFjZSBWZWMyIHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG59XG5leHBvcnQgaW50ZXJmYWNlIEFBQkIge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IFZlYzI7XG59XG5leHBvcnQgbmFtZXNwYWNlIEFBQkIge1xuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNWZWMoYWFiYjogQUFCQiwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGFhYmIuY2VudGVyLnggLSBhYWJiLnNpemUueCA8PSB2ZWMueCAmJlxuICAgICAgdmVjLnggPD0gYWFiYi5jZW50ZXIueCArIGFhYmIuc2l6ZS54ICYmXG4gICAgICBhYWJiLmNlbnRlci55IC0gYWFiYi5zaXplLnkgPD0gdmVjLnkgJiZcbiAgICAgIHZlYy55IDw9IGFhYmIuY2VudGVyLnkgKyBhYWJiLnNpemUueTtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNBQUJCKG9uZTogQUFCQiwgYW5vdGhlcjogQUFCQik6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhKFxuICAgICAgYW5vdGhlci5jZW50ZXIueCAtIGFub3RoZXIuc2l6ZS54ID4gb25lLmNlbnRlci54ICsgb25lLnNpemUueCB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueCArIGFub3RoZXIuc2l6ZS54IDwgb25lLmNlbnRlci54IC0gb25lLnNpemUueCB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueSAtIGFub3RoZXIuc2l6ZS55ID4gb25lLmNlbnRlci55ICsgb25lLnNpemUueSB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueSArIGFub3RoZXIuc2l6ZS55IDwgb25lLmNlbnRlci55IC0gb25lLnNpemUueVxuICAgICk7XG4gIH1cbn1cbnR5cGUgUmVjdGFuZ2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdyZWN0YW5nbGUnXG59ICYgQUFCQjtcbnR5cGUgRWxsaXBzZVNoYXBlID0ge1xuICB0eXBlOiAnZWxsaXBzZSdcbn0gJiBBQUJCO1xudHlwZSBDaXJjbGVTaGFwZSA9IHtcbiAgdHlwZTogJ2NpcmNsZSdcbn0gJiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogbnVtYmVyO1xufTtcbnR5cGUgU3F1YXJlU2hhcGUgPSB7XG4gIHR5cGU6ICdzcXVhcmUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG5leHBvcnQgdHlwZSBTaGFwZSA9IFJlY3RhbmdsZVNoYXBlIHwgRWxsaXBzZVNoYXBlIHwgQ2lyY2xlU2hhcGUgfCBTcXVhcmVTaGFwZTtcbmV4cG9ydCBuYW1lc3BhY2UgU2hhcGUge1xuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNWZWMoc2hhcGU6IFNoYXBlLCB2ZWM6IFZlYzIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHNoYXBlLCB2ZWMpO1xuICAgICAgY2FzZSAnc3F1YXJlJzogcmV0dXJuIEFBQkIub3ZlcmxhcHNWZWMoe1xuICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgfSwgdmVjKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6IHJldHVybiBTaGFwZS5vdmVybGFwc1ZlYyh7XG4gICAgICAgIHR5cGU6ICdlbGxpcHNlJyxcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdlbGxpcHNlJzoge1xuICAgICAgICBjb25zdCBwID1cbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueCAtIHNoYXBlLmNlbnRlci54LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueCwgMikgK1xuICAgICAgICAgIE1hdGgucG93KHZlYy55IC0gc2hhcGUuY2VudGVyLnksIDIpIC8gTWF0aC5wb3coc2hhcGUuc2l6ZS55LCAyKTtcbiAgICAgICAgcmV0dXJuIHAgPD0gMTtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBwb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlOiBTaGFwZSwgYWFiYjogQUFCQik6IGJvb2xlYW4ge1xuICAgIHN3aXRjaCAoc2hhcGUudHlwZSkge1xuICAgICAgY2FzZSAnZWxsaXBzZSc6XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoc2hhcGUsIGFhYmIpO1xuICAgICAgY2FzZSAnY2lyY2xlJzpcbiAgICAgIGNhc2UgJ3NxdWFyZSc6XG4gICAgICAgIHJldHVybiBBQUJCLm92ZXJsYXBzQUFCQih7XG4gICAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgICB9LCBhYWJiKTtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWN0YW5nbGUoY2VudGVyOiBWZWMyLCBzaXplOiBWZWMyIHwgbnVtYmVyKTogU2hhcGUge1xuICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdzcXVhcmUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAncmVjdGFuZ2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsbGlwc2UoY2VudGVyOiBWZWMyLCBzaXplOiBWZWMyIHwgbnVtYmVyKTogU2hhcGUge1xuICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdjaXJjbGUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQge0NvbGxlY3Rpb24sIEl0ZXJhYmxlfSBmcm9tICcuL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtWZWMyLCBBQUJCLCBTaGFwZX0gZnJvbSAnLi9zaGFwZSc7XG5cbmV4cG9ydCB0eXBlIFF1YWRUcmVlVW5pdEtleUZ1bmM8VD4gPSAoXG4gIHZlYzogVmVjMiwgdW5pdDogVCB8IHVuZGVmaW5lZCwgcXVhZFRyZWU6IFF1YWRUcmVlPFQ+XG4pID0+IHN0cmluZyB8IG51bWJlcjtcbmV4cG9ydCB0eXBlIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiA9IChcbiAgICBhY2M6IEEsXG4gICAgcHJldmlvdXM6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSxcbiAgICBpbmRleDogbnVtYmVyLFxuKSA9PiBBIHwgdW5kZWZpbmVkO1xuZXhwb3J0IGludGVyZmFjZSBRdWFkVHJlZU9wdGlvbnM8VD4ge1xuICB1bml0S2V5R2V0dGVyOiBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+LFxuICBpbnRlZ2VyQ29vcmRpbmF0ZT86IGJvb2xlYW4sXG59XG5leHBvcnQgY2xhc3MgUXVhZFRyZWU8VD4ge1xuICBzdGF0aWMgTWF4RWxlbWVudHMgPSA4O1xuICBzdGF0aWMgTWF4RGVwdGggPSA4O1xuICBzdGF0aWMgVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jID0gKFxuICAgICAgdmVjOiBWZWMyLFxuICAgICAgXzogYW55LFxuICAgICAgcXVhZFRyZWU6IFF1YWRUcmVlPGFueT4sXG4gICkgPT5cbiAgICBxdWFkVHJlZS5vcHRpb25zLmludGVnZXJDb29yZGluYXRlID9cbiAgICAgIHZlYy54ICsgKHF1YWRUcmVlLmJvdW5kcy5zaXplLnggKiAyKSAqIHZlYy55IDpcbiAgICAgIGAke3ZlYy54fSwke3ZlYy55fWA7XG5cbiAgYm91bmRzOiBBQUJCO1xuXG4gIHByaXZhdGUgZGVwdGg6IG51bWJlcjtcblxuICBwcml2YXRlIGRpdmlkZWQ6IGJvb2xlYW47XG5cbiAgcHJpdmF0ZSB1bml0czoge1trZXk6IHN0cmluZyB8IG51bWJlcl06IHt1bml0PzogVCwgdmVjOiBWZWMyfX07XG5cbiAgcHJpdmF0ZSBub3J0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBub3J0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aEVhc3QhOiBRdWFkVHJlZTxUPjtcblxuICBzaXplOiBudW1iZXI7XG5cbiAgcmVhZG9ubHkgb3B0aW9uczogUXVhZFRyZWVPcHRpb25zPFQ+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgYm91bmRzOiBBQUJCLFxuICAgICAgb3B0aW9ucz86IFF1YWRUcmVlT3B0aW9uczxUPixcbiAgICAgIGRlcHRoOiBudW1iZXIgPSAwLFxuICApIHtcbiAgICB0aGlzLmJvdW5kcyA9IGJvdW5kcztcbiAgICB0aGlzLmRlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5kaXZpZGVkID0gZmFsc2U7XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICAgIHRoaXMuc2l6ZSA9IDA7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7XG4gICAgICB1bml0S2V5R2V0dGVyOiBRdWFkVHJlZS5VbmlxdWVVbml0QXRQb3NpdGlvbktleUZ1bmMsXG4gICAgfTtcbiAgfVxuICBfYWRkKHZlYzogVmVjMiwgdW5pdD86IFQpOiBmYWxzZSB8ICdhZGRlZCcgfCAnZXhpc3RpbmcnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5kZXB0aCA9PSBRdWFkVHJlZS5NYXhEZXB0aCB8fFxuICAgICAgIXRoaXMuZGl2aWRlZCAmJiB0aGlzLnNpemUgPCBRdWFkVHJlZS5NYXhFbGVtZW50cykge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIGxldCByZXN1bHQ6ICdleGlzdGluZycgfCAnYWRkZWQnID0gJ2V4aXN0aW5nJztcbiAgICAgIGlmICghdGhpcy51bml0c1trZXldKSB7XG4gICAgICAgIHRoaXMuc2l6ZSArKztcbiAgICAgICAgcmVzdWx0ID0gJ2FkZGVkJztcbiAgICAgIH1cbiAgICAgIHRoaXMudW5pdHNba2V5XSA9IHt2ZWMsIHVuaXR9O1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHRoaXMuZGl2aWRlKCk7XG4gICAgY29uc3QgaW5zZXJ0ZWQgPSB0aGlzLm5vcnRoV2VzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5fYWRkKHZlYywgdW5pdCk7XG4gICAgaWYgKGluc2VydGVkID09PSAnYWRkZWQnKSB0aGlzLnNpemUgKys7XG4gICAgcmV0dXJuIGluc2VydGVkO1xuICB9XG4gIGFkZCh2ZWM6IFZlYzIsIHVuaXQ/OiBUKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5fYWRkKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBfbW92ZShcbiAgICAgIGZyb206IFZlYzIsXG4gICAgICB0bzogVmVjMiB8IHVuZGVmaW5lZCxcbiAgICAgIHVuaXQ/OiBULFxuICApOiBmYWxzZSB8ICdyZW1vdmVkJyB8ICdtb3ZlZCcge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgZnJvbSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIoZnJvbSwgdW5pdCwgdGhpcyk7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodG8gJiYgQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdG8pKSB7XG4gICAgICAgIC8vIHVwZGF0ZSBpbi1wbGFjZVxuICAgICAgICBjb25zdCBuZXdLZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih0bywgdW5pdCwgdGhpcyk7XG4gICAgICAgIGlmIChuZXdLZXkgIT09IGtleSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICAgICAgdGhpcy51bml0c1tuZXdLZXldID0ge3ZlYzogdG8sIHVuaXR9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudW5pdHNba2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ21vdmVkJztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICB0aGlzLnNpemUgLS07XG4gICAgICByZXR1cm4gJ3JlbW92ZWQnO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLm5vcnRoV2VzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLm5vcnRoRWFzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLnNvdXRoV2VzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLnNvdXRoRWFzdC5fbW92ZShmcm9tLCB0bywgdW5pdCk7XG4gICAgaWYgKHJlc3VsdCA9PT0gJ3JlbW92ZWQnKSB7XG4gICAgICB0aGlzLnNpemUgLS07XG4gICAgICBpZiAodG8pIHtcbiAgICAgICAgaWYgKHRoaXMuYWRkKHRvLCB1bml0KSkgcmV0dXJuICdtb3ZlZCc7XG4gICAgICAgIHJldHVybiAncmVtb3ZlZCc7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgbW92ZShmcm9tOiBWZWMyLCB0bzogVmVjMiwgdW5pdD86IFQpOiBib29sZWFuIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHRvKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLl9tb3ZlKGZyb20sIHRvLCB1bml0KSA9PT0gJ3JlbW92ZWQnKSB0aHJvdyBuZXcgRXJyb3IoJ3VuZXhwZWN0ZWQnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBkZWxldGUodmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9tb3ZlKHZlYywgdW5kZWZpbmVkLCB1bml0KSA9PT0gJ3JlbW92ZWQnO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLnNpemUgPSAwO1xuICAgIHRoaXMuZGl2aWRlZCA9IGZhbHNlO1xuICAgIHRoaXMubm9ydGhXZXN0ID1cbiAgICAgIHRoaXMubm9ydGhFYXN0ID1cbiAgICAgIHRoaXMuc291dGhXZXN0ID1cbiAgICAgIHRoaXMuc291dGhFYXN0ID0gdW5kZWZpbmVkITtcbiAgfVxuICBoYXModmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW4ge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdmVjKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih2ZWMsIHVuaXQsIHRoaXMpO1xuICAgICAgcmV0dXJuICEhdGhpcy51bml0c1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub3J0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuaGFzKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBkaXZpZGUoKSB7XG4gICAgdGhpcy5kaXZpZGVkID0gdHJ1ZTtcbiAgICBjb25zdCBodyA9IHRoaXMuYm91bmRzLnNpemUueCAvIDI7XG4gICAgY29uc3QgaGggPSB0aGlzLmJvdW5kcy5zaXplLnkgLyAyO1xuXG4gICAgdGhpcy5ub3J0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgLSBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMubm9ydGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLnNvdXRoV2VzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCAtIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSArIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aEVhc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggKyBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuXG4gICAgZm9yIChjb25zdCB7dmVjLCB1bml0fSBvZiBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpKSB7XG4gICAgICB0aGlzLm5vcnRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5hZGQodmVjLCB1bml0KTtcbiAgICB9XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlJdGVyYXRhYmxlPEE+KFxuICAgICAgbWFwRnVuY09yU2hhcGU/OiAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSkgPT4gQSkgfCBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+IHtcbiAgICBjb25zdCBtYXBGdW5jID0gdHlwZW9mIG1hcEZ1bmNPclNoYXBlID09PSAnZnVuY3Rpb24nID9cbiAgICAgIG1hcEZ1bmNPclNoYXBlIDpcbiAgICAgIHVuZGVmaW5lZDtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkgcmV0dXJuIFtdO1xuXG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGxldCBhcnIgPSBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpO1xuICAgICAgaWYgKHNoYXBlKSB7XG4gICAgICAgIGFyciA9IGFyci5maWx0ZXIoKHIpID0+IFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlLCByLnZlYykpO1xuICAgICAgfVxuICAgICAgaWYgKG1hcEZ1bmMpIHJldHVybiBhcnIubWFwKG1hcEZ1bmMpO1xuICAgICAgcmV0dXJuIGFyciBhcyBhbnk7XG4gICAgfVxuICAgIGlmIChtYXBGdW5jKSB7XG4gICAgICByZXR1cm4gQ29sbGVjdGlvbi50b0l0ZXJhYmxlV2l0aE1hcChcbiAgICAgICAgICBtYXBGdW5jLFxuICAgICAgICAgICgpID0+IHRoaXMubm9ydGhXZXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICAgKCkgPT4gdGhpcy5ub3J0aEVhc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgICAoKSA9PiB0aGlzLnNvdXRoV2VzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgICAgICgpID0+IHRoaXMuc291dGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICApIGFzIGFueTtcbiAgICB9XG4gICAgcmV0dXJuIENvbGxlY3Rpb24udG9JdGVyYWJsZShcbiAgICAgICAgKCkgPT4gdGhpcy5ub3J0aFdlc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgKCkgPT4gdGhpcy5ub3J0aEVhc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgKCkgPT4gdGhpcy5zb3V0aFdlc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgKCkgPT4gdGhpcy5zb3V0aEVhc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICApIGFzIGFueTtcbiAgfVxuICBwcml2YXRlIF9xdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIGlmIChzaGFwZSAmJiAhU2hhcGUucG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZSwgdGhpcy5ib3VuZHMpKSB7XG4gICAgICByZXR1cm4gaW5pdGlhbFZhbHVlITtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGxldCBhcnIgPSBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpO1xuICAgICAgaWYgKHNoYXBlKSB7XG4gICAgICAgIGFyciA9IGFyci5maWx0ZXIoKHIpID0+IFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlISwgci52ZWMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhcnIucmVkdWNlKGNhbGxiYWNrRnVuYyBhcyBhbnksIGluaXRpYWxWYWx1ZSkgYXMgdW5rbm93biBhcyBBO1xuICAgIH1cbiAgICBsZXQgdmFsdWU6IEEgPSBpbml0aWFsVmFsdWUhO1xuICAgIHZhbHVlID0gdGhpcy5ub3J0aFdlc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlKTtcbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSk7XG4gICAgdmFsdWUgPSB0aGlzLnNvdXRoV2VzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUpO1xuICAgIHZhbHVlID0gdGhpcy5zb3V0aEVhc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckNhbGxiYWNrRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jLFxuICAgICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIEEpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2UoXG4gICAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyxcbiAgICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICAgICAgaW5pdGlhbFZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4+KFxuICAgICAgICBzaGFwZSxcbiAgICAgICAgKGFyciwgdikgPT4ge1xuICAgICAgICAgIGFyci5wdXNoKHYpO1xuICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgIH0sIFtdKTtcbiAgfVxuXG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGVPckZvcmVhY2hGdW5jOlxuICAgICAgICBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkKSxcbiAgICAgIGZvcmVhY2hGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKSB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yRm9yZWFjaEZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UmVkdWNlPHZvaWQ+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoXywgdiwgaW5kZXgpID0+IHNoYXBlT3JGb3JlYWNoRnVuYyh2LCBpbmRleCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWZvcmVhY2hGdW5jKSByZXR1cm47XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICBzaGFwZU9yRm9yZWFjaEZ1bmMsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBmb3JlYWNoRnVuYyh2LCBpbmRleCkpO1xuICAgIH1cbiAgfVxuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGVPck1hcEZ1bmM6IFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEpLFxuICAgICAgbWFwRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+IHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JNYXBGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoIW1hcEZ1bmMpIHJldHVybiBbXTtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTxBPj4oXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChzaGFwZU9yTWFwRnVuYyh2LCBpbmRleCkpO1xuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHNoYXBlT3JNYXBGdW5jLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChtYXBGdW5jKHYsIGluZGV4KSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10pO1xuICAgIH1cbiAgfVxuICBfZHVtcFRvU3RyaW5nKHJlc3VsdDogc3RyaW5nW10pIHtcbiAgICBjb25zdCBwcmVmaXggPSAnICAgICAgICAgICAgJy5zdWJzdHJpbmcoMCwgdGhpcy5kZXB0aCk7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHByZWZpeCk7XG4gICAgICByZXN1bHQucHVzaChKU09OLnN0cmluZ2lmeSh0aGlzLnVuaXRzKSk7XG4gICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIFtcbiAgICAgIHtzdHI6ICdOVycsIHF0OiB0aGlzLm5vcnRoV2VzdH0sXG4gICAgICB7c3RyOiAnTkUnLCBxdDogdGhpcy5ub3J0aEVhc3R9LFxuICAgICAge3N0cjogJ1NXJywgcXQ6IHRoaXMuc291dGhXZXN0fSxcbiAgICAgIHtzdHI6ICdTRScsIHF0OiB0aGlzLnNvdXRoRWFzdH0sXG4gICAgXSkge1xuICAgICAgcmVzdWx0LnB1c2gocHJlZml4KTtcbiAgICAgIHJlc3VsdC5wdXNoKGNoaWxkLnN0cik7XG4gICAgICByZXN1bHQucHVzaChgICgke2NoaWxkLnF0LnNpemV9KTpcXG5gKTtcbiAgICAgIGNoaWxkLnF0Ll9kdW1wVG9TdHJpbmcocmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9kdW1wVG9TdHJpbmcoW10pLmpvaW4oJycpO1xuICB9XG59XG4iLCJpbXBvcnQge1xuICBRdWFkVHJlZSxcbiAgUXVhZFRyZWVPcHRpb25zLFxufSBmcm9tICcuL1F1YWRUcmVlJztcbmltcG9ydCB7QUFCQiwgU2hhcGUsIFZlYzJ9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPiA9IChvOiBUKSA9PiBWZWMyO1xuZXhwb3J0IHR5cGUgUXVhZE1hcFVuaXRQb3NpdGlvblNldHRlckZ1bmM8VD4gPSAobzogVCwgcG9zaXRpb246IFZlYzIpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gIGFjYzogQSxcbiAgcHJldmlvdXM6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LFxuICBpbmRleDogbnVtYmVyLFxuKSA9PiBBIHwgdW5kZWZpbmVkO1xuZXhwb3J0IGNsYXNzIFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIFF1YWRUcmVlU2V0PFQ+IGltcGxlbWVudHMgU2V0PFQ+IHtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFZlY0tleUZ1bmMgPSBRdWFkVHJlZS5VbmlxdWVVbml0QXRQb3NpdGlvbktleUZ1bmM7XG4gIHByaXZhdGUgcXVhcmRUcmVlOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSB1bml0UG9zaXRpb25HZXR0ZXI6IFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+O1xuICBjb25zdHJ1Y3Rvcihib3VuZHM6IEFBQkIsIG9wdGlvbnM6IFF1YWRUcmVlT3B0aW9uczxUPiAmIHtcbiAgICB1bml0UG9zaXRpb25HZXR0ZXI6IFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+LFxuICB9KSB7XG4gICAgdGhpcy5xdWFyZFRyZWUgPSBuZXcgUXVhZFRyZWUoYm91bmRzLCBvcHRpb25zKTtcbiAgICB0aGlzLnVuaXRQb3NpdGlvbkdldHRlciA9IG9wdGlvbnMudW5pdFBvc2l0aW9uR2V0dGVyO1xuICB9XG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5zaXplO1xuICB9XG4gIGdldCBib3VuZHMoKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLmJvdW5kcztcbiAgfVxuICBhZGQodDogVCkge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCk7XG4gICAgaWYgKCF0aGlzLnF1YXJkVHJlZS5hZGQocG9zaXRpb24sIHQpKSB7XG4gICAgICB0aHJvdyBuZXcgUXVhZFRyZWVQb3NpdGlvbk91dE9mQm91bmRzRXJyb3IoXG4gICAgICAgICAgYHBvc2l0aW9uICR7SlNPTi5zdHJpbmdpZnkocG9zaXRpb24pfSBpcyBvdXQgb2YgYm91bmRzOmAgK1xuICAgICAgICAgIGAgJHtKU09OLnN0cmluZ2lmeSh0aGlzLnF1YXJkVHJlZS5ib3VuZHMpfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBtb3ZlKHQ6IFQsIHRvOiBWZWMyKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLm1vdmUodGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHRvLCB0KTtcbiAgfVxuICBkZWxldGUodDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5kZWxldGUodGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGhhcyh0OiBUKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLmhhcyh0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KSwgdCk7XG4gIH1cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5xdWFyZFRyZWUuY2xlYXIoKTtcbiAgfVxuICBmb3JFYWNoKGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgdmFsdWUyOiBULCBzZXQ6IFNldDxUPikgPT4gdm9pZCk6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgKF8sIHApID0+IGNhbGxiYWNrZm4ocC51bml0ISwgcC51bml0ISwgdGhpcykpO1xuICB9XG4gIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbVCwgVF0+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlPFtULCBUXT4oXG4gICAgICAgIChwKSA9PiBbcC51bml0ISwgcC51bml0IV0pIGFzIGFueTtcbiAgfVxuICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgIHJldHVybiB0aGlzLnZhbHVlcygpO1xuICB9XG4gIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlPFQ+KFxuICAgICAgICAocCkgPT4gcC51bml0ISkgYXMgYW55O1xuICB9XG4gIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS50b1N0cmluZygpO1xuICB9XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgIHJldHVybiB0aGlzLnZhbHVlcygpO1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSBhc1xuICAgICAgSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICB9XG5cbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYzogU2hhcGUgfCBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZTogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+IHwgQSxcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlSZWR1Y2UoXG4gICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMgYXMgU2hhcGUsXG4gICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIGFueSxcbiAgICAgICAgaW5pdGlhbFZhbHVlKTtcbiAgfVxuXG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUFycmF5KHNoYXBlKSBhcyBhbnk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZU9yRm9yZWFjaEZ1bmM6XG4gICAgICAgIFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKSB7XG4gICAgdGhpcy5xdWFyZFRyZWUucXVlcnlGb3JFYWNoKHNoYXBlT3JGb3JlYWNoRnVuYyBhcyBhbnksIGZvcmVhY2hGdW5jIGFzIGFueSk7XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZU9yTWFwRnVuYzogU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlNYXAoc2hhcGVPck1hcEZ1bmMgYXMgU2hhcGUsIG1hcEZ1bmMgYXMgYW55KTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0lBR2lCLFdBa0ZoQjtBQWxGRCxXQUFpQixVQUFVO0lBQ3pCLFNBQWdCLE9BQU8sQ0FBSSxDQUFnQjtRQUN6QyxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUU7WUFDdEIsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUNELE1BQU0sQ0FBQyxHQUFRLEVBQUUsQ0FBQztRQUNsQixJQUFLLENBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3hDLEtBQUssTUFBTSxDQUFDLElBQUssQ0FBa0IsRUFBRTtnQkFDbkMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNYO1lBQ0QsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUNELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtZQUNkLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDZDtRQUNELE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7SUFqQmUsa0JBQU8sVUFpQnRCLENBQUE7SUFDRCxVQUFpQixVQUFVLENBQ3ZCLEdBQUcsY0FBdUM7UUFFNUMsS0FBSyxNQUFNLElBQUksSUFBSSxjQUFjLEVBQUU7WUFDakMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUNwQixNQUFNLFFBQVEsR0FBRyxJQUFJLEVBQUUsQ0FBQztZQUN4QixJQUFJLFFBQVEsWUFBWSxLQUFLLEVBQUU7Z0JBQzdCLEtBQUssTUFBTSxNQUFNLElB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TUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO1lBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQztTQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUM7WUFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7WUFDcEUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFDO1NBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztZQUM1QixNQUFNLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQztZQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7U0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksUUFBUSxDQUFDO1lBQzVCLE1BQU0sRUFBRSxF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
