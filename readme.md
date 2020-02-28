# camera-controls

A camera control for three.js, similar to THREE.OrbitControls yet supports smooth transitions and more features.

[![Latest NPM release](https://img.shields.io/npm/v/camera-controls.svg)](https://www.npmjs.com/package/camera-controls)

## Working examples

| camera move    | default user input (Configurable) |
| ---            | ---                               |
| Orbit rotation | left mouse drag / touch: one-finger move |
| Dolly          | middle mouse drag, or mousewheel / touch: two-finger pinch-in or out |
| Truck (Pan)    | right mouse drag / touch: two-finger move or three-finger move |

- [basic](https://yomotsu.github.io/camera-controls/examples/basic.html)
- [fit-and-padding](https://yomotsu.github.io/camera-controls/examples/fit-and-padding.html)
- [boundary](https://yomotsu.github.io/camera-controls/examples/boundary.html)
- [`viewport` within the canvas](https://yomotsu.github.io/camera-controls/examples/viewport.html)
- [z-up camera](https://yomotsu.github.io/camera-controls/examples/camera-up.html)
- [orthographic](https://yomotsu.github.io/camera-controls/examples/orthographic.html)
- [user input config](https://yomotsu.github.io/camera-controls/examples/config.html)
- [combined gestures](https://yomotsu.github.io/camera-controls/examples/combined-gestures.html)
- [keyboard events](https://yomotsu.github.io/camera-controls/examples/keyboard.html)
- [collision](https://yomotsu.github.io/camera-controls/examples/collision.html)
- [path animation](https://yomotsu.github.io/camera-controls/examples/path-animation.html) (with [tween.js](https://github.com/tweenjs/tween.js))


## Usage

```javascript
import * as THREE from 'three';
import CameraControls from 'camera-controls';

CameraControls.install( { THREE: THREE } );

// snip ( init three scene... )
const clock = new THREE.Clock();
const camera = new THREE.PerspectiveCamera( 60, width / height, 0.01, 1000 );
const cameraControls = new CameraControls( camera, renderer.domElement );

( function anim () {

	// snip
	const delta = clock.getDelta();
	const hasControlsUpdated = cameraControls.update( delta );

	requestAnimationFrame( anim );

	// you can skip this condition to render though
	if ( hasControlsUpdated ) {

		renderer.render( scene, camera );

	}
} )();
```

## Constructor

`CameraControls( camera, domElement )`

- `camera` is a `THREE.PerspectiveCamera` or `THREE.OrthographicCamera` to be controlled.
- `domElement` is a `HTMLElement` for draggable area.

## Terms

### Orbit rotations

CameraControls uses Spherical Coordinates for orbit rotations.

If your camera is Y-up, Azimuthal angle will be the angle for y-axis rotation and Polar angle will be the angle for vertical position.

![](https://yomotsu.github.io/camera-controls/examples/fig1.png)


### Dolly vs Zoom

- A Zoom involves changing the lens focal length. In three.js, zooming is actually changing the camera FOV, and the camera is stationary (doesn't move).
- A Dolly involves physically moving the camera to change the composition of the image in the frame.

See [the demo](https://github.com/yomotsu/camera-movement-comparison#dolly-vs-zoom)

## Properties

| Name                      | Type      | Default     | Description |
| ------------------------- | --------- | ----------- | ----------- |
| `.enabled`                | `boolean` | `true`      | Whether or not the controls are enabled. |
| `.minDistance`            | `number`  | `0`         | Minimum distance for dolly. |
| `.maxDistance`            | `number`  | `Infinity`  | Maximum distance for dolly. |
| `.minPolarAngle`          | `number`  | `0`         | In radians. |
| `.maxPolarAngle`          | `number`  | `Math.PI`   | In radians. |
| `.minAzimuthAngle`        | `number`  | `-Infinity` | In radians. |
| `.maxAzimuthAngle`        | `number`  | `Infinity`  | In radians. |
| `.boundaryFriction`       | `number`  | `0.0`       | Friction ratio of the boundary. |
| `.boundaryEnclosesCamera` | `boolean` | `false`     | Whether camera position should be enclosed in the boundary or not. |
| `.dampingFactor`          | `number`  | `0.05`      | The damping inertia |
| `.draggingDampingFactor`  | `number`  | `0.25`      | The damping inertia while dragging |
| `.azimuthRotateSpeed`     | `number`  | `1.0`       | Speed of azimuth rotation. |
| `.polarRotateSpeed`       | `number`  | `1.0`       | Speed of polar rotation. |
| `.dollySpeed`             | `number`  | `1.0`       | Speed of mouse-wheel dollying. |
| `.truckSpeed`             | `number`  | `2.0`       | Speed of drag for truck and pedestal. |
| `.verticalDragToForward`  | `boolean` | `false`     | The same as `.screenSpacePanning` in three.js's OrbitControls. |
| `.dollyToCursor`          | `boolean` | `false`     | `true` to enable Dolly-in to the mouse cursor coords. |
| `.colliderMeshes`         | `array`   | `[]`        | An array of Meshes to collide with camera *. |

* Be aware colliderMeshes may decrease performance. Collision test uses 4 raycasters from camera, since near plane has 4 corners.

## Events

CameraControls instance emits the following events.
To subscribe, use `cameraControl.addEventListener( 'eventname', function )`.
To unsubscribe, use `cameraControl.removeEventListener( 'eventname', function )`.

| Event name       | Timing |
| ---------------- | ------ |
| `'controlstart'` | When the user starts to control the camera via mouse / touches. |
| `'control'`      | When the user controls the camera (dragging). |
| `'controlend'`   | When the user ends to control the camera. |
| `'update'`       | When the camera position is updated. |
| `'awake'`        | When the camera start moving. |
| `'sleep'`        | When the camera end moving. |

## User input config

Working example: [user input config](https://yomotsu.github.io/camera-controls/examples/config.html)

| button to assign      | behavior |
| --------------------- | -------- |
| `mouseButtons.left`   | `CameraControls.ACTION.ROTATE`* \| `CameraControls.ACTION.TRUCK` \| `CameraControls.ACTION.DOLLY` \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |
| `mouseButtons.right`  | `CameraControls.ACTION.ROTATE` \| `CameraControls.ACTION.TRUCK`* \| `CameraControls.ACTION.DOLLY` \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |
| `mouseButtons.wheel`  | `CameraControls.ACTION.ROTATE` \| `CameraControls.ACTION.TRUCK` \| `CameraControls.ACTION.DOLLY` \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |

- \* is the default.
- The default of `mouseButtons.wheel` is:
  - `DOLLY` for Perspective camera.
  - `ZOOM` for Orthographic camera, and can't set `DOLLY`.

| fingers to assign     | behavior |
| --------------------- | -------- |
| `touches.one` | `CameraControls.ACTION.TOUCH_ROTATE`* \| `CameraControls.ACTION.TOUCH_TRUCK` \| `CameraControls.ACTION.DOLLY` | `CameraControls.ACTION.ZOOM` | `CameraControls.ACTION.NONE` |
| `touches.two` | `ACTION.TOUCH_DOLLY_TRUCK` \| `ACTION.TOUCH_ZOOM_TRUCK` \| `ACTION.TOUCH_DOLLY` \| `ACTION.TOUCH_ZOOM` \| `CameraControls.ACTION.TOUCH_ROTATE` \| `CameraControls.ACTION.TOUCH_TRUCK` \| `CameraControls.ACTION.NONE` |
| `touches.three` | `ACTION.TOUCH_DOLLY_TRUCK` \| `ACTION.TOUCH_ZOOM_TRUCK` \| `ACTION.TOUCH_DOLLY` \| `ACTION.TOUCH_ZOOM` \| `CameraControls.ACTION.TOUCH_ROTATE` \| `CameraControls.ACTION.TOUCH_TRUCK` \| `CameraControls.ACTION.NONE` |

- \* is the default.
- The default of `touches.two` and `touches.three` is:
  - `TOUCH_DOLLY_TRUCK` for Perspective camera.
  - `TOUCH_ZOOM_TRUCK` for Orthographic camera, and can't set `TOUCH_DOLLY_TRUCK` and `TOUCH_DOLLY`.

## Methods

#### `rotate( azimuthAngle, polarAngle, enableTransition )`

Rotate azimuthal angle(horizontal) and polar angle(vertical).

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `azimuthAngle`     | `number`  | Azimuth rotate angle. In radian. |
| `polarAngle`       | `number`  | Polar rotate angle. In radian. |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `rotateTo( azimuthAngle, polarAngle, enableTransition )`

Rotate azimuthal angle(horizontal) and polar angle(vertical) to a given point.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `azimuthAngle`     | `number`  | Azimuth rotate angle to. In radian. |
| `polarAngle`       | `number`  | Polar rotate angle to. In radian. |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `dolly( distance, enableTransition )`

Dolly in/out camera position.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `distance`         | `number`  | Distance of dollyIn |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `dollyTo( distance, enableTransition )`

Dolly in/out camera position to given distance.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `distance`         | `number`  | Distance of dollyIn |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `zoom( zoomStep, enableTransition )`

Zoom in/out of camera.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `zoomStep`         | `number`  | zoom scale |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

You can also make zoomIn function using `camera.zoom` property.
e.g.
```
const zoomIn = () => {
	cameraControls.zoom( camera.zoom / 2, true );
}
const zoomOut = () => {
	cameraControls.zoom( - camera.zoom / 2, true );
}
```

---

#### `zoomTo( zoom, enableTransition )`

Zoom in/out camera to given scale.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `zoom`             | `number`  | zoom scale |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `truck( x, y, enableTransition )`

Truck and pedestal camera using current azimuthal angle.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `x`                | `number`  | Horizontal translate amount |
| `y`                | `number`  | Vertical translate amount |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `forward( distance, enableTransition )`

Move forward / backward.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `distance`         | `number`  | Amount to move forward / backward. Negative value to move backward |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `moveTo( x, y, z, enableTransition )`

Move `target` position to given point.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `x`                | `number`  | x coord to move center position |
| `y`                | `number`  | y coord to move center position |
| `z`                | `number`  | z coord to move center position |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `fitTo( box3OrMesh, enableTransition, { paddingTop, paddingLeft, paddingBottom, paddingRight } )`

Fit the viewport to the object bounding box or the bounding box itself. paddings are in unit.

| Name                    | Type                         | Description |
| ----------------------- | ---------------------------- | ----------- |
| `box3OrMesh`            | `THREE.Box3` \| `THREE.Mesh` | Axis aligned bounding box to fit the view. |
| `enableTransition`      | `boolean`                    | Whether to move smoothly or immediately |
| `options`               | `object`                     | Options |
| `options.paddingTop`    | `number`                     | Padding top. Default is `0` |
| `options.paddingRight`  | `number`                     | Padding right. Default is `0` |
| `options.paddingBottom` | `number`                     | Padding bottom. Default is `0` |
| `options.paddingLeft`   | `number`                     | Padding left. Default is `0` |

---

#### `setLookAt( positionX, positionY, positionZ, targetX, targetY, targetZ, enableTransition )`

It moves the camera into `position`, and make it look at `target`.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `positionX`        | `number`  | Position x of look at from. |
| `positionY`        | `number`  | Position y of look at from. |
| `positionZ`        | `number`  | Position z of look at from. |
| `targetX`          | `number`  | Position x of look at. |
| `targetY`          | `number`  | Position y of look at. |
| `targetZ`          | `number`  | Position z of look at. |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `lerpLookAt( positionAX, positionAY, positionAZ, targetAX, targetAY, targetAZ, positionBX, positionBY, positionBZ, targetBX, targetBY, targetBZ, t, enableTransition )`

Similar to `setLookAt`, but it interpolates between two states.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `positionAX`       | `number`  | The starting position x of look at from. |
| `positionAY`       | `number`  | The starting position y of look at from. |
| `positionAZ`       | `number`  | The starting position z of look at from. |
| `targetAX`         | `number`  | The starting position x of look at. |
| `targetAY`         | `number`  | The starting position y of look at. |
| `targetAZ`         | `number`  | The starting position z of look at. |
| `positionBX`       | `number`  | Look at from position x to interpolate towards. |
| `positionBY`       | `number`  | Look at from position y to interpolate towards. |
| `positionBZ`       | `number`  | Look at from position z to interpolate towards. |
| `targetBX`         | `number`  | look at position x to interpolate towards. |
| `targetBY`         | `number`  | look at position y to interpolate towards. |
| `targetBZ`         | `number`  | look at position z to interpolate towards. |
| `t`                | `number`  | Interpolation factor in the closed interval [0, 1]. |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `setPosition( positionX, positionY, positionZ, enableTransition )`

`setLookAt` without target, keep gazing at the current target.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `positionX`        | `number`  | Position x of look at from. |
| `positionY`        | `number`  | Position y of look at from. |
| `positionZ`        | `number`  | Position z of look at from. |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `setTarget( targetX, targetY, targetZ, enableTransition )`

`setLookAt` without position, Stay still at the position.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `targetX`          | `number`  | Position x of look at. |
| `targetY`          | `number`  | Position y of look at. |
| `targetZ`          | `number`  | Position z of look at. |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `setBoundary( box3? )`

Set the boundary box that encloses the target of the camera. `box3` is in `THREE.Box3`

Return its current position.

| Name   | Type          | Description |
| ------ | ------------- | ----------- |
| `box3` | `THREE.Box3?` | Boundary area. No argument to remove the boundary. |

---

#### `setViewport( vector4? )`

Set (or unset) the current viewport.

Set this when you want to use renderer viewport and [`.dollyToCursor`](#properties) feature at the same time.

See: [THREE.WebGLRenderer.setViewport()](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setViewport)

| Name      | Type             | Description |
| --------- | ---------------- | ----------- |
| `vector4` | `THREE.Vector4?` | Vector4 that represents the viewport, or `undefined` for unsetting this. |

#### `setViewport( x, y, width, height )`

Same as [`setViewport( vector4 )`](#setviewport-vector4-|-null-) , but you can give it four numbers that represents a viewport instead:

| Name     | Type     | Description |
| -------- | -------- | ----------- |
| `x`      | `number` | Leftmost of the viewport. |
| `y`      | `number` | Bottommost of the viewport. |
| `width`  | `number` | Width of the viewport. |
| `height` | `number` | Height of the viewport. |

---

#### `getPosition( out )`

Return its current position.

| Name  | Type            | Description |
| ----- | --------------- | ----------- |
| `out` | `THREE.Vector3` | The receiving vector |

---

#### `getTarget( out )`

Return its current gazing target which is the center position of the orbit.

| Name  | Type            | Description |
| ----- | --------------- | ----------- |
| `out` | `THREE.Vector3` | The receiving vector |

---

#### `saveState()`

Set current camera position as the default position

---

##### `normalizeRotations()`

Normalize camera azimuth angle rotation between 0 and 360 degrees.

---

#### `reset( enableTransition )`

Reset all rotation and position to default.

| Name               | Type      | Description |
| ------------------ | --------- | ----------- |
| `enableTransition` | `boolean` | Whether to move smoothly or immediately |

---

#### `update( delta ): boolean`

Update camera position and directions. This should be called in your tick loop and returns `true` if re-rendering is needed.

| Name    | Type     | Description |
| ------- | -------- | ----------- |
| `delta` | `number` | Delta time between previous update call |

---

#### `updateCameraUp()`

When you change camera-up vector, run `.updateCameraUp()` to sync.

---

#### `addEventListener( type: string, listener: function )`

Adds the specified event listener.

---

#### `removeEventListener( type: string, listener: function )`

Removes the specified event listener.

---

#### `removeAllEventListeners( type: string )`

Removes all listeners for the specified type.

---

#### `toJSON()`

Get all state in JSON string

---

#### `fromJSON( json, enableTransition )`

Reproduce the control state with JSON. `enableTransition` is where anim or not in a boolean.

---

#### `dispose()`

Dispose the cameraControls instance itself, remove all eventListeners.

---

## Breaking changes

@1.16.0 `dolly()` will take opposite value. e.g. dolly-in to `dolly( 1 )` (used be dolly-in to `dolly( -1 )`)
