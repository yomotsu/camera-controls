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
