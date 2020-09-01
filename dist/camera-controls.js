/*!
 * camera-controls
 * https://github.com/yomotsu/camera-controls
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.CameraControls = factory());
}(this, (function () { 'use strict';

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

	const PI_2 = Math.PI * 2;
	const PI_HALF = Math.PI / 2;
	const FPS_60 = 1 / 0.016;

	const EPSILON = 1e-5;
	function approxZero(number) {
	    return Math.abs(number) < EPSILON;
	}
	function approxEquals(a, b) {
	    return approxZero(a - b);
	}
	function roundToStep(value, step) {
	    return Math.round(value / step) * step;
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
	        const touchEvent = event;
	        for (let i = 0; i < touchEvent.touches.length; i++) {
	            out.x += touchEvent.touches[i].clientX;
	            out.y += touchEvent.touches[i].clientY;
	        }
	        out.x /= touchEvent.touches.length;
	        out.y /= touchEvent.touches.length;
	        return out;
	    }
	    else {
	        const mouseEvent = event;
	        out.set(mouseEvent.clientX, mouseEvent.clientY);
	        return out;
	    }
	}

	function notSupportedInOrthographicCamera(camera, message) {
	    if (!camera.isPerspectiveCamera) {
	        console.warn(`${message} is not supported in OrthographicCamera`);
	        return true;
	    }
	    return false;
	}

	class EventDispatcher {
	    constructor() {
	        this._listeners = {};
	    }
	    addEventListener(type, listener) {
	        const listeners = this._listeners;
	        if (listeners[type] === undefined)
	            listeners[type] = [];
	        if (listeners[type].indexOf(listener) === -1)
	            listeners[type].push(listener);
	    }
	    removeEventListener(type, listener) {
	        const listeners = this._listeners;
	        const listenerArray = listeners[type];
	        if (listenerArray !== undefined) {
	            const index = listenerArray.indexOf(listener);
	            if (index !== -1)
	                listenerArray.splice(index, 1);
	        }
	    }
	    removeAllEventListeners(type) {
	        if (!type) {
	            this._listeners = {};
	            return;
	        }
	        if (Array.isArray(this._listeners[type]))
	            this._listeners[type].length = 0;
	    }
	    dispatchEvent(event) {
	        const listeners = this._listeners;
	        const listenerArray = listeners[event.type];
	        if (listenerArray !== undefined) {
	            event.target = this;
	            const array = listenerArray.slice(0);
	            for (let i = 0, l = array.length; i < l; i++) {
	                array[i].call(this, event);
	            }
	        }
	    }
	}

	const isMac = /Mac/.test(navigator.platform);
	const readonlyACTION = Object.freeze(ACTION);
	const TOUCH_DOLLY_FACTOR = 1 / 8;
	let THREE;
	let _ORIGIN;
	let _AXIS_Y;
	let _AXIS_Z;
	let _v2;
	let _v3A;
	let _v3B;
	let _v3C;
	let _xColumn;
	let _yColumn;
	let _sphericalA;
	let _sphericalB;
	let _box3A;
	let _box3B;
	let _quaternionA;
	let _quaternionB;
	let _rotationMatrix;
	let _raycaster;
	class CameraControls extends EventDispatcher {
	    constructor(camera, domElement) {
	        super();
	        this.enabled = true;
	        this.minPolarAngle = 0;
	        this.maxPolarAngle = Math.PI;
	        this.minAzimuthAngle = -Infinity;
	        this.maxAzimuthAngle = Infinity;
	        this.minDistance = 0;
	        this.maxDistance = Infinity;
	        this.minZoom = 0.01;
	        this.maxZoom = Infinity;
	        this.dampingFactor = 0.05;
	        this.draggingDampingFactor = 0.25;
	        this.azimuthRotateSpeed = 1.0;
	        this.polarRotateSpeed = 1.0;
	        this.dollySpeed = 1.0;
	        this.truckSpeed = 2.0;
	        this.dollyToCursor = false;
	        this.verticalDragToForward = false;
	        this.boundaryFriction = 0.0;
	        this.colliderMeshes = [];
	        this._state = ACTION.NONE;
	        this._viewport = null;
	        this._dollyControlAmount = 0;
	        this._boundaryEnclosesCamera = false;
	        this._needsUpdate = true;
	        this._updatedLastTime = false;
	        this._camera = camera;
	        this._yAxisUpSpace = new THREE.Quaternion().setFromUnitVectors(this._camera.up, _AXIS_Y);
	        this._yAxisUpSpaceInverse = this._yAxisUpSpace.clone().inverse();
	        this._state = ACTION.NONE;
	        this._domElement = domElement;
	        this._target = new THREE.Vector3();
	        this._targetEnd = this._target.clone();
	        this._spherical = new THREE.Spherical().setFromVector3(_v3A.copy(this._camera.position).applyQuaternion(this._yAxisUpSpace));
	        this._sphericalEnd = this._spherical.clone();
	        this._zoom = this._camera.zoom;
	        this._zoomEnd = this._zoom;
	        this._nearPlaneCorners = [
	            new THREE.Vector3(),
	            new THREE.Vector3(),
	            new THREE.Vector3(),
	            new THREE.Vector3(),
	        ];
	        this._updateNearPlaneCorners();
	        this._boundary = new THREE.Box3(new THREE.Vector3(-Infinity, -Infinity, -Infinity), new THREE.Vector3(Infinity, Infinity, Infinity));
	        this._target0 = this._target.clone();
	        this._position0 = this._camera.position.clone();
	        this._zoom0 = this._zoom;
	        this._dollyControlAmount = 0;
	        this._dollyControlCoord = new THREE.Vector2();
	        this.mouseButtons = {
	            left: ACTION.ROTATE,
	            middle: ACTION.DOLLY,
	            right: ACTION.TRUCK,
	            wheel: this._camera.isPerspectiveCamera ? ACTION.DOLLY :
	                this._camera.isOrthographicCamera ? ACTION.ZOOM :
	                    ACTION.NONE,
	        };
	        this.touches = {
	            one: ACTION.TOUCH_ROTATE,
	            two: this._camera.isPerspectiveCamera ? ACTION.TOUCH_DOLLY_TRUCK :
	                this._camera.isOrthographicCamera ? ACTION.TOUCH_ZOOM_TRUCK :
	                    ACTION.NONE,
	            three: ACTION.TOUCH_TRUCK,
	        };
	        if (this._domElement) {
	            const dragStartPosition = new THREE.Vector2();
	            const lastDragPosition = new THREE.Vector2();
	            const dollyStart = new THREE.Vector2();
	            const elementRect = new THREE.Vector4();
	            const truckInternal = (deltaX, deltaY) => {
	                if (this._camera.isPerspectiveCamera) {
	                    const camera = this._camera;
	                    const offset = _v3A.copy(camera.position).sub(this._target);
	                    const fov = camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
	                    const targetDistance = offset.length() * Math.tan(fov * 0.5);
	                    const truckX = (this.truckSpeed * deltaX * targetDistance / elementRect.w);
	                    const pedestalY = (this.truckSpeed * deltaY * targetDistance / elementRect.w);
	                    if (this.verticalDragToForward) {
	                        this.truck(truckX, 0, true);
	                        this.forward(-pedestalY, true);
	                    }
	                    else {
	                        this.truck(truckX, pedestalY, true);
	                    }
	                }
	                else if (this._camera.isOrthographicCamera) {
	                    const camera = this._camera;
	                    const truckX = deltaX * (camera.right - camera.left) / camera.zoom / elementRect.z;
	                    const pedestalY = deltaY * (camera.top - camera.bottom) / camera.zoom / elementRect.w;
	                    this.truck(truckX, pedestalY, true);
	                }
	            };
	            const rotateInternal = (deltaX, deltaY) => {
	                const theta = PI_2 * this.azimuthRotateSpeed * deltaX / elementRect.w;
	                const phi = PI_2 * this.polarRotateSpeed * deltaY / elementRect.w;
	                this.rotate(theta, phi, true);
	            };
	            const dollyInternal = (delta, x, y) => {
	                const dollyScale = Math.pow(0.95, -delta * this.dollySpeed);
	                const distance = this._sphericalEnd.radius * dollyScale;
	                const prevRadius = this._sphericalEnd.radius;
	                this.dollyTo(distance);
	                if (this.dollyToCursor) {
	                    this._dollyControlAmount += this._sphericalEnd.radius - prevRadius;
	                    this._dollyControlCoord.set(x, y);
	                }
	                return;
	            };
	            const zoomInternal = (delta) => {
	                const zoomScale = Math.pow(0.95, delta * this.dollySpeed);
	                this.zoomTo(this._zoom * zoomScale);
	                return;
	            };
	            const onMouseDown = (event) => {
	                if (!this.enabled)
	                    return;
	                event.preventDefault();
	                const prevState = this._state;
	                switch (event.button) {
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
	                if (prevState !== this._state) {
	                    startDragging(event);
	                }
	            };
	            const onTouchStart = (event) => {
	                if (!this.enabled)
	                    return;
	                event.preventDefault();
	                const prevState = this._state;
	                switch (event.touches.length) {
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
	                if (prevState !== this._state) {
	                    startDragging(event);
	                }
	            };
	            let lastScrollTimeStamp = -1;
	            const onMouseWheel = (event) => {
	                if (!this.enabled || this.mouseButtons.wheel === ACTION.NONE)
	                    return;
	                event.preventDefault();
	                if (this.dollyToCursor ||
	                    this.mouseButtons.wheel === ACTION.ROTATE ||
	                    this.mouseButtons.wheel === ACTION.TRUCK) {
	                    const now = performance.now();
	                    if (lastScrollTimeStamp - now < 1000)
	                        this._getClientRect(elementRect);
	                    lastScrollTimeStamp = now;
	                }
	                const deltaYFactor = isMac ? -1 : -3;
	                const delta = (event.deltaMode === 1) ? event.deltaY / deltaYFactor : event.deltaY / (deltaYFactor * 10);
	                const x = this.dollyToCursor ? (event.clientX - elementRect.x) / elementRect.z * 2 - 1 : 0;
	                const y = this.dollyToCursor ? (event.clientY - elementRect.y) / elementRect.w * -2 + 1 : 0;
	                switch (this.mouseButtons.wheel) {
	                    case ACTION.ROTATE: {
	                        rotateInternal(event.deltaX, event.deltaY);
	                        break;
	                    }
	                    case ACTION.TRUCK: {
	                        truckInternal(event.deltaX, event.deltaY);
	                        break;
	                    }
	                    case ACTION.DOLLY: {
	                        dollyInternal(-delta, x, y);
	                        break;
	                    }
	                    case ACTION.ZOOM: {
	                        zoomInternal(-delta);
	                        break;
	                    }
	                }
	                this.dispatchEvent({
	                    type: 'control',
	                    originalEvent: event,
	                });
	            };
	            const onContextMenu = (event) => {
	                if (!this.enabled)
	                    return;
	                event.preventDefault();
	            };
	            const startDragging = (event) => {
	                if (!this.enabled)
	                    return;
	                event.preventDefault();
	                extractClientCoordFromEvent(event, _v2);
	                this._getClientRect(elementRect);
	                dragStartPosition.copy(_v2);
	                lastDragPosition.copy(_v2);
	                const isMultiTouch = isTouchEvent(event) && event.touches.length >= 2;
	                if (isMultiTouch) {
	                    const touchEvent = event;
	                    const dx = _v2.x - touchEvent.touches[1].clientX;
	                    const dy = _v2.y - touchEvent.touches[1].clientY;
	                    const distance = Math.sqrt(dx * dx + dy * dy);
	                    dollyStart.set(0, distance);
	                    const x = (touchEvent.touches[0].clientX + touchEvent.touches[1].clientX) * 0.5;
	                    const y = (touchEvent.touches[0].clientY + touchEvent.touches[1].clientY) * 0.5;
	                    lastDragPosition.set(x, y);
	                }
	                document.addEventListener('mousemove', dragging);
	                document.addEventListener('touchmove', dragging, { passive: false });
	                document.addEventListener('mouseup', endDragging);
	                document.addEventListener('touchend', endDragging);
	                this.dispatchEvent({
	                    type: 'controlstart',
	                    originalEvent: event,
	                });
	            };
	            const dragging = (event) => {
	                if (!this.enabled)
	                    return;
	                event.preventDefault();
	                extractClientCoordFromEvent(event, _v2);
	                const deltaX = lastDragPosition.x - _v2.x;
	                const deltaY = lastDragPosition.y - _v2.y;
	                lastDragPosition.copy(_v2);
	                switch (this._state) {
	                    case ACTION.ROTATE:
	                    case ACTION.TOUCH_ROTATE: {
	                        rotateInternal(deltaX, deltaY);
	                        break;
	                    }
	                    case ACTION.DOLLY:
	                    case ACTION.ZOOM: {
	                        const dollyX = this.dollyToCursor ? (dragStartPosition.x - elementRect.x) / elementRect.z * 2 - 1 : 0;
	                        const dollyY = this.dollyToCursor ? (dragStartPosition.y - elementRect.y) / elementRect.w * -2 + 1 : 0;
	                        this._state === ACTION.DOLLY ?
	                            dollyInternal(deltaY * TOUCH_DOLLY_FACTOR, dollyX, dollyY) :
	                            zoomInternal(deltaY * TOUCH_DOLLY_FACTOR);
	                        break;
	                    }
	                    case ACTION.TOUCH_DOLLY:
	                    case ACTION.TOUCH_ZOOM:
	                    case ACTION.TOUCH_DOLLY_TRUCK:
	                    case ACTION.TOUCH_ZOOM_TRUCK: {
	                        const touchEvent = event;
	                        const dx = _v2.x - touchEvent.touches[1].clientX;
	                        const dy = _v2.y - touchEvent.touches[1].clientY;
	                        const distance = Math.sqrt(dx * dx + dy * dy);
	                        const dollyDelta = dollyStart.y - distance;
	                        dollyStart.set(0, distance);
	                        const dollyX = this.dollyToCursor ? (lastDragPosition.x - elementRect.x) / elementRect.z * 2 - 1 : 0;
	                        const dollyY = this.dollyToCursor ? (lastDragPosition.y - elementRect.y) / elementRect.w * -2 + 1 : 0;
	                        this._state === ACTION.TOUCH_DOLLY ||
	                            this._state === ACTION.TOUCH_DOLLY_TRUCK ?
	                            dollyInternal(dollyDelta * TOUCH_DOLLY_FACTOR, dollyX, dollyY) :
	                            zoomInternal(dollyDelta * TOUCH_DOLLY_FACTOR);
	                        if (this._state === ACTION.TOUCH_DOLLY_TRUCK ||
	                            this._state === ACTION.TOUCH_ZOOM_TRUCK) {
	                            truckInternal(deltaX, deltaY);
	                        }
	                        break;
	                    }
	                    case ACTION.TRUCK:
	                    case ACTION.TOUCH_TRUCK: {
	                        truckInternal(deltaX, deltaY);
	                        break;
	                    }
	                }
	                this.dispatchEvent({
	                    type: 'control',
	                    originalEvent: event,
	                });
	            };
	            const endDragging = (event) => {
	                if (!this.enabled)
	                    return;
	                this._state = ACTION.NONE;
	                document.removeEventListener('mousemove', dragging);
	                document.removeEventListener('touchmove', dragging, { passive: false });
	                document.removeEventListener('mouseup', endDragging);
	                document.removeEventListener('touchend', endDragging);
	                this.dispatchEvent({
	                    type: 'controlend',
	                    originalEvent: event,
	                });
	            };
	            this._domElement.addEventListener('mousedown', onMouseDown);
	            this._domElement.addEventListener('touchstart', onTouchStart);
	            this._domElement.addEventListener('wheel', onMouseWheel);
	            this._domElement.addEventListener('contextmenu', onContextMenu);
	            this._removeAllEventListeners = () => {
	                this._domElement.removeEventListener('mousedown', onMouseDown);
	                this._domElement.removeEventListener('touchstart', onTouchStart);
	                this._domElement.removeEventListener('wheel', onMouseWheel);
	                this._domElement.removeEventListener('contextmenu', onContextMenu);
	                document.removeEventListener('mousemove', dragging);
	                document.removeEventListener('touchmove', dragging, { passive: false });
	                document.removeEventListener('mouseup', endDragging);
	                document.removeEventListener('touchend', endDragging);
	            };
	        }
	        this.update(0);
	    }
	    static install(libs) {
	        THREE = libs.THREE;
	        _ORIGIN = Object.freeze(new THREE.Vector3(0, 0, 0));
	        _AXIS_Y = Object.freeze(new THREE.Vector3(0, 1, 0));
	        _AXIS_Z = Object.freeze(new THREE.Vector3(0, 0, 1));
	        _v2 = new THREE.Vector2();
	        _v3A = new THREE.Vector3();
	        _v3B = new THREE.Vector3();
	        _v3C = new THREE.Vector3();
	        _xColumn = new THREE.Vector3();
	        _yColumn = new THREE.Vector3();
	        _sphericalA = new THREE.Spherical();
	        _sphericalB = new THREE.Spherical();
	        _box3A = new THREE.Box3();
	        _box3B = new THREE.Box3();
	        _quaternionA = new THREE.Quaternion();
	        _quaternionB = new THREE.Quaternion();
	        _rotationMatrix = new THREE.Matrix4();
	        _raycaster = new THREE.Raycaster();
	    }
	    static get ACTION() {
	        return readonlyACTION;
	    }
	    get currentAction() {
	        return this._state;
	    }
	    get distance() {
	        return this._spherical.radius;
	    }
	    set distance(distance) {
	        if (this._spherical.radius === distance &&
	            this._sphericalEnd.radius === distance)
	            return;
	        this._spherical.radius = distance;
	        this._sphericalEnd.radius = distance;
	        this._needsUpdate = true;
	    }
	    get azimuthAngle() {
	        return this._spherical.theta;
	    }
	    set azimuthAngle(azimuthAngle) {
	        if (this._spherical.theta === azimuthAngle &&
	            this._sphericalEnd.theta === azimuthAngle)
	            return;
	        this._spherical.theta = azimuthAngle;
	        this._sphericalEnd.theta = azimuthAngle;
	        this._needsUpdate = true;
	    }
	    get polarAngle() {
	        return this._spherical.phi;
	    }
	    set polarAngle(polarAngle) {
	        if (this._spherical.phi === polarAngle &&
	            this._sphericalEnd.phi === polarAngle)
	            return;
	        this._spherical.phi = polarAngle;
	        this._sphericalEnd.phi = polarAngle;
	        this._needsUpdate = true;
	    }
	    set phiSpeed(speed) {
	        console.warn('phiSpeed was renamed. use azimuthRotateSpeed instead');
	        this.azimuthRotateSpeed = speed;
	    }
	    set thetaSpeed(speed) {
	        console.warn('thetaSpeed was renamed. use polarRotateSpeed instead');
	        this.polarRotateSpeed = speed;
	    }
	    get boundaryEnclosesCamera() {
	        return this._boundaryEnclosesCamera;
	    }
	    set boundaryEnclosesCamera(boundaryEnclosesCamera) {
	        this._boundaryEnclosesCamera = boundaryEnclosesCamera;
	        this._needsUpdate = true;
	    }
	    rotate(azimuthAngle, polarAngle, enableTransition = false) {
	        this.rotateTo(this._sphericalEnd.theta + azimuthAngle, this._sphericalEnd.phi + polarAngle, enableTransition);
	    }
	    rotateTo(azimuthAngle, polarAngle, enableTransition = false) {
	        const theta = THREE.Math.clamp(azimuthAngle, this.minAzimuthAngle, this.maxAzimuthAngle);
	        const phi = THREE.Math.clamp(polarAngle, this.minPolarAngle, this.maxPolarAngle);
	        this._sphericalEnd.theta = theta;
	        this._sphericalEnd.phi = phi;
	        this._sphericalEnd.makeSafe();
	        if (!enableTransition) {
	            this._spherical.theta = this._sphericalEnd.theta;
	            this._spherical.phi = this._sphericalEnd.phi;
	        }
	        this._needsUpdate = true;
	    }
	    dolly(distance, enableTransition = false) {
	        this.dollyTo(this._sphericalEnd.radius - distance, enableTransition);
	    }
	    dollyTo(distance, enableTransition = false) {
	        if (notSupportedInOrthographicCamera(this._camera, 'dolly'))
	            return;
	        this._sphericalEnd.radius = THREE.Math.clamp(distance, this.minDistance, this.maxDistance);
	        if (!enableTransition) {
	            this._spherical.radius = this._sphericalEnd.radius;
	        }
	        this._needsUpdate = true;
	    }
	    zoom(zoomStep, enableTransition = false) {
	        this.zoomTo(this._zoomEnd + zoomStep, enableTransition);
	    }
	    zoomTo(zoom, enableTransition = false) {
	        this._zoomEnd = THREE.Math.clamp(zoom, this.minZoom, this.maxZoom);
	        if (!enableTransition) {
	            this._zoom = this._zoomEnd;
	        }
	        this._needsUpdate = true;
	    }
	    pan(x, y, enableTransition = false) {
	        console.log('`pan` has been renamed to `truck`');
	        this.truck(x, y, enableTransition);
	    }
	    truck(x, y, enableTransition = false) {
	        this._camera.updateMatrix();
	        _xColumn.setFromMatrixColumn(this._camera.matrix, 0);
	        _yColumn.setFromMatrixColumn(this._camera.matrix, 1);
	        _xColumn.multiplyScalar(x);
	        _yColumn.multiplyScalar(-y);
	        const offset = _v3A.copy(_xColumn).add(_yColumn);
	        this._encloseToBoundary(this._targetEnd, offset, this.boundaryFriction);
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	        }
	        this._needsUpdate = true;
	    }
	    forward(distance, enableTransition = false) {
	        _v3A.setFromMatrixColumn(this._camera.matrix, 0);
	        _v3A.crossVectors(this._camera.up, _v3A);
	        _v3A.multiplyScalar(distance);
	        this._encloseToBoundary(this._targetEnd, _v3A, this.boundaryFriction);
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	        }
	        this._needsUpdate = true;
	    }
	    moveTo(x, y, z, enableTransition = false) {
	        this._targetEnd.set(x, y, z);
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	        }
	        this._needsUpdate = true;
	    }
	    fitTo(box3OrObject, enableTransition, { paddingLeft = 0, paddingRight = 0, paddingBottom = 0, paddingTop = 0 } = {}) {
	        const aabb = box3OrObject.isBox3
	            ? _box3A.copy(box3OrObject)
	            : _box3A.setFromObject(box3OrObject);
	        const theta = roundToStep(this._sphericalEnd.theta, PI_HALF);
	        const phi = roundToStep(this._sphericalEnd.phi, PI_HALF);
	        this.rotateTo(theta, phi, enableTransition);
	        const normal = _v3A.setFromSpherical(this._sphericalEnd).normalize();
	        const rotation = _quaternionA.setFromUnitVectors(normal, _AXIS_Z);
	        const viewFromPolar = approxEquals(Math.abs(normal.y), 1);
	        if (viewFromPolar) {
	            rotation.multiply(_quaternionB.setFromAxisAngle(_AXIS_Y, theta));
	        }
	        const bb = _box3B.makeEmpty();
	        _v3B.copy(aabb.min).applyQuaternion(rotation);
	        bb.expandByPoint(_v3B);
	        _v3B.copy(aabb.min).setX(aabb.max.x).applyQuaternion(rotation);
	        bb.expandByPoint(_v3B);
	        _v3B.copy(aabb.min).setY(aabb.max.y).applyQuaternion(rotation);
	        bb.expandByPoint(_v3B);
	        _v3B.copy(aabb.max).setZ(aabb.min.z).applyQuaternion(rotation);
	        bb.expandByPoint(_v3B);
	        _v3B.copy(aabb.min).setZ(aabb.max.z).applyQuaternion(rotation);
	        bb.expandByPoint(_v3B);
	        _v3B.copy(aabb.max).setY(aabb.min.y).applyQuaternion(rotation);
	        bb.expandByPoint(_v3B);
	        _v3B.copy(aabb.max).setX(aabb.min.x).applyQuaternion(rotation);
	        bb.expandByPoint(_v3B);
	        _v3B.copy(aabb.max).applyQuaternion(rotation);
	        bb.expandByPoint(_v3B);
	        rotation.setFromUnitVectors(_AXIS_Z, normal);
	        bb.min.x -= paddingLeft;
	        bb.min.y -= paddingBottom;
	        bb.max.x += paddingRight;
	        bb.max.y += paddingTop;
	        const bbSize = bb.getSize(_v3A);
	        const center = bb.getCenter(_v3B).applyQuaternion(rotation);
	        const isPerspectiveCamera = this._camera.isPerspectiveCamera;
	        const isOrthographicCamera = this._camera.isOrthographicCamera;
	        if (isPerspectiveCamera) {
	            const distance = this.getDistanceToFit(bbSize.x, bbSize.y, bbSize.z);
	            this.moveTo(center.x, center.y, center.z, enableTransition);
	            this.dollyTo(distance, enableTransition);
	            return;
	        }
	        else if (isOrthographicCamera) {
	            const camera = this._camera;
	            const width = camera.right - camera.left;
	            const height = camera.top - camera.bottom;
	            const zoom = Math.min(width / bbSize.x, height / bbSize.y);
	            this.moveTo(center.x, center.y, center.z, enableTransition);
	            this.zoomTo(zoom, enableTransition);
	            return;
	        }
	    }
	    setLookAt(positionX, positionY, positionZ, targetX, targetY, targetZ, enableTransition = false) {
	        const position = _v3A.set(positionX, positionY, positionZ);
	        const target = _v3B.set(targetX, targetY, targetZ);
	        this._targetEnd.copy(target);
	        this._sphericalEnd.setFromVector3(position.sub(target).applyQuaternion(this._yAxisUpSpace));
	        this.normalizeRotations();
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	            this._spherical.copy(this._sphericalEnd);
	        }
	        this._needsUpdate = true;
	    }
	    lerpLookAt(positionAX, positionAY, positionAZ, targetAX, targetAY, targetAZ, positionBX, positionBY, positionBZ, targetBX, targetBY, targetBZ, t, enableTransition = false) {
	        const positionA = _v3A.set(positionAX, positionAY, positionAZ);
	        const targetA = _v3B.set(targetAX, targetAY, targetAZ);
	        _sphericalA.setFromVector3(positionA.sub(targetA).applyQuaternion(this._yAxisUpSpace));
	        const targetB = _v3A.set(targetBX, targetBY, targetBZ);
	        this._targetEnd.copy(targetA).lerp(targetB, t);
	        const positionB = _v3B.set(positionBX, positionBY, positionBZ);
	        _sphericalB.setFromVector3(positionB.sub(targetB).applyQuaternion(this._yAxisUpSpace));
	        const deltaTheta = _sphericalB.theta - _sphericalA.theta;
	        const deltaPhi = _sphericalB.phi - _sphericalA.phi;
	        const deltaRadius = _sphericalB.radius - _sphericalA.radius;
	        this._sphericalEnd.set(_sphericalA.radius + deltaRadius * t, _sphericalA.phi + deltaPhi * t, _sphericalA.theta + deltaTheta * t);
	        this.normalizeRotations();
	        if (!enableTransition) {
	            this._target.copy(this._targetEnd);
	            this._spherical.copy(this._sphericalEnd);
	        }
	        this._needsUpdate = true;
	    }
	    setPosition(positionX, positionY, positionZ, enableTransition = false) {
	        this.setLookAt(positionX, positionY, positionZ, this._targetEnd.x, this._targetEnd.y, this._targetEnd.z, enableTransition);
	    }
	    setTarget(targetX, targetY, targetZ, enableTransition = false) {
	        const pos = this.getPosition(_v3A);
	        this.setLookAt(pos.x, pos.y, pos.z, targetX, targetY, targetZ, enableTransition);
	    }
	    setBoundary(box3) {
	        if (!box3) {
	            this._boundary.min.set(-Infinity, -Infinity, -Infinity);
	            this._boundary.max.set(Infinity, Infinity, Infinity);
	            this._needsUpdate = true;
	            return;
	        }
	        this._boundary.copy(box3);
	        this._boundary.clampPoint(this._targetEnd, this._targetEnd);
	        this._needsUpdate = true;
	    }
	    setViewport(viewportOrX, y, width, height) {
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
	    }
	    getDistanceToFit(width, height, depth) {
	        if (notSupportedInOrthographicCamera(this._camera, 'getDistanceToFit'))
	            return this._spherical.radius;
	        const camera = this._camera;
	        const boundingRectAspect = width / height;
	        const fov = camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
	        const aspect = camera.aspect;
	        const heightToFit = boundingRectAspect < aspect ? height : width / aspect;
	        return heightToFit * 0.5 / Math.tan(fov * 0.5) + depth * 0.5;
	    }
	    getTarget(out) {
	        const _out = !!out && out.isVector3 ? out : new THREE.Vector3();
	        return _out.copy(this._targetEnd);
	    }
	    getPosition(out) {
	        const _out = !!out && out.isVector3 ? out : new THREE.Vector3();
	        return _out.setFromSpherical(this._sphericalEnd).applyQuaternion(this._yAxisUpSpaceInverse).add(this._targetEnd);
	    }
	    normalizeRotations() {
	        this._sphericalEnd.theta = this._sphericalEnd.theta % PI_2;
	        if (this._sphericalEnd.theta < 0)
	            this._sphericalEnd.theta += PI_2;
	        this._spherical.theta += PI_2 * Math.round((this._sphericalEnd.theta - this._spherical.theta) / PI_2);
	    }
	    reset(enableTransition = false) {
	        this.setLookAt(this._position0.x, this._position0.y, this._position0.z, this._target0.x, this._target0.y, this._target0.z, enableTransition);
	        this.zoomTo(this._zoom0, enableTransition);
	    }
	    saveState() {
	        this._target0.copy(this._target);
	        this._position0.copy(this._camera.position);
	        this._zoom0 = this._zoom;
	    }
	    updateCameraUp() {
	        this._yAxisUpSpace.setFromUnitVectors(this._camera.up, _AXIS_Y);
	        this._yAxisUpSpaceInverse.copy(this._yAxisUpSpace).inverse();
	    }
	    update(delta) {
	        const dampingFactor = this._state === ACTION.NONE ? this.dampingFactor : this.draggingDampingFactor;
	        const lerpRatio = 1.0 - Math.exp(-dampingFactor * delta * FPS_60);
	        const deltaTheta = this._sphericalEnd.theta - this._spherical.theta;
	        const deltaPhi = this._sphericalEnd.phi - this._spherical.phi;
	        const deltaRadius = this._sphericalEnd.radius - this._spherical.radius;
	        const deltaTarget = _v3A.subVectors(this._targetEnd, this._target);
	        if (!approxZero(deltaTheta) ||
	            !approxZero(deltaPhi) ||
	            !approxZero(deltaRadius) ||
	            !approxZero(deltaTarget.x) ||
	            !approxZero(deltaTarget.y) ||
	            !approxZero(deltaTarget.z)) {
	            this._spherical.set(this._spherical.radius + deltaRadius * lerpRatio, this._spherical.phi + deltaPhi * lerpRatio, this._spherical.theta + deltaTheta * lerpRatio);
	            this._target.add(deltaTarget.multiplyScalar(lerpRatio));
	            this._needsUpdate = true;
	        }
	        else {
	            this._spherical.copy(this._sphericalEnd);
	            this._target.copy(this._targetEnd);
	        }
	        if (this._dollyControlAmount !== 0) {
	            if (this._camera.isPerspectiveCamera) {
	                const camera = this._camera;
	                const direction = _v3A.setFromSpherical(this._sphericalEnd).applyQuaternion(this._yAxisUpSpaceInverse).normalize().negate();
	                const planeX = _v3B.copy(direction).cross(camera.up).normalize();
	                if (planeX.lengthSq() === 0)
	                    planeX.x = 1.0;
	                const planeY = _v3C.crossVectors(planeX, direction);
	                const worldToScreen = this._sphericalEnd.radius * Math.tan(camera.getEffectiveFOV() * THREE.Math.DEG2RAD * 0.5);
	                const prevRadius = this._sphericalEnd.radius - this._dollyControlAmount;
	                const lerpRatio = (prevRadius - this._sphericalEnd.radius) / this._sphericalEnd.radius;
	                const cursor = _v3A.copy(this._targetEnd)
	                    .add(planeX.multiplyScalar(this._dollyControlCoord.x * worldToScreen * camera.aspect))
	                    .add(planeY.multiplyScalar(this._dollyControlCoord.y * worldToScreen));
	                this._targetEnd.lerp(cursor, lerpRatio);
	                this._target.copy(this._targetEnd);
	            }
	            this._dollyControlAmount = 0;
	        }
	        const maxDistance = this._collisionTest();
	        this._spherical.radius = Math.min(this._spherical.radius, maxDistance);
	        this._spherical.makeSafe();
	        this._camera.position.setFromSpherical(this._spherical).applyQuaternion(this._yAxisUpSpaceInverse).add(this._target);
	        this._camera.lookAt(this._target);
	        if (this._boundaryEnclosesCamera) {
	            this._encloseToBoundary(this._camera.position.copy(this._target), _v3A.setFromSpherical(this._spherical).applyQuaternion(this._yAxisUpSpaceInverse), 1.0);
	        }
	        const zoomDelta = this._zoomEnd - this._zoom;
	        this._zoom += zoomDelta * lerpRatio;
	        if (this._camera.zoom !== this._zoom) {
	            if (approxZero(zoomDelta))
	                this._zoom = this._zoomEnd;
	            this._camera.zoom = this._zoom;
	            this._camera.updateProjectionMatrix();
	            this._updateNearPlaneCorners();
	            this._needsUpdate = true;
	        }
	        const updated = this._needsUpdate;
	        if (updated && !this._updatedLastTime) {
	            this.dispatchEvent({ type: 'wake' });
	            this.dispatchEvent({ type: 'update' });
	        }
	        else if (updated) {
	            this.dispatchEvent({ type: 'update' });
	        }
	        else if (!updated && this._updatedLastTime) {
	            this.dispatchEvent({ type: 'sleep' });
	        }
	        this._updatedLastTime = updated;
	        this._needsUpdate = false;
	        return updated;
	    }
	    toJSON() {
	        return JSON.stringify({
	            enabled: this.enabled,
	            minDistance: this.minDistance,
	            maxDistance: infinityToMaxNumber(this.maxDistance),
	            minZoom: this.minZoom,
	            maxZoom: infinityToMaxNumber(this.maxZoom),
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
	            zoom: this._camera.zoom,
	            target0: this._target0.toArray(),
	            position0: this._position0.toArray(),
	            zoom0: this._zoom0,
	        });
	    }
	    fromJSON(json, enableTransition = false) {
	        const obj = JSON.parse(json);
	        const position = _v3A.fromArray(obj.position);
	        this.enabled = obj.enabled;
	        this.minDistance = obj.minDistance;
	        this.maxDistance = maxNumberToInfinity(obj.maxDistance);
	        this.minZoom = obj.minZoom;
	        this.maxZoom = maxNumberToInfinity(obj.maxZoom);
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
	        this._zoom0 = obj.zoom0;
	        this.moveTo(obj.target[0], obj.target[1], obj.target[2], enableTransition);
	        _sphericalA.setFromVector3(position.sub(this._targetEnd).applyQuaternion(this._yAxisUpSpace));
	        this.rotateTo(_sphericalA.theta, _sphericalA.phi, enableTransition);
	        this.zoomTo(obj.zoom, enableTransition);
	        this._needsUpdate = true;
	    }
	    dispose() {
	        this._removeAllEventListeners();
	    }
	    _encloseToBoundary(position, offset, friction) {
	        const offsetLength2 = offset.lengthSq();
	        if (offsetLength2 === 0.0) {
	            return position;
	        }
	        const newTarget = _v3B.copy(offset).add(position);
	        const clampedTarget = this._boundary.clampPoint(newTarget, _v3C);
	        const deltaClampedTarget = clampedTarget.sub(newTarget);
	        const deltaClampedTargetLength2 = deltaClampedTarget.lengthSq();
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
	            const offsetFactor = 1.0 + friction * deltaClampedTargetLength2 / offset.dot(deltaClampedTarget);
	            return position
	                .add(_v3B.copy(offset).multiplyScalar(offsetFactor))
	                .add(deltaClampedTarget.multiplyScalar(1.0 - friction));
	        }
	    }
	    _updateNearPlaneCorners() {
	        if (this._camera.isPerspectiveCamera) {
	            const camera = this._camera;
	            const near = camera.near;
	            const fov = camera.getEffectiveFOV() * THREE.Math.DEG2RAD;
	            const heightHalf = Math.tan(fov * 0.5) * near;
	            const widthHalf = heightHalf * camera.aspect;
	            this._nearPlaneCorners[0].set(-widthHalf, -heightHalf, 0);
	            this._nearPlaneCorners[1].set(widthHalf, -heightHalf, 0);
	            this._nearPlaneCorners[2].set(widthHalf, heightHalf, 0);
	            this._nearPlaneCorners[3].set(-widthHalf, heightHalf, 0);
	        }
	        else if (this._camera.isOrthographicCamera) {
	            const camera = this._camera;
	            const zoomInv = 1 / camera.zoom;
	            const left = camera.left * zoomInv;
	            const right = camera.right * zoomInv;
	            const top = camera.top * zoomInv;
	            const bottom = camera.bottom * zoomInv;
	            this._nearPlaneCorners[0].set(left, top, 0);
	            this._nearPlaneCorners[1].set(right, top, 0);
	            this._nearPlaneCorners[2].set(right, bottom, 0);
	            this._nearPlaneCorners[3].set(left, bottom, 0);
	        }
	    }
	    _collisionTest() {
	        let distance = Infinity;
	        const hasCollider = this.colliderMeshes.length >= 1;
	        if (!hasCollider)
	            return distance;
	        if (notSupportedInOrthographicCamera(this._camera, '_collisionTest'))
	            return distance;
	        distance = this._spherical.radius;
	        const direction = _v3A.setFromSpherical(this._spherical).divideScalar(distance);
	        _rotationMatrix.lookAt(_ORIGIN, direction, this._camera.up);
	        for (let i = 0; i < 4; i++) {
	            const nearPlaneCorner = _v3B.copy(this._nearPlaneCorners[i]);
	            nearPlaneCorner.applyMatrix4(_rotationMatrix);
	            const origin = _v3C.addVectors(this._target, nearPlaneCorner);
	            _raycaster.set(origin, direction);
	            _raycaster.far = distance;
	            const intersects = _raycaster.intersectObjects(this.colliderMeshes);
	            if (intersects.length !== 0 && intersects[0].distance < distance) {
	                distance = intersects[0].distance;
	            }
	        }
	        return distance;
	    }
	    _getClientRect(target) {
	        const rect = this._domElement.getBoundingClientRect();
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
	    }
	    _removeAllEventListeners() { }
	}

	return CameraControls;

})));
