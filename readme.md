# camera-controls

A camera control for three.js, similar to THREE.OrbitControls yet supports smooth transitions and es6 import.

[![Latest NPM release](https://img.shields.io/npm/v/camera-controls.svg)](https://www.npmjs.com/package/camera-controls)

## Demos

- [basic](https://yomotsu.github.io/camera-controls/examples/basic.html)

## Usage

```javascript
import * as THREE from 'three';
import CameraControls from 'camera-controls';

CameraControls.install( { THREE: THREE } );

// snip ( init three scene... )
const clock = new THREE.Clock();
const camera = new THREE.PerspectiveCamera( 60, width / height, 0.01, 100 );
const cameraControls = new CameraControls( camera, renderer.domElement );

( function anim () {

	// snip
	const delta = clock.getDelta();
	const isControlsUpdated = cameraControls.update( delta );

	requestAnimationFrame( anim );

	if ( isControlsUpdated ) {

		renderer.render( scene, camera );

	}
} )();
```

## Constructor

`CameraControls( camera, domElement )`

- `camera` is a three.js perspective camera to be controlled.
- `domElement` is a HTML element for draggable area.

## Properties

- `.enabled`: Default is `true`. Whether or not the controls are enabled.
- `.minDistance`: Default is `0`. Minimum distance for dolly.
- `.maxDistance`: Default is `Infinity`. Maximum distance for dolly.
- `.minPolarAngle`: Default is `0`, in radians.
- `.maxPolarAngle`: Default is `Math.PI`, in radians.
- `.minAzimuthAngle`: Default is `-Infinity`, in radians.
- `.maxAzimuthAngle`: Default is `Infinity`, in radians.
- `.dampingFactor`: Default is `0.05`.
- `.draggingDampingFactor`: Default is `0.25`.
- `.zoomSpeed`: Default is `1.0`. Spped of drag and mouse-wheel dollying.
- `.panSpeed`: Default is `2.0`. Spped of drag panning.

## Methods

#### `rotate( rotX, rotY, enableTransition )`

Rotate azimuthal angle(theta) and polar angle(phi). `rotX` and `rotY` are in radian. `enableTransition` is in a boolean

#### `rotateTo( rotX, rotY, enableTransition )`

Rotate azimuthal angle(theta) and polar angle(phi) to a given point.

#### `dolly( distance, enableTransition )`

Dolly in/out camera position. `distance` is in a number. `enableTransition` is in a boolean

#### `dollyTo( distance, enableTransition )`

Dolly in/out camera position to given distance

#### `pan( x, y, enableTransition )`

Pan camera using current azimuthal angle.

#### `moveTo( x, y, z, enableTransition )`

Move `target` position to given point.

#### `saveState()`

Set current camera position as the default position

#### `reset( enableTransition )`

Reset all rotation, zoom, position to default.

#### `update( delta )`

Update camera position and directions. This should be called in your tick loop and returns `true` if re-rendering is needed.
`delta` is delta time between previous update call.

#### `toJSON()`

Get all state in JSON string

#### `fromJSON( json, enableTransition )`

Reproduce the control state with JSON. `enableTransition` is where anim or not in a boolean.

#### `dispose()`

Dispose cameraControls instancem, remove all eventListeners.
