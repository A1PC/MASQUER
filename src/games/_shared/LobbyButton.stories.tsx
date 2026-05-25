import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router';
import LobbyButton from './LobbyButton';

const meta: Meta<typeof LobbyButton> = {
  title: 'Games/Shared/LobbyButton',
  component: LobbyButton,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ background: '#06120c', padding: 24 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;
type S = StoryObj<typeof LobbyButton>;

export const Default: S = {};
export const CustomLabel: S = { args: { label: 'EXIT TABLE' } };
export const CustomDestination: S = { args: { to: '/lobby' } };
