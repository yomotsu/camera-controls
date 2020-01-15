import * as _THREE from 'three/src/Three.d';

export function notSupportedInOrthographicCamera( camera: _THREE.Camera, message: string ): boolean {

	if ( ! ( camera as _THREE.PerspectiveCamera ).isPerspectiveCamera ) {

		console.warn( `${ message } is not supported in OrthographicCamera` );
		return true;

	}

	return false;

}
