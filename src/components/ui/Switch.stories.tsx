import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  args: { 'aria-label': 'Sound effects' },
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Switch>;

export const Off: S = {};
export const On: S = { args: { defaultChecked: true } };
export const Disabled: S = { args: { disabled: true, defaultChecked: true } };
