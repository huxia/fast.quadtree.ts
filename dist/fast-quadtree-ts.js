
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.1.0
   * Released under the MIT license.
   */

var fast_quadtree_ts = (function (exports) {
    'use strict';

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

    exports.QuadTree = QuadTree;
    exports.QuadTreeSet = QuadTreeSet;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbGxlY3Rpb24udHMiLCIuLi8uLi9zcmMvc2hhcGUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWVTZXQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgdHlwZSBDb2xsZWN0aW9uPFQ+ID0gSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCB0eXBlIEl0ZXJhYmxlPFQ+ID0gSXRlcmFibGVJdGVyYXRvcjxUPiB8IEFycmF5PFQ+O1xuZXhwb3J0IG5hbWVzcGFjZSBDb2xsZWN0aW9uIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIHRvQXJyYXk8VD4oYzogQ29sbGVjdGlvbjxUPikge1xuICAgIGlmIChjIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIHJldHVybiBjO1xuICAgIH1cbiAgICBjb25zdCByOiBUW10gPSBbXTtcbiAgICBpZiAoKGMgYXMgR2VuZXJhdG9yPFQ+KVtTeW1ib2wuaXRlcmF0b3JdKSB7XG4gICAgICBmb3IgKGNvbnN0IGkgb2YgKGMgYXMgR2VuZXJhdG9yPFQ+KSkge1xuICAgICAgICByLnB1c2goaSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgbGV0IGkgPSBjLm5leHQoKTtcbiAgICB3aGlsZSAoIWkuZG9uZSkge1xuICAgICAgci5wdXNoKGkudmFsdWUpO1xuICAgICAgaSA9IGMubmV4dCgpO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGU8VD4oXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKCgpID0+IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aEZpbHRlcjxUPihcbiAgICAgIGZpbHRlckZ1bmM6ICgobzogVCkgPT4gYm9vbGVhbiksXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKCgpID0+IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIGlmICghZmlsdGVyRnVuYyB8fCBmaWx0ZXJGdW5jKHJlc3VsdCkpIHtcbiAgICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmMgfHwgZmlsdGVyRnVuYyhyZXN1bHQudmFsdWUpKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGVXaXRoTWFwPFQsIEE+KFxuICAgICAgbWFwRnVuYzogKChvOiBUKSA9PiBBKSxcbiAgICAgIC4uLmNoaWxkSXRlcmF0b3JzOiAoKCkgPT4gQ29sbGVjdGlvbjxUPilbXVxuICApIHtcbiAgICBmb3IgKGNvbnN0IGZ1bmMgb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgIGlmICghZnVuYykgY29udGludWU7XG4gICAgICBjb25zdCBpdGVyYXRvciA9IGZ1bmMoKTtcbiAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGl0ZXJhdG9yKSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhyZXN1bHQudmFsdWUpO1xuICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiZXhwb3J0IGludGVyZmFjZSBWZWMyIHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG59XG5leHBvcnQgaW50ZXJmYWNlIEFBQkIge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IFZlYzI7XG59XG5leHBvcnQgbmFtZXNwYWNlIEFBQkIge1xuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNWZWMoYWFiYjogQUFCQiwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGFhYmIuY2VudGVyLnggLSBhYWJiLnNpemUueCA8PSB2ZWMueCAmJlxuICAgICAgdmVjLnggPD0gYWFiYi5jZW50ZXIueCArIGFhYmIuc2l6ZS54ICYmXG4gICAgICBhYWJiLmNlbnRlci55IC0gYWFiYi5zaXplLnkgPD0gdmVjLnkgJiZcbiAgICAgIHZlYy55IDw9IGFhYmIuY2VudGVyLnkgKyBhYWJiLnNpemUueTtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNBQUJCKG9uZTogQUFCQiwgYW5vdGhlcjogQUFCQik6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhKFxuICAgICAgYW5vdGhlci5jZW50ZXIueCAtIGFub3RoZXIuc2l6ZS54ID4gb25lLmNlbnRlci54ICsgb25lLnNpemUueCB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueCArIGFub3RoZXIuc2l6ZS54IDwgb25lLmNlbnRlci54IC0gb25lLnNpemUueCB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueSAtIGFub3RoZXIuc2l6ZS55ID4gb25lLmNlbnRlci55ICsgb25lLnNpemUueSB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueSArIGFub3RoZXIuc2l6ZS55IDwgb25lLmNlbnRlci55IC0gb25lLnNpemUueVxuICAgICk7XG4gIH1cbn1cbnR5cGUgUmVjdGFuZ2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdyZWN0YW5nbGUnXG59ICYgQUFCQjtcbnR5cGUgRWxsaXBzZVNoYXBlID0ge1xuICB0eXBlOiAnZWxsaXBzZSdcbn0gJiBBQUJCO1xudHlwZSBDaXJjbGVTaGFwZSA9IHtcbiAgdHlwZTogJ2NpcmNsZSdcbn0gJiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogbnVtYmVyO1xufTtcbnR5cGUgU3F1YXJlU2hhcGUgPSB7XG4gIHR5cGU6ICdzcXVhcmUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG5leHBvcnQgdHlwZSBTaGFwZSA9IFJlY3RhbmdsZVNoYXBlIHwgRWxsaXBzZVNoYXBlIHwgQ2lyY2xlU2hhcGUgfCBTcXVhcmVTaGFwZTtcbmV4cG9ydCBuYW1lc3BhY2UgU2hhcGUge1xuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNWZWMoc2hhcGU6IFNoYXBlLCB2ZWM6IFZlYzIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHNoYXBlLCB2ZWMpO1xuICAgICAgY2FzZSAnc3F1YXJlJzogcmV0dXJuIEFBQkIub3ZlcmxhcHNWZWMoe1xuICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgfSwgdmVjKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6IHJldHVybiBTaGFwZS5vdmVybGFwc1ZlYyh7XG4gICAgICAgIHR5cGU6ICdlbGxpcHNlJyxcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdlbGxpcHNlJzoge1xuICAgICAgICBjb25zdCBwID1cbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueCAtIHNoYXBlLmNlbnRlci54LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueCwgMikgK1xuICAgICAgICAgIE1hdGgucG93KHZlYy55IC0gc2hhcGUuY2VudGVyLnksIDIpIC8gTWF0aC5wb3coc2hhcGUuc2l6ZS55LCAyKTtcbiAgICAgICAgcmV0dXJuIHAgPD0gMTtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBwb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlOiBTaGFwZSwgYWFiYjogQUFCQik6IGJvb2xlYW4ge1xuICAgIHN3aXRjaCAoc2hhcGUudHlwZSkge1xuICAgICAgY2FzZSAnZWxsaXBzZSc6XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoc2hhcGUsIGFhYmIpO1xuICAgICAgY2FzZSAnY2lyY2xlJzpcbiAgICAgIGNhc2UgJ3NxdWFyZSc6XG4gICAgICAgIHJldHVybiBBQUJCLm92ZXJsYXBzQUFCQih7XG4gICAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgICB9LCBhYWJiKTtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWN0YW5nbGUoY2VudGVyOiBWZWMyLCBzaXplOiBWZWMyIHwgbnVtYmVyKTogU2hhcGUge1xuICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdzcXVhcmUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAncmVjdGFuZ2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsbGlwc2UoY2VudGVyOiBWZWMyLCBzaXplOiBWZWMyIHwgbnVtYmVyKTogU2hhcGUge1xuICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdjaXJjbGUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQge0NvbGxlY3Rpb24sIEl0ZXJhYmxlfSBmcm9tICcuL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtWZWMyLCBBQUJCLCBTaGFwZX0gZnJvbSAnLi9zaGFwZSc7XG5cbmV4cG9ydCB0eXBlIFF1YWRUcmVlVW5pdEtleUZ1bmM8VD4gPSAoXG4gIHZlYzogVmVjMiwgdW5pdDogVCwgcXVhZFRyZWU6IFF1YWRUcmVlPFQ+XG4pID0+IHN0cmluZyB8IG51bWJlcjtcbmV4cG9ydCB0eXBlIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiA9IChcbiAgICBhY2M6IEEsXG4gICAgcHJldmlvdXM6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSxcbiAgICBpbmRleDogbnVtYmVyLFxuKSA9PiBBIHwgdW5kZWZpbmVkO1xuZXhwb3J0IGludGVyZmFjZSBRdWFkVHJlZU9wdGlvbnM8VD4ge1xuICB1bml0S2V5R2V0dGVyOiBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+LFxuICBpbnRlZ2VyQ29vcmRpbmF0ZT86IGJvb2xlYW4sXG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICByZWFkb25seSBib3VuZHM6IEFBQkI7XG4gIHJlYWRvbmx5IHNpemU6IG51bWJlclxuICBoYXModmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZTxUPiBpbXBsZW1lbnRzIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICBzdGF0aWMgTWF4RWxlbWVudHMgPSA4O1xuICBzdGF0aWMgTWF4RGVwdGggPSA4O1xuICBzdGF0aWMgVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jID0gKFxuICAgICAgdmVjOiBWZWMyLFxuICAgICAgXzogYW55LFxuICAgICAgcXVhZFRyZWU6IFF1YWRUcmVlPGFueT4sXG4gICkgPT5cbiAgICBxdWFkVHJlZS5vcHRpb25zLmludGVnZXJDb29yZGluYXRlID9cbiAgICAgIHZlYy54ICsgKHF1YWRUcmVlLmJvdW5kcy5zaXplLnggKiAyKSAqIHZlYy55IDpcbiAgICAgIGAke3ZlYy54fSwke3ZlYy55fWA7XG5cbiAgYm91bmRzOiBBQUJCO1xuXG4gIHByaXZhdGUgZGVwdGg6IG51bWJlcjtcblxuICBwcml2YXRlIGRpdmlkZWQ6IGJvb2xlYW47XG5cbiAgcHJpdmF0ZSB1bml0czoge1trZXk6IHN0cmluZyB8IG51bWJlcl06IHt1bml0OiBULCB2ZWM6IFZlYzJ9fTtcblxuICBwcml2YXRlIG5vcnRoV2VzdCE6IFF1YWRUcmVlPFQ+O1xuICBwcml2YXRlIG5vcnRoRWFzdCE6IFF1YWRUcmVlPFQ+O1xuICBwcml2YXRlIHNvdXRoV2VzdCE6IFF1YWRUcmVlPFQ+O1xuICBwcml2YXRlIHNvdXRoRWFzdCE6IFF1YWRUcmVlPFQ+O1xuXG4gIHNpemU6IG51bWJlcjtcblxuICByZWFkb25seSBvcHRpb25zOiBRdWFkVHJlZU9wdGlvbnM8VD47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBib3VuZHM6IEFBQkIsXG4gICAgICBvcHRpb25zPzogUXVhZFRyZWVPcHRpb25zPFQ+LFxuICAgICAgZGVwdGg6IG51bWJlciA9IDAsXG4gICkge1xuICAgIHRoaXMuYm91bmRzID0gYm91bmRzO1xuICAgIHRoaXMuZGVwdGggPSBkZXB0aDtcbiAgICB0aGlzLmRpdmlkZWQgPSBmYWxzZTtcbiAgICB0aGlzLnVuaXRzID0ge307XG4gICAgdGhpcy5zaXplID0gMDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHtcbiAgICAgIHVuaXRLZXlHZXR0ZXI6IFF1YWRUcmVlLlVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyxcbiAgICB9O1xuICB9XG4gIF9hZGQodmVjOiBWZWMyLCB1bml0OiBUKTogZmFsc2UgfCAnYWRkZWQnIHwgJ2V4aXN0aW5nJyB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB2ZWMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZGVwdGggPT0gUXVhZFRyZWUuTWF4RGVwdGggfHxcbiAgICAgICF0aGlzLmRpdmlkZWQgJiYgdGhpcy5zaXplIDwgUXVhZFRyZWUuTWF4RWxlbWVudHMpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKHZlYywgdW5pdCwgdGhpcyk7XG4gICAgICBsZXQgcmVzdWx0OiAnZXhpc3RpbmcnIHwgJ2FkZGVkJyA9ICdleGlzdGluZyc7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICB0aGlzLnNpemUgKys7XG4gICAgICAgIHJlc3VsdCA9ICdhZGRlZCc7XG4gICAgICB9XG4gICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjLCB1bml0fTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB0aGlzLmRpdmlkZSgpO1xuICAgIGNvbnN0IGluc2VydGVkID0gdGhpcy5ub3J0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpO1xuICAgIGlmIChpbnNlcnRlZCA9PT0gJ2FkZGVkJykgdGhpcy5zaXplICsrO1xuICAgIHJldHVybiBpbnNlcnRlZDtcbiAgfVxuICBhZGQodmVjOiBWZWMyLCB1bml0OiBUKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5fYWRkKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBfbW92ZShcbiAgICAgIGZyb206IFZlYzIsXG4gICAgICB0bzogVmVjMiB8IHVuZGVmaW5lZCxcbiAgICAgIHVuaXQ6IFQsXG4gICk6IGZhbHNlIHwgJ3JlbW92ZWQnIHwgJ21vdmVkJyB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCBmcm9tKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcihmcm9tLCB1bml0LCB0aGlzKTtcbiAgICAgIGlmICghdGhpcy51bml0c1trZXldKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0byAmJiBBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB0bykpIHtcbiAgICAgICAgLy8gdXBkYXRlIGluLXBsYWNlXG4gICAgICAgIGNvbnN0IG5ld0tleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKHRvLCB1bml0LCB0aGlzKTtcbiAgICAgICAgaWYgKG5ld0tleSAhPT0ga2V5KSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMudW5pdHNba2V5XTtcbiAgICAgICAgICB0aGlzLnVuaXRzW25ld0tleV0gPSB7dmVjOiB0bywgdW5pdH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy51bml0c1trZXldID0ge3ZlYzogdG8sIHVuaXR9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnbW92ZWQnO1xuICAgICAgfVxuICAgICAgZGVsZXRlIHRoaXMudW5pdHNba2V5XTtcbiAgICAgIHRoaXMuc2l6ZSAtLTtcbiAgICAgIHJldHVybiAncmVtb3ZlZCc7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMubm9ydGhXZXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KSB8fFxuICAgICAgICAgIHRoaXMubm9ydGhFYXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KSB8fFxuICAgICAgICAgIHRoaXMuc291dGhXZXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KSB8fFxuICAgICAgICAgIHRoaXMuc291dGhFYXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KTtcbiAgICBpZiAocmVzdWx0ID09PSAncmVtb3ZlZCcpIHtcbiAgICAgIHRoaXMuc2l6ZSAtLTtcbiAgICAgIGlmICh0bykge1xuICAgICAgICBpZiAodGhpcy5hZGQodG8sIHVuaXQpKSByZXR1cm4gJ21vdmVkJztcbiAgICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBtb3ZlKGZyb206IFZlYzIsIHRvOiBWZWMyLCB1bml0OiBUKTogYm9vbGVhbiB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB0bykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5fbW92ZShmcm9tLCB0bywgdW5pdCkgPT09ICdyZW1vdmVkJykgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRlKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9tb3ZlKHZlYywgdW5kZWZpbmVkLCB1bml0KSA9PT0gJ3JlbW92ZWQnO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLnNpemUgPSAwO1xuICAgIHRoaXMuZGl2aWRlZCA9IGZhbHNlO1xuICAgIHRoaXMubm9ydGhXZXN0ID1cbiAgICAgIHRoaXMubm9ydGhFYXN0ID1cbiAgICAgIHRoaXMuc291dGhXZXN0ID1cbiAgICAgIHRoaXMuc291dGhFYXN0ID0gdW5kZWZpbmVkITtcbiAgfVxuICBoYXModmVjOiBWZWMyLCB1bml0OiBUKTogYm9vbGVhbiB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB2ZWMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKHZlYywgdW5pdCwgdGhpcyk7XG4gICAgICByZXR1cm4gISF0aGlzLnVuaXRzW2tleV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vcnRoV2VzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5oYXModmVjLCB1bml0KTtcbiAgfVxuICBwcml2YXRlIGRpdmlkZSgpIHtcbiAgICB0aGlzLmRpdmlkZWQgPSB0cnVlO1xuICAgIGNvbnN0IGh3ID0gdGhpcy5ib3VuZHMuc2l6ZS54IC8gMjtcbiAgICBjb25zdCBoaCA9IHRoaXMuYm91bmRzLnNpemUueSAvIDI7XG5cbiAgICB0aGlzLm5vcnRoV2VzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCAtIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSAtIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5ub3J0aEVhc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggKyBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgLSBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMuc291dGhXZXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54IC0gaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55ICsgaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLnNvdXRoRWFzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCArIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSArIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG5cbiAgICBmb3IgKGNvbnN0IHt2ZWMsIHVuaXR9IG9mIE9iamVjdC52YWx1ZXModGhpcy51bml0cykpIHtcbiAgICAgIHRoaXMubm9ydGhXZXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aFdlc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhFYXN0LmFkZCh2ZWMsIHVuaXQpO1xuICAgIH1cbiAgICB0aGlzLnVuaXRzID0ge307XG4gIH1cbiAgcXVlcnlJdGVyYXRhYmxlPEE+KFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSkgPT4gQSxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+O1xuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBtYXBGdW5jT3JTaGFwZT86ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9KSA9PiBBKSB8IFNoYXBlIHwgdW5kZWZpbmVkLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT4ge1xuICAgIGNvbnN0IG1hcEZ1bmMgPSB0eXBlb2YgbWFwRnVuY09yU2hhcGUgPT09ICdmdW5jdGlvbicgP1xuICAgICAgbWFwRnVuY09yU2hhcGUgOlxuICAgICAgdW5kZWZpbmVkO1xuICAgIGlmIChzaGFwZSAmJiAhU2hhcGUucG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZSwgdGhpcy5ib3VuZHMpKSByZXR1cm4gW107XG5cbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgbGV0IGFyciA9IE9iamVjdC52YWx1ZXModGhpcy51bml0cyk7XG4gICAgICBpZiAoc2hhcGUpIHtcbiAgICAgICAgYXJyID0gYXJyLmZpbHRlcigocikgPT4gU2hhcGUub3ZlcmxhcHNWZWMoc2hhcGUsIHIudmVjKSk7XG4gICAgICB9XG4gICAgICBpZiAobWFwRnVuYykgcmV0dXJuIGFyci5tYXAobWFwRnVuYyk7XG4gICAgICByZXR1cm4gYXJyIGFzIGFueTtcbiAgICB9XG4gICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgIHJldHVybiBDb2xsZWN0aW9uLnRvSXRlcmFibGVXaXRoTWFwKFxuICAgICAgICAgIG1hcEZ1bmMsXG4gICAgICAgICAgKCkgPT4gdGhpcy5ub3J0aFdlc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgICAoKSA9PiB0aGlzLm5vcnRoRWFzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgICAgICgpID0+IHRoaXMuc291dGhXZXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICAgKCkgPT4gdGhpcy5zb3V0aEVhc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICkgYXMgYW55O1xuICAgIH1cbiAgICByZXR1cm4gQ29sbGVjdGlvbi50b0l0ZXJhYmxlKFxuICAgICAgICAoKSA9PiB0aGlzLm5vcnRoV2VzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgICAoKSA9PiB0aGlzLm5vcnRoRWFzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgICAoKSA9PiB0aGlzLnNvdXRoV2VzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgICAoKSA9PiB0aGlzLnNvdXRoRWFzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICkgYXMgYW55O1xuICB9XG4gIHByaXZhdGUgX3F1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQSB7XG4gICAgaWYgKHNoYXBlICYmICFTaGFwZS5wb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlLCB0aGlzLmJvdW5kcykpIHtcbiAgICAgIHJldHVybiBpbml0aWFsVmFsdWUhO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgbGV0IGFyciA9IE9iamVjdC52YWx1ZXModGhpcy51bml0cyk7XG4gICAgICBpZiAoc2hhcGUpIHtcbiAgICAgICAgYXJyID0gYXJyLmZpbHRlcigocikgPT4gU2hhcGUub3ZlcmxhcHNWZWMoc2hhcGUhLCByLnZlYykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFyci5yZWR1Y2UoY2FsbGJhY2tGdW5jIGFzIGFueSwgaW5pdGlhbFZhbHVlKSBhcyB1bmtub3duIGFzIEE7XG4gICAgfVxuICAgIGxldCB2YWx1ZTogQSA9IGluaXRpYWxWYWx1ZSE7XG4gICAgdmFsdWUgPSB0aGlzLm5vcnRoV2VzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUpO1xuICAgIHZhbHVlID0gdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlKTtcbiAgICB2YWx1ZSA9IHRoaXMuc291dGhXZXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSk7XG4gICAgdmFsdWUgPSB0aGlzLnNvdXRoRWFzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmM6IFNoYXBlIHwgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWU6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiB8IEEsXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQSB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yQ2FsbGJhY2tGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2UoXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgQSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZShcbiAgICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jLFxuICAgICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgICAgICBpbml0aWFsVmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+IHtcbiAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9Pj4oXG4gICAgICAgIHNoYXBlLFxuICAgICAgICAoYXJyLCB2KSA9PiB7XG4gICAgICAgICAgYXJyLnB1c2godik7XG4gICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgfSwgW10pO1xuICB9XG5cbiAgcXVlcnlGb3JFYWNoKFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZU9yRm9yZWFjaEZ1bmM6XG4gICAgICAgIFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQpLFxuICAgICAgZm9yZWFjaEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApIHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JGb3JlYWNoRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fcXVlcnlSZWR1Y2U8dm9pZD4oXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIChfLCB2LCBpbmRleCkgPT4gc2hhcGVPckZvcmVhY2hGdW5jKHYsIGluZGV4KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghZm9yZWFjaEZ1bmMpIHJldHVybjtcbiAgICAgIHRoaXMuX3F1ZXJ5UmVkdWNlPHZvaWQ+KFxuICAgICAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYyxcbiAgICAgICAgICAoXywgdiwgaW5kZXgpID0+IGZvcmVhY2hGdW5jKHYsIGluZGV4KSk7XG4gICAgfVxuICB9XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZU9yTWFwRnVuYzogU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSksXG4gICAgICBtYXBGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT4ge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPck1hcEZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmICghbWFwRnVuYykgcmV0dXJuIFtdO1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PEE+PihcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgKGFyciwgdiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGFyci5wdXNoKHNoYXBlT3JNYXBGdW5jKHYsIGluZGV4KSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10pO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIW1hcEZ1bmMpIHJldHVybiBbXTtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTxBPj4oXG4gICAgICAgICAgc2hhcGVPck1hcEZ1bmMsXG4gICAgICAgICAgKGFyciwgdiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGFyci5wdXNoKG1hcEZ1bmModiwgaW5kZXgpKTtcbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBbXSk7XG4gICAgfVxuICB9XG4gIF9kdW1wVG9TdHJpbmcocmVzdWx0OiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHByZWZpeCA9ICcgICAgICAgICAgICAnLnN1YnN0cmluZygwLCB0aGlzLmRlcHRoKTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgcmVzdWx0LnB1c2gocHJlZml4KTtcbiAgICAgIHJlc3VsdC5wdXNoKEpTT04uc3RyaW5naWZ5KHRoaXMudW5pdHMpKTtcbiAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgW1xuICAgICAge3N0cjogJ05XJywgcXQ6IHRoaXMubm9ydGhXZXN0fSxcbiAgICAgIHtzdHI6ICdORScsIHF0OiB0aGlzLm5vcnRoRWFzdH0sXG4gICAgICB7c3RyOiAnU1cnLCBxdDogdGhpcy5zb3V0aFdlc3R9LFxuICAgICAge3N0cjogJ1NFJywgcXQ6IHRoaXMuc291dGhFYXN0fSxcbiAgICBdKSB7XG4gICAgICByZXN1bHQucHVzaChwcmVmaXgpO1xuICAgICAgcmVzdWx0LnB1c2goY2hpbGQuc3RyKTtcbiAgICAgIHJlc3VsdC5wdXNoKGAgKCR7Y2hpbGQucXQuc2l6ZX0pOlxcbmApO1xuICAgICAgY2hpbGQucXQuX2R1bXBUb1N0cmluZyhyZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2R1bXBUb1N0cmluZyhbXSkuam9pbignJyk7XG4gIH1cbn1cbiIsImltcG9ydCB7XG4gIFF1YWRUcmVlLFxuICBRdWFkVHJlZU9wdGlvbnMsXG59IGZyb20gJy4vUXVhZFRyZWUnO1xuaW1wb3J0IHtBQUJCLCBTaGFwZSwgVmVjMn0gZnJvbSAnLi9zaGFwZSc7XG5cbmV4cG9ydCB0eXBlIFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+ID0gKG86IFQpID0+IFZlYzI7XG5leHBvcnQgdHlwZSBRdWFkTWFwVW5pdFBvc2l0aW9uU2V0dGVyRnVuYzxUPiA9IChvOiBULCBwb3NpdGlvbjogVmVjMikgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiA9IChcbiAgYWNjOiBBLFxuICBwcmV2aW91czoge3ZlYzogVmVjMiwgdW5pdDogVH0sXG4gIGluZGV4OiBudW1iZXIsXG4pID0+IEEgfCB1bmRlZmluZWQ7XG5leHBvcnQgY2xhc3MgUXVhZFRyZWVQb3NpdGlvbk91dE9mQm91bmRzRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICB9XG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWVTZXQ8VD4gZXh0ZW5kcyBSZWFkb25seVNldDxUPiB7XG4gIHJlYWRvbmx5IGJvdW5kczogQUFCQjtcbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT47XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0OiBUfT47XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xufVxuZXhwb3J0IGNsYXNzIFF1YWRUcmVlU2V0PFQ+IGltcGxlbWVudHMgU2V0PFQ+LCBSZWFkb25seVF1YWRUcmVlU2V0PFQ+IHtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFZlY0tleUZ1bmMgPSBRdWFkVHJlZS5VbmlxdWVVbml0QXRQb3NpdGlvbktleUZ1bmM7XG4gIHByaXZhdGUgcXVhcmRUcmVlOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSB1bml0UG9zaXRpb25HZXR0ZXI6IFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+O1xuICBjb25zdHJ1Y3Rvcihib3VuZHM6IEFBQkIsIG9wdGlvbnM6IFF1YWRUcmVlT3B0aW9uczxUPiAmIHtcbiAgICB1bml0UG9zaXRpb25HZXR0ZXI6IFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+LFxuICB9KSB7XG4gICAgdGhpcy5xdWFyZFRyZWUgPSBuZXcgUXVhZFRyZWUoYm91bmRzLCBvcHRpb25zKTtcbiAgICB0aGlzLnVuaXRQb3NpdGlvbkdldHRlciA9IG9wdGlvbnMudW5pdFBvc2l0aW9uR2V0dGVyO1xuICB9XG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5zaXplO1xuICB9XG4gIGdldCBib3VuZHMoKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLmJvdW5kcztcbiAgfVxuICBhZGQodDogVCkge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCk7XG4gICAgaWYgKCF0aGlzLnF1YXJkVHJlZS5hZGQocG9zaXRpb24sIHQpKSB7XG4gICAgICB0aHJvdyBuZXcgUXVhZFRyZWVQb3NpdGlvbk91dE9mQm91bmRzRXJyb3IoXG4gICAgICAgICAgYHBvc2l0aW9uICR7SlNPTi5zdHJpbmdpZnkocG9zaXRpb24pfSBpcyBvdXQgb2YgYm91bmRzOmAgK1xuICAgICAgICAgIGAgJHtKU09OLnN0cmluZ2lmeSh0aGlzLnF1YXJkVHJlZS5ib3VuZHMpfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBtb3ZlKHQ6IFQsIHRvOiBWZWMyKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLm1vdmUodGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHRvLCB0KTtcbiAgfVxuICBkZWxldGUodDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5kZWxldGUodGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGhhcyh0OiBUKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLmhhcyh0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KSwgdCk7XG4gIH1cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy5xdWFyZFRyZWUuY2xlYXIoKTtcbiAgfVxuICBmb3JFYWNoKGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgdmFsdWUyOiBULCBzZXQ6IFNldDxUPikgPT4gdm9pZCk6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgKF8sIHApID0+IHZvaWQoY2FsbGJhY2tmbihwLnVuaXQhLCBwLnVuaXQhLCB0aGlzKSksXG4gICAgICAgIHZvaWQoMCksXG4gICAgKTtcbiAgfVxuICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W1QsIFRdPiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZTxbVCwgVF0+KFxuICAgICAgICAocCkgPT4gW3AudW5pdCEsIHAudW5pdCFdKSBhcyBhbnk7XG4gIH1cbiAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMoKTtcbiAgfVxuICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZTxUPihcbiAgICAgICAgKHApID0+IHAudW5pdCEpIGFzIGFueTtcbiAgfVxuICBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUudG9TdHJpbmcoKTtcbiAgfVxuICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMoKTtcbiAgfVxuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSkgYXNcbiAgICAgIEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PjtcbiAgfVxuXG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmM6IFNoYXBlIHwgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWU6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiB8IEEsXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5UmVkdWNlKFxuICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jIGFzIFNoYXBlLFxuICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBhbnksXG4gICAgICAgIGluaXRpYWxWYWx1ZSk7XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdDogVH0+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlBcnJheShzaGFwZSkgYXMgYW55O1xuICB9XG5cbiAgcXVlcnlGb3JFYWNoKFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGVPckZvcmVhY2hGdW5jOlxuICAgICAgICBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQpLFxuICAgICAgZm9yZWFjaEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIHRoaXMucXVhcmRUcmVlLnF1ZXJ5Rm9yRWFjaChzaGFwZU9yRm9yZWFjaEZ1bmMgYXMgYW55LCBmb3JlYWNoRnVuYyBhcyBhbnkpO1xuICB9XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGVPck1hcEZ1bmM6IFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSksXG4gICAgICBtYXBGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5TWFwKHNoYXBlT3JNYXBGdW5jIGFzIFNoYXBlLCBtYXBGdW5jIGFzIGFueSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJDb2xsZWN0aW9uIiwiQUFCQiIsIlNoYXBlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUdpQkEsZ0NBa0ZoQjtJQWxGRCxDQUFBLFVBQWlCLFVBQVUsRUFBQTtRQUN6QixTQUFnQixPQUFPLENBQUksQ0FBZ0IsRUFBQTtZQUN6QyxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUU7SUFDdEIsWUFBQSxPQUFPLENBQUMsQ0FBQztJQUNWLFNBQUE7WUFDRCxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUM7SUFDbEIsUUFBQSxJQUFLLENBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO0lBQ3hDLFlBQUEsS0FBSyxNQUFNLENBQUMsSUFBSyxDQUFrQixFQUFFO0lBQ25DLGdCQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxhQUFBO0lBQ0QsWUFBQSxPQUFPLENBQUMsQ0FBQztJQUNWLFNBQUE7SUFDRCxRQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNqQixR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LENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7Z0JBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQzthQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7Z0JBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQzthQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7Z0JBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFF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
