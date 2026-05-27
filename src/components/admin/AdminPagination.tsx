import type { JSX } from 'react';

export interface AdminPaginationProps {
  /** 1-indexed current page. Clamped via the disabled-state of the buttons. */
  page: number;
  /** Rows per page. Caller's responsibility; component is purely presentational. */
  pageSize: number;
  /** Total filtered row count — drives the summary + total-page math. */
  totalRows: number;
  /** Page change callback. Receives the next page (1-indexed). */
  onChange: (nextPage: number) => void;
}

/**
 * Tiny prev/next + page indicator + range summary used by admin tables that
 * paginate in-memory (Phase 15 #14 PR D). Tokens-only Tailwind; the container
 * exposes `data-admin-pagination` for test scoping.
 */
export default function AdminPagination({
  page,
  pageSize,
  totalRows,
  onChange,
}: AdminPaginationProps): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const start = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalRows, page * pageSize);
  const canPrev = page > 1;
  const canNext = page < totalPages;
  return (
    <div
      className="flex items-center justify-between gap-3 pt-3 text-xs uppercase tracking-wider text-ivory/55"
      data-admin-pagination
    >
      <span
        className="font-mono normal-case tabular-nums tracking-normal"
        data-admin-pagination-summary
      >
        {start}–{end} of {totalRows.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onChange(page - 1)}
          className="rounded-md border border-brass/60 px-3 py-1 text-ivory/80 transition hover:bg-velvet hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
          data-admin-pagination-prev
        >
          ← Prev
        </button>
        <span
          className="font-mono normal-case tabular-nums tracking-normal text-ivory"
          data-admin-pagination-page
        >
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onChange(page + 1)}
          className="rounded-md border border-brass/60 px-3 py-1 text-ivory/80 transition hover:bg-velvet hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
          data-admin-pagination-next
        >
          Next →
        </button>
      </div>
    </div>
  );
}
