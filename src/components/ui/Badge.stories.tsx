import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  args: { children: 'Push', tone: 'neutral' },
  argTypes: { tone: { control: 'select', options: ['win', 'loss', 'neutral', 'info'] } },
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Badge>;

export const Win: S = { args: { tone: 'win', icon: 'TrendingUp', children: 'Win +250' } };
export const Loss: S = { args: { tone: 'loss', icon: 'TrendingDown', children: 'Loss' } };
export const Neutral: S = { args: { tone: 'neutral', children: 'Push' } };
export const Info: S = { args: { tone: 'info', icon: 'Info', children: 'New' } };

export const AllTones: S = {
  render: () => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Badge tone="win" icon="TrendingUp">
        Win +250
      </Badge>
      <Badge tone="loss" icon="TrendingDown">
        Loss
      </Badge>
      <Badge tone="neutral">Push</Badge>
      <Badge tone="info" icon="Info">
        New
      </Badge>
    </div>
  ),
};
