import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Dialogo, { DialogoCampo } from "@/app/components/ui/Dialogo/Dialogo";
import Segmentos from "@/app/components/ui/Segmentos/Segmentos";
import type { Responsable } from "@/app/pages/Agenda/agenda.types";
import { ESTADOS, PRIORIDADES, type Estado, type NuevaTarjeta, type Prioridad } from "../tablero.types";
import s from "../Tablero.module.scss";
import SelectorResponsable from "./SelectorResponsable";

type Props = {
  estadoInicial: Estado;
  responsables: Responsable[];
  onCrear: (datos: NuevaTarjeta) => void;
  onClose: () => void;
};

export default function NuevaTarjetaDialogo({ estadoInicial, responsables, onCrear, onClose }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [prioridad, setPrioridad] = useState<Prioridad>("media");
  const [asignadoId, setAsignadoId] = useState<number | null>(null);
  const [asignadoNombre, setAsignadoNombre] = useState("");
  const [vence, setVence] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    onCrear({ titulo: titulo.trim(), descripcion: descripcion.trim(), estado, prioridad, asignadoId, asignadoNombre, vence });
  };

  return (
    <Dialogo
      titulo="Nueva tarjeta"
      icono={Plus}
      ancho="medio"
      onClose={onClose}
      acciones={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button submit form="form-nueva-tarjeta" disabled={!titulo.trim()}>
            Crear
          </Button>
        </>
      }
    >
      <form id="form-nueva-tarjeta" className={s.formulario} onSubmit={enviar}>
        <DialogoCampo rotulo="Título" htmlFor="nt-titulo">
          <input
            id="nt-titulo"
            className={s.entrada}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={140}
            autoFocus
          />
        </DialogoCampo>
        <DialogoCampo rotulo="Descripción (opcional)" htmlFor="nt-desc">
          <textarea id="nt-desc" className={s.entrada} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={2000} />
        </DialogoCampo>
        <DialogoCampo rotulo="Asignada a (opcional)" htmlFor="nt-resp">
          <SelectorResponsable
            id="nt-resp"
            responsables={responsables}
            valorId={asignadoId}
            valorNombre={asignadoNombre}
            onChange={(id, nombre) => {
              setAsignadoId(id);
              setAsignadoNombre(nombre);
            }}
          />
        </DialogoCampo>
        <DialogoCampo rotulo="Vence (opcional)" htmlFor="nt-vence">
          <CampoFecha id="nt-vence" value={vence} onChange={setVence} />
        </DialogoCampo>
        <DialogoCampo rotulo="Prioridad">
          <Segmentos opciones={PRIORIDADES} valor={prioridad} onChange={setPrioridad} ariaLabel="Prioridad" />
        </DialogoCampo>
        <DialogoCampo rotulo="Columna">
          <Segmentos opciones={ESTADOS} valor={estado} onChange={setEstado} ariaLabel="Columna" />
        </DialogoCampo>
      </form>
    </Dialogo>
  );
}
