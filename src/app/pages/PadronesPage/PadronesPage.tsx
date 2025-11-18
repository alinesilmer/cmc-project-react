import React, { useState } from "react";
import PadronesPromptModal from "../../components/molecules/Padrones/PadronesPromptModal/PadronesPromptModal";
import PadronesForm from "../../components/molecules/Padrones/PadronesForm/PadronesForm";
import styles from "./PadronesPage.module.scss";

const PadronesPage: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const handleGoToPadrones = () => {
    setShowPrompt(false);
    setShowForm(true);
  };

  const handlePreview = (selectedIds: string[]) => {
    console.log("Preview selected insurances:", selectedIds);
    alert(`Has seleccionado ${selectedIds.length} obra(s) social(es)`);
  };

  const handleSubmit = (selectedIds: string[]) => {
    // TODO: Send to backend
    console.log("Submitting padrones:", selectedIds);
    alert(
      "¡Formulario enviado exitosamente! Recibirá una confirmación por email."
    );
    setShowForm(false);
  };

  return (
    <div className={styles.page}>
      <PadronesPromptModal
        open={showPrompt}
        onClose={() => setShowPrompt(false)}
        onGoToPadrones={handleGoToPadrones}
      />

      <div className={`${styles.formWrapper} ${showPrompt ? styles.blurred : ""}`}>
        {showForm && (
          <PadronesForm onPreview={handlePreview} onSubmit={handleSubmit} />
        )}
      </div>
    </div>
  );
};

export default PadronesPage;
