import styles from "./CargaFacturacion.module.scss";
import { AlertTriangle, FilePlus2 } from "lucide-react";
import comun from "./Comun.module.scss";
import { cargarCatalogos } from "./catalogosCarga";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import Franja from "@/app/components/layout/Franja/Franja";
import { motion } from "framer-motion";
import ResumenLateralCard from "./sections/ResumenLateralCard";
import MedicoPrestacionesTable from "./sections/MedicoPrestacionesTable";
import DuplicadoConfirmModal from "../components/DuplicadoConfirmModal";
import { useCargaFacturacion } from "./useCargaFacturacion";
import CargaAvisos from "./CargaAvisos";
import CargaMedicoObraSocial from "./CargaMedicoObraSocial";
import CargaPacientePrestacion from "./CargaPacientePrestacion";
import CargaAutorizacion from "./CargaAutorizacion";
import CargaCantidadYCalculo from "./CargaCantidadYCalculo";
import CargaMontos from "./CargaMontos";
import CargaEquipo from "./CargaEquipo";
import CargaPie from "./CargaPie";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const CargaFacturacion: React.FC = () => {
  const ctx = useCargaFacturacion();
  const { navigate, capa, isEdit, isComplemento, isReplicando, loadingReplicar, errorPrecarga, medicosPrecargados, obrasSocialesPrecargadas, clinicasPrecargadas, loadingComplemento, complementoError, loadingEdit, errorEdicion, editHidratado, codMedico, mantener, setMantener, guardando, duplicado, setDuplicado, formRef, refreshKey, volverA, doGuardar, centrarCampoEnfocado, marcarPuntero, handleFormKeyDown, medicoTabla, codObraTabla, periodoTabla } = ctx;


  // Antes que cualquier otro gate: sin médicos y obras sociales precargados no hay formulario que mostrar.
  if (!medicosPrecargados || !obrasSocialesPrecargadas || !clinicasPrecargadas) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Cargar prestación</h1>
          </div>
        </div>
        {errorPrecarga ? (
          <div className={comun.errorBox}>
            <AlertTriangle size={14} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> No se pudieron cargar los médicos, las obras sociales y las clínicas.{" "}
            <BotonPlano
              type="button"
              className={comun.periodoLinkBtn}
              onClick={() => cargarCatalogos()}
            >
              Reintentar
            </BotonPlano>
          </div>
        ) : (
          <p className={comun.mutedText}>Cargando formulario, esperá…</p>
        )}
      </div>
    );
  }

  // Solo en la primera lectura: la recarga posterior a guardar no tiene que blanquear la pantalla .
  if (isEdit && loadingEdit && !editHidratado) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Editar prestación</h1>
          </div>
        </div>
        <p className={comun.mutedText}>Cargando prestación…</p>
      </div>
    );
  }

  if (isEdit && errorEdicion) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Editar prestación</h1>
          </div>
        </div>
        <div className={comun.errorBox}>
          {errorEdicion}{" "}
          <BotonPlano
            type="button"
            className={comun.periodoLinkBtn}
            onClick={() => (capa ? capa.cerrar() : navigate(volverA))}
          >
            Volver
          </BotonPlano>
        </div>
      </div>
    );
  }

  if (isReplicando && loadingReplicar) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Cargar prestación</h1>
          </div>
        </div>
        <p className={comun.mutedText}>Cargando datos para replicar…</p>
      </div>
    );
  }

  if (isComplemento && loadingComplemento) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Cargar en complementaria</h1>
          </div>
        </div>
        <p className={comun.mutedText}>Cargando factura complementaria…</p>
      </div>
    );
  }

  if (isComplemento && complementoError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>
            <FilePlus2 size={22} />
          </span>
          <div>
            <h1 className={styles.title}>Cargar en complementaria</h1>
          </div>
          <div className={styles.headerRight}>
            <BackButton to="/panel/facturacion/complementarias" />
          </div>
        </div>
        <div className={comun.errorBox}>{complementoError}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Franja
        icono={FilePlus2}
        titulo={
          isComplemento
            ? "Cargar en complementaria"
            : isEdit
              ? "Editar prestación"
              : "Cargar prestación"
        }
      />
      <CargaAvisos ctx={ctx} />

      <motion.div
        className={styles.body}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.layout} ref={formRef} onKeyDown={handleFormKeyDown} onPointerDown={marcarPuntero} onFocus={centrarCampoEnfocado}>
          <CargaMedicoObraSocial ctx={ctx} medicosPrecargados={medicosPrecargados} obrasSocialesPrecargadas={obrasSocialesPrecargadas} />

          <CargaPacientePrestacion ctx={ctx} />

          <CargaAutorizacion ctx={ctx} />

          <CargaCantidadYCalculo ctx={ctx} />

          <CargaMontos ctx={ctx} />

          <CargaEquipo ctx={ctx} medicosPrecargados={medicosPrecargados} />

          <CargaPie ctx={ctx} />
        </div>

        {/* En edición no hay barra lateral: el total ya se ve en la sección de montos. */}
        {!isEdit && (
          <div className={styles.sidebarCol}>
            <ResumenLateralCard
              mantener={mantener}
              onMantenerChange={(k, v) =>
                setMantener((prev) => ({ ...prev, [k]: v }))
              }
              showFecha={!isComplemento}
              showObraSocial={!isComplemento}
            />
          </div>
        )}
      </motion.div>

      {/* En complementaria no se muestra: el listado plano filtra por período y no puede distinguir la v1 (ya facturada) del complemento. */}
      {!isComplemento && (
        <MedicoPrestacionesTable
          codMedico={codMedico ?? medicoTabla?.cod ?? null}
          medicoNombre={medicoTabla?.nombre ?? null}
          medicoMatricula={medicoTabla?.matricula ?? null}
          codObra={codObraTabla}
          periodo={periodoTabla}
          refreshKey={refreshKey}
        />
      )}

      <DuplicadoConfirmModal
        isOpen={!!duplicado}
        mensaje={duplicado?.mensaje ?? ""}
        duplicadoId={duplicado?.id}
        onClose={() => setDuplicado(null)}
        // Reusa doGuardar en vez de repetir la lógica: esa duplicación era la que arrastraba la llamada rota a loadRecientes.
        onConfirm={async () => {
          setDuplicado(null);
          await doGuardar(true);
        }}
        loading={guardando}
      />
    </div>
  );
};

export default CargaFacturacion;
