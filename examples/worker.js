import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import CameraControls from '../dist/camera-controls.module.js';
import { PseudoElement } from './PseudoElement.js';

CameraControls.install( { THREE } );

// DOM element doesn't exist in WebWorker. use a virtual element in CameraControls instead.
const pseudoElement = new PseudoElement();
let scene;
let camera;
let renderer;
let cameraControls;

self.onmessage = ( { data } ) => {

	const { action, payload } = data;

	switch ( action ) {

		case 'init': {

			const { canvas, x, y, width, height } = payload;
			canvas.style = { width: '', height: '' };

			const clock = new THREE.Clock();
			scene = new THREE.Scene();
			camera = new THREE.PerspectiveCamera( 60, width / height, 0.01, 100 );
			camera.position.set( 0, 0, 5 );
			renderer = new THREE.WebGLRenderer( { canvas } );
			renderer.setSize( width, height );

			pseudoElement.update( x, y, width, height );
			cameraControls = new CameraControls( camera, pseudoElement, self );
			cameraControls.addEventListener( 'controlend', () => self.postMessage( { action: 'controlend' } ) );

			const mesh = new THREE.Mesh(
				new THREE.BoxGeometry( 1, 1, 1 ),
				new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } )
			);
			scene.add( mesh );

			const gridHelper = new THREE.GridHelper( 50, 50 );
			gridHelper.position.y = - 1;
			scene.add( gridHelper );

			renderer.render( scene, camera );

			( function anim() {

				const delta = clock.getDelta();
				// const elapsed = clock.getElapsedTime();
				const updated = cameraControls.update( delta );

				// if ( elapsed > 30 ) return;

				requestAnimationFrame( anim );

				if ( updated ) {

					renderer.render( scene, camera );
					self.postMessage( 'rendered' );

				}

			} )();

			break;

		}

		case 'resize': {

			const { x, y, width, height } = payload;
			pseudoElement.update( x, y, width, height );
			renderer.setSize( width, height );
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			renderer.render( scene, camera );
			break;

		}

		case 'pointerdown': {

			const { event } = payload;
			pseudoElement.dispatchEvent( { type: action, ...event } );
			break;

		}

		case 'pointermove':
		case 'pointerup': {

			const { event } = payload;
			pseudoElement.ownerDocument.dispatchEvent( { type: action, ...event } );
			break;

		}

		case 'reset': {

			cameraControls.reset( true );
			break;

		}

	}

	// debug log
	self.postMessage( data.action );

};
