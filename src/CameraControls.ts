import * as _THREE from 'three';
import {
	ACTION,
	MouseButtons,
	Touches,
	FitToOption,
} from './types';
import {
	PI_2,
	FPS_60,
	FIT_TO_OPTION_DEFAULT,
} from './constants';
import {
	approxZero,
	infinityToMaxNumber,
	maxNumberToInfinity,
} from './utils/math-utils';
import { isTouchEvent } from './utils/isTouchEvent';
import { extractClientCoordFromEvent } from './utils/extractClientCoordFromEvent';
import { notSupportedInOrthographicCamera } from './utils/notSupportedInOrthographicCamera';
import { EventDispatcher } from './EventDispatcher';

////////////////////////////////////////////////////////////////////////////////
// IMPORTANT NOTICE
//
// DO NOT USE `_THREE` to make instances, call functions, etc.
// `_THREE` is exclusively for types.
// Otherwise the bundle file will contain three.js.
////////////////////////////////////////////////////////////////////////////////
const isMac: boolean = /Mac/.test( navigator.platform );
const readonlyACTION = Object.freeze( ACTION );

let THREE: any;
let _ORIGIN: _THREE.Vector3;
let _AXIS_Y: _THREE.Vector3;
let _v2: _THREE.Vector2;
let _v3A: _THREE.Vector3;
let _v3B: _THREE.Vector3;
let _v3C: _THREE.Vector3;
let _xColumn: _THREE.Vector3;
let _yColumn: _THREE.Vector3;
let _sphericalA: _THREE.Spherical;
let _sphericalB: _THREE.Spherical;
let _rotationMatrix: _THREE.Matrix4;
let _raycaster: _THREE.Raycaster;

export class CameraControls extends EventDispatcher {

	static install( libs: any ): void {

		THREE = libs.THREE;
		_ORIGIN = Object.freeze( new THREE.Vector3( 0, 0, 0 ) );
		_AXIS_Y = Object.freeze( new THREE.Vector3( 0, 1, 0 ) );
		_v2 = new THREE.Vector2();
		_v3A = new THREE.Vector3();
		_v3B = new THREE.Vector3();
		_v3C = new THREE.Vector3();
		_xColumn = new THREE.Vector3();
		_yColumn = new THREE.Vector3();
		_sphericalA = new THREE.Spherical();
		_sphericalB = new THREE.Spherical();
		_rotationMatrix = new THREE.Matrix4();
		_raycaster = new THREE.Raycaster();

	}

	static get ACTION(): Readonly<typeof ACTION> {

		return readonlyACTION;

	}

	enabled = true;

	minPolarAngle = 0; // radians
	maxPolarAngle = Math.PI; // radians
	minAzimuthAngle = - Infinity; // radians
	maxAzimuthAngle = Infinity; // radians

	// How far you can dolly in and out ( PerspectiveCamera only )
	minDistance = 0;
	maxDistance = Infinity;

	minZoom = 0.01;
	maxZoom = Infinity;

	dampingFactor = 0.05;
	draggingDampingFactor = 0.25;
	azimuthRotateSpeed = 1.0;
	polarRotateSpeed = 1.0;
	dollySpeed = 1.0;
	truckSpeed = 2.0;
	dollyToCursor = false;
	verticalDragToForward = false;

	boundaryFriction = 0.0;

	colliderMeshes: _THREE.Object3D[] = [];

	// button configs
	mouseButtons: MouseButtons;
	touches: Touches;

	protected _camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera;
	protected _yAxisUpSpace: _THREE.Quaternion;
	protected _yAxisUpSpaceInverse: _THREE.Quaternion;
	protected _state: ACTION = ACTION.NONE;

	protected _domElement: HTMLElement;
	protected _viewport: _THREE.Vector4 | null = null;

	// the location of focus, where the object orbits around
	protected _target: _THREE.Vector3;
	protected _targetEnd: _THREE.Vector3;

	// rotation and dolly distance
	protected _spherical: _THREE.Spherical;
	protected _sphericalEnd: _THREE.Spherical;

	protected _zoom: number;
	protected _zoomEnd: number;

	// reset
	protected _target0: _THREE.Vector3;
	protected _position0: _THREE.Vector3;
	protected _zoom0: number;

	protected _dollyControlAmount = 0;
	protected _dollyControlCoord: _THREE.Vector2;

