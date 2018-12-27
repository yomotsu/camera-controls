export type Event = any;
export type EventListener = (event: Event) => void;

export class EventDispatcher {
  // private members
  private _listeners: { [type: string]: EventListener[] };

  // public methods
  public addEventListener: (type: string, listener: EventListener) => void;
  public hasEventListener: (type: string, listener: EventListener) => boolean;
  public removeEventListener: (type: string, listener: EventListener) => void;
  public dispatchEvent: (event: Event) => void;
}