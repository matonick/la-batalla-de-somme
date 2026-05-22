export default [
  {
    id: "ev_case03_artillery_report",
    caseId: "case_03_intact_wire",
    title: "Informe de artillería preliminar",
    type: "document",
    description:
      "Informe mecanografiado del mando de batería. Declara que el alambre enemigo frente al sector asignado fue 'suficientemente cortado' antes del avance de infantería.",
    summary:
      "El documento sostiene la versión oficial: el bombardeo habría despejado el obstáculo principal.",
    source: "Puesto de mando de artillería",
    reliability: "media",
    locationId: "loc_artillery_command",
    discovered: false,
    hidden: false,
    sourceFlags: ["oficial", "artillería", "posible_omisión"],
    sourceLinks: [
      { evidenceId: "ev_case03_artillery_report", sourceId: "src_case03_iwm_somme_what_happened", relationType: "contexto", confidence: "alta" }
    ]
  },
  {
    id: "ev_case03_intact_wire_fragment",
    caseId: "case_03_intact_wire",
    title: "Fragmento de alambrada intacta",
    type: "object",
    description:
      "Tramo de alambre de púas recuperado cerca de la línea alemana. Conserva tensión, barro fresco y señales mínimas de corte por explosión.",
    summary:
      "La alambrada parece haber sobrevivido al bombardeo con daños menores.",
    source: "Borde de tierra de nadie",
    reliability: "alta",
    locationId: "loc_no_mans_land_wire",
    discovered: false,
    hidden: false,
    sourceFlags: ["material", "alambre", "contradictoria"],
    sourceLinks: [
      { evidenceId: "ev_case03_intact_wire_fragment", sourceId: "src_case03_canadian_war_museum_somme", relationType: "contexto", confidence: "alta" }
    ]
  },
  {
    id: "ev_case03_dud_shell",
    caseId: "case_03_intact_wire",
    title: "Proyectil sin detonar",
    type: "object",
    description:
      "Proyectil enterrado parcialmente en barro, sin detonar. Su posición sugiere que cayó cerca del obstáculo que debía destruir.",
    summary:
      "Un fallo de detonación pudo reducir el efecto real del bombardeo sobre el alambre.",
    source: "Cráter poco profundo en tierra de nadie",
    reliability: "alta",
    locationId: "loc_shell_crater",
    discovered: false,
    hidden: false,
    sourceFlags: ["material", "artillería", "fallo_técnico"],
    sourceLinks: [
      { evidenceId: "ev_case03_dud_shell", sourceId: "src_case03_canadian_war_museum_somme", relationType: "contexto", confidence: "alta" }
    ]
  },
  {
    id: "ev_case03_observer_sketch",
    caseId: "case_03_intact_wire",
    title: "Croquis del observador",
    type: "document",
    description:
      "Dibujo a lápiz realizado desde un punto elevado. Marca con trazos gruesos tres tramos de alambrada todavía visibles después del bombardeo.",
    summary:
      "El observador había advertido que el alambre seguía en pie antes de que la infantería avanzara.",
    source: "Bolsa de observación del sector",
    reliability: "alta",
    locationId: "loc_observation_post",
    discovered: false,
    hidden: false,
    sourceFlags: ["observación", "mapa", "alambre"],
    sourceLinks: [
      { evidenceId: "ev_case03_observer_sketch", sourceId: "src_case03_long_long_trail_bombardment", relationType: "contexto", confidence: "media" }
    ]
  },
  {
    id: "ev_case03_bloodied_wire_cutter",
    caseId: "case_03_intact_wire",
    title: "Cortaalambres ensangrentado",
    type: "object",
    description:
      "Herramienta de corte con mango astillado y manchas oscuras. Fue hallada cerca de una abertura incompleta entre los rollos de alambre.",
    summary:
      "Sugiere que algunos soldados intentaron abrir paso manualmente durante el ataque.",
    source: "Abertura incompleta de la alambrada",
    reliability: "alta",
    locationId: "loc_wire_gap",
    discovered: false,
    hidden: false,
    sourceFlags: ["material", "infantería", "riesgo"],
    sourceLinks: [
      { evidenceId: "ev_case03_bloodied_wire_cutter", sourceId: "src_case03_nam_battle_somme", relationType: "contexto", confidence: "media" }
    ]
  }
];
