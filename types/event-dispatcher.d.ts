export interface Event {
  type: string;
  target?: any;
  [ attachment: string ]: any;
}

export class EventDispatcher {
  // private members
  private _listeners: { [ type: string ]: Array<( event: Event ) => void> };

  // public methods
  public addEventListener( type: string, listener: ( event: Event ) => void ): void;
  public hasEventListener( type: string, listener: ( event: Event ) => void ): boolean;
  public removeEventListener( type: string, listener: ( event: Event ) => void ): void;
  public dispatchEvent( event: { type: string; [ attachment: string ]: any; } ): void;
}
