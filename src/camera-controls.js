import { EventDispatcher } from './event-dispatcher';

let THREE;
let _v2;
let _v3A;
let _v3B;
let _v3C;
let _xColumn;
let _yColumn;
let _sphericalA;
let _sphericalB;
const EPSILON = 0.001;
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
		_xColumn = new THREE.Vector3();
		_yColumn = new THREE.Vector3();
		_sphericalA = new THREE.Spherical();
		_sphericalB = new THREE.Spherical();

	}

	constructor( object, domElement, options = {} ) {

		super();

		this.object = object;
		this.enabled = true;
		this._state = STATE.NONE;

		// How far you can dolly in and out ( PerspectiveCamera only )
		this.minDistance = 0;
		this.maxDistance = Infinity;

		// How far you can zoom in and out ( OrthographicCamera only )
		this.minZoom = 0;
		this.maxZoom = Infinity;

		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians
		this.minAzimuthAngle = - Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians
		this.dampingFactor = 0.05;
		this.draggingDampingFactor = 0.25;
		this.dollySpeed = 1.0;
		this.truckSpeed = 2.0;
		this.dollyToCursor = false;
		this.verticalDragToForward = false;

		this.domElement = domElement;

		// the location of focus, where the object orbits around
		this._target = new THREE.Vector3();
		this._targetEnd = new THREE.Vector3();

		// rotation
		this._spherical = new THREE.Spherical();
		this._spherical.setFromVector3( this.object.position );
		this._sphericalEnd = new THREE.Spherical().copy( this._spherical );

		// reset
		this._target0 = this._target.clone();
		this._position0 = this.object.position.clone();
		this._zoom0 = this.object.zoom;

		this._dollyControlAmount = 0;
		this._dollyControlCoord = new THREE.Vector2();
		this._needsUpdate = true;
		this.update();

		if ( ! this.domElement || options.ignoreDOMEventListeners ) {

			this._removeAllEventListeners = () => {};

		} else {

			const scope = this;
			const dragStart  = new THREE.Vector2();
			const dollyStart = new THREE.Vector2();
			let elementRect;

			this.domElement.addEventListener( 'mousedown', onMouseDown );
			this.domElement.addEventListener( 'touchstart', onTouchStart );
			this.domElement.addEventListener( 'wheel', onMouseWheel );
			this.domElement.addEventListener( 'contextmenu', onContextMenu );

			this._removeAllEventListeners = () => {

				scope.domElement.removeEventListener( 'mousedown', onMouseDown );
				scope.domElement.removeEventListener( 'touchstart', onTouchStart );
				scope.domElement.removeEventListener( 'wheel', onMouseWheel );
				scope.domElement.removeEventListener( 'contextmenu', onContextMenu );
				document.removeEventListener( 'mousemove', dragging );
				document.removeEventListener( 'touchmove', dragging );
				document.removeEventListener( 'mouseup', endDragging );
				document.removeEventListener( 'touchend', endDragging );

			};

			function extractClientCoordFromEvent( event, out ) {

				out.set( 0, 0 );

				if ( event.touches ) {

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

					elementRect = scope.domElement.getBoundingClientRect();
					x = ( event.clientX - elementRect.left ) / elementRect.width *   2 - 1;
					y = ( event.clientY - elementRect.top ) / elementRect.height * - 2 + 1;

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

				elementRect = scope.domElement.getBoundingClientRect();
				dragStart.copy( _v2 );

				if ( scope._state === STATE.TOUCH_DOLLY_TRUCK ) {

					// 2 finger pinch
					const dx = _v2.x - event.touches[ 1 ].pageX;
					const dy = _v2.y - event.touches[ 1 ].pageY;
					const distance = Math.sqrt( dx * dx + dy * dy );

					dollyStart.set( 0, distance );

					// center coords of 2 finger truck
					const x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) * 0.5;
					const y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) * 0.5;

					dragStart.set( x, y );

				}

				document.addEventListener( 'mousemove', dragging, { passive: false } );
				document.addEventListener( 'touchmove', dragging, { passive: false } );
				document.addEventListener( 'mouseup', endDragging );
				document.addEventListener( 'touchend', endDragging );

				scope.dispatchEvent( {
					type: 'controlstart',
					// x: _v2.x,
					// y: _v2.y,
					// state: scope._state,
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

						const rotX = 2 * Math.PI * deltaX / elementRect.width;
						const rotY = 2 * Math.PI * deltaY / elementRect.height;
						scope.rotate( rotX, rotY, true );
						break;

					case STATE.DOLLY:
						// not implemented
						break;

					case STATE.TOUCH_DOLLY_TRUCK:

						const dx = _v2.x - event.touches[ 1 ].pageX;
						const dy = _v2.y - event.touches[ 1 ].pageY;
						const distance = Math.sqrt( dx * dx + dy * dy );
						const dollyDelta = dollyStart.y - distance;

						const touchDollyFactor = 8;

						const dollyX = scope.dollyToCursor ? ( dragStart.x - elementRect.left ) / elementRect.width  *   2 - 1 : 0;
						const dollyY = scope.dollyToCursor ? ( dragStart.y - elementRect.top  ) / elementRect.height * - 2 + 1 : 0;
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
					// x: _v2.x,
					// y: _v2.y,
					// deltaX,
					// deltaY,
					// state: scope._state,
					originalEvent: event,
				} );

			}

			function endDragging( event ) {

				if ( ! scope.enabled ) return;

				scope._state = STATE.NONE;

				document.removeEventListener( 'mousemove', dragging );
				document.removeEventListener( 'touchmove', dragging );
				document.removeEventListener( 'mouseup', endDragging );
				document.removeEventListener( 'touchend', endDragging );

				scope.dispatchEvent( {
					type: 'controlend',
					// state: scope._state,
					originalEvent: event,
				} );

			}

			function truckInternal( deltaX, deltaY ) {

				if ( scope.object.isPerspectiveCamera ) {

					const offset = _v3A.copy( scope.object.position ).sub( scope._target );
					// half of the fov is center to top of screen
					const fovInRad = scope.object.fov * THREE.Math.DEG2RAD;
					const targetDistance = offset.length() * Math.tan( ( fovInRad / 2 ) );
					const truckX    = ( scope.truckSpeed * deltaX * targetDistance / elementRect.height );
					const pedestalY = ( scope.truckSpeed * deltaY * targetDistance / elementRect.height );
					if ( scope.verticalDragToForward ) {

						scope.truck( truckX, 0, true );
						scope.forward( - pedestalY, true );

					} else {

						scope.truck( truckX, pedestalY, true );

					}

				} else if ( scope.object.isOrthographicCamera ) {

					// orthographic
					const truckX    = deltaX * ( scope.object.right - scope.object.left   ) / scope.object.zoom / elementRect.width;
					const pedestalY = deltaY * ( scope.object.top   - scope.object.bottom ) / scope.object.zoom / elementRect.height;
					scope.truck( truckX, pedestalY, true );

				}

			}

			function dollyInternal( delta, x, y ) {

				const dollyScale = Math.pow( 0.95, - delta * scope.dollySpeed );

				if ( scope.object.isPerspectiveCamera ) {

					const distance = scope._sphericalEnd.radius * dollyScale - scope._sphericalEnd.radius;
					const prevRadius = scope._sphericalEnd.radius;

					scope.dolly( distance );

					if ( scope.dollyToCursor ) {

						scope._dollyControlAmount += scope._sphericalEnd.radius - prevRadius;
						scope._dollyControlCoord.set( x, y );

					}



				} else if ( scope.object.isOrthographicCamera ) {

					scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
					scope.object.updateProjectionMatrix();
					scope._needsUpdate = true;

				}

			}

		}

	}

	// rotX in radian
	// rotY in radian
	rotate( rotX, rotY, enableTransition ) {

		this.rotateTo(
			this._sphericalEnd.theta + rotX,
			this._sphericalEnd.phi   + rotY,
			enableTransition
		);

	}

	// rotX in radian
	// rotY in radian
	rotateTo( rotX, rotY, enableTransition ) {

		const theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, rotX ) );
		const phi   = Math.max( this.minPolarAngle,   Math.min( this.maxPolarAngle,   rotY ) );

		this._sphericalEnd.theta = theta;
		this._sphericalEnd.phi   = phi;
		this._sphericalEnd.makeSafe();

		if ( ! enableTransition ) {

			this._spherical.theta = this._sphericalEnd.theta;
			this._spherical.phi   = this._sphericalEnd.phi;

		}

		this._needsUpdate = true;

	}

	dolly( distance, enableTransition ) {

		if ( this.object.isOrthographicCamera ) {

			console.warn( 'dolly is not available for OrthographicCamera' );
			return;

		}

		this.dollyTo( this._sphericalEnd.radius + distance, enableTransition );

	}

	dollyTo( distance, enableTransition ) {

		if ( this.object.isOrthographicCamera ) {

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

		this._needsUpdate = true;

	}

	pan( x, y, enableTransition ) {

		console.log( '`pan` has been renamed to `truck`' );
		this.truck( x, y, enableTransition );

	}

	truck( x, y, enableTransition ) {

		this.object.updateMatrix();

		_xColumn.setFromMatrixColumn( this.object.matrix, 0 );
		_yColumn.setFromMatrixColumn( this.object.matrix, 1 );
		_xColumn.multiplyScalar(   x );
		_yColumn.multiplyScalar( - y );

		const offset = _v3A.copy( _xColumn ).add( _yColumn );
		this._targetEnd.add( offset );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		this._needsUpdate = true;

	}

	forward( distance, enableTransition ) {

		_v3A.setFromMatrixColumn( this.object.matrix, 0 );
		_v3A.crossVectors( this.object.up, _v3A );
		_v3A.multiplyScalar( distance );

		this._targetEnd.add( _v3A );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		this._needsUpdate = true;

	}

	moveTo( x, y, z, enableTransition ) {

		this._targetEnd.set( x, y, z );

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );

		}

		this._needsUpdate = true;

	}

	fitTo( objectOrBox3, enableTransition, options = {} ) {

		if ( this.object.isOrthographicCamera ) {

			console.warn( 'fitTo is not supported for OrthographicCamera' );
			return;

		}

		const paddingLeft = options.paddingLeft || 0;
		const paddingRight = options.paddingRight || 0;
		const paddingBottom = options.paddingBottom || 0;
		const paddingTop = options.paddingTop || 0;

		const boundingBox = objectOrBox3.isBox3 ? objectOrBox3.clone() : new THREE.Box3().setFromObject( objectOrBox3 );
		const size = boundingBox.getSize( _v3A );
		const boundingWidth  = size.x + paddingLeft + paddingRight;
		const boundingHeight = size.y + paddingTop + paddingBottom;
		const boundingDepth = size.z;

		const distance = this.getDistanceToFit( boundingWidth, boundingHeight, boundingDepth );
		this.dollyTo( distance, enableTransition );

		const boundingBoxCenter = boundingBox.getCenter( _v3A );
		const cx = boundingBoxCenter.x - ( paddingLeft * 0.5 - paddingRight * 0.5 );
		const cy = boundingBoxCenter.y + ( paddingTop * 0.5 - paddingBottom * 0.5 );
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

		this._needsUpdate = true;

	}

	lerpLookAt(
		positionAX, positionAY, positionAZ,
		targetAX, targetAY, targetAZ,
		positionBX, positionBY, positionBZ,
		targetBX, targetBY, targetBZ,
		x, enableTransition
	) {

		const positionA = _v3A.set( positionAX, positionAY, positionAZ );
		const targetA = _v3B.set( targetAX, targetAY, targetAZ );
		_sphericalA.setFromVector3( positionA.sub( targetA ) );

		const targetB = _v3A.set( targetBX, targetBY, targetBZ );
		this._targetEnd.copy( targetA ).lerp( targetB, x ); // tricky

		const positionB = _v3B.set( positionBX, positionBY, positionBZ );
		_sphericalB.setFromVector3( positionB.sub( targetB ) );

		const deltaTheta  = _sphericalB.theta  - _sphericalA.theta;
		const deltaPhi    = _sphericalB.phi    - _sphericalA.phi;
		const deltaRadius = _sphericalB.radius - _sphericalA.radius;

		this._sphericalEnd.set(
			_sphericalA.radius + deltaRadius * x,
			_sphericalA.phi    + deltaPhi    * x,
			_sphericalA.theta  + deltaTheta  * x
		);

		this._sanitizeSphericals();

		if ( ! enableTransition ) {

			this._target.copy( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		this._needsUpdate = true;

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

	getDistanceToFit( width, height, depth ) {

		const camera = this.object;
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
		this._position0.copy( this.object.position );
		this._zoom0 = this.object.zoom;

	}

	update( delta ) {

		// var offset = new THREE.Vector3();
		// var quat = new THREE.Quaternion().setFromUnitVectors( this.object.up, new THREE.Vector3( 0, 1, 0 ) );
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

			this._needsUpdate = true;

		} else {

			this._spherical.copy( this._sphericalEnd );
			this._target.copy( this._targetEnd );

		}

		if ( this._dollyControlAmount !== 0 ) {

			if ( this.object.isPerspectiveCamera ) {

				const direction = _v3A.copy( _v3A.setFromSpherical( this._sphericalEnd ) ).normalize().negate();
				const planeX = _v3B.copy( direction ).cross( _v3C.set( 0.0, 1.0, 0.0 ) ).normalize();
				const planeY = _v3C.crossVectors( planeX, direction );
				const worldToScreen = this._sphericalEnd.radius * Math.tan( this.object.fov / 360.0 * Math.PI );
				const prevRadius = this._sphericalEnd.radius - this._dollyControlAmount;
				const lerpRatio = ( prevRadius - this._sphericalEnd.radius ) / this._sphericalEnd.radius;
				const cursor = this._targetEnd.clone()
					.add( planeX.multiplyScalar( this._dollyControlCoord.x * worldToScreen * this.object.aspect ) )
					.add( planeY.multiplyScalar( this._dollyControlCoord.y * worldToScreen ) );
				this._targetEnd.lerp( cursor, lerpRatio );
				this._target.copy( this._targetEnd );

			}

			this._dollyControlAmount = 0;

		}

		this._spherical.makeSafe();
		this.object.position.setFromSpherical( this._spherical ).add( this._target );
		this.object.lookAt( this._target );

		const updated = this._needsUpdate;
		this._needsUpdate = false;

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
			position             : this.object.position.toArray(),

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

		this._needsUpdate = true;

	}

	dispose() {

		this._removeAllEventListeners();

	}

	_sanitizeSphericals() {

		this._sphericalEnd.theta = this._sphericalEnd.theta % ( 2 * Math.PI );
		this._spherical.theta += 2 * Math.PI * Math.round(
			( this._sphericalEnd.theta - this._spherical.theta ) / ( 2 * Math.PI )
		);

	}

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
