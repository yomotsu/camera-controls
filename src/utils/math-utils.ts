const EPSILON = 1e-5;

export function approxZero( number: number, error: number = EPSILON ): boolean {

	return Math.abs( number ) < error;

}

export function approxEquals( a: number, b: number, error: number = EPSILON ): boolean {

	return approxZero( a - b, error );

}

export function roundToStep( value: number, step: number ): number {

	return Math.round( value / step ) * step;

}

export function infinityToMaxNumber( value: number ): number {

	if ( isFinite( value ) ) return value;

	if ( value < 0 ) return - Number.MAX_VALUE;

	return Number.MAX_VALUE;

}

export function maxNumberToInfinity( value: number ): number {

	if ( Math.abs( value ) < Number.MAX_VALUE ) return value;

	return value * Infinity;

}

export interface IVector2 {
	x:number,
	y:number
}
  
export function getLen(v:IVector2): number{
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function dot(v1:IVector2, v2:IVector2): number {
    return v1.x * v2.x + v1.y * v2.y;
}

export function getAngle(v1:IVector2, v2:IVector2): number {
    const mr = getLen(v1) * getLen(v2);
    if (mr === 0) return 0;
    let r = dot(v1, v2) / mr;
    if (r > 1) r = 1;
    return Math.acos(r);
}

export function cross(v1:IVector2, v2:IVector2): number {
    return v1.x * v2.y - v2.x * v1.y;
}

export function getRotateAngle(v1:IVector2, v2:IVector2): number {
    let angle = getAngle(v1, v2);
    if (cross(v1, v2) > 0) {
        angle *= -1;
    }
    return angle * 180 / Math.PI;
}
