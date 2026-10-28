import { useEffect, useState } from "react";
import { type TipoCalculo, type ViaPractica } from "../types";
import { type AyudanteLinea } from "./sections/AyudanteSection";
import { type PediatraLinea } from "./sections/PediatraSection";
import { FACTURACION_AUTORIZACION_POR_INTEGRANTE_KEY } from "../constants";

/** Estado de la prestación: código, cantidades, montos y equipo (ayudantes y pediatra). */
export function useCargaEstadoPrestacion() {
  // Montos principales
  const [codNomenclador, setCodNomenclador] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [sesion, setSesion] = useState("1");
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>("A");
  const [via, setVia] = useState<ViaPractica>("T");
  const [porcentaje, setPorcentaje] = useState("100");
  const [honorarios, setHonorarios] = useState("0");
  const [gastos, setGastos] = useState("0");
  // Importe que el afiliado paga de su bolsillo; se descuenta del total.
  const [coseguro, setCoseguro] = useState("0");
  // Tipo de prestador de ESTA carga: "medico" (cirujano, default) factura honorarios/gastos y admite ayudantes de equipo.
  const [tipoPrestador, setTipoPrestador] = useState<"medico" | "ayudante">("medico");
  const [montoAyudante, setMontoAyudante] = useState("0");

  // Ayudantes quirúrgicos (0..N según cantidad_ayudantes del código+OS). Solo aplica
  // cuando `tipoPrestador === "medico"`.
  const [ayudantes, setAyudantes] = useState<AyudanteLinea[]>([]);

  // Pediatra del equipo (máx. 1, sólo en parto/cesárea — ver `precio.admite_pediatra`).
  const [pediatra, setPediatra] = useState<PediatraLinea | null>(null);

  // Algunas obras sociales emiten un Nº de autorización POR integrante del equipo (cirujano y cada ayudante) en vez de uno solo para toda la práctica.
  const [autorizacionPorIntegrante, setAutorizacionPorIntegrante] = useState(
    () => localStorage.getItem(FACTURACION_AUTORIZACION_POR_INTEGRANTE_KEY) === "1",
  );
  useEffect(() => {
    localStorage.setItem(FACTURACION_AUTORIZACION_POR_INTEGRANTE_KEY, autorizacionPorIntegrante ? "1" : "0");
  }, [autorizacionPorIntegrante]);

  return {
    codNomenclador,
    setCodNomenclador,
    cantidad,
    setCantidad,
    sesion,
    setSesion,
    tipoCalculo,
    setTipoCalculo,
    via,
    setVia,
    porcentaje,
    setPorcentaje,
    honorarios,
    setHonorarios,
    gastos,
    setGastos,
    coseguro,
    setCoseguro,
    tipoPrestador,
    setTipoPrestador,
    montoAyudante,
    setMontoAyudante,
    ayudantes,
    setAyudantes,
    pediatra,
    setPediatra,
    autorizacionPorIntegrante,
    setAutorizacionPorIntegrante,
  };
}
