import { useNavigate } from "react-router-dom";
import styles from "./Facturacion.module.scss";

type FacturacionSection = {
    title: string;
    description: string;
    route: string;
    variant: "primary" | "secondary";
};

const sections: FacturacionSection[] = [
    {
        title: "Carga Prestaciones - Colegio",
        description: "Accedé a la carga y gestión de prestaciones del colegio.",
        route: "carga", 
        variant: "primary",
    },
    {
        title: "Cierre de Períodos Facturista",
        description: "Realizá el cierre de períodos y control de facturación.",
        route: "cierre-periodos-facturista",
        variant: "secondary",
    },
    {
        title: "Listado por Médico",
        description: "Consultá el detalle de facturación agrupado por médico.",
        route: "listado-por-medico",
        variant: "primary",
    },
    {
        title: "Listado por Obra Social - Colegio",
        description: "Visualizá la facturación agrupada por obra social.",
        route: "listado-por-obra-social-colegio",
        variant: "secondary",
    },
    {
        title: "Validación",
        description: "Ingresá al módulo de validación de datos y prestaciones.",
        route: "validacion",
        variant: "primary",
    },
    {
        title: "IOSCOR",
        description: "Accedé a las herramientas y procesos asociados a IOSCOR.",
        route: "ioscor",
        variant: "secondary",
    },
    {
        title: "Boreal Archivo Plano",
        description: "Generá y gestioná el archivo plano correspondiente a Boreal.",
        route: "boreal-archivo-plano",
        variant: "primary",
    },
    {
        title: "Plano UTN",
        description: "Accedé a la generación y revisión del plano UTN.",
        route: "plano-utn",
        variant: "secondary",
    },
    {
        title: "OMINT Archivo Plano",
        description: "Gestioná el archivo plano correspondiente a OMINT.",
        route: "omint-archivo-plano",
        variant: "primary",
    },
];

const Facturacion = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Facturación</h1>
                <p className={styles.subtitle}>
                    Seleccioná la sección a la que querés ingresar.
                </p>
            </div>

            <div className={styles.actionsGrid}>
                {sections.map((section) => (
                    <button
                        key={section.title}
                        type="button"
                        className={`${styles.actionCard} ${
                            section.variant === "primary"
                                ? styles.actionCardPrimary
                                : styles.actionCardSecondary
                        }`}
                        onClick={() => navigate(section.route)} // navega relativo a /panel/facturacion
                    >
                        <h2 className={styles.actionTitle}>{section.title}</h2>
                        <p className={styles.actionDescription}>
                            {section.description}
                        </p>
                        <span className={styles.actionButton}>Ingresar</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Facturacion;