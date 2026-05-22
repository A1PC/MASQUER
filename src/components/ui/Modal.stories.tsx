import type { Meta, StoryObj } from '@storybook/react';
import { Modal, Drawer } from './Modal';
import { Button } from './Button';
import { Field } from './Field';
import { Switch } from './Switch';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: { layout: 'centered' },
};
export default meta;

export const LeaveTable: StoryObj<typeof Modal> = {
  render: () => (
    <Modal
      trigger={<Button variant="secondary">Leave table</Button>}
      title="Leave table?"
      description="You will cash out your current stack of 1,840 chips."
    >
      <div className="mt-4 flex justify-end gap-2.5">
        <Button variant="ghost">Stay</Button>
        <Button variant="danger">Cash out</Button>
      </div>
    </Modal>
  ),
};

export const SettingsDrawer: StoryObj<typeof Drawer> = {
  render: () => (
    <Drawer trigger={<Button>Open settings</Button>} title="Table settings">
      <div className="mt-4 flex flex-col gap-4">
        <Field id="sound" label="Sound effects">
          <Switch id="sound" defaultChecked />
        </Field>
        <Field id="fast" label="Fast deal">
          <Switch id="fast" />
        </Field>
      </div>
    </Drawer>
  ),
};
