
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.1.2
   * Released under the MIT license.
   */

(function () {
    'use strict';

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

    const cancasAll = window.document.getElementById('all');
    const ctxAll = cancasAll.getContext('2d');
    const cancasQueryResult = window.document.getElementById('queryResult');
    const ctxQueryResult = cancasQueryResult.getContext('2d');
    class Unit {
        get position() {
            return this._position;
        }
        set position(v) {
            if (qtSet.move(this, v)) {
                this._position = v;
            }
            else {
                throw new Error(`failed to move ${this.id} to ${JSON.stringify(v)}, ` +
                    `stays at: ${JSON.stringify(this._position)}`);
            }
        }
        constructor(id, position) {
            this.id = id;
            this._position = position;
            qtSet.add(this);
        }
    }
    const qtSet = new QuadTreeSet({
        size: { x: cancasAll.width / 2, y: cancasAll.height / 2 },
        center: { x: cancasAll.width / 2, y: cancasAll.height / 2 },
    }, {
        unitKeyGetter: (_, unit) => unit.id,
        unitPositionGetter: (u) => u.position,
    });
    let currentId = 0;
    function generateId() {
        if (currentId == Number.MAX_SAFE_INTEGER) {
            currentId = 0;
            qtSet.clear();
        }
        return ++currentId;
    }
    function randomPosition() {
        return {
            x: Math.floor(Math.random() * cancasAll.width),
            y: Math.floor(Math.random() * cancasAll.height),
        };
    }
    const totalUnit = 500000;
    const unitToMoveEachFrame = Math.floor(totalUnit * 0.005);
    const unitToAddEachFrame = Math.floor(totalUnit * 0.005);
    const units = [];
    let lastEmptyIndex = -1;
    function recordUnit(u) {
        if (units.length > 1.5 * totalUnit) {
            if (lastEmptyIndex > -1 && units[lastEmptyIndex] === undefined) {
                units[lastEmptyIndex] = u;
                lastEmptyIndex = -1;
            }
            else {
                units[units.findIndex((uu) => uu === undefined)] = u;
            }
        }
        else {
            units.push(u);
        }
        return u;
    }
    function takeAUnit() {
        while (true) {
            const index = Math.floor(Math.random() * units.length);
            const unit = units[index];
            if (unit !== undefined) {
                units[index] = undefined;
                lastEmptyIndex = index;
                return unit;
            }
        }
    }
    function moveRandomDirection(v) {
        while (true) {
            const vec = {
                x: v.x + Math.floor(Math.random() * 4) - 2,
                y: v.y + Math.floor(Math.random() * 4) - 2,
            };
            if (AABB.overlapsVec(qtSet.bounds, vec))
                return vec;
        }
    }
    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top,
        };
    }
    let mousePos = { x: 0, y: 0 };
    cancasAll.onmousemove = function (evt) {
        mousePos = getMousePos(cancasAll, evt);
    };
    cancasQueryResult.onmousemove = function (evt) {
        mousePos = getMousePos(cancasQueryResult, evt);
    };
    let previousTimeStamp;
    function animate(timestamp) {
        ctxAll.clearRect(0, 0, cancasAll.width, cancasAll.height);
        ctxAll.save();
        ctxAll.fillStyle = 'red';
        while (qtSet.size < totalUnit) {
            console.log(qtSet.size);
            recordUnit(new Unit(generateId(), randomPosition()));
        }
        for (let i = 0; i < unitToMoveEachFrame; i++) {
            const unit = takeAUnit();
            unit.position = moveRandomDirection(unit.position);
            recordUnit(unit);
        }
        for (let i = 0; i < unitToAddEachFrame; i++) {
            const unit = takeAUnit();
            if (!qtSet.delete(unit)) {
                throw new Error(`delete failed: ` +
                    `${unit.id} ${JSON.stringify(unit.position)}`);
            }
            recordUnit(new Unit(generateId(), randomPosition()));
        }
        // qtSet.queryForEach((v) => ctxAll.fillRect(v.vec.x, v.vec.y, 1, 1));
        if (previousTimeStamp) {
            ctxAll.fillStyle = 'blue';
            ctxAll.font = '15px Arial';
            ctxAll.fillText(`${Math.round(1000 / (timestamp - previousTimeStamp))} fps`, 10, 50);
        }
        ctxAll.restore();
        ctxQueryResult.clearRect(0, 0, cancasQueryResult.width, cancasQueryResult.height);
        ctxQueryResult.save();
        ctxQueryResult.fillStyle = 'green';
        let queryCount = 0;
        qtSet.queryForEach(Shape.createEllipse(mousePos, { x: 12, y: 8 }), ({ vec }) => {
            ctxQueryResult.fillRect(vec.x, vec.y, 1, 1);
            queryCount++;
        });
        ctxQueryResult.fillStyle = 'black';
        ctxQueryResult.font = '15px Arial';
        ctxQueryResult.fillText(`${queryCount}/${qtSet.size} queried`, cancasQueryResult.width - 100, 50);
        ctxQueryResult.restore();
        previousTimeStamp = timestamp;
        requestAnimationFrame(animate);
    }
    window.requestAnimationFrame(animate);

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5icm93c2VyLnRlc3QuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb2xsZWN0aW9uLnRzIiwiLi4vLi4vc3JjL3NoYXBlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlU2V0LnRzIiwiLi4vLi4vdGVzdC9icm93c2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbjxUPiA9IEl0ZXJhdG9yPFQ+IHwgQXJyYXk8VD47XG5leHBvcnQgdHlwZSBJdGVyYWJsZTxUPiA9IEl0ZXJhYmxlSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCBuYW1lc3BhY2UgQ29sbGVjdGlvbiB7XG4gIGV4cG9ydCBmdW5jdGlvbiB0b0FycmF5PFQ+KGM6IENvbGxlY3Rpb248VD4pIHtcbiAgICBpZiAoYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgY29uc3QgcjogVFtdID0gW107XG4gICAgaWYgKChjIGFzIEdlbmVyYXRvcjxUPilbU3ltYm9sLml0ZXJhdG9yXSkge1xuICAgICAgZm9yIChjb25zdCBpIG9mIChjIGFzIEdlbmVyYXRvcjxUPikpIHtcbiAgICAgICAgci5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGxldCBpID0gYy5uZXh0KCk7XG4gICAgd2hpbGUgKCFpLmRvbmUpIHtcbiAgICAgIHIucHVzaChpLnZhbHVlKTtcbiAgICAgIGkgPSBjLm5leHQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlPFQ+KFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICh1bmRlZmluZWQgfCAoKCkgPT4gQ29sbGVjdGlvbjxUPikgfCBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuY09yQ29sbGVjdGlvbiBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jT3JDb2xsZWN0aW9uKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gdHlwZW9mIGZ1bmNPckNvbGxlY3Rpb24gPT09ICdmdW5jdGlvbicgP1xuICAgICAgICBmdW5jT3JDb2xsZWN0aW9uKCkgOiBmdW5jT3JDb2xsZWN0aW9uO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiogdG9JdGVyYWJsZVdpdGhGaWx0ZXI8VD4oXG4gICAgICBmaWx0ZXJGdW5jOiAoKG86IFQsIGlkeDogbnVtYmVyKSA9PiBib29sZWFuKSxcbiAgICAgIGluZGV4OiB7aW5kZXg6IG51bWJlcn0sXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKHVuZGVmaW5lZCB8IENvbGxlY3Rpb248VD4gfFxuICAgICAgICAoKCkgPT4gQ29sbGVjdGlvbjxUPikgfCBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGlmICghZmlsdGVyRnVuYykge1xuICAgICAgZm9yIChjb25zdCBmdW5jT3JDb2xsZWN0aW9uIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICAgIGlmICghZnVuY09yQ29sbGVjdGlvbikgY29udGludWU7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0gdHlwZW9mIGZ1bmNPckNvbGxlY3Rpb24gPT09ICdmdW5jdGlvbicgP1xuICAgICAgICAgIGZ1bmNPckNvbGxlY3Rpb24oKSA6IGZ1bmNPckNvbGxlY3Rpb247XG4gICAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgICAgIGluZGV4LmluZGV4Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgICAgaW5kZXguaW5kZXgrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICAgIGlmICghZnVuYykgY29udGludWU7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0gdHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbicgPyBmdW5jKCkgOiBmdW5jO1xuICAgICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGl0ZXJhdG9yKSB7XG4gICAgICAgICAgICBpZiAoZmlsdGVyRnVuYyhyZXN1bHQsIGluZGV4LmluZGV4KyspKSB7XG4gICAgICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICBpZiAoZmlsdGVyRnVuYyhyZXN1bHQudmFsdWUsIGluZGV4LmluZGV4KyspKSB7XG4gICAgICAgICAgICAgIHlpZWxkIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aE1hcDxULCBBPihcbiAgICAgIG1hcEZ1bmM6ICgobzogVCwgaWR4OiBudW1iZXIpID0+IEEpLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgICAgIC4uLmNoaWxkSXRlcmF0b3JzOiAodW5kZWZpbmVkIHwgQ29sbGVjdGlvbjxUPlxuICAgICAgICB8ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KSB8IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jT3JDb2xsZWN0aW9uIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmNPckNvbGxlY3Rpb24pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuY09yQ29sbGVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgIGZ1bmNPckNvbGxlY3Rpb24oKSA6IGZ1bmNPckNvbGxlY3Rpb247XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0LCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0LnZhbHVlLCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiBvYmplY3RWYWx1ZXNUb0l0ZXJhYmxlPFQsIEE+KFxuICAgICAgb2JqZWN0OiBSZWNvcmQ8c3RyaW5nLCBUPixcbiAgICAgIGZpbHRlckZ1bmM6IHVuZGVmaW5lZCB8ICgobzogVCwgaWR4OiBudW1iZXIpID0+IGJvb2xlYW4pLFxuICAgICAgbWFwRnVuYzogdW5kZWZpbmVkIHwgKChvOiBULCBpZHg6IG51bWJlcikgPT4gQSksXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApIHtcbiAgICBpZiAoZmlsdGVyRnVuYykge1xuICAgICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgICAgICAgIGlmICghZmlsdGVyRnVuYyh2YWx1ZSwgaW5kZXguaW5kZXgpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyh2YWx1ZSwgaW5kZXguaW5kZXgrKyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmModmFsdWUsIGluZGV4LmluZGV4KSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHlpZWxkIHZhbHVlO1xuICAgICAgICAgIGluZGV4LmluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICB5aWVsZCBtYXBGdW5jKG9iamVjdFtrZXldLCBpbmRleC5pbmRleCsrKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICB5aWVsZCBvYmplY3Rba2V5XTtcbiAgICAgICAgICBpbmRleC5pbmRleCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCJleHBvcnQgaW50ZXJmYWNlIFZlYzIge1xuICB4OiBudW1iZXI7XG4gIHk6IG51bWJlcjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgQUFCQiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogVmVjMjtcbn1cbmV4cG9ydCBuYW1lc3BhY2UgQUFCQiB7XG4gIGV4cG9ydCBmdW5jdGlvbiBvdmVybGFwc1ZlYyhhYWJiOiBBQUJCLCB2ZWM6IFZlYzIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYWFiYi5jZW50ZXIueCAtIGFhYmIuc2l6ZS54IDw9IHZlYy54ICYmXG4gICAgICB2ZWMueCA8PSBhYWJiLmNlbnRlci54ICsgYWFiYi5zaXplLnggJiZcbiAgICAgIGFhYmIuY2VudGVyLnkgLSBhYWJiLnNpemUueSA8PSB2ZWMueSAmJlxuICAgICAgdmVjLnkgPD0gYWFiYi5jZW50ZXIueSArIGFhYmIuc2l6ZS55O1xuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBvdmVybGFwc0FBQkIob25lOiBBQUJCLCBhbm90aGVyOiBBQUJCKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEoXG4gICAgICBhbm90aGVyLmNlbnRlci54IC0gYW5vdGhlci5zaXplLnggPiBvbmUuY2VudGVyLnggKyBvbmUuc2l6ZS54IHx8XG4gICAgICBhbm90aGVyLmNlbnRlci54ICsgYW5vdGhlci5zaXplLnggPCBvbmUuY2VudGVyLnggLSBvbmUuc2l6ZS54IHx8XG4gICAgICBhbm90aGVyLmNlbnRlci55IC0gYW5vdGhlci5zaXplLnkgPiBvbmUuY2VudGVyLnkgKyBvbmUuc2l6ZS55IHx8XG4gICAgICBhbm90aGVyLmNlbnRlci55ICsgYW5vdGhlci5zaXplLnkgPCBvbmUuY2VudGVyLnkgLSBvbmUuc2l6ZS55XG4gICAgKTtcbiAgfVxufVxudHlwZSBSZWN0YW5nbGVTaGFwZSA9IHtcbiAgdHlwZTogJ3JlY3RhbmdsZSdcbn0gJiBBQUJCO1xudHlwZSBFbGxpcHNlU2hhcGUgPSB7XG4gIHR5cGU6ICdlbGxpcHNlJ1xufSAmIEFBQkI7XG50eXBlIENpcmNsZVNoYXBlID0ge1xuICB0eXBlOiAnY2lyY2xlJ1xufSAmIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBudW1iZXI7XG59O1xudHlwZSBTcXVhcmVTaGFwZSA9IHtcbiAgdHlwZTogJ3NxdWFyZSdcbn0gJiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogbnVtYmVyO1xufTtcbmV4cG9ydCB0eXBlIFNoYXBlID0gUmVjdGFuZ2xlU2hhcGUgfCBFbGxpcHNlU2hhcGUgfCBDaXJjbGVTaGFwZSB8IFNxdWFyZVNoYXBlO1xuZXhwb3J0IG5hbWVzcGFjZSBTaGFwZSB7XG4gIGV4cG9ydCBmdW5jdGlvbiBvdmVybGFwc1ZlYyhzaGFwZTogU2hhcGUsIHZlYzogVmVjMik6IGJvb2xlYW4ge1xuICAgIHN3aXRjaCAoc2hhcGUudHlwZSkge1xuICAgICAgY2FzZSAncmVjdGFuZ2xlJzogcmV0dXJuIEFBQkIub3ZlcmxhcHNWZWMoc2hhcGUsIHZlYyk7XG4gICAgICBjYXNlICdzcXVhcmUnOiByZXR1cm4gQUFCQi5vdmVybGFwc1ZlYyh7XG4gICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICB9LCB2ZWMpO1xuICAgICAgY2FzZSAnY2lyY2xlJzogcmV0dXJuIFNoYXBlLm92ZXJsYXBzVmVjKHtcbiAgICAgICAgdHlwZTogJ2VsbGlwc2UnLFxuICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgfSwgdmVjKTtcbiAgICAgIGNhc2UgJ2VsbGlwc2UnOiB7XG4gICAgICAgIGNvbnN0IHAgPVxuICAgICAgICAgIE1hdGgucG93KHZlYy54IC0gc2hhcGUuY2VudGVyLngsIDIpIC8gTWF0aC5wb3coc2hhcGUuc2l6ZS54LCAyKSArXG4gICAgICAgICAgTWF0aC5wb3codmVjLnkgLSBzaGFwZS5jZW50ZXIueSwgMikgLyBNYXRoLnBvdyhzaGFwZS5zaXplLnksIDIpO1xuICAgICAgICByZXR1cm4gcCA8PSAxO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIHBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGU6IFNoYXBlLCBhYWJiOiBBQUJCKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoIChzaGFwZS50eXBlKSB7XG4gICAgICBjYXNlICdlbGxpcHNlJzpcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6XG4gICAgICAgIHJldHVybiBBQUJCLm92ZXJsYXBzQUFCQihzaGFwZSwgYWFiYik7XG4gICAgICBjYXNlICdjaXJjbGUnOlxuICAgICAgY2FzZSAnc3F1YXJlJzpcbiAgICAgICAgcmV0dXJuIEFBQkIub3ZlcmxhcHNBQUJCKHtcbiAgICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICAgIH0sIGFhYmIpO1xuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlY3RhbmdsZShjZW50ZXI6IFZlYzIsIHNpemU6IFZlYzIgfCBudW1iZXIpOiBTaGFwZSB7XG4gICAgaWYgKHR5cGVvZiBzaXplID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3NxdWFyZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdyZWN0YW5nbGUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlRWxsaXBzZShjZW50ZXI6IFZlYzIsIHNpemU6IFZlYzIgfCBudW1iZXIpOiBTaGFwZSB7XG4gICAgaWYgKHR5cGVvZiBzaXplID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2NpcmNsZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdlbGxpcHNlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7Q29sbGVjdGlvbiwgSXRlcmFibGV9IGZyb20gJy4vY29sbGVjdGlvbic7XG5pbXBvcnQge1ZlYzIsIEFBQkIsIFNoYXBlfSBmcm9tICcuL3NoYXBlJztcblxuZXhwb3J0IHR5cGUgUXVhZFRyZWVVbml0S2V5RnVuYzxUPiA9IChcbiAgdmVjOiBWZWMyLCB1bml0OiBULCBxdWFkVHJlZTogUXVhZFRyZWU8VD5cbikgPT4gc3RyaW5nIHwgbnVtYmVyO1xuZXhwb3J0IHR5cGUgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+ID0gKFxuICAgIGFjYzogQSxcbiAgICBwcmV2aW91czoge3ZlYzogVmVjMiwgdW5pdD86IFR9LFxuICAgIGluZGV4OiBudW1iZXIsXG4pID0+IEEgfCB1bmRlZmluZWQ7XG5leHBvcnQgaW50ZXJmYWNlIFF1YWRUcmVlT3B0aW9uczxUPiB7XG4gIHVuaXRLZXlHZXR0ZXI6IFF1YWRUcmVlVW5pdEtleUZ1bmM8VD4sXG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICByZWFkb25seSBib3VuZHM6IEFBQkI7XG4gIHJlYWRvbmx5IHNpemU6IG51bWJlclxuICBoYXModmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlTaXplKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICApOiBudW1iZXI7XG59XG5leHBvcnQgY2xhc3MgUXVhZFRyZWU8VD4gaW1wbGVtZW50cyBSZWFkb25seVF1YWRUcmVlPFQ+IHtcbiAgc3RhdGljIE1heEVsZW1lbnRzID0gODtcbiAgc3RhdGljIE1heERlcHRoID0gODtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyA9IChcbiAgICAgIHZlYzogVmVjMixcbiAgICAgIF86IGFueSxcbiAgICAgIHF1YWRUcmVlOiBRdWFkVHJlZTxhbnk+LFxuICApID0+IGAke3ZlYy54fSwke3ZlYy55fWA7XG5cbiAgYm91bmRzOiBBQUJCO1xuXG4gIHByaXZhdGUgZGVwdGg6IG51bWJlcjtcblxuICBwcml2YXRlIGRpdmlkZWQ6IGJvb2xlYW47XG5cbiAgcHJpdmF0ZSB1bml0czoge1trZXk6IHN0cmluZyB8IG51bWJlcl06IHt1bml0OiBULCB2ZWM6IFZlYzJ9fTtcblxuXG4gIHByaXZhdGUgbm9ydGhXZXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgbm9ydGhFYXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgc291dGhXZXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgc291dGhFYXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgX3NpemU6IG51bWJlcjtcblxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbiAgfVxuXG4gIHJlYWRvbmx5IG9wdGlvbnM6IFF1YWRUcmVlT3B0aW9uczxUPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIGJvdW5kczogQUFCQixcbiAgICAgIG9wdGlvbnM/OiBQYXJ0aWFsPFF1YWRUcmVlT3B0aW9uczxUPj4sXG4gICAgICBkZXB0aDogbnVtYmVyID0gMCxcbiAgKSB7XG4gICAgdGhpcy5ib3VuZHMgPSBib3VuZHM7XG4gICAgdGhpcy5kZXB0aCA9IGRlcHRoO1xuICAgIHRoaXMuZGl2aWRlZCA9IGZhbHNlO1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLl9zaXplID0gMDtcbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICB1bml0S2V5R2V0dGVyOlxuICAgICAgICBvcHRpb25zPy51bml0S2V5R2V0dGVyIHx8IFF1YWRUcmVlLlVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyxcbiAgICB9O1xuICB9XG4gIF9hZGQodmVjOiBWZWMyLCB1bml0OiBUKTogZmFsc2UgfCAnYWRkZWQnIHwgJ2V4aXN0aW5nJyB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB2ZWMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZGVwdGggPT0gUXVhZFRyZWUuTWF4RGVwdGggfHxcbiAgICAgICF0aGlzLmRpdmlkZWQgJiYgdGhpcy5zaXplIDwgUXVhZFRyZWUuTWF4RWxlbWVudHMpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKHZlYywgdW5pdCwgdGhpcyk7XG4gICAgICBsZXQgcmVzdWx0OiAnZXhpc3RpbmcnIHwgJ2FkZGVkJyA9ICdleGlzdGluZyc7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICB0aGlzLl9zaXplICsrO1xuICAgICAgICByZXN1bHQgPSAnYWRkZWQnO1xuICAgICAgfVxuICAgICAgdGhpcy51bml0c1trZXldID0ge3ZlYywgdW5pdH07XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkgdGhpcy5kaXZpZGUoKTtcbiAgICBjb25zdCBpbnNlcnRlZCA9IHRoaXMubm9ydGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhFYXN0Ll9hZGQodmVjLCB1bml0KTtcbiAgICBpZiAoaW5zZXJ0ZWQgPT09ICdhZGRlZCcpIHRoaXMuX3NpemUgKys7XG4gICAgcmV0dXJuIGluc2VydGVkO1xuICB9XG4gIGFkZCh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLl9hZGQodmVjLCB1bml0KTtcbiAgfVxuICBwcml2YXRlIF9tb3ZlKFxuICAgICAgZnJvbTogVmVjMixcbiAgICAgIHRvOiBWZWMyIHwgdW5kZWZpbmVkLFxuICAgICAgdW5pdDogVCxcbiAgKTogZmFsc2UgfCAncmVtb3ZlZCcgfCAnbW92ZWQnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIGZyb20pKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKGZyb20sIHVuaXQsIHRoaXMpO1xuICAgICAgaWYgKCF0aGlzLnVuaXRzW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHRvICYmIEFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHRvKSkge1xuICAgICAgICAvLyB1cGRhdGUgaW4tcGxhY2VcbiAgICAgICAgY29uc3QgbmV3S2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodG8sIHVuaXQsIHRoaXMpO1xuICAgICAgICBpZiAobmV3S2V5ICE9PSBrZXkpIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy51bml0c1trZXldO1xuICAgICAgICAgIHRoaXMudW5pdHNbbmV3S2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjOiB0bywgdW5pdH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdtb3ZlZCc7XG4gICAgICB9XG4gICAgICBkZWxldGUgdGhpcy51bml0c1trZXldO1xuICAgICAgdGhpcy5fc2l6ZSAtLTtcbiAgICAgIHJldHVybiAncmVtb3ZlZCc7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMubm9ydGhXZXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KSB8fFxuICAgICAgICAgIHRoaXMubm9ydGhFYXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KSB8fFxuICAgICAgICAgIHRoaXMuc291dGhXZXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KSB8fFxuICAgICAgICAgIHRoaXMuc291dGhFYXN0Ll9tb3ZlKGZyb20sIHRvLCB1bml0KTtcbiAgICBpZiAocmVzdWx0ID09PSAncmVtb3ZlZCcpIHtcbiAgICAgIHRoaXMuX3NpemUgLS07XG4gICAgICBpZiAodG8pIHtcbiAgICAgICAgaWYgKHRoaXMuYWRkKHRvLCB1bml0KSkgcmV0dXJuICdtb3ZlZCc7XG4gICAgICAgIHJldHVybiAncmVtb3ZlZCc7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgbW92ZShmcm9tOiBWZWMyLCB0bzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdG8pKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuX21vdmUoZnJvbSwgdG8sIHVuaXQpID09PSAncmVtb3ZlZCcpIHRocm93IG5ldyBFcnJvcigndW5leHBlY3RlZCcpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGRlbGV0ZSh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZSh2ZWMsIHVuZGVmaW5lZCwgdW5pdCkgPT09ICdyZW1vdmVkJztcbiAgfVxuICBjbGVhcigpIHtcbiAgICB0aGlzLnVuaXRzID0ge307XG4gICAgdGhpcy5fc2l6ZSA9IDA7XG4gICAgdGhpcy5kaXZpZGVkID0gZmFsc2U7XG4gICAgdGhpcy5ub3J0aFdlc3QgPVxuICAgICAgdGhpcy5ub3J0aEVhc3QgPVxuICAgICAgdGhpcy5zb3V0aFdlc3QgPVxuICAgICAgdGhpcy5zb3V0aEVhc3QgPSB1bmRlZmluZWQhO1xuICB9XG4gIGhhcyh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBib29sZWFuIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIHJldHVybiAhIXRoaXMudW5pdHNba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9ydGhXZXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhFYXN0Lmhhcyh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgZGl2aWRlKCkge1xuICAgIHRoaXMuZGl2aWRlZCA9IHRydWU7XG4gICAgY29uc3QgaHcgPSB0aGlzLmJvdW5kcy5zaXplLnggLyAyO1xuICAgIGNvbnN0IGhoID0gdGhpcy5ib3VuZHMuc2l6ZS55IC8gMjtcblxuICAgIHRoaXMubm9ydGhXZXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54IC0gaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLm5vcnRoRWFzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCArIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSAtIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMuc291dGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55ICsgaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICBmb3IgKGNvbnN0IGsgaW4gdGhpcy51bml0cykge1xuICAgICAgY29uc3Qge3ZlYywgdW5pdH0gPSB0aGlzLnVuaXRzW2tdO1xuICAgICAgdGhpcy5ub3J0aFdlc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuYWRkKHZlYywgdW5pdCk7XG4gICAgfVxuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgfVxuICBwcml2YXRlIF9xdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICAgICBtYXBGdW5jOiAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaWR4OiBudW1iZXIpID0+IEEpIHwgdW5kZWZpbmVkLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgKTogSXRlcmFibGU8QT4ge1xuICAgIGlmIChzaGFwZSAmJiAhU2hhcGUucG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZSwgdGhpcy5ib3VuZHMpKSByZXR1cm4gW107XG5cbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgcmV0dXJuIENvbGxlY3Rpb24ub2JqZWN0VmFsdWVzVG9JdGVyYWJsZShcbiAgICAgICAgICB0aGlzLnVuaXRzLFxuICAgICAgICAgIHNoYXBlID8gKHYpID0+IFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlLCB2LnZlYykgOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWFwRnVuYyxcbiAgICAgICAgICBpbmRleCxcbiAgICAgICkgYXMgSXRlcmFibGU8QT47XG4gICAgfVxuICAgIGlmIChtYXBGdW5jKSB7XG4gICAgICByZXR1cm4gQ29sbGVjdGlvbi50b0l0ZXJhYmxlV2l0aE1hcChcbiAgICAgICAgICBtYXBGdW5jLFxuICAgICAgICAgIGluZGV4LFxuICAgICAgICAgIHRoaXMubm9ydGhXZXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICAgIHRoaXMubm9ydGhFYXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICAgIHRoaXMuc291dGhXZXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICAgIHRoaXMuc291dGhFYXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIENvbGxlY3Rpb24udG9JdGVyYWJsZShcbiAgICAgICAgdGhpcy5ub3J0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgIHRoaXMubm9ydGhFYXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICB0aGlzLnNvdXRoV2VzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICAgdGhpcy5zb3V0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgKTtcbiAgfVxuICBxdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpZHg6IG51bWJlcikgPT4gQSxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+O1xuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBtYXBGdW5jT3JTaGFwZT86ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpZHg6IG51bWJlcikgPT4gQSkgfCBTaGFwZSxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+IHtcbiAgICBpZiAodHlwZW9mIG1hcEZ1bmNPclNoYXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCBtYXBGdW5jT3JTaGFwZSwge2luZGV4OiAwfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeUl0ZXJhdGFibGUoXG4gICAgICAgIG1hcEZ1bmNPclNoYXBlIGFzIFNoYXBlLFxuICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgIHtpbmRleDogMH0sXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBwcml2YXRlIF9xdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlOiBBIHwgdW5kZWZpbmVkLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgKTogQSB7XG4gICAgaWYgKHNoYXBlICYmICFTaGFwZS5wb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlLCB0aGlzLmJvdW5kcykpIHtcbiAgICAgIHJldHVybiBpbml0aWFsVmFsdWUhO1xuICAgIH1cbiAgICBsZXQgdmFsdWU6IEEgPSBpbml0aWFsVmFsdWUhO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBpZiAoc2hhcGUpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGsgaW4gdGhpcy51bml0cykge1xuICAgICAgICAgIGNvbnN0IHVuaXQgPSB0aGlzLnVuaXRzW2tdO1xuICAgICAgICAgIGlmIChTaGFwZS5vdmVybGFwc1ZlYyhzaGFwZSwgdW5pdC52ZWMpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrRnVuYyh2YWx1ZSwgdW5pdCwgaW5kZXguaW5kZXgrKykhO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgICBmb3IgKGNvbnN0IGsgaW4gdGhpcy51bml0cykge1xuICAgICAgICAgIGNvbnN0IHVuaXQgPSB0aGlzLnVuaXRzW2tdO1xuICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2tGdW5jKHZhbHVlLCB1bml0LCBpbmRleC5pbmRleCsrKSE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgdmFsdWUgPSB0aGlzLm5vcnRoV2VzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUsIGluZGV4KTtcbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHZhbHVlID0gdGhpcy5zb3V0aFdlc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlLCBpbmRleCk7XG4gICAgdmFsdWUgPSB0aGlzLnNvdXRoRWFzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUsIGluZGV4KTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckNhbGxiYWNrRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jLFxuICAgICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIEEsXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZShcbiAgICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jLFxuICAgICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgICAgICBpbml0aWFsVmFsdWUsXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+PihcbiAgICAgICAgc2hhcGUsXG4gICAgICAgIChhcnIsIHYpID0+IHtcbiAgICAgICAgICBhcnIucHVzaCh2KTtcbiAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICB9LFxuICAgICAgICBbXSxcbiAgICAgICAge2luZGV4OiAwfSxcbiAgICApO1xuICB9XG5cbiAgcXVlcnlGb3JFYWNoKFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZU9yRm9yZWFjaEZ1bmM6XG4gICAgICAgIFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQpLFxuICAgICAgZm9yZWFjaEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApIHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JGb3JlYWNoRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fcXVlcnlSZWR1Y2U8dm9pZD4oXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIChfLCB2LCBpbmRleCkgPT4gc2hhcGVPckZvcmVhY2hGdW5jKHYsIGluZGV4KSxcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghZm9yZWFjaEZ1bmMpIHJldHVybjtcbiAgICAgIHRoaXMuX3F1ZXJ5UmVkdWNlPHZvaWQ+KFxuICAgICAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYyxcbiAgICAgICAgICAoXywgdiwgaW5kZXgpID0+IGZvcmVhY2hGdW5jKHYsIGluZGV4KSxcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZU9yTWFwRnVuYzogU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSksXG4gICAgICBtYXBGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT4ge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPck1hcEZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmICghbWFwRnVuYykgcmV0dXJuIFtdO1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PEE+PihcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgKGFyciwgdiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGFyci5wdXNoKHNoYXBlT3JNYXBGdW5jKHYsIGluZGV4KSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10sXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghbWFwRnVuYykgcmV0dXJuIFtdO1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PEE+PihcbiAgICAgICAgICBzaGFwZU9yTWFwRnVuYyxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2gobWFwRnVuYyh2LCBpbmRleCkpO1xuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdLFxuICAgICAgICAgIHtpbmRleDogMH0sXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBxdWVyeVNpemUoXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPG51bWJlcj4oXG4gICAgICAgIHNoYXBlLFxuICAgICAgICAoc2l6ZSkgPT4gc2l6ZSArIDEsXG4gICAgICAgIDAsXG4gICAgICAgIHtpbmRleDogMH0sXG4gICAgKTtcbiAgfVxuICBfZHVtcFRvU3RyaW5nKHJlc3VsdDogc3RyaW5nW10pIHtcbiAgICBjb25zdCBwcmVmaXggPSAnICAgICAgICAgICAgJy5zdWJzdHJpbmcoMCwgdGhpcy5kZXB0aCk7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHByZWZpeCk7XG4gICAgICByZXN1bHQucHVzaChKU09OLnN0cmluZ2lmeSh0aGlzLnVuaXRzKSk7XG4gICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIFtcbiAgICAgIHtzdHI6ICdOVycsIHF0OiB0aGlzLm5vcnRoV2VzdH0sXG4gICAgICB7c3RyOiAnTkUnLCBxdDogdGhpcy5ub3J0aEVhc3R9LFxuICAgICAge3N0cjogJ1NXJywgcXQ6IHRoaXMuc291dGhXZXN0fSxcbiAgICAgIHtzdHI6ICdTRScsIHF0OiB0aGlzLnNvdXRoRWFzdH0sXG4gICAgXSkge1xuICAgICAgcmVzdWx0LnB1c2gocHJlZml4KTtcbiAgICAgIHJlc3VsdC5wdXNoKGNoaWxkLnN0cik7XG4gICAgICByZXN1bHQucHVzaChgICgke2NoaWxkLnF0LnNpemV9KTpcXG5gKTtcbiAgICAgIGNoaWxkLnF0Ll9kdW1wVG9TdHJpbmcocmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9kdW1wVG9TdHJpbmcoW10pLmpvaW4oJycpO1xuICB9XG59XG4iLCJpbXBvcnQge1xuICBRdWFkVHJlZSxcbiAgUXVhZFRyZWVPcHRpb25zLFxufSBmcm9tICcuL1F1YWRUcmVlJztcbmltcG9ydCB7QUFCQiwgU2hhcGUsIFZlYzJ9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPiA9IChvOiBUKSA9PiBWZWMyO1xuZXhwb3J0IHR5cGUgUXVhZE1hcFVuaXRQb3NpdGlvblNldHRlckZ1bmM8VD4gPSAobzogVCwgcG9zaXRpb246IFZlYzIpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gIGFjYzogQSxcbiAgcHJldmlvdXM6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LFxuICBpbmRleDogbnVtYmVyLFxuKSA9PiBBIHwgdW5kZWZpbmVkO1xuZXhwb3J0IGNsYXNzIFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgfVxufVxuZXhwb3J0IGludGVyZmFjZSBSZWFkb25seVF1YWRUcmVlU2V0PFQ+IGV4dGVuZHMgUmVhZG9ubHlTZXQ8VD4ge1xuICByZWFkb25seSBib3VuZHM6IEFBQkI7XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCk6IFNldEl0ZXJhdG9yPFQ+O1xuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PjtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PjtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG59XG5leHBvcnQgY2xhc3MgUXVhZFRyZWVTZXQ8VD4gaW1wbGVtZW50cyBTZXQ8VD4sIFJlYWRvbmx5UXVhZFRyZWVTZXQ8VD4ge1xuICBzdGF0aWMgVW5pcXVlVW5pdEF0VmVjS2V5RnVuYyA9IFF1YWRUcmVlLlVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYztcbiAgcHJpdmF0ZSBxdWFyZFRyZWU6IFF1YWRUcmVlPFQ+O1xuICBwcml2YXRlIHVuaXRQb3NpdGlvbkdldHRlcjogUXVhZE1hcFVuaXRQb3NpdGlvbkdldHRlckZ1bmM8VD47XG4gIGNvbnN0cnVjdG9yKGJvdW5kczogQUFCQiwgb3B0aW9uczogUGFydGlhbDxRdWFkVHJlZU9wdGlvbnM8VD4+ICYge1xuICAgIHVuaXRQb3NpdGlvbkdldHRlcjogUXVhZE1hcFVuaXRQb3NpdGlvbkdldHRlckZ1bmM8VD4sXG4gIH0pIHtcbiAgICB0aGlzLnF1YXJkVHJlZSA9IG5ldyBRdWFkVHJlZShib3VuZHMsIG9wdGlvbnMpO1xuICAgIHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyID0gb3B0aW9ucy51bml0UG9zaXRpb25HZXR0ZXI7XG4gIH1cbiAgZ2V0IHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnNpemU7XG4gIH1cbiAgZ2V0IGJvdW5kcygpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuYm91bmRzO1xuICB9XG4gIGFkZCh0OiBUKSB7XG4gICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KTtcbiAgICBpZiAoIXRoaXMucXVhcmRUcmVlLmFkZChwb3NpdGlvbiwgdCkpIHtcbiAgICAgIHRocm93IG5ldyBRdWFkVHJlZVBvc2l0aW9uT3V0T2ZCb3VuZHNFcnJvcihcbiAgICAgICAgICBgcG9zaXRpb24gJHtKU09OLnN0cmluZ2lmeShwb3NpdGlvbil9IGlzIG91dCBvZiBib3VuZHM6YCArXG4gICAgICAgICAgYCAke0pTT04uc3RyaW5naWZ5KHRoaXMucXVhcmRUcmVlLmJvdW5kcyl9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIG1vdmUodDogVCwgdG86IFZlYzIpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUubW92ZSh0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KSwgdG8sIHQpO1xuICB9XG4gIGRlbGV0ZSh0OiBUKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLmRlbGV0ZSh0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KSwgdCk7XG4gIH1cbiAgaGFzKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuaGFzKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBjbGVhcigpIHtcbiAgICB0aGlzLnF1YXJkVHJlZS5jbGVhcigpO1xuICB9XG4gIGZvckVhY2goXG4gICAgICBjYWxsYmFja2ZuOiAodmFsdWU6IFQsIHZhbHVlMjogVCwgc2V0OiBTZXQ8VD4pID0+IHZvaWQsXG4gICAgICB0aGlzQXJnPzogYW55LFxuICApOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlSZWR1Y2UoXG4gICAgICAgIChfLCBwKSA9PiB2b2lkKGNhbGxiYWNrZm4ocC51bml0ISwgcC51bml0ISwgdGhpc0FyZykpLFxuICAgICAgICB2b2lkKDApLFxuICAgICk7XG4gIH1cbiAgZW50cmllcygpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlPFtULCBUXT4oXG4gICAgICAgIChwKSA9PiBbcC51bml0ISwgcC51bml0IV0pIGFzIGFueTtcbiAgfVxuICBrZXlzKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlcygpO1xuICB9XG4gIHZhbHVlcygpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlPFQ+KFxuICAgICAgICAocCkgPT4gcC51bml0ISkgYXMgYW55O1xuICB9XG4gIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS50b1N0cmluZygpO1xuICB9XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlcygpO1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSBhc1xuICAgICAgSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICB9XG5cbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYzogU2hhcGUgfCBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZTogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+IHwgQSxcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlSZWR1Y2UoXG4gICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMgYXMgU2hhcGUsXG4gICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIGFueSxcbiAgICAgICAgaW5pdGlhbFZhbHVlKTtcbiAgfVxuXG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUFycmF5KHNoYXBlKSBhcyBhbnk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZU9yRm9yZWFjaEZ1bmM6XG4gICAgICAgIFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKSB7XG4gICAgdGhpcy5xdWFyZFRyZWUucXVlcnlGb3JFYWNoKHNoYXBlT3JGb3JlYWNoRnVuYyBhcyBhbnksIGZvcmVhY2hGdW5jIGFzIGFueSk7XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZU9yTWFwRnVuYzogU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlNYXAoc2hhcGVPck1hcEZ1bmMgYXMgU2hhcGUsIG1hcEZ1bmMgYXMgYW55KTtcbiAgfVxuICBxdWVyeVNpemUoXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5U2l6ZShzaGFwZSk7XG4gIH1cbn1cbiIsImltcG9ydCB7UXVhZFRyZWVTZXR9IGZyb20gJy4uL3NyYy9RdWFkVHJlZVNldCc7XG5pbXBvcnQge0FBQkIsIFNoYXBlLCBWZWMyfSBmcm9tICcuLi9zcmMvc2hhcGUnO1xuXG5cbmNvbnN0IGNhbmNhc0FsbCA9XG4gIHdpbmRvdy5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWxsJykgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG5jb25zdCBjdHhBbGwgPSBjYW5jYXNBbGwuZ2V0Q29udGV4dCgnMmQnKSE7XG5cbmNvbnN0IGNhbmNhc1F1ZXJ5UmVzdWx0ID1cbiAgd2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdxdWVyeVJlc3VsdCcpIGFzIEhUTUxDYW52YXNFbGVtZW50O1xuY29uc3QgY3R4UXVlcnlSZXN1bHQgPSBjYW5jYXNRdWVyeVJlc3VsdC5nZXRDb250ZXh0KCcyZCcpITtcblxuY2xhc3MgVW5pdCB7XG4gIGlkOiBudW1iZXI7XG4gIF9wb3NpdGlvbjogVmVjMjtcbiAgZ2V0IHBvc2l0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NpdGlvbjtcbiAgfVxuICBzZXQgcG9zaXRpb24odikge1xuICAgIGlmIChxdFNldC5tb3ZlKHRoaXMsIHYpKSB7XG4gICAgICB0aGlzLl9wb3NpdGlvbiA9IHY7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZmFpbGVkIHRvIG1vdmUgJHt0aGlzLmlkfSB0byAke0pTT04uc3RyaW5naWZ5KHYpfSwgYCArXG4gICAgICAgIGBzdGF5cyBhdDogJHtKU09OLnN0cmluZ2lmeSh0aGlzLl9wb3NpdGlvbil9YCk7XG4gICAgfVxuICB9XG4gIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHBvc2l0aW9uOiBWZWMyKSB7XG4gICAgdGhpcy5pZCA9IGlkO1xuICAgIHRoaXMuX3Bvc2l0aW9uID0gcG9zaXRpb247XG4gICAgcXRTZXQuYWRkKHRoaXMpO1xuICB9XG59XG5cbmNvbnN0IHF0U2V0ID0gbmV3IFF1YWRUcmVlU2V0PFVuaXQ+KHtcbiAgc2l6ZToge3g6IGNhbmNhc0FsbC53aWR0aCAvIDIsIHk6IGNhbmNhc0FsbC5oZWlnaHQgLyAyfSxcbiAgY2VudGVyOiB7eDogY2FuY2FzQWxsLndpZHRoIC8gMiwgeTogY2FuY2FzQWxsLmhlaWdodCAvIDJ9LFxufSwge1xuICB1bml0S2V5R2V0dGVyOiAoXywgdW5pdCkgPT4gdW5pdCEuaWQsXG4gIHVuaXRQb3NpdGlvbkdldHRlcjogKHUpID0+IHUucG9zaXRpb24sXG59KTtcblxubGV0IGN1cnJlbnRJZCA9IDA7XG5mdW5jdGlvbiBnZW5lcmF0ZUlkKCk6IG51bWJlciB7XG4gIGlmIChjdXJyZW50SWQgPT0gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHtcbiAgICBjdXJyZW50SWQgPSAwO1xuICAgIHF0U2V0LmNsZWFyKCk7XG4gIH1cbiAgcmV0dXJuICsrY3VycmVudElkO1xufVxuZnVuY3Rpb24gcmFuZG9tUG9zaXRpb24oKTogVmVjMiB7XG4gIHJldHVybiB7XG4gICAgeDogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2FuY2FzQWxsLndpZHRoIGFzIGFueSksXG4gICAgeTogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2FuY2FzQWxsLmhlaWdodCBhcyBhbnkpLFxuICB9O1xufVxuXG5jb25zdCB0b3RhbFVuaXQgPSA1MDAwMDA7XG5jb25zdCB1bml0VG9Nb3ZlRWFjaEZyYW1lID0gTWF0aC5mbG9vcih0b3RhbFVuaXQgKiAwLjAwNSk7XG5jb25zdCB1bml0VG9BZGRFYWNoRnJhbWUgPSBNYXRoLmZsb29yKHRvdGFsVW5pdCAqIDAuMDA1KTtcblxuY29uc3QgdW5pdHM6IChVbml0fHVuZGVmaW5lZClbXSA9IFtdO1xubGV0IGxhc3RFbXB0eUluZGV4ID0gLTE7XG5mdW5jdGlvbiByZWNvcmRVbml0KHU6IFVuaXQpOiBVbml0IHtcbiAgaWYgKHVuaXRzLmxlbmd0aCA+IDEuNSAqIHRvdGFsVW5pdCkge1xuICAgIGlmIChsYXN0RW1wdHlJbmRleCA+IC0xICYmIHVuaXRzW2xhc3RFbXB0eUluZGV4XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB1bml0c1tsYXN0RW1wdHlJbmRleF0gPSB1O1xuICAgICAgbGFzdEVtcHR5SW5kZXggPSAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgdW5pdHNbdW5pdHMuZmluZEluZGV4KCh1dSkgPT4gdXUgPT09IHVuZGVmaW5lZCldID0gdTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdW5pdHMucHVzaCh1KTtcbiAgfVxuICByZXR1cm4gdTtcbn1cbmZ1bmN0aW9uIHRha2VBVW5pdCgpOiBVbml0IHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBpbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHVuaXRzLmxlbmd0aCk7XG4gICAgY29uc3QgdW5pdCA9IHVuaXRzW2luZGV4XTtcbiAgICBpZiAodW5pdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB1bml0c1tpbmRleF0gPSB1bmRlZmluZWQ7XG4gICAgICBsYXN0RW1wdHlJbmRleCA9IGluZGV4O1xuICAgICAgcmV0dXJuIHVuaXQ7XG4gICAgfVxuICB9XG59XG5mdW5jdGlvbiBtb3ZlUmFuZG9tRGlyZWN0aW9uKHY6IFZlYzIpIHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB2ZWMgPSB7XG4gICAgICB4OiB2LnggKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA0KSAtIDIsXG4gICAgICB5OiB2LnkgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA0KSAtIDIsXG4gICAgfTtcbiAgICBpZiAoQUFCQi5vdmVybGFwc1ZlYyhxdFNldC5ib3VuZHMsIHZlYykpIHJldHVybiB2ZWM7XG4gIH1cbn1cbmZ1bmN0aW9uIGdldE1vdXNlUG9zKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsIGV2dDogTW91c2VFdmVudCkge1xuICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICByZXR1cm4ge1xuICAgIHg6IGV2dC5jbGllbnRYIC0gcmVjdC5sZWZ0LFxuICAgIHk6IGV2dC5jbGllbnRZIC0gcmVjdC50b3AsXG4gIH07XG59XG5sZXQgbW91c2VQb3M6IFZlYzIgPSB7eDogMCwgeTogMH07XG5jYW5jYXNBbGwub25tb3VzZW1vdmUgPSBmdW5jdGlvbihldnQ6IE1vdXNlRXZlbnQpIHtcbiAgbW91c2VQb3MgPSBnZXRNb3VzZVBvcyhjYW5jYXNBbGwsIGV2dCk7XG59O1xuY2FuY2FzUXVlcnlSZXN1bHQub25tb3VzZW1vdmUgPSBmdW5jdGlvbihldnQ6IE1vdXNlRXZlbnQpIHtcbiAgbW91c2VQb3MgPSBnZXRNb3VzZVBvcyhjYW5jYXNRdWVyeVJlc3VsdCwgZXZ0KTtcbn07XG5cbmxldCBwcmV2aW91c1RpbWVTdGFtcDogRE9NSGlnaFJlc1RpbWVTdGFtcDtcbmZ1bmN0aW9uIGFuaW1hdGUodGltZXN0YW1wOiBET01IaWdoUmVzVGltZVN0YW1wKSB7XG4gIGN0eEFsbC5jbGVhclJlY3QoMCwgMCwgY2FuY2FzQWxsLndpZHRoLCBjYW5jYXNBbGwuaGVpZ2h0KTtcbiAgY3R4QWxsLnNhdmUoKTtcbiAgY3R4QWxsLmZpbGxTdHlsZSA9ICdyZWQnO1xuICB3aGlsZSAocXRTZXQuc2l6ZSA8IHRvdGFsVW5pdCkge1xuICAgIGNvbnNvbGUubG9nKHF0U2V0LnNpemUpO1xuICAgIHJlY29yZFVuaXQobmV3IFVuaXQoZ2VuZXJhdGVJZCgpLCByYW5kb21Qb3NpdGlvbigpKSk7XG4gIH1cbiAgZm9yIChsZXQgaT0wOyBpPHVuaXRUb01vdmVFYWNoRnJhbWU7IGkrKykge1xuICAgIGNvbnN0IHVuaXQgPSB0YWtlQVVuaXQoKTtcbiAgICB1bml0LnBvc2l0aW9uID0gbW92ZVJhbmRvbURpcmVjdGlvbih1bml0LnBvc2l0aW9uKTtcbiAgICByZWNvcmRVbml0KHVuaXQpO1xuICB9XG4gIGZvciAobGV0IGk9MDsgaTx1bml0VG9BZGRFYWNoRnJhbWU7IGkrKykge1xuICAgIGNvbnN0IHVuaXQgPSB0YWtlQVVuaXQoKTtcbiAgICBpZiAoIXF0U2V0LmRlbGV0ZSh1bml0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBkZWxldGUgZmFpbGVkOiBgICtcbiAgICAgICAgYCR7dW5pdC5pZH0gJHtKU09OLnN0cmluZ2lmeSh1bml0LnBvc2l0aW9uKX1gKTtcbiAgICB9XG4gICAgcmVjb3JkVW5pdChuZXcgVW5pdChnZW5lcmF0ZUlkKCksIHJhbmRvbVBvc2l0aW9uKCkpKTtcbiAgfVxuICAvLyBxdFNldC5xdWVyeUZvckVhY2goKHYpID0+IGN0eEFsbC5maWxsUmVjdCh2LnZlYy54LCB2LnZlYy55LCAxLCAxKSk7XG4gIGlmIChwcmV2aW91c1RpbWVTdGFtcCkge1xuICAgIGN0eEFsbC5maWxsU3R5bGUgPSAnYmx1ZSc7XG4gICAgY3R4QWxsLmZvbnQgPSAnMTVweCBBcmlhbCc7XG4gICAgY3R4QWxsLmZpbGxUZXh0KFxuICAgICAgICBgJHtNYXRoLnJvdW5kKDEwMDAvKHRpbWVzdGFtcCAtIHByZXZpb3VzVGltZVN0YW1wKSl9IGZwc2AsIDEwLCA1MCk7XG4gIH1cbiAgY3R4QWxsLnJlc3RvcmUoKTtcblxuICBjdHhRdWVyeVJlc3VsdC5jbGVhclJlY3QoMCwgMCxcbiAgICAgIGNhbmNhc1F1ZXJ5UmVzdWx0LndpZHRoLCBjYW5jYXNRdWVyeVJlc3VsdC5oZWlnaHQpO1xuICBjdHhRdWVyeVJlc3VsdC5zYXZlKCk7XG4gIGN0eFF1ZXJ5UmVzdWx0LmZpbGxTdHlsZSA9ICdncmVlbic7XG4gIGxldCBxdWVyeUNvdW50ID0gMDtcbiAgcXRTZXQucXVlcnlGb3JFYWNoKFNoYXBlLmNyZWF0ZUVsbGlwc2UobW91c2VQb3MsIHt4OiAxMiwgeTogOH0pLCAoe3ZlY30pID0+IHtcbiAgICBjdHhRdWVyeVJlc3VsdC5maWxsUmVjdCh2ZWMueCwgdmVjLnksIDEsIDEpO1xuICAgIHF1ZXJ5Q291bnQgKys7XG4gIH0pO1xuICBjdHhRdWVyeVJlc3VsdC5maWxsU3R5bGUgPSAnYmxhY2snO1xuICBjdHhRdWVyeVJlc3VsdC5mb250ID0gJzE1cHggQXJpYWwnO1xuICBjdHhRdWVyeVJlc3VsdC5maWxsVGV4dChcbiAgICAgIGAke3F1ZXJ5Q291bnR9LyR7cXRTZXQuc2l6ZX0gcXVlcmllZGAsIGNhbmNhc1F1ZXJ5UmVzdWx0LndpZHRoIC0gMTAwLCA1MCk7XG4gIGN0eFF1ZXJ5UmVzdWx0LnJlc3RvcmUoKTtcbiAgcHJldmlvdXNUaW1lU3RhbXAgPSB0aW1lc3RhbXA7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcbn1cbndpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFHTSxJQUFXLFVBQVUsQ0F1SjFCO0lBdkpELENBQUEsVUFBaUIsVUFBVSxFQUFBO1FBQ3pCLFNBQWdCLE9BQU8sQ0FBSSxDQUFnQixFQUFBO0lBQ3pDLFFBQUEsSUFBSSxDQUFDLFlBQVksS0FBSyxFQUFFO0lBQ3RCLFlBQUEsT0FBTyxDQUFDLENBQUM7YUFDVjtZQUNELE1BQU0sQ0FBQyxHQUFRLEVBQUUsQ0FBQztJQUNsQixRQUFBLElBQUssQ0FBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDeEMsWUFBQSxLQUFLLE1BQU0sQ0FBQyxJQUFLLENBQWtCLEVBQUU7SUFDbkMsZ0JBQUEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDWDtJQUNELFlBQUEsT0FBTyxDQUFDLENBQUM7YUFDVjtJQUNELFFBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2pCLFFBQUEsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7SUFDZCxZQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hCLFlBQUEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUNkO0lBQ0QsUUFBQSxPQUFPLENBQUMsQ0FBQztTQUNWO0lBakJlLElBQUEsVUFBQSxDQUFBLE9BQU8sVUFpQnRCLENBQUE7SUFDRCxJQUFBLFVBQWlCLFVBQVUsQ0FDdkIsR0FBRyxjQUFxRSxFQUFBO0lBRTFFLFFBQUEsS0FBSyxNQUFNLGdCQUFnQixJQUFJLGNBQWMsRUFBRTtJQUM3QyxZQUFBLElBQUksQ0FBQyxnQkFBZ0I7b0JBQUUsU0FBUztJQUNoQyxZQUFBLE1BQU0sUUFBUSxHQUFHLE9BQU8sZ0JBQWdCLEtB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LE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO2dCQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7YUFBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN2RCxRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO2dCQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7YUFBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN2RCxRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO2dCQUNwRSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7YUFBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQzs7SUFHdkQsUUFBQSxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7SUFDMUIsWUFBQSxNQUFNLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7b0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7b0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7b0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUMvQjtJQUNELFFBQUEsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7U0FDakI7SUFDTyxJQUFBLGdCQUFnQixDQUNwQixLQUF3QixFQUN4QixPQUFtRSxFQUNuRSxLQUFzQixFQUFBO0lBRXhCLFFBQUEsSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7SUFBRSxZQUFBLE9BQU8sRUFBRSxDQUFDO0lBRTFFLFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7SUFDakIsWUFBQSxPQUFPLFVBQVUsQ0FBQyxzQkFBc0IsQ0FDcEMsSUFBSSxDQUFDLEtBQUssRUFDVixLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsRUFDMUQsT0FBTyxFQUNQLEtBQUssQ0FDTyxDQUFDO2FBQ2xCO1lBQ0QsSUFBSSxPQUFPLEVBQUU7SUFDWCxZQUFBLE9BQU8sVUFBVSxDQUFDLGlCQUFpQixDQUMvQixPQUFPLEVBQ1AsS0FBSyxFQUNMLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFDeEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUN4RCxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQ3hELElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FDM0QsQ0FBQzthQUNIO1lBQ0QsT0FBTyxVQUFVLENBQUMsVUFBVSxDQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQ3hELElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFDeEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUN4RCxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQzNELENBQUM7U0FDSDtRQVFELGVBQWUsQ0FDWCxjQUF1RSxFQUN2RSxLQUF5QixFQUFBO0lBRTNCLFFBQUEsSUFBSSxPQUFPLGNBQWMsS0FBSyxVQUFVLEVBQUU7SUFDeEMsWUFBQSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7YUFDakU7aUJBQU07SUFDTCxZQUFBLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUMxQixjQUF1QixFQUN2QixTQUFTLEVBQ1QsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQ1gsQ0FBQzthQUNIO1NBQ0Y7SUFDTyxJQUFBLFlBQVksQ0FDaEIsS0FBd0IsRUFDeEIsWUFBc0MsRUFDdEMsWUFBMkIsRUFDM0IsS0FBc0IsRUFBQTtJQUV4QixRQUFBLElBQUksS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7SUFDOUQsWUFBQSxPQUFPLFlBQWEsQ0FBQzthQUN0QjtZQUNELElBQUksS0FBSyxHQUFNLFlBQWEsQ0FBQztJQUM3QixRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNqQixJQUFJLEtBQUssRUFBRTs7SUFFVCxnQkFBQSxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7d0JBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzNCLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ3RDLHdCQUFBLEtBQUssR0FBRyxZQUFZLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUUsQ0FBQzt5QkFDbkQ7cUJBQ0Y7aUJBQ0Y7cUJBQU07O0lBRUwsZ0JBQUEsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO3dCQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNCLG9CQUFBLEtBQUssR0FBRyxZQUFZLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUUsQ0FBQztxQkFDbkQ7aUJBQ0Y7SUFDRCxZQUFBLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7SUFDRCxRQUFBLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2RSxRQUFBLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2RSxRQUFBLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2RSxRQUFBLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2RSxRQUFBLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7SUFTRCxJQUFBLFdBQVcsQ0FDUCxtQkFBcUQsRUFDckQsMEJBQXdELEVBQ3hELFlBQWdCLEVBQUE7SUFDbEIsUUFBQSxJQUFJLE9BQU8sbUJBQW1CLEtBQUssVUFBVSxFQUFFO0lBQzdDLFlBQUEsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUNwQixTQUFTLEVBQ1QsbUJBQW1CLEVBQ25CLDBCQUErQixFQUMvQixFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FDYixDQUFDO2FBQ0g7aUJBQU07SUFDTCxZQUFBLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FDcEIsbUJBQW1CLEVBQ25CLDBCQUFzRCxFQUN0RCxZQUFZLEVBQ1osRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQ2IsQ0FBQzthQUNIO1NBQ0Y7SUFFRCxJQUFBLFVBQVUsQ0FDTixLQUFhLEVBQUE7WUFFZixPQUFPLElBQUksQ0FBQyxZQUFZLENBQ3BCLEtBQUssRUFDTCxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUk7SUFDVCxZQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWixZQUFBLE9BQU8sR0FBRyxDQUFDO2FBQ1osRUFDRCxFQUFFLEVBQ0YsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQ2IsQ0FBQztTQUNIO1FBU0QsWUFBWSxDQUNSLGtCQUM2RCxFQUM3RCxXQUErRCxFQUFBO0lBRWpFLFFBQUEsSUFBSSxPQUFPLGtCQUFrQixLQUFLLFVBQVUsRUFBRTtJQUM1QyxZQUFBLElBQUksQ0FBQyxZQUFZLENBQ2IsU0FBUyxFQUNULENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEtBQUssa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUM3QyxTQUFTLEVBQ1QsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQ2IsQ0FBQzthQUNIO2lCQUFNO0lBQ0wsWUFBQSxJQUFJLENBQUMsV0FBVztvQkFBRSxPQUFPO0lBQ3pCLFlBQUEsSUFBSSxDQUFDLFlBQVksQ0FDYixrQkFBa0IsRUFDbEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssS0FBSyxXQUFXLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUN0QyxTQUFTLEVBQ1QsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQ2IsQ0FBQzthQUNIO1NBQ0Y7UUFTRCxRQUFRLENBQ0osY0FBd0UsRUFDeEUsT0FBd0QsRUFBQTtJQUUxRCxRQUFBLElBQUksT0FBTyxjQUFjLEtBQUssVUFBVSxFQUFFO0lBQ3hDLFlBQUEsSUFBSSxDQUFDLE9BQU87SUFBRSxnQkFBQSxPQUFPLEVBQUUsQ0FBQztJQUN4QixZQUFBLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FDcEIsU0FBUyxFQUNULENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxLQUFLLEtBQUk7b0JBQ2hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ25DLGdCQUFBLE9BQU8sR0FBRyxDQUFDO2lCQUNaLEVBQ0QsRUFBRSxFQUNGLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBQyxDQUNiLENBQUM7YUFDSDtpQkFBTTtJQUNMLFlBQUEsSUFBSSxDQUFDLE9BQU87SUFBRSxnQkFBQSxPQUFPLEVBQUUsQ0FBQztJQUN4QixZQUFBLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FDcEIsY0FBYyxFQUNkLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxLQUFLLEtBQUk7b0JBQ2hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzVCLGdCQUFBLE9BQU8sR0FBRyxDQUFDO2lCQUNaLEVBQ0QsRUFBRSxFQUNGLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBQyxDQUNiLENBQUM7YUFDSDtTQUNGO0lBQ0QsSUFBQSxTQUFTLENBQ0wsS0FBWSxFQUFBO1lBRWQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUNwQixLQUFLLEVBQ0wsQ0FBQyxJQUFJLEtBQUssSUFBSSxHQUFHLENBQUMsRUFDbEIsQ0FBQyxFQUNELEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBQyxDQUNiLENBQUM7U0FDSDtJQUNELElBQUEsYUFBYSxDQUFDLE1BQWdCLEVBQUE7SUFDNUIsUUFBQSxNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkQsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtJQUNqQixZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEIsWUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDeEMsWUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLFlBQUEsT0FBTyxNQUFNLENBQUM7YUFDZjtZQUNELEtBQUssTUFBTSxLQUFLLElBQUk7Z0JBQ2xCLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBQztnQkFDL0IsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFDO2dCQUMvQixFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUM7Z0JBQy9CLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBQztJQUNoQyxTQUFBLEVBQUU7SUFDRCxZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEIsWUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDdkIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFLLEVBQUEsRUFBQSxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBTSxJQUFBLENBQUEsQ0FBQyxDQUFDO0lBQ3RDLFlBQUEsS0FBSyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDaEM7SUFDRCxRQUFBLE9BQU8sTUFBTSxDQUFDO1NBQ2Y7UUFDRCxRQUFRLEdBQUE7WUFDTixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3hDOztJQXZZTSxRQUFXLENBQUEsV0FBQSxHQUFHLENBQUMsQ0FBQztJQUNoQixRQUFRLENBQUEsUUFBQSxHQUFHLENBQUMsQ0FBQztJQUNiLFFBQUEsQ0FBQSwyQkFBMkIsR0FBRyxDQUNqQyxHQUFTLEVBQ1QsQ0FBTSxFQUNOLFFBQXVCLEtBQ3RCLENBQUcsRUFBQSxHQUFHLENBQUMsQ0FBQyxDQUFBLENBQUEsRUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFOztJQ2hEcEIsTUFBTyxnQ0FBaUMsU0FBUSxLQUFLLENBQUE7SUFDekQsSUFBQSxXQUFBLENBQVksT0FBZSxFQUFBO1lBQ3pCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNoQjtJQUNGLENBQUE7VUFnQ1ksV0FBVyxDQUFBO1FBSXRCLFdBQVksQ0FBQSxNQUFZLEVBQUUsT0FFekIsRUFBQTtZQUNDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQy9DLFFBQUEsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztTQUN0RDtJQUNELElBQUEsSUFBSSxJQUFJLEdBQUE7SUFDTixRQUFBLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7U0FDNUI7SUFDRCxJQUFBLElBQUksTUFBTSxHQUFBO0lBQ1IsUUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO1NBQzlCO0lBQ0QsSUFBQSxHQUFHLENBQUMsQ0FBSSxFQUFBO1lBQ04sTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVDLFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDcEMsTUFBTSxJQUFJLGdDQUFnQyxDQUN0QyxDQUFZLFNBQUEsRUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFvQixrQkFBQSxDQUFBO0lBQ3hELGdCQUFBLENBQUEsQ0FBQSxFQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBRSxDQUFBLENBQUMsQ0FBQzthQUNsRDtJQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQUksQ0FBQyxDQUFJLEVBQUUsRUFBUSxFQUFBO0lBQ2pCLFFBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQy9EO0lBQ0QsSUFBQSxNQUFNLENBQUMsQ0FBSSxFQUFBO0lBQ1QsUUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUM3RDtJQUNELElBQUEsR0FBRyxDQUFDLENBQUksRUFBQTtJQUNOLFFBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDMUQ7UUFDRCxLQUFLLEdBQUE7SUFDSCxRQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDeEI7UUFDRCxPQUFPLENBQ0gsVUFBc0QsRUFDdEQsT0FBYSxFQUFBO0lBRWYsUUFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUM3QixDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssTUFBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUssRUFBRSxDQUFDLENBQUMsSUFBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQ3JELE1BQUssQ0FBQyxDQUFDLENBQ1YsQ0FBQztTQUNIO1FBQ0QsT0FBTyxHQUFBO1lBQ0wsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FDakMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSyxFQUFFLENBQUMsQ0FBQyxJQUFLLENBQUMsQ0FBUSxDQUFDO1NBQ3ZDO1FBQ0QsSUFBSSxHQUFBO0lBQ0YsUUFBQSxPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUN0QjtRQUNELE1BQU0sR0FBQTtJQUNKLFFBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FDakMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUssQ0FBUSxDQUFDO1NBQzVCO0lBQ0QsSUFBQSxLQUFLLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBQTtJQUN0QixRQUFBLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUNsQztRQUNELENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFBO0lBQ2YsUUFBQSxPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUN0QjtJQUNELElBQUEsZUFBZSxDQUNYLEtBQXdCLEVBQUE7WUFFMUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQ1gsQ0FBQztTQUNsQztJQVNELElBQUEsV0FBVyxDQUNQLG1CQUFxRCxFQUNyRCwwQkFBd0QsRUFDeEQsWUFBZ0IsRUFBQTtJQUNsQixRQUFBLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQzdCLG1CQUE0QixFQUM1QiwwQkFBaUMsRUFDakMsWUFBWSxDQUFDLENBQUM7U0FDbkI7SUFFRCxJQUFBLFVBQVUsQ0FDTixLQUFhLEVBQUE7WUFFZixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBUSxDQUFDO1NBQ2hEO1FBU0QsWUFBWSxDQUNSLGtCQUM0RCxFQUM1RCxXQUE4RCxFQUFBO1lBRWhFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGtCQUF5QixFQUFFLFdBQWtCLENBQUMsQ0FBQztTQUM1RTtRQVNELFFBQVEsQ0FDSixjQUF1RSxFQUN2RSxPQUF1RCxFQUFBO1lBRXpELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsY0FBdUIsRUFBRSxPQUFjLENBQUMsQ0FBQztTQUN6RTtJQUNELElBQUEsU0FBUyxDQUNMLEtBQVksRUFBQTtZQUVkLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDeEM7O0lBNUhNLFdBQUEsQ0FBQSxzQkFBc0IsR0FBRyxRQUFRLENBQUMsMkJBQTJCOztJQzlDdEUsTUFBTSxTQUFTLEdBQ2IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFzQixDQUFDO0lBQzdELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFFLENBQUM7SUFFM0MsTUFBTSxpQkFBaUIsR0FDckIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFzQixDQUFDO0lBQ3JFLE1BQU0sY0FBYyxHQUFHLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQztJQUUzRCxNQUFNLElBQUksQ0FBQTtJQUdSLElBQUEsSUFBSSxRQUFRLEdBQUE7WUFDVixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7U0FDdkI7UUFDRCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUE7WUFDWixJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFO0lBQ3ZCLFlBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7YUFDcEI7aUJBQU07SUFDTCxZQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQSxlQUFBLEVBQWtCLElBQUksQ0FBQyxFQUFFLENBQU8sSUFBQSxFQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUksRUFBQSxDQUFBO29CQUNuRSxDQUFhLFVBQUEsRUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBRSxDQUFBLENBQUMsQ0FBQzthQUNsRDtTQUNGO1FBQ0QsV0FBWSxDQUFBLEVBQVUsRUFBRSxRQUFjLEVBQUE7SUFDcEMsUUFBQSxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztJQUNiLFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7SUFDMUIsUUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2pCO0lBQ0YsQ0FBQTtJQUVELE1BQU0sS0FBSyxHQUFHLElBQUksV0FBVyxDQUFPO0lBQ2xDLElBQUEsSUFBSSxFQUFFLEVBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBQztJQUN2RCxJQUFBLE1BQU0sRUFBRSxFQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7S0FDMUQsRUFBRTtRQUNELGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssSUFBSyxDQUFDLEVBQUU7UUFDcEMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVE7SUFDdEMsQ0FBQSxDQUFDLENBQUM7SUFFSCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDbEIsU0FBUyxVQUFVLEdBQUE7SUFDakIsSUFBQSxJQUFJLFNBQVMsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7WUFDeEMsU0FBUyxHQUFHLENBQUMsQ0FBQztZQUNkLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUNmO1FBQ0QsT0FBTyxFQUFFLFNBQVMsQ0FBQztJQUNyQixDQUFDO0lBQ0QsU0FBUyxjQUFjLEdBQUE7UUFDckIsT0FBTztJQUNMLFFBQUEsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxLQUFZLENBQUM7SUFDckQsUUFBQSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLE1BQWEsQ0FBQztTQUN2RCxDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQztJQUN6QixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQzFELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLENBQUM7SUFFekQsTUFBTSxLQUFLLEdBQXVCLEVBQUUsQ0FBQztJQUNyQyxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN4QixTQUFTLFVBQVUsQ0FBQyxDQUFPLEVBQUE7UUFDekIsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxTQUFTLEVBQUU7SUFDbEMsUUFBQSxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssU0FBUyxFQUFFO0lBQzlELFlBQUEsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDMUIsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQ3JCO2lCQUFNO0lBQ0wsWUFBQSxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDdEQ7U0FDRjthQUFNO0lBQ0wsUUFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2Y7SUFDRCxJQUFBLE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQUNELFNBQVMsU0FBUyxHQUFBO1FBQ2hCLE9BQU8sSUFBSSxFQUFFO0lBQ1gsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkQsUUFBQSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUIsUUFBQSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7SUFDdEIsWUFBQSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsU0FBUyxDQUFDO2dCQUN6QixjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQ3ZCLFlBQUEsT0FBTyxJQUFJLENBQUM7YUFDYjtTQUNGO0lBQ0gsQ0FBQztJQUNELFNBQVMsbUJBQW1CLENBQUMsQ0FBTyxFQUFBO1FBQ2xDLE9BQU8sSUFBSSxFQUFFO0lBQ1gsUUFBQSxNQUFNLEdBQUcsR0FBRztJQUNWLFlBQUEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztJQUMxQyxZQUFBLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7YUFDM0MsQ0FBQztZQUNGLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztJQUFFLFlBQUEsT0FBTyxHQUFHLENBQUM7U0FDckQ7SUFDSCxDQUFDO0lBQ0QsU0FBUyxXQUFXLENBQUMsTUFBeUIsRUFBRSxHQUFlLEVBQUE7SUFDN0QsSUFBQSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUM1QyxPQUFPO0lBQ0wsUUFBQSxDQUFDLEVBQUUsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSTtJQUMxQixRQUFBLENBQUMsRUFBRSxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHO1NBQzFCLENBQUM7SUFDSixDQUFDO0lBQ0QsSUFBSSxRQUFRLEdBQVMsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQztJQUNsQyxTQUFTLENBQUMsV0FBVyxHQUFHLFVBQVMsR0FBZSxFQUFBO0lBQzlDLElBQUEsUUFBUSxHQUFHLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDO0lBQ0YsaUJBQWlCLENBQUMsV0FBVyxHQUFHLFVBQVMsR0FBZSxFQUFBO0lBQ3RELElBQUEsUUFBUSxHQUFHLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRCxDQUFDLENBQUM7SUFFRixJQUFJLGlCQUFzQyxDQUFDO0lBQzNDLFNBQVMsT0FBTyxDQUFDLFNBQThCLEVBQUE7SUFDN0MsSUFBQSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2QsSUFBQSxNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUN6QixJQUFBLE9BQU8sS0FBSyxDQUFDLElBQUksR0FBRyxTQUFTLEVBQUU7SUFDN0IsUUFBQSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4QixVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3REO0lBQ0QsSUFBQSxLQUFLLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsbUJBQW1CLEVBQUUsQ0FBQyxFQUFFLEVBQUU7SUFDeEMsUUFBQSxNQUFNLElBQUksR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsUUFBUSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNuRCxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbEI7SUFDRCxJQUFBLEtBQUssSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxrQkFBa0IsRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUN2QyxRQUFBLE1BQU0sSUFBSSxHQUFHLFNBQVMsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLENBQWlCLGVBQUEsQ0FBQTtJQUMvQixnQkFBQSxDQUFBLEVBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQSxDQUFBLEVBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUEsQ0FBRSxDQUFDLENBQUM7YUFDbEQ7WUFDRCxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3REOztRQUVELElBQUksaUJBQWlCLEVBQUU7SUFDckIsUUFBQSxNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztJQUMxQixRQUFBLE1BQU0sQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO1lBQzNCLE1BQU0sQ0FBQyxRQUFRLENBQ1gsQ0FBQSxFQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFFLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUEsSUFBQSxDQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ3hFO1FBQ0QsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRWpCLElBQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUN6QixpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkQsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3RCLElBQUEsY0FBYyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDbkMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxHQUFHLEVBQUMsS0FBSTtJQUN6RSxRQUFBLGNBQWMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1QyxRQUFBLFVBQVUsRUFBRyxDQUFDO0lBQ2hCLEtBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBQSxjQUFjLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztJQUNuQyxJQUFBLGNBQWMsQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO0lBQ25DLElBQUEsY0FBYyxDQUFDLFFBQVEsQ0FDbkIsR0FBRyxVQUFVLENBQUEsQ0FBQSxFQUFJLEtBQUssQ0FBQyxJQUFJLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLEdBQUcsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN6QixpQkFBaUIsR0FBRyxTQUFTLENBQUM7UUFDOUIscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUNELE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUM7Ozs7OzsifQ==
