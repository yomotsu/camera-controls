import './basic.css';

import { CameraControls } from '../CameraControls';
import * as THREE from 'three';

CameraControls.install( { THREE } );

export interface BasicProps {}

export const createBasic = ( {}: BasicProps ) => {

	const width = window.innerWidth;
	const height = window.innerHeight;
	const clock = new THREE.Clock();
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera( 60, width / height, 0.01, 100 );
	camera.position.set( 0, 0, 5 );
	const renderer = new THREE.WebGLRenderer();
	renderer.setSize( width, height );
	document.body.appendChild( renderer.domElement );

	const cameraControls = new CameraControls( camera, renderer.domElement );

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
		const elapsed = clock.getElapsedTime();
		const updated = cameraControls.update( delta );

		// if ( elapsed > 30 ) { return; }

		requestAnimationFrame( anim );

		if ( updated ) {

			renderer.render( scene, camera );
			console.log( 'rendered' );

		}

	} )();

	//
	//
	//

	const container = document.createElement( 'div' );

	const controlsDiv = document.createElement( 'div' );
	controlsDiv.classList.add( 'info' );
	controlsDiv.style.marginBottom = '16px';
	controlsDiv.innerHTML = `
    <button id="rotate45">rotate theta 45deg</button>
    <button id="rotate-90">rotate theta -90deg</button>
    <button id="rotate360">rotate theta 360deg</button>
    <button id="rotatePhi20">rotate phi 20deg</button>
    <br />
    <button id="truck1_0">truck(1, 0)</button>
    <button id="truck0_1">truck(0, 1)</button>
    <button id="truck-1_-1">truck(-1, -1)</button>
    <br />
    <button id="dolly1">dolly 1</button>
    <button id="dolly-1">dolly -1</button>
    <br />
    <button id="zoomHalf">zoom camera.zoom / 2</button>
    <button id="zoomNegHalf">zoom -camera.zoom / 2</button>
    <br />
    <button id="moveTo">move to(3, 5, 2)</button>
    <button id="fitToBox">fit to the bounding box of the mesh</button>
    <br />
    <button id="reset">reset</button>
    <button id="saveState">saveState</button>
    <br />
    <button id="disable">disable mouse/touch controls</button>
    <button id="enable">enable mouse/touch controls</button>
  `;
	container.appendChild( controlsDiv );

	const setHandler = ( selector: string, fn: () => void ) => {

		const el = controlsDiv.querySelector( selector );
		if ( el ) ( el as HTMLButtonElement ).onclick = fn;

	};

	setHandler( '#rotate45', () => cameraControls.rotate( 45 * THREE.MathUtils.DEG2RAD, 0, true ) );
	setHandler( '#rotate-90', () => cameraControls.rotate( - 90 * THREE.MathUtils.DEG2RAD, 0, true ) );
	setHandler( '#rotate360', () => cameraControls.rotate( 360 * THREE.MathUtils.DEG2RAD, 0, true ) );
	setHandler( '#rotatePhi20', () => cameraControls.rotate( 0, 20 * THREE.MathUtils.DEG2RAD, true ) );
	setHandler( '#truck1_0', () => cameraControls.truck( 1, 0, true ) );
	setHandler( '#truck0_1', () => cameraControls.truck( 0, 1, true ) );
	setHandler( '#truck-1_-1', () => cameraControls.truck( - 1, - 1, true ) );
	setHandler( '#dolly1', () => cameraControls.dolly( 1, true ) );
	setHandler( '#dolly-1', () => cameraControls.dolly( - 1, true ) );
	setHandler( '#zoomHalf', () => cameraControls.zoom( camera.zoom / 2, true ) );
	setHandler( '#zoomNegHalf', () => cameraControls.zoom( - camera.zoom / 2, true ) );
	setHandler( '#moveTo', () => cameraControls.moveTo( 3, 5, 2, true ) );
	setHandler( '#fitToBox', () => cameraControls.fitToBox( mesh, true ) );
	setHandler( '#reset', () => cameraControls.normalizeRotations().reset( true ) );
	setHandler( '#saveState', () => cameraControls.saveState() );
	setHandler( '#disable', () => {

		cameraControls.enabled = false;

	} );
	setHandler( '#enable', () => {

		cameraControls.enabled = true;

	} );

	return container;

};
