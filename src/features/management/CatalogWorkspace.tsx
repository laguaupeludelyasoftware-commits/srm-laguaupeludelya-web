import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui';

/** Vista del catálogo para trabajar con un formulario o listado a la vez. */
export function CatalogWorkspace({
  title,
  description,
  onBack,
  busy = false,
  children,
}: {
  title: string;
  description: string;
  onBack: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [title]);

  return (
    <div className="catalog-workspace">
      <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
        <ArrowLeft size={17} aria-hidden="true" /> Volver a servicios
      </Button>
      <section className="panel settings-panel" aria-labelledby="catalog-workspace-title">
        <h1 ref={heading} id="catalog-workspace-title" tabIndex={-1}>
          {title}
        </h1>
        <p className="muted">{description}</p>
        {children}
      </section>
    </div>
  );
}
