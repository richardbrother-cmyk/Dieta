import { useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { configuracionCompleta, leerAjustes, useAjustes } from '../datos/ajustes';
import { borrarTodo } from '../datos/repositorio';
import { compartirRespaldo, importar } from '../datos/respaldo';
import { limpiarEntero, limpiarNumero } from '../dominio/calculos';
import { entero } from '../dominio/formato';
import { bajoElPiso, PISO_KCAL } from '../dominio/metas';
import type { Actividad, Ajustes as TipoAjustes, Perfil, Sexo } from '../dominio/tipos';
import { MENSAJES, codigoDe, probarClave } from '../ia/analizar';

interface Formulario {
  sexo: Sexo | '';
  edad: string;
  estatura: string;
  peso: string;
  actividad: Actividad | '';
  metaManual: boolean;
  metaKcal: string;
  metaProteina: string;
  apiKey: string;
}

const texto = (n: number | undefined) => (n ? String(n) : '');

function desdeAjustes(a: TipoAjustes): Formulario {
  return {
    sexo: a.perfil?.sexo ?? '',
    edad: texto(a.perfil?.edad),
    estatura: texto(a.perfil?.estaturaCm),
    peso: texto(a.perfil?.pesoKg),
    actividad: a.perfil?.actividad ?? '',
    metaManual: a.metaManual,
    metaKcal: texto(a.metaKcal),
    metaProteina: texto(a.metaProteina),
    apiKey: a.apiKey,
  };
}

function perfilDe(f: Formulario): Perfil | null {
  const edad = limpiarEntero(f.edad);
  const estaturaCm = limpiarNumero(f.estatura);
  const pesoKg = limpiarNumero(f.peso);
  if (!f.sexo || !f.actividad || !edad || !estaturaCm || !pesoKg) return null;
  return { sexo: f.sexo, edad, estaturaCm, pesoKg, actividad: f.actividad };
}

type Aviso = { tipo: 'ok' | 'error'; texto: string } | null;

export default function Ajustes() {
  const [ajustes, guardar] = useAjustes();
  const [f, setF] = useState(() => desdeAjustes(ajustes));
  const [avisoClave, setAvisoClave] = useState<Aviso>(null);
  const [avisoDatos, setAvisoDatos] = useState<Aviso>(null);
  const [probando, setProbando] = useState(false);
  const navegar = useNavigate();
  /** Se llegó aquí desde una foto que no se pudo analizar por la clave. */
  const hayFotoEsperando = !!(useLocation().state as { volverAFoto?: boolean } | null)?.volverAFoto;

  function cambiar(cambio: Partial<Formulario>) {
    const nuevo = { ...f, ...cambio };
    setF(nuevo);
    guardar({
      // Un perfil a medio editar no borra el que ya estaba guardado.
      perfil: perfilDe(nuevo) ?? ajustes.perfil,
      metaManual: nuevo.metaManual,
      metaKcal: nuevo.metaManual ? limpiarEntero(nuevo.metaKcal) : ajustes.metaKcal,
      metaProteina: nuevo.metaManual ? limpiarEntero(nuevo.metaProteina) : ajustes.metaProteina,
      apiKey: nuevo.apiKey.trim(),
    });
  }

  function alternarManual(manual: boolean) {
    // Al pasar a manual se parte de la meta calculada, no de campos vacíos.
    cambiar({
      metaManual: manual,
      metaKcal: texto(ajustes.metaKcal),
      metaProteina: texto(ajustes.metaProteina),
    });
  }

  async function probar() {
    setProbando(true);
    setAvisoClave(null);
    try {
      await probarClave(f.apiKey);
      setAvisoClave({ tipo: 'ok', texto: 'Clave válida' });
    } catch (e) {
      setAvisoClave({ tipo: 'error', texto: MENSAJES[codigoDe(e)] });
    } finally {
      setProbando(false);
    }
  }

  async function exportar() {
    setAvisoDatos(null);
    try {
      await compartirRespaldo();
      setAvisoDatos({ tipo: 'ok', texto: 'Respaldo listo' });
    } catch (e) {
      // Cancelar la hoja de compartir no es un error.
      if ((e as Error)?.name !== 'AbortError') {
        setAvisoDatos({ tipo: 'error', texto: 'No se pudo crear el respaldo' });
      }
    }
  }

  async function alImportar(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setAvisoDatos(null);
    if (!window.confirm('Importar reemplaza todos los datos actuales. ¿Continuar?')) return;
    try {
      await importar(JSON.parse(await archivo.text()));
      // El formulario debe reflejar lo importado; si no, el siguiente cambio lo pisaría.
      setF(desdeAjustes(leerAjustes()));
      setAvisoDatos({ tipo: 'ok', texto: 'Datos importados' });
    } catch {
      setAvisoDatos({ tipo: 'error', texto: 'Archivo no válido' });
    }
  }

  async function borrar() {
    if (!window.confirm('Se borrarán todas tus comidas, pesos y ajustes. No se puede deshacer.')) return;
    await borrarTodo();
    setF(desdeAjustes({ perfil: null, metaKcal: 0, metaProteina: 0, metaManual: false, apiKey: '' }));
    setAvisoClave(null);
    setAvisoDatos({ tipo: 'ok', texto: 'Datos borrados' });
  }

  const sexo = ajustes.perfil?.sexo;
  const metaBaja = f.metaManual && sexo && bajoElPiso(limpiarEntero(f.metaKcal), sexo);

  return (
    <main className="pantalla">
      <h1>Ajustes</h1>
      {!configuracionCompleta(ajustes) && (
        <p className="aviso atencion">
          {!ajustes.perfil && !ajustes.apiKey
            ? 'Completa tu perfil y tu clave para empezar'
            : !ajustes.perfil
              ? 'Falta completar tu perfil para empezar'
              : 'Falta tu clave de API para empezar'}
        </p>
      )}

      <section className="tarjeta">
        <h2 style={{ marginTop: 0 }}>Perfil</h2>
        <div className="dos">
          <label>
            Sexo
            <select value={f.sexo} onChange={(e) => cambiar({ sexo: e.target.value as Sexo })}>
              <option value="" disabled>Elige…</option>
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
            </select>
          </label>
          <label>
            Edad
            <input inputMode="numeric" value={f.edad} onChange={(e) => cambiar({ edad: e.target.value })} />
          </label>
          <label>
            Estatura (cm)
            <input inputMode="decimal" value={f.estatura} onChange={(e) => cambiar({ estatura: e.target.value })} />
          </label>
          <label>
            Peso (kg)
            <input inputMode="decimal" value={f.peso} onChange={(e) => cambiar({ peso: e.target.value })} />
          </label>
        </div>
        <label>
          Actividad
          <select value={f.actividad} onChange={(e) => cambiar({ actividad: e.target.value as Actividad })}>
            <option value="" disabled>Elige…</option>
            <option value="sedentario">Sedentario: poco o nada de ejercicio</option>
            <option value="ligero">Ligero: 1 a 3 días por semana</option>
            <option value="moderado">Moderado: 3 a 5 días por semana</option>
            <option value="alto">Alto: 6 a 7 días por semana</option>
          </select>
        </label>
      </section>

      <section className="tarjeta">
        <h2 style={{ marginTop: 0 }}>Meta diaria</h2>
        {ajustes.metaKcal > 0 && !f.metaManual && (
          <div className="fila entre" style={{ marginBottom: 12 }}>
            <div>
              <div className="suave">Calorías</div>
              <strong className="num">{entero(ajustes.metaKcal)} kcal</strong>
            </div>
            <div>
              <div className="suave">Proteína</div>
              <strong className="num">{entero(ajustes.metaProteina)} g</strong>
            </div>
          </div>
        )}
        {ajustes.metaKcal === 0 && !f.metaManual && (
          <p className="suave">Completa tu perfil para calcularla.</p>
        )}
        <label className="fila" style={{ color: 'inherit', fontSize: '1rem' }}>
          <input type="checkbox" checked={f.metaManual} onChange={(e) => alternarManual(e.target.checked)} />
          Fijar meta a mano
        </label>
        {f.metaManual && (
          <div className="dos">
            <label>
              Calorías por día
              <input inputMode="numeric" value={f.metaKcal} onChange={(e) => cambiar({ metaKcal: e.target.value })} />
            </label>
            <label>
              Proteína por día (g)
              <input inputMode="numeric" value={f.metaProteina} onChange={(e) => cambiar({ metaProteina: e.target.value })} />
            </label>
          </div>
        )}
        {metaBaja && (
          <p className="aviso atencion">
            Por debajo del mínimo recomendado ({entero(PISO_KCAL[sexo])} kcal). Consúltalo con un
            profesional de salud.
          </p>
        )}
        <p className="suave">
          Valores orientativos; no reemplazan el consejo de un profesional de salud.
        </p>
      </section>

      <section className="tarjeta">
        <h2 style={{ marginTop: 0 }}>Clave de Claude</h2>
        <label>
          Clave de API
          <input
            type="password"
            autoComplete="off"
            placeholder="sk-ant-…"
            value={f.apiKey}
            onChange={(e) => {
              setAvisoClave(null);
              cambiar({ apiKey: e.target.value });
            }}
          />
        </label>
        {avisoClave && <p className={`aviso ${avisoClave.tipo}`}>{avisoClave.texto}</p>}
        {hayFotoEsperando && (
          <div className="acciones" style={{ marginBottom: 10 }}>
            <button className="primario" onClick={() => navegar(-1)}>
              Volver a la foto
            </button>
          </div>
        )}
        <button onClick={probar} disabled={probando || !f.apiKey.trim()}>
          {probando ? 'Probando…' : 'Probar clave'}
        </button>
        <p className="suave" style={{ marginTop: 12 }}>
          Créala en{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>{' '}
          y ponle un límite de gasto mensual. Se guarda solo en este teléfono y solo se envía a
          Anthropic.
        </p>
      </section>

      <section className="tarjeta">
        <h2 style={{ marginTop: 0 }}>Respaldo</h2>
        <p className="suave">
          Tus datos viven solo en este teléfono. Exporta una copia de vez en cuando y guárdala
          fuera de él.
        </p>
        {avisoDatos && <p className={`aviso ${avisoDatos.tipo}`}>{avisoDatos.texto}</p>}
        <div className="acciones">
          <button onClick={exportar}>Exportar respaldo</button>
          <label className="boton" style={{ color: 'inherit', fontSize: '1rem', margin: 0 }}>
            Importar respaldo
            <input type="file" accept="application/json,.json" className="oculto-visual" onChange={alImportar} />
          </label>
          <button className="peligro" onClick={borrar}>Borrar todos los datos</button>
        </div>
      </section>
    </main>
  );
}
