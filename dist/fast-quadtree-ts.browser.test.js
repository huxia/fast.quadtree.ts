
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.1.0
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5icm93c2VyLnRlc3QuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb2xsZWN0aW9uLnRzIiwiLi4vLi4vc3JjL3NoYXBlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlU2V0LnRzIiwiLi4vLi4vdGVzdC9icm93c2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbjxUPiA9IEl0ZXJhdG9yPFQ+IHwgQXJyYXk8VD47XG5leHBvcnQgdHlwZSBJdGVyYWJsZTxUPiA9IEl0ZXJhYmxlSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCBuYW1lc3BhY2UgQ29sbGVjdGlvbiB7XG4gIGV4cG9ydCBmdW5jdGlvbiB0b0FycmF5PFQ+KGM6IENvbGxlY3Rpb248VD4pIHtcbiAgICBpZiAoYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgY29uc3QgcjogVFtdID0gW107XG4gICAgaWYgKChjIGFzIEdlbmVyYXRvcjxUPilbU3ltYm9sLml0ZXJhdG9yXSkge1xuICAgICAgZm9yIChjb25zdCBpIG9mIChjIGFzIEdlbmVyYXRvcjxUPikpIHtcbiAgICAgICAgci5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGxldCBpID0gYy5uZXh0KCk7XG4gICAgd2hpbGUgKCFpLmRvbmUpIHtcbiAgICAgIHIucHVzaChpLnZhbHVlKTtcbiAgICAgIGkgPSBjLm5leHQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlPFQ+KFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gZnVuYygpO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiogdG9JdGVyYWJsZVdpdGhGaWx0ZXI8VD4oXG4gICAgICBmaWx0ZXJGdW5jOiAoKG86IFQpID0+IGJvb2xlYW4pLFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gZnVuYygpO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmMgfHwgZmlsdGVyRnVuYyhyZXN1bHQpKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgaWYgKCFmaWx0ZXJGdW5jIHx8IGZpbHRlckZ1bmMocmVzdWx0LnZhbHVlKSkge1xuICAgICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aE1hcDxULCBBPihcbiAgICAgIG1hcEZ1bmM6ICgobzogVCkgPT4gQSksXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKCgpID0+IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImV4cG9ydCBpbnRlcmZhY2UgVmVjMiB7XG4gIHg6IG51bWJlcjtcbiAgeTogbnVtYmVyO1xufVxuZXhwb3J0IGludGVyZmFjZSBBQUJCIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBWZWMyO1xufVxuZXhwb3J0IG5hbWVzcGFjZSBBQUJCIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKGFhYmI6IEFBQkIsIHZlYzogVmVjMik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhYWJiLmNlbnRlci54IC0gYWFiYi5zaXplLnggPD0gdmVjLnggJiZcbiAgICAgIHZlYy54IDw9IGFhYmIuY2VudGVyLnggKyBhYWJiLnNpemUueCAmJlxuICAgICAgYWFiYi5jZW50ZXIueSAtIGFhYmIuc2l6ZS55IDw9IHZlYy55ICYmXG4gICAgICB2ZWMueSA8PSBhYWJiLmNlbnRlci55ICsgYWFiYi5zaXplLnk7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzQUFCQihvbmU6IEFBQkIsIGFub3RoZXI6IEFBQkIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIShcbiAgICAgIGFub3RoZXIuY2VudGVyLnggLSBhbm90aGVyLnNpemUueCA+IG9uZS5jZW50ZXIueCArIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnggKyBhbm90aGVyLnNpemUueCA8IG9uZS5jZW50ZXIueCAtIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgLSBhbm90aGVyLnNpemUueSA+IG9uZS5jZW50ZXIueSArIG9uZS5zaXplLnkgfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgKyBhbm90aGVyLnNpemUueSA8IG9uZS5jZW50ZXIueSAtIG9uZS5zaXplLnlcbiAgICApO1xuICB9XG59XG50eXBlIFJlY3RhbmdsZVNoYXBlID0ge1xuICB0eXBlOiAncmVjdGFuZ2xlJ1xufSAmIEFBQkI7XG50eXBlIEVsbGlwc2VTaGFwZSA9IHtcbiAgdHlwZTogJ2VsbGlwc2UnXG59ICYgQUFCQjtcbnR5cGUgQ2lyY2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdjaXJjbGUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG50eXBlIFNxdWFyZVNoYXBlID0ge1xuICB0eXBlOiAnc3F1YXJlJ1xufSAmIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBudW1iZXI7XG59O1xuZXhwb3J0IHR5cGUgU2hhcGUgPSBSZWN0YW5nbGVTaGFwZSB8IEVsbGlwc2VTaGFwZSB8IENpcmNsZVNoYXBlIHwgU3F1YXJlU2hhcGU7XG5leHBvcnQgbmFtZXNwYWNlIFNoYXBlIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKHNoYXBlOiBTaGFwZSwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoIChzaGFwZS50eXBlKSB7XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOiByZXR1cm4gQUFCQi5vdmVybGFwc1ZlYyhzaGFwZSwgdmVjKTtcbiAgICAgIGNhc2UgJ3NxdWFyZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHtcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdjaXJjbGUnOiByZXR1cm4gU2hhcGUub3ZlcmxhcHNWZWMoe1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICB9LCB2ZWMpO1xuICAgICAgY2FzZSAnZWxsaXBzZSc6IHtcbiAgICAgICAgY29uc3QgcCA9XG4gICAgICAgICAgTWF0aC5wb3codmVjLnggLSBzaGFwZS5jZW50ZXIueCwgMikgLyBNYXRoLnBvdyhzaGFwZS5zaXplLngsIDIpICtcbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueSAtIHNoYXBlLmNlbnRlci55LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueSwgMik7XG4gICAgICAgIHJldHVybiBwIDw9IDE7XG4gICAgICB9XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gcG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZTogU2hhcGUsIGFhYmI6IEFBQkIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2VsbGlwc2UnOlxuICAgICAgY2FzZSAncmVjdGFuZ2xlJzpcbiAgICAgICAgcmV0dXJuIEFBQkIub3ZlcmxhcHNBQUJCKHNoYXBlLCBhYWJiKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6XG4gICAgICBjYXNlICdzcXVhcmUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoe1xuICAgICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgICAgfSwgYWFiYik7XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVjdGFuZ2xlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnc3F1YXJlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3JlY3RhbmdsZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGxpcHNlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnY2lyY2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2VsbGlwc2UnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHtDb2xsZWN0aW9uLCBJdGVyYWJsZX0gZnJvbSAnLi9jb2xsZWN0aW9uJztcbmltcG9ydCB7VmVjMiwgQUFCQiwgU2hhcGV9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+ID0gKFxuICB2ZWM6IFZlYzIsIHVuaXQ6IFQsIHF1YWRUcmVlOiBRdWFkVHJlZTxUPlxuKSA9PiBzdHJpbmcgfCBudW1iZXI7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gICAgYWNjOiBBLFxuICAgIHByZXZpb3VzOiB7dmVjOiBWZWMyLCB1bml0PzogVH0sXG4gICAgaW5kZXg6IG51bWJlcixcbikgPT4gQSB8IHVuZGVmaW5lZDtcbmV4cG9ydCBpbnRlcmZhY2UgUXVhZFRyZWVPcHRpb25zPFQ+IHtcbiAgdW5pdEtleUdldHRlcjogUXVhZFRyZWVVbml0S2V5RnVuYzxUPixcbiAgaW50ZWdlckNvb3JkaW5hdGU/OiBib29sZWFuLFxufVxuZXhwb3J0IGludGVyZmFjZSBSZWFkb25seVF1YWRUcmVlPFQ+IHtcbiAgcmVhZG9ubHkgYm91bmRzOiBBQUJCO1xuICByZWFkb25seSBzaXplOiBudW1iZXJcbiAgaGFzKHZlYzogVmVjMiwgdW5pdD86IFQpOiBib29sZWFuO1xuICBxdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9KSA9PiBBLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG59XG5leHBvcnQgY2xhc3MgUXVhZFRyZWU8VD4gaW1wbGVtZW50cyBSZWFkb25seVF1YWRUcmVlPFQ+IHtcbiAgc3RhdGljIE1heEVsZW1lbnRzID0gODtcbiAgc3RhdGljIE1heERlcHRoID0gODtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyA9IChcbiAgICAgIHZlYzogVmVjMixcbiAgICAgIF86IGFueSxcbiAgICAgIHF1YWRUcmVlOiBRdWFkVHJlZTxhbnk+LFxuICApID0+XG4gICAgcXVhZFRyZWUub3B0aW9ucy5pbnRlZ2VyQ29vcmRpbmF0ZSA/XG4gICAgICB2ZWMueCArIChxdWFkVHJlZS5ib3VuZHMuc2l6ZS54ICogMikgKiB2ZWMueSA6XG4gICAgICBgJHt2ZWMueH0sJHt2ZWMueX1gO1xuXG4gIGJvdW5kczogQUFCQjtcblxuICBwcml2YXRlIGRlcHRoOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBkaXZpZGVkOiBib29sZWFuO1xuXG4gIHByaXZhdGUgdW5pdHM6IHtba2V5OiBzdHJpbmcgfCBudW1iZXJdOiB7dW5pdDogVCwgdmVjOiBWZWMyfX07XG5cbiAgcHJpdmF0ZSBub3J0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBub3J0aEVhc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aFdlc3QhOiBRdWFkVHJlZTxUPjtcbiAgcHJpdmF0ZSBzb3V0aEVhc3QhOiBRdWFkVHJlZTxUPjtcblxuICBzaXplOiBudW1iZXI7XG5cbiAgcmVhZG9ubHkgb3B0aW9uczogUXVhZFRyZWVPcHRpb25zPFQ+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgYm91bmRzOiBBQUJCLFxuICAgICAgb3B0aW9ucz86IFF1YWRUcmVlT3B0aW9uczxUPixcbiAgICAgIGRlcHRoOiBudW1iZXIgPSAwLFxuICApIHtcbiAgICB0aGlzLmJvdW5kcyA9IGJvdW5kcztcbiAgICB0aGlzLmRlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5kaXZpZGVkID0gZmFsc2U7XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICAgIHRoaXMuc2l6ZSA9IDA7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7XG4gICAgICB1bml0S2V5R2V0dGVyOiBRdWFkVHJlZS5VbmlxdWVVbml0QXRQb3NpdGlvbktleUZ1bmMsXG4gICAgfTtcbiAgfVxuICBfYWRkKHZlYzogVmVjMiwgdW5pdDogVCk6IGZhbHNlIHwgJ2FkZGVkJyB8ICdleGlzdGluZycge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdmVjKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLmRlcHRoID09IFF1YWRUcmVlLk1heERlcHRoIHx8XG4gICAgICAhdGhpcy5kaXZpZGVkICYmIHRoaXMuc2l6ZSA8IFF1YWRUcmVlLk1heEVsZW1lbnRzKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih2ZWMsIHVuaXQsIHRoaXMpO1xuICAgICAgbGV0IHJlc3VsdDogJ2V4aXN0aW5nJyB8ICdhZGRlZCcgPSAnZXhpc3RpbmcnO1xuICAgICAgaWYgKCF0aGlzLnVuaXRzW2tleV0pIHtcbiAgICAgICAgdGhpcy5zaXplICsrO1xuICAgICAgICByZXN1bHQgPSAnYWRkZWQnO1xuICAgICAgfVxuICAgICAgdGhpcy51bml0c1trZXldID0ge3ZlYywgdW5pdH07XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkgdGhpcy5kaXZpZGUoKTtcbiAgICBjb25zdCBpbnNlcnRlZCA9IHRoaXMubm9ydGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhFYXN0Ll9hZGQodmVjLCB1bml0KTtcbiAgICBpZiAoaW5zZXJ0ZWQgPT09ICdhZGRlZCcpIHRoaXMuc2l6ZSArKztcbiAgICByZXR1cm4gaW5zZXJ0ZWQ7XG4gIH1cbiAgYWRkKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuX2FkZCh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgX21vdmUoXG4gICAgICBmcm9tOiBWZWMyLFxuICAgICAgdG86IFZlYzIgfCB1bmRlZmluZWQsXG4gICAgICB1bml0OiBULFxuICApOiBmYWxzZSB8ICdyZW1vdmVkJyB8ICdtb3ZlZCcge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgZnJvbSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIoZnJvbSwgdW5pdCwgdGhpcyk7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodG8gJiYgQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdG8pKSB7XG4gICAgICAgIC8vIHVwZGF0ZSBpbi1wbGFjZVxuICAgICAgICBjb25zdCBuZXdLZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih0bywgdW5pdCwgdGhpcyk7XG4gICAgICAgIGlmIChuZXdLZXkgIT09IGtleSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICAgICAgdGhpcy51bml0c1tuZXdLZXldID0ge3ZlYzogdG8sIHVuaXR9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudW5pdHNba2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ21vdmVkJztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSB0aGlzLnVuaXRzW2tleV07XG4gICAgICB0aGlzLnNpemUgLS07XG4gICAgICByZXR1cm4gJ3JlbW92ZWQnO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLm5vcnRoV2VzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLm5vcnRoRWFzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLnNvdXRoV2VzdC5fbW92ZShmcm9tLCB0bywgdW5pdCkgfHxcbiAgICAgICAgICB0aGlzLnNvdXRoRWFzdC5fbW92ZShmcm9tLCB0bywgdW5pdCk7XG4gICAgaWYgKHJlc3VsdCA9PT0gJ3JlbW92ZWQnKSB7XG4gICAgICB0aGlzLnNpemUgLS07XG4gICAgICBpZiAodG8pIHtcbiAgICAgICAgaWYgKHRoaXMuYWRkKHRvLCB1bml0KSkgcmV0dXJuICdtb3ZlZCc7XG4gICAgICAgIHJldHVybiAncmVtb3ZlZCc7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgbW92ZShmcm9tOiBWZWMyLCB0bzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdG8pKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuX21vdmUoZnJvbSwgdG8sIHVuaXQpID09PSAncmVtb3ZlZCcpIHRocm93IG5ldyBFcnJvcigndW5leHBlY3RlZCcpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGRlbGV0ZSh2ZWM6IFZlYzIsIHVuaXQ6IFQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZSh2ZWMsIHVuZGVmaW5lZCwgdW5pdCkgPT09ICdyZW1vdmVkJztcbiAgfVxuICBjbGVhcigpIHtcbiAgICB0aGlzLnVuaXRzID0ge307XG4gICAgdGhpcy5zaXplID0gMDtcbiAgICB0aGlzLmRpdmlkZWQgPSBmYWxzZTtcbiAgICB0aGlzLm5vcnRoV2VzdCA9XG4gICAgICB0aGlzLm5vcnRoRWFzdCA9XG4gICAgICB0aGlzLnNvdXRoV2VzdCA9XG4gICAgICB0aGlzLnNvdXRoRWFzdCA9IHVuZGVmaW5lZCE7XG4gIH1cbiAgaGFzKHZlYzogVmVjMiwgdW5pdDogVCk6IGJvb2xlYW4ge1xuICAgIGlmICghQUFCQi5vdmVybGFwc1ZlYyh0aGlzLmJvdW5kcywgdmVjKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMudW5pdEtleUdldHRlcih2ZWMsIHVuaXQsIHRoaXMpO1xuICAgICAgcmV0dXJuICEhdGhpcy51bml0c1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub3J0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuaGFzKHZlYywgdW5pdCk7XG4gIH1cbiAgcHJpdmF0ZSBkaXZpZGUoKSB7XG4gICAgdGhpcy5kaXZpZGVkID0gdHJ1ZTtcbiAgICBjb25zdCBodyA9IHRoaXMuYm91bmRzLnNpemUueCAvIDI7XG4gICAgY29uc3QgaGggPSB0aGlzLmJvdW5kcy5zaXplLnkgLyAyO1xuXG4gICAgdGhpcy5ub3J0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgLSBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMubm9ydGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLnNvdXRoV2VzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCAtIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSArIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aEVhc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggKyBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuXG4gICAgZm9yIChjb25zdCB7dmVjLCB1bml0fSBvZiBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpKSB7XG4gICAgICB0aGlzLm5vcnRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5ub3J0aEVhc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoRWFzdC5hZGQodmVjLCB1bml0KTtcbiAgICB9XG4gICAgdGhpcy51bml0cyA9IHt9O1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPjtcbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlJdGVyYXRhYmxlPEE+KFxuICAgICAgbWFwRnVuY09yU2hhcGU/OiAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSkgPT4gQSkgfCBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPEE+IHtcbiAgICBjb25zdCBtYXBGdW5jID0gdHlwZW9mIG1hcEZ1bmNPclNoYXBlID09PSAnZnVuY3Rpb24nID9cbiAgICAgIG1hcEZ1bmNPclNoYXBlIDpcbiAgICAgIHVuZGVmaW5lZDtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkgcmV0dXJuIFtdO1xuXG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGxldCBhcnIgPSBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpO1xuICAgICAgaWYgKHNoYXBlKSB7XG4gICAgICAgIGFyciA9IGFyci5maWx0ZXIoKHIpID0+IFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlLCByLnZlYykpO1xuICAgICAgfVxuICAgICAgaWYgKG1hcEZ1bmMpIHJldHVybiBhcnIubWFwKG1hcEZ1bmMpO1xuICAgICAgcmV0dXJuIGFyciBhcyBhbnk7XG4gICAgfVxuICAgIGlmIChtYXBGdW5jKSB7XG4gICAgICByZXR1cm4gQ29sbGVjdGlvbi50b0l0ZXJhYmxlV2l0aE1hcChcbiAgICAgICAgICBtYXBGdW5jLFxuICAgICAgICAgICgpID0+IHRoaXMubm9ydGhXZXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICAgKCkgPT4gdGhpcy5ub3J0aEVhc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgICAoKSA9PiB0aGlzLnNvdXRoV2VzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgICAgICgpID0+IHRoaXMuc291dGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICApIGFzIGFueTtcbiAgICB9XG4gICAgcmV0dXJuIENvbGxlY3Rpb24udG9JdGVyYWJsZShcbiAgICAgICAgKCkgPT4gdGhpcy5ub3J0aFdlc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgKCkgPT4gdGhpcy5ub3J0aEVhc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgKCkgPT4gdGhpcy5zb3V0aFdlc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgKCkgPT4gdGhpcy5zb3V0aEVhc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICApIGFzIGFueTtcbiAgfVxuICBwcml2YXRlIF9xdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIGlmIChzaGFwZSAmJiAhU2hhcGUucG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZSwgdGhpcy5ib3VuZHMpKSB7XG4gICAgICByZXR1cm4gaW5pdGlhbFZhbHVlITtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGxldCBhcnIgPSBPYmplY3QudmFsdWVzKHRoaXMudW5pdHMpO1xuICAgICAgaWYgKHNoYXBlKSB7XG4gICAgICAgIGFyciA9IGFyci5maWx0ZXIoKHIpID0+IFNoYXBlLm92ZXJsYXBzVmVjKHNoYXBlISwgci52ZWMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhcnIucmVkdWNlKGNhbGxiYWNrRnVuYyBhcyBhbnksIGluaXRpYWxWYWx1ZSkgYXMgdW5rbm93biBhcyBBO1xuICAgIH1cbiAgICBsZXQgdmFsdWU6IEEgPSBpbml0aWFsVmFsdWUhO1xuICAgIHZhbHVlID0gdGhpcy5ub3J0aFdlc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlKTtcbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSk7XG4gICAgdmFsdWUgPSB0aGlzLnNvdXRoV2VzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUpO1xuICAgIHZhbHVlID0gdGhpcy5zb3V0aEVhc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckNhbGxiYWNrRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jLFxuICAgICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIEEpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2UoXG4gICAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyxcbiAgICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICAgICAgaW5pdGlhbFZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4+KFxuICAgICAgICBzaGFwZSxcbiAgICAgICAgKGFyciwgdikgPT4ge1xuICAgICAgICAgIGFyci5wdXNoKHYpO1xuICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgIH0sIFtdKTtcbiAgfVxuXG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGVPckZvcmVhY2hGdW5jOlxuICAgICAgICBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkKSxcbiAgICAgIGZvcmVhY2hGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKSB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yRm9yZWFjaEZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UmVkdWNlPHZvaWQ+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoXywgdiwgaW5kZXgpID0+IHNoYXBlT3JGb3JlYWNoRnVuYyh2LCBpbmRleCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWZvcmVhY2hGdW5jKSByZXR1cm47XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICBzaGFwZU9yRm9yZWFjaEZ1bmMsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBmb3JlYWNoRnVuYyh2LCBpbmRleCkpO1xuICAgIH1cbiAgfVxuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGVPck1hcEZ1bmM6IFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEpLFxuICAgICAgbWFwRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+IHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JNYXBGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoIW1hcEZ1bmMpIHJldHVybiBbXTtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTxBPj4oXG4gICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChzaGFwZU9yTWFwRnVuYyh2LCBpbmRleCkpO1xuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHNoYXBlT3JNYXBGdW5jLFxuICAgICAgICAgIChhcnIsIHYsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBhcnIucHVzaChtYXBGdW5jKHYsIGluZGV4KSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgW10pO1xuICAgIH1cbiAgfVxuICBfZHVtcFRvU3RyaW5nKHJlc3VsdDogc3RyaW5nW10pIHtcbiAgICBjb25zdCBwcmVmaXggPSAnICAgICAgICAgICAgJy5zdWJzdHJpbmcoMCwgdGhpcy5kZXB0aCk7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHByZWZpeCk7XG4gICAgICByZXN1bHQucHVzaChKU09OLnN0cmluZ2lmeSh0aGlzLnVuaXRzKSk7XG4gICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIFtcbiAgICAgIHtzdHI6ICdOVycsIHF0OiB0aGlzLm5vcnRoV2VzdH0sXG4gICAgICB7c3RyOiAnTkUnLCBxdDogdGhpcy5ub3J0aEVhc3R9LFxuICAgICAge3N0cjogJ1NXJywgcXQ6IHRoaXMuc291dGhXZXN0fSxcbiAgICAgIHtzdHI6ICdTRScsIHF0OiB0aGlzLnNvdXRoRWFzdH0sXG4gICAgXSkge1xuICAgICAgcmVzdWx0LnB1c2gocHJlZml4KTtcbiAgICAgIHJlc3VsdC5wdXNoKGNoaWxkLnN0cik7XG4gICAgICByZXN1bHQucHVzaChgICgke2NoaWxkLnF0LnNpemV9KTpcXG5gKTtcbiAgICAgIGNoaWxkLnF0Ll9kdW1wVG9TdHJpbmcocmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9kdW1wVG9TdHJpbmcoW10pLmpvaW4oJycpO1xuICB9XG59XG4iLCJpbXBvcnQge1xuICBRdWFkVHJlZSxcbiAgUXVhZFRyZWVPcHRpb25zLFxufSBmcm9tICcuL1F1YWRUcmVlJztcbmltcG9ydCB7QUFCQiwgU2hhcGUsIFZlYzJ9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPiA9IChvOiBUKSA9PiBWZWMyO1xuZXhwb3J0IHR5cGUgUXVhZE1hcFVuaXRQb3NpdGlvblNldHRlckZ1bmM8VD4gPSAobzogVCwgcG9zaXRpb246IFZlYzIpID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gIGFjYzogQSxcbiAgcHJldmlvdXM6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LFxuICBpbmRleDogbnVtYmVyLFxuKSA9PiBBIHwgdW5kZWZpbmVkO1xuZXhwb3J0IGNsYXNzIFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgfVxufVxuZXhwb3J0IGludGVyZmFjZSBSZWFkb25seVF1YWRUcmVlU2V0PFQ+IGV4dGVuZHMgUmVhZG9ubHlTZXQ8VD4ge1xuICByZWFkb25seSBib3VuZHM6IEFBQkI7XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeU1hcDxBPihcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbn1cbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVNldDxUPiBpbXBsZW1lbnRzIFNldDxUPiwgUmVhZG9ubHlRdWFkVHJlZVNldDxUPiB7XG4gIHN0YXRpYyBVbmlxdWVVbml0QXRWZWNLZXlGdW5jID0gUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jO1xuICBwcml2YXRlIHF1YXJkVHJlZTogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPjtcbiAgY29uc3RydWN0b3IoYm91bmRzOiBBQUJCLCBvcHRpb25zOiBRdWFkVHJlZU9wdGlvbnM8VD4gJiB7XG4gICAgdW5pdFBvc2l0aW9uR2V0dGVyOiBRdWFkTWFwVW5pdFBvc2l0aW9uR2V0dGVyRnVuYzxUPixcbiAgfSkge1xuICAgIHRoaXMucXVhcmRUcmVlID0gbmV3IFF1YWRUcmVlKGJvdW5kcywgb3B0aW9ucyk7XG4gICAgdGhpcy51bml0UG9zaXRpb25HZXR0ZXIgPSBvcHRpb25zLnVuaXRQb3NpdGlvbkdldHRlcjtcbiAgfVxuICBnZXQgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuc2l6ZTtcbiAgfVxuICBnZXQgYm91bmRzKCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5ib3VuZHM7XG4gIH1cbiAgYWRkKHQ6IFQpIHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpO1xuICAgIGlmICghdGhpcy5xdWFyZFRyZWUuYWRkKHBvc2l0aW9uLCB0KSkge1xuICAgICAgdGhyb3cgbmV3IFF1YWRUcmVlUG9zaXRpb25PdXRPZkJvdW5kc0Vycm9yKFxuICAgICAgICAgIGBwb3NpdGlvbiAke0pTT04uc3RyaW5naWZ5KHBvc2l0aW9uKX0gaXMgb3V0IG9mIGJvdW5kczpgICtcbiAgICAgICAgICBgICR7SlNPTi5zdHJpbmdpZnkodGhpcy5xdWFyZFRyZWUuYm91bmRzKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgbW92ZSh0OiBULCB0bzogVmVjMikge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5tb3ZlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0bywgdCk7XG4gIH1cbiAgZGVsZXRlKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuZGVsZXRlKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBoYXModDogVCkge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5oYXModGhpcy51bml0UG9zaXRpb25HZXR0ZXIodCksIHQpO1xuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMucXVhcmRUcmVlLmNsZWFyKCk7XG4gIH1cbiAgZm9yRWFjaChjYWxsYmFja2ZuOiAodmFsdWU6IFQsIHZhbHVlMjogVCwgc2V0OiBTZXQ8VD4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlSZWR1Y2UoXG4gICAgICAgIChfLCBwKSA9PiB2b2lkKGNhbGxiYWNrZm4ocC51bml0ISwgcC51bml0ISwgdGhpcykpLFxuICAgICAgICB2b2lkKDApLFxuICAgICk7XG4gIH1cbiAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtULCBUXT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8W1QsIFRdPihcbiAgICAgICAgKHApID0+IFtwLnVuaXQhLCBwLnVuaXQhXSkgYXMgYW55O1xuICB9XG4gIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGU8VD4oXG4gICAgICAgIChwKSA9PiBwLnVuaXQhKSBhcyBhbnk7XG4gIH1cbiAgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzKCk7XG4gIH1cbiAgcXVlcnlJdGVyYXRhYmxlKFxuICAgICAgc2hhcGU6IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpIGFzXG4gICAgICBJdGVyYWJsZTx7dmVjOiBWZWMyLCB1bml0OiBUfT47XG4gIH1cblxuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZU9yQ2FsbGJhY2tGdW5jOiBTaGFwZSB8IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gfCBBLFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEEge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeVJlZHVjZShcbiAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyBhcyBTaGFwZSxcbiAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgYW55LFxuICAgICAgICBpbml0aWFsVmFsdWUpO1xuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PiB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5QXJyYXkoc2hhcGUpIGFzIGFueTtcbiAgfVxuXG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkKSxcbiAgICAgIGZvcmVhY2hGdW5jPzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApIHtcbiAgICB0aGlzLnF1YXJkVHJlZS5xdWVyeUZvckVhY2goc2hhcGVPckZvcmVhY2hGdW5jIGFzIGFueSwgZm9yZWFjaEZ1bmMgYXMgYW55KTtcbiAgfVxuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgIHNoYXBlOiBTaGFwZSxcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEpLFxuICAgICAgbWFwRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeU1hcChzaGFwZU9yTWFwRnVuYyBhcyBTaGFwZSwgbWFwRnVuYyBhcyBhbnkpO1xuICB9XG59XG4iLCJpbXBvcnQge1F1YWRUcmVlU2V0fSBmcm9tICcuLi9zcmMvUXVhZFRyZWVTZXQnO1xuaW1wb3J0IHtBQUJCLCBTaGFwZSwgVmVjMn0gZnJvbSAnLi4vc3JjL3NoYXBlJztcblxuXG5jb25zdCBjYW5jYXNBbGwgPVxuICB3aW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FsbCcpIGFzIEhUTUxDYW52YXNFbGVtZW50O1xuY29uc3QgY3R4QWxsID0gY2FuY2FzQWxsLmdldENvbnRleHQoJzJkJykhO1xuXG5jb25zdCBjYW5jYXNRdWVyeVJlc3VsdCA9XG4gIHdpbmRvdy5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncXVlcnlSZXN1bHQnKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcbmNvbnN0IGN0eFF1ZXJ5UmVzdWx0ID0gY2FuY2FzUXVlcnlSZXN1bHQuZ2V0Q29udGV4dCgnMmQnKSE7XG5cbmNsYXNzIFVuaXQge1xuICBpZDogbnVtYmVyO1xuICBfcG9zaXRpb246IFZlYzI7XG4gIGdldCBwb3NpdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zaXRpb247XG4gIH1cbiAgc2V0IHBvc2l0aW9uKHYpIHtcbiAgICBpZiAocXRTZXQubW92ZSh0aGlzLCB2KSkge1xuICAgICAgdGhpcy5fcG9zaXRpb24gPSB2O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGZhaWxlZCB0byBtb3ZlICR7dGhpcy5pZH0gdG8gJHtKU09OLnN0cmluZ2lmeSh2KX0sIGAgK1xuICAgICAgICBgc3RheXMgYXQ6ICR7SlNPTi5zdHJpbmdpZnkodGhpcy5fcG9zaXRpb24pfWApO1xuICAgIH1cbiAgfVxuICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBwb3NpdGlvbjogVmVjMikge1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgICB0aGlzLl9wb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgIHF0U2V0LmFkZCh0aGlzKTtcbiAgfVxufVxuXG5jb25zdCBxdFNldCA9IG5ldyBRdWFkVHJlZVNldDxVbml0Pih7XG4gIHNpemU6IHt4OiBjYW5jYXNBbGwud2lkdGggLyAyLCB5OiBjYW5jYXNBbGwuaGVpZ2h0IC8gMn0sXG4gIGNlbnRlcjoge3g6IGNhbmNhc0FsbC53aWR0aCAvIDIsIHk6IGNhbmNhc0FsbC5oZWlnaHQgLyAyfSxcbn0sIHtcbiAgdW5pdEtleUdldHRlcjogKF8sIHVuaXQpID0+IHVuaXQhLmlkLFxuICB1bml0UG9zaXRpb25HZXR0ZXI6ICh1KSA9PiB1LnBvc2l0aW9uLFxufSk7XG5cbmxldCBjdXJyZW50SWQgPSAwO1xuZnVuY3Rpb24gZ2VuZXJhdGVJZCgpOiBudW1iZXIge1xuICBpZiAoY3VycmVudElkID09IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKSB7XG4gICAgY3VycmVudElkID0gMDtcbiAgICBxdFNldC5jbGVhcigpO1xuICB9XG4gIHJldHVybiArK2N1cnJlbnRJZDtcbn1cbmZ1bmN0aW9uIHJhbmRvbVBvc2l0aW9uKCk6IFZlYzIge1xuICByZXR1cm4ge1xuICAgIHg6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNhbmNhc0FsbC53aWR0aCBhcyBhbnkpLFxuICAgIHk6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNhbmNhc0FsbC5oZWlnaHQgYXMgYW55KSxcbiAgfTtcbn1cblxuY29uc3QgdG90YWxVbml0ID0gNTAwMDAwO1xuY29uc3QgdW5pdFRvTW92ZUVhY2hGcmFtZSA9IE1hdGguZmxvb3IodG90YWxVbml0ICogMC4wMDUpO1xuY29uc3QgdW5pdFRvQWRkRWFjaEZyYW1lID0gTWF0aC5mbG9vcih0b3RhbFVuaXQgKiAwLjAwNSk7XG5cbmNvbnN0IHVuaXRzOiAoVW5pdHx1bmRlZmluZWQpW10gPSBbXTtcbmxldCBsYXN0RW1wdHlJbmRleCA9IC0xO1xuZnVuY3Rpb24gcmVjb3JkVW5pdCh1OiBVbml0KTogVW5pdCB7XG4gIGlmICh1bml0cy5sZW5ndGggPiAxLjUgKiB0b3RhbFVuaXQpIHtcbiAgICBpZiAobGFzdEVtcHR5SW5kZXggPiAtMSAmJiB1bml0c1tsYXN0RW1wdHlJbmRleF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdW5pdHNbbGFzdEVtcHR5SW5kZXhdID0gdTtcbiAgICAgIGxhc3RFbXB0eUluZGV4ID0gLTE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHVuaXRzW3VuaXRzLmZpbmRJbmRleCgodXUpID0+IHV1ID09PSB1bmRlZmluZWQpXSA9IHU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHVuaXRzLnB1c2godSk7XG4gIH1cbiAgcmV0dXJuIHU7XG59XG5mdW5jdGlvbiB0YWtlQVVuaXQoKTogVW5pdCB7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgaW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB1bml0cy5sZW5ndGgpO1xuICAgIGNvbnN0IHVuaXQgPSB1bml0c1tpbmRleF07XG4gICAgaWYgKHVuaXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdW5pdHNbaW5kZXhdID0gdW5kZWZpbmVkO1xuICAgICAgbGFzdEVtcHR5SW5kZXggPSBpbmRleDtcbiAgICAgIHJldHVybiB1bml0O1xuICAgIH1cbiAgfVxufVxuZnVuY3Rpb24gbW92ZVJhbmRvbURpcmVjdGlvbih2OiBWZWMyKSB7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgdmVjID0ge1xuICAgICAgeDogdi54ICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNCkgLSAyLFxuICAgICAgeTogdi55ICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNCkgLSAyLFxuICAgIH07XG4gICAgaWYgKEFBQkIub3ZlcmxhcHNWZWMocXRTZXQuYm91bmRzLCB2ZWMpKSByZXR1cm4gdmVjO1xuICB9XG59XG5mdW5jdGlvbiBnZXRNb3VzZVBvcyhjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50LCBldnQ6IE1vdXNlRXZlbnQpIHtcbiAgY29uc3QgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgcmV0dXJuIHtcbiAgICB4OiBldnQuY2xpZW50WCAtIHJlY3QubGVmdCxcbiAgICB5OiBldnQuY2xpZW50WSAtIHJlY3QudG9wLFxuICB9O1xufVxubGV0IG1vdXNlUG9zOiBWZWMyID0ge3g6IDAsIHk6IDB9O1xuY2FuY2FzQWxsLm9ubW91c2Vtb3ZlID0gZnVuY3Rpb24oZXZ0OiBNb3VzZUV2ZW50KSB7XG4gIG1vdXNlUG9zID0gZ2V0TW91c2VQb3MoY2FuY2FzQWxsLCBldnQpO1xufTtcbmNhbmNhc1F1ZXJ5UmVzdWx0Lm9ubW91c2Vtb3ZlID0gZnVuY3Rpb24oZXZ0OiBNb3VzZUV2ZW50KSB7XG4gIG1vdXNlUG9zID0gZ2V0TW91c2VQb3MoY2FuY2FzUXVlcnlSZXN1bHQsIGV2dCk7XG59O1xuXG5sZXQgcHJldmlvdXNUaW1lU3RhbXA6IERPTUhpZ2hSZXNUaW1lU3RhbXA7XG5mdW5jdGlvbiBhbmltYXRlKHRpbWVzdGFtcDogRE9NSGlnaFJlc1RpbWVTdGFtcCkge1xuICBjdHhBbGwuY2xlYXJSZWN0KDAsIDAsIGNhbmNhc0FsbC53aWR0aCwgY2FuY2FzQWxsLmhlaWdodCk7XG4gIGN0eEFsbC5zYXZlKCk7XG4gIGN0eEFsbC5maWxsU3R5bGUgPSAncmVkJztcbiAgd2hpbGUgKHF0U2V0LnNpemUgPCB0b3RhbFVuaXQpIHtcbiAgICBjb25zb2xlLmxvZyhxdFNldC5zaXplKTtcbiAgICByZWNvcmRVbml0KG5ldyBVbml0KGdlbmVyYXRlSWQoKSwgcmFuZG9tUG9zaXRpb24oKSkpO1xuICB9XG4gIGZvciAobGV0IGk9MDsgaTx1bml0VG9Nb3ZlRWFjaEZyYW1lOyBpKyspIHtcbiAgICBjb25zdCB1bml0ID0gdGFrZUFVbml0KCk7XG4gICAgdW5pdC5wb3NpdGlvbiA9IG1vdmVSYW5kb21EaXJlY3Rpb24odW5pdC5wb3NpdGlvbik7XG4gICAgcmVjb3JkVW5pdCh1bml0KTtcbiAgfVxuICBmb3IgKGxldCBpPTA7IGk8dW5pdFRvQWRkRWFjaEZyYW1lOyBpKyspIHtcbiAgICBjb25zdCB1bml0ID0gdGFrZUFVbml0KCk7XG4gICAgaWYgKCFxdFNldC5kZWxldGUodW5pdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZGVsZXRlIGZhaWxlZDogYCArXG4gICAgICAgIGAke3VuaXQuaWR9ICR7SlNPTi5zdHJpbmdpZnkodW5pdC5wb3NpdGlvbil9YCk7XG4gICAgfVxuICAgIHJlY29yZFVuaXQobmV3IFVuaXQoZ2VuZXJhdGVJZCgpLCByYW5kb21Qb3NpdGlvbigpKSk7XG4gIH1cbiAgLy8gcXRTZXQucXVlcnlGb3JFYWNoKCh2KSA9PiBjdHhBbGwuZmlsbFJlY3Qodi52ZWMueCwgdi52ZWMueSwgMSwgMSkpO1xuICBpZiAocHJldmlvdXNUaW1lU3RhbXApIHtcbiAgICBjdHhBbGwuZmlsbFN0eWxlID0gJ2JsdWUnO1xuICAgIGN0eEFsbC5mb250ID0gJzE1cHggQXJpYWwnO1xuICAgIGN0eEFsbC5maWxsVGV4dChcbiAgICAgICAgYCR7TWF0aC5yb3VuZCgxMDAwLyh0aW1lc3RhbXAgLSBwcmV2aW91c1RpbWVTdGFtcCkpfSBmcHNgLCAxMCwgNTApO1xuICB9XG4gIGN0eEFsbC5yZXN0b3JlKCk7XG5cbiAgY3R4UXVlcnlSZXN1bHQuY2xlYXJSZWN0KDAsIDAsXG4gICAgICBjYW5jYXNRdWVyeVJlc3VsdC53aWR0aCwgY2FuY2FzUXVlcnlSZXN1bHQuaGVpZ2h0KTtcbiAgY3R4UXVlcnlSZXN1bHQuc2F2ZSgpO1xuICBjdHhRdWVyeVJlc3VsdC5maWxsU3R5bGUgPSAnZ3JlZW4nO1xuICBsZXQgcXVlcnlDb3VudCA9IDA7XG4gIHF0U2V0LnF1ZXJ5Rm9yRWFjaChTaGFwZS5jcmVhdGVFbGxpcHNlKG1vdXNlUG9zLCB7eDogMTIsIHk6IDh9KSwgKHt2ZWN9KSA9PiB7XG4gICAgY3R4UXVlcnlSZXN1bHQuZmlsbFJlY3QodmVjLngsIHZlYy55LCAxLCAxKTtcbiAgICBxdWVyeUNvdW50ICsrO1xuICB9KTtcbiAgY3R4UXVlcnlSZXN1bHQuZmlsbFN0eWxlID0gJ2JsYWNrJztcbiAgY3R4UXVlcnlSZXN1bHQuZm9udCA9ICcxNXB4IEFyaWFsJztcbiAgY3R4UXVlcnlSZXN1bHQuZmlsbFRleHQoXG4gICAgICBgJHtxdWVyeUNvdW50fS8ke3F0U2V0LnNpemV9IHF1ZXJpZWRgLCBjYW5jYXNRdWVyeVJlc3VsdC53aWR0aCAtIDEwMCwgNTApO1xuICBjdHhRdWVyeVJlc3VsdC5yZXN0b3JlKCk7XG4gIHByZXZpb3VzVGltZVN0YW1wID0gdGltZXN0YW1wO1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG59XG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBR00sSUFBVyxVQUFVLENBa0YxQjtJQWxGRCxDQUFBLFVBQWlCLFVBQVUsRUFBQTtRQUN6QixTQUFnQixPQUFPLENBQUksQ0FBZ0IsRUFBQTtZQUN6QyxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUU7SUFDdEIsWUFBQSxPQUFPLENBQUMsQ0FBQztJQUNWLFNBQUE7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SSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7Z0JBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQzthQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7Z0JBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQzthQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQztnQkFDNUIsTUFBTSxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7Z0JBQ3BFLElBQUksRUFBRSxFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQzthQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJ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
