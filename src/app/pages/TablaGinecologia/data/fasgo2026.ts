// Source: nomenclador_fasgo_2026.sql — do not edit manually

export const FASGO_BASE_2026 = 432;

export const UNIDADES_POR_NIVEL: Record<number, number> = {
  1: 180, 2: 350, 3: 600, 4: 900, 5: 1200, 6: 1800,
  7: 2250, 8: 2700, 9: 3250, 10: 4000, 11: 4500, 12: 6250, 13: 9400,
};

export type TipoValor = "UNIDADES_GALENO" | "NIVEL_COMPLEJIDAD";

export type PracticaFASGO = {
  codigo:  string;
  practica: string;
  tipo:    TipoValor;
  valor:   number; // units if GALENO, level if COMPLEJIDAD
};

export type SeccionFASGO = {
  id:     string;
  nombre: string;
  practicas: PracticaFASGO[];
};

const G: TipoValor = "UNIDADES_GALENO";
const C: TipoValor = "NIVEL_COMPLEJIDAD";

export const SECCIONES: SeccionFASGO[] = [
  {
    id: "ambulatorio",
    nombre: "PRÁCTICAS AMBULATORIAS",
    practicas: [
      { codigo: "22.00.01", practica: "Consulta",                                          tipo: G, valor: 90   },
      { codigo: "22.00.02", practica: "Toma de muestra de PAP y cepillado",                tipo: G, valor: 50   },
      { codigo: "22.01.01", practica: "Colposcopia",                                       tipo: G, valor: 100  },
      { codigo: "22.01.02", practica: "Videocolposcopia",                                  tipo: G, valor: 200  },
      { codigo: "22.01.03", practica: "Vulvoscopia",                                       tipo: G, valor: 100  },
      { codigo: "22.01.04", practica: "IVE - ILE",                                         tipo: G, valor: 1350 },
      { codigo: "22.02.02", practica: "Monitoreo Fetal anteparto o intraparto por feto",   tipo: G, valor: 150  },
      { codigo: "43.02.01", practica: "Curaciones Pos Quirúrgicas",                        tipo: G, valor: 30   },
      { codigo: "36.01.04", practica: "Colocación Sonda Vesical",                          tipo: G, valor: 60   },
    ],
  },
  {
    id: "invasivas-ambulatorias",
    nombre: "PRÁCTICAS INVASIVAS AMBULATORIAS",
    practicas: [
      { codigo: "11.00.01", practica: "Colocación de DIU, SIU o Implante Subdérmico",                                                               tipo: C, valor: 4 },
      { codigo: "11.00.02", practica: "Extracción de DIU o SIU (DIU Hormonal)",                                                                     tipo: C, valor: 1 },
      { codigo: "11.00.03", practica: "Electrocoagulación de cuello o Crio, tratamiento con láser. Biopsia con Asa de LEEP.",                        tipo: C, valor: 6 },
      { codigo: "11.00.04", practica: "Escisión local de lesión de cuello (pólipo). Punciones. Colpotomía. Drenaje de absceso. Cauterización (x4 sesiones)", tipo: C, valor: 2 },
      { codigo: "11.00.05", practica: "Extracción de cuerpo extraño vaginal o anal",                                                                tipo: G, valor: 50 },
      { codigo: "11.00.06", practica: "Colocación de Pesario",                                                                                      tipo: G, valor: 30 },
      { codigo: "11.00.07", practica: "Toma de muestra de Cultivo Vaginal, PCR",                                                                    tipo: G, valor: 25 },
      { codigo: "11.00.08", practica: "Extracción de implante Subdérmico",                                                                          tipo: C, valor: 4 },
      { codigo: "11.00.09", practica: "Exéresis / extrusión de malla",                                                                              tipo: C, valor: 2 },
      { codigo: "11.00.10", practica: "Taponaje Vaginal Hemostático",                                                                               tipo: G, valor: 50 },
      { codigo: "11.00.11", practica: "Histeroscopía Office diagnóstica",                                                                           tipo: C, valor: 6 },
      { codigo: "11.00.12", practica: "Histeroscopía Office terapéutica",                                                                           tipo: C, valor: 7 },
    ],
  },
  {
    id: "ovarios-trompas",
    nombre: "OVARIOS Y TROMPAS",
    practicas: [
      { codigo: "11.01.01", practica: "Drenaje de absceso anexial por vía abdominal",                                                         tipo: C, valor: 6  },
      { codigo: "11.01.02", practica: "Ligadura de Trompas bilateral por vía abdominal",                                                      tipo: C, valor: 6  },
      { codigo: "11.01.03", practica: "Ooforosalpingectomía / Quistectomía UNILATERAL",                                                        tipo: C, valor: 6  },
      { codigo: "11.01.04", practica: "Ooforosalpingectomía / Quistectomía BILATERAL",                                                         tipo: C, valor: 7  },
      { codigo: "11.01.05", practica: "Laparoscopia exploradora",                                                                             tipo: C, valor: 5  },
      { codigo: "11.01.06", practica: "Salpingolisis uni o bilateral / adhesiolisis / enterolisis laparoscópica",                             tipo: C, valor: 6  },
      { codigo: "11.01.07", practica: "Salpingectomía uni o bilateral laparoscópica",                                                         tipo: C, valor: 7  },
      { codigo: "11.01.08", practica: "Cirugía laparoscópica anexial BAJA-mediana complejidad UNILATERAL",                                    tipo: C, valor: 8  },
      { codigo: "11.01.09", practica: "Cirugía laparoscópica anexial BAJA complejidad BILATERAL",                                             tipo: C, valor: 9  },
      { codigo: "11.01.10", practica: "Cirugía laparoscópica anexial ALTA complejidad UNILATERAL",                                            tipo: C, valor: 10 },
      { codigo: "11.01.11", practica: "Cirugía laparoscópica anexial ALTA complejidad BILATERAL",                                             tipo: C, valor: 11 },
    ],
  },
  {
    id: "utero",
    nombre: "OPERACIONES DEL ÚTERO",
    practicas: [
      { codigo: "11.02.01", practica: "Histerectomía por vía abdominal o vaginal",                                              tipo: C, valor: 7  },
      { codigo: "11.02.02", practica: "Miomectomía uterina abdominal",                                                          tipo: C, valor: 6  },
      { codigo: "11.02.03", practica: "Miomectomía vaginal (mioma-nacens)",                                                     tipo: C, valor: 4  },
      { codigo: "11.02.04", practica: "Miomectomía vaginal por histerotomía con liberación de vejiga",                          tipo: C, valor: 6  },
      { codigo: "11.02.05", practica: "Operación correctora vicios de conformación del útero",                                  tipo: C, valor: 7  },
      { codigo: "11.02.06", practica: "Reparación del istmocele",                                                               tipo: C, valor: 6  },
      { codigo: "11.02.07", practica: "Raspado uterino en embarazo Molar",                                                      tipo: C, valor: 6  },
      { codigo: "11.02.08", practica: "Evacuación uterina terapéutica hasta las 14 semanas",                                    tipo: C, valor: 5  },
      { codigo: "11.02.09", practica: "Evacuación uterina terapéutica de 14 a 22 semanas",                                      tipo: C, valor: 6  },
      { codigo: "11.02.10", practica: "Raspado uterino diagnóstico con o sin biopsia de cuello",                                tipo: C, valor: 5  },
      { codigo: "11.02.11", practica: "Amputación de cuello (traquelectomía) / Traqueloplastia",                                tipo: C, valor: 6  },
      { codigo: "11.02.12", practica: "Conización de cuello (cualquier técnica, incluido LEEP)",                                tipo: C, valor: 6  },
      { codigo: "11.02.13", practica: "LLETZ cervical",                                                                         tipo: C, valor: 5  },
      { codigo: "11.02.14", practica: "Cerclaje de cuello uterino",                                                             tipo: C, valor: 5  },
      { codigo: "11.02.15", practica: "Cerclaje de cuello uterino de emergencia",                                               tipo: C, valor: 6  },
      { codigo: "11.02.16", practica: "Histerectomía vaginal en paciente sin prolapso",                                         tipo: C, valor: 10 },
      { codigo: "11.02.17", practica: "Histerectomía laparoscópica",                                                            tipo: C, valor: 11 },
      { codigo: "11.02.18", practica: "Operación correctora vicios de conformación por vía laparoscópica",                      tipo: C, valor: 9  },
      { codigo: "11.02.19", practica: "Cerclaje cervical / embarazo ectópico cornual / istmocele laparoscópico",                tipo: C, valor: 10 },
      { codigo: "11.02.20", practica: "Miomectomía laparoscópica",                                                              tipo: C, valor: 11 },
      { codigo: "11.02.22", practica: "Histeroscopia diagnóstica / biopsia de endometrio / extracción de DIU",                  tipo: C, valor: 6  },
      { codigo: "11.02.22b",practica: "Histeroscopia terapéutica — polipectomía",                                               tipo: C, valor: 7  },
      { codigo: "11.02.23", practica: "Histeroscopía terapéutica — miomectomía / endometrectomía",                              tipo: C, valor: 7  },
      { codigo: "11.02.24", practica: "Operación correctora vicios de conformación por histeroscopía",                          tipo: C, valor: 7  },
      { codigo: "11.02.25", practica: "Cirugía laparoscópica por endometriosis profunda",                                       tipo: C, valor: 13 },
      { codigo: "11.02.27", practica: "Colocación de DIU / SIU bajo anestesia",                                                 tipo: C, valor: 4  },
      { codigo: "11.02.28", practica: "Evacuación uterina por microcesárea",                                                    tipo: C, valor: 6  },
      { codigo: "11.02.28b",practica: "Extracción de DIU / SIU bajo anestesia",                                                 tipo: C, valor: 5  },
    ],
  },
  {
    id: "vagina-vulva-perine",
    nombre: "VAGINA, VULVA Y PERINÉ",
    practicas: [
      { codigo: "11.03.03", practica: "Colporrafia anterior y/o posterior con o sin corrección",          tipo: C, valor: 8  },
      { codigo: "11.03.04", practica: "Colporrafia por herida / desgarro (fuera de parto)",               tipo: C, valor: 3  },
      { codigo: "11.03.05", practica: "Colporrafia posterior con reconstrucción del esfínter anal",       tipo: C, valor: 5  },
      { codigo: "11.03.06", practica: "Colpopexia por vía abdominal",                                     tipo: C, valor: 9  },
      { codigo: "11.03.07", practica: "Colpopexia combinada (vía abdominal y vaginal)",                   tipo: C, valor: 10 },
      { codigo: "11.03.08", practica: "Colpocleisis completa o parcial",                                  tipo: C, valor: 5  },
      { codigo: "11.03.09", practica: "Colpotomía / Drenaje de absceso / Biopsia de vagina o vulva",     tipo: C, valor: 4  },
      { codigo: "11.03.10", practica: "Vaginismo (Pozzi) / Resección de tabique vaginal",                tipo: C, valor: 6  },
      { codigo: "11.03.11", practica: "Punción de vagina diagnóstica / Punción de fondo de saco Douglas",tipo: C, valor: 3  },
      { codigo: "11.03.12", practica: "Vulvectomía simple / Exéresis de condilomas vulvares",            tipo: C, valor: 7  },
      { codigo: "11.03.13", practica: "Escisión de labios mayores / menores / glándulas de Bartholino",  tipo: C, valor: 5  },
      { codigo: "11.03.14", practica: "Himenotomía / Incisión y drenaje de vulva",                       tipo: C, valor: 3  },
      { codigo: "11.03.15", practica: "Episiorrafia / perineorrafia / episioperineorrafia (fuera de parto)",tipo: C, valor: 4},
      { codigo: "11.03.16", practica: "Perinoplastia / episioperineoplastia",                            tipo: C, valor: 4  },
      { codigo: "11.03.17", practica: "Fístula vesicovaginal por vía laparoscópica",                     tipo: C, valor: 10 },
      { codigo: "11.03.18", practica: "Colpopexia por vía laparoscópica",                                tipo: C, valor: 10 },
      { codigo: "11.03.19", practica: "Cirugía de Burch convencional",                                   tipo: C, valor: 9  },
      { codigo: "11.03.20", practica: "Cirugía de Burch laparoscópica",                                  tipo: C, valor: 11 },
    ],
  },
  {
    id: "uroginecologia",
    nombre: "UROGINECOLOGÍA",
    practicas: [
      { codigo: "11.03.21", practica: "Incontinencia de orina — malla sling TOT",                                              tipo: C, valor: 8  },
      { codigo: "11.03.22", practica: "Incontinencia de orina — sling retropúbico",                                            tipo: C, valor: 9  },
      { codigo: "11.03.23", practica: "Incontinencia de orina — sling pubovaginal autólogo/biológico",                         tipo: C, valor: 10 },
      { codigo: "11.03.24", practica: "Prolapso vaginal — técnicas reconstructivas nivel II y/o III",                          tipo: C, valor: 9  },
      { codigo: "11.03.25", practica: "Prolapso completo — técnicas de reconstrucción vaginal más suspensión",                 tipo: C, valor: 11 },
      { codigo: "11.03.26", practica: "Prolapso vaginal con técnica obliterativa",                                             tipo: C, valor: 7  },
      { codigo: "11.03.27", practica: "Fístula vésico-vaginal o uterina",                                                      tipo: C, valor: 10 },
      { codigo: "11.03.28", practica: "Fístula rectovaginal",                                                                  tipo: C, valor: 7  },
      { codigo: "11.03.29", practica: "Cierre de cistotomía",                                                                  tipo: C, valor: 6  },
      { codigo: "11.03.30", practica: "Uretroplastia / uretrolisis / diverticulectomía de uretra",                             tipo: C, valor: 8  },
      { codigo: "11.03.31", practica: "Resección de exposición simple de material sintético / aflojamiento de sling",          tipo: C, valor: 6  },
      { codigo: "11.03.32", practica: "Resección de exposición compleja de material sintético (> 2 cm)",                      tipo: C, valor: 8  },
    ],
  },
  {
    id: "obstetricia",
    nombre: "OPERACIONES OBSTÉTRICAS",
    practicas: [
      { codigo: "11.04.01", practica: "Atención del Parto",                                                          tipo: C, valor: 7  },
      { codigo: "11.04.02", practica: "Atención de la Cesárea",                                                      tipo: C, valor: 6  },
      { codigo: "11.04.03", practica: "Cesárea — embarazo gemelar, podálico o intraparto",                           tipo: C, valor: 7  },
      { codigo: "11.04.04", practica: "Cesárea y/o Parto Múltiple (3 o más)",                                        tipo: C, valor: 8  },
      { codigo: "11.04.06", practica: "Cesárea con cirugía uterina previa",                                          tipo: C, valor: 7  },
      { codigo: "11.04.07", practica: "Parto instrumental (Forceps/Vacum) o podálica o con cesárea anterior",        tipo: C, valor: 8  },
      { codigo: "11.04.08", practica: "Conducción del trabajo de parto 14-22 sem",                                   tipo: C, valor: 3  },
      { codigo: "11.04.09", practica: "Alumbramiento manual bajo anestesia por retención placentaria",               tipo: C, valor: 4  },
      { codigo: "11.04.10", practica: "Atención del alumbramiento en puerperio (parto no asistido por el médico)",   tipo: C, valor: 5  },
      { codigo: "11.04.11", practica: "Legrado puerperal diferido de parto o cesárea",                               tipo: C, valor: 6  },
      { codigo: "11.04.12", practica: "Laparotomía por complicación obstétrica aguda (inversión uterina / histerectomía puerperal)", tipo: C, valor: 9 },
      { codigo: "11.04.13", practica: "Histerectomía puerperal por trastornos de implantación placentaria",          tipo: C, valor: 10 },
      { codigo: "11.04.14", practica: "Técnica conservadora de útero por acretismo placentario",                     tipo: C, valor: 8  },
      { codigo: "11.04.15", practica: "Colocación de Balón de Bakry",                                                tipo: C, valor: 5  },
      { codigo: "11.04.16", practica: "Sutura de desgarro cervical o perineal posparto bajo anestesia",              tipo: C, valor: 4  },
      { codigo: "11.04.17", practica: "Drenaje de Hematoma Vulvovaginal Postparto",                                  tipo: C, valor: 5  },
    ],
  },
  {
    id: "oncologia",
    nombre: "ONCOLOGÍA GINECOLÓGICA",
    practicas: [
      { codigo: "11.05.01", practica: "Cáncer cuello — Wertheim Meigs convencional",                                 tipo: C, valor: 12 },
      { codigo: "11.05.02", practica: "Cáncer cuello — Traquelectomía radical convencional",                         tipo: C, valor: 11 },
      { codigo: "11.05.03", practica: "Cáncer de ovario convencional — cirugía citoreductiva óptima",                tipo: C, valor: 12 },
      { codigo: "11.05.04", practica: "Cáncer de endometrio convencional con linfadenectomía",                       tipo: C, valor: 12 },
      { codigo: "11.05.04b",practica: "Resección recaída tumoral de endometrio o cuello uterino",                    tipo: C, valor: 12 },
      { codigo: "11.05.05", practica: "Cáncer de vulva — Vulvectomía radical con ganglio centinela",                 tipo: C, valor: 12 },
      { codigo: "11.05.06", practica: "Cáncer de vulva — Hemivulvectomía con ganglio centinela",                     tipo: C, valor: 11 },
      { codigo: "11.05.07", practica: "Cáncer cuello — Wertheim Meigs laparoscópico",                               tipo: C, valor: 13 },
      { codigo: "11.05.08", practica: "Cáncer cuello — Traquelectomía radical laparoscópica",                        tipo: C, valor: 12 },
      { codigo: "11.05.09", practica: "Cáncer de ovario laparoscópico — cirugía citoreductiva",                      tipo: C, valor: 13 },
      { codigo: "11.05.10", practica: "Cáncer de endometrio laparoscópico con linfadenectomía",                      tipo: C, valor: 13 },
      { codigo: "11.05.11", practica: "Linfadenectomía lumboaórtica convencional",                                   tipo: C, valor: 11 },
      { codigo: "11.05.12", practica: "Linfadenectomía lumboaórtica laparoscópica",                                  tipo: C, valor: 12 },
      { codigo: "11.05.13", practica: "Traquelectomía radical con ganglio centinela (convencional)",                 tipo: C, valor: 12 },
    ],
  },
  {
    id: "mama",
    nombre: "OPERACIONES EN LA MAMA",
    practicas: [
      { codigo: "06.01.01", practica: "Mastectomía radical UNILATERAL con vaciamiento axilar",             tipo: C, valor: 12 },
      { codigo: "06.01.02", practica: "Mastectomía subradical UNILATERAL con vaciamiento axilar",          tipo: C, valor: 12 },
      { codigo: "06.01.03", practica: "Mastectomía simple unilateral",                                     tipo: C, valor: 7  },
      { codigo: "06.01.04", practica: "Mastectomía subcutánea / tratamiento de ginecomastia",              tipo: C, valor: 7  },
      { codigo: "06.01.05", practica: "Mastoplastia de aumento unilateral",                               tipo: C, valor: 8  },
      { codigo: "06.01.06", practica: "Mastoplastia de aumento bilateral",                                tipo: C, valor: 9  },
      { codigo: "06.01.07", practica: "Mamiloplastia en uno o dos tiempos",                               tipo: C, valor: 4  },
      { codigo: "06.01.08", practica: "Biopsia incisional / punción core biopsia / trucut",               tipo: C, valor: 4  },
      { codigo: "06.01.09", practica: "Tumorectomía / drenaje absceso o hematoma mamario / fistulectomía",tipo: C, valor: 4  },
      { codigo: "06.01.10", practica: "Cuadrantectomía o biopsia radio quirúrgica",                       tipo: C, valor: 6  },
      { codigo: "06.01.11", practica: "Cuadrantectomía / tumorectomía con vaciamiento axilar o ganglio centinela", tipo: C, valor: 10 },
      { codigo: "06.01.12", practica: "Punción aspiración con aguja fina o de quiste mamario",            tipo: C, valor: 3  },
      { codigo: "06.01.13", practica: "Biopsia de ganglio centinela o linfadenectomía como única operación",tipo: C, valor: 8 },
      { codigo: "06.01.14", practica: "Mastoplastia de reducción",                                        tipo: C, valor: 8  },
      { codigo: "06.01.15", practica: "Resección de recidiva local",                                      tipo: C, valor: 6  },
      { codigo: "06.01.16", practica: "Cirugía conservadora mamaria UNILATERAL — sin implante",           tipo: C, valor: 12 },
      { codigo: "06.01.17", practica: "Cirugía conservadora mamaria BILATERAL — sin implante",            tipo: C, valor: 13 },
      { codigo: "06.01.18", practica: "Mastectomía conservadora + reconstrucción con expansor UNILATERAL",tipo: C, valor: 12 },
      { codigo: "06.01.19", practica: "Mastectomía conservadora + reconstrucción con expansor BILATERAL", tipo: C, valor: 13 },
      { codigo: "06.01.20", practica: "Cambio de expansor por prótesis definitiva / capsulectomía / lipofiling",tipo: C, valor: 12},
      { codigo: "06.01.21", practica: "Complicación oncoplástica (dehiscencia / extrusión / necrosis / hematoma)",tipo: C, valor: 9},
      { codigo: "06.01.22", practica: "Colocación de expansor mamario",                                   tipo: C, valor: 6  },
      { codigo: "06.01.23", practica: "Extracción de expansor mamario",                                   tipo: C, valor: 6  },
      { codigo: "06.01.24", practica: "Colocación de implante mamario",                                   tipo: C, valor: 7  },
      { codigo: "06.01.25", practica: "Extracción de implante mamario",                                   tipo: C, valor: 6  },
    ],
  },
  {
    id: "pared-abdominal",
    nombre: "PARED Y CAVIDAD ABDOMINAL",
    practicas: [
      { codigo: "08.05.20", practica: "Fístula de pared abdominal",                             tipo: G, valor: 6 },
      { codigo: "08.05.26", practica: "Drenaje de absceso o hematoma de pared abdominal",       tipo: G, valor: 5 },
      { codigo: "08.02.14", practica: "Drenaje de absceso intraperitoneal por laparotomía",     tipo: G, valor: 7 },
      { codigo: "08.02.08", practica: "Laparotomía exploradora",                                tipo: G, valor: 5 },
      { codigo: "08.02.09", practica: "Adhesiolisis",                                           tipo: G, valor: 5 },
      { codigo: "13.01.10", practica: "Dehiscencia de herida abdominal — sutura de piel",       tipo: G, valor: 4 },
      { codigo: "13.01.02", practica: "Extracción de lesión de piel / endometrioma",            tipo: G, valor: 4 },
    ],
  },
];

export function resolveUnidades(p: PracticaFASGO): number {
  return p.tipo === "UNIDADES_GALENO" ? p.valor : (UNIDADES_POR_NIVEL[p.valor] ?? 0);
}
