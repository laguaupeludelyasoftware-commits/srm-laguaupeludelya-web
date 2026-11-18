import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { DemoProvider } from './data/demo-store';
import { ManagementLayout, PublicLayout, ScrollToTop } from './components/layout';
import { EmptyState } from './components/ui';
import { OwnerAccess, RequireOwner } from './features/management/OwnerAccess';

// Cada área se carga cuando se visita para no descargar el panel al abrir la landing.
const LandingPage = lazy(() =>
  import('./features/landing/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const ClientAccess = lazy(() =>
  import('./features/customer/ClientAccount').then((m) => ({ default: m.ClientAccess })),
);
const ClientAccount = lazy(() =>
  import('./features/customer/ClientAccount').then((m) => ({ default: m.ClientAccount })),
);
const CustomerPage = lazy(() =>
  import('./features/customer/CustomerPage').then((m) => ({ default: m.CustomerPage })),
);
const BookingPage = lazy(() =>
  import('./features/booking/BookingPage').then((m) => ({ default: m.BookingPage })),
);
const AgendaPage = lazy(() =>
  import('./features/management/AgendaPage').then((m) => ({ default: m.AgendaPage })),
);
const ClientsPage = lazy(() =>
  import('./features/management/ClientsPage').then((m) => ({ default: m.ClientsPage })),
);
const RegisteredClientsPage = lazy(() =>
  import('./features/management/RegisteredClientsPage').then((m) => ({
    default: m.RegisteredClientsPage,
  })),
);
const CatalogPage = lazy(() =>
  import('./features/management/CatalogPage').then((m) => ({ default: m.CatalogPage })),
);
const SettingsPage = lazy(() =>
  import('./features/management/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

// Preparado para consultas de la API futura; el prototipo utiliza un adaptador local síncrono.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

/** Composición de proveedores y áreas. La separación de rutas no es autorización de producción. */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DemoProvider>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <ScrollToTop />
            <a href="#main-content" className="skip-link">
              Saltar al contenido
            </a>
            <Suspense
              fallback={
                <div className="container section" role="status">
                  Preparando vuestro espacio…
                </div>
              }
            >
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route index element={<LandingPage />} />
                  <Route path="registro" element={<ClientAccess key="register" register />} />
                  <Route path="iniciar-sesion" element={<ClientAccess key="login" />} />
                  <Route path="mi-espacio" element={<ClientAccount />} />
                  <Route path="demo/mi-espacio" element={<CustomerPage />} />
                  <Route path="reservar" element={<BookingPage />} />
                  <Route
                    path="*"
                    element={
                      <div className="container section">
                        <EmptyState
                          title="Esta patita se ha despistado"
                          action={
                            <Link className="inline-link" to="/">
                              Volver al inicio
                            </Link>
                          }
                        >
                          La página que buscas no existe.
                        </EmptyState>
                      </div>
                    }
                  />
                </Route>
                <Route path="acceso-gestion" element={<OwnerAccess />} />
                <Route
                  path="gestion"
                  element={
                    <RequireOwner>
                      <ManagementLayout />
                    </RequireOwner>
                  }
                >
                  <Route index element={<AgendaPage />} />
                  <Route path="clientes" element={<RegisteredClientsPage />} />
                  <Route path="demo/clientes" element={<ClientsPage />} />
                  <Route path="servicios" element={<CatalogPage />} />
                  <Route path="configuracion" element={<SettingsPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </MotionConfig>
      </DemoProvider>
    </QueryClientProvider>
  );
}
