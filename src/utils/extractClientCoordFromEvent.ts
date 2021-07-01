import type * as _THREE  from 'three';
import type { PointerInput } from '../types';

export function extractClientCoordFromEvent( pointers: PointerInput[], out: _THREE.Vector2 ) {

	out.set( 0, 0 );

	pointers.forEach( ( pointer ) => {

		out.x += pointer.clientX;
		out.y += pointer.clientY;

	} );

	out.x /= pointers.length;
	out.y /= pointers.length;

}
