
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.0.8
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
        return this.quardTree.queryReduce((_, p) => void (callbackfn(p.unit, p.unit, this)), void (0));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5lcy5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbGxlY3Rpb24udHMiLCIuLi8uLi9zcmMvc2hhcGUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWVTZXQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgdHlwZSBDb2xsZWN0aW9uPFQ+ID0gSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCB0eXBlIEl0ZXJhYmxlPFQ+ID0gSXRlcmFibGVJdGVyYXRvcjxUPiB8IEFycmF5PFQ+O1xuZXhwb3J0IG5hbWVzcGFjZSBDb2xsZWN0aW9uIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIHRvQXJyYXk8VD4oYzogQ29sbGVjdGlvbjxUPikge1xuICAgIGlmIChjIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIHJldHVybiBjO1xuICAgIH1cbiAgICBjb25zdCByOiBUW10gPSBbXTtcbiAgICBpZiAoKGMgYXMgR2VuZXJhdG9yPFQ+KVtTeW1ib2wuaXRlcmF0b3JdKSB7XG4gICAgICBmb3IgKGNvbnN0IGkgb2YgKGMgYXMgR2VuZXJhdG9yPFQ+KSkge1xuICAgICAgICByLnB1c2goaSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgbGV0IGkgPSBjLm5leHQoKTtcbiAgICB3aGlsZSAoIWkuZG9uZSkge1xuICAgICAgci5wdXNoKGkudmFsdWUpO1xuICAgICAgaSA9IGMubmV4dCgpO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGU8VD4oXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKCgpID0+IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aEZpbHRlcjxUPihcbiAgICAgIGZpbHRlckZ1bmM6ICgobzogVCkgPT4gYm9vbGVhbiksXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKCgpID0+IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIGlmICghZmlsdGVyRnVuYyB8fCBmaWx0ZXJGdW5jKHJlc3VsdCkpIHtcbiAgICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmMgfHwgZmlsdGVyRnVuYyhyZXN1bHQudmFsdWUpKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGVXaXRoTWFwPFQsIEE+KFxuICAgICAgbWFwRnVuYzogKChvOiBUKSA9PiBBKSxcbiAgICAgIC4uLmNoaWxkSXRlcmF0b3JzOiAoKCkgPT4gQ29sbGVjdGlvbjxUPilbXVxuICApIHtcbiAgICBmb3IgKGNvbnN0IGZ1bmMgb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgIGlmICghZnVuYykgY29udGludWU7XG4gICAgICBjb25zdCBpdGVyYXRvciA9IGZ1bmMoKTtcbiAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGl0ZXJhdG9yKSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhyZXN1bHQudmFsdWUpO1xuICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiZXhwb3J0IGludGVyZmFjZSBWZWMyIHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG59XG5leHBvcnQgaW50ZXJmYWNlIEFBQkIge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IFZlYzI7XG59XG5leHBvcnQgbmFtZXNwYWNlIEFBQkIge1xuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNWZWMoYWFiYjogQUFCQiwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGFhYmIuY2VudGVyLnggLSBhYWJiLnNpemUueCA8PSB2ZWMueCAmJlxuICAgICAgdmVjLnggPD0gYWFiYi5jZW50ZXIueCArIGFhYmIuc2l6ZS54ICYmXG4gICAgICBhYWJiLmNlbnRlci55IC0gYWFiYi5zaXplLnkgPD0gdmVjLnkgJiZcbiAgICAgIHZlYy55IDw9IGFhYmIuY2VudGVyLnkgKyBhYWJiLnNpemUueTtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNBQUJCKG9uZTogQUFCQiwgYW5vdGhlcjogQUFCQik6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhKFxuICAgICAgYW5vdGhlci5jZW50ZXIueCAtIGFub3RoZXIuc2l6ZS54ID4gb25lLmNlbnRlci54ICsgb25lLnNpemUueCB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueCArIGFub3RoZXIuc2l6ZS54IDwgb25lLmNlbnRlci54IC0gb25lLnNpemUueCB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueSAtIGFub3RoZXIuc2l6ZS55ID4gb25lLmNlbnRlci55ICsgb25lLnNpemUueSB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueSArIGFub3RoZXIuc2l6ZS55IDwgb25lLmNlbnRlci55IC0gb25lLnNpemUueVxuICAgICk7XG4gIH1cbn1cbnR5cGUgUmVjdGFuZ2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdyZWN0YW5nbGUnXG59ICYgQUFCQjtcbnR5cGUgRWxsaXBzZVNoYXBlID0ge1xuICB0eXBlOiAnZWxsaXBzZSdcbn0gJiBBQUJCO1xudHlwZSBDaXJjbGVTaGFwZSA9IHtcbiAgdHlwZTogJ2NpcmNsZSdcbn0gJiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogbnVtYmVyO1xufTtcbnR5cGUgU3F1YXJlU2hhcGUgPSB7XG4gIHR5cGU6ICdzcXVhcmUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG5leHBvcnQgdHlwZSBTaGFwZSA9IFJlY3RhbmdsZVNoYXBlIHwgRWxsaXBzZVNoYXBlIHwgQ2lyY2xlU2hhcGUgfCBTcXVhcmVTaGFwZTtcbmV4cG9ydCBuYW1lc3BhY2UgU2hhcGUge1xuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNWZWMoc2hhcGU6IFNoYXBlLCB2ZWM6IFZlYzIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHNoYXBlLCB2ZWMpO1xuICAgICAgY2FzZSAnc3F1YXJlJzogcmV0dXJuIEFBQkIub3ZlcmxhcHNWZWMoe1xuICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgfSwgdmVjKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6IHJldHVybiBTaGFwZS5vdmVybGFwc1ZlYyh7XG4gICAgICAgIHR5cGU6ICdlbGxpcHNlJyxcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdlbGxpcHNlJzoge1xuICAgICAgICBjb25zdCBwID1cbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueCAtIHNoYXBlLmNlbnRlci54LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueCwgMikgK1xuICAgICAgICAgIE1hdGgucG93KHZlYy55IC0gc2hhcGUuY2VudGVyLnksIDIpIC8gTWF0aC5wb3coc2hhcGUuc2l6ZS55LCAyKTtcbiAgICAgICAgcmV0dXJuIHAgPD0gMTtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBwb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlOiBTaGFwZSwgYWFiYjogQUFCQik6IGJvb2xlYW4ge1xuICAgIHN3aXRjaCAoc2hhcGUudHlwZSkge1xuICAgICAgY2FzZSAnZWxsaXBzZSc6XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoc2hhcGUsIGFhYmIpO1xuICAgICAgY2FzZSAnY2lyY2xlJzpcbiAgICAgIGNhc2UgJ3NxdWFyZSc6XG4gICAgICAgIHJldHVybiBBQUJCLm92ZXJsYXBzQUFCQih7XG4gICAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgICB9LCBhYWJiKTtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWN0YW5nbGUoY2VudGVyOiBWZWMyLCBzaXplOiBWZWMyIHwgbnVtYmVyKTogU2hhcGUge1xuICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdzcXVhcmUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAncmVjdGFuZ2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsbGlwc2UoY2VudGVyOiBWZWMyLCBzaXplOiBWZWMyIHwgbnVtYmVyKTogU2hhcGUge1xuICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdjaXJjbGUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQge0NvbGxlY3Rpb24sIEl0ZXJhYmxlfSBmcm9tICcuL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtWZWMyLCBBQUJCLCBTaGFwZX0gZnJvbSAnLi9zaGFwZSc7XG5cbmV4cG9ydCB0eXBlIFF1YWRUcmVlVW5pdEtleUZ1bmM8VD4gPSAoXG4gIHZlYzogVmVjMiwgdW5pdDogVCB8IHVuZGVmaW5lZCwgcXVhZFRyZWU6IFF1YWRUcmVlPFQ+XG4pID0+IHN0cmluZyB8IG51bWJlcjtcbmV4cG9ydCB0eXBlIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiA9IChcbiAgICBhY2M6IEEsXG4gICAgcHJldmlvdXM6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSxcbiAgICBpbmRleDogbnVtYmVyLFxuKSA9PiBBIHwgdW5kZWZpbmVkO1xuZXhwb3J0IGludGVyZmFjZSBRdWFkVHJlZU9wdGlvbnM8VD4ge1xuICB1bml0S2V5R2V0dGVyOiBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+LFxuICBpbnRlZ2VyQ29vcmRpbmF0ZT86IGJvb2xlYW4sXG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICByZWFkb25seSBib3VuZHM6IEFBQkI7XG4gIHJlYWRvbmx5IHNpemU6IG51bWJlclxuICBoYXModmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZTxUPiBpbXBsZW1lbnRzIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICBzdGF0aWMgTWF4RWxlbWVudHMgPSA4O1xuICBzdGF0aWMgTWF4RGVwdGggPSA4O1xuICBzdGF0aWMgVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jID0gKFxuICAgICAgdmVjOiBWZWMyLFxuICAgICAgXzogYW55LFxuICAgICAgcXVhZFRyZWU6IFF1YWRUcmVlPGFueT4sXG4gICkgPT5cbiAgICBxdWFkVHJlZS5vcHRpb25zLmludGVnZXJDb29yZGluYXRlID9cbiAgICAgIHZlYy54ICsgKHF1YWRUcmVlLmJvdW5kcy5zaXplLnggKiAyKSAqIHZlYy55IDpcbiAgICAgIGAke3ZlYy54fSwke3ZlYy55fWA7XG5cbiAgYm91bmRzOiBBQUJCO1xuXG4gIHByaXZhdGUgZGVwdGg6IG51bWJlcjtcblxuICBwcml2YXRlIGRpdmlkZWQ6IGJvb2xlYW47XG5cbiAgcHJpdmF0ZSB1bml0czoge1trZXk6IHN0cmluZyB8IG51bWJlcl06IHt1bml0PzogVCwgdmVjOiBWZWMyfX07XG5cbiAgcHJpdmF0ZSBub3J0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBub3J0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aEVhc3QhOiBRdWFkVHJlZTxUPjtcblxuICBzaXplOiBudW1iZXI7XG5cbiAgcmVhZG9ubHkgb3B0aW9uczogUXVhZFRyZWVPcHRpb25zPFQ+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgYm91bmRzOiBBQUJCLFxuICAgICAgb3B0aW9ucz86IFF1YWRUcmVlT3B0aW9uczxUPixcbiAgICAgIGRlcHRoOiBudW1iZXIgPSAwLFxuICApIHtcbiAgICB0aGlzLmJvdW5kcyA9IGJvdW5kcztcbiAgICB0aGlzLmRlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5kaXZpZGVkID0gZmFsc2U7XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICAgIHRoaXMuc2l6ZSA9IDA7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7XG4gICAgICB1bml0S2V5R2V0dGVyOiBRdWFkVHJlZS5VbmlxdWVVbml0QXRQb3NpdGlvbktleUZ1bmMsXG4gICAgfTtcbiAgfVxuICBfYWRkKHZlYzogVmVjMiwgdW5pdD86IFQpOiBmYWxzZSB8ICdhZGRlZCcgfCAnZXhpc3RpbmcnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5kZXB0aCA9PSBRdWFkVHJlZS5NYXhEZXB0aCB8fFxuICAgICAgIXRoaXMuZGl2aWRlZCAmJiB0aGlzLnNpemUgPCBRdWFkVHJlZS5NYXhFbGVtZW50cykge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIGxldCByZXN1bHQ6ICdleGlzdGluZycgfCAnYWRkZWQnID0gJ2V4aXN0aW5nJztcbiAgICAgIGlmICghdGhpcy51bml0c1trZXldKSB7XG4gICAgICAgIHRoaXMuc2l6ZSArKztcbiAgICAgICAgcmVzdWx0ID0gJ2FkZGVkJztcbiAgICAgIH1cbiAgICAgIHRoaXMudW5pdHNba2V5XSA9IHt2ZWMsIHVuaXR9O1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHRoaXMuZGl2aWRlKCk7XG4gICAgY29uc3QgaW5zZXJ0ZWQgPSB0aGlzLm5vcnRoV2VzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5fYWRkKHZlYywgdW5pdCk7XG4gICAgaWYgKGluc2VydGVkID09PSAnYWRkZWQnKSB0aGlzLnNpemUgKys7XG4gICAgcmV0dXJuIGluc2VydGVkO1xuICB9XG4gIGFkZCh2ZWM6IFZlYzIsIHVuaXQ/OiBUKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5fYWRkKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBfbW92ZShcbiAgICAgIGZyb206IFZlYzIsXG4gICAgICB0bzogVmVjMiB8IHVuZGVmaW5lZCxcbiAgICAgIHVuaXQ/OiBULFxuICApOiBmYWxzZSB8ICdyZW1vdmVkJyB8ICdtb3ZlZCcge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgZnJvbSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIoZnJvbSwgdW5pdCwgdGhpcyk7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodG8gJiYgQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdG8pKSB7XG4gICAgICAgIC8vIHVwZGF0ZSBpbi1wbGFjZVxuICAgICAgICBjb25zdCBuZXdLZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih0bywgdW5pdCwgdGhpcyk7XG4gICAgICAgIGlmIChuZXdLZXkgIT09IGtleSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICAgICAgdGhpcy51bml0c1tuZXdLZXldID0ge3ZlYzogdG8sIHVuaXR9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudW5pdHNba2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ21vdmVkJztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICB0aGlzLnNpemUgLS07XG4gICAgICByZXR1cm4gJ3JlbW92ZWQnO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLm5vcnRoV2VzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLm5vcnRoRWFzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLnNvdXRoV2VzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLnNvdXRoRWFzdC5fbW92ZShmcm9tLCB0bywgdW5pdCk7XG4gICAgaWYgKHJlc3VsdCA9PT0gJ3JlbW92ZWQnKSB7XG4gICAgICB0aGlzLnNpemUgLS07XG4gICAgICBpZiAodG8pIHtcbiAgICAgICAgaWYgKHRoaXMuYWRkKHRvLCB1bml0KSkgcmV0dXJuICdtb3ZlZCc7XG4gICAgICAgIHJldHVybiAncmVtb3ZlZCc7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgbW92ZShmcm9tOiBWZWMyLCB0bzogVmVjMiwgdW5pdD86IFQpOiBib29sZWFuIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHRvKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLl9tb3ZlKGZyb20sIHRvLCB1bml0KSA9PT0gJ3JlbW92ZWQnKSB0aHJvdyBuZXcgRXJyb3IoJ3VuZXhwZWN0ZWQnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBkZWxldGUodmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9tb3ZlKHZlYywgdW5kZWZpbmVkLCB1bml0KSA9PT0gJ3JlbW92ZWQnO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLnNpemUgPSAwO1xuICAgIHRoaXMuZGl2aWRlZCA9IGZhbHNlO1xuICAgIHRoaXMubm9ydGhXZXN0ID1cbiAgICAgIHRoaXMubm9ydGhFYXN0ID1cbiAgICAgIHRoaXMuc291dGhXZXN0ID1cbiAgICAgIHRoaXMuc291dGhFYXN0ID0gdW5kZWZpbmVkITtcbiAgfVxuICBoYXModmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW4ge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdmVjKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih2ZWMsIHVuaXQsIHRoaXMpO1xuICAgICAgcmV0dXJuICEhdGhpcy51bml0c1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub3J0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuaGFzKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBkaXZpZGUoKSB7XG4gICAgdGhpcy5kaXZpZGVkID0gdHJ1ZTtcbiAgICBjb25zdCBodyA9IHRoaXMuYm91bmRzLnNpemUueCAvIDI7XG4gICAgY29uc3QgaGggPSB0aGlzLmJvdW5kcy5zaXplLnkgLyAyO1xuXG4gICAgdGhpcy5ub3J0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgLSBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMubm9ydGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLnNvdXRoV2VzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCAtIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSArIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aEVhc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggKyBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuXG4gICAgZm9yIChjb25zdCB7dmVjLCB1bml0fSBvZiBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpKSB7XG4gICAgICB0aGlzLm5vcnRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5hZGQodmVjLCB1bml0KTtcbiAgICB9XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlJdGVyYXRhYmxlPEE+KFxuICAgICAgbWFwRnVuY09yU2hhcGU/OiAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSkgPT4gQSkgfCBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+IHtcbiAgICBjb25zdCBtYXBGdW5jID0gdHlwZW9mIG1hcEZ1bmNPclNoYXBlID09PSAnZnVuY3Rpb24nID9cbiAgICAgIG1hcEZ1bmNPclNoYXBlIDpcbiAgICAgIHVuZGVmaW5lZDtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkgcmV0dXJuIFtdO1xuXG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGxldCBhcnIgPSBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpO1xuICAgICAgaWYgKHNoYXBlKSB7XG4gICAgICAgIGFyciA9IGFyci5maWx0ZXIoKHIpID0+IFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlLCByLnZlYykpO1xuICAgICAgfVxuICAgICAgaWYgKG1hcEZ1bmMpIHJldHVybiBhcnIubWFwKG1hcEZ1bmMpO1xuICAgICAgcmV0dXJuIGFyciBhcyBhbnk7XG4gICAgfVxuICAgIGlmIChtYXBGdW5jKSB7XG4gICAgICByZXR1cm4gQ29sbGVjdGlvbi50b0l0ZXJhYmxlV2l0aE1hcChcbiAgICAgICAgICBtYXBGdW5jLFxuICAgICAgICAgICgpID0+IHRoaXMubm9ydGhXZXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICAgKCkgPT4gdGhpcy5ub3J0aEVhc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgICAoKSA9PiB0aGlzLnNvdXRoV2VzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgICAgICgpID0+IHRoaXMuc291dGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICApIGFzIGFueTtcbiAgICB9XG4gICAgcmV0dXJuIENvbGxlY3Rpb24udG9JdGVyYWJsZShcbiAgICAgICAgKCkgPT4gdGhpcy5ub3J0aFdlc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgKCkgPT4gdGhpcy5ub3J0aEVhc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgKCkgPT4gdGhpcy5zb3V0aFdlc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgKCkgPT4gdGhpcy5zb3V0aEVhc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICApIGFzIGFueTtcbiAgfVxuICBwcml2YXRlIF9xdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIGlmIChzaGFwZSAmJiAhU2hhcGUucG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZSwgdGhpcy5ib3VuZHMpKSB7XG4gICAgICByZXR1cm4gaW5pdGlhbFZhbHVlITtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGxldCBhcnIgPSBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpO1xuICAgICAgaWYgKHNoYXBlKSB7XG4gICAgICAgIGFyciA9IGFyci5maWx0ZXIoKHIpID0+IFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlISwgci52ZWMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhcnIucmVkdWNlKGNhbGxiYWNrRnVuYyBhcyBhbnksIGluaXRpYWxWYWx1ZSkgYXMgdW5rbm93biBhcyBBO1xuICAgIH1cbiAgICBsZXQgdmFsdWU6IEEgPSBpbml0aWFsVmFsdWUhO1xuICAgIHZhbHVlID0gdGhpcy5ub3J0aFdlc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlKTtcbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSk7XG4gICAgdmFsdWUgPSB0aGlzLnNvdXRoV2VzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUpO1xuICAgIHZhbHVlID0gdGhpcy5zb3V0aEVhc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckNhbGxiYWNrRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jLFxuICAgICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIEEpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2UoXG4gICAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyxcbiAgICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICAgICAgaW5pdGlhbFZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4+KFxuICAgICAgICBzaGFwZSxcbiAgICAgICAgKGFyciwgdikgPT4ge1xuICAgICAgICAgIGFyci5wdXNoKHYpO1xuICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgIH0sIFtdKTtcbiAgfVxuXG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGVPckZvcmVhY2hGdW5jOlxuICAgICAgICBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkKSxcbiAgICAgIGZvcmVhY2hGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKSB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yRm9yZWFjaEZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UmVkdWNlPHZvaWQ+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoXywgdiwgaW5kZXgpID0+IHNoYXBlT3JGb3JlYWNoRnVuYyh2LCBpbmRleCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWZvcmVhY2hGdW5jKSByZXR1cm47XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICBzaGFwZU9yRm9yZWFjaEZ1bmMsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBmb3JlYWNoRnVuYyh2LCBpbmRleCkpO1xuICAgIH1cbiAgfVxuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGVPck1hcEZ1bmM6IFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEpLFxuICAgICAgbWFwRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+IHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JNYXBGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoIW1hcEZ1bmMpIHJldHVybiBbXTtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTxBPj4oXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChzaGFwZU9yTWFwRnVuYyh2LCBpbmRleCkpO1xuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHNoYXBlT3JNYXBGdW5jLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChtYXBGdW5jKHYsIGluZGV4KSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10pO1xuICAgIH1cbiAgfVxuICBfZHVtcFRvU3RyaW5nKHJlc3VsdDogc3RyaW5nW10pIHtcbiAgICBjb25zdCBwcmVmaXggPSAnICAgICAgICAgICAgJy5zdWJzdHJpbmcoMCwgdGhpcy5kZXB0aCk7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHByZWZpeCk7XG4gICAgICByZXN1bHQucHVzaChKU09OLnN0cmluZ2lmeSh0aGlzLnVuaXRzKSk7XG4gICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIFtcbiAgICAgIHtzdHI6ICdOVycsIHF0OiB0aGlzLm5vcnRoV2VzdH0sXG4gICAgICB7c3RyOiAnTkUnLCBxdDogdGhpcy5ub3J0aEVhc3R9LFxuICAgICAge3N0cjogJ1NXJywgcXQ6IHRoaXMuc291dGhXZXN0fSxcbiAgICAgIHtzdHI6ICdTRScsIHF0OiB0aGlzLnNvdXRoRWFzdH0sXG4gICAgXSkge1xuICAgICAgcmVzdWx0LnB1c2gocHJlZml4KTtcbiAgICAgIHJlc3VsdC5wdXNoKGNoaWxkLnN0cik7XG4gICAgICByZXN1bHQucHVzaChgICgke2NoaWxkLnF0LnNpemV9KTpcXG5gKTtcbiAgICAgIGNoaWxkLnF0Ll9kdW1wVG9TdHJpbmcocmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9kdW1wVG9TdHJpbmcoW10pLmpvaW4oJycpO1xuICB9XG59XG4iLCJpbXBvcnQge1xuICBRdWFkVHJlZSxcbiAgUXVhZFRyZWVPcHRpb25zLFxufSBmcm9tICcuL1F1YWRUcmVlJztcbmltcG9ydCB7QUFCQiwgU2hhcGUsIFZlYzJ9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPiA9IChvOiBUKSA9PiBWZWMyO1xuZXhwb3J0IHR5cGUgUXVhZE1hcFVuaXRQb3NpdGlvblNldHRlckZ1bmM8VD4gPSAobzogVCwgcG9zaXRpb246IFZlYzIpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gIGFjYzogQSxcbiAgcHJldmlvdXM6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LFxuICBpbmRleDogbnVtYmVyLFxuKSA9PiBBIHwgdW5kZWZpbmVkO1xuZXhwb3J0IGNsYXNzIFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgfVxufVxuZXhwb3J0IGludGVyZmFjZSBSZWFkb25seVF1YWRUcmVlU2V0PFQ+IGV4dGVuZHMgUmVhZG9ubHlTZXQ8VD4ge1xuICByZWFkb25seSBib3VuZHM6IEFBQkI7XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeU1hcDxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVNldDxUPiBpbXBsZW1lbnRzIFNldDxUPiwgUmVhZG9ubHlRdWFkVHJlZVNldDxUPiB7XG4gIHN0YXRpYyBVbmlxdWVVbml0QXRWZWNLZXlGdW5jID0gUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jO1xuICBwcml2YXRlIHF1YXJkVHJlZTogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPjtcbiAgY29uc3RydWN0b3IoYm91bmRzOiBBQUJCLCBvcHRpb25zOiBRdWFkVHJlZU9wdGlvbnM8VD4gJiB7XG4gICAgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPixcbiAgfSkge1xuICAgIHRoaXMucXVhcmRUcmVlID0gbmV3IFF1YWRUcmVlKGJvdW5kcywgb3B0aW9ucyk7XG4gICAgdGhpcy51bml0UG9zaXRpb25HZXR0ZXIgPSBvcHRpb25zLnVuaXRQb3NpdGlvbkdldHRlcjtcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuc2l6ZTtcbiAgfVxuICBnZXQgYm91bmRzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5ib3VuZHM7XG4gIH1cbiAgYWRkKHQ6IFQpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpO1xuICAgIGlmICghdGhpcy5xdWFyZFRyZWUuYWRkKHBvc2l0aW9uLCB0KSkge1xuICAgICAgdGhyb3cgbmV3IFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yKFxuICAgICAgICAgIGBwb3NpdGlvbiAke0pTT04uc3RyaW5naWZ5KHBvc2l0aW9uKX0gaXMgb3V0IG9mIGJvdW5kczpgICtcbiAgICAgICAgICBgICR7SlNPTi5zdHJpbmdpZnkodGhpcy5xdWFyZFRyZWUuYm91bmRzKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgbW92ZSh0OiBULCB0bzogVmVjMikge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5tb3ZlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0bywgdCk7XG4gIH1cbiAgZGVsZXRlKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuZGVsZXRlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBoYXModDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5oYXModGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMucXVhcmRUcmVlLmNsZWFyKCk7XG4gIH1cbiAgZm9yRWFjaChjYWxsYmFja2ZuOiAodmFsdWU6IFQsIHZhbHVlMjogVCwgc2V0OiBTZXQ8VD4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlSZWR1Y2UoXG4gICAgICAgIChfLCBwKSA9PiB2b2lkKGNhbGxiYWNrZm4ocC51bml0ISwgcC51bml0ISwgdGhpcykpLFxuICAgICAgICB2b2lkKDApLFxuICAgICk7XG4gIH1cbiAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtULCBUXT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8W1QsIFRdPihcbiAgICAgICAgKHApID0+IFtwLnVuaXQhLCBwLnVuaXQhXSkgYXMgYW55O1xuICB9XG4gIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8VD4oXG4gICAgICAgIChwKSA9PiBwLnVuaXQhKSBhcyBhbnk7XG4gIH1cbiAgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpIGFzXG4gICAgICBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT47XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyBhcyBTaGFwZSxcbiAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgYW55LFxuICAgICAgICBpbml0aWFsVmFsdWUpO1xuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5QXJyYXkoc2hhcGUpIGFzIGFueTtcbiAgfVxuXG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkKSxcbiAgICAgIGZvcmVhY2hGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApIHtcbiAgICB0aGlzLnF1YXJkVHJlZS5xdWVyeUZvckVhY2goc2hhcGVPckZvcmVhY2hGdW5jIGFzIGFueSwgZm9yZWFjaEZ1bmMgYXMgYW55KTtcbiAgfVxuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEpLFxuICAgICAgbWFwRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeU1hcChzaGFwZU9yTWFwRnVuYyBhcyBTaGFwZSwgbWFwRnVuYyBhcyBhbnkpO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7SUFHaUIsV0FrRmhCO0FBbEZELFdBQWlCLFVBQVU7SUFDekIsU0FBZ0IsT0FBTyxDQUFJLENBQWdCO1FBQ3pDLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRTtZQUN0QixPQUFPLENBQUMsQ0FBQztTQUNWO1FBQ0QsTUFBTSxDQUFDLEdBQVEsRUFBRSxDQUFDO1FBQ2xCLElBQUssQ0FBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDeEMsS0FBSyxNQUFNLENBQUMsSUFBSyxDQUFrQixFQUFFO2dCQUNuQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ1g7WUFDRCxPQUFPLENBQUMsQ0FBQztTQUNWO1FBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO1lBQ2QsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxD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LElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7WUFDcEUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFDO1NBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztZQUM1QixNQUFNLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQztZQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7U0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztRQUV2RCxLQUFLLE1BQU0sRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbkQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQy9CO1FBQ0QsSUFBSSxDQUFDLEtBQUssR0FBRyxF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
