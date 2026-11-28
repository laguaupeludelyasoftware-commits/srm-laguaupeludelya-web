import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  Bath,
  Cat,
  ChevronDown,
  ChevronUp,
  Clock3,
  Heart,
  Leaf,
  MapPin,
  PawPrint,
  Scissors,
  Sparkles,
  Sparkle,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { businessDays, usePublicBusiness } from '../../data/public-business';
import { euros } from '../../domain/rules';

import { whatsappNumber } from '../../lib/whatsapp';
import { LandingContactActions } from './LandingContactActions';

const carePhrases = [
  { Icon: PawPrint, text: 'Cuidado con calma' },
  { Icon: Scissors, text: 'Cada manto, su mimo' },
  { Icon: Cat, text: 'Perros y gatos' },
  { Icon: Heart, text: 'Los detalles importan' },
];

/** Presentación pública con el contacto y catálogo publicados por el negocio. */
export function LandingPage() {
  const business = usePublicBusiness();
  const contact = business.data?.contact;
  const whatsapp = whatsappNumber(contact?.phone);
  const mapAddress = contact?.address.trim();
  const mapQuery = mapAddress
    ? /cáceres/i.test(mapAddress)
      ? mapAddress
      : `${mapAddress}, Cáceres`
    : '';
  const services = business.data?.services ?? [];
  const [showAllServices, setShowAllServices] = useState(false);
  const icons = [Bath, Scissors, Sparkles];
  const visibleCount = 3;

  function renderService(service: (typeof services)[number], index: number) {
    const Icon = icons[index % icons.length];
    return (
      <article className="service-card" key={service.id}>
        <div className="service-card-top">
          <span className="service-icon">
            <Icon size={28} strokeWidth={1.4} />
          </span>
          <span className="service-index">{String(index + 1).padStart(2, '0')}</span>
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
  }

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
            <span className="tiny-line" /> UN LUGAR PENSADO PARA ELLOS Y PARA QUIENES LOS QUIEREN.
          </span>
          <h1>
            Cuidar de ellos, <em>como se merecen.</em>
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
            Mucho más que un baño y un corte. Un lugar donde cada perro recibe atención, cariño y
            cuidados adaptados a él. Porque su bienestar importa tanto como el resultado.
          </p>
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
        <div className="care-ribbon-line">
          {carePhrases.map(({ Icon, text }, index) => (
            <span className="care-ribbon-item" key={text}>
              {index > 0 && <Sparkle className="ribbon-star" size={16} aria-hidden="true" />}
              <span className="care-ribbon-phrase">
                <Icon size={17} aria-hidden="true" /> {text}
              </span>
            </span>
          ))}
        </div>
      </div>
      <section id="servicios" className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SU MOMENTO FAVORITO</span>
            <h2>
              Un ratito para sentirse bien.
              <br />
              <em>Cuidados hechos a medida.</em>
            </h2>
          </div>
          <p>
            Cada perro necesita algo diferente. Por eso ofrecemos distintos servicios para cuidar su
            pelaje y mantenerlo limpio, sano y precioso.
          </p>
        </div>
        <div className="service-grid">
          {business.isPending && <p role="status">Cargando servicios…</p>}
          {business.isError && <p role="status">No se pudieron cargar los servicios.</p>}
          {business.isSuccess && services.length === 0 && (
            <p role="status">Aún no hay servicios publicados.</p>
          )}
          {services.slice(0, visibleCount).map(renderService)}
        </div>
        {services.length > visibleCount && (
          <div className={`service-disclosure${showAllServices ? '' : ' is-collapsed'}`}>
            <div className="service-disclosure-action">
              <Button
                type="button"
                aria-expanded={showAllServices}
                aria-controls="servicios-adicionales"
                onClick={() => setShowAllServices((open) => !open)}
              >
                {showAllServices ? 'Mostrar menos' : 'Mostrar más servicios'}
                {showAllServices ? (
                  <ChevronUp size={17} aria-hidden="true" />
                ) : (
                  <ChevronDown size={17} aria-hidden="true" />
                )}
              </Button>
            </div>
            <div
              className="service-disclosure-content"
              id="servicios-adicionales"
              aria-hidden={!showAllServices}
              inert={!showAllServices}
            >
              <div className="service-grid service-grid-more">
                {services
                  .slice(visibleCount)
                  .map((service, index) => renderService(service, index + visibleCount))}
              </div>
            </div>
          </div>
        )}
        <p className="section-footnote">
          El cuidado se adapta a su especie, tamaño y manto. El importe final se valorará según sus
          necesidades.
        </p>
      </section>
      <section id="filosofia" className="philosophy">
        <div className="container philosophy-grid">
          <div className="philosophy-art">
            <span className="handwritten">con calma y con cariño</span>
            <img
              className="philosophy-image"
              src="/imagen-landing-page.webp"
              alt="Una peluquera recorta con tijeras el pelo de un perro blanco."
              width={1254}
              height={1254}
              loading="lazy"
            />
            <span className="round-stamp">
              PEQUEÑAS PATITAS
              <br />
              <Heart size={24} />
              <br />
              GRANDES VÍNCULOS
            </span>
          </div>
          <div>
            <h2>MUCHO MÁS QUE UNA PELUQUERÍA</h2>
            <p>
              En La Guaupelu de Lya creemos que cada perro es diferente y que cada uno merece
              recibir un trato especial.
            </p>
            <p>
              Nos gusta hacer las cosas con calma, conocer a cada perro y adaptarnos a sus
              necesidades, respetando su carácter y su forma de ser. Porque para nosotros no se
              trata solo de que salgan guapos, sino también de que se sientan cómodos y bien
              cuidados durante todo el proceso.
            </p>
            <p>
              Hemos creado un espacio donde el cuidado, la paciencia y el cariño forman parte de
              cada visita.
            </p>
            <p>
              La Guaupelu de Lya nace del amor por los animales y lleva consigo un pedacito de Lya,
              la perrita que inspiró este proyecto y que siempre tendrá un lugar especial en él.
            </p>
            <p>Porque estar guapos está genial, pero sentirse a gusto es lo más importante.</p>
            <div className="philosophy-sign">
              <span>Nazaret</span>
              <Heart size={19} strokeWidth={1.2} />
              <small>El cariño también está en los detalles.</small>
            </div>
          </div>
        </div>
      </section>
      <section id="contacto" className="contact-section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">NOS ENCANTARÁ CONOCEROS</span>
            <h2>
              Tu próxima visita empieza por aquí. <em>¡Cuéntanos qué necesitas!</em>
            </h2>
          </div>
          {business.isPending && <p role="status">Cargando datos de contacto…</p>}
          {business.isError && <p role="status">No se pudieron cargar los datos de contacto.</p>}
          {business.isSuccess && !contact && <p>Los datos de contacto aún no están publicados.</p>}
        </div>
        <div className="contact-details">
          <div className="published-hours">
            <h3>
              <Clock3 size={21} aria-hidden="true" /> Horario de atención
            </h3>
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
                        <dd className={intervals.length ? undefined : 'hours-closed'}>
                          {intervals.length
                            ? intervals.map(({ start, end }) => (
                                <span key={`${start}-${end}`}>
                                  {start}–{end}
                                </span>
                              ))
                            : 'Cerrado'}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ))}
            {whatsapp && <LandingContactActions number={whatsapp} />}
          </div>
          {mapQuery && (
            <section className="contact-map" aria-labelledby="contact-map-title">
              <div className="contact-map-heading">
                <h3 id="contact-map-title">
                  <MapPin size={21} aria-hidden="true" /> Cómo llegar
                </h3>
                <a
                  className="inline-link"
                  href={`https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination: mapQuery })}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir indicaciones <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </div>
              <iframe
                title="Mapa de La Guaupelu de Lya"
                src={`https://www.google.com/maps?${new URLSearchParams({ q: mapQuery, z: '18', output: 'embed' })}`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </section>
          )}
        </div>
      </section>
    </>
  );
}
