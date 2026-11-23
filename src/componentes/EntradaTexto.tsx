import { useState } from 'react';
import type { Alimento } from '../dominio/tipos';
import { MENSAJES, codigoDe, estimarTexto } from '../ia/analizar';

interface Props {
  apiKey: string;
  onAlimentos: (alimentos: Alimento[], nota: string) => void;
  onCancelar: () => void;
}

/** Describe la comida con palabras y Claude la estima; si falla, se cargan los números a mano. */
export default function EntradaTexto({ apiKey, onAlimentos, onCancelar }: Props) {
  const [texto, setTexto] = useState('');
  const [estimando, setEstimando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function estimar() {
    setEstimando(true);
    setError(null);
    try {
      const r = await estimarTexto(texto.trim(), apiKey);
      onAlimentos(r.alimentos, r.nota);
    } catch (e) {
      setError(MENSAJES[codigoDe(e)]);
    } finally {
      setEstimando(false);
    }
  }

  const aMano = () =>
    onAlimentos(
      [{ nombre: texto.trim(), gramos: 0, kcal: 0, proteina_g: 0, carbos_g: 0, grasa_g: 0 }],
      '',
    );

  return (
    <div className="tarjeta">
      <label>
        ¿Qué comiste?
        <textarea
          rows={2}
          placeholder="Ej.: 2 huevos revueltos con una tortilla"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </label>
      {error && <p className="aviso error">{error}</p>}
      <div className="acciones lado">
        <button className="primario" onClick={estimar} disabled={estimando || !texto.trim()}>
          {estimando ? 'Estimando…' : 'Estimar'}
        </button>
        <button onClick={onCancelar}>Cancelar</button>
      </div>
      <button className="enlace" onClick={aMano}>
        Escribir los números a mano
      </button>
    </div>
  );
}
