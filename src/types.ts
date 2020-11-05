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
	left  : mouseButtonAction;
	middle: mouseButtonAction;
	right : mouseButtonAction;
	wheel : mouseWheelAction;
	// We can also add shiftLeft, altLeft and etc if someone wants...
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
	nearAxis     : boolean;	
	theta        : number;
	phi          : number;
}

export interface CameraControlsEventMap {
	update: { type: 'update' };
	wake  : { type: 'wake' };
	sleep : { type: 'sleep' };

	controlstart: {
		type: 'controlstart',
		originalEvent: MouseEvent | TouchEvent | WheelEvent,
	};
	control: {
		type: 'control',
		originalEvent: MouseEvent | TouchEvent | WheelEvent,
	};
	controlend: {
		type: 'controlend',
		originalEvent: MouseEvent | TouchEvent | WheelEvent,
	};
}
