import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BarraProgreso from '../componentes/BarraProgreso';
import ListaComidas from '../componentes/ListaComidas';
import { useAjustes } from '../datos/ajustes';
import { comidasDe } from '../datos/repositorio';
import { diasSinRespaldo } from '../datos/respaldo';
import { totalesDelDia } from '../dominio/calculos';
import { etiquetaFecha, fechaLocal } from '../dominio/fechas';
import { entero } from '../dominio/formato';

const DIAS_PARA_AVISAR = 7;

/** La fecha de hoy, que se refresca al volver a la app si cambió el día. */
function useHoy(): string {
  const [hoy, setHoy] = useState(fechaLocal);
  useEffect(() => {
    const revisar = () => setHoy(fechaLocal());
    document.addEventListener('visibilitychange', revisar);
    return () => document.removeEventListener('visibilitychange', revisar);
  }, []);
  return hoy;
}

export default function Hoy() {
  const hoy = useHoy();
  const [ajustes] = useAjustes();
  const navegar = useNavigate();
  const comidas = useLiveQuery(() => comidasDe(hoy), [hoy]);
  const sinRespaldo = useLiveQuery(() => diasSinRespaldo(hoy), [hoy]);

  function alElegirFoto(e: ChangeEvent<HTMLInputElement>) {
    const foto = e.target.files?.[0];
    e.target.value = '';
    if (foto) navegar('/revision', { state: { fecha: hoy, foto } });
  }

  if (!comidas) return <main className="pantalla" />;

  const t = totalesDelDia(comidas);
  const diferencia = ajustes.metaKcal - t.kcal;

  return (
    <main className="pantalla">
      <h1>Hoy, {etiquetaFecha(hoy)}</h1>

      {sinRespaldo != null && sinRespaldo > DIAS_PARA_AVISAR && (
        <p className="aviso atencion">
          Llevas {sinRespaldo} días sin respaldo. <Link to="/ajustes">Exportar una copia</Link>
        </p>
      )}

      <section className="tarjeta">
        <div className="grande num">
          {entero(t.kcal)} / {entero(ajustes.metaKcal)} kcal
        </div>
        <BarraProgreso valor={t.kcal} meta={ajustes.metaKcal} etiqueta="Calorías de hoy" />
        <div className="fila entre">
          <strong className="num" style={diferencia < 0 ? { color: 'var(--rojo)' } : undefined}>
            {diferencia >= 0 ? `quedan ${entero(diferencia)}` : `sobran ${entero(-diferencia)}`}
          </strong>
          <span className="suave num">
            Carbos {entero(t.carbos_g)} g · Grasa {entero(t.grasa_g)} g
          </span>
        </div>
        <div className="fila entre" style={{ marginTop: 12 }}>
          <span>Proteína</span>
          <strong className="num">
            {entero(t.proteina_g)} / {entero(ajustes.metaProteina)} g
          </strong>
        </div>
      </section>

      <section className="tarjeta">
        <ListaComidas fecha={hoy} />
      </section>

      <div className="acciones">
        <label className="boton primario" style={{ fontSize: '1rem', margin: 0 }}>
          Foto del plato
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="oculto-visual"
            onChange={alElegirFoto}
          />
        </label>
        <label className="boton" style={{ color: 'inherit', fontSize: '1rem', margin: 0 }}>
          Elegir de la galería
          <input type="file" accept="image/*" className="oculto-visual" onChange={alElegirFoto} />
        </label>
        <button onClick={() => navegar('/revision', { state: { fecha: hoy, texto: true } })}>
          Agregar a mano
        </button>
      </div>
      <p className="suave" style={{ marginTop: 12 }}>
        Las calorías por foto son estimaciones.
      </p>
    </main>
  );
}
