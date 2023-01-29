import type * as _THREE from 'three';
import {
	THREESubset,
	Ref,
	MOUSE_BUTTON,
	ACTION,
	PointerInput,
	MouseButtons,
	Touches,
	FitToOptions,
	CameraControlsEventMap,
	isPerspectiveCamera,
	isOrthographicCamera,
} from './types';
import {
	PI_2,
	PI_HALF,
} from './constants';
import {
	DEG2RAD,
	clamp,
	approxZero,
	approxEquals,
	roundToStep,
	infinityToMaxNumber,
	maxNumberToInfinity,
	smoothDamp,
	smoothDampVec3,
} from './utils/math-utils';
import { extractClientCoordFromEvent } from './utils/extractClientCoordFromEvent';
import { notSupportedInOrthographicCamera } from './utils/notSupportedInOrthographicCamera';
import { EventDispatcher, Listener } from './EventDispatcher';

const VERSION = '__VERSION'; // will be replaced with `version` in package.json during the build process.
const TOUCH_DOLLY_FACTOR = 1 / 8;

const isBrowser = typeof window !== 'undefined';
const isMac = isBrowser && /Mac/.test( navigator.platform );
const isPointerEventsNotSupported = ! ( isBrowser && 'PointerEvent' in window ); // Safari 12 does not support PointerEvents API

let THREE: THREESubset;
let _ORIGIN: _THREE.Vector3;
let _AXIS_Y: _THREE.Vector3;
let _AXIS_Z: _THREE.Vector3;
let _v2: _THREE.Vector2;
let _v3A: _THREE.Vector3;
let _v3B: _THREE.Vector3;
let _v3C: _THREE.Vector3;
let _xColumn: _THREE.Vector3;
let _yColumn: _THREE.Vector3;
let _zColumn: _THREE.Vector3;
let _deltaTarget: _THREE.Vector3;
let _deltaOffset: _THREE.Vector3;
let _sphericalA: _THREE.Spherical;
let _sphericalB: _THREE.Spherical;
let _box3A: _THREE.Box3;
let _box3B: _THREE.Box3;
let _sphere: _THREE.Sphere;
let _quaternionA: _THREE.Quaternion;
let _quaternionB: _THREE.Quaternion;
let _rotationMatrix: _THREE.Matrix4;
let _raycaster: _THREE.Raycaster;

export class CameraControls extends EventDispatcher {

	/**
	 * Injects THREE as the dependency. You can then proceed to use CameraControls.
	 *
	 * e.g
	 * ```javascript
	 * CameraControls.install( { THREE: THREE } );
	 * ```
	 *
	 * Note: If you do not wish to use enter three.js to reduce file size(tree-shaking for example), make a subset to install.
	 *
	 * ```js
	 * import {
	 * 	Vector2,
	 * 	Vector3,
	 * 	Vector4,
	 * 	Quaternion,
	 * 	Matrix4,
	 * 	Spherical,
	 * 	Box3,
	 * 	Sphere,
	 * 	Raycaster,
	 * 	MathUtils,
	 * } from 'three';
	 *
	 * const subsetOfTHREE = {
	 * 	Vector2   : Vector2,
	 * 	Vector3   : Vector3,
	 * 	Vector4   : Vector4,
	 * 	Quaternion: Quaternion,
	 * 	Matrix4   : Matrix4,
	 * 	Spherical : Spherical,
	 * 	Box3      : Box3,
	 * 	Sphere    : Sphere,
	 * 	Raycaster : Raycaster,
	 * };

	 * CameraControls.install( { THREE: subsetOfTHREE } );
	 * ```
	 * @category Statics
	 */
	static install( libs: { THREE: THREESubset } ): void {

		THREE = libs.THREE;
		_ORIGIN = Object.freeze( new THREE.Vector3( 0, 0, 0 ) );
		_AXIS_Y = Object.freeze( new THREE.Vector3( 0, 1, 0 ) );
		_AXIS_Z = Object.freeze( new THREE.Vector3( 0, 0, 1 ) );
		_v2 = new THREE.Vector2();
		_v3A = new THREE.Vector3();
		_v3B = new THREE.Vector3();
		_v3C = new THREE.Vector3();
		_xColumn = new THREE.Vector3();
		_yColumn = new THREE.Vector3();
		_zColumn = new THREE.Vector3();
		_deltaTarget = new THREE.Vector3();
		_deltaOffset = new THREE.Vector3();
		_sphericalA = new THREE.Spherical();
		_sphericalB = new THREE.Spherical();
		_box3A = new THREE.Box3();
		_box3B = new THREE.Box3();
		_sphere = new THREE.Sphere();
		_quaternionA = new THREE.Quaternion();
		_quaternionB = new THREE.Quaternion();
		_rotationMatrix = new THREE.Matrix4();
		_raycaster = new THREE.Raycaster();

	}

	/**
	 * list all ACTIONs
	 * @category Statics
	 */
	static get ACTION(): typeof ACTION {

		return ACTION;

	}

	/**
	 * Minimum vertical angle in radians.  
	 * The angle has to be between `0` and `.maxPolarAngle` inclusive.  
	 * The default value is `0`.
	 *
	 * e.g.
	 * ```
	 * cameraControls.maxPolarAngle = 0;
	 * ```
	 * @category Properties
	 */
	minPolarAngle = 0; // radians

	/**
	 * Maximum vertical angle in radians.  
	 * The angle has to be between `.maxPolarAngle` and `Math.PI` inclusive.  
	 * The default value is `Math.PI`.
	 *
	 * e.g.
	 * ```
	 * cameraControls.maxPolarAngle = Math.PI;
	 * ```
	 * @category Properties
	 */
	maxPolarAngle = Math.PI; // radians

	/**
	 * Minimum horizontal angle in radians.  
	 * The angle has to be less than `.maxAzimuthAngle`.  
	 * The default value is `- Infinity`.
	 *
	 * e.g.
	 * ```
	 * cameraControls.minAzimuthAngle = - Infinity;
	 * ```
	 * @category Properties
	 */
	minAzimuthAngle = - Infinity; // radians

	/**
	 * Maximum horizontal angle in radians.  
	 * The angle has to be greater than `.minAzimuthAngle`.  
	 * The default value is `Infinity`.
	 *
	 * e.g.
	 * ```
	 * cameraControls.maxAzimuthAngle = Infinity;
	 * ```
	 * @category Properties
	 */
	maxAzimuthAngle = Infinity; // radians

	// How far you can dolly in and out ( PerspectiveCamera only )
	/**
	 * Minimum distance for dolly. The value must be higher than `0`.  
	 * PerspectiveCamera only.
	 * @category Properties
	 */
	minDistance = 0;
	/**
	 * Maximum distance for dolly. The value must be higher than `minDistance`.  
	 * PerspectiveCamera only.
	 * @category Properties
	 */
	maxDistance = Infinity;
	/**
	 * `true` to enable Infinity Dolly.  
	 * When the Dolly distance is less than the `minDistance`, radius of the sphere will be set `minDistance` automatically.
	 * @category Properties
	 */
	infinityDolly = false;

	/**
	 * Minimum camera zoom.
	 * @category Properties
	 */
	minZoom = 0.01;
	/**
	 * Maximum camera zoom.
	 * @category Properties
	 */
	maxZoom = Infinity;

	/**
	 * Approximate time in seconds to reach the target. A smaller value will reach the target faster.
	 * @category Properties
	 */
	smoothTime = 0.25;

	/**
	 * the smoothTime while dragging
	 * @category Properties
	 */
	draggingSmoothTime = 0.125;

	/**
	 * Max transition speed in unit-per-seconds
	 * @category Properties
	 */
	maxSpeed = Infinity;

	/**
	 * Speed of azimuth (horizontal) rotation.
	 * @category Properties
	 */
	azimuthRotateSpeed = 1.0;
	/**
	 * Speed of polar (vertical) rotation.
	 * @category Properties
	 */
	polarRotateSpeed = 1.0;
	/**
	 * Speed of mouse-wheel dollying.
	 * @category Properties
	 */
	dollySpeed = 1.0;
	/**
	 * Speed of drag for truck and pedestal.
	 * @category Properties
	 */
	truckSpeed = 2.0;
	/**
	 * `true` to enable Dolly-in to the mouse cursor coords.
	 * @category Properties
	 */
	dollyToCursor = false;
	/**
	 * @category Properties
	 */
	dragToOffset = false;
	/**
	 * The same as `.screenSpacePanning` in three.js's OrbitControls.
	 * @category Properties
	 */
	verticalDragToForward = false;

	/**
	 * Friction ratio of the boundary.
	 * @category Properties
	 */
	boundaryFriction = 0.0;

	/**
	 * Controls how soon the `rest` event fires as the camera slows.
	 * @category Properties
	 */
	restThreshold = 0.01;

	/**
	 * An array of Meshes to collide with camera.  
	 * Be aware colliderMeshes may decrease performance. The collision test uses 4 raycasters from the camera since the near plane has 4 corners.
	 * @category Properties
	 */
	colliderMeshes: _THREE.Object3D[] = [];

	// button configs
	/**
	 * User's mouse input config.
	 *
	 * | button to assign      | behavior |
	 * | --------------------- | -------- |
	 * | `mouseButtons.left`   | `CameraControls.ACTION.ROTATE`* \| `CameraControls.ACTION.TRUCK` \| `CameraControls.ACTION.OFFSET` \| `CameraControls.ACTION.DOLLY` \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |
	 * | `mouseButtons.right`  | `CameraControls.ACTION.ROTATE` \| `CameraControls.ACTION.TRUCK`* \| `CameraControls.ACTION.OFFSET` \| `CameraControls.ACTION.DOLLY` \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |
	 * | `mouseButtons.wheel` ¹ | `CameraControls.ACTION.ROTATE` \| `CameraControls.ACTION.TRUCK` \| `CameraControls.ACTION.OFFSET` \| `CameraControls.ACTION.DOLLY` \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |
	 * | `mouseButtons.middle` ² | `CameraControls.ACTION.ROTATE` \| `CameraControls.ACTION.TRUCK` \| `CameraControls.ACTION.OFFSET` \| `CameraControls.ACTION.DOLLY`* \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |
	 *
	 * 1. Mouse wheel event for scroll "up/down" on mac "up/down/left/right"
	 * 2. Mouse click on wheel event "button"
	 * - \* is the default.
	 * - The default of `mouseButtons.wheel` is:
	 *   - `DOLLY` for Perspective camera.
	 *   - `ZOOM` for Orthographic camera, and can't set `DOLLY`.
	 * @category Properties
	 */
	mouseButtons: MouseButtons;
	/**
	 * User's touch input config.
	 *
	 * | fingers to assign     | behavior |
	 * | --------------------- | -------- |
	 * | `touches.one` | `CameraControls.ACTION.TOUCH_ROTATE`* \| `CameraControls.ACTION.TOUCH_TRUCK` \| `CameraControls.ACTION.TOUCH_OFFSET` \| `CameraControls.ACTION.DOLLY` | `CameraControls.ACTION.ZOOM` | `CameraControls.ACTION.NONE` |
	 * | `touches.two` | `ACTION.TOUCH_DOLLY_TRUCK` \| `ACTION.TOUCH_DOLLY_OFFSET` \| `ACTION.TOUCH_DOLLY_ROTATE` \| `ACTION.TOUCH_ZOOM_TRUCK` \| `ACTION.TOUCH_ZOOM_OFFSET` \| `ACTION.TOUCH_ZOOM_ROTATE` \| `ACTION.TOUCH_DOLLY` \| `ACTION.TOUCH_ZOOM` \| `CameraControls.ACTION.TOUCH_ROTATE` \| `CameraControls.ACTION.TOUCH_TRUCK` \| `CameraControls.ACTION.TOUCH_OFFSET` \| `CameraControls.ACTION.NONE` |
	 * | `touches.three` | `ACTION.TOUCH_DOLLY_TRUCK` \| `ACTION.TOUCH_DOLLY_OFFSET` \| `ACTION.TOUCH_DOLLY_ROTATE` \| `ACTION.TOUCH_ZOOM_TRUCK` \| `ACTION.TOUCH_ZOOM_OFFSET` \| `ACTION.TOUCH_ZOOM_ROTATE` \| `CameraControls.ACTION.TOUCH_ROTATE` \| `CameraControls.ACTION.TOUCH_TRUCK` \| `CameraControls.ACTION.TOUCH_OFFSET` \| `CameraControls.ACTION.NONE` |
	 *
	 * - \* is the default.
	 * - The default of `touches.two` and `touches.three` is:
	 *   - `TOUCH_DOLLY_TRUCK` for Perspective camera.
	 *   - `TOUCH_ZOOM_TRUCK` for Orthographic camera, and can't set `TOUCH_DOLLY_TRUCK` and `TOUCH_DOLLY`.
	 * @category Properties
	 */
	touches: Touches;

