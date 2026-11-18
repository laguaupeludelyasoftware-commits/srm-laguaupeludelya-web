import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Button, Field, Modal, Notice } from '../../components/ui';
import { useDemo } from '../../data/demo-store';
import type { Appointment } from '../../domain/models';
import { appointmentDate, euros, statusLabels } from '../../domain/rules';

/** Detalle de cita: separa motivo público y tratamiento interno de demostración. */
export function AppointmentDialog({
  appointment,
  onClose,
  onCloseAutoFocus,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const { state, update } = useDemo();
  const [reject, setReject] = useState(false);
  const [error, setError] = useState('');
  const pet = state.pets.find((p) => p.id === appointment?.petId);
  const client = state.clients.find((c) => c.id === appointment?.clientId);
  /** Cambia el estado y valida al cliente solo al registrar explícitamente su asistencia. */
  function attend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!appointment) return;
    const form = new FormData(event.currentTarget);
    if (new Date(appointment.startsAt) > new Date()) {
      setError('Todavía no ha empezado la cita. No puedes registrar asistencia futura.');
      return;
    }
    update((draft) => {
      const a = draft.appointments.find((a) => a.id === appointment.id);
      const c = draft.clients.find((c) => c.id === appointment.clientId);
      if (!a || a.status !== 'confirmed' || !c) return;
      a.status = 'attended';
      a.treatment = String(form.get('treatment')).trim();
      if (form.get('validate')) {
        c.validated = true;
        c.reviewReason = '';
        c.validatedAt = new Date().toISOString();
      }
    });
    onClose();
  }
  /** Un rechazo exige explicación visible; no incrementa cancelaciones del cliente. */
  function rejectAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!appointment) return;
    const reason = String(new FormData(event.currentTarget).get('reason')).trim();
    if (!reason) {
      setError('Explica el motivo para que el cliente pueda consultarlo.');
      return;
    }
    update((draft) => {
      const a = draft.appointments.find((a) => a.id === appointment.id);
      if (a?.status === 'confirmed') {
        a.status = 'rejected';
        a.reason = reason;
      }
    });
    onClose();
  }
  /** Registra no presentación y exige revisión solo al cliente todavía no validado. */
  function markAbsent() {
    if (!appointment) return;
    update((draft) => {
      const a = draft.appointments.find((a) => a.id === appointment.id);
      const c = draft.clients.find((c) => c.id === appointment.clientId);
      if (!a || !c) return;
      a.status = 'absent';
      if (!c.validated) c.reviewReason = 'No presentación. Necesita revisión de Nazaret.';
    });
    onClose();
  }
  return (
    <Modal
      placement="right"
      onCloseAutoFocus={onCloseAutoFocus}
      title={pet ? `La visita de ${pet.name}` : 'Detalle de cita'}
      description={appointment ? appointmentDate(appointment.startsAt) : ''}
      open={!!appointment}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {appointment && (
        <>
          <div className="detail-heading">
            <span className={`badge badge-${appointment.status}`}>
              {statusLabels[appointment.status]}
            </span>
            <span>{euros(appointment.price)} orientativos</span>
          </div>
          <h3>{appointment.serviceName}</h3>
          <p className="muted">
            {client?.name} · {pet?.breed || pet?.species} · {pet?.weight} kg ·{' '}
            {appointment.duration} min
          </p>
          {error && <Notice error>{error}</Notice>}
          {appointment.reason && (
            <Notice>Motivo visible para el cliente: {appointment.reason}</Notice>
          )}
          {appointment.status === 'confirmed' ? (
            reject ? (
              <form className="form-stack" onSubmit={rejectAppointment}>
                <Field label="Explicación para el cliente" htmlFor="reject-reason">
                  <textarea
                    id="reject-reason"
                    name="reason"
                    required
                    maxLength={500}
                    placeholder="Por qué no podemos atender esta visita…"
                  />
                </Field>
                <div className="dialog-actions">
                  <Button type="button" variant="ghost" onClick={() => setReject(false)}>
                    Volver
                  </Button>
                  <Button variant="danger" type="submit">
                    Rechazar reserva
                  </Button>
                </div>
              </form>
            ) : (
              <form className="form-stack" onSubmit={attend}>
                <Field label="Tratamiento realizado (opcional)" htmlFor="treatment">
                  <textarea
                    id="treatment"
                    name="treatment"
                    maxLength={1000}
                    placeholder="Cuidados realizados y detalles para la próxima visita…"
                  />
                </Field>
                <small className="muted">
                  Notas internas del historial; no se muestran en el área cliente de esta demo.
                </small>
                {!client?.validated && (
                  <label className="checkbox-line">
                    <input type="checkbox" name="validate" defaultChecked />
                    <ShieldCheck size={17} /> Validar al cliente tras la visita
                  </label>
                )}
                <Button type="submit" disabled={new Date(appointment.startsAt) > new Date()}>
                  <Check size={17} /> Registrar asistencia
                </Button>
                {new Date(appointment.startsAt) > new Date() && (
                  <small className="muted">
                    La asistencia se habilita cuando comienza la cita.
                  </small>
                )}
                <div className="dialog-actions">
                  <Button type="button" variant="ghost" onClick={() => setReject(true)}>
                    Rechazar con motivo
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={
                      new Date(appointment.startsAt).getTime() + appointment.duration * 60000 >
                      Date.now()
                    }
                    onClick={markAbsent}
                  >
                    No se ha presentado
                  </Button>
                </div>
              </form>
            )
          ) : (
            appointment.treatment && (
              <div className="history-note">
                <strong>Tratamiento registrado</strong>
                <p>{appointment.treatment}</p>
              </div>
            )
          )}
        </>
      )}
    </Modal>
  );
}
