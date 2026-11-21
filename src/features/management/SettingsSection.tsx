import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** Conserva el formulario montado al plegar el contenido. */
export function SettingsSection({
  title,
  id,
  initiallyOpen,
  children,
}: {
  title: string;
  id?: string;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="panel settings-disclosure" id={id} open={initiallyOpen}>
      <summary>
        <h2>
          {title}
          <ChevronDown size={20} aria-hidden="true" />
        </h2>
      </summary>
      <div className="settings-disclosure-body">{children}</div>
    </details>
  );
}
