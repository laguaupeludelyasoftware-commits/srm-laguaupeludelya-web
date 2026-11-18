import { useState } from 'react';
import type { FormEvent } from 'react';
import { RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { PageHeading } from '../../components/layout';
import { Button, Field, Modal, Notice } from '../../components/ui';
import { useDemo } from '../../data/demo-store';
import type { Species } from '../../domain/models';
import { BusinessContactForm } from './BusinessContactForm';
import { OwnerPasswordForm } from './OwnerPasswordForm';

/** Horarios simples de ejemplo y política inicial visibles para la dueña. */
export function SettingsPage() {
  const { state, update, reset } = useDemo();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  /** Valida intervalos antes de guardar para no ofrecer huecos con cierre anterior a apertura. */
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const hours = state.settings.hours.map((h) => ({
      ...h,
      enabled: data.get(`enabled-${h.day}`) === 'on',
      start: String(data.get(`start-${h.day}`)),
      end: String(data.get(`end-${h.day}`)),
    }));
    const cancellationHours = Number(data.get('cancellationHours'));
    const species = data.getAll('species') as Species[];
    if (
      hours.some((h) => h.enabled && (!h.start || !h.end || h.start >= h.end)) ||
      !species.length ||
      !Number.isFinite(cancellationHours) ||
      cancellationHours < 0 ||
      cancellationHours > 168
    ) {
      setError(
        'Revisa las horas de apertura/cierre, el plazo (0–168 h) y selecciona al menos una especie.',
      );
      setMessage('');
      return;
    }
    update((draft) => {
      draft.settings = { hours, cancellationHours, species };
    });
    setError('');
    setMessage(
      'Configuración guardada en este navegador. En la demo se aplica a las próximas acciones, incluidas citas existentes.',
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="A TU MANERA"
        title="Tu ritmo. Tus pequeños detalles."
        description="Horarios y condiciones claros para ti y para sus personas."
      />
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <BusinessContactForm />
      <OwnerPasswordForm />
      <form onSubmit={save} className="settings-grid">
        <section className="panel settings-panel">
          <span className="eyebrow">UN RATITO PARA CADA UNO</span>
          <h2>Horario de atención</h2>
          <p className="muted">
            Horario provisional, sin descansos ni excepciones por fecha en este prototipo.
          </p>
          <div className="hours-head">
            <span>Día</span>
            <span>Apertura</span>
            <span>Cierre</span>
          </div>
          {state.settings.hours.map((h) => (
            <div className="hours-row" key={h.day}>
              <label className="checkbox-line">
                <input type="checkbox" name={`enabled-${h.day}`} defaultChecked={h.enabled} />
                {h.label}
              </label>
              <input
                aria-label={`Apertura ${h.label}`}
                type="time"
                name={`start-${h.day}`}
                defaultValue={h.start}
                required
              />
              <input
                aria-label={`Cierre ${h.label}`}
                type="time"
                name={`end-${h.day}`}
                defaultValue={h.end}
                required
              />
            </div>
          ))}
          <fieldset className="species-settings">
            <legend>¿A quién damos la bienvenida?</legend>
            {(['Perro', 'Gato'] as const).map((sp) => (
              <label className="checkbox-line" key={sp}>
                <input
                  type="checkbox"
                  name="species"
                  value={sp}
                  defaultChecked={state.settings.species.includes(sp)}
                />
                {sp === 'Perro' ? 'Perros' : 'Gatos'}
              </label>
            ))}
          </fieldset>
        </section>
        <section className="panel settings-panel">
          <span className="icon-orbit">
            <ShieldCheck size={25} />
          </span>
          <h2>Primeras visitas, con confianza.</h2>
          <p className="muted">Una política visible para evitar malentendidos.</p>
          <Field
            label="Antelación mínima para cancelar (horas)"
            htmlFor="cancel-hours"
            hint="Valor inicial acordado: 8 horas. Puedes ajustarlo."
          >
            <input
              id="cancel-hours"
              name="cancellationHours"
              type="number"
              min="0"
              max="168"
              required
              defaultValue={state.settings.cancellationHours}
            />
          </Field>
          <ol className="policy-list">
            <li>
              <strong>Una cita futura activa</strong>
              <span>Hasta que valides al cliente en persona.</span>
            </li>
            <li>
              <strong>Una segunda oportunidad</strong>
              <span>Tras la primera cancelación en plazo puede volver a reservar.</span>
            </li>
            <li>
              <strong>Después, revisión personal</strong>
              <span>Segunda cancelación, cancelación tardía o no presentación.</span>
            </li>
            <li>
              <strong>Si cancelas tú, no cuenta</strong>
              <span>El rechazo del negocio no consume intentos.</span>
            </li>
          </ol>
          <small className="muted">
            En la aplicación final concretaremos cómo afectan los cambios de plazo a las citas ya
            reservadas.
          </small>
        </section>
        <div className="settings-save">
          <span className="muted">Solo se guardan datos de demostración en este navegador.</span>
          <Button type="submit">
            <Save size={17} /> Guardar cambios
          </Button>
        </div>
      </form>
      <div className="reset-section">
        <div>
          <strong>Volver al primer día</strong>
          <p className="muted">Restablece únicamente los datos de esta demostración.</p>
        </div>
        <Button variant="outline" onClick={() => setResetOpen(true)}>
          <RotateCcw size={16} /> Restablecer demo
        </Button>
      </div>
      <Modal
        title="¿Empezamos de nuevo?"
        description="Se perderán los cambios locales del prototipo, sin afectar a la API ni a otros datos del navegador."
        open={resetOpen}
        onOpenChange={setResetOpen}
      >
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setResetOpen(false)}>
            Conservar cambios
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              reset();
              window.location.reload();
            }}
          >
            Restablecer demostración
          </Button>
        </div>
      </Modal>
    </>
  );
}
