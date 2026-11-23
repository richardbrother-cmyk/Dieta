interface Props {
  valor: number;
  meta: number;
  etiqueta: string;
}

export default function BarraProgreso({ valor, meta, etiqueta }: Props) {
  const fraccion = meta > 0 ? Math.min(1, valor / meta) : 0;
  const excedido = meta > 0 && valor > meta;
  return (
    <div
      className={excedido ? 'barra excedido' : 'barra'}
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={Math.round(meta)}
      aria-valuenow={Math.round(valor)}
    >
      <div style={{ width: `${fraccion * 100}%` }} />
    </div>
  );
}
