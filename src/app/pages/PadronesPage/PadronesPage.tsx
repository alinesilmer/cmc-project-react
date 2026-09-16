import React, { useState } from "react";
import PadronesPromptModal from "../../components/molecules/Padrones/PadronesPromptModal/PadronesPromptModal";
import PadronesForm from "../../components/molecules/Padrones/PadronesForm/PadronesForm";
import { useAuth } from "../../auth/AuthProvider";
import styles from "./PadronesPage.module.scss";

/**
 * El padrón se edita siempre sobre el legajo del médico logueado (`user.id`,
 * igual que MiPerfil): la ruta es pública, así que sin sesión no hay legajo
 * que mostrar.
 */
const PadronesPage: React.FC = () => {
  const { user, ready } = useAuth();
  const [showPrompt, setShowPrompt] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const handleGoToPadrones = () => {
    setShowPrompt(false);
    setShowForm(true);
  };

  const handlePreview = (selectedIds: string[]) => {
    alert(`Has seleccionado ${selectedIds.length} obra(s) social(es)`);
  };

  // TODO: enviar la selección al backend; hoy solo confirma en pantalla.
  const handleSubmit = () => {
    alert(
      "¡Formulario enviado exitosamente! Recibirá una confirmación por email."
    );
    setShowForm(false);
  };

  if (!ready) return null;
  if (!user?.id) {
    return (
      <div style={{ padding: 24 }}>
        No pudimos identificar tu legajo. Volvé a iniciar sesión.
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PadronesPromptModal
        open={showPrompt}
        onClose={() => setShowPrompt(false)}
        onGoToPadrones={handleGoToPadrones}
      />

      <div className={`${styles.formWrapper} ${showPrompt ? styles.blurred : ""}`}>
        {showForm && (
          <PadronesForm
            medicoId={user.id}
            onPreview={handlePreview}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
};

export default PadronesPage;
