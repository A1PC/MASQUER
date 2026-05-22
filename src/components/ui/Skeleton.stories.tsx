import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: { layout: 'centered' },
};
export default meta;

export const TableRow: StoryObj<typeof Skeleton> = {
  render: () => (
    <div className="flex w-[280px] flex-col gap-3">
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} />
      <Skeleton height={14} width="80%" />
      <div className="flex gap-2">
        <Skeleton height={44} width={44} className="rounded-full" />
        <Skeleton height={44} className="flex-1" />
      </div>
    </div>
  ),
};