	/**
	 * Force cancel user dragging.
	 * @category Methods
	 */
	// cancel will be overwritten in the constructor.
	cancel: () => void = () => {};

	protected _enabled = true;
	protected _camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera;
	protected _yAxisUpSpace: _THREE.Quaternion;
	protected _yAxisUpSpaceInverse: _THREE.Quaternion;
	protected _state: ACTION = ACTION.NONE;

	protected _domElement?: HTMLElement;
	protected _viewport: _THREE.Vector4 | null = null;

	// the location of focus, where the object orbits around
	protected _target: _THREE.Vector3;
	protected _targetEnd: _THREE.Vector3;

	protected _focalOffset: _THREE.Vector3;
	protected _focalOffsetEnd: _THREE.Vector3;
	protected _affectOffset = false;

	// rotation and dolly distance
	protected _spherical: _THREE.Spherical;
	protected _sphericalEnd: _THREE.Spherical;

	protected _zoom: number;
	protected _zoomEnd: number;

	// reset
	protected _target0: _THREE.Vector3;
	protected _position0: _THREE.Vector3;
	protected _zoom0: number;
	protected _focalOffset0: _THREE.Vector3;

	protected _dollyControlAmount = 0;
	protected _dollyControlCoord: _THREE.Vector2;

	// collisionTest uses nearPlane. ( PerspectiveCamera only )
	protected _nearPlaneCorners: [ _THREE.Vector3, _THREE.Vector3, _THREE.Vector3, _THREE.Vector3 ];

	protected _hasRested = true;

	protected _boundary: _THREE.Box3;
	protected _boundaryEnclosesCamera = false;

	protected _isLastDragging: boolean = false;
	protected _needsUpdate = true;
	protected _updatedLastTime = false;
	protected _elementRect = new DOMRect();

	protected _activePointers: PointerInput[] = [];

	// velocities for smoothDamp
	protected _thetaVelocity: Ref = { value: 0 };
	protected _phiVelocity: Ref = { value: 0 };
	protected _radiusVelocity: Ref = { value: 0 };
	protected _targetVelocity: _THREE.Vector3 = new THREE.Vector3();
	protected _focalOffsetVelocity: _THREE.Vector3 = new THREE.Vector3();
	protected _zoomVelocity: Ref = { value: 0 };

	/**
	 * Creates a `CameraControls` instance.
	 *
	 * Note:
	 * You **must install** three.js before using camera-controls. see [#install](#install)
	 * Not doing so will lead to runtime errors (`undefined` references to THREE).
	 *
	 * e.g.
	 * ```
	 * CameraControls.install( { THREE } );
	 * const cameraControls = new CameraControls( camera, domElement );
	 * ```
	 *
	 * @param camera A `THREE.PerspectiveCamera` or `THREE.OrthographicCamera` to be controlled.
	 * @param domElement A `HTMLElement` for the draggable area, usually `renderer.domElement`.
	 * @category Constructor
	 */
	constructor(
		camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera,
		domElement?: HTMLElement,
	) {

		super();

		// Check if the user has installed THREE
		if ( typeof THREE === 'undefined' ) {

			console.error( 'camera-controls: `THREE` is undefined. You must first run `CameraControls.install( { THREE: THREE } )`. Check the docs for further information.' );

		}

		this._camera = camera;
		this._yAxisUpSpace = new THREE.Quaternion().setFromUnitVectors( this._camera.up, _AXIS_Y );
		this._yAxisUpSpaceInverse = this._yAxisUpSpace.clone().invert();
		this._state = ACTION.NONE;

		// the location
		this._target = new THREE.Vector3();
		this._targetEnd = this._target.clone();

		this._focalOffset = new THREE.Vector3();
		this._focalOffsetEnd = this._focalOffset.clone();

		// rotation
		this._spherical = new THREE.Spherical().setFromVector3( _v3A.copy( this._camera.position ).applyQuaternion( this._yAxisUpSpace ) );
		this._sphericalEnd = this._spherical.clone();

		this._zoom = this._camera.zoom;
		this._zoomEnd = this._zoom;

		// collisionTest uses nearPlane.s
		this._nearPlaneCorners = [
			new THREE.Vector3(),
			new THREE.Vector3(),
			new THREE.Vector3(),
			new THREE.Vector3(),
		];
		this._updateNearPlaneCorners();

		// Target cannot move outside of this box
		this._boundary = new THREE.Box3(
			new THREE.Vector3( - Infinity, - Infinity, - Infinity ),
			new THREE.Vector3(   Infinity,   Infinity,   Infinity ),
		);

		// reset
		this._target0 = this._target.clone();
		this._position0 = this._camera.position.clone();
		this._zoom0 = this._zoom;
		this._focalOffset0 = this._focalOffset.clone();

		this._dollyControlAmount = 0;
		this._dollyControlCoord = new THREE.Vector2();

		// configs
		this.mouseButtons = {
			left: ACTION.ROTATE,
			middle: ACTION.DOLLY,
			right: ACTION.TRUCK,
			wheel:
				isPerspectiveCamera( this._camera )  ? ACTION.DOLLY :
				isOrthographicCamera( this._camera ) ? ACTION.ZOOM :
				ACTION.NONE,
		};

		this.touches = {
			one: ACTION.TOUCH_ROTATE,
			two:
				isPerspectiveCamera( this._camera )  ? ACTION.TOUCH_DOLLY_TRUCK :
				isOrthographicCamera( this._camera ) ? ACTION.TOUCH_ZOOM_TRUCK :
				ACTION.NONE,
			three: ACTION.TOUCH_TRUCK,
		};

		const dragStartPosition = new THREE.Vector2() as _THREE.Vector2;
		const lastDragPosition = new THREE.Vector2() as _THREE.Vector2;
		const dollyStart = new THREE.Vector2() as _THREE.Vector2;

		const onPointerDown = ( event: PointerEvent ) => {

			if ( ! this._enabled || ! this._domElement ) return;

			// Don't call `event.preventDefault()` on the pointerdown event
			// to keep receiving pointermove evens outside dragging iframe
			// https://taye.me/blog/tips/2015/11/16/mouse-drag-outside-iframe/

			const pointer = {
				pointerId: event.pointerId,
				clientX: event.clientX,
				clientY: event.clientY,
				deltaX: 0,
				deltaY: 0,
			};
			this._activePointers.push( pointer );

			// eslint-disable-next-line no-undef
			this._domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove, { passive: false } as AddEventListenerOptions );
			this._domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );

			this._domElement.ownerDocument.addEventListener( 'pointermove', onPointerMove, { passive: false } );
			this._domElement.ownerDocument.addEventListener( 'pointerup', onPointerUp );

