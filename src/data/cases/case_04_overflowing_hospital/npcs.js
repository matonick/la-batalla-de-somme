export default [
  {
    id: "npc_case04_nurse_margaret_hale",
    name: "Margaret Hale",
    role: "Enfermera del área de clasificación",
    faction: "medics",
    description:
      "Lleva horas clasificando heridos. Habla con precisión, pero mide cada palabra porque sabe que sus listas contradicen el parte oficial.",
    dialogueIds: ["dlg_case04_margaret_start"],
    sex: "female",
    gasMask: false,
    portraitSeed: "npc_case04_nurse_margaret_hale"
  },
  {
    id: "npc_case04_stretcher_bearer_owen_price",
    name: "Owen Price",
    role: "Camillero agotado",
    faction: "medics",
    description:
      "Tiene las manos vendadas por rozaduras y barro hasta la cintura. Conoce el trayecto entre la línea y el puesto mejor que cualquier mapa.",
    dialogueIds: ["dlg_case04_owen_start"],
    sex: "male",
    gasMask: false,
    portraitSeed: "npc_case04_stretcher_bearer_owen_price"
  },
  {
    id: "npc_case04_surgeon_captain_miles",
    name: "Capitán Edward Miles",
    role: "Cirujano jefe del puesto médico",
    faction: "officers",
    description:
      "Oficial médico exhausto. Quiere proteger a su personal, pero también firmó un parte que suaviza lo ocurrido.",
    dialogueIds: ["dlg_case04_miles_start"],
    sex: "male",
    gasMask: false,
    portraitSeed: "npc_case04_surgeon_captain_miles"
  },
  {
    id: "npc_case04_private_alfie_brooks",
    name: "Alfie Brooks",
    role: "Soldado herido sin ficha completa",
    faction: "soldiers",
    description:
      "Joven soldado con el brazo inmovilizado. Teme que su nombre se pierda entre listas corregidas y gritos de camilla.",
    dialogueIds: ["dlg_case04_alfie_start"],
    sex: "male",
    gasMask: false,
    portraitSeed: "npc_case04_private_alfie_brooks"
  },
  {
    id: "npc_case04_quartermaster_dawson",
    name: "Sargento Dawson",
    role: "Encargado de suministros médicos",
    faction: "officers",
    description:
      "Controla cajas, firmas y vales. Insiste en que entregó lo que recibió, pero evita mirar las vendas reutilizadas.",
    dialogueIds: ["dlg_case04_dawson_start"],
    sex: "male",
    gasMask: false,
    portraitSeed: "npc_case04_quartermaster_dawson"
  }
];
