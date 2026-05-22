import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: { layout: 'centered' },
};
export default meta;

export const Tables: StoryObj<typeof Tabs> = {
  render: () => (
    <div style={{ width: 360 }}>
      <Tabs defaultValue="overview">
        <Tabs.List aria-label="Tables">
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="blackjack">Blackjack</Tabs.Trigger>
          <Tabs.Trigger value="poker">Poker</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview">The house always remembers.</Tabs.Content>
        <Tabs.Content value="blackjack">Hit, stand, double, split.</Tabs.Content>
        <Tabs.Content value="poker">Texas hold&apos;em, heads up.</Tabs.Content>
      </Tabs>
    </div>
  ),
};
