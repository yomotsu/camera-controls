export declare type Listener = (event?: DispatcherEvent) => void;
export interface DispatcherEvent {
    type: string;
    [key: string]: any;
}
export declare class EventDispatcher {
    private _listeners;
    addEventListener(type: string, listener: Listener): void;
    removeEventListener(type: string, listener: Listener): void;
    removeAllEventListeners(type?: string): void;
    dispatchEvent(event: DispatcherEvent): void;
}
