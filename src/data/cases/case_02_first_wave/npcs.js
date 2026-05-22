export default [
  {
    id: "npc_case02_private_briggs",
    name: "Alfred Briggs",
    role: "Soldado superviviente de la primera oleada",
    faction: "soldiers",
    description:
      "Joven soldado cubierto de barro. Sobrevivió regresando a rastras y habla con frases cortas, como si todavía escuchara las ametralladoras.",
    dialogueIds: ["dlg_case02_briggs_start"],
    sex: "male",
    gasMask: false,
    portraitSeed: "npc_case02_private_briggs"
  },
  {
    id: "npc_case02_captain_wilcox",
    name: "Capitán Wilcox",
    role: "Oficial responsable del parte sectorial",
    faction: "officers",
    description:
      "Oficial cansado pero rígido. Sostiene que la crónica debe proteger la moral y no alimentar rumores de desastre.",
    dialogueIds: ["dlg_case02_wilcox_start"],
    sex: "male",
    gasMask: false,
    portraitSeed: "npc_case02_captain_wilcox"
  },
  {
    id: "npc_case02_sister_mary_owen",
    name: "Mary Owen",
    role: "Enfermera del puesto de socorro",
    faction: "medics",
    description:
      "Enfermera agotada por horas de trabajo continuo. Conserva una lista parcial porque teme que algunos nombres desaparezcan del registro.",
    dialogueIds: ["dlg_case02_owen_start"],
    sex: "female",
    gasMask: false,
    portraitSeed: "npc_case02_sister_mary_owen"
  },
  {
    id: "npc_case02_sergeant_mcallister",
    name: "Sargento McAllister",
    role: "Suboficial que intentó reagrupar a los supervivientes",
    faction: "soldiers",
    description:
      "Veterano de mirada severa. No se rebela abiertamente contra el mando, pero sabe que la primera línea no llegó tan lejos como se afirma.",
    dialogueIds: ["dlg_case02_mcallister_start"],
    sex: "male",
    gasMask: false,
    portraitSeed: "npc_case02_sergeant_mcallister"
  }
];
