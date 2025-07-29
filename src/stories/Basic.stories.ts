import type { Meta, StoryObj } from '@storybook/html-vite';
import { createBasic } from './Basic';

import type { BasicProps } from './Basic';

const meta = {
	title: 'Examples/Basic',
	render: ( args ) => {

		return createBasic( args );

	},
	argTypes: {
	},
	args: {
	},
	parameters: {
		layout: 'fullscreen',
	},
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
