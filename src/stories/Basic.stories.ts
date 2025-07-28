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

export const Default: Story = {};
