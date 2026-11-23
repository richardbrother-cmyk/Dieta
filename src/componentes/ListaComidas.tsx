import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { comidasDe } from '../datos/repositorio';
import { totalesDe } from '../dominio/calculos';
import { entero } from '../dominio/formato';
import { TIPOS_COMIDA } from '../dominio/tipos';
import Miniatura from './Miniatura';

/** Comidas de un día; tocar una la abre para editarla. */
export default function ListaComidas({ fecha }: { fecha: string }) {
  const comidas = useLiveQuery(() => comidasDe(fecha), [fecha]);
  if (!comidas) return null;
  if (comidas.length === 0) return <p className="suave">Aún no hay comidas</p>;
  return (
    <ul className="lista">
      {comidas.map((c) => (
        <li key={c.id}>
          <Link className="item" to="/revision" state={{ fecha, comidaId: c.id }}>
            {c.miniatura ? <Miniatura blob={c.miniatura} /> : <span className="mini" />}
            <span className="crece">
              <strong>{TIPOS_COMIDA[c.tipo]}</strong>
              <br />
              <span className="suave">
                {c.hora} · {c.alimentos.map((a) => a.nombre).join(', ')}
              </span>
            </span>
            <span className="num">{entero(totalesDe(c.alimentos).kcal)} kcal</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
