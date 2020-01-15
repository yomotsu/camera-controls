import * as _THREE  from 'three/src/Three.d';
import { isTouchEvent } from './isTouchEvent';

export function extractClientCoordFromEvent( event: Event, out: _THREE.Vector2 ) {

	out.set( 0, 0 );

	if ( isTouchEvent( event ) ) {

		const touchEvent = event as TouchEvent;

		for ( let i = 0; i < touchEvent.touches.length; i ++ ) {

			out.x += touchEvent.touches[ i ].clientX;
			out.y += touchEvent.touches[ i ].clientY;

		}

		out.x /= touchEvent.touches.length;
		out.y /= touchEvent.touches.length;

		return out;

	} else {

		const mouseEvent = event as MouseEvent;

		out.set( mouseEvent.clientX, mouseEvent.clientY );

		return out;

	}

}
