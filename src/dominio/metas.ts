import type { Actividad, Perfil, Sexo } from './tipos';

export const FACTOR_ACTIVIDAD: Record<Actividad, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  alto: 1.725,
};

/** La meta calculada nunca baja de aquí; una meta manual por debajo solo advierte. */
export const PISO_KCAL: Record<Sexo, number> = { hombre: 1500, mujer: 1200 };

const DEFICIT = 0.8;
const PROTEINA_POR_KG = 1.8;

/** Mifflin-St Jeor, en kcal por día. */
export function metabolismoBasal(p: Perfil): number {
  const base = 10 * p.pesoKg + 6.25 * p.estaturaCm - 5 * p.edad;
  return p.sexo === 'hombre' ? base + 5 : base - 161;
}

const redondear = (valor: number, paso: number) => Math.round(valor / paso) * paso;

export function calcularMetas(p: Perfil): { metaKcal: number; metaProteina: number } {
  const gasto = metabolismoBasal(p) * FACTOR_ACTIVIDAD[p.actividad];
  return {
    metaKcal: Math.max(PISO_KCAL[p.sexo], redondear(gasto * DEFICIT, 50)),
    metaProteina: redondear(p.pesoKg * PROTEINA_POR_KG, 5),
  };
}

export function bajoElPiso(kcal: number, sexo: Sexo): boolean {
  return kcal < PISO_KCAL[sexo];
}
