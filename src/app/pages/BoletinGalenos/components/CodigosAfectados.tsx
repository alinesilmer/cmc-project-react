import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CodigoAfectado } from "../boletinGalenos.types";
import styles from "./CodigosAfectados.module.scss";

// ─── Mock data — replace with API: GET /api/boletin-galenos/:id/codigos ───────
const MOCK: CodigoAfectado[] = [
  { id:  1, codigo: "0501001", descripcion: "Consulta ambulatoria",             campo: "Galeno Práctica",         honorarios: 1350,  gastos: 420,  ayudante: 0     },
  { id:  2, codigo: "0502010", descripcion: "Cirugía abdominal nivel 1",        campo: "Galeno Quirúrgico",       honorarios: 9200,  gastos: 3100, ayudante: 4600  },
  { id:  3, codigo: "0502020", descripcion: "Radiografía de tórax",             campo: "Galeno Radiológico",      honorarios: 2350,  gastos: 800,  ayudante: 0     },
  { id:  4, codigo: "0502030", descripcion: "Análisis de laboratorio básico",   campo: "Gastos Bioquímicos",      honorarios: 1100,  gastos: 550,  ayudante: 0     },
  { id:  5, codigo: "0503001", descripcion: "Parto normal eutócico",            campo: "Galeno Ginecología",      honorarios: 13500, gastos: 3900, ayudante: 6750  },
  { id:  6, codigo: "0503510", descripcion: "Cesárea segmentaria",              campo: "Gastos Quirúrgicos",      honorarios: 18000, gastos: 3900, ayudante: 9000  },
  { id:  7, codigo: "0504001", descripcion: "Cistoscopia diagnóstica",          campo: "Galeno Urología",         honorarios: 8000,  gastos: 2200, ayudante: 0     },
  { id:  8, codigo: "0504010", descripcion: "Prostatectomía radical",           campo: "Galeno Cirugía Adultos",  honorarios: 24500, gastos: 5800, ayudante: 12250 },
  { id:  9, codigo: "0505001", descripcion: "Apendicectomía laparoscópica",     campo: "Gastos Radiológico",      honorarios: 12000, gastos: 2000, ayudante: 6000  },
  { id: 10, codigo: "0505010", descripcion: "Colecistectomía laparoscópica",    campo: "Galeno Quirúrgico",       honorarios: 17800, gastos: 4200, ayudante: 8900  },
  { id: 11, codigo: "0506001", descripcion: "Hernioplastia inguinal",           campo: "Gastos Quirúrgicos",      honorarios: 11000, gastos: 4700, ayudante: 5500  },
  { id: 12, codigo: "0507001", descripcion: "Cateterismo cardíaco diagnóstico", campo: "Otros Gastos",            honorarios: 14500, gastos: 7200, ayudante: 0     },
  { id: 13, codigo: "0508001", descripcion: "Artroscopia de rodilla",           campo: "Galeno Quirúrgico",       honorarios: 20500, gastos: 5100, ayudante: 10250 },
  { id: 14, codigo: "0509001", descripcion: "Cirugía pediátrica menor",         campo: "Galeno Cirugía Infantil", honorarios: 10000, gastos: 2800, ayudante: 5000  },
  { id: 15, codigo: "0510001", descripcion: "Electroencefalograma",             campo: "Galeno Práctica",         honorarios: 1680,  gastos: 500,  ayudante: 0     },
  { id: 16, codigo: "0511001", descripcion: "Ecografía abdominal",              campo: "Galeno Radiológico",      honorarios: 3100,  gastos: 900,  ayudante: 0     },
  { id: 17, codigo: "0512001", descripcion: "Dosaje hormonal completo",         campo: "Gastos Bioquímicos",      honorarios: 1580,  gastos: 630,  ayudante: 0     },
  { id: 18, codigo: "0513001", descripcion: "Biopsia de ganglio linfático",     campo: "Gastos Quirúrgicos",      honorarios: 7500,  gastos: 3550, ayudante: 3750  },
  { id: 19, codigo: "0514001", descripcion: "Monitoreo fetal electrónico",      campo: "Galeno Ginecología",      honorarios: 2450,  gastos: 700,  ayudante: 0     },
  { id: 20, codigo: "0515001", descripcion: "Colonoscopia diagnóstica",         campo: "Galeno Práctica",         honorarios: 6100,  gastos: 1800, ayudante: 0     },
  { id: 21, codigo: "0516001", descripcion: "Histeroscopia operatoria",         campo: "Gastos Quirúrgicos",      honorarios: 9800,  gastos: 3250, ayudante: 4900  },
  { id: 22, codigo: "0517001", descripcion: "Nefrolitotomía percutánea",        campo: "Galeno Urología",         honorarios: 21200, gastos: 5600, ayudante: 10600 },
  { id: 23, codigo: "0518001", descripcion: "Punción lumbar diagnóstica",       campo: "Otros Gastos",            honorarios: 1230,  gastos: 400,  ayudante: 0     },
  { id: 24, codigo: "0519001", descripcion: "Tiroplastia unilateral",           campo: "Galeno Cirugía Adultos",  honorarios: 15000, gastos: 4100, ayudante: 7500  },
  { id: 25, codigo: "0520001", descripcion: "Amigdalectomía pediátrica",        campo: "Galeno Cirugía Infantil", honorarios: 8900,  gastos: 2400, ayudante: 4450  },
];

