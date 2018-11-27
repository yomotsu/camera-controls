import { version } from '../package.json';

let THREE;
let _v3;
let _xColumn;
let _yColumn;
const EPSILON = 0.001;
const CONTROL_STATE = {
	NONE        : - 1,
	ROTATE      :   0,
	DOLLY       :   1,
	TRUCK       :   2,
	TOUCH_ROTATE:   3,
	TOUCH_DOLLY :   4,
	TOUCH_TRUCK :   5
};

export default class CameraControls {

	static install( libs ) {

		THREE = libs.THREE;
		_v3 = new THREE.Vector3();
		_xColumn = new THREE.Vector3();
		_yColumn = new THREE.Vector3();

	}

	constructor( object, domElement ) {

		this.object = object;
		this.enabled = true;

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
		this.verticalDragToForward = false;

		this.domElement = domElement;

		// the location of focus, where the object orbits around
		this.target = new THREE.Vector3();
		this._targetEnd = new THREE.Vector3();

		// rotation
		this._spherical = new THREE.Spherical();
		this._spherical.setFromVector3( this.object.position );
		this._sphericalEnd = new THREE.Spherical().copy( this._spherical );

		// reset
		this._defaultTarget = this.target.clone();
		this._defaultPosition = this.object.position.clone();
		this._defaultZoom = this.object.zoom;

		this._needsUpdate = true;
		this.update();

		if ( ! this.domElement ) {

			this.dispose = () => {};

		} else {

			const scope = this;
			const dragStart  = new THREE.Vector2();
			const dollyStart = new THREE.Vector2();
			let controlState = CONTROL_STATE.NONE;
			let elementRect;
			let savedDampingFactor;

			this.domElement.addEventListener( 'mousedown', onMouseDown );
			this.domElement.addEventListener( 'touchstart', onTouchStart );
			this.domElement.addEventListener( 'wheel', onMouseWheel );
			this.domElement.addEventListener( 'contextmenu', onContextMenu );

			this.dispose = () => {

				scope.domElement.removeEventListener( 'mousedown', onMouseDown );
				scope.domElement.removeEventListener( 'touchstart', onTouchStart );
				scope.domElement.removeEventListener( 'wheel', onMouseWheel );
				scope.domElement.removeEventListener( 'contextmenu', onContextMenu );
				document.removeEventListener( 'mousemove', dragging );
				document.removeEventListener( 'touchmove', dragging );
				document.removeEventListener( 'mouseup', endDragging );
				document.removeEventListener( 'touchend', endDragging );

			};

			function onMouseDown( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				const prevState = controlState;

				switch ( event.button ) {

					case THREE.MOUSE.LEFT:

						controlState = CONTROL_STATE.ROTATE;
						break;

					case THREE.MOUSE.MIDDLE:

						controlState = CONTROL_STATE.DOLLY;
						break;

					case THREE.MOUSE.RIGHT:

						controlState = CONTROL_STATE.TRUCK;
						break;

				}

				if ( prevState === CONTROL_STATE.NONE ) {

					startDragging( event );

				}

			}

			function onTouchStart( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				const prevState = controlState;

				switch ( event.touches.length ) {

					case 1:	// one-fingered touch: rotate

						controlState = CONTROL_STATE.TOUCH_ROTATE;
						break;

					case 2:	// two-fingered touch: dolly

						controlState = CONTROL_STATE.TOUCH_DOLLY;
						break;

					case 3: // three-fingered touch: truck

						controlState = CONTROL_STATE.TOUCH_TRUCK;
						break;

				}

				if ( prevState === CONTROL_STATE.NONE ) {

					startDragging( event );

				}

			}


			function onMouseWheel( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				if ( event.deltaY < 0 ) {

					dollyIn();

				} else if ( event.deltaY > 0 ) {

					dollyOut();

				}

			}

			function onContextMenu( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

			}

			function startDragging( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				const _event = !! event.touches ? event.touches[ 0 ] : event;
				const x = _event.clientX;
				const y = _event.clientY;

				elementRect = scope.domElement.getBoundingClientRect();
				dragStart.set( x, y );

				// if ( controlState === CONTROL_STATE.DOLLY ) {

				// 	dollyStart.set( x, y );

				// }

				if ( controlState === CONTROL_STATE.TOUCH_DOLLY ) {

					const dx = x - event.touches[ 1 ].pageX;
					const dy = y - event.touches[ 1 ].pageY;
					const distance = Math.sqrt( dx * dx + dy * dy );

					dollyStart.set( 0, distance );

				}

				savedDampingFactor = scope.dampingFactor;
				scope.dampingFactor = scope.draggingDampingFactor;

				document.addEventListener( 'mousemove', dragging, { passive: false } );
				document.addEventListener( 'touchmove', dragging, { passive: false } );
				document.addEventListener( 'mouseup', endDragging );
				document.addEventListener( 'touchend', endDragging );

			}

			function dragging( event ) {

				if ( ! scope.enabled ) return;

				event.preventDefault();

				const _event = !! event.touches ? event.touches[ 0 ] : event;
				const x = _event.clientX;
				const y = _event.clientY;

				const deltaX = dragStart.x - x;
				const deltaY = dragStart.y - y;

				dragStart.set( x, y );

				switch ( controlState ) {

					case CONTROL_STATE.ROTATE:
					case CONTROL_STATE.TOUCH_ROTATE:

						const rotX = 2 * Math.PI * deltaX / elementRect.width;
						const rotY = 2 * Math.PI * deltaY / elementRect.height;
						scope.rotate( rotX, rotY, true );
						break;

					case CONTROL_STATE.DOLLY:
						// not implemented
						break;

					case CONTROL_STATE.TOUCH_DOLLY:

						const dx = x - event.touches[ 1 ].pageX;
						const dy = y - event.touches[ 1 ].pageY;
						const distance = Math.sqrt( dx * dx + dy * dy );
						const dollyDelta = dollyStart.y - distance;

						if ( dollyDelta > 0 ) {

							dollyOut();

						} else if ( dollyDelta < 0 ) {

							dollyIn();

						}

						dollyStart.set( 0, distance );
						break;

					case CONTROL_STATE.TRUCK:
					case CONTROL_STATE.TOUCH_TRUCK:

						if ( scope.object.isPerspectiveCamera ) {

							const offset = _v3.copy( scope.object.position ).sub( scope.target );
							// half of the fov is center to top of screen
							const fovInRad = scope.object.fov * THREE.Math.DEG2RAD;
							const targetDistance = offset.length() * Math.tan( ( fovInRad / 2 ) );
							const truckX = ( scope.truckSpeed * deltaX * targetDistance / elementRect.height );
							const pedestalY = ( scope.truckSpeed * deltaY * targetDistance / elementRect.height );
							if ( scope.verticalDragToForward ) {

								scope.truck( truckX, 0, true );
								scope.forward( - pedestalY, true );

							} else {

								scope.truck( truckX, pedestalY, true );

							}
							break;

						} else if ( scope.object.isOrthographicCamera ) {

							// orthographic
							const truckX = deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / elementRect.width;
							const pedestalY = deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / elementRect.height;
							scope.truck( truckX, pedestalY, true );
							break;

						}

				}

			}

			function endDragging() {

				if ( ! scope.enabled ) return;

				scope.dampingFactor = savedDampingFactor;
				controlState = CONTROL_STATE.NONE;

				document.removeEventListener( 'mousemove', dragging );
				document.removeEventListener( 'touchmove', dragging );
				document.removeEventListener( 'mouseup', endDragging );
				document.removeEventListener( 'touchend', endDragging );

			}

			function dollyIn() {

				const dollyScale = Math.pow( 0.95, scope.dollySpeed );

				if ( scope.object.isPerspectiveCamera ) {

					scope.dolly( scope._sphericalEnd.radius * dollyScale - scope._sphericalEnd.radius );

				} else if ( scope.object.isOrthographicCamera ) {

					scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
					scope.object.updateProjectionMatrix();
					scope._needsUpdate = true;

				}

			}

			function dollyOut() {

				const dollyScale = Math.pow( 0.95, scope.dollySpeed );

				if ( scope.object.isPerspectiveCamera ) {

					scope.dolly( scope._sphericalEnd.radius / dollyScale - scope._sphericalEnd.radius );

				} else if ( scope.object.isOrthographicCamera ) {

					scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
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

		const offset = _v3.copy( _xColumn ).add( _yColumn );
		this._targetEnd.add( offset );

		if ( ! enableTransition ) {

			this.target.copy( this._targetEnd );

		}

		this._needsUpdate = true;

	}

	forward( distance, enableTransition ) {

		_v3.setFromMatrixColumn( this.object.matrix, 0 );
		_v3.crossVectors( this.object.up, _v3 );
		_v3.multiplyScalar( distance );

		this._targetEnd.add( _v3 );

		if ( ! enableTransition ) {

			this.target.copy( this._targetEnd );

		}

		this._needsUpdate = true;

	}

	moveTo( x, y, z, enableTransition ) {

		this._targetEnd.set( x, y, z );

		if ( ! enableTransition ) {

			this.target.copy( this._targetEnd );

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
		const size = boundingBox.getSize( _v3 );
		const boundingWidth  = size.x + paddingLeft + paddingRight;
		const boundingHeight = size.y + paddingTop + paddingBottom;
		const boundingDepth = size.z;

		const distance = this.getDistanceToFit( boundingWidth, boundingHeight, boundingDepth );
		this.dollyTo( distance, enableTransition );

		const boundingBoxCenter = boundingBox.getCenter( _v3 );
		const cx = boundingBoxCenter.x - ( paddingLeft * 0.5 - paddingRight * 0.5 );
		const cy = boundingBoxCenter.y + ( paddingTop * 0.5 - paddingBottom * 0.5 );
		const cz = boundingBoxCenter.z;
		this.moveTo( cx, cy, cz, enableTransition );

		this._sphericalEnd.theta = this._sphericalEnd.theta % ( 2 * Math.PI );
		this._spherical.theta    = this._spherical.theta    % ( 2 * Math.PI );
		this.rotateTo( 0, 90 * THREE.Math.DEG2RAD, enableTransition );

	}

	getDistanceToFit( width, height, depth ) {

		const camera = this.object;
		const boundingRectAspect = width / height;
		const fov = camera.fov * THREE.Math.DEG2RAD;
		const aspect = camera.aspect;
	
		const heightToFit = boundingRectAspect < aspect ? height : width / aspect;
		return heightToFit * 0.5 / Math.tan( fov * 0.5 ) + depth * 0.5;

	}

	reset( enableTransition ) {

		this._targetEnd.copy( this._defaultTarget );
		this._sphericalEnd.setFromVector3( _v3.subVectors( this._defaultPosition, this._defaultTarget ) );
		this._sphericalEnd.theta = this._sphericalEnd.theta % ( 2 * Math.PI );
		this._spherical.theta    = this._spherical.theta    % ( 2 * Math.PI );

		if ( ! enableTransition ) {

			this.target.copy( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		this._needsUpdate = true;

	}

	pushDefaultState() {

		this._defaultTarget.copy( this.target );
		this._defaultPosition.copy( this.object.position );
		this._defaultZoom = this.object.zoom;

	}

	saveState() {

		console.warn( 'camera-controls: saveState() is now DEPRECATED! Use memoryDefaultState() instead.' );

		this.memoryDefaultState();

	}

	update( delta ) {

		// var offset = new THREE.Vector3();
		// var quat = new THREE.Quaternion().setFromUnitVectors( this.object.up, new THREE.Vector3( 0, 1, 0 ) );
		// var quatInverse = quat.clone().inverse();

		const dampingFactor = this.dampingFactor * delta / 0.016;
		const deltaTheta  = this._sphericalEnd.theta  - this._spherical.theta;
		const deltaPhi    = this._sphericalEnd.phi    - this._spherical.phi;
		const deltaRadius = this._sphericalEnd.radius - this._spherical.radius;
		const deltaTarget = new THREE.Vector3().subVectors( this._targetEnd, this.target );

		if (
			Math.abs( deltaTheta    ) > EPSILON ||
			Math.abs( deltaPhi      ) > EPSILON ||
			Math.abs( deltaRadius   ) > EPSILON ||
			Math.abs( deltaTarget.x ) > EPSILON ||
			Math.abs( deltaTarget.y ) > EPSILON ||
			Math.abs( deltaTarget.z ) > EPSILON
		) {

			this._spherical.set(
				this._spherical.radius + deltaRadius * dampingFactor,
				this._spherical.phi    + deltaPhi    * dampingFactor,
				this._spherical.theta  + deltaTheta  * dampingFactor
			);

			this.target.add( deltaTarget.multiplyScalar( dampingFactor ) );

			this._needsUpdate = true;

		} else {

			this._spherical.copy( this._sphericalEnd );
			this.target.copy( this._targetEnd );

		}

		this._spherical.makeSafe();
		this.object.position.setFromSpherical( this._spherical ).add( this.target );
		this.object.lookAt( this.target );

		const updated = this._needsUpdate;
		this._needsUpdate = false;

		return updated;

	}

	toJSON() {

		return JSON.stringify( {
			version	             : version,

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

			target               : this._targetEnd.toArray(),
			position             : this.object.position.toArray(),

			defaultTarget        : this._defaultTarget.toArray(),
			defaultPosition      : this._defaultPosition.toArray(),
		} );

	}

	fromJSON( json, enableTransition ) {

		const obj = JSON.parse( json );

		// do compat stuff
		if ( !obj.hasOwnProperty( 'version' ) ) { // 1.7.0 or older
			obj.defaultTarget = obj.target0;
			obj.defaultPosition = obj.position0;
		}

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

		this._defaultTarget.fromArray( obj.defaultTarget );
		this._defaultPosition.fromArray( obj.defaultPosition );

		this._targetEnd.fromArray( obj.target );
		this._sphericalEnd.setFromVector3( position.sub( this._defaultTarget ) );

		if ( ! enableTransition ) {

			this.target.copy( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		this._needsUpdate = true;

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
