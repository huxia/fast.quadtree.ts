
  /**
   * @license
   * author: https://github.com/huxia
   * fast.quadtree.ts.js v0.0.2
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

    const cancasAll = window.document.getElementById('all');
    const ctxAll = cancasAll.getContext('2d');
    const cancasQueryResult = window.document.getElementById('queryResult');
    const ctxQueryResult = cancasQueryResult.getContext('2d');
    class Unit {
        id;
        _position;
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
        qtSet.queryForEach(Shape.createEllipse(mousePos, 10), ({ vec }) => {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC5xdWFkdHJlZS50cy5icm93c2VyLnRlc3QuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9jb2xsZWN0aW9uLnRzIiwiLi4vc3JjL3NoYXBlLnRzIiwiLi4vc3JjL1F1YWRUcmVlLnRzIiwiLi4vc3JjL1F1YWRUcmVlU2V0LnRzIiwiLi4vdGVzdC9icm93c2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbjxUPiA9IEl0ZXJhdG9yPFQ+IHwgQXJyYXk8VD47XG5leHBvcnQgdHlwZSBJdGVyYWJsZTxUPiA9IEl0ZXJhYmxlSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCBuYW1lc3BhY2UgQ29sbGVjdGlvbiB7XG4gIGV4cG9ydCBmdW5jdGlvbiB0b0FycmF5PFQ+KGM6IENvbGxlY3Rpb248VD4pIHtcbiAgICBpZiAoYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgY29uc3QgcjogVFtdID0gW107XG4gICAgaWYgKChjIGFzIEdlbmVyYXRvcjxUPilbU3ltYm9sLml0ZXJhdG9yXSkge1xuICAgICAgZm9yIChjb25zdCBpIG9mIChjIGFzIEdlbmVyYXRvcjxUPikpIHtcbiAgICAgICAgci5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGxldCBpID0gYy5uZXh0KCk7XG4gICAgd2hpbGUgKCFpLmRvbmUpIHtcbiAgICAgIHIucHVzaChpLnZhbHVlKTtcbiAgICAgIGkgPSBjLm5leHQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlPFQ+KFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gZnVuYygpO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiogdG9JdGVyYWJsZVdpdGhGaWx0ZXI8VD4oXG4gICAgICBmaWx0ZXJGdW5jOiAoKG86IFQpID0+IGJvb2xlYW4pLFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gZnVuYygpO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmMgfHwgZmlsdGVyRnVuYyhyZXN1bHQpKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgaWYgKCFmaWx0ZXJGdW5jIHx8IGZpbHRlckZ1bmMocmVzdWx0LnZhbHVlKSkge1xuICAgICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aE1hcDxULCBBPihcbiAgICAgIG1hcEZ1bmM6ICgobzogVCkgPT4gQSksXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKCgpID0+IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImV4cG9ydCBpbnRlcmZhY2UgVmVjMiB7XG4gIHg6IG51bWJlcjtcbiAgeTogbnVtYmVyO1xufVxuZXhwb3J0IGludGVyZmFjZSBBQUJCIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBWZWMyO1xufVxuZXhwb3J0IG5hbWVzcGFjZSBBQUJCIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKGFhYmI6IEFBQkIsIHZlYzogVmVjMik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhYWJiLmNlbnRlci54IC0gYWFiYi5zaXplLnggPD0gdmVjLnggJiZcbiAgICAgIHZlYy54IDw9IGFhYmIuY2VudGVyLnggKyBhYWJiLnNpemUueCAmJlxuICAgICAgYWFiYi5jZW50ZXIueSAtIGFhYmIuc2l6ZS55IDw9IHZlYy55ICYmXG4gICAgICB2ZWMueSA8PSBhYWJiLmNlbnRlci55ICsgYWFiYi5zaXplLnk7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzQUFCQihvbmU6IEFBQkIsIGFub3RoZXI6IEFBQkIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIShcbiAgICAgIGFub3RoZXIuY2VudGVyLnggLSBhbm90aGVyLnNpemUueCA+IG9uZS5jZW50ZXIueCArIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnggKyBhbm90aGVyLnNpemUueCA8IG9uZS5jZW50ZXIueCAtIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgLSBhbm90aGVyLnNpemUueSA+IG9uZS5jZW50ZXIueSArIG9uZS5zaXplLnkgfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgKyBhbm90aGVyLnNpemUueSA8IG9uZS5jZW50ZXIueSAtIG9uZS5zaXplLnlcbiAgICApO1xuICB9XG59XG50eXBlIFJlY3RhbmdsZVNoYXBlID0ge1xuICB0eXBlOiAncmVjdGFuZ2xlJ1xufSAmIEFBQkI7XG50eXBlIEVsbGlwc2VTaGFwZSA9IHtcbiAgdHlwZTogJ2VsbGlwc2UnXG59ICYgQUFCQjtcbnR5cGUgQ2lyY2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdjaXJjbGUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG50eXBlIFNxdWFyZVNoYXBlID0ge1xuICB0eXBlOiAnc3F1YXJlJ1xufSAmIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBudW1iZXI7XG59O1xuZXhwb3J0IHR5cGUgU2hhcGUgPSBSZWN0YW5nbGVTaGFwZSB8IEVsbGlwc2VTaGFwZSB8IENpcmNsZVNoYXBlIHwgU3F1YXJlU2hhcGU7XG5leHBvcnQgbmFtZXNwYWNlIFNoYXBlIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKHNoYXBlOiBTaGFwZSwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoIChzaGFwZS50eXBlKSB7XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOiByZXR1cm4gQUFCQi5vdmVybGFwc1ZlYyhzaGFwZSwgdmVjKTtcbiAgICAgIGNhc2UgJ3NxdWFyZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHtcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdjaXJjbGUnOiByZXR1cm4gU2hhcGUub3ZlcmxhcHNWZWMoe1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICB9LCB2ZWMpO1xuICAgICAgY2FzZSAnZWxsaXBzZSc6IHtcbiAgICAgICAgY29uc3QgcCA9XG4gICAgICAgICAgTWF0aC5wb3codmVjLnggLSBzaGFwZS5jZW50ZXIueCwgMikgLyBNYXRoLnBvdyhzaGFwZS5zaXplLngsIDIpICtcbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueSAtIHNoYXBlLmNlbnRlci55LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueSwgMik7XG4gICAgICAgIHJldHVybiBwIDw9IDE7XG4gICAgICB9XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gcG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZTogU2hhcGUsIGFhYmI6IEFBQkIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2VsbGlwc2UnOlxuICAgICAgY2FzZSAncmVjdGFuZ2xlJzpcbiAgICAgICAgcmV0dXJuIEFBQkIub3ZlcmxhcHNBQUJCKHNoYXBlLCBhYWJiKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6XG4gICAgICBjYXNlICdzcXVhcmUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoe1xuICAgICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgICAgfSwgYWFiYik7XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVjdGFuZ2xlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnc3F1YXJlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3JlY3RhbmdsZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGxpcHNlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnY2lyY2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2VsbGlwc2UnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHtDb2xsZWN0aW9uLCBJdGVyYWJsZX0gZnJvbSAnLi9jb2xsZWN0aW9uJztcbmltcG9ydCB7VmVjMiwgQUFCQiwgU2hhcGV9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+ID0gKFxuICB2ZWM6IFZlYzIsIHVuaXQ6IFQgfCB1bmRlZmluZWQsIHF1YWRUcmVlOiBRdWFkVHJlZTxUPlxuKSA9PiBzdHJpbmcgfCBudW1iZXI7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gICAgYWNjOiBBLFxuICAgIHByZXZpb3VzOiB7dmVjOiBWZWMyLCB1bml0PzogVH0sXG4gICAgaW5kZXg6IG51bWJlcixcbikgPT4gQSB8IHVuZGVmaW5lZDtcbmV4cG9ydCBpbnRlcmZhY2UgUXVhZFRyZWVPcHRpb25zPFQ+IHtcbiAgdW5pdEtleUdldHRlcjogUXVhZFRyZWVVbml0S2V5RnVuYzxUPixcbiAgaW50ZWdlckNvb3JkaW5hdGU/OiBib29sZWFuLFxufVxuZXhwb3J0IGNsYXNzIFF1YWRUcmVlPFQ+IHtcbiAgc3RhdGljIE1heEVsZW1lbnRzID0gODtcbiAgc3RhdGljIE1heERlcHRoID0gODtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyA9IChcbiAgICAgIHZlYzogVmVjMixcbiAgICAgIF86IGFueSxcbiAgICAgIHF1YWRUcmVlOiBRdWFkVHJlZTxhbnk+LFxuICApID0+XG4gICAgcXVhZFRyZWUub3B0aW9ucy5pbnRlZ2VyQ29vcmRpbmF0ZSA/XG4gICAgICB2ZWMueCArIChxdWFkVHJlZS5ib3VuZHMuc2l6ZS54ICogMikgKiB2ZWMueSA6XG4gICAgICBgJHt2ZWMueH0sJHt2ZWMueX1gO1xuXG4gIGJvdW5kczogQUFCQjtcblxuICBwcml2YXRlIGRlcHRoOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBkaXZpZGVkOiBib29sZWFuO1xuXG4gIHByaXZhdGUgdW5pdHM6IHtba2V5OiBzdHJpbmcgfCBudW1iZXJdOiB7dW5pdD86IFQsIHZlYzogVmVjMn19O1xuXG4gIHByaXZhdGUgbm9ydGhXZXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgbm9ydGhFYXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgc291dGhXZXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgc291dGhFYXN0ITogUXVhZFRyZWU8VD47XG5cbiAgc2l6ZTogbnVtYmVyO1xuXG4gIHJlYWRvbmx5IG9wdGlvbnM6IFF1YWRUcmVlT3B0aW9uczxUPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIGJvdW5kczogQUFCQixcbiAgICAgIG9wdGlvbnM/OiBRdWFkVHJlZU9wdGlvbnM8VD4sXG4gICAgICBkZXB0aDogbnVtYmVyID0gMCxcbiAgKSB7XG4gICAgdGhpcy5ib3VuZHMgPSBib3VuZHM7XG4gICAgdGhpcy5kZXB0aCA9IGRlcHRoO1xuICAgIHRoaXMuZGl2aWRlZCA9IGZhbHNlO1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLnNpemUgPSAwO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge1xuICAgICAgdW5pdEtleUdldHRlcjogUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jLFxuICAgIH07XG4gIH1cbiAgX2FkZCh2ZWM6IFZlYzIsIHVuaXQ/OiBUKTogZmFsc2UgfCAnYWRkZWQnIHwgJ2V4aXN0aW5nJyB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB2ZWMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZGVwdGggPT0gUXVhZFRyZWUuTWF4RGVwdGggfHxcbiAgICAgICF0aGlzLmRpdmlkZWQgJiYgdGhpcy5zaXplIDwgUXVhZFRyZWUuTWF4RWxlbWVudHMpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKHZlYywgdW5pdCwgdGhpcyk7XG4gICAgICBsZXQgcmVzdWx0OiAnZXhpc3RpbmcnIHwgJ2FkZGVkJyA9ICdleGlzdGluZyc7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICB0aGlzLnNpemUgKys7XG4gICAgICAgIHJlc3VsdCA9ICdhZGRlZCc7XG4gICAgICB9XG4gICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjLCB1bml0fTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB0aGlzLmRpdmlkZSgpO1xuICAgIGNvbnN0IGluc2VydGVkID0gdGhpcy5ub3J0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpO1xuICAgIGlmIChpbnNlcnRlZCA9PT0gJ2FkZGVkJykgdGhpcy5zaXplICsrO1xuICAgIHJldHVybiBpbnNlcnRlZDtcbiAgfVxuICBhZGQodmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuX2FkZCh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgX21vdmUoXG4gICAgICBmcm9tOiBWZWMyLFxuICAgICAgdG86IFZlYzIgfCB1bmRlZmluZWQsXG4gICAgICB1bml0PzogVCxcbiAgKTogZmFsc2UgfCAncmVtb3ZlZCcgfCAnbW92ZWQnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIGZyb20pKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKGZyb20sIHVuaXQsIHRoaXMpO1xuICAgICAgaWYgKCF0aGlzLnVuaXRzW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHRvICYmIEFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHRvKSkge1xuICAgICAgICAvLyB1cGRhdGUgaW4tcGxhY2VcbiAgICAgICAgY29uc3QgbmV3S2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodG8sIHVuaXQsIHRoaXMpO1xuICAgICAgICBpZiAobmV3S2V5ICE9PSBrZXkpIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy51bml0c1trZXldO1xuICAgICAgICAgIHRoaXMudW5pdHNbbmV3S2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjOiB0bywgdW5pdH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdtb3ZlZCc7XG4gICAgICB9XG4gICAgICBkZWxldGUgdGhpcy51bml0c1trZXldO1xuICAgICAgdGhpcy5zaXplIC0tO1xuICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ub3J0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5ub3J0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpO1xuICAgIGlmIChyZXN1bHQgPT09ICdyZW1vdmVkJykge1xuICAgICAgdGhpcy5zaXplIC0tO1xuICAgICAgaWYgKHRvKSB7XG4gICAgICAgIGlmICh0aGlzLmFkZCh0bywgdW5pdCkpIHJldHVybiAnbW92ZWQnO1xuICAgICAgICByZXR1cm4gJ3JlbW92ZWQnO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIG1vdmUoZnJvbTogVmVjMiwgdG86IFZlYzIsIHVuaXQ/OiBUKTogYm9vbGVhbiB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB0bykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5fbW92ZShmcm9tLCB0bywgdW5pdCkgPT09ICdyZW1vdmVkJykgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRlKHZlYzogVmVjMiwgdW5pdD86IFQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZSh2ZWMsIHVuZGVmaW5lZCwgdW5pdCkgPT09ICdyZW1vdmVkJztcbiAgfVxuICBjbGVhcigpIHtcbiAgICB0aGlzLnVuaXRzID0ge307XG4gICAgdGhpcy5zaXplID0gMDtcbiAgICB0aGlzLmRpdmlkZWQgPSBmYWxzZTtcbiAgICB0aGlzLm5vcnRoV2VzdCA9XG4gICAgICB0aGlzLm5vcnRoRWFzdCA9XG4gICAgICB0aGlzLnNvdXRoV2VzdCA9XG4gICAgICB0aGlzLnNvdXRoRWFzdCA9IHVuZGVmaW5lZCE7XG4gIH1cbiAgaGFzKHZlYzogVmVjMiwgdW5pdD86IFQpOiBib29sZWFuIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIHJldHVybiAhIXRoaXMudW5pdHNba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9ydGhXZXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhFYXN0Lmhhcyh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgZGl2aWRlKCkge1xuICAgIHRoaXMuZGl2aWRlZCA9IHRydWU7XG4gICAgY29uc3QgaHcgPSB0aGlzLmJvdW5kcy5zaXplLnggLyAyO1xuICAgIGNvbnN0IGhoID0gdGhpcy5ib3VuZHMuc2l6ZS55IC8gMjtcblxuICAgIHRoaXMubm9ydGhXZXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54IC0gaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLm5vcnRoRWFzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCArIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSAtIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMuc291dGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55ICsgaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcblxuICAgIGZvciAoY29uc3Qge3ZlYywgdW5pdH0gb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnVuaXRzKSkge1xuICAgICAgdGhpcy5ub3J0aFdlc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuYWRkKHZlYywgdW5pdCk7XG4gICAgfVxuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgfVxuICBxdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9KSA9PiBBLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmNPclNoYXBlPzogKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEpIHwgU2hhcGUgfCB1bmRlZmluZWQsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPiB7XG4gICAgY29uc3QgbWFwRnVuYyA9IHR5cGVvZiBtYXBGdW5jT3JTaGFwZSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICBtYXBGdW5jT3JTaGFwZSA6XG4gICAgICB1bmRlZmluZWQ7XG4gICAgaWYgKHNoYXBlICYmICFTaGFwZS5wb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlLCB0aGlzLmJvdW5kcykpIHJldHVybiBbXTtcblxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBsZXQgYXJyID0gT2JqZWN0LnZhbHVlcyh0aGlzLnVuaXRzKTtcbiAgICAgIGlmIChzaGFwZSkge1xuICAgICAgICBhcnIgPSBhcnIuZmlsdGVyKChyKSA9PiBTaGFwZS5vdmVybGFwc1ZlYyhzaGFwZSwgci52ZWMpKTtcbiAgICAgIH1cbiAgICAgIGlmIChtYXBGdW5jKSByZXR1cm4gYXJyLm1hcChtYXBGdW5jKTtcbiAgICAgIHJldHVybiBhcnIgYXMgYW55O1xuICAgIH1cbiAgICBpZiAobWFwRnVuYykge1xuICAgICAgcmV0dXJuIENvbGxlY3Rpb24udG9JdGVyYWJsZVdpdGhNYXAoXG4gICAgICAgICAgbWFwRnVuYyxcbiAgICAgICAgICAoKSA9PiB0aGlzLm5vcnRoV2VzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgICAgICgpID0+IHRoaXMubm9ydGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICAgKCkgPT4gdGhpcy5zb3V0aFdlc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgICAoKSA9PiB0aGlzLnNvdXRoRWFzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgKSBhcyBhbnk7XG4gICAgfVxuICAgIHJldHVybiBDb2xsZWN0aW9uLnRvSXRlcmFibGUoXG4gICAgICAgICgpID0+IHRoaXMubm9ydGhXZXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICgpID0+IHRoaXMubm9ydGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICgpID0+IHRoaXMuc291dGhXZXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICgpID0+IHRoaXMuc291dGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgKSBhcyBhbnk7XG4gIH1cbiAgcHJpdmF0ZSBfcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkge1xuICAgICAgcmV0dXJuIGluaXRpYWxWYWx1ZSE7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBsZXQgYXJyID0gT2JqZWN0LnZhbHVlcyh0aGlzLnVuaXRzKTtcbiAgICAgIGlmIChzaGFwZSkge1xuICAgICAgICBhcnIgPSBhcnIuZmlsdGVyKChyKSA9PiBTaGFwZS5vdmVybGFwc1ZlYyhzaGFwZSEsIHIudmVjKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJyLnJlZHVjZShjYWxsYmFja0Z1bmMgYXMgYW55LCBpbml0aWFsVmFsdWUpIGFzIHVua25vd24gYXMgQTtcbiAgICB9XG4gICAgbGV0IHZhbHVlOiBBID0gaW5pdGlhbFZhbHVlITtcbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhXZXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSk7XG4gICAgdmFsdWUgPSB0aGlzLm5vcnRoRWFzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUpO1xuICAgIHZhbHVlID0gdGhpcy5zb3V0aFdlc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlKTtcbiAgICB2YWx1ZSA9IHRoaXMuc291dGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYzogU2hhcGUgfCBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZTogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+IHwgQSxcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JDYWxsYmFja0Z1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZShcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyxcbiAgICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBBKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgICAgIGluaXRpYWxWYWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+PihcbiAgICAgICAgc2hhcGUsXG4gICAgICAgIChhcnIsIHYpID0+IHtcbiAgICAgICAgICBhcnIucHVzaCh2KTtcbiAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICB9LCBbXSk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckZvcmVhY2hGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBzaGFwZU9yRm9yZWFjaEZ1bmModiwgaW5kZXgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFmb3JlYWNoRnVuYykgcmV0dXJuO1xuICAgICAgdGhpcy5fcXVlcnlSZWR1Y2U8dm9pZD4oXG4gICAgICAgICAgc2hhcGVPckZvcmVhY2hGdW5jLFxuICAgICAgICAgIChfLCB2LCBpbmRleCkgPT4gZm9yZWFjaEZ1bmModiwgaW5kZXgpKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yTWFwRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2goc2hhcGVPck1hcEZ1bmModiwgaW5kZXgpKTtcbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBbXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghbWFwRnVuYykgcmV0dXJuIFtdO1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PEE+PihcbiAgICAgICAgICBzaGFwZU9yTWFwRnVuYyxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2gobWFwRnVuYyh2LCBpbmRleCkpO1xuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdKTtcbiAgICB9XG4gIH1cbiAgX2R1bXBUb1N0cmluZyhyZXN1bHQ6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgcHJlZml4ID0gJyAgICAgICAgICAgICcuc3Vic3RyaW5nKDAsIHRoaXMuZGVwdGgpO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICByZXN1bHQucHVzaChwcmVmaXgpO1xuICAgICAgcmVzdWx0LnB1c2goSlNPTi5zdHJpbmdpZnkodGhpcy51bml0cykpO1xuICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBbXG4gICAgICB7c3RyOiAnTlcnLCBxdDogdGhpcy5ub3J0aFdlc3R9LFxuICAgICAge3N0cjogJ05FJywgcXQ6IHRoaXMubm9ydGhFYXN0fSxcbiAgICAgIHtzdHI6ICdTVycsIHF0OiB0aGlzLnNvdXRoV2VzdH0sXG4gICAgICB7c3RyOiAnU0UnLCBxdDogdGhpcy5zb3V0aEVhc3R9LFxuICAgIF0pIHtcbiAgICAgIHJlc3VsdC5wdXNoKHByZWZpeCk7XG4gICAgICByZXN1bHQucHVzaChjaGlsZC5zdHIpO1xuICAgICAgcmVzdWx0LnB1c2goYCAoJHtjaGlsZC5xdC5zaXplfSk6XFxuYCk7XG4gICAgICBjaGlsZC5xdC5fZHVtcFRvU3RyaW5nKHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZHVtcFRvU3RyaW5nKFtdKS5qb2luKCcnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtcbiAgUXVhZFRyZWUsXG4gIFF1YWRUcmVlT3B0aW9ucyxcbn0gZnJvbSAnLi9RdWFkVHJlZSc7XG5pbXBvcnQge0FBQkIsIFNoYXBlLCBWZWMyfSBmcm9tICcuL3NoYXBlJztcblxuZXhwb3J0IHR5cGUgUXVhZE1hcFVuaXRQb3NpdGlvbkdldHRlckZ1bmM8VD4gPSAobzogVCkgPT4gVmVjMjtcbmV4cG9ydCB0eXBlIFF1YWRNYXBVbml0UG9zaXRpb25TZXR0ZXJGdW5jPFQ+ID0gKG86IFQsIHBvc2l0aW9uOiBWZWMyKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+ID0gKFxuICBhY2M6IEEsXG4gIHByZXZpb3VzOiB7dmVjOiBWZWMyLCB1bml0OiBUfSxcbiAgaW5kZXg6IG51bWJlcixcbikgPT4gQSB8IHVuZGVmaW5lZDtcbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVBvc2l0aW9uT3V0T2ZCb3VuZHNFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVNldDxUPiBpbXBsZW1lbnRzIFNldDxUPiB7XG4gIHN0YXRpYyBVbmlxdWVVbml0QXRWZWNLZXlGdW5jID0gUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jO1xuICBwcml2YXRlIHF1YXJkVHJlZTogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPjtcbiAgY29uc3RydWN0b3IoYm91bmRzOiBBQUJCLCBvcHRpb25zOiBRdWFkVHJlZU9wdGlvbnM8VD4gJiB7XG4gICAgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPixcbiAgfSkge1xuICAgIHRoaXMucXVhcmRUcmVlID0gbmV3IFF1YWRUcmVlKGJvdW5kcywgb3B0aW9ucyk7XG4gICAgdGhpcy51bml0UG9zaXRpb25HZXR0ZXIgPSBvcHRpb25zLnVuaXRQb3NpdGlvbkdldHRlcjtcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuc2l6ZTtcbiAgfVxuICBnZXQgYm91bmRzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5ib3VuZHM7XG4gIH1cbiAgYWRkKHQ6IFQpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpO1xuICAgIGlmICghdGhpcy5xdWFyZFRyZWUuYWRkKHBvc2l0aW9uLCB0KSkge1xuICAgICAgdGhyb3cgbmV3IFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yKFxuICAgICAgICAgIGBwb3NpdGlvbiAke0pTT04uc3RyaW5naWZ5KHBvc2l0aW9uKX0gaXMgb3V0IG9mIGJvdW5kczpgICtcbiAgICAgICAgICBgICR7SlNPTi5zdHJpbmdpZnkodGhpcy5xdWFyZFRyZWUuYm91bmRzKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgbW92ZSh0OiBULCB0bzogVmVjMikge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5tb3ZlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0bywgdCk7XG4gIH1cbiAgZGVsZXRlKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuZGVsZXRlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBoYXModDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5oYXModGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMucXVhcmRUcmVlLmNsZWFyKCk7XG4gIH1cbiAgZm9yRWFjaChjYWxsYmFja2ZuOiAodmFsdWU6IFQsIHZhbHVlMjogVCwgc2V0OiBTZXQ8VD4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlSZWR1Y2UoXG4gICAgICAgIChfLCBwKSA9PiBjYWxsYmFja2ZuKHAudW5pdCEsIHAudW5pdCEsIHRoaXMpKTtcbiAgfVxuICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W1QsIFRdPiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZTxbVCwgVF0+KFxuICAgICAgICAocCkgPT4gW3AudW5pdCEsIHAudW5pdCFdKSBhcyBhbnk7XG4gIH1cbiAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMoKTtcbiAgfVxuICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZTxUPihcbiAgICAgICAgKHApID0+IHAudW5pdCEpIGFzIGFueTtcbiAgfVxuICBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUudG9TdHJpbmcoKTtcbiAgfVxuICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXMoKTtcbiAgfVxuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSkgYXNcbiAgICAgIEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PjtcbiAgfVxuXG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmM6IFNoYXBlIHwgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWU6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPiB8IEEsXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5UmVkdWNlKFxuICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jIGFzIFNoYXBlLFxuICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBhbnksXG4gICAgICAgIGluaXRpYWxWYWx1ZSk7XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdDogVH0+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlBcnJheShzaGFwZSkgYXMgYW55O1xuICB9XG5cbiAgcXVlcnlGb3JFYWNoKFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGVPckZvcmVhY2hGdW5jOlxuICAgICAgICBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQpLFxuICAgICAgZm9yZWFjaEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIHRoaXMucXVhcmRUcmVlLnF1ZXJ5Rm9yRWFjaChzaGFwZU9yRm9yZWFjaEZ1bmMgYXMgYW55LCBmb3JlYWNoRnVuYyBhcyBhbnkpO1xuICB9XG5cbiAgcXVlcnlNYXA8QT4oXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGVPck1hcEZ1bmM6IFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSksXG4gICAgICBtYXBGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5TWFwKHNoYXBlT3JNYXBGdW5jIGFzIFNoYXBlLCBtYXBGdW5jIGFzIGFueSk7XG4gIH1cbn1cbiIsImltcG9ydCB7UXVhZFRyZWVTZXR9IGZyb20gJy4uL3NyYy9RdWFkVHJlZVNldCc7XG5pbXBvcnQge0FBQkIsIFNoYXBlLCBWZWMyfSBmcm9tICcuLi9zcmMvc2hhcGUnO1xuXG5cbmNvbnN0IGNhbmNhc0FsbCA9XG4gIHdpbmRvdy5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWxsJykgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG5jb25zdCBjdHhBbGwgPSBjYW5jYXNBbGwuZ2V0Q29udGV4dCgnMmQnKSE7XG5cbmNvbnN0IGNhbmNhc1F1ZXJ5UmVzdWx0ID1cbiAgd2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdxdWVyeVJlc3VsdCcpIGFzIEhUTUxDYW52YXNFbGVtZW50O1xuY29uc3QgY3R4UXVlcnlSZXN1bHQgPSBjYW5jYXNRdWVyeVJlc3VsdC5nZXRDb250ZXh0KCcyZCcpITtcblxuY2xhc3MgVW5pdCB7XG4gIGlkOiBudW1iZXI7XG4gIF9wb3NpdGlvbjogVmVjMjtcbiAgZ2V0IHBvc2l0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NpdGlvbjtcbiAgfVxuICBzZXQgcG9zaXRpb24odikge1xuICAgIGlmIChxdFNldC5tb3ZlKHRoaXMsIHYpKSB7XG4gICAgICB0aGlzLl9wb3NpdGlvbiA9IHY7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZmFpbGVkIHRvIG1vdmUgJHt0aGlzLmlkfSB0byAke0pTT04uc3RyaW5naWZ5KHYpfSwgYCArXG4gICAgICAgIGBzdGF5cyBhdDogJHtKU09OLnN0cmluZ2lmeSh0aGlzLl9wb3NpdGlvbil9YCk7XG4gICAgfVxuICB9XG4gIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHBvc2l0aW9uOiBWZWMyKSB7XG4gICAgdGhpcy5pZCA9IGlkO1xuICAgIHRoaXMuX3Bvc2l0aW9uID0gcG9zaXRpb247XG4gICAgcXRTZXQuYWRkKHRoaXMpO1xuICB9XG59XG5cbmNvbnN0IHF0U2V0ID0gbmV3IFF1YWRUcmVlU2V0PFVuaXQ+KHtcbiAgc2l6ZToge3g6IGNhbmNhc0FsbC53aWR0aCAvIDIsIHk6IGNhbmNhc0FsbC5oZWlnaHQgLyAyfSxcbiAgY2VudGVyOiB7eDogY2FuY2FzQWxsLndpZHRoIC8gMiwgeTogY2FuY2FzQWxsLmhlaWdodCAvIDJ9LFxufSwge1xuICB1bml0S2V5R2V0dGVyOiAoXywgdW5pdCkgPT4gdW5pdCEuaWQsXG4gIHVuaXRQb3NpdGlvbkdldHRlcjogKHUpID0+IHUucG9zaXRpb24sXG59KTtcblxubGV0IGN1cnJlbnRJZCA9IDA7XG5mdW5jdGlvbiBnZW5lcmF0ZUlkKCk6IG51bWJlciB7XG4gIGlmIChjdXJyZW50SWQgPT0gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHtcbiAgICBjdXJyZW50SWQgPSAwO1xuICAgIHF0U2V0LmNsZWFyKCk7XG4gIH1cbiAgcmV0dXJuICsrY3VycmVudElkO1xufVxuZnVuY3Rpb24gcmFuZG9tUG9zaXRpb24oKTogVmVjMiB7XG4gIHJldHVybiB7XG4gICAgeDogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2FuY2FzQWxsLndpZHRoIGFzIGFueSksXG4gICAgeTogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2FuY2FzQWxsLmhlaWdodCBhcyBhbnkpLFxuICB9O1xufVxuXG5jb25zdCB0b3RhbFVuaXQgPSA1MDAwMDA7XG5jb25zdCB1bml0VG9Nb3ZlRWFjaEZyYW1lID0gTWF0aC5mbG9vcih0b3RhbFVuaXQgKiAwLjAwNSk7XG5jb25zdCB1bml0VG9BZGRFYWNoRnJhbWUgPSBNYXRoLmZsb29yKHRvdGFsVW5pdCAqIDAuMDA1KTtcblxuY29uc3QgdW5pdHM6IChVbml0fHVuZGVmaW5lZClbXSA9IFtdO1xubGV0IGxhc3RFbXB0eUluZGV4ID0gLTE7XG5mdW5jdGlvbiByZWNvcmRVbml0KHU6IFVuaXQpOiBVbml0IHtcbiAgaWYgKHVuaXRzLmxlbmd0aCA+IDEuNSAqIHRvdGFsVW5pdCkge1xuICAgIGlmIChsYXN0RW1wdHlJbmRleCA+IC0xICYmIHVuaXRzW2xhc3RFbXB0eUluZGV4XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB1bml0c1tsYXN0RW1wdHlJbmRleF0gPSB1O1xuICAgICAgbGFzdEVtcHR5SW5kZXggPSAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgdW5pdHNbdW5pdHMuZmluZEluZGV4KCh1dSkgPT4gdXUgPT09IHVuZGVmaW5lZCldID0gdTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdW5pdHMucHVzaCh1KTtcbiAgfVxuICByZXR1cm4gdTtcbn1cbmZ1bmN0aW9uIHRha2VBVW5pdCgpOiBVbml0IHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBpbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHVuaXRzLmxlbmd0aCk7XG4gICAgY29uc3QgdW5pdCA9IHVuaXRzW2luZGV4XTtcbiAgICBpZiAodW5pdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB1bml0c1tpbmRleF0gPSB1bmRlZmluZWQ7XG4gICAgICBsYXN0RW1wdHlJbmRleCA9IGluZGV4O1xuICAgICAgcmV0dXJuIHVuaXQ7XG4gICAgfVxuICB9XG59XG5mdW5jdGlvbiBtb3ZlUmFuZG9tRGlyZWN0aW9uKHY6IFZlYzIpIHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB2ZWMgPSB7XG4gICAgICB4OiB2LnggKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA0KSAtIDIsXG4gICAgICB5OiB2LnkgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA0KSAtIDIsXG4gICAgfTtcbiAgICBpZiAoQUFCQi5vdmVybGFwc1ZlYyhxdFNldC5ib3VuZHMsIHZlYykpIHJldHVybiB2ZWM7XG4gIH1cbn1cbmZ1bmN0aW9uIGdldE1vdXNlUG9zKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsIGV2dDogTW91c2VFdmVudCkge1xuICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICByZXR1cm4ge1xuICAgIHg6IGV2dC5jbGllbnRYIC0gcmVjdC5sZWZ0LFxuICAgIHk6IGV2dC5jbGllbnRZIC0gcmVjdC50b3AsXG4gIH07XG59XG5sZXQgbW91c2VQb3M6IFZlYzIgPSB7eDogMCwgeTogMH07XG5jYW5jYXNBbGwub25tb3VzZW1vdmUgPSBmdW5jdGlvbihldnQ6IE1vdXNlRXZlbnQpIHtcbiAgbW91c2VQb3MgPSBnZXRNb3VzZVBvcyhjYW5jYXNBbGwsIGV2dCk7XG59O1xuY2FuY2FzUXVlcnlSZXN1bHQub25tb3VzZW1vdmUgPSBmdW5jdGlvbihldnQ6IE1vdXNlRXZlbnQpIHtcbiAgbW91c2VQb3MgPSBnZXRNb3VzZVBvcyhjYW5jYXNRdWVyeVJlc3VsdCwgZXZ0KTtcbn07XG5cbmxldCBwcmV2aW91c1RpbWVTdGFtcDogRE9NSGlnaFJlc1RpbWVTdGFtcDtcbmZ1bmN0aW9uIGFuaW1hdGUodGltZXN0YW1wOiBET01IaWdoUmVzVGltZVN0YW1wKSB7XG4gIGN0eEFsbC5jbGVhclJlY3QoMCwgMCwgY2FuY2FzQWxsLndpZHRoLCBjYW5jYXNBbGwuaGVpZ2h0KTtcbiAgY3R4QWxsLnNhdmUoKTtcbiAgY3R4QWxsLmZpbGxTdHlsZSA9ICdyZWQnO1xuICB3aGlsZSAocXRTZXQuc2l6ZSA8IHRvdGFsVW5pdCkge1xuICAgIGNvbnNvbGUubG9nKHF0U2V0LnNpemUpO1xuICAgIHJlY29yZFVuaXQobmV3IFVuaXQoZ2VuZXJhdGVJZCgpLCByYW5kb21Qb3NpdGlvbigpKSk7XG4gIH1cbiAgZm9yIChsZXQgaT0wOyBpPHVuaXRUb01vdmVFYWNoRnJhbWU7IGkrKykge1xuICAgIGNvbnN0IHVuaXQgPSB0YWtlQVVuaXQoKTtcbiAgICB1bml0LnBvc2l0aW9uID0gbW92ZVJhbmRvbURpcmVjdGlvbih1bml0LnBvc2l0aW9uKTtcbiAgICByZWNvcmRVbml0KHVuaXQpO1xuICB9XG4gIGZvciAobGV0IGk9MDsgaTx1bml0VG9BZGRFYWNoRnJhbWU7IGkrKykge1xuICAgIGNvbnN0IHVuaXQgPSB0YWtlQVVuaXQoKTtcbiAgICBpZiAoIXF0U2V0LmRlbGV0ZSh1bml0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBkZWxldGUgZmFpbGVkOiBgICtcbiAgICAgICAgYCR7dW5pdC5pZH0gJHtKU09OLnN0cmluZ2lmeSh1bml0LnBvc2l0aW9uKX1gKTtcbiAgICB9XG4gICAgcmVjb3JkVW5pdChuZXcgVW5pdChnZW5lcmF0ZUlkKCksIHJhbmRvbVBvc2l0aW9uKCkpKTtcbiAgfVxuICAvLyBxdFNldC5xdWVyeUZvckVhY2goKHYpID0+IGN0eEFsbC5maWxsUmVjdCh2LnZlYy54LCB2LnZlYy55LCAxLCAxKSk7XG4gIGlmIChwcmV2aW91c1RpbWVTdGFtcCkge1xuICAgIGN0eEFsbC5maWxsU3R5bGUgPSAnYmx1ZSc7XG4gICAgY3R4QWxsLmZvbnQgPSAnMTVweCBBcmlhbCc7XG4gICAgY3R4QWxsLmZpbGxUZXh0KFxuICAgICAgICBgJHtNYXRoLnJvdW5kKDEwMDAvKHRpbWVzdGFtcCAtIHByZXZpb3VzVGltZVN0YW1wKSl9IGZwc2AsIDEwLCA1MCk7XG4gIH1cbiAgY3R4QWxsLnJlc3RvcmUoKTtcblxuICBjdHhRdWVyeVJlc3VsdC5jbGVhclJlY3QoMCwgMCxcbiAgICAgIGNhbmNhc1F1ZXJ5UmVzdWx0LndpZHRoLCBjYW5jYXNRdWVyeVJlc3VsdC5oZWlnaHQpO1xuICBjdHhRdWVyeVJlc3VsdC5zYXZlKCk7XG4gIGN0eFF1ZXJ5UmVzdWx0LmZpbGxTdHlsZSA9ICdncmVlbic7XG4gIGxldCBxdWVyeUNvdW50ID0gMDtcbiAgcXRTZXQucXVlcnlGb3JFYWNoKFNoYXBlLmNyZWF0ZUVsbGlwc2UobW91c2VQb3MsIDEwKSwgKHt2ZWN9KSA9PiB7XG4gICAgY3R4UXVlcnlSZXN1bHQuZmlsbFJlY3QodmVjLngsIHZlYy55LCAxLCAxKTtcbiAgICBxdWVyeUNvdW50ICsrO1xuICB9KTtcbiAgY3R4UXVlcnlSZXN1bHQuZmlsbFN0eWxlID0gJ2JsYWNrJztcbiAgY3R4UXVlcnlSZXN1bHQuZm9udCA9ICcxNXB4IEFyaWFsJztcbiAgY3R4UXVlcnlSZXN1bHQuZmlsbFRleHQoXG4gICAgICBgJHtxdWVyeUNvdW50fS8ke3F0U2V0LnNpemV9IHF1ZXJpZWRgLCBjYW5jYXNRdWVyeVJlc3VsdC53aWR0aCAtIDEwMCwgNTApO1xuICBjdHhRdWVyeVJlc3VsdC5yZXN0b3JlKCk7XG4gIHByZXZpb3VzVGltZVN0YW1wID0gdGltZXN0YW1wO1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG59XG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O1FBR2lCLFVBQVUsQ0FrRjFCO0lBbEZELFdBQWlCLFVBQVU7UUFDekIsU0FBZ0IsT0FBTyxDQUFJLENBQWdCO1lBQ3pDLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRTtnQkFDdEIsT0FBTyxDQUFDLENBQUM7YUFDVjtZQUNELE1BQU0sQ0FBQyxHQUFRLEVBQUUsQ0FBQztZQUNsQixJQUFLLENBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN4QyxLQUFLLE1BQU0sQ0FBQyxJQUFLLENBQWtCLEVBQUU7b0JBQ25DLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ1g7Z0JBQ0QsT0FBTyxDQUFDLENBQUM7YUFDVjtZQUNELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtnQkFDZCxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDaEIsQ0FB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
