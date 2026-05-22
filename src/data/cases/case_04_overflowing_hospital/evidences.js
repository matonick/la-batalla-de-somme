export default [
  {
    id: "ev_case04_official_evacuation_report",
    caseId: "case_04_overflowing_hospital",
    title: "Parte oficial de evacuación",
    type: "document",
    description:
      "Informe breve que sostiene que los heridos fueron clasificados y trasladados con normalidad hacia retaguardia.",
    summary:
      "El documento presenta una evacuación ordenada, sin mencionar demoras graves ni falta de suministros.",
    source: "Mesa del cirujano jefe",
    reliability: "media",
    locationId: "loc_case04_surgery_table",
    discovered: false,
    hidden: false,
    sourceFlags: ["oficial", "incompleta", "censurable"],
    sourceLinks: [
      { evidenceId: "ev_case04_official_evacuation_report", sourceId: "src_case04_nam_somme", relationType: "contexto", confidence: "media" }
    ]
  },
  {
    id: "ev_case04_overcrowded_ward_list",
    caseId: "case_04_overflowing_hospital",
    title: "Lista de sala saturada",
    type: "document",
    description:
      "Hoja de enfermería con nombres escritos al margen, horas corregidas y marcas que indican pacientes esperando sobre mantas en el suelo.",
    summary:
      "La lista muestra más heridos que camas disponibles y contradice la idea de un flujo ordenado.",
    source: "Tablón del área de clasificación",
    reliability: "alta",
    locationId: "loc_case04_triage_board",
    discovered: false,
    hidden: false,
    sourceFlags: ["sanitaria", "contradictoria", "nombres"],
    sourceLinks: [
      { evidenceId: "ev_case04_overcrowded_ward_list", sourceId: "src_case04_iwm_medicine", relationType: "contexto", confidence: "alta" },
      { evidenceId: "ev_case04_overcrowded_ward_list", sourceId: "src_case04_scarletfinders_july1916", relationType: "inspirada_en", confidence: "media" }
    ]
  },
  {
    id: "ev_case04_reused_bandages",
    caseId: "case_04_overflowing_hospital",
    title: "Vendas lavadas y reutilizadas",
    type: "object",
    description:
      "Un cubo con vendas endurecidas por barro y sangre. Algunas fueron lavadas apresuradamente y vueltas a usar.",
    summary:
      "Las vendas sugieren escasez material y presión extrema sobre el personal médico.",
    source: "Rincón trasero del puesto médico",
    reliability: "alta",
    locationId: "loc_case04_supply_corner",
    discovered: false,
    hidden: false,
    sourceFlags: ["material", "escasez", "sanidad"],
    sourceLinks: [
      { evidenceId: "ev_case04_reused_bandages", sourceId: "src_case04_iwm_medicine", relationType: "contexto", confidence: "media" }
    ]
  },
  {
    id: "ev_case04_morphine_shortage_tag",
    caseId: "case_04_overflowing_hospital",
    title: "Etiqueta de morfina agotada",
    type: "object",
    description:
      "Etiqueta atada a una caja vacía: 'morfina reservada para cirugía urgente'. La anotación posterior dice 'agotada antes del mediodía'.",
    summary:
      "La caja vacía contradice la afirmación de que los suministros críticos alcanzaron para la jornada.",
    source: "Depósito pequeño junto a la carpa quirúrgica",
    reliability: "alta",
    locationId: "loc_case04_medicine_crate",
    discovered: false,
    hidden: false,
    sourceFlags: ["material", "dolor", "escasez"],
    sourceLinks: [
      { evidenceId: "ev_case04_morphine_shortage_tag", sourceId: "src_case04_evacuation_chain", relationType: "contexto", confidence: "media" }
    ]
  },
  {
    id: "ev_case04_stretcher_broken",
    caseId: "case_04_overflowing_hospital",
    title: "Camilla rota junto al barro",
    type: "object",
    description:
      "Camilla con una vara quebrada y correas sueltas. Tiene barro seco en un extremo, como si hubiera sido arrastrada durante horas.",
    summary:
      "La camilla dañada muestra que el traslado de heridos fue lento, físico y precario.",
    source: "Entrada embarrada del puesto de socorro",
    reliability: "alta",
    locationId: "loc_case04_muddy_entrance",
    discovered: false,
    hidden: false,
    sourceFlags: ["material", "camilleros", "barro"],
    sourceLinks: [
      { evidenceId: "ev_case04_stretcher_broken", sourceId: "src_case04_evacuation_chain", relationType: "contexto", confidence: "alta" }
    ]
  },
  {
    id: "ev_case04_unregistered_wounded_note",
    caseId: "case_04_overflowing_hospital",
    title: "Nota de heridos sin registrar",
    type: "document",
    description:
      "Papel escondido bajo una tablilla. Enumera cinco heridos atendidos en el suelo, con dos nombres señalados como 'sin pulsera' y uno como 'evacuado sin ficha'.",
    summary:
      "La nota indica que el registro oficial dejó fuera a varios hombres durante la saturación del puesto.",
    source: "Debajo de una caja de instrumental",
    reliability: "alta",
    locationId: "loc_case04_hidden_note",
    discovered: false,
    hidden: false,
    sourceFlags: ["oculta", "nombres", "contradictoria"],
    sourceLinks: [
      { evidenceId: "ev_case04_unregistered_wounded_note", sourceId: "src_case04_iwm_medicine", relationType: "contexto", confidence: "media" },
      { evidenceId: "ev_case04_unregistered_wounded_note", sourceId: "src_case04_scarletfinders_july1916", relationType: "inspirada_en", confidence: "media" }
    ]
  }
];
