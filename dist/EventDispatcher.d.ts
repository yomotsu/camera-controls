export type Listener = (event?: DispatcherEvent) => void;
export interface DispatcherEvent {
    type: string;
    [key: string]: any;
}
export declare class EventDispatcher {
    private _listeners;
    /**
     * Adds the specified event listener.
     * @param type event name
     * @param listener handler function
     * @category Methods
     */
    addEventListener(type: string, listener: Listener): void;
    /**
     * Presence of the specified event listener.
     * @param type event name
     * @param listener handler function
     * @category Methods
     */
    hasEventListener(type: string, listener: Listener): boolean;
    /**
     * Removes the specified event listener
     * @param type event name
     * @param listener handler function
     * @category Methods
     */
    removeEventListener(type: string, listener: Listener): void;
    /**
     * Removes all event listeners
     * @param type event name
     * @category Methods
     */
    removeAllEventListeners(type?: string): void;
    /**
     * Fire an event type.
     * @param event DispatcherEvent
     * @category Methods
     */
    dispatchEvent(event: DispatcherEvent): void;
}
