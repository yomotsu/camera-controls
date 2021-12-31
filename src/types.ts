import type * as _THREE from 'three';

// Is this suppose to be `Pick<typeof THREE, 'MOUSE' | 'Vector2'...>`?
export interface THREESubset {
	MOUSE     : typeof _THREE.MOUSE;
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

export enum ACTION {
	NONE,
	ROTATE,
	TRUCK,
	OFFSET,
	DOLLY,
	ZOOM,
	TOUCH_ROTATE,
	TOUCH_TRUCK,
	TOUCH_OFFSET,
	TOUCH_DOLLY,
	TOUCH_ZOOM,
	TOUCH_DOLLY_TRUCK,
	TOUCH_DOLLY_OFFSET,
	TOUCH_ZOOM_TRUCK,
	TOUCH_ZOOM_OFFSET,
}

export interface PointerInput {
	pointerId: number;
	clientX: number;
	clientY: number;
}

type mouseButtonAction = ACTION.ROTATE | ACTION.TRUCK | ACTION.OFFSET | ACTION.DOLLY | ACTION.ZOOM | ACTION.NONE;
type mouseWheelAction  = ACTION.ROTATE | ACTION.TRUCK | ACTION.OFFSET | ACTION.DOLLY | ACTION.ZOOM | ACTION.NONE;
type singleTouchAction = ACTION.TOUCH_ROTATE | ACTION.TOUCH_TRUCK | ACTION.TOUCH_OFFSET | ACTION.DOLLY | ACTION.ZOOM | ACTION.NONE;
type multiTouchAction =
	ACTION.TOUCH_DOLLY_TRUCK |
	ACTION.TOUCH_DOLLY_OFFSET |
	ACTION.TOUCH_ZOOM_TRUCK |
	ACTION.TOUCH_ZOOM_OFFSET |
	ACTION.TOUCH_DOLLY |
	ACTION.TOUCH_ZOOM |
	ACTION.TOUCH_ROTATE |
	ACTION.TOUCH_TRUCK |
	ACTION.TOUCH_OFFSET |
	ACTION.NONE;

export interface MouseButtons {
	left     : mouseButtonAction;
	middle   : mouseButtonAction;
	right    : mouseButtonAction;
	wheel    : mouseWheelAction;
	shiftLeft: mouseButtonAction;
	// We can also add altLeft and etc if someone wants...
}

export interface Touches {
	one  : singleTouchAction;
	two  : multiTouchAction;
	three: multiTouchAction;
}

export interface FitToOptions {
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
