import * as THREE from 'three';

/**
 * A compat function for `Quaternion.invert()` / `Quaternion.inverse()`.
 * `Quaternion.invert()` is introduced in r123 and `Quaternion.inverse()` emits a warning.
 * We are going to use this compat for a while.
 * @param target A target quaternion
 */
export function quatInvertCompat<T extends THREE.Quaternion>( target: T ): T {

	if ( ( target as any ).invert ) {

		target.invert();

	} else {

		( target as any ).inverse();

	}

	return target;

}
