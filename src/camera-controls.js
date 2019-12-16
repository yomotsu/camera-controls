import { EventDispatcher } from './event-dispatcher';

const EPSILON = 1e-5;
const PI_2 = Math.PI * 2;
const FPS_60 = 1 / 0.016;
const ACTION = Object.freeze( {
	NONE             : 0,
	ROTATE           : 1,
	TRUCK            : 2,
	DOLLY            : 3,
	ZOOM             : 4,
	TOUCH_ROTATE     : 5,
	TOUCH_TRUCK      : 6,
	TOUCH_DOLLY      : 7,
	TOUCH_ZOOM       : 8,
	TOUCH_DOLLY_TRUCK: 9,
	TOUCH_ZOOM_TRUCK : 10,
} );

const isMac = /Mac/.test( navigator.platform );

let THREE;
let _ORIGIN;
let _AXIS_Y;
let _v2;
let _v3A;
let _v3B;
let _v3C;
let _xColumn;
let _yColumn;
let _sphericalA;
let _sphericalB;
let _rotationMatrix;
let _raycaster;

export default class CameraControls extends EventDispatcher {

	static install( libs ) {

		THREE = libs.THREE;
		_ORIGIN = new THREE.Vector3( 0, 0, 0 );
		_AXIS_Y = new THREE.Vector3( 0, 1, 0 );
		_v2 = new THREE.Vector2();
		_v3A = new THREE.Vector3();
		_v3B = new THREE.Vector3();
		_v3C = new THREE.Vector3();
		_xColumn = new THREE.Vector3();
		_yColumn = new THREE.Vector3();
		_sphericalA = new THREE.Spherical();
		_sphericalB = new THREE.Spherical();
		_rotationMatrix = new THREE.Matrix4();
		_raycaster      = new THREE.Raycaster();

	}

	static get ACTION() {

		return ACTION;

	};

