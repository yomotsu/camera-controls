import type { RefCurrentVelocity } from '../types';

const EPSILON = 1e-5;

export function clamp( value: number, min: number, max: number ) {

	return Math.max( min, Math.min( max, value ) );

}

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


export function smoothDamp(
	current: number,
	target: number,
	refCurrentVelocity: RefCurrentVelocity,
	smoothTime: number,
	maxSpeed: number = Infinity,
	deltaTime: number,
) {

	smoothTime = Math.max( 0.0001, smoothTime );
	const omega = 2 / smoothTime;

	const x = omega * deltaTime;
	const exp = 1 / ( 1 + x + 0.48 * x * x + 0.235 * x * x * x );
	let change = current - target;
	const originalTo = target;

	// Clamp maximum speed
	const maxChange = maxSpeed * smoothTime;
	change = clamp( change, - maxChange, maxChange );
	target = current - change;

	const temp = ( refCurrentVelocity.value + omega * change ) * deltaTime;
	refCurrentVelocity.value = ( refCurrentVelocity.value - omega * temp ) * exp;
	let output = target + ( change + temp ) * exp;

	// Prevent overshooting
	if ( originalTo - current > 0.0 === output > originalTo ) {

		output = originalTo;
		refCurrentVelocity.value = ( output - originalTo ) / deltaTime;

	}

	return output;

}
