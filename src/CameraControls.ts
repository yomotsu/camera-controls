import type * as _THREE from 'three';
import {
	ACTION,
	MouseButtons,
	Touches,
	FitToOptions,
	CameraControlsEventMap,
} from './types';
import {
	PI_2,
	PI_HALF,
	FPS_60,
} from './constants';
import {
	approxZero,
	approxEquals,
	roundToStep,
	infinityToMaxNumber,
	maxNumberToInfinity,
} from './utils/math-utils';
import { isTouchEvent } from './utils/isTouchEvent';
import { extractClientCoordFromEvent } from './utils/extractClientCoordFromEvent';
import { notSupportedInOrthographicCamera } from './utils/notSupportedInOrthographicCamera';
import { EventDispatcher, Listener } from './EventDispatcher';

const isBrowser = typeof window !== 'undefined';
const isMac = isBrowser && /Mac/.test( navigator.platform );
const readonlyACTION = Object.freeze( ACTION );
const TOUCH_DOLLY_FACTOR = 1 / 8;

let THREE: any;
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

	static install( libs: any ): void {

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

	static get ACTION(): Readonly<typeof ACTION> {

		return readonlyACTION;

	}

	minPolarAngle = 0; // radians
	maxPolarAngle = Math.PI; // radians
	minAzimuthAngle = - Infinity; // radians
	maxAzimuthAngle = Infinity; // radians

	// How far you can dolly in and out ( PerspectiveCamera only )
	minDistance = 0;
	maxDistance = Infinity;
	infinityDolly = false;

	minZoom = 0.01;
	maxZoom = Infinity;

	dampingFactor = 0.05;
	draggingDampingFactor = 0.25;
	azimuthRotateSpeed = 1.0;
	polarRotateSpeed = 1.0;
	dollySpeed = 1.0;
	truckSpeed = 2.0;
	dollyToCursor = false;
	dragToOffset = false;
	verticalDragToForward = false;

	boundaryFriction = 0.0;

	colliderMeshes: _THREE.Object3D[] = [];

	// button configs
	mouseButtons: MouseButtons;
	touches: Touches;

	cancel: () => void = () => {};

	protected _enabled = true;
	protected _camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera;
	protected _yAxisUpSpace: _THREE.Quaternion;
	protected _yAxisUpSpaceInverse: _THREE.Quaternion;
	protected _state: ACTION = ACTION.NONE;

	protected _domElement: HTMLElement;
	protected _viewport: _THREE.Vector4 | null = null;

	// the location of focus, where the object orbits around
	protected _target: _THREE.Vector3;
	protected _targetEnd: _THREE.Vector3;

	protected _focalOffset: _THREE.Vector3;
	protected _focalOffsetEnd: _THREE.Vector3;

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
	protected _nearPlaneCorners: _THREE.Vector3[];

	protected _boundary: _THREE.Box3;
	protected _boundaryEnclosesCamera = false;

	protected _needsUpdate = true;
	protected _updatedLastTime = false;

	constructor(
		camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera,
		domElement: HTMLElement,
	) {

		super();

		// Check if the user has installed THREE
		if ( typeof THREE === 'undefined' ) {

			console.error( 'camera-controls: `THREE` is undefined. You must first run `CameraControls.install( { THREE: THREE } )`. Check the docs for further information.' );

		}

		this._camera = camera;
		this._yAxisUpSpace = new THREE.Quaternion().setFromUnitVectors( this._camera.up, _AXIS_Y );
		this._yAxisUpSpaceInverse = this._yAxisUpSpace.clone().inverse();
		this._state = ACTION.NONE;

		this._domElement = domElement;

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
			new THREE.Vector3() as _THREE.Vector3,
			new THREE.Vector3() as _THREE.Vector3,
			new THREE.Vector3() as _THREE.Vector3,
			new THREE.Vector3() as _THREE.Vector3,
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
				( this._camera as THREE.PerspectiveCamera  ).isPerspectiveCamera  ? ACTION.DOLLY :
				( this._camera as THREE.OrthographicCamera ).isOrthographicCamera ? ACTION.ZOOM :
				ACTION.NONE,
			// We can also add shiftLeft, altLeft and etc if someone wants...
		};

		this.touches = {
			one: ACTION.TOUCH_ROTATE,
			two:
				( this._camera as THREE.PerspectiveCamera  ).isPerspectiveCamera  ? ACTION.TOUCH_DOLLY_TRUCK :
				( this._camera as THREE.OrthographicCamera ).isOrthographicCamera ? ACTION.TOUCH_ZOOM_TRUCK :
				ACTION.NONE,
			three: ACTION.TOUCH_TRUCK,
		};

		if ( this._domElement ) {

			const dragStartPosition = new THREE.Vector2() as _THREE.Vector2;
			const lastDragPosition = new THREE.Vector2() as _THREE.Vector2;
			const dollyStart = new THREE.Vector2() as _THREE.Vector2;
			const elementRect = new THREE.Vector4() as _THREE.Vector4;

			const truckInternal = ( deltaX: number, deltaY: number, dragToOffset: boolean ): void => {

				if ( ( this._camera as _THREE.PerspectiveCamera ).isPerspectiveCamera ) {

					const camera = this._camera as _THREE.PerspectiveCamera;

					const offset = _v3A.copy( camera.position ).sub( this._target );
					// half of the fov is center to top of screen
					const fov = camera.getEffectiveFOV() * THREE.MathUtils.DEG2RAD;
					const targetDistance = offset.length() * Math.tan( fov * 0.5 );
					const truckX    = ( this.truckSpeed * deltaX * targetDistance / elementRect.w );
					const pedestalY = ( this.truckSpeed * deltaY * targetDistance / elementRect.w );
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

				} else if ( ( this._camera as _THREE.OrthographicCamera ).isOrthographicCamera ) {

					// orthographic
					const camera = this._camera as _THREE.OrthographicCamera;
					const truckX    = deltaX * ( camera.right - camera.left   ) / camera.zoom / elementRect.z;
					const pedestalY = deltaY * ( camera.top   - camera.bottom ) / camera.zoom / elementRect.w;
					dragToOffset ?
						this.setFocalOffset( this._focalOffsetEnd.x + truckX, this._focalOffsetEnd.y + pedestalY, this._focalOffsetEnd.z, true ) :
						this.truck( truckX, pedestalY, true );

				}

			};

			const rotateInternal = ( deltaX: number, deltaY: number ): void => {

				const theta = PI_2 * this.azimuthRotateSpeed * deltaX / elementRect.w; // divide by *height* to refer the resolution
				const phi   = PI_2 * this.polarRotateSpeed   * deltaY / elementRect.w;
				this.rotate( theta, phi, true );

			};

			const dollyInternal = ( delta: number, x: number, y : number ): void => {

				const dollyScale = Math.pow( 0.95, - delta * this.dollySpeed );
				const distance = this._sphericalEnd.radius * dollyScale;
				const prevRadius = this._sphericalEnd.radius;

				this.dollyTo( distance );

				if ( this.infinityDolly && distance < this.minDistance ) {

					this._camera.getWorldDirection( _v3A );
					this._targetEnd.add( _v3A.normalize().multiplyScalar( prevRadius ) );
					this._target.add( _v3A.normalize().multiplyScalar( prevRadius ) );

				}

				if ( this.dollyToCursor ) {

					this._dollyControlAmount += this._sphericalEnd.radius - prevRadius;
					this._dollyControlCoord.set( x, y );

				}

				return;

			};

			const zoomInternal = ( delta: number /* , x: number, y: number */ ): void => {

				const zoomScale = Math.pow( 0.95, delta * this.dollySpeed );

				// for both PerspectiveCamera and OrthographicCamera
				this.zoomTo( this._zoom * zoomScale );
				return;

			};

			const cancelDragging = (): void => {

				this._state = ACTION.NONE;

				document.removeEventListener( 'mousemove', dragging );
				// see https://github.com/microsoft/TypeScript/issues/32912#issuecomment-522142969
				document.removeEventListener( 'touchmove', dragging, { passive: false } as AddEventListenerOptions );
				document.removeEventListener( 'mouseup',  endDragging );
				document.removeEventListener( 'touchend', endDragging );

			};

			const onMouseDown = ( event: MouseEvent ): void => {

				if ( ! this._enabled ) return;

				// Don't call `event.preventDefault()` on the mousedown event
				// to keep receiving mousemove evens outside dragging iframe
				// https://taye.me/blog/tips/2015/11/16/mouse-drag-outside-iframe/
				cancelDragging();

				switch ( event.button ) {

					case THREE.MOUSE.LEFT:

						this._state = this.mouseButtons.left;
						break;

					case THREE.MOUSE.MIDDLE:

						this._state = this.mouseButtons.middle;
						break;

					case THREE.MOUSE.RIGHT:

						this._state = this.mouseButtons.right;
						break;

				}

				startDragging( event );

			};

			const onTouchStart = ( event:TouchEvent ): void => {

				if ( ! this._enabled ) return;

				cancelDragging();

				switch ( event.touches.length ) {

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

				startDragging( event );

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
					if ( lastScrollTimeStamp - now < 1000 ) this._getClientRect( elementRect );
					lastScrollTimeStamp = now;

				}

				// Ref: https://github.com/cedricpinson/osgjs/blob/00e5a7e9d9206c06fdde0436e1d62ab7cb5ce853/sources/osgViewer/input/source/InputSourceMouse.js#L89-L103
				const deltaYFactor = isMac ? - 1 : - 3;
				const delta = ( event.deltaMode === 1 ) ? event.deltaY / deltaYFactor : event.deltaY / ( deltaYFactor * 10 );
				const x = this.dollyToCursor ? ( event.clientX - elementRect.x ) / elementRect.z *   2 - 1 : 0;
				const y = this.dollyToCursor ? ( event.clientY - elementRect.y ) / elementRect.w * - 2 + 1 : 0;

				switch ( this.mouseButtons.wheel ) {

					case ACTION.ROTATE: {

						rotateInternal( event.deltaX, event.deltaY );
						break;

					}

					case ACTION.TRUCK: {

						truckInternal( event.deltaX, event.deltaY, false );
						break;

					}

					case ACTION.OFFSET: {

						truckInternal( event.deltaX, event.deltaY, true );
						break;

					}

					case ACTION.DOLLY: {

						dollyInternal( - delta, x, y );
						break;

					}

					case ACTION.ZOOM: {

						zoomInternal( - delta /*, x, y */ );
						break;

					}

				}

				this.dispatchEvent( {
					type: 'control',
					originalEvent: event,
				} );

			};

			const onContextMenu = ( event: Event ): void => {

				if ( ! this._enabled ) return;

				event.preventDefault();

			};

			const startDragging = ( event: Event ): void => {

				if ( ! this._enabled ) return;

				extractClientCoordFromEvent( event, _v2 );

				this._getClientRect( elementRect );
				dragStartPosition.copy( _v2 );
				lastDragPosition.copy( _v2 );

				const isMultiTouch = isTouchEvent( event ) && ( event as TouchEvent ).touches.length >= 2;

				if ( isMultiTouch ) {

					const touchEvent = event as TouchEvent;

					// 2 finger pinch
					const dx = _v2.x - touchEvent.touches[ 1 ].clientX;
					const dy = _v2.y - touchEvent.touches[ 1 ].clientY;
					const distance = Math.sqrt( dx * dx + dy * dy );

					dollyStart.set( 0, distance );

					// center coords of 2 finger truck
					const x = ( touchEvent.touches[ 0 ].clientX + touchEvent.touches[ 1 ].clientX ) * 0.5;
					const y = ( touchEvent.touches[ 0 ].clientY + touchEvent.touches[ 1 ].clientY ) * 0.5;

					lastDragPosition.set( x, y );

				}

				document.addEventListener( 'mousemove', dragging );
				document.addEventListener( 'touchmove', dragging, { passive: false } );
				document.addEventListener( 'mouseup', endDragging );
				document.addEventListener( 'touchend', endDragging );

				this.dispatchEvent( {
					type: 'controlstart',
					originalEvent: event,
				} );

			};

			const dragging = ( event: Event ): void => {

				if ( ! this._enabled ) return;

				event.preventDefault();

				extractClientCoordFromEvent( event, _v2 );

				const deltaX = lastDragPosition.x - _v2.x;
				const deltaY = lastDragPosition.y - _v2.y;

				lastDragPosition.copy( _v2 );

				switch ( this._state ) {

					case ACTION.ROTATE:
					case ACTION.TOUCH_ROTATE: {

						rotateInternal( deltaX, deltaY );
						break;

					}

					case ACTION.DOLLY:
					case ACTION.ZOOM: {

						const dollyX = this.dollyToCursor ? ( dragStartPosition.x - elementRect.x ) / elementRect.z *   2 - 1 : 0;
						const dollyY = this.dollyToCursor ? ( dragStartPosition.y - elementRect.y ) / elementRect.w * - 2 + 1 : 0;
						this._state === ACTION.DOLLY ?
							dollyInternal( deltaY * TOUCH_DOLLY_FACTOR, dollyX, dollyY ) :
							zoomInternal( deltaY * TOUCH_DOLLY_FACTOR /*, dollyX, dollyY */ );
						break;

					}

					case ACTION.TOUCH_DOLLY:
					case ACTION.TOUCH_ZOOM:
					case ACTION.TOUCH_DOLLY_TRUCK:
					case ACTION.TOUCH_ZOOM_TRUCK:
					case ACTION.TOUCH_DOLLY_OFFSET:
					case ACTION.TOUCH_ZOOM_OFFSET: {

						const touchEvent = event as TouchEvent;
						const dx = _v2.x - touchEvent.touches[ 1 ].clientX;
						const dy = _v2.y - touchEvent.touches[ 1 ].clientY;
						const distance = Math.sqrt( dx * dx + dy * dy );
						const dollyDelta = dollyStart.y - distance;
						dollyStart.set( 0, distance );

						const dollyX = this.dollyToCursor ? ( lastDragPosition.x - elementRect.x ) / elementRect.z *   2 - 1 : 0;
						const dollyY = this.dollyToCursor ? ( lastDragPosition.y - elementRect.y ) / elementRect.w * - 2 + 1 : 0;

						this._state === ACTION.TOUCH_DOLLY ||
						this._state === ACTION.TOUCH_DOLLY_TRUCK ?
							dollyInternal( dollyDelta * TOUCH_DOLLY_FACTOR, dollyX, dollyY ) :
							zoomInternal( dollyDelta * TOUCH_DOLLY_FACTOR /*, dollyX, dollyY */ );

						if (
							this._state === ACTION.TOUCH_DOLLY_TRUCK ||
							this._state === ACTION.TOUCH_ZOOM_TRUCK
						) {

							truckInternal( deltaX, deltaY, false );

						} else if (
							this._state === ACTION.TOUCH_DOLLY_OFFSET ||
							this._state === ACTION.TOUCH_ZOOM_OFFSET
						) {

							truckInternal( deltaX, deltaY, true );

						}

						break;

					}

					case ACTION.TRUCK:
					case ACTION.TOUCH_TRUCK: {

						truckInternal( deltaX, deltaY, false );
						break;

					}

					case ACTION.OFFSET:
					case ACTION.TOUCH_OFFSET: {

						truckInternal( deltaX, deltaY, true );
						break;

					}

				}

				this.dispatchEvent( {
					type: 'control',
					originalEvent: event,
				} );

			};

			const endDragging = ( event: Event ): void => {

				if ( ! this._enabled ) return;

				cancelDragging();

				this.dispatchEvent( {
					type: 'controlend',
					originalEvent: event,
				} );

			};

			this._domElement.addEventListener( 'mousedown', onMouseDown );
			this._domElement.addEventListener( 'touchstart', onTouchStart );
			this._domElement.addEventListener( 'wheel', onMouseWheel );
			this._domElement.addEventListener( 'contextmenu', onContextMenu );

			this._removeAllEventListeners = (): void => {

				this._domElement.removeEventListener( 'mousedown', onMouseDown );
				this._domElement.removeEventListener( 'touchstart', onTouchStart );
				this._domElement.removeEventListener( 'wheel', onMouseWheel );
				this._domElement.removeEventListener( 'contextmenu', onContextMenu );
				document.removeEventListener( 'mousemove', dragging );
				// see https://github.com/microsoft/TypeScript/issues/32912#issuecomment-522142969
				document.removeEventListener( 'touchmove', dragging, { passive: false } as AddEventListenerOptions );
				document.removeEventListener( 'mouseup', endDragging );
				document.removeEventListener( 'touchend', endDragging );

			};

			this.cancel = (): void => {

				cancelDragging();

				this.dispatchEvent( {
					type: 'controlend',
					originalEvent: null,
				} );

			};

		}

		this.update( 0 );

	}

	get enabled(): boolean {

		return this._enabled;

	}

	set enabled( enabled: boolean ) {

		this._enabled = enabled;
		if ( ! enabled ) this.cancel();

	}

	get currentAction(): ACTION {

		return this._state;

	}

	get distance(): number {

		return this._spherical.radius;

	}

	set distance( distance ) {

		if (
			this._spherical.radius === distance &&
			this._sphericalEnd.radius === distance
		) return;

		this._spherical.radius = distance;
		this._sphericalEnd.radius = distance;
		this._needsUpdate = true;

	}

	// horizontal angle
	get azimuthAngle(): number {

		return this._spherical.theta;

	}

	set azimuthAngle( azimuthAngle ) {

		if (
			this._spherical.theta === azimuthAngle &&
			this._sphericalEnd.theta === azimuthAngle
		) return;

		this._spherical.theta = azimuthAngle;
		this._sphericalEnd.theta = azimuthAngle;
		this._needsUpdate = true;

	}

	// vertical angle
	get polarAngle(): number {

		return this._spherical.phi;

	}

	set polarAngle( polarAngle ) {

		if (
			this._spherical.phi === polarAngle &&
			this._sphericalEnd.phi === polarAngle
		) return;

		this._spherical.phi = polarAngle;
		this._sphericalEnd.phi = polarAngle;
		this._needsUpdate = true;

	}

	// wrong. phi should be map to polar, but backward compatibility.
	set phiSpeed( speed: number ) {

		console.warn( 'phiSpeed was renamed. use azimuthRotateSpeed instead' );
		this.azimuthRotateSpeed = speed;

	}

	// wrong. theta should be map to azimuth, but backward compatibility.
	set thetaSpeed( speed: number ) {

		console.warn( 'thetaSpeed was renamed. use polarRotateSpeed instead' );
		this.polarRotateSpeed = speed;

	}

	get boundaryEnclosesCamera() {

		return this._boundaryEnclosesCamera;

	}

	set boundaryEnclosesCamera( boundaryEnclosesCamera ) {

		this._boundaryEnclosesCamera = boundaryEnclosesCamera;
		this._needsUpdate = true;

	}

	addEventListener<K extends keyof CameraControlsEventMap>(
		type: K,
		listener: ( event: CameraControlsEventMap[ K ] ) => any,
	): void {

		super.addEventListener( type, listener as Listener );

	}

	removeEventListener<K extends keyof CameraControlsEventMap>(
		type: K,
		listener: ( event: CameraControlsEventMap[ K ] ) => any,
	): void {

		super.removeEventListener( type, listener as Listener );

	}

	// azimuthAngle in radian
	// polarAngle in radian
	rotate( azimuthAngle: number, polarAngle: number, enableTransition: boolean = false ): void {

		this.rotateTo(
			this._sphericalEnd.theta + azimuthAngle,
			this._sphericalEnd.phi   + polarAngle,
			enableTransition,
		);

	}

	// azimuthAngle in radian
	// polarAngle in radian
	rotateTo( azimuthAngle: number, polarAngle: number, enableTransition: boolean = false ): void {

		const theta = THREE.MathUtils.clamp( azimuthAngle, this.minAzimuthAngle, this.maxAzimuthAngle );
		const phi   = THREE.MathUtils.clamp( polarAngle,   this.minPolarAngle,   this.maxPolarAngle );

		this._sphericalEnd.theta = theta;
		this._sphericalEnd.phi   = phi;
		this._sphericalEnd.makeSafe();

		if ( ! enableTransition ) {

			this._spherical.theta = this._sphericalEnd.theta;
			this._spherical.phi   = this._sphericalEnd.phi;

		}

		this._needsUpdate = true;

	}

	dolly( distance: number, enableTransition: boolean = false ): void {

		this.dollyTo( this._sphericalEnd.radius - distance, enableTransition );

	}

	dollyTo( distance: number, enableTransition: boolean = false ): void {

		if ( notSupportedInOrthographicCamera( this._camera, 'dolly' ) ) return;

		this._sphericalEnd.radius = THREE.MathUtils.clamp( distance, this.minDistance, this.maxDistance );

		if ( ! enableTransition ) {

			this._spherical.radius = this._sphericalEnd.radius;

		}

		this._needsUpdate = true;

	}

	zoom( zoomStep: number, enableTransition: boolean = false ): void {

		this.zoomTo( this._zoomEnd + zoomStep, enableTransition );

	}

	zoomTo( zoom: number, enableTransition: boolean = false ): void {

		this._zoomEnd = THREE.MathUtils.clamp( zoom, this.minZoom, this.maxZoom );

		if ( ! enableTransition ) {

			this._zoom = this._zoomEnd;

		}

		this._needsUpdate = true;

	}

	pan( x: number, y: number, enableTransition: boolean = false ): void {

		console.log( '`pan` has been renamed to `truck`' );
		this.truck( x, y, enableTransition );

	}

	truck( x: number, y: number, enableTransition: boolean = false ): void {

		this._camera.updateMatrix();

		_xColumn.setFromMatrixColumn( this._camera.matrix, 0 );
		_yColumn.setFromMatrixColumn( this._camera.matrix, 1 );
		_xColumn.multiplyScalar(   x );
		_yColumn.multiplyScalar( - y );

		const offset = _v3A.copy( _xColumn ).add( _yColumn );
		this._encloseToBoundary( this._targetEnd, offset, this.boundaryFriction );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		this._needsUpdate = true;

	}

	forward( distance: number, enableTransition: boolean = false ): void {

		_v3A.setFromMatrixColumn( this._camera.matrix, 0 );
		_v3A.crossVectors( this._camera.up, _v3A );
		_v3A.multiplyScalar( distance );

		this._encloseToBoundary( this._targetEnd, _v3A, this.boundaryFriction );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		this._needsUpdate = true;

	}

	moveTo( x: number, y: number, z: number, enableTransition: boolean = false ): void {

		this._targetEnd.set( x, y, z );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		this._needsUpdate = true;

	}

	fitToBox( box3OrObject: _THREE.Box3 | _THREE.Object3D, enableTransition: boolean, {
		paddingLeft = 0,
		paddingRight = 0,
		paddingBottom = 0,
		paddingTop = 0,
		nearAxis = true,
		theta = 0,
		phi = 0
	}: Partial<FitToOptions> = {} ): void {
		const aabb = ( box3OrObject as _THREE.Box3 ).isBox3
			? _box3A.copy( box3OrObject as _THREE.Box3 )
			: _box3A.setFromObject( box3OrObject as _THREE.Object3D );

		if ( aabb.isEmpty() )  {

			console.warn( 'camera-controls: fitTo() cannot be used with an empty box. Aborting' );
			return;

		}

		if(nearAxis){
			// round to closest axis ( forward | backward | right | left | top | bottom )
			theta = roundToStep( this._sphericalEnd.theta, PI_HALF );
			phi   = roundToStep( this._sphericalEnd.phi,   PI_HALF );
		} 
		this.rotateTo( theta, phi, enableTransition );


		const normal = _v3A.setFromSpherical( this._sphericalEnd ).normalize();
		const rotation = _quaternionA.setFromUnitVectors( normal, _AXIS_Z );
		const viewFromPolar = approxEquals( Math.abs( normal.y ), 1 );
		if ( viewFromPolar ) {

			rotation.multiply( _quaternionB.setFromAxisAngle( _AXIS_Y, theta ) );

		}

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

		rotation.setFromUnitVectors( _AXIS_Z, normal );

		// add padding
		bb.min.x -= paddingLeft;
		bb.min.y -= paddingBottom;
		bb.max.x += paddingRight;
		bb.max.y += paddingTop;

		const bbSize = bb.getSize( _v3A );
		const center = bb.getCenter( _v3B ).applyQuaternion( rotation );

		const isPerspectiveCamera  = ( this._camera as THREE.PerspectiveCamera  ).isPerspectiveCamera;
		const isOrthographicCamera = ( this._camera as THREE.OrthographicCamera ).isOrthographicCamera;

		if ( isPerspectiveCamera ) {

			const distance = this.getDistanceToFitBox( bbSize.x, bbSize.y, bbSize.z );
			this.moveTo( center.x, center.y, center.z, enableTransition );
			this.dollyTo( distance, enableTransition );
			this.setFocalOffset( 0, 0, 0, enableTransition );
			return;

		} else if ( isOrthographicCamera ) {

			const camera = ( this._camera as THREE.OrthographicCamera );
			const width = camera.right - camera.left;
			const height = camera.top - camera.bottom;
			const zoom = Math.min( width / bbSize.x, height / bbSize.y );
			this.moveTo( center.x, center.y, center.z, enableTransition );
			this.zoomTo( zoom, enableTransition );
			this.setFocalOffset( 0, 0, 0, enableTransition );
			return;

		}

	}

	/**
	 * @deprecated fitTo() has been renamed to fitToBox()
	 */
	fitTo( box3OrObject: _THREE.Box3 | _THREE.Object3D, enableTransition: boolean, fitToOptions: Partial<FitToOptions> = {} ): void {

		console.warn( 'camera-controls: fitTo() has been renamed to fitToBox()' );
		this.fitToBox( box3OrObject, enableTransition, fitToOptions );

	}

	fitToSphere( sphereOrMesh: _THREE.Sphere | _THREE.Object3D, enableTransition: boolean ): void {

		const isSphere = sphereOrMesh instanceof THREE.Sphere;
		const boundingSphere = isSphere ?
			_sphere.copy( sphereOrMesh as _THREE.Sphere ) :
			createBoundingSphere( sphereOrMesh as _THREE.Object3D, _sphere );
		const distanceToFit = this.getDistanceToFitSphere( boundingSphere.radius );

		this.moveTo(
			boundingSphere.center.x,
			boundingSphere.center.y,
			boundingSphere.center.z,
			enableTransition,
		);
		this.dollyTo( distanceToFit, enableTransition );
		this.setFocalOffset( 0, 0, 0, enableTransition );

	}

	setLookAt(
		positionX: number, positionY: number, positionZ: number,
		targetX: number, targetY: number, targetZ: number,
		enableTransition: boolean = false,
	): void {

		const position = _v3A.set( positionX, positionY, positionZ );
		const target = _v3B.set( targetX, targetY, targetZ );

		this._targetEnd.copy( target );
		this._sphericalEnd.setFromVector3( position.sub( target ).applyQuaternion( this._yAxisUpSpace ) );
		this.normalizeRotations();

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		this._needsUpdate = true;

	}

	lerpLookAt(
		positionAX: number, positionAY: number, positionAZ: number,
		targetAX: number, targetAY: number, targetAZ: number,
		positionBX: number, positionBY: number, positionBZ: number,
		targetBX: number, targetBY: number, targetBZ: number,
		t: number,
		enableTransition: boolean = false,
	): void {

		const positionA = _v3A.set( positionAX, positionAY, positionAZ );
		const targetA = _v3B.set( targetAX, targetAY, targetAZ );
		_sphericalA.setFromVector3( positionA.sub( targetA ).applyQuaternion( this._yAxisUpSpace ) );

		const targetB = _v3A.set( targetBX, targetBY, targetBZ );
		this._targetEnd.copy( targetA ).lerp( targetB, t ); // tricky

		const positionB = _v3B.set( positionBX, positionBY, positionBZ );
		_sphericalB.setFromVector3( positionB.sub( targetB ).applyQuaternion( this._yAxisUpSpace ) );

		const deltaTheta  = _sphericalB.theta  - _sphericalA.theta;
		const deltaPhi    = _sphericalB.phi    - _sphericalA.phi;
		const deltaRadius = _sphericalB.radius - _sphericalA.radius;

		this._sphericalEnd.set(
			_sphericalA.radius + deltaRadius * t,
			_sphericalA.phi    + deltaPhi    * t,
			_sphericalA.theta  + deltaTheta  * t,
		);

		this.normalizeRotations();

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		this._needsUpdate = true;

	}

	setPosition( positionX: number, positionY: number, positionZ: number, enableTransition: boolean = false ): void {

		this.setLookAt(
			positionX, positionY, positionZ,
			this._targetEnd.x, this._targetEnd.y, this._targetEnd.z,
			enableTransition,
		);

	}

	setTarget( targetX: number, targetY: number, targetZ: number, enableTransition: boolean = false ): void {

		const pos = this.getPosition( _v3A );
		this.setLookAt(
			pos.x, pos.y, pos.z,
			targetX, targetY, targetZ,
			enableTransition,
		);

	}

	setFocalOffset( x: number, y: number, z: number, enableTransition: boolean = false ): void {

		this._focalOffsetEnd.set( x, y, z );

		if ( ! enableTransition ) {

			this._focalOffset.copy( this._focalOffsetEnd );

		}

		this._needsUpdate = true;

	}

	setBoundary( box3: _THREE.Box3 ): void {

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

	setViewport( viewportOrX: _THREE.Vector4 | number | null, y: number, width: number, height: number ): void {

		if ( viewportOrX === null ) { // null

			this._viewport = null;

			return;

		}

		this._viewport = this._viewport as _THREE.Vector4 || new THREE.Vector4() as _THREE.Vector4;

		if ( typeof viewportOrX === 'number' ) { // number

			this._viewport.set( viewportOrX, y, width, height );

		} else { // Vector4

			this._viewport.copy( viewportOrX );

		}

	}

	getDistanceToFitBox( width: number, height: number, depth: number ): number {

		if ( notSupportedInOrthographicCamera( this._camera, 'getDistanceToFit' ) ) return this._spherical.radius;

		const camera = this._camera as _THREE.PerspectiveCamera;
		const boundingRectAspect = width / height;
		const fov = camera.getEffectiveFOV() * THREE.MathUtils.DEG2RAD;
		const aspect = camera.aspect;

		const heightToFit = boundingRectAspect < aspect ? height : width / aspect;
		return heightToFit * 0.5 / Math.tan( fov * 0.5 ) + depth * 0.5;

	}

	/**
	 * @deprecated getDistanceToFit() has been renamed to getDistanceToFitBox()
	 */
	getDistanceToFit( width: number, height: number, depth: number ): number {

		console.warn( 'camera-controls: getDistanceToFit() has been renamed to getDistanceToFitBox()' );
		return this.getDistanceToFitBox( width, height, depth );

	}

	getDistanceToFitSphere( radius: number ): number {

		if ( notSupportedInOrthographicCamera( this._camera, 'getDistanceToFitSphere' ) ) return this._spherical.radius;

		// https://stackoverflow.com/a/44849975
		const camera = this._camera as _THREE.PerspectiveCamera;
		const vFOV = camera.getEffectiveFOV() * THREE.MathUtils.DEG2RAD;
		const hFOV = Math.atan( Math.tan( vFOV * 0.5 ) * camera.aspect ) * 2;
		const fov = 1 < camera.aspect ? vFOV : hFOV;
		return radius / ( Math.sin( fov * 0.5 ) );

	}

	getTarget( out: _THREE.Vector3 ): _THREE.Vector3 {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3() as _THREE.Vector3;
		return _out.copy( this._targetEnd );

	}

	getPosition( out: _THREE.Vector3 ): _THREE.Vector3 {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3() as _THREE.Vector3;
		return _out.setFromSpherical( this._sphericalEnd ).applyQuaternion( this._yAxisUpSpaceInverse ).add( this._targetEnd );

	}

	getFocalOffset( out: _THREE.Vector3 ): _THREE.Vector3 {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3() as _THREE.Vector3;
		return _out.copy( this._focalOffsetEnd );

	}

	normalizeRotations(): void {

		this._sphericalEnd.theta = this._sphericalEnd.theta % PI_2;
		if ( this._sphericalEnd.theta < 0 ) this._sphericalEnd.theta += PI_2;
		this._spherical.theta += PI_2 * Math.round( ( this._sphericalEnd.theta - this._spherical.theta ) / PI_2 );

	}

	reset( enableTransition: boolean = false ): void {

		this.setLookAt(
			this._position0.x, this._position0.y, this._position0.z,
			this._target0.x, this._target0.y, this._target0.z,
			enableTransition,
		);
		this.setFocalOffset(
			this._focalOffset0.x,
			this._focalOffset0.y,
			this._focalOffset0.z,
			enableTransition,
		);
		this.zoomTo( this._zoom0, enableTransition );

	}

	saveState(): void {

		this._target0.copy( this._target );
		this._position0.copy( this._camera.position );
		this._zoom0 = this._zoom;

	}

	updateCameraUp(): void {

		this._yAxisUpSpace.setFromUnitVectors( this._camera.up, _AXIS_Y );
		this._yAxisUpSpaceInverse.copy( this._yAxisUpSpace ).inverse();

	}

	update( delta: number ): boolean {

		const dampingFactor = this._state === ACTION.NONE ? this.dampingFactor : this.draggingDampingFactor;
		const lerpRatio = 1.0 - Math.exp( - dampingFactor * delta * FPS_60 );

		const deltaTheta  = this._sphericalEnd.theta  - this._spherical.theta;
		const deltaPhi    = this._sphericalEnd.phi    - this._spherical.phi;
		const deltaRadius = this._sphericalEnd.radius - this._spherical.radius;
		const deltaTarget = _v3A.subVectors( this._targetEnd, this._target );
		const deltaOffset = _v3B.subVectors( this._focalOffsetEnd, this._focalOffset );

		if (
			! approxZero( deltaTheta    ) ||
			! approxZero( deltaPhi      ) ||
			! approxZero( deltaRadius   ) ||
			! approxZero( deltaTarget.x ) ||
			! approxZero( deltaTarget.y ) ||
			! approxZero( deltaTarget.z ) ||
			! approxZero( deltaOffset.x ) ||
			! approxZero( deltaOffset.y ) ||
			! approxZero( deltaOffset.z )
		) {

			this._spherical.set(
				this._spherical.radius + deltaRadius * lerpRatio,
				this._spherical.phi    + deltaPhi    * lerpRatio,
				this._spherical.theta  + deltaTheta  * lerpRatio,
			);

			this._target.add( deltaTarget.multiplyScalar( lerpRatio ) );
			this._focalOffset.add( deltaOffset.multiplyScalar( lerpRatio ) );

			this._needsUpdate = true;

		} else {

			this._spherical.copy( this._sphericalEnd );
			this._target.copy( this._targetEnd );
			this._focalOffset.copy( this._focalOffsetEnd );

		}

		if ( this._dollyControlAmount !== 0 ) {

			if ( ( this._camera as _THREE.PerspectiveCamera ).isPerspectiveCamera ) {

				const camera = this._camera as _THREE.PerspectiveCamera;
				const direction = _v3A.setFromSpherical( this._sphericalEnd ).applyQuaternion( this._yAxisUpSpaceInverse ).normalize().negate();
				const planeX = _v3B.copy( direction ).cross( camera.up ).normalize();
				if ( planeX.lengthSq() === 0 ) planeX.x = 1.0;
				const planeY = _v3C.crossVectors( planeX, direction );
				const worldToScreen = this._sphericalEnd.radius * Math.tan( camera.getEffectiveFOV() * THREE.MathUtils.DEG2RAD * 0.5 );
				const prevRadius = this._sphericalEnd.radius - this._dollyControlAmount;
				const lerpRatio = ( prevRadius - this._sphericalEnd.radius ) / this._sphericalEnd.radius;
				const cursor = _v3A.copy( this._targetEnd )
					.add( planeX.multiplyScalar( this._dollyControlCoord.x * worldToScreen * camera.aspect ) )
					.add( planeY.multiplyScalar( this._dollyControlCoord.y * worldToScreen ) );
				this._targetEnd.lerp( cursor, lerpRatio );
				this._target.copy( this._targetEnd );

			}

			this._dollyControlAmount = 0;

		}

		const maxDistance = this._collisionTest();
		this._spherical.radius = Math.min( this._spherical.radius, maxDistance );

		// decompose spherical to the camera position
		this._spherical.makeSafe();
		this._camera.position.setFromSpherical( this._spherical ).applyQuaternion( this._yAxisUpSpaceInverse ).add( this._target );
		this._camera.lookAt( this._target );

		// set offset after the orbit movement
		const affectOffset =
			! approxZero( this._focalOffset.x ) ||
			! approxZero( this._focalOffset.y ) ||
			! approxZero( this._focalOffset.z );

		if ( affectOffset ) {

			this._camera.updateMatrix();
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

		// zoom
		const zoomDelta = this._zoomEnd - this._zoom;
		this._zoom += zoomDelta * lerpRatio;

		if ( this._camera.zoom !== this._zoom ) {

			if ( approxZero( zoomDelta ) ) this._zoom = this._zoomEnd;

			this._camera.zoom = this._zoom;
			this._camera.updateProjectionMatrix();
			this._updateNearPlaneCorners();

			this._needsUpdate = true;

		}

		const updated = this._needsUpdate;

		if ( updated && ! this._updatedLastTime ) {

			this.dispatchEvent( { type: 'wake' } );
			this.dispatchEvent( { type: 'update' } );

		} else if ( updated ) {

			this.dispatchEvent( { type: 'update' } );

		} else if ( ! updated && this._updatedLastTime ) {

			this.dispatchEvent( { type: 'sleep' } );

		}

		this._updatedLastTime = updated;
		this._needsUpdate = false;
		return updated;

	}

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
			dampingFactor        : this.dampingFactor,
			draggingDampingFactor: this.draggingDampingFactor,
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
		this.dampingFactor         = obj.dampingFactor;
		this.draggingDampingFactor = obj.draggingDampingFactor;
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

	dispose(): void {

		this._removeAllEventListeners();

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

		if ( ( this._camera as any ).isPerspectiveCamera )  {

			const camera = this._camera as _THREE.PerspectiveCamera;
			const near = camera.near;
			const fov = camera.getEffectiveFOV() * THREE.MathUtils.DEG2RAD;
			const heightHalf = Math.tan( fov * 0.5 ) * near; // near plain half height
			const widthHalf = heightHalf * camera.aspect; // near plain half width
			this._nearPlaneCorners[ 0 ].set( - widthHalf, - heightHalf, 0 );
			this._nearPlaneCorners[ 1 ].set(   widthHalf, - heightHalf, 0 );
			this._nearPlaneCorners[ 2 ].set(   widthHalf,   heightHalf, 0 );
			this._nearPlaneCorners[ 3 ].set( - widthHalf,   heightHalf, 0 );

		} else if ( ( this._camera as any ).isOrthographicCamera ) {

			const camera = this._camera as _THREE.OrthographicCamera;
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

	// lateUpdate
	protected _collisionTest(): number {

		let distance = Infinity;

		const hasCollider = this.colliderMeshes.length >= 1;
		if ( ! hasCollider ) return distance;

		if ( notSupportedInOrthographicCamera( this._camera, '_collisionTest' ) ) return distance;

		distance = this._spherical.radius;
		// divide by distance to normalize, lighter than `Vector3.prototype.normalize()`
		const direction = _v3A.setFromSpherical( this._spherical ).divideScalar( distance );

		_rotationMatrix.lookAt( _ORIGIN, direction, this._camera.up );

		for ( let i = 0; i < 4; i ++ ) {

			const nearPlaneCorner = _v3B.copy( this._nearPlaneCorners[ i ] );
			nearPlaneCorner.applyMatrix4( _rotationMatrix );

			const origin = _v3C.addVectors( this._target, nearPlaneCorner );
			_raycaster.set( origin, direction );
			_raycaster.far = distance;

			const intersects = _raycaster.intersectObjects( this.colliderMeshes );

			if ( intersects.length !== 0 && intersects[ 0 ].distance < distance ) {

				distance = intersects[ 0 ].distance;

			}

		}

		return distance;

	}

	/**
	 * Get its client rect and package into given `THREE.Vector4` .
	 */
	protected _getClientRect( target: _THREE.Vector4 ): _THREE.Vector4 {

		const rect = this._domElement.getBoundingClientRect();

		target.x = rect.left;
		target.y = rect.top;

		if ( this._viewport ) {

			target.x += this._viewport.x;
			target.y += rect.height - this._viewport.w - this._viewport.y;
			target.z = this._viewport.z;
			target.w = this._viewport.w;

		} else {

			target.z = rect.width;
			target.w = rect.height;

		}

		return target;

	}

	protected _removeAllEventListeners(): void {}

}

function createBoundingSphere( object3d: _THREE.Object3D, out: _THREE.Sphere ): _THREE.Sphere {

	const boundingSphere = out;
	const center = boundingSphere.center;

	// find the center
	object3d.traverse( ( object ) => {

		if ( ! ( object as _THREE.Mesh ).isMesh ) return;

		_box3A.expandByObject( object );

	} );
	_box3A.getCenter( center );

	// find the radius
	let maxRadiusSq = 0;
	object3d.traverse( ( object ) => {

		if ( ! ( object as _THREE.Mesh ).isMesh ) return;

		const mesh = ( object as _THREE.Mesh );
		const geometry = mesh.geometry.clone();
		geometry.applyMatrix4( mesh.matrixWorld );

		if ( ( mesh.geometry as _THREE.BufferGeometry ).isBufferGeometry ) {

			const bufferGeometry = geometry as _THREE.BufferGeometry;
			const position = bufferGeometry.attributes.position as _THREE.BufferAttribute;

			for ( let i = 0, l = position.count; i < l; i ++ ) {

				_v3A.fromBufferAttribute( position, i );
				maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( _v3A ) );

			}

		} else {

			const vertices = ( geometry as _THREE.Geometry ).vertices;

			for ( let i = 0, l = vertices.length; i < l; i ++ ) {

				maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( vertices[ i ] ) );

			}

		}

	} );

	boundingSphere.radius = Math.sqrt( maxRadiusSq );
	return boundingSphere;

}
