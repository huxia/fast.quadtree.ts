
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.1.1
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5icm93c2VyLnRlc3QuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb2xsZWN0aW9uLnRzIiwiLi4vLi4vc3JjL3NoYXBlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlU2V0LnRzIiwiLi4vLi4vdGVzdC9icm93c2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbjxUPiA9IEl0ZXJhdG9yPFQ+IHwgQXJyYXk8VD47XG5leHBvcnQgdHlwZSBJdGVyYWJsZTxUPiA9IEl0ZXJhYmxlSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCBuYW1lc3BhY2UgQ29sbGVjdGlvbiB7XG4gIGV4cG9ydCBmdW5jdGlvbiB0b0FycmF5PFQ+KGM6IENvbGxlY3Rpb248VD4pIHtcbiAgICBpZiAoYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgY29uc3QgcjogVFtdID0gW107XG4gICAgaWYgKChjIGFzIEdlbmVyYXRvcjxUPilbU3ltYm9sLml0ZXJhdG9yXSkge1xuICAgICAgZm9yIChjb25zdCBpIG9mIChjIGFzIEdlbmVyYXRvcjxUPikpIHtcbiAgICAgICAgci5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGxldCBpID0gYy5uZXh0KCk7XG4gICAgd2hpbGUgKCFpLmRvbmUpIHtcbiAgICAgIHIucHVzaChpLnZhbHVlKTtcbiAgICAgIGkgPSBjLm5leHQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlPFQ+KFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICh1bmRlZmluZWQgfCAoKCkgPT4gQ29sbGVjdGlvbjxUPikpW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aEZpbHRlcjxUPihcbiAgICAgIGZpbHRlckZ1bmM6ICgobzogVCwgaWR4OiBudW1iZXIpID0+IGJvb2xlYW4pLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgICAgIC4uLmNoaWxkSXRlcmF0b3JzOiAodW5kZWZpbmVkIHwgQ29sbGVjdGlvbjxUPiB8ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KSlbXVxuICApIHtcbiAgICBpZiAoIWZpbHRlckZ1bmMpIHtcbiAgICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IHR5cGVvZiBmdW5jID09PSAnZnVuY3Rpb24nID8gZnVuYygpIDogZnVuYztcbiAgICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgICAgeWllbGQgcmVzdWx0O1xuICAgICAgICAgICAgaW5kZXguaW5kZXgrKztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgICBpbmRleC5pbmRleCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IGZ1bmMgb2YgY2hpbGRJdGVyYXRvcnMpIHtcbiAgICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJyA/IGZ1bmMoKSA6IGZ1bmM7XG4gICAgICAgIGlmIChpdGVyYXRvciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJGdW5jKHJlc3VsdCwgaW5kZXguaW5kZXgrKykpIHtcbiAgICAgICAgICAgICAgeWllbGQgcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJGdW5jKHJlc3VsdC52YWx1ZSwgaW5kZXguaW5kZXgrKykpIHtcbiAgICAgICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24qIHRvSXRlcmFibGVXaXRoTWFwPFQsIEE+KFxuICAgICAgbWFwRnVuYzogKChvOiBULCBpZHg6IG51bWJlcikgPT4gQSksXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICh1bmRlZmluZWQgfCBDb2xsZWN0aW9uPFQ+IHwgKCgpID0+IENvbGxlY3Rpb248VD4pKVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gdHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbicgPyBmdW5jKCkgOiBmdW5jO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICB5aWVsZCBtYXBGdW5jKHJlc3VsdCwgaW5kZXguaW5kZXgrKyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICB5aWVsZCBtYXBGdW5jKHJlc3VsdC52YWx1ZSwgaW5kZXguaW5kZXgrKyk7XG4gICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiogb2JqZWN0VmFsdWVzVG9JdGVyYWJsZTxULCBBPihcbiAgICAgIG9iamVjdDogUmVjb3JkPHN0cmluZywgVD4sXG4gICAgICBmaWx0ZXJGdW5jOiB1bmRlZmluZWQgfCAoKG86IFQsIGlkeDogbnVtYmVyKSA9PiBib29sZWFuKSxcbiAgICAgIG1hcEZ1bmM6IHVuZGVmaW5lZCB8ICgobzogVCwgaWR4OiBudW1iZXIpID0+IEEpLFxuICAgICAgaW5kZXg6IHtpbmRleDogbnVtYmVyfSxcbiAgKSB7XG4gICAgaWYgKGZpbHRlckZ1bmMpIHtcbiAgICAgIGlmIChtYXBGdW5jKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmModmFsdWUsIGluZGV4LmluZGV4KSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHlpZWxkIG1hcEZ1bmModmFsdWUsIGluZGV4LmluZGV4KyspO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgICAgICAgaWYgKCFmaWx0ZXJGdW5jKHZhbHVlLCBpbmRleC5pbmRleCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB5aWVsZCB2YWx1ZTtcbiAgICAgICAgICBpbmRleC5pbmRleCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChtYXBGdW5jKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgeWllbGQgbWFwRnVuYyhvYmplY3Rba2V5XSwgaW5kZXguaW5kZXgrKyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBndWFyZC1mb3ItaW5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgeWllbGQgb2JqZWN0W2tleV07XG4gICAgICAgICAgaW5kZXguaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiZXhwb3J0IGludGVyZmFjZSBWZWMyIHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG59XG5leHBvcnQgaW50ZXJmYWNlIEFBQkIge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IFZlYzI7XG59XG5leHBvcnQgbmFtZXNwYWNlIEFBQkIge1xuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNWZWMoYWFiYjogQUFCQiwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGFhYmIuY2VudGVyLnggLSBhYWJiLnNpemUueCA8PSB2ZWMueCAmJlxuICAgICAgdmVjLnggPD0gYWFiYi5jZW50ZXIueCArIGFhYmIuc2l6ZS54ICYmXG4gICAgICBhYWJiLmNlbnRlci55IC0gYWFiYi5zaXplLnkgPD0gdmVjLnkgJiZcbiAgICAgIHZlYy55IDw9IGFhYmIuY2VudGVyLnkgKyBhYWJiLnNpemUueTtcbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNBQUJCKG9uZTogQUFCQiwgYW5vdGhlcjogQUFCQik6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhKFxuICAgICAgYW5vdGhlci5jZW50ZXIueCAtIGFub3RoZXIuc2l6ZS54ID4gb25lLmNlbnRlci54ICsgb25lLnNpemUueCB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueCArIGFub3RoZXIuc2l6ZS54IDwgb25lLmNlbnRlci54IC0gb25lLnNpemUueCB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueSAtIGFub3RoZXIuc2l6ZS55ID4gb25lLmNlbnRlci55ICsgb25lLnNpemUueSB8fFxuICAgICAgYW5vdGhlci5jZW50ZXIueSArIGFub3RoZXIuc2l6ZS55IDwgb25lLmNlbnRlci55IC0gb25lLnNpemUueVxuICAgICk7XG4gIH1cbn1cbnR5cGUgUmVjdGFuZ2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdyZWN0YW5nbGUnXG59ICYgQUFCQjtcbnR5cGUgRWxsaXBzZVNoYXBlID0ge1xuICB0eXBlOiAnZWxsaXBzZSdcbn0gJiBBQUJCO1xudHlwZSBDaXJjbGVTaGFwZSA9IHtcbiAgdHlwZTogJ2NpcmNsZSdcbn0gJiB7XG4gIGNlbnRlcjogVmVjMjtcbiAgc2l6ZTogbnVtYmVyO1xufTtcbnR5cGUgU3F1YXJlU2hhcGUgPSB7XG4gIHR5cGU6ICdzcXVhcmUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG5leHBvcnQgdHlwZSBTaGFwZSA9IFJlY3RhbmdsZVNoYXBlIHwgRWxsaXBzZVNoYXBlIHwgQ2lyY2xlU2hhcGUgfCBTcXVhcmVTaGFwZTtcbmV4cG9ydCBuYW1lc3BhY2UgU2hhcGUge1xuICBleHBvcnQgZnVuY3Rpb24gb3ZlcmxhcHNWZWMoc2hhcGU6IFNoYXBlLCB2ZWM6IFZlYzIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ3JlY3RhbmdsZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHNoYXBlLCB2ZWMpO1xuICAgICAgY2FzZSAnc3F1YXJlJzogcmV0dXJuIEFBQkIub3ZlcmxhcHNWZWMoe1xuICAgICAgICBjZW50ZXI6IHNoYXBlLmNlbnRlcixcbiAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgfSwgdmVjKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6IHJldHVybiBTaGFwZS5vdmVybGFwc1ZlYyh7XG4gICAgICAgIHR5cGU6ICdlbGxpcHNlJyxcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdlbGxpcHNlJzoge1xuICAgICAgICBjb25zdCBwID1cbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueCAtIHNoYXBlLmNlbnRlci54LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueCwgMikgK1xuICAgICAgICAgIE1hdGgucG93KHZlYy55IC0gc2hhcGUuY2VudGVyLnksIDIpIC8gTWF0aC5wb3coc2hhcGUuc2l6ZS55LCAyKTtcbiAgICAgICAgcmV0dXJuIHAgPD0gMTtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBwb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlOiBTaGFwZSwgYWFiYjogQUFCQik6IGJvb2xlYW4ge1xuICAgIHN3aXRjaCAoc2hhcGUudHlwZSkge1xuICAgICAgY2FzZSAnZWxsaXBzZSc6XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoc2hhcGUsIGFhYmIpO1xuICAgICAgY2FzZSAnY2lyY2xlJzpcbiAgICAgIGNhc2UgJ3NxdWFyZSc6XG4gICAgICAgIHJldHVybiBBQUJCLm92ZXJsYXBzQUFCQih7XG4gICAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgICAgc2l6ZToge3g6IHNoYXBlLnNpemUsIHk6IHNoYXBlLnNpemV9LFxuICAgICAgICB9LCBhYWJiKTtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZWN0YW5nbGUoY2VudGVyOiBWZWMyLCBzaXplOiBWZWMyIHwgbnVtYmVyKTogU2hhcGUge1xuICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdzcXVhcmUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAncmVjdGFuZ2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsbGlwc2UoY2VudGVyOiBWZWMyLCBzaXplOiBWZWMyIHwgbnVtYmVyKTogU2hhcGUge1xuICAgIGlmICh0eXBlb2Ygc2l6ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdjaXJjbGUnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQge0NvbGxlY3Rpb24sIEl0ZXJhYmxlfSBmcm9tICcuL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtWZWMyLCBBQUJCLCBTaGFwZX0gZnJvbSAnLi9zaGFwZSc7XG5cbmV4cG9ydCB0eXBlIFF1YWRUcmVlVW5pdEtleUZ1bmM8VD4gPSAoXG4gIHZlYzogVmVjMiwgdW5pdDogVCwgcXVhZFRyZWU6IFF1YWRUcmVlPFQ+XG4pID0+IHN0cmluZyB8IG51bWJlcjtcbmV4cG9ydCB0eXBlIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiA9IChcbiAgICBhY2M6IEEsXG4gICAgcHJldmlvdXM6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSxcbiAgICBpbmRleDogbnVtYmVyLFxuKSA9PiBBIHwgdW5kZWZpbmVkO1xuZXhwb3J0IGludGVyZmFjZSBRdWFkVHJlZU9wdGlvbnM8VD4ge1xuICB1bml0S2V5R2V0dGVyOiBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+LFxuICBpbnRlZ2VyQ29vcmRpbmF0ZT86IGJvb2xlYW4sXG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWU8VD4ge1xuICByZWFkb25seSBib3VuZHM6IEFBQkI7XG4gIHJlYWRvbmx5IHNpemU6IG51bWJlclxuICBoYXModmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlTaXplKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICApOiBudW1iZXI7XG59XG5leHBvcnQgY2xhc3MgUXVhZFRyZWU8VD4gaW1wbGVtZW50cyBSZWFkb25seVF1YWRUcmVlPFQ+IHtcbiAgc3RhdGljIE1heEVsZW1lbnRzID0gODtcbiAgc3RhdGljIE1heERlcHRoID0gODtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyA9IChcbiAgICAgIHZlYzogVmVjMixcbiAgICAgIF86IGFueSxcbiAgICAgIHF1YWRUcmVlOiBRdWFkVHJlZTxhbnk+LFxuICApID0+XG4gICAgcXVhZFRyZWUub3B0aW9ucy5pbnRlZ2VyQ29vcmRpbmF0ZSA/XG4gICAgICB2ZWMueCArIChxdWFkVHJlZS5ib3VuZHMuc2l6ZS54ICogMikgKiB2ZWMueSA6XG4gICAgICBgJHt2ZWMueH0sJHt2ZWMueX1gO1xuXG4gIGJvdW5kczogQUFCQjtcblxuICBwcml2YXRlIGRlcHRoOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBkaXZpZGVkOiBib29sZWFuO1xuXG4gIHByaXZhdGUgdW5pdHM6IHtba2V5OiBzdHJpbmcgfCBudW1iZXJdOiB7dW5pdDogVCwgdmVjOiBWZWMyfX07XG5cbiAgcHJpdmF0ZSBub3J0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBub3J0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBfc2l6ZTogbnVtYmVyO1xuXG4gIGdldCBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLl9zaXplO1xuICB9XG5cbiAgcmVhZG9ubHkgb3B0aW9uczogUXVhZFRyZWVPcHRpb25zPFQ+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgYm91bmRzOiBBQUJCLFxuICAgICAgb3B0aW9ucz86IFF1YWRUcmVlT3B0aW9uczxUPixcbiAgICAgIGRlcHRoOiBudW1iZXIgPSAwLFxuICApIHtcbiAgICB0aGlzLmJvdW5kcyA9IGJvdW5kcztcbiAgICB0aGlzLmRlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5kaXZpZGVkID0gZmFsc2U7XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICAgIHRoaXMuX3NpemUgPSAwO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge1xuICAgICAgdW5pdEtleUdldHRlcjogUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jLFxuICAgIH07XG4gIH1cbiAgX2FkZCh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBmYWxzZSB8ICdhZGRlZCcgfCAnZXhpc3RpbmcnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5kZXB0aCA9PSBRdWFkVHJlZS5NYXhEZXB0aCB8fFxuICAgICAgIXRoaXMuZGl2aWRlZCAmJiB0aGlzLnNpemUgPCBRdWFkVHJlZS5NYXhFbGVtZW50cykge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIGxldCByZXN1bHQ6ICdleGlzdGluZycgfCAnYWRkZWQnID0gJ2V4aXN0aW5nJztcbiAgICAgIGlmICghdGhpcy51bml0c1trZXldKSB7XG4gICAgICAgIHRoaXMuX3NpemUgKys7XG4gICAgICAgIHJlc3VsdCA9ICdhZGRlZCc7XG4gICAgICB9XG4gICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjLCB1bml0fTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB0aGlzLmRpdmlkZSgpO1xuICAgIGNvbnN0IGluc2VydGVkID0gdGhpcy5ub3J0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpO1xuICAgIGlmIChpbnNlcnRlZCA9PT0gJ2FkZGVkJykgdGhpcy5fc2l6ZSArKztcbiAgICByZXR1cm4gaW5zZXJ0ZWQ7XG4gIH1cbiAgYWRkKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuX2FkZCh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgX21vdmUoXG4gICAgICBmcm9tOiBWZWMyLFxuICAgICAgdG86IFZlYzIgfCB1bmRlZmluZWQsXG4gICAgICB1bml0OiBULFxuICApOiBmYWxzZSB8ICdyZW1vdmVkJyB8ICdtb3ZlZCcge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgZnJvbSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIoZnJvbSwgdW5pdCwgdGhpcyk7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodG8gJiYgQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdG8pKSB7XG4gICAgICAgIC8vIHVwZGF0ZSBpbi1wbGFjZVxuICAgICAgICBjb25zdCBuZXdLZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih0bywgdW5pdCwgdGhpcyk7XG4gICAgICAgIGlmIChuZXdLZXkgIT09IGtleSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICAgICAgdGhpcy51bml0c1tuZXdLZXldID0ge3ZlYzogdG8sIHVuaXR9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudW5pdHNba2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ21vdmVkJztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICB0aGlzLl9zaXplIC0tO1xuICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ub3J0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5ub3J0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpO1xuICAgIGlmIChyZXN1bHQgPT09ICdyZW1vdmVkJykge1xuICAgICAgdGhpcy5fc2l6ZSAtLTtcbiAgICAgIGlmICh0bykge1xuICAgICAgICBpZiAodGhpcy5hZGQodG8sIHVuaXQpKSByZXR1cm4gJ21vdmVkJztcbiAgICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBtb3ZlKGZyb206IFZlYzIsIHRvOiBWZWMyLCB1bml0OiBUKTogYm9vbGVhbiB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB0bykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5fbW92ZShmcm9tLCB0bywgdW5pdCkgPT09ICdyZW1vdmVkJykgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRlKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9tb3ZlKHZlYywgdW5kZWZpbmVkLCB1bml0KSA9PT0gJ3JlbW92ZWQnO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLl9zaXplID0gMDtcbiAgICB0aGlzLmRpdmlkZWQgPSBmYWxzZTtcbiAgICB0aGlzLm5vcnRoV2VzdCA9XG4gICAgICB0aGlzLm5vcnRoRWFzdCA9XG4gICAgICB0aGlzLnNvdXRoV2VzdCA9XG4gICAgICB0aGlzLnNvdXRoRWFzdCA9IHVuZGVmaW5lZCE7XG4gIH1cbiAgaGFzKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdmVjKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih2ZWMsIHVuaXQsIHRoaXMpO1xuICAgICAgcmV0dXJuICEhdGhpcy51bml0c1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub3J0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuaGFzKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBkaXZpZGUoKSB7XG4gICAgdGhpcy5kaXZpZGVkID0gdHJ1ZTtcbiAgICBjb25zdCBodyA9IHRoaXMuYm91bmRzLnNpemUueCAvIDI7XG4gICAgY29uc3QgaGggPSB0aGlzLmJvdW5kcy5zaXplLnkgLyAyO1xuXG4gICAgdGhpcy5ub3J0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgLSBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMubm9ydGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLnNvdXRoV2VzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCAtIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSArIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aEVhc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggKyBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuXG4gICAgZm9yIChjb25zdCB7dmVjLCB1bml0fSBvZiBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpKSB7XG4gICAgICB0aGlzLm5vcnRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5hZGQodmVjLCB1bml0KTtcbiAgICB9XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICB9XG4gIHByaXZhdGUgX3F1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIG1hcEZ1bmM6ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpZHg6IG51bWJlcikgPT4gQSkgfCB1bmRlZmluZWQsXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApOiBJdGVyYWJsZTxBPiB7XG4gICAgaWYgKHNoYXBlICYmICFTaGFwZS5wb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlLCB0aGlzLmJvdW5kcykpIHJldHVybiBbXTtcblxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICByZXR1cm4gQ29sbGVjdGlvbi5vYmplY3RWYWx1ZXNUb0l0ZXJhYmxlKFxuICAgICAgICAgIHRoaXMudW5pdHMsXG4gICAgICAgICAgc2hhcGUgPyAodikgPT4gU2hhcGUub3ZlcmxhcHNWZWMoc2hhcGUsIHYudmVjKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBtYXBGdW5jLFxuICAgICAgICAgIGluZGV4LFxuICAgICAgKSBhcyBJdGVyYWJsZTxBPjtcbiAgICB9XG4gICAgaWYgKG1hcEZ1bmMpIHtcbiAgICAgIHJldHVybiBDb2xsZWN0aW9uLnRvSXRlcmFibGVXaXRoTWFwKFxuICAgICAgICAgIG1hcEZ1bmMsXG4gICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgKCkgPT4gdGhpcy5ub3J0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgKCkgPT4gdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgKCkgPT4gdGhpcy5zb3V0aFdlc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICAgKCkgPT4gdGhpcy5zb3V0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gQ29sbGVjdGlvbi50b0l0ZXJhYmxlKFxuICAgICAgICAoKSA9PiB0aGlzLm5vcnRoV2VzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICAgICAgKCkgPT4gdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5SXRlcmF0YWJsZShzaGFwZSwgdW5kZWZpbmVkLCBpbmRleCksXG4gICAgICAgICgpID0+IHRoaXMuc291dGhXZXN0Ll9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIHVuZGVmaW5lZCwgaW5kZXgpLFxuICAgICAgICAoKSA9PiB0aGlzLnNvdXRoRWFzdC5fcXVlcnlJdGVyYXRhYmxlKHNoYXBlLCB1bmRlZmluZWQsIGluZGV4KSxcbiAgICApO1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGlkeDogbnVtYmVyKSA9PiBBLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmNPclNoYXBlPzogKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGlkeDogbnVtYmVyKSA9PiBBKSB8IFNoYXBlLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT4ge1xuICAgIGlmICh0eXBlb2YgbWFwRnVuY09yU2hhcGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeUl0ZXJhdGFibGUoc2hhcGUsIG1hcEZ1bmNPclNoYXBlLCB7aW5kZXg6IDB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5SXRlcmF0YWJsZSh1bmRlZmluZWQsIHVuZGVmaW5lZCwge2luZGV4OiAwfSk7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgX3F1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU6IEEgfCB1bmRlZmluZWQsXG4gICAgICBpbmRleDoge2luZGV4OiBudW1iZXJ9LFxuICApOiBBIHtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkge1xuICAgICAgcmV0dXJuIGluaXRpYWxWYWx1ZSE7XG4gICAgfVxuICAgIGxldCB2YWx1ZTogQSA9IGluaXRpYWxWYWx1ZSE7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGlmIChzaGFwZSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3QgayBpbiB0aGlzLnVuaXRzKSB7XG4gICAgICAgICAgY29uc3QgdW5pdCA9IHRoaXMudW5pdHNba107XG4gICAgICAgICAgaWYgKFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlLCB1bml0LnZlYykpIHtcbiAgICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2tGdW5jKHZhbHVlLCB1bml0LCBpbmRleC5pbmRleCsrKSE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgICAgIGZvciAoY29uc3QgayBpbiB0aGlzLnVuaXRzKSB7XG4gICAgICAgICAgY29uc3QgdW5pdCA9IHRoaXMudW5pdHNba107XG4gICAgICAgICAgdmFsdWUgPSBjYWxsYmFja0Z1bmModmFsdWUsIHVuaXQsIGluZGV4LmluZGV4KyspITtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhXZXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHZhbHVlID0gdGhpcy5ub3J0aEVhc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlLCBpbmRleCk7XG4gICAgdmFsdWUgPSB0aGlzLnNvdXRoV2VzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUsIGluZGV4KTtcbiAgICB2YWx1ZSA9IHRoaXMuc291dGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSwgaW5kZXgpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmM6IFNoYXBlIHwgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWU6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiB8IEEsXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQSB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yQ2FsbGJhY2tGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2UoXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgQSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgICAgIGluaXRpYWxWYWx1ZSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4+KFxuICAgICAgICBzaGFwZSxcbiAgICAgICAgKGFyciwgdikgPT4ge1xuICAgICAgICAgIGFyci5wdXNoKHYpO1xuICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgIH0sXG4gICAgICAgIFtdLFxuICAgICAgICB7aW5kZXg6IDB9LFxuICAgICk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckZvcmVhY2hGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBzaGFwZU9yRm9yZWFjaEZ1bmModiwgaW5kZXgpLFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFmb3JlYWNoRnVuYykgcmV0dXJuO1xuICAgICAgdGhpcy5fcXVlcnlSZWR1Y2U8dm9pZD4oXG4gICAgICAgICAgc2hhcGVPckZvcmVhY2hGdW5jLFxuICAgICAgICAgIChfLCB2LCBpbmRleCkgPT4gZm9yZWFjaEZ1bmModiwgaW5kZXgpLFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yTWFwRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2goc2hhcGVPck1hcEZ1bmModiwgaW5kZXgpKTtcbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBbXSxcbiAgICAgICAgICB7aW5kZXg6IDB9LFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHNoYXBlT3JNYXBGdW5jLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChtYXBGdW5jKHYsIGluZGV4KSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10sXG4gICAgICAgICAge2luZGV4OiAwfSxcbiAgICAgICk7XG4gICAgfVxuICB9XG4gIHF1ZXJ5U2l6ZShcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8bnVtYmVyPihcbiAgICAgICAgc2hhcGUsXG4gICAgICAgIChzaXplKSA9PiBzaXplICsgMSxcbiAgICAgICAgMCxcbiAgICAgICAge2luZGV4OiAwfSxcbiAgICApO1xuICB9XG4gIF9kdW1wVG9TdHJpbmcocmVzdWx0OiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHByZWZpeCA9ICcgICAgICAgICAgICAnLnN1YnN0cmluZygwLCB0aGlzLmRlcHRoKTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgcmVzdWx0LnB1c2gocHJlZml4KTtcbiAgICAgIHJlc3VsdC5wdXNoKEpTT04uc3RyaW5naWZ5KHRoaXMudW5pdHMpKTtcbiAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgW1xuICAgICAge3N0cjogJ05XJywgcXQ6IHRoaXMubm9ydGhXZXN0fSxcbiAgICAgIHtzdHI6ICdORScsIHF0OiB0aGlzLm5vcnRoRWFzdH0sXG4gICAgICB7c3RyOiAnU1cnLCBxdDogdGhpcy5zb3V0aFdlc3R9LFxuICAgICAge3N0cjogJ1NFJywgcXQ6IHRoaXMuc291dGhFYXN0fSxcbiAgICBdKSB7XG4gICAgICByZXN1bHQucHVzaChwcmVmaXgpO1xuICAgICAgcmVzdWx0LnB1c2goY2hpbGQuc3RyKTtcbiAgICAgIHJlc3VsdC5wdXNoKGAgKCR7Y2hpbGQucXQuc2l6ZX0pOlxcbmApO1xuICAgICAgY2hpbGQucXQuX2R1bXBUb1N0cmluZyhyZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2R1bXBUb1N0cmluZyhbXSkuam9pbignJyk7XG4gIH1cbn1cbiIsImltcG9ydCB7XG4gIFF1YWRUcmVlLFxuICBRdWFkVHJlZU9wdGlvbnMsXG59IGZyb20gJy4vUXVhZFRyZWUnO1xuaW1wb3J0IHtBQUJCLCBTaGFwZSwgVmVjMn0gZnJvbSAnLi9zaGFwZSc7XG5cbmV4cG9ydCB0eXBlIFF1YWRNYXBVbml0UG9zaXRpb25HZXR0ZXJGdW5jPFQ+ID0gKG86IFQpID0+IFZlYzI7XG5leHBvcnQgdHlwZSBRdWFkTWFwVW5pdFBvc2l0aW9uU2V0dGVyRnVuYzxUPiA9IChvOiBULCBwb3NpdGlvbjogVmVjMikgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiA9IChcbiAgYWNjOiBBLFxuICBwcmV2aW91czoge3ZlYzogVmVjMiwgdW5pdDogVH0sXG4gIGluZGV4OiBudW1iZXIsXG4pID0+IEEgfCB1bmRlZmluZWQ7XG5leHBvcnQgY2xhc3MgUXVhZFRyZWVQb3NpdGlvbk91dE9mQm91bmRzRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICB9XG59XG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5UXVhZFRyZWVTZXQ8VD4gZXh0ZW5kcyBSZWFkb25seVNldDxUPiB7XG4gIHJlYWRvbmx5IGJvdW5kczogQUFCQjtcbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogU2V0SXRlcmF0b3I8VD47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeU1hcDxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVNldDxUPiBpbXBsZW1lbnRzIFNldDxUPiwgUmVhZG9ubHlRdWFkVHJlZVNldDxUPiB7XG4gIHN0YXRpYyBVbmlxdWVVbml0QXRWZWNLZXlGdW5jID0gUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jO1xuICBwcml2YXRlIHF1YXJkVHJlZTogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPjtcbiAgY29uc3RydWN0b3IoYm91bmRzOiBBQUJCLCBvcHRpb25zOiBRdWFkVHJlZU9wdGlvbnM8VD4gJiB7XG4gICAgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPixcbiAgfSkge1xuICAgIHRoaXMucXVhcmRUcmVlID0gbmV3IFF1YWRUcmVlKGJvdW5kcywgb3B0aW9ucyk7XG4gICAgdGhpcy51bml0UG9zaXRpb25HZXR0ZXIgPSBvcHRpb25zLnVuaXRQb3NpdGlvbkdldHRlcjtcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuc2l6ZTtcbiAgfVxuICBnZXQgYm91bmRzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5ib3VuZHM7XG4gIH1cbiAgYWRkKHQ6IFQpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpO1xuICAgIGlmICghdGhpcy5xdWFyZFRyZWUuYWRkKHBvc2l0aW9uLCB0KSkge1xuICAgICAgdGhyb3cgbmV3IFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yKFxuICAgICAgICAgIGBwb3NpdGlvbiAke0pTT04uc3RyaW5naWZ5KHBvc2l0aW9uKX0gaXMgb3V0IG9mIGJvdW5kczpgICtcbiAgICAgICAgICBgICR7SlNPTi5zdHJpbmdpZnkodGhpcy5xdWFyZFRyZWUuYm91bmRzKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgbW92ZSh0OiBULCB0bzogVmVjMikge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5tb3ZlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0bywgdCk7XG4gIH1cbiAgZGVsZXRlKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuZGVsZXRlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBoYXModDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5oYXModGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMucXVhcmRUcmVlLmNsZWFyKCk7XG4gIH1cbiAgZm9yRWFjaChcbiAgICAgIGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgdmFsdWUyOiBULCBzZXQ6IFNldDxUPikgPT4gdm9pZCxcbiAgICAgIHRoaXNBcmc/OiBhbnksXG4gICk6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgKF8sIHApID0+IHZvaWQoY2FsbGJhY2tmbihwLnVuaXQhLCBwLnVuaXQhLCB0aGlzQXJnKSksXG4gICAgICAgIHZvaWQoMCksXG4gICAgKTtcbiAgfVxuICBlbnRyaWVzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8W1QsIFRdPihcbiAgICAgICAgKHApID0+IFtwLnVuaXQhLCBwLnVuaXQhXSkgYXMgYW55O1xuICB9XG4gIGtleXMoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgdmFsdWVzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8VD4oXG4gICAgICAgIChwKSA9PiBwLnVuaXQhKSBhcyBhbnk7XG4gIH1cbiAgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpIGFzXG4gICAgICBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT47XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyBhcyBTaGFwZSxcbiAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgYW55LFxuICAgICAgICBpbml0aWFsVmFsdWUpO1xuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5QXJyYXkoc2hhcGUpIGFzIGFueTtcbiAgfVxuXG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkKSxcbiAgICAgIGZvcmVhY2hGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApIHtcbiAgICB0aGlzLnF1YXJkVHJlZS5xdWVyeUZvckVhY2goc2hhcGVPckZvcmVhY2hGdW5jIGFzIGFueSwgZm9yZWFjaEZ1bmMgYXMgYW55KTtcbiAgfVxuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEpLFxuICAgICAgbWFwRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeU1hcChzaGFwZU9yTWFwRnVuYyBhcyBTaGFwZSwgbWFwRnVuYyBhcyBhbnkpO1xuICB9XG4gIHF1ZXJ5U2l6ZShcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlTaXplKHNoYXBlKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtRdWFkVHJlZVNldH0gZnJvbSAnLi4vc3JjL1F1YWRUcmVlU2V0JztcbmltcG9ydCB7QUFCQiwgU2hhcGUsIFZlYzJ9IGZyb20gJy4uL3NyYy9zaGFwZSc7XG5cblxuY29uc3QgY2FuY2FzQWxsID1cbiAgd2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbGwnKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcbmNvbnN0IGN0eEFsbCA9IGNhbmNhc0FsbC5nZXRDb250ZXh0KCcyZCcpITtcblxuY29uc3QgY2FuY2FzUXVlcnlSZXN1bHQgPVxuICB3aW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3F1ZXJ5UmVzdWx0JykgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG5jb25zdCBjdHhRdWVyeVJlc3VsdCA9IGNhbmNhc1F1ZXJ5UmVzdWx0LmdldENvbnRleHQoJzJkJykhO1xuXG5jbGFzcyBVbml0IHtcbiAgaWQ6IG51bWJlcjtcbiAgX3Bvc2l0aW9uOiBWZWMyO1xuICBnZXQgcG9zaXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uO1xuICB9XG4gIHNldCBwb3NpdGlvbih2KSB7XG4gICAgaWYgKHF0U2V0Lm1vdmUodGhpcywgdikpIHtcbiAgICAgIHRoaXMuX3Bvc2l0aW9uID0gdjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBmYWlsZWQgdG8gbW92ZSAke3RoaXMuaWR9IHRvICR7SlNPTi5zdHJpbmdpZnkodil9LCBgICtcbiAgICAgICAgYHN0YXlzIGF0OiAke0pTT04uc3RyaW5naWZ5KHRoaXMuX3Bvc2l0aW9uKX1gKTtcbiAgICB9XG4gIH1cbiAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgcG9zaXRpb246IFZlYzIpIHtcbiAgICB0aGlzLmlkID0gaWQ7XG4gICAgdGhpcy5fcG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgICBxdFNldC5hZGQodGhpcyk7XG4gIH1cbn1cblxuY29uc3QgcXRTZXQgPSBuZXcgUXVhZFRyZWVTZXQ8VW5pdD4oe1xuICBzaXplOiB7eDogY2FuY2FzQWxsLndpZHRoIC8gMiwgeTogY2FuY2FzQWxsLmhlaWdodCAvIDJ9LFxuICBjZW50ZXI6IHt4OiBjYW5jYXNBbGwud2lkdGggLyAyLCB5OiBjYW5jYXNBbGwuaGVpZ2h0IC8gMn0sXG59LCB7XG4gIHVuaXRLZXlHZXR0ZXI6IChfLCB1bml0KSA9PiB1bml0IS5pZCxcbiAgdW5pdFBvc2l0aW9uR2V0dGVyOiAodSkgPT4gdS5wb3NpdGlvbixcbn0pO1xuXG5sZXQgY3VycmVudElkID0gMDtcbmZ1bmN0aW9uIGdlbmVyYXRlSWQoKTogbnVtYmVyIHtcbiAgaWYgKGN1cnJlbnRJZCA9PSBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikge1xuICAgIGN1cnJlbnRJZCA9IDA7XG4gICAgcXRTZXQuY2xlYXIoKTtcbiAgfVxuICByZXR1cm4gKytjdXJyZW50SWQ7XG59XG5mdW5jdGlvbiByYW5kb21Qb3NpdGlvbigpOiBWZWMyIHtcbiAgcmV0dXJuIHtcbiAgICB4OiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjYW5jYXNBbGwud2lkdGggYXMgYW55KSxcbiAgICB5OiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjYW5jYXNBbGwuaGVpZ2h0IGFzIGFueSksXG4gIH07XG59XG5cbmNvbnN0IHRvdGFsVW5pdCA9IDUwMDAwMDtcbmNvbnN0IHVuaXRUb01vdmVFYWNoRnJhbWUgPSBNYXRoLmZsb29yKHRvdGFsVW5pdCAqIDAuMDA1KTtcbmNvbnN0IHVuaXRUb0FkZEVhY2hGcmFtZSA9IE1hdGguZmxvb3IodG90YWxVbml0ICogMC4wMDUpO1xuXG5jb25zdCB1bml0czogKFVuaXR8dW5kZWZpbmVkKVtdID0gW107XG5sZXQgbGFzdEVtcHR5SW5kZXggPSAtMTtcbmZ1bmN0aW9uIHJlY29yZFVuaXQodTogVW5pdCk6IFVuaXQge1xuICBpZiAodW5pdHMubGVuZ3RoID4gMS41ICogdG90YWxVbml0KSB7XG4gICAgaWYgKGxhc3RFbXB0eUluZGV4ID4gLTEgJiYgdW5pdHNbbGFzdEVtcHR5SW5kZXhdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHVuaXRzW2xhc3RFbXB0eUluZGV4XSA9IHU7XG4gICAgICBsYXN0RW1wdHlJbmRleCA9IC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICB1bml0c1t1bml0cy5maW5kSW5kZXgoKHV1KSA9PiB1dSA9PT0gdW5kZWZpbmVkKV0gPSB1O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB1bml0cy5wdXNoKHUpO1xuICB9XG4gIHJldHVybiB1O1xufVxuZnVuY3Rpb24gdGFrZUFVbml0KCk6IFVuaXQge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IGluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdW5pdHMubGVuZ3RoKTtcbiAgICBjb25zdCB1bml0ID0gdW5pdHNbaW5kZXhdO1xuICAgIGlmICh1bml0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHVuaXRzW2luZGV4XSA9IHVuZGVmaW5lZDtcbiAgICAgIGxhc3RFbXB0eUluZGV4ID0gaW5kZXg7XG4gICAgICByZXR1cm4gdW5pdDtcbiAgICB9XG4gIH1cbn1cbmZ1bmN0aW9uIG1vdmVSYW5kb21EaXJlY3Rpb24odjogVmVjMikge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHZlYyA9IHtcbiAgICAgIHg6IHYueCArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpIC0gMixcbiAgICAgIHk6IHYueSArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpIC0gMixcbiAgICB9O1xuICAgIGlmIChBQUJCLm92ZXJsYXBzVmVjKHF0U2V0LmJvdW5kcywgdmVjKSkgcmV0dXJuIHZlYztcbiAgfVxufVxuZnVuY3Rpb24gZ2V0TW91c2VQb3MoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCwgZXZ0OiBNb3VzZUV2ZW50KSB7XG4gIGNvbnN0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIHJldHVybiB7XG4gICAgeDogZXZ0LmNsaWVudFggLSByZWN0LmxlZnQsXG4gICAgeTogZXZ0LmNsaWVudFkgLSByZWN0LnRvcCxcbiAgfTtcbn1cbmxldCBtb3VzZVBvczogVmVjMiA9IHt4OiAwLCB5OiAwfTtcbmNhbmNhc0FsbC5vbm1vdXNlbW92ZSA9IGZ1bmN0aW9uKGV2dDogTW91c2VFdmVudCkge1xuICBtb3VzZVBvcyA9IGdldE1vdXNlUG9zKGNhbmNhc0FsbCwgZXZ0KTtcbn07XG5jYW5jYXNRdWVyeVJlc3VsdC5vbm1vdXNlbW92ZSA9IGZ1bmN0aW9uKGV2dDogTW91c2VFdmVudCkge1xuICBtb3VzZVBvcyA9IGdldE1vdXNlUG9zKGNhbmNhc1F1ZXJ5UmVzdWx0LCBldnQpO1xufTtcblxubGV0IHByZXZpb3VzVGltZVN0YW1wOiBET01IaWdoUmVzVGltZVN0YW1wO1xuZnVuY3Rpb24gYW5pbWF0ZSh0aW1lc3RhbXA6IERPTUhpZ2hSZXNUaW1lU3RhbXApIHtcbiAgY3R4QWxsLmNsZWFyUmVjdCgwLCAwLCBjYW5jYXNBbGwud2lkdGgsIGNhbmNhc0FsbC5oZWlnaHQpO1xuICBjdHhBbGwuc2F2ZSgpO1xuICBjdHhBbGwuZmlsbFN0eWxlID0gJ3JlZCc7XG4gIHdoaWxlIChxdFNldC5zaXplIDwgdG90YWxVbml0KSB7XG4gICAgY29uc29sZS5sb2cocXRTZXQuc2l6ZSk7XG4gICAgcmVjb3JkVW5pdChuZXcgVW5pdChnZW5lcmF0ZUlkKCksIHJhbmRvbVBvc2l0aW9uKCkpKTtcbiAgfVxuICBmb3IgKGxldCBpPTA7IGk8dW5pdFRvTW92ZUVhY2hGcmFtZTsgaSsrKSB7XG4gICAgY29uc3QgdW5pdCA9IHRha2VBVW5pdCgpO1xuICAgIHVuaXQucG9zaXRpb24gPSBtb3ZlUmFuZG9tRGlyZWN0aW9uKHVuaXQucG9zaXRpb24pO1xuICAgIHJlY29yZFVuaXQodW5pdCk7XG4gIH1cbiAgZm9yIChsZXQgaT0wOyBpPHVuaXRUb0FkZEVhY2hGcmFtZTsgaSsrKSB7XG4gICAgY29uc3QgdW5pdCA9IHRha2VBVW5pdCgpO1xuICAgIGlmICghcXRTZXQuZGVsZXRlKHVuaXQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGRlbGV0ZSBmYWlsZWQ6IGAgK1xuICAgICAgICBgJHt1bml0LmlkfSAke0pTT04uc3RyaW5naWZ5KHVuaXQucG9zaXRpb24pfWApO1xuICAgIH1cbiAgICByZWNvcmRVbml0KG5ldyBVbml0KGdlbmVyYXRlSWQoKSwgcmFuZG9tUG9zaXRpb24oKSkpO1xuICB9XG4gIC8vIHF0U2V0LnF1ZXJ5Rm9yRWFjaCgodikgPT4gY3R4QWxsLmZpbGxSZWN0KHYudmVjLngsIHYudmVjLnksIDEsIDEpKTtcbiAgaWYgKHByZXZpb3VzVGltZVN0YW1wKSB7XG4gICAgY3R4QWxsLmZpbGxTdHlsZSA9ICdibHVlJztcbiAgICBjdHhBbGwuZm9udCA9ICcxNXB4IEFyaWFsJztcbiAgICBjdHhBbGwuZmlsbFRleHQoXG4gICAgICAgIGAke01hdGgucm91bmQoMTAwMC8odGltZXN0YW1wIC0gcHJldmlvdXNUaW1lU3RhbXApKX0gZnBzYCwgMTAsIDUwKTtcbiAgfVxuICBjdHhBbGwucmVzdG9yZSgpO1xuXG4gIGN0eFF1ZXJ5UmVzdWx0LmNsZWFyUmVjdCgwLCAwLFxuICAgICAgY2FuY2FzUXVlcnlSZXN1bHQud2lkdGgsIGNhbmNhc1F1ZXJ5UmVzdWx0LmhlaWdodCk7XG4gIGN0eFF1ZXJ5UmVzdWx0LnNhdmUoKTtcbiAgY3R4UXVlcnlSZXN1bHQuZmlsbFN0eWxlID0gJ2dyZWVuJztcbiAgbGV0IHF1ZXJ5Q291bnQgPSAwO1xuICBxdFNldC5xdWVyeUZvckVhY2goU2hhcGUuY3JlYXRlRWxsaXBzZShtb3VzZVBvcywge3g6IDEyLCB5OiA4fSksICh7dmVjfSkgPT4ge1xuICAgIGN0eFF1ZXJ5UmVzdWx0LmZpbGxSZWN0KHZlYy54LCB2ZWMueSwgMSwgMSk7XG4gICAgcXVlcnlDb3VudCArKztcbiAgfSk7XG4gIGN0eFF1ZXJ5UmVzdWx0LmZpbGxTdHlsZSA9ICdibGFjayc7XG4gIGN0eFF1ZXJ5UmVzdWx0LmZvbnQgPSAnMTVweCBBcmlhbCc7XG4gIGN0eFF1ZXJ5UmVzdWx0LmZpbGxUZXh0KFxuICAgICAgYCR7cXVlcnlDb3VudH0vJHtxdFNldC5zaXplfSBxdWVyaWVkYCwgY2FuY2FzUXVlcnlSZXN1bHQud2lkdGggLSAxMDAsIDUwKTtcbiAgY3R4UXVlcnlSZXN1bHQucmVzdG9yZSgpO1xuICBwcmV2aW91c1RpbWVTdGFtcCA9IHRpbWVzdGFtcDtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xufVxud2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUdNLElBQVcsVUFBVSxDQWtKMUI7SUFsSkQsQ0FBQSxVQUFpQixVQUFVLEVBQUE7UUFDekIsU0FBZ0IsT0FBTyxDQUFJLENBQWdCLEVBQUE7SUFDekMsUUFBQSxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUU7SUFDdEIsWUFBQSxPQUFPLENBQUMsQ0FBQzthQUNWO1lBQ0QsTUFBTSxDQUFDLEdBQVEsRUFBRSxDQUFDO0lBQ2xCLFFBQUEsSUFBSyxDQUFrQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtJQUN4QyxZQUFBLEtBQUssTUFBTSxDQUFDLElBQUssQ0FBa0IsRUFBRTtJQUNuQyxnQkFBQSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNYO0lBQ0QsWUFBQSxPQUFPLENBQUMsQ0FBQzthQUNWO0lBQ0QsUUFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDakIsUUFBQSxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtJQUNkLFlBQUEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEIsWUFBQSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ2Q7SUFDRCxRQUFBLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7SUFqQmUsSUFBQSxVQUFBLENBQUEsT0FBTyxVQWlCdEIsQ0FBQTtJQUNELElBQUEsVUFBaUIsVUFBVSxDQUN2QixHQUFHLGNBQXFELEVBQUE7SUFFMUQsUUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLGNBQWMsRUFBRTtJQUNqQyxZQUFBLElBQUksQ0FBQyxJQUFJO29CQUFFLFNBQVM7SUFDcEIsWUFBQSxNQUFNLFFBQVEsR0FBRyxJQUFJLEVBQUUsQ0FBQztJQUN4QixZQUFBLElBQUksUUFBUSxZQUFZLEtBQUssRUFBRTtJQUM3QixnQkFBQSxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRTtJQUM3QixvQkFBQSxNQUFNLE1BQU0sQ0FBQztxQkFDZDtpQkFDRjtxQkFBTTtJQUNMLGdCQUFBLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM3QixnQkFBQSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRTt3QkFDbkIsTUFBTSxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ25CLG9CQUFBLE1BQU0sR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7cUJBQzFCO2lCQUNGO2FBQ0Y7U0FDRjtJQWxCZ0IsSUFBQSxVQUFBLENBQUEsVUFBVSxhQWtCMUIsQ0FBQTtRQUNELFVBQWlCLG9CQUFvQixDQUNqQyxVQUE0QyxFQUM1QyxLQUFzQixFQUN0QixHQUFHLGNBQXFFLEVBQUE7WUFFMUUsSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNmLFlBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxjQUFjLEVBQUU7SUFDakMsZ0JBQUEsSUFBSSxDQUFDLElBQUk7d0JBQUUsU0FBUztJQUNwQixnQkFBQSxNQUFNLFFBQVEsR0FBRyxPQUFPLElBQUksS0FBSyxVQUFVLEdBQUcsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQzVELGdCQUFBLElBQUksUUFBUSxZQUFZLEtBQUssRUFBRTtJQUM3QixvQkFBQSxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRTtJQUM3Qix3QkFBQSxNQUFNLE1BQU0sQ0FBQzs0QkFDYixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7eUJBQ2Y7cUJBQ0Y7eUJBQU07SUFDTCxvQkFBQSxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDN0Isb0JBQUEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUU7NEJBQ25CLE1BQU0sTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNuQix3QkFBQSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUN6QixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7eUJBQ2Y7cUJBQ0Y7aUJBQ0Y7YUFDRjtpQkFBTTtJQUNMLFlBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxjQUFjLEVBQUU7SUFDakMsZ0JBQUEsSUFBSSxDQUFDLElBQUk7d0JBQUUsU0FBUztJQUNwQixnQkFBQSxNQUFNLFFBQVEsR0FBRyxPQUFPLElBQUksS0FBSyxVQUFVLEdBQUcsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQzVELGdCQUFBLElBQUksUUFBUSxZQUFZLEtBQUssRUFBRTtJQUM3QixvQkFBQSxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRTs0QkFDN0IsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFO0lBQ3JDLDRCQUFBLE1BQU0sTUFBTSxDQUFDOzZCQUNkO3lCQUNGO3FCQUNGO3lCQUFNO0lBQ0wsb0JBQUEsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzdCLG9CQUFBLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFO0lBQ25CLHdCQUFBLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUU7Z0NBQzNDLE1BQU0sTUFBTSxDQUFDLEtBQUssQ0FBQzs2QkFDcEI7SUFDRCx3QkFBQSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO3lCQUMxQjtxQkFDRjtpQkFDRjthQUNGO1NBQ0Y7SUE1Q2dCLElBQUEsVUFBQSxDQUFBLG9CQUFvQix1QkE0Q3BDLENBQUE7UUFDRCxVQUFpQixpQkFBaUIsQ0FDOUIsT0FBbUMsRUFDbkMsS0FBc0IsRUFDdEIsR0FBRyxjQUFxRSxFQUFBO0lBRTFFLFFBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxjQUFjLEVBQUU7SUFDakMsWUFBQSxJQUFJLENBQUMsSUFBSTtvQkFBRSxTQUFTO0lBQ3BCLFlBQUEsTUFBTSxRQUFRLEdBQUcsT0FBTyxJQUFJLEtBQUssVUFBVSxHQUFHLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQztJQUM1RCxZQUFBLElBQUksUUFBUSxZQUFZLEtBQUssRUFBRTtJQUM3QixnQkFBQSxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRTt3QkFDN0IsTUFBTSxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO3FCQUN0QztpQkFDRjtxQkFBTTtJQUNMLGdCQUFBLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM3QixnQkFBQSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRTt3QkFDbkIsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUMzQyxvQkFBQSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO3FCQUMxQjtpQkFDRjthQUNGO1NBQ0Y7SUFwQmdCLElBQUEsVUFBQSxDQUFBLGlCQUFpQixvQkFvQmpDLENBQUE7UUFDRCxVQUFpQixzQkFBc0IsQ0FDbkMsTUFBeUIsRUFDekIsVUFBd0QsRUFDeEQsT0FBK0MsRUFDL0MsS0FBc0IsRUFBQTtZQUV4QixJQUFJLFVBQVUsRUFBRTtnQkFDZCxJQUFJLE9BQU8sRUFBRTs7SUFFWCxnQkFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRTtJQUN4QixvQkFBQSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQzFCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTs0QkFDbkMsU0FBUzt5QkFDVjt3QkFDRCxNQUFNLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7cUJBQ3JDO2lCQUNGO3FCQUFNOztJQUVMLGdCQUFBLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFO0lBQ3hCLG9CQUFBLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDMUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFOzRCQUNuQyxTQUFTO3lCQUNWO0lBQ0Qsb0JBQUEsTUFBTSxLQUFLLENBQUM7d0JBQ1osS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO3FCQUNmO2lCQUNGO2FBQ0Y7aUJBQU07Z0JBQ0wsSUFBSSxPQUFPLEVBQUU7O0lBRVgsZ0JBQUEsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUU7SUFDeEIsb0JBQUEsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO3FCQUMzQztpQkFDRjtxQkFBTTs7SUFFTCxnQkFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRTtJQUN4QixvQkFBQSxNQUFNLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDbEIsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO3FCQUNmO2lCQUNGO2FBQ0Y7U0FDRjtJQXpDZ0IsSUFBQSxVQUFBLENBQUEsc0JBQXNCLHlCQXlDdEMsQ0FBQTtJQUNILENBQUMsRUFsSmdCLFVBQVUsS0FBVixVQUFVLEdBa0oxQixFQUFBLENBQUEsQ0FBQTs7SUM3SUssSUFBVyxJQUFJLENBZXBCO0lBZkQsQ0FBQSxVQUFpQixJQUFJLEVBQUE7SUFDbkIsSUFBQSxTQUFnQixXQUFXLENBQUMsSUFBVSxFQUFFLEdBQVMsRUFBQTtJQUMvQyxRQUFBLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7SUFDekMsWUFBQSxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLFlBQUEsR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUN4QztJQUxlLElBQUEsSUFBQSxDQUFBLFdBQVcsY0FLMUIsQ0FBQTtJQUNELElBQUEsU0FBZ0IsWUFBWSxDQUFDLEdBQVMsRUFBRSxPQUFhLEVBQUE7WUFDbkQsT0FBTyxFQUNMLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0QsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM3RCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzdELE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUM5RCxDQUFDO1NBQ0g7SUFQZSxJQUFBLElBQUEsQ0FBQSxZQUFZLGVBTzNCLENBQUE7SUFDSCxDQUFDLEVBZmdCLElBQUksS0FBSixJQUFJLEdBZXBCLEVBQUEsQ0FBQSxDQUFBLENBQUE7SUFvQkssSUFBVyxLQUFLLENBa0VyQjtJQWxFRCxDQUFBLFVBQWlCLEtBQUssRUFBQTtJQUNwQixJQUFBLFNBQWdCLFdBQVcsQ0FBQyxLQUFZLEVBQUUsR0FBUyxFQUFBO0lBQ2pELFFBQUEsUUFBUSxLQUFLLENBQUMsSUFBSTtJQUNoQixZQUFBLEtBQUssV0FBVyxFQUFFLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdEQsWUFBQSxLQUFLLFFBQVEsRUFBRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7b0JBQ3JDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtJQUNwQixnQkFBQSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBQztpQkFDckMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNSLFlBQUEsS0FBSyxRQUFRLEVBQUUsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDO0lBQ3RDLGdCQUFBLElBQUksRUFBRSxTQUFTO29CQUNmLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtJQUNwQixnQkFBQSxJQUFJLEVBQUUsRUFBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBQztpQkFDckMsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDUixLQUFLLFNBQVMsRUFBRTtJQUNkLGdCQUFBLE1BQU0sQ0FBQyxHQUNMLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMvRCxvQkFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbEUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNmO2dCQUNELFNBQVMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2FBQzdDO1NBQ0Y7SUFwQmUsSUFBQSxLQUFBLENBQUEsV0FBVyxjQW9CMUIsQ0FBQTtJQUNELElBQUEsU0FBZ0Isc0JBQXNCLENBQUMsS0FBWSxFQUFFLElBQVUsRUFBQTtJQUM3RCxRQUFBLFFBQVEsS0FBSyxDQUFDLElBQUk7SUFDaEIsWUFBQSxLQUFLLFNBQVMsQ0FBQztJQUNmLFlBQUEsS0FBSyxXQUFXO29CQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEMsWUFBQSxLQUFLLFFBQVEsQ0FBQztJQUNkLFlBQUEsS0FBSyxRQUFRO29CQUNYLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQzt3QkFDdkIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO0lBQ3BCLG9CQUFBLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFDO3FCQUNyQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNYLFNBQVMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2FBQzdDO1NBQ0Y7SUFiZSxJQUFBLEtBQUEsQ0FBQSxzQkFBc0IseUJBYXJDLENBQUE7SUFDRCxJQUFBLFNBQWdCLGVBQWUsQ0FBQyxNQUFZLEVBQUUsSUFBbUIsRUFBQTtJQUMvRCxRQUFBLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO2dCQUM1QixPQUFPO0lBQ0wsZ0JBQUEsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsTUFBTTtvQkFDTixJQUFJO2lCQUNMLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxPQUFPO0lBQ0wsZ0JBQUEsSUFBSSxFQUFFLFdBQVc7b0JBQ2pCLE1BQU07b0JBQ04sSUFBSTtpQkFDTCxDQUFDO2FBQ0g7U0FDRjtJQWRlLElBQUEsS0FBQSxDQUFBLGVBQWUsa0JBYzlCLENBQUE7SUFDRCxJQUFBLFNBQWdCLGFBQWEsQ0FBQyxNQUFZLEVBQUUsSUFBbUIsRUFBQTtJQUM3RCxRQUFBLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO2dCQUM1QixPQUFPO0lBQ0wsZ0JBQUEsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsTUFBTTtvQkFDTixJQUFJO2lCQUNMLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxPQUFPO0lBQ0wsZ0JBQUEsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsTUFBTTtvQkFDTixJQUFJO2lCQUNMLENBQUM7YUFDSDtTQUNGO0lBZGUsSUFBQSxLQUFBLENBQUEsYUFBYSxnQkFjNUIsQ0FBQTtJQUNILENBQUMsRUFsRWdCLEtBQUssS0FBTCxLQUFLLEdBa0VyQixFQUFBLENBQUEsQ0FBQTs7VUN0RFksUUFBUSxDQUFBO0lBMEJuQixJQUFBLElBQUksSUFBSSxHQUFBO1lBQ04sT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO1NBQ25CO0lBSUQsSUFBQSxXQUFBLENBQ0ksTUFBWSxFQUNaLE9BQTRCLEVBQzVCLFFBQWdCLENBQUMsRUFBQTtJQUVuQixRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3JCLFFBQUEsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDbkIsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztJQUNyQixRQUFBLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ2hCLFFBQUEsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDZixRQUFBLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxJQUFJO2dCQUN4QixhQUFhLEVBQUUsUUFBUSxDQUFDLDJCQUEyQjthQUNwRCxDQUFDO1NBQ0g7UUFDRCxJQUFJLENBQUMsR0FBUyxFQUFFLElBQU8sRUFBQTtZQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztJQUFFLFlBQUEsT0FBTyxLQUFLLENBQUM7SUFDdEQsUUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLFFBQVE7SUFDakMsWUFBQSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsV0FBVyxFQUFFO0lBQ25ELFlBQUEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxNQUFNLEdBQXlCLFVBQVUsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3BCLElBQUksQ0FBQyxLQUFLLEVBQUcsQ0FBQztvQkFDZCxNQUFNLEdBQUcsT0FBTyxDQUFDO2lCQUNsQjtnQkFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxDQUFDO0lBQzlCLFlBQUEsT0FBTyxNQUFNLENBQUM7YUFDZjtZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTztnQkFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDN0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pDLElBQUksUUFBUSxLQUFLLE9BQU87Z0JBQUUsSUFBSSxDQUFDLEtBQUssRUFBRyxDQUFDO0lBQ3hDLFFBQUEsT0FBTyxRQUFRLENBQUM7U0FDakI7UUFDRCxHQUFHLENBQUMsR0FBUyxFQUFFLElBQU8sRUFBQTtZQUNwQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUMvQjtJQUNPLElBQUEsS0FBSyxDQUNULElBQVUsRUFDVixFQUFvQixFQUNwQixJQUFPLEVBQUE7WUFFVCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQztJQUFFLFlBQUEsT0FBTyxLQUFLLENBQUM7SUFDdkQsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtJQUNqQixZQUFBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ3BCLGdCQUFBLE9BQU8sS0FBSyxDQUFDO2lCQUNkO0lBQ0QsWUFBQSxJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7O0lBRTNDLGdCQUFBLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDMUQsZ0JBQUEsSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFO0lBQ2xCLG9CQUFBLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QixvQkFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUMsQ0FBQztxQkFDdEM7eUJBQU07SUFDTCxvQkFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUMsQ0FBQztxQkFDbkM7SUFDRCxnQkFBQSxPQUFPLE9BQU8sQ0FBQztpQkFDaEI7SUFDRCxZQUFBLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLEtBQUssRUFBRyxDQUFDO0lBQ2QsWUFBQSxPQUFPLFNBQVMsQ0FBQzthQUNsQjtJQUNELFFBQUEsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQztnQkFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMzQyxRQUFBLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtnQkFDeEIsSUFBSSxDQUFDLEtBQUssRUFBRyxDQUFDO2dCQUNkLElBQUksRUFBRSxFQUFFO0lBQ04sZ0JBQUEsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUM7SUFBRSxvQkFBQSxPQUFPLE9BQU8sQ0FBQztJQUN2QyxnQkFBQSxPQUFPLFNBQVMsQ0FBQztpQkFDbEI7YUFDRjtJQUNELFFBQUEsT0FBTyxNQUFNLENBQUM7U0FDZjtJQUNELElBQUEsSUFBSSxDQUFDLElBQVUsRUFBRSxFQUFRLEVBQUUsSUFBTyxFQUFBO1lBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO0lBQUUsWUFBQSxPQUFPLEtBQUssQ0FBQztZQUNyRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxTQUFTO0lBQUUsWUFBQSxNQUFNLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzVFLFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE1BQU0sQ0FBQyxHQUFTLEVBQUUsSUFBTyxFQUFBO0lBQ3ZCLFFBQUEsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssU0FBUyxDQUFDO1NBQ3ZEO1FBQ0QsS0FBSyxHQUFBO0lBQ0gsUUFBQSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNoQixRQUFBLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztJQUNyQixRQUFBLElBQUksQ0FBQyxTQUFTO0lBQ1osWUFBQSxJQUFJLENBQUMsU0FBUztJQUNkLGdCQUFBLElBQUksQ0FBQyxTQUFTO0lBQ2Qsb0JBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFVLENBQUM7U0FDL0I7UUFDRCxHQUFHLENBQUMsR0FBUyxFQUFFLElBQU8sRUFBQTtZQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztJQUFFLFlBQUEsT0FBTyxLQUFLLENBQUM7SUFDdEQsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtJQUNqQixZQUFBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3hELE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDMUI7WUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNqQztRQUNPLE1BQU0sR0FBQTtJQUNaLFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDcEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNsQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRWxDLFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7Z0JBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQzthQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7Z0JBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQzthQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFF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