	// collisionTest uses nearPlane. ( PerspectiveCamera only )
	protected _nearPlaneCorners: _THREE.Vector3[];

	protected _boundary: _THREE.Box3;
	protected _boundaryEnclosesCamera = false;

	protected _hasUpdated = true;

	constructor(
		camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera,
		domElement: HTMLElement,
	) {

		super();

		this._camera = camera;
		this._yAxisUpSpace = new THREE.Quaternion().setFromUnitVectors( this._camera.up, _AXIS_Y );
		this._yAxisUpSpaceInverse = this._yAxisUpSpace.clone().inverse();
		this._state = ACTION.NONE;

		this._domElement = domElement;
		// this._viewport = new THREE.Vector4();

		// the location
		this._target = new THREE.Vector3();
		this._targetEnd = this._target.clone();

		// rotation
		this._spherical = new THREE.Spherical().setFromVector3( this._camera.position.clone().applyQuaternion( this._yAxisUpSpace ) );
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

		this._dollyControlAmount = 0;
		this._dollyControlCoord = new THREE.Vector2();

		// configs
		this.mouseButtons = {
			left: ACTION.ROTATE,
			middle: ACTION.DOLLY,
			right: ACTION.TRUCK,
			wheel:
				( this._camera as THREE.PerspectiveCamera ).isPerspectiveCamera ? ACTION.DOLLY :
				( this._camera as THREE.OrthographicCamera ).isOrthographicCamera ? ACTION.ZOOM :
				ACTION.NONE,
			// We can also add shiftLeft, altLeft and etc if someone wants...
		};

		this.touches = {
			one: ACTION.TOUCH_ROTATE,
			two:
				( this._camera as THREE.PerspectiveCamera ).isPerspectiveCamera ? ACTION.TOUCH_DOLLY_TRUCK :
				( this._camera as THREE.OrthographicCamera ).isOrthographicCamera ? ACTION.TOUCH_ZOOM_TRUCK :
				ACTION.NONE,
			three: ACTION.TOUCH_TRUCK,
		};

		if ( this._domElement ) {

			const scope = this;
			const dragStartPosition  = new THREE.Vector2();
			const lastDragPosition  = new THREE.Vector2();
			const dollyStart = new THREE.Vector2();
			const elementRect = new THREE.Vector4();

			const truckInternal = ( deltaX: number, deltaY: number ): void => {

				if ( ( scope._camera as _THREE.PerspectiveCamera ).isPerspectiveCamera ) {

					const camera = scope._camera as _THREE.PerspectiveCamera;

					const offset = _v3A.copy( camera.position ).sub( scope._target );
					// half of the fov is center to top of screen
					const fov = camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
					const targetDistance = offset.length() * Math.tan( fov * 0.5 );
					const truckX    = ( scope.truckSpeed * deltaX * targetDistance / elementRect.w );
					const pedestalY = ( scope.truckSpeed * deltaY * targetDistance / elementRect.w );
					if ( scope.verticalDragToForward ) {

						scope.truck( truckX, 0, true );
						scope.forward( - pedestalY, true );

					} else {

						scope.truck( truckX, pedestalY, true );

					}

				} else if ( ( scope._camera as _THREE.OrthographicCamera ).isOrthographicCamera ) {

					// orthographic
					const camera = scope._camera as _THREE.OrthographicCamera;
					const truckX    = deltaX * ( camera.right - camera.left   ) / camera.zoom / elementRect.z;
					const pedestalY = deltaY * ( camera.top   - camera.bottom ) / camera.zoom / elementRect.w;
					scope.truck( truckX, pedestalY, true );

				}

			};

			const dollyInternal = ( delta: number, x: number, y : number ): void => {

				const dollyScale = Math.pow( 0.95, - delta * scope.dollySpeed );
				const distance = scope._sphericalEnd.radius * dollyScale;
				const prevRadius = scope._sphericalEnd.radius;

				scope.dollyTo( distance );

				if ( scope.dollyToCursor ) {

					scope._dollyControlAmount += scope._sphericalEnd.radius - prevRadius;
					scope._dollyControlCoord.set( x, y );

				}

				return;

			};

			const zoomInternal = ( delta: number /* , x: number, y: number */ ): void => {

				const zoomScale = Math.pow( 0.95, delta * scope.dollySpeed );

				// for both PerspectiveCamera and OrthographicCamera
				scope.zoomTo( scope._zoom * zoomScale );
				return;

			};

			const onMouseDown = ( event: MouseEvent ): void => {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				const prevState = scope._state;

				switch ( event.button ) {

					case THREE.MOUSE.LEFT:

						scope._state = scope.mouseButtons.left;
						break;

					case THREE.MOUSE.MIDDLE:

						scope._state = scope.mouseButtons.middle;
						break;

					case THREE.MOUSE.RIGHT:

						scope._state = scope.mouseButtons.right;
						break;

				}

				if ( prevState !== scope._state ) {

					startDragging( event );

				}

			};

			const onTouchStart = ( event:TouchEvent ): void => {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				const prevState = scope._state;

				switch ( event.touches.length ) {

					case 1:

						scope._state = scope.touches.one;
						break;

					case 2:

						scope._state = scope.touches.two;
						break;

					case 3:

						scope._state = scope.touches.three;
						break;

				}

				if ( prevState !== scope._state ) {

					startDragging( event );

				}

			};

			const onMouseWheel = ( event: WheelEvent ): void => {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				// Ref: https://github.com/cedricpinson/osgjs/blob/00e5a7e9d9206c06fdde0436e1d62ab7cb5ce853/sources/osgViewer/input/source/InputSourceMouse.js#L89-L103
				const deltaYFactor = isMac ? - 1 : - 3;

				const delta = ( event.deltaMode === 1 ) ? event.deltaY / deltaYFactor : event.deltaY / ( deltaYFactor * 10 );

				let x = 0;
				let y = 0;

				if ( scope.dollyToCursor ) {

					scope._getClientRect( elementRect );
					x = ( event.clientX - elementRect.x ) / elementRect.z *   2 - 1;
					y = ( event.clientY - elementRect.y ) / elementRect.w * - 2 + 1;

				}

				switch ( scope.mouseButtons.wheel ) {

					case ACTION.DOLLY: {

						dollyInternal( - delta, x, y );
						break;

					}
					case ACTION.ZOOM: {

						zoomInternal( - delta /*, x, y */ );
						break;

					}

				}

				scope.dispatchEvent( {
					type: 'control',
					originalEvent: event,
				} );

			};

			const onContextMenu = ( event: Event ): void => {

				if ( ! scope.enabled ) return;

				event.preventDefault();

			};

			const startDragging = ( event: Event ): void => {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				extractClientCoordFromEvent( event, _v2 );

				scope._getClientRect( elementRect );
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
				document.addEventListener( 'touchmove', dragging );
				document.addEventListener( 'mouseup', endDragging );
				document.addEventListener( 'touchend', endDragging );

				scope.dispatchEvent( {
					type: 'controlstart',
					originalEvent: event,
				} );

			};

			const dragging = ( event: Event ): void => {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				extractClientCoordFromEvent( event, _v2 );

				const deltaX = lastDragPosition.x - _v2.x;
				const deltaY = lastDragPosition.y - _v2.y;

				lastDragPosition.copy( _v2 );

				switch ( scope._state ) {

					case ACTION.ROTATE:
					case ACTION.TOUCH_ROTATE: {

						const theta = PI_2 * scope.azimuthRotateSpeed * deltaX / elementRect.w; // divide by *height* to refer the resolution
						const phi   = PI_2 * scope.polarRotateSpeed   * deltaY / elementRect.w;
						scope.rotate( theta, phi, true );
						break;

					}
					case ACTION.DOLLY:
					case ACTION.ZOOM: {

						const dollyX = scope.dollyToCursor ? ( dragStartPosition.x - elementRect.x ) / elementRect.z *   2 - 1 : 0;
						const dollyY = scope.dollyToCursor ? ( dragStartPosition.y - elementRect.y ) / elementRect.w * - 2 + 1 : 0;
						scope._state === ACTION.DOLLY ?
							dollyInternal( deltaY / 8, dollyX, dollyY ) :
							zoomInternal( deltaY / 8 /*, dollyX, dollyY */ );
						break;

					}

					case ACTION.TOUCH_DOLLY:
					case ACTION.TOUCH_ZOOM:
					case ACTION.TOUCH_DOLLY_TRUCK:
					case ACTION.TOUCH_ZOOM_TRUCK: {

						const TOUCH_DOLLY_FACTOR = 8;
						const touchEvent = event as TouchEvent;
						const dx = _v2.x - touchEvent.touches[ 1 ].clientX;
						const dy = _v2.y - touchEvent.touches[ 1 ].clientY;
						const distance = Math.sqrt( dx * dx + dy * dy );
						const dollyDelta = dollyStart.y - distance;
						dollyStart.set( 0, distance );

						const dollyX = scope.dollyToCursor ? ( lastDragPosition.x - elementRect.x ) / elementRect.z *   2 - 1 : 0;
						const dollyY = scope.dollyToCursor ? ( lastDragPosition.y - elementRect.y ) / elementRect.w * - 2 + 1 : 0;

						scope._state === ACTION.TOUCH_DOLLY ||
						scope._state === ACTION.TOUCH_DOLLY_TRUCK ?
							dollyInternal( dollyDelta / TOUCH_DOLLY_FACTOR, dollyX, dollyY ) :
							zoomInternal( dollyDelta / TOUCH_DOLLY_FACTOR /*, dollyX, dollyY */ );

						if (
							scope._state === ACTION.TOUCH_DOLLY_TRUCK ||
							scope._state === ACTION.TOUCH_ZOOM_TRUCK
						) {

							truckInternal( deltaX, deltaY );

						}

						break;

					}

					case ACTION.TRUCK:
					case ACTION.TOUCH_TRUCK: {

						truckInternal( deltaX, deltaY );
						break;

					}

				}

				scope.dispatchEvent( {
					type: 'control',
					originalEvent: event,
				} );

			};

			const endDragging = ( event: Event ): void => {

				if ( ! scope.enabled ) return;

				scope._state = ACTION.NONE;

				// @ts-ignore
				document.removeEventListener( 'mousemove', dragging );
				// @ts-ignore
				document.removeEventListener( 'touchmove', dragging );
				document.removeEventListener( 'mouseup',  endDragging );
				document.removeEventListener( 'touchend', endDragging );

				scope.dispatchEvent( {
					type: 'controlend',
					originalEvent: event,
				} );

			};

			this._domElement.addEventListener( 'mousedown', onMouseDown );
			this._domElement.addEventListener( 'touchstart', onTouchStart );
			this._domElement.addEventListener( 'wheel', onMouseWheel );
			this._domElement.addEventListener( 'contextmenu', onContextMenu );

			this._removeAllEventListeners = (): void => {

				scope._domElement.removeEventListener( 'mousedown', onMouseDown );
				scope._domElement.removeEventListener( 'touchstart', onTouchStart );
				scope._domElement.removeEventListener( 'wheel', onMouseWheel );
				scope._domElement.removeEventListener( 'contextmenu', onContextMenu );
				document.removeEventListener( 'mousemove', dragging );
				document.removeEventListener( 'touchmove', dragging );
				document.removeEventListener( 'mouseup', endDragging );
				document.removeEventListener( 'touchend', endDragging );

			};

		}

		this.update( 0 );

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
		this._hasUpdated = true;

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

		const theta = THREE.Math.clamp( azimuthAngle, this.minAzimuthAngle, this.maxAzimuthAngle );
		const phi   = THREE.Math.clamp( polarAngle,   this.minPolarAngle,   this.maxPolarAngle );

		this._sphericalEnd.theta = theta;
		this._sphericalEnd.phi   = phi;
		this._sphericalEnd.makeSafe();

		if ( ! enableTransition ) {

			this._spherical.theta = this._sphericalEnd.theta;
			this._spherical.phi   = this._sphericalEnd.phi;

		}

		this._hasUpdated = true;

	}

