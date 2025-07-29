import type { Meta, StoryObj } from '@storybook/html-vite';
import { createBasic } from './Basic';
import type { BasicProps } from './Basic';
import * as THREE from 'three';
import { CameraControls } from '../CameraControls';

import './basic.css';

const setup = ( container: HTMLElement ) => {


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

	renderer.render( scene, camera );

	let needRender = true;
	function anim() {

		const delta = clock.getDelta();
		const updated = cameraControls.update( delta );
		if ( updated ) needRender = true;
		if ( needRender ) {

			renderer.render( scene, camera );
			needRender = false;

		}

	}

	renderer.setAnimationLoop( anim );

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		cameraControls.update( 0 );

		renderer.setSize( window.innerWidth, window.innerHeight );
		needRender = true;

	}

	window.addEventListener( "resize", onWindowResize, false );

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
		if ( el ) ( el as HTMLElement ).onclick = fn;

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

const meta = {
	title: 'Examples/Basic',
	render: ( args ) => createBasic( args ),
	argTypes: {},
	args: {},
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [
		( story ) => {

			const decorator = document.createElement( 'div' );

			setup( decorator );

			const storyResult = story();
			if ( typeof storyResult === 'string' ) {

				decorator.innerHTML = storyResult;

			} else {

				decorator.appendChild( storyResult );

			}

			return decorator;

		}
	],
} satisfies Meta<BasicProps>;

export default meta;
type Story = StoryObj<BasicProps>;

export const St1: Story = {
	args: {},
	play: async ( { canvas, userEvent } ) => {

		const btn = canvas.getByText( "rotate theta 45deg" );
		await userEvent.click( btn );

	},
};
export const St2: Story = {
	args: {},
	play: async ( { canvas, userEvent } ) => {

		const btn = canvas.getByText( "rotate phi 20deg" );
		await userEvent.click( btn );

	},
};
