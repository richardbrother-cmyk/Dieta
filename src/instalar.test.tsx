import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { abrir, prepararApp } from './pruebas/util';

beforeEach(() => prepararApp());

test('sin oferta del navegador explica cómo instalar desde el menú', async () => {
  abrir('/ajustes');
  expect(await screen.findByText(/Agregar a pantalla principal/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument();
});

test('cuando el navegador lo ofrece, el botón abre el diálogo de instalación', async () => {
  const u = userEvent.setup();
  abrir('/ajustes');
  const prompt = vi.fn().mockResolvedValue(undefined);
  const oferta = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  });
  act(() => {
    window.dispatchEvent(oferta);
  });
  expect(oferta.defaultPrevented).toBe(true);
  await u.click(await screen.findByRole('button', { name: 'Instalar app' }));
  expect(prompt).toHaveBeenCalledTimes(1);
  await vi.waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument(),
  );
});
