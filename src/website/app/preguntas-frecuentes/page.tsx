import { useMemo, useState } from "react";
import { Clock, MessageCircle, Phone } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../components/UI/CabeceraFresca/CabeceraFresca";
import Buscador from "../../components/UI/Buscador/Buscador";
import Acordeon from "../../components/UI/Acordeon/Acordeon";
import Revelar from "../../components/UI/Revelar/Revelar";
import Button from "../../components/UI/Button/Button";
import Llamado from "../../components/UI/Llamado/Llamado";
import { CONTACTO } from "../../lib/contacto";
import { coincide } from "../../lib/texto";
import { useTituloPagina } from "../../hooks/useTituloPagina";
import { SECCIONES } from "./preguntas.data";
import styles from "./PreguntasFrecuentes.module.scss";

const CLASES = {
  raiz: styles.pregunta,
  raizAbierta: styles.abierta,
  cabecera: styles.cabecera,
  chevron: styles.chevron,
  chevronAbierto: styles.chevronAbierto,
  cuerpo: styles.respuesta,
};

const DESTACADOS = [
  { icono: Clock, texto: "Lun a vie · 7 a 15 h" },
  { icono: Phone, texto: CONTACTO.telefono.visible },
];

const renglones = (a: string | readonly string[]) => (Array.isArray(a) ? a : [a]);

export default function PreguntasFrecuentesPage() {
  useTituloPagina("Preguntas frecuentes");

  const [busqueda, setBusqueda] = useState("");
  // Una sola pregunta abierta a la vez, en toda la página.
  const [abierta, setAbierta] = useState<string | null>(null);
  const alternar = (id: string) => setAbierta((prev) => (prev === id ? null : id));

  // Se busca en la pregunta y en la respuesta; las secciones vacías no se muestran.
  const visibles = useMemo(
    () =>
      SECCIONES.map((s) => ({
        ...s,
        faqs: s.faqs.map((f, i) => ({ ...f, id: `${s.id}-${i}` })).filter((f) => coincide(busqueda, [f.q, ...renglones(f.a)])),
      })).filter((s) => s.faqs.length > 0),
    [busqueda]
  );

  return (
    <ContenedorPagina>
      <CabeceraFresca
        titulo={
          <>
            ¿Tenés <span>dudas?</span>
          </>
        }
        bajada="Buscá tu respuesta."
        lema={
          <>
            Respuestas <em>claras.</em>
          </>
        }
        destacados={DESTACADOS}
        compacto
      >
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar…" etiqueta="Buscar pregunta" className={styles.buscador} />
      </CabeceraFresca>

      {visibles.length === 0 && <p className={styles.vacio}>Nada para «{busqueda.trim()}».</p>}

      {visibles.map(({ id, icono: Icono, eyebrow, title, subtitle, faqs }) => (
        <section key={id} className={styles.seccion} aria-labelledby={`faq-${id}`}>
          <Revelar className={styles.encabezado}>
            <span className={styles.icono} aria-hidden="true">
              <Icono />
            </span>
            <div>
              <span className={styles.eyebrow}>{eyebrow}</span>
              <h2 id={`faq-${id}`}>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </Revelar>

          <ul className={styles.lista}>
            {faqs.map((faq, i) => (
              <Revelar key={faq.id} como="li" distancia={14} retraso={Math.min(i, 5) * 0.04}>
                <Acordeon
                  clases={CLASES}
                  abierto={abierta === faq.id}
                  onAlternar={() => alternar(faq.id)}
                  cabecera={<span className={styles.textoPregunta}>{faq.q}</span>}
                >
                  {renglones(faq.a).map((r, n) => (
                    <p key={n}>{r}</p>
                  ))}
                </Acordeon>
              </Revelar>
            ))}
          </ul>
        </section>
      ))}

      <Llamado
        titulo={
          <>
            ¿No la encontraste? <em>Escribinos.</em>
          </>
        }
      >
        <Button to="/contacto" size="large" iconoIzquierda={<MessageCircle />}>
          Contacto
        </Button>
        <Button href={CONTACTO.telefono.href} variant="outline" size="large" iconoIzquierda={<Phone />}>
          Llamar
        </Button>
      </Llamado>
    </ContenedorPagina>
  );
}
