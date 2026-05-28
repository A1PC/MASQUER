import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import RouteFallback from './RouteFallback';
import { usePrefsStore } from '@/store/prefsStore';

const meta: Meta<typeof RouteFallback> = {
  title: 'Components/RouteFallback',
  component: RouteFallback,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '60vh' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type S = StoryObj<typeof RouteFallback>;

export const Default: S = {};

export const Labelled: S = {
  args: { label: 'Loading craps…' },
};

export const ReducedMotion: S = {
  args: { label: 'Loading admin…' },
  decorators: [
    (Story) => {
      // Force the per-user motion pref to 'reduced' for this story so the
      // fallback collapses to a static glow regardless of the host OS setting.
      useEffect(() => {
        const prev = usePrefsStore.getState().prefs;
        usePrefsStore.setState({
          prefs: {
            userId: 'story',
            soundEnabled: true,
            masterVolume: 0.8,
            muteUi: false,
            muteGame: false,
            muteAmbience: false,
            motionPref: 'reduced',
          },
        });
        return () => usePrefsStore.setState({ prefs: prev });
      }, []);
      return <Story />;
    },
  ],
};
