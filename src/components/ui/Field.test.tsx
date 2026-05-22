import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Field } from './Field';

describe('Field', () => {
  it('labels the control and shows helper text', () => {
    const { getByLabelText, getByText } = render(
      <Field id="amt" label="Amount" helper="Max 2,500">
        <input id="amt" />
      </Field>,
    );
    expect(getByLabelText('Amount')).toBeInTheDocument();
    expect(getByText('Max 2,500')).toBeInTheDocument();
  });
  it('shows the error with role=alert when invalid', () => {
    const { getByRole } = render(
      <Field id="amt" label="Amount" error="Too high">
        <input id="amt" />
      </Field>,
    );
    expect(getByRole('alert')).toHaveTextContent('Too high');
  });
  it('prefers the error message over helper text', () => {
    const { queryByText, getByRole } = render(
      <Field id="amt" label="Amount" helper="Max 2,500" error="Too high">
        <input id="amt" />
      </Field>,
    );
    expect(getByRole('alert')).toHaveTextContent('Too high');
    expect(queryByText('Max 2,500')).not.toBeInTheDocument();
  });
});