			startDragging( event );

		};

		const onMouseDown = ( event: MouseEvent ) => {

			if ( ! this._enabled || ! this._domElement ) return;

			const pointer = {
				pointerId: 0,
				clientX: event.clientX,
				clientY: event.clientY,
				deltaX: 0,
				deltaY: 0,
			};
			this._activePointers.push( pointer );

			// see https://github.com/microsoft/TypeScript/issues/32912#issuecomment-522142969
			// eslint-disable-next-line no-undef
			this._domElement.ownerDocument.removeEventListener( 'mousemove', onMouseMove );
			this._domElement.ownerDocument.removeEventListener( 'mouseup', onMouseUp );

			this._domElement.ownerDocument.addEventListener( 'mousemove', onMouseMove );
			this._domElement.ownerDocument.addEventListener( 'mouseup', onMouseUp );

			startDragging( event );

		};

		const onTouchStart = ( event:TouchEvent ): void => {

			if ( ! this._enabled || ! this._domElement ) return;

			event.preventDefault();

			Array.prototype.forEach.call( event.changedTouches, ( touch ) => {

				const pointer = {
					pointerId: touch.identifier,
					clientX: touch.clientX,
					clientY: touch.clientY,
					deltaX: 0,
					deltaY: 0,
				};
				this._activePointers.push( pointer );

			} );

			// eslint-disable-next-line no-undef
			this._domElement.ownerDocument.removeEventListener( 'touchmove', onTouchMove, { passive: false } as AddEventListenerOptions );
			this._domElement.ownerDocument.removeEventListener( 'touchend', onTouchEnd );

			this._domElement.ownerDocument.addEventListener( 'touchmove', onTouchMove, { passive: false } );
			this._domElement.ownerDocument.addEventListener( 'touchend', onTouchEnd );

			startDragging( event );

		};

		const onPointerMove = ( event: PointerEvent ) => {

			if ( event.cancelable ) event.preventDefault();

			const pointerId = event.pointerId;
			const pointer = this._findPointerById( pointerId );

			if ( ! pointer ) return;

			pointer.clientX = event.clientX;
			pointer.clientY = event.clientY;
			pointer.deltaX = event.movementX;
			pointer.deltaY = event.movementY;

			if ( event.pointerType === 'touch' ) {

				switch ( this._activePointers.length ) {

					case 1:

						this._state = this.touches.one;
						break;

					case 2:

						this._state = this.touches.two;
						break;

					case 3:

						this._state = this.touches.three;
						break;

				}

			} else {

				this._state = 0;

				if ( ( event.buttons & MOUSE_BUTTON.LEFT ) === MOUSE_BUTTON.LEFT ) {

					this._state = this._state | this.mouseButtons.left;

				}

				if ( ( event.buttons & MOUSE_BUTTON.MIDDLE ) === MOUSE_BUTTON.MIDDLE ) {

					this._state = this._state | this.mouseButtons.middle;

				}

				if ( ( event.buttons & MOUSE_BUTTON.RIGHT ) === MOUSE_BUTTON.RIGHT ) {

					this._state = this._state | this.mouseButtons.right;

				}

			}

			dragging();

		};

		const onMouseMove = ( event: MouseEvent ) => {

			const pointer = this._findPointerById( 0 );

			if ( ! pointer ) return;

			pointer.clientX = event.clientX;
			pointer.clientY = event.clientY;
			pointer.deltaX = event.movementX;
			pointer.deltaY = event.movementY;

			this._state = 0;

			if ( ( event.buttons & MOUSE_BUTTON.LEFT ) === MOUSE_BUTTON.LEFT ) {

				this._state = this._state | this.mouseButtons.left;

			}

			if ( ( event.buttons & MOUSE_BUTTON.MIDDLE ) === MOUSE_BUTTON.MIDDLE ) {

				this._state = this._state | this.mouseButtons.middle;

			}

			if ( ( event.buttons & MOUSE_BUTTON.RIGHT ) === MOUSE_BUTTON.RIGHT ) {

				this._state = this._state | this.mouseButtons.right;

			}

			dragging();

		};

		const onTouchMove = ( event: TouchEvent ) => {

			if ( event.cancelable ) event.preventDefault();

			Array.prototype.forEach.call( event.changedTouches, ( touch: Touch ) => {

				const pointerId = touch.identifier;
				const pointer = this._findPointerById( pointerId );

				if ( ! pointer ) return;

				pointer.clientX = touch.clientX;
				pointer.clientY = touch.clientY;
				// touch event does not have movementX and movementY.

			} );

			dragging();

		};

		const onPointerUp = ( event: PointerEvent ) => {

			const pointerId = event.pointerId;
			const pointer = this._findPointerById( pointerId );
			pointer && this._activePointers.splice( this._activePointers.indexOf( pointer ), 1 );

			if ( event.pointerType === 'touch' ) {

				switch ( this._activePointers.length ) {

					case 0:

						this._state = ACTION.NONE;
						break;

					case 1:

						this._state = this.touches.one;
						break;

					case 2:

						this._state = this.touches.two;
						break;

					case 3:

						this._state = this.touches.three;
						break;

				}

			} else {

				this._state = ACTION.NONE;

			}

			endDragging();

		};

		const onMouseUp = () => {

			const pointer = this._findPointerById( 0 );
			pointer && this._activePointers.splice( this._activePointers.indexOf( pointer ), 1 );
			this._state = ACTION.NONE;

			endDragging();

		};

		const onTouchEnd = ( event: TouchEvent ) => {

			Array.prototype.forEach.call( event.changedTouches, ( touch: Touch ) => {

				const pointerId = touch.identifier;
				const pointer = this._findPointerById( pointerId );
				pointer && this._activePointers.splice( this._activePointers.indexOf( pointer ), 1 );

			} );

			switch ( this._activePointers.length ) {

				case 0:

					this._state = ACTION.NONE;
					break;

				case 1:

					this._state = this.touches.one;
					break;

				case 2:

					this._state = this.touches.two;
					break;

				case 3:

					this._state = this.touches.three;
					break;

			}

			endDragging();

		};

		let lastScrollTimeStamp = - 1;

		const onMouseWheel = ( event: WheelEvent ): void => {

			if ( ! this._enabled || this.mouseButtons.wheel === ACTION.NONE ) return;

			event.preventDefault();

			if (
				this.dollyToCursor ||
				this.mouseButtons.wheel === ACTION.ROTATE ||
				this.mouseButtons.wheel === ACTION.TRUCK
			) {

				const now = performance.now();

				// only need to fire this at scroll start.
				if ( lastScrollTimeStamp - now < 1000 ) this._getClientRect( this._elementRect );
				lastScrollTimeStamp = now;

			}

			// Ref: https://github.com/cedricpinson/osgjs/blob/00e5a7e9d9206c06fdde0436e1d62ab7cb5ce853/sources/osgViewer/input/source/InputSourceMouse.js#L89-L103
			const deltaYFactor = isMac ? - 1 : - 3;
			const delta = ( event.deltaMode === 1 ) ? event.deltaY / deltaYFactor : event.deltaY / ( deltaYFactor * 10 );
			const x = this.dollyToCursor ? ( event.clientX - this._elementRect.x ) / this._elementRect.width  *   2 - 1 : 0;
			const y = this.dollyToCursor ? ( event.clientY - this._elementRect.y ) / this._elementRect.height * - 2 + 1 : 0;

			switch ( this.mouseButtons.wheel ) {

				case ACTION.ROTATE: {

					this._rotateInternal( event.deltaX, event.deltaY );
					break;

				}

				case ACTION.TRUCK: {

					this._truckInternal( event.deltaX, event.deltaY, false );
					break;

				}

				case ACTION.OFFSET: {

					this._truckInternal( event.deltaX, event.deltaY, true );
					break;

				}

				case ACTION.DOLLY: {

					this._dollyInternal( - delta, x, y );
					break;

				}

				case ACTION.ZOOM: {

					this._zoomInternal( - delta, x, y );
					break;

				}

			}

			this.dispatchEvent( { type: 'control' } );

		};

		const onContextMenu = ( event: Event ): void => {

			if ( ! this._enabled ) return;

			event.preventDefault();

		};

		const startDragging = ( event: PointerEvent | MouseEvent | TouchEvent ): void => {

			if ( ! this._enabled ) return;

			extractClientCoordFromEvent( this._activePointers, _v2 );

			this._getClientRect( this._elementRect );
			dragStartPosition.copy( _v2 );
			lastDragPosition.copy( _v2 );

			const isMultiTouch = this._activePointers.length >= 2;

			if ( isMultiTouch ) {

				// 2 finger pinch
				const dx = _v2.x - this._activePointers[ 1 ].clientX;
				const dy = _v2.y - this._activePointers[ 1 ].clientY;
				const distance = Math.sqrt( dx * dx + dy * dy );

				dollyStart.set( 0, distance );

				// center coords of 2 finger truck
				const x = ( this._activePointers[ 0 ].clientX + this._activePointers[ 1 ].clientX ) * 0.5;
				const y = ( this._activePointers[ 0 ].clientY + this._activePointers[ 1 ].clientY ) * 0.5;

				lastDragPosition.set( x, y );

			}

			if (
				'touches' in event ||
				'pointerType' in event && event.pointerType === 'touch'
			) {

				switch ( this._activePointers.length ) {

					case 1:

						this._state = this.touches.one;
						break;

					case 2:

						this._state = this.touches.two;
						break;

					case 3:

						this._state = this.touches.three;
						break;

				}

			} else {

				this._state = 0;

				if ( ( event.buttons & MOUSE_BUTTON.LEFT ) === MOUSE_BUTTON.LEFT ) {

					this._state = this._state | this.mouseButtons.left;

				}

				if ( ( event.buttons & MOUSE_BUTTON.MIDDLE ) === MOUSE_BUTTON.MIDDLE ) {

					this._state = this._state | this.mouseButtons.middle;

				}

				if ( ( event.buttons & MOUSE_BUTTON.RIGHT ) === MOUSE_BUTTON.RIGHT ) {

					this._state = this._state | this.mouseButtons.right;

				}

			}

			this.dispatchEvent( { type: 'controlstart' } );

		};

		const dragging = (): void => {

			if ( ! this._enabled ) return;

			extractClientCoordFromEvent( this._activePointers, _v2 );

			// When pointer lock is enabled clientX, clientY, screenX, and screenY remain 0.
			// If pointer lock is enabled, use the Delta directory, and assume active-pointer is not multiple.
			const isPointerLockActive = this._domElement && document.pointerLockElement === this._domElement;
			const deltaX = isPointerLockActive ? - this._activePointers[ 0 ].deltaX : lastDragPosition.x - _v2.x;
			const deltaY = isPointerLockActive ? - this._activePointers[ 0 ].deltaY : lastDragPosition.y - _v2.y;

			lastDragPosition.copy( _v2 );

			if (
				( this._state & ACTION.ROTATE ) === ACTION.ROTATE ||
				( this._state & ACTION.TOUCH_ROTATE ) === ACTION.TOUCH_ROTATE ||
				( this._state & ACTION.TOUCH_DOLLY_ROTATE ) === ACTION.TOUCH_DOLLY_ROTATE ||
				( this._state & ACTION.TOUCH_ZOOM_ROTATE ) === ACTION.TOUCH_ZOOM_ROTATE
			) {

				this._rotateInternal( deltaX, deltaY );

			}

			if (
				( this._state & ACTION.DOLLY ) === ACTION.DOLLY ||
				( this._state & ACTION.ZOOM ) === ACTION.ZOOM
			) {

				const dollyX = this.dollyToCursor ? ( dragStartPosition.x - this._elementRect.x ) / this._elementRect.width  *   2 - 1 : 0;
				const dollyY = this.dollyToCursor ? ( dragStartPosition.y - this._elementRect.y ) / this._elementRect.height * - 2 + 1 : 0;
				( this._state & ACTION.DOLLY ) === ACTION.DOLLY ?
					this._dollyInternal( deltaY * TOUCH_DOLLY_FACTOR, dollyX, dollyY ) :
					this._zoomInternal( deltaY * TOUCH_DOLLY_FACTOR, dollyX, dollyY );

			}

			if (
				( this._state & ACTION.TOUCH_DOLLY ) === ACTION.TOUCH_DOLLY ||
				( this._state & ACTION.TOUCH_ZOOM ) === ACTION.TOUCH_ZOOM ||
				( this._state & ACTION.TOUCH_DOLLY_TRUCK ) === ACTION.TOUCH_DOLLY_TRUCK ||
				( this._state & ACTION.TOUCH_ZOOM_TRUCK ) === ACTION.TOUCH_ZOOM_TRUCK ||
				( this._state & ACTION.TOUCH_DOLLY_OFFSET ) === ACTION.TOUCH_DOLLY_OFFSET ||
				( this._state & ACTION.TOUCH_ZOOM_OFFSET ) === ACTION.TOUCH_ZOOM_OFFSET ||
				( this._state & ACTION.TOUCH_DOLLY_ROTATE ) === ACTION.TOUCH_DOLLY_ROTATE ||
				( this._state & ACTION.TOUCH_ZOOM_ROTATE ) === ACTION.TOUCH_ZOOM_ROTATE
			) {

				const dx = _v2.x - this._activePointers[ 1 ].clientX;
				const dy = _v2.y - this._activePointers[ 1 ].clientY;
				const distance = Math.sqrt( dx * dx + dy * dy );
				const dollyDelta = dollyStart.y - distance;
				dollyStart.set( 0, distance );

				const dollyX = this.dollyToCursor ? ( lastDragPosition.x - this._elementRect.x ) / this._elementRect.width  *   2 - 1 : 0;
				const dollyY = this.dollyToCursor ? ( lastDragPosition.y - this._elementRect.y ) / this._elementRect.height * - 2 + 1 : 0;

				( this._state & ACTION.TOUCH_DOLLY ) === ACTION.TOUCH_DOLLY ||
				( this._state & ACTION.TOUCH_DOLLY_ROTATE ) === ACTION.TOUCH_DOLLY_ROTATE ||
				( this._state & ACTION.TOUCH_DOLLY_TRUCK ) === ACTION.TOUCH_DOLLY_TRUCK ||
				( this._state & ACTION.TOUCH_DOLLY_OFFSET ) === ACTION.TOUCH_DOLLY_OFFSET ?
					this._dollyInternal( dollyDelta * TOUCH_DOLLY_FACTOR, dollyX, dollyY ) :
					this._zoomInternal( dollyDelta * TOUCH_DOLLY_FACTOR, dollyX, dollyY );

			}

			if (
				( this._state & ACTION.TRUCK ) === ACTION.TRUCK ||
				( this._state & ACTION.TOUCH_TRUCK ) === ACTION.TOUCH_TRUCK ||
				( this._state & ACTION.TOUCH_DOLLY_TRUCK ) === ACTION.TOUCH_DOLLY_TRUCK ||
				( this._state & ACTION.TOUCH_ZOOM_TRUCK ) === ACTION.TOUCH_ZOOM_TRUCK
			) {

				this._truckInternal( deltaX, deltaY, false );

			}

			if (
				( this._state & ACTION.OFFSET ) === ACTION.OFFSET ||
				( this._state & ACTION.TOUCH_OFFSET ) === ACTION.TOUCH_OFFSET ||
				( this._state & ACTION.TOUCH_DOLLY_OFFSET ) === ACTION.TOUCH_DOLLY_OFFSET ||
				( this._state & ACTION.TOUCH_ZOOM_OFFSET ) === ACTION.TOUCH_ZOOM_OFFSET
			) {

				this._truckInternal( deltaX, deltaY, true );

			}

			this.dispatchEvent( { type: 'control' } );

		};

		const endDragging = (): void => {

			extractClientCoordFromEvent( this._activePointers, _v2 );
			lastDragPosition.copy( _v2 );

			if ( this._activePointers.length === 0 && this._domElement ) {

				// eslint-disable-next-line no-undef
				this._domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove, { passive: false } as AddEventListenerOptions );
				this._domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );

				// eslint-disable-next-line no-undef
				this._domElement.ownerDocument.removeEventListener( 'touchmove', onTouchMove, { passive: false } as AddEventListenerOptions );
				this._domElement.ownerDocument.removeEventListener( 'touchend', onTouchEnd );

				this.dispatchEvent( { type: 'controlend' } );

			}

		};

		this._addAllEventListeners = ( domElement: HTMLElement ): void => {

			this._domElement = domElement;

			this._domElement.style.touchAction = 'none';
			this._domElement.style.userSelect = 'none';
			this._domElement.style.webkitUserSelect = 'none';

			this._domElement.addEventListener( 'pointerdown', onPointerDown );
			isPointerEventsNotSupported && this._domElement.addEventListener( 'mousedown', onMouseDown );
			isPointerEventsNotSupported && this._domElement.addEventListener( 'touchstart', onTouchStart );
			this._domElement.addEventListener( 'pointercancel', onPointerUp );
			this._domElement.addEventListener( 'wheel', onMouseWheel, { passive: false } );
			this._domElement.addEventListener( 'contextmenu', onContextMenu );

		};

		this._removeAllEventListeners = (): void => {

			if ( ! this._domElement ) return;

			this._domElement.removeEventListener( 'pointerdown', onPointerDown );
			this._domElement.removeEventListener( 'mousedown', onMouseDown );
			this._domElement.removeEventListener( 'touchstart', onTouchStart );
			this._domElement.removeEventListener( 'pointercancel', onPointerUp );
			// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#matching_event_listeners_for_removal
			// > it's probably wise to use the same values used for the call to `addEventListener()` when calling `removeEventListener()`
			// see https://github.com/microsoft/TypeScript/issues/32912#issuecomment-522142969
			// eslint-disable-next-line no-undef
			this._domElement.removeEventListener( 'wheel', onMouseWheel, { passive: false } as AddEventListenerOptions );
			this._domElement.removeEventListener( 'contextmenu', onContextMenu );
			// eslint-disable-next-line no-undef
			this._domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove, { passive: false } as AddEventListenerOptions );
			this._domElement.ownerDocument.removeEventListener( 'mousemove', onMouseMove );
			// eslint-disable-next-line no-undef
			this._domElement.ownerDocument.removeEventListener( 'touchmove', onTouchMove, { passive: false } as AddEventListenerOptions );
			this._domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );
			this._domElement.ownerDocument.removeEventListener( 'mouseup', onMouseUp );
			this._domElement.ownerDocument.removeEventListener( 'touchend', onTouchEnd );

		};

		this.cancel = (): void => {

			if ( this._state === ACTION.NONE ) return;

			this._state = ACTION.NONE;
			this._activePointers.length = 0;
			endDragging();

		};

		if ( domElement ) this.connect( domElement );
		this.update( 0 );

	}

	/**
	 * The camera to be controlled
	 * @category Properties
	 */
	get camera(): _THREE.PerspectiveCamera | _THREE.OrthographicCamera {

		return this._camera;

	}

	set camera( camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera ) {

		this._camera = camera;
		this.updateCameraUp();
		this._camera.updateProjectionMatrix();
		this._updateNearPlaneCorners();
		this._needsUpdate = true;

	}

	/**
	 * Whether or not the controls are enabled.  
	 * `false` to disable user dragging/touch-move, but all methods works.
	 * @category Properties
	 */
	get enabled(): boolean {

		return this._enabled;

	}

	set enabled( enabled: boolean ) {

		if ( ! this._domElement ) return;

		this._enabled = enabled;
		if ( enabled ) {

			this._domElement.style.touchAction = 'none';
			this._domElement.style.userSelect = 'none';
			this._domElement.style.webkitUserSelect = 'none';

		} else {

			this.cancel();
			this._domElement.style.touchAction = '';
			this._domElement.style.userSelect = '';
			this._domElement.style.webkitUserSelect = '';

		}

	}

	/**
	 * Returns `true` if the controls are active updating.  
	 * readonly value.
	 * @category Properties
	 */
	get active(): boolean {

		return ! this._hasRested;

	}

	/**
	 * Getter for the current `ACTION`.  
	 * readonly value.
	 * @category Properties
	 */
	get currentAction(): ACTION {

		return this._state;

	}

	/**
	 * get/set Current distance.
	 * @category Properties
	 */
	get distance(): number {

		return this._spherical.radius;

	}

	set distance( distance: number ) {

		if (
			this._spherical.radius === distance &&
			this._sphericalEnd.radius === distance
		) return;

		this._spherical.radius = distance;
		this._sphericalEnd.radius = distance;
		this._needsUpdate = true;

	}

	// horizontal angle
	/**
	 * get/set the azimuth angle (horizontal) in radians.  
	 * Every 360 degrees turn is added to `.azimuthAngle` value, which is accumulative.
	 * @category Properties
	 */
	get azimuthAngle(): number {

		return this._spherical.theta;

	}

	set azimuthAngle( azimuthAngle: number ) {

		if (
			this._spherical.theta === azimuthAngle &&
			this._sphericalEnd.theta === azimuthAngle
		) return;

		this._spherical.theta = azimuthAngle;
		this._sphericalEnd.theta = azimuthAngle;
		this._needsUpdate = true;

	}

	// vertical angle
	/**
	 * get/set the polar angle (vertical) in radians.
	 * @category Properties
	 */
	get polarAngle(): number {

		return this._spherical.phi;

	}

	set polarAngle( polarAngle: number ) {

		if (
			this._spherical.phi === polarAngle &&
			this._sphericalEnd.phi === polarAngle
		) return;

		this._spherical.phi = polarAngle;
		this._sphericalEnd.phi = polarAngle;
		this._needsUpdate = true;

	}

	/**
	 * Whether camera position should be enclosed in the boundary or not.
	 * @category Properties
	 */
	get boundaryEnclosesCamera(): boolean {

		return this._boundaryEnclosesCamera;

	}

	set boundaryEnclosesCamera( boundaryEnclosesCamera: boolean ) {

		this._boundaryEnclosesCamera = boundaryEnclosesCamera;
		this._needsUpdate = true;

	}

	/**
	 * Adds the specified event listener.
	 * Applicable event types (which is `K`) are:
	 * | Event name          | Timing |
	 * | ------------------- | ------ |
	 * | `'controlstart'`    | When the user starts to control the camera via mouse / touches. ¹ |
	 * | `'control'`         | When the user controls the camera (dragging). |
	 * | `'controlend'`      | When the user ends to control the camera. ¹ |
	 * | `'transitionstart'` | When any kind of transition starts, either user control or using a method with `enableTransition = true` |
	 * | `'update'`          | When the camera position is updated. |
	 * | `'wake'`            | When the camera starts moving. |
	 * | `'rest'`            | When the camera movement is below `.restThreshold` ². |
	 * | `'sleep'`           | When the camera end moving. |
	 *
	 * 1. `mouseButtons.wheel` (Mouse wheel control) does not emit `'controlstart'` and `'controlend'`. `mouseButtons.wheel` uses scroll-event internally, and scroll-event happens intermittently. That means "start" and "end" cannot be detected.
	 * 2. Due to damping, `sleep` will usually fire a few seconds after the camera _appears_ to have stopped moving. If you want to do something (e.g. enable UI, perform another transition) at the point when the camera has stopped, you probably want the `rest` event. This can be fine tuned using the `.restThreshold` parameter. See the [Rest and Sleep Example](https://yomotsu.github.io/camera-controls/examples/rest-and-sleep.html).
	 *
	 * e.g.
	 * ```
	 * cameraControl.addEventListener( 'controlstart', myCallbackFunction );
	 * ```
	 * @param type event name
	 * @param listener handler function
	 * @category Methods
	 */
	addEventListener<K extends keyof CameraControlsEventMap>(
		type: K,
		listener: ( event: CameraControlsEventMap[ K ] ) => any,
	): void {

		super.addEventListener( type, listener as Listener );

	}

	/**
	 * Removes the specified event listener
	 * e.g.
	 * ```
	 * cameraControl.addEventListener( 'controlstart', myCallbackFunction );
	 * ```
	 * @param type event name
	 * @param listener handler function
	 * @category Methods
	 */
	removeEventListener<K extends keyof CameraControlsEventMap>(
		type: K,
		listener: ( event: CameraControlsEventMap[ K ] ) => any,
	): void {

		super.removeEventListener( type, listener as Listener );

	}

	/**
	 * Rotate azimuthal angle(horizontal) and polar angle(vertical).
	 * Every value is added to the current value.
	 * @param azimuthAngle Azimuth rotate angle. In radian.
	 * @param polarAngle Polar rotate angle. In radian.
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	rotate( azimuthAngle: number, polarAngle: number, enableTransition: boolean = false ): Promise<void> {

		return this.rotateTo(
			this._sphericalEnd.theta + azimuthAngle,
			this._sphericalEnd.phi   + polarAngle,
			enableTransition,
		);

	}

	/**
	 * Rotate azimuthal angle(horizontal) to the given angle and keep the same polar angle(vertical) target.
	 *
	 * e.g.
	 * ```
	 * cameraControls.rotateAzimuthTo( 30 * THREE.MathUtils.DEG2RAD, true );
	 * ```
	 * @param azimuthAngle Azimuth rotate angle. In radian.
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	rotateAzimuthTo( azimuthAngle: number, enableTransition: boolean = false ): Promise<void> {

		return this.rotateTo(
			azimuthAngle,
			this._sphericalEnd.phi,
			enableTransition,
		);

	}

	/**
	 * Rotate polar angle(vertical) to the given angle and keep the same azimuthal angle(horizontal) target.
	 *
	 * e.g.
	 * ```
	 * cameraControls.rotatePolarTo( 30 * THREE.MathUtils.DEG2RAD, true );
	 * ```
	 * @param polarAngle Polar rotate angle. In radian.
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	rotatePolarTo( polarAngle: number, enableTransition: boolean = false ): Promise<void> {

		return this.rotateTo(
			this._sphericalEnd.theta,
			polarAngle,
			enableTransition,
		);

	}

	/**
	 * Rotate azimuthal angle(horizontal) and polar angle(vertical) to the given angle.  
	 * Camera view will rotate over the orbit pivot absolutely:
	 *
	 * azimuthAngle
	 * ```
	 *       0º
	 *         \
	 * 90º -----+----- -90º
	 *           \
	 *           180º
	 * ```
	 * | direction | angle                  |
	 * | --------- | ---------------------- |
	 * | front     | 0º                     |
	 * | left      | 90º (`Math.PI / 2`)    |
	 * | right     | -90º (`- Math.PI / 2`) |
	 * | back      | 180º (`Math.PI`)       |
	 *
	 * polarAngle
	 * ```
	 *     180º
	 *      |
	 *      90º
	 *      |
	 *      0º
	 * ```
	 * | direction            | angle                  |
	 * | -------------------- | ---------------------- |
	 * | top/sky              | 180º (`Math.PI`)       |
	 * | horizontal from view | 90º (`Math.PI / 2`)    |
	 * | bottom/floor         | 0º                     |
	 *
	 * @param azimuthAngle Azimuth rotate angle to. In radian.
	 * @param polarAngle Polar rotate angle to. In radian.
	 * @param enableTransition  Whether to move smoothly or immediately
	 * @category Methods
	 */
	rotateTo( azimuthAngle: number, polarAngle: number, enableTransition: boolean = false ): Promise<void> {

		const theta = clamp( azimuthAngle, this.minAzimuthAngle, this.maxAzimuthAngle );
		const phi   = clamp( polarAngle,   this.minPolarAngle,   this.maxPolarAngle );

		this._sphericalEnd.theta = theta;
		this._sphericalEnd.phi   = phi;
		this._sphericalEnd.makeSafe();

		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._spherical.theta = this._sphericalEnd.theta;
			this._spherical.phi   = this._sphericalEnd.phi;

		}

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._spherical.theta, this._sphericalEnd.theta, this.restThreshold ) &&
			approxEquals( this._spherical.phi, this._sphericalEnd.phi, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Dolly in/out camera position.
	 * @param distance Distance of dollyIn. Negative number for dollyOut.
	 * @param enableTransition Whether to move smoothly or immediately.
	 * @category Methods
	 */
	dolly( distance: number, enableTransition: boolean = false ): Promise<void> {

		return this.dollyTo( this._sphericalEnd.radius - distance, enableTransition );

	}

	/**
	 * Dolly in/out camera position to given distance.
	 * @param distance Distance of dolly.
	 * @param enableTransition Whether to move smoothly or immediately.
	 * @category Methods
	 */
	dollyTo( distance: number, enableTransition: boolean = false ): Promise<void> {

		const lastRadius = this._sphericalEnd.radius;
		const newRadius = clamp( distance, this.minDistance, this.maxDistance );
		const hasCollider = this.colliderMeshes.length >= 1;

		if ( hasCollider ) {

			const maxDistanceByCollisionTest = this._collisionTest();
			const isCollided = approxEquals( maxDistanceByCollisionTest, this._spherical.radius );
			const isDollyIn = lastRadius > newRadius;

			if ( ! isDollyIn && isCollided ) return Promise.resolve();

			this._sphericalEnd.radius = Math.min( newRadius, maxDistanceByCollisionTest );

		} else {

			this._sphericalEnd.radius = newRadius;

		}

		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._spherical.radius = this._sphericalEnd.radius;

		}

		const resolveImmediately =  ! enableTransition || approxEquals( this._spherical.radius, this._sphericalEnd.radius, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Zoom in/out camera. The value is added to camera zoom.
	 * Limits set with `.minZoom` and `.maxZoom`
	 * @param zoomStep zoom scale
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	zoom( zoomStep: number, enableTransition: boolean = false ): Promise<void> {

		return this.zoomTo( this._zoomEnd + zoomStep, enableTransition );

	}

	/**
	 * Zoom in/out camera to given scale. The value overwrites camera zoom.
	 * Limits set with .minZoom and .maxZoom
	 * @param zoom
	 * @param enableTransition
	 * @category Methods
	 */
	zoomTo( zoom: number, enableTransition: boolean = false ): Promise<void> {

		this._zoomEnd = clamp( zoom, this.minZoom, this.maxZoom );
		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._zoom = this._zoomEnd;

		}

		const resolveImmediately = ! enableTransition || approxEquals( this._zoom, this._zoomEnd, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * @deprecated `pan()` has been renamed to `truck()`
	 * @category Methods
	 */
	pan( x: number, y: number, enableTransition: boolean = false ): Promise<void> {

		console.warn( '`pan` has been renamed to `truck`' );
		return this.truck( x, y, enableTransition );

	}

	/**
	 * Truck and pedestal camera using current azimuthal angle
	 * @param x Horizontal translate amount
	 * @param y Vertical translate amount
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	truck( x: number, y: number, enableTransition: boolean = false ): Promise<void> {

		this._camera.updateMatrix();

		_xColumn.setFromMatrixColumn( this._camera.matrix, 0 );
		_yColumn.setFromMatrixColumn( this._camera.matrix, 1 );
		_xColumn.multiplyScalar(   x );
		_yColumn.multiplyScalar( - y );

		const offset = _v3A.copy( _xColumn ).add( _yColumn );
		const to = _v3B.copy( this._targetEnd ).add( offset );
		return this.moveTo( to.x, to.y, to.z, enableTransition );

	}

	/**
	 * Move forward / backward.
	 * @param distance Amount to move forward / backward. Negative value to move backward
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	forward( distance: number, enableTransition: boolean = false ): Promise<void> {

		_v3A.setFromMatrixColumn( this._camera.matrix, 0 );
		_v3A.crossVectors( this._camera.up, _v3A );
		_v3A.multiplyScalar( distance );

		const to = _v3B.copy( this._targetEnd ).add( _v3A );
		return this.moveTo( to.x, to.y, to.z, enableTransition );

	}

	/**
	 * Move target position to given point.
	 * @param x x coord to move center position
	 * @param y y coord to move center position
	 * @param z z coord to move center position
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	moveTo( x: number, y: number, z: number, enableTransition: boolean = false ): Promise<void> {

		const offset = _v3A.set( x, y, z ).sub( this._targetEnd );
		this._encloseToBoundary( this._targetEnd, offset, this.boundaryFriction );

		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._target.x, this._targetEnd.x, this.restThreshold ) &&
			approxEquals( this._target.y, this._targetEnd.y, this.restThreshold ) &&
			approxEquals( this._target.z, this._targetEnd.z, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Look in the given point direction.
	 * @param x point x.
	 * @param y point y.
	 * @param z point z.
	 * @param enableTransition Whether to move smoothly or immediately.
	 * @returns Transition end promise
	 * @category Methods
	 */
	lookInDirectionOf( x: number, y: number, z: number, enableTransition: boolean = false ): Promise<void> {

		const point = _v3A.set( x, y, z );
		const direction = point.sub( this._targetEnd ).normalize();
		const position = direction.multiplyScalar( - this._sphericalEnd.radius );
		return this.setPosition( position.x, position.y, position.z, enableTransition );

	}

	/**
	 * Fit the viewport to the box or the bounding box of the object, using the nearest axis. paddings are in unit.
	 * set `cover: true` to fill enter screen.
	 * e.g.
	 * ```
	 * cameraControls.fitToBox( myMesh );
	 * ```
	 * @param box3OrObject Axis aligned bounding box to fit the view.
	 * @param enableTransition Whether to move smoothly or immediately.
	 * @param options | `<object>` { cover: boolean, paddingTop: number, paddingLeft: number, paddingBottom: number, paddingRight: number }
	 * @returns Transition end promise
	 * @category Methods
	 */
	fitToBox( box3OrObject: _THREE.Box3 | _THREE.Object3D, enableTransition: boolean, {
		cover = false,
		paddingLeft = 0,
		paddingRight = 0,
		paddingBottom = 0,
		paddingTop = 0
	}: Partial<FitToOptions> = {} ): Promise<void[]> {

		const promises: Promise<void>[] = [];
		const aabb = ( box3OrObject as _THREE.Box3 ).isBox3
			? _box3A.copy( box3OrObject as _THREE.Box3 )
			: _box3A.setFromObject( box3OrObject as _THREE.Object3D );

		if ( aabb.isEmpty() )  {

			console.warn( 'camera-controls: fitTo() cannot be used with an empty box. Aborting' );
			Promise.resolve();

		}

		// round to closest axis ( forward | backward | right | left | top | bottom )
		const theta = roundToStep( this._sphericalEnd.theta, PI_HALF );
		const phi   = roundToStep( this._sphericalEnd.phi,   PI_HALF );

		promises.push( this.rotateTo( theta, phi, enableTransition ) );

		const normal = _v3A.setFromSpherical( this._sphericalEnd ).normalize();
		const rotation = _quaternionA.setFromUnitVectors( normal, _AXIS_Z );
		const viewFromPolar = approxEquals( Math.abs( normal.y ), 1 );
		if ( viewFromPolar ) {

			rotation.multiply( _quaternionB.setFromAxisAngle( _AXIS_Y, theta ) );

		}

		rotation.multiply( this._yAxisUpSpaceInverse );

		// make oriented bounding box
		const bb = _box3B.makeEmpty();

		// left bottom back corner
		_v3B.copy( aabb.min ).applyQuaternion( rotation );
		bb.expandByPoint( _v3B );

		// right bottom back corner
		_v3B.copy( aabb.min ).setX( aabb.max.x ).applyQuaternion( rotation );
		bb.expandByPoint( _v3B );

		// left top back corner
		_v3B.copy( aabb.min ).setY( aabb.max.y ).applyQuaternion( rotation );
		bb.expandByPoint( _v3B );

		// right top back corner
		_v3B.copy( aabb.max ).setZ( aabb.min.z ).applyQuaternion( rotation );
		bb.expandByPoint( _v3B );

		// left bottom front corner
		_v3B.copy( aabb.min ).setZ( aabb.max.z ).applyQuaternion( rotation );
		bb.expandByPoint( _v3B );

		// right bottom front corner
		_v3B.copy( aabb.max ).setY( aabb.min.y ).applyQuaternion( rotation );
		bb.expandByPoint( _v3B );

		// left top front corner
		_v3B.copy( aabb.max ).setX( aabb.min.x ).applyQuaternion( rotation );
		bb.expandByPoint( _v3B );

		// right top front corner
		_v3B.copy( aabb.max ).applyQuaternion( rotation );
		bb.expandByPoint( _v3B );

		// add padding
		bb.min.x -= paddingLeft;
		bb.min.y -= paddingBottom;
		bb.max.x += paddingRight;
		bb.max.y += paddingTop;

		rotation.setFromUnitVectors( _AXIS_Z, normal );

		if ( viewFromPolar ) {

			rotation.premultiply( _quaternionB.invert() );

		}

		rotation.premultiply( this._yAxisUpSpace );

		const bbSize = bb.getSize( _v3A );
		const center = bb.getCenter( _v3B ).applyQuaternion( rotation );

		if ( isPerspectiveCamera( this._camera ) ) {

			const distance = this.getDistanceToFitBox( bbSize.x, bbSize.y, bbSize.z, cover );
			promises.push( this.moveTo( center.x, center.y, center.z, enableTransition ) );
			promises.push( this.dollyTo( distance, enableTransition ) );
			promises.push( this.setFocalOffset( 0, 0, 0, enableTransition ) );

		} else if ( isOrthographicCamera( this._camera ) ) {

			const camera = this._camera;
			const width = camera.right - camera.left;
			const height = camera.top - camera.bottom;
			const zoom = cover ? Math.max( width / bbSize.x, height / bbSize.y ) : Math.min( width / bbSize.x, height / bbSize.y );
			promises.push( this.moveTo( center.x, center.y, center.z, enableTransition ) );
			promises.push( this.zoomTo( zoom, enableTransition ) );
			promises.push( this.setFocalOffset( 0, 0, 0, enableTransition ) );

		}

		return Promise.all( promises );

	}

	/**
	 * Fit the viewport to the sphere or the bounding sphere of the object.
	 * @param sphereOrMesh
	 * @param enableTransition
	 * @category Methods
	 */
	fitToSphere( sphereOrMesh: _THREE.Sphere | _THREE.Object3D, enableTransition: boolean ): Promise<void[]> {

		const promises: Promise<void>[] = [];
		const isSphere = sphereOrMesh instanceof THREE.Sphere;
		const boundingSphere = isSphere ?
			_sphere.copy( sphereOrMesh as _THREE.Sphere ) :
			createBoundingSphere( sphereOrMesh as _THREE.Object3D, _sphere );

		promises.push( this.moveTo(
			boundingSphere.center.x,
			boundingSphere.center.y,
			boundingSphere.center.z,
			enableTransition,
		) );

		if ( isPerspectiveCamera( this._camera ) ) {

			const distanceToFit = this.getDistanceToFitSphere( boundingSphere.radius );
			promises.push( this.dollyTo( distanceToFit, enableTransition ) );

		} else if ( isOrthographicCamera( this._camera ) ) {

			const width = this._camera.right - this._camera.left;
			const height = this._camera.top - this._camera.bottom;
			const diameter = 2 * boundingSphere.radius;
			const zoom = Math.min( width / diameter, height / diameter );
			promises.push( this.zoomTo( zoom, enableTransition ) );

		}

		promises.push( this.setFocalOffset( 0, 0, 0, enableTransition ) );

		return Promise.all( promises );

	}

	/**
	 * Look at the `target` from the `position`.
	 * @param positionX
	 * @param positionY
	 * @param positionZ
	 * @param targetX
	 * @param targetY
	 * @param targetZ
	 * @param enableTransition
	 * @category Methods
	 */
	setLookAt(
		positionX: number, positionY: number, positionZ: number,
		targetX: number, targetY: number, targetZ: number,
		enableTransition: boolean = false,
	): Promise<void> {

		const target = _v3B.set( targetX, targetY, targetZ );
		const position = _v3A.set( positionX, positionY, positionZ );

		this._targetEnd.copy( target );
		this._sphericalEnd.setFromVector3( position.sub( target ).applyQuaternion( this._yAxisUpSpace ) );
		this.normalizeRotations();

		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._target.x, this._targetEnd.x, this.restThreshold ) &&
			approxEquals( this._target.y, this._targetEnd.y, this.restThreshold ) &&
			approxEquals( this._target.z, this._targetEnd.z, this.restThreshold ) &&
			approxEquals( this._spherical.theta, this._sphericalEnd.theta, this.restThreshold ) &&
			approxEquals( this._spherical.phi, this._sphericalEnd.phi, this.restThreshold ) &&
			approxEquals( this._spherical.radius, this._sphericalEnd.radius, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Similar to setLookAt, but it interpolates between two states.
	 * @param positionAX
	 * @param positionAY
	 * @param positionAZ
	 * @param targetAX
	 * @param targetAY
	 * @param targetAZ
	 * @param positionBX
	 * @param positionBY
	 * @param positionBZ
	 * @param targetBX
	 * @param targetBY
	 * @param targetBZ
	 * @param t
	 * @param enableTransition
	 * @category Methods
	 */
	lerpLookAt(
		positionAX: number, positionAY: number, positionAZ: number,
		targetAX: number, targetAY: number, targetAZ: number,
		positionBX: number, positionBY: number, positionBZ: number,
		targetBX: number, targetBY: number, targetBZ: number,
		t: number,
		enableTransition: boolean = false,
	): Promise<void> {

		const targetA = _v3A.set( targetAX, targetAY, targetAZ );
		const positionA = _v3B.set( positionAX, positionAY, positionAZ );
		_sphericalA.setFromVector3( positionA.sub( targetA ).applyQuaternion( this._yAxisUpSpace ) );

		const targetB = _v3C.set( targetBX, targetBY, targetBZ );
		const positionB = _v3B.set( positionBX, positionBY, positionBZ );
		_sphericalB.setFromVector3( positionB.sub( targetB ).applyQuaternion( this._yAxisUpSpace ) );

		this._targetEnd.copy( targetA.lerp( targetB, t ) ); // tricky

		const deltaTheta  = _sphericalB.theta  - _sphericalA.theta;
		const deltaPhi    = _sphericalB.phi    - _sphericalA.phi;
		const deltaRadius = _sphericalB.radius - _sphericalA.radius;

		this._sphericalEnd.set(
			_sphericalA.radius + deltaRadius * t,
			_sphericalA.phi    + deltaPhi    * t,
			_sphericalA.theta  + deltaTheta  * t,
		);

		this.normalizeRotations();

		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._target.x, this._targetEnd.x, this.restThreshold ) &&
			approxEquals( this._target.y, this._targetEnd.y, this.restThreshold ) &&
			approxEquals( this._target.z, this._targetEnd.z, this.restThreshold ) &&
			approxEquals( this._spherical.theta, this._sphericalEnd.theta, this.restThreshold ) &&
			approxEquals( this._spherical.phi, this._sphericalEnd.phi, this.restThreshold ) &&
			approxEquals( this._spherical.radius, this._sphericalEnd.radius, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Set angle and distance by given position.
	 * An alias of `setLookAt()`, without target change. Thus keep gazing at the current target
	 * @param positionX
	 * @param positionY
	 * @param positionZ
	 * @param enableTransition
	 * @category Methods
	 */
	setPosition( positionX: number, positionY: number, positionZ: number, enableTransition: boolean = false ): Promise<void> {

		return this.setLookAt(
			positionX, positionY, positionZ,
			this._targetEnd.x, this._targetEnd.y, this._targetEnd.z,
			enableTransition,
		);

	}

	/**
	 * Set the target position where gaze at.
	 * An alias of `setLookAt()`, without position change. Thus keep the same position.
	 * @param targetX
	 * @param targetY
	 * @param targetZ
	 * @param enableTransition
	 * @category Methods
	 */
	setTarget( targetX: number, targetY: number, targetZ: number, enableTransition: boolean = false ): Promise<void> {

		const pos = this.getPosition( _v3A );

		const promise = this.setLookAt(
			pos.x, pos.y, pos.z,
			targetX, targetY, targetZ,
			enableTransition,
		);

		// see https://github.com/yomotsu/camera-controls/issues/335
		this._sphericalEnd.phi = clamp( this.polarAngle, this.minPolarAngle, this.maxPolarAngle );

		return promise;

	}

	/**
	 * Set focal offset using the screen parallel coordinates. z doesn't affect in Orthographic as with Dolly.
	 * @param x
	 * @param y
	 * @param z
	 * @param enableTransition
	 * @category Methods
	 */
	setFocalOffset( x: number, y: number, z: number, enableTransition: boolean = false ): Promise<void> {

		this._focalOffsetEnd.set( x, y, z );
		this._needsUpdate = true;

		if ( ! enableTransition ) this._focalOffset.copy( this._focalOffsetEnd );

		this._affectOffset =
			! approxZero( x ) ||
			! approxZero( y ) ||
			! approxZero( z );

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._focalOffset.x, this._focalOffsetEnd.x, this.restThreshold ) &&
			approxEquals( this._focalOffset.y, this._focalOffsetEnd.y, this.restThreshold ) &&
			approxEquals( this._focalOffset.z, this._focalOffsetEnd.z, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Set orbit point without moving the camera.
	 * SHOULD NOT RUN DURING ANIMATIONS. `setOrbitPoint()` will immediately fix the positions.
	 * @param targetX
	 * @param targetY
	 * @param targetZ
	 * @category Methods
	 */
	setOrbitPoint( targetX: number, targetY: number, targetZ : number ) {

		this._camera.updateMatrixWorld();
		_xColumn.setFromMatrixColumn( this._camera.matrixWorldInverse, 0 );
		_yColumn.setFromMatrixColumn( this._camera.matrixWorldInverse, 1 );
		_zColumn.setFromMatrixColumn( this._camera.matrixWorldInverse, 2 );

		const position = _v3A.set( targetX, targetY, targetZ );
		const distance = position.distanceTo( this._camera.position );
		const cameraToPoint = position.sub( this._camera.position );
		_xColumn.multiplyScalar( cameraToPoint.x );
		_yColumn.multiplyScalar( cameraToPoint.y );
		_zColumn.multiplyScalar( cameraToPoint.z );

		_v3A.copy( _xColumn ).add( _yColumn ).add( _zColumn );
		_v3A.z = _v3A.z + distance;

		this.dollyTo( distance, false );
		this.setFocalOffset( - _v3A.x, _v3A.y, - _v3A.z, false );
		this.moveTo( targetX, targetY, targetZ, false );

	}

	/**
	 * Set the boundary box that encloses the target of the camera. box3 is in THREE.Box3
	 * @param box3
	 * @category Methods
	 */
	setBoundary( box3?: _THREE.Box3 ): void {

		if ( ! box3 ) {

			this._boundary.min.set( - Infinity, - Infinity, - Infinity );
			this._boundary.max.set(   Infinity,   Infinity,   Infinity );
			this._needsUpdate = true;

			return;

		}

		this._boundary.copy( box3 );
		this._boundary.clampPoint( this._targetEnd, this._targetEnd );
		this._needsUpdate = true;

	}

	/**
	 * Set (or unset) the current viewport.
	 * Set this when you want to use renderer viewport and .dollyToCursor feature at the same time.
	 * @param viewportOrX
	 * @param y
	 * @param width
	 * @param height
	 * @category Methods
	 */
	setViewport( viewportOrX: _THREE.Vector4 | number | null, y: number, width: number, height: number ): void {

		if ( viewportOrX === null ) { // null

			this._viewport = null;

			return;

		}

		this._viewport = this._viewport || new THREE.Vector4() as _THREE.Vector4;

		if ( typeof viewportOrX === 'number' ) { // number

			this._viewport.set( viewportOrX, y, width, height );

		} else { // Vector4

			this._viewport.copy( viewportOrX );

		}

	}

	/**
	 * Calculate the distance to fit the box.
	 * @param width box width
	 * @param height box height
	 * @param depth box depth
	 * @returns distance
	 * @category Methods
	 */
	getDistanceToFitBox( width: number, height: number, depth: number, cover: boolean = false ): number {

		if ( notSupportedInOrthographicCamera( this._camera, 'getDistanceToFitBox' ) ) return this._spherical.radius;

		const boundingRectAspect = width / height;
		const fov = this._camera.getEffectiveFOV() * DEG2RAD;
		const aspect = this._camera.aspect;

		const heightToFit = ( cover ? boundingRectAspect > aspect : boundingRectAspect < aspect ) ? height : width / aspect;
		return heightToFit * 0.5 / Math.tan( fov * 0.5 ) + depth * 0.5;

	}

	/**
	 * Calculate the distance to fit the sphere.
	 * @param radius sphere radius
	 * @returns distance
	 * @category Methods
	 */
	getDistanceToFitSphere( radius: number ): number {

		if ( notSupportedInOrthographicCamera( this._camera, 'getDistanceToFitSphere' ) ) return this._spherical.radius;

		// https://stackoverflow.com/a/44849975
		const vFOV = this._camera.getEffectiveFOV() * DEG2RAD;
		const hFOV = Math.atan( Math.tan( vFOV * 0.5 ) * this._camera.aspect ) * 2;
		const fov = 1 < this._camera.aspect ? vFOV : hFOV;
		return radius / ( Math.sin( fov * 0.5 ) );

	}

	/**
	 * Returns its current gazing target, which is the center position of the orbit.
	 * @param out current gazing target
	 * @category Methods
	 */
	getTarget( out: _THREE.Vector3 ): _THREE.Vector3 {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3() as _THREE.Vector3;
		return _out.copy( this._targetEnd );

	}

	/**
	 * Returns its current position.
	 * @param out current position
	 * @category Methods
	 */
	getPosition( out: _THREE.Vector3 ): _THREE.Vector3 {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3() as _THREE.Vector3;
		return _out.setFromSpherical( this._sphericalEnd ).applyQuaternion( this._yAxisUpSpaceInverse ).add( this._targetEnd );

	}

	/**
	 * Returns its current focal offset, which is how much the camera appears to be translated in screen parallel coordinates.
	 * @param out current focal offset
	 * @category Methods
	 */
	getFocalOffset( out: _THREE.Vector3 ): _THREE.Vector3 {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3() as _THREE.Vector3;
		return _out.copy( this._focalOffsetEnd );

	}

	/**
	 * Normalize camera azimuth angle rotation between 0 and 360 degrees.
	 * @category Methods
	 */
	normalizeRotations(): void {

		this._sphericalEnd.theta = this._sphericalEnd.theta % PI_2;
		if ( this._sphericalEnd.theta < 0 ) this._sphericalEnd.theta += PI_2;
		this._spherical.theta += PI_2 * Math.round( ( this._sphericalEnd.theta - this._spherical.theta ) / PI_2 );

	}

	/**
	 * Reset all rotation and position to defaults.
	 * @param enableTransition
	 * @category Methods
	 */
	reset( enableTransition: boolean = false ): Promise<void[]> {

		const promises = [
			this.setLookAt(
				this._position0.x, this._position0.y, this._position0.z,
				this._target0.x, this._target0.y, this._target0.z,
				enableTransition,
			),
			this.setFocalOffset(
				this._focalOffset0.x,
				this._focalOffset0.y,
				this._focalOffset0.z,
				enableTransition,
			),
			this.zoomTo( this._zoom0, enableTransition ),
		];

		return Promise.all( promises );

	}

	/**
	 * Set current camera position as the default position.
	 * @category Methods
	 */
	saveState(): void {

		this.getTarget( this._target0 );
		this.getPosition( this._position0 );
		this._zoom0 = this._zoom;
		this._focalOffset0.copy( this._focalOffset );

	}

	/**
	 * Sync camera-up direction.  
	 * When camera-up vector is changed, `.updateCameraUp()` must be called.
	 * @category Methods
	 */
	updateCameraUp(): void {

		this._yAxisUpSpace.setFromUnitVectors( this._camera.up, _AXIS_Y );
		this._yAxisUpSpaceInverse.copy( this._yAxisUpSpace ).invert;

	}

	/**
	 * Update camera position and directions.  
	 * This should be called in your tick loop every time, and returns true if re-rendering is needed.
	 * @param delta
	 * @returns updated
	 * @category Methods
	 */
	update( delta: number ): boolean {

		const isDragging = this._state !== ACTION.NONE;
		const hasDragStateChanged = isDragging !== this._isLastDragging;
		this._isLastDragging = isDragging;

		const smoothTime = isDragging ? this.draggingSmoothTime : this.smoothTime;

		if ( hasDragStateChanged && isDragging ) {

			const changedSpeed = this.smoothTime / this.draggingSmoothTime;
			this._thetaVelocity.value *= changedSpeed;
			this._phiVelocity.value *= changedSpeed;
			this._radiusVelocity.value *= changedSpeed;
			this._targetVelocity.multiplyScalar( changedSpeed );
			this._focalOffsetVelocity.multiplyScalar( changedSpeed );
			this._zoomVelocity.value *= changedSpeed;

		} else if ( hasDragStateChanged && ! isDragging ) {

			const changedSpeed = this.draggingSmoothTime / this.smoothTime;
			this._thetaVelocity.value *= changedSpeed;
			this._phiVelocity.value *= changedSpeed;
			this._radiusVelocity.value *= changedSpeed;
			this._targetVelocity.multiplyScalar( changedSpeed );
			this._focalOffsetVelocity.multiplyScalar( changedSpeed );
			this._zoomVelocity.value *= changedSpeed;

		}

		const deltaTheta  = this._sphericalEnd.theta  - this._spherical.theta;
		const deltaPhi    = this._sphericalEnd.phi    - this._spherical.phi;
		const deltaRadius = this._sphericalEnd.radius - this._spherical.radius;
		const deltaTarget = _deltaTarget.subVectors( this._targetEnd, this._target );
		const deltaOffset = _deltaOffset.subVectors( this._focalOffsetEnd, this._focalOffset );
		const deltaZoom = this._zoomEnd - this._zoom;

		// update theta
		if ( approxZero( deltaTheta ) ) {

			this._thetaVelocity.value = 0;
			this._spherical.theta = this._sphericalEnd.theta;

		} else {

			this._spherical.theta = smoothDamp( this._spherical.theta, this._sphericalEnd.theta, this._thetaVelocity, smoothTime, Infinity, delta );
			this._needsUpdate = true;

		}

		// update phi
		if ( approxZero( deltaPhi ) ) {

			this._phiVelocity.value = 0;
			this._spherical.phi = this._sphericalEnd.phi;

		} else {

			this._spherical.phi = smoothDamp( this._spherical.phi, this._sphericalEnd.phi, this._phiVelocity, smoothTime, Infinity, delta );
			this._needsUpdate = true;

		}

		// update distance
		if ( approxZero( deltaRadius ) ) {

			this._radiusVelocity.value = 0;
			this._spherical.radius = this._sphericalEnd.radius;

		} else {

			this._spherical.radius = smoothDamp( this._spherical.radius, this._sphericalEnd.radius, this._radiusVelocity, smoothTime, this.maxSpeed, delta );
			this._needsUpdate = true;

		}

		// update target position
		if ( approxZero( deltaTarget.x ) && approxZero( deltaTarget.y ) && approxZero( deltaTarget.z ) ) {

			this._targetVelocity.set( 0, 0, 0 );
			this._target.copy( this._targetEnd );

		} else {

			smoothDampVec3( this._target, this._targetEnd, this._targetVelocity, smoothTime, this.maxSpeed, delta, this._target );
			this._needsUpdate = true;

		}

		// update focalOffset
		if ( approxZero( deltaOffset.x ) && approxZero( deltaOffset.y ) && approxZero( deltaOffset.z ) ) {

			this._focalOffsetVelocity.set( 0, 0, 0 );
			this._focalOffset.copy( this._focalOffsetEnd );

		} else {

			smoothDampVec3( this._focalOffset, this._focalOffsetEnd, this._focalOffsetVelocity, smoothTime, this.maxSpeed, delta, this._focalOffset );
			this._needsUpdate = true;

		}

		if ( this._dollyControlAmount !== 0 ) {

			if ( isPerspectiveCamera( this._camera ) ) {

				const camera = this._camera;
				const cameraDirection = _v3A.setFromSpherical( this._spherical ).applyQuaternion( this._yAxisUpSpaceInverse ).normalize().negate();
				const planeX = _v3B.copy( cameraDirection ).cross( camera.up ).normalize();
				if ( planeX.lengthSq() === 0 ) planeX.x = 1.0;
				const planeY = _v3C.crossVectors( planeX, cameraDirection );
				const worldToScreen = this._sphericalEnd.radius * Math.tan( camera.getEffectiveFOV() * DEG2RAD * 0.5 );
				const prevRadius = this._sphericalEnd.radius - this._dollyControlAmount;
				const lerpRatio = ( prevRadius - this._sphericalEnd.radius ) / this._sphericalEnd.radius;
				const cursor = _v3A.copy( this._targetEnd )
					.add( planeX.multiplyScalar( this._dollyControlCoord.x * worldToScreen * camera.aspect ) )
					.add( planeY.multiplyScalar( this._dollyControlCoord.y * worldToScreen ) );
				this._targetEnd.lerp( cursor, lerpRatio );

			} else if ( isOrthographicCamera( this._camera ) ) {

				const camera = this._camera;
				const worldCursorPosition = _v3A.set(
					this._dollyControlCoord.x,
					this._dollyControlCoord.y,
					( camera.near + camera.far ) / ( camera.near - camera.far )
				).unproject( camera );//.sub( _v3B.set( this._focalOffset.x, this._focalOffset.y, 0 ) );
				const quaternion = _v3B.set( 0, 0, - 1 ).applyQuaternion( camera.quaternion );
				const cursor = _v3C.copy( worldCursorPosition ).add( quaternion.multiplyScalar( - worldCursorPosition.dot( camera.up ) ) );
				const prevZoom = this._zoom - this._dollyControlAmount;
				const lerpRatio = - ( prevZoom - this._zoomEnd ) / this._zoom;

				// find the "distance" (aka plane constant in three.js) of Plane
				// from a given position (this._targetEnd) and normal vector (cameraDirection)
				// https://www.maplesoft.com/support/help/maple/view.aspx?path=MathApps%2FEquationOfAPlaneNormal#bkmrk0
				const cameraDirection = _v3A.setFromSpherical( this._spherical ).applyQuaternion( this._yAxisUpSpaceInverse ).normalize().negate();
				const prevPlaneConstant = this._targetEnd.dot( cameraDirection );

				this._targetEnd.lerp( cursor, lerpRatio );
				const newPlaneConstant = this._targetEnd.dot( cameraDirection );

				// Pull back the camera depth that has moved, to be the camera stationary as zoom
				const pullBack = cameraDirection.multiplyScalar( newPlaneConstant - prevPlaneConstant );
				this._targetEnd.sub( pullBack );

			}

			this._target.copy( this._targetEnd );
			// target position may be moved beyond boundary.
			this._boundary.clampPoint( this._targetEnd, this._targetEnd );
			this._dollyControlAmount = 0;

		}

		// update zoom
		if ( approxZero( deltaZoom ) ) {

			this._zoomVelocity.value = 0;
			this._zoom = this._zoomEnd;

		} else {

			this._zoom = smoothDamp( this._zoom, this._zoomEnd, this._zoomVelocity, this.smoothTime, Infinity, delta );

		}

		if ( this._camera.zoom !== this._zoom ) {

			this._camera.zoom = this._zoom;
			this._camera.updateProjectionMatrix();
			this._updateNearPlaneCorners();
			this._needsUpdate = true;

		}

		// collision detection
		const maxDistance = this._collisionTest();
		this._spherical.radius = Math.min( this._spherical.radius, maxDistance );

		// decompose spherical to the camera position
		this._spherical.makeSafe();
		this._camera.position.setFromSpherical( this._spherical ).applyQuaternion( this._yAxisUpSpaceInverse ).add( this._target );
		this._camera.lookAt( this._target );

		// set offset after the orbit movement
		if ( this._affectOffset ) {

			this._camera.updateMatrixWorld();
			_xColumn.setFromMatrixColumn( this._camera.matrix, 0 );
			_yColumn.setFromMatrixColumn( this._camera.matrix, 1 );
			_zColumn.setFromMatrixColumn( this._camera.matrix, 2 );
			_xColumn.multiplyScalar(   this._focalOffset.x );
			_yColumn.multiplyScalar( - this._focalOffset.y );
			_zColumn.multiplyScalar(   this._focalOffset.z ); // notice: z-offset will not affect in Orthographic.

			_v3A.copy( _xColumn ).add( _yColumn ).add( _zColumn );
			this._camera.position.add( _v3A );

		}

		if ( this._boundaryEnclosesCamera ) {

			this._encloseToBoundary(
				this._camera.position.copy( this._target ),
				_v3A.setFromSpherical( this._spherical ).applyQuaternion( this._yAxisUpSpaceInverse ),
				1.0,
			);

		}

		const updated = this._needsUpdate;

		if ( updated && ! this._updatedLastTime ) {

			this._hasRested = false;
			this.dispatchEvent( { type: 'wake' } );
			this.dispatchEvent( { type: 'update' } );

		} else if ( updated ) {

			this.dispatchEvent( { type: 'update' } );

			if (
				approxZero( deltaTheta, this.restThreshold ) &&
				approxZero( deltaPhi, this.restThreshold ) &&
				approxZero( deltaRadius, this.restThreshold ) &&
				approxZero( deltaTarget.x, this.restThreshold ) &&
				approxZero( deltaTarget.y, this.restThreshold ) &&
				approxZero( deltaTarget.z, this.restThreshold ) &&
				approxZero( deltaOffset.x, this.restThreshold ) &&
				approxZero( deltaOffset.y, this.restThreshold ) &&
				approxZero( deltaOffset.z, this.restThreshold ) &&
				approxZero( deltaZoom, this.restThreshold ) &&
				! this._hasRested
			) {

				this._hasRested = true;
				this.dispatchEvent( { type: 'rest' } );

			}

		} else if ( ! updated && this._updatedLastTime ) {

			this.dispatchEvent( { type: 'sleep' } );

		}

		this._updatedLastTime = updated;
		this._needsUpdate = false;
		return updated;

	}

	/**
	 * Get all state in JSON string
	 * @category Methods
	 */
	toJSON(): string {

		return JSON.stringify( {
			enabled              : this._enabled,

			minDistance          : this.minDistance,
			maxDistance          : infinityToMaxNumber( this.maxDistance ),
			minZoom              : this.minZoom,
			maxZoom              : infinityToMaxNumber( this.maxZoom ),
			minPolarAngle        : this.minPolarAngle,
			maxPolarAngle        : infinityToMaxNumber( this.maxPolarAngle ),
			minAzimuthAngle      : infinityToMaxNumber( this.minAzimuthAngle ),
			maxAzimuthAngle      : infinityToMaxNumber( this.maxAzimuthAngle ),
			smoothTime           : this.smoothTime,
			draggingSmoothTime   : this.draggingSmoothTime,
			dollySpeed           : this.dollySpeed,
			truckSpeed           : this.truckSpeed,
			dollyToCursor        : this.dollyToCursor,
			verticalDragToForward: this.verticalDragToForward,

			target               : this._targetEnd.toArray(),
			position             : _v3A.setFromSpherical( this._sphericalEnd ).add( this._targetEnd ).toArray(),
			zoom                 : this._zoomEnd,
			focalOffset          : this._focalOffsetEnd.toArray(),

			target0              : this._target0.toArray(),
			position0            : this._position0.toArray(),
			zoom0                : this._zoom0,
			focalOffset0         : this._focalOffset0.toArray(),

		} );

	}

	/**
	 * Reproduce the control state with JSON. enableTransition is where anim or not in a boolean.
	 * @param json
	 * @param enableTransition
	 * @category Methods
	 */
	fromJSON( json: string, enableTransition: boolean = false ): void {

		const obj = JSON.parse( json );
		const position = _v3A.fromArray( obj.position );

		this.enabled               = obj.enabled;

		this.minDistance           = obj.minDistance;
		this.maxDistance           = maxNumberToInfinity( obj.maxDistance );
		this.minZoom               = obj.minZoom;
		this.maxZoom               = maxNumberToInfinity( obj.maxZoom );
		this.minPolarAngle         = obj.minPolarAngle;
		this.maxPolarAngle         = maxNumberToInfinity( obj.maxPolarAngle );
		this.minAzimuthAngle       = maxNumberToInfinity( obj.minAzimuthAngle );
		this.maxAzimuthAngle       = maxNumberToInfinity( obj.maxAzimuthAngle );
		this.smoothTime            = obj.smoothTime;
		this.draggingSmoothTime    = obj.draggingSmoothTime;
		this.dollySpeed            = obj.dollySpeed;
		this.truckSpeed            = obj.truckSpeed;
		this.dollyToCursor         = obj.dollyToCursor;
		this.verticalDragToForward = obj.verticalDragToForward;

		this._target0.fromArray( obj.target0 );
		this._position0.fromArray( obj.position0 );
		this._zoom0 = obj.zoom0;
		this._focalOffset0.fromArray( obj.focalOffset0 );

		this.moveTo( obj.target[ 0 ], obj.target[ 1 ], obj.target[ 2 ], enableTransition );
		_sphericalA.setFromVector3( position.sub( this._targetEnd ).applyQuaternion( this._yAxisUpSpace ) );
		this.rotateTo( _sphericalA.theta, _sphericalA.phi, enableTransition );
		this.zoomTo( obj.zoom, enableTransition );
		this.setFocalOffset( obj.focalOffset[ 0 ], obj.focalOffset[ 1 ], obj.focalOffset[ 2 ], enableTransition );

		this._needsUpdate = true;

	}

	/**
	 * Attach all internal event handlers to enable drag control.
	 * @category Methods
	 */
	connect( domElement: HTMLElement ): void {

		if ( this._domElement ) {

			console.warn( 'camera-controls is already connected.' );
			return;

		}

		domElement.setAttribute( 'data-camera-controls-version', VERSION );
		this._addAllEventListeners( domElement );

	}

	/**
	 * Detach all internal event handlers to disable drag control.
	 */
	disconnect() {

		this._removeAllEventListeners();
		this._domElement = undefined;

	}

	/**
	 * Dispose the cameraControls instance itself, remove all eventListeners.
	 * @category Methods
	 */
	dispose(): void {

		this.disconnect();
		if ( this._domElement && 'setAttribute' in this._domElement ) this._domElement.removeAttribute( 'data-camera-controls-version' );

	}


	protected _findPointerById( pointerId: number ): PointerInput | null {

		// to support IE11 use some instead of Array#find (will be removed when IE11 is deprecated)
		let pointer: PointerInput | null = null;
		this._activePointers.some( ( activePointer ) => {

			if ( activePointer.pointerId === pointerId ) {

				pointer = activePointer;
				return true;

			}

			return false;

		} );
		return pointer;

	}

	protected _encloseToBoundary( position: _THREE.Vector3, offset: _THREE.Vector3, friction: number ): _THREE.Vector3 {

		const offsetLength2 = offset.lengthSq();

		if ( offsetLength2 === 0.0 ) { // sanity check

			return position;

		}

		// See: https://twitter.com/FMS_Cat/status/1106508958640988161
		const newTarget = _v3B.copy( offset ).add( position ); // target
		const clampedTarget = this._boundary.clampPoint( newTarget, _v3C ); // clamped target
		const deltaClampedTarget = clampedTarget.sub( newTarget ); // newTarget -> clampedTarget
		const deltaClampedTargetLength2 = deltaClampedTarget.lengthSq(); // squared length of deltaClampedTarget

		if ( deltaClampedTargetLength2 === 0.0 ) { // when the position doesn't have to be clamped

			return position.add( offset );

		} else if ( deltaClampedTargetLength2 === offsetLength2 ) { // when the position is completely stuck

			return position;

		} else if ( friction === 0.0 ) {

			return position.add( offset ).add( deltaClampedTarget );

		} else {

			const offsetFactor = 1.0 + friction * deltaClampedTargetLength2 / offset.dot( deltaClampedTarget );

			return position
				.add( _v3B.copy( offset ).multiplyScalar( offsetFactor ) )
				.add( deltaClampedTarget.multiplyScalar( 1.0 - friction ) );

		}

	}

	protected _updateNearPlaneCorners(): void {

		if ( isPerspectiveCamera( this._camera ) )  {

			const camera = this._camera;
			const near = camera.near;
			const fov = camera.getEffectiveFOV() * DEG2RAD;
			const heightHalf = Math.tan( fov * 0.5 ) * near; // near plain half height
			const widthHalf = heightHalf * camera.aspect; // near plain half width
			this._nearPlaneCorners[ 0 ].set( - widthHalf, - heightHalf, 0 );
			this._nearPlaneCorners[ 1 ].set(   widthHalf, - heightHalf, 0 );
			this._nearPlaneCorners[ 2 ].set(   widthHalf,   heightHalf, 0 );
			this._nearPlaneCorners[ 3 ].set( - widthHalf,   heightHalf, 0 );

		} else if ( isOrthographicCamera( this._camera ) ) {

			const camera = this._camera;
			const zoomInv = 1 / camera.zoom;
			const left   = camera.left   * zoomInv;
			const right  = camera.right  * zoomInv;
			const top    = camera.top    * zoomInv;
			const bottom = camera.bottom * zoomInv;

			this._nearPlaneCorners[ 0 ].set( left,  top,    0 );
			this._nearPlaneCorners[ 1 ].set( right, top,    0 );
			this._nearPlaneCorners[ 2 ].set( right, bottom, 0 );
			this._nearPlaneCorners[ 3 ].set( left,  bottom, 0 );

		}

	}

	protected _truckInternal = ( deltaX: number, deltaY: number, dragToOffset: boolean ): void => {

		if ( isPerspectiveCamera( this._camera ) ) {

			const offset = _v3A.copy( this._camera.position ).sub( this._target );
			// half of the fov is center to top of screen
			const fov = this._camera.getEffectiveFOV() * DEG2RAD;
			const targetDistance = offset.length() * Math.tan( fov * 0.5 );
			const truckX    = ( this.truckSpeed * deltaX * targetDistance / this._elementRect.height );
			const pedestalY = ( this.truckSpeed * deltaY * targetDistance / this._elementRect.height );
			if ( this.verticalDragToForward ) {

				dragToOffset ?
					this.setFocalOffset(
						this._focalOffsetEnd.x + truckX,
						this._focalOffsetEnd.y,
						this._focalOffsetEnd.z,
						true,
					) :
					this.truck( truckX, 0, true );
				this.forward( - pedestalY, true );

			} else {

				dragToOffset ?
					this.setFocalOffset(
						this._focalOffsetEnd.x + truckX,
						this._focalOffsetEnd.y + pedestalY,
						this._focalOffsetEnd.z,
						true,
					) :
					this.truck( truckX, pedestalY, true );

			}

		} else if ( isOrthographicCamera( this._camera ) ) {

			// orthographic
			const camera = this._camera;
			const truckX    = deltaX * ( camera.right - camera.left   ) / camera.zoom / this._elementRect.width;
			const pedestalY = deltaY * ( camera.top   - camera.bottom ) / camera.zoom / this._elementRect.height;
			dragToOffset ?
				this.setFocalOffset( this._focalOffsetEnd.x + truckX, this._focalOffsetEnd.y + pedestalY, this._focalOffsetEnd.z, true ) :
				this.truck( truckX, pedestalY, true );

		}

	};

	protected _rotateInternal = ( deltaX: number, deltaY: number ): void => {

		const theta = PI_2 * this.azimuthRotateSpeed * deltaX / this._elementRect.height; // divide by *height* to refer the resolution
		const phi   = PI_2 * this.polarRotateSpeed   * deltaY / this._elementRect.height;
		this.rotate( theta, phi, true );

	};

	protected _dollyInternal = ( delta: number, x: number, y : number ): void => {

		const dollyScale = Math.pow( 0.95, - delta * this.dollySpeed );
		const distance = this._sphericalEnd.radius * dollyScale;
		const prevRadius = this._sphericalEnd.radius;
		const signedPrevRadius = prevRadius * ( delta >= 0 ? - 1 : 1 );

		this.dollyTo( distance );

		if ( this.infinityDolly && ( distance < this.minDistance || this.maxDistance === this.minDistance ) ) {

			this._camera.getWorldDirection( _v3A );
			this._targetEnd.add( _v3A.normalize().multiplyScalar( signedPrevRadius ) );
			this._target.add( _v3A.normalize().multiplyScalar( signedPrevRadius ) );

		}

		if ( this.dollyToCursor ) {

			this._dollyControlAmount += this._sphericalEnd.radius - prevRadius;

			if ( this.infinityDolly && ( distance < this.minDistance || this.maxDistance === this.minDistance ) ) {

				this._dollyControlAmount -= signedPrevRadius;

			}

			this._dollyControlCoord.set( x, y );

		}

		return;

	};

	protected _zoomInternal = ( delta: number, x: number, y: number ): void => {

		const zoomScale = Math.pow( 0.95, delta * this.dollySpeed );
		const prevZoom = this._zoomEnd;

		// for both PerspectiveCamera and OrthographicCamera
		this.zoomTo( this._zoom * zoomScale );

		if ( this.dollyToCursor ) {

			this._dollyControlAmount += this._zoomEnd - prevZoom;
			this._dollyControlCoord.set( x, y );

		}

		return;

	};

	// lateUpdate
	protected _collisionTest(): number {

		let distance = Infinity;

		const hasCollider = this.colliderMeshes.length >= 1;
		if ( ! hasCollider ) return distance;

		if ( notSupportedInOrthographicCamera( this._camera, '_collisionTest' ) ) return distance;

		// divide by distance to normalize, lighter than `Vector3.prototype.normalize()`
		const direction = _v3A.setFromSpherical( this._spherical ).divideScalar( this._spherical.radius );

		_rotationMatrix.lookAt( _ORIGIN, direction, this._camera.up );

		for ( let i = 0; i < 4; i ++ ) {

			const nearPlaneCorner = _v3B.copy( this._nearPlaneCorners[ i ] );
			nearPlaneCorner.applyMatrix4( _rotationMatrix );

			const origin = _v3C.addVectors( this._target, nearPlaneCorner );
			_raycaster.set( origin, direction );
			_raycaster.far = this._spherical.radius + 1;

			const intersects = _raycaster.intersectObjects( this.colliderMeshes );

			if ( intersects.length !== 0 && intersects[ 0 ].distance < distance ) {

				distance = intersects[ 0 ].distance;

			}

		}

		return distance;

	}

	/**
	 * Get its client rect and package into given `DOMRect` .
	 */
	protected _getClientRect( target: DOMRect ): DOMRect | undefined {

		if ( ! this._domElement ) return;

		const rect = this._domElement.getBoundingClientRect();

		target.x = rect.left;
		target.y = rect.top;

		if ( this._viewport ) {

			target.x += this._viewport.x;
			target.y += rect.height - this._viewport.w - this._viewport.y;
			target.width = this._viewport.z;
			target.height = this._viewport.w;

		} else {

			target.width = rect.width;
			target.height = rect.height;

		}

		return target;

	}

	protected _createOnRestPromise( resolveImmediately: boolean ): Promise<void> {

		if ( resolveImmediately ) return Promise.resolve();

		this._hasRested = false;
		this.dispatchEvent( { type: 'transitionstart' } );

		return new Promise( ( resolve ) => {

			const onResolve = () => {

				this.removeEventListener( 'rest', onResolve );
				resolve();

			};

			this.addEventListener( 'rest', onResolve );

		} );

	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected _addAllEventListeners( _domElement: HTMLElement ): void {}

	protected _removeAllEventListeners(): void {}

	/**
	 * backward compatible
	 * @deprecated use smoothTime (in seconds) instead
	 * @category Properties
	 */
	get dampingFactor() {

		console.warn( '.dampingFactor has been deprecated. use smoothTime (in seconds) instead.' );
		return 0;

	}

	/**
	 * backward compatible
	 * @deprecated use smoothTime (in seconds) instead
	 * @category Properties
	 */
	set dampingFactor( _: number ) {

		console.warn( '.dampingFactor has been deprecated. use smoothTime (in seconds) instead.' );

	}

	/**
	 * backward compatible
	 * @deprecated use draggingSmoothTime (in seconds) instead
	 * @category Properties
	 */
	get draggingDampingFactor() {

		console.warn( '.draggingDampingFactor has been deprecated. use draggingSmoothTime (in seconds) instead.' );
		return 0;

	}

	/**
	 * backward compatible
	 * @deprecated use draggingSmoothTime (in seconds) instead
	 * @category Properties
	 */
	set draggingDampingFactor( _: number ) {

		console.warn( '.draggingDampingFactor has been deprecated. use draggingSmoothTime (in seconds) instead.' );

	}

}

function createBoundingSphere( object3d: _THREE.Object3D, out: _THREE.Sphere ): _THREE.Sphere {

	const boundingSphere = out;
	const center = boundingSphere.center;

	_box3A.makeEmpty();
	// find the center
	object3d.traverseVisible( ( object ) => {

		if ( ! ( object as _THREE.Mesh ).isMesh ) return;

		_box3A.expandByObject( object );

	} );
	_box3A.getCenter( center );

	// find the radius
	let maxRadiusSq = 0;
	object3d.traverseVisible( ( object ) => {

		if ( ! ( object as _THREE.Mesh ).isMesh ) return;

		const mesh = ( object as _THREE.Mesh );
		const geometry = mesh.geometry.clone();
		geometry.applyMatrix4( mesh.matrixWorld );

		if ( geometry.isBufferGeometry ) {

			const bufferGeometry = geometry;
			const position = bufferGeometry.attributes.position as _THREE.BufferAttribute;

			for ( let i = 0, l = position.count; i < l; i ++ ) {

				_v3A.fromBufferAttribute( position, i );
				maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( _v3A ) );

			}

		} else {

			// for old three.js, which supports both BufferGeometry and Geometry
			// this condition block will be removed in the near future.
			const position = geometry.attributes.position;

			for ( let i = 0, l = position.count; i < l; i ++ ) {

				_v3A.fromBufferAttribute( position, i );
				maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( _v3A ) );

			}

		}

	} );

	boundingSphere.radius = Math.sqrt( maxRadiusSq );
	return boundingSphere;

}
