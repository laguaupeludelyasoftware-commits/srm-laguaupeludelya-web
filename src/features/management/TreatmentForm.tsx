import { useState, type FormEvent } from 'react';
import { Button, Field, Notice } from '../../components/ui';

export type Treatment = { performed: string; changes: string; followUp: string };

export function TreatmentSummary({ treatment }: { treatment: Treatment }) {
  return (
    <dl>
      <dt>Trabajo realizado</dt>
      <dd>{treatment.performed}</dd>
      {treatment.changes && (
        <>
          <dt>Cambios respecto a la reserva</dt>
          <dd>{treatment.changes}</dd>
        </>
      )}
      {treatment.followUp && (
        <>
          <dt>Para la próxima visita</dt>
          <dd>{treatment.followUp}</dd>
        </>
      )}
    </dl>
  );
}

export function TreatmentForm({
  initial,
  closingVisit,
  saving,
  onCancel,
  onSave,
}: {
  initial?: Treatment | null;
  closingVisit: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: (treatment: Treatment, validate: boolean) => void;
}) {
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const performed = String(data.get('performed') ?? '').trim();
    const changes = String(data.get('changes') ?? '').trim();
    const followUp = String(data.get('followUp') ?? '').trim();
    if (!performed && (!closingVisit || changes || followUp)) {
      setError('Indica el trabajo realizado para guardar estas notas.');
      return;
    }
    setError('');
    onSave({ performed, changes, followUp }, data.has('validate'));
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset className="form-stack" disabled={saving}>
        <legend>{closingVisit ? 'Cerrar visita' : 'Tratamiento de la visita'}</legend>
        <Field
          label="Trabajo realizado"
          htmlFor="treatment-performed"
          hint={
            closingVisit
              ? 'Puedes registrar la asistencia y añadir el tratamiento más tarde.'
              : undefined
          }
        >
          <textarea
            id="treatment-performed"
            name="performed"
            maxLength={1000}
            required={!closingVisit}
            defaultValue={initial?.performed}
            onChange={() => setError('')}
          />
        </Field>
        <Field label="Cambios respecto a la reserva (opcional)" htmlFor="treatment-changes">
          <textarea
            id="treatment-changes"
            name="changes"
            maxLength={1000}
            defaultValue={initial?.changes}
            onChange={() => setError('')}
          />
        </Field>
        <Field label="Para la próxima visita (opcional)" htmlFor="treatment-follow-up">
          <textarea
            id="treatment-follow-up"
            name="followUp"
            maxLength={1000}
            defaultValue={initial?.followUp}
            onChange={() => setError('')}
          />
        </Field>
        <p className="muted">Estas notas son internas.</p>
        {error && <Notice error>{error}</Notice>}
        {closingVisit && (
          <label className="checkbox-line">
            <input type="checkbox" name="validate" /> Validar al cliente presencialmente
          </label>
        )}
        <div className="dialog-actions">
          <Button type="submit">
            {closingVisit ? 'Confirmar asistencia' : 'Guardar tratamiento'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Volver al detalle
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
