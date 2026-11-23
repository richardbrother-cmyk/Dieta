import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useAjustes } from '../datos/ajustes';
import { comidasPorFecha, metasPorFecha } from '../datos/repositorio';
import { cumplioMeta, promedio7, totalesDelDia } from '../dominio/calculos';
import { etiquetaFecha, fechaLocal } from '../dominio/fechas';
import { entero } from '../dominio/formato';

export default function Historial() {
  const [ajustes] = useAjustes();
  const datos = useLiveQuery(async () => ({
    comidas: await comidasPorFecha(),
    metas: await metasPorFecha(),
  }));
  if (!datos) return <main className="pantalla" />;

  const fechas = [...datos.comidas.keys()].sort().reverse();
  const hoy = fechaLocal();
  const promedio = promedio7(datos.comidas, hoy);

  return (
    <main className="pantalla">
      <h1>Historial</h1>

      <section className="tarjeta">
        <div className="suave">Promedio de 7 días</div>
        {promedio ? (
          <>
            <strong className="num">{entero(promedio.kcal)} kcal por día</strong>
            <div className="suave num">Proteína {entero(promedio.proteina_g)} g por día</div>
          </>
        ) : (
          <strong>Aún no hay datos</strong>
        )}
      </section>

      {fechas.length === 0 ? (
        <p className="suave">Todavía no has registrado comidas</p>
      ) : (
        <section className="tarjeta">
          <ul className="lista">
            {fechas.map((fecha) => {
              const comidas = datos.comidas.get(fecha)!;
              // Cada día conserva la meta que tenía; la actual solo cubre un registro faltante.
              const dia = datos.metas.get(fecha) ?? {
                fecha,
                metaKcal: ajustes.metaKcal,
                metaProteina: ajustes.metaProteina,
              };
              const t = totalesDelDia(comidas);
              const cumplio = cumplioMeta(comidas, dia);
              return (
                <li key={fecha}>
                  <Link className="item" to={`/historial/${fecha}`}>
                    <span className="crece">
                      <strong>{etiquetaFecha(fecha)}</strong>
                      <br />
                      <span className="suave num">
                        {t.proteina_g >= dia.metaProteina
                          ? `Proteína ${entero(t.proteina_g)} g ✓`
                          : `Proteína ${entero(t.proteina_g)} / ${entero(dia.metaProteina)} g`}
                      </span>
                    </span>
                    <span className="num">{entero(t.kcal)} kcal</span>
                    {/* Hoy todavía puede cambiar: solo se marca si ya se pasó. */}
                    {fecha === hoy && cumplio ? (
                      <span className="marca">En curso</span>
                    ) : (
                      <span className={cumplio ? 'marca si' : 'marca no'}>
                        {cumplio ? 'Cumplió' : 'Se pasó'}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
