export interface Vec2 {
    x: number;
    y: number;
}
export interface AABB {
    center: Vec2;
    size: Vec2;
}
export declare namespace AABB {
    function overlapsVec(aabb: AABB, vec: Vec2): boolean;
    function overlapsAABB(one: AABB, another: AABB): boolean;
}
declare type RectangleShape = {
    type: 'rectangle';
} & AABB;
declare type EllipseShape = {
    type: 'ellipse';
} & AABB;
declare type CircleShape = {
    type: 'circle';
} & {
    center: Vec2;
    size: number;
};
declare type SquareShape = {
    type: 'square';
} & {
    center: Vec2;
    size: number;
};
export declare type Shape = RectangleShape | EllipseShape | CircleShape | SquareShape;
export declare namespace Shape {
    function overlapsVec(shape: Shape, vec: Vec2): boolean;
    function possiblelyOverlapsAABB(shape: Shape, aabb: AABB): boolean;
    function createRectangle(center: Vec2, size: Vec2 | number): Shape;
    function createEllipse(center: Vec2, size: Vec2 | number): Shape;
}
export {};
