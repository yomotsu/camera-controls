export declare enum ACTION {
    NONE = 0,
    ROTATE = 1,
    TRUCK = 2,
    DOLLY = 3,
    ZOOM = 4,
    TOUCH_ROTATE = 5,
    TOUCH_TRUCK = 6,
    TOUCH_DOLLY = 7,
    TOUCH_ZOOM = 8,
    TOUCH_DOLLY_TRUCK = 9,
    TOUCH_ZOOM_TRUCK = 10
}
declare type mouseButtonAction = ACTION.ROTATE | ACTION.TRUCK | ACTION.DOLLY | ACTION.ZOOM | ACTION.NONE;
declare type mouseWheelAction = ACTION.ROTATE | ACTION.TRUCK | ACTION.DOLLY | ACTION.ZOOM | ACTION.NONE;
declare type singleTouchAction = ACTION.TOUCH_ROTATE | ACTION.TOUCH_TRUCK | ACTION.DOLLY | ACTION.ZOOM | ACTION.NONE;
declare type multiTouchAction = ACTION.TOUCH_DOLLY_TRUCK | ACTION.TOUCH_ZOOM_TRUCK | ACTION.TOUCH_DOLLY | ACTION.TOUCH_ZOOM | ACTION.TOUCH_ROTATE | ACTION.TOUCH_TRUCK | ACTION.NONE;
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
    sleep: {
        type: 'sleep';
    };
    controlstart: {
        type: 'controlstart';
        originalEvent: MouseEvent | TouchEvent | WheelEvent;
    };
    control: {
        type: 'control';
        originalEvent: MouseEvent | TouchEvent | WheelEvent;
    };
    controlend: {
        type: 'controlend';
        originalEvent: MouseEvent | TouchEvent | WheelEvent;
    };
}
export {};
