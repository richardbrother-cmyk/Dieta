import { useSyncExternalStore } from 'react';
import { calcularMetas } from '../dominio/metas';
import type { Ajustes } from '../dominio/tipos';
import { actualizarMetaDeHoy } from './repositorio';

const CLAVE = 'dieta.ajustes';

export const AJUSTES_INICIALES: Ajustes = {
  perfil: null,
  metaKcal: 0,
  metaProteina: 0,
  metaManual: false,
  apiKey: '',
};

const oyentes = new Set<() => void>();
// useSyncExternalStore necesita la misma referencia mientras el contenido no cambie.
let cache: { crudo: string | null; valor: Ajustes } | null = null;

export function leerAjustes(): Ajustes {
  let crudo: string | null = null;
  try {
    crudo = localStorage.getItem(CLAVE);
  } catch {
    // Almacenamiento bloqueado: se trabaja con los valores iniciales.
  }
  if (cache && cache.crudo === crudo) return cache.valor;
  let valor = AJUSTES_INICIALES;
  if (crudo) {
    try {
      const leido = JSON.parse(crudo);
      if (leido && typeof leido === 'object') valor = { ...AJUSTES_INICIALES, ...leido };
    } catch {
      // JSON dañado: se ignora.
    }
  }
  cache = { crudo, valor };
  return valor;
}

export function guardarAjustes(a: Ajustes): void {
  const final = !a.metaManual && a.perfil ? { ...a, ...calcularMetas(a.perfil) } : a;
  localStorage.setItem(CLAVE, JSON.stringify(final));
  // El registro de hoy sigue a la meta actual; los días pasados conservan la suya.
  void actualizarMetaDeHoy(final.metaKcal, final.metaProteina).catch(() => {});
  avisarCambioDeAjustes();
}

export function avisarCambioDeAjustes(): void {
  oyentes.forEach((f) => f());
}

function suscribir(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

export function useAjustes(): [Ajustes, (a: Ajustes) => void] {
  return [useSyncExternalStore(suscribir, leerAjustes), guardarAjustes];
}

export function configuracionCompleta(a: Ajustes): boolean {
  return a.perfil !== null && a.apiKey.trim() !== '';
}
