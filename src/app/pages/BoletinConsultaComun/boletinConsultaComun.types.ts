export type ApiBoletinRow = {
  id: number;
  codigos: string;
  nro_obrasocial: number;
  obra_social: string | null;
  honorarios_a: number;
  honorarios_b: number;
  honorarios_c: number;
  gastos: number;
  ayudante_a: number;
  ayudante_b: number;
  ayudante_c: number;
  c_p_h_s: string;
  fecha_cambio: string | null;
};

export type ConsultaComunItem = {
  nro: number;
  nombre: string;
  valor: number;
  fechaCambio: string | null;
  observaciones: string[];
};