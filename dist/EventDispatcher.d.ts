export declare type Listener = (event?: DispatcherEvent) => void;
export interface DispatcherEvent {
    type: string;
    [key: string]: any;
}
export declare class EventDispatcher {
    private _listeners;
    protected addEventListener(type: string, listener: Listener): void;
    protected removeEventListener(type: string, listener: Listener): void;
    protected removeAllEventListeners(type?: string): void;
    protected dispatchEvent(event: DispatcherEvent): void;
}
