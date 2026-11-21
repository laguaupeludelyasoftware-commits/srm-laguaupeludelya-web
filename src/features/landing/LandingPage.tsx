import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bath,
  Cat,
  Heart,
  Leaf,
  PawPrint,
  Scissors,
  Sparkles,
  Sparkle,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { businessDays, usePublicBusiness } from '../../data/public-business';
import { euros } from '../../domain/rules';

import { whatsappNumber } from '../../lib/whatsapp';

/** Presentación pública con el contacto y catálogo publicados por el negocio. */
export function LandingPage() {
  const business = usePublicBusiness();
  const contact = business.data?.contact;
  const whatsapp = whatsappNumber(contact?.phone);
  const services = business.data?.services ?? [];
  const icons = [Bath, Scissors, Sparkles];
  return (
    <>
      <section className="hero container">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className="eyebrow">
            <span className="tiny-line" /> PARA PERROS, GATOS Y SUS PERSONAS
          </span>
          <h1>
            Un poquito de mimo.
            <br />
            Un montón de <em>guau.</em>
            <svg className="hero-underline" viewBox="0 0 250 16" aria-hidden="true">
              <path
                d="M3 10Q100 0 244 8M20 15Q150 7 220 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </h1>
          <p>
            Su bienestar, nuestro detalle favorito. Un espacio para cuidar su pelaje, respetar su
            ritmo y sacar a pasear su mejor versión.
          </p>
          <div className="hero-actions">
            <Button asChild>
              <Link to="/reservar">
                Le toca un mimo <ArrowUpRight size={18} />
              </Link>
            </Button>
            <a className="text-link" href="#servicios">
              Descubre nuestros cuidados <ArrowDown size={15} />
            </a>
          </div>
          <div className="hero-note">
            <Heart size={17} />
            <span>Para los que son mucho más que una mascota.</span>
          </div>
        </motion.div>
        <motion.div
          className="hero-art"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
        >
          <span className="art-sparkle art-sparkle-one" aria-hidden="true">
            <Sparkle size={50} strokeWidth={1} />
          </span>
          <div className="logo-arch">
            <img
              src="/logo.jpeg"
              alt="Logotipo de La Guaupelu de Lya: ilustración de un perro entre motivos de peluquería y hojas"
            />
          </div>
          <span className="art-caption">aquí, cada patita cuenta.</span>
          <div className="floating-note">
            <span className="icon-orbit">
              <PawPrint size={22} />
            </span>
            <div>
              En buenas manos.<small>Y con mucho cariño.</small>
            </div>
          </div>
          <Leaf className="art-leaf" size={55} strokeWidth={1} />
        </motion.div>
      </section>
      <div className="care-ribbon">
        <span>
          <PawPrint size={17} /> Cuidado con calma
        </span>
        <span className="ribbon-star" aria-hidden="true">
          <Sparkle size={16} />
        </span>
        <span>
          <Scissors size={17} /> Cada manto, su mimo
        </span>
        <span className="ribbon-star" aria-hidden="true">
          <Sparkle size={16} />
        </span>
        <span>
          <Cat size={17} /> Perros y gatos
        </span>
        <span className="ribbon-star" aria-hidden="true">
          <Sparkle size={16} />
        </span>
        <span>
          <Heart size={17} /> Los detalles importan
        </span>
      </div>
      <section id="servicios" className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SU MOMENTO FAVORITO</span>
            <h2>
              Cuidados que se notan.
              <br />
              <em>Mimos que se sienten.</em>
            </h2>
          </div>
          <p>
            Cada pelaje tiene su historia. <br />
            Encontramos el cuidado que le va.
          </p>
        </div>
        <div className="service-grid">
          {business.isPending && <p role="status">Cargando servicios…</p>}
          {business.isError && <p role="status">No se pudieron cargar los servicios.</p>}
          {business.isSuccess && services.length === 0 && (
            <p role="status">Aún no hay servicios publicados.</p>
          )}
          {services.map((service, index) => {
            const Icon = icons[index % icons.length];
            return (
              <article className="service-card" key={service.id}>
                <div className="service-card-top">
                  <span className="service-icon">
                    <Icon size={28} strokeWidth={1.4} />
                  </span>
                  <span className="service-index">0{index + 1}</span>
                </div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div className="service-card-bottom">
                  <span>
                    {service.duration} min · <strong>desde {euros(service.price)}</strong>
                  </span>
                  <Link
                    to={`/reservar?${new URLSearchParams({ servicio: service.id })}`}
                    aria-label={`Reservar ${service.name}`}
                    className="round-link"
                  >
                    <ArrowUpRight size={20} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        <p className="section-footnote">
          El cuidado se adapta a su especie, tamaño y manto. El importe final se valorará según sus
          necesidades.
        </p>
      </section>
      <section id="filosofia" className="philosophy">
        <div className="container philosophy-grid">
          <div className="philosophy-art">
            <span className="handwritten">con calma y con cariño</span>
            <DogDrawing />
            <span className="round-stamp">
              PEQUEÑAS PATITAS
              <br />
              <Heart size={24} />
              <br />
              GRANDES VÍNCULOS
            </span>
          </div>
          <div>
            <span className="eyebrow">EL ESPACIO DE LYA</span>
            <h2>
              Porque detrás de cada
              <br />
              pelaje hay <em>alguien único.</em>
            </h2>
            <p>
              No todos disfrutan igual de un baño, ni todos necesitan el mismo corte. Queremos
              conocerle: cómo es, qué le gusta y qué le ayuda a sentirse a gusto.
            </p>
            <p>
              Un espacio pensado para los pequeños detalles y para que su próxima visita empiece con
              confianza.
            </p>
            <p>Lya fue la perra de Nazaret e inspiró el nombre y el diseño de la peluquería.</p>
            <div className="philosophy-sign">
              <span>Nazaret</span>
              <Heart size={19} strokeWidth={1.2} />
              <small>El cariño también está en los detalles.</small>
            </div>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="center-heading">
          <span className="eyebrow">FÁCIL PARA TI, BONITO PARA ÉL</span>
          <h2>
            Su próxima visita,
            <br />
            <em>a unas patitas de aquí.</em>
          </h2>
        </div>
        <div className="steps-grid">
          {[
            {
              title: 'Nos conocemos',
              text: 'Crea tu cuenta de cliente con tu correo y contraseña.',
            },
            {
              title: 'Eliges su momento',
              text: 'Consulta los servicios publicados. La reserva online estará disponible tras habilitar la verificación de correo.',
            },
            {
              title: 'Nos vemos en la pelu',
              text: 'En la primera visita, Nazaret validará tu cuenta para tus próximas reservas.',
            },
          ].map((step, i) => (
            <div className="landing-step" key={step.title}>
              <span>0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
        <div className="center-action">
          <Button asChild>
            <Link to="/registro">
              Empezamos por conocernos <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
      </section>
      <section id="contacto" className="contact-section container">
        <div>
          <span className="eyebrow">NOS ENCANTARÁ CONOCEROS</span>
          <h2>
            ¿Una duda antes
            <br />
            del primer <em>guau?</em>
          </h2>
          {business.isPending && <p role="status">Cargando datos de contacto…</p>}
          {business.isError && <p role="status">No se pudieron cargar los datos de contacto.</p>}
          {business.isSuccess && !contact && <p>Los datos de contacto aún no están publicados.</p>}
          {contact && (
            <p>
              <a className="inline-link" href={`tel:${contact.phone}`}>
                {contact.phone}
              </a>
              <br />
              {contact.address}
            </p>
          )}
          {whatsapp && (
            <Button asChild variant="outline">
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                Preguntar por WhatsApp
              </a>
            </Button>
          )}
          <div className="published-hours">
            <h3>Horario de atención</h3>
            {business.isPending && <p role="status">Cargando el horario…</p>}
            {business.isError && <p>No se pudo consultar el horario.</p>}
            {business.isSuccess &&
              (!business.data.hours?.length ? (
                <p>Horario pendiente de publicar.</p>
              ) : (
                <dl>
                  {businessDays.map((label, index) => {
                    const intervals =
                      business.data.hours?.filter((interval) => interval.day === index + 1) ?? [];
                    return (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>
                          {intervals.length
                            ? intervals.map(({ start, end }) => `${start}–${end}`).join(' y ')
                            : 'Cerrado'}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ))}
          </div>
        </div>
        <div className="contact-card">
          <PawPrint size={32} strokeWidth={1.3} />
          <h3>Reserva un ratito para él.</h3>
          <p>Crea tu cuenta para añadir tus mascotas y reservar online.</p>
          <Button asChild>
            <Link to="/reservar">
              Consultar reservas <ArrowUpRight size={18} />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

/** Ilustración vectorial propia: aporta identidad sin fingir una fotografía del negocio. */
function DogDrawing() {
  return (
    <svg className="dog-drawing" viewBox="0 0 380 360" fill="none" aria-hidden="true">
      <ellipse cx="193" cy="309" rx="122" ry="15" fill="#d6d9c8" />
      <path
        d="M126 150c-51-13-65-62-33-83 25-16 62 13 69 33M240 103c20-44 65-49 78-23 16 32-9 62-47 72"
        fill="#b2bba3"
        stroke="#53634f"
        strokeWidth="2.5"
      />
      <path
        d="M116 156c0-58 35-83 77-83 50 0 83 36 81 88l-10 77c-6 40-31 58-67 58-38 0-68-18-72-57z"
        fill="#f5ede1"
        stroke="#53634f"
        strokeWidth="2.5"
      />
      <path
        d="M139 251l-14 49c-4 17 14 23 26 11l21-29m61-30 17 47c6 18-10 24-24 13l-23-29"
        fill="#f5ede1"
        stroke="#53634f"
        strokeWidth="2.5"
      />
      <ellipse cx="157" cy="155" rx="7" ry="10" fill="#53634f" />
      <ellipse cx="232" cy="155" rx="7" ry="10" fill="#53634f" />
      <circle cx="159" cy="152" r="2" fill="white" />
      <circle cx="234" cy="152" r="2" fill="white" />
      <path d="M180 181q15-9 29 0-3 15-15 15-10-1-14-15" fill="#53634f" />
      <path
        d="M194 194v13m-23-1q22 26 46 0"
        stroke="#53634f"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M188 218q15 4 17-2v15q-15 19-17-13" fill="#c59886" />
      <path d="M135 245q58 25 122 0" stroke="#a58a70" strokeWidth="8" />
      <circle cx="194" cy="262" r="9" fill="#b79d7e" />
      <path
        d="M55 181l13 5-8 12m245 34 13 2-4 13M174 49l4-13m12 16 9-10"
        stroke="#a58a70"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M65 257q-36-20-23-40 17-13 26 8 12-21 27-5 9 19-30 37"
        stroke="#a58a70"
        strokeWidth="2"
      />
    </svg>
  );
}
