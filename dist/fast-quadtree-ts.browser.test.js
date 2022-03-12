
  /**
   * @license
   * author: https://github.com/huxia
   * fast_quadtree_ts.js v0.0.8
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFzdC1xdWFkdHJlZS10cy5icm93c2VyLnRlc3QuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb2xsZWN0aW9uLnRzIiwiLi4vLi4vc3JjL3NoYXBlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlLnRzIiwiLi4vLi4vc3JjL1F1YWRUcmVlU2V0LnRzIiwiLi4vLi4vdGVzdC9icm93c2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbjxUPiA9IEl0ZXJhdG9yPFQ+IHwgQXJyYXk8VD47XG5leHBvcnQgdHlwZSBJdGVyYWJsZTxUPiA9IEl0ZXJhYmxlSXRlcmF0b3I8VD4gfCBBcnJheTxUPjtcbmV4cG9ydCBuYW1lc3BhY2UgQ29sbGVjdGlvbiB7XG4gIGV4cG9ydCBmdW5jdGlvbiB0b0FycmF5PFQ+KGM6IENvbGxlY3Rpb248VD4pIHtcbiAgICBpZiAoYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgY29uc3QgcjogVFtdID0gW107XG4gICAgaWYgKChjIGFzIEdlbmVyYXRvcjxUPilbU3ltYm9sLml0ZXJhdG9yXSkge1xuICAgICAgZm9yIChjb25zdCBpIG9mIChjIGFzIEdlbmVyYXRvcjxUPikpIHtcbiAgICAgICAgci5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGxldCBpID0gYy5uZXh0KCk7XG4gICAgd2hpbGUgKCFpLmRvbmUpIHtcbiAgICAgIHIucHVzaChpLnZhbHVlKTtcbiAgICAgIGkgPSBjLm5leHQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlPFQ+KFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gZnVuYygpO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHdoaWxlICghcmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICB5aWVsZCByZXN1bHQudmFsdWU7XG4gICAgICAgICAgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiogdG9JdGVyYWJsZVdpdGhGaWx0ZXI8VD4oXG4gICAgICBmaWx0ZXJGdW5jOiAoKG86IFQpID0+IGJvb2xlYW4pLFxuICAgICAgLi4uY2hpbGRJdGVyYXRvcnM6ICgoKSA9PiBDb2xsZWN0aW9uPFQ+KVtdXG4gICkge1xuICAgIGZvciAoY29uc3QgZnVuYyBvZiBjaGlsZEl0ZXJhdG9ycykge1xuICAgICAgaWYgKCFmdW5jKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZXJhdG9yID0gZnVuYygpO1xuICAgICAgaWYgKGl0ZXJhdG9yIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgaXRlcmF0b3IpIHtcbiAgICAgICAgICBpZiAoIWZpbHRlckZ1bmMgfHwgZmlsdGVyRnVuYyhyZXN1bHQpKSB7XG4gICAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICB3aGlsZSAoIXJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgaWYgKCFmaWx0ZXJGdW5jIHx8IGZpbHRlckZ1bmMocmVzdWx0LnZhbHVlKSkge1xuICAgICAgICAgICAgeWllbGQgcmVzdWx0LnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uKiB0b0l0ZXJhYmxlV2l0aE1hcDxULCBBPihcbiAgICAgIG1hcEZ1bmM6ICgobzogVCkgPT4gQSksXG4gICAgICAuLi5jaGlsZEl0ZXJhdG9yczogKCgpID0+IENvbGxlY3Rpb248VD4pW11cbiAgKSB7XG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGNoaWxkSXRlcmF0b3JzKSB7XG4gICAgICBpZiAoIWZ1bmMpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaXRlcmF0b3IgPSBmdW5jKCk7XG4gICAgICBpZiAoaXRlcmF0b3IgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBpdGVyYXRvcikge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgd2hpbGUgKCFyZXN1bHQuZG9uZSkge1xuICAgICAgICAgIHlpZWxkIG1hcEZ1bmMocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICByZXN1bHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImV4cG9ydCBpbnRlcmZhY2UgVmVjMiB7XG4gIHg6IG51bWJlcjtcbiAgeTogbnVtYmVyO1xufVxuZXhwb3J0IGludGVyZmFjZSBBQUJCIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBWZWMyO1xufVxuZXhwb3J0IG5hbWVzcGFjZSBBQUJCIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKGFhYmI6IEFBQkIsIHZlYzogVmVjMik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhYWJiLmNlbnRlci54IC0gYWFiYi5zaXplLnggPD0gdmVjLnggJiZcbiAgICAgIHZlYy54IDw9IGFhYmIuY2VudGVyLnggKyBhYWJiLnNpemUueCAmJlxuICAgICAgYWFiYi5jZW50ZXIueSAtIGFhYmIuc2l6ZS55IDw9IHZlYy55ICYmXG4gICAgICB2ZWMueSA8PSBhYWJiLmNlbnRlci55ICsgYWFiYi5zaXplLnk7XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzQUFCQihvbmU6IEFBQkIsIGFub3RoZXI6IEFBQkIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIShcbiAgICAgIGFub3RoZXIuY2VudGVyLnggLSBhbm90aGVyLnNpemUueCA+IG9uZS5jZW50ZXIueCArIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnggKyBhbm90aGVyLnNpemUueCA8IG9uZS5jZW50ZXIueCAtIG9uZS5zaXplLnggfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgLSBhbm90aGVyLnNpemUueSA+IG9uZS5jZW50ZXIueSArIG9uZS5zaXplLnkgfHxcbiAgICAgIGFub3RoZXIuY2VudGVyLnkgKyBhbm90aGVyLnNpemUueSA8IG9uZS5jZW50ZXIueSAtIG9uZS5zaXplLnlcbiAgICApO1xuICB9XG59XG50eXBlIFJlY3RhbmdsZVNoYXBlID0ge1xuICB0eXBlOiAncmVjdGFuZ2xlJ1xufSAmIEFBQkI7XG50eXBlIEVsbGlwc2VTaGFwZSA9IHtcbiAgdHlwZTogJ2VsbGlwc2UnXG59ICYgQUFCQjtcbnR5cGUgQ2lyY2xlU2hhcGUgPSB7XG4gIHR5cGU6ICdjaXJjbGUnXG59ICYge1xuICBjZW50ZXI6IFZlYzI7XG4gIHNpemU6IG51bWJlcjtcbn07XG50eXBlIFNxdWFyZVNoYXBlID0ge1xuICB0eXBlOiAnc3F1YXJlJ1xufSAmIHtcbiAgY2VudGVyOiBWZWMyO1xuICBzaXplOiBudW1iZXI7XG59O1xuZXhwb3J0IHR5cGUgU2hhcGUgPSBSZWN0YW5nbGVTaGFwZSB8IEVsbGlwc2VTaGFwZSB8IENpcmNsZVNoYXBlIHwgU3F1YXJlU2hhcGU7XG5leHBvcnQgbmFtZXNwYWNlIFNoYXBlIHtcbiAgZXhwb3J0IGZ1bmN0aW9uIG92ZXJsYXBzVmVjKHNoYXBlOiBTaGFwZSwgdmVjOiBWZWMyKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoIChzaGFwZS50eXBlKSB7XG4gICAgICBjYXNlICdyZWN0YW5nbGUnOiByZXR1cm4gQUFCQi5vdmVybGFwc1ZlYyhzaGFwZSwgdmVjKTtcbiAgICAgIGNhc2UgJ3NxdWFyZSc6IHJldHVybiBBQUJCLm92ZXJsYXBzVmVjKHtcbiAgICAgICAgY2VudGVyOiBzaGFwZS5jZW50ZXIsXG4gICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgIH0sIHZlYyk7XG4gICAgICBjYXNlICdjaXJjbGUnOiByZXR1cm4gU2hhcGUub3ZlcmxhcHNWZWMoe1xuICAgICAgICB0eXBlOiAnZWxsaXBzZScsXG4gICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICBzaXplOiB7eDogc2hhcGUuc2l6ZSwgeTogc2hhcGUuc2l6ZX0sXG4gICAgICB9LCB2ZWMpO1xuICAgICAgY2FzZSAnZWxsaXBzZSc6IHtcbiAgICAgICAgY29uc3QgcCA9XG4gICAgICAgICAgTWF0aC5wb3codmVjLnggLSBzaGFwZS5jZW50ZXIueCwgMikgLyBNYXRoLnBvdyhzaGFwZS5zaXplLngsIDIpICtcbiAgICAgICAgICBNYXRoLnBvdyh2ZWMueSAtIHNoYXBlLmNlbnRlci55LCAyKSAvIE1hdGgucG93KHNoYXBlLnNpemUueSwgMik7XG4gICAgICAgIHJldHVybiBwIDw9IDE7XG4gICAgICB9XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gcG9zc2libGVseU92ZXJsYXBzQUFCQihzaGFwZTogU2hhcGUsIGFhYmI6IEFBQkIpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHNoYXBlLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2VsbGlwc2UnOlxuICAgICAgY2FzZSAncmVjdGFuZ2xlJzpcbiAgICAgICAgcmV0dXJuIEFBQkIub3ZlcmxhcHNBQUJCKHNoYXBlLCBhYWJiKTtcbiAgICAgIGNhc2UgJ2NpcmNsZSc6XG4gICAgICBjYXNlICdzcXVhcmUnOlxuICAgICAgICByZXR1cm4gQUFCQi5vdmVybGFwc0FBQkIoe1xuICAgICAgICAgIGNlbnRlcjogc2hhcGUuY2VudGVyLFxuICAgICAgICAgIHNpemU6IHt4OiBzaGFwZS5zaXplLCB5OiBzaGFwZS5zaXplfSxcbiAgICAgICAgfSwgYWFiYik7XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVjdGFuZ2xlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnc3F1YXJlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3JlY3RhbmdsZScsXG4gICAgICAgIGNlbnRlcixcbiAgICAgICAgc2l6ZSxcbiAgICAgIH07XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbGxpcHNlKGNlbnRlcjogVmVjMiwgc2l6ZTogVmVjMiB8IG51bWJlcik6IFNoYXBlIHtcbiAgICBpZiAodHlwZW9mIHNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnY2lyY2xlJyxcbiAgICAgICAgY2VudGVyLFxuICAgICAgICBzaXplLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2VsbGlwc2UnLFxuICAgICAgICBjZW50ZXIsXG4gICAgICAgIHNpemUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHtDb2xsZWN0aW9uLCBJdGVyYWJsZX0gZnJvbSAnLi9jb2xsZWN0aW9uJztcbmltcG9ydCB7VmVjMiwgQUFCQiwgU2hhcGV9IGZyb20gJy4vc2hhcGUnO1xuXG5leHBvcnQgdHlwZSBRdWFkVHJlZVVuaXRLZXlGdW5jPFQ+ID0gKFxuICB2ZWM6IFZlYzIsIHVuaXQ6IFQgfCB1bmRlZmluZWQsIHF1YWRUcmVlOiBRdWFkVHJlZTxUPlxuKSA9PiBzdHJpbmcgfCBudW1iZXI7XG5leHBvcnQgdHlwZSBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4gPSAoXG4gICAgYWNjOiBBLFxuICAgIHByZXZpb3VzOiB7dmVjOiBWZWMyLCB1bml0PzogVH0sXG4gICAgaW5kZXg6IG51bWJlcixcbikgPT4gQSB8IHVuZGVmaW5lZDtcbmV4cG9ydCBpbnRlcmZhY2UgUXVhZFRyZWVPcHRpb25zPFQ+IHtcbiAgdW5pdEtleUdldHRlcjogUXVhZFRyZWVVbml0S2V5RnVuYzxUPixcbiAgaW50ZWdlckNvb3JkaW5hdGU/OiBib29sZWFuLFxufVxuZXhwb3J0IGludGVyZmFjZSBSZWFkb25seVF1YWRUcmVlPFQ+IHtcbiAgcmVhZG9ubHkgYm91bmRzOiBBQUJCO1xuICByZWFkb25seSBzaXplOiBudW1iZXJcbiAgaGFzKHZlYzogVmVjMiwgdW5pdD86IFQpOiBib29sZWFuO1xuICBxdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9KSA9PiBBLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeUFycmF5KFxuICAgICAgc2hhcGU/OiBTaGFwZSxcbiAgKTogQXJyYXk8e3ZlYzogVmVjMiwgdW5pdD86IFR9PjtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuXG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG4gIHF1ZXJ5TWFwPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG59XG5leHBvcnQgY2xhc3MgUXVhZFRyZWU8VD4gaW1wbGVtZW50cyBSZWFkb25seVF1YWRUcmVlPFQ+IHtcbiAgc3RhdGljIE1heEVsZW1lbnRzID0gODtcbiAgc3RhdGljIE1heERlcHRoID0gODtcbiAgc3RhdGljIFVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYyA9IChcbiAgICAgIHZlYzogVmVjMixcbiAgICAgIF86IGFueSxcbiAgICAgIHF1YWRUcmVlOiBRdWFkVHJlZTxhbnk+LFxuICApID0+XG4gICAgcXVhZFRyZWUub3B0aW9ucy5pbnRlZ2VyQ29vcmRpbmF0ZSA/XG4gICAgICB2ZWMueCArIChxdWFkVHJlZS5ib3VuZHMuc2l6ZS54ICogMikgKiB2ZWMueSA6XG4gICAgICBgJHt2ZWMueH0sJHt2ZWMueX1gO1xuXG4gIGJvdW5kczogQUFCQjtcblxuICBwcml2YXRlIGRlcHRoOiBudW1iZXI7XG5cbiAgcHJpdmF0ZSBkaXZpZGVkOiBib29sZWFuO1xuXG4gIHByaXZhdGUgdW5pdHM6IHtba2V5OiBzdHJpbmcgfCBudW1iZXJdOiB7dW5pdD86IFQsIHZlYzogVmVjMn19O1xuXG4gIHByaXZhdGUgbm9ydGhXZXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgbm9ydGhFYXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgc291dGhXZXN0ITogUXVhZFRyZWU8VD47XG4gIHByaXZhdGUgc291dGhFYXN0ITogUXVhZFRyZWU8VD47XG5cbiAgc2l6ZTogbnVtYmVyO1xuXG4gIHJlYWRvbmx5IG9wdGlvbnM6IFF1YWRUcmVlT3B0aW9uczxUPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIGJvdW5kczogQUFCQixcbiAgICAgIG9wdGlvbnM/OiBRdWFkVHJlZU9wdGlvbnM8VD4sXG4gICAgICBkZXB0aDogbnVtYmVyID0gMCxcbiAgKSB7XG4gICAgdGhpcy5ib3VuZHMgPSBib3VuZHM7XG4gICAgdGhpcy5kZXB0aCA9IGRlcHRoO1xuICAgIHRoaXMuZGl2aWRlZCA9IGZhbHNlO1xuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgICB0aGlzLnNpemUgPSAwO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge1xuICAgICAgdW5pdEtleUdldHRlcjogUXVhZFRyZWUuVW5pcXVlVW5pdEF0UG9zaXRpb25LZXlGdW5jLFxuICAgIH07XG4gIH1cbiAgX2FkZCh2ZWM6IFZlYzIsIHVuaXQ/OiBUKTogZmFsc2UgfCAnYWRkZWQnIHwgJ2V4aXN0aW5nJyB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB2ZWMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZGVwdGggPT0gUXVhZFRyZWUuTWF4RGVwdGggfHxcbiAgICAgICF0aGlzLmRpdmlkZWQgJiYgdGhpcy5zaXplIDwgUXVhZFRyZWUuTWF4RWxlbWVudHMpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKHZlYywgdW5pdCwgdGhpcyk7XG4gICAgICBsZXQgcmVzdWx0OiAnZXhpc3RpbmcnIHwgJ2FkZGVkJyA9ICdleGlzdGluZyc7XG4gICAgICBpZiAoIXRoaXMudW5pdHNba2V5XSkge1xuICAgICAgICB0aGlzLnNpemUgKys7XG4gICAgICAgIHJlc3VsdCA9ICdhZGRlZCc7XG4gICAgICB9XG4gICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjLCB1bml0fTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB0aGlzLmRpdmlkZSgpO1xuICAgIGNvbnN0IGluc2VydGVkID0gdGhpcy5ub3J0aFdlc3QuX2FkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5fYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhXZXN0Ll9hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuX2FkZCh2ZWMsIHVuaXQpO1xuICAgIGlmIChpbnNlcnRlZCA9PT0gJ2FkZGVkJykgdGhpcy5zaXplICsrO1xuICAgIHJldHVybiBpbnNlcnRlZDtcbiAgfVxuICBhZGQodmVjOiBWZWMyLCB1bml0PzogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuX2FkZCh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgX21vdmUoXG4gICAgICBmcm9tOiBWZWMyLFxuICAgICAgdG86IFZlYzIgfCB1bmRlZmluZWQsXG4gICAgICB1bml0PzogVCxcbiAgKTogZmFsc2UgfCAncmVtb3ZlZCcgfCAnbW92ZWQnIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIGZyb20pKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmRpdmlkZWQpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy51bml0S2V5R2V0dGVyKGZyb20sIHVuaXQsIHRoaXMpO1xuICAgICAgaWYgKCF0aGlzLnVuaXRzW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHRvICYmIEFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHRvKSkge1xuICAgICAgICAvLyB1cGRhdGUgaW4tcGxhY2VcbiAgICAgICAgY29uc3QgbmV3S2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodG8sIHVuaXQsIHRoaXMpO1xuICAgICAgICBpZiAobmV3S2V5ICE9PSBrZXkpIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy51bml0c1trZXldO1xuICAgICAgICAgIHRoaXMudW5pdHNbbmV3S2V5XSA9IHt2ZWM6IHRvLCB1bml0fTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVuaXRzW2tleV0gPSB7dmVjOiB0bywgdW5pdH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdtb3ZlZCc7XG4gICAgICB9XG4gICAgICBkZWxldGUgdGhpcy51bml0c1trZXldO1xuICAgICAgdGhpcy5zaXplIC0tO1xuICAgICAgcmV0dXJuICdyZW1vdmVkJztcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ub3J0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5ub3J0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aFdlc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpIHx8XG4gICAgICAgICAgdGhpcy5zb3V0aEVhc3QuX21vdmUoZnJvbSwgdG8sIHVuaXQpO1xuICAgIGlmIChyZXN1bHQgPT09ICdyZW1vdmVkJykge1xuICAgICAgdGhpcy5zaXplIC0tO1xuICAgICAgaWYgKHRvKSB7XG4gICAgICAgIGlmICh0aGlzLmFkZCh0bywgdW5pdCkpIHJldHVybiAnbW92ZWQnO1xuICAgICAgICByZXR1cm4gJ3JlbW92ZWQnO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIG1vdmUoZnJvbTogVmVjMiwgdG86IFZlYzIsIHVuaXQ/OiBUKTogYm9vbGVhbiB7XG4gICAgaWYgKCFBQUJCLm92ZXJsYXBzVmVjKHRoaXMuYm91bmRzLCB0bykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5fbW92ZShmcm9tLCB0bywgdW5pdCkgPT09ICdyZW1vdmVkJykgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRlKHZlYzogVmVjMiwgdW5pdD86IFQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fbW92ZSh2ZWMsIHVuZGVmaW5lZCwgdW5pdCkgPT09ICdyZW1vdmVkJztcbiAgfVxuICBjbGVhcigpIHtcbiAgICB0aGlzLnVuaXRzID0ge307XG4gICAgdGhpcy5zaXplID0gMDtcbiAgICB0aGlzLmRpdmlkZWQgPSBmYWxzZTtcbiAgICB0aGlzLm5vcnRoV2VzdCA9XG4gICAgICB0aGlzLm5vcnRoRWFzdCA9XG4gICAgICB0aGlzLnNvdXRoV2VzdCA9XG4gICAgICB0aGlzLnNvdXRoRWFzdCA9IHVuZGVmaW5lZCE7XG4gIH1cbiAgaGFzKHZlYzogVmVjMiwgdW5pdD86IFQpOiBib29sZWFuIHtcbiAgICBpZiAoIUFBQkIub3ZlcmxhcHNWZWModGhpcy5ib3VuZHMsIHZlYykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuZGl2aWRlZCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLnVuaXRLZXlHZXR0ZXIodmVjLCB1bml0LCB0aGlzKTtcbiAgICAgIHJldHVybiAhIXRoaXMudW5pdHNba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9ydGhXZXN0Lmhhcyh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLm5vcnRoRWFzdC5oYXModmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aFdlc3QuaGFzKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMuc291dGhFYXN0Lmhhcyh2ZWMsIHVuaXQpO1xuICB9XG4gIHByaXZhdGUgZGl2aWRlKCkge1xuICAgIHRoaXMuZGl2aWRlZCA9IHRydWU7XG4gICAgY29uc3QgaHcgPSB0aGlzLmJvdW5kcy5zaXplLnggLyAyO1xuICAgIGNvbnN0IGhoID0gdGhpcy5ib3VuZHMuc2l6ZS55IC8gMjtcblxuICAgIHRoaXMubm9ydGhXZXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54IC0gaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55IC0gaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcbiAgICB0aGlzLm5vcnRoRWFzdCA9IG5ldyBRdWFkVHJlZSh7XG4gICAgICBjZW50ZXI6IHt4OiB0aGlzLmJvdW5kcy5jZW50ZXIueCArIGh3LCB5OiB0aGlzLmJvdW5kcy5jZW50ZXIueSAtIGhofSxcbiAgICAgIHNpemU6IHt4OiBodywgeTogaGh9fSwgdGhpcy5vcHRpb25zLCB0aGlzLmRlcHRoICsgMSk7XG4gICAgdGhpcy5zb3V0aFdlc3QgPSBuZXcgUXVhZFRyZWUoe1xuICAgICAgY2VudGVyOiB7eDogdGhpcy5ib3VuZHMuY2VudGVyLnggLSBodywgeTogdGhpcy5ib3VuZHMuY2VudGVyLnkgKyBoaH0sXG4gICAgICBzaXplOiB7eDogaHcsIHk6IGhofX0sIHRoaXMub3B0aW9ucywgdGhpcy5kZXB0aCArIDEpO1xuICAgIHRoaXMuc291dGhFYXN0ID0gbmV3IFF1YWRUcmVlKHtcbiAgICAgIGNlbnRlcjoge3g6IHRoaXMuYm91bmRzLmNlbnRlci54ICsgaHcsIHk6IHRoaXMuYm91bmRzLmNlbnRlci55ICsgaGh9LFxuICAgICAgc2l6ZToge3g6IGh3LCB5OiBoaH19LCB0aGlzLm9wdGlvbnMsIHRoaXMuZGVwdGggKyAxKTtcblxuICAgIGZvciAoY29uc3Qge3ZlYywgdW5pdH0gb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnVuaXRzKSkge1xuICAgICAgdGhpcy5ub3J0aFdlc3QuYWRkKHZlYywgdW5pdCkgfHxcbiAgICAgIHRoaXMubm9ydGhFYXN0LmFkZCh2ZWMsIHVuaXQpIHx8XG4gICAgICB0aGlzLnNvdXRoV2VzdC5hZGQodmVjLCB1bml0KSB8fFxuICAgICAgdGhpcy5zb3V0aEVhc3QuYWRkKHZlYywgdW5pdCk7XG4gICAgfVxuICAgIHRoaXMudW5pdHMgPSB7fTtcbiAgfVxuICBxdWVyeUl0ZXJhdGFibGU8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9KSA9PiBBLFxuICAgICAgc2hhcGU/OiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8QT47XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlPzogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT47XG4gIHF1ZXJ5SXRlcmF0YWJsZTxBPihcbiAgICAgIG1hcEZ1bmNPclNoYXBlPzogKCh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0pID0+IEEpIHwgU2hhcGUgfCB1bmRlZmluZWQsXG4gICAgICBzaGFwZT86IFNoYXBlIHwgdW5kZWZpbmVkLFxuICApOiBJdGVyYWJsZTxBPiB7XG4gICAgY29uc3QgbWFwRnVuYyA9IHR5cGVvZiBtYXBGdW5jT3JTaGFwZSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICBtYXBGdW5jT3JTaGFwZSA6XG4gICAgICB1bmRlZmluZWQ7XG4gICAgaWYgKHNoYXBlICYmICFTaGFwZS5wb3NzaWJsZWx5T3ZlcmxhcHNBQUJCKHNoYXBlLCB0aGlzLmJvdW5kcykpIHJldHVybiBbXTtcblxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBsZXQgYXJyID0gT2JqZWN0LnZhbHVlcyh0aGlzLnVuaXRzKTtcbiAgICAgIGlmIChzaGFwZSkge1xuICAgICAgICBhcnIgPSBhcnIuZmlsdGVyKChyKSA9PiBTaGFwZS5vdmVybGFwc1ZlYyhzaGFwZSwgci52ZWMpKTtcbiAgICAgIH1cbiAgICAgIGlmIChtYXBGdW5jKSByZXR1cm4gYXJyLm1hcChtYXBGdW5jKTtcbiAgICAgIHJldHVybiBhcnIgYXMgYW55O1xuICAgIH1cbiAgICBpZiAobWFwRnVuYykge1xuICAgICAgcmV0dXJuIENvbGxlY3Rpb24udG9JdGVyYWJsZVdpdGhNYXAoXG4gICAgICAgICAgbWFwRnVuYyxcbiAgICAgICAgICAoKSA9PiB0aGlzLm5vcnRoV2VzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgICAgICgpID0+IHRoaXMubm9ydGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICAgKCkgPT4gdGhpcy5zb3V0aFdlc3QucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSxcbiAgICAgICAgICAoKSA9PiB0aGlzLnNvdXRoRWFzdC5xdWVyeUl0ZXJhdGFibGUoc2hhcGUpLFxuICAgICAgKSBhcyBhbnk7XG4gICAgfVxuICAgIHJldHVybiBDb2xsZWN0aW9uLnRvSXRlcmFibGUoXG4gICAgICAgICgpID0+IHRoaXMubm9ydGhXZXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICgpID0+IHRoaXMubm9ydGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICgpID0+IHRoaXMuc291dGhXZXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgICAgICgpID0+IHRoaXMuc291dGhFYXN0LnF1ZXJ5SXRlcmF0YWJsZShzaGFwZSksXG4gICAgKSBhcyBhbnk7XG4gIH1cbiAgcHJpdmF0ZSBfcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICBpZiAoc2hhcGUgJiYgIVNoYXBlLnBvc3NpYmxlbHlPdmVybGFwc0FBQkIoc2hhcGUsIHRoaXMuYm91bmRzKSkge1xuICAgICAgcmV0dXJuIGluaXRpYWxWYWx1ZSE7XG4gICAgfVxuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICBsZXQgYXJyID0gT2JqZWN0LnZhbHVlcyh0aGlzLnVuaXRzKTtcbiAgICAgIGlmIChzaGFwZSkge1xuICAgICAgICBhcnIgPSBhcnIuZmlsdGVyKChyKSA9PiBTaGFwZS5vdmVybGFwc1ZlYyhzaGFwZSEsIHIudmVjKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJyLnJlZHVjZShjYWxsYmFja0Z1bmMgYXMgYW55LCBpbml0aWFsVmFsdWUpIGFzIHVua25vd24gYXMgQTtcbiAgICB9XG4gICAgbGV0IHZhbHVlOiBBID0gaW5pdGlhbFZhbHVlITtcbiAgICB2YWx1ZSA9IHRoaXMubm9ydGhXZXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSk7XG4gICAgdmFsdWUgPSB0aGlzLm5vcnRoRWFzdC5fcXVlcnlSZWR1Y2Uoc2hhcGUsIGNhbGxiYWNrRnVuYywgdmFsdWUpO1xuICAgIHZhbHVlID0gdGhpcy5zb3V0aFdlc3QuX3F1ZXJ5UmVkdWNlKHNoYXBlLCBjYWxsYmFja0Z1bmMsIHZhbHVlKTtcbiAgICB2YWx1ZSA9IHRoaXMuc291dGhFYXN0Ll9xdWVyeVJlZHVjZShzaGFwZSwgY2FsbGJhY2tGdW5jLCB2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYzogU2hhcGUgfCBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZTogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+IHwgQSxcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICBpZiAodHlwZW9mIHNoYXBlT3JDYWxsYmFja0Z1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZShcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYyxcbiAgICAgICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZSBhcyBBKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlKFxuICAgICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMsXG4gICAgICAgICAgY2FsbGJhY2tGdW5jT3JJbml0aWFsVmFsdWUgYXMgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgICAgIGluaXRpYWxWYWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLl9xdWVyeVJlZHVjZTxBcnJheTx7dmVjOiBWZWMyLCB1bml0PzogVH0+PihcbiAgICAgICAgc2hhcGUsXG4gICAgICAgIChhcnIsIHYpID0+IHtcbiAgICAgICAgICBhcnIucHVzaCh2KTtcbiAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICB9LCBbXSk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICAgIHNoYXBlT3JGb3JlYWNoRnVuYzpcbiAgICAgICAgU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ/OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICkge1xuICAgIGlmICh0eXBlb2Ygc2hhcGVPckZvcmVhY2hGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9xdWVyeVJlZHVjZTx2b2lkPihcbiAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgKF8sIHYsIGluZGV4KSA9PiBzaGFwZU9yRm9yZWFjaEZ1bmModiwgaW5kZXgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFmb3JlYWNoRnVuYykgcmV0dXJuO1xuICAgICAgdGhpcy5fcXVlcnlSZWR1Y2U8dm9pZD4oXG4gICAgICAgICAgc2hhcGVPckZvcmVhY2hGdW5jLFxuICAgICAgICAgIChfLCB2LCBpbmRleCkgPT4gZm9yZWFjaEZ1bmModiwgaW5kZXgpKTtcbiAgICB9XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0PzogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlT3JNYXBGdW5jOiBTaGFwZSB8ICgodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdD86IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPiB7XG4gICAgaWYgKHR5cGVvZiBzaGFwZU9yTWFwRnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKCFtYXBGdW5jKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gdGhpcy5fcXVlcnlSZWR1Y2U8QXJyYXk8QT4+KFxuICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2goc2hhcGVPck1hcEZ1bmModiwgaW5kZXgpKTtcbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBbXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghbWFwRnVuYykgcmV0dXJuIFtdO1xuICAgICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UmVkdWNlPEFycmF5PEE+PihcbiAgICAgICAgICBzaGFwZU9yTWFwRnVuYyxcbiAgICAgICAgICAoYXJyLCB2LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgYXJyLnB1c2gobWFwRnVuYyh2LCBpbmRleCkpO1xuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIFtdKTtcbiAgICB9XG4gIH1cbiAgX2R1bXBUb1N0cmluZyhyZXN1bHQ6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgcHJlZml4ID0gJyAgICAgICAgICAgICcuc3Vic3RyaW5nKDAsIHRoaXMuZGVwdGgpO1xuICAgIGlmICghdGhpcy5kaXZpZGVkKSB7XG4gICAgICByZXN1bHQucHVzaChwcmVmaXgpO1xuICAgICAgcmVzdWx0LnB1c2goSlNPTi5zdHJpbmdpZnkodGhpcy51bml0cykpO1xuICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBbXG4gICAgICB7c3RyOiAnTlcnLCBxdDogdGhpcy5ub3J0aFdlc3R9LFxuICAgICAge3N0cjogJ05FJywgcXQ6IHRoaXMubm9ydGhFYXN0fSxcbiAgICAgIHtzdHI6ICdTVycsIHF0OiB0aGlzLnNvdXRoV2VzdH0sXG4gICAgICB7c3RyOiAnU0UnLCBxdDogdGhpcy5zb3V0aEVhc3R9LFxuICAgIF0pIHtcbiAgICAgIHJlc3VsdC5wdXNoKHByZWZpeCk7XG4gICAgICByZXN1bHQucHVzaChjaGlsZC5zdHIpO1xuICAgICAgcmVzdWx0LnB1c2goYCAoJHtjaGlsZC5xdC5zaXplfSk6XFxuYCk7XG4gICAgICBjaGlsZC5xdC5fZHVtcFRvU3RyaW5nKHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZHVtcFRvU3RyaW5nKFtdKS5qb2luKCcnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtcbiAgUXVhZFRyZWUsXG4gIFF1YWRUcmVlT3B0aW9ucyxcbn0gZnJvbSAnLi9RdWFkVHJlZSc7XG5pbXBvcnQge0FBQkIsIFNoYXBlLCBWZWMyfSBmcm9tICcuL3NoYXBlJztcblxuZXhwb3J0IHR5cGUgUXVhZE1hcFVuaXRQb3NpdGlvbkdldHRlckZ1bmM8VD4gPSAobzogVCkgPT4gVmVjMjtcbmV4cG9ydCB0eXBlIFF1YWRNYXBVbml0UG9zaXRpb25TZXR0ZXJGdW5jPFQ+ID0gKG86IFQsIHBvc2l0aW9uOiBWZWMyKSA9PiB2b2lkO1xuZXhwb3J0IHR5cGUgUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+ID0gKFxuICBhY2M6IEEsXG4gIHByZXZpb3VzOiB7dmVjOiBWZWMyLCB1bml0OiBUfSxcbiAgaW5kZXg6IG51bWJlcixcbikgPT4gQSB8IHVuZGVmaW5lZDtcbmV4cG9ydCBjbGFzcyBRdWFkVHJlZVBvc2l0aW9uT3V0T2ZCb3VuZHNFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gIH1cbn1cbmV4cG9ydCBpbnRlcmZhY2UgUmVhZG9ubHlRdWFkVHJlZVNldDxUPiBleHRlbmRzIFJlYWRvbmx5U2V0PFQ+IHtcbiAgcmVhZG9ubHkgYm91bmRzOiBBQUJCO1xuICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+O1xuICBxdWVyeUl0ZXJhdGFibGUoXG4gICAgICBzaGFwZTogU2hhcGUgfCB1bmRlZmluZWQsXG4gICk6IEl0ZXJhYmxlPHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PjtcbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgY2FsbGJhY2tGdW5jOiBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBpbml0aWFsVmFsdWU/OiBBKTogQTtcbiAgcXVlcnlBcnJheShcbiAgICAgIHNoYXBlPzogU2hhcGUsXG4gICk6IEFycmF5PHt2ZWM6IFZlYzIsIHVuaXQ6IFR9PjtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgc2hhcGU6IFNoYXBlLFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlGb3JFYWNoKFxuICAgICAgZm9yZWFjaEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKTogdm9pZDtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIG1hcEZ1bmM6ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gQSxcbiAgKTogQXJyYXk8QT47XG59XG5leHBvcnQgY2xhc3MgUXVhZFRyZWVTZXQ8VD4gaW1wbGVtZW50cyBTZXQ8VD4sIFJlYWRvbmx5UXVhZFRyZWVTZXQ8VD4ge1xuICBzdGF0aWMgVW5pcXVlVW5pdEF0VmVjS2V5RnVuYyA9IFF1YWRUcmVlLlVuaXF1ZVVuaXRBdFBvc2l0aW9uS2V5RnVuYztcbiAgcHJpdmF0ZSBxdWFyZFRyZWU6IFF1YWRUcmVlPFQ+O1xuICBwcml2YXRlIHVuaXRQb3NpdGlvbkdldHRlcjogUXVhZE1hcFVuaXRQb3NpdGlvbkdldHRlckZ1bmM8VD47XG4gIGNvbnN0cnVjdG9yKGJvdW5kczogQUFCQiwgb3B0aW9uczogUXVhZFRyZWVPcHRpb25zPFQ+ICYge1xuICAgIHVuaXRQb3NpdGlvbkdldHRlcjogUXVhZE1hcFVuaXRQb3NpdGlvbkdldHRlckZ1bmM8VD4sXG4gIH0pIHtcbiAgICB0aGlzLnF1YXJkVHJlZSA9IG5ldyBRdWFkVHJlZShib3VuZHMsIG9wdGlvbnMpO1xuICAgIHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyID0gb3B0aW9ucy51bml0UG9zaXRpb25HZXR0ZXI7XG4gIH1cbiAgZ2V0IHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnNpemU7XG4gIH1cbiAgZ2V0IGJvdW5kcygpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuYm91bmRzO1xuICB9XG4gIGFkZCh0OiBUKSB7XG4gICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KTtcbiAgICBpZiAoIXRoaXMucXVhcmRUcmVlLmFkZChwb3NpdGlvbiwgdCkpIHtcbiAgICAgIHRocm93IG5ldyBRdWFkVHJlZVBvc2l0aW9uT3V0T2ZCb3VuZHNFcnJvcihcbiAgICAgICAgICBgcG9zaXRpb24gJHtKU09OLnN0cmluZ2lmeShwb3NpdGlvbil9IGlzIG91dCBvZiBib3VuZHM6YCArXG4gICAgICAgICAgYCAke0pTT04uc3RyaW5naWZ5KHRoaXMucXVhcmRUcmVlLmJvdW5kcyl9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIG1vdmUodDogVCwgdG86IFZlYzIpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUubW92ZSh0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KSwgdG8sIHQpO1xuICB9XG4gIGRlbGV0ZSh0OiBUKSB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLmRlbGV0ZSh0aGlzLnVuaXRQb3NpdGlvbkdldHRlcih0KSwgdCk7XG4gIH1cbiAgaGFzKHQ6IFQpIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUuaGFzKHRoaXMudW5pdFBvc2l0aW9uR2V0dGVyKHQpLCB0KTtcbiAgfVxuICBjbGVhcigpIHtcbiAgICB0aGlzLnF1YXJkVHJlZS5jbGVhcigpO1xuICB9XG4gIGZvckVhY2goY2FsbGJhY2tmbjogKHZhbHVlOiBULCB2YWx1ZTI6IFQsIHNldDogU2V0PFQ+KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgcmV0dXJuIHRoaXMucXVhcmRUcmVlLnF1ZXJ5UmVkdWNlKFxuICAgICAgICAoXywgcCkgPT4gdm9pZChjYWxsYmFja2ZuKHAudW5pdCEsIHAudW5pdCEsIHRoaXMpKSxcbiAgICAgICAgdm9pZCgwKSxcbiAgICApO1xuICB9XG4gIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbVCwgVF0+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlPFtULCBUXT4oXG4gICAgICAgIChwKSA9PiBbcC51bml0ISwgcC51bml0IV0pIGFzIGFueTtcbiAgfVxuICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgIHJldHVybiB0aGlzLnZhbHVlcygpO1xuICB9XG4gIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlPFQ+KFxuICAgICAgICAocCkgPT4gcC51bml0ISkgYXMgYW55O1xuICB9XG4gIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS50b1N0cmluZygpO1xuICB9XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgIHJldHVybiB0aGlzLnZhbHVlcygpO1xuICB9XG4gIHF1ZXJ5SXRlcmF0YWJsZShcbiAgICAgIHNoYXBlOiBTaGFwZSB8IHVuZGVmaW5lZCxcbiAgKTogSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlJdGVyYXRhYmxlKHNoYXBlKSBhc1xuICAgICAgSXRlcmFibGU8e3ZlYzogVmVjMiwgdW5pdDogVH0+O1xuICB9XG5cbiAgcXVlcnlSZWR1Y2U8QT4oXG4gICAgICBjYWxsYmFja0Z1bmM6IFJlZHVjZUNhbGxiYWNrRnVuYzxULCBBPixcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBO1xuICBxdWVyeVJlZHVjZTxBPihcbiAgICAgIHNoYXBlOiBTaGFwZSxcbiAgICAgIGNhbGxiYWNrRnVuYzogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+LFxuICAgICAgaW5pdGlhbFZhbHVlPzogQSk6IEE7XG4gIHF1ZXJ5UmVkdWNlPEE+KFxuICAgICAgc2hhcGVPckNhbGxiYWNrRnVuYzogU2hhcGUgfCBSZWR1Y2VDYWxsYmFja0Z1bmM8VCwgQT4sXG4gICAgICBjYWxsYmFja0Z1bmNPckluaXRpYWxWYWx1ZTogUmVkdWNlQ2FsbGJhY2tGdW5jPFQsIEE+IHwgQSxcbiAgICAgIGluaXRpYWxWYWx1ZT86IEEpOiBBIHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlSZWR1Y2UoXG4gICAgICAgIHNoYXBlT3JDYWxsYmFja0Z1bmMgYXMgU2hhcGUsXG4gICAgICAgIGNhbGxiYWNrRnVuY09ySW5pdGlhbFZhbHVlIGFzIGFueSxcbiAgICAgICAgaW5pdGlhbFZhbHVlKTtcbiAgfVxuXG4gIHF1ZXJ5QXJyYXkoXG4gICAgICBzaGFwZT86IFNoYXBlLFxuICApOiBBcnJheTx7dmVjOiBWZWMyLCB1bml0OiBUfT4ge1xuICAgIHJldHVybiB0aGlzLnF1YXJkVHJlZS5xdWVyeUFycmF5KHNoYXBlKSBhcyBhbnk7XG4gIH1cblxuICBxdWVyeUZvckVhY2goXG4gICAgc2hhcGU6IFNoYXBlLFxuICAgIGZvcmVhY2hGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IHZvaWQsXG4gICk6IHZvaWQ7XG4gIHF1ZXJ5Rm9yRWFjaChcbiAgICBmb3JlYWNoRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiB2b2lkLFxuICApOiB2b2lkO1xuICBxdWVyeUZvckVhY2goXG4gICAgICBzaGFwZU9yRm9yZWFjaEZ1bmM6XG4gICAgICAgIFNoYXBlIHwgKCh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCksXG4gICAgICBmb3JlYWNoRnVuYz86ICh2OiB7dmVjOiBWZWMyLCB1bml0OiBUfSwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCxcbiAgKSB7XG4gICAgdGhpcy5xdWFyZFRyZWUucXVlcnlGb3JFYWNoKHNoYXBlT3JGb3JlYWNoRnVuYyBhcyBhbnksIGZvcmVhY2hGdW5jIGFzIGFueSk7XG4gIH1cblxuICBxdWVyeU1hcDxBPihcbiAgICBtYXBGdW5jOiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+O1xuICBxdWVyeU1hcDxBPihcbiAgICBzaGFwZTogU2hhcGUsXG4gICAgbWFwRnVuYzogKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBLFxuICApOiBBcnJheTxBPjtcbiAgcXVlcnlNYXA8QT4oXG4gICAgICBzaGFwZU9yTWFwRnVuYzogU2hhcGUgfCAoKHY6IHt2ZWM6IFZlYzIsIHVuaXQ6IFR9LCBpbmRleDogbnVtYmVyKSA9PiBBKSxcbiAgICAgIG1hcEZ1bmM/OiAodjoge3ZlYzogVmVjMiwgdW5pdDogVH0sIGluZGV4OiBudW1iZXIpID0+IEEsXG4gICk6IEFycmF5PEE+IHtcbiAgICByZXR1cm4gdGhpcy5xdWFyZFRyZWUucXVlcnlNYXAoc2hhcGVPck1hcEZ1bmMgYXMgU2hhcGUsIG1hcEZ1bmMgYXMgYW55KTtcbiAgfVxufVxuIiwiaW1wb3J0IHtRdWFkVHJlZVNldH0gZnJvbSAnLi4vc3JjL1F1YWRUcmVlU2V0JztcbmltcG9ydCB7QUFCQiwgU2hhcGUsIFZlYzJ9IGZyb20gJy4uL3NyYy9zaGFwZSc7XG5cblxuY29uc3QgY2FuY2FzQWxsID1cbiAgd2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbGwnKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcbmNvbnN0IGN0eEFsbCA9IGNhbmNhc0FsbC5nZXRDb250ZXh0KCcyZCcpITtcblxuY29uc3QgY2FuY2FzUXVlcnlSZXN1bHQgPVxuICB3aW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3F1ZXJ5UmVzdWx0JykgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG5jb25zdCBjdHhRdWVyeVJlc3VsdCA9IGNhbmNhc1F1ZXJ5UmVzdWx0LmdldENvbnRleHQoJzJkJykhO1xuXG5jbGFzcyBVbml0IHtcbiAgaWQ6IG51bWJlcjtcbiAgX3Bvc2l0aW9uOiBWZWMyO1xuICBnZXQgcG9zaXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uO1xuICB9XG4gIHNldCBwb3NpdGlvbih2KSB7XG4gICAgaWYgKHF0U2V0Lm1vdmUodGhpcywgdikpIHtcbiAgICAgIHRoaXMuX3Bvc2l0aW9uID0gdjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBmYWlsZWQgdG8gbW92ZSAke3RoaXMuaWR9IHRvICR7SlNPTi5zdHJpbmdpZnkodil9LCBgICtcbiAgICAgICAgYHN0YXlzIGF0OiAke0pTT04uc3RyaW5naWZ5KHRoaXMuX3Bvc2l0aW9uKX1gKTtcbiAgICB9XG4gIH1cbiAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgcG9zaXRpb246IFZlYzIpIHtcbiAgICB0aGlzLmlkID0gaWQ7XG4gICAgdGhpcy5fcG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgICBxdFNldC5hZGQodGhpcyk7XG4gIH1cbn1cblxuY29uc3QgcXRTZXQgPSBuZXcgUXVhZFRyZWVTZXQ8VW5pdD4oe1xuICBzaXplOiB7eDogY2FuY2FzQWxsLndpZHRoIC8gMiwgeTogY2FuY2FzQWxsLmhlaWdodCAvIDJ9LFxuICBjZW50ZXI6IHt4OiBjYW5jYXNBbGwud2lkdGggLyAyLCB5OiBjYW5jYXNBbGwuaGVpZ2h0IC8gMn0sXG59LCB7XG4gIHVuaXRLZXlHZXR0ZXI6IChfLCB1bml0KSA9PiB1bml0IS5pZCxcbiAgdW5pdFBvc2l0aW9uR2V0dGVyOiAodSkgPT4gdS5wb3NpdGlvbixcbn0pO1xuXG5sZXQgY3VycmVudElkID0gMDtcbmZ1bmN0aW9uIGdlbmVyYXRlSWQoKTogbnVtYmVyIHtcbiAgaWYgKGN1cnJlbnRJZCA9PSBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikge1xuICAgIGN1cnJlbnRJZCA9IDA7XG4gICAgcXRTZXQuY2xlYXIoKTtcbiAgfVxuICByZXR1cm4gKytjdXJyZW50SWQ7XG59XG5mdW5jdGlvbiByYW5kb21Qb3NpdGlvbigpOiBWZWMyIHtcbiAgcmV0dXJuIHtcbiAgICB4OiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjYW5jYXNBbGwud2lkdGggYXMgYW55KSxcbiAgICB5OiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjYW5jYXNBbGwuaGVpZ2h0IGFzIGFueSksXG4gIH07XG59XG5cbmNvbnN0IHRvdGFsVW5pdCA9IDUwMDAwMDtcbmNvbnN0IHVuaXRUb01vdmVFYWNoRnJhbWUgPSBNYXRoLmZsb29yKHRvdGFsVW5pdCAqIDAuMDA1KTtcbmNvbnN0IHVuaXRUb0FkZEVhY2hGcmFtZSA9IE1hdGguZmxvb3IodG90YWxVbml0ICogMC4wMDUpO1xuXG5jb25zdCB1bml0czogKFVuaXR8dW5kZWZpbmVkKVtdID0gW107XG5sZXQgbGFzdEVtcHR5SW5kZXggPSAtMTtcbmZ1bmN0aW9uIHJlY29yZFVuaXQodTogVW5pdCk6IFVuaXQge1xuICBpZiAodW5pdHMubGVuZ3RoID4gMS41ICogdG90YWxVbml0KSB7XG4gICAgaWYgKGxhc3RFbXB0eUluZGV4ID4gLTEgJiYgdW5pdHNbbGFzdEVtcHR5SW5kZXhdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHVuaXRzW2xhc3RFbXB0eUluZGV4XSA9IHU7XG4gICAgICBsYXN0RW1wdHlJbmRleCA9IC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICB1bml0c1t1bml0cy5maW5kSW5kZXgoKHV1KSA9PiB1dSA9PT0gdW5kZWZpbmVkKV0gPSB1O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB1bml0cy5wdXNoKHUpO1xuICB9XG4gIHJldHVybiB1O1xufVxuZnVuY3Rpb24gdGFrZUFVbml0KCk6IFVuaXQge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IGluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdW5pdHMubGVuZ3RoKTtcbiAgICBjb25zdCB1bml0ID0gdW5pdHNbaW5kZXhdO1xuICAgIGlmICh1bml0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHVuaXRzW2luZGV4XSA9IHVuZGVmaW5lZDtcbiAgICAgIGxhc3RFbXB0eUluZGV4ID0gaW5kZXg7XG4gICAgICByZXR1cm4gdW5pdDtcbiAgICB9XG4gIH1cbn1cbmZ1bmN0aW9uIG1vdmVSYW5kb21EaXJlY3Rpb24odjogVmVjMikge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHZlYyA9IHtcbiAgICAgIHg6IHYueCArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpIC0gMixcbiAgICAgIHk6IHYueSArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpIC0gMixcbiAgICB9O1xuICAgIGlmIChBQUJCLm92ZXJsYXBzVmVjKHF0U2V0LmJvdW5kcywgdmVjKSkgcmV0dXJuIHZlYztcbiAgfVxufVxuZnVuY3Rpb24gZ2V0TW91c2VQb3MoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCwgZXZ0OiBNb3VzZUV2ZW50KSB7XG4gIGNvbnN0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIHJldHVybiB7XG4gICAgeDogZXZ0LmNsaWVudFggLSByZWN0LmxlZnQsXG4gICAgeTogZXZ0LmNsaWVudFkgLSByZWN0LnRvcCxcbiAgfTtcbn1cbmxldCBtb3VzZVBvczogVmVjMiA9IHt4OiAwLCB5OiAwfTtcbmNhbmNhc0FsbC5vbm1vdXNlbW92ZSA9IGZ1bmN0aW9uKGV2dDogTW91c2VFdmVudCkge1xuICBtb3VzZVBvcyA9IGdldE1vdXNlUG9zKGNhbmNhc0FsbCwgZXZ0KTtcbn07XG5jYW5jYXNRdWVyeVJlc3VsdC5vbm1vdXNlbW92ZSA9IGZ1bmN0aW9uKGV2dDogTW91c2VFdmVudCkge1xuICBtb3VzZVBvcyA9IGdldE1vdXNlUG9zKGNhbmNhc1F1ZXJ5UmVzdWx0LCBldnQpO1xufTtcblxubGV0IHByZXZpb3VzVGltZVN0YW1wOiBET01IaWdoUmVzVGltZVN0YW1wO1xuZnVuY3Rpb24gYW5pbWF0ZSh0aW1lc3RhbXA6IERPTUhpZ2hSZXNUaW1lU3RhbXApIHtcbiAgY3R4QWxsLmNsZWFyUmVjdCgwLCAwLCBjYW5jYXNBbGwud2lkdGgsIGNhbmNhc0FsbC5oZWlnaHQpO1xuICBjdHhBbGwuc2F2ZSgpO1xuICBjdHhBbGwuZmlsbFN0eWxlID0gJ3JlZCc7XG4gIHdoaWxlIChxdFNldC5zaXplIDwgdG90YWxVbml0KSB7XG4gICAgY29uc29sZS5sb2cocXRTZXQuc2l6ZSk7XG4gICAgcmVjb3JkVW5pdChuZXcgVW5pdChnZW5lcmF0ZUlkKCksIHJhbmRvbVBvc2l0aW9uKCkpKTtcbiAgfVxuICBmb3IgKGxldCBpPTA7IGk8dW5pdFRvTW92ZUVhY2hGcmFtZTsgaSsrKSB7XG4gICAgY29uc3QgdW5pdCA9IHRha2VBVW5pdCgpO1xuICAgIHVuaXQucG9zaXRpb24gPSBtb3ZlUmFuZG9tRGlyZWN0aW9uKHVuaXQucG9zaXRpb24pO1xuICAgIHJlY29yZFVuaXQodW5pdCk7XG4gIH1cbiAgZm9yIChsZXQgaT0wOyBpPHVuaXRUb0FkZEVhY2hGcmFtZTsgaSsrKSB7XG4gICAgY29uc3QgdW5pdCA9IHRha2VBVW5pdCgpO1xuICAgIGlmICghcXRTZXQuZGVsZXRlKHVuaXQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGRlbGV0ZSBmYWlsZWQ6IGAgK1xuICAgICAgICBgJHt1bml0LmlkfSAke0pTT04uc3RyaW5naWZ5KHVuaXQucG9zaXRpb24pfWApO1xuICAgIH1cbiAgICByZWNvcmRVbml0KG5ldyBVbml0KGdlbmVyYXRlSWQoKSwgcmFuZG9tUG9zaXRpb24oKSkpO1xuICB9XG4gIC8vIHF0U2V0LnF1ZXJ5Rm9yRWFjaCgodikgPT4gY3R4QWxsLmZpbGxSZWN0KHYudmVjLngsIHYudmVjLnksIDEsIDEpKTtcbiAgaWYgKHByZXZpb3VzVGltZVN0YW1wKSB7XG4gICAgY3R4QWxsLmZpbGxTdHlsZSA9ICdibHVlJztcbiAgICBjdHhBbGwuZm9udCA9ICcxNXB4IEFyaWFsJztcbiAgICBjdHhBbGwuZmlsbFRleHQoXG4gICAgICAgIGAke01hdGgucm91bmQoMTAwMC8odGltZXN0YW1wIC0gcHJldmlvdXNUaW1lU3RhbXApKX0gZnBzYCwgMTAsIDUwKTtcbiAgfVxuICBjdHhBbGwucmVzdG9yZSgpO1xuXG4gIGN0eFF1ZXJ5UmVzdWx0LmNsZWFyUmVjdCgwLCAwLFxuICAgICAgY2FuY2FzUXVlcnlSZXN1bHQud2lkdGgsIGNhbmNhc1F1ZXJ5UmVzdWx0LmhlaWdodCk7XG4gIGN0eFF1ZXJ5UmVzdWx0LnNhdmUoKTtcbiAgY3R4UXVlcnlSZXN1bHQuZmlsbFN0eWxlID0gJ2dyZWVuJztcbiAgbGV0IHF1ZXJ5Q291bnQgPSAwO1xuICBxdFNldC5xdWVyeUZvckVhY2goU2hhcGUuY3JlYXRlRWxsaXBzZShtb3VzZVBvcywge3g6IDEyLCB5OiA4fSksICh7dmVjfSkgPT4ge1xuICAgIGN0eFF1ZXJ5UmVzdWx0LmZpbGxSZWN0KHZlYy54LCB2ZWMueSwgMSwgMSk7XG4gICAgcXVlcnlDb3VudCArKztcbiAgfSk7XG4gIGN0eFF1ZXJ5UmVzdWx0LmZpbGxTdHlsZSA9ICdibGFjayc7XG4gIGN0eFF1ZXJ5UmVzdWx0LmZvbnQgPSAnMTVweCBBcmlhbCc7XG4gIGN0eFF1ZXJ5UmVzdWx0LmZpbGxUZXh0KFxuICAgICAgYCR7cXVlcnlDb3VudH0vJHtxdFNldC5zaXplfSBxdWVyaWVkYCwgY2FuY2FzUXVlcnlSZXN1bHQud2lkdGggLSAxMDAsIDUwKTtcbiAgY3R4UXVlcnlSZXN1bHQucmVzdG9yZSgpO1xuICBwcmV2aW91c1RpbWVTdGFtcCA9IHRpbWVzdGFtcDtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xufVxud2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztRQUdpQixVQUFVLENBa0YxQjtJQWxGRCxXQUFpQixVQUFVO1FBQ3pCLFNBQWdCLE9BQU8sQ0FBSSxDQUFnQjtZQUN6QyxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUU7Z0JBQ3RCLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7WUFDRCxNQUFN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
