const ENTERO = new Intl.NumberFormat('es', { maximumFractionDigits: 0, useGrouping: 'always' });
const DECIMAL = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const finito = (n: number) => (Number.isFinite(n) ? n : 0);

/** '2.150'. El español no agrupa los números de cuatro cifras por defecto; aquí sí. */
export const entero = (n: number): string => ENTERO.format(finito(n));

/** '79,5' */
export const decimal1 = (n: number): string => DECIMAL.format(finito(n));
