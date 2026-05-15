import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

it('renders the lobby placeholder by default', () => {
  render(
    <MemoryRouter initialEntries={['/lobby']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: /lobby/i })).toBeInTheDocument();
});
