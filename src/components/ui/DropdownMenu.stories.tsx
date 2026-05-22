import type { Meta, StoryObj } from '@storybook/react';
import { DropdownMenu } from './DropdownMenu';
import { Button } from './Button';

const meta: Meta<typeof DropdownMenu> = {
  title: 'UI/DropdownMenu',
  component: DropdownMenu,
  parameters: { layout: 'centered' },
};
export default meta;

export const TableActions: StoryObj<typeof DropdownMenu> = {
  render: () => (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary">Actions</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Table</DropdownMenu.Label>
        <DropdownMenu.Item>Cash out</DropdownMenu.Item>
        <DropdownMenu.Item>Change tier</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item>Leave table</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  ),
};
