import { useMemo, useState } from "react";
import styles from "./CargaFacturacion.module.scss";

const toNumber = (value: string) => {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) =>
    value.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const CargaFacturacion = () => {
    const [obraSocialCode, setObraSocialCode] = useState("137");
    const [doctor, setDoctor] = useState("");
    const [tipo, setTipo] = useState("CONSULTA");
    const [codigoPrestacion, setCodigoPrestacion] = useState("");
    const [honorarios, setHonorarios] = useState("0");
    const [gastos, setGastos] = useState("0");
    const [coseguro, setCoseguro] = useState("0");
    const [validacion, setValidacion] = useState("");
    const [nroAfiliado, setNroAfiliado] = useState("");
    const [nombreAfiliado, setNombreAfiliado] = useState("A");
    const [sesion, setSesion] = useState("1");
    const [cantidad, setCantidad] = useState("1");
    const [dia, setDia] = useState("02");
    const [mes, setMes] = useState("03");
    const [anio, setAnio] = useState("2026");

    const obraSocialNombre = "411 - ASOCIACION MUTUAL SANCOR";
    const doctorNotFound = doctor.trim().length > 0 && doctor.trim().length < 3;

    const totalPrestacion = useMemo(() => {
        const total =
            (toNumber(honorarios) + toNumber(gastos) + toNumber(coseguro)) *
            Math.max(toNumber(cantidad), 1);

        return total;
    }, [honorarios, gastos, coseguro, cantidad]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Carga de Facturación</h1>
                <p className={styles.subtitle}>
                    Cargá prestaciones de forma clara, rápida y con mejor control visual.
                </p>
            </div>

           

            <form className={styles.contentGrid} onSubmit={handleSubmit}>
                <section className={styles.formCard}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Datos de la prestación</h2>
                        <p className={styles.sectionDescription}>
                            Completá la información principal antes de registrar la carga.
                        </p>
                    </div>

                    <div className={styles.fieldGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="obraSocialCode">
                                Obra social
                            </label>
                            <input
                                id="obraSocialCode"
                                className={styles.input}
                                value={obraSocialCode}
                                onChange={(e) => setObraSocialCode(e.target.value)}
                            />
                            <span className={styles.helperText}>{obraSocialNombre}</span>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="doctor">
                                Doctor/a
                            </label>
                            <input
                                id="doctor"
                                className={styles.input}
                                value={doctor}
                                onChange={(e) => setDoctor(e.target.value)}
                                placeholder="Ingresá matrícula o socio"
                            />
                        </div>

                        {doctorNotFound && (
                            <div className={styles.formGroupFull}>
                                <div className={styles.inlineAlert}>
                                    PRESTADOR: no existe socio o matrícula para el valor ingresado.
                                </div>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="tipo">
                                Tipo
                            </label>
                            <select
                                id="tipo"
                                className={styles.select}
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                            >
                                <option value="CONSULTA">CONSULTA</option>
                                <option value="PRACTICA">PRÁCTICA</option>
                                <option value="OTRO">OTRO</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="codigoPrestacion">
                                Código prestación
                            </label>
                            <input
                                id="codigoPrestacion"
                                className={styles.input}
                                value={codigoPrestacion}
                                onChange={(e) => setCodigoPrestacion(e.target.value)}
                                placeholder="Código"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="honorarios">
                                Honorarios
                            </label>
                            <input
                                id="honorarios"
                                className={styles.input}
                                value={honorarios}
                                onChange={(e) => setHonorarios(e.target.value)}
                                inputMode="decimal"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="gastos">
                                Gastos
                            </label>
                            <input
                                id="gastos"
                                className={styles.input}
                                value={gastos}
                                onChange={(e) => setGastos(e.target.value)}
                                inputMode="decimal"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="coseguro">
                                Coseguro
                            </label>
                            <input
                                id="coseguro"
                                className={styles.input}
                                value={coseguro}
                                onChange={(e) => setCoseguro(e.target.value)}
                                inputMode="decimal"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Valor prestación</label>
                            <div className={styles.valueBox}>
                                ${formatCurrency(totalPrestacion)}
                            </div>
                        </div>
                    </div>

                    <div className={styles.separator} />

                    <div className={styles.sectionHeaderSecondary}>
                        <h3 className={styles.subsectionTitle}>Datos del afiliado</h3>
                    </div>

                    <div className={styles.fieldGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="validacion">
                                Validación
                            </label>
                            <input
                                id="validacion"
                                className={styles.input}
                                value={validacion}
                                onChange={(e) => setValidacion(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="nroAfiliado">
                                Nro. de afiliado
                            </label>
                            <input
                                id="nroAfiliado"
                                className={styles.input}
                                value={nroAfiliado}
                                onChange={(e) => setNroAfiliado(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroupFull}>
                            <label className={styles.label} htmlFor="nombreAfiliado">
                                Nombre afiliado
                            </label>
                            <input
                                id="nombreAfiliado"
                                className={styles.input}
                                value={nombreAfiliado}
                                onChange={(e) => setNombreAfiliado(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="sesion">
                                Sesión
                            </label>
                            <input
                                id="sesion"
                                className={styles.input}
                                value={sesion}
                                onChange={(e) => setSesion(e.target.value)}
                                inputMode="numeric"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="cantidad">
                                Cantidad
                            </label>
                            <input
                                id="cantidad"
                                className={styles.input}
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                inputMode="numeric"
                            />
                        </div>

                        <div className={styles.formGroupFull}>
                            <label className={styles.label}>Fecha prestación</label>
                            <div className={styles.dateGrid}>
                                <input
                                    className={styles.input}
                                    value={dia}
                                    onChange={(e) => setDia(e.target.value)}
                                    inputMode="numeric"
                                    placeholder="DD"
                                />
                                <input
                                    className={styles.input}
                                    value={mes}
                                    onChange={(e) => setMes(e.target.value)}
                                    inputMode="numeric"
                                    placeholder="MM"
                                />
                                <input
                                    className={styles.input}
                                    value={anio}
                                    onChange={(e) => setAnio(e.target.value)}
                                    inputMode="numeric"
                                    placeholder="AAAA"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <aside className={styles.summaryCard}>
                    <h2 className={styles.sectionTitle}>Resumen</h2>

                    <div className={styles.summaryBlock}>
                        <span className={styles.summaryLabel}>Obra social</span>
                        <p className={styles.summaryValue}>
                            {obraSocialCode || "—"} · {obraSocialNombre}
                        </p>
                    </div>

                    <div className={styles.summaryBlock}>
                        <span className={styles.summaryLabel}>Prestador</span>
                        <p className={styles.summaryValue}>
                            {doctor.trim() ? doctor : "Sin ingresar"}
                        </p>
                    </div>

                    <div className={styles.statusBadgeWrapper}>
                        <span
                            className={`${styles.statusBadge} ${
                                doctorNotFound
                                    ? styles.statusBadgeError
                                    : styles.statusBadgeSuccess
                            }`}
                        >
                            {doctorNotFound
                                ? "Prestador no validado"
                                : "Listo para cargar"}
                        </span>
                    </div>

                    <div className={styles.totalCard}>
                        <span className={styles.totalLabel}>Total estimado</span>
                        <strong className={styles.totalValue}>
                            ${formatCurrency(totalPrestacion)}
                        </strong>
                    </div>

                    <div className={styles.summaryMeta}>
                        <div className={styles.metaRow}>
                            <span>Tipo</span>
                            <strong>{tipo}</strong>
                        </div>
                        <div className={styles.metaRow}>
                            <span>Cantidad</span>
                            <strong>{cantidad || "1"}</strong>
                        </div>
                        <div className={styles.metaRow}>
                            <span>Sesión</span>
                            <strong>{sesion || "1"}</strong>
                        </div>
                        <div className={styles.metaRow}>
                            <span>Fecha</span>
                            <strong>
                                {dia || "DD"}/{mes || "MM"}/{anio || "AAAA"}
                            </strong>
                        </div>
                    </div>

                    <button type="submit" className={styles.submitButton}>
                        Cargar prestaciones
                    </button>
                </aside>
            </form>
        </div>
    );
};

export default CargaFacturacion;