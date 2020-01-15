/*!
 * camera-controls
 * https://github.com/yomotsu/camera-controls
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.CameraControls = factory());
}(this, (function () { 'use strict';

	/*! *****************************************************************************
	Copyright (c) Microsoft Corporation. All rights reserved.
	Licensed under the Apache License, Version 2.0 (the "License"); you may not use
	this file except in compliance with the License. You may obtain a copy of the
	License at http://www.apache.org/licenses/LICENSE-2.0

	THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
	KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
	WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
	MERCHANTABLITY OR NON-INFRINGEMENT.

	See the Apache Version 2.0 License for specific language governing permissions
	and limitations under the License.
	***************************************************************************** */
	/* global Reflect, Promise */

	var extendStatics = function(d, b) {
	    extendStatics = Object.setPrototypeOf ||
	        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
	        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
	    return extendStatics(d, b);
	};

	function __extends(d, b) {
	    extendStatics(d, b);
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	}

	var ACTION;
	(function (ACTION) {
	    ACTION[ACTION["NONE"] = 0] = "NONE";
	    ACTION[ACTION["ROTATE"] = 1] = "ROTATE";
	    ACTION[ACTION["TRUCK"] = 2] = "TRUCK";
	    ACTION[ACTION["DOLLY"] = 3] = "DOLLY";
	    ACTION[ACTION["ZOOM"] = 4] = "ZOOM";
	    ACTION[ACTION["TOUCH_ROTATE"] = 5] = "TOUCH_ROTATE";
	    ACTION[ACTION["TOUCH_TRUCK"] = 6] = "TOUCH_TRUCK";
	    ACTION[ACTION["TOUCH_DOLLY"] = 7] = "TOUCH_DOLLY";
	    ACTION[ACTION["TOUCH_ZOOM"] = 8] = "TOUCH_ZOOM";
	    ACTION[ACTION["TOUCH_DOLLY_TRUCK"] = 9] = "TOUCH_DOLLY_TRUCK";
	    ACTION[ACTION["TOUCH_ZOOM_TRUCK"] = 10] = "TOUCH_ZOOM_TRUCK";
	})(ACTION || (ACTION = {}));

	var PI_2 = Math.PI * 2;
	var FPS_60 = 1 / 0.016;
	var FIT_TO_OPTION_DEFAULT = {
	    paddingLeft: 0,
	    paddingRight: 0,
	    paddingBottom: 0,
	    paddingTop: 0,
	};

	var EPSILON = 1e-5;
	function approxZero(number) {
	    return Math.abs(number) < EPSILON;
	}
	function infinityToMaxNumber(value) {
	    if (isFinite(value))
	        return value;
	    if (value < 0)
	        return -Number.MAX_VALUE;
	    return Number.MAX_VALUE;
	}
	function maxNumberToInfinity(value) {
	    if (Math.abs(value) < Number.MAX_VALUE)
	        return value;
	    return value * Infinity;
	}

	function isTouchEvent(event) {
	    return 'TouchEvent' in window && event instanceof TouchEvent;
	}

	function extractClientCoordFromEvent(event, out) {
	    out.set(0, 0);
	    if (isTouchEvent(event)) {
	        var touchEvent = event;
	        for (var i = 0; i < touchEvent.touches.length; i++) {
	            out.x += touchEvent.touches[i].clientX;
	            out.y += touchEvent.touches[i].clientY;
	        }
	        out.x /= touchEvent.touches.length;
	        out.y /= touchEvent.touches.length;
	        return out;
	    }
	    else {
	        var mouseEvent = event;
	        out.set(mouseEvent.clientX, mouseEvent.clientY);
	        return out;
	    }
	}

	function notSupportedInOrthographicCamera(camera, message) {
	    if (!camera.isPerspectiveCamera) {
	        console.warn(message + " is not supported in OrthographicCamera");
	        return true;
	    }
	    return false;
	}

	var EventDispatcher = (function () {
	    function EventDispatcher() {
	        this._listeners = {};
	    }
	    EventDispatcher.prototype.addEventListener = function (type, listener) {
	        var listeners = this._listeners;
	        if (listeners[type] === undefined)
	            listeners[type] = [];
	        if (listeners[type].indexOf(listener) === -1)
	            listeners[type].push(listener);
	    };
	    EventDispatcher.prototype.dispatchEvent = function (event) {
	        var listeners = this._listeners;
	        var listenerArray = listeners[event.type];
	        if (listenerArray !== undefined) {
	            event.target = this;
	            var array = listenerArray.slice(0);
	            for (var i = 0, l = array.length; i < l; i++) {
	                array[i].call(this, event);
	            }
	        }
	    };
	    return EventDispatcher;
	}());

	var isMac = /Mac/.test(navigator.platform);
	var readonlyACTION = Object.freeze(ACTION);
	var THREE;
	var _ORIGIN;
	var _AXIS_Y;
	var _v2;
	var _v3A;
	var _v3B;
	var _v3C;
	var _xColumn;
	var _yColumn;
	var _sphericalA;
	var _sphericalB;
	var _rotationMatrix;
	var _raycaster;
	var CameraControls = (function (_super) {
	    __extends(CameraControls, _super);
	    function CameraControls(camera, domElement) {
	        var _this = _super.call(this) || this;
	        _this.enabled = true;
	        _this.minPolarAngle = 0;
	        _this.maxPolarAngle = Math.PI;
	        _this.minAzimuthAngle = -Infinity;
	        _this.maxAzimuthAngle = Infinity;
	        _this.minDistance = 0;
	        _this.maxDistance = Infinity;
	        _this.minZoom = 0.01;
	        _this.maxZoom = Infinity;
	        _this.dampingFactor = 0.05;
	        _this.draggingDampingFactor = 0.25;
	        _this.azimuthRotateSpeed = 1.0;
	        _this.polarRotateSpeed = 1.0;
	        _this.dollySpeed = 1.0;
	        _this.truckSpeed = 2.0;
	        _this.dollyToCursor = false;
	        _this.verticalDragToForward = false;
	        _this.boundaryFriction = 0.0;
	        _this.colliderMeshes = [];
	        _this._state = ACTION.NONE;
	        _this._viewport = null;
	        _this._dollyControlAmount = 0;
	        _this._boundaryEnclosesCamera = false;
	        _this._hasUpdated = true;
	        _this._camera = camera;
	        _this._yAxisUpSpace = new THREE.Quaternion().setFromUnitVectors(_this._camera.up, _AXIS_Y);
	        _this._yAxisUpSpaceInverse = _this._yAxisUpSpace.clone().inverse();
	        _this._state = ACTION.NONE;
	        _this._domElement = domElement;
	        _this._target = new THREE.Vector3();
	        _this._targetEnd = _this._target.clone();
	        _this._spherical = new THREE.Spherical().setFromVector3(_this._camera.position.clone().applyQuaternion(_this._yAxisUpSpace));
	        _this._sphericalEnd = _this._spherical.clone();
	        _this._zoom = _this._camera.zoom;
	        _this._zoomEnd = _this._zoom;
	        _this._nearPlaneCorners = [
	            new THREE.Vector3(),
	            new THREE.Vector3(),
	            new THREE.Vector3(),
	            new THREE.Vector3(),
	        ];
	        _this._updateNearPlaneCorners();
	        _this._boundary = new THREE.Box3(new THREE.Vector3(-Infinity, -Infinity, -Infinity), new THREE.Vector3(Infinity, Infinity, Infinity));
	        _this._target0 = _this._target.clone();
	        _this._position0 = _this._camera.position.clone();
	        _this._zoom0 = _this._zoom;
	        _this._dollyControlAmount = 0;
	        _this._dollyControlCoord = new THREE.Vector2();
	        _this.mouseButtons = {
	            left: ACTION.ROTATE,
	            middle: ACTION.DOLLY,
	            right: ACTION.TRUCK,
	            wheel: _this._camera.isPerspectiveCamera ? ACTION.DOLLY :
	                _this._camera.isOrthographicCamera ? ACTION.ZOOM :
	                    ACTION.NONE,
	        };
	        _this.touches = {
	            one: ACTION.TOUCH_ROTATE,
	            two: _this._camera.isPerspectiveCamera ? ACTION.TOUCH_DOLLY_TRUCK :
	                _this._camera.isOrthographicCamera ? ACTION.TOUCH_ZOOM_TRUCK :
	                    ACTION.NONE,
	            three: ACTION.TOUCH_TRUCK,
	        };
	        if (_this._domElement) {
	            var scope_1 = _this;
	            var dragStartPosition_1 = new THREE.Vector2();
	            var lastDragPosition_1 = new THREE.Vector2();
	            var dollyStart_1 = new THREE.Vector2();
	            var elementRect_1 = new THREE.Vector4();
	            var truckInternal_1 = function (deltaX, deltaY) {
	                if (scope_1._camera.isPerspectiveCamera) {
	                    var camera_1 = scope_1._camera;
	                    var offset = _v3A.copy(camera_1.position).sub(scope_1._target);
	                    var fov = camera_1.getEffectiveFOV() * THREE.Math.DEG2RAD;
	                    var targetDistance = offset.length() * Math.tan(fov * 0.5);
	                    var truckX = (scope_1.truckSpeed * deltaX * targetDistance / elementRect_1.w);
	                    var pedestalY = (scope_1.truckSpeed * deltaY * targetDistance / elementRect_1.w);
	                    if (scope_1.verticalDragToForward) {
	                        scope_1.truck(truckX, 0, true);
	                        scope_1.forward(-pedestalY, true);
	                    }
	                    else {
	                        scope_1.truck(truckX, pedestalY, true);
	                    }
	                }
	                else if (scope_1._camera.isOrthographicCamera) {
	                    var camera_2 = scope_1._camera;
	                    var truckX = deltaX * (camera_2.right - camera_2.left) / camera_2.zoom / elementRect_1.z;
	                    var pedestalY = deltaY * (camera_2.top - camera_2.bottom) / camera_2.zoom / elementRect_1.w;
	                    scope_1.truck(truckX, pedestalY, true);
	                }
	            };
	            var dollyInternal_1 = function (delta, x, y) {
	                var dollyScale = Math.pow(0.95, -delta * scope_1.dollySpeed);
	                var distance = scope_1._sphericalEnd.radius * dollyScale;
	                var prevRadius = scope_1._sphericalEnd.radius;
	                scope_1.dollyTo(distance);
	                if (scope_1.dollyToCursor) {
	                    scope_1._dollyControlAmount += scope_1._sphericalEnd.radius - prevRadius;
	                    scope_1._dollyControlCoord.set(x, y);
	                }
	                return;
	            };
	            var zoomInternal_1 = function (delta) {
	                var zoomScale = Math.pow(0.95, delta * scope_1.dollySpeed);
	                scope_1.zoomTo(scope_1._zoom * zoomScale);
	                return;
	            };
	            var onMouseDown_1 = function (event) {
	                if (!scope_1.enabled)
	                    return;
	                event.preventDefault();
	                var prevState = scope_1._state;
	                switch (event.button) {
	                    case THREE.MOUSE.LEFT:
	                        scope_1._state = scope_1.mouseButtons.left;
	                        break;
	                    case THREE.MOUSE.MIDDLE:
	                        scope_1._state = scope_1.mouseButtons.middle;
	                        break;
	                    case THREE.MOUSE.RIGHT:
	                        scope_1._state = scope_1.mouseButtons.right;
	                        break;
	                }
	                if (prevState !== scope_1._state) {
	                    startDragging_1(event);
	                }
	            };
	            var onTouchStart_1 = function (event) {
	                if (!scope_1.enabled)
	                    return;
	                event.preventDefault();
	                var prevState = scope_1._state;
	                switch (event.touches.length) {
	                    case 1:
	                        scope_1._state = scope_1.touches.one;
	                        break;
	                    case 2:
	                        scope_1._state = scope_1.touches.two;
	                        break;
	                    case 3:
	                        scope_1._state = scope_1.touches.three;
	                        break;
	                }
	                if (prevState !== scope_1._state) {
	                    startDragging_1(event);
	                }
	            };
	            var onMouseWheel_1 = function (event) {
	                if (!scope_1.enabled)
	                    return;
	                event.preventDefault();
	                var deltaYFactor = isMac ? -1 : -3;
	                var delta = (event.deltaMode === 1) ? event.deltaY / deltaYFactor : event.deltaY / (deltaYFactor * 10);
	                var x = 0;
	                var y = 0;
	                if (scope_1.dollyToCursor) {
	                    scope_1._getClientRect(elementRect_1);
	                    x = (event.clientX - elementRect_1.x) / elementRect_1.z * 2 - 1;
	                    y = (event.clientY - elementRect_1.y) / elementRect_1.w * -2 + 1;
	                }
	                switch (scope_1.mouseButtons.wheel) {
	                    case ACTION.DOLLY: {
	                        dollyInternal_1(-delta, x, y);
	                        break;
	                    }
	                    case ACTION.ZOOM: {
	                        zoomInternal_1(-delta);
	                        break;
	                    }
	                }
	                scope_1.dispatchEvent({
	                    type: 'control',
	                    originalEvent: event,
	                });
	            };
	            var onContextMenu_1 = function (event) {
	                if (!scope_1.enabled)
	                    return;
	                event.preventDefault();
	            };
	            var startDragging_1 = function (event) {
	                if (!scope_1.enabled)
	                    return;
	                event.preventDefault();
	                extractClientCoordFromEvent(event, _v2);
	                scope_1._getClientRect(elementRect_1);
	                dragStartPosition_1.copy(_v2);
	                lastDragPosition_1.copy(_v2);
	                var isMultiTouch = isTouchEvent(event) && event.touches.length >= 2;
	                if (isMultiTouch) {
	                    var touchEvent = event;
	                    var dx = _v2.x - touchEvent.touches[1].clientX;
	                    var dy = _v2.y - touchEvent.touches[1].clientY;
	                    var distance = Math.sqrt(dx * dx + dy * dy);
	                    dollyStart_1.set(0, distance);
	                    var x = (touchEvent.touches[0].clientX + touchEvent.touches[1].clientX) * 0.5;
	                    var y = (touchEvent.touches[0].clientY + touchEvent.touches[1].clientY) * 0.5;
	                    lastDragPosition_1.set(x, y);
	                }
	                document.addEventListener('mousemove', dragging_1);
	                document.addEventListener('touchmove', dragging_1);
	                document.addEventListener('mouseup', endDragging_1);
	                document.addEventListener('touchend', endDragging_1);
	                scope_1.dispatchEvent({
	                    type: 'controlstart',
	                    originalEvent: event,
	                });
	            };
	            var dragging_1 = function (event) {
	                if (!scope_1.enabled)
	                    return;
	                event.preventDefault();
	                extractClientCoordFromEvent(event, _v2);
	                var deltaX = lastDragPosition_1.x - _v2.x;
	                var deltaY = lastDragPosition_1.y - _v2.y;
	                lastDragPosition_1.copy(_v2);
	                switch (scope_1._state) {
	                    case ACTION.ROTATE:
	                    case ACTION.TOUCH_ROTATE: {
	                        var theta = PI_2 * scope_1.azimuthRotateSpeed * deltaX / elementRect_1.w;
	                        var phi = PI_2 * scope_1.polarRotateSpeed * deltaY / elementRect_1.w;
	                        scope_1.rotate(theta, phi, true);
	                        break;
	                    }
	                    case ACTION.DOLLY:
	                    case ACTION.ZOOM: {
	                        var dollyX = scope_1.dollyToCursor ? (dragStartPosition_1.x - elementRect_1.x) / elementRect_1.z * 2 - 1 : 0;
	                        var dollyY = scope_1.dollyToCursor ? (dragStartPosition_1.y - elementRect_1.y) / elementRect_1.w * -2 + 1 : 0;
	                        scope_1._state === ACTION.DOLLY ?
	                            dollyInternal_1(deltaY / 8, dollyX, dollyY) :
	                            zoomInternal_1(deltaY / 8);
	                        break;
	                    }
	                    case ACTION.TOUCH_DOLLY:
	                    case ACTION.TOUCH_ZOOM:
	                    case ACTION.TOUCH_DOLLY_TRUCK:
	                    case ACTION.TOUCH_ZOOM_TRUCK: {
	                        var TOUCH_DOLLY_FACTOR = 8;
	                        var touchEvent = event;
	                        var dx = _v2.x - touchEvent.touches[1].clientX;
	                        var dy = _v2.y - touchEvent.touches[1].clientY;
	                        var distance = Math.sqrt(dx * dx + dy * dy);
	                        var dollyDelta = dollyStart_1.y - distance;
	                        dollyStart_1.set(0, distance);
	                        var dollyX = scope_1.dollyToCursor ? (lastDragPosition_1.x - elementRect_1.x) / elementRect_1.z * 2 - 1 : 0;
	                        var dollyY = scope_1.dollyToCursor ? (lastDragPosition_1.y - elementRect_1.y) / elementRect_1.w * -2 + 1 : 0;
	                        scope_1._state === ACTION.TOUCH_DOLLY ||
	                            scope_1._state === ACTION.TOUCH_DOLLY_TRUCK ?
	                            dollyInternal_1(dollyDelta / TOUCH_DOLLY_FACTOR, dollyX, dollyY) :
	                            zoomInternal_1(dollyDelta / TOUCH_DOLLY_FACTOR);
	                        if (scope_1._state === ACTION.TOUCH_DOLLY_TRUCK ||
	                            scope_1._state === ACTION.TOUCH_ZOOM_TRUCK) {
	                            truckInternal_1(deltaX, deltaY);
	                        }
	                        break;
	                    }
	                    case ACTION.TRUCK:
	                    case ACTION.TOUCH_TRUCK: {
	                        truckInternal_1(deltaX, deltaY);
	                        break;
	                    }
	                }
	                scope_1.dispatchEvent({
	                    type: 'control',
	                    originalEvent: event,
	                });
	            };
	            var endDragging_1 = function (event) {
	                if (!scope_1.enabled)
	                    return;
	                scope_1._state = ACTION.NONE;
	                document.removeEventListener('mousemove', dragging_1);
	                document.removeEventListener('touchmove', dragging_1);
	                document.removeEventListener('mouseup', endDragging_1);
	                document.removeEventListener('touchend', endDragging_1);
	                scope_1.dispatchEvent({
	                    type: 'controlend',
	                    originalEvent: event,
	                });
	            };
	            _this._domElement.addEventListener('mousedown', onMouseDown_1);
	            _this._domElement.addEventListener('touchstart', onTouchStart_1);
	            _this._domElement.addEventListener('wheel', onMouseWheel_1);
	            _this._domElement.addEventListener('contextmenu', onContextMenu_1);
	            _this._removeAllEventListeners = function () {
	                scope_1._domElement.removeEventListener('mousedown', onMouseDown_1);
	                scope_1._domElement.removeEventListener('touchstart', onTouchStart_1);
	                scope_1._domElement.removeEventListener('wheel', onMouseWheel_1);
	                scope_1._domElement.removeEventListener('contextmenu', onContextMenu_1);
	                document.removeEventListener('mousemove', dragging_1);
	                document.removeEventListener('touchmove', dragging_1);
	                document.removeEventListener('mouseup', endDragging_1);
	                document.removeEventListener('touchend', endDragging_1);
	            };
	        }
	        _this.update(0);
	        return _this;
	    }
	    CameraControls.install = function (libs) {
	        THREE = libs.THREE;
	        _ORIGIN = Object.freeze(new THREE.Vector3(0, 0, 0));
	        _AXIS_Y = Object.freeze(new THREE.Vector3(0, 1, 0));
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
	    };
	    Object.defineProperty(CameraControls, "ACTION", {
	        get: function () {
	            return readonlyACTION;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(CameraControls.prototype, "phiSpeed", {
	        set: function (speed) {
	            console.warn('phiSpeed was renamed. use azimuthRotateSpeed instead');
	            this.azimuthRotateSpeed = speed;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(CameraControls.prototype, "thetaSpeed", {
	        set: function (speed) {
	            console.warn('thetaSpeed was renamed. use polarRotateSpeed instead');
	            this.polarRotateSpeed = speed;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(CameraControls.prototype, "boundaryEnclosesCamera", {
	        get: function () {
	            return this._boundaryEnclosesCamera;
	        },
	        set: function (boundaryEnclosesCamera) {
	            this._boundaryEnclosesCamera = boundaryEnclosesCamera;
	            this._hasUpdated = true;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    CameraControls.prototype.rotate = function (azimuthAngle, polarAngle, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        this.rotateTo(this._sphericalEnd.theta + azimuthAngle, this._sphericalEnd.phi + polarAngle, enableTransition);
	    };
	    CameraControls.prototype.rotateTo = function (azimuthAngle, polarAngle, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        var theta = THREE.Math.clamp(azimuthAngle, this.minAzimuthAngle, this.maxAzimuthAngle);
	        var phi = THREE.Math.clamp(polarAngle, this.minPolarAngle, this.maxPolarAngle);
	        this._sphericalEnd.theta = theta;
	        this._sphericalEnd.phi = phi;
	        this._sphericalEnd.makeSafe();
	        if (!enableTransition) {
	            this._spherical.theta = this._sphericalEnd.theta;
	            this._spherical.phi = this._sphericalEnd.phi;
	        }
	        this._hasUpdated = true;
	    };
	    CameraControls.prototype.dolly = function (distance, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        this.dollyTo(this._sphericalEnd.radius - distance, enableTransition);
	    };
	    CameraControls.prototype.dollyTo = function (distance, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        if (notSupportedInOrthographicCamera(this._camera, 'dolly'))
	            return;
	        this._sphericalEnd.radius = THREE.Math.clamp(distance, this.minDistance, this.maxDistance);
	        if (!enableTransition) {
	            this._spherical.radius = this._sphericalEnd.radius;
	        }
	        this._hasUpdated = true;
	    };
	    CameraControls.prototype.zoom = function (zoomStep, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        this.zoomTo(this._zoomEnd + zoomStep, enableTransition);
	    };
	    CameraControls.prototype.zoomTo = function (zoom, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        this._zoomEnd = THREE.Math.clamp(zoom, this.minZoom, this.maxZoom);
	        if (!enableTransition) {
	            this._zoom = this._zoomEnd;
	        }
	        this._hasUpdated = true;
	    };
	    CameraControls.prototype.pan = function (x, y, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        console.log('`pan` has been renamed to `truck`');
	        this.truck(x, y, enableTransition);
	    };
	    CameraControls.prototype.truck = function (x, y, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        this._camera.updateMatrix();
	        _xColumn.setFromMatrixColumn(this._camera.matrix, 0);
	        _yColumn.setFromMatrixColumn(this._camera.matrix, 1);
	        _xColumn.multiplyScalar(x);
	        _yColumn.multiplyScalar(-y);
	        var offset = _v3A.copy(_xColumn).add(_yColumn);
	        this._encloseToBoundary(this._targetEnd, offset, this.boundaryFriction);
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	        }
	        this._hasUpdated = true;
	    };
	    CameraControls.prototype.forward = function (distance, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        _v3A.setFromMatrixColumn(this._camera.matrix, 0);
	        _v3A.crossVectors(this._camera.up, _v3A);
	        _v3A.multiplyScalar(distance);
	        this._encloseToBoundary(this._targetEnd, _v3A, this.boundaryFriction);
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	        }
	        this._hasUpdated = true;
	    };
	    CameraControls.prototype.moveTo = function (x, y, z, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        this._targetEnd.set(x, y, z);
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	        }
	        this._hasUpdated = true;
	    };
	    CameraControls.prototype.fitTo = function (box3OrObject, enableTransition, options) {
	        if (options === void 0) { options = FIT_TO_OPTION_DEFAULT; }
	        if (notSupportedInOrthographicCamera(this._camera, 'fitTo'))
	            return;
	        var paddingLeft = options.paddingLeft || 0;
	        var paddingRight = options.paddingRight || 0;
	        var paddingBottom = options.paddingBottom || 0;
	        var paddingTop = options.paddingTop || 0;
	        var boundingBox = box3OrObject.isBox3 ? box3OrObject.clone() : new THREE.Box3().setFromObject(box3OrObject);
	        var size = boundingBox.getSize(_v3A);
	        var boundingWidth = size.x + paddingLeft + paddingRight;
	        var boundingHeight = size.y + paddingTop + paddingBottom;
	        var boundingDepth = size.z;
	        var distance = this.getDistanceToFit(boundingWidth, boundingHeight, boundingDepth);
	        this.dollyTo(distance, enableTransition);
	        var boundingBoxCenter = boundingBox.getCenter(_v3A);
	        var cx = boundingBoxCenter.x - (paddingLeft * 0.5 - paddingRight * 0.5);
	        var cy = boundingBoxCenter.y + (paddingTop * 0.5 - paddingBottom * 0.5);
	        var cz = boundingBoxCenter.z;
	        this.moveTo(cx, cy, cz, enableTransition);
	        this.normalizeRotations();
	        this.rotateTo(0, 90 * THREE.Math.DEG2RAD, enableTransition);
	    };
	    CameraControls.prototype.setLookAt = function (positionX, positionY, positionZ, targetX, targetY, targetZ, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        var position = _v3A.set(positionX, positionY, positionZ);
	        var target = _v3B.set(targetX, targetY, targetZ);
	        this._targetEnd.copy(target);
	        this._sphericalEnd.setFromVector3(position.sub(target).applyQuaternion(this._yAxisUpSpace));
	        this.normalizeRotations();
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	            this._spherical.copy(this._sphericalEnd);
	        }
	        this._hasUpdated = true;
	    };
	    CameraControls.prototype.lerpLookAt = function (positionAX, positionAY, positionAZ, targetAX, targetAY, targetAZ, positionBX, positionBY, positionBZ, targetBX, targetBY, targetBZ, t, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        var positionA = _v3A.set(positionAX, positionAY, positionAZ);
	        var targetA = _v3B.set(targetAX, targetAY, targetAZ);
	        _sphericalA.setFromVector3(positionA.sub(targetA).applyQuaternion(this._yAxisUpSpace));
	        var targetB = _v3A.set(targetBX, targetBY, targetBZ);
	        this._targetEnd.copy(targetA).lerp(targetB, t);
	        var positionB = _v3B.set(positionBX, positionBY, positionBZ);
	        _sphericalB.setFromVector3(positionB.sub(targetB).applyQuaternion(this._yAxisUpSpace));
	        var deltaTheta = _sphericalB.theta - _sphericalA.theta;
	        var deltaPhi = _sphericalB.phi - _sphericalA.phi;
	        var deltaRadius = _sphericalB.radius - _sphericalA.radius;
	        this._sphericalEnd.set(_sphericalA.radius + deltaRadius * t, _sphericalA.phi + deltaPhi * t, _sphericalA.theta + deltaTheta * t);
	        this.normalizeRotations();
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	            this._spherical.copy(this._sphericalEnd);
	        }
	        this._hasUpdated = true;
	    };
	    CameraControls.prototype.setPosition = function (positionX, positionY, positionZ, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        this.setLookAt(positionX, positionY, positionZ, this._targetEnd.x, this._targetEnd.y, this._targetEnd.z, enableTransition);
	    };
	    CameraControls.prototype.setTarget = function (targetX, targetY, targetZ, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        var pos = this.getPosition(_v3A);
	        this.setLookAt(pos.x, pos.y, pos.z, targetX, targetY, targetZ, enableTransition);
	    };
	    CameraControls.prototype.setBoundary = function (box3) {
	        if (!box3) {
	            this._boundary.min.set(-Infinity, -Infinity, -Infinity);
	            this._boundary.max.set(Infinity, Infinity, Infinity);
	            this._hasUpdated = true;
	            return;
	        }
	        this._boundary.copy(box3);
	        this._boundary.clampPoint(this._targetEnd, this._targetEnd);
	        this._hasUpdated = true;
	    };
	    CameraControls.prototype.setViewport = function (viewportOrX, y, width, height) {
	        if (viewportOrX === null) {
	            this._viewport = null;
	            return;
	        }
	        this._viewport = this._viewport || new THREE.Vector4();
	        if (typeof viewportOrX === 'number') {
	            this._viewport.set(viewportOrX, y, width, height);
	        }
	        else {
	            this._viewport.copy(viewportOrX);
	        }
	    };
	    CameraControls.prototype.getDistanceToFit = function (width, height, depth) {
	        if (notSupportedInOrthographicCamera(this._camera, 'getDistanceToFit'))
	            return this._spherical.radius;
	        var camera = this._camera;
	        var boundingRectAspect = width / height;
	        var fov = camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
	        var aspect = camera.aspect;
	        var heightToFit = boundingRectAspect < aspect ? height : width / aspect;
	        return heightToFit * 0.5 / Math.tan(fov * 0.5) + depth * 0.5;
	    };
	    CameraControls.prototype.getTarget = function (out) {
	        var _out = !!out && out.isVector3 ? out : new THREE.Vector3();
	        return _out.copy(this._targetEnd);
	    };
	    CameraControls.prototype.getPosition = function (out) {
	        var _out = !!out && out.isVector3 ? out : new THREE.Vector3();
	        return _out.setFromSpherical(this._sphericalEnd).applyQuaternion(this._yAxisUpSpaceInverse).add(this._targetEnd);
	    };
	    CameraControls.prototype.normalizeRotations = function () {
	        this._sphericalEnd.theta = this._sphericalEnd.theta % PI_2;
	        this._spherical.theta += PI_2 * Math.round((this._sphericalEnd.theta - this._spherical.theta) / PI_2);
	    };
	    CameraControls.prototype.reset = function (enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
	        this.setLookAt(this._position0.x, this._position0.y, this._position0.z, this._target0.x, this._target0.y, this._target0.z, enableTransition);
	        this.zoomTo(this._zoom0, enableTransition);
	    };
	    CameraControls.prototype.saveState = function () {
	        this._target0.copy(this._target);
	        this._position0.copy(this._camera.position);
	        this._zoom0 = this._zoom;
	    };
	    CameraControls.prototype.updateCameraUp = function () {
	        this._yAxisUpSpace.setFromUnitVectors(this._camera.up, _AXIS_Y);
	        this._yAxisUpSpaceInverse.copy(this._yAxisUpSpace).inverse();
	    };
	    CameraControls.prototype.update = function (delta) {
	        var dampingFactor = this._state === ACTION.NONE ? this.dampingFactor : this.draggingDampingFactor;
	        var lerpRatio = 1.0 - Math.exp(-dampingFactor * delta * FPS_60);
	        var deltaTheta = this._sphericalEnd.theta - this._spherical.theta;
	        var deltaPhi = this._sphericalEnd.phi - this._spherical.phi;
	        var deltaRadius = this._sphericalEnd.radius - this._spherical.radius;
	        var deltaTarget = _v3A.subVectors(this._targetEnd, this._target);
	        if (!approxZero(deltaTheta) ||
	            !approxZero(deltaPhi) ||
	            !approxZero(deltaRadius) ||
	            !approxZero(deltaTarget.x) ||
	            !approxZero(deltaTarget.y) ||
	            !approxZero(deltaTarget.z)) {
	            this._spherical.set(this._spherical.radius + deltaRadius * lerpRatio, this._spherical.phi + deltaPhi * lerpRatio, this._spherical.theta + deltaTheta * lerpRatio);
	            this._target.add(deltaTarget.multiplyScalar(lerpRatio));
	            this._hasUpdated = true;
	        }
	        else {
	            this._spherical.copy(this._sphericalEnd);
	            this._target.copy(this._targetEnd);
	        }
	        if (this._dollyControlAmount !== 0) {
	            if (this._camera.isPerspectiveCamera) {
	                var camera = this._camera;
	                var direction = _v3A.setFromSpherical(this._sphericalEnd).applyQuaternion(this._yAxisUpSpaceInverse).normalize().negate();
	                var planeX = _v3B.copy(direction).cross(camera.up).normalize();
	                if (planeX.lengthSq() === 0)
	                    planeX.x = 1.0;
	                var planeY = _v3C.crossVectors(planeX, direction);
	                var worldToScreen = this._sphericalEnd.radius * Math.tan(camera.getEffectiveFOV() * THREE.Math.DEG2RAD * 0.5);
	                var prevRadius = this._sphericalEnd.radius - this._dollyControlAmount;
	                var lerpRatio_1 = (prevRadius - this._sphericalEnd.radius) / this._sphericalEnd.radius;
	                var cursor = _v3A.copy(this._targetEnd)
	                    .add(planeX.multiplyScalar(this._dollyControlCoord.x * worldToScreen * camera.aspect))
	                    .add(planeY.multiplyScalar(this._dollyControlCoord.y * worldToScreen));
	                this._targetEnd.lerp(cursor, lerpRatio_1);
	                this._target.copy(this._targetEnd);
	            }
	            this._dollyControlAmount = 0;
	        }
	        var maxDistance = this._collisionTest();
	        this._spherical.radius = Math.min(this._spherical.radius, maxDistance);
	        this._spherical.makeSafe();
	        this._camera.position.setFromSpherical(this._spherical).applyQuaternion(this._yAxisUpSpaceInverse).add(this._target);
	        this._camera.lookAt(this._target);
	        if (this._boundaryEnclosesCamera) {
	            this._encloseToBoundary(this._camera.position.copy(this._target), _v3A.setFromSpherical(this._spherical).applyQuaternion(this._yAxisUpSpaceInverse), 1.0);
	        }
	        var zoomDelta = this._zoomEnd - this._zoom;
	        this._zoom += zoomDelta * lerpRatio;
	        if (this._camera.zoom !== this._zoom) {
	            if (approxZero(zoomDelta))
	                this._zoom = this._zoomEnd;
	            this._camera.zoom = this._zoom;
	            this._camera.updateProjectionMatrix();
	            this._updateNearPlaneCorners();
	            this._hasUpdated = true;
	        }
	        var updated = this._hasUpdated;
	        this._hasUpdated = false;
	        if (updated)
	            this.dispatchEvent({ type: 'update' });
	        return updated;
	    };
	    CameraControls.prototype.toJSON = function () {
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
	            dollyToCursor: this.dollyToCursor,
	            verticalDragToForward: this.verticalDragToForward,
	            target: this._targetEnd.toArray(),
	            position: this._camera.position.toArray(),
	            target0: this._target0.toArray(),
	            position0: this._position0.toArray(),
	        });
	    };
	    CameraControls.prototype.fromJSON = function (json, enableTransition) {
	        if (enableTransition === void 0) { enableTransition = false; }
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
	        this.dollyToCursor = obj.dollyToCursor;
	        this.verticalDragToForward = obj.verticalDragToForward;
	        this._target0.fromArray(obj.target0);
	        this._position0.fromArray(obj.position0);
	        this._targetEnd.fromArray(obj.target);
	        this._sphericalEnd.setFromVector3(position.sub(this._target0).applyQuaternion(this._yAxisUpSpace));
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	            this._spherical.copy(this._sphericalEnd);
	        }
	        this._hasUpdated = true;
	    };
	    CameraControls.prototype.dispose = function () {
	        this._removeAllEventListeners();
	    };
	    CameraControls.prototype._encloseToBoundary = function (position, offset, friction) {
	        var offsetLength2 = offset.lengthSq();
	        if (offsetLength2 === 0.0) {
	            return position;
	        }
	        var newTarget = _v3B.copy(offset).add(position);
	        var clampedTarget = this._boundary.clampPoint(newTarget, _v3C);
	        var deltaClampedTarget = clampedTarget.sub(newTarget);
	        var deltaClampedTargetLength2 = deltaClampedTarget.lengthSq();
	        if (deltaClampedTargetLength2 === 0.0) {
	            return position.add(offset);
	        }
	        else if (deltaClampedTargetLength2 === offsetLength2) {
	            return position;
	        }
	        else if (friction === 0.0) {
	            return position.add(offset).add(deltaClampedTarget);
	        }
	        else {
	            var offsetFactor = 1.0 + friction * deltaClampedTargetLength2 / offset.dot(deltaClampedTarget);
	            return position
	                .add(_v3B.copy(offset).multiplyScalar(offsetFactor))
	                .add(deltaClampedTarget.multiplyScalar(1.0 - friction));
	        }
	    };
	    CameraControls.prototype._updateNearPlaneCorners = function () {
	        if (notSupportedInOrthographicCamera(this._camera, '_updateNearPlaneCorners'))
	            return;
	        var camera = this._camera;
	        var near = camera.near;
	        var fov = camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
	        var heightHalf = Math.tan(fov * 0.5) * near;
	        var widthHalf = heightHalf * camera.aspect;
	        this._nearPlaneCorners = [
	            new THREE.Vector3(-widthHalf, -heightHalf, 0),
	            new THREE.Vector3(widthHalf, -heightHalf, 0),
	            new THREE.Vector3(widthHalf, heightHalf, 0),
	            new THREE.Vector3(-widthHalf, heightHalf, 0),
	        ];
	    };
	    CameraControls.prototype._collisionTest = function () {
	        var distance = Infinity;
	        if (notSupportedInOrthographicCamera(this._camera, '_collisionTest'))
	            return distance;
	        var hasCollider = this.colliderMeshes.length >= 1;
	        if (!hasCollider)
	            return distance;
	        distance = this._spherical.radius;
	        var direction = _v3A.setFromSpherical(this._spherical).divideScalar(distance);
	        _rotationMatrix.lookAt(_ORIGIN, direction, this._camera.up);
	        for (var i = 0; i < 4; i++) {
	            var nearPlaneCorner = _v3B.copy(this._nearPlaneCorners[i]);
	            nearPlaneCorner.applyMatrix4(_rotationMatrix);
	            var origin_1 = _v3C.addVectors(this._target, nearPlaneCorner);
	            _raycaster.set(origin_1, direction);
	            _raycaster.far = distance;
	            var intersects = _raycaster.intersectObjects(this.colliderMeshes);
	            if (intersects.length !== 0 && intersects[0].distance < distance) {
	                distance = intersects[0].distance;
	            }
	        }
	        return distance;
	    };
	    CameraControls.prototype._getClientRect = function (target) {
	        var rect = this._domElement.getBoundingClientRect();
	        target.x = rect.left;
	        target.y = rect.top;
	        if (this._viewport) {
	            target.x += this._viewport.x;
	            target.y += rect.height - this._viewport.w - this._viewport.y;
	            target.z = this._viewport.z;
	            target.w = this._viewport.w;
	        }
	        else {
	            target.z = rect.width;
	            target.w = rect.height;
	        }
	        return target;
	    };
	    CameraControls.prototype._removeAllEventListeners = function () { };
	    return CameraControls;
	}(EventDispatcher));

	return CameraControls;

})));
