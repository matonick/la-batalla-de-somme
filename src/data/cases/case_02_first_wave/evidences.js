export default [
  {
    id: "ev_case02_official_bulletin",
    caseId: "case_02_first_wave",
    title: "Parte oficial de la mañana",
    type: "document",
    description:
      "Circular breve del mando. Describe la primera oleada como un avance firme, ejecutado con disciplina y sin mencionar el volumen real de bajas.",
    summary:
      "El parte construye una imagen ordenada y optimista de la ofensiva inicial.",
    source: "Puesto de mando de sector",
    reliability: "media",
    locationId: "loc_command",
    discovered: false,
    hidden: false,
    sourceFlags: ["oficial", "propaganda", "incompleta"],
    sourceLinks: [
      { evidenceId: "ev_case02_official_bulletin", sourceId: "src_case02_press_censorship", relationType: "contexto", confidence: "alta" }
    ]
  },
  {
    id: "ev_case02_torn_whistle",
    caseId: "case_02_first_wave",
    title: "Silbato partido del oficial de sección",
    type: "object",
    description:
      "Silbato metálico abollado, con barro seco y una cinta rota. Fue recogido cerca del parapeto desde donde salió la primera oleada.",
    summary:
      "El objeto conecta el inicio reglado del avance con el desastre inmediato que relatan los supervivientes.",
    source: "Borde de la trinchera de salida",
    reliability: "alta",
    locationId: "loc_front_trench",
    discovered: false,
    hidden: false,
    sourceFlags: ["material", "primera_oleada"],
    sourceLinks: [
      { evidenceId: "ev_case02_torn_whistle", sourceId: "src_case02_first_day_somme", relationType: "contexto", confidence: "media" }
    ]
  },
  {
    id: "ev_case02_casualty_sheet",
    caseId: "case_02_first_wave",
    title: "Hoja parcial de bajas",
    type: "document",
    description:
      "Lista manuscrita del puesto médico. Registra heridos y muertos antes del mediodía, con varios nombres repetidos como no identificados.",
    summary:
      "La escala de bajas contradice el tono contenido del parte oficial.",
    source: "Mesa de clasificación del puesto médico",
    reliability: "alta",
    locationId: "loc_medical",
    discovered: false,
    hidden: false,
    sourceFlags: ["médica", "bajas", "contradictoria"],
    sourceLinks: [
      { evidenceId: "ev_case02_casualty_sheet", sourceId: "src_case02_medical_evacuation", relationType: "contexto", confidence: "alta" }
    ]
  },
  {
    id: "ev_case02_survivor_map",
    caseId: "case_02_first_wave",
    title: "Mapa marcado por supervivientes",
    type: "document",
    description:
      "Mapa pequeño con cruces hechas a lápiz. Las marcas señalan dónde cayeron grupos de soldados mucho antes de llegar al objetivo indicado.",
    summary:
      "El mapa muestra que la línea de avance real fue menor de lo que sostiene el parte.",
    source: "Bolsa de un sargento evacuado",
    reliability: "alta",
    locationId: "loc_support_trench",
    discovered: false,
    hidden: false,
    sourceFlags: ["mapa", "testimonio", "contradictoria"],
    sourceLinks: [
      { evidenceId: "ev_case02_survivor_map", sourceId: "src_case02_first_day_somme", relationType: "contexto", confidence: "alta" }
    ]
  },
  {
    id: "ev_case02_field_dressing",
    caseId: "case_02_first_wave",
    title: "Venda de campaña empapada",
    type: "object",
    description:
      "Venda militar endurecida por barro y sangre. Tiene una inicial escrita con lápiz, casi borrada por la humedad.",
    summary:
      "La venda permite conectar la experiencia médica con el relato de los heridos que no pudieron ser evacuados a tiempo.",
    source: "Entrada del puesto de socorro",
    reliability: "media",
    locationId: "loc_medical",
    discovered: false,
    hidden: false,
    sourceFlags: ["material", "médica", "humana"],
    sourceLinks: [
      { evidenceId: "ev_case02_field_dressing", sourceId: "src_case02_medical_evacuation", relationType: "contexto", confidence: "media" }
    ]
  }
];
