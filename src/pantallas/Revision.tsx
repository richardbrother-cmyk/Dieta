import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import EntradaTexto from '../componentes/EntradaTexto';
import FilaAlimento from '../componentes/FilaAlimento';
import Miniatura from '../componentes/Miniatura';
import { useAjustes } from '../datos/ajustes';
import { borrarComida, comidaPorId, guardarComida } from '../datos/repositorio';
import { escalarAlimento, totalesDe } from '../dominio/calculos';
import { etiquetaFecha, fechaLocal, horaLocal, tipoPorHora } from '../dominio/fechas';
import { entero } from '../dominio/formato';
import { TIPOS_COMIDA, type Alimento, type TipoComida } from '../dominio/tipos';
import { MENSAJES, analizarFoto, codigoDe, type CodigoError } from '../ia/analizar';
import { prepararFoto } from '../ia/imagen';

/** Lo que recibe la pantalla al navegar hacia ella. */
export interface EntradaRevision {
  fecha: string;
  /** Editar una comida ya guardada. */
  comidaId?: string;
  /** Analizar una foto recién tomada o elegida. */
  foto?: Blob;
  /** Empezar describiendo la comida con texto. */
  texto?: boolean;
}

interface Fila {
  clave: number;
  /** Referencia para escalar por gramos; así borrar el campo y reescribirlo no pierde los valores. */
  base: Alimento;
  actual: Alimento;
}

type Estado = 'cargando' | 'analizando' | 'listo' | 'error';

let siguienteClave = 1;
const aFilas = (alimentos: Alimento[]): Fila[] =>
  alimentos.map((a) => ({ clave: siguienteClave++, base: a, actual: a }));

