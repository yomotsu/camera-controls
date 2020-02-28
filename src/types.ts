export enum ACTION {
	NONE              = 0,
	ROTATE            = 1,
	TRUCK             = 2,
	DOLLY             = 3,
	ZOOM              = 4,
	TOUCH_ROTATE      = 5,
	TOUCH_TRUCK       = 6,
	TOUCH_DOLLY       = 7,
	TOUCH_ZOOM        = 8,
	TOUCH_DOLLY_TRUCK = 9,
	TOUCH_ZOOM_TRUCK  = 10,
}

type mouseButtonAction = ACTION.ROTATE | ACTION.TRUCK | ACTION.DOLLY | ACTION.ZOOM | ACTION.NONE;
type mouseWheelAction = ACTION.ROTATE | ACTION.TRUCK | ACTION.DOLLY | ACTION.ZOOM | ACTION.NONE;
type singleTouchAction = ACTION.TOUCH_ROTATE | ACTION.TOUCH_TRUCK | ACTION.DOLLY | ACTION.ZOOM | ACTION.NONE;
type multiTouchAction = ACTION.TOUCH_DOLLY_TRUCK | ACTION.TOUCH_ZOOM_TRUCK | ACTION.TOUCH_DOLLY | ACTION.TOUCH_ZOOM | ACTION.TOUCH_ROTATE | ACTION.TOUCH_TRUCK | ACTION.NONE;

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

export interface FitToOption {
	paddingLeft  : number;
	paddingRight : number;
	paddingBottom: number;
	paddingTop   : number;
}
