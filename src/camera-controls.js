import { EventDispatcher } from './event-dispatcher';

let THREE;
let _v2;
let _v3A;
let _v3B;
let _v3C;
let _v4;
let _xColumn;
let _yColumn;
let _sphericalA;
let _sphericalB;
const EPSILON = 0.001;
const PI_2 = Math.PI * 2;
const STATE = {
	NONE              : - 1,
	ROTATE            :   0,
	DOLLY             :   1,
	TRUCK             :   2,
	TOUCH_ROTATE      :   3,
	TOUCH_DOLLY_TRUCK :   4,
	TOUCH_TRUCK       :   5,
};

export default class CameraControls extends EventDispatcher {

	static install( libs ) {

		THREE = libs.THREE;
		_v2 = new THREE.Vector2();
		_v3A = new THREE.Vector3();
		_v3B = new THREE.Vector3();
		_v3C = new THREE.Vector3();
		_v4 = new THREE.Vector4();
		_xColumn = new THREE.Vector3();
		_yColumn = new THREE.Vector3();
		_sphericalA = new THREE.Spherical();
		_sphericalB = new THREE.Spherical();

	}

	constructor( camera, domElement, options = {} ) {

		super();

		this._camera = camera;
		this._state = STATE.NONE;
		this.enabled = true;

		if ( this._camera.isPerspectiveCamera ) {

			// How far you can dolly in and out ( PerspectiveCamera only )
			this.minDistance = 0;
			this.maxDistance = Infinity;

		} else if ( this._camera.isOrthographicCamera ) {

			// How far you can zoom in and out ( OrthographicCamera only )
			this.minZoom = 0;
			this.maxZoom = Infinity;

		}

		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians
		this.minAzimuthAngle = - Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians

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
		this._targetEnd = new THREE.Vector3();

		// rotation
		this._spherical = new THREE.Spherical().setFromVector3( this._camera.position );
		this._sphericalEnd = this._spherical.clone();

		// reset
		this._target0 = this._target.clone();
		this._position0 = this._camera.position.clone();
		this._zoom0 = this._camera.zoom;

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
			let elementRect;

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

			function onMouseDown( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				const prevState = scope._state;

				switch ( event.button ) {

					case THREE.MOUSE.LEFT:

						scope._state = STATE.ROTATE;
						break;

					case THREE.MOUSE.MIDDLE:

						scope._state = STATE.DOLLY;
						break;

					case THREE.MOUSE.RIGHT:

						scope._state = STATE.TRUCK;
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

					case 1:	// one-fingered touch: rotate

						scope._state = STATE.TOUCH_ROTATE;
						break;

					case 2:	// two-fingered touch: dolly

						scope._state = STATE.TOUCH_DOLLY_TRUCK;
						break;

					case 3: // three-fingered touch: truck

						scope._state = STATE.TOUCH_TRUCK;
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
				const deltaYFactor = navigator.platform.indexOf( 'Mac' ) === 0 ? - 1 : - 3;

				let delta;

				if ( event.wheelDelta !== undefined ) {

					delta = event.wheelDelta / mouseDeltaFactor;

				} else if ( event.deltaMode === 1 ) {

					delta = event.deltaY / deltaYFactor;

				} else {

					delta = event.deltaY / ( 10 * deltaYFactor );

				}

				let x, y;

				if ( scope.dollyToCursor ) {

					elementRect = scope._getClientRect( _v4 );
					x = ( event.clientX - elementRect.x ) / elementRect.z *   2 - 1;
					y = ( event.clientY - elementRect.y ) / elementRect.w * - 2 + 1;

				}

				dollyInternal( - delta, x, y );

			}

			function onContextMenu( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

			}

			function startDragging( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				extractClientCoordFromEvent( event, _v2 );

				elementRect = scope._getClientRect( _v4 );
				dragStart.copy( _v2 );

				if ( scope._state === STATE.TOUCH_DOLLY_TRUCK ) {

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

					case STATE.ROTATE:
					case STATE.TOUCH_ROTATE:
						const theta = PI_2 * scope.azimuthRotateSpeed * deltaX / elementRect.z;
						const phi   = PI_2 * scope.polarRotateSpeed   * deltaY / elementRect.w;
						scope.rotate( theta, phi, true );
						break;

					case STATE.DOLLY:
						// not implemented
						break;

					case STATE.TOUCH_DOLLY_TRUCK:

						const dx = _v2.x - event.touches[ 1 ].clientX;
						const dy = _v2.y - event.touches[ 1 ].clientY;
						const distance = Math.sqrt( dx * dx + dy * dy );
						const dollyDelta = dollyStart.y - distance;

						const touchDollyFactor = 8;

						const dollyX = scope.dollyToCursor ? ( dragStart.x - elementRect.x ) / elementRect.z *   2 - 1 : 0;
						const dollyY = scope.dollyToCursor ? ( dragStart.y - elementRect.y ) / elementRect.w * - 2 + 1 : 0;
						dollyInternal( dollyDelta / touchDollyFactor, dollyX, dollyY );

						dollyStart.set( 0, distance );
						truckInternal( deltaX, deltaY );
						break;

					case STATE.TRUCK:
					case STATE.TOUCH_TRUCK:

						truckInternal( deltaX, deltaY );
						break;

				}

				scope.dispatchEvent( {
					type: 'control',
					originalEvent: event,
				} );

			}

			function endDragging( event ) {

				if ( ! scope.enabled ) return;

				scope._state = STATE.NONE;

				document.removeEventListener( 'mousemove', dragging );
				document.removeEventListener( 'touchmove', dragging );
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
					const fovInRad = scope._camera.fov * THREE.Math.DEG2RAD;
					const targetDistance = offset.length() * Math.tan( ( fovInRad / 2 ) );
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

				if ( scope._camera.isPerspectiveCamera ) {

					const distance = scope._sphericalEnd.radius * dollyScale - scope._sphericalEnd.radius;
					const prevRadius = scope._sphericalEnd.radius;

					scope.dolly( distance );

					if ( scope.dollyToCursor ) {

						scope._dollyControlAmount += scope._sphericalEnd.radius - prevRadius;
						scope._dollyControlCoord.set( x, y );

					}



				} else if ( scope._camera.isOrthographicCamera ) {

					scope._camera.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope._camera.zoom * dollyScale ) );
					scope._camera.updateProjectionMatrix();
					scope._hasUpdated = true;

				}

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

		const theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, azimuthAngle ) );
		const phi   = Math.max( this.minPolarAngle,   Math.min( this.maxPolarAngle,   polarAngle ) );

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

		if ( this._camera.isOrthographicCamera ) {

			console.warn( 'dolly is not available for OrthographicCamera' );
			return;

		}

		this.dollyTo( this._sphericalEnd.radius + distance, enableTransition );

	}

	dollyTo( distance, enableTransition ) {

		if ( this._camera.isOrthographicCamera ) {

			console.warn( 'dolly is not available for OrthographicCamera' );
			return;

		}

		this._sphericalEnd.radius = THREE.Math.clamp(
			distance,
			this.minDistance,
			this.maxDistance
		);

		if ( ! enableTransition ) {

			this._spherical.radius = this._sphericalEnd.radius;

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

		this._sanitizeSphericals();
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
		this._sphericalEnd.setFromVector3( position.sub( target ) );
		this._sanitizeSphericals();

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
		_sphericalA.setFromVector3( positionA.sub( targetA ) );

		const targetB = _v3A.set( targetBX, targetBY, targetBZ );
		this._targetEnd.copy( targetA ).lerp( targetB, t ); // tricky

		const positionB = _v3B.set( positionBX, positionBY, positionBZ );
		_sphericalB.setFromVector3( positionB.sub( targetB ) );

		const deltaTheta  = _sphericalB.theta  - _sphericalA.theta;
		const deltaPhi    = _sphericalB.phi    - _sphericalA.phi;
		const deltaRadius = _sphericalB.radius - _sphericalA.radius;

		this._sphericalEnd.set(
			_sphericalA.radius + deltaRadius * t,
			_sphericalA.phi    + deltaPhi    * t,
			_sphericalA.theta  + deltaTheta  * t
		);

		this._sanitizeSphericals();

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

		const camera = this._camera;
		const boundingRectAspect = width / height;
		const fov = camera.fov * THREE.Math.DEG2RAD;
		const aspect = camera.aspect;

		const heightToFit = boundingRectAspect < aspect ? height : width / aspect;
		return heightToFit * 0.5 / Math.tan( fov * 0.5 ) + depth * 0.5;

	}

	getTarget( out ) {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3();
		return _out.copy( this._targetEnd );

	}

	getPosition( out ) {

		const _out = !! out && out.isVector3 ? out : new THREE.Vector3();
		return _out.setFromSpherical( this._sphericalEnd ).add( this._targetEnd );

	}

	reset( enableTransition ) {

		this.setLookAt(
			this._position0.x, this._position0.y, this._position0.z,
			this._target0.x, this._target0.y, this._target0.z,
			enableTransition
		);

	}

	saveState() {

		this._target0.copy( this._target );
		this._position0.copy( this._camera.position );
		this._zoom0 = this._camera.zoom;

	}

	update( delta ) {

		// var offset = new THREE.Vector3();
		// var quat = new THREE.Quaternion().setFromUnitVectors( this._camera.up, new THREE.Vector3( 0, 1, 0 ) );
		// var quatInverse = quat.clone().inverse();

		const currentDampingFactor = this._state === STATE.NONE ? this.dampingFactor : this.draggingDampingFactor;
		const lerpRatio = 1.0 - Math.exp( - currentDampingFactor * delta / 0.016 );

		const deltaTheta  = this._sphericalEnd.theta  - this._spherical.theta;
		const deltaPhi    = this._sphericalEnd.phi    - this._spherical.phi;
		const deltaRadius = this._sphericalEnd.radius - this._spherical.radius;
		const deltaTarget = _v3A.subVectors( this._targetEnd, this._target );

		if (
			Math.abs( deltaTheta    ) > EPSILON ||
			Math.abs( deltaPhi      ) > EPSILON ||
			Math.abs( deltaRadius   ) > EPSILON ||
			Math.abs( deltaTarget.x ) > EPSILON ||
			Math.abs( deltaTarget.y ) > EPSILON ||
			Math.abs( deltaTarget.z ) > EPSILON
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

				const direction = _v3A.copy( _v3A.setFromSpherical( this._sphericalEnd ) ).normalize().negate();
				const planeX = _v3B.copy( direction ).cross( _v3C.set( 0.0, 1.0, 0.0 ) ).normalize();
				const planeY = _v3C.crossVectors( planeX, direction );
				const worldToScreen = this._sphericalEnd.radius * Math.tan( this._camera.fov * THREE.Math.DEG2RAD * 0.5 );
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

		this._spherical.makeSafe();
		this._camera.position.setFromSpherical( this._spherical ).add( this._target );
		this._camera.lookAt( this._target );

		if ( this._boundaryEnclosesCamera ) {

			this._encloseToBoundary(
				this._camera.position.copy( this._target ),
				_v3A.setFromSpherical( this._spherical ),
				1.0
			);

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
		this._sphericalEnd.setFromVector3( position.sub( this._target0 ) );

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

	_sanitizeSphericals() {

		this._sphericalEnd.theta = this._sphericalEnd.theta % ( PI_2 );
		this._spherical.theta += PI_2 * Math.round(
			( this._sphericalEnd.theta - this._spherical.theta ) / ( PI_2 )
		);

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

function isTouchEvent( event ) {

	return 'TouchEvent' in window && event instanceof TouchEvent;

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
