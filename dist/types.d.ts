import * as _THREE from 'three';
export interface THREESubset {
    MOUSE: typeof _THREE.MOUSE;
    Vector2: typeof _THREE.Vector2;
    Vector3: typeof _THREE.Vector3;
    Vector4: typeof _THREE.Vector4;
    Quaternion: typeof _THREE.Quaternion;
    Matrix4: typeof _THREE.Matrix4;
    Spherical: typeof _THREE.Spherical;
    Box3: typeof _THREE.Box3;
    Sphere: typeof _THREE.Sphere;
    Raycaster: typeof _THREE.Raycaster;
    MathUtils: {
        DEG2RAD: typeof _THREE.MathUtils.DEG2RAD;
        clamp: typeof _THREE.MathUtils.clamp;
        [key: string]: any;
    };
    [key: string]: any;
}
export declare const ACTION: Readonly<{
    readonly NONE: 0;
    readonly ROTATE: 1;
    readonly TRUCK: 2;
    readonly OFFSET: 3;
    readonly DOLLY: 4;
    readonly ZOOM: 5;
    readonly TOUCH_ROTATE: 6;
    readonly TOUCH_TRUCK: 7;
    readonly TOUCH_OFFSET: 8;
    readonly TOUCH_DOLLY: 9;
    readonly TOUCH_ZOOM: 10;
    readonly TOUCH_DOLLY_TRUCK: 11;
    readonly TOUCH_DOLLY_OFFSET: 12;
    readonly TOUCH_ZOOM_TRUCK: 13;
    readonly TOUCH_ZOOM_OFFSET: 14;
}>;
export declare type ACTION = Readonly<typeof ACTION[keyof typeof ACTION]>;
export interface PointerInput {
    pointerId: number;
    clientX: number;
    clientY: number;
}
declare type mouseButtonAction = typeof ACTION.ROTATE | typeof ACTION.TRUCK | typeof ACTION.OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
declare type mouseWheelAction = typeof ACTION.ROTATE | typeof ACTION.TRUCK | typeof ACTION.OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
declare type singleTouchAction = typeof ACTION.TOUCH_ROTATE | typeof ACTION.TOUCH_TRUCK | typeof ACTION.TOUCH_OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
declare type multiTouchAction = typeof ACTION.TOUCH_DOLLY_TRUCK | typeof ACTION.TOUCH_DOLLY_OFFSET | typeof ACTION.TOUCH_ZOOM_TRUCK | typeof ACTION.TOUCH_ZOOM_OFFSET | typeof ACTION.TOUCH_DOLLY | typeof ACTION.TOUCH_ZOOM | typeof ACTION.TOUCH_ROTATE | typeof ACTION.TOUCH_TRUCK | typeof ACTION.TOUCH_OFFSET | typeof ACTION.NONE;
export interface MouseButtons {
    left: mouseButtonAction;
    middle: mouseButtonAction;
    right: mouseButtonAction;
    wheel: mouseWheelAction;
    shiftLeft: mouseButtonAction;
}
export interface Touches {
    one: singleTouchAction;
    two: multiTouchAction;
    three: multiTouchAction;
}
export interface FitToOptions {
    paddingLeft: number;
    paddingRight: number;
    paddingBottom: number;
    paddingTop: number;
}
export interface CameraControlsEventMap {
    update: {
        type: 'update';
    };
    wake: {
        type: 'wake';
    };
    rest: {
        type: 'rest';
    };
    sleep: {
        type: 'sleep';
    };
    transitionstart: {
        type: 'transitionstart';
    };
    controlstart: {
        type: 'controlstart';
    };
    control: {
        type: 'control';
    };
    controlend: {
        type: 'controlend';
    };
}
export declare function isPerspectiveCamera(camera: _THREE.Camera): camera is _THREE.PerspectiveCamera;
export declare function isOrthographicCamera(camera: _THREE.Camera): camera is _THREE.OrthographicCamera;
export {};
