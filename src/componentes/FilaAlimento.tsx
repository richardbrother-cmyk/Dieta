import { useState } from 'react';
import { limpiarNumero } from '../dominio/calculos';
import type { Alimento } from '../dominio/tipos';

type CampoNumerico = Exclude<keyof Alimento, 'nombre'>;

const CAMPOS: Array<{ campo: CampoNumerico; etiqueta: string }> = [
  { campo: 'gramos', etiqueta: 'Gramos' },
  { campo: 'kcal', etiqueta: 'kcal' },
  { campo: 'proteina_g', etiqueta: 'Proteína' },
  { campo: 'carbos_g', etiqueta: 'Carbos' },
  { campo: 'grasa_g', etiqueta: 'Grasa' },
];

const mostrar = (n: number) => String(Math.round(limpiarNumero(n) * 10) / 10);

function CampoNumero(props: { etiqueta: string; valor: number; onCambio: (n: number) => void }) {
  // Mientras se escribe se respeta el texto tal cual ('12,' o vacío); al salir se normaliza.
  const [borrador, setBorrador] = useState<string | null>(null);
  return (
    <label>
      {props.etiqueta}
      <input
        inputMode="decimal"
        value={borrador ?? mostrar(props.valor)}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setBorrador(e.target.value);
          props.onCambio(limpiarNumero(e.target.value));
        }}
        onBlur={() => setBorrador(null)}
      />
    </label>
  );
}

interface Props {
  alimento: Alimento;
  onNombre: (nombre: string) => void;
  onGramos: (gramos: number) => void;
  onValor: (campo: Exclude<CampoNumerico, 'gramos'>, valor: number) => void;
  onQuitar: () => void;
}

export default function FilaAlimento({ alimento, onNombre, onGramos, onValor, onQuitar }: Props) {
  const nombre = alimento.nombre || 'Alimento';
  return (
    <div className="alimento" role="group" aria-label={nombre}>
      <div className="fila" style={{ marginBottom: 6 }}>
        <input
          className="crece"
          aria-label="Nombre"
          value={alimento.nombre}
          placeholder="Alimento"
          onChange={(e) => onNombre(e.target.value)}
        />
        <button className="quitar" aria-label={`Quitar ${nombre}`} onClick={onQuitar}>
          ✕
        </button>
      </div>
      <div className="campos">
        {CAMPOS.map(({ campo, etiqueta }) => (
          <CampoNumero
            key={campo}
            etiqueta={etiqueta}
            valor={alimento[campo]}
            onCambio={(n) => (campo === 'gramos' ? onGramos(n) : onValor(campo, n))}
          />
        ))}
      </div>
    </div>
  );
}
