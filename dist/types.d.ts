import * as _THREE from 'three';
export interface THREESubset {
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
export declare const MOUSE_BUTTON: {
    LEFT: number;
    RIGHT: number;
    MIDDLE: number;
};
export declare const ACTION: Readonly<{
    readonly NONE: 0;
    readonly ROTATE: 1;
    readonly TRUCK: 2;
    readonly OFFSET: 4;
    readonly DOLLY: 8;
    readonly ZOOM: 16;
    readonly TOUCH_ROTATE: 32;
    readonly TOUCH_TRUCK: 64;
    readonly TOUCH_OFFSET: 128;
    readonly TOUCH_DOLLY: 256;
    readonly TOUCH_ZOOM: 512;
    readonly TOUCH_DOLLY_TRUCK: 1024;
    readonly TOUCH_DOLLY_OFFSET: 2048;
    readonly TOUCH_DOLLY_ROTATE: 4096;
    readonly TOUCH_ZOOM_TRUCK: 8192;
    readonly TOUCH_ZOOM_OFFSET: 16384;
    readonly TOUCH_ZOOM_ROTATE: 32768;
}>;
export type ACTION = number;
export interface PointerInput {
    pointerId: number;
    clientX: number;
    clientY: number;
    deltaX: number;
    deltaY: number;
}
type mouseButtonAction = typeof ACTION.ROTATE | typeof ACTION.TRUCK | typeof ACTION.OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type mouseWheelAction = typeof ACTION.ROTATE | typeof ACTION.TRUCK | typeof ACTION.OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type singleTouchAction = typeof ACTION.TOUCH_ROTATE | typeof ACTION.TOUCH_TRUCK | typeof ACTION.TOUCH_OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type multiTouchAction = typeof ACTION.TOUCH_DOLLY_ROTATE | typeof ACTION.TOUCH_DOLLY_TRUCK | typeof ACTION.TOUCH_DOLLY_OFFSET | typeof ACTION.TOUCH_ZOOM_ROTATE | typeof ACTION.TOUCH_ZOOM_TRUCK | typeof ACTION.TOUCH_ZOOM_OFFSET | typeof ACTION.TOUCH_DOLLY | typeof ACTION.TOUCH_ZOOM | typeof ACTION.TOUCH_ROTATE | typeof ACTION.TOUCH_TRUCK | typeof ACTION.TOUCH_OFFSET | typeof ACTION.NONE;
export interface MouseButtons {
    left: mouseButtonAction;
    middle: mouseButtonAction;
    right: mouseButtonAction;
    wheel: mouseWheelAction;
}
export interface Touches {
    one: singleTouchAction;
    two: multiTouchAction;
    three: multiTouchAction;
}
export interface FitToOptions {
    cover: boolean;
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
