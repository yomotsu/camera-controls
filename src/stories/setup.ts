import * as THREE from 'three';
import { CameraControls } from '../CameraControls';

import './setup.css';

export const setup = ( container: HTMLElement = document.createElement( 'div' ) ) => {

	const clock = new THREE.Clock();
	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 100 );
	camera.position.set( 0, 0, 5 );

	const renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	CameraControls.install( { THREE } );
	const cameraControls = new CameraControls( camera, renderer.domElement );

	const mesh = new THREE.Mesh(
		new THREE.BoxGeometry( 1, 1, 1 ),
		new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } )
	);
	scene.add( mesh );

	const gridHelper = new THREE.GridHelper( 50, 50 );
	gridHelper.position.y = - 1;
	scene.add( gridHelper );

	const axesHelper = new THREE.AxesHelper();
	scene.add( axesHelper );

	renderer.render( scene, camera );


	function anim() {

		const delta = clock.getDelta();
		const updated = cameraControls.update( delta );
		if ( updated ) renderer.render( scene, camera );

	}

	renderer.setAnimationLoop( anim );

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		cameraControls.update( 0 );

		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.render( scene, camera );

	}

	window.addEventListener( "resize", onWindowResize, false );

	//
	//
	//

	return { container, camera, cameraControls, mesh };

};