	constructor( camera, domElement, options = {} ) {

		super();

		this._camera = camera;
		this._yAxisUpSpace = new THREE.Quaternion().setFromUnitVectors( this._camera.up, _AXIS_Y );
		this._yAxisUpSpaceInverse = this._yAxisUpSpace.clone().inverse();
		this._state = ACTION.NONE;
		this.enabled = true;

		if ( this._camera.isPerspectiveCamera ) {

			// How far you can dolly in and out ( PerspectiveCamera only )
			this.minDistance = 0;
			this.maxDistance = Infinity;

			// collisionTest uses nearPlane.
			this._nearPlaneCorners = [
				new THREE.Vector3(),
				new THREE.Vector3(),
				new THREE.Vector3(),
				new THREE.Vector3(),
			];
			this.updateNearPlaneCorners();
			this.unstable_colliderMeshes = [];

		}

		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians
		this.minAzimuthAngle = - Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians
		this.minZoom = 0.01;
		this.maxZoom = Infinity;

		// Target cannot move outside of this box
		this._boundary = new THREE.Box3(
			new THREE.Vector3( - Infinity, - Infinity, - Infinity ),
			new THREE.Vector3(   Infinity,   Infinity,   Infinity )
		);
		this.boundaryFriction = 0.0;
		this._boundaryEnclosesCamera = false;

		this.dampingFactor = 0.05;
		this.draggingDampingFactor = 0.25;
		this.azimuthRotateSpeed = 1.0;
		this.polarRotateSpeed = 1.0;
		this.dollySpeed = 1.0;
		this.truckSpeed = 2.0;
		this.dollyToCursor = false;
		this.verticalDragToForward = false;

		this._domElement = domElement;
		this._viewport = null;

		// the location of focus, where the object orbits around
		this._target = new THREE.Vector3();
		this._targetEnd = this._target.clone();

		// rotation
		this._spherical = new THREE.Spherical().setFromVector3( this._camera.position.clone().applyQuaternion( this._yAxisUpSpace ) );
		this._sphericalEnd = this._spherical.clone();

		this._zoom = this._camera.zoom;
		this._zoomEnd = this._zoom;

		this.mouseButtons = {
			left: ACTION.ROTATE,
			middle: ACTION.DOLLY,
			right: ACTION.TRUCK,
			wheel:
				this._camera.isPerspectiveCamera ? ACTION.DOLLY :
				this._camera.isOrthographicCamera ? ACTION.ZOOM :
				ACTION.NONE,
			// We can also add shiftLeft, altLeft and etc if someone wants...
		};

		this.touches = {
			one: ACTION.TOUCH_ROTATE,
			two:
				this._camera.isPerspectiveCamera ? ACTION.TOUCH_DOLLY_TRUCK :
				this._camera.isOrthographicCamera ? ACTION.TOUCH_ZOOM_TRUCK :
				ACTION.TOUCH_NONE,
			three: ACTION.TOUCH_TRUCK,
		};

		// reset
		this._target0 = this._target.clone();
		this._position0 = this._camera.position.clone();
		this._zoom0 = this._zoom;

		this._dollyControlAmount = 0;
		this._dollyControlCoord = new THREE.Vector2();
		this._hasUpdated = true;
		this.update( 0 );

		if ( ! this._domElement || options.ignoreDOMEventListeners ) {

			this._removeAllEventListeners = () => {};

		} else {

			const scope = this;
			const dragStart  = new THREE.Vector2();
			const dollyStart = new THREE.Vector2();
			const elementRect = new THREE.Vector4();

			this._domElement.addEventListener( 'mousedown', onMouseDown );
			this._domElement.addEventListener( 'touchstart', onTouchStart );
			this._domElement.addEventListener( 'wheel', onMouseWheel );
			this._domElement.addEventListener( 'contextmenu', onContextMenu );

			this._removeAllEventListeners = () => {

				scope._domElement.removeEventListener( 'mousedown', onMouseDown );
				scope._domElement.removeEventListener( 'touchstart', onTouchStart );
				scope._domElement.removeEventListener( 'wheel', onMouseWheel );
				scope._domElement.removeEventListener( 'contextmenu', onContextMenu );
				document.removeEventListener( 'mousemove', dragging );
				document.removeEventListener( 'touchmove', dragging );
				document.removeEventListener( 'mouseup', endDragging );
				document.removeEventListener( 'touchend', endDragging );

			};

			function onMouseDown( event ) {

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

			}

			function onTouchStart( event ) {

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

			}

			function onMouseWheel( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				// Ref: https://github.com/cedricpinson/osgjs/blob/00e5a7e9d9206c06fdde0436e1d62ab7cb5ce853/sources/osgViewer/input/source/InputSourceMouse.js#L89-L103
				const mouseDeltaFactor = 120;
				const deltaYFactor = isMac ? - 1 : - 3;

				const delta =
					( event.wheelDelta !== undefined ) ? event.wheelDelta / mouseDeltaFactor :
					( event.deltaMode === 1 ) ? event.deltaY / deltaYFactor :
					event.deltaY / ( deltaYFactor * 10 );

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

						zoomInternal( - delta, x, y );
						break;

					}

				}

				scope.dispatchEvent( {
					type: 'control',
					originalEvent: event,
				} );

			}

			function onContextMenu( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

			}

			function startDragging( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				extractClientCoordFromEvent( event, _v2 );

				scope._getClientRect( elementRect );
				dragStart.copy( _v2 );

				const isMultiTouch = isTouchEvent( event ) && event.touches.length >= 2;

				if ( isMultiTouch ) {

					// 2 finger pinch
					const dx = _v2.x - event.touches[ 1 ].clientX;
					const dy = _v2.y - event.touches[ 1 ].clientY;
					const distance = Math.sqrt( dx * dx + dy * dy );

					dollyStart.set( 0, distance );

					// center coords of 2 finger truck
					const x = ( event.touches[ 0 ].clientX + event.touches[ 1 ].clientX ) * 0.5;
					const y = ( event.touches[ 0 ].clientY + event.touches[ 1 ].clientY ) * 0.5;

					dragStart.set( x, y );

				}

				document.addEventListener( 'mousemove', dragging, { passive: false } );
				document.addEventListener( 'touchmove', dragging, { passive: false } );
				document.addEventListener( 'mouseup', endDragging );
				document.addEventListener( 'touchend', endDragging );

				scope.dispatchEvent( {
					type: 'controlstart',
					originalEvent: event,
				} );

			}

