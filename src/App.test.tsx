import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('muestra las cuatro pestañas', () => {
  render(<MemoryRouter><App /></MemoryRouter>);
  for (const n of ['Hoy', 'Historial', 'Peso', 'Ajustes'])
    expect(screen.getByRole('link', { name: n })).toBeInTheDocument();
});
