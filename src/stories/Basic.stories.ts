import * as THREE from 'three';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { userEvent, within } from '@storybook/testing-library';
import { createBasic } from './Basic';
import type { BasicProps } from './Basic';

import { setup } from './setup';

const { DEG2RAD } = THREE.MathUtils;

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

			const { container, camera, cameraControls, mesh } = setup();

			const controlsDiv = document.createElement( 'div' );
			controlsDiv.classList.add( 'info' );
			container.appendChild( controlsDiv );

			[
				{
					text: 'rotate theta 45deg',
					action: () => cameraControls.rotate( 45 * DEG2RAD, 0, true )
				},
				{
					text: 'rotate theta -90deg',
					action: () => cameraControls.rotate( - 90 * DEG2RAD, 0, true )
				},
				{
					text: 'rotate theta 360deg',
					action: () => cameraControls.rotate( 360 * DEG2RAD, 0, true )
				},
				{
					text: 'rotate phi 20deg',
					action: () => cameraControls.rotate( 0, 20 * DEG2RAD, true )
				},
				{
					text: 'truck(1, 0)',
					action: () => cameraControls.truck( 1, 0, true )
				},
				{
					text: 'truck(0, 1)',
					action: () => cameraControls.truck( 0, 1, true )
				},
				{
					text: 'truck(-1, -1)',
					action: () => cameraControls.truck( - 1, - 1, true )
				},
				{
					text: 'dolly 1',
					action: () => cameraControls.dolly( 1, true )
				},
				{
					text: 'dolly -1',
					action: () => cameraControls.dolly( - 1, true )
				},
				{
					text: 'zoom camera.zoom / 2',
					action: () => cameraControls.zoom( camera.zoom / 2, true )
				},
				{
					text: 'zoom -camera.zoom / 2',
					action: () => cameraControls.zoom( - camera.zoom / 2, true )
				},
				{
					text: 'move to(3, 5, 2)',
					action: () => cameraControls.moveTo( 3, 5, 2, true )
				},
				{
					text: 'fit to the bounding box of the mesh',
					action: () => cameraControls.fitToBox( mesh, true )
				},
				{
					text: 'reset',
					action: () => cameraControls.normalizeRotations().reset( true )
				},
				{
					text: 'saveState',
					action: () => cameraControls.saveState()
				},
				{
					text: 'disable mouse/touch controls',
					action: () => cameraControls.enabled = false
				},
				{
					text: 'enable mouse/touch controls',
					action: () => cameraControls.enabled = true
				}
			].forEach( ( { text, action } ) => {

				const button = document.createElement( 'button' );
				button.innerText = text;
				button.addEventListener( 'click', action );
				controlsDiv.appendChild( button );

			} );

			return container;

		}
	],
} satisfies Meta<BasicProps>;

export default meta;
type Story = StoryObj<BasicProps>;

export const St1: Story = {
	args: {},
	play: async ( { canvasElement } ) => {

		const canvas = within( canvasElement );

		const btn = canvas.getByText( "rotate theta 45deg" );
		await userEvent.click( btn );

	},
};
export const St2: Story = {
	args: {},
	play: async ( { canvasElement } ) => {

		const canvas = within( canvasElement );

		const btn = canvas.getByText( "rotate phi 20deg" );
		await userEvent.click( btn );

	},
};

export const St3: Story = {
	args: {},
	play: async ( { canvasElement } ) => {

		const canvas = within( canvasElement );

		const btn = canvas.getByText( "truck(1, 0)" );
		await userEvent.click( btn );

	},
};

export const St4: Story = {
	args: {},
	play: async ( { canvasElement } ) => {

		const canvas = within( canvasElement );

		const btn = canvas.getByText( "dolly 1" );
		await userEvent.click( btn );

	},
};


export const St5: Story = {
	args: {},
	play: async ( { canvasElement } ) => {

		const canvas = within( canvasElement );

		const btn = canvas.getByText( "zoom camera.zoom / 2" );
		await userEvent.click( btn );

	},
};


export const St6: Story = {
	args: {},
	play: async ( { canvasElement } ) => {

		const canvas = within( canvasElement );

		const btn = canvas.getByText( "move to(3, 5, 2)" );
		await userEvent.click( btn );

	},
};

export const St7: Story = {
	args: {},
	play: async ( { canvasElement } ) => {

		const canvas = within( canvasElement );

		const btn = canvas.getByText( "fit to the bounding box of the mesh" );
		await userEvent.click( btn );

	},
};
