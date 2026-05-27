import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import AdminPagination from './AdminPagination';

describe('AdminPagination', () => {
  it('renders the range summary + page indicator', () => {
    const { container } = render(
      <AdminPagination page={1} pageSize={25} totalRows={73} onChange={vi.fn()} />,
    );
    expect(container.querySelector('[data-admin-pagination-summary]')?.textContent).toBe(
      '1–25 of 73',
    );
    expect(container.querySelector('[data-admin-pagination-page]')?.textContent).toBe('1 / 3');
  });

  it('renders 0–0 of 0 + disables both buttons when totalRows is zero', () => {
    const { container } = render(
      <AdminPagination page={1} pageSize={25} totalRows={0} onChange={vi.fn()} />,
    );
    expect(container.querySelector('[data-admin-pagination-summary]')?.textContent).toBe(
      '0–0 of 0',
    );
    const prev = container.querySelector('[data-admin-pagination-prev]') as HTMLButtonElement;
    const next = container.querySelector('[data-admin-pagination-next]') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(true);
  });

  it('disables prev on page 1', () => {
    const { container } = render(
      <AdminPagination page={1} pageSize={25} totalRows={100} onChange={vi.fn()} />,
    );
    const prev = container.querySelector('[data-admin-pagination-prev]') as HTMLButtonElement;
    const next = container.querySelector('[data-admin-pagination-next]') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
  });

  it('disables next on the last page', () => {
    const { container } = render(
      <AdminPagination page={4} pageSize={25} totalRows={100} onChange={vi.fn()} />,
    );
    const prev = container.querySelector('[data-admin-pagination-prev]') as HTMLButtonElement;
    const next = container.querySelector('[data-admin-pagination-next]') as HTMLButtonElement;
    expect(prev.disabled).toBe(false);
    expect(next.disabled).toBe(true);
  });

  it('fires onChange with the next page when Next is clicked', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AdminPagination page={2} pageSize={25} totalRows={100} onChange={onChange} />,
    );
    const next = container.querySelector('[data-admin-pagination-next]') as HTMLButtonElement;
    fireEvent.click(next);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('fires onChange with the previous page when Prev is clicked', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AdminPagination page={3} pageSize={25} totalRows={100} onChange={onChange} />,
    );
    const prev = container.querySelector('[data-admin-pagination-prev]') as HTMLButtonElement;
    fireEvent.click(prev);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('shows the end of the partial last page in the summary', () => {
    const { container } = render(
      <AdminPagination page={3} pageSize={25} totalRows={73} onChange={vi.fn()} />,
    );
    // Page 3 of 25/page → rows 51-73 (last page is partial).
    expect(container.querySelector('[data-admin-pagination-summary]')?.textContent).toBe(
      '51–73 of 73',
    );
  });

  it('formats totalRows with locale separators', () => {
    const { container } = render(
      <AdminPagination page={1} pageSize={25} totalRows={12_345} onChange={vi.fn()} />,
    );
    expect(container.querySelector('[data-admin-pagination-summary]')?.textContent).toContain(
      '12,345',
    );
  });
});