export default function Revision() {
  const entrada = useLocation().state as EntradaRevision | null;
  const navegar = useNavigate();
  const [ajustes] = useAjustes();

  const [estado, setEstado] = useState<Estado>(entrada?.foto ? 'analizando' : entrada?.comidaId ? 'cargando' : 'listo');
  const [error, setError] = useState<CodigoError | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [nota, setNota] = useState('');
  const [tipo, setTipo] = useState<TipoComida>(tipoPorHora);
  const [hora, setHora] = useState(horaLocal);
  const [miniatura, setMiniatura] = useState<Blob | null>(null);
  const [conTexto, setConTexto] = useState(!!entrada?.texto);
  const [errorGuardar, setErrorGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);
  const fotoBase64 = useRef<string | null>(null);

  async function analizar() {
    if (!entrada?.foto) return;
    setEstado('analizando');
    setError(null);
    try {
      if (!fotoBase64.current) {
        const preparada = await prepararFoto(entrada.foto);
        fotoBase64.current = preparada.base64;
        setMiniatura(preparada.miniatura);
      }
      const r = await analizarFoto(fotoBase64.current, ajustes.apiKey);
      setFilas(aFilas(r.alimentos));
      setNota(r.nota);
      setEstado('listo');
    } catch (e) {
      setError(codigoDe(e));
      setEstado('error');
    }
  }

  useEffect(() => {
    let vigente = true;
    if (entrada?.foto) {
      void analizar();
    } else if (entrada?.comidaId) {
      void comidaPorId(entrada.comidaId).then((c) => {
        if (!vigente) return;
        if (!c) return navegar('/', { replace: true });
        setFilas(aFilas(c.alimentos));
        setNota(c.nota);
        setTipo(c.tipo);
        setHora(c.hora);
        setMiniatura(c.miniatura);
        setEstado('listo');
      });
    }
    return () => {
      vigente = false;
    };
    // Solo al entrar: la entrada no cambia mientras la pantalla está abierta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!entrada?.fecha) return <Navigate to="/" replace />;
  const { fecha, comidaId } = entrada;
  const destino = fecha === fechaLocal() ? '/' : `/historial/${fecha}`;

  const cambiarFila = (clave: number, cambio: (f: Fila) => Fila) =>
    setFilas((fs) => fs.map((f) => (f.clave === clave ? cambio(f) : f)));

  async function guardar() {
    // El estado tarda un render en desactivar el botón; la referencia frena el segundo toque.
    if (enCurso.current) return;
    enCurso.current = true;
    setGuardando(true);
    setErrorGuardar(false);
    try {
      await guardarComida({
        id: comidaId,
        fecha,
        hora,
        tipo,
        miniatura,
        nota,
        alimentos: filas.map((f) => ({ ...f.actual, nombre: f.actual.nombre.trim() || 'Alimento' })),
      });
      navegar(destino, { replace: true });
    } catch {
      setErrorGuardar(true);
      enCurso.current = false;
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!comidaId || !window.confirm('¿Borrar esta comida?')) return;
    await borrarComida(comidaId);
    navegar(destino, { replace: true });
  }

  const total = totalesDe(filas.map((f) => f.actual));

  return (
    <main className="pantalla">
      <h1>{comidaId ? 'Editar comida' : 'Nueva comida'}</h1>
      {fecha !== fechaLocal() && <p className="suave">{etiquetaFecha(fecha)}</p>}

      {miniatura && <Miniatura blob={miniatura} className="foto-grande" alt="Foto de la comida" />}

      {estado === 'analizando' && <p className="aviso ok">Analizando…</p>}

      {estado === 'error' && error && (
        <>
          <p className="aviso error">
            {MENSAJES[error]}
            {error === 'clave_invalida' && (
              <>
                {' '}
                <Link to="/ajustes">Ir a Ajustes</Link>
              </>
            )}
          </p>
          <div className="acciones lado">
            {error !== 'imagen_ilegible' && <button onClick={analizar}>Reintentar</button>}
            <button
              onClick={() => {
                setEstado('listo');
                setConTexto(true);
              }}
            >
              Cargar a mano
            </button>
          </div>
        </>
      )}

      {estado === 'listo' && (
        <>
          <label>
            Tipo de comida
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoComida)}>
              {Object.entries(TIPOS_COMIDA).map(([valor, nombre]) => (
                <option key={valor} value={valor}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>

          {filas.length > 0 && <p className="suave">Estimación, corrige si hace falta</p>}
          {nota && <p className="aviso atencion">{nota}</p>}

          {filas.map((f) => (
            <FilaAlimento
              key={f.clave}
              alimento={f.actual}
              onNombre={(nombre) =>
                cambiarFila(f.clave, (x) => ({
                  ...x,
                  base: { ...x.base, nombre },
                  actual: { ...x.actual, nombre },
                }))
              }
              onGramos={(gramos) =>
                cambiarFila(f.clave, (x) => ({ ...x, actual: escalarAlimento(x.base, gramos) }))
              }
              onValor={(campo, valor) =>
                cambiarFila(f.clave, (x) => {
                  const actual = { ...x.actual, [campo]: valor };
                  return { ...x, base: actual, actual };
                })
              }
              onQuitar={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}
            />
          ))}

          {conTexto ? (
            <EntradaTexto
              apiKey={ajustes.apiKey}
              onCancelar={() => setConTexto(false)}
              onAlimentos={(alimentos, notaNueva) => {
                setFilas((fs) => [...fs, ...aFilas(alimentos)]);
                if (notaNueva) setNota((n) => (n ? `${n} ${notaNueva}` : notaNueva));
                setConTexto(false);
              }}
            />
          ) : (
            <button className="enlace" onClick={() => setConTexto(true)}>
              Agregar alimento
            </button>
          )}

          <div className="tarjeta" style={{ marginTop: 12 }}>
            <strong className="num">Total {entero(total.kcal)} kcal</strong>
            <div className="suave num">
              Proteína {entero(total.proteina_g)} g · Carbos {entero(total.carbos_g)} g · Grasa{' '}
              {entero(total.grasa_g)} g
            </div>
          </div>

          {errorGuardar && (
            <p className="aviso error">
              No se pudo guardar. Puede que el teléfono no tenga espacio; inténtalo de nuevo.
            </p>
          )}
        </>
      )}

      <div className="acciones lado">
        <button
          className="primario"
          onClick={guardar}
          disabled={estado !== 'listo' || filas.length === 0 || guardando}
        >
          Guardar
        </button>
        <button onClick={() => navegar(destino, { replace: true })}>
          {comidaId ? 'Cancelar' : 'Descartar'}
        </button>
      </div>
      {comidaId && estado === 'listo' && (
        <div className="acciones">
          <button className="peligro" onClick={borrar}>
            Borrar comida
          </button>
        </div>
      )}
    </main>
  );
}