const PAGE_SIZE = 8;
const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

type Props = { osNombre?: string };

export default function CodigosAfectados({ osNombre }: Props) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(MOCK.length / PAGE_SIZE);
  const rows = useMemo(
    () => MOCK.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page],
  );

  return (
    <div className={styles.wrap}>

      <div className={styles.header}>
        <h2 className={styles.title}>Códigos Afectados</h2>
        {osNombre && <span className={styles.osBadge}>{osNombre}</span>}
        <span className={styles.countBadge}>{MOCK.length} códigos</span>
      </div>

      {/* ── Desktop table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Campo</th>
              <th className={styles.right}>Honorarios</th>
              <th className={styles.right}>Gastos</th>
              <th className={styles.right}>Ayudante</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                <td className={styles.codeCell}>{r.codigo}</td>
                <td className={styles.descCell}>{r.descripcion}</td>
                <td><span className={styles.campoBadge}>{r.campo}</span></td>
                <td className={`${styles.right} ${styles.moneyCell}`}>{fmt.format(r.honorarios)}</td>
                <td className={`${styles.right} ${styles.gastosCell}`}>
                  {r.gastos > 0 ? fmt.format(r.gastos) : <span className={styles.nil}>—</span>}
                </td>
                <td className={`${styles.right} ${styles.ayudanteCell}`}>
                  {r.ayudante > 0 ? fmt.format(r.ayudante) : <span className={styles.nil}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className={styles.cardList}>
        {rows.map((r) => (
          <div key={r.id} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.codeCell}>{r.codigo}</span>
              <span className={styles.campoBadge}>{r.campo}</span>
            </div>
            <p className={styles.cardDesc}>{r.descripcion}</p>
            <div className={styles.chips}>
              <div className={styles.chip}>
                <span className={styles.chipLabel}>Honorarios</span>
                <span className={styles.moneyCell}>{fmt.format(r.honorarios)}</span>
              </div>
              <div className={styles.chip}>
                <span className={styles.chipLabel}>Gastos</span>
                <span className={styles.gastosCell}>
                  {r.gastos > 0 ? fmt.format(r.gastos) : "—"}
                </span>
              </div>
              <div className={styles.chip}>
                <span className={styles.chipLabel}>Ayudante</span>
                <span className={styles.ayudanteCell}>
                  {r.ayudante > 0 ? fmt.format(r.ayudante) : "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      <div className={styles.pagination}>
        <button
          className={styles.pageBtn}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className={styles.pageInfo}>
          Página <strong>{page}</strong> de <strong>{totalPages}</strong>
        </span>
        <button
          className={styles.pageBtn}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

    </div>
  );
}
