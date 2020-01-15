export function isTouchEvent( event: Event ): boolean {

	return 'TouchEvent' in window && event instanceof TouchEvent;

}