			function dragging( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				extractClientCoordFromEvent( event, _v2 );

				const deltaX = dragStart.x - _v2.x;
				const deltaY = dragStart.y - _v2.y;

				dragStart.copy( _v2 );

				switch ( scope._state ) {

					case ACTION.ROTATE:
					case ACTION.TOUCH_ROTATE: {

						const theta = PI_2 * scope.azimuthRotateSpeed * deltaX / elementRect.z;
						const phi   = PI_2 * scope.polarRotateSpeed   * deltaY / elementRect.w;
						scope.rotate( theta, phi, true );
						break;

					}
					case ACTION.DOLLY:
					case ACTION.ZOOM: {

						// not implemented
						break;

					}

					case ACTION.TOUCH_DOLLY:
					case ACTION.TOUCH_ZOOM:
					case ACTION.TOUCH_DOLLY_TRUCK:
					case ACTION.TOUCH_ZOOM_TRUCK: {

						const TOUCH_DOLLY_FACTOR = 8;
						const dx = _v2.x - event.touches[ 1 ].clientX;
						const dy = _v2.y - event.touches[ 1 ].clientY;
						const distance = Math.sqrt( dx * dx + dy * dy );
						const dollyDelta = dollyStart.y - distance;
						dollyStart.set( 0, distance );

						const dollyX = scope.dollyToCursor ? ( dragStart.x - elementRect.x ) / elementRect.z *   2 - 1 : 0;
						const dollyY = scope.dollyToCursor ? ( dragStart.y - elementRect.y ) / elementRect.w * - 2 + 1 : 0;

						switch ( scope._state ) {

							case ACTION.TOUCH_DOLLY:
							case ACTION.TOUCH_DOLLY_TRUCK: {

								dollyInternal( dollyDelta / TOUCH_DOLLY_FACTOR, dollyX, dollyY );
								break;

							}
							case ACTION.TOUCH_ZOOM:
							case ACTION.TOUCH_ZOOM_TRUCK: {

								zoomInternal( dollyDelta / TOUCH_DOLLY_FACTOR, dollyX, dollyY );
								break;

							}

						}

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

			}

			function endDragging( event ) {

				if ( ! scope.enabled ) return;

				scope._state = ACTION.NONE;

				document.removeEventListener( 'mousemove', dragging, { passive: false } );
				document.removeEventListener( 'touchmove', dragging, { passive: false } );
				document.removeEventListener( 'mouseup',  endDragging );
				document.removeEventListener( 'touchend', endDragging );

				scope.dispatchEvent( {
					type: 'controlend',
					originalEvent: event,
				} );

			}

			function truckInternal( deltaX, deltaY ) {

				if ( scope._camera.isPerspectiveCamera ) {

					const offset = _v3A.copy( scope._camera.position ).sub( scope._target );
					// half of the fov is center to top of screen
					const fov = scope._camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
					const targetDistance = offset.length() * Math.tan( fov * 0.5 );
					const truckX    = ( scope.truckSpeed * deltaX * targetDistance / elementRect.w );
					const pedestalY = ( scope.truckSpeed * deltaY * targetDistance / elementRect.w );
					if ( scope.verticalDragToForward ) {

						scope.truck( truckX, 0, true );
						scope.forward( - pedestalY, true );

					} else {

						scope.truck( truckX, pedestalY, true );

					}

				} else if ( scope._camera.isOrthographicCamera ) {

					// orthographic
					const truckX    = deltaX * ( scope._camera.right - scope._camera.left   ) / scope._camera.zoom / elementRect.z;
					const pedestalY = deltaY * ( scope._camera.top   - scope._camera.bottom ) / scope._camera.zoom / elementRect.w;
					scope.truck( truckX, pedestalY, true );

				}

			}

			function dollyInternal( delta, x, y ) {

				const dollyScale = Math.pow( 0.95, - delta * scope.dollySpeed );
				const distance = scope._sphericalEnd.radius * dollyScale;
				const prevRadius = scope._sphericalEnd.radius;

				scope.dollyTo( distance );

				if ( scope.dollyToCursor ) {

					scope._dollyControlAmount += scope._sphericalEnd.radius - prevRadius;
					scope._dollyControlCoord.set( x, y );

				}

				return;

			}

			function zoomInternal( delta, /* x, y */ ) {

				const zoomScale = Math.pow( 0.95, delta * scope.dollySpeed );

				// for both PerspectiveCamera and OrthographicCamera
				scope.zoomTo( scope._zoom * zoomScale );
				return;

			}

		}

	}

