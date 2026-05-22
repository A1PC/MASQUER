import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  args: { size: 28 },
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Spinner>;

export const Default: S = {};
export const Small: S = { args: { size: 16 } };
export const Medium: S = { args: { size: 28 } };
export const Large: S = { args: { size: 48 } };

export const Sizes: S = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Spinner size={16} />
      <Spinner size={28} />
      <Spinner size={48} />
    </div>
  ),
};
