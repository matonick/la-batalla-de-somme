export default {
  id: "case_04_overflowing_hospital",
  title: "El Hospital Desbordado",
  summary:
    "Tras la primera oleada, un puesto médico de campaña queda saturado por heridos que llegan sin pausa. El parte oficial habla de evacuación ordenada, pero las camillas vacías, las vendas reutilizadas y una lista incompleta revelan una crisis que nadie quiere reconocer.",
  historicalContext:
    "Somme, primeros días de julio de 1916. La enorme cantidad de bajas puso a prueba la cadena de evacuación médica: camilleros, puestos de socorro, ambulancias de campaña, estaciones de evacuación y hospitales de retaguardia. Entre el barro, el fuego de artillería y la falta de transporte, muchos heridos esperaron demasiado tiempo.",
  availableFromDay: 4,
  availableUntilDay: 7,
  priority: "alta",
  urgency: "urgente",
  category: "main",
  status: "available",

  timeline: {
    startDate: "1916-07-04",
    endDate: "1916-07-04",
    startTime: "06:20",
    deadlineTime: "21:00",
    moment: "amanecer",
    historicalPhase: "consecuencias humanas de la ofensiva inicial del Somme"
  },

  activation: {
    visibleFromStart: true,
    autoActivate: false,
    requiresCaseIds: [],
    requiresEvidenceIds: []
  },

  objectives: [
    {
      id: "obj_case04_inspect_station",
      label: "Examinar el puesto médico y sus suministros agotados.",
      completed: false
    },
    {
      id: "obj_case04_compare_records",
      label: "Comparar la lista oficial de heridos con los registros del personal sanitario.",
      completed: false
    },
    {
      id: "obj_case04_interview_staff",
      label: "Entrevistar a camilleros, enfermería y mando antes de redactar el artículo.",
      completed: false
    }
  ],

  evidenceIds: [
    "ev_case04_official_evacuation_report",
    "ev_case04_overcrowded_ward_list",
    "ev_case04_reused_bandages",
    "ev_case04_morphine_shortage_tag",
    "ev_case04_stretcher_broken",
    "ev_case04_unregistered_wounded_note"
  ],
  npcIds: [
    "npc_case04_nurse_margaret_hale",
    "npc_case04_stretcher_bearer_owen_price",
    "npc_case04_surgeon_captain_miles",
    "npc_case04_private_alfie_brooks",
    "npc_case04_quartermaster_dawson"
  ],
  dialogueIds: [
    "dlg_case04_margaret_start",
    "dlg_case04_margaret_lists",
    "dlg_case04_margaret_supplies",
    "dlg_case04_owen_start",
    "dlg_case04_owen_route",
    "dlg_case04_miles_start",
    "dlg_case04_miles_confronted",
    "dlg_case04_alfie_start",
    "dlg_case04_alfie_named",
    "dlg_case04_dawson_start",
    "dlg_case04_dawson_shortage"
  ],
  entityIds: [
    "ent_case04_nurse_margaret_hale",
    "ent_case04_stretcher_bearer_owen_price",
    "ent_case04_surgeon_captain_miles",
    "ent_case04_private_alfie_brooks",
    "ent_case04_quartermaster_dawson",
    "ent_case04_official_evacuation_report",
    "ent_case04_overcrowded_ward_list",
    "ent_case04_reused_bandages",
    "ent_case04_morphine_shortage_tag",
    "ent_case04_stretcher_broken",
    "ent_case04_unregistered_wounded_note"
  ],
  sourceIds: [
    "src_case04_iwm_medicine",
    "src_case04_nam_somme",
    "src_case04_evacuation_chain",
    "src_case04_scarletfinders_july1916"
  ],

  notes: [],
  contradictions: [
    {
      id: "con_case04_orderly_evacuation_vs_overflow",
      title: "Evacuación ordenada o puesto colapsado",
      description:
        "El parte oficial afirma que la evacuación funcionó sin interrupciones, pero la lista de sala y los testimonios describen un puesto médico saturado.",
      evidenceIds: [
        "ev_case04_official_evacuation_report",
        "ev_case04_overcrowded_ward_list"
      ]
    },
    {
      id: "con_case04_supplies_available_vs_shortage",
      title: "Suministros suficientes o agotados",
      description:
        "El intendente afirma que se entregaron suministros suficientes, pero las vendas reutilizadas y la etiqueta de morfina contradicen esa versión.",
      evidenceIds: [
        "ev_case04_reused_bandages",
        "ev_case04_morphine_shortage_tag"
      ]
    },
    {
      id: "con_case04_registered_vs_unregistered_wounded",
      title: "Heridos registrados o invisibles",
      description:
        "El conteo oficial no incluye a varios heridos que fueron atendidos en el suelo antes de ser evacuados o morir.",
      evidenceIds: [
        "ev_case04_overcrowded_ward_list",
        "ev_case04_unregistered_wounded_note"
      ]
    }
  ],

  hypotheses: [
    {
      id: "hyp_case04_logistical_collapse",
      title: "La cadena médica fue superada por la magnitud de las bajas",
      description:
        "La crisis no parece causada por una sola persona, sino por una ofensiva que produjo más heridos de los que el sistema podía evacuar y tratar a tiempo.",
      requiredEvidenceIds: [
        "ev_case04_overcrowded_ward_list",
        "ev_case04_stretcher_broken",
        "ev_case04_reused_bandages"
      ]
    },
    {
      id: "hyp_case04_report_sanitized",
      title: "El parte suavizó deliberadamente el colapso",
      description:
        "El informe oficial omitió esperas, escasez y heridos sin registrar para proteger la imagen de control del mando.",
      requiredEvidenceIds: [
        "ev_case04_official_evacuation_report",
        "ev_case04_unregistered_wounded_note",
        "ev_case04_morphine_shortage_tag"
      ]
    }
  ],

  articleOptions: [
    {
      id: "article_case04_human_cost",
      title: "No alcanzaron las camillas",
      stance: "humanitaria",
      requiredEvidenceIds: [
        "ev_case04_overcrowded_ward_list",
        "ev_case04_stretcher_broken",
        "ev_case04_unregistered_wounded_note"
      ],
      risk: "medio",
      effectSummary:
        "Aumenta la confianza de soldados y sanitarios, pero incomoda al mando al mostrar la dimensión humana del desastre."
    },
    {
      id: "article_case04_official_order",
      title: "La evacuación bajo presión",
      stance: "prudente",
      requiredEvidenceIds: [
        "ev_case04_official_evacuation_report",
        "ev_case04_overcrowded_ward_list"
      ],
      risk: "bajo",
      effectSummary:
        "Permite publicar una versión menos conflictiva, aunque deja sin resolver la omisión de heridos no registrados."
    },
    {
      id: "article_case04_covered_shortage",
      title: "Los nombres que no entraron en la lista",
      stance: "crítica",
      requiredEvidenceIds: [
        "ev_case04_unregistered_wounded_note",
        "ev_case04_morphine_shortage_tag",
        "ev_case04_reused_bandages"
      ],
      risk: "alto",
      effectSummary:
        "Denuncia que el puesto médico fue desbordado y que el parte oficial ocultó escasez y muertes invisibles."
    }
  ],

  completion: {
    requiredEvidenceCount: 4,
    requiredNpcInteractions: 3,
    requiredContradictions: ["con_case04_orderly_evacuation_vs_overflow"],
    allowsArticleDraft: true
  },

  tags: ["Somme", "medicina", "heridos", "evacuación", "hospital de campaña", "julio 1916"]
};
