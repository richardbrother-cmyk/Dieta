import { useLiveQuery } from 'dexie-react-hooks';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import BarraProgreso from '../componentes/BarraProgreso';
import ListaComidas from '../componentes/ListaComidas';
import { useAjustes } from '../datos/ajustes';
import { comidasDe, diaDe } from '../datos/repositorio';
import { totalesDelDia } from '../dominio/calculos';
import { etiquetaFecha } from '../dominio/fechas';
import { entero } from '../dominio/formato';

export default function DiaDetalle() {
  const { fecha = '' } = useParams();
  const navegar = useNavigate();
  const [ajustes] = useAjustes();
  const datos = useLiveQuery(
    async () => ({ comidas: await comidasDe(fecha), dia: await diaDe(fecha) }),
    [fecha],
  );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return <Navigate to="/historial" replace />;
  if (!datos) return <main className="pantalla" />;

  const t = totalesDelDia(datos.comidas);
  const metaKcal = datos.dia?.metaKcal ?? ajustes.metaKcal;
  const metaProteina = datos.dia?.metaProteina ?? ajustes.metaProteina;

  return (
    <main className="pantalla">
      <p>
        <Link to="/historial">← Historial</Link>
      </p>
      <h1>{etiquetaFecha(fecha)}</h1>

      <section className="tarjeta">
        <strong className="num">
          {entero(t.kcal)} / {entero(metaKcal)} kcal
        </strong>
        <BarraProgreso valor={t.kcal} meta={metaKcal} etiqueta="Calorías del día" />
        <div className="suave num">
          Proteína {entero(t.proteina_g)} / {entero(metaProteina)} g · Carbos {entero(t.carbos_g)} g ·
          Grasa {entero(t.grasa_g)} g
        </div>
      </section>

      <section className="tarjeta">
        <ListaComidas fecha={fecha} />
      </section>

      <div className="acciones">
        <button onClick={() => navegar('/revision', { state: { fecha, texto: true } })}>
          Agregar comida
        </button>
      </div>
    </main>
  );
}