	dolly( distance: number, enableTransition: boolean = false ): void {

		this.dollyTo( this._sphericalEnd.radius - distance, enableTransition );

	}

	dollyTo( distance: number, enableTransition: boolean = false ): void {

		if ( notSupportedInOrthographicCamera( this._camera, 'dolly' ) ) return;

		this._sphericalEnd.radius = THREE.Math.clamp( distance, this.minDistance, this.maxDistance );

		if ( ! enableTransition ) {

			this._spherical.radius = this._sphericalEnd.radius;

		}

		this._hasUpdated = true;

	}

	zoom( zoomStep: number, enableTransition: boolean = false ): void {

		this.zoomTo( this._zoomEnd + zoomStep, enableTransition );

	}

	zoomTo( zoom: number, enableTransition: boolean = false ): void {

		this._zoomEnd = THREE.Math.clamp( zoom, this.minZoom, this.maxZoom );

		if ( ! enableTransition ) {

			this._zoom = this._zoomEnd;

		}

		this._hasUpdated = true;

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

		this._hasUpdated = true;

	}

	forward( distance: number, enableTransition: boolean = false ): void {

		_v3A.setFromMatrixColumn( this._camera.matrix, 0 );
		_v3A.crossVectors( this._camera.up, _v3A );
		_v3A.multiplyScalar( distance );

		this._encloseToBoundary( this._targetEnd, _v3A, this.boundaryFriction );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		this._hasUpdated = true;

	}

