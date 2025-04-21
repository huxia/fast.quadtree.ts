
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.1.2
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

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbGxlY3Rpb24udHMiLCIuLi8uLi9zcmMvc2hhcGUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWVTZXQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgdHlwZSBDb2xsZWN0aW9uPFQ+ID0gSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCB0eXBlIEl0ZXJhYmxlPFQ+ID0gSXRlcmFibGVJdGVyYXRvcjxUPiB8IEFycmF5PFQ+O1xuZXhwb3J0IG5hbWVzcGFjZSBDb2xsZWN0aW9uIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIHRvQXJyYXk8VD4oYzogQ29sbGVjdGlvbjxUPikge1xuICAgIGlmIChjIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIHJldHVybiBjO1xuICAgIH1cbiAgICBjb25zdCByOiBUW10gPSBbXTtcbiAgICBpZiAoKGMgYXMgR2VuZXJhdG9yPFQ+KVtTeW1ib2wuaXRlcmF0b3JdKSB7XG4gICAgICBmb3IgKGNvbnN0IGkgb2YgKGMgYXMgR2VuZXJhdG9yPFQ+KSkge1xuICAgICAgICByLnB1c2goaSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgbGV0IGkgPSBjLm5leHQoKTtcbiAgICB3aGlsZSAoIWkuZG9uZSkge1xuICAgICAgci5wdXNoKGkudmFsdWUpO1xuICAgICAgaSA9IGMubmV4dCgpO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGU8VD4oXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKHVuZGVmaW5lZCB8ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KSB8IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jT3JDb2xsZWN0aW9uIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmNPckNvbGxlY3Rpb24pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuY09yQ29sbGVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgIGZ1bmNPckNvbGxlY3Rpb24oKSA6IGZ1bmNPckNvbGxlY3Rpb247XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aEZpbHRlcjxUPihcbiAgICAgIGZpbHRlckZ1bmM6ICgobzogVCwgaWR4OiBudW1iZXIpID0+IGJvb2xlYW4pLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgICAgIC4uLmNoaWxkSXRlcmF0b3JzOiAodW5kZWZpbmVkIHwgQ29sbGVjdGlvbjxUPiB8XG4gICAgICAgICgoKSA9PiBDb2xsZWN0aW9uPFQ+KSB8IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgaWYgKCFmaWx0ZXJGdW5jKSB7XG4gICAgICBmb3IgKGNvbnN0IGZ1bmNPckNvbGxlY3Rpb24gb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgICAgaWYgKCFmdW5jT3JDb2xsZWN0aW9uKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuY09yQ29sbGVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgZnVuY09yQ29sbGVjdGlvbigpIDogZnVuY09yQ29sbGVjdGlvbjtcbiAgICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgICAgeWllbGQgcmVzdWx0O1xuICAgICAgICAgICAgaW5kZXguaW5kZXgrKztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgICBpbmRleC5pbmRleCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IGZ1bmMgb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJyA/IGZ1bmMoKSA6IGZ1bmM7XG4gICAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJGdW5jKHJlc3VsdCwgaW5kZXguaW5kZXgrKykpIHtcbiAgICAgICAgICAgICAgeWllbGQgcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJGdW5jKHJlc3VsdC52YWx1ZSwgaW5kZXguaW5kZXgrKykpIHtcbiAgICAgICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGVXaXRoTWFwPFQsIEE+KFxuICAgICAgbWFwRnVuYzogKChvOiBULCBpZHg6IG51bWJlcikgPT4gQSksXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICh1bmRlZmluZWQgfCBDb2xsZWN0aW9uPFQ+XG4gICAgICAgIHwgKCgpID0+IENvbGxlY3Rpb248VD4pIHwgQ29sbGVjdGlvbjxUPilbXVxuICApIHtcbiAgICBmb3IgKGNvbnN0IGZ1bmNPckNvbGxlY3Rpb24gb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgIGlmICghZnVuY09yQ29sbGVjdGlvbikgY29udGludWU7XG4gICAgICBjb25zdCBpdGVyYXRvciA9IHR5cGVvZiBmdW5jT3JDb2xsZWN0aW9uID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgZnVuY09yQ29sbGVjdGlvbigpIDogZnVuY09yQ29sbGVjdGlvbjtcbiAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGl0ZXJhdG9yKSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhyZXN1bHQsIGluZGV4LmluZGV4KyspO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhyZXN1bHQudmFsdWUsIGluZGV4LmluZGV4KyspO1xuICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIG9iamVjdFZhbHVlc1RvSXRlcmFibGU8VCwgQT4oXG4gICAgICBvYmplY3Q6IFJlY29yZDxzdHJpbmcsIFQ+LFxuICAgICAgZmlsdGVyRnVuYzogdW5kZWZpbmVkIHwgKChvOiBULCBpZHg6IG51bWJlcikgPT4gYm9vbGVhbiksXG4gICAgICBtYXBGdW5jOiB1bmRlZmluZWQgfCAoKG86IFQsIGlkeDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIGluZGV4OiB7aW5kZXg6IG51bWJlcn0sXG4gICkge1xuICAgIGlmIChmaWx0ZXJGdW5jKSB7XG4gICAgICBpZiAobWFwRnVuYykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgICAgICAgaWYgKCFmaWx0ZXJGdW5jKHZhbHVlLCBpbmRleC5pbmRleCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB5aWVsZCBtYXBGdW5jKHZhbHVlLCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgICAgICAgIGlmICghZmlsdGVyRnVuYyh2YWx1ZSwgaW5kZXguaW5kZXgpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgeWllbGQgdmFsdWU7XG4gICAgICAgICAgaW5kZXguaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAobWFwRnVuYykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMob2JqZWN0W2tleV0sIGluZGV4LmluZGV4KyspO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIHlpZWxkIG9iamVjdFtrZXldO1xuICAgICAgICAgIGluZGV4LmluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImV4cG9ydCBpbnRlcmZhY2UgVmVjMiB7XG4gIHg6IG51bWJlcjtcbiAgeTogbnVtYmVyO1xufVxuZXhwb3J0IGludGVyZmFjZSBBQUJCIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBWZWMyO1xufVxuZXhwb3J0IG5hbWVzcGFjZSBBQUJCIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKGFhYmI6IEFBQkIsIHZlYzogVmVjMik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhYWJiLmNlbnRlci54IC0gYWFiYi5zaXplLnggPD0gdmVjLnggJiZcbiAgICAgIHZlYy54IDw9IGFhYmIuY2VudGVyLnggKyBhYWJiLnNpemUueCAmJlxuICAgICAgYWFiYi5jZW50ZXIueSAtIGFhYmIuc2l6ZS55IDw9IHZlYy55ICYmXG4gICAgICB2ZWMueSA8PSBhYWJiLmNlbnRlci55ICsgYWFiYi5zaXplLnk7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzQUFCQihvbmU6IEFBQkIsIGFub3RoZXI6IEFBQkIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIShcbiAgICAgIGFub3RoZXIuY2VudGVyLnggLSBhbm90aGVyLnNpemUueCA+IG9uZS5jZW50ZXIueCArIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnggKyBhbm90aGVyLnNpemUueCA8IG9uZS5jZW50ZXIueCAtIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgLSBhbm90aGVyLnNpemUueSA+IG9uZS5jZW50ZXIueSArIG9uZS5zaXplLnkgfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgKyBhbm90aGVyLnNpemUueSA8IG9uZS5jZW50ZXIueSAtIG9uZS5zaXplLnlcbiAgICApO1xuICB9XG59XG50eXBlIFJlY3RhbmdsZVNoYXBlID0ge1xuICB0eXBlOiAncmVjdGFuZ2xlJ1xufSAmIEFBQkI7XG50eXBlIEVsbGlwc2VTaGFwZSA9IHtcbiAgdHlwZTogJ2VsbGlwc2UnXG59ICYgQUFCQjtcbnR5cGUgQ2lyY2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdjaXJjbGUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG50eXBlIFNxdWFyZVNoYXBlID0ge1xuICB0eXBlOiAnc3F1YXJlJ1xufSAmIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBudW1iZXI7XG59O1xuZXhwb3J0IHR5cGUgU2hhcGUgPSBSZWN0YW5nbGVTaGFwZSB8IEVsbGlwc2VTaGFwZSB8IENpcmNsZVNoYXBlIHwgU3F1YXJlU2hhcGU7XG5leHBvcnQgbmFtZXNwYWNlIFNoYXBlIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKHNoYXBlOiBTaGFwZSwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoIChzaGFwZS50eXBlKSB7XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOiByZXR1cm4gQUFCQi5vdmVybGFwc1ZlYyhzaGFwZSwgdmVjKTtcbiAgICAgIGNhc2UgJ3NxdWFyZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHtcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdjaXJjbGUnOiByZXR1cm4gU2hhcGUub3ZlcmxhcHNWZWMoe1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICB9LCB2ZWMpO1xuICAgICAgY2FzZSAnZWxsaXBzZSc6IHtcbiAgICAgICAgY29uc3QgcCA9XG4gICAgICAgICAgTWF0aC5wb3codmVjLnggLSBzaGFwZS5jZW50ZXIueCwgMikgLyBNYXRoLnBvdyhzaGFwZS5zaXplLngsIDIpICtcbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueSAtIHNoYXBlLmNlbnRlci55LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueSwgMik7XG4gICAgICAgIHJldHVybiBwIDw9IDE7XG4gICAgICB9XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gcG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZTogU2hhcGUsIGFhYmI6IEFBQkIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2VsbGlwc2UnOlxuICAgICAgY2FzZSAncmVjdGFuZ2xlJzpcbiAgICAgICAgcmV0dXJuIEFBQkIub3ZlcmxhcHNBQUJCKHNoYXBlLCBhYWJiKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6XG4gICAgICBjYXNlICdzcXVhcmUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoe1xuICAgICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgICAgfSwgYWFiYik7XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVjdGFuZ2xlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnc3F1YXJlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3JlY3RhbmdsZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGxpcHNlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnY2lyY2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2VsbGlwc2UnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHtDb2xsZWN0aW9uLCBJdGVyYWJsZX0gZnJvbSAnLi9jb2xsZWN0aW9uJztcbmltcG9ydCB7VmVjMiwgQUFCQiwgU2hhcGV9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+ID0gKFxuICB2ZWM6IFZlYzIsIHVuaXQ6IFQsIHF1YWRUcmVlOiBRdWFkVHJlZTxUPlxuKSA9PiBzdHJpbmcgfCBudW1iZXI7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gICAgYWNjOiBBLFxuICAgIHByZXZpb3VzOiB7dmVjOiBWZWMyLCB1bml0PzogVH0sXG4gICAgaW5kZXg6IG51bWJlcixcbikgPT4gQSB8IHVuZGVmaW5lZDtcbmV4cG9ydCBpbnRlcmZhY2UgUXVhZFRyZWVPcHRpb25zPFQ+IHtcbiAgdW5pdEtleUdldHRlcjogUXVhZFRyZWVVbml0S2V5RnVuYzxUPixcbn1cbmV4cG9ydCBpbnRlcmZhY2UgUmVhZG9ubHlRdWFkVHJlZTxUPiB7XG4gIHJlYWRvbmx5IGJvdW5kczogQUFCQjtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyXG4gIGhhcyh2ZWM6IFZlYzIsIHVuaXQ/OiBUKTogYm9vbGVhbjtcbiAgcXVlcnlJdGVyYXRhYmxlPEE+KFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSkgPT4gQSxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+O1xuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcblxuICBxdWVyeU1hcDxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeVNpemUoXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICk6IG51bWJlcjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZTxUPiBpbXBsZW1lbnRzIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICBzdGF0aWMgTWF4RWxlbWVudHMgPSA4O1xuICBzdGF0aWMgTWF4RGVwdGggPSA4O1xuICBzdGF0aWMgVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jID0gKFxuICAgICAgdmVjOiBWZWMyLFxuICAgICAgXzogYW55LFxuICAgICAgcXVhZFRyZWU6IFF1YWRUcmVlPGFueT4sXG4gICkgPT4gYCR7dmVjLnh9LCR7dmVjLnl9YDtcblxuICBib3VuZHM6IEFBQkI7XG5cbiAgcHJpdmF0ZSBkZXB0aDogbnVtYmVyO1xuXG4gIHByaXZhdGUgZGl2aWRlZDogYm9vbGVhbjtcblxuICBwcml2YXRlIHVuaXRzOiB7W2tleTogc3RyaW5nIHwgbnVtYmVyXToge3VuaXQ6IFQsIHZlYzogVmVjMn19O1xuXG5cbiAgcHJpdmF0ZSBub3J0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBub3J0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBfc2l6ZTogbnVtYmVyO1xuXG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLl9zaXplO1xuICB9XG5cbiAgcmVhZG9ubHkgb3B0aW9uczogUXVhZFRyZWVPcHRpb25zPFQ+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgYm91bmRzOiBBQUJCLFxuICAgICAgb3B0aW9ucz86IFBhcnRpYWw8UXVhZFRyZWVPcHRpb25zPFQ+PixcbiAgICAgIGRlcHRoOiBudW1iZXIgPSAwLFxuICApIHtcbiAgICB0aGlzLmJvdW5kcyA9IGJvdW5kcztcbiAgICB0aGlzLmRlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5kaXZpZGVkID0gZmFsc2U7XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICAgIHRoaXMuX3NpemUgPSAwO1xuICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgIHVuaXRLZXlHZXR0ZXI6XG4gICAgICAgIG9wdGlvbnM/LnVuaXRLZXlHZXR0ZXIgfHwgUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jLFxuICAgIH07XG4gIH1cbiAgX2FkZCh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBmYWxzZSB8ICdhZGRlZCcgfCAnZXhpc3RpbmcnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5kZXB0aCA9PSBRdWFkVHJlZS5NYXhEZXB0aCB8fFxuICAgICAgIXRoaXMuZGl2aWRlZCAmJiB0aGlzLnNpemUgPCBRdWFkVHJlZS5NYXhFbGVtZW50cykge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIGxldCByZXN1bHQ6ICdleGlzdGluZycgfCAnYWRkZWQnID0gJ2V4aXN0aW5nJztcbiAgICAgIGlmICghdGhpcy51bml0c1trZXldKSB7XG4gICAgICAgIHRoaXMuX3NpemUgKys7XG4gICAgICAgIHJlc3VsdCA9ICdhZGRlZCc7XG4gICAgICB9XG4gICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjLCB1bml0fTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB0aGlzLmRpdmlkZSgpO1xuICAgIGNvbnN0IGluc2VydGVkID0gdGhpcy5ub3J0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpO1xuICAgIGlmIChpbnNlcnRlZCA9PT0gJ2FkZGVkJykgdGhpcy5fc2l6ZSArKztcbiAgICByZXR1cm4gaW5zZXJ0ZWQ7XG4gIH1cbiAgYWRkKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuX2FkZCh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgX21vdmUoXG4gICAgICBmcm9tOiBWZWMyLFxuICAgICAgdG86IFZlYzIgfCB1bmRlZmluZWQsXG4gICAgICB1bml0OiBULFxuICApOiBmYWxzZSB8ICdyZW1vdmVkJyB8ICdtb3ZlZCcge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgZnJvbSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIoZnJvbSwgdW5pdCwgdGhpcyk7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodG8gJiYgQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdG8pKSB7XG4gICAgICAgIC8vIHVwZGF0ZSBpbi1wbGFjZVxuICAgICAgICBjb25zdCBuZXdLZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih0bywgdW5pdCwgdGhpcyk7XG4gICAgICAgIGlmIChuZXdLZXkgIT09IGtleSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICAgICAgdGhpcy51bml0c1tuZXdLZXldID0ge3ZlYzogdG8sIHVuaXR9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudW5pdHNba2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ21vdmVkJztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICB0aGlzLl9zaXplIC0tO1xuICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ub3J0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5ub3J0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpO1xuICAgIGlmIChyZXN1bHQgPT09ICdyZW1vdmVkJykge1xuICAgICAgdGhpcy5fc2l6ZSAtLTtcbiAgICAgIGlmICh0bykge1xuICAgICAgICBpZiAodGhpcy5hZGQodG8sIHVuaXQpKSByZXR1cm4gJ21vdmVkJztcbiAgICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBtb3ZlKGZyb206IFZlYzIsIHRvOiBWZWMyLCB1bml0OiBUKTogYm9vbGVhbiB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB0bykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5fbW92ZShmcm9tLCB0bywgdW5pdCkgPT09ICdyZW1vdmVkJykgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRlKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9tb3ZlKHZlYywgdW5kZWZpbmVkLCB1bml0KSA9PT0gJ3JlbW92ZWQnO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLl9zaXplID0gMDtcbiAgICB0aGlzLmRpdmlkZWQgPSBmYWxzZTtcbiAgICB0aGlzLm5vcnRoV2VzdCA9XG4gICAgICB0aGlzLm5vcnRoRWFzdCA9XG4gICAgICB0aGlzLnNvdXRoV2VzdCA9XG4gICAgICB0aGlzLnNvdXRoRWFzdCA9IHVuZGVmaW5lZCE7XG4gIH1cbiAgaGFzKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdmVjKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih2ZWMsIHVuaXQsIHRoaXMpO1xuICAgICAgcmV0dXJuICEhdGhpcy51bml0c1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub3J0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuaGFzKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBkaXZpZGUoKSB7XG4gICAgdGhpcy5kaXZpZGVkID0gdHJ1ZTtcbiAgICBjb25zdCBodyA9IHRoaXMuYm91bmRzLnNpemUueCAvIDI7XG4gICAgY29uc3QgaGggPSB0aGlzLmJvdW5kcy5zaXplLnkgLyAyO1xuXG4gICAgdGhpcy5ub3J0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgLSBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMubm9ydGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLnNvdXRoV2VzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCAtIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSArIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aEVhc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggKyBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgIGZvciAoY29uc3QgayBpbiB0aGlzLnVuaXRzKSB7XG4gICAgICBjb25zdCB7dmVjLCB1bml0fSA9IHRoaXMudW5pdHNba107XG4gICAgICB0aGlzLm5vcnRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5hZGQodmVjLCB1bml0KTtcbiAgICB9XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICB9XG4gIHByaXZhdGUgX3F1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIG1hcEZ1bmM6ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpZHg6IG51bWJlcikgPT4gQSkgfCB1bmRlZmluZWQsXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApOiBJdGVyYWJsZTxBPiB7XG4gICAgaWYgKHNoYXBlICYmICFTaGFwZS5wb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlLCB0aGlzLmJvdW5kcykpIHJldHVybiBbXTtcblxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICByZXR1cm4gQ29sbGVjdGlvbi5vYmplY3RWYWx1ZXNUb0l0ZXJhYmxlKFxuICAgICAgICAgIHRoaXMudW5pdHMsXG4gICAgICAgICAgc2hhcGUgPyAodikgPT4gU2hhcGUub3ZlcmxhcHNWZWMoc2hhcGUsIHYudmVjKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBtYXBGdW5jLFxuICAgICAgICAgIGluZGV4LFxuICAgICAgKSBhcyBJdGVyYWJsZTxBPjtcbiAgICB9XG4gICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgIHJldHVybiBDb2xsZWN0aW9uLnRvSXRlcmFibGVXaXRoTWFwKFxuICAgICAgICAgIG1hcEZ1bmMsXG4gICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgdGhpcy5ub3J0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgdGhpcy5zb3V0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgdGhpcy5zb3V0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gQ29sbGVjdGlvbi50b0l0ZXJhYmxlKFxuICAgICAgICB0aGlzLm5vcnRoV2VzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICAgdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgIHRoaXMuc291dGhXZXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICB0aGlzLnNvdXRoRWFzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICApO1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGlkeDogbnVtYmVyKSA9PiBBLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmNPclNoYXBlPzogKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGlkeDogbnVtYmVyKSA9PiBBKSB8IFNoYXBlLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT4ge1xuICAgIGlmICh0eXBlb2YgbWFwRnVuY09yU2hhcGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIG1hcEZ1bmNPclNoYXBlLCB7aW5kZXg6IDB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5SXRlcmF0YWJsZShcbiAgICAgICAgbWFwRnVuY09yU2hhcGUgYXMgU2hhcGUsXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgX3F1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU6IEEgfCB1bmRlZmluZWQsXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApOiBBIHtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkge1xuICAgICAgcmV0dXJuIGluaXRpYWxWYWx1ZSE7XG4gICAgfVxuICAgIGxldCB2YWx1ZTogQSA9IGluaXRpYWxWYWx1ZSE7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGlmIChzaGFwZSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3QgayBpbiB0aGlzLnVuaXRzKSB7XG4gICAgICAgICAgY29uc3QgdW5pdCA9IHRoaXMudW5pdHNba107XG4gICAgICAgICAgaWYgKFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlLCB1bml0LnZlYykpIHtcbiAgICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2tGdW5jKHZhbHVlLCB1bml0LCBpbmRleC5pbmRleCsrKSE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3QgayBpbiB0aGlzLnVuaXRzKSB7XG4gICAgICAgICAgY29uc3QgdW5pdCA9IHRoaXMudW5pdHNba107XG4gICAgICAgICAgdmFsdWUgPSBjYWxsYmFja0Z1bmModmFsdWUsIHVuaXQsIGluZGV4LmluZGV4KyspITtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhXZXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHZhbHVlID0gdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlLCBpbmRleCk7XG4gICAgdmFsdWUgPSB0aGlzLnNvdXRoV2VzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUsIGluZGV4KTtcbiAgICB2YWx1ZSA9IHRoaXMuc291dGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmM6IFNoYXBlIHwgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWU6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiB8IEEsXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQSB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yQ2FsbGJhY2tGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2UoXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgQSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgICAgIGluaXRpYWxWYWx1ZSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4+KFxuICAgICAgICBzaGFwZSxcbiAgICAgICAgKGFyciwgdikgPT4ge1xuICAgICAgICAgIGFyci5wdXNoKHYpO1xuICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgIH0sXG4gICAgICAgIFtdLFxuICAgICAgICB7aW5kZXg6IDB9LFxuICAgICk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckZvcmVhY2hGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBzaGFwZU9yRm9yZWFjaEZ1bmModiwgaW5kZXgpLFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFmb3JlYWNoRnVuYykgcmV0dXJuO1xuICAgICAgdGhpcy5fcXVlcnlSZWR1Y2U8dm9pZD4oXG4gICAgICAgICAgc2hhcGVPckZvcmVhY2hGdW5jLFxuICAgICAgICAgIChfLCB2LCBpbmRleCkgPT4gZm9yZWFjaEZ1bmModiwgaW5kZXgpLFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yTWFwRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2goc2hhcGVPck1hcEZ1bmModiwgaW5kZXgpKTtcbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBbXSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHNoYXBlT3JNYXBGdW5jLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChtYXBGdW5jKHYsIGluZGV4KSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10sXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHF1ZXJ5U2l6ZShcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8bnVtYmVyPihcbiAgICAgICAgc2hhcGUsXG4gICAgICAgIChzaXplKSA9PiBzaXplICsgMSxcbiAgICAgICAgMCxcbiAgICAgICAge2luZGV4OiAwfSxcbiAgICApO1xuICB9XG4gIF9kdW1wVG9TdHJpbmcocmVzdWx0OiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHByZWZpeCA9ICcgICAgICAgICAgICAnLnN1YnN0cmluZygwLCB0aGlzLmRlcHRoKTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgcmVzdWx0LnB1c2gocHJlZml4KTtcbiAgICAgIHJlc3VsdC5wdXNoKEpTT04uc3RyaW5naWZ5KHRoaXMudW5pdHMpKTtcbiAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgW1xuICAgICAge3N0cjogJ05XJywgcXQ6IHRoaXMubm9ydGhXZXN0fSxcbiAgICAgIHtzdHI6ICdORScsIHF0OiB0aGlzLm5vcnRoRWFzdH0sXG4gICAgICB7c3RyOiAnU1cnLCBxdDogdGhpcy5zb3V0aFdlc3R9LFxuICAgICAge3N0cjogJ1NFJywgcXQ6IHRoaXMuc291dGhFYXN0fSxcbiAgICBdKSB7XG4gICAgICByZXN1bHQucHVzaChwcmVmaXgpO1xuICAgICAgcmVzdWx0LnB1c2goY2hpbGQuc3RyKTtcbiAgICAgIHJlc3VsdC5wdXNoKGAgKCR7Y2hpbGQucXQuc2l6ZX0pOlxcbmApO1xuICAgICAgY2hpbGQucXQuX2R1bXBUb1N0cmluZyhyZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2R1bXBUb1N0cmluZyhbXSkuam9pbignJyk7XG4gIH1cbn1cbiIsImltcG9ydCB7XG4gIFF1YWRUcmVlLFxuICBRdWFkVHJlZU9wdGlvbnMsXG59IGZyb20gJy4vUXVhZFRyZWUnO1xuaW1wb3J0IHtBQUJCLCBTaGFwZSwgVmVjMn0gZnJvbSAnLi9zaGFwZSc7XG5cbmV4cG9ydCB0eXBlIFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+ID0gKG86IFQpID0+IFZlYzI7XG5leHBvcnQgdHlwZSBRdWFkTWFwVW5pdFBvc2l0aW9uU2V0dGVyRnVuYzxUPiA9IChvOiBULCBwb3NpdGlvbjogVmVjMikgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiA9IChcbiAgYWNjOiBBLFxuICBwcmV2aW91czoge3ZlYzogVmVjMiwgdW5pdDogVH0sXG4gIGluZGV4OiBudW1iZXIsXG4pID0+IEEgfCB1bmRlZmluZWQ7XG5leHBvcnQgY2xhc3MgUXVhZFRyZWVQb3NpdGlvbk91dE9mQm91bmRzRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICB9XG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWVTZXQ8VD4gZXh0ZW5kcyBSZWFkb25seVNldDxUPiB7XG4gIHJlYWRvbmx5IGJvdW5kczogQUFCQjtcbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogU2V0SXRlcmF0b3I8VD47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeU1hcDxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVNldDxUPiBpbXBsZW1lbnRzIFNldDxUPiwgUmVhZG9ubHlRdWFkVHJlZVNldDxUPiB7XG4gIHN0YXRpYyBVbmlxdWVVbml0QXRWZWNLZXlGdW5jID0gUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jO1xuICBwcml2YXRlIHF1YXJkVHJlZTogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPjtcbiAgY29uc3RydWN0b3IoYm91bmRzOiBBQUJCLCBvcHRpb25zOiBQYXJ0aWFsPFF1YWRUcmVlT3B0aW9uczxUPj4gJiB7XG4gICAgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPixcbiAgfSkge1xuICAgIHRoaXMucXVhcmRUcmVlID0gbmV3IFF1YWRUcmVlKGJvdW5kcywgb3B0aW9ucyk7XG4gICAgdGhpcy51bml0UG9zaXRpb25HZXR0ZXIgPSBvcHRpb25zLnVuaXRQb3NpdGlvbkdldHRlcjtcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuc2l6ZTtcbiAgfVxuICBnZXQgYm91bmRzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5ib3VuZHM7XG4gIH1cbiAgYWRkKHQ6IFQpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpO1xuICAgIGlmICghdGhpcy5xdWFyZFRyZWUuYWRkKHBvc2l0aW9uLCB0KSkge1xuICAgICAgdGhyb3cgbmV3IFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yKFxuICAgICAgICAgIGBwb3NpdGlvbiAke0pTT04uc3RyaW5naWZ5KHBvc2l0aW9uKX0gaXMgb3V0IG9mIGJvdW5kczpgICtcbiAgICAgICAgICBgICR7SlNPTi5zdHJpbmdpZnkodGhpcy5xdWFyZFRyZWUuYm91bmRzKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgbW92ZSh0OiBULCB0bzogVmVjMikge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5tb3ZlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0bywgdCk7XG4gIH1cbiAgZGVsZXRlKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuZGVsZXRlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBoYXModDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5oYXModGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMucXVhcmRUcmVlLmNsZWFyKCk7XG4gIH1cbiAgZm9yRWFjaChcbiAgICAgIGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgdmFsdWUyOiBULCBzZXQ6IFNldDxUPikgPT4gdm9pZCxcbiAgICAgIHRoaXNBcmc/OiBhbnksXG4gICk6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgKF8sIHApID0+IHZvaWQoY2FsbGJhY2tmbihwLnVuaXQhLCBwLnVuaXQhLCB0aGlzQXJnKSksXG4gICAgICAgIHZvaWQoMCksXG4gICAgKTtcbiAgfVxuICBlbnRyaWVzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8W1QsIFRdPihcbiAgICAgICAgKHApID0+IFtwLnVuaXQhLCBwLnVuaXQhXSkgYXMgYW55O1xuICB9XG4gIGtleXMoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgdmFsdWVzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8VD4oXG4gICAgICAgIChwKSA9PiBwLnVuaXQhKSBhcyBhbnk7XG4gIH1cbiAgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpIGFzXG4gICAgICBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT47XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyBhcyBTaGFwZSxcbiAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgYW55LFxuICAgICAgICBpbml0aWFsVmFsdWUpO1xuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5QXJyYXkoc2hhcGUpIGFzIGFueTtcbiAgfVxuXG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkKSxcbiAgICAgIGZvcmVhY2hGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApIHtcbiAgICB0aGlzLnF1YXJkVHJlZS5xdWVyeUZvckVhY2goc2hhcGVPckZvcmVhY2hGdW5jIGFzIGFueSwgZm9yZWFjaEZ1bmMgYXMgYW55KTtcbiAgfVxuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEpLFxuICAgICAgbWFwRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeU1hcChzaGFwZU9yTWFwRnVuYyBhcyBTaGFwZSwgbWFwRnVuYyBhcyBhbnkpO1xuICB9XG4gIHF1ZXJ5U2l6ZShcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlTaXplKHNoYXBlKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbIkNvbGxlY3Rpb24iLCJBQUJCIiwiU2hhcGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBR2lCQSxnQ0F1SmhCO0lBdkpELENBQUEsVUFBaUIsVUFBVSxFQUFBO1FBQ3pCLFNBQWdCLE9BQU8sQ0FBSSxDQUFnQixFQUFBO0lBQ3pDLFFBQUEsSUFBSSxDQUFDLFlBQVksS0FBSyxFQUFFO0lBQ3RCLFlBQUEsT0FBTyxDQUFDLENBQUM7YUFDVjtZQUNELE1BQU0s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QUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDakM7UUFDTyxNQUFNLEdBQUE7SUFDWixRQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ3BCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVsQyxRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO2dCQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7YUFBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN2RCxRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO2dCQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7YUFBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN2RCxRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO2dCQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7YUFBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN2RCxRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO2dCQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7YUFBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQzs7SUFHdkQsUUFBQSxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7SUFDMUIsWUFBQSxNQUFNLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7b0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7b0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FB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
