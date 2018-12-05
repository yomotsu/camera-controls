/*!
 * camera-controls
 * https://github.com/yomotsu/camera-controls
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.CameraControls = factory());
}(this, (function () { 'use strict';

	/**
	 * This source code has been retrieved directly from Three.js repository.
	 * Three.js is also distributed under MIT license.
	 * https://github.com/mrdoob/three.js/blob/master/src/core/EventDispatcher.js
	 */

	/**
	 * https://github.com/mrdoob/eventdispatcher.js/
	 */

	function EventDispatcher() {}

	Object.assign(EventDispatcher.prototype, {

		addEventListener: function addEventListener(type, listener) {

			if (this._listeners === undefined) this._listeners = {};

			var listeners = this._listeners;

			if (listeners[type] === undefined) {

				listeners[type] = [];
			}

			if (listeners[type].indexOf(listener) === -1) {

				listeners[type].push(listener);
			}
		},

		hasEventListener: function hasEventListener(type, listener) {

			if (this._listeners === undefined) return false;

			var listeners = this._listeners;

			return listeners[type] !== undefined && listeners[type].indexOf(listener) !== -1;
		},

		removeEventListener: function removeEventListener(type, listener) {

			if (this._listeners === undefined) return;

			var listeners = this._listeners;
			var listenerArray = listeners[type];

			if (listenerArray !== undefined) {

				var index = listenerArray.indexOf(listener);

				if (index !== -1) {

					listenerArray.splice(index, 1);
				}
			}
		},

		dispatchEvent: function dispatchEvent(event) {

			if (this._listeners === undefined) return;

			var listeners = this._listeners;
			var listenerArray = listeners[event.type];

			if (listenerArray !== undefined) {

				event.target = this;

				var array = listenerArray.slice(0);

				for (var i = 0, l = array.length; i < l; i++) {

					array[i].call(this, event);
				}
			}
		}

	});

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var THREE = void 0;
	var _v3a = void 0;
	var _v3b = void 0;
	var _xColumn = void 0;
	var _yColumn = void 0;
	var EPSILON = 0.001;
	var STATE = {
		NONE: -1,
		ROTATE: 0,
		DOLLY: 1,
		TRUCK: 2,
		TOUCH_ROTATE: 3,
		TOUCH_DOLLY: 4,
		TOUCH_TRUCK: 5
	};

	var CameraControls = function (_EventDispatcher) {
		_inherits(CameraControls, _EventDispatcher);

		CameraControls.install = function install(libs) {

			THREE = libs.THREE;
			_v3a = new THREE.Vector3();
			_v3b = new THREE.Vector3();
			_xColumn = new THREE.Vector3();
			_yColumn = new THREE.Vector3();
		};

		function CameraControls(object, domElement) {
			_classCallCheck(this, CameraControls);

			var _this = _possibleConstructorReturn(this, _EventDispatcher.call(this));

			_this.object = object;
			_this.enabled = true;

			// How far you can dolly in and out ( PerspectiveCamera only )
			_this.minDistance = 0;
			_this.maxDistance = Infinity;

			// How far you can zoom in and out ( OrthographicCamera only )
			_this.minZoom = 0;
			_this.maxZoom = Infinity;

			_this.minPolarAngle = 0; // radians
			_this.maxPolarAngle = Math.PI; // radians
			_this.minAzimuthAngle = -Infinity; // radians
			_this.maxAzimuthAngle = Infinity; // radians
			_this.dampingFactor = 0.05;
			_this.draggingDampingFactor = 0.25;
			_this.dollySpeed = 1.0;
			_this.truckSpeed = 2.0;
			_this.verticalDragToForward = false;

			_this.domElement = domElement;

			// the location of focus, where the object orbits around
			_this._target = new THREE.Vector3();
			_this._targetEnd = new THREE.Vector3();

			// rotation
			_this._spherical = new THREE.Spherical();
			_this._spherical.setFromVector3(_this.object.position);
			_this._sphericalEnd = new THREE.Spherical().copy(_this._spherical);

			// reset
			_this._target0 = _this._target.clone();
			_this._position0 = _this.object.position.clone();
			_this._zoom0 = _this.object.zoom;

			_this._needsUpdate = true;
			_this.update();

			if (!_this.domElement) {

				_this.dispose = function () {};
			} else {
				var _onMouseDown = function _onMouseDown(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					var prevState = state;

					switch (event.button) {

						case THREE.MOUSE.LEFT:

							state = STATE.ROTATE;
							break;

						case THREE.MOUSE.MIDDLE:

							state = STATE.DOLLY;
							break;

						case THREE.MOUSE.RIGHT:

							state = STATE.TRUCK;
							break;

					}

					if (prevState === STATE.NONE) {

						_startDragging(event);
					}
				};

				var _onTouchStart = function _onTouchStart(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					var prevState = state;

					switch (event.touches.length) {

						case 1:
							// one-fingered touch: rotate

							state = STATE.TOUCH_ROTATE;
							break;

						case 2:
							// two-fingered touch: dolly

							state = STATE.TOUCH_DOLLY;
							break;

						case 3:
							// three-fingered touch: truck

							state = STATE.TOUCH_TRUCK;
							break;

					}

					if (prevState === STATE.NONE) {

						_startDragging(event);
					}
				};

				var _onMouseWheel = function _onMouseWheel(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					if (event.deltaY < 0) {

						_dollyIn();
					} else if (event.deltaY > 0) {

						_dollyOut();
					}
				};

				var _onContextMenu = function _onContextMenu(event) {

					if (!scope.enabled) return;

					event.preventDefault();
				};

				var _startDragging = function _startDragging(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					var _event = !!event.touches ? event.touches[0] : event;
					var x = _event.clientX;
					var y = _event.clientY;

					elementRect = scope.domElement.getBoundingClientRect();
					dragStart.set(x, y);

					// if ( state === STATE.DOLLY ) {

					// 	dollyStart.set( x, y );

					// }

					if (state === STATE.TOUCH_DOLLY) {

						var dx = x - event.touches[1].pageX;
						var dy = y - event.touches[1].pageY;
						var distance = Math.sqrt(dx * dx + dy * dy);

						dollyStart.set(0, distance);
					}

					savedDampingFactor = scope.dampingFactor;
					scope.dampingFactor = scope.draggingDampingFactor;

					document.addEventListener('mousemove', _dragging, { passive: false });
					document.addEventListener('touchmove', _dragging, { passive: false });
					document.addEventListener('mouseup', _endDragging);
					document.addEventListener('touchend', _endDragging);

					scope.dispatchEvent({
						type: 'controlstart',
						x: x,
						y: y,
						state: state,
						originalEvent: event
					});
				};

				var _dragging = function _dragging(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					var _event = !!event.touches ? event.touches[0] : event;
					var x = _event.clientX;
					var y = _event.clientY;

					var deltaX = dragStart.x - x;
					var deltaY = dragStart.y - y;

					dragStart.set(x, y);

					switch (state) {

						case STATE.ROTATE:
						case STATE.TOUCH_ROTATE:

							var rotX = 2 * Math.PI * deltaX / elementRect.width;
							var rotY = 2 * Math.PI * deltaY / elementRect.height;
							scope.rotate(rotX, rotY, true);
							break;

						case STATE.DOLLY:
							// not implemented
							break;

						case STATE.TOUCH_DOLLY:

							var dx = x - event.touches[1].pageX;
							var dy = y - event.touches[1].pageY;
							var distance = Math.sqrt(dx * dx + dy * dy);
							var dollyDelta = dollyStart.y - distance;

							if (dollyDelta > 0) {

								_dollyOut();
							} else if (dollyDelta < 0) {

								_dollyIn();
							}

							dollyStart.set(0, distance);
							break;

						case STATE.TRUCK:
						case STATE.TOUCH_TRUCK:

							if (scope.object.isPerspectiveCamera) {

								var offset = _v3a.copy(scope.object.position).sub(scope._target);
								// half of the fov is center to top of screen
								var fovInRad = scope.object.fov * THREE.Math.DEG2RAD;
								var targetDistance = offset.length() * Math.tan(fovInRad / 2);
								var truckX = scope.truckSpeed * deltaX * targetDistance / elementRect.height;
								var pedestalY = scope.truckSpeed * deltaY * targetDistance / elementRect.height;
								if (scope.verticalDragToForward) {

									scope.truck(truckX, 0, true);
									scope.forward(-pedestalY, true);
								} else {

									scope.truck(truckX, pedestalY, true);
								}
								break;
							} else if (scope.object.isOrthographicCamera) {

								// orthographic
								var _truckX = deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / elementRect.width;
								var _pedestalY = deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / elementRect.height;
								scope.truck(_truckX, _pedestalY, true);
								break;
							}

					}

					scope.dispatchEvent({
						type: 'control',
						x: x,
						y: y,
						deltaX: deltaX,
						deltaY: deltaY,
						state: state,
						originalEvent: event
					});
				};

				var _endDragging = function _endDragging() {

					if (!scope.enabled) return;

					scope.dampingFactor = savedDampingFactor;
					state = STATE.NONE;

					document.removeEventListener('mousemove', _dragging);
					document.removeEventListener('touchmove', _dragging);
					document.removeEventListener('mouseup', _endDragging);
					document.removeEventListener('touchend', _endDragging);

					scope.dispatchEvent({
						type: 'controlend',
						state: state,
						originalEvent: event
					});
				};

				var _dollyIn = function _dollyIn() {

					var dollyScale = Math.pow(0.95, scope.dollySpeed);

					if (scope.object.isPerspectiveCamera) {

						scope.dolly(scope._sphericalEnd.radius * dollyScale - scope._sphericalEnd.radius);
					} else if (scope.object.isOrthographicCamera) {

						scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
						scope.object.updateProjectionMatrix();
						scope._needsUpdate = true;
					}
				};

				var _dollyOut = function _dollyOut() {

					var dollyScale = Math.pow(0.95, scope.dollySpeed);

					if (scope.object.isPerspectiveCamera) {

						scope.dolly(scope._sphericalEnd.radius / dollyScale - scope._sphericalEnd.radius);
					} else if (scope.object.isOrthographicCamera) {

						scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
						scope.object.updateProjectionMatrix();
						scope._needsUpdate = true;
					}
				};

				var scope = _this;
				var dragStart = new THREE.Vector2();
				var dollyStart = new THREE.Vector2();
				var state = STATE.NONE;
				var elementRect = void 0;
				var savedDampingFactor = void 0;

				_this.domElement.addEventListener('mousedown', _onMouseDown);
				_this.domElement.addEventListener('touchstart', _onTouchStart);
				_this.domElement.addEventListener('wheel', _onMouseWheel);
				_this.domElement.addEventListener('contextmenu', _onContextMenu);

				_this.dispose = function () {

					scope.domElement.removeEventListener('mousedown', _onMouseDown);
					scope.domElement.removeEventListener('touchstart', _onTouchStart);
					scope.domElement.removeEventListener('wheel', _onMouseWheel);
					scope.domElement.removeEventListener('contextmenu', _onContextMenu);
					document.removeEventListener('mousemove', _dragging);
					document.removeEventListener('touchmove', _dragging);
					document.removeEventListener('mouseup', _endDragging);
					document.removeEventListener('touchend', _endDragging);
				};
			}

			return _this;
		}

		// rotX in radian
		// rotY in radian


		CameraControls.prototype.rotate = function rotate(rotX, rotY, enableTransition) {

			this.rotateTo(this._sphericalEnd.theta + rotX, this._sphericalEnd.phi + rotY, enableTransition);
		};

		// rotX in radian
		// rotY in radian


		CameraControls.prototype.rotateTo = function rotateTo(rotX, rotY, enableTransition) {

			var theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, rotX));
			var phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, rotY));

			this._sphericalEnd.theta = theta;
			this._sphericalEnd.phi = phi;
			this._sphericalEnd.makeSafe();

			if (!enableTransition) {

				this._spherical.theta = this._sphericalEnd.theta;
				this._spherical.phi = this._sphericalEnd.phi;
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.dolly = function dolly(distance, enableTransition) {

			if (this.object.isOrthographicCamera) {

				console.warn('dolly is not available for OrthographicCamera');
				return;
			}

			this.dollyTo(this._sphericalEnd.radius + distance, enableTransition);
		};

		CameraControls.prototype.dollyTo = function dollyTo(distance, enableTransition) {

			if (this.object.isOrthographicCamera) {

				console.warn('dolly is not available for OrthographicCamera');
				return;
			}

			this._sphericalEnd.radius = THREE.Math.clamp(distance, this.minDistance, this.maxDistance);

			if (!enableTransition) {

				this._spherical.radius = this._sphericalEnd.radius;
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.pan = function pan(x, y, enableTransition) {

			console.log('`pan` has been renamed to `truck`');
			this.truck(x, y, enableTransition);
		};

		CameraControls.prototype.truck = function truck(x, y, enableTransition) {

			this.object.updateMatrix();

			_xColumn.setFromMatrixColumn(this.object.matrix, 0);
			_yColumn.setFromMatrixColumn(this.object.matrix, 1);
			_xColumn.multiplyScalar(x);
			_yColumn.multiplyScalar(-y);

			var offset = _v3a.copy(_xColumn).add(_yColumn);
			this._targetEnd.add(offset);

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.forward = function forward(distance, enableTransition) {

			_v3a.setFromMatrixColumn(this.object.matrix, 0);
			_v3a.crossVectors(this.object.up, _v3a);
			_v3a.multiplyScalar(distance);

			this._targetEnd.add(_v3a);

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.moveTo = function moveTo(x, y, z, enableTransition) {

			this._targetEnd.set(x, y, z);

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.fitTo = function fitTo(objectOrBox3, enableTransition) {
			var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};


			if (this.object.isOrthographicCamera) {

				console.warn('fitTo is not supported for OrthographicCamera');
				return;
			}

			var paddingLeft = options.paddingLeft || 0;
			var paddingRight = options.paddingRight || 0;
			var paddingBottom = options.paddingBottom || 0;
			var paddingTop = options.paddingTop || 0;

			var boundingBox = objectOrBox3.isBox3 ? objectOrBox3.clone() : new THREE.Box3().setFromObject(objectOrBox3);
			var size = boundingBox.getSize(_v3a);
			var boundingWidth = size.x + paddingLeft + paddingRight;
			var boundingHeight = size.y + paddingTop + paddingBottom;
			var boundingDepth = size.z;

			var distance = this.getDistanceToFit(boundingWidth, boundingHeight, boundingDepth);
			this.dollyTo(distance, enableTransition);

			var boundingBoxCenter = boundingBox.getCenter(_v3a);
			var cx = boundingBoxCenter.x - (paddingLeft * 0.5 - paddingRight * 0.5);
			var cy = boundingBoxCenter.y + (paddingTop * 0.5 - paddingBottom * 0.5);
			var cz = boundingBoxCenter.z;
			this.moveTo(cx, cy, cz, enableTransition);

			this._sanitizeSphericals();
			this.rotateTo(0, 90 * THREE.Math.DEG2RAD, enableTransition);
		};

		CameraControls.prototype.setLookAt = function setLookAt(positionX, positionY, positionZ, targetX, targetY, targetZ, enableTransition) {

			var position = _v3a.set(positionX, positionY, positionZ);
			var target = _v3b.set(targetX, targetY, targetZ);

			this._targetEnd.copy(target);
			this._sphericalEnd.setFromVector3(position.sub(target));
			this._sanitizeSphericals();

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
				this._spherical.copy(this._sphericalEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.lerpLookAt = function lerpLookAt(positionAX, positionAY, positionAZ, targetAX, targetAY, targetAZ, positionBX, positionBY, positionBZ, targetBX, targetBY, targetBZ, x, enableTransition) {

			var positionA = _v3a.set(positionAX, positionAY, positionAZ);
			var targetA = _v3b.set(targetAX, targetAY, targetAZ);
			var sphericalA = new THREE.Spherical().setFromVector3(positionA.sub(targetA));

			var targetB = _v3a.set(targetBX, targetBY, targetBZ);
			this._targetEnd.copy(targetA).lerp(targetB, x); // tricky

			var positionB = _v3b.set(positionBX, positionBY, positionBZ);
			var sphericalB = new THREE.Spherical().setFromVector3(positionB.sub(targetB));

			var deltaTheta = sphericalB.theta - sphericalA.theta;
			var deltaPhi = sphericalB.phi - sphericalA.phi;
			var deltaRadius = sphericalB.radius - sphericalA.radius;

			this._sphericalEnd.set(sphericalA.radius + deltaRadius * x, sphericalA.phi + deltaPhi * x, sphericalA.theta + deltaTheta * x);

			this._sanitizeSphericals();

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
				this._spherical.copy(this._sphericalEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.setPosition = function setPosition(positionX, positionY, positionZ, enableTransition) {

			this.setLookAt(positionX, positionY, positionZ, this._targetEnd.x, this._targetEnd.y, this._targetEnd.z, enableTransition);
		};

		CameraControls.prototype.setTarget = function setTarget(targetX, targetY, targetZ, enableTransition) {

			var pos = this.getPosition(_v3a);
			this.setLookAt(pos.x, pos.y, pos.z, targetX, targetY, targetZ, enableTransition);
		};

		CameraControls.prototype.getDistanceToFit = function getDistanceToFit(width, height, depth) {

			var camera = this.object;
			var boundingRectAspect = width / height;
			var fov = camera.fov * THREE.Math.DEG2RAD;
			var aspect = camera.aspect;

			var heightToFit = boundingRectAspect < aspect ? height : width / aspect;
			return heightToFit * 0.5 / Math.tan(fov * 0.5) + depth * 0.5;
		};

		CameraControls.prototype.getTarget = function getTarget(out) {

			var _out = (typeof out === 'undefined' ? 'undefined' : _typeof(out)) === 'object' && out.isVector3 ? out : new THREE.Vector3();
			return _out.copy(this._targetEnd);
		};

		CameraControls.prototype.getPosition = function getPosition(out) {

			var _out = (typeof out === 'undefined' ? 'undefined' : _typeof(out)) === 'object' && out.isVector3 ? out : new THREE.Vector3();
			return _out.setFromSpherical(this._sphericalEnd).add(this._targetEnd);
		};

		CameraControls.prototype.reset = function reset(enableTransition) {

			this.setLookAt(this._position0.x, this._position0.y, this._position0.z, this._target0.x, this._target0.y, this._target0.z, enableTransition);
		};

		CameraControls.prototype.saveState = function saveState() {

			this._target0.copy(this._target);
			this._position0.copy(this.object.position);
			this._zoom0 = this.object.zoom;
		};

		CameraControls.prototype.update = function update(delta) {

			// var offset = new THREE.Vector3();
			// var quat = new THREE.Quaternion().setFromUnitVectors( this.object.up, new THREE.Vector3( 0, 1, 0 ) );
			// var quatInverse = quat.clone().inverse();

			var dampingFactor = 1.0 - Math.exp(-this.dampingFactor * delta / 0.016);
			var deltaTheta = this._sphericalEnd.theta - this._spherical.theta;
			var deltaPhi = this._sphericalEnd.phi - this._spherical.phi;
			var deltaRadius = this._sphericalEnd.radius - this._spherical.radius;
			var deltaTarget = new THREE.Vector3().subVectors(this._targetEnd, this._target);

			if (Math.abs(deltaTheta) > EPSILON || Math.abs(deltaPhi) > EPSILON || Math.abs(deltaRadius) > EPSILON || Math.abs(deltaTarget.x) > EPSILON || Math.abs(deltaTarget.y) > EPSILON || Math.abs(deltaTarget.z) > EPSILON) {

				this._spherical.set(this._spherical.radius + deltaRadius * dampingFactor, this._spherical.phi + deltaPhi * dampingFactor, this._spherical.theta + deltaTheta * dampingFactor);

				this._target.add(deltaTarget.multiplyScalar(dampingFactor));

				this._needsUpdate = true;
			} else {

				this._spherical.copy(this._sphericalEnd);
				this._target.copy(this._targetEnd);
			}

			this._spherical.makeSafe();
			this.object.position.setFromSpherical(this._spherical).add(this._target);
			this.object.lookAt(this._target);

			var updated = this._needsUpdate;
			if (updated) {
				this.dispatchEvent({
					type: 'update'
				});
			}

			this._needsUpdate = false;

			return updated;
		};

		CameraControls.prototype.toJSON = function toJSON() {

			return JSON.stringify({
				enabled: this.enabled,

				minDistance: this.minDistance,
				maxDistance: infinityToMaxNumber(this.maxDistance),
				minPolarAngle: this.minPolarAngle,
				maxPolarAngle: infinityToMaxNumber(this.maxPolarAngle),
				minAzimuthAngle: infinityToMaxNumber(this.minAzimuthAngle),
				maxAzimuthAngle: infinityToMaxNumber(this.maxAzimuthAngle),
				dampingFactor: this.dampingFactor,
				draggingDampingFactor: this.draggingDampingFactor,
				dollySpeed: this.dollySpeed,
				truckSpeed: this.truckSpeed,

				target: this._targetEnd.toArray(),
				position: this.object.position.toArray(),

				target0: this._target0.toArray(),
				position0: this._position0.toArray()
			});
		};

		CameraControls.prototype.fromJSON = function fromJSON(json, enableTransition) {

			var obj = JSON.parse(json);
			var position = new THREE.Vector3().fromArray(obj.position);

			this.enabled = obj.enabled;

			this.minDistance = obj.minDistance;
			this.maxDistance = maxNumberToInfinity(obj.maxDistance);
			this.minPolarAngle = obj.minPolarAngle;
			this.maxPolarAngle = maxNumberToInfinity(obj.maxPolarAngle);
			this.minAzimuthAngle = maxNumberToInfinity(obj.minAzimuthAngle);
			this.maxAzimuthAngle = maxNumberToInfinity(obj.maxAzimuthAngle);
			this.dampingFactor = obj.dampingFactor;
			this.draggingDampingFactor = obj.draggingDampingFactor;
			this.dollySpeed = obj.dollySpeed;
			this.truckSpeed = obj.truckSpeed;

			this._target0.fromArray(obj.target0);
			this._position0.fromArray(obj.position0);

			this._targetEnd.fromArray(obj.target);
			this._sphericalEnd.setFromVector3(position.sub(this._target0));

			if (!enableTransition) {

				this._target.copy(this._targetEnd);
				this._spherical.copy(this._sphericalEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype._sanitizeSphericals = function _sanitizeSphericals() {

			this._sphericalEnd.theta = this._sphericalEnd.theta % (2 * Math.PI);
			this._spherical.theta += 2 * Math.PI * Math.round((this._sphericalEnd.theta - this._spherical.theta) / (2 * Math.PI));
		};

		return CameraControls;
	}(EventDispatcher);

	function infinityToMaxNumber(value) {

		if (isFinite(value)) return value;

		if (value < 0) return -Number.MAX_VALUE;

		return Number.MAX_VALUE;
	}

	function maxNumberToInfinity(value) {

		if (Math.abs(value) < Number.MAX_VALUE) return value;

		return value * Infinity;
	}

	return CameraControls;

})));
