import * as _THREE  from 'three';
import { isTouchEvent } from './isTouchEvent';

export function extractClientCoordFromEvent( event: Event, out: _THREE.Vector2, domElement: HTMLElement ) {

	out.set( 0, 0 );

	if ( isTouchEvent( event ) ) {

		const touchEvent = event as TouchEvent;
		let touches: Touch[] = [];
		for ( let index = 0; index < touchEvent.touches.length; index ++ ) {

			let touch = touchEvent.touches[ index ];
			if ( touch.target === domElement ) {

				touches.push( touch );

			}

		}

		for ( let i = 0; i < touches.length; i ++ ) {

			out.x += touches[ i ].clientX;
			out.y += touches[ i ].clientY;

		}

		out.x /= touches.length;
		out.y /= touches.length;

		return out;

	} else {

		const mouseEvent = event as MouseEvent;

		out.set( mouseEvent.clientX, mouseEvent.clientY );

		return out;

	}

}
