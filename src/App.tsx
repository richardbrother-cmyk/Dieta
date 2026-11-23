import { NavLink, Route, Routes } from 'react-router-dom';
import Hoy from './pantallas/Hoy';
import Revision from './pantallas/Revision';
import Historial from './pantallas/Historial';
import DiaDetalle from './pantallas/DiaDetalle';
import Peso from './pantallas/Peso';
import Ajustes from './pantallas/Ajustes';

const PESTANAS = [
  { a: '/', nombre: 'Hoy' },
  { a: '/historial', nombre: 'Historial' },
  { a: '/peso', nombre: 'Peso' },
  { a: '/ajustes', nombre: 'Ajustes' },
];

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Hoy />} />
        <Route path="/revision" element={<Revision />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/historial/:fecha" element={<DiaDetalle />} />
        <Route path="/peso" element={<Peso />} />
        <Route path="/ajustes" element={<Ajustes />} />
      </Routes>
      <nav className="pestanas" aria-label="Secciones">
        {PESTANAS.map((p) => (
          <NavLink key={p.a} to={p.a} end={p.a === '/'}>
            {p.nombre}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
