import { Link } from "react-router-dom";
import { FileUp, ArrowRight } from "lucide-react";

import { IMPORTADORES } from "./importaciones.config";
import s from "./ImportacionesHub.module.scss";

/**
 * Importaciones masivas de prestaciones.
 *
 * Es la contracara de Validaciones: no valida una prestación por vez contra la
 * obra social, sino que reparte un reporte que la obra social ya mandó
 * autorizado. Sólo el Colegio importa, nunca el socio.
 *
 * La grilla sale de `importaciones.config.ts`: sumar un importador es agregar
 * una entrada, no tocar esta pantalla. Por eso no hay buscador todavía —con un
 * puñado de opciones estorba más de lo que ayuda.
 */
export default function ImportacionesHub() {
  return (
    <div className={s.container}>
      <header className={s.header}>
        <FileUp size={34} className={s.headerIcon} aria-hidden="true" />
        <div>
          <h1 className={s.title}>Importaciones</h1>
          <p className={s.subtitle}>
            Obras sociales que mandan un reporte mensual en vez de validar
            prestación por prestación.
          </p>
        </div>
      </header>

      <ul className={s.grid}>
        {IMPORTADORES.map((imp) => (
          <li key={imp.slug}>
            {imp.disponible ? (
              <Link to={`/panel/importaciones/${imp.slug}`} className={s.card}>
                <Tarjeta imp={imp} />
                <ArrowRight size={18} className={s.flecha} aria-hidden="true" />
              </Link>
            ) : (
              <div className={`${s.card} ${s.cardInactiva}`} aria-disabled="true">
                <Tarjeta imp={imp} />
                <span className={s.proximamente}>Próximamente</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tarjeta({ imp }: { imp: (typeof IMPORTADORES)[number] }) {
  return (
    <>
      <img src={imp.logo} alt="" className={s.logo} aria-hidden="true" />
      <div className={s.texto}>
        <h2 className={s.nombre}>
          {imp.nombre}
          {imp.codigo !== undefined && (
            <span className={s.codigo}>{imp.codigo}</span>
          )}
        </h2>
        <p className={s.desc}>{imp.descripcion}</p>
      </div>
    </>
  );
}
