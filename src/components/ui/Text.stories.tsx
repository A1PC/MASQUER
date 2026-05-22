import type { Meta, StoryObj } from '@storybook/react';
import { Heading, Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'UI/Typography',
  component: Text,
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Text>;

export const Headings: S = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Heading level={1}>The High Roller</Heading>
      <Heading level={2}>Texas Hold&apos;em</Heading>
      <Heading level={3}>Table Rules</Heading>
    </div>
  ),
};

export const Body: S = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
      <Text tone="default">Default ivory body copy for table descriptions.</Text>
      <Text tone="muted">Muted helper text for secondary detail.</Text>
      <Text tone="gold">Gold emphasis for stakes and totals.</Text>
    </div>
  ),
};
