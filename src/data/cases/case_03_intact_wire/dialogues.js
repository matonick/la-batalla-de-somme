export default [
  {
    id: "dlg_case03_harris_start",
    npcId: "npc_case03_lance_corporal_harris",
    text:
      "Thomas Harris se toca una manga rota por las púas. 'Nos dijeron que habría huecos. Cuando llegamos, el alambre seguía allí. No era una línea: era una pared.'",
    choices: [
      {
        id: "choice_case03_harris_ask_wire",
        label: "Pedirle que describa el estado del alambre.",
        conditions: [
          { type: "NOT_FLAG", value: "case03_harris_described_wire" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_harris_described_wire" } },
          { type: "FACTION_MEMORY", payload: { faction: "soldiers", amount: 1 } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Harris afirma que la compañía encontró alambradas casi intactas y quedó detenida bajo fuego antes de alcanzar la trinchera alemana.",
              relatedEvidenceIds: [],
              tags: ["case_03_intact_wire", "testimonio", "alambre"]
            }
          }
        ],
        nextDialogueId: "dlg_case03_harris_wire"
      },
      {
        id: "choice_case03_harris_show_cutter",
        label: "Mostrarle el cortaalambres ensangrentado.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case03_bloodied_wire_cutter" },
          { type: "NOT_FLAG", value: "case03_harris_saw_cutter" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_harris_saw_cutter" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Harris reconoce la herramienta y dice que varios hombres intentaron abrir un hueco manualmente cuando vieron que la artillería no había cortado el alambre.",
              relatedEvidenceIds: ["ev_case03_bloodied_wire_cutter"],
              tags: ["case_03_intact_wire", "cortaalambres", "infantería"]
            }
          }
        ],
        nextDialogueId: "dlg_case03_harris_cutter"
      }
    ]
  },
  {
    id: "dlg_case03_harris_wire",
    npcId: "npc_case03_lance_corporal_harris",
    text:
      "'Algunos rollos estaban caídos, sí, pero no abiertos. Quedamos enganchados. Los que intentaron cortar fueron los primeros en caer.'",
    choices: [
      {
        id: "choice_case03_harris_close_wire",
        label: "Registrar el testimonio y dejarlo descansar.",
        closeAfterEffect: true,
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_harris_interview_complete" } }
        ]
      }
    ]
  },
  {
    id: "dlg_case03_harris_cutter",
    npcId: "npc_case03_lance_corporal_harris",
    text:
      "Harris baja la voz. 'Eso no debía hacer falta. Si el informe era cierto, nadie habría llevado esas pinzas hasta allí.'",
    choices: [
      {
        id: "choice_case03_harris_cutter_close",
        label: "Anotar la contradicción con el informe oficial.",
        closeAfterEffect: true,
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_harris_confirmed_cutter" } },
          {
            type: "ADD_CONTRADICTION",
            payload: {
              id: "contr_case03_report_vs_cutter_testimony",
              title: "Alambre despejado contra corte manual bajo fuego",
              description: "El testimonio de Harris indica que la infantería tuvo que intentar cortar a mano una alambrada que oficialmente debía estar abierta.",
              evidenceIds: ["ev_case03_artillery_report", "ev_case03_bloodied_wire_cutter"],
              tags: ["case_03_intact_wire", "alambre", "artillería"]
            }
          }
        ]
      }
    ]
  },
  {
    id: "dlg_case03_finch_start",
    npcId: "npc_case03_lieutenant_finch",
    text:
      "El teniente Finch mantiene el informe doblado bajo una piedra. 'El parte de artillería fue claro. La infantería debía avanzar. No corresponde reescribir una operación por impresiones del momento.'",
    choices: [
      {
        id: "choice_case03_finch_ask_report",
        label: "Pedirle acceso al informe de artillería.",
        conditions: [
          { type: "NOT_FLAG", value: "case03_finch_report_requested" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_finch_report_requested" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Finch se aferra al informe de artillería y evita responsabilizar al mando por la alambrada intacta.",
              relatedEvidenceIds: ["ev_case03_artillery_report"],
              tags: ["case_03_intact_wire", "oficiales", "informe"]
            }
          }
        ],
        nextDialogueId: "dlg_case03_finch_report"
      },
      {
        id: "choice_case03_finch_confront_wire",
        label: "Confrontarlo con el fragmento de alambrada intacta.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case03_intact_wire_fragment" },
          { type: "NOT_FLAG", value: "case03_finch_confronted_wire" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_finch_confronted_wire" } },
          { type: "FACTION_MEMORY", payload: { faction: "officers", amount: -1 } }
        ],
        nextDialogueId: "dlg_case03_finch_confronted"
      }
    ]
  },
  {
    id: "dlg_case03_finch_report",
    npcId: "npc_case03_lieutenant_finch",
    text:
      "'Puede copiar lo indispensable: objetivos batidos, alambre suficientemente dañado, avance autorizado. No necesita más para su artículo.'",
    choices: [
      {
        id: "choice_case03_finch_report_close",
        label: "Copiar el fragmento del informe.",
        closeAfterEffect: true,
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_artillery_report_copied" } }
        ]
      }
    ]
  },
  {
    id: "dlg_case03_finch_confronted",
    npcId: "npc_case03_lieutenant_finch",
    text:
      "Finch mira el alambre y aprieta la mandíbula. 'Una muestra no prueba todo el frente. Pero admito que el informe quizá fue... demasiado definitivo.'",
    choices: [
      {
        id: "choice_case03_finch_add_contradiction",
        label: "Registrar que el propio oficial suaviza el informe.",
        closeAfterEffect: true,
        effects: [
          {
            type: "ADD_CONTRADICTION",
            payload: {
              id: "contr_case03_finch_report_overstated",
              title: "Informe definitivo contra admisión del oficial",
              description: "Finch admite que el informe pudo exagerar la eficacia del bombardeo preliminar.",
              evidenceIds: ["ev_case03_artillery_report", "ev_case03_intact_wire_fragment"],
              tags: ["case_03_intact_wire", "oficiales", "informe"]
            }
          }
        ]
      }
    ]
  },
  {
    id: "dlg_case03_reeves_start",
    npcId: "npc_case03_gunner_reeves",
    text:
      "William Reeves limpia barro de sus botas junto a cajas vacías. 'Disparamos durante días. No me diga que no hicimos nada. Pero una batería no ve lo que pasa detrás del humo.'",
    choices: [
      {
        id: "choice_case03_reeves_shell",
        label: "Preguntarle por proyectiles defectuosos o sin detonar.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case03_dud_shell" },
          { type: "NOT_FLAG", value: "case03_reeves_asked_dud" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_reeves_asked_dud" } },
          { type: "FACTION_MEMORY", payload: { faction: "artillery", amount: 1 } }
        ],
        nextDialogueId: "dlg_case03_reeves_shell"
      },
      {
        id: "choice_case03_reeves_general",
        label: "Preguntar si la artillería podía confirmar el daño real al alambre.",
        conditions: [
          { type: "NOT_FLAG", value: "case03_reeves_general_answer" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_reeves_general_answer" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Reeves admite que la batería disparó según coordenadas y humo, pero no siempre podía verificar el resultado sobre el alambre.",
              relatedEvidenceIds: [],
              tags: ["case_03_intact_wire", "artillería", "verificación"]
            }
          }
        ],
        nextDialogueId: "dlg_case03_reeves_admission"
      }
    ]
  },
  {
    id: "dlg_case03_reeves_shell",
    npcId: "npc_case03_gunner_reeves",
    text:
      "Reeves observa el proyectil sin detonar. 'No era raro encontrar duds. Algunos caían muertos en el barro. Si uno de esos debía cortar alambre, no cortó nada.'",
    choices: [
      {
        id: "choice_case03_reeves_shell_note",
        label: "Registrar la explicación técnica.",
        closeAfterEffect: true,
        effects: [
          {
            type: "ADD_NOTE",
            payload: {
              text: "El artillero Reeves confirma que los proyectiles sin detonar podían dejar intactos sectores de alambre pese al bombardeo prolongado.",
              relatedEvidenceIds: ["ev_case03_dud_shell"],
              tags: ["case_03_intact_wire", "dud_shell", "artillería"]
            }
          }
        ]
      }
    ]
  },
  {
    id: "dlg_case03_reeves_admission",
    npcId: "npc_case03_gunner_reeves",
    text:
      "'Desde atrás todo parece cálculo. Adelante, el barro se traga los cálculos. El informe puede decir cumplido; el alambre puede decir otra cosa.'",
    choices: [
      {
        id: "choice_case03_reeves_close",
        label: "Cerrar la entrevista.",
        closeAfterEffect: true,
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_reeves_interview_complete" } }
        ]
      }
    ]
  },
  {
    id: "dlg_case03_miles_start",
    npcId: "npc_case03_observer_miles",
    text:
      "Harold Miles cubre su cuaderno con la mano. 'Yo dibujé lo que vi. Si mi croquis no llegó al puesto, pregunte a los mensajeros, no a mis ojos.'",
    choices: [
      {
        id: "choice_case03_miles_sketch",
        label: "Pedirle que explique el croquis del observador.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case03_observer_sketch" },
          { type: "NOT_FLAG", value: "case03_miles_explained_sketch" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_miles_explained_sketch" } }
        ],
        nextDialogueId: "dlg_case03_miles_sketch"
      },
      {
        id: "choice_case03_miles_general",
        label: "Preguntar si advirtió antes del avance que el alambre seguía en pie.",
        conditions: [
          { type: "NOT_FLAG", value: "case03_miles_warning_note" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_miles_warning_note" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Miles afirma que advirtió visualmente sectores de alambre intacto antes del avance, pero no sabe si el aviso fue transmitido a tiempo.",
              relatedEvidenceIds: [],
              tags: ["case_03_intact_wire", "observación", "advertencia"]
            }
          }
        ],
        nextDialogueId: "dlg_case03_miles_conclusion"
      }
    ]
  },
  {
    id: "dlg_case03_miles_sketch",
    npcId: "npc_case03_observer_miles",
    text:
      "'Estos trazos son alambrada visible después del fuego. No manchas. No sombras. Alambre. Si lo hubieran leído, quizá no habrían salido tan confiados.'",
    choices: [
      {
        id: "choice_case03_miles_add_contradiction",
        label: "Relacionar el croquis con el informe oficial.",
        closeAfterEffect: true,
        effects: [
          {
            type: "ADD_CONTRADICTION",
            payload: {
              id: "contr_case03_sketch_vs_report",
              title: "Croquis de observación contra informe de objetivos cumplidos",
              description: "Miles identifica tramos visibles de alambre después del bombardeo, mientras el informe oficial los da por suficientemente cortados.",
              evidenceIds: ["ev_case03_observer_sketch", "ev_case03_artillery_report"],
              tags: ["case_03_intact_wire", "observación", "alambre"]
            }
          }
        ]
      }
    ]
  },
  {
    id: "dlg_case03_miles_conclusion",
    npcId: "npc_case03_observer_miles",
    text:
      "'A veces la verdad estuvo escrita antes de la orden. El problema fue que nadie quiso detener una maquinaria ya lanzada.'",
    choices: [
      {
        id: "choice_case03_miles_close",
        label: "Cerrar la entrevista.",
        closeAfterEffect: true,
        effects: [
          { type: "SET_FLAG", payload: { id: "case03_miles_interview_complete" } }
        ]
      }
    ]
  }
];
