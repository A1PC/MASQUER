import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminTableFilters from './AdminTableFilters';

describe('AdminTableFilters', () => {
  it('renders nothing inside the container when no slots are provided', () => {
    const { container } = render(<AdminTableFilters />);
    const filters = container.querySelector('[data-admin-table-filters]');
    expect(filters).not.toBeNull();
    expect(filters?.querySelector('[data-admin-filter-user]')).toBeNull();
    expect(filters?.querySelector('[data-admin-filter-type]')).toBeNull();
    expect(filters?.querySelector('[data-admin-filter-range]')).toBeNull();
    expect(filters?.querySelector('[data-admin-filter-search]')).toBeNull();
    expect(filters?.querySelector('[data-admin-filter-reset]')).toBeNull();
  });

  it('renders only the user slot when only user is provided', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AdminTableFilters user={{ value: 'alice', onChange, placeholder: 'Username' }} />,
    );
    const input = container.querySelector('[data-admin-filter-user]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('alice');
    expect(container.querySelector('[data-admin-filter-type]')).toBeNull();
    expect(container.querySelector('[data-admin-filter-range]')).toBeNull();
    expect(container.querySelector('[data-admin-filter-search]')).toBeNull();
  });

  it('fires onChange when the user input changes', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AdminTableFilters user={{ value: '', onChange, placeholder: 'Username' }} />,
    );
    const input = container.querySelector('[data-admin-filter-user]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'bob' } });
    expect(onChange).toHaveBeenCalledWith('bob');
  });

  it('renders the type select with caller-supplied options + "All" sentinel', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AdminTableFilters
        type={{
          value: '',
          onChange,
          options: [
            { value: 'ban', label: 'Ban' },
            { value: 'unban', label: 'Unban' },
          ],
        }}
      />,
    );
    const select = container.querySelector('[data-admin-filter-type]') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.querySelectorAll('option')).toHaveLength(3);
    fireEvent.change(select, { target: { value: 'ban' } });
    expect(onChange).toHaveBeenCalledWith('ban');
  });

  it('renders the date range tab strip when range slot is provided', () => {
    const onChange = vi.fn();
    const { container } = render(<AdminTableFilters range={{ value: '7d', onChange }} />);
    expect(container.querySelector('[data-admin-filter-range]')).not.toBeNull();
    expect(container.querySelector('[data-date-range-filter]')).not.toBeNull();
    const sevenDay = container.querySelector('[data-range="7d"]') as HTMLButtonElement;
    expect(sevenDay.getAttribute('aria-selected')).toBe('true');
  });

  it('renders the search input + fires onChange when typed into', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AdminTableFilters search={{ value: '', onChange, placeholder: 'Reason' }} />,
    );
    const input = container.querySelector('[data-admin-filter-search]') as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: 'grant' } });
    expect(onChange).toHaveBeenCalledWith('grant');
  });

  it('renders the reset button only when onReset is provided + fires it on click', () => {
    const onReset = vi.fn();
    const { container, rerender } = render(<AdminTableFilters />);
    expect(container.querySelector('[data-admin-filter-reset]')).toBeNull();
    rerender(<AdminTableFilters onReset={onReset} />);
    const btn = container.querySelector('[data-admin-filter-reset]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('renders a trailing slot for caller-supplied controls', () => {
    const { getByText } = render(
      <AdminTableFilters trailing={<button type="button">Export CSV</button>} />,
    );
    expect(getByText('Export CSV')).toBeInTheDocument();
  });

  it('renders all four slots side-by-side when supplied together', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AdminTableFilters
        user={{ value: '', onChange, placeholder: 'Username' }}
        type={{
          value: '',
          onChange,
          options: [{ value: 'ban', label: 'Ban' }],
        }}
        range={{ value: 'all', onChange }}
        search={{ value: '', onChange, placeholder: 'Reason or username' }}
        onReset={onChange}
      />,
    );
    expect(container.querySelector('[data-admin-filter-user]')).not.toBeNull();
    expect(container.querySelector('[data-admin-filter-type]')).not.toBeNull();
    expect(container.querySelector('[data-admin-filter-range]')).not.toBeNull();
    expect(container.querySelector('[data-admin-filter-search]')).not.toBeNull();
    expect(container.querySelector('[data-admin-filter-reset]')).not.toBeNull();
    // Sanity: the search-related elements are part of the container.
    expect(screen.getAllByRole('textbox').length).toBe(2);
  });
});
