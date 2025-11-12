// src/website/pages/Forbidden403.tsx
import { Link } from "react-router-dom";

export default function Forbidden403() {
  return (
    <section style={{ padding: "4rem 1rem", textAlign: "center" }}>
      <h1>403 – Acceso restringido</h1>
      <p>No tenés permisos para ver esta sección.</p>
      <p>
        <Link to="/panel/dashboard">Ir al panel</Link>
      </p>
    </section>
  );
}
