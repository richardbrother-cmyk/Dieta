import Dexie, { type Table } from 'dexie';
import type { Comida, Dia, Peso } from '../dominio/tipos';

class BaseDieta extends Dexie {
  comidas!: Table<Comida, string>;
  dias!: Table<Dia, string>;
  pesos!: Table<Peso, string>;

  constructor() {
    super('dieta');
    this.version(1).stores({
      comidas: 'id, fecha',
      dias: 'fecha',
      pesos: 'fecha',
    });
  }
}

export const db = new BaseDieta();
