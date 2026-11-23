export type Sexo = 'hombre' | 'mujer';
export type Actividad = 'sedentario' | 'ligero' | 'moderado' | 'alto';
export type TipoComida = 'desayuno' | 'almuerzo' | 'cena' | 'merienda';

export interface Perfil {
  sexo: Sexo;
  edad: number;
  estaturaCm: number;
  pesoKg: number;
  actividad: Actividad;
}

export interface Alimento {
  nombre: string;
  gramos: number;
  kcal: number;
  proteina_g: number;
  carbos_g: number;
  grasa_g: number;
}

export interface Comida {
  id: string;
  /** Fecha local, 'YYYY-MM-DD'. */
  fecha: string;
  /** Hora local, 'HH:mm'. */
  hora: string;
  tipo: TipoComida;
  miniatura: Blob | null;
  alimentos: Alimento[];
  nota: string;
}

/** Meta que estaba vigente en una fecha; no cambia cuando la meta actual cambia. */
export interface Dia {
  fecha: string;
  metaKcal: number;
  metaProteina: number;
}

export interface Peso {
  fecha: string;
  kg: number;
}

export interface Ajustes {
  perfil: Perfil | null;
  metaKcal: number;
  metaProteina: number;
  metaManual: boolean;
  apiKey: string;
}

export interface Totales {
  kcal: number;
  proteina_g: number;
  carbos_g: number;
  grasa_g: number;
}

export const TIPOS_COMIDA: Record<TipoComida, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
};
