import type * as _THREE from 'three';
import type { Ref } from '../types';

const EPSILON = 1e-5;
export const DEG2RAD = Math.PI / 180;

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

// https://docs.unity3d.com/ScriptReference/Mathf.SmoothDamp.html
// https://github.com/Unity-Technologies/UnityCsReference/blob/a2bdfe9b3c4cd4476f44bf52f848063bfaf7b6b9/Runtime/Export/Math/Mathf.cs#L308
export function smoothDamp(
	current: number,
	target: number,
	currentVelocityRef: Ref,
	smoothTime: number,
	maxSpeed: number = Infinity,
	deltaTime: number,
): number {

	// Based on Game Programming Gems 4 Chapter 1.10
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

	const temp = ( currentVelocityRef.value + omega * change ) * deltaTime;
	currentVelocityRef.value = ( currentVelocityRef.value - omega * temp ) * exp;
	let output = target + ( change + temp ) * exp;

	// Prevent overshooting
	if ( originalTo - current > 0.0 === output > originalTo ) {

		output = originalTo;
		currentVelocityRef.value = ( output - originalTo ) / deltaTime;

	}

	return output;

}

// https://docs.unity3d.com/ScriptReference/Vector3.SmoothDamp.html
// https://github.com/Unity-Technologies/UnityCsReference/blob/a2bdfe9b3c4cd4476f44bf52f848063bfaf7b6b9/Runtime/Export/Math/Vector3.cs#L97
export function smoothDampVec3(
	current: _THREE.Vector3,
	target: _THREE.Vector3,
	currentVelocityRef: _THREE.Vector3,
	smoothTime: number,
	maxSpeed: number = Infinity,
	deltaTime: number,
	out: _THREE.Vector3
) {

	// Based on Game Programming Gems 4 Chapter 1.10
	smoothTime = Math.max( 0.0001, smoothTime );
	const omega = 2 / smoothTime;

	const x = omega * deltaTime;
	const exp = 1 / ( 1 + x + 0.48 * x * x + 0.235 * x * x * x );

	let targetX = target.x;
	let targetY = target.y;
	let targetZ = target.z;

	let changeX = current.x - targetX;
	let changeY = current.y - targetY;
	let changeZ = current.z - targetZ;

	const originalToX = targetX;
	const originalToY = targetY;
	const originalToZ = targetZ;

	// Clamp maximum speed
	const maxChange = maxSpeed * smoothTime;

	const maxChangeSq = maxChange * maxChange;
	const magnitudeSq = changeX * changeX + changeY * changeY + changeZ * changeZ;

	if ( magnitudeSq > maxChangeSq ) {

		const magnitude = Math.sqrt( magnitudeSq );
		changeX = changeX / magnitude * maxChange;
		changeY = changeY / magnitude * maxChange;
		changeZ = changeZ / magnitude * maxChange;

	}

	targetX = current.x - changeX;
	targetY = current.y - changeY;
	targetZ = current.z - changeZ;

	const tempX = ( currentVelocityRef.x + omega * changeX ) * deltaTime;
	const tempY = ( currentVelocityRef.y + omega * changeY ) * deltaTime;
	const tempZ = ( currentVelocityRef.z + omega * changeZ ) * deltaTime;

	currentVelocityRef.x = ( currentVelocityRef.x - omega * tempX ) * exp;
	currentVelocityRef.y = ( currentVelocityRef.y - omega * tempY ) * exp;
	currentVelocityRef.z = ( currentVelocityRef.z - omega * tempZ ) * exp;

	out.x = targetX + ( changeX + tempX ) * exp;
	out.y = targetY + ( changeY + tempY ) * exp;
	out.z = targetZ + ( changeZ + tempZ ) * exp;

	// Prevent overshooting
	const origMinusCurrentX = originalToX - current.x;
	const origMinusCurrentY = originalToY - current.y;
	const origMinusCurrentZ = originalToZ - current.z;
	const outMinusOrigX = out.x - originalToX;
	const outMinusOrigY = out.y - originalToY;
	const outMinusOrigZ = out.z - originalToZ;

	if ( origMinusCurrentX * outMinusOrigX + origMinusCurrentY * outMinusOrigY + origMinusCurrentZ * outMinusOrigZ > 0 ) {

		out.x = originalToX;
		out.y = originalToY;
		out.z = originalToZ;

		currentVelocityRef.x = ( out.x - originalToX ) / deltaTime;
		currentVelocityRef.y = ( out.y - originalToY ) / deltaTime;
		currentVelocityRef.z = ( out.z - originalToZ ) / deltaTime;

	}

	return out;

}
