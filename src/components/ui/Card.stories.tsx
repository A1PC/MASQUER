import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardBody, CardFooter, Panel } from './Card';
import { Button } from './Button';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  argTypes: {
    variant: { control: 'select', options: ['plain', 'deco'] },
    surface: { control: 'select', options: ['felt', 'velvet'] },
  },
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Card>;

const Sample = () => (
  <>
    <CardHeader>Texas Hold&apos;em</CardHeader>
    <CardBody>
      No-limit · 6 seats · buy-in 1,000. Sit down and play against the house archetypes.
    </CardBody>
    <CardFooter>
      <Button size="md">Sit Down</Button>
    </CardFooter>
  </>
);

export const Deco: S = {
  args: { variant: 'deco', surface: 'felt' },
  render: (args) => (
    <Card {...args} style={{ maxWidth: 320 }}>
      <Sample />
    </Card>
  ),
};

export const Plain: S = {
  args: { variant: 'plain', surface: 'felt' },
  render: (args) => (
    <Card {...args} style={{ maxWidth: 320 }}>
      <Sample />
    </Card>
  ),
};

export const VelvetPanel: S = {
  render: () => (
    <Panel surface="velvet" style={{ maxWidth: 320 }}>
      <Sample />
    </Panel>
  ),
};
