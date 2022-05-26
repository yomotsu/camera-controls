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

export const ACTION = Object.freeze( {
	NONE: 0,
	ROTATE: 1,
	TRUCK: 2,
	OFFSET: 3,
	DOLLY: 4,
	ZOOM: 5,
	TOUCH_ROTATE: 6,
	TOUCH_TRUCK: 7,
	TOUCH_OFFSET: 8,
	TOUCH_DOLLY: 9,
	TOUCH_ZOOM: 10,
	TOUCH_DOLLY_TRUCK: 11,
	TOUCH_DOLLY_OFFSET: 12,
	TOUCH_ZOOM_TRUCK: 13,
	TOUCH_ZOOM_OFFSET: 14,
} as const );
// Readonly<typeof ACTION>
// export type ACTION = typeof ACTION[ keyof typeof ACTION ];
export type ACTION = Readonly<typeof ACTION[ keyof typeof ACTION ]>;

export interface PointerInput {
	pointerId: number;
	clientX: number;
	clientY: number;
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