	moveTo( x: number, y: number, z: number, enableTransition: boolean = false ): void {

		this._targetEnd.set( x, y, z );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		this._hasUpdated = true;

	}

	fitTo( box3OrObject: _THREE.Box3, enableTransition: boolean, options: FitToOption = FIT_TO_OPTION_DEFAULT ): void {

		if ( notSupportedInOrthographicCamera( this._camera, 'fitTo' ) ) return;

		const paddingLeft   = options.paddingLeft   || 0;
		const paddingRight  = options.paddingRight  || 0;
		const paddingBottom = options.paddingBottom || 0;
		const paddingTop    = options.paddingTop    || 0;

		// TODO `Box3.isBox3: boolean` is missing in three.js. waiting for next update of three.js.
		// see this PR: https://github.com/mrdoob/three.js/pull/18259
		const boundingBox = ( box3OrObject as any ).isBox3 ? box3OrObject.clone() : new THREE.Box3().setFromObject( box3OrObject );
		const size = boundingBox.getSize( _v3A );
		const boundingWidth  = size.x + paddingLeft + paddingRight;
		const boundingHeight = size.y + paddingTop  + paddingBottom;
		const boundingDepth  = size.z;

		const distance = this.getDistanceToFit( boundingWidth, boundingHeight, boundingDepth );
		this.dollyTo( distance, enableTransition );

		const boundingBoxCenter = boundingBox.getCenter( _v3A );
		const cx = boundingBoxCenter.x - ( paddingLeft * 0.5 - paddingRight  * 0.5 );
		const cy = boundingBoxCenter.y + ( paddingTop  * 0.5 - paddingBottom * 0.5 );
		const cz = boundingBoxCenter.z;
		this.moveTo( cx, cy, cz, enableTransition );

		this.normalizeRotations();
		this.rotateTo( 0, 90 * THREE.Math.DEG2RAD, enableTransition );

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

		this._hasUpdated = true;

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

		this._hasUpdated = true;

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

	setBoundary( box3: _THREE.Box3 ): void {

		if ( ! box3 ) {

			this._boundary.min.set( - Infinity, - Infinity, - Infinity );
			this._boundary.max.set(   Infinity,   Infinity,   Infinity );
			this._hasUpdated = true;

			return;

		}

		this._boundary.copy( box3 );
		this._boundary.clampPoint( this._targetEnd, this._targetEnd );
		this._hasUpdated = true;

	}

	setViewport( viewportOrX: _THREE.Vector4 | number | null, y: number, width: number, height: number ): void {

		if ( viewportOrX === null ) { // null

			this._viewport = null;

			return;

		}

		this._viewport = this._viewport as _THREE.Vector4 || new THREE.Vector4();

		if ( typeof viewportOrX === 'number' ) { // number

			this._viewport.set( viewportOrX, y, width, height );

		} else { // Vector4

			this._viewport.copy( viewportOrX );

		}

	}

	getDistanceToFit( width: number, height: number, depth: number ): number {

		if ( notSupportedInOrthographicCamera( this._camera, 'getDistanceToFit' ) ) return this._spherical.radius;

		const camera = this._camera as _THREE.PerspectiveCamera;
		const boundingRectAspect = width / height;
		const fov = camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
		const aspect = camera.aspect;

		const heightToFit = boundingRectAspect < aspect ? height : width / aspect;
		return heightToFit * 0.5 / Math.tan( fov * 0.5 ) + depth * 0.5;

	}

	getTarget( out: _THREE.Vector3 ): _THREE.Vector3 {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3();
		return _out.copy( this._targetEnd );

	}

	getPosition( out: _THREE.Vector3 ): _THREE.Vector3 {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3();
		return _out.setFromSpherical( this._sphericalEnd ).applyQuaternion( this._yAxisUpSpaceInverse ).add( this._targetEnd );

	}

	normalizeRotations(): void {

		this._sphericalEnd.theta = this._sphericalEnd.theta % PI_2;
		this._spherical.theta += PI_2 * Math.round( ( this._sphericalEnd.theta - this._spherical.theta ) / PI_2 );

	}

	reset( enableTransition: boolean = false ): void {

		this.setLookAt(
			this._position0.x, this._position0.y, this._position0.z,
			this._target0.x, this._target0.y, this._target0.z,
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

		if (
			! approxZero( deltaTheta    ) ||
			! approxZero( deltaPhi      ) ||
			! approxZero( deltaRadius   ) ||
			! approxZero( deltaTarget.x ) ||
			! approxZero( deltaTarget.y ) ||
			! approxZero( deltaTarget.z )
		) {

			this._spherical.set(
				this._spherical.radius + deltaRadius * lerpRatio,
				this._spherical.phi    + deltaPhi    * lerpRatio,
				this._spherical.theta  + deltaTheta  * lerpRatio,
			);

			this._target.add( deltaTarget.multiplyScalar( lerpRatio ) );

			this._hasUpdated = true;

		} else {

			this._spherical.copy( this._sphericalEnd );
			this._target.copy( this._targetEnd );

		}

		if ( this._dollyControlAmount !== 0 ) {

			if ( ( this._camera as _THREE.PerspectiveCamera ).isPerspectiveCamera ) {

				const camera = this._camera as _THREE.PerspectiveCamera;
				const direction = _v3A.setFromSpherical( this._sphericalEnd ).applyQuaternion( this._yAxisUpSpaceInverse ).normalize().negate();
				const planeX = _v3B.copy( direction ).cross( camera.up ).normalize();
				if ( planeX.lengthSq() === 0 ) planeX.x = 1.0;
				const planeY = _v3C.crossVectors( planeX, direction );
				const worldToScreen = this._sphericalEnd.radius * Math.tan( camera.getEffectiveFOV() * THREE.Math.DEG2RAD * 0.5 );
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

		if ( this._boundaryEnclosesCamera ) {

			this._encloseToBoundary(
				this._camera.position.copy( this._target ),
				_v3A.setFromSpherical( this._spherical ).applyQuaternion( this._yAxisUpSpaceInverse ),
				1.0
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

			this._hasUpdated = true;

		}

		const updated = this._hasUpdated;
		this._hasUpdated = false;

		if ( updated ) this.dispatchEvent( { type: 'update' } );
		return updated;

	}

	toJSON() {

		return JSON.stringify( {
			enabled              : this.enabled,

			minDistance          : this.minDistance,
			maxDistance          : infinityToMaxNumber( this.maxDistance ),
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
			position             : this._camera.position.toArray(),

			target0              : this._target0.toArray(),
			position0            : this._position0.toArray(),
		} );

	}

	fromJSON( json: any, enableTransition: boolean = false ): void {

		const obj = JSON.parse( json );
		const position = new THREE.Vector3().fromArray( obj.position );

		this.enabled               = obj.enabled;

		this.minDistance           = obj.minDistance;
		this.maxDistance           = maxNumberToInfinity( obj.maxDistance );
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

		this._targetEnd.fromArray( obj.target );
		this._sphericalEnd.setFromVector3( position.sub( this._target0 ).applyQuaternion( this._yAxisUpSpace ) );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		this._hasUpdated = true;

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

		if ( notSupportedInOrthographicCamera( this._camera, '_updateNearPlaneCorners' ) ) return;

		const camera = this._camera as _THREE.PerspectiveCamera;
		const near = camera.near;
		const fov = camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
		const heightHalf = Math.tan( fov * 0.5 ) * near; // near plain half height
		const widthHalf = heightHalf * camera.aspect; // near plain half width
		this._nearPlaneCorners = [
			new THREE.Vector3( - widthHalf, - heightHalf, 0 ),
			new THREE.Vector3(   widthHalf, - heightHalf, 0 ),
			new THREE.Vector3(   widthHalf,   heightHalf, 0 ),
			new THREE.Vector3( - widthHalf,   heightHalf, 0 ),
		];

	}

	// lateUpdate
	protected _collisionTest(): number {

		let distance = Infinity;

		if ( notSupportedInOrthographicCamera( this._camera, '_collisionTest' ) ) return distance;

		const hasCollider = this.colliderMeshes.length >= 1;

		if ( ! hasCollider ) return distance;

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
