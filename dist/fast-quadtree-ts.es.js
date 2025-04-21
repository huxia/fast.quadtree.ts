
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.1.2
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
        this.options = {
            unitKeyGetter: (options === null || options === void 0 ? void 0 : options.unitKeyGetter) || QuadTree.UniqueUnitAtPositionKeyFunc,
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
        if (shape && !Shape.possiblelyOverlapsAABB(shape, this.bounds))
            return [];
        if (!this.divided) {
            return Collection.objectValuesToIterable(this.units, shape ? (v) => Shape.overlapsVec(shape, v.vec) : undefined, mapFunc, index);
        }
        if (mapFunc) {
            return Collection.toIterableWithMap(mapFunc, index, this.northWest._queryIteratable(shape, undefined, index), this.northEast._queryIteratable(shape, undefined, index), this.southWest._queryIteratable(shape, undefined, index), this.southEast._queryIteratable(shape, undefined, index));
        }
        return Collection.toIterable(this.northWest._queryIteratable(shape, undefined, index), this.northEast._queryIteratable(shape, undefined, index), this.southWest._queryIteratable(shape, undefined, index), this.southEast._queryIteratable(shape, undefined, index));
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

export { AABB, Collection, QuadTree, QuadTreeSet, Shape };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5lcy5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbGxlY3Rpb24udHMiLCIuLi8uLi9zcmMvc2hhcGUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWUudHMiLCIuLi8uLi9zcmMvUXVhZFRyZWVTZXQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgdHlwZSBDb2xsZWN0aW9uPFQ+ID0gSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCB0eXBlIEl0ZXJhYmxlPFQ+ID0gSXRlcmFibGVJdGVyYXRvcjxUPiB8IEFycmF5PFQ+O1xuZXhwb3J0IG5hbWVzcGFjZSBDb2xsZWN0aW9uIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIHRvQXJyYXk8VD4oYzogQ29sbGVjdGlvbjxUPikge1xuICAgIGlmIChjIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIHJldHVybiBjO1xuICAgIH1cbiAgICBjb25zdCByOiBUW10gPSBbXTtcbiAgICBpZiAoKGMgYXMgR2VuZXJhdG9yPFQ+KVtTeW1ib2wuaXRlcmF0b3JdKSB7XG4gICAgICBmb3IgKGNvbnN0IGkgb2YgKGMgYXMgR2VuZXJhdG9yPFQ+KSkge1xuICAgICAgICByLnB1c2goaSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgbGV0IGkgPSBjLm5leHQoKTtcbiAgICB3aGlsZSAoIWkuZG9uZSkge1xuICAgICAgci5wdXNoKGkudmFsdWUpO1xuICAgICAgaSA9IGMubmV4dCgpO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGU8VD4oXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKHVuZGVmaW5lZCB8ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KSB8IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jT3JDb2xsZWN0aW9uIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmNPckNvbGxlY3Rpb24pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuY09yQ29sbGVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgIGZ1bmNPckNvbGxlY3Rpb24oKSA6IGZ1bmNPckNvbGxlY3Rpb247XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aEZpbHRlcjxUPihcbiAgICAgIGZpbHRlckZ1bmM6ICgobzogVCwgaWR4OiBudW1iZXIpID0+IGJvb2xlYW4pLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgICAgIC4uLmNoaWxkSXRlcmF0b3JzOiAodW5kZWZpbmVkIHwgQ29sbGVjdGlvbjxUPiB8XG4gICAgICAgICgoKSA9PiBDb2xsZWN0aW9uPFQ+KSB8IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgaWYgKCFmaWx0ZXJGdW5jKSB7XG4gICAgICBmb3IgKGNvbnN0IGZ1bmNPckNvbGxlY3Rpb24gb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgICAgaWYgKCFmdW5jT3JDb2xsZWN0aW9uKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuY09yQ29sbGVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgZnVuY09yQ29sbGVjdGlvbigpIDogZnVuY09yQ29sbGVjdGlvbjtcbiAgICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgICAgeWllbGQgcmVzdWx0O1xuICAgICAgICAgICAgaW5kZXguaW5kZXgrKztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgICBpbmRleC5pbmRleCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IGZ1bmMgb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJyA/IGZ1bmMoKSA6IGZ1bmM7XG4gICAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJGdW5jKHJlc3VsdCwgaW5kZXguaW5kZXgrKykpIHtcbiAgICAgICAgICAgICAgeWllbGQgcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJGdW5jKHJlc3VsdC52YWx1ZSwgaW5kZXguaW5kZXgrKykpIHtcbiAgICAgICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGVXaXRoTWFwPFQsIEE+KFxuICAgICAgbWFwRnVuYzogKChvOiBULCBpZHg6IG51bWJlcikgPT4gQSksXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICh1bmRlZmluZWQgfCBDb2xsZWN0aW9uPFQ+XG4gICAgICAgIHwgKCgpID0+IENvbGxlY3Rpb248VD4pIHwgQ29sbGVjdGlvbjxUPilbXVxuICApIHtcbiAgICBmb3IgKGNvbnN0IGZ1bmNPckNvbGxlY3Rpb24gb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgIGlmICghZnVuY09yQ29sbGVjdGlvbikgY29udGludWU7XG4gICAgICBjb25zdCBpdGVyYXRvciA9IHR5cGVvZiBmdW5jT3JDb2xsZWN0aW9uID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgZnVuY09yQ29sbGVjdGlvbigpIDogZnVuY09yQ29sbGVjdGlvbjtcbiAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGl0ZXJhdG9yKSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhyZXN1bHQsIGluZGV4LmluZGV4KyspO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhyZXN1bHQudmFsdWUsIGluZGV4LmluZGV4KyspO1xuICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIG9iamVjdFZhbHVlc1RvSXRlcmFibGU8VCwgQT4oXG4gICAgICBvYmplY3Q6IFJlY29yZDxzdHJpbmcsIFQ+LFxuICAgICAgZmlsdGVyRnVuYzogdW5kZWZpbmVkIHwgKChvOiBULCBpZHg6IG51bWJlcikgPT4gYm9vbGVhbiksXG4gICAgICBtYXBGdW5jOiB1bmRlZmluZWQgfCAoKG86IFQsIGlkeDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIGluZGV4OiB7aW5kZXg6IG51bWJlcn0sXG4gICkge1xuICAgIGlmIChmaWx0ZXJGdW5jKSB7XG4gICAgICBpZiAobWFwRnVuYykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgICAgICAgaWYgKCFmaWx0ZXJGdW5jKHZhbHVlLCBpbmRleC5pbmRleCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB5aWVsZCBtYXBGdW5jKHZhbHVlLCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgICAgICAgIGlmICghZmlsdGVyRnVuYyh2YWx1ZSwgaW5kZXguaW5kZXgpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgeWllbGQgdmFsdWU7XG4gICAgICAgICAgaW5kZXguaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAobWFwRnVuYykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMob2JqZWN0W2tleV0sIGluZGV4LmluZGV4KyspO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIHlpZWxkIG9iamVjdFtrZXldO1xuICAgICAgICAgIGluZGV4LmluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImV4cG9ydCBpbnRlcmZhY2UgVmVjMiB7XG4gIHg6IG51bWJlcjtcbiAgeTogbnVtYmVyO1xufVxuZXhwb3J0IGludGVyZmFjZSBBQUJCIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBWZWMyO1xufVxuZXhwb3J0IG5hbWVzcGFjZSBBQUJCIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKGFhYmI6IEFBQkIsIHZlYzogVmVjMik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhYWJiLmNlbnRlci54IC0gYWFiYi5zaXplLnggPD0gdmVjLnggJiZcbiAgICAgIHZlYy54IDw9IGFhYmIuY2VudGVyLnggKyBhYWJiLnNpemUueCAmJlxuICAgICAgYWFiYi5jZW50ZXIueSAtIGFhYmIuc2l6ZS55IDw9IHZlYy55ICYmXG4gICAgICB2ZWMueSA8PSBhYWJiLmNlbnRlci55ICsgYWFiYi5zaXplLnk7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzQUFCQihvbmU6IEFBQkIsIGFub3RoZXI6IEFBQkIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIShcbiAgICAgIGFub3RoZXIuY2VudGVyLnggLSBhbm90aGVyLnNpemUueCA+IG9uZS5jZW50ZXIueCArIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnggKyBhbm90aGVyLnNpemUueCA8IG9uZS5jZW50ZXIueCAtIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgLSBhbm90aGVyLnNpemUueSA+IG9uZS5jZW50ZXIueSArIG9uZS5zaXplLnkgfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgKyBhbm90aGVyLnNpemUueSA8IG9uZS5jZW50ZXIueSAtIG9uZS5zaXplLnlcbiAgICApO1xuICB9XG59XG50eXBlIFJlY3RhbmdsZVNoYXBlID0ge1xuICB0eXBlOiAncmVjdGFuZ2xlJ1xufSAmIEFBQkI7XG50eXBlIEVsbGlwc2VTaGFwZSA9IHtcbiAgdHlwZTogJ2VsbGlwc2UnXG59ICYgQUFCQjtcbnR5cGUgQ2lyY2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdjaXJjbGUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG50eXBlIFNxdWFyZVNoYXBlID0ge1xuICB0eXBlOiAnc3F1YXJlJ1xufSAmIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBudW1iZXI7XG59O1xuZXhwb3J0IHR5cGUgU2hhcGUgPSBSZWN0YW5nbGVTaGFwZSB8IEVsbGlwc2VTaGFwZSB8IENpcmNsZVNoYXBlIHwgU3F1YXJlU2hhcGU7XG5leHBvcnQgbmFtZXNwYWNlIFNoYXBlIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKHNoYXBlOiBTaGFwZSwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoIChzaGFwZS50eXBlKSB7XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOiByZXR1cm4gQUFCQi5vdmVybGFwc1ZlYyhzaGFwZSwgdmVjKTtcbiAgICAgIGNhc2UgJ3NxdWFyZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHtcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdjaXJjbGUnOiByZXR1cm4gU2hhcGUub3ZlcmxhcHNWZWMoe1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICB9LCB2ZWMpO1xuICAgICAgY2FzZSAnZWxsaXBzZSc6IHtcbiAgICAgICAgY29uc3QgcCA9XG4gICAgICAgICAgTWF0aC5wb3codmVjLnggLSBzaGFwZS5jZW50ZXIueCwgMikgLyBNYXRoLnBvdyhzaGFwZS5zaXplLngsIDIpICtcbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueSAtIHNoYXBlLmNlbnRlci55LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueSwgMik7XG4gICAgICAgIHJldHVybiBwIDw9IDE7XG4gICAgICB9XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gcG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZTogU2hhcGUsIGFhYmI6IEFBQkIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2VsbGlwc2UnOlxuICAgICAgY2FzZSAncmVjdGFuZ2xlJzpcbiAgICAgICAgcmV0dXJuIEFBQkIub3ZlcmxhcHNBQUJCKHNoYXBlLCBhYWJiKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6XG4gICAgICBjYXNlICdzcXVhcmUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoe1xuICAgICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgICAgfSwgYWFiYik7XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVjdGFuZ2xlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnc3F1YXJlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3JlY3RhbmdsZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGxpcHNlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnY2lyY2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2VsbGlwc2UnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHtDb2xsZWN0aW9uLCBJdGVyYWJsZX0gZnJvbSAnLi9jb2xsZWN0aW9uJztcbmltcG9ydCB7VmVjMiwgQUFCQiwgU2hhcGV9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+ID0gKFxuICB2ZWM6IFZlYzIsIHVuaXQ6IFQsIHF1YWRUcmVlOiBRdWFkVHJlZTxUPlxuKSA9PiBzdHJpbmcgfCBudW1iZXI7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gICAgYWNjOiBBLFxuICAgIHByZXZpb3VzOiB7dmVjOiBWZWMyLCB1bml0PzogVH0sXG4gICAgaW5kZXg6IG51bWJlcixcbikgPT4gQSB8IHVuZGVmaW5lZDtcbmV4cG9ydCBpbnRlcmZhY2UgUXVhZFRyZWVPcHRpb25zPFQ+IHtcbiAgdW5pdEtleUdldHRlcjogUXVhZFRyZWVVbml0S2V5RnVuYzxUPixcbn1cbmV4cG9ydCBpbnRlcmZhY2UgUmVhZG9ubHlRdWFkVHJlZTxUPiB7XG4gIHJlYWRvbmx5IGJvdW5kczogQUFCQjtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyXG4gIGhhcyh2ZWM6IFZlYzIsIHVuaXQ/OiBUKTogYm9vbGVhbjtcbiAgcXVlcnlJdGVyYXRhYmxlPEE+KFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSkgPT4gQSxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+O1xuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcblxuICBxdWVyeU1hcDxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeVNpemUoXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICk6IG51bWJlcjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZTxUPiBpbXBsZW1lbnRzIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICBzdGF0aWMgTWF4RWxlbWVudHMgPSA4O1xuICBzdGF0aWMgTWF4RGVwdGggPSA4O1xuICBzdGF0aWMgVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jID0gKFxuICAgICAgdmVjOiBWZWMyLFxuICAgICAgXzogYW55LFxuICAgICAgcXVhZFRyZWU6IFF1YWRUcmVlPGFueT4sXG4gICkgPT4gYCR7dmVjLnh9LCR7dmVjLnl9YDtcblxuICBib3VuZHM6IEFBQkI7XG5cbiAgcHJpdmF0ZSBkZXB0aDogbnVtYmVyO1xuXG4gIHByaXZhdGUgZGl2aWRlZDogYm9vbGVhbjtcblxuICBwcml2YXRlIHVuaXRzOiB7W2tleTogc3RyaW5nIHwgbnVtYmVyXToge3VuaXQ6IFQsIHZlYzogVmVjMn19O1xuXG5cbiAgcHJpdmF0ZSBub3J0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBub3J0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBfc2l6ZTogbnVtYmVyO1xuXG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLl9zaXplO1xuICB9XG5cbiAgcmVhZG9ubHkgb3B0aW9uczogUXVhZFRyZWVPcHRpb25zPFQ+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgYm91bmRzOiBBQUJCLFxuICAgICAgb3B0aW9ucz86IFBhcnRpYWw8UXVhZFRyZWVPcHRpb25zPFQ+PixcbiAgICAgIGRlcHRoOiBudW1iZXIgPSAwLFxuICApIHtcbiAgICB0aGlzLmJvdW5kcyA9IGJvdW5kcztcbiAgICB0aGlzLmRlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5kaXZpZGVkID0gZmFsc2U7XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICAgIHRoaXMuX3NpemUgPSAwO1xuICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgIHVuaXRLZXlHZXR0ZXI6XG4gICAgICAgIG9wdGlvbnM/LnVuaXRLZXlHZXR0ZXIgfHwgUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jLFxuICAgIH07XG4gIH1cbiAgX2FkZCh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBmYWxzZSB8ICdhZGRlZCcgfCAnZXhpc3RpbmcnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5kZXB0aCA9PSBRdWFkVHJlZS5NYXhEZXB0aCB8fFxuICAgICAgIXRoaXMuZGl2aWRlZCAmJiB0aGlzLnNpemUgPCBRdWFkVHJlZS5NYXhFbGVtZW50cykge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIGxldCByZXN1bHQ6ICdleGlzdGluZycgfCAnYWRkZWQnID0gJ2V4aXN0aW5nJztcbiAgICAgIGlmICghdGhpcy51bml0c1trZXldKSB7XG4gICAgICAgIHRoaXMuX3NpemUgKys7XG4gICAgICAgIHJlc3VsdCA9ICdhZGRlZCc7XG4gICAgICB9XG4gICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjLCB1bml0fTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB0aGlzLmRpdmlkZSgpO1xuICAgIGNvbnN0IGluc2VydGVkID0gdGhpcy5ub3J0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpO1xuICAgIGlmIChpbnNlcnRlZCA9PT0gJ2FkZGVkJykgdGhpcy5fc2l6ZSArKztcbiAgICByZXR1cm4gaW5zZXJ0ZWQ7XG4gIH1cbiAgYWRkKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuX2FkZCh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgX21vdmUoXG4gICAgICBmcm9tOiBWZWMyLFxuICAgICAgdG86IFZlYzIgfCB1bmRlZmluZWQsXG4gICAgICB1bml0OiBULFxuICApOiBmYWxzZSB8ICdyZW1vdmVkJyB8ICdtb3ZlZCcge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgZnJvbSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIoZnJvbSwgdW5pdCwgdGhpcyk7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodG8gJiYgQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdG8pKSB7XG4gICAgICAgIC8vIHVwZGF0ZSBpbi1wbGFjZVxuICAgICAgICBjb25zdCBuZXdLZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih0bywgdW5pdCwgdGhpcyk7XG4gICAgICAgIGlmIChuZXdLZXkgIT09IGtleSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICAgICAgdGhpcy51bml0c1tuZXdLZXldID0ge3ZlYzogdG8sIHVuaXR9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudW5pdHNba2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ21vdmVkJztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICB0aGlzLl9zaXplIC0tO1xuICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ub3J0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5ub3J0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpO1xuICAgIGlmIChyZXN1bHQgPT09ICdyZW1vdmVkJykge1xuICAgICAgdGhpcy5fc2l6ZSAtLTtcbiAgICAgIGlmICh0bykge1xuICAgICAgICBpZiAodGhpcy5hZGQodG8sIHVuaXQpKSByZXR1cm4gJ21vdmVkJztcbiAgICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBtb3ZlKGZyb206IFZlYzIsIHRvOiBWZWMyLCB1bml0OiBUKTogYm9vbGVhbiB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB0bykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5fbW92ZShmcm9tLCB0bywgdW5pdCkgPT09ICdyZW1vdmVkJykgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRlKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9tb3ZlKHZlYywgdW5kZWZpbmVkLCB1bml0KSA9PT0gJ3JlbW92ZWQnO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLl9zaXplID0gMDtcbiAgICB0aGlzLmRpdmlkZWQgPSBmYWxzZTtcbiAgICB0aGlzLm5vcnRoV2VzdCA9XG4gICAgICB0aGlzLm5vcnRoRWFzdCA9XG4gICAgICB0aGlzLnNvdXRoV2VzdCA9XG4gICAgICB0aGlzLnNvdXRoRWFzdCA9IHVuZGVmaW5lZCE7XG4gIH1cbiAgaGFzKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdmVjKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih2ZWMsIHVuaXQsIHRoaXMpO1xuICAgICAgcmV0dXJuICEhdGhpcy51bml0c1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub3J0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuaGFzKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBkaXZpZGUoKSB7XG4gICAgdGhpcy5kaXZpZGVkID0gdHJ1ZTtcbiAgICBjb25zdCBodyA9IHRoaXMuYm91bmRzLnNpemUueCAvIDI7XG4gICAgY29uc3QgaGggPSB0aGlzLmJvdW5kcy5zaXplLnkgLyAyO1xuXG4gICAgdGhpcy5ub3J0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgLSBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMubm9ydGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLnNvdXRoV2VzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCAtIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSArIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aEVhc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggKyBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgIGZvciAoY29uc3QgayBpbiB0aGlzLnVuaXRzKSB7XG4gICAgICBjb25zdCB7dmVjLCB1bml0fSA9IHRoaXMudW5pdHNba107XG4gICAgICB0aGlzLm5vcnRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5hZGQodmVjLCB1bml0KTtcbiAgICB9XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICB9XG4gIHByaXZhdGUgX3F1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIG1hcEZ1bmM6ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpZHg6IG51bWJlcikgPT4gQSkgfCB1bmRlZmluZWQsXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApOiBJdGVyYWJsZTxBPiB7XG4gICAgaWYgKHNoYXBlICYmICFTaGFwZS5wb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlLCB0aGlzLmJvdW5kcykpIHJldHVybiBbXTtcblxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICByZXR1cm4gQ29sbGVjdGlvbi5vYmplY3RWYWx1ZXNUb0l0ZXJhYmxlKFxuICAgICAgICAgIHRoaXMudW5pdHMsXG4gICAgICAgICAgc2hhcGUgPyAodikgPT4gU2hhcGUub3ZlcmxhcHNWZWMoc2hhcGUsIHYudmVjKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBtYXBGdW5jLFxuICAgICAgICAgIGluZGV4LFxuICAgICAgKSBhcyBJdGVyYWJsZTxBPjtcbiAgICB9XG4gICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgIHJldHVybiBDb2xsZWN0aW9uLnRvSXRlcmFibGVXaXRoTWFwKFxuICAgICAgICAgIG1hcEZ1bmMsXG4gICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgdGhpcy5ub3J0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgdGhpcy5zb3V0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgdGhpcy5zb3V0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gQ29sbGVjdGlvbi50b0l0ZXJhYmxlKFxuICAgICAgICB0aGlzLm5vcnRoV2VzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICAgdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgIHRoaXMuc291dGhXZXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICB0aGlzLnNvdXRoRWFzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICApO1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGlkeDogbnVtYmVyKSA9PiBBLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmNPclNoYXBlPzogKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGlkeDogbnVtYmVyKSA9PiBBKSB8IFNoYXBlLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT4ge1xuICAgIGlmICh0eXBlb2YgbWFwRnVuY09yU2hhcGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIG1hcEZ1bmNPclNoYXBlLCB7aW5kZXg6IDB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5SXRlcmF0YWJsZShcbiAgICAgICAgbWFwRnVuY09yU2hhcGUgYXMgU2hhcGUsXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgX3F1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU6IEEgfCB1bmRlZmluZWQsXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApOiBBIHtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkge1xuICAgICAgcmV0dXJuIGluaXRpYWxWYWx1ZSE7XG4gICAgfVxuICAgIGxldCB2YWx1ZTogQSA9IGluaXRpYWxWYWx1ZSE7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGlmIChzaGFwZSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3QgayBpbiB0aGlzLnVuaXRzKSB7XG4gICAgICAgICAgY29uc3QgdW5pdCA9IHRoaXMudW5pdHNba107XG4gICAgICAgICAgaWYgKFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlLCB1bml0LnZlYykpIHtcbiAgICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2tGdW5jKHZhbHVlLCB1bml0LCBpbmRleC5pbmRleCsrKSE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3QgayBpbiB0aGlzLnVuaXRzKSB7XG4gICAgICAgICAgY29uc3QgdW5pdCA9IHRoaXMudW5pdHNba107XG4gICAgICAgICAgdmFsdWUgPSBjYWxsYmFja0Z1bmModmFsdWUsIHVuaXQsIGluZGV4LmluZGV4KyspITtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhXZXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHZhbHVlID0gdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlLCBpbmRleCk7XG4gICAgdmFsdWUgPSB0aGlzLnNvdXRoV2VzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUsIGluZGV4KTtcbiAgICB2YWx1ZSA9IHRoaXMuc291dGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmM6IFNoYXBlIHwgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWU6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiB8IEEsXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQSB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yQ2FsbGJhY2tGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2UoXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgQSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgICAgIGluaXRpYWxWYWx1ZSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4+KFxuICAgICAgICBzaGFwZSxcbiAgICAgICAgKGFyciwgdikgPT4ge1xuICAgICAgICAgIGFyci5wdXNoKHYpO1xuICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgIH0sXG4gICAgICAgIFtdLFxuICAgICAgICB7aW5kZXg6IDB9LFxuICAgICk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckZvcmVhY2hGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBzaGFwZU9yRm9yZWFjaEZ1bmModiwgaW5kZXgpLFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFmb3JlYWNoRnVuYykgcmV0dXJuO1xuICAgICAgdGhpcy5fcXVlcnlSZWR1Y2U8dm9pZD4oXG4gICAgICAgICAgc2hhcGVPckZvcmVhY2hGdW5jLFxuICAgICAgICAgIChfLCB2LCBpbmRleCkgPT4gZm9yZWFjaEZ1bmModiwgaW5kZXgpLFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yTWFwRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2goc2hhcGVPck1hcEZ1bmModiwgaW5kZXgpKTtcbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBbXSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHNoYXBlT3JNYXBGdW5jLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChtYXBGdW5jKHYsIGluZGV4KSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10sXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHF1ZXJ5U2l6ZShcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8bnVtYmVyPihcbiAgICAgICAgc2hhcGUsXG4gICAgICAgIChzaXplKSA9PiBzaXplICsgMSxcbiAgICAgICAgMCxcbiAgICAgICAge2luZGV4OiAwfSxcbiAgICApO1xuICB9XG4gIF9kdW1wVG9TdHJpbmcocmVzdWx0OiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHByZWZpeCA9ICcgICAgICAgICAgICAnLnN1YnN0cmluZygwLCB0aGlzLmRlcHRoKTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgcmVzdWx0LnB1c2gocHJlZml4KTtcbiAgICAgIHJlc3VsdC5wdXNoKEpTT04uc3RyaW5naWZ5KHRoaXMudW5pdHMpKTtcbiAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgW1xuICAgICAge3N0cjogJ05XJywgcXQ6IHRoaXMubm9ydGhXZXN0fSxcbiAgICAgIHtzdHI6ICdORScsIHF0OiB0aGlzLm5vcnRoRWFzdH0sXG4gICAgICB7c3RyOiAnU1cnLCBxdDogdGhpcy5zb3V0aFdlc3R9LFxuICAgICAge3N0cjogJ1NFJywgcXQ6IHRoaXMuc291dGhFYXN0fSxcbiAgICBdKSB7XG4gICAgICByZXN1bHQucHVzaChwcmVmaXgpO1xuICAgICAgcmVzdWx0LnB1c2goY2hpbGQuc3RyKTtcbiAgICAgIHJlc3VsdC5wdXNoKGAgKCR7Y2hpbGQucXQuc2l6ZX0pOlxcbmApO1xuICAgICAgY2hpbGQucXQuX2R1bXBUb1N0cmluZyhyZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2R1bXBUb1N0cmluZyhbXSkuam9pbignJyk7XG4gIH1cbn1cbiIsImltcG9ydCB7XG4gIFF1YWRUcmVlLFxuICBRdWFkVHJlZU9wdGlvbnMsXG59IGZyb20gJy4vUXVhZFRyZWUnO1xuaW1wb3J0IHtBQUJCLCBTaGFwZSwgVmVjMn0gZnJvbSAnLi9zaGFwZSc7XG5cbmV4cG9ydCB0eXBlIFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+ID0gKG86IFQpID0+IFZlYzI7XG5leHBvcnQgdHlwZSBRdWFkTWFwVW5pdFBvc2l0aW9uU2V0dGVyRnVuYzxUPiA9IChvOiBULCBwb3NpdGlvbjogVmVjMikgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiA9IChcbiAgYWNjOiBBLFxuICBwcmV2aW91czoge3ZlYzogVmVjMiwgdW5pdDogVH0sXG4gIGluZGV4OiBudW1iZXIsXG4pID0+IEEgfCB1bmRlZmluZWQ7XG5leHBvcnQgY2xhc3MgUXVhZFRyZWVQb3NpdGlvbk91dE9mQm91bmRzRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICB9XG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWVTZXQ8VD4gZXh0ZW5kcyBSZWFkb25seVNldDxUPiB7XG4gIHJlYWRvbmx5IGJvdW5kczogQUFCQjtcbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogU2V0SXRlcmF0b3I8VD47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeU1hcDxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVNldDxUPiBpbXBsZW1lbnRzIFNldDxUPiwgUmVhZG9ubHlRdWFkVHJlZVNldDxUPiB7XG4gIHN0YXRpYyBVbmlxdWVVbml0QXRWZWNLZXlGdW5jID0gUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jO1xuICBwcml2YXRlIHF1YXJkVHJlZTogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPjtcbiAgY29uc3RydWN0b3IoYm91bmRzOiBBQUJCLCBvcHRpb25zOiBQYXJ0aWFsPFF1YWRUcmVlT3B0aW9uczxUPj4gJiB7XG4gICAgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPixcbiAgfSkge1xuICAgIHRoaXMucXVhcmRUcmVlID0gbmV3IFF1YWRUcmVlKGJvdW5kcywgb3B0aW9ucyk7XG4gICAgdGhpcy51bml0UG9zaXRpb25HZXR0ZXIgPSBvcHRpb25zLnVuaXRQb3NpdGlvbkdldHRlcjtcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuc2l6ZTtcbiAgfVxuICBnZXQgYm91bmRzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5ib3VuZHM7XG4gIH1cbiAgYWRkKHQ6IFQpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpO1xuICAgIGlmICghdGhpcy5xdWFyZFRyZWUuYWRkKHBvc2l0aW9uLCB0KSkge1xuICAgICAgdGhyb3cgbmV3IFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yKFxuICAgICAgICAgIGBwb3NpdGlvbiAke0pTT04uc3RyaW5naWZ5KHBvc2l0aW9uKX0gaXMgb3V0IG9mIGJvdW5kczpgICtcbiAgICAgICAgICBgICR7SlNPTi5zdHJpbmdpZnkodGhpcy5xdWFyZFRyZWUuYm91bmRzKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgbW92ZSh0OiBULCB0bzogVmVjMikge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5tb3ZlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0bywgdCk7XG4gIH1cbiAgZGVsZXRlKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuZGVsZXRlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBoYXModDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5oYXModGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMucXVhcmRUcmVlLmNsZWFyKCk7XG4gIH1cbiAgZm9yRWFjaChcbiAgICAgIGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgdmFsdWUyOiBULCBzZXQ6IFNldDxUPikgPT4gdm9pZCxcbiAgICAgIHRoaXNBcmc/OiBhbnksXG4gICk6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgKF8sIHApID0+IHZvaWQoY2FsbGJhY2tmbihwLnVuaXQhLCBwLnVuaXQhLCB0aGlzQXJnKSksXG4gICAgICAgIHZvaWQoMCksXG4gICAgKTtcbiAgfVxuICBlbnRyaWVzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8W1QsIFRdPihcbiAgICAgICAgKHApID0+IFtwLnVuaXQhLCBwLnVuaXQhXSkgYXMgYW55O1xuICB9XG4gIGtleXMoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgdmFsdWVzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8VD4oXG4gICAgICAgIChwKSA9PiBwLnVuaXQhKSBhcyBhbnk7XG4gIH1cbiAgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpIGFzXG4gICAgICBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT47XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyBhcyBTaGFwZSxcbiAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgYW55LFxuICAgICAgICBpbml0aWFsVmFsdWUpO1xuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5QXJyYXkoc2hhcGUpIGFzIGFueTtcbiAgfVxuXG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkKSxcbiAgICAgIGZvcmVhY2hGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApIHtcbiAgICB0aGlzLnF1YXJkVHJlZS5xdWVyeUZvckVhY2goc2hhcGVPckZvcmVhY2hGdW5jIGFzIGFueSwgZm9yZWFjaEZ1bmMgYXMgYW55KTtcbiAgfVxuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEpLFxuICAgICAgbWFwRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeU1hcChzaGFwZU9yTWFwRnVuYyBhcyBTaGFwZSwgbWFwRnVuYyBhcyBhbnkpO1xuICB9XG4gIHF1ZXJ5U2l6ZShcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlTaXplKHNoYXBlKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBR00sSUFBVyxXQXVKaEI7QUF2SkQsQ0FBQSxVQUFpQixVQUFVLEVBQUE7SUFDekIsU0FBZ0IsT0FBTyxDQUFJLENBQWdCLEVBQUE7QUFDekMsUUFBQSxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUU7QUFDdEIsWUFBQSxPQUFPLENBQUMsQ0FBQztTQUNWO1FBQ0QsTUFBTSxDQUFDLEdBQVEsRUFBRSxDQUFDO0FBQ2xC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LENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7WUFDcEUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFDO1NBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdkQsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksUUFBUSxDQUFDO1lBQzVCLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO1lBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQztTQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDOztBQUd2RCxRQUFBLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtBQUMxQixZQUFBLE1BQU0sRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDL0I7QUFDRCxRQUFB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
