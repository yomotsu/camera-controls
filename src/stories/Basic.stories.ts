import * as THREE from 'three';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { createBasic } from './Basic';
import type { BasicProps } from './Basic';

import { setup } from './setup';

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

			const { container, camera, cameraControls, mesh } = setup( );

			const controlsDiv = document.createElement( 'div' );
			controlsDiv.classList.add( 'info' );
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

				const el = controlsDiv.querySelector( selector ) as HTMLElement;
				if ( el ) el.onclick = fn;

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

			const storyResult = story();
			if ( typeof storyResult === 'string' ) {

				container.innerHTML = storyResult;

			} else {

				container.appendChild( storyResult );

			}

			return container;

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
