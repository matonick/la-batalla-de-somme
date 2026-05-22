export default {
  id: "case_02_first_wave",
  title: "La Primera Oleada",
  summary:
    "El corresponsal reconstruye las primeras horas del 1 de julio de 1916. El parte oficial habla de avance ordenado y espíritu elevado, pero los supervivientes, los objetos recogidos en tierra de nadie y los registros médicos muestran una catástrofe mucho más difícil de publicar.",
  historicalContext:
    "Somme, 1 de julio de 1916. El primer día de la ofensiva británica produjo una cantidad enorme de bajas. La distancia entre el lenguaje de los partes oficiales y la experiencia de los soldados abre el conflicto central del caso.",
  availableFromDay: 1,
  availableUntilDay: 3,
  priority: "alta",
  urgency: "urgente",
  category: "main",
  status: "active",

  timeline: {
    startDate: "1916-07-01",
    endDate: "1916-07-01",
    startTime: "07:30",
    deadlineTime: "20:00",
    moment: "mañana y tarde",
    historicalPhase: "primer día de la ofensiva del Somme"
  },

  activation: {
    visibleFromStart: true,
    autoActivate: true,
    requiresCaseIds: [],
    requiresEvidenceIds: []
  },

  objectives: [
    {
      id: "obj_case02_read_official_bulletin",
      label: "Leer el parte oficial sobre la primera oleada.",
      completed: false
    },
    {
      id: "obj_case02_question_survivors",
      label: "Contrastar el parte con testimonios de supervivientes y personal médico.",
      completed: false
    },
    {
      id: "obj_case02_find_physical_evidence",
      label: "Reunir evidencias físicas de tierra de nadie.",
      completed: false
    },
    {
      id: "obj_case02_prepare_article",
      label: "Preparar una crónica fundada sobre lo ocurrido durante la primera oleada.",
      completed: false
    }
  ],

  evidenceIds: [
    "ev_case02_official_bulletin",
    "ev_case02_torn_whistle",
    "ev_case02_casualty_sheet",
    "ev_case02_survivor_map",
    "ev_case02_field_dressing"
  ],
  npcIds: [
    "npc_case02_private_briggs",
    "npc_case02_captain_wilcox",
    "npc_case02_sister_mary_owen",
    "npc_case02_sergeant_mcallister"
  ],
  dialogueIds: [
    "dlg_case02_briggs_start",
    "dlg_case02_briggs_gentle",
    "dlg_case02_briggs_whistle",
    "dlg_case02_wilcox_start",
    "dlg_case02_wilcox_bulletin",
    "dlg_case02_wilcox_confronted",
    "dlg_case02_owen_start",
    "dlg_case02_owen_casualties",
    "dlg_case02_owen_dressing",
    "dlg_case02_mcallister_start",
    "dlg_case02_mcallister_map",
    "dlg_case02_mcallister_admission"
  ],
  entityIds: [
    "ent_case02_private_briggs",
    "ent_case02_captain_wilcox",
    "ent_case02_sister_mary_owen",
    "ent_case02_sergeant_mcallister",
    "ent_case02_official_bulletin",
    "ent_case02_torn_whistle",
    "ent_case02_casualty_sheet",
    "ent_case02_survivor_map",
    "ent_case02_field_dressing"
  ],
  sourceIds: [
    "src_case02_first_day_somme",
    "src_case02_press_censorship",
    "src_case02_medical_evacuation"
  ],

  contradictionRules: [
    {
      id: "auto_case02_bulletin_vs_casualty_sheet",
      title: "Parte optimista contra lista de bajas",
      evidenceIds: ["ev_case02_official_bulletin", "ev_case02_casualty_sheet"],
      description:
        "El parte habla de avance sostenido, pero la lista médica muestra pérdidas masivas desde las primeras horas."
    },
    {
      id: "auto_case02_bulletin_vs_survivor_map",
      title: "Avance declarado contra mapa del superviviente",
      evidenceIds: ["ev_case02_official_bulletin", "ev_case02_survivor_map"],
      description:
        "El mapa marcado por los soldados ubica los cuerpos mucho antes de la línea que el parte presenta como alcanzada."
    },
    {
      id: "auto_case02_bulletin_vs_whistle",
      title: "Orden de avance contra silbato roto",
      evidenceIds: ["ev_case02_official_bulletin", "ev_case02_torn_whistle"],
      description:
        "El silbato de la primera oleada funciona como indicio material de una salida ordenada hacia una zona ya barrida por fuego enemigo."
    }
  ]
};
