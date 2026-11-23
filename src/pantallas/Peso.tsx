import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import GraficaPeso from '../componentes/GraficaPeso';
import { useAjustes } from '../datos/ajustes';
import { guardarPeso, pesos } from '../datos/repositorio';
import { limpiarNumero, mediaMovil7 } from '../dominio/calculos';
import { etiquetaFecha, fechaLocal } from '../dominio/fechas';
import { decimal1 } from '../dominio/formato';

const PESO_MINIMO = 20;
const PESO_MAXIMO = 400;

export default function Peso() {
  const [ajustes, guardarAjustes] = useAjustes();
  const registros = useLiveQuery(pesos);
  const [texto, setTexto] = useState('');
  const [invalido, setInvalido] = useState(false);
  /** Peso recién guardado que difiere del perfil, pendiente de que el usuario decida. */
  const [ofrecer, setOfrecer] = useState<number | null>(null);

  async function guardar() {
    const kg = Math.round(limpiarNumero(texto) * 10) / 10;
    if (kg < PESO_MINIMO || kg > PESO_MAXIMO) {
      setInvalido(true);
      return;
    }
    setInvalido(false);
    await guardarPeso(fechaLocal(), kg);
    setTexto('');
    setOfrecer(ajustes.perfil && ajustes.perfil.pesoKg !== kg ? kg : null);
  }

  function actualizarPerfil() {
    if (ajustes.perfil && ofrecer !== null) {
      guardarAjustes({ ...ajustes, perfil: { ...ajustes.perfil, pesoKg: ofrecer } });
    }
    setOfrecer(null);
  }

  if (!registros) return <main className="pantalla" />;

  const puntos = mediaMovil7(registros);
  const ultimo = registros[registros.length - 1];
  const cambio = registros.length > 1 ? ultimo.kg - registros[0].kg : null;

  return (
    <main className="pantalla">
      <h1>Peso</h1>

      <section className="tarjeta">
        <label>
          Peso de hoy (kg)
          <input
            inputMode="decimal"
            placeholder={ultimo ? decimal1(ultimo.kg) : ''}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setInvalido(false);
            }}
          />
        </label>
        {invalido && <p className="aviso error">Peso no válido</p>}
        <button className="primario" onClick={guardar}>
          Guardar peso
        </button>
      </section>

      {ofrecer !== null && (
        <section className="tarjeta">
          <p>Tu perfil dice {decimal1(ajustes.perfil?.pesoKg ?? 0)} kg. Actualizarlo recalcula tu meta.</p>
          <div className="acciones lado">
            <button className="primario" onClick={actualizarPerfil}>
              Actualizar mi perfil a {decimal1(ofrecer)} kg
            </button>
            <button onClick={() => setOfrecer(null)}>No, gracias</button>
          </div>
        </section>
      )}

      {registros.length === 0 ? (
        <p className="suave">Anota tu primer peso</p>
      ) : (
        <>
          <section className="tarjeta">
            <div className="fila entre">
              <div>
                <div className="grande num">{decimal1(ultimo.kg)} kg</div>
                <div className="suave">{etiquetaFecha(ultimo.fecha)}</div>
              </div>
              {cambio !== null && (
                <strong className="num">
                  {cambio < 0 ? '−' : cambio > 0 ? '+' : ''}
                  {decimal1(Math.abs(cambio))} kg desde el inicio
                </strong>
              )}
            </div>
            <GraficaPeso puntos={puntos} />
            {registros.length > 1 && (
              <p className="suave">La línea gruesa es la media de los últimos 7 registros.</p>
            )}
          </section>

          <section className="tarjeta">
            <ul className="lista">
              {[...registros].reverse().map((p) => (
                <li key={p.fecha}>
                  <div className="item entre">
                    <span>{etiquetaFecha(p.fecha)}</span>
                    <span className="num">{decimal1(p.kg)} kg</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
