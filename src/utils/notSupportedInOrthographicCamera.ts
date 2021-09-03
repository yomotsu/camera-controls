import * as _THREE from 'three';
import { isOrthographicCamera } from '../types';

export function notSupportedInOrthographicCamera(
	camera: _THREE.OrthographicCamera | _THREE.PerspectiveCamera,
	message: string
): camera is _THREE.OrthographicCamera {

	if ( isOrthographicCamera( camera ) ) {

		console.warn( `${ message } is not supported in OrthographicCamera` );
		return true;

	}

	return false;

}
