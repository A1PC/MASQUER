import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'UI/Chip',
  component: Chip,
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Chip>;

export const Emblem: S = { args: { emblem: true, surface: 'felt' } };
export const Denomination: S = { args: { value: 100, surface: 'velvet' } };

export const Denominations: S = {
  render: () => (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <Chip emblem surface="felt" />
      <Chip value={100} surface="velvet" />
      <Chip value={500} surface="emerald" />
    </div>
  ),
};

export const Sizes: S = {
  render: () => (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <Chip value={25} size="sm" />
      <Chip value={100} size="md" />
      <Chip value={500} size="lg" />
    </div>
  ),
};
