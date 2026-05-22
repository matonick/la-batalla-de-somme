export default [
  {
    id: "dlg_case04_margaret_start",
    npcId: "npc_case04_nurse_margaret_hale",
    text:
      "Margaret Hale no levanta la vista de una lista manchada. 'Si viene a contar camas, empezó tarde. Desde anoche contamos mantas, suelos y hombres que todavía no tienen ficha.'",
    choices: [
      {
        id: "choice_case04_margaret_ask_lists",
        label: "Pedirle que explique por qué hay nombres al margen de la lista.",
        conditions: [{ type: "NOT_FLAG", value: "case04_margaret_explained_lists" }],
        effects: [
          { type: "SET_FLAG", payload: { id: "case04_margaret_explained_lists" } },
          { type: "FACTION_MEMORY", payload: { faction: "medics", amount: 1 } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Margaret afirma que se atendieron heridos en el suelo antes de que pudieran registrarse formalmente.",
              relatedEvidenceIds: ["ev_case04_overcrowded_ward_list"],
              tags: ["case_04_overflowing_hospital", "registro", "sanidad"]
            }
          }
        ],
        nextDialogueId: "dlg_case04_margaret_lists"
      },
      {
        id: "choice_case04_margaret_show_bandages",
        label: "Mostrarle las vendas reutilizadas.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case04_reused_bandages" },
          { type: "NOT_FLAG", value: "case04_margaret_saw_bandages" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case04_margaret_saw_bandages" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Margaret reconoce que se reutilizaron vendas porque las cajas limpias no alcanzaron para la cantidad de heridos.",
              relatedEvidenceIds: ["ev_case04_reused_bandages"],
              tags: ["case_04_overflowing_hospital", "escasez"]
            }
          }
        ],
        nextDialogueId: "dlg_case04_margaret_supplies"
      },
      {
        id: "choice_case04_margaret_press",
        label: "Preguntar si el cirujano ocultó nombres a propósito.",
        conditions: [{ type: "NOT_FLAG", value: "case04_margaret_pressured" }],
        effects: [
          { type: "SET_FLAG", payload: { id: "case04_margaret_pressured" } },
          { type: "STRESS", payload: { amount: 2, reason: "acusacion_en_puesto_medico", eventType: "tension" } },
          { type: "FACTION_MEMORY", payload: { faction: "medics", amount: -1 } }
        ],
        closeAfterEffect: true
      }
    ]
  },
  {
    id: "dlg_case04_margaret_lists",
    npcId: "npc_case04_nurse_margaret_hale",
    text:
      "'La ficha se hace cuando hay mano libre. A veces la mano libre está cerrando una herida. Si el parte solo cuenta fichas, entonces deja fuera a hombres que respiraban aquí mismo.'",
    choices: [
      {
        id: "choice_case04_margaret_add_contradiction",
        label: "Marcar la contradicción entre lista de sala y parte oficial.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case04_official_evacuation_report" },
          { type: "HAS_EVIDENCE", value: "ev_case04_overcrowded_ward_list" },
          { type: "NOT_HAS_CONTRADICTION", value: "con_case04_orderly_evacuation_vs_overflow" }
        ],
        effects: [
          { type: "ADD_CONTRADICTION", payload: { id: "con_case04_orderly_evacuation_vs_overflow" } },
          { type: "SET_FLAG", payload: { id: "case04_overflow_contradiction_found" } }
        ],
        closeAfterEffect: true
      },
      {
        id: "choice_case04_margaret_close_lists",
        label: "Agradecer y dejarla seguir trabajando.",
        effects: [{ type: "SET_FLAG", payload: { id: "case04_margaret_interviewed" } }],
        closeAfterEffect: true
      }
    ]
  },
  {
    id: "dlg_case04_margaret_supplies",
    npcId: "npc_case04_nurse_margaret_hale",
    text:
      "'No escriba que nos faltó voluntad. Faltó todo lo demás: vendas, sueño, manos, camillas. Y aun así nadie dejó de mirar al siguiente herido.'",
    choices: [
      {
        id: "choice_case04_margaret_supplies_close",
        label: "Anotar que la escasez no fue falta de cuidado del personal.",
        effects: [
          {
            type: "ADD_NOTE",
            payload: {
              text: "La enfermera diferencia la negligencia del sistema del esfuerzo del personal sanitario.",
              relatedEvidenceIds: ["ev_case04_reused_bandages"],
              tags: ["case_04_overflowing_hospital", "matiz"]
            }
          }
        ],
        closeAfterEffect: true
      }
    ]
  },
  {
    id: "dlg_case04_owen_start",
    npcId: "npc_case04_stretcher_bearer_owen_price",
    text:
      "Owen Price deja una camilla contra una estaca. 'El camino no era un camino. Era barro con gemidos. Cuando llegábamos con uno, ya gritaban por otros tres.'",
    choices: [
      {
        id: "choice_case04_owen_route",
        label: "Pedirle que describa el traslado desde la línea hasta el puesto médico.",
        conditions: [{ type: "NOT_FLAG", value: "case04_owen_route_described" }],
        effects: [
          { type: "SET_FLAG", payload: { id: "case04_owen_route_described" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Owen describe demoras por barro, cráteres y fuego intermitente durante la evacuación de heridos.",
              relatedEvidenceIds: ["ev_case04_stretcher_broken"],
              tags: ["case_04_overflowing_hospital", "camilleros", "barro"]
            }
          }
        ],
        nextDialogueId: "dlg_case04_owen_route"
      },
      {
        id: "choice_case04_owen_show_stretcher",
        label: "Mostrarle la camilla rota.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case04_stretcher_broken" },
          { type: "NOT_FLAG", value: "case04_owen_saw_stretcher" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case04_owen_saw_stretcher" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Owen identifica la camilla rota como una de las usadas para arrastrar heridos cuando ya no quedaban suficientes relevos.",
              relatedEvidenceIds: ["ev_case04_stretcher_broken"],
              tags: ["case_04_overflowing_hospital", "material"]
            }
          }
        ],
        closeAfterEffect: true
      }
    ]
  },
  {
    id: "dlg_case04_owen_route",
    npcId: "npc_case04_stretcher_bearer_owen_price",
    text:
      "'Nos dijeron que la ruta estaba marcada. Tal vez lo estuvo al amanecer. Después los cráteres se llenaron y las marcas desaparecieron bajo botas, sangre y lluvia.'",
    choices: [
      {
        id: "choice_case04_owen_close",
        label: "Registrar su testimonio sobre la evacuación precaria.",
        effects: [{ type: "SET_FLAG", payload: { id: "case04_owen_interviewed" } }],
        closeAfterEffect: true
      }
    ]
  },
  {
    id: "dlg_case04_miles_start",
    npcId: "npc_case04_surgeon_captain_miles",
    text:
      "El capitán Miles se limpia las manos con un paño ya gris. 'No tengo tiempo para literatura. Si quiere escribir, escriba que se hizo lo posible.'",
    choices: [
      {
        id: "choice_case04_miles_ask_report",
        label: "Preguntar por qué el parte habla de evacuación ordenada.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case04_official_evacuation_report" },
          { type: "NOT_FLAG", value: "case04_miles_asked_report" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case04_miles_asked_report" } },
          { type: "FACTION_MEMORY", payload: { faction: "officers", amount: -1 } }
        ],
        nextDialogueId: "dlg_case04_miles_confronted"
      },
      {
        id: "choice_case04_miles_respect",
        label: "Reconocer el trabajo médico antes de preguntar por las demoras.",
        conditions: [{ type: "NOT_FLAG", value: "case04_miles_respected" }],
        effects: [
          { type: "SET_FLAG", payload: { id: "case04_miles_respected" } },
          { type: "FACTION_MEMORY", payload: { faction: "medics", amount: 1 } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Miles insiste en que el personal hizo lo posible, pero admite que la palabra 'ordenada' no describe toda la jornada.",
              relatedEvidenceIds: ["ev_case04_official_evacuation_report"],
              tags: ["case_04_overflowing_hospital", "parte_oficial"]
            }
          }
        ],
        nextDialogueId: "dlg_case04_miles_confronted"
      }
    ]
  },
  {
    id: "dlg_case04_miles_confronted",
    npcId: "npc_case04_surgeon_captain_miles",
    text:
      "'Ordenada significa que no hubo motín, no que hubiera camas. Si escribo colapso, el mando pregunta por culpables. Si escribo orden, al menos nos mandan otra caja.'",
    choices: [
      {
        id: "choice_case04_miles_hidden_note",
        label: "Preguntar por los heridos que no aparecen en el registro oficial.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case04_unregistered_wounded_note" },
          { type: "NOT_HAS_CONTRADICTION", value: "con_case04_registered_vs_unregistered_wounded" }
        ],
        effects: [
          { type: "ADD_CONTRADICTION", payload: { id: "con_case04_registered_vs_unregistered_wounded" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Miles admite que algunos nombres quedaron fuera del parte porque el registro se quebró bajo la cantidad de heridos.",
              relatedEvidenceIds: ["ev_case04_unregistered_wounded_note", "ev_case04_official_evacuation_report"],
              tags: ["case_04_overflowing_hospital", "nombres"]
            }
          }
        ],
        closeAfterEffect: true
      },
      {
        id: "choice_case04_miles_close",
        label: "Cerrar la entrevista sin presionar más.",
        effects: [{ type: "SET_FLAG", payload: { id: "case04_miles_interviewed" } }],
        closeAfterEffect: true
      }
    ]
  },
  {
    id: "dlg_case04_alfie_start",
    npcId: "npc_case04_private_alfie_brooks",
    text:
      "Alfie Brooks mira su muñeca sin pulsera de identificación médica. 'Me dijeron que espere mi ficha. Después me dijeron que espere otra camilla. Estoy esperando desde que todavía era de noche.'",
    choices: [
      {
        id: "choice_case04_alfie_name",
        label: "Preguntarle su nombre completo para compararlo con la lista.",
        conditions: [{ type: "NOT_FLAG", value: "case04_alfie_named" }],
        effects: [
          { type: "SET_FLAG", payload: { id: "case04_alfie_named" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Alfie Brooks no aparece claramente en el registro principal, aunque afirma haber sido atendido durante la noche.",
              relatedEvidenceIds: ["ev_case04_overcrowded_ward_list"],
              tags: ["case_04_overflowing_hospital", "herido_sin_ficha"]
            }
          }
        ],
        nextDialogueId: "dlg_case04_alfie_named"
      },
      {
        id: "choice_case04_alfie_show_note",
        label: "Mostrarle la nota de heridos sin registrar.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case04_unregistered_wounded_note" },
          { type: "NOT_FLAG", value: "case04_alfie_saw_note" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case04_alfie_saw_note" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Alfie reconoce uno de los nombres de la nota: un hombre que fue evacuado antes de recibir ficha completa.",
              relatedEvidenceIds: ["ev_case04_unregistered_wounded_note"],
              tags: ["case_04_overflowing_hospital", "testimonio"]
            }
          }
        ],
        closeAfterEffect: true
      }
    ]
  },
  {
    id: "dlg_case04_alfie_named",
    npcId: "npc_case04_private_alfie_brooks",
    text:
      "'Alfred Brooks, Compañía C. Si no escriben eso en alguna parte, mi madre va a recibir una frase vacía y nada más.'",
    choices: [
      {
        id: "choice_case04_alfie_close",
        label: "Prometer que su nombre quedará anotado en la investigación.",
        effects: [
          { type: "FACTION_MEMORY", payload: { faction: "soldiers", amount: 1 } },
          { type: "SET_FLAG", payload: { id: "case04_alfie_interviewed" } }
        ],
        closeAfterEffect: true
      }
    ]
  },
  {
    id: "dlg_case04_dawson_start",
    npcId: "npc_case04_quartermaster_dawson",
    text:
      "El sargento Dawson golpea una caja vacía con el nudillo. 'No puedo entregar lo que no llegó. Mi firma está en cada vale, no en cada milagro.'",
    choices: [
      {
        id: "choice_case04_dawson_morphine",
        label: "Preguntar por la morfina agotada antes del mediodía.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case04_morphine_shortage_tag" },
          { type: "NOT_FLAG", value: "case04_dawson_morphine_asked" }
        ],
        effects: [
          { type: "SET_FLAG", payload: { id: "case04_dawson_morphine_asked" } },
          {
            type: "ADD_NOTE",
            payload: {
              text: "Dawson confirma que la morfina se agotó antes del mediodía y que pidió reposición sin respuesta inmediata.",
              relatedEvidenceIds: ["ev_case04_morphine_shortage_tag"],
              tags: ["case_04_overflowing_hospital", "suministros"]
            }
          }
        ],
        nextDialogueId: "dlg_case04_dawson_shortage"
      },
      {
        id: "choice_case04_dawson_bandages",
        label: "Confrontarlo con las vendas reutilizadas.",
        conditions: [
          { type: "HAS_EVIDENCE", value: "ev_case04_reused_bandages" },
          { type: "HAS_EVIDENCE", value: "ev_case04_morphine_shortage_tag" },
          { type: "NOT_HAS_CONTRADICTION", value: "con_case04_supplies_available_vs_shortage" }
        ],
        effects: [
          { type: "ADD_CONTRADICTION", payload: { id: "con_case04_supplies_available_vs_shortage" } },
          { type: "FACTION_MEMORY", payload: { faction: "officers", amount: -1 } }
        ],
        nextDialogueId: "dlg_case04_dawson_shortage"
      }
    ]
  },
  {
    id: "dlg_case04_dawson_shortage",
    npcId: "npc_case04_quartermaster_dawson",
    text:
      "'El papel dice entregado porque salió de mis manos. No dice suficiente. Esa palabra no entra en los formularios.'",
    choices: [
      {
        id: "choice_case04_dawson_close",
        label: "Anotar que el formulario no refleja la escala de la necesidad.",
        effects: [{ type: "SET_FLAG", payload: { id: "case04_dawson_interviewed" } }],
        closeAfterEffect: true
      }
    ]
  }
];
