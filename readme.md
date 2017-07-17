# camera-controls

A camera control for three.js, similar to THREE.OrbitControls but supports smooth transitions and es6 import.

[![Latest NPM release](https://img.shields.io/npm/v/camera-controls.svg)](https://www.npmjs.com/package/camera-controls)

## Demos

- [basic](https://yomotsu.github.io/camera-controls/examples/index.html)

## Usage

```
import cameraControlsFactory from './camera-controls.js';
const CameraControls = cameraControlsFactory( THREE );

// snip ( init three scene... )

const camera = new THREE.PerspectiveCamera( 60, width / height, 0.01, 100 );
const cameraControls = new CameraControls( camera, renderer.domElement );

( function anim () {

	// snip
	const needsUpdate = cameraControls.update( delta );
	
	requestAnimationFrame( anim );

	if ( needsUpdate ) {

		renderer.render( scene, camera );

	}
} )();
```

## methods

#### `rotate( rotX, rotY, enableTransition )`

Rotate azimuthal angle(theta) and polar angle(phi). `rotX` and `rotY` are in radian. `enableTransition` is in a boolean

#### `rotateTo( rotX, rotY, enableTransition )`

Rotate azimuthal angle(theta) and polar angle(phi) to a given point.

#### `dolly ( distance, enableTransition )`

Dolly in/out camera position. `distance` is in a number. `enableTransition` is in a boolean

#### `dollyTo ( distance, enableTransition )`

Dolly in/out camera position to given distance

#### `pan ( x, y, enableTransition )`

Pan camera using current azimuthal angle.

#### `moveTo ( x, y, z, enableTransition )`

Move `target` position to given point.

#### `saveState ()`

Set current camera position as the default position

#### `reset ( enableTransition )`

Reset all rotation, zoom, position to default.

#### `update ( delta )`

Update camera position and directions. This should be called in your tick loop and returns `true` if re-rendering is required

#### `dispose()`
