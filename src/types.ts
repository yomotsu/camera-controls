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
	[ key: string ]: any;
}

export type Ref = {
	value: number;
}

// see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons#value
export const MOUSE_BUTTON = {
	LEFT: 1,
	RIGHT: 2,
	MIDDLE: 4,
} as const;
export type MOUSE_BUTTON = typeof MOUSE_BUTTON[ keyof typeof MOUSE_BUTTON ];

export const ACTION = Object.freeze( {
	NONE:                   0b0,
	ROTATE:                 0b1,
	TRUCK:                  0b10,
	SCREEN_PAN:             0b100,
	OFFSET:                 0b1000,
	DOLLY:                  0b10000,
	ZOOM:                   0b100000,
	TOUCH_ROTATE:           0b1000000,
	TOUCH_TRUCK:            0b10000000,
	TOUCH_SCREEN_PAN:       0b100000000,
	TOUCH_OFFSET:           0b1000000000,
	TOUCH_DOLLY:            0b10000000000,
	TOUCH_ZOOM:             0b100000000000,
	TOUCH_DOLLY_TRUCK:      0b1000000000000,
	TOUCH_DOLLY_SCREEN_PAN: 0b10000000000000,
	TOUCH_DOLLY_OFFSET:     0b100000000000000,
	TOUCH_DOLLY_ROTATE:     0b1000000000000000,
	TOUCH_ZOOM_TRUCK:       0b10000000000000000,
	TOUCH_ZOOM_OFFSET:      0b100000000000000000,
	TOUCH_ZOOM_SCREEN_PAN:  0b1000000000000000000,
	TOUCH_ZOOM_ROTATE:      0b10000000000000000000,
} as const );

// Bit OR of Action
export type ACTION = number;

export interface PointerInput {
	pointerId: number;
	clientX: number;
	clientY: number;
	deltaX: number;
	deltaY: number;
	mouseButton: MOUSE_BUTTON | null;
}

type mouseButtonAction = typeof ACTION.ROTATE | typeof ACTION.TRUCK | typeof ACTION.SCREEN_PAN | typeof ACTION.OFFSET  | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type mouseWheelAction  = typeof ACTION.ROTATE | typeof ACTION.TRUCK | typeof ACTION.SCREEN_PAN | typeof ACTION.OFFSET  | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type singleTouchAction =
	typeof ACTION.TOUCH_ROTATE |
	typeof ACTION.TOUCH_TRUCK |
	typeof ACTION.TOUCH_SCREEN_PAN |
	typeof ACTION.TOUCH_OFFSET |
	typeof ACTION.DOLLY |
	typeof ACTION.ZOOM |
	typeof ACTION.NONE;
type multiTouchAction =
	typeof ACTION.TOUCH_DOLLY_ROTATE |
	typeof ACTION.TOUCH_DOLLY_TRUCK |
	typeof ACTION.TOUCH_DOLLY_OFFSET |
	typeof ACTION.TOUCH_ZOOM_ROTATE |
	typeof ACTION.TOUCH_ZOOM_TRUCK |
	typeof ACTION.TOUCH_ZOOM_OFFSET |
	typeof ACTION.TOUCH_DOLLY |
	typeof ACTION.TOUCH_ZOOM |
	typeof ACTION.TOUCH_ROTATE |
	typeof ACTION.TOUCH_TRUCK |
	typeof ACTION.TOUCH_SCREEN_PAN |
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

export const DOLLY_DIRECTION = {
	NONE: 0,
	IN: 1,
	OUT: - 1,
} as const;
export type DOLLY_DIRECTION = typeof DOLLY_DIRECTION[ keyof typeof DOLLY_DIRECTION ];

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

export type CameraControlsLerpState = {
	target: [number, number, number]
} & ( {
	spherical: Parameters<_THREE.Spherical["set"]>
} | {
	position: [number, number, number]
} );

export type CameraControlsState = {
	enabled: boolean;

	minDistance: number;
	maxDistance: number;
	minZoom: number;
	maxZoom: number;
	minPolarAngle: number;
	maxPolarAngle: number;
	minAzimuthAngle: number;
	maxAzimuthAngle: number;
	smoothTime: number;
	draggingSmoothTime: number;
	dollySpeed: number;
	truckSpeed: number;
	dollyToCursor: boolean;

	target: _THREE.Vector3Tuple;
	position: _THREE.Vector3Tuple;
	spherical: _THREE.Vector3Tuple;
	zoom: number;
	focalOffset: _THREE.Vector3Tuple;

	target0: _THREE.Vector3Tuple;
	position0: _THREE.Vector3Tuple;
	zoom0: number;
	focalOffset0: _THREE.Vector3Tuple;
};