	// wrong. phi should be map to polar, but backward compatibility.
	set phiSpeed( speed ) {

		console.warn( 'phiSpeed was renamed. use azimuthRotateSpeed instead' );
		this.azimuthRotateSpeed = speed;

	}

	// wrong. theta should be map to azimuth, but backward compatibility.
	set thetaSpeed( speed ) {

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
	rotate( azimuthAngle, polarAngle, enableTransition ) {

		this.rotateTo(
			this._sphericalEnd.theta + azimuthAngle,
			this._sphericalEnd.phi   + polarAngle,
			enableTransition
		);

	}

	// azimuthAngle in radian
	// polarAngle in radian
	rotateTo( azimuthAngle, polarAngle, enableTransition ) {

		const theta = THREE.Math.clamp( azimuthAngle, this.minAzimuthAngle, this.maxAzimuthAngle );
		const phi   = THREE.Math.clamp( polarAngle,   this.minPolarAngle,   this.maxPolarAngle )

		this._sphericalEnd.theta = theta;
		this._sphericalEnd.phi   = phi;
		this._sphericalEnd.makeSafe();

		if ( ! enableTransition ) {

			this._spherical.theta = this._sphericalEnd.theta;
			this._spherical.phi   = this._sphericalEnd.phi;

		}

		this._hasUpdated = true;

	}

	dolly( distance, enableTransition ) {

		this.dollyTo( this._sphericalEnd.radius - distance, enableTransition );

	}

	dollyTo( distance, enableTransition ) {

		if ( this._camera.isOrthographicCamera ) {

			console.warn( 'dolly is not available for OrthographicCamera' );
			return;

		}

		this._sphericalEnd.radius = THREE.Math.clamp( distance, this.minDistance, this.maxDistance );

		if ( ! enableTransition ) {

			this._spherical.radius = this._sphericalEnd.radius;

		}

		this._hasUpdated = true;

	}

	zoom( zoomStep, enableTransition ) {

		this.zoomTo( this._zoomEnd + zoomStep, enableTransition );

	}

	zoomTo( zoom, enableTransition ) {

		this._zoomEnd = THREE.Math.clamp( zoom, this.minZoom, this.maxZoom );

		if ( ! enableTransition ) {

			this._zoom = this._zoomEnd;

		}

		this._hasUpdated = true;

	}

	pan( x, y, enableTransition ) {

		console.log( '`pan` has been renamed to `truck`' );
		this.truck( x, y, enableTransition );

	}

	truck( x, y, enableTransition ) {

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

	forward( distance, enableTransition ) {

		_v3A.setFromMatrixColumn( this._camera.matrix, 0 );
		_v3A.crossVectors( this._camera.up, _v3A );
		_v3A.multiplyScalar( distance );

		this._encloseToBoundary( this._targetEnd, _v3A, this.boundaryFriction );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		this._hasUpdated = true;

	}

	moveTo( x, y, z, enableTransition ) {

		this._targetEnd.set( x, y, z );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		this._hasUpdated = true;

	}

	fitTo( box3OrObject, enableTransition, options = {} ) {

		if ( this._camera.isOrthographicCamera ) {

			console.warn( 'fitTo is not supported for OrthographicCamera' );
			return;

		}

		const paddingLeft   = options.paddingLeft   || 0;
		const paddingRight  = options.paddingRight  || 0;
		const paddingBottom = options.paddingBottom || 0;
		const paddingTop    = options.paddingTop    || 0;

		const boundingBox = box3OrObject.isBox3 ? box3OrObject.clone() : new THREE.Box3().setFromObject( box3OrObject );
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
		positionX, positionY, positionZ,
		targetX, targetY, targetZ,
		enableTransition
	) {

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
		positionAX, positionAY, positionAZ,
		targetAX, targetAY, targetAZ,
		positionBX, positionBY, positionBZ,
		targetBX, targetBY, targetBZ,
		t, enableTransition
	) {

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
			_sphericalA.theta  + deltaTheta  * t
		);

		this.normalizeRotations();

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		this._hasUpdated = true;

	}

	setPosition( positionX, positionY, positionZ, enableTransition ) {

		this.setLookAt(
			positionX, positionY, positionZ,
			this._targetEnd.x, this._targetEnd.y, this._targetEnd.z,
			enableTransition
		);

	}

	setTarget( targetX, targetY, targetZ, enableTransition ) {

		const pos = this.getPosition( _v3A );
		this.setLookAt(
			pos.x, pos.y, pos.z,
			targetX, targetY, targetZ,
			enableTransition
		);

	}

	setBoundary( box3 ) {

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

	setViewport( viewportOrX, y, width, height ) {

		if ( viewportOrX === null ) { // null

			this._viewport = null;

			return;

		}

		this._viewport = this._viewport || new THREE.Vector4();

		if ( typeof viewportOrX === 'number' ) { // number

			this._viewport.set( viewportOrX, y, width, height );

		} else { // Vector4

			this._viewport.copy( viewportOrX );

		}

	}

	getDistanceToFit( width, height, depth ) {

		const boundingRectAspect = width / height;
		const fov = this._camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
		const aspect = this._camera.aspect;

		const heightToFit = boundingRectAspect < aspect ? height : width / aspect;
		return heightToFit * 0.5 / Math.tan( fov * 0.5 ) + depth * 0.5;

	}

	updateNearPlaneCorners() {

		if ( ! this._camera.isPerspectiveCamera ) return;

		const near = this._camera.near;
		const fov = this._camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
		const heightHalf = Math.tan( fov * 0.5 ) * near; // near plain half height
		const widthHalf = heightHalf * this._camera.aspect; // near plain half width
		this._nearPlaneCorners = [
			new THREE.Vector3( - widthHalf, - heightHalf, 0 ),
			new THREE.Vector3(   widthHalf, - heightHalf, 0 ),
			new THREE.Vector3(   widthHalf,   heightHalf, 0 ),
			new THREE.Vector3( - widthHalf,   heightHalf, 0 ),
		];

	}

	// lateUpdate
	collisionTest() {

		let distance = Infinity;
		const hasCollider = this.unstable_colliderMeshes.length >= 1;

		if ( ! this._camera.isPerspectiveCamera || ! hasCollider ) return distance;

		distance = this._sphericalEnd.radius;
		const direction = _v3A.setFromSpherical( this._spherical ).sub( this._target ).normalize();

		_rotationMatrix.lookAt( _ORIGIN, direction, this._camera.up );

		for ( let i = 0; i < 4; i ++ ) {

			const nearPlaneCorner = _v3B.copy( this._nearPlaneCorners[ i ] );
			nearPlaneCorner.applyMatrix4( _rotationMatrix );

			const origin = _v3C.addVectors( this._target, nearPlaneCorner );
			_raycaster.set( origin, direction );
			_raycaster.near = 0;// this._camera.near;
			_raycaster.far = distance;

			const intersects = _raycaster.intersectObjects( this.unstable_colliderMeshes );

			if ( intersects.length !== 0 && intersects[ 0 ].distance < distance ) {

				distance = intersects[ 0 ].distance;

			}

		}

		return distance;

	}

	getTarget( out ) {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3();
		return _out.copy( this._targetEnd );

	}

	getPosition( out ) {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3();
		return _out.setFromSpherical( this._sphericalEnd ).applyQuaternion( this._yAxisUpSpaceInverse ).add( this._targetEnd );

	}

	normalizeRotations() {

		this._sphericalEnd.theta = this._sphericalEnd.theta % ( PI_2 );
		this._spherical.theta += PI_2 * Math.round(
			( this._sphericalEnd.theta - this._spherical.theta ) / ( PI_2 )
		);

	}

	reset( enableTransition ) {

		this.setLookAt(
			this._position0.x, this._position0.y, this._position0.z,
			this._target0.x, this._target0.y, this._target0.z,
			enableTransition
		);
		this.zoomTo( this._zoom0, enableTransition );

	}

	saveState() {

		this._target0.copy( this._target );
		this._position0.copy( this._camera.position );
		this._zoom0 = this._zoom;

	}

	updateCameraUp() {

		this._yAxisUpSpace.setFromUnitVectors( this._camera.up, _AXIS_Y );
		this._yAxisUpSpaceInverse.copy( this._yAxisUpSpace ).inverse();

	}

	update( delta ) {

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
				this._spherical.theta  + deltaTheta  * lerpRatio
			);

			this._target.add( deltaTarget.multiplyScalar( lerpRatio ) );

			this._hasUpdated = true;

		} else {

			this._spherical.copy( this._sphericalEnd );
			this._target.copy( this._targetEnd );

		}

		if ( this._dollyControlAmount !== 0 ) {

			if ( this._camera.isPerspectiveCamera ) {

				const direction = _v3A.copy( _v3A.setFromSpherical( this._sphericalEnd ).applyQuaternion( this._yAxisUpSpaceInverse ) ).normalize().negate();
				const planeX = _v3B.copy( direction ).cross( _v3C.copy( this._camera.up ) ).normalize();
				if ( planeX.lengthSq() === 0 ) planeX.x = 1.0;
				const planeY = _v3C.crossVectors( planeX, direction );
				const worldToScreen = this._sphericalEnd.radius * Math.tan( this._camera.getEffectiveFOV() * THREE.Math.DEG2RAD * 0.5 );
				const prevRadius = this._sphericalEnd.radius - this._dollyControlAmount;
				const lerpRatio = ( prevRadius - this._sphericalEnd.radius ) / this._sphericalEnd.radius;
				const cursor = _v3A.copy( this._targetEnd )
					.add( planeX.multiplyScalar( this._dollyControlCoord.x * worldToScreen * this._camera.aspect ) )
					.add( planeY.multiplyScalar( this._dollyControlCoord.y * worldToScreen ) );
				this._targetEnd.lerp( cursor, lerpRatio );
				this._target.copy( this._targetEnd );

			}

			this._dollyControlAmount = 0;

		}

		const maxDistance = this.collisionTest();
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
			this.updateNearPlaneCorners();

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

	fromJSON( json, enableTransition ) {

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

	dispose() {

		this._removeAllEventListeners();

	}

	_encloseToBoundary( position, offset, friction ) {

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

	/**
	 * Get its client rect and package into given `THREE.Vector4` .
	 */
	_getClientRect( target ) {

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

}

function extractClientCoordFromEvent( event, out ) {

	out.set( 0, 0 );

	if ( isTouchEvent( event ) ) {

		for ( let i = 0; i < event.touches.length; i ++ ) {

			out.x += event.touches[ i ].clientX;
			out.y += event.touches[ i ].clientY;

		}

		out.x /= event.touches.length;
		out.y /= event.touches.length;
		return out;

	} else {

		out.set( event.clientX, event.clientY );
		return out;

	}

}

function isTouchEvent( event ) {

	return 'TouchEvent' in window && event instanceof TouchEvent;

}

function approxZero( number ) {

	return Math.abs( number ) < EPSILON;

}

function infinityToMaxNumber( value ) {

	if ( isFinite( value ) ) return value;

	if ( value < 0 ) return - Number.MAX_VALUE;

	return Number.MAX_VALUE;

}

function maxNumberToInfinity( value ) {

	if ( Math.abs( value ) < Number.MAX_VALUE ) return value;

	return value * Infinity;

}
