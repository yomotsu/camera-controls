# camera-controls

A camera control for three.js, similar to THREE.OrbitControls yet supports smooth transitions and es6 import.

[![Latest NPM release](https://img.shields.io/npm/v/camera-controls.svg)](https://www.npmjs.com/package/camera-controls)

## Demos

- [basic](https://yomotsu.github.io/camera-controls/examples/basic.html)
- [orthographic](https://yomotsu.github.io/camera-controls/examples/orthographic.html)
- [fit-and-padding](https://yomotsu.github.io/camera-controls/examples/fit-and-padding.html)

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
- `.dollySpeed`: Default is `1.0`. speed of mouse-wheel dollying.
- `.truckSpeed`: Default is `2.0`. speed of drag for truck and pedestal.
- `.verticalDragToForward`: Default is `false`. The same as `.screenSpacePanning` in three.js's OrbitControls.
- `.dollyToCursor`: Default is `false`. Dolly-in to the mouse cursor coords.

## Events

Using `addEventListener( eventname, function )` you can subscribe to these events.

- `controlstart`: Fired when the user starts to control the camera via mouse / touches.
- `control`: Fired when the user controls the camera (dragging).
- `controlend`: Fired when the user ends to control the camera.
- `update`: Fired when camera position is updated.

## Methods

#### `rotate( rotX, rotY, enableTransition )`

Rotate azimuthal angle(theta) and polar angle(phi). `rotX` and `rotY` are in radian. `enableTransition` is in a boolean

#### `rotateTo( rotX, rotY, enableTransition )`

Rotate azimuthal angle(theta) and polar angle(phi) to a given point.

#### `dolly( distance, enableTransition )`

Dolly in/out camera position. `distance` is in a number. `enableTransition` is in a boolean

#### `dollyTo( distance, enableTransition )`

Dolly in/out camera position to given distance

#### `truck( x, y, enableTransition )`

Truck and pedestal camera using current azimuthal angle.

#### `moveTo( x, y, z, enableTransition )`

Move `target` position to given point.

#### `forward( distance, enableTransition )`

Move forward / backward.

#### `fitTo( meshOrBox3, enableTransition, { paddingTop?: number = 0, paddingLeft?: number = 0, paddingBottom?: number = 0, paddingRight?: number = 0 } )`

Fit the viewport to the object bounding box or the bounding box itself. paddings are in unit.

#### `setLookAt( positionX, positionY, positionZ, targetX, targetY, targetZ, enableTransition )`

It moves the camera into `position` , and also make it look at `target` .

#### `lerpLookAt( positionAX, positionAY, positionAZ, targetAX, targetAY, targetAZ, positionBX, positionBY, positionBZ, targetBX, targetBY, targetBZ, x, enableTransition )`

Same as `setLookAt` , but it interpolates between two states.

#### `setPosition( positionX, positionY, positionZ, enableTransition )`

`setLookAt` without target , Stay gazing at the current target.

#### `setTarget( targetX, targetY, targetZ, enableTransition )`

`setLookAt` without position , Stay still at the position.

#### `getPosition( out )`

Return its current position.

#### `getTarget( out )`

Return its current gazing target.

#### `saveState()`

Set current camera position as the default position

#### `reset( enableTransition )`

Reset all rotation and position to default.

#### `update( delta )`

Update camera position and directions. This should be called in your tick loop and returns `true` if re-rendering is needed.
`delta` is delta time between previous update call.

#### `toJSON()`

Get all state in JSON string

#### `fromJSON( json, enableTransition )`

Reproduce the control state with JSON. `enableTransition` is where anim or not in a boolean.

#### `dispose()`

Dispose the cameraControls instance itself, remove all eventListeners.
