import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'UI/Icon',
  component: Icon,
  args: { name: 'Spade', size: 28 },
  parameters: { layout: 'centered' },
};
export default meta;
export const Default: StoryObj<typeof Icon> = {};
export const Labelled: StoryObj<typeof Icon> = { args: { name: 'Coins', label: 'chips' } };
