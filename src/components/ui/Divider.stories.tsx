import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from './Divider';

const meta: Meta<typeof Divider> = {
  title: 'UI/Divider',
  component: Divider,
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type S = StoryObj<typeof Divider>;

export const Plain: S = {};
export const Ornamented: S = { args: { ornament: true } };
