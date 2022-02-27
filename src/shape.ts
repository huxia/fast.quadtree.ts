export interface Vec2 {
  x: number;
  y: number;
}
export interface AABB {
  center: Vec2;
  size: Vec2;
}
export namespace AABB {
  export function overlapsVec(aabb: AABB, vec: Vec2): boolean {
    return aabb.center.x - aabb.size.x <= vec.x &&
      vec.x <= aabb.center.x + aabb.size.x &&
      aabb.center.y - aabb.size.y <= vec.y &&
      vec.y <= aabb.center.y + aabb.size.y;
  }
  export function overlapsAABB(one: AABB, another: AABB): boolean {
    return !(
      another.center.x - another.size.x > one.center.x + one.size.x ||
      another.center.x + another.size.x < one.center.x - one.size.x ||
      another.center.y - another.size.y > one.center.y + one.size.y ||
      another.center.y + another.size.y < one.center.y - one.size.y
    );
  }
}
type RectangleShape = {
  type: 'rectangle'
} & AABB;
type EllipseShape = {
  type: 'ellipse'
} & AABB;
type CircleShape = {
  type: 'circle'
} & {
  center: Vec2;
  size: number;
};
type SquareShape = {
  type: 'square'
} & {
  center: Vec2;
  size: number;
};
export type Shape = RectangleShape | EllipseShape | CircleShape | SquareShape;
export namespace Shape {
  export function overlapsVec(shape: Shape, vec: Vec2): boolean {
    switch (shape.type) {
      case 'rectangle': return AABB.overlapsVec(shape, vec);
      case 'square': return AABB.overlapsVec({
        center: shape.center,
        size: {x: shape.size, y: shape.size},
      }, vec);
      case 'circle': return Shape.overlapsVec({
        type: 'ellipse',
        center: shape.center,
        size: {x: shape.size, y: shape.size},
      }, vec);
      case 'ellipse': {
        const p =
          Math.pow(vec.x - shape.center.x, 2) / Math.pow(shape.size.x, 2) +
          Math.pow(vec.y - shape.center.y, 2) / Math.pow(shape.size.y, 2);
        return p <= 1;
      }
      default: throw new Error('not implemented');
    }
  }
  export function possiblelyOverlapsAABB(shape: Shape, aabb: AABB): boolean {
    switch (shape.type) {
      case 'ellipse':
      case 'rectangle':
        return AABB.overlapsAABB(shape, aabb);
      case 'circle':
      case 'square':
        return AABB.overlapsAABB({
          center: shape.center,
          size: {x: shape.size, y: shape.size},
        }, aabb);
      default: throw new Error('not implemented');
    }
  }
  export function createRectangle(center: Vec2, size: Vec2 | number): Shape {
    if (typeof size === 'number') {
      return {
        type: 'square',
        center,
        size,
      };
    } else {
      return {
        type: 'rectangle',
        center,
        size,
      };
    }
  }
  export function createEllipse(center: Vec2, size: Vec2 | number): Shape {
    if (typeof size === 'number') {
      return {
        type: 'circle',
        center,
        size,
      };
    } else {
      return {
        type: 'ellipse',
        center,
        size,
      };
    }
  }
}
