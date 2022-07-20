import type * as _THREE from 'three';

// Is this suppose to be `Pick<typeof THREE, 'MOUSE' | 'Vector2'...>`?
export interface THREESubset {
	Vector2   : typeof _THREE.Vector2;
	Vector3   : typeof _THREE.Vector3;
	Vector4   : typeof _THREE.Vector4;
	Quaternion: typeof _THREE.Quaternion;
	Matrix4   : typeof _THREE.Matrix4;
	Spherical : typeof _THREE.Spherical;
	Box3      : typeof _THREE.Box3;
	Sphere    : typeof _THREE.Sphere;
	Raycaster : typeof _THREE.Raycaster;
	MathUtils : {
		DEG2RAD: typeof _THREE.MathUtils.DEG2RAD;
		clamp: typeof _THREE.MathUtils.clamp;
		[ key: string ]: any;
	},
	[ key: string ]: any;
}

// see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons#value
export const MOUSE_BUTTON = {
	LEFT: 1,
	RIGHT: 2,
	MIDDLE: 4,
};

export const ACTION = Object.freeze( {
	NONE: 0,
	ROTATE: 1,
	TRUCK: 2,
	OFFSET: 4,
	DOLLY: 8,
	ZOOM: 16,
	TOUCH_ROTATE: 32,
	TOUCH_TRUCK: 64,
	TOUCH_OFFSET: 128,
	TOUCH_DOLLY: 256,
	TOUCH_ZOOM: 512,
	TOUCH_DOLLY_TRUCK: 1024,
	TOUCH_DOLLY_OFFSET: 2048,
	TOUCH_ZOOM_TRUCK: 4096,
	TOUCH_ZOOM_OFFSET: 8192,
} as const );

// Bit OR of Action
export type ACTION = number;

export interface PointerInput {
	pointerId: number;
	clientX: number;
	clientY: number;
	deltaX: number;
	deltaY: number;
}

type mouseButtonAction = typeof ACTION.ROTATE | typeof ACTION.TRUCK | typeof ACTION.OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type mouseWheelAction  = typeof ACTION.ROTATE | typeof ACTION.TRUCK | typeof ACTION.OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type singleTouchAction = typeof ACTION.TOUCH_ROTATE | typeof ACTION.TOUCH_TRUCK | typeof ACTION.TOUCH_OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type multiTouchAction =
	typeof ACTION.TOUCH_DOLLY_TRUCK |
	typeof ACTION.TOUCH_DOLLY_OFFSET |
	typeof ACTION.TOUCH_ZOOM_TRUCK |
	typeof ACTION.TOUCH_ZOOM_OFFSET |
	typeof ACTION.TOUCH_DOLLY |
	typeof ACTION.TOUCH_ZOOM |
	typeof ACTION.TOUCH_ROTATE |
	typeof ACTION.TOUCH_TRUCK |
	typeof ACTION.TOUCH_OFFSET |
	typeof ACTION.NONE;

export interface MouseButtons {
	left     : mouseButtonAction;
	middle   : mouseButtonAction;
	right    : mouseButtonAction;
	wheel    : mouseWheelAction;
}

export interface Touches {
	one  : singleTouchAction;
	two  : multiTouchAction;
	three: multiTouchAction;
}

export interface FitToOptions {
	cover: boolean;
	paddingLeft  : number;
	paddingRight : number;
	paddingBottom: number;
	paddingTop   : number;
}

export interface CameraControlsEventMap {
	update         : { type: 'update' };
	wake           : { type: 'wake' };
	rest           : { type: 'rest' };
	sleep          : { type: 'sleep' };
	transitionstart: { type: 'transitionstart' };
	controlstart   : { type: 'controlstart' };
	control        : { type: 'control' };
	controlend     : { type: 'controlend' };
}

export function isPerspectiveCamera( camera: _THREE.Camera ): camera is _THREE.PerspectiveCamera {

	return ( camera as _THREE.PerspectiveCamera  ).isPerspectiveCamera;

}

export function isOrthographicCamera( camera: _THREE.Camera ): camera is _THREE.OrthographicCamera {

	return ( camera as _THREE.OrthographicCamera  ).isOrthographicCamera;

}
