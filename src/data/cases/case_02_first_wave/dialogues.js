export default [
  {
    id: "dlg_case02_briggs_start",
    npcId: "npc_case02_private_briggs",
    text:
      "Alfred Briggs mira hacia el parapeto como si todavía tuviera que cruzarlo. 'El silbato sonó y salimos. No vi avance. Vi hombres cayendo antes de que el humo se abriera.'",
    choices: [
      {
        id: "choice_case02_briggs_gentle",
        label: "Hablarle con calma y pedirle que reconstruya los primeros minutos.",
        conditions: [
          { type: "NOT_FLAG", value: "case02_briggs_spoken_gently" },
          { type: "NOT_FLAG", value: "case02_briggs_pressured" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case02_briggs_spoken_gently" } },
          { type: "FACTION_MEMORY", payload: { faction: "soldiers", amount: 1 } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Briggs afirma que muchos soldados cayeron antes de alcanzar la primera referencia de avance marcada en los mapas.",
              relatedEvidenceIds: [],
              tags: ["case_02_first_wave", "survivor_testimony"]
            }
          }
        ],
        nextDialogueId: "dlg_case02_briggs_gentle"
      },
      {
        id: "choice_case02_briggs_pressure",
        label: "Presionarlo para que diga si la oleada fracasó por completo.",
        conditions: [
          { type: "NOT_FLAG", value: "case02_briggs_pressured" },
          { type: "NOT_FLAG", value: "case02_briggs_spoken_gently" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case02_briggs_pressured" } },
          { type: "STRESS", payload: { amount: 3, reason: "testimonio_forzado", eventType: "screams" } },
          { type: "FACTION_MEMORY", payload: { faction: "soldiers", amount: -1 } }
        ],
        nextDialogueId: "dlg_case02_briggs_gentle"
      },
      {
        id: "choice_case02_briggs_show_whistle",
        label: "Mostrarle el silbato partido.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case02_torn_whistle" },
          { type: "NOT_FLAG", value: "case02_briggs_saw_whistle" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case02_briggs_saw_whistle" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Briggs reconoce el silbato de salida y lo asocia con el momento en que la oleada dejó la trinchera bajo fuego intenso.",
              relatedEvidenceIds: ["ev_case02_torn_whistle"],
              tags: ["case_02_first_wave", "whistle"]
            }
          }
        ],
        nextDialogueId: "dlg_case02_briggs_whistle"
      }
    ]
  },
  {
    id: "dlg_case02_briggs_gentle",
    npcId: "npc_case02_private_briggs",
    text:
      "'Nos dijeron que camináramos, que la artillería había hecho su trabajo. Pero las balas ya estaban esperando. El suelo se abrió de gritos, no de victoria.'",
    choices: [
      {
        id: "choice_case02_briggs_close",
        label: "Anotar el testimonio y dejarlo descansar.",
        closeAfterEffect: true,
        effects: [
          { type: "SET_FLAG", payload: { id: "case02_briggs_interview_complete" } }
        ]
      }
    ]
  },
  {
    id: "dlg_case02_briggs_whistle",
    npcId: "npc_case02_private_briggs",
    text:
      "Briggs traga saliva. 'Ese sonido nos levantó a todos. Si el parte dice que avanzamos firmes, pregúntele cuántos pasos cuenta como avance.'",
    choices: [
      {
        id: "choice_case02_briggs_register_contradiction",
        label: "Relacionar su testimonio con el parte oficial.",
        conditions: [{ type: "HAS_EVIDENCE", value: "ev_case02_official_bulletin" }],
        closeAfterEffect: true,
        effects: [
          {
            type: "ADD_CONTRADICTION",
            payload: {
              id: "con_case02_briggs_vs_bulletin",
              title: "Superviviente contra parte oficial",
              description:
                "Briggs describe una caída inmediata bajo fuego, mientras el parte oficial habla de avance disciplinado y sostenido.",
              evidenceIds: ["ev_case02_official_bulletin", "ev_case02_torn_whistle"],
              severity: "alta"
            }
          }
        ]
      }
    ]
  },
  {
    id: "dlg_case02_wilcox_start",
    npcId: "npc_case02_captain_wilcox",
    text:
      "El capitán Wilcox sostiene un papel doblado. 'La operación continúa. Su tarea no es pesar cadáveres, sino informar sin quebrar la moral.'",
    choices: [
      {
        id: "choice_case02_wilcox_request_bulletin",
        label: "Pedir una copia del parte oficial.",
        conditions: [{ type: "NOT_HAS_EVIDENCE", value: "ev_case02_official_bulletin" }],
        nextDialogueId: "dlg_case02_wilcox_bulletin"
      },
      {
        id: "choice_case02_wilcox_confront_casualties",
        label: "Confrontarlo con la hoja de bajas y el mapa marcado.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case02_casualty_sheet" },
          { type: "HAS_EVIDENCE", value: "ev_case02_survivor_map" },
          { type: "NOT_FLAG", value: "case02_wilcox_confronted" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case02_wilcox_confronted" } },
          { type: "FACTION_MEMORY", payload: { faction: "officers", amount: -1 } },
          {
            type: "ADD_CONTRADICTION",
            payload: {
              id: "con_case02_wilcox_vs_records",
              title: "Mando contra registros de campo",
              description:
                "La hoja de bajas y el mapa de los supervivientes contradicen el tono optimista del parte sectorial.",
              evidenceIds: ["ev_case02_official_bulletin", "ev_case02_casualty_sheet", "ev_case02_survivor_map"],
              severity: "alta"
            }
          }
        ],
        nextDialogueId: "dlg_case02_wilcox_confronted"
      }
    ]
  },
  {
    id: "dlg_case02_wilcox_bulletin",
    npcId: "npc_case02_captain_wilcox",
    text:
      "'Tome la copia. Es suficiente para Londres y debería ser suficiente para usted. Las cifras completas llegarán cuando corresponda.'",
    choices: [
      {
        id: "choice_case02_wilcox_note_bulletin",
        label: "Anotar que el parte evita cifras concretas.",
        closeAfterEffect: true,
        effects: [
          {
            type: "ADD_NOTE",
            payload: {
              text: "Wilcox entrega el parte, pero evita hablar de cifras de bajas y usa el argumento de la moral.",
              relatedEvidenceIds: ["ev_case02_official_bulletin"],
              tags: ["case_02_first_wave", "official_language"]
            }
          }
        ]
      }
    ]
  },
  {
    id: "dlg_case02_wilcox_confronted",
    npcId: "npc_case02_captain_wilcox",
    text:
      "Wilcox baja la voz. 'Un mapa hecho por hombres aterrados no es una verdad militar. Y una lista médica no explica una batalla.'",
    choices: [
      {
        id: "choice_case02_wilcox_close_confronted",
        label: "Cerrar la entrevista sin retirar la contradicción.",
        closeAfterEffect: true,
        effects: [
          { type: "SET_FLAG", payload: { id: "case02_officers_wary" } }
        ]
      }
    ]
  },
  {
    id: "dlg_case02_owen_start",
    npcId: "npc_case02_sister_mary_owen",
    text:
      "Mary Owen limpia una mesa que vuelve a mancharse enseguida. 'Si busca la primera oleada, mire las camillas. Llegaron antes que las buenas noticias.'",
    choices: [
      {
        id: "choice_case02_owen_ask_casualties",
        label: "Preguntar por la hoja parcial de bajas.",
        conditions: [{ type: "NOT_FLAG", value: "case02_owen_told_casualties" }],
        effects: [
          { type: "SET_FLAG", payload: { id: "case02_owen_told_casualties" } },
          { type: "FACTION_MEMORY", payload: { faction: "medics", amount: 1 } }
        ],
        nextDialogueId: "dlg_case02_owen_casualties"
      },
      {
        id: "choice_case02_owen_show_dressing",
        label: "Mostrarle la venda de campaña empapada.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case02_field_dressing" },
          { type: "NOT_FLAG", value: "case02_owen_saw_dressing" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case02_owen_saw_dressing" } }
        ],
        nextDialogueId: "dlg_case02_owen_dressing"
      }
    ]
  },
  {
    id: "dlg_case02_owen_casualties",
    npcId: "npc_case02_sister_mary_owen",
    text:
      "'La lista no está completa. Eso es lo peor. Lo que ve ahí no es todo el desastre, apenas lo que alcanzamos a escribir antes de que llegara otra camilla.'",
    choices: [
      {
        id: "choice_case02_owen_register_note",
        label: "Registrar que la lista es parcial y aun así contradice el parte.",
        closeAfterEffect: true,
        effects: [
          {
            type: "ADD_NOTE",
            payload: {
              text: "Mary Owen advierte que la hoja de bajas es parcial, pero ya muestra una escala que el parte oficial omite.",
              relatedEvidenceIds: ["ev_case02_casualty_sheet"],
              tags: ["case_02_first_wave", "medical_record"]
            }
          }
        ]
      }
    ]
  },
  {
    id: "dlg_case02_owen_dressing",
    npcId: "npc_case02_sister_mary_owen",
    text:
      "'Cada venda trae una historia que nadie quiere leer. Esta llegó con un hombre que repetía que no habían pasado del alambre roto.'",
    choices: [
      {
        id: "choice_case02_owen_dressing_note",
        label: "Anotar la relación entre heridos y avance limitado.",
        closeAfterEffect: true,
        effects: [
          {
            type: "ADD_NOTE",
            payload: {
              text: "Una venda recogida en el puesto de socorro queda asociada a testimonios de avance mínimo y evacuación difícil.",
              relatedEvidenceIds: ["ev_case02_field_dressing"],
              tags: ["case_02_first_wave", "wounded_testimony"]
            }
          }
        ]
      }
    ]
  },
  {
    id: "dlg_case02_mcallister_start",
    npcId: "npc_case02_sergeant_mcallister",
    text:
      "El sargento McAllister observa el mapa marcado. 'No hice esas cruces para llorar. Las hice para que alguien dejara de inventar distancias.'",
    choices: [
      {
        id: "choice_case02_mcallister_ask_map",
        label: "Preguntar por el mapa marcado.",
        conditions: [{ type: "HAS_EVIDENCE", value: "ev_case02_survivor_map" }],
        nextDialogueId: "dlg_case02_mcallister_map"
      },
      {
        id: "choice_case02_mcallister_reassure",
        label: "Decirle que buscás ubicar hechos, no acusar a los hombres.",
        conditions: [{ type: "NOT_FLAG", value: "case02_mcallister_reassured" }],
        effects: [
          { type: "SET_FLAG", payload: { id: "case02_mcallister_reassured" } },
          { type: "FACTION_MEMORY", payload: { faction: "soldiers", amount: 1 } }
        ],
        nextDialogueId: "dlg_case02_mcallister_admission"
      }
    ]
  },
  {
    id: "dlg_case02_mcallister_map",
    npcId: "npc_case02_sergeant_mcallister",
    text:
      "'Cada cruz es un grupo que vi caer. Si el mando dice que llegamos más allá, que me diga quién volvió para confirmarlo.'",
    choices: [
      {
        id: "choice_case02_mcallister_map_contradiction",
        label: "Registrar la contradicción entre mapa y parte.",
        conditions: [{ type: "HAS_EVIDENCE", value: "ev_case02_official_bulletin" }],
        closeAfterEffect: true,
        effects: [
          {
            type: "ADD_CONTRADICTION",
            payload: {
              id: "con_case02_map_vs_bulletin",
              title: "Mapa de supervivientes contra parte oficial",
              description:
                "Las marcas del mapa ubican la mayoría de caídas antes del supuesto avance sostenido informado por el mando.",
              evidenceIds: ["ev_case02_official_bulletin", "ev_case02_survivor_map"],
              severity: "alta"
            }
          }
        ]
      }
    ]
  },
  {
    id: "dlg_case02_mcallister_admission",
    npcId: "npc_case02_sergeant_mcallister",
    text:
      "'No hubo cobardía. Hubo hombres caminando hacia armas que seguían vivas. Eso no entra limpio en un parte.'",
    choices: [
      {
        id: "choice_case02_mcallister_admission_note",
        label: "Registrar su interpretación de la primera oleada.",
        closeAfterEffect: true,
        effects: [
          {
            type: "ADD_NOTE",
            payload: {
              text: "McAllister insiste en que el fracaso de la oleada no debe atribuirse a cobardía, sino a defensas enemigas todavía operativas.",
              relatedEvidenceIds: ["ev_case02_survivor_map"],
              tags: ["case_02_first_wave", "no_cowardice"]
            }
          },
          { type: "SET_FLAG", payload: { id: "case02_mcallister_defends_men" } }
        ]
      }
    ]
  }
];
