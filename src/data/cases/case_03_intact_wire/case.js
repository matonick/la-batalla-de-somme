export default {
  id: "case_03_intact_wire",
  title: "El Alambre Intacto",
  summary:
    "El corresponsal investiga por qué una compañía quedó detenida frente a una alambrada alemana que debía haber sido destruida por el bombardeo preliminar. El parte de artillería habla de objetivos cumplidos, pero los supervivientes, un mapa de observación y restos de proyectiles sugieren una verdad incómoda.",
  historicalContext:
    "Somme, 1 de julio de 1916. Antes del avance, el mando británico esperaba que la artillería cortara el alambre de púas y dañara las defensas alemanas. En muchos sectores, sin embargo, el bombardeo no cumplió esos objetivos y los soldados encontraron obstáculos intactos bajo fuego de ametralladora.",
  availableFromDay: 1,
  availableUntilDay: 3,
  priority: "alta",
  urgency: "urgente",
  category: "main",
  status: "active",

  timeline: {
    startDate: "1916-07-01",
    endDate: "1916-07-02",
    startTime: "09:15",
    deadlineTime: "18:30",
    moment: "después de la primera oleada",
    historicalPhase: "ofensiva inicial del Somme"
  },

  activation: {
    visibleFromStart: true,
    autoActivate: false,
    requiresCaseIds: ["case_02_first_wave"],
    requiresEvidenceIds: []
  },

  objectives: [
    {
      id: "obj_case03_read_artillery_report",
      label: "Leer el informe de artillería sobre el corte del alambre.",
      completed: false
    },
    {
      id: "obj_case03_inspect_wire",
      label: "Inspeccionar evidencias físicas cerca de la alambrada alemana.",
      completed: false
    },
    {
      id: "obj_case03_question_witnesses",
      label: "Contrastar el informe oficial con testigos de infantería, artillería y observación.",
      completed: false
    },
    {
      id: "obj_case03_prepare_article",
      label: "Redactar una crónica sobre el fallo del bombardeo preliminar.",
      completed: false
    }
  ],

  evidenceIds: [
    "ev_case03_artillery_report",
    "ev_case03_intact_wire_fragment",
    "ev_case03_dud_shell",
    "ev_case03_observer_sketch",
    "ev_case03_bloodied_wire_cutter"
  ],

  npcIds: [
    "npc_case03_lance_corporal_harris",
    "npc_case03_lieutenant_finch",
    "npc_case03_gunner_reeves",
    "npc_case03_observer_miles"
  ],

  dialogueIds: [
    "dlg_case03_harris_start",
    "dlg_case03_harris_wire",
    "dlg_case03_harris_cutter",
    "dlg_case03_finch_start",
    "dlg_case03_finch_report",
    "dlg_case03_finch_confronted",
    "dlg_case03_reeves_start",
    "dlg_case03_reeves_shell",
    "dlg_case03_reeves_admission",
    "dlg_case03_miles_start",
    "dlg_case03_miles_sketch",
    "dlg_case03_miles_conclusion"
  ],

  entityIds: [
    "ent_case03_lance_corporal_harris",
    "ent_case03_lieutenant_finch",
    "ent_case03_gunner_reeves",
    "ent_case03_observer_miles",
    "ent_case03_artillery_report",
    "ent_case03_intact_wire_fragment",
    "ent_case03_dud_shell",
    "ent_case03_observer_sketch",
    "ent_case03_bloodied_wire_cutter"
  ],

  sourceIds: [
    "src_case03_iwm_somme_what_happened",
    "src_case03_nam_battle_somme",
    "src_case03_canadian_war_museum_somme",
    "src_case03_long_long_trail_bombardment"
  ],

  contradictionRules: [
    {
      id: "auto_case03_report_vs_wire",
      title: "Informe de artillería contra alambre intacto",
      evidenceIds: ["ev_case03_artillery_report", "ev_case03_intact_wire_fragment"],
      description:
        "El informe afirma que el alambre fue cortado, pero el fragmento recuperado conserva líneas tensas y estacas firmes."
    },
    {
      id: "auto_case03_report_vs_dud_shell",
      title: "Bombardeo eficaz contra proyectil sin detonar",
      evidenceIds: ["ev_case03_artillery_report", "ev_case03_dud_shell"],
      description:
        "El informe presupone eficacia del bombardeo, mientras que el proyectil sin detonar sugiere fallos materiales en el fuego preliminar."
    },
    {
      id: "auto_case03_report_vs_observer_sketch",
      title: "Objetivo cumplido contra croquis del observador",
      evidenceIds: ["ev_case03_artillery_report", "ev_case03_observer_sketch"],
      description:
        "El croquis señala sectores enteros de alambre sin cortes, contradiciendo la evaluación oficial."
    },
    {
      id: "auto_case03_wire_vs_cutter",
      title: "Alambre intacto contra cortaalambres ensangrentado",
      evidenceIds: ["ev_case03_intact_wire_fragment", "ev_case03_bloodied_wire_cutter"],
      description:
        "La herramienta hallada en tierra de nadie indica que algunos soldados intentaron cortar manualmente lo que la artillería no había abierto."
    }
  ]
};
