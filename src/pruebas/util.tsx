import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { guardarAjustes } from '../datos/ajustes';
import { borrarTodo } from '../datos/repositorio';
import type { Alimento, Comida } from '../dominio/tipos';

export const arroz: Alimento = {
  nombre: 'Arroz blanco', gramos: 180, kcal: 234, proteina_g: 4, carbos_g: 52, grasa_g: 0,
};
export const pollo: Alimento = {
  nombre: 'Pechuga de pollo', gramos: 150, kcal: 248, proteina_g: 46, carbos_g: 0, grasa_g: 5,
};

export const comida = (fecha: string, alimentos: Alimento[], extra: Partial<Comida> = {}) => ({
  fecha, hora: '12:00', tipo: 'almuerzo' as const, miniatura: null, nota: '', alimentos, ...extra,
});

/** Deja la app vacía y configurada con una meta fija. */
export async function prepararApp(metaKcal = 1900, metaProteina = 140) {
  await borrarTodo();
  guardarAjustes({
    perfil: { sexo: 'hombre', edad: 30, estaturaCm: 175, pesoKg: 80, actividad: 'moderado' },
    metaManual: true, metaKcal, metaProteina, apiKey: 'sk-ant-prueba',
  });
}

export function abrir(ruta: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: ruta, state }]}>
      <App />
    </MemoryRouter>,
  );
}
