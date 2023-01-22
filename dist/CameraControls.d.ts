import * as _THREE from 'three';
import { THREESubset, ACTION, PointerInput, MouseButtons, Touches, FitToOptions, CameraControlsEventMap } from './types';
import { EventDispatcher } from './EventDispatcher';
export declare class CameraControls extends EventDispatcher {
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
     * 	MathUtils : {
     * 		DEG2RAD: MathUtils.DEG2RAD,
     * 		clamp: MathUtils.clamp,
     * 	},
     * };

     * CameraControls.install( { THREE: subsetOfTHREE } );
     * ```
     * @category Statics
     */
    static install(libs: {
        THREE: THREESubset;
    }): void;
    /*
    * list all ACTIONs
    * @category Statics
    */
    static readonly ACTION: typeof ACTION;
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
    minPolarAngle: number;
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
    maxPolarAngle: number;
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
    minAzimuthAngle: number;
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
    maxAzimuthAngle: number;
    /**
     * Minimum distance for dolly. The value must be higher than `0`.
     * PerspectiveCamera only.
     * @category Properties
     */
    minDistance: number;
    /**
     * Maximum distance for dolly. The value must be higher than `minDistance`.
     * PerspectiveCamera only.
     * @category Properties
     */
    maxDistance: number;
    /**
     * `true` to enable Infinity Dolly.
     * When the Dolly distance is less than the `minDistance`, radius of the sphere will be set `minDistance` automatically.
     * @category Properties
     */
    infinityDolly: boolean;
    /**
     * Minimum camera zoom.
     * @category Properties
     */
    minZoom: number;
    /**
     * Maximum camera zoom.
     * @category Properties
     */
    maxZoom: number;
    /**
     * The damping inertia.
     * The value must be between `Math.EPSILON` to `1` inclusive.
     * Setting `1` to disable smooth transitions.
     * @category Properties
     */
    dampingFactor: number;
    /**
     * The damping inertia while dragging.
     * The value must be between `Math.EPSILON` to `1` inclusive.
     * Setting `1` to disable smooth transitions.
     * @category Properties
     */
    draggingDampingFactor: number;
    /**
     * Speed of azimuth (horizontal) rotation.
     * @category Properties
     */
    azimuthRotateSpeed: number;
    /**
     * Speed of polar (vertical) rotation.
     * @category Properties
     */
    polarRotateSpeed: number;
    /**
     * Speed of mouse-wheel dollying.
     * @category Properties
     */
    dollySpeed: number;
    /**
     * Speed of drag for truck and pedestal.
     * @category Properties
     */
    truckSpeed: number;
    /**
     * `true` to enable Dolly-in to the mouse cursor coords.
     * @category Properties
     */
    dollyToCursor: boolean;
    /**
     * @category Properties
     */
    dragToOffset: boolean;
    /**
     * The same as `.screenSpacePanning` in three.js's OrbitControls.
     * @category Properties
     */
    verticalDragToForward: boolean;
    /**
     * Friction ratio of the boundary.
     * @category Properties
     */
    boundaryFriction: number;
    /**
     * Controls how soon the `rest` event fires as the camera slows.
     * @category Properties
     */
    restThreshold: number;
    /**
     * An array of Meshes to collide with camera.
     * Be aware colliderMeshes may decrease performance. The collision test uses 4 raycasters from the camera since the near plane has 4 corners.
     * @category Properties
     */
    colliderMeshes: _THREE.Object3D[];
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
    cancel: () => void;
    protected _enabled: boolean;
    protected _camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera;
    protected _yAxisUpSpace: _THREE.Quaternion;
    protected _yAxisUpSpaceInverse: _THREE.Quaternion;
    protected _state: ACTION;
    protected _domElement?: HTMLElement;
    protected _viewport: _THREE.Vector4 | null;
    protected _target: _THREE.Vector3;
    protected _targetEnd: _THREE.Vector3;
    protected _focalOffset: _THREE.Vector3;
    protected _focalOffsetEnd: _THREE.Vector3;
    protected _affectOffset: boolean;
    protected _spherical: _THREE.Spherical;
    protected _sphericalEnd: _THREE.Spherical;
    protected _zoom: number;
    protected _zoomEnd: number;
    protected _target0: _THREE.Vector3;
    protected _position0: _THREE.Vector3;
    protected _zoom0: number;
    protected _focalOffset0: _THREE.Vector3;
    protected _dollyControlAmount: number;
    protected _dollyControlCoord: _THREE.Vector2;
    protected _nearPlaneCorners: [
        _THREE.Vector3,
        _THREE.Vector3,
        _THREE.Vector3,
        _THREE.Vector3
    ];
    protected _hasRested: boolean;
    protected _boundary: _THREE.Box3;
    protected _boundaryEnclosesCamera: boolean;
    protected _needsUpdate: boolean;
    protected _updatedLastTime: boolean;
    protected _elementRect: DOMRect;
    protected _activePointers: PointerInput[];
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
    constructor(camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera, domElement?: HTMLElement);
    /*
    * The camera to be controlled
    * @category Properties
    */
    camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera;
    /*
    * Whether or not the controls are enabled.
    * `false` to disable user dragging/touch-move, but all methods works.
    * @category Properties
    */
    enabled: boolean;
    /*
    * Returns `true` if the controls are active updating.
    * readonly value.
    * @category Properties
    */
    readonly active: boolean;
    /*
    * Getter for the current `ACTION`.
    * readonly value.
    * @category Properties
    */
    readonly currentAction: ACTION;
    /*
    * get/set Current distance.
    * @category Properties
    */
    distance: number;
    /*
    * get/set the azimuth angle (horizontal) in radians.
    * Every 360 degrees turn is added to `.azimuthAngle` value, which is accumulative.
    * @category Properties
    */
    azimuthAngle: number;
    /*
    * get/set the polar angle (vertical) in radians.
    * @category Properties
    */
    polarAngle: number;
    /*
    * Whether camera position should be enclosed in the boundary or not.
    * @category Properties
    */
    boundaryEnclosesCamera: boolean;
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
    addEventListener<K extends keyof CameraControlsEventMap>(type: K, listener: (event: CameraControlsEventMap[K]) => any): void;
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
    removeEventListener<K extends keyof CameraControlsEventMap>(type: K, listener: (event: CameraControlsEventMap[K]) => any): void;
    /**
     * Rotate azimuthal angle(horizontal) and polar angle(vertical).
     * Every value is added to the current value.
     * @param azimuthAngle Azimuth rotate angle. In radian.
     * @param polarAngle Polar rotate angle. In radian.
     * @param enableTransition Whether to move smoothly or immediately
     * @category Methods
     */
    rotate(azimuthAngle: number, polarAngle: number, enableTransition?: boolean): Promise<void>;
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
    rotateAzimuthTo(azimuthAngle: number, enableTransition?: boolean): Promise<void>;
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
    rotatePolarTo(polarAngle: number, enableTransition?: boolean): Promise<void>;
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
    rotateTo(azimuthAngle: number, polarAngle: number, enableTransition?: boolean): Promise<void>;
    /**
     * Dolly in/out camera position.
     * @param distance Distance of dollyIn. Negative number for dollyOut.
     * @param enableTransition Whether to move smoothly or immediately.
     * @category Methods
     */
    dolly(distance: number, enableTransition?: boolean): Promise<void>;
    /**
     * Dolly in/out camera position to given distance.
     * @param distance Distance of dolly.
     * @param enableTransition Whether to move smoothly or immediately.
     * @category Methods
     */
    dollyTo(distance: number, enableTransition?: boolean): Promise<void>;
    /**
     * Zoom in/out camera. The value is added to camera zoom.
     * Limits set with `.minZoom` and `.maxZoom`
     * @param zoomStep zoom scale
     * @param enableTransition Whether to move smoothly or immediately
     * @category Methods
     */
    zoom(zoomStep: number, enableTransition?: boolean): Promise<void>;
    /**
     * Zoom in/out camera to given scale. The value overwrites camera zoom.
     * Limits set with .minZoom and .maxZoom
     * @param zoom
     * @param enableTransition
     * @category Methods
     */
    zoomTo(zoom: number, enableTransition?: boolean): Promise<void>;
    /**
     * @deprecated `pan()` has been renamed to `truck()`
     * @category Methods
     */
    pan(x: number, y: number, enableTransition?: boolean): Promise<void>;
    /**
     * Truck and pedestal camera using current azimuthal angle
     * @param x Horizontal translate amount
     * @param y Vertical translate amount
     * @param enableTransition Whether to move smoothly or immediately
     * @category Methods
     */
    truck(x: number, y: number, enableTransition?: boolean): Promise<void>;
    /**
     * Move forward / backward.
     * @param distance Amount to move forward / backward. Negative value to move backward
     * @param enableTransition Whether to move smoothly or immediately
     * @category Methods
     */
    forward(distance: number, enableTransition?: boolean): Promise<void>;
    /**
     * Move target position to given point.
     * @param x x coord to move center position
     * @param y y coord to move center position
     * @param z z coord to move center position
     * @param enableTransition Whether to move smoothly or immediately
     * @category Methods
     */
    moveTo(x: number, y: number, z: number, enableTransition?: boolean): Promise<void>;
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
    fitToBox(box3OrObject: _THREE.Box3 | _THREE.Object3D, enableTransition: boolean, { cover, paddingLeft, paddingRight, paddingBottom, paddingTop }?: Partial<FitToOptions>): Promise<void[]>;
    /**
     * Fit the viewport to the sphere or the bounding sphere of the object.
     * @param sphereOrMesh
     * @param enableTransition
     * @category Methods
     */
    fitToSphere(sphereOrMesh: _THREE.Sphere | _THREE.Object3D, enableTransition: boolean): Promise<void[]>;
    /**
     * Make an orbit with given points.
     * @param positionX
     * @param positionY
     * @param positionZ
     * @param targetX
     * @param targetY
     * @param targetZ
     * @param enableTransition
     * @category Methods
     */
    setLookAt(positionX: number, positionY: number, positionZ: number, targetX: number, targetY: number, targetZ: number, enableTransition?: boolean): Promise<void>;
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
    lerpLookAt(positionAX: number, positionAY: number, positionAZ: number, targetAX: number, targetAY: number, targetAZ: number, positionBX: number, positionBY: number, positionBZ: number, targetBX: number, targetBY: number, targetBZ: number, t: number, enableTransition?: boolean): Promise<void>;
    /**
     * setLookAt without target, keep gazing at the current target
     * @param positionX
     * @param positionY
     * @param positionZ
     * @param enableTransition
     * @category Methods
     */
    setPosition(positionX: number, positionY: number, positionZ: number, enableTransition?: boolean): Promise<void>;
    /**
     * setLookAt without position, Stay still at the position.
     * @param targetX
     * @param targetY
     * @param targetZ
     * @param enableTransition
     * @category Methods
     */
    setTarget(targetX: number, targetY: number, targetZ: number, enableTransition?: boolean): Promise<void>;
    /**
     * Set focal offset using the screen parallel coordinates. z doesn't affect in Orthographic as with Dolly.
     * @param x
     * @param y
     * @param z
     * @param enableTransition
     * @category Methods
     */
    setFocalOffset(x: number, y: number, z: number, enableTransition?: boolean): Promise<void>;
    /**
     * Set orbit point without moving the camera.
     * SHOULD NOT RUN DURING ANIMATIONS. `setOrbitPoint()` will immediately fix the positions.
     * @param targetX
     * @param targetY
     * @param targetZ
     * @category Methods
     */
    setOrbitPoint(targetX: number, targetY: number, targetZ: number): void;
    /**
     * Set the boundary box that encloses the target of the camera. box3 is in THREE.Box3
     * @param box3
     * @category Methods
     */
    setBoundary(box3?: _THREE.Box3): void;
    /**
     * Set (or unset) the current viewport.
     * Set this when you want to use renderer viewport and .dollyToCursor feature at the same time.
     * @param viewportOrX
     * @param y
     * @param width
     * @param height
     * @category Methods
     */
    setViewport(viewportOrX: _THREE.Vector4 | number | null, y: number, width: number, height: number): void;
    /**
     * Calculate the distance to fit the box.
     * @param width box width
     * @param height box height
     * @param depth box depth
     * @returns distance
     * @category Methods
     */
    getDistanceToFitBox(width: number, height: number, depth: number, cover?: boolean): number;
    /**
     * Calculate the distance to fit the sphere.
     * @param radius sphere radius
     * @returns distance
     * @category Methods
     */
    getDistanceToFitSphere(radius: number): number;
    /**
     * Returns its current gazing target, which is the center position of the orbit.
     * @param out current gazing target
     * @category Methods
     */
    getTarget(out: _THREE.Vector3): _THREE.Vector3;
    /**
     * Returns its current position.
     * @param out current position
     * @category Methods
     */
    getPosition(out: _THREE.Vector3): _THREE.Vector3;
    /**
     * Returns its current focal offset, which is how much the camera appears to be translated in screen parallel coordinates.
     * @param out current focal offset
     * @category Methods
     */
    getFocalOffset(out: _THREE.Vector3): _THREE.Vector3;
    /**
     * Normalize camera azimuth angle rotation between 0 and 360 degrees.
     * @category Methods
     */
    normalizeRotations(): void;
    /**
     * Reset all rotation and position to defaults.
     * @param enableTransition
     * @category Methods
     */
    reset(enableTransition?: boolean): Promise<void[]>;
    /**
     * Set current camera position as the default position.
     * @category Methods
     */
    saveState(): void;
    /**
     * Sync camera-up direction.
     * When camera-up vector is changed, `.updateCameraUp()` must be called.
     * @category Methods
     */
    updateCameraUp(): void;
    /**
     * Update camera position and directions.
     * This should be called in your tick loop every time, and returns true if re-rendering is needed.
     * @param delta
     * @returns updated
     * @category Methods
     */
    update(delta: number): boolean;
    /**
     * Get all state in JSON string
     * @category Methods
     */
    toJSON(): string;
    /**
     * Reproduce the control state with JSON. enableTransition is where anim or not in a boolean.
     * @param json
     * @param enableTransition
     * @category Methods
     */
    fromJSON(json: string, enableTransition?: boolean): void;
    /**
     * Attach all internal event handlers to enable drag control.
     * @category Methods
     */
    connect(domElement: HTMLElement): void;
    /**
     * Detach all internal event handlers to disable drag control.
     */
    disconnect(): void;
    /**
     * Dispose the cameraControls instance itself, remove all eventListeners.
     * @category Methods
     */
    dispose(): void;
    protected _findPointerById(pointerId: number): PointerInput | null;
    protected _encloseToBoundary(position: _THREE.Vector3, offset: _THREE.Vector3, friction: number): _THREE.Vector3;
    protected _updateNearPlaneCorners(): void;
    protected _truckInternal: (deltaX: number, deltaY: number, dragToOffset: boolean) => void;
    protected _rotateInternal: (deltaX: number, deltaY: number) => void;
    protected _dollyInternal: (delta: number, x: number, y: number) => void;
    protected _zoomInternal: (delta: number, x: number, y: number) => void;
    protected _collisionTest(): number;
    /**
     * Get its client rect and package into given `DOMRect` .
     */
    protected _getClientRect(target: DOMRect): DOMRect | undefined;
    protected _createOnRestPromise(resolveImmediately: boolean): Promise<void>;
    protected _addAllEventListeners(_domElement: HTMLElement): void;
    protected _removeAllEventListeners(): void;
}
