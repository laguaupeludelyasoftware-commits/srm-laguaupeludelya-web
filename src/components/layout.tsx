import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  House,
  Menu,
  PawPrint,
  Scissors,
  Settings2,
  Users,
  X,
} from 'lucide-react';
import { useDemo } from '../data/demo-store';
import { OwnerLogout } from '../features/management/OwnerAccess';
import { Button } from './ui';

/** Identidad textual acompañada del logotipo original facilitado para el proyecto. */
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className={`brand ${light ? 'brand-light' : ''}`}
      aria-label="La Guaupelu de Lya, inicio"
    >
      <img src="/logo.jpeg" alt="" />
      <span>
        La Guaupelu <i>de Lya</i>
        <small>PELUQUERÍA CANINA Y FELINA</small>
      </span>
    </Link>
  );
}

/** Al cambiar de página restablece la posición; los enlaces con hash conservan su destino. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

/** Marco público con menú móvil y aviso de demostración en todos los recorridos. */
export function PublicLayout() {
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => setMenu(false), [location]);
  return (
    <>
      <header className="public-header">
        <div className="container header-inner">
          <Brand />
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-controls="public-nav"
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <nav
            id="public-nav"
            className={menu ? 'public-nav open' : 'public-nav'}
            aria-label="Principal"
          >
            <a href="/#servicios">Nuestros cuidados</a>
            <a href="/#filosofia">El espacio de Lya</a>
            <a href="/#contacto">Contacto</a>
            <NavLink to="/mi-espacio">Mi espacio</NavLink>
            <Button asChild size="small">
              <Link to="/reservar">
                Reservar cita <ArrowUpRight size={16} />
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <Brand />
          <p>Pequeños cuidados. Grandes vínculos.</p>
        </div>
        <div className="container footer-note">Las reservas online se abrirán más adelante.</div>
      </footer>
    </>
  );
}

/** Identifica los datos y operaciones de demostración. */
export function DemoBanner() {
  const { storageError } = useDemo();
  return (
    <div className="demo-banner">
      <span>
        <span className="status-dot" />{' '}
        {storageError
          ? 'No se pueden guardar cambios: demo en memoria'
          : 'Prototipo · Datos de ejemplo, sin reservas reales'}
      </span>
    </div>
  );
}

const managementLinks = [
  { to: '/gestion', label: 'Mi agenda', icon: CalendarDays, end: true },
  { to: '/gestion/clientes', label: 'Clientes y mascotas', icon: Users, end: false },
  { to: '/gestion/servicios', label: 'Servicios y tarifas', icon: Scissors, end: false },
  { to: '/gestion/configuracion', label: 'Horarios y reservas', icon: Settings2, end: false },
];

/** Panel adaptable: navegación lateral en escritorio y horizontal en dispositivos pequeños. */
export function ManagementLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <DemoBanner />
      <div className="management-layout">
        <aside className="sidebar">
          <div className="management-header">
            <Brand />
            <OwnerLogout />
          </div>
          <div className="workspace-label">TU PEQUEÑO GRAN ESPACIO</div>
          <nav aria-label="Gestión">
            {managementLinks.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                <item.icon size={19} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="owner-profile">
              <span className="avatar">N</span>
              <div>
                <strong>Nazaret</strong>
                <small>Dueña · Modo demostración</small>
              </div>
              <PawPrint size={18} />
            </div>
            <Link to="/">
              <House size={16} /> Volver a la web
            </Link>
          </div>
        </aside>
        <main id="main-content" className="management-main">
          <Suspense
            fallback={
              <p className="management-section-loading" role="status">
                Cargando sección…
              </p>
            }
          >
            <div className="management-section" key={pathname}>
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
    </>
  );
}

/** Encabezado consistente del panel con espacio para una acción principal contextual. */
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
