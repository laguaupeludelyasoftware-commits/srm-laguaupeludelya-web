import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Mail, PawPrint, ShieldCheck } from 'lucide-react';
import { Button, Field, Notice } from '../../components/ui';
import { useDemo } from '../../data/demo-store';

/** Simula registro/verificación sin enviar correos ni persistir contraseñas. No es un login real. */
export function AccessPage() {
  const { state, update } = useDemo();
  const navigate = useNavigate();
  const [created, setCreated] = useState('');
  const [error, setError] = useState('');
  /** Crea una cuenta ficticia con rol cliente implícito; nunca acepta roles desde el formulario. */
  function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email')).trim().toLowerCase();
    const name = String(data.get('name')).trim();
    if (!name) {
      setError('Escribe un nombre para la cuenta de ejemplo.');
      return;
    }
    if (state.clients.some((c) => c.email.toLowerCase() === email)) {
      setError(
        'Ese correo ya existe en esta demo. Entra con el cliente de ejemplo o usa otro ficticio.',
      );
      return;
    }
    const id = crypto.randomUUID();
    update((draft) => {
      draft.clients.push({
        id,
        name,
        email,
        verified: false,
        validated: false,
        cancellations: 0,
        reviewReason: '',
      });
      draft.activeClientId = id;
    });
    form.reset();
    setCreated(id);
    setError('');
  }
  /** Reproduce el resultado de un enlace de correo, sin fingir que se ha enviado uno. */
  function simulateVerification() {
    update((draft) => {
      const client = draft.clients.find((c) => c.id === created);
      if (client) client.verified = true;
    });
    navigate('/mi-espacio');
  }
  return (
    <section className="container access-page">
      <div className="access-intro">
        <span className="eyebrow">BIENVENIDOS A VUESTRO ESPACIO</span>
        <h1>
          Los buenos cuidados
          <br />
          empiezan por
          <br />
          <em>conocernos.</em>
        </h1>
        <p>
          Un lugar para sus mascotas, sus próximas visitas y esos detalles que marcan la diferencia.
        </p>
        <ul className="check-list">
          <li>
            <Check size={17} /> Sus datos y mascotas, a mano
          </li>
          <li>
            <Check size={17} /> Citas confirmadas al reservar
          </li>
          <li>
            <Check size={17} /> Primera visita con validación de Lya
          </li>
        </ul>
        <PawPrint className="access-paw" size={90} strokeWidth={0.8} />
      </div>
      <div className="panel access-panel">
        {created ? (
          <>
            <span className="icon-orbit">
              <Mail size={26} />
            </span>
            <h2>Un pasito más.</h2>
            <p>En la aplicación final recibirás un enlace para verificar tu correo.</p>
            <Notice>Esto es una simulación. No hemos enviado ningún mensaje.</Notice>
            <Button onClick={simulateVerification}>
              Simular correo verificado <ArrowRight size={17} />
            </Button>
          </>
        ) : (
          <>
            <span className="eyebrow">REGISTRO DE DEMOSTRACIÓN</span>
            <h2>Crea vuestro espacio</h2>
            <p className="muted">Utiliza datos ficticios para explorar el recorrido.</p>
            {error && <Notice error>{error}</Notice>}
            <form className="form-stack" onSubmit={register}>
              <Field label="Tu nombre" htmlFor="register-name">
                <input
                  id="register-name"
                  name="name"
                  required
                  maxLength={100}
                  autoComplete="off"
                  placeholder="Por ejemplo, Lucía"
                />
              </Field>
              <Field label="Correo de ejemplo" htmlFor="register-email">
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  maxLength={150}
                  placeholder="lucia@example.com"
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Contraseña de ejemplo"
                htmlFor="register-password"
                hint="Solo para probar el formulario: no se envía ni se guarda."
              >
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Al menos 8 caracteres"
                />
              </Field>
              <Button type="submit">
                Crear cuenta de ejemplo <ArrowRight size={17} />
              </Button>
            </form>
            <div className="access-divider">¿Prefieres echar un vistazo?</div>
            <Button
              variant="outline"
              onClick={() => {
                update((d) => {
                  d.activeClientId = 'client-1';
                });
                navigate('/mi-espacio');
              }}
            >
              Entrar con Clara, cliente de ejemplo
            </Button>
            <Link className="text-link access-owner-link" to="/gestion">
              Explorar como dueña <ArrowRight size={15} />
            </Link>
          </>
        )}
        <small className="security-note">
          <ShieldCheck size={15} /> Prototipo local sin autenticación real
        </small>
      </div>
    </section>
  );
}
