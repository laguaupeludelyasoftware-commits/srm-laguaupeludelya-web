import { useState } from 'react';
import { Button } from '../../components/ui';
import { localDate } from '../../domain/rules';

import { whatsappNumber } from '../../lib/whatsapp';

export function WhatsAppContact({ phone }: { phone: string }) {
  const number = whatsappNumber(phone);
  return number ? (
    <Button asChild variant="outline">
      <a href={`https://wa.me/${number}`} target="_blank" rel="noreferrer">
        Abrir WhatsApp
      </a>
    </Button>
  ) : (
    <p className="muted">Guarda un teléfono válido para abrir WhatsApp.</p>
  );
}

export function WhatsAppReminder({
  phone,
  petName,
  serviceName,
  startsAt,
}: {
  phone?: string;
  petName: string;
  serviceName: string;
  startsAt: string;
}) {
  const [open, setOpen] = useState(false);
  const number = whatsappNumber(phone);
  if (!number) {
    return (
      <p className="muted">
        Añade un teléfono válido en la ficha del cliente para preparar el recordatorio.
      </p>
    );
  }
  const date = localDate(startsAt.slice(0, 10)).toLocaleDateString('es-ES', { dateStyle: 'full' });
  const message = `Hola, soy Nazaret, de La Guaupelu de Lya. Te recuerdo la cita de ${petName} para ${serviceName} el ${date} a las ${startsAt.slice(11, 16)} (hora de Madrid). Si necesitas cambiarla, escríbeme por aquí. ¡Hasta pronto!`;
  return (
    <div className="form-stack">
      <Button type="button" variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Ocultar recordatorio' : 'Preparar recordatorio'}
      </Button>
      {open && (
        <>
          <p>{message}</p>
          <Button asChild>
            <a
              href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
            >
              Revisar y enviar en WhatsApp
            </a>
          </Button>
        </>
      )}
    </div>
  );
}
