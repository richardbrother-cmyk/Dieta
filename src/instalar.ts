import { useSyncExternalStore } from 'react';

/** Evento con el que Chrome avisa de que la app se puede instalar. */
interface OfertaDeInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let oferta: OfertaDeInstalacion | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

// Se escucha desde que carga el módulo: Chrome lanza el evento una sola vez, pronto.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  oferta = e as OfertaDeInstalacion;
  avisar();
});
window.addEventListener('appinstalled', () => {
  oferta = null;
  avisar();
});

function suscribir(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

/** La app ya se abrió desde su icono, no desde una pestaña del navegador. */
export function estaInstalada(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
}

export function useInstalacion(): { disponible: boolean; instalar: () => Promise<void> } {
  const actual = useSyncExternalStore(suscribir, () => oferta);
  return {
    disponible: actual !== null,
    async instalar() {
      if (!actual) return;
      await actual.prompt();
      await actual.userChoice;
      // Cada oferta sirve una sola vez, se acepte o no.
      oferta = null;
      avisar();
    },
  };
}
