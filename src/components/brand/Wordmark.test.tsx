import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Wordmark from './Wordmark';

describe('Wordmark', () => {
  it('renders the MASQUER name and the mask emblem', () => {
    const { getByText, getByRole } = render(<Wordmark />);
    expect(getByText('MASQUER')).toBeInTheDocument();
    expect(getByRole('img', { name: /masquer/i })).toBeInTheDocument();
  });
});
