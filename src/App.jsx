import React, { createContext, useContext, useMemo, useReducer } from "react";
import "./asciiPortraits.js";

/*
  LA BATALLA DE SOMME
  Versión actual: beta 0.5 candidata — Estrés, Diario Personal y diálogos ramificados
  Arquitectura: React Context + modelos orientados a objetos

  Estado de la versión:
  - flujo principal del caso 01 validado en beta 0.4
  - cierre de caso con Archivo funcional
  - contradicciones automáticas con ventana diferida
  - diálogos seleccionables con mouse o números del teclado
  - SELECT_DIALOGUE_CHOICE centraliza efecto + transición de diálogo
  - sistema de recuperación emocional: descanso, personal médico, nota personal, sueño breve, refugio civil y protección médica
  - Diario Personal separado de las notas de investigación
  - artículos automáticos filtran notas personales
  - arquitectura audiovisual preparada: sprites con ASCII de respaldo y sonido desacoplado
  - modo seguro de prueba: si faltan archivos .png o .mp3, el juego continúa mostrando ASCII y sin romper la partida
*/

// =========================================================
// MODELOS ORIENTADOS A OBJETOS
// =========================================================

class Player {
  constructor({
    name = "",
    age = "",
    gender = "",
    nationality = "",
    profile = "neutral",
    credibility = null,
    stress = null,
    reputation = null,
    psychologicalResistance = null,
    portraitSeed = "",
    asciiPortrait = null,
  } = {}) {
    this.name = name;
    this.age = age;
    this.gender = gender;
    this.nationality = nationality;
    this.profile = profile;
    this.portraitSeed = portraitSeed || asciiPortrait?.seed || "";
    this.asciiPortrait = asciiPortrait || null;

    const profileEffects = Player.getProfileEffects(profile);

    this.credibility = credibility ?? profileEffects.credibility;
    this.stress = stress ?? profileEffects.stress;
    this.reputation = reputation
      ? {
          soldiers: reputation.soldiers,
          officers: reputation.officers,
          civilians: reputation.civilians,
          press: reputation.press,
        }
      : {
          soldiers: profileEffects.reputation.soldiers,
          officers: profileEffects.reputation.officers,
          civilians: profileEffects.reputation.civilians,
          press: profileEffects.reputation.press,
        };

    this.psychologicalResistance = {
      ...PsychologicalHabituationSystem.DEFAULT_RESISTANCE,
      ...(psychologicalResistance || {}),
    };
  }

  static getProfileEffects(profile) {
    const effects = {
      neutral: {
        credibility: 50,
        stress: 5,
        reputation: { soldiers: 0, officers: 0, civilians: 0, press: 0 },
      },
      patriotico: {
        credibility: 45,
        stress: 0,
        reputation: { soldiers: -5, officers: 15, civilians: -5, press: 5 },
      },
      humanitario: {
        credibility: 55,
        stress: 10,
        reputation: { soldiers: 15, officers: -10, civilians: 10, press: 0 },
      },
      ambicioso: {
        credibility: 40,
        stress: 5,
        reputation: { soldiers: -5, officers: 5, civilians: -5, press: 20 },
      },
    };

    return effects[profile] || effects.neutral;
  }

  isCreated() {
    return Boolean(this.name && this.profile);
  }

  increaseStress(amount = 1) {
    this.stress = Math.min(100, this.stress + amount);
  }

  reduceStress(amount = 1) {
    this.stress = Math.max(0, this.stress - amount);
  }

  changeCredibility(amount = 0) {
    this.credibility = Math.max(0, Math.min(100, this.credibility + amount));
  }

  getProfileLabel() {
    const labels = {
      neutral: "Neutral",
      patriotico: "Patriótico",
      humanitario: "Humanitario",
      ambicioso: "Ambicioso",
    };

    return labels[this.profile] || "Neutral";
  }
}

class Citation {
  constructor({ id, text = "", page = "", chapter = "", note = "" }) {
    this.id = id;
    this.text = text;
    this.page = page;
    this.chapter = chapter;
    this.note = note;
  }
}

class HistoricalSource {
  constructor({
    id,
    title,
    author = "Autor no identificado",
    date = "Fecha no especificada",
    type = "fuente histórica",
    archive = "Archivo no especificado",
    location = "",
    description = "",
    reliability = "media",
    url = "",
    citations = [],
    tags = [],
  }) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.date = date;
    this.type = type;
    this.archive = archive;
    this.location = location;
    this.description = description;
    this.reliability = reliability;
    this.url = url;
    this.citations = citations.map((citation) => new Citation(citation));
    this.tags = tags;
  }
}

class EvidenceSourceLink {
  constructor({ evidenceId, sourceId, relationType = "inspirada_en", confidence = "media" }) {
    this.evidenceId = evidenceId;
    this.sourceId = sourceId;
    this.relationType = relationType;
    this.confidence = confidence;
  }
}

class SourceLibrary {
  constructor(sources = []) {
    this.sources = sources.map((source) => new HistoricalSource(source));
  }

  addSource(source) {
    const exists = this.sources.some((item) => item.id === source.id);
    if (!exists) this.sources.push(new HistoricalSource(source));
  }

  getSourceById(id) {
    return this.sources.find((source) => source.id === id);
  }

  getSourcesByTag(tag) {
    return this.sources.filter((source) => source.tags.includes(tag));
  }

  getSourcesForEvidence(evidence) {
    return (evidence.sourceLinks || [])
      .map((link) => this.getSourceById(link.sourceId))
      .filter(Boolean);
  }
}

class Evidence {
  constructor({
    id,
    title,
    type,
    description,
    source,
    reliability = "media",
    discovered = false,
    locationId = null,
    hidden = false,
    conditions = [],
    sourceLinks = [],
    sourceFlags = [],
  }) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.description = description;
    this.source = source;
    this.reliability = reliability;
    this.discovered = discovered;
    this.locationId = locationId;
    this.hidden = hidden;
    this.conditions = conditions;
    this.sourceFlags = sourceFlags;
    this.sourceLinks = sourceLinks.map((link) => new EvidenceSourceLink(link));
  }

  discover() {
    this.discovered = true;
  }

  canBeFound(state) {
    if (this.hidden && !this.conditions.length) return false;

    return this.conditions.every((condition) => {
      if (condition.type === "PROFILE") {
        return state.player.profile === condition.value;
      }

      if (condition.type === "FLAG") {
        return state.flags[condition.value] === true;
      }

      return true;
    });
  }
}

class Note {
  constructor({ id, text, relatedEvidenceIds = [], tags = [] }) {
    this.id = id;
    this.text = text;
    this.relatedEvidenceIds = relatedEvidenceIds;
    this.tags = tags;
    this.createdAt = new Date().toISOString();
  }
}

function isPersonalDiaryNote(note = {}) {
  const tags = note.tags || [];
  return (
    tags.includes("personal") ||
    tags.includes("emotional_recovery") ||
    tags.includes("medical_recovery") ||
    tags.includes("diary")
  );
}

class Contradiction {
  constructor({ id, title, description, evidenceIds = [], severity = "media" }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.evidenceIds = evidenceIds;
    this.severity = severity;
    this.resolved = false;
  }

  resolve() {
    this.resolved = true;
  }
}

class Hypothesis {
  constructor({
    id,
    title,
    text,
    evidenceIds = [],
    supportingEvidenceIds = [],
    opposingEvidenceIds = [],
    confidence = "provisoria",
    status = "abierta",
    createdFromEvidenceId = null,
    tags = [],
    overloaded = false,
    overloadPenaltyLevel = 0,
    validated = false,
  }) {
    this.id = id;
    this.title = title;
    this.text = text;

    this.supportingEvidenceIds = supportingEvidenceIds.length
      ? supportingEvidenceIds
      : evidenceIds;
    this.opposingEvidenceIds = opposingEvidenceIds;
    this.evidenceIds = Hypothesis.mergeEvidenceIds(
      this.supportingEvidenceIds,
      this.opposingEvidenceIds
    );

    this.confidence = confidence;
    this.status = status || (validated ? "validada" : "abierta");
    this.createdFromEvidenceId = createdFromEvidenceId;
    this.tags = tags;
    this.overloaded = overloaded;
    this.overloadPenaltyLevel = overloadPenaltyLevel;
  }

  static mergeEvidenceIds(supportingEvidenceIds = [], opposingEvidenceIds = []) {
    return Hypothesis.mergeUniqueEvidenceIds(supportingEvidenceIds, opposingEvidenceIds);
  }

  static mergeUniqueEvidenceIds(...idGroups) {
    return [...new Set(idGroups.flat())];
  }

  withSupportingEvidence(evidenceId) {
    const supportingEvidenceIds = this.supportingEvidenceIds.includes(evidenceId)
      ? [...this.supportingEvidenceIds]
      : [...this.supportingEvidenceIds, evidenceId];

    const opposingEvidenceIds = this.opposingEvidenceIds.filter((id) => id !== evidenceId);

    return new Hypothesis({
      ...this,
      supportingEvidenceIds,
      opposingEvidenceIds,
    });
  }

  withOpposingEvidence(evidenceId) {
    const opposingEvidenceIds = this.opposingEvidenceIds.includes(evidenceId)
      ? [...this.opposingEvidenceIds]
      : [...this.opposingEvidenceIds, evidenceId];

    const supportingEvidenceIds = this.supportingEvidenceIds.filter((id) => id !== evidenceId);

    return new Hypothesis({
      ...this,
      supportingEvidenceIds,
      opposingEvidenceIds,
    });
  }

  validate() {
    this.status = "validada";
  }

  question() {
    this.status = "cuestionada";
  }

  discard() {
    this.status = "descartada";
  }

  updateConfidence(confidence) {
    this.confidence = confidence;
  }
}

class SaveSystem {
  static STORAGE_KEY = "la_batalla_de_somme_save_v1";
  static SAVE_VERSION = 2;

  static storageAvailable() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  static save(state) {
    if (!SaveSystem.storageAvailable()) return false;

    try {
      window.localStorage.setItem(
        SaveSystem.STORAGE_KEY,
        JSON.stringify({
          ...state,
          saveVersion: SaveSystem.SAVE_VERSION,
          savedAt: new Date().toISOString(),
        })
      );
      return true;
    } catch (error) {
      console.error("No se pudo guardar la partida", error);
      return false;
    }
  }

  static load() {
    if (!SaveSystem.storageAvailable()) return null;

    try {
      const rawData = window.localStorage.getItem(SaveSystem.STORAGE_KEY);
      return rawData ? JSON.parse(rawData) : null;
    } catch (error) {
      console.error("No se pudo cargar la partida", error);
      return null;
    }
  }

  static clear() {
    if (!SaveSystem.storageAvailable()) return false;
    window.localStorage.removeItem(SaveSystem.STORAGE_KEY);
    return true;
  }

  static hasSave() {
    if (!SaveSystem.storageAvailable()) return false;
    return Boolean(window.localStorage.getItem(SaveSystem.STORAGE_KEY));
  }
}

function mergeSavedItemsWithCurrentCatalog(savedItems = [], currentItems = [], ClassType = null) {
  const registry = new Map();

  (currentItems || []).forEach((item) => {
    if (item?.id) registry.set(item.id, item);
  });

  (savedItems || []).forEach((item) => {
    if (!item?.id) return;
    const currentItem = registry.get(item.id) || {};
    registry.set(item.id, {
      ...currentItem,
      ...item,
    });
  });

  const values = [...registry.values()];
  return ClassType ? values.map((item) => new ClassType(item)) : values;
}

function getSafeModalState(rawModal, initialModal) {
  if (!rawModal || typeof rawModal !== "object") return initialModal;
  return {
    ...initialModal,
    ...rawModal,
    isOpen: Boolean(rawModal.isOpen),
  };
}

function getSafeScreen(rawScreen, rawPlayer) {
  const validScreens = new Set([
    "MENU",
    "CHARACTER_CREATION",
    "INTRO",
    "GAMEPLAY",
    "HISTORICAL_ARCHIVES",
    "OPTIONS",
    "RETIREMENT_SUMMARY",
    "DEBUG_STATE",
  ]);

  if (!validScreens.has(rawScreen)) return "MENU";
  if (rawScreen === "GAMEPLAY" && !rawPlayer?.name) return "MENU";
  return rawScreen;
}

function rebuildState(rawState) {
  if (!rawState) return initialState;

  const notebook = new Notebook();
  notebook.activeCase = rawState.notebook?.activeCase
    ? new CaseFile(rawState.notebook.activeCase)
    : null;

  notebook.evidences = (rawState.notebook?.evidences || []).map((item) => new Evidence(item));

  notebook.notes = (rawState.notebook?.notes || []).map((item) => {
    const note = new Note({
      ...item,
      tags: item.tags || [],
    });
    note.createdAt = item.createdAt || note.createdAt;
    return note;
  });

  notebook.caseEvents = (rawState.notebook?.caseEvents || []).slice(-Notebook.MAX_CASE_EVENTS);
  notebook.activityLog = (rawState.notebook?.activityLog || []).slice(-Notebook.MAX_ACTIVITY_LOG);

  notebook.contradictions = (rawState.notebook?.contradictions || []).map((item) => {
    const contradiction = new Contradiction({
      ...item,
      severity: item.severity || "media",
    });
    contradiction.resolved = item.resolved || false;
    return contradiction;
  });

  notebook.hypotheses = (rawState.notebook?.hypotheses || []).map((item) =>
    new Hypothesis({
      ...item,
      evidenceIds: item.evidenceIds || [],
      supportingEvidenceIds: item.supportingEvidenceIds || item.evidenceIds || [],
      opposingEvidenceIds: item.opposingEvidenceIds || [],
      confidence: item.confidence || "provisoria",
      status: item.status || (item.validated ? "validada" : "abierta"),
      createdFromEvidenceId: item.createdFromEvidenceId || null,
      tags: item.tags || [],
    })
  );

  notebook.articles = (rawState.notebook?.articles || []).map((item) => new Article(item));

  notebook.reconstructions = (rawState.notebook?.reconstructions || []).map((item) => {
    const reconstruction = new HistoricalReconstruction({
      ...item,
      status: item.status || "estable",
      instabilityLevel: item.instabilityLevel || 0,
      narrativeFragments: (item.narrativeFragments || []).slice(-HistoricalReconstruction.MAX_NARRATIVE_FRAGMENTS),
    });
    reconstruction.createdAt = item.createdAt || reconstruction.createdAt;
    return reconstruction;
  });

  notebook.consequenceLog = (rawState.notebook?.consequenceLog || []).slice(
    -Notebook.MAX_CONSEQUENCE_LOG
  );
  notebook.archivedCases = (rawState.notebook?.archivedCases || [])
    .slice(-Notebook.MAX_ARCHIVED_CASES)
    .map((item) => new CaseFile(item));

  notebook.caseArchive = (rawState.notebook?.caseArchive || [])
    .slice(-Notebook.MAX_CASE_ARCHIVE);

  const rebuiltMaps = mergeSavedItemsWithCurrentCatalog(
    rawState.asciiMaps || [],
    initialAsciiMaps,
    AsciiMap
  );
  const rebuiltLocationId = MapZoneSystem.getLocationIdAtPosition(
    rawState.playerPosition || initialState.playerPosition,
    rawState.currentLocationId || initialState.currentLocationId
  );
  const rebuiltMap =
    rebuiltMaps.find((map) => map.locationId === rebuiltLocationId) ||
    rebuiltMaps.find((map) => map.id === "map_somme_front_large") ||
    rebuiltMaps[0];

  const rebuiltPosition = AsciiMapEngine.findNearestWalkablePosition(
    rebuiltMap,
    rawState.playerPosition || AsciiMapEngine.getStartPositionForLocation(rebuiltLocationId),
    null
  );

  const repairedNotebook = NotebookIntegritySystem.repairIfNeeded(notebook, "load");

  return {
    ...initialState,
    ...rawState,
    screen: getSafeScreen(rawState.screen, rawState.player),
    player: new Player(rawState.player || {}),
    time: rawState.time || initialTimeState,
    notebook: repairedNotebook,
    worldState: new WorldState(rawState.worldState || initialWorldState),
    factionMemory: {
      ...FactionMemorySystem.DEFAULT_FACTIONS,
      ...(rawState.factionMemory || {}),
    },
    persistentConsequences: PersistentConsequenceSystem.dedupeConsequences(
      rawState.persistentConsequences || []
    ),
    narrativeFlags: rawState.narrativeFlags || {},
    lastTimelineUpdateDay: rawState.lastTimelineUpdateDay || 1,
    cases: mergeSavedItemsWithCurrentCatalog(rawState.cases || [], initialCases, CaseFile),
    evidenceDatabase: mergeSavedItemsWithCurrentCatalog(
      rawState.evidenceDatabase || [],
      initialEvidence,
      Evidence
    ),
    sourceLibrary: new SourceLibrary(
      mergeSavedItemsWithCurrentCatalog(
        rawState.sourceLibrary?.sources || [],
        initialHistoricalSources
      )
    ),
    asciiMaps: rebuiltMaps,
    playerPosition: rebuiltPosition,
    locations: mergeSavedItemsWithCurrentCatalog(rawState.locations || [], initialLocations, Location),
    npcs: mergeSavedItemsWithCurrentCatalog(rawState.npcs || [], initialNPCs, NPC),
    dialogues: mergeSavedItemsWithCurrentCatalog(
      rawState.dialogues || [],
      initialDialogues,
      Dialogue
    ),
    flags: rawState.flags || {},
    visualSettings: VisualSettingsSystem.normalize(rawState.visualSettings),
    evidenceInspection: initialInspectionState,
    dialogueModal: initialDialogueModalState,
    contradictionModal: initialContradictionModalState,
    pendingContradictionModal: null,
    currentLocationId: rebuiltLocationId,
    notebookOpen: false,
    caseClosureModal: getSafeModalState(
      rawState.caseClosureModal,
      initialCaseClosureModal
    ),
    bombardmentEffect: initialBombardmentEffect,
    lastObservationSignature: null,
    lastSaveMessage: "Partida cargada correctamente.",
  };
}

class PsychologicalHabituationSystem {
  static DEFAULT_RESISTANCE = {
    bombardment: 0,
    wounded: 0,
    corpses: 0,
    screams: 0,
    gas: 0,
  };

  static getResistanceProfile(player) {
    return {
      ...PsychologicalHabituationSystem.DEFAULT_RESISTANCE,
      ...(player?.psychologicalResistance || {}),
    };
  }

  static registerExposure(player, eventType) {
    const resistance = PsychologicalHabituationSystem.getResistanceProfile(player);
    const nextValue = Math.min((resistance[eventType] || 0) + 1, 100);

    player.psychologicalResistance = {
      ...resistance,
      [eventType]: nextValue,
    };

    return nextValue;
  }

  static calculateStressImpact(baseStress, resistanceLevel = 0) {
    const mitigation = Math.min(resistanceLevel * 0.08, 0.75);
    return Math.max(1, Math.round(baseStress * (1 - mitigation)));
  }

  static getEventLabel(eventType) {
    const labels = {
      bombardment: "bombardeos",
      wounded: "heridos",
      corpses: "cadáveres",
      screams: "gritos",
      gas: "gas",
    };

    return labels[eventType] || eventType;
  }

  static buildHabituationDescription(eventType, resistanceLevel) {
    const label = PsychologicalHabituationSystem.getEventLabel(eventType);

    if (resistanceLevel < 10) {
      return `La exposición a ${label} todavía golpea con fuerza emocional.`;
    }

    if (resistanceLevel < 30) {
      return `El corresponsal empieza a normalizar parte del horror asociado a ${label}.`;
    }

    if (resistanceLevel < 60) {
      return `La repetición amortigua el impacto inmediato de ${label}.`;
    }

    return `Algo humano parece erosionarse frente a la repetición constante de ${label}.`;
  }
}

class PsychologicalStateSystem {
  static getStressBand(stress = 0) {
    if (stress >= 85) return "quiebre";
    if (stress >= 65) return "paranoia";
    if (stress >= 40) return "agotamiento";
    if (stress >= 20) return "tension";
    return "estable";
  }

  static getNarrativeDescription(stress = 0) {
    const band = PsychologicalStateSystem.getStressBand(stress);

    const descriptions = {
      estable: "El corresponsal conserva claridad suficiente para observar con distancia.",
      tension: "El ruido del frente empieza a contaminar la lectura de cada gesto.",
      agotamiento: "La fatiga vuelve más difícil separar memoria, miedo y testimonio.",
      paranoia: "Cada silencio parece esconder una versión distinta de los hechos.",
      quiebre: "La investigación empieza a confundirse con supervivencia inmediata.",
    };

    return descriptions[band];
  }

  static shouldTriggerPsychologicalEvent(previousStress = 0, nextStress = 0) {
    return PsychologicalStateSystem.getStressBand(previousStress) !== PsychologicalStateSystem.getStressBand(nextStress);
  }

  static buildStressTransitionEvent(previousStress = 0, nextStress = 0) {
    const band = PsychologicalStateSystem.getStressBand(nextStress);
    const titles = {
      tension: "Tensión acumulada",
      agotamiento: "Agotamiento del corresponsal",
      paranoia: "Desconfianza creciente",
      quiebre: "Riesgo de quiebre emocional",
      estable: "Claridad recuperada",
    };

    return {
      type: "psychological_shift",
      title: titles[band] || "Cambio psicológico",
      severity: band === "quiebre" ? "grave" : band === "paranoia" ? "media" : "leve",
      text: PsychologicalStateSystem.getNarrativeDescription(nextStress),
      stressBand: band,
    };
  }

  static getInterpretationBias(stress = 0) {
    const band = PsychologicalStateSystem.getStressBand(stress);

    const bias = {
      estable: "sin sesgo dominante",
      tension: "hipervigilancia leve",
      agotamiento: "lectura pesimista de testimonios",
      paranoia: "sospecha sobre fuentes oficiales y silencios",
      quiebre: "distorsión emocional intensa",
    };

    return bias[band];
  }
}

class RestRecoverySystem {
  static SAFE_LOCATIONS = new Set(["loc_medical", "loc_command", "loc_trench"]);

  static getLocationLabel(locationId) {
    const labels = {
      loc_medical: "puesto médico",
      loc_command: "puesto de mando",
      loc_trench: "trinchera principal",
      loc_no_mans_land: "tierra de nadie",
    };

    return labels[locationId] || "zona actual";
  }

  static canRest(state) {
    if (!state?.player?.isCreated?.() && !state?.player?.name) return false;
    if (state.bombardmentEffect?.active) return false;
    if (!RestRecoverySystem.SAFE_LOCATIONS.has(state.currentLocationId)) return false;
    if ((state.worldState?.militaryPressure || 0) >= 85 && state.currentLocationId === "loc_command") return false;
    if ((state.player?.stress || 0) <= 0) return false;
    return true;
  }

  static getRestBlockReason(state) {
    if (state.bombardmentEffect?.active) {
      return "No es posible descansar durante un bombardeo.";
    }

    if (!RestRecoverySystem.SAFE_LOCATIONS.has(state.currentLocationId)) {
      return "Esta zona no ofrece seguridad suficiente para tomar respiro.";
    }

    if ((state.worldState?.militaryPressure || 0) >= 85 && state.currentLocationId === "loc_command") {
      return "La vigilancia militar vuelve imposible descansar en el puesto de mando.";
    }

    if ((state.player?.stress || 0) <= 0) {
      return "El corresponsal ya conserva suficiente claridad por ahora.";
    }

    return "No es posible descansar en este momento.";
  }

  static buildRestNarrative(state, amount = 6) {
    const locationLabel = RestRecoverySystem.getLocationLabel(state.currentLocationId);

    if (state.currentLocationId === "loc_medical") {
      return `El corresponsal se aparta unos minutos en el ${locationLabel}; el murmullo médico no borra la guerra, pero ordena un poco la respiración. Estrés -${amount}.`;
    }

    if (state.currentLocationId === "loc_command") {
      return `Entre mapas, humo y papeles secos, el corresponsal recupera una fracción de calma antes de volver al barro. Estrés -${amount}.`;
    }

    return `El corresponsal se sienta al abrigo de la trinchera y deja que el cuerpo recuerde cómo respirar. Estrés -${amount}.`;
  }

  static canTalkToMedicalStaff(state) {
    if (!state?.player?.isCreated?.() && !state?.player?.name) return false;
    if (state.bombardmentEffect?.active) return false;
    if (state.currentLocationId !== "loc_medical") return false;
    if ((state.factionMemory?.medics || 0) <= -40) return false;
    if ((state.player?.stress || 0) <= 0) return false;
    return true;
  }

  static getMedicalTalkBlockReason(state) {
    if (state.bombardmentEffect?.active) {
      return "El personal médico está atendiendo una emergencia durante el bombardeo.";
    }

    if (state.currentLocationId !== "loc_medical") {
      return "Solo es posible hablar con personal médico en el puesto médico.";
    }

    if ((state.factionMemory?.medics || 0) <= -40) {
      return "El personal médico evita colaborar por desconfianza acumulada.";
    }

    if ((state.player?.stress || 0) <= 0) {
      return "El corresponsal no necesita contención médica por ahora.";
    }

    return "No es posible hablar con personal médico en este momento.";
  }

  static buildMedicalTalkNarrative(state, amount = 4) {
    const medicMemory = state.factionMemory?.medics || 0;

    if (medicMemory >= 35) {
      return `Una enfermera reconoce al corresponsal y le habla con una franqueza cuidadosa. No puede detener la guerra, pero le devuelve una calma concreta. Estrés -${amount}.`;
    }

    if (medicMemory <= -20) {
      return `El sanitario responde con frases breves, sin confianza plena, aunque alcanza para que el corresponsal recupere algo de equilibrio. Estrés -${amount}.`;
    }

    return `El personal médico comparte unos minutos de silencio y palabras prácticas. Entre vendas y lámparas débiles, el corresponsal vuelve a ordenar la respiración. Estrés -${amount}.`;
  }

  static canWritePersonalNote(state) {
    if (!state?.player?.isCreated?.() && !state?.player?.name) return false;
    if (state.bombardmentEffect?.active) return false;
    if (!["loc_trench", "loc_command"].includes(state.currentLocationId)) return false;
    if ((state.player?.stress || 0) <= 0) return false;
    return true;
  }

  static getPersonalNoteBlockReason(state) {
    if (state.bombardmentEffect?.active) {
      return "No es posible escribir con calma durante un bombardeo.";
    }

    if (!["loc_trench", "loc_command"].includes(state.currentLocationId)) {
      return "El corresponsal necesita una mesa, una tabla seca o cierta protección para escribir en privado.";
    }

    if ((state.player?.stress || 0) <= 0) {
      return "El corresponsal no necesita ordenar su estado emocional por ahora.";
    }

    return "No es posible escribir una nota personal en este momento.";
  }

  static buildPersonalNoteNarrative(state, amount = 3) {
    const stressBand = PsychologicalStateSystem.getStressBand(state.player?.stress || 0);

    if (stressBand === "quiebre" || stressBand === "paranoia") {
      return `El corresponsal escribe con la letra más dura que de costumbre: no intenta publicar, solo impedir que el miedo organice todas sus ideas. Estrés -${amount}.`;
    }

    if (state.currentLocationId === "loc_command") {
      return `En un borde libre del mapa militar, el corresponsal anota lo que no puede entrar todavía en una crónica. La escritura le devuelve algo de distancia. Estrés -${amount}.`;
    }

    return `Apoyado contra la madera húmeda de la trinchera, el corresponsal escribe unas líneas privadas. No resuelven el horror, pero le permiten nombrarlo. Estrés -${amount}.`;
  }

  static canSleepForHours(state) {
    if (!state?.player?.isCreated?.() && !state?.player?.name) return false;
    if (state.bombardmentEffect?.active) return false;
    if (!["loc_medical", "loc_trench", "loc_command"].includes(state.currentLocationId)) return false;
    if ((state.worldState?.militaryPressure || 0) >= 80 && state.currentLocationId === "loc_command") return false;
    if ((state.player?.stress || 0) <= 0) return false;
    return true;
  }

  static getSleepBlockReason(state) {
    if (state.bombardmentEffect?.active) {
      return "No es posible dormir durante un bombardeo.";
    }

    if (!["loc_medical", "loc_trench", "loc_command"].includes(state.currentLocationId)) {
      return "El corresponsal necesita una zona relativamente protegida para dormir unas horas.";
    }

    if ((state.worldState?.militaryPressure || 0) >= 80 && state.currentLocationId === "loc_command") {
      return "La presión militar vuelve imposible dormir en el puesto de mando.";
    }

    if ((state.player?.stress || 0) <= 0) {
      return "El corresponsal ya conserva suficiente claridad por ahora.";
    }

    return "No es posible dormir en este momento.";
  }

  static buildSleepNarrative(state, amount = 12, hours = 4) {
    const locationLabel = RestRecoverySystem.getLocationLabel(state.currentLocationId);

    if (state.currentLocationId === "loc_medical") {
      return `El corresponsal duerme unas horas en un rincón del ${locationLabel}, entre vendas, pasos urgentes y lámparas bajas. El descanso no borra lo visto, pero devuelve fuerza al cuerpo. Estrés -${amount}. Tiempo +${hours} h.`;
    }

    if (state.currentLocationId === "loc_command") {
      return `El corresponsal cabecea sobre una silla del puesto de mando. Al despertar, los mapas siguen allí, pero el pulso ha bajado. Estrés -${amount}. Tiempo +${hours} h.`;
    }

    return `El corresponsal logra dormir unas horas protegido por la madera húmeda de la trinchera. El frente continúa sin él, y eso también pesa. Estrés -${amount}. Tiempo +${hours} h.`;
  }

  static canUseCivilianShelter(state) {
    if (!state?.player?.isCreated?.() && !state?.player?.name) return false;
    if (state.bombardmentEffect?.active) return false;
    if (!RestRecoverySystem.SAFE_LOCATIONS.has(state.currentLocationId)) return false;
    if (!FactionMemorySystem.getGameplayEffects(state.factionMemory || {}).civilianShelter) return false;
    if ((state.player?.stress || 0) <= 0) return false;
    return true;
  }

  static getCivilianShelterBlockReason(state) {
    if (state.bombardmentEffect?.active) {
      return "Nadie puede guiar al corresponsal hacia un refugio civil durante un bombardeo.";
    }

    if (!RestRecoverySystem.SAFE_LOCATIONS.has(state.currentLocationId)) {
      return "El corresponsal necesita volver a una zona de contacto seguro para encontrar ayuda civil.";
    }

    if (!FactionMemorySystem.getGameplayEffects(state.factionMemory || {}).civilianShelter) {
      return "Los civiles todavía no confían lo suficiente como para ofrecer refugio.";
    }

    if ((state.player?.stress || 0) <= 0) {
      return "El corresponsal no necesita refugio emocional por ahora.";
    }

    return "No es posible acceder al refugio civil en este momento.";
  }

  static buildCivilianShelterNarrative(state, amount = 10, hours = 2) {
    const civilianMemory = state.factionMemory?.civilians || 0;

    if (civilianMemory >= 60) {
      return `Una familia cercana al frente esconde al corresponsal unas horas. Hay sopa aguada, mantas ásperas y una confianza que no pide titulares. Estrés -${amount}. Tiempo +${hours} h.`;
    }

    return `Civiles simpatizantes conducen al corresponsal a un refugio improvisado fuera de la mirada militar. No es descanso verdadero, pero sí una pausa humana. Estrés -${amount}. Tiempo +${hours} h.`;
  }

  static canUseMedicalProtection(state) {
    if (!state?.player?.isCreated?.() && !state?.player?.name) return false;
    if (state.bombardmentEffect?.active) return false;
    if (state.currentLocationId !== "loc_medical") return false;
    if (!FactionMemorySystem.getGameplayEffects(state.factionMemory || {}).medicProtection) return false;
    if (state.flags?.medicalProtectionActive) return false;
    if ((state.player?.stress || 0) <= 0) return false;
    return true;
  }

  static getMedicalProtectionBlockReason(state) {
    if (state.bombardmentEffect?.active) {
      return "El personal médico no puede proteger al corresponsal durante un bombardeo.";
    }

    if (state.currentLocationId !== "loc_medical") {
      return "La protección médica solo puede solicitarse en el puesto médico.";
    }

    if (!FactionMemorySystem.getGameplayEffects(state.factionMemory || {}).medicProtection) {
      return "Los médicos todavía no confían lo suficiente como para ocultar o proteger al corresponsal.";
    }

    if (state.flags?.medicalProtectionActive) {
      return "La protección médica ya está activa.";
    }

    if ((state.player?.stress || 0) <= 0) {
      return "El corresponsal no necesita protección emocional por ahora.";
    }

    return "No es posible activar protección médica en este momento.";
  }

  static buildMedicalProtectionNarrative(state, amount = 8, minutes = 60) {
    return `El personal médico mantiene al corresponsal unas horas fuera de la mirada directa del mando. No es descanso puro: es una protección silenciosa entre camillas, vendas y lámparas bajas. Estrés -${amount}. Tiempo +${Math.round(minutes / 60)} h.`;
  }
}

class NarrativeStressSystem {
  static clampStress(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  static getStressLabel(stress = 0) {
    const band = PsychologicalStateSystem.getStressBand(stress);
    const labels = {
      estable: "Claridad conservada",
      tension: "Tensión acumulada",
      agotamiento: "Agotamiento persistente",
      paranoia: "Desconfianza creciente",
      quiebre: "Al borde del quiebre",
    };
    return labels[band] || labels.estable;
  }

  static getClarityDescription(stress = 0) {
    const band = PsychologicalStateSystem.getStressBand(stress);
    const descriptions = {
      estable: "La mirada todavía puede ordenar fuentes, gestos y silencios.",
      tension: "El ruido del frente empieza a colarse entre cada interpretación.",
      agotamiento: "La fatiga vuelve lento el pensamiento y endurece las conclusiones.",
      paranoia: "Cada documento parece ocultar una segunda intención.",
      quiebre: "La supervivencia inmediata amenaza con reemplazar a la investigación.",
    };
    return descriptions[band] || descriptions.estable;
  }

  static buildStressNarrative({ reason = "front", amount = 0, adjustedAmount = amount, eventType = "" }) {
    const gain = adjustedAmount >= 0;
    const magnitude = Math.abs(adjustedAmount);

    if (!gain) {
      return "El corresponsal recupera algo de aire; la guerra no desaparece, pero vuelve a escuchar sus propios pensamientos.";
    }

    if (reason === "terrain_mud") {
      return magnitude >= 1
        ? "El barro tira de las botas y convierte cada paso en una pequeña derrota física."
        : "El terreno pesado deja una incomodidad leve en el cuerpo.";
    }

    if (reason === "bombardment" || eventType === "bombardment") {
      return magnitude >= 5
        ? "La explosión no solo sacude el suelo: deja un zumbido seco en la cabeza del corresponsal."
        : "La artillería lejana atraviesa el pecho como una advertencia sorda.";
    }

    if (reason === "rest") {
      return "El corresponsal recupera algo de aire; la guerra no desaparece, pero vuelve a escuchar sus propios pensamientos.";
    }

    if (reason === "censorship") {
      return "La censura pesa como una amenaza concreta: no todo lo visto podrá ser escrito sin consecuencias.";
    }

    if (reason === "publication") {
      return "Publicar también desgasta: cada frase puede abrir una puerta o cerrar una vida.";
    }

    if (eventType) {
      return PsychologicalHabituationSystem.buildHabituationDescription(
        eventType,
        0
      );
    }

    return "La presión del frente se acumula de forma silenciosa.";
  }

  static applyStress({ player, notebook, amount = 0, reason = "front", eventType = null }) {
    const nextPlayer = new Player(player);
    const nextNotebook = cloneNotebook(notebook);
    const previousStress = nextPlayer.stress;
    let adjustedAmount = Number(amount) || 0;
    let resistanceLevel = null;

    if (eventType && adjustedAmount > 0) {
      resistanceLevel = PsychologicalHabituationSystem.registerExposure(nextPlayer, eventType);
      adjustedAmount = PsychologicalHabituationSystem.calculateStressImpact(
        adjustedAmount,
        resistanceLevel
      );
    }

    if (adjustedAmount > 0) nextPlayer.increaseStress(adjustedAmount);
    if (adjustedAmount < 0) nextPlayer.reduceStress(Math.abs(adjustedAmount));
    nextPlayer.stress = NarrativeStressSystem.clampStress(nextPlayer.stress);

    const shouldLogStress =
      adjustedAmount !== 0 &&
      !(reason === "terrain_mud" && Math.abs(adjustedAmount) < 1);

    if (shouldLogStress) {
      nextNotebook.addActivityLog({
        type: "estado emocional",
        severity:
          Math.abs(adjustedAmount) >= 8
            ? "grave"
            : Math.abs(adjustedAmount) >= 4
              ? "media"
              : "leve",
        text: NarrativeStressSystem.buildStressNarrative({
          reason,
          amount,
          adjustedAmount,
          eventType,
        }),
      });
    }

    if (eventType && resistanceLevel !== null) {
      nextNotebook.addCaseEvent({
        type: "psychological_exposure",
        title: "Exposición traumática",
        severity: adjustedAmount >= 8 ? "grave" : adjustedAmount >= 4 ? "media" : "leve",
        text: PsychologicalHabituationSystem.buildHabituationDescription(
          eventType,
          resistanceLevel
        ),
      });
    }

    if (
      PsychologicalStateSystem.shouldTriggerPsychologicalEvent(
        previousStress,
        nextPlayer.stress
      )
    ) {
      nextNotebook.addCaseEvent(
        PsychologicalStateSystem.buildStressTransitionEvent(
          previousStress,
          nextPlayer.stress
        )
      );
    }

    return {
      player: nextPlayer,
      notebook: nextNotebook,
      previousStress,
      adjustedAmount,
    };
  }
}

class MapZoneSystem {
  static ZONES = [
    {
      id: "loc_no_mans_land",
      contains: (x, y) => y <= 20,
    },
    {
      id: "loc_medical",
      contains: (x, y) => x >= 70 && y >= 21,
    },
    {
      id: "loc_command",
      contains: (x, y) => x <= 32 && y >= 21,
    },
    {
      id: "loc_trench",
      contains: () => true,
    },
  ];

  static getLocationIdAtPosition(position = {}, fallback = "loc_trench") {
    const x = Number(position.x) || 0;
    const y = Number(position.y) || 0;
    const zone = MapZoneSystem.ZONES.find((item) => item.contains(x, y));
    return zone?.id || fallback;
  }
}

class ExplorationAwarenessSystem {
  static getNearbyEntities(state, maxDistance = 3) {
    const currentMap = AsciiMapEngine.getCurrentMap(state);

    if (!currentMap) return [];

    return currentMap.entities
      .map((entity) => {
        const dx = entity.x - state.playerPosition.x;
        const dy = entity.y - state.playerPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { ...entity, distance };
      })
      .filter((entity) => entity.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
  }

  static getFacingEntityDescription(state) {
    const nearby = ExplorationAwarenessSystem.getNearbyEntities(state, 2);
    const entity = nearby[0];
    if (!entity) return "No hay nadie ni nada claramente distinguible a unos pasos.";

    if (entity.type === "npc" || entity.type === "ambient_npc") {
      const npc = state.npcs.find((item) => item.id === entity.linkedId);
      return npc
        ? `${npc.name} está cerca: ${npc.description}`
        : `${entity.label} permanece cerca, parcialmente cubierto por sombras y barro.`;
    }

    if (entity.type === "evidence") {
      const evidence = state.evidenceDatabase.find((item) => item.id === entity.linkedId);
      return evidence
        ? `A pocos pasos se distingue ${evidence.title}. ${evidence.description}`
        : `Hay un objeto dudoso cerca: ${entity.label}.`;
    }

    return `${entity.label} está cerca.`;
  }

  static getTileObservation(state) {
    const currentMap = AsciiMapEngine.getCurrentMap(state);

    if (!currentMap) return "El corresponsal no logra orientarse en el terreno.";

    const tileChar = currentMap.getTileChar(state.playerPosition.x, state.playerPosition.y);
    const tile = TileBehaviorSystem.getDefinition(tileChar);
    const elevation = tile.elevation;

    if (elevation === "trench") {
      return "Está dentro de la trinchera: las paredes de barro y sacos recortan la visión lateral.";
    }

    if (elevation === "trench_edge") {
      return "Está en el borde de la trinchera: puede asomarse hacia el terreno abierto, pero queda expuesto.";
    }

    if (tileChar === "~") {
      return "El barro se hunde bajo las botas y cada paso cuesta más de lo razonable.";
    }

    if (tileChar === ".") {
      return "El terreno abierto parece quieto, pero cualquier silueta puede ser observada desde lejos.";
    }

    return `Pisa ${tile.label}.`;
  }

  static getWeatherObservation(previousWeather, currentWeather) {
    if (!currentWeather) return "";
    if (previousWeather && previousWeather !== currentWeather) {
      if (currentWeather.toLowerCase().includes("lluvia")) {
        return "Empieza a llover con más fuerza; el barro gana peso y la visibilidad se vuelve sucia.";
      }
      if (currentWeather.toLowerCase().includes("niebla")) {
        return "La niebla se espesa y borra las distancias entre la trinchera y la tierra de nadie.";
      }
      return `El clima cambia: ${currentWeather}.`;
    }

    if (currentWeather.toLowerCase().includes("lluvia")) {
      return "La lluvia insiste sobre las tablas y hace que todo parezca más bajo, más pesado.";
    }

    if (currentWeather.toLowerCase().includes("niebla")) {
      return "La niebla mantiene el frente en una distancia incierta.";
    }

    if (currentWeather.toLowerCase().includes("humo")) {
      return "El viento arrastra humo de artillería y deja un sabor metálico en la boca.";
    }

    return `El clima se mantiene como ${currentWeather.toLowerCase()}.`;
  }

  static buildObservationSignature(state) {
    const currentMap = AsciiMapEngine.getCurrentMap(state);
    const nearby = ExplorationAwarenessSystem.getNearbyEntities(state, 2)[0];
    const tileChar = currentMap?.getTileChar(state.playerPosition.x, state.playerPosition.y) || " ";

    return [
      state.currentLocationId,
      TimeSystem.getDayMoment(state.time).label,
      state.time.weather,
      tileChar,
      nearby?.id || "none",
      state.bombardmentEffect?.active ? state.bombardmentEffect.intensity : "calm",
    ].join("|");
  }

  static buildCurrentObservation(state, previousWeather = null) {
    const currentLocation = state.locations.find(
      (location) => location.id === state.currentLocationId
    );
    const momentDescription = TimeSystem.getMomentDescription(state.time);
    const weatherLine = ExplorationAwarenessSystem.getWeatherObservation(
      previousWeather,
      state.time.weather
    );
    const tileLine = ExplorationAwarenessSystem.getTileObservation(state);
    const entityLine = ExplorationAwarenessSystem.getFacingEntityDescription(state);
    const bombardmentLine = BombardmentSystem.getAtmosphereLine(state.bombardmentEffect);

    return [
      currentLocation ? `Lugar: ${currentLocation.name}. ${currentLocation.description}` : "Lugar no identificado.",
      momentDescription,
      weatherLine,
      tileLine,
      entityLine,
      bombardmentLine,
    ]
      .filter(Boolean)
      .join(" ");
  }
}

class BombardmentSystem {
  static getCurrentMap(state) {
    return AsciiMapEngine.getCurrentMap(state);
  }

  static getDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static isProtectedImpactTile(state, map, x, y) {
    if (!map) return true;
    if (!TileBehaviorSystem.isWalkableTile(map, x, y)) return true;

    const playerDistance = BombardmentSystem.getDistance(
      { x, y },
      state.playerPosition
    );

    if (playerDistance < 4) return true;

    const entity = map.entities.find(
      (item) => item.visible && item.x === x && item.y === y
    );

    if (entity?.caseCritical || entity?.procedural === false) return true;
    if (entity?.type === "npc" && !entity.procedural) return true;
    if (entity?.interactionType === "evidence") return true;

    return false;
  }

  static findImpactPoint(state, bombardment) {
    const map = BombardmentSystem.getCurrentMap(state);
    if (!map) return null;

    const origin = state.playerPosition || { x: 12, y: 29 };
    const minDistance = bombardment.intensity === "cercano" ? 4 : 10;
    const maxDistance = bombardment.intensity === "cercano" ? 10 : 22;
    const candidates = [];

    for (let y = 1; y < map.height - 1; y += 1) {
      for (let x = 1; x < map.width - 1; x += 1) {
        const distance = BombardmentSystem.getDistance({ x, y }, origin);
        if (distance < minDistance || distance > maxDistance) continue;
        if (BombardmentSystem.isProtectedImpactTile(state, map, x, y)) continue;

        const tileChar = map.getTileChar(x, y);
        const score =
          tileChar === "." ? 4 :
          tileChar === "~" ? 3 :
          tileChar === "+" ? 2 :
          tileChar === "=" ? 1 : 0;

        candidates.push({ x, y, score });
      }
    }

    if (!candidates.length) return null;

    const weighted = candidates.flatMap((candidate) =>
      Array.from({ length: Math.max(1, candidate.score) }, () => candidate)
    );

    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  static applyImpactToMap(state, bombardment) {
    const impact = BombardmentSystem.findImpactPoint(state, bombardment);
    if (!impact) {
      return {
        asciiMaps: state.asciiMaps,
        impact: null,
        casualties: [],
        rescueSpawned: false,
      };
    }

    const currentDay = state.time?.day || 1;
    const casualties = [];
    let rescueSpawned = false;

    const asciiMaps = state.asciiMaps.map((map) => {
      if (map.id !== BombardmentSystem.getCurrentMap(state)?.id) return map;

      const nextMap = new AsciiMap(map);
      const nextLayout = [...nextMap.layout];
      const row = nextLayout[impact.y] || "";
      nextLayout[impact.y] = `${row.slice(0, impact.x)}~${row.slice(impact.x + 1)}`;
      nextMap.layout = AsciiMap.normalizeLayout(nextLayout);

      nextMap.entities = nextMap.entities.map((entity) => {
        if (!entity.visible || entity.caseCritical) return entity;
        if (!ProceduralNPCSystem.isProceduralEntity(entity)) return entity;
        if (entity.alive === false || entity.corpse) return entity;

        const distance = BombardmentSystem.getDistance(entity, impact);
        if (distance > 1.6) return entity;

        casualties.push({
          entityId: entity.id,
          npcId: entity.linkedId,
          x: entity.x,
          y: entity.y,
          fatal: distance <= 1.1,
        });

        return new MapEntity({
          ...entity,
          type: distance <= 1.1 ? "corpse" : "wounded",
          label: distance <= 1.1 ? "Cadáver embarrado" : "Soldado herido",
          char: distance <= 1.1 ? "x" : "!",
          interactionType: "none",
          alive: false,
          corpse: distance <= 1.1,
          wounded: distance > 1.1,
          evacDay: null,
          respawnDay: currentDay + 3,
          colorClass: distance <= 1.1 ? "text-red-700" : "text-yellow-300",
        });
      });

      if (casualties.length > 0) {
        casualties.forEach((casualty) => {
          const rescueSpawn = ProceduralNPCSystem.findRescueSpawnPosition(
            nextMap,
            nextMap.entities,
            state.playerPosition
          );
          if (!rescueSpawn) return;
          rescueSpawned = true;
          nextMap.entities.push(
            new MapEntity({
              id: createId("ent_medic_response"),
              type: "ambient_medic",
              label: "Camillero del puesto médico",
              x: rescueSpawn.x,
              y: rescueSpawn.y,
              char: "m",
              linkedId: null,
              interactionType: "none",
              procedural: true,
              caseCritical: false,
              alive: true,
              colorClass: "text-cyan-300",
              rescueTargetEntityId: casualty.entityId,
              rescueState: "to_casualty",
              evacDay: null,
            })
          );
        });
      }

      return nextMap;
    });

    return {
      asciiMaps,
      impact,
      casualties,
      rescueSpawned,
    };
  }

  static shouldTrigger(timeState, locationId, flags = {}, worldState = {}) {
    if (flags.bombardmentCooldown) return false;

    const moment = TimeSystem.getDayMoment(timeState).label;
    const locationRisk = {
      loc_no_mans_land: 0.45,
      loc_trench: 0.25,
      loc_medical: 0.12,
      loc_command: 0.08,
    };

    const momentModifier =
      moment === "Noche" || moment === "Madrugada"
        ? 0.08
        : moment === "Día"
          ? 0.03
          : 0.05;

    const militaryPressureModifier = Math.min(
      ((worldState?.militaryPressure || 0) / 100) * 0.12,
      0.12
    );

    const chance =
      (locationRisk[locationId] || 0.1) +
      momentModifier +
      militaryPressureModifier;

    return Math.random() < chance;
  }

  static buildEvent(locationId, timeState = {}, worldState = {}) {
    const intenseLocations = new Set(["loc_no_mans_land", "loc_trench"]);
    const moment = TimeSystem.getDayMoment(timeState).label;
    const pressure = worldState?.militaryPressure || 0;
    const intense = intenseLocations.has(locationId) || pressure >= 75;
    const night = moment === "Noche" || moment === "Madrugada";

    return {
      intensity: intense ? "cercano" : "lejano",
      stress: intense ? (night ? 6 : 5) : 2,
      shakeMs: intense ? 900 : 500,
      message: intense
        ? night
          ? "Una explosión rasga la oscuridad y deja el barro brillando por un instante."
          : "Una explosión cercana ilumina el barro y sacude la trinchera."
        : "La artillería cae a la distancia como un trueno apagado.",
      severity: intense ? "media" : "leve",
      atmosphereTag: night ? "oscuridad_interrumpida" : "artilleria_ambiental",
    };
  }

  static getAtmosphereLine(effect) {
    if (!effect?.active) return "";

    if (effect.intensity === "cercano") {
      return "El frente queda suspendido unos segundos después del estallido.";
    }

    return "La artillería lejana recuerda que la calma es apenas una pausa.";
  }
}

class GameFlowSystem {
  static processCaseTimeline(state, nextTime, sourceNotebook) {
    const elapsedTimelineDays = Math.max(
      0,
      (nextTime?.day || state.time.day) -
        (state.lastTimelineUpdateDay || state.time.day)
    );

    const narrativeFlags =
      elapsedTimelineDays > 0
        ? NarrativeFlagSystem.advanceDays(
            state.narrativeFlags,
            elapsedTimelineDays
          )
        : state.narrativeFlags;

    const updatedCaseTimeline = CaseTimelineSystem.updateCases(
      state.cases,
      nextTime,
      narrativeFlags,
      state.lastTimelineUpdateDay
    );

    const notebook = cloneNotebook(sourceNotebook || state.notebook);

    updatedCaseTimeline.events.forEach((event) => {
      notebook.addCaseEvent(event);
    });

    const activeCaseId = notebook.activeCase?.id;

    if (activeCaseId) {
      const refreshedActiveCase = updatedCaseTimeline.cases.find(
        (caseFile) => caseFile.id === activeCaseId
      );

      if (
        refreshedActiveCase &&
        ["expired", "suppressed"].includes(refreshedActiveCase.status)
      ) {
        notebook.archivedCases = notebook.archivedCases || [];

        const alreadyArchived = notebook.archivedCases.some(
          (caseFile) => caseFile.id === refreshedActiveCase.id
        );

        if (!alreadyArchived) {
          notebook.archivedCases = [
            ...(notebook.archivedCases || []),
            refreshedActiveCase,
          ].slice(-Notebook.MAX_ARCHIVED_CASES);
        }

        notebook.activeCase = null;

        notebook.addCaseEvent({
          type: "active_case_closed",
          title: refreshedActiveCase.title,
          severity: "media",
          text:
            refreshedActiveCase.status === "expired"
              ? "La investigación queda incompleta: el caso perdió vigencia histórica antes de resolverse."
              : "La investigación fue suprimida y ya no puede continuar abiertamente.",
        });
      }
    }

    return {
      notebook,
      narrativeFlags,
      cases: updatedCaseTimeline.cases,
      lastTimelineUpdateDay:
        updatedCaseTimeline.processedDay || state.lastTimelineUpdateDay,
    };
  }

  static advanceTimeWithAmbientEvents(state, minutes = 10) {
    const safeMinutes = Math.max(0, Number(minutes) || 10);
    const nextTime = TimeSystem.advanceTime(state.time, safeMinutes);
    const factionMemory =
      safeMinutes >= 60
        ? FactionMemorySystem.evolveOverTime(state.factionMemory, state.worldState)
        : state.factionMemory;

    const routineResult = ProceduralNPCSystem.advanceRoutines(
      {
        ...state,
        time: nextTime,
      },
      safeMinutes
    );

    if (
      safeMinutes >= 10 &&
      BombardmentSystem.shouldTrigger(
        nextTime,
        state.currentLocationId,
        state.flags,
        state.worldState
      )
    ) {
      const bombardment = BombardmentSystem.buildEvent(
        state.currentLocationId,
        nextTime,
        state.worldState
      );
      const notebookWithRoutineLog = cloneNotebook(state.notebook);
      (routineResult.activityLogEntries || []).forEach((entry) => {
        notebookWithRoutineLog.addActivityLog(entry);
      });

      const impactResult = BombardmentSystem.applyImpactToMap(
        {
          ...state,
          time: nextTime,
          asciiMaps: routineResult.asciiMaps,
        },
        bombardment
      );

      const stressResult = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: notebookWithRoutineLog,
        amount: bombardment.stress,
        reason: "bombardment",
        eventType: "bombardment",
      });
      const player = stressResult.player;
      const notebook = stressResult.notebook;
      notebook.addCaseEvent({
        type: "ambient_bombardment",
        title: "Bombardeo ambiental",
        severity: bombardment.severity,
        text: impactResult.casualties.length > 0
          ? `${bombardment.message} La explosión alcanza a ${impactResult.casualties.length} soldado(s) del frente.`
          : bombardment.message,
        atmosphereTag: bombardment.atmosphereTag,
        impact: impactResult.impact,
      });

      const timelineResult = GameFlowSystem.processCaseTimeline(
        state,
        nextTime,
        notebook
      );

      return {
        time: nextTime,
        factionMemory,
        asciiMaps: impactResult.asciiMaps,
        npcs: routineResult.npcs,
        player,
        notebook: timelineResult.notebook,
        narrativeFlags: timelineResult.narrativeFlags,
        cases: timelineResult.cases,
        lastTimelineUpdateDay: timelineResult.lastTimelineUpdateDay,
        bombardmentEffect: {
          active: true,
          message: impactResult.casualties.length > 0
            ? `${bombardment.message} Hay gritos en la línea.`
            : bombardment.message,
          intensity: bombardment.intensity,
          shakeMs: bombardment.shakeMs,
          startedAt: Date.now(),
          impact: impactResult.impact,
        },
        lastMapMessage: impactResult.casualties.length > 0
          ? "La bomba abrió un cráter y alcanzó a soldados ambientales."
          : bombardment.message,
        flags: {
          ...state.flags,
          bombardmentCooldown: true,
        },
      };
    }

    const notebookWithRoutineLog = cloneNotebook(state.notebook);
    (routineResult.activityLogEntries || []).forEach((entry) => {
      notebookWithRoutineLog.addActivityLog(entry);
    });

    const timelineResult = GameFlowSystem.processCaseTimeline(
      state,
      nextTime,
      notebookWithRoutineLog
    );

    return {
      time: nextTime,
      factionMemory,
      asciiMaps: routineResult.asciiMaps,
      npcs: routineResult.npcs,
      notebook: timelineResult.notebook,
      narrativeFlags: timelineResult.narrativeFlags,
      cases: timelineResult.cases,
      lastTimelineUpdateDay: timelineResult.lastTimelineUpdateDay,
      flags: {
        ...state.flags,
        bombardmentCooldown: false,
      },
    };
  }
}

class TimeSystem {
  static DAY_MOMENTS = {
    madrugada: {
      label: "Madrugada",
      description: "El frente permanece en una penumbra húmeda y tensa.",
      visibilityModifier: -4,
      atmosphereClass: "bg-slate-950/40 border-slate-900",
    },
    amanecer: {
      label: "Amanecer",
      description: "La luz gris revela lentamente el barro, las alambradas y los restos de la noche.",
      visibilityModifier: 0,
      atmosphereClass: "bg-stone-900/50 border-stone-800",
    },
    dia: {
      label: "Día",
      description: "La claridad vuelve más visible el frente, pero también expone cada movimiento.",
      visibilityModifier: 5,
      atmosphereClass: "bg-yellow-950/20 border-yellow-900/40",
    },
    atardecer: {
      label: "Atardecer",
      description: "El frente se vuelve rojizo y confuso mientras las sombras crecen entre las trincheras.",
      visibilityModifier: -1,
      atmosphereClass: "bg-orange-950/20 border-orange-900/40",
    },
    noche: {
      label: "Noche",
      description: "La oscuridad reduce la visibilidad y vuelve cada sonido más sospechoso.",
      visibilityModifier: -5,
      atmosphereClass: "bg-black/40 border-stone-900",
    },
  };

  static WEATHER_STATES = [
    "Lluvia intensa",
    "Niebla espesa",
    "Llovizna fría",
    "Silencio húmedo",
    "Viento con humo de artillería",
  ];

  static advanceTime(timeState, minutes = 10) {
    const safeTime = timeState || {
      day: 1,
      hour: 5,
      minute: 40,
      weather: "Lluvia intensa",
    };

    const totalMinutes = safeTime.hour * 60 + safeTime.minute + minutes;
    const nextDay = safeTime.day + Math.floor(totalMinutes / (24 * 60));
    const normalizedMinutes = totalMinutes % (24 * 60);
    const nextHour = Math.floor(normalizedMinutes / 60);
    const nextMinute = normalizedMinutes % 60;

    let weather = safeTime.weather;

    if (Math.random() > 0.7) {
      weather =
        TimeSystem.WEATHER_STATES[
          Math.floor(Math.random() * TimeSystem.WEATHER_STATES.length)
        ];
    }

    return {
      ...safeTime,
      day: nextDay,
      hour: nextHour,
      minute: nextMinute,
      weather,
    };
  }

  static formatTime(timeState) {
    const safeTime = timeState || {
      day: 1,
      hour: 5,
      minute: 40,
      weather: "Lluvia intensa",
    };

    const hour = String(safeTime.hour).padStart(2, "0");
    const minute = String(safeTime.minute).padStart(2, "0");
    const moment = TimeSystem.getDayMoment(safeTime);
    return `Día ${safeTime.day} · ${hour}:${minute} · ${moment.label}`;
  }

  static getDayMoment(timeState) {
    const hour = timeState?.hour ?? 12;

    if (hour >= 0 && hour < 5) return TimeSystem.DAY_MOMENTS.madrugada;
    if (hour >= 5 && hour < 8) return TimeSystem.DAY_MOMENTS.amanecer;
    if (hour >= 8 && hour < 17) return TimeSystem.DAY_MOMENTS.dia;
    if (hour >= 17 && hour < 21) return TimeSystem.DAY_MOMENTS.atardecer;
    return TimeSystem.DAY_MOMENTS.noche;
  }

  static getVisibilityRadius(baseRadius, timeState, map = null) {
    const moment = TimeSystem.getDayMoment(timeState);
    const momentLabel = moment?.label;

    // Durante el día la visibilidad debe cubrir todo el mapa visible de la zona.
    // En amanecer y atardecer se reduce aproximadamente a la mitad.
    // La noche y la madrugada conservan el comportamiento anterior.
    if (map?.width && map?.height) {
      const fullMapRadius = Math.ceil(Math.sqrt(map.width * map.width + map.height * map.height));

      if (momentLabel === "Día") {
        return fullMapRadius;
      }

      if (momentLabel === "Amanecer" || momentLabel === "Atardecer") {
        return Math.max(3, Math.ceil(fullMapRadius / 2));
      }
    }

    return Math.max(3, baseRadius + (moment.visibilityModifier || 0));
  }

  static getMomentDescription(timeState) {
    return TimeSystem.getDayMoment(timeState).description;
  }

  static isNight(timeState) {
    return timeState.hour >= 21 || timeState.hour < 5;
  }
}

class FactionEventSystem {
  static buildDynamicEvents(factionMemory = {}) {
    const events = [];

    if ((factionMemory.army || 0) <= -60) {
      events.push({
        id: createId("faction_event"),
        faction: "army",
        severity: "grave",
        title: "Amenaza militar",
        text:
          "Un oficial advierte que ciertas publicaciones empiezan a ser consideradas peligrosas para la estabilidad del frente.",
      });
    }

    if ((factionMemory.deserters || 0) >= 45) {
      events.push({
        id: createId("faction_event"),
        faction: "deserters",
        severity: "media",
        title: "Contacto clandestino",
        text:
          "Un desertor ofrece información sobre ejecuciones y desapariciones dentro de las trincheras.",
      });
    }

    if ((factionMemory.medics || 0) >= 40) {
      events.push({
        id: createId("faction_event"),
        faction: "medics",
        severity: "leve",
        title: "Ayuda silenciosa",
        text:
          "Personal médico esconde temporalmente al corresponsal durante una inspección militar.",
      });
    }

    if ((factionMemory.press || 0) <= -40) {
      events.push({
        id: createId("faction_event"),
        faction: "press",
        severity: "media",
        title: "Rumores editoriales",
        text:
          "Otros corresponsales empiezan a describir tus crónicas como exageradas e inestables.",
      });
    }

    if ((factionMemory.civilians || 0) >= 35) {
      events.push({
        id: createId("faction_event"),
        faction: "civilians",
        severity: "leve",
        title: "Refugio improvisado",
        text:
          "Una familia local ofrece refugio y comida lejos de la vigilancia militar.",
      });
    }

    return events;
  }
}

class FactionMemorySystem {
  static RIVALRIES = {
    army: { deserters: -4, civilians: -2 },
    deserters: { army: -6 },
    civilians: { army: -2, press: 1 },
    medics: { army: -1, civilians: 2 },
    press: { army: -2, civilians: 1 },
  };

  static DEFAULT_FACTIONS = {
    army: 0,
    civilians: 0,
    medics: 0,
    deserters: 0,
    press: 0,
  };

  static clamp(value) {
    return Math.max(-100, Math.min(100, Number(value) || 0));
  }

  static applyChanges(memory = {}, changes = {}) {
    const nextMemory = {
      ...FactionMemorySystem.DEFAULT_FACTIONS,
      ...memory,
    };

    Object.entries(changes).forEach(([faction, amount]) => {
      nextMemory[faction] = FactionMemorySystem.clamp(
        (nextMemory[faction] || 0) + (Number(amount) || 0)
      );
    });

    return nextMemory;
  }

  static getFactionState(value = 0) {
    if (value >= 60) return "aliados";
    if (value >= 20) return "favorables";
    if (value <= -60) return "hostiles";
    if (value <= -20) return "desconfiados";
    return "inciertos";
  }

  static buildNarrative(faction, value) {
    const state = FactionMemorySystem.getFactionState(value);

    const factionLabels = {
      army: "el ejército",
      civilians: "los civiles",
      medics: "los médicos",
      deserters: "los desertores",
      press: "la prensa",
    };

    return `${factionLabels[faction] || faction} considera al corresponsal ${state}.`;
  }

  static applyRivalryReactions(changes = {}) {
    const rivalryChanges = {};

    Object.entries(changes).forEach(([faction, amount]) => {
      if (amount <= 0) return;
      const rivals = FactionMemorySystem.RIVALRIES[faction] || {};

      Object.entries(rivals).forEach(([rivalFaction, rivalAmount]) => {
        rivalryChanges[rivalFaction] =
          (rivalryChanges[rivalFaction] || 0) + rivalAmount;
      });
    });

    return rivalryChanges;
  }

  static evolveOverTime(memory = {}, worldState = {}) {
    const state = new WorldState(worldState);
    const changes = {};

    if (state.militaryPressure >= 70) {
      changes.army = 1;
      changes.deserters = -1;
      changes.civilians = -1;
    }

    if (state.publicMorale <= 30) {
      changes.civilians = (changes.civilians || 0) - 1;
      changes.deserters = (changes.deserters || 0) + 1;
    }

    if (state.credibility >= 70) {
      changes.press = (changes.press || 0) + 1;
      changes.civilians = (changes.civilians || 0) + 1;
    }

    if (Object.keys(changes).length === 0) return memory;
    return FactionMemorySystem.applyChanges(memory, changes);
  }

  static getGameplayEffects(memory = {}) {
    return {
      armyAccessBlocked: (memory.army || 0) <= -60,
      armyCheckpointActive: (memory.army || 0) <= -30,
      deserterIntelUnlocked: (memory.deserters || 0) >= 40,
      deserterContactHidden: (memory.deserters || 0) <= -30,
      medicProtection: (memory.medics || 0) >= 35,
      medicRefusesHelp: (memory.medics || 0) <= -40,
      pressSupport: (memory.press || 0) >= 50,
      pressSmearsPlayer: (memory.press || 0) <= -40,
      civilianRumors: (memory.civilians || 0) <= -30,
      civilianShelter: (memory.civilians || 0) >= 35,
    };
  }
}

class NarrativeFlagSystem {
  static DEFAULT_DURATIONS = {
    militaryDistrust: 4,
    civilianSupport: 5,
    propagandaLinked: 3,
    sourcesDisappearing: 6,
  };

  static applyFlags(existingFlags = {}, newFlags = {}) {
    const nextFlags = {
      ...existingFlags,
    };

    Object.entries(newFlags).forEach(([flagId, value]) => {
      if (!value) return;

      nextFlags[flagId] = {
        active: true,
        remainingDays:
          NarrativeFlagSystem.DEFAULT_DURATIONS[flagId] || 3,
      };
    });

    return nextFlags;
  }

  static hasFlag(flags = {}, flagId) {
    return Boolean(flags?.[flagId]?.active);
  }

  static advanceDays(flags = {}, days = 1) {
    const elapsedDays = Math.max(1, Number(days) || 1);
    const nextFlags = {};

    Object.entries(flags).forEach(([flagId, data]) => {
      const remainingDays = Math.max(
        0,
        (data?.remainingDays || 0) - elapsedDays
      );

      if (remainingDays > 0) {
        nextFlags[flagId] = {
          active: true,
          remainingDays,
        };
      }
    });

    return nextFlags;
  }

  static advanceDay(flags = {}) {
    return NarrativeFlagSystem.advanceDays(flags, 1);
  }
}

class PersistentConsequenceSystem {
  static MAX_PERSISTENT_CONSEQUENCES = 30;

  static createConsequencesFromArticle(article, state) {
    const consequences = [];
    const narrativeFlags = {};
    const tone = article?.tone || "neutral";
    const militaryPressure = state.worldState?.militaryPressure || 0;

    if (tone === "critico") {
      narrativeFlags.militaryDistrust = true;

      consequences.push({
        id: createId("persistent_consequence"),
        type: "military_hostility",
        title: "Hostilidad militar acumulada",
        severity: "grave",
        description:
          "Las autoridades militares empiezan a identificar al corresponsal como una amenaza narrativa persistente.",
        permanent: true,
      });
    }

    if (tone === "humanitario") {
      narrativeFlags.civilianSupport = true;

      consequences.push({
        id: createId("persistent_consequence"),
        type: "civilian_support",
        title: "Red civil de apoyo",
        severity: "media",
        description:
          "Familias, heridos y testigos empiezan a compartir rutas seguras e información fuera del control militar.",
        permanent: true,
      });
    }

    if (tone === "propaganda") {
      narrativeFlags.propagandaLinked = true;

      consequences.push({
        id: createId("persistent_consequence"),
        type: "false_narratives",
        title: "Narrativas distorsionadas",
        severity: "grave",
        description:
          "Parte del frente comienza a repetir versiones manipuladas de los hechos publicados.",
        permanent: true,
      });
    }

    if (militaryPressure >= 75 && tone === "critico") {
      narrativeFlags.sourcesDisappearing = true;

      consequences.push({
        id: createId("persistent_consequence"),
        type: "source_disappearances",
        title: "Desaparición de fuentes",
        severity: "grave",
        description:
          "Algunas fuentes dejan de responder después de las últimas publicaciones críticas.",
        permanent: true,
      });
    }

    return {
      consequences,
      narrativeFlags,
    };
  }

  static dedupeConsequences(consequences = []) {
    const seen = new Set();

    return consequences
      .filter((consequence) => {
        const key = `${consequence.type}:${consequence.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(-PersistentConsequenceSystem.MAX_PERSISTENT_CONSEQUENCES);
  }

  static applyConsequencesToWorld(worldState, consequences = []) {
    let nextState = new WorldState(worldState);

    consequences.forEach((consequence) => {
      if (consequence.type === "military_hostility") {
        nextState = WorldStateSystem.applyChanges(nextState, { militaryPressure: 6 });
      }

      if (consequence.type === "civilian_support") {
        nextState = WorldStateSystem.applyChanges(nextState, { credibility: 4 });
      }

      if (consequence.type === "false_narratives") {
        nextState = WorldStateSystem.applyChanges(nextState, {
          credibility: -8,
          publicMorale: 5,
        });
      }

      if (consequence.type === "source_disappearances") {
        nextState = WorldStateSystem.applyChanges(nextState, {
          militaryPressure: 4,
          publicMorale: -4,
        });
      }
    });

    return nextState;
  }
}

class WorldState {
  constructor({ credibility = 50, militaryPressure = 0, publicMorale = 50 } = {}) {
    this.credibility = Math.max(0, Math.min(100, credibility));
    this.militaryPressure = Math.max(0, Math.min(100, militaryPressure));
    this.publicMorale = Math.max(0, Math.min(100, publicMorale));
  }
}

class WorldStateSystem {
  static clamp(value) {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return 0;
    return Math.max(0, Math.min(100, numericValue));
  }

  static getChangeValue(changes, key) {
    const value = Number(changes?.[key] ?? 0);
    return Number.isNaN(value) ? 0 : value;
  }

  static applyChanges(worldState, changes = {}) {
    const current = new WorldState(worldState);

    return new WorldState({
      credibility: WorldStateSystem.clamp(
        current.credibility + WorldStateSystem.getChangeValue(changes, "credibility")
      ),
      militaryPressure: WorldStateSystem.clamp(
        current.militaryPressure + WorldStateSystem.getChangeValue(changes, "militaryPressure")
      ),
      publicMorale: WorldStateSystem.clamp(
        current.publicMorale + WorldStateSystem.getChangeValue(changes, "publicMorale")
      ),
    });
  }

  static getNarrativeState(worldState) {
    const state = new WorldState(worldState);

    return {
      credibility:
        state.credibility >= 70
          ? "La voz del corresponsal circula con fuerza."
          : state.credibility <= 30
            ? "La credibilidad pública del corresponsal empieza a deteriorarse."
            : "La credibilidad pública se mantiene incierta.",
      militaryPressure:
        state.militaryPressure >= 70
          ? "La presión militar se vuelve asfixiante."
          : state.militaryPressure >= 40
            ? "Los mandos empiezan a observar cada movimiento."
            : "La vigilancia militar todavía es manejable.",
      publicMorale:
        state.publicMorale >= 70
          ? "La moral pública se sostiene sobre relatos de resistencia."
          : state.publicMorale <= 30
            ? "La población empieza a recibir la guerra como una herida abierta."
            : "La moral pública oscila entre esperanza y cansancio.",
    };
  }
}

class CaseArchiveSystem {
  static serializeItem(item) {
    return JSON.parse(JSON.stringify(item || null));
  }

  static buildArchiveEntry({ caseFile, notebook, article = null, closureType = "published", summary = "" }) {
    if (!caseFile || !notebook) return null;
    const caseId = caseFile.id;

    const evidenceIds = new Set(caseFile.evidenceIds || []);
    const npcIds = new Set(caseFile.npcIds || []);
    const dialogueIds = new Set(caseFile.dialogueIds || []);

    const relatedEvidenceIdsFromContradictions = new Set(
      (notebook.contradictions || []).flatMap((contradiction) => contradiction.evidenceIds || [])
    );
    const relatedEvidenceIdsFromHypotheses = new Set(
      (notebook.hypotheses || []).flatMap((hypothesis) => hypothesis.evidenceIds || [])
    );

    const allCaseEvidenceIds = new Set([
      ...evidenceIds,
      ...relatedEvidenceIdsFromContradictions,
      ...relatedEvidenceIdsFromHypotheses,
    ]);

    return {
      id: createId("case_archive"),
      caseId,
      title: caseFile.title,
      summary: summary || caseFile.summary || "Expediente archivado.",
      historicalContext: caseFile.historicalContext || "",
      closureType,
      closedAt: new Date().toISOString(),
      article: article ? CaseArchiveSystem.serializeItem(article) : null,
      evidences: (notebook.evidences || [])
        .filter((evidence) => allCaseEvidenceIds.has(evidence.id))
        .map((evidence) => CaseArchiveSystem.serializeItem(evidence)),
      notes: (notebook.notes || [])
        .filter((note) =>
          !isPersonalDiaryNote(note) &&
          (
            !note.relatedEvidenceIds?.length ||
            note.relatedEvidenceIds.some((id) => allCaseEvidenceIds.has(id))
          )
        )
        .map((note) => CaseArchiveSystem.serializeItem(note)),
      contradictions: (notebook.contradictions || [])
        .filter((contradiction) =>
          !contradiction.evidenceIds?.length ||
          contradiction.evidenceIds.some((id) => allCaseEvidenceIds.has(id))
        )
        .map((contradiction) => CaseArchiveSystem.serializeItem(contradiction)),
      hypotheses: (notebook.hypotheses || [])
        .filter((hypothesis) =>
          !hypothesis.evidenceIds?.length ||
          hypothesis.evidenceIds.some((id) => allCaseEvidenceIds.has(id))
        )
        .map((hypothesis) => CaseArchiveSystem.serializeItem(hypothesis)),
      relatedIds: {
        evidenceIds: [...allCaseEvidenceIds],
        npcIds: [...npcIds],
        dialogueIds: [...dialogueIds],
      },
    };
  }

  static archiveAndDeactivateActiveCase(notebook, { article = null, closureType = "published", summary = "" } = {}) {
    const nextNotebook = cloneNotebook(notebook);
    const activeCase = nextNotebook.activeCase ? new CaseFile(nextNotebook.activeCase) : null;
    if (!activeCase) return { notebook: nextNotebook, archivedEntry: null, closedCase: null };

    activeCase.resolve();

    const archiveEntry = CaseArchiveSystem.buildArchiveEntry({
      caseFile: activeCase,
      notebook: nextNotebook,
      article,
      closureType,
      summary,
    });

    if (archiveEntry) {
      const alreadyArchivedIndex = (nextNotebook.caseArchive || []).findIndex(
        (entry) => entry.caseId === archiveEntry.caseId
      );

      const archive = [...(nextNotebook.caseArchive || [])];
      if (alreadyArchivedIndex >= 0) {
        archive[alreadyArchivedIndex] = archiveEntry;
      } else {
        archive.push(archiveEntry);
      }

      nextNotebook.caseArchive = archive.slice(-Notebook.MAX_CASE_ARCHIVE);
    }

    nextNotebook.archivedCases = [
      ...(nextNotebook.archivedCases || []).filter((caseFile) => caseFile.id !== activeCase.id),
      activeCase,
    ].slice(-Notebook.MAX_ARCHIVED_CASES);

    nextNotebook.evidences = [];
    nextNotebook.notes = (nextNotebook.notes || []).filter(isPersonalDiaryNote);
    nextNotebook.contradictions = [];
    nextNotebook.hypotheses = [];
    nextNotebook.reconstructions = [];
    nextNotebook.articles = (nextNotebook.articles || []).filter(
      (article) =>
        !article.published &&
        !article.consequencesApplied &&
        article.publicationStatus !== "published"
    );
    nextNotebook.activeCase = null;

    nextNotebook.addCaseEvent({
      type: "case_archived",
      title: activeCase.title,
      severity: "media",
      text: "El expediente fue cerrado y sus materiales pasaron al Archivo del cuaderno.",
    });

    return {
      notebook: nextNotebook,
      archivedEntry: archiveEntry,
      closedCase: activeCase,
    };
  }
}

class CaseClosureSystem {
  static buildClosure({ caseFile, article, result = {}, worldStateChanges = {}, persistentConsequences = [] }) {
    if (!caseFile || !article) return initialCaseClosureModal;

    const toneLabels = {
      oficial: "versión oficial",
      humanitario: "crónica humanitaria",
      critico: "denuncia crítica",
      propaganda: "propaganda",
      neutral: "crónica neutral",
    };

    const consequenceLines = [
      result.summary,
      worldStateChanges.credibility
        ? `Credibilidad pública ${worldStateChanges.credibility > 0 ? "+" : ""}${worldStateChanges.credibility}.`
        : "Credibilidad pública sin cambio inmediato.",
      worldStateChanges.militaryPressure
        ? `Presión militar ${worldStateChanges.militaryPressure > 0 ? "+" : ""}${worldStateChanges.militaryPressure}.`
        : "Presión militar sin cambio inmediato.",
      worldStateChanges.publicMorale
        ? `Moral pública ${worldStateChanges.publicMorale > 0 ? "+" : ""}${worldStateChanges.publicMorale}.`
        : "Moral pública sin cambio inmediato.",
      ...(persistentConsequences || []).map((item) => item.title),
    ].filter(Boolean);

    return {
      isOpen: true,
      caseId: caseFile.id,
      caseTitle: caseFile.title,
      articleTitle: article.title,
      articleTone: toneLabels[article.tone] || article.tone || "crónica",
      resultTitle: "Caso cerrado",
      summary: `El expediente queda cerrado a partir del artículo publicado: “${article.title}”. La interpretación elegida fue una ${toneLabels[article.tone] || article.tone || "crónica"}.`,
      consequences: consequenceLines,
    };
  }
}

class ConsequenceSystem {
  static getArticleWorldStateChanges(article) {
    const tone = article?.tone || "neutral";

    const changesByTone = {
      neutral: { credibility: 1, militaryPressure: 0, publicMorale: 0 },
      oficial: { credibility: -3, militaryPressure: -2, publicMorale: 4 },
      humanitario: { credibility: 5, militaryPressure: 5, publicMorale: -6 },
      critico: { credibility: 8, militaryPressure: 12, publicMorale: -10 },
      propaganda: { credibility: -10, militaryPressure: -4, publicMorale: 8 },
    };

    return changesByTone[tone] || changesByTone.neutral;
  }

  static buildArticleWorldSummary(article, changes) {
    const tone = article?.tone || "neutral";

    if (tone === "critico") {
      return "La crónica crítica aumenta la atención pública, pero también endurece la vigilancia militar.";
    }

    if (tone === "humanitario") {
      return "El enfoque humanitario conmueve a los lectores y vuelve más incómoda la posición de los mandos.";
    }

    if (tone === "oficial") {
      return "La versión oficial sostiene momentáneamente la moral pública, aunque debilita la confianza en la independencia del corresponsal.";
    }

    if (tone === "propaganda") {
      return "La propaganda eleva una moral frágil, pero compromete gravemente la credibilidad histórica del relato.";
    }

    return "El artículo produce una reacción moderada en el clima histórico del frente.";
  }

  static applyArticleConsequences(player, article) {
    const updatedPlayer = new Player(player);
    const result = {
      credibilityChange: 0,
      reputationChanges: {},
      stressChange: 0,
      flags: {},
      summary: "El artículo fue archivado sin consecuencias inmediatas.",
    };

    const tone = article.tone || "neutral";

    if (tone === "oficial") {
      result.credibilityChange = -5;
      result.reputationChanges = { officers: 10, soldiers: -5, press: 5 };
      result.summary = "El artículo agrada a los mandos, pero genera desconfianza entre los soldados.";
    }

    if (tone === "humanitario") {
      result.credibilityChange = 5;
      result.reputationChanges = { soldiers: 10, civilians: 10, officers: -10 };
      result.stressChange = 3;
      result.summary = "El artículo humaniza el frente, aunque incomoda a los oficiales.";
    }

    if (tone === "critico") {
      result.credibilityChange = 10;
      result.reputationChanges = { soldiers: 10, officers: -15, press: 5 };
      result.stressChange = 6;
      result.flags = { censorshipRisk: true };
      result.summary = "La denuncia aumenta la credibilidad, pero eleva el riesgo de censura.";
    }

    if (tone === "propaganda") {
      result.credibilityChange = -15;
      result.reputationChanges = { officers: 15, press: 10, soldiers: -15, civilians: -5 };
      result.flags = { propagandaPath: true };
      result.summary = "La propaganda abre puertas oficiales, pero deteriora la confianza humana.";
    }

    updatedPlayer.changeCredibility(result.credibilityChange);
    // El estrés se aplica centralizadamente desde NarrativeStressSystem en el reducer.

    Object.entries(result.reputationChanges).forEach(([faction, amount]) => {
      if (updatedPlayer.reputation[faction] !== undefined) {
        updatedPlayer.reputation[faction] += amount;
      }
    });

    return { player: updatedPlayer, result };
  }

  static applyReconstructionConsequences(player, reconstruction) {
    const updatedPlayer = new Player(player);
    const result = {
      credibilityChange: 0,
      reputationChanges: {},
      stressChange: 0,
      flags: {},
      summary: "La reconstrucción queda registrada como interpretación provisoria.",
    };

    if (reconstruction.interpretationType === "oficial") {
      result.reputationChanges = { officers: 8, soldiers: -4 };
      result.summary = "La lectura oficial mejora el vínculo con mandos, pero reduce confianza entre soldados.";
    }

    if (reconstruction.interpretationType === "humanitaria") {
      result.credibilityChange = 5;
      result.reputationChanges = { soldiers: 8, civilians: 8, officers: -6 };
      result.stressChange = 2;
      result.summary = "La interpretación humanitaria fortalece vínculos con quienes sufren la guerra.";
    }

    if (reconstruction.interpretationType === "critica") {
      result.credibilityChange = 8;
      result.reputationChanges = { soldiers: 6, officers: -10, press: 5 };
      result.stressChange = 4;
      result.flags = { criticalInvestigation: true };
      result.summary = "La mirada crítica sostiene una investigación más incómoda y riesgosa.";
    }

    if (reconstruction.interpretationType === "propaganda") {
      result.credibilityChange = -12;
      result.reputationChanges = { officers: 12, press: 6, soldiers: -10 };
      result.flags = { propagandaPath: true };
      result.summary = "La reconstrucción propagandística simplifica los hechos y compromete la credibilidad.";
    }

    if (reconstruction.interpretationType === "ambigua") {
      result.credibilityChange = 2;
      result.reputationChanges = { press: 2 };
      result.summary = "La lectura ambigua evita afirmaciones fuertes, pero conserva cierta prudencia investigativa.";
    }

    const evidenceWeight = reconstruction.evidenceIds.length;
    const contradictionWeight = reconstruction.contradictionIds.length;

    if (evidenceWeight >= 2) result.credibilityChange += 3;
    if (contradictionWeight >= 1) result.credibilityChange += 4;
    if (evidenceWeight === 0 && contradictionWeight === 0) result.credibilityChange -= 8;

    updatedPlayer.changeCredibility(result.credibilityChange);
    // El estrés se aplica centralizadamente desde NarrativeStressSystem en el reducer.

    Object.entries(result.reputationChanges).forEach(([faction, amount]) => {
      if (updatedPlayer.reputation[faction] !== undefined) {
        updatedPlayer.reputation[faction] += amount;
      }
    });

    return { player: updatedPlayer, result };
  }
}

class HistoricalReconstruction {
  static MAX_NARRATIVE_FRAGMENTS = 8;

  constructor({
    id,
    interpretationType = "critica",
    title,
    text,
    evidenceIds = [],
    contradictionIds = [],
    confidence = "provisoria",
    status = "estable",
    instabilityLevel = 0,
    narrativeFragments = [],
  }) {
    this.id = id;
    this.interpretationType = interpretationType;
    this.title = title;
    this.text = text;
    this.evidenceIds = evidenceIds;
    this.contradictionIds = contradictionIds;
    this.confidence = confidence;
    this.status = status;
    this.instabilityLevel = instabilityLevel;
    this.narrativeFragments = (narrativeFragments || []).slice(-HistoricalReconstruction.MAX_NARRATIVE_FRAGMENTS);
    this.createdAt = new Date().toISOString();
  }
}

class CensorshipSystem {
  static redactText(text = "", level = "medio") {
    if (!text) return "";

    const sensitiveWords = [
      "muerte",
      "muertes",
      "muerto",
      "muertos",
      "masacre",
      "masacres",
      "fracaso",
      "fracasos",
      "cadáver",
      "cadáveres",
      "cadaver",
      "cadaveres",
      "derrota",
      "derrotas",
      "desastre",
      "desastres",
      "abandono",
      "abandonados",
    ];

    function redactSensitiveWords(value) {
      return value
        .split(" ")
        .map((word) => {
          const cleanWord = word.toLowerCase().replace(/[.,;:!?¿¡()]/g, "");
          return sensitiveWords.includes(cleanWord) ? "[tachado]" : word;
        })
        .join(" ");
    }

    const sentences = text.split(". ").filter(Boolean);

    if (level === "extremo") {
      return sentences
        .map((sentence, index) =>
          index % 2 === 0 ? "█ █ █ █ █ █ █ █" : redactSensitiveWords(sentence)
        )
        .join(". ");
    }

    if (level === "alto") {
      return sentences
        .map((sentence, index) =>
          index % 3 === 0 ? "[fragmento censurado]" : redactSensitiveWords(sentence)
        )
        .join(". ");
    }

    if (level === "medio") {
      return redactSensitiveWords(text);
    }

    return text;
  }

  static getGameplayRestrictions(worldState, flags = {}) {
    const state = new WorldState(worldState);
    return {
      restrictedMovement:
        (state.militaryPressure >= 70 || flags.censorshipActive) &&
        !flags.temporaryPressPermit,
      escortRequired:
        (state.militaryPressure >= 80 || flags.confiscationRisk) &&
        !flags.militaryEscortGranted,
      notesAtRisk: flags.confiscationRisk === true && !flags.medicalProtectionActive,
    };
  }

  static applyConfiscation(notebook, severity = "media") {
    const nextNotebook = cloneNotebook(notebook);
    const removedNotes = severity === "grave" ? 2 : 1;
    const removedEvidence = severity === "grave" ? 1 : 0;

    const personalNotes = (nextNotebook.notes || []).filter(isPersonalDiaryNote);
    const investigationNotes = (nextNotebook.notes || []).filter((note) => !isPersonalDiaryNote(note));
    nextNotebook.notes = [
      ...investigationNotes.slice(0, Math.max(0, investigationNotes.length - removedNotes)),
      ...personalNotes,
    ];

    if (removedEvidence > 0) {
      nextNotebook.evidences = nextNotebook.evidences.slice(
        0,
        Math.max(0, nextNotebook.evidences.length - removedEvidence)
      );
    }

    nextNotebook.addCaseEvent({
      type: "confiscation",
      title: "Decomiso de material",
      severity,
      text:
        severity === "grave"
          ? "La censura militar decomisa notas y parte del material reunido por el corresponsal."
          : "La censura militar retira algunas notas del expediente personal.",
    });

    return NotebookIntegritySystem.repairIfNeeded(nextNotebook, "evidence_changed");
  }

  static getRiskScore({ article, player, worldState }) {
    const toneRisk = {
      neutral: 5,
      oficial: 0,
      humanitario: 25,
      critico: 45,
      propaganda: 0,
    };

    const state = new WorldState(worldState);
    const baseToneRisk = toneRisk[article?.tone || "neutral"] ?? 15;
    const militaryPressureRisk = Math.round(state.militaryPressure * 0.45);
    const officerPenalty = player?.reputation?.officers < 0
      ? Math.abs(player.reputation.officers)
      : 0;
    const credibilityPenalty = state.credibility >= 70 ? 10 : 0;

    return Math.max(
      0,
      Math.min(100, baseToneRisk + militaryPressureRisk + officerPenalty + credibilityPenalty)
    );
  }

  static getRiskLevel(score) {
    if (score >= 75) return "extremo";
    if (score >= 50) return "alto";
    if (score >= 25) return "medio";
    return "bajo";
  }

  static reviewArticle({ article, player, worldState }) {
    const score = CensorshipSystem.getRiskScore({ article, player, worldState });
    const level = CensorshipSystem.getRiskLevel(score);

    return {
      score,
      level,
      censored: level === "alto" || level === "extremo",
      confiscationRisk: level === "extremo",
      summary:
        level === "extremo"
          ? "La censura militar considera el artículo una amenaza directa para el control del relato."
          : level === "alto"
            ? "El artículo queda bloqueado por su potencial para incomodar al mando militar."
            : level === "medio"
              ? "El artículo pasa a revisión con observaciones y cortes posibles."
              : "El artículo atraviesa la revisión sin mayores obstáculos.",
    };
  }
}

class Article {
  constructor({
    id,
    title,
    body,
    tone = "neutral",
    published = false,
    consequencesApplied = false,
    censorshipRisk = "bajo",
    censorshipScore = 0,
    censored = false,
    redactedBody = "",
    publicationStatus = "draft",
  }) {
    this.id = id;
    this.title = title;
    this.body = body;
    this.tone = tone;
    this.published = published;
    this.consequencesApplied = consequencesApplied;
    this.censorshipRisk = censorshipRisk;
    this.censorshipScore = censorshipScore;
    this.censored = censored;
    this.redactedBody = redactedBody;
    this.publicationStatus = publicationStatus;
  }

  publish() {
    this.published = true;
    this.consequencesApplied = true;
    this.publicationStatus = "published";
  }

  censor(level = "alto") {
    this.censored = true;
    this.redactedBody = CensorshipSystem.redactText(this.body, level);
    this.publicationStatus = "censored";
  }

  canPublish() {
    return !this.consequencesApplied && this.publicationStatus !== "published";
  }

  markReviewed() {
    this.publicationStatus = "reviewed";
  }

  static calculateCensorshipRisk(tone) {
    const risks = {
      neutral: "bajo",
      oficial: "bajo",
      humanitario: "medio",
      critico: "alto",
      propaganda: "bajo",
    };

    return risks[tone] || "medio";
  }
}

class Notebook {
  static MAX_CASE_EVENTS = 80;
  static MAX_ACTIVITY_LOG = 24;
  static MAX_CONSEQUENCE_LOG = 80;
  static MAX_ARCHIVED_CASES = 40;
  static MAX_CASE_ARCHIVE = 40;

  constructor() {
    this.activeCase = null;
    this.evidences = [];
    this.notes = [];
    this.caseEvents = [];
    this.activityLog = [];
    this.contradictions = [];
    this.hypotheses = [];
    this.articles = [];
    this.reconstructions = [];
    this.consequenceLog = [];
    this.archivedCases = [];
    this.caseArchive = [];
  }

  setActiveCase(caseFile) {
    if (caseFile && typeof caseFile.activate === "function") {
      caseFile.activate();
    }

    this.activeCase = caseFile;
  }

  addEvidence(evidence) {
    const alreadyExists = this.evidences.some((item) => item.id === evidence.id);
    if (!alreadyExists) {
      this.evidences.push(evidence);
      this.addActivityLog({
        type: "evidence",
        severity: "media",
        text: `Evidencia registrada: ${evidence.title}`,
      });
    }
  }

  hasNoteForEvidence(evidenceId, tag = "") {
    return this.notes.some(
      (note) =>
        note.relatedEvidenceIds?.includes(evidenceId) &&
        (!tag || note.tags?.includes(tag))
    );
  }

  hasHypothesisForEvidence(evidenceId, tag = "") {
    return this.hypotheses.some(
      (hypothesis) =>
        hypothesis.evidenceIds?.includes(evidenceId) &&
        (!tag || hypothesis.tags?.includes(tag))
    );
  }

  addNote(note) {
    this.notes.push(note);
    if (!note.tags?.includes("silent")) {
      this.addActivityLog({
        type: "note",
        severity: "leve",
        text: `Nota registrada: ${note.text}`,
      });
    }
  }

  addCaseEvent(event) {
    const entry = {
      id: createId("case_event"),
      createdAt: new Date().toISOString(),
      severity: event.severity || "media",
      ...event,
    };

    this.caseEvents.push(entry);
    this.addActivityLog({
      type: entry.type || "case_event",
      text: entry.text || entry.title,
      severity: entry.severity,
    });

    if (this.caseEvents.length > Notebook.MAX_CASE_EVENTS) {
      this.caseEvents = this.caseEvents.slice(-Notebook.MAX_CASE_EVENTS);
    }
  }

  addActivityLog(entry) {
    const nextText = entry.text || "El corresponsal registra un cambio en el frente.";
    const nextType = entry.type || "registro";
    const lastEntry = this.activityLog[this.activityLog.length - 1];

    if (lastEntry?.type === nextType && lastEntry?.text === nextText) {
      return;
    }

    this.activityLog.push({
      id: createId("activity"),
      createdAt: new Date().toISOString(),
      severity: entry.severity || "leve",
      type: nextType,
      text: nextText,
    });

    if (this.activityLog.length > Notebook.MAX_ACTIVITY_LOG) {
      this.activityLog = this.activityLog.slice(-Notebook.MAX_ACTIVITY_LOG);
    }
  }

  addContradiction(contradiction) {
    const alreadyExists = this.contradictions.some((item) => item.id === contradiction.id);
    if (!alreadyExists) {
      this.contradictions.push(contradiction);
      this.addActivityLog({
        type: "contradiction",
        severity: contradiction.severity || "media",
        text: `Contradicción detectada: ${contradiction.title}`,
      });
    }
  }

  addHypothesis(hypothesis) {
    this.hypotheses.push(hypothesis);
    this.addActivityLog({
      type: "hypothesis",
      severity: "media",
      text: `Hipótesis generada: ${hypothesis.title}`,
    });
  }

  addArticle(article) {
    this.articles.push(article);
    this.addActivityLog({
      type: "article",
      severity: "media",
      text: `Artículo preparado: ${article.title}`,
    });
  }

  addReconstruction(reconstruction) {
    this.reconstructions.push(reconstruction);
    this.addActivityLog({
      type: "reconstruction",
      severity: "media",
      text: `Reconstrucción guardada: ${reconstruction.title}`,
    });
  }

  addConsequenceLog(entry) {
    this.consequenceLog.push({
      id: createId("consequence"),
      createdAt: new Date().toISOString(),
      ...entry,
    });

    if (this.consequenceLog.length > Notebook.MAX_CONSEQUENCE_LOG) {
      this.consequenceLog = this.consequenceLog.slice(-Notebook.MAX_CONSEQUENCE_LOG);
    }
  }
}

class CaseFile {
  constructor({
    id,
    title,
    summary,
    historicalContext,
    availableFromDay = 1,
    availableUntilDay = 99,
    priority = "media",
    urgency = "normal",
    category = "main",
    status = "locked",
    prerequisites = [],
    unlocks = [],
    evidenceIds = [],
    npcIds = [],
    dialogueIds = [],
    autoContradictions = [],
    contradictionRules = [],
  }) {
    this.id = id;
    this.title = title;
    this.summary = summary;
    this.historicalContext = historicalContext;
    this.availableFromDay = availableFromDay;
    this.availableUntilDay = availableUntilDay;
    this.priority = priority;
    this.urgency = urgency;
    this.category = category;
    this.status = status;
    this.prerequisites = prerequisites;
    this.unlocks = unlocks;
    this.evidenceIds = evidenceIds;
    this.npcIds = npcIds;
    this.dialogueIds = dialogueIds;
    this.autoContradictions = autoContradictions;
    this.contradictionRules = contradictionRules;
  }

  isMainCase() {
    return this.category === "main";
  }

  isMinorCase() {
    return this.category === "minor";
  }

  makeAvailable() {
    if (this.status === "locked") this.status = "available";
  }

  activate() {
    if (this.status === "available") this.status = "active";
  }

  resolve() {
    this.status = "resolved";
  }

  partiallyResolve() {
    this.status = "partiallyResolved";
  }

  expire() {
    if (!["resolved", "partiallyResolved", "suppressed"].includes(this.status)) {
      this.status = "expired";
    }
  }

  suppress() {
    this.status = "suppressed";
  }

  close() {
    this.resolve();
  }

  getDerivedPriority(narrativeFlags = {}) {
    if (
      NarrativeFlagSystem.hasFlag(narrativeFlags, "militaryDistrust") &&
      this.category === "main"
    ) {
      return "alta";
    }

    return this.priority;
  }

  getDerivedUrgency(narrativeFlags = {}) {
    if (NarrativeFlagSystem.hasFlag(narrativeFlags, "civilianSupport")) {
      return "humanitaria";
    }

    return this.urgency;
  }
}

class CaseTimelineSystem {
  static MAX_ACTIVE_MAIN_CASES = 2;
  static MAX_ACTIVE_MINOR_CASES = 1;
  static ACTIVE_STATUSES = new Set(["active"]);

  static isCaseWithinTimeWindow(caseFile, timeState) {
    const day = timeState?.day || 1;
    return day >= caseFile.availableFromDay && day <= caseFile.availableUntilDay;
  }

  static isExpired(caseFile, timeState) {
    const day = timeState?.day || 1;
    return day > caseFile.availableUntilDay;
  }

  static countActiveCases(cases = [], category = "main") {
    return cases.filter(
      (caseFile) =>
        caseFile.category === category &&
        CaseTimelineSystem.ACTIVE_STATUSES.has(caseFile.status)
    ).length;
  }

  static hasCapacity(cases = [], caseFile) {
    if (caseFile.category === "minor") {
      return (
        CaseTimelineSystem.countActiveCases(cases, "minor") <
        CaseTimelineSystem.MAX_ACTIVE_MINOR_CASES
      );
    }

    return (
      CaseTimelineSystem.countActiveCases(cases, "main") <
      CaseTimelineSystem.MAX_ACTIVE_MAIN_CASES
    );
  }

  static prerequisitesMet(caseFile, cases = []) {
    if (!caseFile.prerequisites?.length) return true;

    return caseFile.prerequisites.every((caseId) => {
      const dependency = cases.find((item) => item.id === caseId);
      return ["resolved", "partiallyResolved", "expired"].includes(dependency?.status);
    });
  }

  static updateCases(cases = [], timeState, narrativeFlags = {}, lastTimelineUpdateDay = 0) {
    const currentDay = timeState?.day || 1;

    if (currentDay === lastTimelineUpdateDay) {
      return {
        cases,
        events: [],
        skipped: true,
      };
    }

    let nextCases = cases.map((item) => new CaseFile(item));
    const events = [];

    nextCases = nextCases.map((caseFile) => {
      if (CaseTimelineSystem.isExpired(caseFile, timeState)) {
        const previousStatus = caseFile.status;
        caseFile.expire();

        if (caseFile.status === "expired" && previousStatus !== "expired") {
          events.push({
            type: "case_expired",
            title: caseFile.title,
            severity: caseFile.category === "main" ? "media" : "leve",
            text:
              "El caso deja de estar disponible. Algunas fuentes desaparecen y la reconstrucción histórica queda incompleta.",
          });
        }

        return caseFile;
      }

      if (
        caseFile.status === "locked" &&
        CaseTimelineSystem.isCaseWithinTimeWindow(caseFile, timeState) &&
        CaseTimelineSystem.prerequisitesMet(caseFile, nextCases) &&
        CaseTimelineSystem.hasCapacity(nextCases, caseFile)
      ) {
        caseFile.makeAvailable();

        events.push({
          type: "case_available",
          title: caseFile.title,
          severity: caseFile.category === "main" ? "media" : "leve",
          text: "Un nuevo caso histórico queda disponible para investigación.",
        });
      }

      return caseFile;
    });

    return {
      cases: nextCases,
      events,
      skipped: false,
      processedDay: currentDay,
    };
  }
}

class NPC {
  constructor({
    id,
    name,
    role,
    faction,
    description,
    dialogueIds = [],
    sex = "unknown",
    gasMask = false,
    portraitSeed = null,
    asciiPortrait = null,
  }) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.faction = faction;
    this.description = description;
    this.dialogueIds = dialogueIds;
    this.sex = sex;
    this.gasMask = gasMask;
    this.portraitSeed = portraitSeed || id;
    this.asciiPortrait = asciiPortrait || {
      sex,
      gasMask,
      seed: portraitSeed || id,
    };
  }
}

class TileDefinition {
  constructor({
    id,
    char,
    label,
    walkable = true,
    blocksSight = false,
    futureSprite = "",
    colorClass = "text-stone-500",
    elevation = "surface",
  }) {
    this.id = id;
    this.char = char;
    this.label = label;
    this.walkable = walkable;
    this.blocksSight = blocksSight;
    this.futureSprite = futureSprite;
    this.colorClass = colorClass;
    this.elevation = elevation;
  }
}

class MapEntity {
  constructor({
    id,
    type,
    label,
    x,
    y,
    char,
    linkedId = null,
    interactionType = "none",
    visible = true,
    futureSprite = "",
    colorClass = "text-stone-200",
    procedural = false,
    caseCritical = false,
    requiredCaseId = null,
    alive = true,
    corpse = false,
    wounded = false,
    respawnDay = null,
    routine = [],
    routineIndex = 0,
    evacDay = null,
    rescueTargetEntityId = null,
    rescueState = null,
    carriedBy = null,
    rescueStuckCount = 0,
  }) {
    this.id = id;
    this.type = type;
    this.label = label;
    this.x = x;
    this.y = y;
    this.char = char;
    this.linkedId = linkedId;
    this.interactionType = interactionType;
    this.visible = visible;
    this.futureSprite = futureSprite;
    this.colorClass = colorClass;
    this.procedural = procedural;
    this.caseCritical = caseCritical;
    this.requiredCaseId = requiredCaseId;
    this.alive = alive;
    this.corpse = corpse;
    this.wounded = wounded;
    this.respawnDay = respawnDay;
    this.routine = routine;
    this.routineIndex = routineIndex;
    this.evacDay = evacDay;
    this.rescueTargetEntityId = rescueTargetEntityId;
    this.rescueState = rescueState;
    this.carriedBy = carriedBy;
    this.rescueStuckCount = rescueStuckCount;
  }
}

class AsciiMap {
  static FIXED_WIDTH = 96;

  constructor({ id, locationId, name, layout = [], entities = [] }) {
    this.id = id;
    this.locationId = locationId;
    this.name = name;
    this.layout = AsciiMap.normalizeLayout(layout);
    this.entities = entities.map((entity) => new MapEntity(entity));
  }

  static normalizeLayout(layout) {
    if (!Array.isArray(layout) || layout.length === 0) return [];

    const validTileChars = new Set(Object.keys(TileBehaviorSystem.TILE_DEFINITIONS));
    const targetWidth = AsciiMap.FIXED_WIDTH;

    return layout.map((row) => {
      const sanitized = String(row)
        .split("")
        .map((char) => (validTileChars.has(char) ? char : "."))
        .join("");

      const inner = sanitized
        .replace(/^#+/, "")
        .replace(/#+$/, "")
        .padEnd(Math.max(0, targetWidth - 2), ".")
        .slice(0, Math.max(0, targetWidth - 2));

      return `#${inner}#`;
    });
  }

  get width() {
    return this.layout[0]?.length || 0;
  }

  get height() {
    return this.layout.length;
  }

  getTileChar(x, y) {
    if (x < 0 || y < 0 || y >= this.height || x >= this.width) return "#";
    return this.layout[y]?.[x] || "#";
  }

  getNormalizedRow(y) {
    const row = this.layout[y] || "";
    return row.padEnd(this.width, "#").slice(0, this.width);
  }

  getEntityAt(x, y, state = null) {
    return this.entities.find((entity) => {
      if (!entity.visible || entity.x !== x || entity.y !== y) return false;

      if (state && entity.requiredCaseId) {
        const activeCaseId = state.notebook?.activeCase?.id || null;
        const caseStatus = state.cases?.find((caseFile) => caseFile.id === entity.requiredCaseId)?.status;
        if (activeCaseId !== entity.requiredCaseId && caseStatus !== "active") return false;
      }

      if (state && entity.interactionType === "evidence") {
        const evidence = state.evidenceDatabase.find((item) => item.id === entity.linkedId);
        if (!evidence) return false;
        return evidence.canBeFound(state);
      }

      return true;
    });
  }
}

class SourceEvaluationSystem {
  static INCOMPATIBLE_FLAGS = {
    oficial: ["propaganda", "manipulada", "dudosa"],
    propaganda: ["oficial"],
    manipulada: ["oficial", "testimonial"],
    testimonial: ["manipulada"],
    dudosa: ["oficial"],
  };

  static FLAG_WEIGHTS = {
    propaganda: -2,
    censurada: -1,
    manipulada: -3,
    incompleta: -1,
    testimonial: 1,
    oficial: 1,
    dudosa: -2,
  };

  static FLAGS = [
    { id: "oficial", label: "Oficial" },
    { id: "testimonial", label: "Testimonial" },
    { id: "incompleta", label: "Incompleta" },
    { id: "censurada", label: "Censurada" },
    { id: "propaganda", label: "Propaganda" },
    { id: "manipulada", label: "Manipulada" },
    { id: "dudosa", label: "Dudosa" },
  ];

  static evaluateEvidenceReliability(evidence) {
    if (!evidence) return "baja";

    let score = 1;

    if (evidence.reliability === "alta") score = 3;
    if (evidence.reliability === "media") score = 2;
    if (evidence.reliability === "baja") score = 1;

    for (const flag of evidence.sourceFlags || []) {
      score += SourceEvaluationSystem.FLAG_WEIGHTS[flag] || 0;
    }

    if (score >= 3) return "alta";
    if (score >= 2) return "media";
    return "baja";
  }

  static applyFlag(evidence, flag) {
    if (!evidence || !flag) return evidence;

    const incompatibleFlags = SourceEvaluationSystem.INCOMPATIBLE_FLAGS[flag] || [];
    const currentFlags = evidence.sourceFlags || [];
    const cleanedFlags = currentFlags.filter((currentFlag) =>
      currentFlag !== flag && !incompatibleFlags.includes(currentFlag)
    );

    const sourceFlags = currentFlags.includes(flag)
      ? cleanedFlags
      : [...cleanedFlags, flag];

    return new Evidence({
      ...evidence,
      sourceFlags,
      reliability: SourceEvaluationSystem.evaluateEvidenceReliability({
        ...evidence,
        sourceFlags,
      }),
    });
  }

  static isFlagBlockedByCurrentFlags(evidence, flag) {
    if (!evidence || !flag) return false;
    return evidence.sourceFlags?.includes(flag) || false;
  }
}

class HypothesisEvaluationSystem {
  static SOFT_EVIDENCE_LIMIT = 5;

  static getOverloadPenalty(hypothesis) {
    const totalEvidenceCount =
      (hypothesis.supportingEvidenceIds?.length || 0) +
      (hypothesis.opposingEvidenceIds?.length || 0);

    if (totalEvidenceCount <= HypothesisEvaluationSystem.SOFT_EVIDENCE_LIMIT) {
      return {
        overloaded: false,
        penaltyLevel: 0,
      };
    }

    return {
      overloaded: true,
      penaltyLevel: totalEvidenceCount - HypothesisEvaluationSystem.SOFT_EVIDENCE_LIMIT,
    };
  }

  static getReliabilityWeight(reliability) {
    switch (reliability) {
      case "alta":
        return 3;
      case "media":
        return 2;
      case "baja":
        return 1;
      default:
        return 0;
    }
  }

  static getEvidenceScore(evidenceId, evidences) {
    const evidence = evidences.find((item) => item.id === evidenceId);
    if (!evidence) return 0;
    const evaluatedReliability = SourceEvaluationSystem.evaluateEvidenceReliability(evidence);
    return HypothesisEvaluationSystem.getReliabilityWeight(evaluatedReliability);
  }

  static calculate(hypothesis, notebook) {
    const evidences = notebook?.evidences || [];

    const supportingScore = (hypothesis.supportingEvidenceIds || []).reduce(
      (total, id) => total + HypothesisEvaluationSystem.getEvidenceScore(id, evidences),
      0
    );

    const opposingScore = (hypothesis.opposingEvidenceIds || []).reduce(
      (total, id) => total + HypothesisEvaluationSystem.getEvidenceScore(id, evidences),
      0
    );

    let confidence = "provisoria";
    let status = hypothesis.status || "abierta";

    const overload = HypothesisEvaluationSystem.getOverloadPenalty(hypothesis);

    if (hypothesis.status === "descartada") {
      return new Hypothesis({
        ...hypothesis,
        confidence: "dudosa",
        status: "descartada",
      });
    }

    if (supportingScore === 0 && opposingScore === 0) {
      confidence = "provisoria";
      status = "abierta";
    } else if (supportingScore >= 6 && opposingScore === 0) {
      confidence = "alta";
      status = "validada";
    } else if (supportingScore > opposingScore && opposingScore > 0) {
      confidence = "discutida";
      status = "cuestionada";
    } else if (supportingScore >= 3 && opposingScore === 0) {
      confidence = "moderada";
      status = "abierta";
    } else if (opposingScore >= supportingScore && opposingScore > 0) {
      confidence = "dudosa";
      status = "cuestionada";
    }

    if (overload.overloaded) {
      if (confidence === "alta") {
        confidence = "discutida";
      } else if (confidence === "moderada") {
        confidence = "provisoria";
      }

      if (status === "validada") {
        status = "abierta";
      }
    }

    return new Hypothesis({
      ...hypothesis,
      confidence,
      status,
      overloadPenaltyLevel: overload.penaltyLevel,
      overloaded: overload.overloaded,
    });
  }
}

class ReconstructionInstabilitySystem {
  static applyContradictionsToReconstructions(notebook, contradiction) {
    if (!notebook || !contradiction) {
      return {
        notebook,
        affectedReconstructions: [],
      };
    }

    const contradictionEvidenceIds = contradiction.evidenceIds || [];
    const severity = contradiction.severity || "media";
    const affectedReconstructions = [];

    notebook.reconstructions = (notebook.reconstructions || []).map((reconstruction) => {
      const related = (reconstruction.evidenceIds || []).some((id) =>
        contradictionEvidenceIds.includes(id)
      );

      if (!related) return reconstruction;

      affectedReconstructions.push(reconstruction.id);

      const instability = Math.min(
        (reconstruction.instabilityLevel || 0) +
          (severity === "grave" ? 2 : severity === "media" ? 1 : 0.5),
        10
      );

      const narrativeFragments = [
        ...(reconstruction.narrativeFragments || []),
        {
          id: createId("fragment"),
          type: "contradiction",
          severity,
          text:
            severity === "grave"
              ? "Una contradicción grave fractura parte de esta reconstrucción histórica."
              : "Nuevas tensiones alteran parcialmente la interpretación de los hechos.",
        },
      ].slice(-HistoricalReconstruction.MAX_NARRATIVE_FRAGMENTS);

      let status = reconstruction.status || "estable";

      if (instability >= 7) {
        status = "fracturada";
      } else if (instability >= 4) {
        status = "inestable";
      }

      return {
        ...reconstruction,
        instabilityLevel: instability,
        status,
        narrativeFragments,
      };
    });

    return {
      notebook,
      affectedReconstructions,
    };
  }

  static buildReconstructionFeedback(affectedReconstructions = []) {
    if (affectedReconstructions.length <= 0) {
      return "Las reconstrucciones históricas resisten la contradicción reciente.";
    }

    return `${affectedReconstructions.length} reconstrucciones históricas muestran señales de inestabilidad.`;
  }
}

class AutomaticContradictionSystem {
  static SOURCE_TENSIONS = [
    {
      id: "official_vs_testimonial",
      flagsA: ["oficial", "propaganda", "incompleta"],
      flagsB: ["testimonial"],
      title: "La versión oficial entra en tensión con un testimonio directo",
      description:
        "Una fuente oficial o administrativa presenta los hechos de forma ordenada, pero un testimonio directo describe una experiencia más caótica, incompleta o dolorosa.",
      severity: "media",
    },
    {
      id: "official_vs_medical",
      flagsA: ["oficial", "propaganda"],
      flagsB: ["medical", "registro médico"],
      title: "El registro médico contradice la versión de avance controlado",
      description:
        "Los datos médicos o de bajas sugieren un nivel de daño humano que no encaja con una versión oficial demasiado ordenada del avance.",
      severity: "grave",
    },
    {
      id: "censored_vs_direct_source",
      flagsA: ["censurada", "manipulada", "incompleta"],
      flagsB: ["testimonial", "personal", "carta"],
      title: "Una fuente censurada choca con una voz personal",
      description:
        "La fuente intervenida o incompleta deja huecos que una carta, testimonio u objeto personal vuelve difíciles de ignorar.",
      severity: "media",
    },
  ];

  static normalizeText(value = "") {
    return String(value || "").toLowerCase();
  }

  static getEvidenceTokens(evidence = {}) {
    const tokens = new Set();
    const joined = AutomaticContradictionSystem.normalizeText(
      `${evidence.id || ""} ${evidence.title || ""} ${evidence.type || ""} ${evidence.source || ""} ${(evidence.sourceFlags || []).join(" ")}`
    );

    (evidence.sourceFlags || []).forEach((flag) =>
      tokens.add(AutomaticContradictionSystem.normalizeText(flag))
    );

    if (joined.includes("oficial") || joined.includes("order") || joined.includes("orden") || joined.includes("militar")) tokens.add("oficial");
    if (joined.includes("propaganda") || joined.includes("comunicado")) tokens.add("propaganda");
    if (joined.includes("testimonio") || joined.includes("testimony") || joined.includes("superviviente") || joined.includes("survivor")) tokens.add("testimonial");
    if (joined.includes("carta") || joined.includes("letter") || joined.includes("personal")) {
      tokens.add("personal");
      tokens.add("carta");
    }
    if (joined.includes("médic") || joined.includes("medic") || joined.includes("baja") || joined.includes("casualt") || joined.includes("hospital")) {
      tokens.add("medical");
      tokens.add("registro médico");
    }
    if (joined.includes("censur") || joined.includes("tachad")) tokens.add("censurada");
    if (joined.includes("incomplet") || joined.includes("parcial")) tokens.add("incompleta");
    if (joined.includes("manipulad") || joined.includes("dudosa")) {
      tokens.add("manipulada");
      tokens.add("dudosa");
    }

    return tokens;
  }

  static hasAnyToken(tokens, expected = []) {
    return expected.some((item) => tokens.has(AutomaticContradictionSystem.normalizeText(item)));
  }

  static buildRuleContradiction(rule, evidenceA, evidenceB) {
    const sortedIds = [evidenceA.id, evidenceB.id].sort();
    return new Contradiction({
      id: `contr_auto_${rule.id}_${sortedIds.join("_")}`,
      title: rule.title,
      description: `${rule.description} Fuentes en tensión: “${evidenceA.title}” y “${evidenceB.title}”.`,
      evidenceIds: sortedIds,
      severity: rule.severity || "media",
    });
  }

  static detectPairContradictions(evidences = []) {
    const contradictions = [];

    for (let i = 0; i < evidences.length; i += 1) {
      for (let j = i + 1; j < evidences.length; j += 1) {
        const evidenceA = evidences[i];
        const evidenceB = evidences[j];
        const tokensA = AutomaticContradictionSystem.getEvidenceTokens(evidenceA);
        const tokensB = AutomaticContradictionSystem.getEvidenceTokens(evidenceB);

        AutomaticContradictionSystem.SOURCE_TENSIONS.forEach((rule) => {
          const directMatch =
            AutomaticContradictionSystem.hasAnyToken(tokensA, rule.flagsA) &&
            AutomaticContradictionSystem.hasAnyToken(tokensB, rule.flagsB);
          const inverseMatch =
            AutomaticContradictionSystem.hasAnyToken(tokensB, rule.flagsA) &&
            AutomaticContradictionSystem.hasAnyToken(tokensA, rule.flagsB);

          if (directMatch || inverseMatch) {
            contradictions.push(
              AutomaticContradictionSystem.buildRuleContradiction(rule, evidenceA, evidenceB)
            );
          }
        });
      }
    }

    return contradictions;
  }

  static detectFromCaseRules(notebook, activeCase) {
    const rules = activeCase?.contradictionRules || activeCase?.autoContradictions || [];
    const evidenceIds = new Set((notebook.evidences || []).map((evidence) => evidence.id));

    return rules
      .filter((rule) => (rule.evidenceIds || []).every((id) => evidenceIds.has(id)))
      .map(
        (rule) =>
          new Contradiction({
            id: rule.id || `contr_auto_case_${(rule.evidenceIds || []).join("_")}`,
            title: rule.title || "Contradicción detectada entre fuentes",
            description:
              rule.description ||
              "El cuaderno detecta una tensión entre fuentes reunidas en el expediente.",
            evidenceIds: rule.evidenceIds || [],
            severity: rule.severity || "media",
          })
      );
  }

  static apply(notebook, activeCase = null) {
    if (!notebook) return { notebook, createdContradictions: [] };

    const nextNotebook = cloneNotebook(notebook);
    const existingIds = new Set((nextNotebook.contradictions || []).map((item) => item.id));
    const candidates = [
      ...AutomaticContradictionSystem.detectPairContradictions(nextNotebook.evidences || []),
      ...AutomaticContradictionSystem.detectFromCaseRules(nextNotebook, activeCase),
    ];
    const createdContradictions = [];

    candidates.forEach((candidate) => {
      if (!candidate?.id || existingIds.has(candidate.id)) return;
      existingIds.add(candidate.id);
      nextNotebook.addContradiction(candidate);
      createdContradictions.push(candidate);

      const hypothesisImpact = ContradictionImpactSystem.applyContradictionToHypotheses(
        nextNotebook,
        candidate
      );
      nextNotebook.hypotheses = hypothesisImpact.notebook.hypotheses;

      const reconstructionImpact =
        ReconstructionInstabilitySystem.applyContradictionsToReconstructions(
          nextNotebook,
          candidate
        );
      nextNotebook.reconstructions = reconstructionImpact.notebook.reconstructions;

      nextNotebook.addCaseEvent({
        type: "auto_contradiction_detected",
        title: candidate.title,
        severity: candidate.severity || "media",
        text: ContradictionImpactSystem.buildNarrativeFeedback(
          candidate,
          hypothesisImpact.affectedHypothesisIds
        ),
        relatedEvidenceIds: candidate.evidenceIds || [],
      });
    });

    return {
      notebook: NotebookIntegritySystem.repairIfNeeded(
        nextNotebook,
        createdContradictions.length > 0 ? "contradiction_changed" : "evidence_changed"
      ),
      createdContradictions,
    };
  }
}

class ContradictionImpactSystem {
  static applyContradictionToHypotheses(notebook, contradiction) {
    if (!notebook || !contradiction) {
      return {
        notebook,
        affectedHypothesisIds: [],
      };
    }

    const contradictionEvidenceIds = contradiction.evidenceIds || [];
    const severity = contradiction.severity || "media";
    const affectedHypothesisIds = [];

    const hypotheses = (notebook.hypotheses || []).map((hypothesis) => {
      const relatedBySupport = (hypothesis.supportingEvidenceIds || []).some((id) =>
        contradictionEvidenceIds.includes(id)
      );
      const relatedByOpposition = (hypothesis.opposingEvidenceIds || []).some((id) =>
        contradictionEvidenceIds.includes(id)
      );
      const related = relatedBySupport || relatedByOpposition;

      if (!related) return hypothesis;

      affectedHypothesisIds.push(hypothesis.id);

      const opposingEvidenceIds = Hypothesis.mergeUniqueEvidenceIds(
        hypothesis.opposingEvidenceIds || [],
        contradictionEvidenceIds
      );

      if (severity === "leve") {
        return new Hypothesis({
          ...hypothesis,
          opposingEvidenceIds,
          confidence: hypothesis.confidence === "alta" ? "moderada" : hypothesis.confidence,
          status: hypothesis.status === "validada" ? "abierta" : hypothesis.status,
        });
      }

      if (severity === "grave") {
        return new Hypothesis({
          ...hypothesis,
          status: hypothesis.status === "descartada" ? "descartada" : "cuestionada",
          confidence: "dudosa",
          opposingEvidenceIds,
        });
      }

      return new Hypothesis({
        ...hypothesis,
        status: hypothesis.status === "descartada" ? "descartada" : "cuestionada",
        confidence: hypothesis.confidence === "alta" ? "discutida" : "dudosa",
        opposingEvidenceIds,
      });
    });

    notebook.hypotheses = hypotheses;

    return {
      notebook,
      affectedHypothesisIds,
    };
  }

  static buildNarrativeFeedback(contradiction, affectedHypothesisIds = []) {
    if (!contradiction) return "";

    if (affectedHypothesisIds.length > 0) {
      return `La contradicción “${contradiction.title}” debilita ${affectedHypothesisIds.length} hipótesis del cuaderno.`;
    }

    return `La contradicción “${contradiction.title}” queda registrada como una tensión pendiente entre fuentes.`;
  }
}

class NotebookIntegritySystem {
  static repairIfNeeded(notebook, reason = "manual") {
    const structuralReasons = new Set([
      "load",
      "evidence_changed",
      "contradiction_changed",
      "reconstruction_changed",
      "before_save",
      "case_close",
    ]);

    if (!structuralReasons.has(reason)) return notebook;

    return NotebookIntegritySystem.repairNotebook(notebook);
  }
  static getValidEvidenceIds(notebook) {
    return new Set((notebook.evidences || []).map((evidence) => evidence.id));
  }

  static filterValidIds(ids = [], validEvidenceIds) {
    return (ids || []).filter((id) => validEvidenceIds.has(id));
  }

  static repairHypothesis(hypothesis, validEvidenceIds) {
    const originalSupportingIds = hypothesis.supportingEvidenceIds || hypothesis.evidenceIds || [];
    const originalOpposingIds = hypothesis.opposingEvidenceIds || [];
    const supportingEvidenceIds = NotebookIntegritySystem.filterValidIds(
      originalSupportingIds,
      validEvidenceIds
    );
    const opposingEvidenceIds = NotebookIntegritySystem.filterValidIds(
      originalOpposingIds,
      validEvidenceIds
    );

    const repaired = new Hypothesis({
      ...hypothesis,
      supportingEvidenceIds,
      opposingEvidenceIds,
      createdFromEvidenceId: validEvidenceIds.has(hypothesis.createdFromEvidenceId)
        ? hypothesis.createdFromEvidenceId
        : null,
    });

    const hadEvidenceReferences =
      originalSupportingIds.length > 0 || originalOpposingIds.length > 0;
    const lostAllEvidenceReferences =
      hadEvidenceReferences &&
      repaired.supportingEvidenceIds.length === 0 &&
      repaired.opposingEvidenceIds.length === 0;

    if (lostAllEvidenceReferences && repaired.status !== "descartada") {
      repaired.status = "cuestionada";
      repaired.confidence = "dudosa";
    }

    return repaired;
  }

  static repairNotebook(notebook) {
    if (!notebook) return notebook;

    const validEvidenceIds = NotebookIntegritySystem.getValidEvidenceIds(notebook);
    const repaired = cloneNotebook(notebook);

    repaired.notes = (repaired.notes || []).map((note) => {
      const nextNote = new Note({
        ...note,
        relatedEvidenceIds: NotebookIntegritySystem.filterValidIds(
          note.relatedEvidenceIds || [],
          validEvidenceIds
        ),
        tags: note.tags || [],
      });
      nextNote.createdAt = note.createdAt || nextNote.createdAt;
      return nextNote;
    });

    repaired.caseEvents = (repaired.caseEvents || []).slice(-Notebook.MAX_CASE_EVENTS);

    repaired.contradictions = (repaired.contradictions || []).map((contradiction) => {
      const nextContradiction = new Contradiction({
        ...contradiction,
        evidenceIds: NotebookIntegritySystem.filterValidIds(
          contradiction.evidenceIds || [],
          validEvidenceIds
        ),
        severity: contradiction.severity || "media",
      });
      nextContradiction.resolved = contradiction.resolved || false;
      return nextContradiction;
    });

    const validContradictionIds = new Set(
      (repaired.contradictions || []).map((contradiction) => contradiction.id)
    );

    repaired.hypotheses = (repaired.hypotheses || []).map((hypothesis) =>
      NotebookIntegritySystem.repairHypothesis(hypothesis, validEvidenceIds)
    );

    repaired.reconstructions = (repaired.reconstructions || []).map((reconstruction) => {
      const nextReconstruction = new HistoricalReconstruction({
        ...reconstruction,
        evidenceIds: NotebookIntegritySystem.filterValidIds(
          reconstruction.evidenceIds || [],
          validEvidenceIds
        ),
        contradictionIds: (reconstruction.contradictionIds || []).filter((id) =>
          validContradictionIds.has(id)
        ),
        status: reconstruction.status || "estable",
        instabilityLevel: reconstruction.instabilityLevel || 0,
        narrativeFragments: (reconstruction.narrativeFragments || []).slice(-HistoricalReconstruction.MAX_NARRATIVE_FRAGMENTS),
      });
      nextReconstruction.createdAt = reconstruction.createdAt || nextReconstruction.createdAt;
      return nextReconstruction;
    });

    return repaired;
  }
}

class AutoWritingSystem {
  static getEvidenceByIds(notebook, ids = []) {
    const evidences = notebook?.evidences || [];
    return ids.map((id) => evidences.find((item) => item.id === id)).filter(Boolean);
  }

  static getContradictedEvidenceIds(contradictions = []) {
    return [...new Set(contradictions.flatMap((item) => item.evidenceIds || []))];
  }

  static buildHypothesisFromNotebook(notebook) {
    const evidences = notebook?.evidences || [];
    const contradictions = notebook?.contradictions || [];
    if (evidences.length < 1) return null;

    const contradictedEvidenceIds = AutoWritingSystem.getContradictedEvidenceIds(
      contradictions
    );
    const contradictedEvidences = AutoWritingSystem.getEvidenceByIds(
      notebook,
      contradictedEvidenceIds
    );
    const reliableEvidences = evidences.filter(
      (item) => SourceEvaluationSystem.evaluateEvidenceReliability(item) === "alta"
    );
    const personalSources = evidences.filter((item) =>
      ["carta", "testimonio", "objeto personal"].some((token) =>
        (item.type || "").toLowerCase().includes(token)
      )
    );
    const officialSources = evidences.filter((item) =>
      ["documento militar", "registro médico"].some((token) =>
        (item.type || "").toLowerCase().includes(token)
      )
    );

    const supportingEvidenceIds = reliableEvidences.length
      ? reliableEvidences.map((item) => item.id)
      : evidences.map((item) => item.id);
    const opposingEvidenceIds = contradictedEvidenceIds;

    let title = "El avance informado necesita ser contrastado";
    let text =
      "Las evidencias disponibles todavía no permiten cerrar una explicación definitiva. El corresponsal identifica indicios parciales que deben contrastarse con nuevas voces y documentos.";
    let confidence = "provisoria";
    let status = "abierta";

    if (contradictions.length > 0) {
      title = "La versión oficial entra en tensión con las fuentes reunidas";
      text = `Las contradicciones registradas afectan a ${contradictedEvidences.length || contradictedEvidenceIds.length} evidencias del expediente. Esto sugiere que el relato oficial del avance puede estar incompleto, censurado o construido para proteger al mando militar.`;
      confidence = reliableEvidences.length >= 2 ? "moderada" : "discutida";
      status = "cuestionada";
    } else if (personalSources.length >= 2) {
      title = "Los testimonios humanos revelan una experiencia distinta del frente";
      text = "Las cartas, objetos personales o testimonios encontrados señalan que la experiencia de los soldados no coincide necesariamente con la frialdad de los informes oficiales.";
      confidence = "moderada";
    } else if (officialSources.length >= 2) {
      title = "Los documentos oficiales muestran una verdad administrativa incompleta";
      text = "Los registros militares y médicos permiten reconstruir parte de los hechos, pero su lenguaje burocrático deja fuera el sufrimiento humano y las pérdidas difíciles de admitir.";
      confidence = "moderada";
    }

    return HypothesisEvaluationSystem.calculate(
      new Hypothesis({
        id: createId("hypothesis"),
        title,
        text,
        supportingEvidenceIds: supportingEvidenceIds.slice(0, 6),
        opposingEvidenceIds: opposingEvidenceIds.slice(0, 4),
        confidence,
        status,
        tags: ["auto_generated"],
      }),
      notebook
    );
  }

  static buildArticleFromNotebook(notebook, player, worldState, tone = "humanitario") {
    const evidences = notebook?.evidences || [];
    const contradictions = notebook?.contradictions || [];
    const hypotheses = notebook?.hypotheses || [];
    const notes = (notebook?.notes || []).filter((note) => !isPersonalDiaryNote(note));
    if (evidences.length < 1 && notes.length < 1) return null;

    const evidenceTitles = evidences.map((item) => item.title).slice(0, 4);
    const contradictionTitles = contradictions.map((item) => item.title).slice(0, 3);
    const strongestHypothesis = hypotheses[hypotheses.length - 1];
    const pressure = worldState?.militaryPressure || 0;

    const titlesByTone = {
      oficial: "Somme: avance sostenido bajo condiciones extremas",
      humanitario: "Somme: voces humanas desde la trinchera",
      critico: "Somme: dudas bajo el barro del avance",
      propaganda: "Somme: valor y sacrificio en el frente occidental",
      neutral: "Somme: una crónica incompleta desde el frente",
    };

    const openingsByTone = {
      oficial:
        "La información reunida permite presentar una crónica prudente, alineada con la versión permitida por los mandos y centrada en el esfuerzo de las tropas.",
      humanitario:
        "Las fuentes reunidas muestran que detrás de cada orden, registro o parte médico hay soldados agotados, familias ausentes y cuerpos sometidos a una guerra industrial brutal.",
      critico:
        "El expediente contradice la comodidad de la versión oficial: entre documentos, silencios y testimonios aparece una historia más incómoda que la que puede circular sin censura.",
      propaganda:
        "La crónica destaca la resistencia del ejército y transforma la incertidumbre del frente en un relato de disciplina, valor y sacrificio colectivo.",
      neutral:
        "El corresponsal reconstruye los hechos con cautela, sin cerrar una interpretación definitiva ante la fragilidad de las fuentes disponibles.",
    };

    const evidenceLine = evidenceTitles.length
      ? `El expediente incluye ${evidenceTitles.join(", ")}.`
      : "El expediente se sostiene principalmente en observaciones directas del corresponsal.";
    const contradictionLine = contradictionTitles.length
      ? `Las tensiones principales aparecen en ${contradictionTitles.join(", ")}.`
      : "Todavía no hay contradicciones suficientes para afirmar una denuncia concluyente.";
    const hypothesisLine = strongestHypothesis
      ? `La hipótesis dominante sostiene: “${strongestHypothesis.title}”.`
      : "La interpretación histórica permanece abierta.";
    const pressureLine = pressure >= 60
      ? "La presión militar condiciona cada palabra y vuelve probable una intervención de censura."
      : "La censura sigue presente, aunque todavía no domina por completo la circulación del relato.";

    return new Article({
      id: createId("article"),
      title: titlesByTone[tone] || titlesByTone.neutral,
      body: `${openingsByTone[tone] || openingsByTone.neutral} ${evidenceLine} ${contradictionLine} ${hypothesisLine} ${pressureLine} Firma: ${player?.name || "corresponsal sin nombre"}.`,
      tone,
      censorshipRisk: Article.calculateCensorshipRisk(tone),
    });
  }
}

class NotebookSystem {
  static registerObservation({ notebook, evidence, text, tags = [] }) {
    if (!notebook || !evidence) {
      return {
        notebook,
        created: false,
        reason: "missing_data",
      };
    }

    const duplicateTag = "inspection_observation";

    if (notebook.hasNoteForEvidence(evidence.id, duplicateTag)) {
      return {
        notebook,
        created: false,
        reason: "duplicate_observation",
      };
    }

    notebook.addNote(
      new Note({
        id: createId("note"),
        text,
        relatedEvidenceIds: [evidence.id],
        tags: [...tags, duplicateTag],
      })
    );

    return {
      notebook,
      created: true,
    };
  }

  static createSeedHypothesis({
    notebook,
    evidence,
    title,
    text,
    confidence = "provisoria",
  }) {
    if (!notebook || !evidence) {
      return {
        notebook,
        created: false,
        reason: "missing_data",
      };
    }

    const duplicateTag = "seed_from_inspection";

    if (notebook.hasHypothesisForEvidence(evidence.id, duplicateTag)) {
      return {
        notebook,
        created: false,
        reason: "duplicate_hypothesis",
      };
    }

    notebook.addHypothesis(
      new Hypothesis({
        id: createId("hypothesis"),
        title,
        text,
        evidenceIds: [evidence.id],
        supportingEvidenceIds: [evidence.id],
        opposingEvidenceIds: [],
        confidence,
        status: "abierta",
        createdFromEvidenceId: evidence.id,
        tags: [duplicateTag],
      })
    );

    return {
      notebook,
      created: true,
    };
  }
}

class NarrativeInspectionSystem {
  static buildAtmosphere(evidence) {
    if (!evidence) return [];

    const atmosphere = [];

    const reliability = evidence.reliability || "desconocida";
    const type = (evidence.type || "").toLowerCase();

    if (type.includes("carta") || type.includes("document") || type.includes("documento")) {
      atmosphere.push("La tinta parece haberse corrido por la humedad del frente.");
      atmosphere.push("El papel conserva manchas de barro seco en los bordes.");
    }

    if (type.includes("fotografía") || type.includes("photo")) {
      atmosphere.push("La fotografía presenta pequeños dobleces por manipulación constante.");
      atmosphere.push("El reverso tiene marcas escritas apresuradamente con lápiz.");
    }

    if (type.includes("médico") || type.includes("medical")) {
      atmosphere.push("Varias líneas fueron corregidas sobre la marcha.");
      atmosphere.push("El documento parece haber sido archivado con urgencia.");
    }

    if (type.includes("testimonio") || type.includes("testimony")) {
      atmosphere.push("Algunas frases parecen haber sido recordadas con dificultad.");
      atmosphere.push("El relato transmite agotamiento y tensión emocional.");
    }

    if (reliability === "baja") {
      atmosphere.push("Hay detalles contradictorios que generan desconfianza.");
    }

    if (reliability === "alta") {
      atmosphere.push("La precisión de ciertos datos vuelve el documento inquietantemente creíble.");
    }

    if (evidence.tags?.includes("military")) {
      atmosphere.push("El lenguaje utilizado mantiene una frialdad burocrática constante.");
    }

    return atmosphere.slice(0, 4);
  }
}

class EvidenceInspectionSystem {
  static openEvidence(state, evidenceId) {
    const evidence =
      state.notebook?.evidences?.find((item) => item.id === evidenceId) ||
      state.evidenceDatabase.find((item) => item.id === evidenceId);
    if (!evidence) return null;

    const primarySourceId = evidence.sourceLinks?.[0]?.sourceId || null;
    const source = primarySourceId
      ? state.sourceLibrary?.sources?.find((item) => item.id === primarySourceId)
      : null;

    return {
      evidence,
      source,
      inspectionTime: state.time,
    };
  }

  static buildInspectionNotes(evidence) {
    if (!evidence) return [];

    const notes = [];

    if (evidence.type?.includes("documento") || evidence.type === "document") {
      notes.push("El papel está húmedo y parcialmente deteriorado.");
    }

    if (evidence.type?.includes("testimonio") || evidence.type === "testimony") {
      notes.push("El testimonio parece emocionalmente inestable.");
    }

    if (evidence.tags?.includes("military") || evidence.type?.includes("militar")) {
      notes.push("El lenguaje utilizado coincide con registros militares oficiales.");
    }

    if (evidence.tags?.includes("medical") || evidence.type?.includes("médico")) {
      notes.push("Hay referencias a heridas y evacuaciones médicas.");
    }

    return notes;
  }
}

class CompassSystem {
  static POINTS_OF_INTEREST = [
    {
      id: "poi_no_mans_land",
      label: "Tierra de nadie",
      x: 48,
      y: 12,
      revealByDefault: true,
    },
    {
      id: "poi_allied_trench",
      label: "Trinchera aliada",
      x: 10,
      y: 31,
      revealByDefault: true,
    },
    {
      id: "poi_command_post",
      label: "Puesto de mando",
      x: 18,
      y: 28,
      revealByDefault: true,
    },
    {
      id: "poi_medical_post",
      label: "Puesto médico",
      x: 78,
      y: 29,
      revealByDefault: true,
    },
    {
      id: "poi_forward_wire",
      label: "Alambrada avanzada",
      x: 44,
      y: 17,
      revealByDefault: true,
    },
  ];

  static getDirectionFromDelta(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX <= 2 && absY <= 2) return "AQUÍ";

    if (absY > absX * 1.5) return dy < 0 ? "NORTE" : "SUR";
    if (absX > absY * 1.5) return dx > 0 ? "ESTE" : "OESTE";

    if (dx > 0 && dy < 0) return "NE";
    if (dx < 0 && dy < 0) return "NO";
    if (dx > 0 && dy > 0) return "SE";
    return "SO";
  }

  static getDistanceLabel(distance) {
    if (distance <= 4) return "muy cerca";
    if (distance <= 10) return "cerca";
    if (distance <= 20) return "media distancia";
    if (distance <= 35) return "lejos";
    return "muy lejos";
  }

  static getCompassEntries(playerPosition, flags = {}) {
    const safePosition = playerPosition || { x: 0, y: 0 };

    return CompassSystem.POINTS_OF_INTEREST
      .filter((poi) => poi.revealByDefault || flags[`revealed_${poi.id}`])
      .map((poi) => {
        const dx = poi.x - safePosition.x;
        const dy = poi.y - safePosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return {
          ...poi,
          direction: CompassSystem.getDirectionFromDelta(dx, dy),
          distance,
          distanceLabel: CompassSystem.getDistanceLabel(distance),
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }
}

class VisibilitySystem {
  static DEFAULT_RADIUS = 8;
  static MEMORY_RADIUS = 13;

  static isMapBoundary(map, x, y) {
    if (!map) return false;
    return x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1;
  }

  static getExplorationPalette(visibility, elevation, tileChar) {
    if (visibility === "hidden") return "text-black";
    if (visibility === "memory") return "text-stone-800 opacity-70";

    const dim = visibility === "dim";

    if (elevation === "trench") return dim ? "text-amber-900" : "text-amber-700";
    if (elevation === "trench_edge") return dim ? "text-yellow-900" : "text-yellow-600";

    if (elevation === "barrier") {
      if (tileChar === "#") return dim ? "text-green-950" : "text-lime-900";
      return dim ? "text-neutral-800" : "text-neutral-600";
    }

    if (tileChar === "~") return dim ? "text-cyan-950" : "text-cyan-900";
    if (tileChar === "^") return dim ? "text-slate-700" : "text-slate-400";
    if (tileChar === ".") return dim ? "text-stone-700" : "text-stone-600";
    if (tileChar === "=") return dim ? "text-amber-950" : "text-amber-800";
    if (tileChar === "+") return dim ? "text-yellow-950" : "text-yellow-700";

    return dim ? "text-zinc-700" : "text-zinc-500";
  }

  static getAtmosphereOverlay(timeState, bombardmentEffect) {
    const moment = TimeSystem.getDayMoment(timeState).label;

    if (bombardmentEffect?.active) {
      return bombardmentEffect.intensity === "cercano"
        ? "bg-yellow-200/20 animate-pulse"
        : "bg-orange-200/10";
    }

    if (moment === "Noche" || moment === "Madrugada") return "bg-slate-950/50";
    if (moment === "Amanecer") return "bg-amber-950/15";
    if (moment === "Atardecer") return "bg-orange-950/25";

    return "bg-transparent";
  }

  static createVisibilityCache(map, playerPosition, radius = VisibilitySystem.DEFAULT_RADIUS) {
    const cache = new Map();
    if (!map || !playerPosition) return cache;

    const memoryRadius = Math.max(radius + 3, VisibilitySystem.MEMORY_RADIUS);
    const minX = Math.max(0, playerPosition.x - memoryRadius);
    const maxX = Math.min(map.width - 1, playerPosition.x + memoryRadius);
    const minY = Math.max(0, playerPosition.y - memoryRadius);
    const maxY = Math.min(map.height - 1, playerPosition.y + memoryRadius);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const level = VisibilitySystem.calculateVisibilityLevel(x, y, playerPosition, radius, map, memoryRadius);
        cache.set(`${x},${y}`, level);
      }
    }

    return cache;
  }

  static getCachedVisibilityLevel(cache, x, y) {
    return cache.get(`${x},${y}`) || "hidden";
  }

  static getDistance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static getLinePoints(x0, y0, x1, y1) {
    const points = [];
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;

    while (true) {
      points.push({ x, y });
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return points;
  }

  static hasLineOfSight(map, fromX, fromY, toX, toY) {
    if (!map) return false;

    const line = VisibilitySystem.getLinePoints(fromX, fromY, toX, toY);

    for (let i = 1; i < line.length; i += 1) {
      const point = line[i];
      const tileChar = map.getTileChar(point.x, point.y);
      const isTargetTile = point.x === toX && point.y === toY;

      if (TileBehaviorSystem.blocksSight(tileChar) && !isTargetTile) {
        return false;
      }
    }

    return true;
  }

  static getTileElevation(map, x, y) {
    const tileChar = map.getTileChar(x, y);
    return TileBehaviorSystem.getElevation(tileChar);
  }

  static getNeighbors(x, y) {
    return [
      { x, y: y - 1 },
      { x, y: y + 1 },
      { x: x - 1, y },
      { x: x + 1, y },
    ];
  }

  static isNearElevation(map, x, y, elevation, maxDistance = 1) {
    for (let yy = y - maxDistance; yy <= y + maxDistance; yy += 1) {
      for (let xx = x - maxDistance; xx <= x + maxDistance; xx += 1) {
        if (xx === x && yy === y) continue;
        if (xx < 0 || yy < 0 || xx >= map.width || yy >= map.height) continue;
        if (VisibilitySystem.getTileElevation(map, xx, yy) === elevation) return true;
      }
    }

    return false;
  }

  static isTrenchLike(elevation) {
    return elevation === "trench" || elevation === "trench_edge";
  }

  static hasTrenchPerspective(map, fromX, fromY, toX, toY) {
    if (!map) return true;

    const fromElevation = VisibilitySystem.getTileElevation(map, fromX, fromY);
    const toElevation = VisibilitySystem.getTileElevation(map, toX, toY);
    const distance = VisibilitySystem.getDistance(fromX, fromY, toX, toY);

    const fromIsTrench = VisibilitySystem.isTrenchLike(fromElevation);
    const toIsTrench = VisibilitySystem.isTrenchLike(toElevation);

    if (fromIsTrench && toIsTrench) {
      return distance <= 9;
    }

    if (fromElevation === "trench" && toElevation === "surface") {
      return false;
    }

    if (fromElevation === "trench" && toElevation === "barrier") {
      return distance <= 2;
    }

    if (fromElevation === "trench_edge" && toElevation === "surface") {
      return distance <= 8;
    }

    if (fromElevation === "surface" && toElevation === "trench") {
      const targetNearEdge = VisibilitySystem.isNearElevation(
        map,
        toX,
        toY,
        "trench_edge",
        1
      );
      return targetNearEdge && distance <= 5;
    }

    if (fromElevation === "surface" && toElevation === "trench_edge") {
      return distance <= 7;
    }

    return true;
  }

  static isVisible(x, y, playerPosition, radius = VisibilitySystem.DEFAULT_RADIUS, map = null) {
    const insideRadius =
      VisibilitySystem.getDistance(x, y, playerPosition.x, playerPosition.y) <= radius;

    if (!insideRadius) return false;
    if (!map) return true;

    return (
      VisibilitySystem.hasLineOfSight(map, playerPosition.x, playerPosition.y, x, y) &&
      VisibilitySystem.hasTrenchPerspective(map, playerPosition.x, playerPosition.y, x, y)
    );
  }

  static calculateVisibilityLevel(
    x,
    y,
    playerPosition,
    radius = VisibilitySystem.DEFAULT_RADIUS,
    map = null,
    memoryRadius = VisibilitySystem.MEMORY_RADIUS
  ) {
    const distance = VisibilitySystem.getDistance(
      x,
      y,
      playerPosition.x,
      playerPosition.y
    );

    if (distance > memoryRadius) return "hidden";

    const hasPerspective =
      !map ||
      (VisibilitySystem.hasLineOfSight(
        map,
        playerPosition.x,
        playerPosition.y,
        x,
        y
      ) &&
        VisibilitySystem.hasTrenchPerspective(
          map,
          playerPosition.x,
          playerPosition.y,
          x,
          y
        ));

    if (!hasPerspective) return "hidden";

    if (distance > radius) return "memory";
    if (distance <= radius * 0.45) return "bright";
    return "dim";
  }
}

class TileBehaviorSystem {
  static TILE_DEFINITIONS = {
    "#": new TileDefinition({
      id: "sandbag_wall",
      char: "#",
      label: "sacos de arena",
      walkable: false,
      blocksSight: true,
      futureSprite: "tiles/sandbag_wall.png",
      colorClass: "text-lime-900",
      elevation: "barrier",
    }),
    ".": new TileDefinition({
      id: "mud",
      char: ".",
      label: "barro",
      walkable: true,
      blocksSight: false,
      futureSprite: "tiles/mud.png",
      colorClass: "text-yellow-900",
      elevation: "surface",
    }),
    "=": new TileDefinition({
      id: "wood_plank",
      char: "=",
      label: "tablones húmedos",
      walkable: true,
      blocksSight: false,
      futureSprite: "tiles/wood_plank.png",
      colorClass: "text-amber-800",
      elevation: "trench",
    }),
    "~": new TileDefinition({
      id: "water_mud",
      char: "~",
      label: "charco de barro",
      walkable: true,
      blocksSight: false,
      futureSprite: "tiles/water_mud.png",
      colorClass: "text-slate-600",
      elevation: "surface",
    }),
    "^": new TileDefinition({
      id: "barbed_wire",
      char: "^",
      label: "alambre de púas",
      walkable: false,
      blocksSight: false,
      futureSprite: "tiles/barbed_wire.png",
      colorClass: "text-zinc-500",
      elevation: "surface",
    }),
    "+": new TileDefinition({
      id: "trench_edge",
      char: "+",
      label: "borde de trinchera / paso",
      walkable: true,
      blocksSight: false,
      futureSprite: "tiles/trench_edge.png",
      colorClass: "text-yellow-500",
      elevation: "trench_edge",
    }),
    " ": new TileDefinition({
      id: "void",
      char: " ",
      label: "vacío",
      walkable: false,
      blocksSight: true,
      futureSprite: "tiles/void.png",
      colorClass: "text-stone-950",
      elevation: "barrier",
    }),
  };

  static getDefinition(tileChar) {
    return TileBehaviorSystem.TILE_DEFINITIONS[tileChar] || TileBehaviorSystem.TILE_DEFINITIONS[" "];
  }

  static getTileDefinition(char) {
    return TileBehaviorSystem.getDefinition(char);
  }

  static isWalkable(tileChar) {
    return TileBehaviorSystem.getDefinition(tileChar).walkable;
  }

  static blocksSight(tileChar) {
    return TileBehaviorSystem.getDefinition(tileChar).blocksSight;
  }

  static getElevation(tileChar) {
    return TileBehaviorSystem.getDefinition(tileChar).elevation || "surface";
  }

  static getMovementCost(tileChar) {
    const tile = TileBehaviorSystem.getDefinition(tileChar);
    const costs = {
      mud: 1.5,
      wood_plank: 1,
      water_mud: 3,
      trench_edge: 1.2,
    };
    return costs[tile.id] || 1;
  }

  static causesStress(tileChar) {
    const tile = TileBehaviorSystem.getDefinition(tileChar);
    const stressTiles = {
      mud: 0.25,
      water_mud: 1,
      trench_edge: 0.1,
    };
    return stressTiles[tile.id] || 0;
  }

  static isWalkableTile(map, x, y) {
    if (!map) return false;
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
    return TileBehaviorSystem.isWalkable(map.getTileChar(x, y));
  }
}

class AsciiMapEngine {
  static getCurrentMap(state) {
    return (
      state.asciiMaps.find((map) => map.id === "map_somme_front_large") ||
      state.asciiMaps.find((map) => map.locationId === state.currentLocationId) ||
      state.asciiMaps[0]
    );
  }

  static START_POSITIONS = {
    loc_trench: { x: 12, y: 29 },
    loc_command: { x: 13, y: 29 },
    loc_medical: { x: 80, y: 29 },
    loc_no_mans_land: { x: 48, y: 13 },
  };

  static getStartPositionForLocation(locationId) {
    return AsciiMapEngine.START_POSITIONS[locationId] || AsciiMapEngine.START_POSITIONS.loc_trench;
  }

  static getTileDefinition(char) {
    return TileBehaviorSystem.getDefinition(char);
  }

  static canMoveTo(map, x, y, state = null) {
    if (!map) return false;
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;

    const tileChar = map.getTileChar(x, y);
    const entity = map.getEntityAt(x, y, state);
    return TileBehaviorSystem.isWalkable(tileChar) && !entity;
  }

  static findNearestWalkablePosition(map, preferredPosition, state = null) {
    if (!map) return preferredPosition || { x: 0, y: 0 };
    const start = preferredPosition || { x: 1, y: 1 };

    if (AsciiMapEngine.canMoveTo(map, start.x, start.y, state)) return start;

    const maxRadius = Math.max(map.width, map.height);
    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (let y = start.y - radius; y <= start.y + radius; y += 1) {
        for (let x = start.x - radius; x <= start.x + radius; x += 1) {
          if (AsciiMapEngine.canMoveTo(map, x, y, state)) return { x, y };
        }
      }
    }

    return { x: 1, y: 1 };
  }
}

class Location {
  constructor({
    id,
    name,
    description,
    atmosphere,
    connectedLocations = [],
    stressLevel = 0,
    npcIds = [],
    evidenceIds = [],
    events = [],
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.atmosphere = atmosphere;
    this.connectedLocations = connectedLocations;
    this.stressLevel = stressLevel;
    this.npcIds = npcIds;
    this.evidenceIds = evidenceIds;
    this.events = events;
  }
}

class DialogueConditionSystem {
  static normalizeCondition(condition = {}) {
    return {
      ...condition,
      type: String(condition.type || "").toUpperCase(),
    };
  }

  static getConditionValue(condition = {}) {
    return condition.value ?? condition.id ?? condition.key ?? condition.flag ?? null;
  }

  static compareNumber(currentValue = 0, condition = {}) {
    const expected = Number(condition.value ?? condition.amount ?? condition.threshold ?? 0);
    const current = Number(currentValue || 0);
    const operator = condition.operator || condition.comparison || ">=";

    switch (operator) {
      case ">":
        return current > expected;
      case ">=":
        return current >= expected;
      case "<":
        return current < expected;
      case "<=":
        return current <= expected;
      case "==":
      case "=":
        return current === expected;
      case "!=":
        return current !== expected;
      default:
        return current >= expected;
    }
  }

  static hasEvidence(state, evidenceId) {
    return (state.notebook?.evidences || []).some((evidence) => evidence.id === evidenceId);
  }

  static hasNote(state, noteToken) {
    if (!noteToken) return false;
    const normalizedToken = String(noteToken).toLowerCase();

    return (state.notebook?.notes || []).some((note) =>
      note.id === noteToken ||
      note.tags?.includes(noteToken) ||
      (note.text || "").toLowerCase().includes(normalizedToken) ||
      note.relatedEvidenceIds?.includes(noteToken)
    );
  }

  static hasContradiction(state, contradictionId) {
    if (!contradictionId) return (state.notebook?.contradictions || []).length > 0;

    return (state.notebook?.contradictions || []).some((contradiction) =>
      contradiction.id === contradictionId ||
      contradiction.evidenceIds?.includes(contradictionId) ||
      (contradiction.title || "").toLowerCase().includes(String(contradictionId).toLowerCase())
    );
  }

  static hasEvidenceFlag(state, condition = {}) {
    const evidenceId = condition.evidenceId || condition.id || null;
    const flag = condition.flag || condition.value || null;
    const evidences = state.notebook?.evidences || [];

    if (!flag) return false;

    if (evidenceId) {
      return evidences.some(
        (evidence) => evidence.id === evidenceId && evidence.sourceFlags?.includes(flag)
      );
    }

    return evidences.some((evidence) => evidence.sourceFlags?.includes(flag));
  }

  static getCaseStatus(state, caseId = null) {
    if (!caseId) return state.notebook?.activeCase?.status || null;
    return state.cases?.find((caseFile) => caseFile.id === caseId)?.status || null;
  }

  static evaluate(condition = {}, state) {
    const item = DialogueConditionSystem.normalizeCondition(condition);
    const value = DialogueConditionSystem.getConditionValue(item);

    switch (item.type) {
      case "PROFILE":
        return state.player?.profile === value;

      case "HAS_EVIDENCE":
        return DialogueConditionSystem.hasEvidence(state, value);

      case "NOT_HAS_EVIDENCE":
        return !DialogueConditionSystem.hasEvidence(state, value);

      case "HAS_NOTE":
        return DialogueConditionSystem.hasNote(state, value);

      case "NOT_HAS_NOTE":
        return !DialogueConditionSystem.hasNote(state, value);

      case "HAS_CONTRADICTION":
        return DialogueConditionSystem.hasContradiction(state, value);

      case "NOT_HAS_CONTRADICTION":
        return !DialogueConditionSystem.hasContradiction(state, value);

      case "HAS_FLAG":
      case "FLAG":
        return state.flags?.[value] === true || NarrativeFlagSystem.hasFlag(state.narrativeFlags, value);

      case "NOT_FLAG":
        return state.flags?.[value] !== true && !NarrativeFlagSystem.hasFlag(state.narrativeFlags, value);

      case "HAS_SOURCE_FLAG":
      case "HAS_EVIDENCE_FLAG":
        return DialogueConditionSystem.hasEvidenceFlag(state, item);

      case "NOT_SOURCE_FLAG":
      case "NOT_EVIDENCE_FLAG":
        return !DialogueConditionSystem.hasEvidenceFlag(state, item);

      case "CASE_STATUS": {
        const caseId = item.caseId || item.id || null;
        const expectedStatus = item.status || item.value;
        return DialogueConditionSystem.getCaseStatus(state, caseId) === expectedStatus;
      }

      case "ACTIVE_CASE":
        return state.notebook?.activeCase?.id === value;

      case "REPUTATION_AT_LEAST": {
        const faction = item.faction || item.key || "soldiers";
        return DialogueConditionSystem.compareNumber(state.player?.reputation?.[faction] || 0, item);
      }

      case "FACTION_MEMORY_AT_LEAST": {
        const faction = item.faction || item.key || "army";
        return DialogueConditionSystem.compareNumber(state.factionMemory?.[faction] || 0, item);
      }

      case "STRESS_AT_LEAST":
        return DialogueConditionSystem.compareNumber(state.player?.stress || 0, item);

      case "CREDIBILITY_AT_LEAST":
        return DialogueConditionSystem.compareNumber(state.player?.credibility || 0, item);

      case "WORLD_STATE_AT_LEAST": {
        const key = item.key || item.field || "credibility";
        return DialogueConditionSystem.compareNumber(state.worldState?.[key] || 0, item);
      }

      default:
        return true;
    }
  }

  static all(conditions = [], state) {
    return (conditions || []).every((condition) =>
      DialogueConditionSystem.evaluate(condition, state)
    );
  }
}

class Dialogue {
  constructor({ id, npcId, text, choices = [], conditions = [] }) {
    this.id = id;
    this.npcId = npcId;
    this.text = text;
    this.choices = choices;
    this.conditions = conditions;
  }

  isAvailable(state) {
    if (!this.conditions.length) return true;
    return DialogueConditionSystem.all(this.conditions, state);
  }
}

const AUDIO_CATALOG = {
  notebook_open: { id: "notebook_open", src: "audio/ui/notebook_open.mp3", volume: 0.55, loop: false, cooldownMs: 250 },
  notebook_close: { id: "notebook_close", src: "audio/ui/notebook_close.mp3", volume: 0.45, loop: false, cooldownMs: 250 },
  evidence_found: { id: "evidence_found", src: "audio/ui/evidence_found.mp3", volume: 0.65, loop: false, cooldownMs: 500 },
  dialogue_open: { id: "dialogue_open", src: "audio/ui/dialogue_open.mp3", volume: 0.45, loop: false, cooldownMs: 300 },
  dialogue_choice: { id: "dialogue_choice", src: "audio/ui/dialogue_choice.mp3", volume: 0.35, loop: false, cooldownMs: 180 },
  contradiction_detected: { id: "contradiction_detected", src: "audio/ui/contradiction_detected.mp3", volume: 0.7, loop: false, cooldownMs: 800 },
  save_game: { id: "save_game", src: "audio/ui/save_game.mp3", volume: 0.45, loop: false, cooldownMs: 300 },
  load_game: { id: "load_game", src: "audio/ui/load_game.mp3", volume: 0.45, loop: false, cooldownMs: 300 },
  pause_open: { id: "pause_open", src: "audio/ui/pause_open.mp3", volume: 0.35, loop: false, cooldownMs: 250 },
  bombardment_near: { id: "bombardment_near", src: "audio/front/bombardment_near.mp3", volume: 0.9, loop: false, cooldownMs: 1200 },
  bombardment_distant: { id: "bombardment_distant", src: "audio/front/bombardment_distant.mp3", volume: 0.45, loop: false, cooldownMs: 1800 },
  step_mud: { id: "step_mud", src: "audio/front/step_mud.mp3", volume: 0.28, loop: false, cooldownMs: 180 },
  step_wood: { id: "step_wood", src: "audio/front/step_wood.mp3", volume: 0.24, loop: false, cooldownMs: 170 },
  step_water_mud: { id: "step_water_mud", src: "audio/front/step_water_mud.mp3", volume: 0.32, loop: false, cooldownMs: 240 },
  step_trench_edge: { id: "step_trench_edge", src: "audio/front/step_trench_edge.mp3", volume: 0.24, loop: false, cooldownMs: 180 },
  step_default: { id: "step_default", src: "audio/front/step_default.mp3", volume: 0.22, loop: false, cooldownMs: 170 },
};

const MUSIC_CATALOG = {
  menu_theme: { id: "menu_theme", src: "audio/music/menu_theme.mp3", volume: 0.28, loop: true },
  front_ambient_day: { id: "front_ambient_day", src: "audio/music/front_ambient_day.mp3", volume: 0.24, loop: true },
  front_ambient_night: { id: "front_ambient_night", src: "audio/music/front_ambient_night.mp3", volume: 0.22, loop: true },
  notebook_ambient: { id: "notebook_ambient", src: "audio/music/notebook_ambient.mp3", volume: 0.18, loop: true },
};

const SPRITE_CATALOG = {
  player_correspondent: { id: "player_correspondent", src: "sprites/player/correspondent.png", fallbackChar: "@", width: 32, height: 32 },
  npc_soldier: { id: "npc_soldier", src: "sprites/npc/soldier.png", fallbackChar: "S", width: 32, height: 32 },
  npc_ambient_soldier: { id: "npc_ambient_soldier", src: "sprites/npc/ambient_soldier.png", fallbackChar: "s", width: 32, height: 32 },
  npc_medic: { id: "npc_medic", src: "sprites/npc/medic.png", fallbackChar: "m", width: 32, height: 32 },
  evidence_document: { id: "evidence_document", src: "sprites/evidence/document.png", fallbackChar: "?", width: 32, height: 32 },
  corpse: { id: "corpse", src: "sprites/front/corpse.png", fallbackChar: "x", width: 32, height: 32 },
  wounded: { id: "wounded", src: "sprites/front/wounded.png", fallbackChar: "!", width: 32, height: 32 },
  impact: { id: "impact", src: "sprites/front/impact.png", fallbackChar: "*", width: 32, height: 32 },
  tile_sandbag_wall: { id: "tile_sandbag_wall", src: "sprites/tiles/sandbag_wall.png", fallbackChar: "#", width: 32, height: 32 },
  tile_mud: { id: "tile_mud", src: "sprites/tiles/mud.png", fallbackChar: ".", width: 32, height: 32 },
  tile_wood_plank: { id: "tile_wood_plank", src: "sprites/tiles/wood_plank.png", fallbackChar: "=", width: 32, height: 32 },
  tile_water_mud: { id: "tile_water_mud", src: "sprites/tiles/water_mud.png", fallbackChar: "~", width: 32, height: 32 },
  tile_barbed_wire: { id: "tile_barbed_wire", src: "sprites/tiles/barbed_wire.png", fallbackChar: "^", width: 32, height: 32 },
  tile_trench_edge: { id: "tile_trench_edge", src: "sprites/tiles/trench_edge.png", fallbackChar: "+", width: 32, height: 32 },
  tile_void: { id: "tile_void", src: "sprites/tiles/void.png", fallbackChar: " ", width: 32, height: 32 },
};

const PRESENTATION_CATALOG = {
  player: { spriteId: "player_correspondent", moveSoundId: "step_mud" },
  npc: { spriteId: "npc_soldier", interactSoundId: "dialogue_open" },
  ambient_npc: { spriteId: "npc_ambient_soldier", interactSoundId: "dialogue_open" },
  ambient_medic: { spriteId: "npc_medic" },
  evidence: { spriteId: "evidence_document", interactSoundId: "evidence_found" },
  corpse: { spriteId: "corpse" },
  wounded: { spriteId: "wounded" },
  impact: { spriteId: "impact", soundId: "bombardment_near" },
  tiles: {
    sandbag_wall: { spriteId: "tile_sandbag_wall" },
    mud: { spriteId: "tile_mud" },
    wood_plank: { spriteId: "tile_wood_plank" },
    water_mud: { spriteId: "tile_water_mud" },
    barbed_wire: { spriteId: "tile_barbed_wire" },
    trench_edge: { spriteId: "tile_trench_edge" },
    void: { spriteId: "tile_void" },
  },
};

class VisualSettingsSystem {
  static DEFAULT = {
    renderMode: "sprites",
    audioEnabled: true,
    musicEnabled: true,
    masterVolume: 0.8,
    sfxVolume: 1,
    musicVolume: 0.75,
  };
  static VALID_RENDER_MODES = new Set(["sprites"]);

  static normalize(settings = {}) {
    const renderMode = VisualSettingsSystem.VALID_RENDER_MODES.has(settings?.renderMode)
      ? settings.renderMode
      : VisualSettingsSystem.DEFAULT.renderMode;

    return {
      ...VisualSettingsSystem.DEFAULT,
      ...(settings || {}),
      renderMode,
      audioEnabled: settings?.audioEnabled !== false,
      musicEnabled: settings?.musicEnabled !== false,
      masterVolume: Math.max(0, Math.min(1, Number(settings?.masterVolume ?? VisualSettingsSystem.DEFAULT.masterVolume))),
      sfxVolume: Math.max(0, Math.min(1, Number(settings?.sfxVolume ?? VisualSettingsSystem.DEFAULT.sfxVolume))),
      musicVolume: Math.max(0, Math.min(1, Number(settings?.musicVolume ?? VisualSettingsSystem.DEFAULT.musicVolume))),
    };
  }

  static getNextRenderMode() {
    return "sprites";
  }

  static getRenderModeLabel() {
    return "Sprites con ASCII de respaldo";
  }
}

class SpriteSystem {
  static normalizeSpriteSrc(src = "") {
    if (!src) return "";
    return src.startsWith("sprites/") ? src : `sprites/${src}`;
  }

  static isUsableSprite(sprite = null) {
    return Boolean(sprite?.src);
  }

  static getSprite(spriteId) {
    if (!spriteId) return null;
    return SPRITE_CATALOG[spriteId] || null;
  }

  static getPresentationForEntity(entityType) {
    return PRESENTATION_CATALOG[entityType] || null;
  }

  static getSpriteForEntity(entity = {}) {
    if (entity.futureSprite) {
      return {
        id: entity.futureSprite,
        src: SpriteSystem.normalizeSpriteSrc(entity.futureSprite),
        fallbackChar: entity.char || "?",
        width: 32,
        height: 32,
      };
    }
    const presentation = SpriteSystem.getPresentationForEntity(entity.type);
    return SpriteSystem.getSprite(presentation?.spriteId);
  }

  static getSpriteForPlayer() {
    return SpriteSystem.getSprite(PRESENTATION_CATALOG.player.spriteId);
  }

  static getSpriteForImpact() {
    return SpriteSystem.getSprite(PRESENTATION_CATALOG.impact.spriteId);
  }

  static getSpriteForTile(tile = {}) {
    if (!tile) return null;

    if (tile.futureSprite) {
      return {
        id: `tile_${tile.id || tile.char || "unknown"}`,
        src: SpriteSystem.normalizeSpriteSrc(tile.futureSprite),
        fallbackChar: tile.char || " ",
        width: 32,
        height: 32,
      };
    }

    const presentation = PRESENTATION_CATALOG.tiles?.[tile.id];
    return SpriteSystem.getSprite(presentation?.spriteId);
  }

  static shouldAttemptSprite(renderMode = "sprites") {
    return renderMode === "sprites";
  }

  static shouldRenderSprite(renderMode = "sprites", sprite = null) {
    return SpriteSystem.shouldAttemptSprite(renderMode) && SpriteSystem.isUsableSprite(sprite);
  }
}

class AudioSystem {
  static lastPlayedAt = {};
  static currentMusic = null;
  static currentMusicId = null;

  static getAudio(audioId) {
    if (!audioId) return null;
    return AUDIO_CATALOG[audioId] || null;
  }

  static getMusic(musicId) {
    if (!musicId) return null;
    return MUSIC_CATALOG[musicId] || null;
  }

  static getMusicForState(state = {}) {
    if (state.notebookOpen) return "notebook_ambient";
    if (state.screen === "GAMEPLAY") {
      return TimeSystem.isNight(state.time || {}) ? "front_ambient_night" : "front_ambient_day";
    }
    if (["MENU", "CHARACTER_CREATION", "OPTIONS", "INTRO"].includes(state.screen)) return "menu_theme";
    return null;
  }

  static getStepSoundForTile(tileChar) {
    const tile = TileBehaviorSystem.getDefinition(tileChar);
    const soundByTileId = {
      mud: "step_mud",
      wood_plank: "step_wood",
      water_mud: "step_water_mud",
      trench_edge: "step_trench_edge",
    };
    return soundByTileId[tile?.id] || "step_default";
  }

  static getBombardmentSoundForEffect(bombardmentEffect = {}) {
    if (!bombardmentEffect?.active) return null;
    return bombardmentEffect.intensity === "cercano"
      ? "bombardment_near"
      : "bombardment_distant";
  }

  static canPlay(audioId, settings = {}) {
    const normalizedSettings = VisualSettingsSystem.normalize(settings);
    if (!normalizedSettings.audioEnabled) return false;
    const audio = AudioSystem.getAudio(audioId);
    if (!audio) return false;
    const now = Date.now();
    const lastPlayed = AudioSystem.lastPlayedAt[audioId] || 0;
    return now - lastPlayed >= (audio.cooldownMs || 0);
  }

  static play(audioId, settings = {}) {
    if (typeof window === "undefined" || typeof Audio === "undefined") return false;
    const normalizedSettings = VisualSettingsSystem.normalize(settings);
    if (!AudioSystem.canPlay(audioId, normalizedSettings)) return false;
    const audioData = AudioSystem.getAudio(audioId);
    try {
      const audio = new Audio(audioData.src);
      audio.volume = Math.max(0, Math.min(1, (audioData.volume ?? 1) * normalizedSettings.masterVolume * normalizedSettings.sfxVolume));
      audio.loop = Boolean(audioData.loop);
      AudioSystem.lastPlayedAt[audioId] = Date.now();
      audio.play().catch(() => false);
      return true;
    } catch (error) {
      return false;
    }
  }

  static stopMusic() {
    if (AudioSystem.currentMusic) {
      try {
        AudioSystem.currentMusic.pause();
        AudioSystem.currentMusic.currentTime = 0;
      } catch (error) {
        // Si el navegador no permite controlar el audio, se ignora sin romper la partida.
      }
    }
    AudioSystem.currentMusic = null;
    AudioSystem.currentMusicId = null;
  }

  static playMusic(musicId, settings = {}) {
    if (typeof window === "undefined" || typeof Audio === "undefined") return false;
    const normalizedSettings = VisualSettingsSystem.normalize(settings);

    if (!normalizedSettings.audioEnabled || !normalizedSettings.musicEnabled || !musicId) {
      AudioSystem.stopMusic();
      return false;
    }

    const musicData = AudioSystem.getMusic(musicId);
    if (!musicData) {
      AudioSystem.stopMusic();
      return false;
    }

    const targetVolume = Math.max(0, Math.min(1, (musicData.volume ?? 1) * normalizedSettings.masterVolume * normalizedSettings.musicVolume));

    if (AudioSystem.currentMusic && AudioSystem.currentMusicId === musicId) {
      AudioSystem.currentMusic.volume = targetVolume;
      return true;
    }

    AudioSystem.stopMusic();

    try {
      const music = new Audio(musicData.src);
      music.loop = musicData.loop !== false;
      music.volume = targetVolume;
      AudioSystem.currentMusic = music;
      AudioSystem.currentMusicId = musicId;
      music.play().catch(() => {
        // Los navegadores pueden bloquear música hasta el primer gesto del usuario.
        return false;
      });
      return true;
    } catch (error) {
      AudioSystem.stopMusic();
      return false;
    }
  }
}

if (typeof window !== "undefined") {
  window.SommeAudio = {
    sfx: AUDIO_CATALOG,
    music: MUSIC_CATALOG,
    play: (audioId, settings = {}) => AudioSystem.play(audioId, settings),
    playMusic: (musicId, settings = {}) => AudioSystem.playMusic(musicId, settings),
    stopMusic: () => AudioSystem.stopMusic(),
  };
}


class ProceduralNPCSystem {
  static FIRST_NAMES = [
    "Arthur",
    "William",
    "George",
    "Henry",
    "Thomas",
    "Albert",
    "James",
    "Edward",
    "Frank",
    "Charles",
    "Walter",
    "Percy",
    "Harold",
    "Stanley",
    "Ernest",
    "Frederick",
  ];

  static LAST_NAMES = [
    "Bennett",
    "Carter",
    "Hughes",
    "Morgan",
    "Turner",
    "Walker",
    "Cooper",
    "Miller",
    "Ward",
    "Evans",
    "Parker",
    "Reed",
    "Foster",
    "Clarke",
    "Bailey",
    "Wood",
  ];

  static ROLES = [
    "fusilero de guardia",
    "patrulla del parapeto",
    "mensajero embarrado",
    "camillero agotado",
    "enfermera de puesto avanzado",
    "sanitario auxiliar",
    "soldado de reserva",
    "observador de señales",
    "cocinero de trinchera",
    "centinela del límite",
    "zapador de reparación",
    "ordenanza del puesto de mando",
  ];

  static AMBIENT_LINES = [
    "No sé si el barro se pega a uno o si uno termina perteneciendo al barro.",
    "Anoche dijeron que el bombardeo era lejano. Igual nos dejó sin dormir.",
    "El hospital no da abasto. A veces llegan hombres que todavía creen estar en la línea.",
    "Los oficiales hablan de sectores. Nosotros hablamos de quienes no volvieron.",
    "Si empieza a llover otra vez, mañana la trinchera va a tragarse las botas.",
    "La artillería calla de golpe y eso, a veces, asusta más que el trueno.",
    "El mensajero jura que la ruta está abierta, pero volvió con la bolsa llena de barro.",
    "En el borde del mapa uno aprende a caminar sin mirar demasiado lejos.",
    "La enfermera pidió vendas limpias. Nadie supo de dónde sacarlas.",
    "Los cables vuelven a romperse siempre en el peor momento.",
    "Si ve al cabo de señales, dígale que todavía esperamos respuesta.",
    "La patrulla encontró huellas nuevas junto al alambre, pero nadie quiere discutirlo en voz alta.",
    "Un herido pidió agua; después pidió que no escribieran su nombre todavía.",
    "El puesto de mando manda órdenes como si el barro obedeciera.",
    "A veces cruzo de un extremo al otro sin recordar qué mensaje llevaba.",
    "No estorbaré su paso, corresponsal. Aquí todos aprendimos a corrernos rápido.",
  ];

  static buildName(seed = 0) {
    const first = ProceduralNPCSystem.FIRST_NAMES[seed % ProceduralNPCSystem.FIRST_NAMES.length];
    const last = ProceduralNPCSystem.LAST_NAMES[(seed * 7 + 3) % ProceduralNPCSystem.LAST_NAMES.length];
    return `${first} ${last}`;
  }

  static buildDialogueId(index) {
    return `dlg_ambient_front_${String(index).padStart(2, "0")}`;
  }

  static buildNPCId(index) {
    return `npc_proc_${String(index).padStart(2, "0")}`;
  }

  static buildAmbientNPC(index = 0, overrides = {}) {
    const profile = ProceduralNPCSystem.getAmbientProfile(index);
    return new NPC({
      id: overrides.id || ProceduralNPCSystem.buildNPCId(index),
      name: overrides.name || ProceduralNPCSystem.buildName(index),
      role: overrides.role || profile.role || ProceduralNPCSystem.ROLES[index % ProceduralNPCSystem.ROLES.length],
      faction: overrides.faction || profile.faction || "soldiers",
      description:
        overrides.description ||
        ProceduralNPCSystem.getAmbientDescription(profile),
      dialogueIds: overrides.dialogueIds || [ProceduralNPCSystem.buildDialogueId(index)],
      sex: overrides.sex || profile.sex || "unknown",
      gasMask: typeof overrides.gasMask === "boolean" ? overrides.gasMask : Boolean(profile.gasMask),
      portraitSeed: overrides.portraitSeed || ProceduralNPCSystem.buildNPCId(index),
      asciiPortrait: overrides.asciiPortrait || {
        sex: overrides.sex || profile.sex || "unknown",
        gasMask: typeof overrides.gasMask === "boolean" ? overrides.gasMask : Boolean(profile.gasMask),
        seed: overrides.portraitSeed || ProceduralNPCSystem.buildNPCId(index),
      },
    });
  }

  static buildAmbientNPCs(count = 18) {
    return Array.from({ length: count }, (_, index) =>
      ProceduralNPCSystem.buildAmbientNPC(index)
    );
  }

  static getAmbientProfile(index = 0) {
    const profiles = [
      { role: "fusilero de guardia", faction: "soldiers", char: "s", colorClass: "text-lime-500", label: "Soldado de guardia", sex: "male", gasMask: false },
      { role: "patrulla del parapeto", faction: "soldiers", char: "s", colorClass: "text-lime-400", label: "Patrulla del parapeto", sex: "male", gasMask: true },
      { role: "mensajero embarrado", faction: "soldiers", char: "s", colorClass: "text-yellow-300", label: "Mensajero", sex: "male", gasMask: false },
      { role: "camillero agotado", faction: "medics", char: "m", colorClass: "text-cyan-300", label: "Camillero", sex: "male", gasMask: false },
      { role: "enfermera de puesto avanzado", faction: "medics", char: "m", colorClass: "text-cyan-200", label: "Enfermera", sex: "female", gasMask: false },
      { role: "sanitario auxiliar", faction: "medics", char: "m", colorClass: "text-sky-300", label: "Sanitario", sex: "unknown", gasMask: false },
      { role: "soldado de reserva", faction: "soldiers", char: "s", colorClass: "text-lime-600", label: "Reservista", sex: "male", gasMask: false },
      { role: "observador de señales", faction: "officers", char: "s", colorClass: "text-amber-300", label: "Observador de señales", sex: "male", gasMask: false },
      { role: "cocinero de trinchera", faction: "soldiers", char: "s", colorClass: "text-orange-300", label: "Cocinero de trinchera", sex: "male", gasMask: false },
      { role: "centinela del límite", faction: "soldiers", char: "s", colorClass: "text-green-300", label: "Centinela", sex: "male", gasMask: true },
      { role: "zapador de reparación", faction: "soldiers", char: "s", colorClass: "text-stone-300", label: "Zapador", sex: "male", gasMask: false },
      { role: "ordenanza del puesto de mando", faction: "officers", char: "s", colorClass: "text-amber-200", label: "Ordenanza", sex: "male", gasMask: false },
    ];
    return profiles[index % profiles.length];
  }

  static getAmbientDescription(profile) {
    if (profile.faction === "medics") {
      return "Personal sanitario de paso por la línea. Se mueve entre vendas, órdenes breves y heridos que no siempre pueden esperar.";
    }
    if (profile.role?.includes("mensajero")) {
      return "Mensajero del frente, siempre embarrado, siempre apurado. Cruza la trinchera con la bolsa de partes contra el pecho.";
    }
    if (profile.role?.includes("centinela") || profile.role?.includes("patrulla")) {
      return "Soldado asignado a vigilar límites, parapetos y pasos estrechos. Se aparta cuando alguien necesita avanzar.";
    }
    return "Una presencia más del frente, marcada por cansancio, humedad y espera. No parece vinculada a ningún caso concreto.";
  }

  static buildAmbientDialogues(count = 18) {
    return Array.from({ length: count }, (_, index) => {
      const profile = ProceduralNPCSystem.getAmbientProfile(index);
      const line = ProceduralNPCSystem.AMBIENT_LINES[index % ProceduralNPCSystem.AMBIENT_LINES.length];
      const secondLine = ProceduralNPCSystem.AMBIENT_LINES[(index * 5 + 3) % ProceduralNPCSystem.AMBIENT_LINES.length];
      const roleHint = profile.faction === "medics"
        ? "El puesto médico necesita manos, no preguntas. Pero algunas preguntas también salvan a alguien."
        : profile.role.includes("mensajero")
          ? "Si lleva una nota, que sea corta. Las largas se mojan antes de llegar."
          : profile.role.includes("patrulla") || profile.role.includes("centinela")
            ? "Estoy mirando el borde. Si algo se mueve allí, prefiero verlo antes de oírlo."
            : secondLine;

      return new Dialogue({
        id: ProceduralNPCSystem.buildDialogueId(index),
        npcId: ProceduralNPCSystem.buildNPCId(index),
        text: line,
        choices: [
          {
            id: `${ProceduralNPCSystem.buildDialogueId(index)}_listen`,
            label: "Escuchar un momento",
            effect: {
              type: "ADD_NOTE",
              payload: {
                text: `Charla del frente (${profile.role}): ${line}`,
                relatedEvidenceIds: [],
              },
            },
            closeAfterEffect: true,
          },
          {
            id: `${ProceduralNPCSystem.buildDialogueId(index)}_ask_role`,
            label: "Preguntar qué está haciendo",
            nextDialogueId: `${ProceduralNPCSystem.buildDialogueId(index)}_role`,
          },
          {
            id: `${ProceduralNPCSystem.buildDialogueId(index)}_leave`,
            label: "Seguir camino",
            closeAfterEffect: true,
          },
        ],
      });
    }).flatMap((dialogue, index) => {
      const profile = ProceduralNPCSystem.getAmbientProfile(index);
      const routineLines = {
        medics: [
          "Voy y vengo con vendas, agua y camillas. Si me quedo quieto, alguien se queda solo.",
          "Busco pulso, agua limpia y un rincón menos frío. En esta línea, eso ya es bastante.",
          "Traigo vendas secas cuando quedan. Cuando no quedan, traigo manos."
        ],
        messenger: [
          "Cruzo el sector con partes y nombres. A veces llego antes que la noticia; otras, después del entierro.",
          "Llevo órdenes dobladas contra el pecho. El barro intenta leerlas antes que el capitán.",
          "Mi trabajo es llegar. Lo demás lo decide la artillería."
        ],
        patrol: [
          "Patrullo el límite para que nadie confunda silencio con seguridad.",
          "Camino el borde del sector. Si algo cambia, quiero verlo antes de que nos alcance.",
          "Vigilo los huecos del alambre. A veces el peligro entra por donde nadie mira."
        ],
        signal: [
          "Reviso líneas y señales. Un cable cortado puede aislar a más hombres que una explosión.",
          "Escucho estática, golpes y voces partidas. A veces el frente habla así.",
          "Si la señal cae, alguien queda esperando una orden que no llega."
        ],
        support: [
          "Muevo sacos, tablas y cajas. El frente se sostiene también con cosas pequeñas.",
          "Estoy reforzando este paso. Si cede, todos van a notar la diferencia.",
          "Traigo lo que falta y retiro lo que ya no sirve. Casi nunca alcanza."
        ]
      };

      const roleKey = profile.faction === "medics"
        ? "medics"
        : profile.role.includes("mensajero")
          ? "messenger"
          : profile.role.includes("patrulla") || profile.role.includes("centinela")
            ? "patrol"
            : profile.role.includes("señales") || profile.role.includes("observador")
              ? "signal"
              : "support";

      const roleOptions = routineLines[roleKey] || routineLines.support;
      const roleText = roleOptions[index % roleOptions.length];
      return [
        dialogue,
        new Dialogue({
          id: `${ProceduralNPCSystem.buildDialogueId(index)}_role`,
          npcId: ProceduralNPCSystem.buildNPCId(index),
          text: roleText,
          choices: [
            {
              id: `${ProceduralNPCSystem.buildDialogueId(index)}_role_note`,
              label: "Anotar el clima humano del frente",
              effect: {
                type: "ADD_NOTE",
                payload: {
                  text: `Observación del frente: ${roleText}`,
                  relatedEvidenceIds: [],
                },
              },
              closeAfterEffect: true,
            },
            {
              id: `${ProceduralNPCSystem.buildDialogueId(index)}_role_close`,
              label: "Cerrar conversación",
              closeAfterEffect: true,
            },
          ],
        }),
      ];
    });
  }

  static buildRoutine(points) {
    return points.map(([x, y]) => ({ x, y }));
  }

  static buildInitialEntities() {
    const positions = [
      { x: 10, y: 28, routine: ProceduralNPCSystem.buildRoutine([[10, 28], [20, 28], [30, 28], [20, 28]]) },
      { x: 6, y: 31, routine: ProceduralNPCSystem.buildRoutine([[6, 31], [6, 28], [6, 25], [6, 28]]) },
      { x: 18, y: 33, routine: ProceduralNPCSystem.buildRoutine([[18, 33], [34, 33], [52, 33], [34, 33]]) },
      { x: 72, y: 29, routine: ProceduralNPCSystem.buildRoutine([[72, 29], [76, 29], [80, 29], [76, 29]]) },
      { x: 82, y: 30, routine: ProceduralNPCSystem.buildRoutine([[82, 30], [82, 31], [78, 31], [82, 31]]) },
      { x: 79, y: 32, routine: ProceduralNPCSystem.buildRoutine([[79, 32], [84, 32], [84, 30], [79, 30]]) },
      { x: 42, y: 28, routine: ProceduralNPCSystem.buildRoutine([[42, 28], [50, 28], [58, 28], [50, 28]]) },
      { x: 58, y: 26, routine: ProceduralNPCSystem.buildRoutine([[58, 26], [58, 24], [62, 24], [62, 26]]) },
      { x: 28, y: 31, routine: ProceduralNPCSystem.buildRoutine([[28, 31], [32, 31], [32, 32], [28, 32]]) },
      { x: 90, y: 16, routine: ProceduralNPCSystem.buildRoutine([[90, 16], [90, 22], [90, 28], [90, 22]]) },
      { x: 64, y: 24, routine: ProceduralNPCSystem.buildRoutine([[64, 24], [68, 24], [68, 25], [64, 25]]) },
      { x: 14, y: 29, routine: ProceduralNPCSystem.buildRoutine([[14, 29], [14, 30], [18, 30], [18, 29]]) },
      { x: 48, y: 33, routine: ProceduralNPCSystem.buildRoutine([[48, 33], [54, 33], [60, 33], [54, 33]]) },
      { x: 86, y: 28, routine: ProceduralNPCSystem.buildRoutine([[86, 28], [88, 28], [88, 31], [86, 31]]) },
      { x: 34, y: 29, routine: ProceduralNPCSystem.buildRoutine([[34, 29], [38, 29], [42, 29], [38, 29]]) },
      { x: 52, y: 31, routine: ProceduralNPCSystem.buildRoutine([[52, 31], [56, 31], [56, 30], [52, 30]]) },
      { x: 8, y: 24, routine: ProceduralNPCSystem.buildRoutine([[8, 24], [18, 24], [28, 24], [18, 24]]) },
      { x: 88, y: 34, routine: ProceduralNPCSystem.buildRoutine([[88, 34], [78, 34], [68, 34], [78, 34]]) },
    ];

    return positions.map((entry, index) => {
      const profile = ProceduralNPCSystem.getAmbientProfile(index);
      return new MapEntity({
        id: `ent_proc_${String(index).padStart(2, "0")}`,
        type: profile.faction === "medics" ? "ambient_medic" : "ambient_npc",
        label: profile.label,
        x: entry.x,
        y: entry.y,
        char: profile.char,
        linkedId: ProceduralNPCSystem.buildNPCId(index),
        interactionType: "dialogue",
        visible: true,
        procedural: true,
        caseCritical: false,
        alive: true,
        corpse: false,
        wounded: false,
        respawnDay: null,
        routine: entry.routine,
        routineIndex: 0,
        evacDay: null,
        colorClass: profile.colorClass,
      });
    });
  }

  static isProceduralEntity(entity) {
    return Boolean(entity?.procedural || entity?.type === "ambient_npc" || entity?.type === "ambient_medic");
  }

  static isSwappableWithPlayer(entity) {
    return Boolean(
      ProceduralNPCSystem.isProceduralEntity(entity) &&
      entity?.visible !== false &&
      entity?.alive !== false &&
      !entity?.corpse &&
      !entity?.wounded &&
      entity?.interactionType === "dialogue"
    );
  }

  static swapEntityWithPlayerInMaps(asciiMaps = [], currentMapId, entityId, playerPosition) {
    return asciiMaps.map((map) => {
      if (map.id !== currentMapId) return map;
      const nextMap = new AsciiMap(map);
      nextMap.entities = nextMap.entities.map((entity) =>
        entity.id === entityId
          ? new MapEntity({
              ...entity,
              x: playerPosition.x,
              y: playerPosition.y,
            })
          : entity
      );
      return nextMap;
    });
  }

  static isRoutineBlocked(map, entity, target, state) {
    if (!map || !target) return true;
    if (!TileBehaviorSystem.isWalkableTile(map, target.x, target.y)) return true;

    if (
      state?.playerPosition?.x === target.x &&
      state?.playerPosition?.y === target.y
    ) {
      return true;
    }

    const occupyingEntity = map.entities.find(
      (item) =>
        item.visible &&
        item.id !== entity.id &&
        item.x === target.x &&
        item.y === target.y
    );

    return Boolean(occupyingEntity);
  }

  static buildRespawnNPCForEntity(entity, currentDay = 1) {
    const numericId = Number(String(entity.id || "0").replace(/[^0-9]/g, "")) || 0;
    const seed = currentDay * 31 + numericId * 7;
    return ProceduralNPCSystem.buildAmbientNPC(seed, {
      id: entity.linkedId,
    });
  }

  static getRescueBasePosition() {
    return AsciiMapEngine.START_POSITIONS.loc_medical || { x: 80, y: 29 };
  }

  static findRescueSpawnPosition(map, entities = [], playerPosition = null) {
    const base = ProceduralNPCSystem.getRescueBasePosition();
    const candidates = [
      base,
      { x: base.x + 1, y: base.y },
      { x: base.x - 1, y: base.y },
      { x: base.x, y: base.y + 1 },
      { x: base.x, y: base.y - 1 },
      { x: base.x + 2, y: base.y },
      { x: base.x - 2, y: base.y },
      { x: base.x, y: base.y + 2 },
      { x: base.x, y: base.y - 2 },
    ];

    const available = candidates.find((pos) => {
      if (!TileBehaviorSystem.isWalkableTile(map, pos.x, pos.y)) return false;
      if (playerPosition?.x === pos.x && playerPosition?.y === pos.y) return false;
      const occupied = entities.find(
        (item) => item.visible && item.x === pos.x && item.y === pos.y
      );
      return !occupied;
    });

    return available || null;
  }

  static getAdjacentDistance(a, b) {
    if (!a || !b) return Infinity;
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  static isRescueStepAvailable(map, entity, pos, entities = [], playerPosition = null) {
    if (!TileBehaviorSystem.isWalkableTile(map, pos.x, pos.y)) return false;
    if (playerPosition?.x === pos.x && playerPosition?.y === pos.y) return false;

    const occupied = entities.find(
      (item) =>
        item.visible &&
        item.id !== entity.id &&
        item.id !== entity.rescueTargetEntityId &&
        item.carriedBy !== entity.id &&
        item.x === pos.x &&
        item.y === pos.y
    );

    return !occupied;
  }

  static findPathStepToward(map, entity, target, entities = [], playerPosition = null) {
    if (!map || !entity || !target) return null;

    const startKey = `${entity.x},${entity.y}`;
    const visited = new Set([startKey]);
    const queue = [
      {
        x: entity.x,
        y: entity.y,
        firstStep: null,
      },
    ];
    const maxSearchNodes = Math.max(900, map.width * map.height);
    let searchedNodes = 0;

    while (queue.length && searchedNodes < maxSearchNodes) {
      const current = queue.shift();
      searchedNodes += 1;

      if (ProceduralNPCSystem.getAdjacentDistance(current, target) <= 1) {
        return current.firstStep || { x: entity.x, y: entity.y };
      }

      const candidates = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ].sort(
        (a, b) =>
          ProceduralNPCSystem.getAdjacentDistance(a, target) -
          ProceduralNPCSystem.getAdjacentDistance(b, target)
      );

      candidates.forEach((pos) => {
        const key = `${pos.x},${pos.y}`;
        if (visited.has(key)) return;
        if (!ProceduralNPCSystem.isRescueStepAvailable(map, entity, pos, entities, playerPosition)) return;

        visited.add(key);
        queue.push({
          ...pos,
          firstStep: current.firstStep || pos,
        });
      });
    }

    return null;
  }

  static findNearestWalkableAround(map, target, entity, entities = [], playerPosition = null) {
    if (!map || !target) return null;
    const maxRadius = Math.max(map.width, map.height);

    for (let radius = 0; radius <= maxRadius; radius += 1) {
      for (let y = target.y - radius; y <= target.y + radius; y += 1) {
        for (let x = target.x - radius; x <= target.x + radius; x += 1) {
          const pos = { x, y };
          if (
            ProceduralNPCSystem.isRescueStepAvailable(
              map,
              entity,
              pos,
              entities,
              playerPosition
            )
          ) {
            return pos;
          }
        }
      }
    }

    return null;
  }

  static chooseStepToward(map, entity, target, entities = [], playerPosition = null) {
    if (!map || !entity || !target) return { x: entity?.x || 0, y: entity?.y || 0 };

    const pathStep = ProceduralNPCSystem.findPathStepToward(
      map,
      entity,
      target,
      entities,
      playerPosition
    );

    if (pathStep) return pathStep;

    const fallbackTarget = ProceduralNPCSystem.findNearestWalkableAround(
      map,
      target,
      entity,
      entities,
      playerPosition
    );

    if (fallbackTarget) {
      const fallbackStep = ProceduralNPCSystem.findPathStepToward(
        map,
        entity,
        fallbackTarget,
        entities,
        playerPosition
      );
      if (fallbackStep) return fallbackStep;
    }

    return { x: entity.x, y: entity.y, blocked: true };
  }

  static advanceRescueTeams(map, state) {
    if (!map?.entities?.length) return map?.entities || [];

    let entities = map.entities.map((entity) => new MapEntity(entity));
    const rescueBase = ProceduralNPCSystem.getRescueBasePosition();
    const currentDay = state.time?.day || 1;

    const medics = entities.filter(
      (entity) => entity.type === "ambient_medic" && entity.visible !== false
    );

    medics.forEach((medic) => {
      const medicIndex = entities.findIndex((item) => item.id === medic.id);
      if (medicIndex < 0) return;

      let currentMedic = entities[medicIndex];
      const targetIndex = entities.findIndex(
        (item) =>
          item.id === currentMedic.rescueTargetEntityId &&
          item.visible !== false
      );
      const target = targetIndex >= 0 ? entities[targetIndex] : null;

      if (!target) {
        const nextStep = ProceduralNPCSystem.chooseStepToward(
          map,
          currentMedic,
          rescueBase,
          entities,
          state.playerPosition
        );
        currentMedic = new MapEntity({
          ...currentMedic,
          ...nextStep,
          rescueStuckCount: nextStep.blocked
            ? (currentMedic.rescueStuckCount || 0) + 1
            : 0,
        });
        if (
          ProceduralNPCSystem.getAdjacentDistance(currentMedic, rescueBase) <= 1 ||
          currentMedic.rescueStuckCount >= 6
        ) {
          currentMedic = new MapEntity({ ...currentMedic, visible: false, alive: false });
        }
        entities[medicIndex] = currentMedic;
        return;
      }

      if (currentMedic.rescueState === "returning") {
        const previousMedicPosition = { x: currentMedic.x, y: currentMedic.y };
        const nextStep = ProceduralNPCSystem.chooseStepToward(
          map,
          currentMedic,
          rescueBase,
          entities,
          state.playerPosition
        );
        currentMedic = new MapEntity({
          ...currentMedic,
          ...nextStep,
          rescueStuckCount: nextStep.blocked
            ? (currentMedic.rescueStuckCount || 0) + 1
            : 0,
        });

        entities[targetIndex] = new MapEntity({
          ...target,
          x: previousMedicPosition.x,
          y: previousMedicPosition.y,
          carriedBy: currentMedic.id,
          visible: true,
        });

        if (
          ProceduralNPCSystem.getAdjacentDistance(currentMedic, rescueBase) <= 1 ||
          currentMedic.rescueStuckCount >= 8
        ) {
          currentMedic = new MapEntity({ ...currentMedic, visible: false, alive: false });
          entities[targetIndex] = new MapEntity({
            ...entities[targetIndex],
            visible: false,
            alive: false,
            corpse: false,
            wounded: false,
            carriedBy: null,
            respawnDay: entities[targetIndex].respawnDay || currentDay + 2,
          });
        }

        entities[medicIndex] = currentMedic;
        return;
      }

      if (ProceduralNPCSystem.getAdjacentDistance(currentMedic, target) <= 1) {
        currentMedic = new MapEntity({
          ...currentMedic,
          rescueState: "returning",
          rescueStuckCount: 0,
        });
        entities[targetIndex] = new MapEntity({
          ...target,
          carriedBy: currentMedic.id,
        });
        entities[medicIndex] = currentMedic;
        return;
      }

      const nextStep = ProceduralNPCSystem.chooseStepToward(
        map,
        currentMedic,
        target,
        entities,
        state.playerPosition
      );
      entities[medicIndex] = new MapEntity({
        ...currentMedic,
        ...nextStep,
        rescueStuckCount: nextStep.blocked
          ? (currentMedic.rescueStuckCount || 0) + 1
          : 0,
        rescueState: nextStep.blocked && (currentMedic.rescueStuckCount || 0) >= 5
          ? "returning"
          : currentMedic.rescueState,
        rescueTargetEntityId: nextStep.blocked && (currentMedic.rescueStuckCount || 0) >= 5
          ? null
          : currentMedic.rescueTargetEntityId,
      });
    });

    return entities.filter((entity) => {
      if (entity.type === "ambient_medic" && entity.visible === false) return false;
      return true;
    });
  }

  static findSafeRespawnPosition(map, entity, state) {
    const preferred = entity.routine?.[0] || { x: entity.x, y: entity.y };
    if (!map) return preferred;

    const maxRadius = Math.max(map.width, map.height);

    for (let radius = 0; radius <= maxRadius; radius += 1) {
      for (let y = preferred.y - radius; y <= preferred.y + radius; y += 1) {
        for (let x = preferred.x - radius; x <= preferred.x + radius; x += 1) {
          if (!TileBehaviorSystem.isWalkableTile(map, x, y)) continue;
          if (state.playerPosition?.x === x && state.playerPosition?.y === y) continue;

          const occupied = map.entities.find(
            (item) =>
              item.visible &&
              item.id !== entity.id &&
              item.x === x &&
              item.y === y
          );

          if (!occupied) return { x, y };
        }
      }
    }

    return preferred;
  }

  static processCasualtyLifecycle(entity, state, map = null) {
    if (!ProceduralNPCSystem.isProceduralEntity(entity)) {
      return { entity, npcReplacement: null, activityLogEntry: null };
    }

    const currentDay = state.time?.day || 1;

    if (entity.type === "ambient_medic" && entity.evacDay && currentDay >= entity.evacDay) {
      return {
        entity: new MapEntity({
          ...entity,
          visible: false,
          alive: false,
        }),
        npcReplacement: null,
        activityLogEntry: {
          type: "frente vivo",
          severity: "leve",
          text: "Los camilleros se retiran hacia el puesto médico después de evacuar a los heridos.",
        },
      };
    }

    if ((entity.corpse || entity.wounded) && entity.evacDay && currentDay >= entity.evacDay) {
      return {
        entity: new MapEntity({
          ...entity,
          visible: false,
          alive: false,
          corpse: false,
          wounded: false,
          char: "s",
          label: "Soldado evacuado",
          interactionType: "none",
          respawnDay: entity.respawnDay || currentDay + 2,
        }),
        npcReplacement: null,
        activityLogEntry: {
          type: "frente vivo",
          severity: "media",
          text: entity.corpse
            ? "Un cadáver es retirado de la línea antes de que el barro lo cubra por completo."
            : "Un herido es evacuado hacia el puesto médico entre tablas húmedas y órdenes breves.",
        },
      };
    }

    if (entity.visible === false && entity.respawnDay && currentDay >= entity.respawnDay) {
      const npcReplacement = ProceduralNPCSystem.buildRespawnNPCForEntity(entity, currentDay);
      const routineStart = ProceduralNPCSystem.findSafeRespawnPosition(
        map,
        entity,
        state
      );

      return {
        entity: new MapEntity({
          ...entity,
          type: "ambient_npc",
          label: "Soldado del frente",
          x: routineStart.x,
          y: routineStart.y,
          char: "s",
          interactionType: "dialogue",
          visible: true,
          alive: true,
          corpse: false,
          wounded: false,
          respawnDay: null,
          evacDay: null,
          routineIndex: 0,
          colorClass: "text-lime-500",
        }),
        npcReplacement,
        activityLogEntry: {
          type: "frente vivo",
          severity: "leve",
          text: npcReplacement.name + " ocupa ahora un puesto que antes pertenecía a otro soldado.",
        },
      };
    }

    return { entity, npcReplacement: null, activityLogEntry: null };
  }

  static advanceRoutineEntity(map, entity, state) {
    if (!ProceduralNPCSystem.isProceduralEntity(entity)) return entity;
    if (entity.alive === false || entity.corpse || entity.wounded || entity.visible === false) return entity;
    if (!entity.routine?.length) return entity;

    const nextIndex = ((entity.routineIndex || 0) + 1) % entity.routine.length;
    const target = entity.routine[nextIndex];

    if (ProceduralNPCSystem.isRoutineBlocked(map, entity, target, state)) {
      return entity;
    }

    return new MapEntity({
      ...entity,
      x: target.x,
      y: target.y,
      routineIndex: nextIndex,
    });
  }

  static advanceRoutines(state, minutes = 0) {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    if (safeMinutes < 10) {
      const rescueMaps = (state.asciiMaps || []).map((map) => {
        const nextMap = new AsciiMap(map);
        nextMap.entities = ProceduralNPCSystem.advanceRescueTeams(nextMap, state);
        return nextMap;
      });

      return {
        asciiMaps: rescueMaps,
        npcs: state.npcs || [],
        activityLogEntry: null,
        activityLogEntries: [],
      };
    }

    let movedCount = 0;
    const activityLogEntries = [];
    let npcs = [...(state.npcs || [])];

    const asciiMaps = (state.asciiMaps || []).map((map) => {
      const nextMap = new AsciiMap(map);
      nextMap.entities = ProceduralNPCSystem.advanceRescueTeams(nextMap, state);
      nextMap.entities = nextMap.entities.map((entity) => {
        const lifecycleResult = ProceduralNPCSystem.processCasualtyLifecycle(
          entity,
          {
            ...state,
            npcs,
          },
          nextMap
        );

        let nextEntity = lifecycleResult.entity;

        if (lifecycleResult.npcReplacement) {
          npcs = npcs.map((npc) =>
            npc.id === lifecycleResult.npcReplacement.id
              ? lifecycleResult.npcReplacement
              : npc
          );
        }

        if (lifecycleResult.activityLogEntry) {
          activityLogEntries.push(lifecycleResult.activityLogEntry);
        }

        const movedEntity = ProceduralNPCSystem.advanceRoutineEntity(
          nextMap,
          nextEntity,
          state
        );

        if (movedEntity.x !== nextEntity.x || movedEntity.y !== nextEntity.y) {
          movedCount += 1;
        }

        return movedEntity;
      });
      return nextMap;
    });

    if (movedCount > 0) {
      activityLogEntries.push({
        type: "frente vivo",
        severity: "leve",
        text:
          movedCount === 1
            ? "Un soldado se mueve por la trinchera siguiendo su rutina de guardia."
            : movedCount + " soldados se desplazan por la trinchera con movimientos cansados y repetidos.",
      });
    }

    return {
      asciiMaps,
      npcs,
      activityLogEntry: activityLogEntries[0] || null,
      activityLogEntries,
    };
  }
}

// =========================================================
// CARGA MODULAR DE CONTENIDO
// =========================================================
//
// Para agregar casos sin tocar este archivo:
//
// src/data/cases/caso01/
//   case.js        -> export default { ... }
//   evidences.js   -> export default [ ... ]
//   npcs.js        -> export default [ ... ]
//   dialogues.js   -> export default [ ... ]
//   sources.js     -> export default [ ... ]
//
// Cada carpeta puede representar un caso completo. Vite carga
// automáticamente todos esos archivos mediante import.meta.glob(...).
// Si un ID se repite, el contenido modular reemplaza al fallback base.

const contentCaseModules = import.meta.glob([
  "./data/cases/**/case.js",
  "./data/cases/**/case.json",
], {
  eager: true,
});

const contentEvidenceModules = import.meta.glob([
  "./data/cases/**/evidences.js",
  "./data/cases/**/evidences.json",
], {
  eager: true,
});

const contentNpcModules = import.meta.glob([
  "./data/cases/**/npcs.js",
  "./data/cases/**/npcs.json",
], {
  eager: true,
});

const contentDialogueModules = import.meta.glob([
  "./data/cases/**/dialogues.js",
  "./data/cases/**/dialogues.json",
], {
  eager: true,
});

const contentSourceModules = import.meta.glob([
  "./data/cases/**/sources.js",
  "./data/cases/**/sources.json",
], {
  eager: true,
});

const contentEntityModules = import.meta.glob([
  "./data/cases/**/entities.js",
  "./data/cases/**/entities.json",
], {
  eager: true,
});

class ContentPackLoader {
  static POSITION_HINTS = {
    mesa_mando_trinchera: { x: 18, y: 29 },
    mesa_hospital: { x: 78, y: 30 },
    cadaver_fotografo: { x: 48, y: 12 },
    litera_soldado: { x: 22, y: 30 },
    oficial_mando: { x: 16, y: 29 },
    superviviente_trinchera: { x: 26, y: 30 },
    medica_hospital: { x: 76, y: 30 },
  };

  static LOCATION_FALLBACK_POSITIONS = {
    loc_trench: [
      { x: 18, y: 29 },
      { x: 22, y: 30 },
      { x: 26, y: 30 },
      { x: 30, y: 29 },
    ],
    loc_command: [
      { x: 13, y: 29 },
      { x: 16, y: 29 },
      { x: 15, y: 27 },
    ],
    loc_medical: [
      { x: 78, y: 30 },
      { x: 76, y: 30 },
      { x: 80, y: 29 },
    ],
    loc_no_mans_land: [
      { x: 48, y: 12 },
      { x: 52, y: 13 },
      { x: 44, y: 13 },
    ],
  };

  static normalizeModuleDefault(moduleValue) {
    const value = moduleValue?.default ?? moduleValue;
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  static flattenModules(modules = {}) {
    return Object.values(modules).flatMap((moduleValue) =>
      ContentPackLoader.normalizeModuleDefault(moduleValue)
    );
  }

  static mergeById(fallbackItems = [], modularItems = []) {
    const registry = new Map();

    fallbackItems.forEach((item) => {
      if (item?.id) registry.set(item.id, item);
    });

    modularItems.forEach((item) => {
      if (item?.id) registry.set(item.id, item);
    });

    return [...registry.values()];
  }

  static findCaseIdForLinkedId(linkedId, cases = []) {
    if (!linkedId) return null;

    const ownerCase = cases.find((caseFile) =>
      caseFile.evidenceIds?.includes(linkedId) ||
      caseFile.npcIds?.includes(linkedId) ||
      caseFile.dialogueIds?.includes(linkedId)
    );

    return ownerCase?.id || null;
  }

  static getPositionForEntity(entity = {}, index = 0) {
    if (Number.isFinite(Number(entity.x)) && Number.isFinite(Number(entity.y))) {
      return {
        x: Number(entity.x),
        y: Number(entity.y),
      };
    }

    if (entity.positionHint && ContentPackLoader.POSITION_HINTS[entity.positionHint]) {
      return ContentPackLoader.POSITION_HINTS[entity.positionHint];
    }

    const locationId = entity.locationId || "loc_trench";
    const fallbackPositions =
      ContentPackLoader.LOCATION_FALLBACK_POSITIONS[locationId] ||
      ContentPackLoader.LOCATION_FALLBACK_POSITIONS.loc_trench;

    return fallbackPositions[index % fallbackPositions.length];
  }

  static inferNpcLocation(npc = {}) {
    const text = `${npc.id || ""} ${npc.role || ""} ${npc.faction || ""}`.toLowerCase();

    if (text.includes("officer") || text.includes("oficial") || text.includes("capit")) {
      return "loc_command";
    }

    if (text.includes("medic") || text.includes("médic") || text.includes("hospital") || text.includes("sanit")) {
      return "loc_medical";
    }

    return "loc_trench";
  }

  static inferNpcPositionHint(npc = {}) {
    const text = `${npc.id || ""} ${npc.role || ""} ${npc.faction || ""}`.toLowerCase();

    if (text.includes("officer") || text.includes("oficial") || text.includes("capit")) {
      return "oficial_mando";
    }

    if (text.includes("medic") || text.includes("médic") || text.includes("hospital") || text.includes("sanit")) {
      return "medica_hospital";
    }

    return "superviviente_trinchera";
  }

  static normalizeMapEntity(entity = {}, index = 0, cases = []) {
    const linkedId = entity.linkedId || entity.evidenceId || entity.npcId || null;
    const type = entity.type || (entity.evidenceId ? "evidence" : entity.npcId ? "npc" : "object");
    const position = ContentPackLoader.getPositionForEntity(entity, index);
    const requiredCaseId = entity.requiredCaseId || ContentPackLoader.findCaseIdForLinkedId(linkedId, cases);

    return {
      ...entity,
      id: entity.id || `ent_${linkedId || index}`,
      type,
      label: entity.label || entity.name || (type === "evidence" ? "Evidencia" : "Testigo"),
      x: position.x,
      y: position.y,
      char: entity.char || (type === "evidence" ? "?" : "S"),
      linkedId,
      interactionType:
        entity.interactionType ||
        (type === "evidence" ? "evidence" : type === "npc" || type === "ambient_npc" ? "dialogue" : "none"),
      visible: entity.visible ?? true,
      procedural: entity.procedural ?? false,
      caseCritical: entity.caseCritical ?? true,
      requiredCaseId,
      colorClass:
        entity.colorClass ||
        (type === "evidence" ? "text-yellow-200" : "text-green-400"),
    };
  }

  static buildMissingNpcEntities(npcs = [], existingEntities = [], cases = []) {
    const linkedEntityIds = new Set(
      existingEntities
        .map((entity) => entity.linkedId || entity.npcId || entity.evidenceId)
        .filter(Boolean)
    );

    return npcs
      .filter((npc) => npc?.id && !linkedEntityIds.has(npc.id))
      .map((npc, index) =>
        ContentPackLoader.normalizeMapEntity(
          {
            id: `ent_${npc.id}`,
            type: "npc",
            npcId: npc.id,
            label: npc.name,
            description: npc.description,
            locationId: npc.locationId || ContentPackLoader.inferNpcLocation(npc),
            positionHint: npc.positionHint || ContentPackLoader.inferNpcPositionHint(npc),
            visible: true,
            interactable: true,
          },
          index,
          cases
        )
      );
  }
}

// =========================================================
// CATÁLOGOS BASE / FALLBACK
// =========================================================

const fallbackCaseCatalog = [];

const fallbackHistoricalSourceCatalog = [];

const fallbackEvidenceCatalog = [];

const fallbackNpcCatalog = [];

const fallbackDialogueCatalog = [];

const modularCaseCatalog = ContentPackLoader.flattenModules(contentCaseModules);
const modularHistoricalSourceCatalog = ContentPackLoader.flattenModules(contentSourceModules);
const modularEvidenceCatalog = ContentPackLoader.flattenModules(contentEvidenceModules);
const modularNpcCatalog = ContentPackLoader.flattenModules(contentNpcModules);
const modularDialogueCatalog = ContentPackLoader.flattenModules(contentDialogueModules);
const modularEntityCatalog = ContentPackLoader.flattenModules(contentEntityModules);

const caseCatalog = ContentPackLoader.mergeById(
  fallbackCaseCatalog,
  modularCaseCatalog
);

const historicalSourceCatalog = ContentPackLoader.mergeById(
  fallbackHistoricalSourceCatalog,
  modularHistoricalSourceCatalog
);

const evidenceCatalog = ContentPackLoader.mergeById(
  fallbackEvidenceCatalog,
  modularEvidenceCatalog
);

const npcCatalog = ContentPackLoader.mergeById(
  fallbackNpcCatalog,
  modularNpcCatalog
);

const dialogueCatalog = ContentPackLoader.mergeById(
  fallbackDialogueCatalog,
  modularDialogueCatalog
);

const rawEntityCatalog = ContentPackLoader.mergeById([], modularEntityCatalog);
const normalizedEntityCatalog = rawEntityCatalog.map((entity, index) =>
  ContentPackLoader.normalizeMapEntity(entity, index, caseCatalog)
);
const generatedNpcEntityCatalog = ContentPackLoader.buildMissingNpcEntities(
  npcCatalog,
  normalizedEntityCatalog,
  caseCatalog
);
const entityCatalog = ContentPackLoader.mergeById(
  normalizedEntityCatalog,
  generatedNpcEntityCatalog
);

const campaignConfig = {
  id: "campaign_somme_intro",
  title: "La Batalla de Somme",
  startingCaseId: null,
  startingEvidenceIds: [],
  startingNote: null,
};

class CampaignBuilder {
  static buildCases() {
    return caseCatalog.map((caseFile) => {
      const normalizedCase = { ...caseFile };

      // Los módulos externos de casos pueden venir marcados como "active" para pruebas.
      // En el juego final no deben aparecer activados automáticamente: primero deben
      // mostrarse en el cuaderno como "Caso disponible" con botón de activación.
      if (
        normalizedCase.status === "active" &&
        normalizedCase.id !== campaignConfig.startingCaseId
      ) {
        normalizedCase.status = "available";
      }

      return new CaseFile(normalizedCase);
    });
  }

  static buildSources() {
    return historicalSourceCatalog.map((source) => new HistoricalSource(source));
  }

  static buildEvidence() {
    return evidenceCatalog.map((evidence) => new Evidence(evidence));
  }

  static buildNPCs() {
    return [
      ...npcCatalog.map((npc) => new NPC(npc)),
      ...ProceduralNPCSystem.buildAmbientNPCs(18),
    ];
  }

  static buildDialogues() {
    return [
      ...dialogueCatalog.map((dialogue) => new Dialogue(dialogue)),
      ...ProceduralNPCSystem.buildAmbientDialogues(18),
    ];
  }

  static buildInitialNotebook() {
    const notebook = new Notebook();
    const silentAddEvidence = (evidence) => {
      const alreadyExists = notebook.evidences.some((item) => item.id === evidence.id);
      if (!alreadyExists) notebook.evidences.push(evidence);
    };
    const startingCase = CampaignBuilder.buildCases().find(
      (caseFile) => caseFile.id === campaignConfig.startingCaseId
    );

    if (startingCase) {
      notebook.setActiveCase(startingCase);
    }

    const evidence = CampaignBuilder.buildEvidence();
    campaignConfig.startingEvidenceIds.forEach((evidenceId) => {
      const foundEvidence = evidence.find((item) => item.id === evidenceId);
      if (foundEvidence) silentAddEvidence(foundEvidence);
    });

    if (campaignConfig.startingNote) {
      notebook.addNote(new Note(campaignConfig.startingNote));
    }

    return notebook;
  }
}

// =========================================================
// DATOS INICIALES
// =========================================================

const initialCase = caseCatalog[0] ? new CaseFile(caseCatalog[0]) : null;

const initialHistoricalSources = CampaignBuilder.buildSources();

const initialSourceLibrary = new SourceLibrary(initialHistoricalSources);

const initialEvidence = CampaignBuilder.buildEvidence();

const initialNotebook = CampaignBuilder.buildInitialNotebook();

const initialAsciiMaps = [
  new AsciiMap({
    id: "map_somme_front_large",
    locationId: "loc_trench",
    name: "Frente del Somme - Mapa grande ASCII 96x40",
    layout: [
      "################################################################################################",
      "#.............................................~~~~~............................................#",
      "#......................^^^^^^^.............~~~...~~~.............^^^^^^^.......................#",
      "#..............~~~~....^.....^.............~~.....~~.............^.....^....~~~~...............#",
      "#......................^.....^.................................^.....^.........................#",
      "#.........^^^^^^^......^^^^+^^.............~~~~~~~.............^^+^^^^......^^^^^^^............#",
      "#.........^.....^..........................~~~~~~~..........................^.....^............#",
      "#.........^.....^............~~~~~.......................~~~~~............^.....^..............#",
      "#.........^^+^^^^.........................................................^^^^+^^..............#",
      "#..............................................................................................#",
      "#....................^^^^^^^.................~~~~~.................^^^^^^^.....................#",
      "#....................^.....^...............~~~...~~~...............^.....^.....................#",
      "#....................^^+^^^^.......................................^^^^+^^.....................#",
      "#..............................................................................................#",
      "#^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^+^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^+^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^#",
      "#..............................+..............................+...............................#",
      "#..............................+...........~~~~~....~~~~......+...............................#",
      "#..............................+..............................+...............................#",
      "#............~~~~~~~...........+...........~~~~~~~............+...........~~~~~~~.............#",
      "#..............................+..............................+...............................#",
      "#..............................+..............................+...............................#",
      "#..#############################+###############################+############################..#",
      "#..#===========================#+#=============================#+#==========================#..#",
      "#..#===========================#.#=============================#.#==========================#..#",
      "#..#======###########==========#+#==========###########========#+#==========###########=====#..#",
      "#..#======###########======================#=============#=================###########=====#..#",
      "#..#======###########==========#+#==========###########========#+#==========###########=====#..#",
      "#..#===========================#.#=============================#.#==========================#..#",
      "#..###########++################+###############++##############+################++#########..#",
      "#.............++................................++..............................++...........#",
      "#.............++................................++..............................++...........#",
      "#..############+###############################+###############################+##########...#",
      "#..#============#=============================#===============================#==========#...#",
      "#..#============#=============================#===============================#==========#...#",
      "#..#============###########===================###########=====================#==========#...#",
      "#..#======================#=============================#=====================#==========#...#",
      "#..#########+##############=============================###############+#################...#",
      "#............=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.=.....................#",
      "#..............................................................................................#",
      "################################################################################################",
    ],
    entities: [
      ...ProceduralNPCSystem.buildInitialEntities(),
      ...entityCatalog.map((entity) =>
        new MapEntity({
          ...entity,
          procedural: entity.procedural ?? false,
          caseCritical: entity.caseCritical ?? true,
        })
      ),
    ],
  }),
];

const initialLocations = [
  new Location({
    id: "loc_trench",
    name: "Trinchera principal",
    description:
      "Una línea irregular de barro, madera húmeda y sacos de arena. El olor a humo permanece suspendido en el aire.",
    atmosphere:
      "La lluvia golpea las tablas mientras voces cansadas intentan ignorar la artillería distante.",
    connectedLocations: ["loc_medical", "loc_command", "loc_no_mans_land"],
    stressLevel: 4,
    npcIds: [],
    evidenceIds: [],
    events: [
      {
        id: "event_artillery_echo",
        title: "Eco de artillería",
        text:
          "Cada explosión hace vibrar la tierra bajo las botas. Algunos soldados dejan de hablar por unos segundos.",
        stressChange: 2,
        traumaType: "bombardment",
      },
    ],
  }),

  new Location({
    id: "loc_medical",
    name: "Puesto médico",
    description:
      "Un refugio improvisado iluminado por lámparas débiles y cubierto de vendas manchadas.",
    atmosphere:
      "El aire huele a humedad, alcohol y agotamiento humano.",
    connectedLocations: ["loc_trench"],
    stressLevel: 2,
    npcIds: [],
    evidenceIds: [],
    events: [
      {
        id: "event_wounded_whispers",
        title: "Susurros de heridos",
        text:
          "Un herido murmura nombres que nadie responde.",
        stressChange: 1,
        traumaType: "wounded",
      },
    ],
  }),

  new Location({
    id: "loc_command",
    name: "Puesto de mando",
    description:
      "Un espacio más seco y organizado, lleno de mapas, órdenes y humo de cigarrillo.",
    atmosphere:
      "Los oficiales hablan de avances con una calma que contrasta con el frente.",
    connectedLocations: ["loc_trench"],
    stressLevel: 1,
    npcIds: [],
    evidenceIds: [],
    events: [],
  }),

  new Location({
    id: "loc_no_mans_land",
    name: "Tierra de nadie",
    description:
      "Un territorio devastado entre trincheras. Barro, cráteres y restos humanos se mezclan bajo la niebla.",
    atmosphere:
      "El silencio parece más peligroso que las explosiones.",
    connectedLocations: ["loc_trench"],
    stressLevel: 8,
    npcIds: [],
    evidenceIds: [],
    events: [
      {
        id: "event_distant_body",
        title: "Cuerpo abandonado",
        text:
          "Entre la niebla aparece un cuerpo parcialmente cubierto por barro y alambre roto.",
        stressChange: 5,
        traumaType: "corpses",
      },
    ],
  }),
];

const initialNPCs = CampaignBuilder.buildNPCs();

const initialDialogues = CampaignBuilder.buildDialogues();

const initialTimeState = {
  day: 1,
  hour: 5,
  minute: 40,
  weather: "Lluvia intensa",
};

const initialInspectionState = {
  isOpen: false,
  evidenceId: null,
  sourceId: null,
  notes: [],
};

const initialDialogueModalState = {
  isOpen: false,
  npcId: null,
  dialogueId: null,
};

const initialContradictionModalState = {
  isOpen: false,
  contradictionId: null,
};

function queueOrOpenContradictionModal(state, createdContradictions = []) {
  const contradiction = createdContradictions[0];
  if (!contradiction) {
    return {
      contradictionModal: state.contradictionModal,
      pendingContradictionModal: state.pendingContradictionModal || null,
    };
  }

  const modalPayload = {
    isOpen: true,
    contradictionId: contradiction.id,
  };

  const hasPriorityWindowOpen =
    state.evidenceInspection?.isOpen ||
    state.dialogueModal?.isOpen;

  if (hasPriorityWindowOpen) {
    return {
      contradictionModal: state.contradictionModal,
      pendingContradictionModal: modalPayload,
    };
  }

  return {
    contradictionModal: modalPayload,
    pendingContradictionModal: null,
  };
}

function openPendingContradictionIfAny(state) {
  if (!state.pendingContradictionModal?.contradictionId) {
    return {
      contradictionModal: state.contradictionModal,
      pendingContradictionModal: null,
    };
  }

  return {
    contradictionModal: state.pendingContradictionModal,
    pendingContradictionModal: null,
  };
}

const initialWorldState = new WorldState();
const initialFactionMemory = {
  ...FactionMemorySystem.DEFAULT_FACTIONS,
};

const initialBombardmentEffect = {
  active: false,
  message: "",
  intensity: "lejano",
  shakeMs: 0,
  startedAt: 0,
  impact: null,
};

const initialCaseClosureModal = {
  isOpen: false,
  caseId: null,
  caseTitle: "",
  articleTitle: "",
  articleTone: "",
  resultTitle: "Caso cerrado",
  summary: "",
  consequences: [],
};

const initialCases = CampaignBuilder.buildCases();

const initialState = {
  lastTimelineUpdateDay: 1,
  screen: "MENU",
  player: new Player(),
  time: initialTimeState,
  notebook: initialNotebook,
  worldState: initialWorldState,
  factionMemory: initialFactionMemory,
  persistentConsequences: [],
  narrativeFlags: {},
  cases: initialCases,
  evidenceDatabase: initialEvidence,
  sourceLibrary: initialSourceLibrary,
  asciiMaps: initialAsciiMaps,
  playerPosition: { x: 12, y: 29 },
  locations: initialLocations,
  currentLocationId: "loc_trench",
  npcs: initialNPCs,
  dialogues: initialDialogues,
  flags: {},
  evidenceInspection: initialInspectionState,
  dialogueModal: initialDialogueModalState,
  contradictionModal: initialContradictionModalState,
  pendingContradictionModal: null,
  bombardmentEffect: initialBombardmentEffect,
  lastObservationSignature: null,
  notebookOpen: false,
  caseClosureModal: initialCaseClosureModal,
  visualSettings: VisualSettingsSystem.DEFAULT,
};

// =========================================================
// GAME CONTEXT + REDUCER
// =========================================================

const GameContext = createContext(null);

function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const ACTIONS = {
  TOGGLE_NOTEBOOK: "TOGGLE_NOTEBOOK",
  OPEN_EVIDENCE_INSPECTION: "OPEN_EVIDENCE_INSPECTION",
  CLOSE_EVIDENCE_INSPECTION: "CLOSE_EVIDENCE_INSPECTION",
  OPEN_DIALOGUE_MODAL: "OPEN_DIALOGUE_MODAL",
  CLOSE_DIALOGUE_MODAL: "CLOSE_DIALOGUE_MODAL",
  SET_DIALOGUE_MODAL_DIALOGUE: "SET_DIALOGUE_MODAL_DIALOGUE",
  SELECT_DIALOGUE_CHOICE: "SELECT_DIALOGUE_CHOICE",
  CLOSE_CONTRADICTION_MODAL: "CLOSE_CONTRADICTION_MODAL",
  GO_TO_SCREEN: "GO_TO_SCREEN",
  CREATE_PLAYER: "CREATE_PLAYER",
  ADD_EVIDENCE: "ADD_EVIDENCE",
  APPLY_SOURCE_FLAG: "APPLY_SOURCE_FLAG",
  ADD_NOTE: "ADD_NOTE",
  ADD_CONTRADICTION: "ADD_CONTRADICTION",
  ADD_HYPOTHESIS: "ADD_HYPOTHESIS",
  ADD_SUPPORTING_EVIDENCE_TO_HYPOTHESIS: "ADD_SUPPORTING_EVIDENCE_TO_HYPOTHESIS",
  ADD_OPPOSING_EVIDENCE_TO_HYPOTHESIS: "ADD_OPPOSING_EVIDENCE_TO_HYPOTHESIS",
  ADD_ARTICLE: "ADD_ARTICLE",
  ADD_RECONSTRUCTION: "ADD_RECONSTRUCTION",
  CHANGE_STRESS: "CHANGE_STRESS",
  REST_IN_SAFE_ZONE: "REST_IN_SAFE_ZONE",
  TALK_TO_MEDICAL_STAFF: "TALK_TO_MEDICAL_STAFF",
  WRITE_PERSONAL_NOTE: "WRITE_PERSONAL_NOTE",
  SLEEP_FOR_HOURS: "SLEEP_FOR_HOURS",
  USE_CIVILIAN_SHELTER: "USE_CIVILIAN_SHELTER",
  USE_MEDICAL_PROTECTION: "USE_MEDICAL_PROTECTION",
  REGISTER_TRAUMATIC_EXPOSURE: "REGISTER_TRAUMATIC_EXPOSURE",
  CHANGE_WORLD_STATE: "CHANGE_WORLD_STATE",
  CHANGE_FACTION_MEMORY: "CHANGE_FACTION_MEMORY",
  CHANGE_REPUTATION: "CHANGE_REPUTATION",
  APPLY_ARTICLE_CONSEQUENCES: "APPLY_ARTICLE_CONSEQUENCES",
  APPLY_RECONSTRUCTION_CONSEQUENCES: "APPLY_RECONSTRUCTION_CONSEQUENCES",
  REVIEW_ARTICLE_FOR_CENSORSHIP: "REVIEW_ARTICLE_FOR_CENSORSHIP",
  FORCE_PUBLISH_ARTICLE: "FORCE_PUBLISH_ARTICLE",
  SOFTEN_ARTICLE: "SOFTEN_ARTICLE",
  SET_FLAG: "SET_FLAG",
  MOVE_TO_LOCATION: "MOVE_TO_LOCATION",
  ADVANCE_TIME: "ADVANCE_TIME",
  TRIGGER_BOMBARDMENT: "TRIGGER_BOMBARDMENT",
  CLEAR_BOMBARDMENT_EFFECT: "CLEAR_BOMBARDMENT_EFFECT",
  CLOSE_CASE_CLOSURE_MODAL: "CLOSE_CASE_CLOSURE_MODAL",
  SAVE_GAME: "SAVE_GAME",
  LOAD_GAME: "LOAD_GAME",
  CLEAR_SAVE: "CLEAR_SAVE",
  MOVE_PLAYER_ON_ASCII_MAP: "MOVE_PLAYER_ON_ASCII_MAP",
  INTERACT_ASCII_ENTITY: "INTERACT_ASCII_ENTITY",
  SET_ACTIVE_CASE: "SET_ACTIVE_CASE",
  SET_RENDER_MODE: "SET_RENDER_MODE",
  TOGGLE_AUDIO: "TOGGLE_AUDIO",
};

function cloneNotebook(notebook) {
  const cloned = new Notebook();
  cloned.activeCase = notebook.activeCase;
  cloned.evidences = [...notebook.evidences];
  cloned.notes = [...notebook.notes];
  cloned.caseEvents = [...(notebook.caseEvents || [])].slice(-Notebook.MAX_CASE_EVENTS);
  cloned.activityLog = [...(notebook.activityLog || [])].slice(-Notebook.MAX_ACTIVITY_LOG);
  cloned.contradictions = [...notebook.contradictions];
  cloned.hypotheses = [...notebook.hypotheses];
  cloned.articles = [...notebook.articles];
  cloned.reconstructions = [...(notebook.reconstructions || [])];
  cloned.consequenceLog = [...(notebook.consequenceLog || [])].slice(
    -Notebook.MAX_CONSEQUENCE_LOG
  );
  cloned.archivedCases = [...(notebook.archivedCases || [])].slice(
    -Notebook.MAX_ARCHIVED_CASES
  );
  cloned.caseArchive = [...(notebook.caseArchive || [])].slice(
    -Notebook.MAX_CASE_ARCHIVE
  );
  return cloned;
}

function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.TOGGLE_NOTEBOOK: {
      return {
        ...state,
        notebookOpen: action.payload ?? !state.notebookOpen,
      };
    }

    case ACTIONS.SET_RENDER_MODE: {
      const currentSettings = VisualSettingsSystem.normalize(state.visualSettings);
      const renderMode = "sprites";

      return {
        ...state,
        visualSettings: VisualSettingsSystem.normalize({ ...currentSettings, renderMode }),
        lastMapMessage: `Modo visual: ${VisualSettingsSystem.getRenderModeLabel(renderMode)}.`,
      };
    }

    case ACTIONS.TOGGLE_AUDIO: {
      const currentSettings = VisualSettingsSystem.normalize(state.visualSettings);
      return {
        ...state,
        visualSettings: VisualSettingsSystem.normalize({
          ...currentSettings,
          audioEnabled: !currentSettings.audioEnabled,
        }),
        lastMapMessage: !currentSettings.audioEnabled
          ? "Sonido activado. Si el navegador lo permite, los eventos podrán reproducir audio."
          : "Sonido desactivado.",
      };
    }

    case ACTIONS.OPEN_EVIDENCE_INSPECTION: {
      const evidenceId = action.payload?.evidenceId;
      if (!evidenceId) return state;

      const inspection = EvidenceInspectionSystem.openEvidence(state, evidenceId);
      if (!inspection) return state;

      const consumesTime = action.payload?.consumeTime !== false;
      const inspectionMinutes = action.payload?.minutes ?? 5;

      const flowChanges = consumesTime
        ? GameFlowSystem.advanceTimeWithAmbientEvents(state, inspectionMinutes)
        : {};

      return {
        ...state,
        ...flowChanges,
        evidenceInspection: {
          isOpen: true,
          evidenceId,
          sourceId: inspection.source?.id || null,
          notes: EvidenceInspectionSystem.buildInspectionNotes(inspection.evidence),
        },
      };
    }

    case ACTIONS.CLOSE_EVIDENCE_INSPECTION: {
      const pendingContradiction = openPendingContradictionIfAny(state);
      return {
        ...state,
        evidenceInspection: initialInspectionState,
        ...pendingContradiction,
      };
    }

    case ACTIONS.OPEN_DIALOGUE_MODAL:
      return {
        ...state,
        dialogueModal: {
          isOpen: true,
          npcId: action.payload?.npcId || null,
          dialogueId: action.payload?.dialogueId || null,
        },
      };

    case ACTIONS.SET_DIALOGUE_MODAL_DIALOGUE:
      return {
        ...state,
        dialogueModal: {
          ...state.dialogueModal,
          dialogueId: action.payload?.dialogueId || null,
        },
      };

    case ACTIONS.SELECT_DIALOGUE_CHOICE: {
      if (!state.dialogueModal?.isOpen) return state;

      const dialogue = state.dialogues.find(
        (item) => item.id === state.dialogueModal.dialogueId
      );
      if (!dialogue) return state;

      const choice = (dialogue.choices || []).find(
        (item) => item.id === action.payload?.choiceId
      );
      if (!choice || !DialogueConditionSystem.all(choice.conditions || [], state)) {
        return state;
      }

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(state, 12);
      let nextState = {
        ...state,
        ...flowChanges,
        notebook: flowChanges.notebook || state.notebook,
      };

      const effects = [
        ...(choice.effect ? [choice.effect] : []),
        ...(Array.isArray(choice.effects) ? choice.effects : []),
      ];

      effects.forEach((effect) => {
        if (!effect) return;

        if (effect.type === "ADD_NOTE") {
          const notebook = cloneNotebook(nextState.notebook);
          notebook.addNote(
            new Note({
              id: createId("note"),
              text: effect.payload?.text || "Testimonio registrado.",
              relatedEvidenceIds: effect.payload?.relatedEvidenceIds || [],
              tags: effect.payload?.tags || [],
            })
          );

          const contradictionScan = AutomaticContradictionSystem.apply(
            notebook,
            nextState.notebook.activeCase
          );
          const contradictionModalUpdate = queueOrOpenContradictionModal(
            {
              ...nextState,
              notebook: contradictionScan.notebook,
              dialogueModal: {
                ...nextState.dialogueModal,
                isOpen: true,
              },
            },
            contradictionScan.createdContradictions
          );

          nextState = {
            ...nextState,
            notebook: contradictionScan.notebook,
            ...contradictionModalUpdate,
          };
          return;
        }

        if (effect.type === "ADD_CONTRADICTION") {
          const notebook = cloneNotebook(nextState.notebook);
          const contradiction = new Contradiction({
            id: effect.payload?.id || createId("contr_dialogue"),
            title: effect.payload?.title || "Contradicción detectada en testimonio",
            description:
              effect.payload?.description ||
              "El testimonio introduce una tensión con fuentes ya reunidas.",
            evidenceIds: effect.payload?.evidenceIds || [],
            severity: effect.payload?.severity || "media",
          });

          notebook.addContradiction(contradiction);

          const hypothesisImpact = ContradictionImpactSystem.applyContradictionToHypotheses(
            notebook,
            contradiction
          );
          const reconstructionImpact = ReconstructionInstabilitySystem.applyContradictionsToReconstructions(
            hypothesisImpact.notebook,
            contradiction
          );
          const repairedNotebook = NotebookIntegritySystem.repairIfNeeded(
            reconstructionImpact.notebook,
            "contradiction_changed"
          );

          repairedNotebook.addCaseEvent({
            type: "dialogue_contradiction_impact",
            title: contradiction.title,
            severity: contradiction.severity || "media",
            text: ContradictionImpactSystem.buildNarrativeFeedback(
              contradiction,
              hypothesisImpact.affectedHypothesisIds
            ),
            relatedEvidenceIds: contradiction.evidenceIds || [],
          });

          const contradictionModalUpdate = queueOrOpenContradictionModal(
            {
              ...nextState,
              notebook: repairedNotebook,
              dialogueModal: {
                ...nextState.dialogueModal,
                isOpen: true,
              },
            },
            [contradiction]
          );

          nextState = {
            ...nextState,
            notebook: repairedNotebook,
            ...contradictionModalUpdate,
            lastMapMessage: "Una contradicción altera la lectura del caso.",
          };
          return;
        }

        if (effect.type === "STRESS") {
          const stressAmount = typeof effect.payload === "object"
            ? Number(effect.payload?.amount ?? effect.payload?.value ?? 0)
            : Number(effect.payload ?? 0);
          const stressResult = NarrativeStressSystem.applyStress({
            player: nextState.player,
            notebook: nextState.notebook,
            amount: stressAmount,
            reason: effect.payload?.reason || "traumatic_exposure",
            eventType: effect.payload?.eventType || "screams",
          });

          nextState = {
            ...nextState,
            player: stressResult.player,
            notebook: stressResult.notebook,
          };
          return;
        }

        if (effect.type === "REPUTATION") {
          const player = new Player(nextState.player);
          const faction = effect.payload?.faction;
          const amount = Number(effect.payload?.amount || 0);

          if (faction && player.reputation[faction] !== undefined) {
            player.reputation[faction] += amount;
          }

          nextState = {
            ...nextState,
            player,
          };
          return;
        }

        if (effect.type === "FACTION_MEMORY") {
          const faction = effect.payload?.faction || effect.payload?.key;
          const amount = Number(effect.payload?.amount || effect.payload?.value || 0);
          if (!faction) return;

          nextState = {
            ...nextState,
            factionMemory: FactionMemorySystem.applyChanges(nextState.factionMemory, {
              [faction]: amount,
            }),
          };
          return;
        }

        if (effect.type === "SET_FLAG") {
          const flagKey = effect.payload?.key || effect.payload?.flag || effect.payload?.id;
          if (!flagKey) return;

          nextState = {
            ...nextState,
            flags: {
              ...nextState.flags,
              [flagKey]: effect.payload?.value ?? true,
            },
          };
        }
      });

      if (choice.nextDialogueId) {
        const nextDialogue = nextState.dialogues.find(
          (item) => item.id === choice.nextDialogueId
        );

        if (nextDialogue && nextDialogue.isAvailable(nextState)) {
          return {
            ...nextState,
            dialogueModal: {
              ...nextState.dialogueModal,
              dialogueId: choice.nextDialogueId,
            },
          };
        }

        return {
          ...nextState,
          dialogueModal: initialDialogueModalState,
          lastMapMessage: "La conversación no pudo continuar: faltan condiciones para esa rama.",
          ...openPendingContradictionIfAny({
            ...nextState,
            dialogueModal: initialDialogueModalState,
          }),
        };
      }

      const shouldCloseDialogue =
        choice.closeAfterEffect === true ||
        (!choice.nextDialogueId && (!choice.effect || choice.closeAfterEffect));

      if (shouldCloseDialogue) {
        const closedState = {
          ...nextState,
          dialogueModal: initialDialogueModalState,
        };
        const pendingContradiction = openPendingContradictionIfAny(closedState);
        return {
          ...closedState,
          ...pendingContradiction,
        };
      }

      return nextState;
    }

    case ACTIONS.CLOSE_DIALOGUE_MODAL: {
      const pendingContradiction = openPendingContradictionIfAny(state);
      return {
        ...state,
        dialogueModal: initialDialogueModalState,
        ...pendingContradiction,
      };
    }

    case ACTIONS.CLOSE_CONTRADICTION_MODAL:
      return {
        ...state,
        contradictionModal: initialContradictionModalState,
      };

    case ACTIONS.CLOSE_CASE_CLOSURE_MODAL:
      return {
        ...state,
        caseClosureModal: initialCaseClosureModal,
      };

    case ACTIONS.GO_TO_SCREEN: {
      return { ...state, screen: action.payload };
    }

    case ACTIONS.CREATE_PLAYER: {
      const player = new Player(action.payload);
      const currentLocationId = MapZoneSystem.getLocationIdAtPosition(
        state.playerPosition,
        state.currentLocationId
      );

      return {
        ...state,
        player,
        currentLocationId,
        screen: "GAMEPLAY",
        notebookOpen: false,
        evidenceInspection: initialInspectionState,
        dialogueModal: initialDialogueModalState,
        contradictionModal: initialContradictionModalState,
        pendingContradictionModal: null,
        lastMapMessage: "Credencial autorizada. El corresponsal entra al frente del Somme.",
      };
    }

    case ACTIONS.ADD_EVIDENCE: {
      const notebook = cloneNotebook(state.notebook);
      const evidence = new Evidence({ ...action.payload, discovered: true });
      notebook.addEvidence(evidence);

      const alreadyHasAutoHypothesis = (notebook.hypotheses || []).some((hypothesis) =>
        hypothesis.tags?.includes("auto_generated")
      );
      const autoHypothesis = AutoWritingSystem.buildHypothesisFromNotebook(notebook);

      if (autoHypothesis && !alreadyHasAutoHypothesis) {
        notebook.addHypothesis(autoHypothesis);
        notebook.addCaseEvent({
          type: "investigation_progress",
          title: "Hipótesis inicial generada",
          severity: "leve",
          text: "El cuaderno formuló una primera hipótesis a partir de la evidencia encontrada. Todavía debe contrastarse con nuevas fuentes.",
        });
      }

      const contradictionScan = AutomaticContradictionSystem.apply(
        notebook,
        state.notebook.activeCase
      );
      const contradictionModalUpdate = queueOrOpenContradictionModal(
        state,
        contradictionScan.createdContradictions
      );

      return {
        ...state,
        notebook: contradictionScan.notebook,
        ...contradictionModalUpdate,
        lastMapMessage: contradictionScan.createdContradictions.length > 0
          ? "El cuaderno detectó una contradicción automática entre fuentes."
          : autoHypothesis && !alreadyHasAutoHypothesis
            ? "La evidencia permitió formular una hipótesis inicial en el cuaderno."
            : "Evidencia registrada en el cuaderno.",
      };
    }

    case ACTIONS.ADD_NOTE: {
      const notebook = cloneNotebook(state.notebook);
      const relatedEvidenceIds = action.payload.relatedEvidenceIds || [];
      const evidenceId = relatedEvidenceIds[0];
      const evidence = evidenceId
        ? state.evidenceDatabase.find((item) => item.id === evidenceId)
        : null;
      const consumesTime = action.payload.consumeTime === true;
      const minutes = action.payload.minutes ?? 8;
      const duplicateTag = action.payload.preventDuplicateTag;

      if (duplicateTag && evidence) {
        const result = NotebookSystem.registerObservation({
          notebook,
          evidence,
          text: action.payload.text,
          tags: action.payload.tags || [],
        });

        if (!result.created) {
          return {
            ...state,
            lastMapMessage: "Esa observación ya fue registrada en el cuaderno.",
          };
        }
      } else {
        notebook.addNote(
          new Note({
            id: createId("note"),
            text: action.payload.text,
            relatedEvidenceIds,
            tags: action.payload.tags || [],
          })
        );
      }

      const flowChanges = consumesTime
        ? GameFlowSystem.advanceTimeWithAmbientEvents(
            {
              ...state,
              notebook,
            },
            minutes
          )
        : {};

      const notebookAfterTime = flowChanges.notebook || notebook;
      const contradictionScan = AutomaticContradictionSystem.apply(
        notebookAfterTime,
        state.notebook.activeCase
      );
      const contradictionModalUpdate = queueOrOpenContradictionModal(
        {
          ...state,
          ...flowChanges,
          notebook: contradictionScan.notebook,
        },
        contradictionScan.createdContradictions
      );

      return {
        ...state,
        ...flowChanges,
        notebook: contradictionScan.notebook,
        ...contradictionModalUpdate,
      };
    }

    case ACTIONS.ADD_CONTRADICTION: {
      const notebook = cloneNotebook(state.notebook);
      const contradiction = new Contradiction({
        id: action.payload.id,
        title: action.payload.title,
        description: action.payload.description,
        evidenceIds: action.payload.evidenceIds || [],
        severity: action.payload.severity || "media",
      });

      notebook.addContradiction(contradiction);

      const hypothesisImpact = ContradictionImpactSystem.applyContradictionToHypotheses(
        notebook,
        contradiction
      );

      const reconstructionImpact =
        ReconstructionInstabilitySystem.applyContradictionsToReconstructions(
          hypothesisImpact.notebook,
          contradiction
        );

      const repairedNotebook = NotebookIntegritySystem.repairIfNeeded(
        reconstructionImpact.notebook,
        "contradiction_changed"
      );

      const alreadyHasContradictionHypothesis = (repairedNotebook.hypotheses || []).some((hypothesis) =>
        hypothesis.tags?.includes("auto_generated_from_contradiction")
      );
      const contradictionHypothesis = AutoWritingSystem.buildHypothesisFromNotebook(repairedNotebook);

      if (contradictionHypothesis && !alreadyHasContradictionHypothesis) {
        repairedNotebook.addHypothesis(
          new Hypothesis({
            ...contradictionHypothesis,
            id: createId("hypothesis"),
            title: contradictionHypothesis.title,
            text: contradictionHypothesis.text,
            supportingEvidenceIds: contradictionHypothesis.supportingEvidenceIds,
            opposingEvidenceIds: contradictionHypothesis.opposingEvidenceIds,
            confidence: contradictionHypothesis.confidence,
            status: contradictionHypothesis.status,
            tags: ["auto_generated", "auto_generated_from_contradiction"],
          })
        );
      }

      repairedNotebook.addCaseEvent({
        type: "contradiction_impact",
        title: contradiction.title,
        severity: contradiction.severity || "media",
        text: ContradictionImpactSystem.buildNarrativeFeedback(
          contradiction,
          hypothesisImpact.affectedHypothesisIds
        ),
        relatedEvidenceIds: contradiction.evidenceIds || [],
      });

      repairedNotebook.addCaseEvent({
        type: "reconstruction_instability",
        title: contradiction.title,
        severity: reconstructionImpact.affectedReconstructions.length > 0 ? contradiction.severity || "media" : "leve",
        text: ReconstructionInstabilitySystem.buildReconstructionFeedback(
          reconstructionImpact.affectedReconstructions
        ),
        relatedEvidenceIds: contradiction.evidenceIds || [],
      });

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          notebook: repairedNotebook,
        },
        15
      );

      const contradictionModalUpdate = queueOrOpenContradictionModal(
        state,
        [contradiction]
      );

      return {
        ...state,
        ...flowChanges,
        notebook: flowChanges.notebook || repairedNotebook,
        ...contradictionModalUpdate,
        lastMapMessage: "Una contradicción altera la lectura del caso.",
      };
    }

    case ACTIONS.APPLY_SOURCE_FLAG: {
      const notebook = cloneNotebook(state.notebook);
      const { evidenceId, flag } = action.payload || {};

      if (!evidenceId || !flag) return state;

      const updatedEvidenceDatabase = state.evidenceDatabase.map((evidence) =>
        evidence.id === evidenceId ? SourceEvaluationSystem.applyFlag(evidence, flag) : evidence
      );

      const updatedNotebookEvidences = notebook.evidences.map((evidence) => {
        if (evidence.id !== evidenceId) return evidence;

        const updatedFromDatabase = updatedEvidenceDatabase.find((item) => item.id === evidenceId);
        return updatedFromDatabase || SourceEvaluationSystem.applyFlag(evidence, flag);
      });

      notebook.evidences = updatedNotebookEvidences;

      notebook.hypotheses = notebook.hypotheses.map((hypothesis) => {
        const related = hypothesis.evidenceIds?.includes(evidenceId);
        return related ? HypothesisEvaluationSystem.calculate(hypothesis, notebook) : hypothesis;
      });

      const repairedNotebook = NotebookIntegritySystem.repairIfNeeded(
        notebook,
        "evidence_changed"
      );
      const contradictionScanBeforeTime = AutomaticContradictionSystem.apply(
        repairedNotebook,
        state.notebook.activeCase
      );
      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          notebook: contradictionScanBeforeTime.notebook,
        },
        12
      );
      const finalNotebook = flowChanges.notebook || contradictionScanBeforeTime.notebook;
      const contradictionModalUpdate = queueOrOpenContradictionModal(
        state,
        contradictionScanBeforeTime.createdContradictions
      );

      return {
        ...state,
        ...flowChanges,
        evidenceDatabase: updatedEvidenceDatabase,
        notebook: finalNotebook,
        ...contradictionModalUpdate,
        lastMapMessage: contradictionScanBeforeTime.createdContradictions.length > 0
          ? "El cuaderno detectó una contradicción automática al revisar la fuente."
          : "La credibilidad de una fuente es cuestionada.",
      };
    }

    case ACTIONS.ADD_HYPOTHESIS: {
      const notebook = cloneNotebook(state.notebook);
      const supportingEvidenceIds = action.payload.supportingEvidenceIds || action.payload.evidenceIds || [];
      const opposingEvidenceIds = action.payload.opposingEvidenceIds || [];
      const evidenceIds = Hypothesis.mergeEvidenceIds(supportingEvidenceIds, opposingEvidenceIds);
      const evidence = action.payload.createdFromEvidenceId
        ? state.evidenceDatabase.find((item) => item.id === action.payload.createdFromEvidenceId)
        : evidenceIds[0]
          ? state.evidenceDatabase.find((item) => item.id === evidenceIds[0])
          : null;
      const consumesTime = action.payload.consumeTime === true;
      const minutes = action.payload.minutes ?? 20;
      const duplicateTag = action.payload.preventDuplicateTag;

      if (duplicateTag && evidence) {
        const result = NotebookSystem.createSeedHypothesis({
          notebook,
          evidence,
          title: action.payload.title,
          text: action.payload.text,
          confidence: action.payload.confidence || "provisoria",
        });

        if (!result.created) {
          return {
            ...state,
            lastMapMessage: "Esa hipótesis inicial ya existe en el cuaderno.",
          };
        }
      } else {
        notebook.addHypothesis(
          new Hypothesis({
            id: createId("hypothesis"),
            title: action.payload.title,
            text: action.payload.text,
            evidenceIds,
            supportingEvidenceIds,
            opposingEvidenceIds,
            confidence: action.payload.confidence || "provisoria",
            status: action.payload.status || "abierta",
            createdFromEvidenceId: action.payload.createdFromEvidenceId || null,
            tags: action.payload.tags || [],
          })
        );
      }

      const flowChanges = consumesTime
        ? GameFlowSystem.advanceTimeWithAmbientEvents(
            {
              ...state,
              notebook,
            },
            minutes
          )
        : {};

      return {
        ...state,
        ...flowChanges,
        notebook: flowChanges.notebook || notebook,
      };
    }

    case ACTIONS.ADD_SUPPORTING_EVIDENCE_TO_HYPOTHESIS: {
      const notebook = cloneNotebook(state.notebook);
      const { hypothesisId, evidenceId } = action.payload || {};

      if (!hypothesisId || !evidenceId) return state;

      const hypothesis = notebook.hypotheses.find((item) => item.id === hypothesisId);
      const evidenceExists = notebook.evidences.some((item) => item.id === evidenceId);

      if (!hypothesis || !evidenceExists) return state;

      let updatedHypothesis = hypothesis.withSupportingEvidence(evidenceId);

      updatedHypothesis = HypothesisEvaluationSystem.calculate(
        updatedHypothesis,
        notebook
      );

      notebook.hypotheses = notebook.hypotheses.map((item) =>
        item.id === hypothesisId ? updatedHypothesis : item
      );

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          notebook,
        },
        10
      );

      return {
        ...state,
        ...flowChanges,
        notebook: flowChanges.notebook || notebook,
      };
    }

    case ACTIONS.ADD_OPPOSING_EVIDENCE_TO_HYPOTHESIS: {
      const notebook = cloneNotebook(state.notebook);
      const { hypothesisId, evidenceId } = action.payload || {};

      if (!hypothesisId || !evidenceId) return state;

      const hypothesis = notebook.hypotheses.find((item) => item.id === hypothesisId);
      const evidenceExists = notebook.evidences.some((item) => item.id === evidenceId);

      if (!hypothesis || !evidenceExists) return state;

      let updatedHypothesis = hypothesis.withOpposingEvidence(evidenceId);

      updatedHypothesis = HypothesisEvaluationSystem.calculate(
        updatedHypothesis,
        notebook
      );

      notebook.hypotheses = notebook.hypotheses.map((item) =>
        item.id === hypothesisId ? updatedHypothesis : item
      );

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          notebook,
        },
        10
      );

      return {
        ...state,
        ...flowChanges,
        notebook: flowChanges.notebook || notebook,
      };
    }

    case ACTIONS.ADD_ARTICLE: {
      const notebook = cloneNotebook(state.notebook);
      const article = new Article({
        id: createId("article"),
        title: action.payload.title,
        body: action.payload.body,
        tone: action.payload.tone || "neutral",
        censorshipRisk: Article.calculateCensorshipRisk(action.payload.tone || "neutral"),
      });

      notebook.addArticle(article);

      // En esta versión, los artículos generados desde la pestaña Artículos
      // funcionan como cierre editorial del caso activo. No quedan como borradores
      // infinitos ni permiten redactar otro artículo sobre el mismo expediente.
      if (!notebook.activeCase) {
        return {
          ...state,
          notebook: NotebookIntegritySystem.repairIfNeeded(notebook, "article_changed"),
        };
      }

      const articleConsequence = ConsequenceSystem.applyArticleConsequences(state.player, article);
      let player = articleConsequence.player;
      const result = articleConsequence.result;
      const publicationStress = NarrativeStressSystem.applyStress({
        player,
        notebook,
        amount: result.stressChange || 0,
        reason: "publication",
      });
      player = publicationStress.player;
      notebook.activityLog = publicationStress.notebook.activityLog;
      notebook.caseEvents = publicationStress.notebook.caseEvents;

      const worldStateChanges = ConsequenceSystem.getArticleWorldStateChanges(article);
      const factionMemoryChanges =
        article.tone === "critico"
          ? { army: -12, civilians: 6, deserters: 10, press: 5 }
          : article.tone === "humanitario"
            ? { medics: 10, civilians: 8, army: -4 }
            : article.tone === "propaganda"
              ? { army: 6, civilians: -8, press: -10 }
              : article.tone === "oficial"
                ? { army: 8, press: -4 }
                : { press: 2 };

      const baseWorldState = WorldStateSystem.applyChanges(state.worldState, worldStateChanges);
      const persistentOutcome = PersistentConsequenceSystem.createConsequencesFromArticle(article, {
        ...state,
        worldState: baseWorldState,
      });
      const generatedPersistentConsequences = persistentOutcome.consequences;
      const generatedNarrativeFlags = persistentOutcome.narrativeFlags;
      const worldState = PersistentConsequenceSystem.applyConsequencesToWorld(
        baseWorldState,
        generatedPersistentConsequences
      );
      const nextPersistentConsequences = PersistentConsequenceSystem.dedupeConsequences([
        ...(state.persistentConsequences || []),
        ...generatedPersistentConsequences,
      ]);
      const nextNarrativeFlags = NarrativeFlagSystem.applyFlags(
        state.narrativeFlags,
        generatedNarrativeFlags
      );
      const factionMemory = FactionMemorySystem.applyChanges(
        state.factionMemory,
        {
          ...factionMemoryChanges,
          ...FactionMemorySystem.applyRivalryReactions(factionMemoryChanges),
        }
      );

      article.publish();

      const archiveResult = CaseArchiveSystem.archiveAndDeactivateActiveCase(notebook, {
        article,
        closureType: "published",
        summary: "El caso queda cerrado después de la publicación del artículo principal.",
      });
      const activeCaseBeforeClosure = archiveResult.closedCase;
      const closedCaseId = activeCaseBeforeClosure?.id || null;
      let archivedNotebook = archiveResult.notebook;

      const nextCasesAfterClosure = state.cases.map((caseFile) => {
        if (caseFile.id !== closedCaseId) return caseFile;
        const resolvedCase = new CaseFile(caseFile);
        resolvedCase.resolve();
        return resolvedCase;
      });

      archivedNotebook.addConsequenceLog({
        type: "article",
        title: article.title,
        summary: result.summary,
        credibilityChange: result.credibilityChange,
        reputationChanges: result.reputationChanges,
        stressChange: result.stressChange,
        worldStateChanges,
      });

      generatedPersistentConsequences.forEach((consequence) => {
        archivedNotebook.addCaseEvent({
          type: "persistent_consequence",
          title: consequence.title,
          severity: consequence.severity,
          text: consequence.description,
        });
      });

      archivedNotebook.addCaseEvent({
        type: "article_world_impact",
        title: article.title,
        severity:
          Math.abs(worldStateChanges.militaryPressure || 0) >= 10
            ? "grave"
            : "media",
        text: ConsequenceSystem.buildArticleWorldSummary(article, worldStateChanges),
      });

      const repairedNotebook = NotebookIntegritySystem.repairIfNeeded(
        archivedNotebook,
        "case_close"
      );
      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player,
          worldState,
          factionMemory,
          persistentConsequences: nextPersistentConsequences,
          narrativeFlags: nextNarrativeFlags,
          notebook: repairedNotebook,
          flags: {
            ...state.flags,
            ...result.flags,
          },
        },
        45
      );

      return {
        ...state,
        ...flowChanges,
        player,
        worldState,
        factionMemory,
        persistentConsequences: nextPersistentConsequences,
        cases: activeCaseBeforeClosure ? nextCasesAfterClosure : flowChanges.cases || state.cases,
        narrativeFlags: flowChanges.narrativeFlags || nextNarrativeFlags,
        notebook: flowChanges.notebook || repairedNotebook,
        caseClosureModal: activeCaseBeforeClosure
          ? CaseClosureSystem.buildClosure({
              caseFile: activeCaseBeforeClosure,
              article,
              result,
              worldStateChanges,
              persistentConsequences: generatedPersistentConsequences,
            })
          : state.caseClosureModal,
        flags: flowChanges.flags || {
          ...state.flags,
          ...result.flags,
        },
      };
    }

    case ACTIONS.ADD_RECONSTRUCTION: {
      const notebook = cloneNotebook(state.notebook);
      notebook.addReconstruction(
        new HistoricalReconstruction({
          id: createId("reconstruction"),
          interpretationType: action.payload.interpretationType,
          title: action.payload.title,
          text: action.payload.text,
          evidenceIds: action.payload.evidenceIds || [],
          contradictionIds: action.payload.contradictionIds || [],
          confidence: action.payload.confidence || "provisoria",
        })
      );
      return {
        ...state,
        notebook: NotebookIntegritySystem.repairIfNeeded(notebook, "reconstruction_changed"),
      };
    }

    case ACTIONS.REGISTER_TRAUMATIC_EXPOSURE: {
      const eventType = action.payload?.eventType;
      const baseStress = Number(action.payload?.stress ?? 5);

      if (!eventType) return state;

      const stressResult = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: state.notebook,
        amount: baseStress,
        reason: "traumatic_exposure",
        eventType,
      });

      return {
        ...state,
        player: stressResult.player,
        notebook: stressResult.notebook,
      };
    }

    case ACTIONS.CHANGE_STRESS: {
      const stressResult = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: state.notebook,
        amount: action.payload,
        reason: action.reason || "front",
        eventType: action.eventType || null,
      });

      return {
        ...state,
        player: stressResult.player,
        notebook: stressResult.notebook,
      };
    }

    case ACTIONS.REST_IN_SAFE_ZONE: {
      if (!RestRecoverySystem.canRest(state)) {
        return {
          ...state,
          lastMapMessage: RestRecoverySystem.getRestBlockReason(state),
        };
      }

      const recoveryAmount = Number(action.payload?.amount ?? 6);
      const restMinutes = Number(action.payload?.minutes ?? 45);
      const stressResult = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: state.notebook,
        amount: -Math.abs(recoveryAmount),
        reason: "rest",
      });

      const notebookWithRest = cloneNotebook(stressResult.notebook);
      notebookWithRest.addCaseEvent({
        type: "rest_recovery",
        title: "Respiro en zona segura",
        severity: "leve",
        text: RestRecoverySystem.buildRestNarrative(state, Math.abs(recoveryAmount)),
      });

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player: stressResult.player,
          notebook: notebookWithRest,
        },
        restMinutes
      );

      return {
        ...state,
        ...flowChanges,
        player: flowChanges.player || stressResult.player,
        notebook: flowChanges.notebook || notebookWithRest,
        lastMapMessage:
          flowChanges.lastMapMessage ||
          RestRecoverySystem.buildRestNarrative(state, Math.abs(recoveryAmount)),
      };
    }

    case ACTIONS.TALK_TO_MEDICAL_STAFF: {
      if (!RestRecoverySystem.canTalkToMedicalStaff(state)) {
        return {
          ...state,
          lastMapMessage: RestRecoverySystem.getMedicalTalkBlockReason(state),
        };
      }

      const recoveryAmount = Number(action.payload?.amount ?? 4);
      const talkMinutes = Number(action.payload?.minutes ?? 25);
      const narrative = RestRecoverySystem.buildMedicalTalkNarrative(
        state,
        Math.abs(recoveryAmount)
      );

      const stressResult = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: state.notebook,
        amount: -Math.abs(recoveryAmount),
        reason: "rest",
      });

      const notebookWithMedicalTalk = cloneNotebook(stressResult.notebook);
      notebookWithMedicalTalk.addCaseEvent({
        type: "medical_recovery",
        title: "Contención en el puesto médico",
        severity: "leve",
        text: narrative,
      });

      notebookWithMedicalTalk.addNote(
        new Note({
          id: createId("note"),
          text: `Apunte personal en el puesto médico: ${narrative}`,
          relatedEvidenceIds: [],
          tags: ["personal", "medical_recovery", "silent"],
        })
      );

      const factionMemory = FactionMemorySystem.applyChanges(
        state.factionMemory,
        { medics: 2 }
      );

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player: stressResult.player,
          notebook: notebookWithMedicalTalk,
          factionMemory,
        },
        talkMinutes
      );

      return {
        ...state,
        ...flowChanges,
        player: flowChanges.player || stressResult.player,
        notebook: flowChanges.notebook || notebookWithMedicalTalk,
        factionMemory: flowChanges.factionMemory || factionMemory,
        lastMapMessage: flowChanges.lastMapMessage || narrative,
      };
    }

    case ACTIONS.WRITE_PERSONAL_NOTE: {
      if (!RestRecoverySystem.canWritePersonalNote(state)) {
        return {
          ...state,
          lastMapMessage: RestRecoverySystem.getPersonalNoteBlockReason(state),
        };
      }

      const recoveryAmount = Number(action.payload?.amount ?? 3);
      const writingMinutes = Number(action.payload?.minutes ?? 15);
      const narrative = RestRecoverySystem.buildPersonalNoteNarrative(
        state,
        Math.abs(recoveryAmount)
      );

      const stressResult = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: state.notebook,
        amount: -Math.abs(recoveryAmount),
        reason: "rest",
      });

      const notebookWithPersonalNote = cloneNotebook(stressResult.notebook);
      notebookWithPersonalNote.addNote(
        new Note({
          id: createId("note"),
          text: `Nota personal: ${narrative}`,
          relatedEvidenceIds: [],
          tags: ["personal", "emotional_recovery", "silent"],
        })
      );

      notebookWithPersonalNote.addCaseEvent({
        type: "personal_writing_recovery",
        title: "Nota personal del corresponsal",
        severity: "leve",
        text: narrative,
      });

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player: stressResult.player,
          notebook: notebookWithPersonalNote,
        },
        writingMinutes
      );

      return {
        ...state,
        ...flowChanges,
        player: flowChanges.player || stressResult.player,
        notebook: flowChanges.notebook || notebookWithPersonalNote,
        lastMapMessage: flowChanges.lastMapMessage || narrative,
      };
    }

    case ACTIONS.SLEEP_FOR_HOURS: {
      if (!RestRecoverySystem.canSleepForHours(state)) {
        return {
          ...state,
          lastMapMessage: RestRecoverySystem.getSleepBlockReason(state),
        };
      }

      const recoveryAmount = Number(action.payload?.amount ?? 12);
      const sleepMinutes = Number(action.payload?.minutes ?? 240);
      const sleepHours = Math.max(1, Math.round(sleepMinutes / 60));
      const narrative = RestRecoverySystem.buildSleepNarrative(
        state,
        Math.abs(recoveryAmount),
        sleepHours
      );

      const stressResult = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: state.notebook,
        amount: -Math.abs(recoveryAmount),
        reason: "rest",
      });

      const notebookWithSleep = cloneNotebook(stressResult.notebook);
      notebookWithSleep.addNote(
        new Note({
          id: createId("note"),
          text: `Diario de sueño: ${narrative}`,
          relatedEvidenceIds: [],
          tags: ["personal", "sleep_recovery", "diary", "silent"],
        })
      );

      notebookWithSleep.addCaseEvent({
        type: "sleep_recovery",
        title: "Sueño breve del corresponsal",
        severity: "media",
        text: `${narrative} Mientras duerme, el frente sigue avanzando: los casos, rutinas y riesgos cambian con el tiempo.`,
      });

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player: stressResult.player,
          notebook: notebookWithSleep,
        },
        sleepMinutes
      );

      return {
        ...state,
        ...flowChanges,
        player: flowChanges.player || stressResult.player,
        notebook: flowChanges.notebook || notebookWithSleep,
        lastMapMessage: flowChanges.lastMapMessage || narrative,
      };
    }

    case ACTIONS.USE_CIVILIAN_SHELTER: {
      if (!RestRecoverySystem.canUseCivilianShelter(state)) {
        return {
          ...state,
          lastMapMessage: RestRecoverySystem.getCivilianShelterBlockReason(state),
        };
      }

      const recoveryAmount = Number(action.payload?.amount ?? 10);
      const shelterMinutes = Number(action.payload?.minutes ?? 120);
      const shelterHours = Math.max(1, Math.round(shelterMinutes / 60));
      const narrative = RestRecoverySystem.buildCivilianShelterNarrative(
        state,
        Math.abs(recoveryAmount),
        shelterHours
      );

      const stressResult = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: state.notebook,
        amount: -Math.abs(recoveryAmount),
        reason: "rest",
      });

      const notebookWithShelter = cloneNotebook(stressResult.notebook);
      notebookWithShelter.addNote(
        new Note({
          id: createId("note"),
          text: `Diario de refugio civil: ${narrative}`,
          relatedEvidenceIds: [],
          tags: ["personal", "civilian_shelter", "diary", "silent"],
        })
      );

      notebookWithShelter.addCaseEvent({
        type: "civilian_shelter_recovery",
        title: "Refugio civil",
        severity: "media",
        text: `${narrative} La ayuda civil fortalece una red fuera del control directo del mando militar.`,
      });

      const factionMemory = FactionMemorySystem.applyChanges(
        state.factionMemory,
        { civilians: 2, army: -1 }
      );

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player: stressResult.player,
          notebook: notebookWithShelter,
          factionMemory,
        },
        shelterMinutes
      );

      return {
        ...state,
        ...flowChanges,
        player: flowChanges.player || stressResult.player,
        notebook: flowChanges.notebook || notebookWithShelter,
        factionMemory: flowChanges.factionMemory || factionMemory,
        lastMapMessage: flowChanges.lastMapMessage || narrative,
      };
    }

    case ACTIONS.USE_MEDICAL_PROTECTION: {
      if (!RestRecoverySystem.canUseMedicalProtection(state)) {
        return {
          ...state,
          lastMapMessage: RestRecoverySystem.getMedicalProtectionBlockReason(state),
        };
      }

      const recoveryAmount = Number(action.payload?.amount ?? 8);
      const protectionMinutes = Number(action.payload?.minutes ?? 60);
      const narrative = RestRecoverySystem.buildMedicalProtectionNarrative(
        state,
        Math.abs(recoveryAmount),
        protectionMinutes
      );

      const stressResult = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: state.notebook,
        amount: -Math.abs(recoveryAmount),
        reason: "rest",
      });

      const notebookWithProtection = cloneNotebook(stressResult.notebook);
      notebookWithProtection.addNote(
        new Note({
          id: createId("note"),
          text: `Diario de protección médica: ${narrative}`,
          relatedEvidenceIds: [],
          tags: ["personal", "medical_protection", "diary", "silent"],
        })
      );

      notebookWithProtection.addCaseEvent({
        type: "medical_protection",
        title: "Protección médica activa",
        severity: "media",
        text: `${narrative} Mientras esta protección esté activa, el riesgo de confiscación se reduce ante una revisión militar extrema.`,
      });

      const factionMemory = FactionMemorySystem.applyChanges(
        state.factionMemory,
        { medics: 1, army: -1 }
      );
      const nextFlags = {
        ...state.flags,
        medicalProtectionActive: true,
      };

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player: stressResult.player,
          notebook: notebookWithProtection,
          factionMemory,
          flags: nextFlags,
        },
        protectionMinutes
      );

      return {
        ...state,
        ...flowChanges,
        player: flowChanges.player || stressResult.player,
        notebook: flowChanges.notebook || notebookWithProtection,
        factionMemory: flowChanges.factionMemory || factionMemory,
        flags: flowChanges.flags || nextFlags,
        lastMapMessage: flowChanges.lastMapMessage || narrative,
      };
    }

    case ACTIONS.CHANGE_WORLD_STATE: {
      const changes = action.payload || {};
      const worldState = WorldStateSystem.applyChanges(state.worldState, changes);
      const totalImpact =
        Math.abs(WorldStateSystem.getChangeValue(changes, "credibility")) +
        Math.abs(WorldStateSystem.getChangeValue(changes, "militaryPressure")) +
        Math.abs(WorldStateSystem.getChangeValue(changes, "publicMorale"));

      const notebook = cloneNotebook(state.notebook);

      if (totalImpact > 0) {
        notebook.addCaseEvent({
          type: "world_state_change",
          title: "Cambio en el frente narrativo",
          severity:
            Math.abs(WorldStateSystem.getChangeValue(changes, "militaryPressure")) >= 10 ||
            totalImpact >= 20
              ? "grave"
              : "media",
          text: "La publicación, los rumores o las decisiones del corresponsal alteran el clima histórico del caso.",
        });
      }

      return {
        ...state,
        worldState,
        notebook,
      };
    }

    case ACTIONS.CHANGE_FACTION_MEMORY: {
      const directChanges = action.payload || {};
      const rivalryChanges = FactionMemorySystem.applyRivalryReactions(directChanges);
      const combinedChanges = { ...directChanges };

      Object.entries(rivalryChanges).forEach(([faction, amount]) => {
        combinedChanges[faction] = (combinedChanges[faction] || 0) + amount;
      });

      const factionMemory = FactionMemorySystem.applyChanges(
        state.factionMemory,
        combinedChanges
      );

      const notebook = cloneNotebook(state.notebook);
      const dynamicEvents = FactionEventSystem.buildDynamicEvents(factionMemory);

      Object.entries(combinedChanges).forEach(([faction, amount]) => {
        if (!amount) return;

        notebook.addCaseEvent({
          type: "faction_memory",
          title: `Reacción de ${faction}`,
          severity: Math.abs(amount) >= 10 ? "grave" : "media",
          text: FactionMemorySystem.buildNarrative(
            faction,
            factionMemory[faction]
          ),
        });
      });

      dynamicEvents.forEach((event) => {
        const alreadyRegistered = (notebook.caseEvents || []).some(
          (caseEvent) =>
            caseEvent.type === "dynamic_faction_event" &&
            caseEvent.title === event.title &&
            caseEvent.faction === event.faction
        );

        if (alreadyRegistered) return;

        notebook.addCaseEvent({
          type: "dynamic_faction_event",
          title: event.title,
          faction: event.faction,
          severity: event.severity,
          text: event.text,
        });
      });

      return {
        ...state,
        factionMemory,
        notebook,
      };
    }

    case ACTIONS.CHANGE_REPUTATION: {
      const player = new Player(state.player);
      const { faction, amount } = action.payload;

      if (player.reputation[faction] !== undefined) {
        player.reputation[faction] += amount;
      }

      return { ...state, player };
    }

    case ACTIONS.APPLY_ARTICLE_CONSEQUENCES: {
      const notebook = cloneNotebook(state.notebook);
      const article = notebook.articles.find((item) => item.id === action.payload.articleId);

      const alreadyPublishedWithoutConsequences =
        article?.publicationStatus === "published" && !article?.consequencesApplied;

      if (!article || (!article.canPublish() && !alreadyPublishedWithoutConsequences)) return state;

      const articleConsequence = ConsequenceSystem.applyArticleConsequences(state.player, article);
      let player = articleConsequence.player;
      const result = articleConsequence.result;
      const publicationStress = NarrativeStressSystem.applyStress({
        player,
        notebook,
        amount: result.stressChange || 0,
        reason: "publication",
      });
      player = publicationStress.player;
      notebook.activityLog = publicationStress.notebook.activityLog;
      notebook.caseEvents = publicationStress.notebook.caseEvents;
      const worldStateChanges = ConsequenceSystem.getArticleWorldStateChanges(article);
      const factionMemoryChanges =
        article.tone === "critico"
          ? { army: -12, civilians: 6, deserters: 10, press: 5 }
          : article.tone === "humanitario"
            ? { medics: 10, civilians: 8, army: -4 }
            : article.tone === "propaganda"
              ? { army: 6, civilians: -8, press: -10 }
              : article.tone === "oficial"
                ? { army: 8, press: -4 }
                : { press: 2 };
      const baseWorldState = WorldStateSystem.applyChanges(state.worldState, worldStateChanges);
      const persistentOutcome =
        PersistentConsequenceSystem.createConsequencesFromArticle(article, {
          ...state,
          worldState: baseWorldState,
        });
      const generatedPersistentConsequences = persistentOutcome.consequences;
      const generatedNarrativeFlags = persistentOutcome.narrativeFlags;

      const worldState = PersistentConsequenceSystem.applyConsequencesToWorld(
        baseWorldState,
        generatedPersistentConsequences
      );
      const nextPersistentConsequences = PersistentConsequenceSystem.dedupeConsequences([
        ...(state.persistentConsequences || []),
        ...generatedPersistentConsequences,
      ]);

      const nextNarrativeFlags = NarrativeFlagSystem.applyFlags(
        state.narrativeFlags,
        generatedNarrativeFlags
      );
      const factionMemory = FactionMemorySystem.applyChanges(
        state.factionMemory,
        {
          ...factionMemoryChanges,
          ...FactionMemorySystem.applyRivalryReactions(factionMemoryChanges),
        }
      );
      article.publish();

      const archiveResult = CaseArchiveSystem.archiveAndDeactivateActiveCase(notebook, {
        article,
        closureType: "published",
        summary: "El caso queda cerrado después de la publicación del artículo principal.",
      });
      const activeCaseBeforeClosure = archiveResult.closedCase;
      const closedCaseId = activeCaseBeforeClosure?.id || null;
      let archivedNotebook = archiveResult.notebook;

      const nextCasesAfterClosure = state.cases.map((caseFile) => {
        if (caseFile.id !== closedCaseId) return caseFile;
        const resolvedCase = new CaseFile(caseFile);
        resolvedCase.resolve();
        return resolvedCase;
      });

      archivedNotebook.addConsequenceLog({
        type: "article",
        title: article.title,
        summary: result.summary,
        credibilityChange: result.credibilityChange,
        reputationChanges: result.reputationChanges,
        stressChange: result.stressChange,
        worldStateChanges,
      });

      generatedPersistentConsequences.forEach((consequence) => {
        archivedNotebook.addCaseEvent({
          type: "persistent_consequence",
          title: consequence.title,
          severity: consequence.severity,
          text: consequence.description,
        });
      });

      archivedNotebook.addCaseEvent({
        type: "article_world_impact",
        title: article.title,
        severity:
          Math.abs(worldStateChanges.militaryPressure || 0) >= 10
            ? "grave"
            : "media",
        text: ConsequenceSystem.buildArticleWorldSummary(article, worldStateChanges),
      });

      const repairedNotebook = NotebookIntegritySystem.repairIfNeeded(
        archivedNotebook,
        "case_close"
      );
      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player,
          worldState,
          factionMemory,
          persistentConsequences: nextPersistentConsequences,
          narrativeFlags: nextNarrativeFlags,
          notebook: repairedNotebook,
          flags: {
            ...state.flags,
            ...result.flags,
          },
        },
        45
      );

      return {
        ...state,
        ...flowChanges,
        player,
        worldState,
        factionMemory,
        persistentConsequences: nextPersistentConsequences,
        cases: activeCaseBeforeClosure ? nextCasesAfterClosure : flowChanges.cases || state.cases,
        narrativeFlags: flowChanges.narrativeFlags || nextNarrativeFlags,
        notebook: flowChanges.notebook || repairedNotebook,
        caseClosureModal: activeCaseBeforeClosure
          ? CaseClosureSystem.buildClosure({
              caseFile: activeCaseBeforeClosure,
              article,
              result,
              worldStateChanges,
              persistentConsequences: generatedPersistentConsequences,
            })
          : state.caseClosureModal,
        flags: flowChanges.flags || {
          ...state.flags,
          ...result.flags,
        },
      };
    }

    case ACTIONS.APPLY_RECONSTRUCTION_CONSEQUENCES: {
      const notebook = cloneNotebook(state.notebook);
      const reconstruction = notebook.reconstructions.find(
        (item) => item.id === action.payload.reconstructionId
      );

      if (!reconstruction) return state;

      const logAlreadyExists = notebook.consequenceLog.some(
        (entry) => entry.type === "reconstruction" && entry.sourceId === reconstruction.id
      );

      if (logAlreadyExists) return state;

      const reconstructionConsequence = ConsequenceSystem.applyReconstructionConsequences(
        state.player,
        reconstruction
      );
      let player = reconstructionConsequence.player;
      const result = reconstructionConsequence.result;
      const reconstructionStress = NarrativeStressSystem.applyStress({
        player,
        notebook,
        amount: result.stressChange || 0,
        reason: "publication",
      });
      player = reconstructionStress.player;
      notebook.activityLog = reconstructionStress.notebook.activityLog;
      notebook.caseEvents = reconstructionStress.notebook.caseEvents;

      notebook.addConsequenceLog({
        type: "reconstruction",
        sourceId: reconstruction.id,
        title: reconstruction.title,
        summary: result.summary,
        credibilityChange: result.credibilityChange,
        reputationChanges: result.reputationChanges,
        stressChange: result.stressChange,
      });

      const repairedNotebook = NotebookIntegritySystem.repairIfNeeded(
        notebook,
        "reconstruction_changed"
      );
      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player,
          notebook: repairedNotebook,
          flags: {
            ...state.flags,
            ...result.flags,
          },
        },
        40
      );

      return {
        ...state,
        ...flowChanges,
        player,
        notebook: flowChanges.notebook || repairedNotebook,
        flags: flowChanges.flags || {
          ...state.flags,
          ...result.flags,
        },
      };
    }

    case ACTIONS.REVIEW_ARTICLE_FOR_CENSORSHIP: {
      const notebook = cloneNotebook(state.notebook);
      const article = notebook.articles.find((item) => item.id === action.payload.articleId);

      if (!article) return state;

      article.markReviewed();

      const review = CensorshipSystem.reviewArticle({
        article,
        player: state.player,
        worldState: state.worldState,
      });

      article.censorshipRisk = review.level;
      article.censorshipScore = review.score;

      if (review.censored) {
        article.censor(review.level);

        const censorshipStress = NarrativeStressSystem.applyStress({
          player: state.player,
          notebook,
          amount: review.confiscationRisk ? 8 : 4,
          reason: "censorship",
        });
        const player = censorshipStress.player;
        notebook.activityLog = censorshipStress.notebook.activityLog;
        notebook.caseEvents = censorshipStress.notebook.caseEvents;
        player.reputation.officers -= review.confiscationRisk ? 8 : 5;

        const worldStateChanges = review.confiscationRisk
          ? { credibility: 4, militaryPressure: 12, publicMorale: -6 }
          : { credibility: 2, militaryPressure: 6, publicMorale: -3 };
        const worldState = WorldStateSystem.applyChanges(state.worldState, worldStateChanges);

        const medicalProtectionAbsorbsConfiscation =
          review.confiscationRisk && state.flags.medicalProtectionActive;

        const notebookAfterConfiscation = review.confiscationRisk && !medicalProtectionAbsorbsConfiscation
          ? CensorshipSystem.applyConfiscation(notebook, "grave")
          : notebook;

        if (medicalProtectionAbsorbsConfiscation) {
          notebookAfterConfiscation.addCaseEvent({
            type: "medical_protection_used",
            title: "Protección médica utilizada",
            severity: "media",
            text: "El personal médico desvía una inspección extrema y evita la confiscación directa de notas del corresponsal.",
          });
        }

        notebookAfterConfiscation.addConsequenceLog({
          type: "censorship",
          title: article.title,
          summary: review.summary,
          credibilityChange: 0,
          reputationChanges: { officers: review.confiscationRisk ? -8 : -5 },
          stressChange: review.confiscationRisk ? 8 : 4,
          worldStateChanges,
        });

        notebookAfterConfiscation.addCaseEvent({
          type: "censorship_review",
          title: article.title,
          severity: review.confiscationRisk ? "grave" : "media",
          text: review.summary,
        });

        const nextFlags = {
          ...state.flags,
          censorshipActive: true,
          confiscationRisk: medicalProtectionAbsorbsConfiscation
            ? false
            : review.confiscationRisk || state.flags.confiscationRisk,
          medicalProtectionActive: medicalProtectionAbsorbsConfiscation
            ? false
            : state.flags.medicalProtectionActive,
          temporaryPressPermit: false,
          militaryEscortGranted: false,
        };
        const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
          {
            ...state,
            player,
            worldState,
            notebook: notebookAfterConfiscation,
            flags: nextFlags,
          },
          review.confiscationRisk ? 45 : 30
        );

        return {
          ...state,
          ...flowChanges,
          player,
          worldState,
          notebook: flowChanges.notebook || notebookAfterConfiscation,
          flags: flowChanges.flags || nextFlags,
        };
      }

      notebook.addCaseEvent({
        type: "censorship_review",
        title: article.title,
        severity: review.level === "medio" ? "media" : "leve",
        text: review.summary,
      });

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          notebook,
        },
        review.level === "medio" ? 25 : 15
      );

      return {
        ...state,
        ...flowChanges,
        notebook: flowChanges.notebook || notebook,
      };
    }

    case ACTIONS.FORCE_PUBLISH_ARTICLE: {
      const notebook = cloneNotebook(state.notebook);
      const article = notebook.articles.find((item) => item.id === action.payload.articleId);

      if (!article || article.publicationStatus !== "censored" || article.consequencesApplied) return state;

      article.censored = false;
      article.publicationStatus = "published";
      article.published = true;
      article.consequencesApplied = true;

      const archiveResult = CaseArchiveSystem.archiveAndDeactivateActiveCase(notebook, {
        article,
        closureType: "forced_publication",
        summary: "El caso queda cerrado después de desafiar la censura militar.",
      });
      const activeCaseBeforeClosure = archiveResult.closedCase;
      const closedCaseId = activeCaseBeforeClosure?.id || null;
      let archivedNotebook = archiveResult.notebook;

      const nextCasesAfterClosure = state.cases.map((caseFile) => {
        if (caseFile.id !== closedCaseId) return caseFile;
        const resolvedCase = new CaseFile(caseFile);
        resolvedCase.resolve();
        return resolvedCase;
      });

      const worldStateChanges = { credibility: 10, militaryPressure: 15, publicMorale: -8 };
      const worldState = WorldStateSystem.applyChanges(state.worldState, worldStateChanges);

      archivedNotebook.addConsequenceLog({
        type: "forced_publication",
        title: article.title,
        summary: "El corresponsal logró publicar el artículo pese a las restricciones militares.",
        credibilityChange: 8,
        reputationChanges: { officers: -10, soldiers: 8, press: 6 },
        stressChange: 8,
        worldStateChanges,
      });

      archivedNotebook.addCaseEvent({
        type: "article_world_impact",
        title: article.title,
        severity: "grave",
        text: "Desafiar la censura amplifica la voz del corresponsal, pero provoca una respuesta militar más dura.",
      });

      const forcedStress = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: archivedNotebook,
        amount: 8,
        reason: "censorship",
      });
      const player = forcedStress.player;
      archivedNotebook = forcedStress.notebook;
      player.changeCredibility(8);
      player.reputation.officers -= 10;
      player.reputation.soldiers += 8;
      player.reputation.press += 6;

      const repairedNotebook = NotebookIntegritySystem.repairIfNeeded(
        archivedNotebook,
        "case_close"
      );
      const nextFlags = {
        ...state.flags,
        defiedCensorship: true,
        confiscationRisk: false,
        censorshipActive: worldState.militaryPressure >= 60,
        temporaryPressPermit: true,
        militaryEscortGranted: worldState.militaryPressure < 75,
      };
      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player,
          worldState,
          notebook: repairedNotebook,
          flags: nextFlags,
        },
        50
      );

      return {
        ...state,
        ...flowChanges,
        player,
        worldState,
        cases: activeCaseBeforeClosure ? nextCasesAfterClosure : flowChanges.cases || state.cases,
        notebook: flowChanges.notebook || repairedNotebook,
        caseClosureModal: activeCaseBeforeClosure
          ? CaseClosureSystem.buildClosure({
              caseFile: activeCaseBeforeClosure,
              article,
              result: {
                summary: "El corresponsal publicó pese a la censura. La verdad circula, pero el mando militar endurece su vigilancia.",
              },
              worldStateChanges,
              persistentConsequences: [
                {
                  title: "La censura fue desafiada públicamente",
                },
              ],
            })
          : state.caseClosureModal,
        flags: flowChanges.flags || nextFlags,
      };
    }

    case ACTIONS.SOFTEN_ARTICLE: {
      const notebook = cloneNotebook(state.notebook);
      const article = notebook.articles.find((item) => item.id === action.payload.articleId);

      if (!article || article.publicationStatus !== "censored" || article.consequencesApplied) return state;

      article.censored = false;
      article.redactedBody = "";
      article.tone = "neutral";
      article.censorshipRisk = "bajo";
      article.publicationStatus = "published";
      article.published = true;
      article.consequencesApplied = true;

      const archiveResult = CaseArchiveSystem.archiveAndDeactivateActiveCase(notebook, {
        article,
        closureType: "softened_publication",
        summary: "El caso queda cerrado después de suavizar el artículo para atravesar la censura.",
      });
      const activeCaseBeforeClosure = archiveResult.closedCase;
      const closedCaseId = activeCaseBeforeClosure?.id || null;
      let archivedNotebook = archiveResult.notebook;

      const nextCasesAfterClosure = state.cases.map((caseFile) => {
        if (caseFile.id !== closedCaseId) return caseFile;
        const resolvedCase = new CaseFile(caseFile);
        resolvedCase.resolve();
        return resolvedCase;
      });

      const worldStateChanges = { credibility: -4, militaryPressure: -5, publicMorale: 2 };
      const worldState = WorldStateSystem.applyChanges(state.worldState, worldStateChanges);

      archivedNotebook.addConsequenceLog({
        type: "softened_article",
        title: article.title,
        summary: "El artículo fue suavizado para atravesar la censura militar.",
        credibilityChange: -3,
        reputationChanges: { officers: 5, soldiers: -3 },
        stressChange: 2,
        worldStateChanges,
      });

      archivedNotebook.addCaseEvent({
        type: "article_world_impact",
        title: article.title,
        severity: "media",
        text: "Suavizar la crónica reduce la presión militar, pero deja una sensación de verdad incompleta.",
      });

      const softenedStress = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: archivedNotebook,
        amount: 2,
        reason: "censorship",
      });
      const player = softenedStress.player;
      archivedNotebook = softenedStress.notebook;
      player.changeCredibility(-3);
      player.reputation.officers += 5;
      player.reputation.soldiers -= 3;

      const repairedNotebook = NotebookIntegritySystem.repairIfNeeded(
        archivedNotebook,
        "case_close"
      );
      const nextFlags = {
        ...state.flags,
        confiscationRisk: false,
        censorshipActive: worldState.militaryPressure >= 60,
      };
      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          player,
          worldState,
          notebook: repairedNotebook,
          flags: nextFlags,
        },
        35
      );

      return {
        ...state,
        ...flowChanges,
        player,
        worldState,
        cases: activeCaseBeforeClosure ? nextCasesAfterClosure : flowChanges.cases || state.cases,
        notebook: flowChanges.notebook || repairedNotebook,
        caseClosureModal: activeCaseBeforeClosure
          ? CaseClosureSystem.buildClosure({
              caseFile: activeCaseBeforeClosure,
              article,
              result: {
                summary: "El artículo fue suavizado para pasar la censura. El caso se cierra, aunque parte de la verdad queda debilitada.",
              },
              worldStateChanges,
              persistentConsequences: [
                {
                  title: "La publicación salió condicionada por la censura",
                },
              ],
            })
          : state.caseClosureModal,
        flags: flowChanges.flags || nextFlags,
      };
    }

    case ACTIONS.MOVE_PLAYER_ON_ASCII_MAP: {
      const currentMap = AsciiMapEngine.getCurrentMap(state);

      if (!currentMap) return state;

      const restrictions = CensorshipSystem.getGameplayRestrictions(state.worldState, state.flags);
      const movementUnderEscortPressure =
        restrictions.escortRequired && state.currentLocationId === "loc_no_mans_land";

      const nextPosition = {
        x: state.playerPosition.x + action.payload.dx,
        y: state.playerPosition.y + action.payload.dy,
      };

      const targetEntity = currentMap.getEntityAt(nextPosition.x, nextPosition.y, state);
      const shouldSwapWithProceduralNpc = ProceduralNPCSystem.isSwappableWithPlayer(targetEntity);
      const asciiMapsAfterOptionalSwap = shouldSwapWithProceduralNpc
        ? ProceduralNPCSystem.swapEntityWithPlayerInMaps(
            state.asciiMaps,
            currentMap.id,
            targetEntity.id,
            state.playerPosition
          )
        : state.asciiMaps;

      if (!shouldSwapWithProceduralNpc && !AsciiMapEngine.canMoveTo(currentMap, nextPosition.x, nextPosition.y, state)) {
        const blockedTile = currentMap.getTileChar(nextPosition.x, nextPosition.y);
        return {
          ...state,
          lastMapMessage: TileBehaviorSystem.isWalkable(blockedTile)
            ? "Hay alguien en el camino. Acercate e interactuá con E."
            : `El paso queda bloqueado por ${TileBehaviorSystem.getDefinition(blockedTile).label}.`,
        };
      }

      const destinationTileChar = currentMap.getTileChar(nextPosition.x, nextPosition.y);
      const movementCost = TileBehaviorSystem.getMovementCost(destinationTileChar);
      const stressCost = TileBehaviorSystem.causesStress(destinationTileChar);
      const movementMinutes = Math.ceil(Math.max(1, movementCost) * 4);

      let player = new Player(state.player);
      let notebookForMovement = state.notebook;
      if (stressCost > 0) {
        const stressResult = NarrativeStressSystem.applyStress({
          player,
          notebook: state.notebook,
          amount: stressCost,
          reason: destinationTileChar === "~" || destinationTileChar === "." ? "terrain_mud" : "front",
        });
        player = stressResult.player;
        notebookForMovement = stressResult.notebook;
      }

      const movementMessage = shouldSwapWithProceduralNpc
        ? `${targetEntity.label || "Alguien"} deja pasar.`
        : movementUnderEscortPressure
          ? "La vigilancia militar presiona cada paso en tierra de nadie."
          : destinationTileChar === "~"
          ? "El barro profundo ralentiza mucho el avance del corresponsal."
          : destinationTileChar === "."
            ? "El barro vuelve el paso más pesado que los tablones de la trinchera."
            : movementCost > 1
              ? "El terreno ralentiza el avance del corresponsal."
              : "";

      const nextLocationId = MapZoneSystem.getLocationIdAtPosition(
        nextPosition,
        state.currentLocationId
      );

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          asciiMaps: asciiMapsAfterOptionalSwap,
          currentLocationId: nextLocationId,
          player,
          notebook: notebookForMovement,
        },
        movementMinutes
      );

      const notebook = cloneNotebook(flowChanges.notebook || notebookForMovement);

      const nextStateForObservation = {
        ...state,
        ...flowChanges,
        asciiMaps: flowChanges.asciiMaps || asciiMapsAfterOptionalSwap,
        currentLocationId: nextLocationId,
        player: flowChanges.player || player,
        playerPosition: nextPosition,
        notebook,
      };

      const nextObservationSignature = ExplorationAwarenessSystem.buildObservationSignature(
        nextStateForObservation
      );

      if (nextObservationSignature !== state.lastObservationSignature) {
        notebook.addActivityLog({
          type: "percepción",
          severity: "leve",
          text: ExplorationAwarenessSystem.buildCurrentObservation(
            nextStateForObservation,
            state.time.weather
          ),
        });
      }

      return {
        ...state,
        ...flowChanges,
        asciiMaps: flowChanges.asciiMaps || asciiMapsAfterOptionalSwap,
        currentLocationId: nextLocationId,
        player: flowChanges.player || player,
        playerPosition: nextPosition,
        notebook,
        lastObservationSignature: nextObservationSignature,
        lastMapMessage: flowChanges.lastMapMessage || movementMessage,
      };
    }

    case ACTIONS.INTERACT_ASCII_ENTITY: {
      const currentMap = AsciiMapEngine.getCurrentMap(state);

      if (!currentMap) return state;

      const adjacentPositions = [
        { x: state.playerPosition.x, y: state.playerPosition.y },
        { x: state.playerPosition.x, y: state.playerPosition.y - 1 },
        { x: state.playerPosition.x, y: state.playerPosition.y + 1 },
        { x: state.playerPosition.x - 1, y: state.playerPosition.y },
        { x: state.playerPosition.x + 1, y: state.playerPosition.y },
      ];

      const entity = currentMap.entities.find(
        (item) =>
          currentMap.getEntityAt(item.x, item.y, state) &&
          adjacentPositions.some((pos) => pos.x === item.x && pos.y === item.y)
      );

      if (!entity) {
        const notebook = cloneNotebook(state.notebook);
        notebook.addNote(
          new Note({
            id: createId("note"),
            text: "El corresponsal examina el entorno inmediato, pero no encuentra nada interactuable.",
            relatedEvidenceIds: [],
          })
        );
        notebook.addActivityLog({
          type: "percepción",
          severity: "leve",
          text: ExplorationAwarenessSystem.buildCurrentObservation({
            ...state,
            notebook,
          }),
        });

        const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
          {
            ...state,
            notebook,
          },
          5
        );
        return {
          ...state,
          ...flowChanges,
          notebook: flowChanges.notebook || notebook,
        };
      }

      if (entity.interactionType === "evidence") {
        const evidence = state.evidenceDatabase.find((item) => item.id === entity.linkedId);
        const alreadyDiscovered = state.notebook.evidences.some(
          (item) => item.id === entity.linkedId
        );

        if (!evidence || !evidence.canBeFound(state)) return state;

        if (alreadyDiscovered) {
          const notebook = cloneNotebook(state.notebook);
          notebook.addNote(
            new Note({
              id: createId("note"),
              text: `El corresponsal vuelve a examinar ${evidence.title}, pero no encuentra nada nuevo.`,
              relatedEvidenceIds: [evidence.id],
            })
          );
          const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
            {
              ...state,
              notebook,
            },
            5
          );
          return {
            ...state,
            ...flowChanges,
            notebook: flowChanges.notebook || notebook,
            evidenceInspection: {
              isOpen: true,
              evidenceId: evidence.id,
              sourceId: evidence.sourceLinks?.[0]?.sourceId || null,
              notes: EvidenceInspectionSystem.buildInspectionNotes(evidence),
            },
          };
        }

        const notebook = cloneNotebook(state.notebook);
        notebook.addEvidence(new Evidence({ ...evidence, discovered: true }));

        const alreadyHasAutoHypothesis = (notebook.hypotheses || []).some((hypothesis) =>
          hypothesis.tags?.includes("auto_generated")
        );
        const autoHypothesis = AutoWritingSystem.buildHypothesisFromNotebook(notebook);
        if (autoHypothesis && !alreadyHasAutoHypothesis) {
          notebook.addHypothesis(autoHypothesis);
          notebook.addCaseEvent({
            type: "investigation_progress",
            title: "Hipótesis inicial generada",
            severity: "leve",
            text: "El cuaderno formuló una primera hipótesis a partir de la evidencia encontrada en el mapa.",
          });
        }

        notebook.addNote(
          new Note({
            id: createId("note"),
            text: `Evidencia examinada en el mapa: ${evidence.title}.`,
            relatedEvidenceIds: [evidence.id],
          })
        );
        const contradictionScan = AutomaticContradictionSystem.apply(
          notebook,
          state.notebook.activeCase
        );
        const contradictionModalUpdate = queueOrOpenContradictionModal(
          {
            ...state,
            evidenceInspection: {
              isOpen: true,
              evidenceId: evidence.id,
              sourceId: evidence.sourceLinks?.[0]?.sourceId || null,
              notes: EvidenceInspectionSystem.buildInspectionNotes(evidence),
            },
          },
          contradictionScan.createdContradictions
        );
        const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
          {
            ...state,
            notebook: contradictionScan.notebook,
          },
          15
        );
        return {
          ...state,
          ...flowChanges,
          notebook: flowChanges.notebook || contradictionScan.notebook,
          ...contradictionModalUpdate,
          evidenceInspection: {
            isOpen: true,
            evidenceId: evidence.id,
            sourceId: evidence.sourceLinks?.[0]?.sourceId || null,
            notes: EvidenceInspectionSystem.buildInspectionNotes(evidence),
          },
          lastMapMessage: contradictionScan.createdContradictions.length > 0
            ? "El cuaderno detectó una contradicción automática entre fuentes."
            : "Evidencia registrada en el cuaderno.",
        };
      }

      if (entity.interactionType === "dialogue") {
        const npc = state.npcs.find((item) => item.id === entity.linkedId);
        const firstDialogueId = npc?.dialogueIds?.[0] || null;
        const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(state, 5);
        return {
          ...state,
          ...flowChanges,
          dialogueModal: {
            isOpen: true,
            npcId: entity.linkedId,
            dialogueId: firstDialogueId,
          },
          lastMapMessage:
            flowChanges.lastMapMessage ||
            `El corresponsal se acerca a ${entity.label}.`,
        };
      }

      return state;
    }

    case ACTIONS.SET_ACTIVE_CASE: {
      const caseId = action.payload?.id;
      if (!caseId) return state;

      const nextCases = state.cases.map((caseFile) => {
        const nextCase = new CaseFile(caseFile);
        if (nextCase.id === caseId && nextCase.status === "available") {
          nextCase.activate();
        }
        return nextCase;
      });

      const selectedCase = nextCases.find((caseFile) => caseFile.id === caseId);

      if (!selectedCase || !["active", "available"].includes(selectedCase.status)) {
        return {
          ...state,
          lastMapMessage: "La investigación ya no está disponible para ser iniciada.",
        };
      }

      if (selectedCase.status === "available") {
        selectedCase.activate();
      }

      const notebook = cloneNotebook(state.notebook);
      notebook.setActiveCase(selectedCase);
      notebook.addCaseEvent({
        type: "case_activated",
        title: selectedCase.title,
        severity: "leve",
        text: "El corresponsal comienza oficialmente la investigación histórica.",
      });

      return {
        ...state,
        notebook,
        cases: nextCases,
      };
    }

    case ACTIONS.SET_FLAG: {
      return {
        ...state,
        flags: {
          ...state.flags,
          [action.payload.key]: action.payload.value,
        },
      };
    }

    case ACTIONS.MOVE_TO_LOCATION: {
      const locationId = action.payload?.locationId;
      const minutes = Number(action.payload?.minutes) || 20;

      if (!locationId) return state;

      const factionEffects = FactionMemorySystem.getGameplayEffects(state.factionMemory || {});
      if (factionEffects.armyAccessBlocked && locationId === "loc_command") {
        return {
          ...state,
          lastMapMessage: "El ejército recuerda tus publicaciones y bloquea el acceso al puesto de mando.",
        };
      }

      if (factionEffects.medicRefusesHelp && locationId === "loc_medical") {
        return {
          ...state,
          lastMapMessage: "El personal médico evita colaborar contigo por desconfianza acumulada.",
        };
      }

      const restrictions = CensorshipSystem.getGameplayRestrictions(state.worldState, state.flags);
      if (restrictions.restrictedMovement && locationId === "loc_no_mans_land") {
        return {
          ...state,
          lastMapMessage: "La presión militar restringe el acceso a tierra de nadie.",
        };
      }

      const currentMap = AsciiMapEngine.getCurrentMap({
        ...state,
        currentLocationId: locationId,
      });

      const preferredPosition = AsciiMapEngine.getStartPositionForLocation(locationId);
      const safePosition = AsciiMapEngine.findNearestWalkablePosition(
        currentMap,
        preferredPosition,
        state
      );

      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        {
          ...state,
          currentLocationId: locationId,
        },
        Math.max(0, minutes)
      );

      return {
        ...state,
        ...flowChanges,
        currentLocationId: locationId,
        playerPosition: safePosition,
      };
    }

    case ACTIONS.ADVANCE_TIME: {
      const flowChanges = GameFlowSystem.advanceTimeWithAmbientEvents(
        state,
        action.payload
      );

      return {
        ...state,
        ...flowChanges,
      };
    }

    case ACTIONS.TRIGGER_BOMBARDMENT: {
      if (state.bombardmentEffect?.active) return state;

      const bombardment = BombardmentSystem.buildEvent(
        state.currentLocationId,
        state.time,
        state.worldState
      );
      const impactResult = BombardmentSystem.applyImpactToMap(state, bombardment);
      const stressResult = NarrativeStressSystem.applyStress({
        player: state.player,
        notebook: state.notebook,
        amount: bombardment.stress,
        reason: "bombardment",
        eventType: "bombardment",
      });
      const player = stressResult.player;
      const notebook = stressResult.notebook;
      notebook.addCaseEvent({
        type: "ambient_bombardment",
        title: "Bombardeo ambiental",
        severity: bombardment.severity,
        text:
          impactResult.casualties.length > 0
            ? `${bombardment.message} La tierra tiembla y la explosión alcanza a ${impactResult.casualties.length} soldado(s) ambiental(es).`
            : bombardment.intensity === "cercano"
              ? `${bombardment.message} La tierra tiembla bajo las botas y el oído queda tomado por un zumbido seco.`
              : `${bombardment.message} La vibración llega tarde, como si el suelo recordara el golpe antes que el cuerpo.`,
      });

      notebook.addActivityLog({
        type: "percepción",
        severity: bombardment.severity,
        text:
          impactResult.casualties.length > 0
            ? "Tras el impacto, aparecen gritos y movimientos urgentes de camilleros en la línea."
            : bombardment.intensity === "cercano"
              ? "El estallido cercano deja al corresponsal momentáneamente ensordecido; la trinchera parece doblarse con el golpe."
              : "Un bombardeo lejano hace temblar apenas los tablones y corta la conversación por unos segundos.",
      });

      return {
        ...state,
        asciiMaps: impactResult.asciiMaps,
        player,
        notebook,
        bombardmentEffect: {
          active: true,
          message: impactResult.casualties.length > 0
            ? `${bombardment.message} Hay gritos en la línea.`
            : bombardment.message,
          intensity: bombardment.intensity,
          shakeMs: bombardment.shakeMs,
          startedAt: Date.now(),
          impact: impactResult.impact,
        },
        lastMapMessage: impactResult.casualties.length > 0
          ? "La bomba abrió un cráter y alcanzó a soldados ambientales."
          : bombardment.message,
      };
    }

    case ACTIONS.CLEAR_BOMBARDMENT_EFFECT: {
      return {
        ...state,
        bombardmentEffect: initialBombardmentEffect,
      };
    }

    case ACTIONS.SAVE_GAME: {
      const stateToSave = {
        ...state,
        notebook: NotebookIntegritySystem.repairIfNeeded(state.notebook, "before_save"),
        evidenceInspection: initialInspectionState,
        dialogueModal: initialDialogueModalState,
        contradictionModal: initialContradictionModalState,
        pendingContradictionModal: null,
        bombardmentEffect: initialBombardmentEffect,
        notebookOpen: false,
      };
      const saved = SaveSystem.save(stateToSave);
      return {
        ...state,
        lastSaveMessage: saved
          ? "Partida guardada correctamente."
          : "No se pudo guardar la partida en este navegador.",
      };
    }

    case ACTIONS.LOAD_GAME: {
      const savedState = SaveSystem.load();
      if (!savedState) {
        return {
          ...state,
          lastSaveMessage: "No hay una partida guardada para cargar.",
        };
      }

      return {
        ...rebuildState(savedState),
        lastSaveMessage: "Partida cargada correctamente.",
      };
    }

    case ACTIONS.CLEAR_SAVE: {
      const cleared = SaveSystem.clear();
      return {
        ...state,
        lastSaveMessage: cleared
          ? "Partida guardada eliminada."
          : "No se pudo borrar el guardado en este navegador.",
      };
    }

    default:
      return state;
  }
}

function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const previousAudioStateRef = React.useRef({
    notebookOpen: initialState.notebookOpen,
    evidenceOpen: initialState.evidenceInspection?.isOpen,
    dialogueOpen: initialState.dialogueModal?.isOpen,
    contradictionOpen: initialState.contradictionModal?.isOpen,
    bombardmentActive: initialState.bombardmentEffect?.active,
  });

  React.useEffect(() => {
    const previous = previousAudioStateRef.current;
    const visualSettings = VisualSettingsSystem.normalize(state.visualSettings);

    if (!previous.notebookOpen && state.notebookOpen) {
      AudioSystem.play("notebook_open", visualSettings);
    }

    if (previous.notebookOpen && !state.notebookOpen) {
      AudioSystem.play("notebook_close", visualSettings);
    }

    if (!previous.evidenceOpen && state.evidenceInspection?.isOpen) {
      AudioSystem.play("evidence_found", visualSettings);
    }

    if (!previous.dialogueOpen && state.dialogueModal?.isOpen) {
      AudioSystem.play("dialogue_open", visualSettings);
    }

    if (!previous.contradictionOpen && state.contradictionModal?.isOpen) {
      AudioSystem.play("contradiction_detected", visualSettings);
    }

    if (!previous.bombardmentActive && state.bombardmentEffect?.active) {
      AudioSystem.play(
        AudioSystem.getBombardmentSoundForEffect(state.bombardmentEffect),
        visualSettings
      );
    }

    previousAudioStateRef.current = {
      notebookOpen: state.notebookOpen,
      evidenceOpen: state.evidenceInspection?.isOpen,
      dialogueOpen: state.dialogueModal?.isOpen,
      contradictionOpen: state.contradictionModal?.isOpen,
      bombardmentActive: state.bombardmentEffect?.active,
    };
  }, [
    state.notebookOpen,
    state.evidenceInspection?.isOpen,
    state.dialogueModal?.isOpen,
    state.contradictionModal?.isOpen,
    state.bombardmentEffect?.active,
    state.visualSettings,
  ]);

  React.useEffect(() => {
    const visualSettings = VisualSettingsSystem.normalize(state.visualSettings);
    const musicId = AudioSystem.getMusicForState(state);
    AudioSystem.playMusic(musicId, visualSettings);
  }, [state.screen, state.notebookOpen, state.time?.hour, state.visualSettings]);

  React.useEffect(() => {
    return () => AudioSystem.stopMusic();
  }, []);

  const value = useMemo(
    () => ({
      state,
      actions: {
        goToScreen: (screen) => dispatch({ type: ACTIONS.GO_TO_SCREEN, payload: screen }),
        createPlayer: (playerData) => dispatch({ type: ACTIONS.CREATE_PLAYER, payload: playerData }),
        addEvidence: (evidence) =>
          dispatch({ type: ACTIONS.ADD_EVIDENCE, payload: evidence }),
        applySourceFlag: (evidenceId, flag) =>
          dispatch({
            type: ACTIONS.APPLY_SOURCE_FLAG,
            payload: { evidenceId, flag },
          }),
        addNote: (text, relatedEvidenceIds = [], tags = [], preventDuplicateTag = "", options = {}) =>
          dispatch({
            type: ACTIONS.ADD_NOTE,
            payload: { text, relatedEvidenceIds, tags, preventDuplicateTag, ...options },
          }),
        addContradiction: (payload) => dispatch({ type: ACTIONS.ADD_CONTRADICTION, payload }),
        addHypothesis: (payload) => dispatch({ type: ACTIONS.ADD_HYPOTHESIS, payload }),
        addSupportingEvidenceToHypothesis: (hypothesisId, evidenceId) =>
          dispatch({
            type: ACTIONS.ADD_SUPPORTING_EVIDENCE_TO_HYPOTHESIS,
            payload: { hypothesisId, evidenceId },
          }),
        addOpposingEvidenceToHypothesis: (hypothesisId, evidenceId) =>
          dispatch({
            type: ACTIONS.ADD_OPPOSING_EVIDENCE_TO_HYPOTHESIS,
            payload: { hypothesisId, evidenceId },
          }),
        addArticle: (payload) => dispatch({ type: ACTIONS.ADD_ARTICLE, payload }),
        addReconstruction: (payload) =>
          dispatch({ type: ACTIONS.ADD_RECONSTRUCTION, payload }),
        changeStress: (amount, reason = "front", eventType = null) =>
          dispatch({
            type: ACTIONS.CHANGE_STRESS,
            payload: amount,
            reason,
            eventType,
          }),
        restInSafeZone: (amount = 6, minutes = 45) =>
          dispatch({
            type: ACTIONS.REST_IN_SAFE_ZONE,
            payload: { amount, minutes },
          }),
        talkToMedicalStaff: (amount = 4, minutes = 25) =>
          dispatch({
            type: ACTIONS.TALK_TO_MEDICAL_STAFF,
            payload: { amount, minutes },
          }),
        writePersonalNote: (amount = 3, minutes = 15) =>
          dispatch({
            type: ACTIONS.WRITE_PERSONAL_NOTE,
            payload: { amount, minutes },
          }),
        sleepForHours: (amount = 12, minutes = 240) =>
          dispatch({
            type: ACTIONS.SLEEP_FOR_HOURS,
            payload: { amount, minutes },
          }),
        useCivilianShelter: (amount = 10, minutes = 120) =>
          dispatch({
            type: ACTIONS.USE_CIVILIAN_SHELTER,
            payload: { amount, minutes },
          }),
        useMedicalProtection: (amount = 8, minutes = 60) =>
          dispatch({
            type: ACTIONS.USE_MEDICAL_PROTECTION,
            payload: { amount, minutes },
          }),
        registerTraumaticExposure: (payload) =>
          dispatch({
            type: ACTIONS.REGISTER_TRAUMATIC_EXPOSURE,
            payload,
          }),
        changeReputation: (faction, amount) =>
          dispatch({ type: ACTIONS.CHANGE_REPUTATION, payload: { faction, amount } }),
        changeWorldState: (changes) =>
          dispatch({ type: ACTIONS.CHANGE_WORLD_STATE, payload: changes }),
        changeFactionMemory: (changes) =>
          dispatch({ type: ACTIONS.CHANGE_FACTION_MEMORY, payload: changes }),
        applyArticleConsequences: (articleId) =>
          dispatch({ type: ACTIONS.APPLY_ARTICLE_CONSEQUENCES, payload: { articleId } }),
        reviewArticleForCensorship: (articleId) =>
          dispatch({ type: ACTIONS.REVIEW_ARTICLE_FOR_CENSORSHIP, payload: { articleId } }),
        forcePublishArticle: (articleId) =>
          dispatch({ type: ACTIONS.FORCE_PUBLISH_ARTICLE, payload: { articleId } }),
        softenArticle: (articleId) =>
          dispatch({ type: ACTIONS.SOFTEN_ARTICLE, payload: { articleId } }),
        applyReconstructionConsequences: (reconstructionId) =>
          dispatch({
            type: ACTIONS.APPLY_RECONSTRUCTION_CONSEQUENCES,
            payload: { reconstructionId },
          }),
        setFlag: (key, value = true) =>
          dispatch({ type: ACTIONS.SET_FLAG, payload: { key, value } }),
        moveToLocation: (locationId, minutes = 20) =>
          dispatch({ type: ACTIONS.MOVE_TO_LOCATION, payload: { locationId, minutes } }),
        movePlayerOnAsciiMap: (dx, dy) => {
          const currentMap = AsciiMapEngine.getCurrentMap(state);
          const nextPosition = currentMap
            ? {
                x: state.playerPosition.x + dx,
                y: state.playerPosition.y + dy,
              }
            : null;
          const movementWillHappen = Boolean(
            currentMap &&
            nextPosition &&
            AsciiMapEngine.canMoveTo(currentMap, nextPosition.x, nextPosition.y, state)
          );

          if (movementWillHappen) {
            const destinationTileChar = currentMap.getTileChar(nextPosition.x, nextPosition.y);
            AudioSystem.play(
              AudioSystem.getStepSoundForTile(destinationTileChar),
              state.visualSettings
            );
          }

          dispatch({ type: ACTIONS.MOVE_PLAYER_ON_ASCII_MAP, payload: { dx, dy } });
        },
        interactAsciiEntity: () =>
          dispatch({ type: ACTIONS.INTERACT_ASCII_ENTITY }),
        openEvidenceInspection: (evidenceId, options = {}) =>
          dispatch({
            type: ACTIONS.OPEN_EVIDENCE_INSPECTION,
            payload: { evidenceId, ...options },
          }),
        closeEvidenceInspection: () =>
          dispatch({ type: ACTIONS.CLOSE_EVIDENCE_INSPECTION }),
        openDialogueModal: (npcId, dialogueId) =>
          dispatch({
            type: ACTIONS.OPEN_DIALOGUE_MODAL,
            payload: { npcId, dialogueId },
          }),
        setDialogueModalDialogue: (dialogueId) =>
          dispatch({
            type: ACTIONS.SET_DIALOGUE_MODAL_DIALOGUE,
            payload: { dialogueId },
          }),
        selectDialogueChoice: (choiceId) => {
          AudioSystem.play("dialogue_choice", state.visualSettings);
          dispatch({
            type: ACTIONS.SELECT_DIALOGUE_CHOICE,
            payload: { choiceId },
          });
        },
        closeDialogueModal: () =>
          dispatch({ type: ACTIONS.CLOSE_DIALOGUE_MODAL }),
        closeContradictionModal: () =>
          dispatch({ type: ACTIONS.CLOSE_CONTRADICTION_MODAL }),
        advanceTime: (minutes = 10) =>
          dispatch({ type: ACTIONS.ADVANCE_TIME, payload: minutes }),
        setActiveCase: (caseFile) =>
          dispatch({ type: ACTIONS.SET_ACTIVE_CASE, payload: { id: caseFile?.id } }),
        triggerBombardment: () => dispatch({ type: ACTIONS.TRIGGER_BOMBARDMENT }),
        clearBombardmentEffect: () =>
          dispatch({ type: ACTIONS.CLEAR_BOMBARDMENT_EFFECT }),
        closeCaseClosureModal: () =>
          dispatch({ type: ACTIONS.CLOSE_CASE_CLOSURE_MODAL }),
        toggleNotebook: (open = undefined) =>
          dispatch({ type: ACTIONS.TOGGLE_NOTEBOOK, payload: open }),
        saveGame: () => dispatch({ type: ACTIONS.SAVE_GAME }),
        loadGame: () => dispatch({ type: ACTIONS.LOAD_GAME }),
        clearSave: () => dispatch({ type: ACTIONS.CLEAR_SAVE }),
        setRenderMode: () =>
          dispatch({ type: ACTIONS.SET_RENDER_MODE, payload: { renderMode: "sprites" } }),
        cycleRenderMode: () =>
          dispatch({ type: ACTIONS.SET_RENDER_MODE, payload: { renderMode: "sprites" } }),
        toggleAudio: () => dispatch({ type: ACTIONS.TOGGLE_AUDIO }),
      },
    }),
    [state]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame debe usarse dentro de GameProvider");
  }
  return context;
}

// =========================================================
// COMPONENTES DE PANTALLA TEMPORALES
// =========================================================

function MenuScreen() {
  const { state, actions } = useGame();
  return (
    <main className="min-h-screen bg-stone-950 text-stone-200 flex items-center justify-center p-6">
      <section className="max-w-3xl w-full border border-stone-700 bg-stone-900/80 rounded-2xl shadow-2xl p-8">
        <p className="uppercase tracking-[0.35em] text-xs text-stone-500 mb-4">Archivo militar / Frente occidental</p>
        <h1 className="text-4xl md:text-6xl font-serif mb-3">La Batalla de Somme</h1>
        <p className="text-stone-400 leading-relaxed mb-8">
          Un juego narrativo de investigación histórica. No se trata de ganar una batalla, sino de reconstruir lo que ocurrió entre testimonios, documentos, silencios y contradicciones.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="px-5 py-3 rounded-xl bg-stone-200 text-stone-950 font-semibold hover:bg-white transition"
            onClick={() => actions.goToScreen("CHARACTER_CREATION")}
          >
            Nueva partida
          </button>

          <button
            className="px-5 py-3 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 transition"
            onClick={() => actions.loadGame()}
          >
            Cargar partida
          </button>

          <button
            className="px-5 py-3 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 transition"
            onClick={() => actions.goToScreen("HISTORICAL_ARCHIVES")}
          >
            Archivos históricos
          </button>

          <button
            className="px-5 py-3 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 transition"
            onClick={() => actions.goToScreen("OPTIONS")}
          >
            Opciones
          </button>

          <button
            className="px-5 py-3 rounded-xl border border-red-900 text-red-300 hover:bg-red-950/30 transition"
            onClick={() => actions.clearSave()}
          >
            Borrar guardado
          </button>
        </div>

        {state.lastSaveMessage && (
          <p className="mt-5 text-sm text-stone-500">{state.lastSaveMessage}</p>
        )}
      </section>
    </main>
  );
}

function OptionsScreen() {
  const { state, actions } = useGame();
  const visualSettings = VisualSettingsSystem.normalize(state.visualSettings);
  const renderModeLabel = VisualSettingsSystem.getRenderModeLabel();

  return (
    <main className="min-h-screen bg-stone-950 text-stone-200 flex items-center justify-center p-6">
      <section className="max-w-3xl w-full border border-stone-700 bg-stone-900/80 rounded-2xl shadow-2xl p-8">
        <p className="uppercase tracking-[0.35em] text-xs text-stone-500 mb-4">
          Configuración previa
        </p>
        <h1 className="text-4xl md:text-5xl font-serif mb-3">Opciones</h1>
        <p className="text-stone-400 leading-relaxed mb-8">
          Ajustá la presentación antes de iniciar o cargar una partida. El ASCII permanece siempre como base y respaldo.
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border border-stone-800 bg-stone-950/45 p-4">
            <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Modo visual</p>
            <p className="text-sm text-stone-400 mb-3">
              Actual: <span className="text-stone-200">{renderModeLabel}</span>
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              El juego intenta mostrar sprites cuando existen archivos .png. Si una imagen falta, no carga o falla, la celda conserva su carácter ASCII como respaldo. No hace falta elegir entre modos visuales.
            </p>
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-950/45 p-4">
            <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Sonido y música</p>
            <p className="text-sm text-stone-400 mb-3">
              Estado: <span className="text-stone-200">{visualSettings.audioEnabled ? "activado" : "desactivado"}</span>
            </p>
            <button
              className="px-3 py-2 rounded-lg border border-stone-700 text-xs text-stone-300 hover:bg-stone-800 transition"
              onClick={() => actions.toggleAudio()}
            >
              {visualSettings.audioEnabled ? "Desactivar sonido y música" : "Activar sonido y música"}
            </button>
            <p className="text-xs text-stone-600 mt-3 leading-relaxed">
              La carpeta <span className="text-stone-400">public/audio</span> ya está preparada para efectos y música. Si un archivo .mp3 falta o el navegador lo bloquea, la partida continúa.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            className="px-5 py-3 rounded-xl bg-stone-200 text-stone-950 font-semibold hover:bg-white transition"
            onClick={() => actions.goToScreen("MENU")}
          >
            Volver al menú
          </button>
        </div>
      </section>
    </main>
  );
}

function CharacterCreationScreen() {
  const { actions } = useGame();
  const [form, setForm] = React.useState({
    name: "",
    age: "34",
    gender: "masculino",
    nationality: "británica",
    profile: "neutral",
  });

  const profiles = {
    neutral: {
      label: "Observador neutral",
      description: "Autorizado a registrar hechos con prudencia y distancia.",
    },
    patriotico: {
      label: "Corresponsal patriótico",
      description: "Mayor cercanía al mando militar, menor confianza entre soldados agotados.",
    },
    humanitario: {
      label: "Cronista humanitario",
      description: "Prioriza heridos, civiles y testimonios directos del sufrimiento.",
    },
    ambicioso: {
      label: "Enviado ambicioso",
      description: "Busca una gran historia, incluso si eso aumenta riesgos y tensiones.",
    },
  };

  const portraitSex =
    form.gender === "femenino" ? "female" : form.gender === "masculino" ? "male" : "unknown";

  const portraitNpc = form.portraitSeed
    ? {
        id: "player_correspondent",
        name: form.name.trim() || "Corresponsal",
        sex: portraitSex,
        gasMask: false,
        portraitSeed: form.portraitSeed,
        asciiPortrait: {
          sex: portraitSex,
          gasMask: false,
          seed: form.portraitSeed,
        },
      }
    : null;

  function makePortraitSeed(gender = form.gender) {
    const safeGender = String(gender || "corresponsal")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .toLowerCase();
    return `player_${safeGender}_${Date.now()}`;
  }

  const canCreate =
    form.name.trim().length >= 2 &&
    form.age &&
    form.gender &&
    form.nationality &&
    form.profile;

  function updateField(field, value) {
    setForm((current) => {
      if (field === "gender") {
        return {
          ...current,
          [field]: value,
          portraitSeed: current.portraitSeed ? makePortraitSeed(value) : current.portraitSeed,
        };
      }
      return { ...current, [field]: value };
    });
  }

  function generateCorrespondentPortrait() {
    setForm((current) => ({
      ...current,
      portraitSeed: makePortraitSeed(current.gender),
    }));
  }

  function createPlayer() {
    if (!canCreate) return;

    const finalPortraitSeed = form.portraitSeed || makePortraitSeed(form.gender);
    const finalPortraitSex =
      form.gender === "femenino" ? "female" : form.gender === "masculino" ? "male" : "unknown";

    const playerData = {
      ...form,
      name: form.name.trim(),
      portraitSeed: finalPortraitSeed,
      asciiPortrait: {
        sex: finalPortraitSex,
        gasMask: false,
        seed: finalPortraitSeed,
      },
    };

    actions.createPlayer(playerData);
    actions.goToScreen("GAMEPLAY");
  }

  const portraitLabel =
    form.gender === "femenino"
      ? "Retrato de corresponsal femenina"
      : form.gender === "masculino"
        ? "Retrato de corresponsal masculino"
        : "Retrato del corresponsal";

  return (
    <main className="h-screen bg-stone-950 text-stone-200 flex items-center justify-center p-3 overflow-hidden">
      <section className="w-[min(1160px,calc(100vw-1.5rem))] h-[calc(100vh-1.5rem)] max-h-[760px] border border-stone-700 bg-stone-900/85 rounded-2xl shadow-2xl overflow-hidden">
        <div className="grid grid-cols-[280px_1fr] h-full min-h-0">
          <aside className="border-r border-stone-800 bg-stone-950/70 p-4 flex flex-col gap-3 min-h-0 overflow-hidden">
            <div>
              <p className="uppercase tracking-[0.35em] text-[10px] text-stone-500 mb-2">
                Ejército británico / Prensa acreditada
              </p>
              <h2 className="text-xl font-serif leading-tight">Permiso de acceso al frente</h2>
              <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                Formulario de autorización para circular por sectores restringidos del Somme.
              </p>
            </div>

            <div className="rounded-xl border border-stone-700 bg-black/50 p-3 min-h-0">
              <div className="h-[245px] rounded-lg border border-dashed border-stone-600 bg-stone-900/80 flex items-center justify-center text-center p-3 overflow-hidden">
                {portraitNpc ? (
                  <AsciiPortraitSlot
                    npc={portraitNpc}
                    slotId="playerPortraitSlot"
                    variant="card"
                  />
                ) : (
                  <div>
                    <div className="mx-auto mb-3 h-16 w-16 rounded-full border border-stone-600 bg-stone-800 flex items-center justify-center text-3xl">
                      {form.gender === "femenino" ? "♀" : form.gender === "masculino" ? "♂" : "?"}
                    </div>
                    <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Imagen pendiente</p>
                    <p className="text-xs text-stone-600 mt-2 leading-relaxed">{portraitLabel}</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={generateCorrespondentPortrait}
                className="mt-3 w-full rounded-lg border border-amber-700/70 bg-amber-950/20 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-900/30 transition"
              >
                Foto
              </button>
            </div>

            <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-3 text-xs text-stone-500 leading-relaxed">
              <p className="uppercase tracking-[0.25em] text-stone-600 mb-2">Advertencia</p>
              El portador de esta autorización podrá ser sometido a censura, vigilancia militar o confiscación de notas.
            </div>
          </aside>

          <div className="p-4 min-h-0 overflow-hidden flex flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-3 mb-4">
              <div>
                <p className="uppercase tracking-[0.3em] text-xs text-stone-500 mb-1">Formulario oficial</p>
                <h1 className="text-2xl font-serif">Credencial de corresponsal de guerra</h1>
              </div>
              <div className="text-right text-xs text-stone-600 leading-relaxed">
                <p>Sector: Somme</p>
                <p>Año: 1916</p>
                <p>Campaña: Somme</p>
                <p>Estado: pendiente de firma</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-stone-500">Nombre completo</span>
                <input
                  className="mt-1 w-full rounded-lg bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100 outline-none focus:border-stone-300"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Ejemplo: Thomas Avery"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-widest text-stone-500">Edad</span>
                <input
                  className="mt-1 w-full rounded-lg bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100 outline-none focus:border-stone-300"
                  value={form.age}
                  onChange={(event) => updateField("age", event.target.value)}
                  placeholder="34"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-widest text-stone-500">Género</span>
                <select
                  className="mt-1 w-full rounded-lg bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100 outline-none focus:border-stone-300"
                  value={form.gender}
                  onChange={(event) => updateField("gender", event.target.value)}
                >
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="no especificado">No especificado</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-widest text-stone-500">Nacionalidad</span>
                <select
                  className="mt-1 w-full rounded-lg bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100 outline-none focus:border-stone-300"
                  value={form.nationality}
                  onChange={(event) => updateField("nationality", event.target.value)}
                >
                  <option value="británica">Británica</option>
                  <option value="francesa">Francesa</option>
                  <option value="estadounidense">Estadounidense</option>
                  <option value="irlandesa">Irlandesa</option>
                  <option value="canadiense">Canadiense</option>
                  <option value="australiana">Australiana</option>
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-3 mb-3">
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-3">Tipo de autorización narrativa</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(profiles).map(([key, profile]) => {
                  const selected = form.profile === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`text-left rounded-lg border p-2 transition ${
                        selected
                          ? "border-stone-200 bg-stone-200 text-stone-950"
                          : "border-stone-700 bg-stone-950/50 text-stone-300 hover:bg-stone-800"
                      }`}
                      onClick={() => updateField("profile", key)}
                    >
                      <strong className="block text-xs mb-1">{profile.label}</strong>
                      <span className={selected ? "text-stone-800 text-[11px]" : "text-stone-500 text-[11px]"}>
                        {profile.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_220px] gap-4 items-stretch">
              <div className="rounded-xl border border-stone-800 bg-black/30 p-3 text-xs text-stone-500 leading-relaxed">
                <p className="uppercase tracking-[0.25em] text-stone-600 mb-2">Declaración</p>
                El solicitante declara conocer los riesgos del frente, acepta la revisión de sus artículos por autoridades militares y asume que toda fuente deberá ser contrastada antes de ser publicada.
              </div>
              <div className="rounded-xl border border-stone-800 bg-black/30 p-3 text-xs text-stone-500">
                <p className="uppercase tracking-[0.25em] text-stone-600 mb-3">Firma</p>
                <div className="h-12 border-b border-stone-600 flex items-end pb-1 text-stone-300">
                  {form.name || "________________"}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 items-center justify-between border-t border-stone-800 pt-4">
              <button
                className="px-5 py-2 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 transition"
                onClick={() => actions.goToScreen("MENU")}
              >
                Volver
              </button>
              <button
                className="px-5 py-2 rounded-xl bg-stone-200 text-stone-950 font-semibold hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!canCreate}
                onClick={createPlayer}
              >
                Autorizar corresponsal
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function IntroScreen() {
  const { state, actions } = useGame();

  return (
    <main className="min-h-screen bg-stone-950 text-stone-200 flex items-center justify-center p-6">
      <section className="max-w-3xl border border-stone-700 bg-stone-900/80 rounded-2xl p-8">
        <p className="text-stone-500 mb-3">Somme, 1916</p>
        <h2 className="text-3xl font-serif mb-4">La llegada al frente</h2>
        <p className="text-stone-300 leading-relaxed mb-4">
          {state.player.name} llega con una libreta, una credencial de prensa y demasiadas preguntas. La versión oficial habla de avance. Los hombres en la trinchera hablan de barro, humo y cuerpos que no regresaron.
        </p>
        <p className="text-stone-400 leading-relaxed mb-8">
          La tarea no será disparar. Será escuchar, comparar, escribir y decidir qué verdad puede atravesar la censura.
        </p>
        <button
          className="px-5 py-3 rounded-xl bg-stone-200 text-stone-950 font-semibold hover:bg-white transition"
          onClick={() => actions.goToScreen("GAMEPLAY")}
        >
          Entrar a la trinchera
        </button>
      </section>
    </main>
  );
}

function InspectionActionsPanel({ evidence }) {
  const { state, actions } = useGame();

  const observationAlreadyRegistered = state.notebook.hasNoteForEvidence?.(
    evidence.id,
    "inspection_observation"
  );
  const seedHypothesisAlreadyExists = state.notebook.hasHypothesisForEvidence?.(
    evidence.id,
    "seed_from_inspection"
  );

  const canRegisterObservation =
    typeof actions.addNote === "function" && !observationAlreadyRegistered;
  const canCreateHypothesis =
    typeof actions.addHypothesis === "function" && !seedHypothesisAlreadyExists;
  const canCloseInspection = typeof actions.closeEvidenceInspection === "function";

  function closeInspectionSafely() {
    if (canCloseInspection) {
      actions.closeEvidenceInspection();
    }
  }

  function registerObservation() {
    if (!canRegisterObservation) return;

    actions.addNote(
      `Observación sobre ${evidence.title}: ${evidence.description}`,
      [evidence.id],
      ["inspection_observation"],
      "inspection_observation",
      { consumeTime: true, minutes: 8 }
    );
    closeInspectionSafely();
  }

  function createHypothesisSeed() {
    if (!canCreateHypothesis) return;

    actions.addHypothesis({
      title: `Hipótesis inicial sobre ${evidence.title}`,
      text: `Esta evidencia podría ayudar a reconstruir qué ocurrió realmente. Su fiabilidad es ${evidence.reliability}, pero debe contrastarse con otros testimonios o documentos.`,
      supportingEvidenceIds: [evidence.id],
      opposingEvidenceIds: [],
      confidence: "provisoria",
      status: "abierta",
      createdFromEvidenceId: evidence.id,
      tags: ["seed_from_inspection"],
      preventDuplicateTag: "seed_from_inspection",
      consumeTime: true,
      minutes: 20,
    });
    closeInspectionSafely();
  }

  return (
    <div className="space-y-3 pt-2 border-t border-stone-800">
      {(!canRegisterObservation || !canCreateHypothesis || !canCloseInspection) && (
        <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3 text-xs text-stone-400">
          {!canCloseInspection && <p>La acción de cerrar inspección no está disponible.</p>}
          {observationAlreadyRegistered && <p>La observación de esta evidencia ya fue registrada.</p>}
          {seedHypothesisAlreadyExists && <p>La hipótesis inicial de esta evidencia ya existe.</p>}
          {!observationAlreadyRegistered && typeof actions.addNote !== "function" && (
            <p>La acción de registrar observación no está disponible.</p>
          )}
          {!seedHypothesisAlreadyExists && typeof actions.addHypothesis !== "function" && (
            <p>La acción de crear hipótesis no está disponible.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          className="px-3 py-2 rounded-lg bg-stone-200 text-stone-950 text-sm font-semibold hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!canRegisterObservation}
          onClick={registerObservation}
        >
          Registrar observación
        </button>
        <button
          className="px-3 py-2 rounded-lg border border-stone-700 text-sm hover:bg-stone-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!canCreateHypothesis}
          onClick={createHypothesisSeed}
        >
          Crear hipótesis inicial
        </button>
      </div>
    </div>
  );
}

function EvidenceInspectionPanel() {
  const { state, actions } = useGame();

  if (!state.evidenceInspection?.isOpen) return null;

  const evidence = state.evidenceDatabase.find(
    (item) => item.id === state.evidenceInspection.evidenceId
  );

  if (!evidence) return null;

  const source = state.sourceLibrary?.sources?.find(
    (item) => item.id === state.evidenceInspection.sourceId
  );

  const narrativeAtmosphere = NarrativeInspectionSystem.buildAtmosphere(evidence);

  const canCloseInspection = typeof actions.closeEvidenceInspection === "function";

  return (
    <div className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-stone-700 bg-black/95 p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500 mb-1">
            Inspección de evidencia
          </p>
          <h3 className="text-lg font-semibold text-stone-200">{evidence.title}</h3>
        </div>

        <button
          className="px-3 py-2 rounded-lg border border-stone-700 text-sm hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!canCloseInspection}
          onClick={() => actions.closeEvidenceInspection?.()}
        >
          Cerrar
        </button>
      </div>

      <div className="space-y-3 text-sm leading-relaxed">
        <div>
          <p className="text-stone-500 text-xs uppercase tracking-[0.2em] mb-1">
            Descripción
          </p>
          <p className="text-stone-300">{evidence.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-stone-500">
          <p>Tipo: {evidence.type}</p>
          <p>Fiabilidad: {evidence.reliability}</p>
          <p>Procedencia: {evidence.source}</p>
          <p>Estado: {state.notebook.evidences.some((item) => item.id === evidence.id) ? "registrada" : "sin registrar"}</p>
        </div>

        {state.evidenceInspection.notes?.length > 0 && (
          <div>
            <p className="text-stone-500 text-xs uppercase tracking-[0.2em] mb-1">
              Observaciones del corresponsal
            </p>
            <ul className="space-y-1 text-stone-400">
              {state.evidenceInspection.notes.map((note, index) => (
                <li key={index}>• {note}</li>
              ))}
            </ul>
          </div>
        )}

        {source && (
          <div>
            <p className="text-stone-500 text-xs uppercase tracking-[0.2em] mb-1">
              Fuente histórica
            </p>
            <p className="text-stone-300">{source.title}</p>
            <p className="text-xs text-stone-600 mt-1">
              La fuente completa se consulta fuera de la experiencia in game, en Archivos históricos.
            </p>
          </div>
        )}

        {narrativeAtmosphere.length > 0 && (
          <div>
            <p className="text-stone-500 text-xs uppercase tracking-[0.2em] mb-1">
              Impresiones del corresponsal
            </p>
            <ul className="space-y-1 text-stone-400 italic">
              {narrativeAtmosphere.map((line, index) => (
                <li key={index}>“{line}”</li>
              ))}
            </ul>
          </div>
        )}

        <InspectionActionsPanel evidence={evidence} />
      </div>
    </div>
  );
}


function AsciiPortraitSlot({ npc, slotId = "npcPortraitSlot", variant = "card" }) {
  const slotRef = React.useRef(null);

  React.useEffect(() => {
    const target = slotRef.current;
    const api = typeof window !== "undefined" ? window.AsciiPortraits : null;

    if (!target) return;
    target.innerHTML = "";

    if (!npc || !api) return;

    if (variant === "dialogue") {
      api.renderDialoguePortrait(npc, target);
    } else {
      api.renderNpcCardPortrait(npc, target);
    }
  }, [
    npc?.id,
    npc?.npcId,
    npc?.portraitSeed,
    npc?.sex,
    npc?.gender,
    npc?.gasMask,
    npc?.hasGasMask,
    npc?.asciiPortrait?.seed,
    npc?.asciiPortrait?.sex,
    npc?.asciiPortrait?.gasMask,
    variant,
  ]);

  return (
    <div
      id={slotId}
      ref={slotRef}
      className="ascii-portrait-react-slot min-h-[150px] overflow-hidden rounded-xl border border-amber-900/50 bg-black/40"
      aria-label={npc ? `Retrato ASCII de ${npc.name || npc.id || "NPC"}` : "Retrato ASCII de NPC"}
    />
  );
}

function NpcCardPortrait({ npc }) {
  return <AsciiPortraitSlot npc={npc} slotId="npcPortraitSlot" variant="card" />;
}

function DialogueNpcPortrait({ npc }) {
  return <AsciiPortraitSlot npc={npc} slotId="dialoguePortraitSlot" variant="dialogue" />;
}

function DialogueModal() {
  const { state, actions } = useGame();
  const choicesRef = React.useRef([]);
  const selectChoiceRef = React.useRef(null);
  const dialogueReadyRef = React.useRef(false);
  const actionsRef = React.useRef(actions);

  const isOpen = Boolean(state.dialogueModal?.isOpen);
  const npc = isOpen
    ? state.npcs.find((item) => item.id === state.dialogueModal.npcId)
    : null;
  const dialogue = isOpen
    ? state.dialogues.find((item) => item.id === state.dialogueModal.dialogueId)
    : null;

  function choiceIsAvailable(choice) {
    if (!choice?.conditions?.length) return true;
    return DialogueConditionSystem.all(choice.conditions, state);
  }

  function selectChoice(choice) {
    if (!choice || !dialogueReadyRef.current) return;
    actionsRef.current.selectDialogueChoice(choice.id);
  }

  function getDialogueChoiceNumber(event) {
    if (!event) return null;

    if (/^[1-9]$/.test(String(event.key || ""))) {
      return Number(event.key);
    }

    const code = String(event.code || "");
    const digitMatch = code.match(/^Digit([1-9])$/);
    if (digitMatch) return Number(digitMatch[1]);

    const numpadMatch = code.match(/^Numpad([1-9])$/);
    if (numpadMatch) return Number(numpadMatch[1]);

    return null;
  }

  const availableChoices = dialogue?.choices?.filter(choiceIsAvailable) || [];
  choicesRef.current = isOpen && npc && dialogue ? availableChoices : [];
  selectChoiceRef.current = selectChoice;
  dialogueReadyRef.current = Boolean(isOpen && npc && dialogue);

  React.useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  React.useEffect(() => {
    function handleDialogueNumberKey(event) {
      if (!dialogueReadyRef.current) return;
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const targetTag = event.target?.tagName?.toLowerCase();
      const typing = targetTag === "input" || targetTag === "textarea" || targetTag === "select";
      if (typing) return;

      const numericKey = getDialogueChoiceNumber(event);
      if (!numericKey) return;

      const selectedChoice = choicesRef.current[numericKey - 1];
      if (!selectedChoice) return;

      event.preventDefault();
      event.stopPropagation();
      selectChoiceRef.current?.(selectedChoice);
    }

    window.addEventListener("keydown", handleDialogueNumberKey, true);
    return () => window.removeEventListener("keydown", handleDialogueNumberKey, true);
  }, []);

  if (!isOpen || !npc || !dialogue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <article className="w-[min(860px,calc(100vw-2rem))] max-h-[85vh] overflow-hidden rounded-2xl border border-stone-700 bg-stone-950/95 p-5 shadow-2xl">
        <div className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
          <div className="rounded-xl border border-stone-800 bg-black/35 p-2">
            <DialogueNpcPortrait npc={npc} />
          </div>

          <div className="min-w-0">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500 mb-1">
                  Conversación
                </p>
                <h3 className="text-2xl font-serif text-stone-100">{npc.name}</h3>
                <p className="text-sm text-stone-500">{npc.role}</p>
              </div>
              <button
                className="px-3 py-2 rounded-lg border border-stone-700 text-sm hover:bg-stone-800"
                onClick={() => actions.closeDialogueModal()}
              >
                Cerrar
              </button>
            </div>

            <p className="text-stone-300 leading-relaxed mb-5 border-l border-stone-700 pl-4 italic">
              “{dialogue.text}”
            </p>

            <div className="space-y-2">
              {availableChoices.map((choice, index) => (
                <button
                  key={choice.id}
                  className="w-full text-left px-4 py-3 rounded-lg border border-stone-700 bg-stone-900/60 hover:bg-stone-800 transition text-sm"
                  onClick={() => selectChoice(choice)}
                >
                  <span className="mr-2 text-stone-500">{index + 1}.</span>
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function CaseClosureModal() {
  const { state, actions } = useGame();
  const modal = state.caseClosureModal;

  if (!modal?.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <article className="w-[min(760px,calc(100vw-2rem))] max-h-[85vh] overflow-y-auto rounded-2xl border border-amber-800 bg-stone-950/95 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-400 mb-1">
              Expediente finalizado
            </p>
            <h3 className="text-3xl font-serif text-stone-100">{modal.resultTitle || "Caso cerrado"}</h3>
            <p className="text-sm text-stone-500 mt-1">{modal.caseTitle}</p>
          </div>
          <button
            className="px-3 py-2 rounded-lg border border-stone-700 text-sm hover:bg-stone-800"
            onClick={() => actions.closeCaseClosureModal()}
          >
            Cerrar
          </button>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 mb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
            Artículo publicado
          </p>
          <h4 className="font-semibold text-stone-100">{modal.articleTitle}</h4>
          <p className="text-xs text-stone-500 mt-1">Línea editorial: {modal.articleTone}</p>
          <p className="text-sm text-stone-300 leading-relaxed mt-3">{modal.summary}</p>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
            Consecuencias registradas
          </p>
          {modal.consequences?.length ? (
            <ul className="space-y-2 text-sm text-stone-300">
              {modal.consequences.map((item, index) => (
                <li key={index}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500 italic">No se registraron consecuencias adicionales.</p>
          )}
        </div>

        <p className="text-xs text-stone-600 mt-4 leading-relaxed">
          El caso queda marcado como resuelto. Podés seguir explorando el frente, revisar el cuaderno o avanzar hacia nuevos expedientes.
        </p>
      </article>
    </div>
  );
}

function ContradictionModal() {
  const { state, actions } = useGame();

  if (!state.contradictionModal?.isOpen) return null;

  const contradiction = state.notebook.contradictions.find(
    (item) => item.id === state.contradictionModal.contradictionId
  );

  if (!contradiction) return null;

  const relatedEvidence = (contradiction.evidenceIds || [])
    .map((id) => state.notebook.evidences.find((evidence) => evidence.id === id))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <article className="w-[min(720px,calc(100vw-2rem))] max-h-[85vh] overflow-y-auto rounded-2xl border border-red-900 bg-stone-950/95 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-400 mb-1">
              Contradicción detectada
            </p>
            <h3 className="text-2xl font-serif text-stone-100">{contradiction.title}</h3>
            <p className="text-xs text-stone-600 mt-1">Severidad: {contradiction.severity}</p>
          </div>
          <button
            className="px-3 py-2 rounded-lg border border-stone-700 text-sm hover:bg-stone-800"
            onClick={() => actions.closeContradictionModal()}
          >
            Cerrar
          </button>
        </div>

        <p className="text-stone-300 leading-relaxed mb-4">
          {contradiction.description}
        </p>

        {relatedEvidence.length > 0 && (
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
              Evidencias relacionadas
            </p>
            <ul className="space-y-1 text-sm text-stone-400">
              {relatedEvidence.map((evidence) => (
                <li key={evidence.id}>• {evidence.title}</li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  );
}

function TacticalCompass() {
  const { state } = useGame();
  const entries = CompassSystem.getCompassEntries(state.playerPosition, state.flags);

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3 mt-4">
      <p className="text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
        Brújula táctica del frente
      </p>
      <div className="font-mono text-xs text-stone-400 leading-relaxed">
        <div className="text-stone-600">╔══════════════════════════════════════╗</div>
        {entries.map((entry) => (
          <div key={entry.id}>
            <span className="text-stone-600">║ </span>
            <span className="text-yellow-500 inline-block w-8">{entry.direction}</span>
            <span className="text-stone-600"> → </span>
            <span className="text-stone-300">{entry.label}</span>
            <span className="text-stone-600"> · </span>
            <span className="text-stone-500">{entry.distanceLabel}</span>
          </div>
        ))}
        <div className="text-stone-600">╚══════════════════════════════════════╝</div>
      </div>
    </div>
  );
}

function CombatVisualStyles() {
  return (
    <style>{`
      .typewriter-ui,
      .typewriter-ui button,
      .typewriter-ui input,
      .typewriter-ui select,
      .typewriter-ui textarea {
        font-family: "Courier New", "Lucida Console", "IBM Plex Mono", monospace;
        letter-spacing: 0.01em;
      }

      .typewriter-ui h1,
      .typewriter-ui h2,
      .typewriter-ui h3,
      .typewriter-ui h4,
      .typewriter-ui .font-serif {
        font-family: Georgia, "Times New Roman", serif;
        letter-spacing: 0;
      }

      .notebook-backdrop {
        background:
          radial-gradient(circle at center, rgba(0,0,0,0.36), rgba(0,0,0,0.84)),
          rgba(0,0,0,0.72);
      }

      .notebook-shell {
        position: relative;
        color: #2b241b;
        background:
          linear-gradient(90deg, rgba(62,39,23,0.35) 0 42px, transparent 42px),
          radial-gradient(circle at 18% 8%, rgba(255,255,255,0.28), transparent 20%),
          linear-gradient(135deg, #b89f72 0%, #d0bb87 48%, #b59a68 100%);
        border-color: #5d4729;
        box-shadow:
          0 22px 80px rgba(0,0,0,0.78),
          inset 0 0 0 2px rgba(255,245,210,0.16),
          inset 48px 0 28px rgba(61,35,18,0.18);
      }

      .notebook-shell::before {
        content: "";
        position: absolute;
        left: 44px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: rgba(91, 48, 35, 0.42);
        box-shadow: 6px 0 0 rgba(255,255,255,0.15);
        pointer-events: none;
      }

      .notebook-title-block {
        color: #2b241b;
        border-bottom: 1px solid rgba(82,55,32,0.42);
      }

      .notebook-title-block p {
        color: rgba(43,36,27,0.68);
      }

      .notebook-tab-rail {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        overflow-x: auto;
        padding: 0 4px 0 54px;
        margin-bottom: -1px;
        flex-shrink: 0;
      }

      .notebook-bookmark {
        min-width: max-content;
        border: 1px solid rgba(75,52,31,0.58);
        border-bottom: none;
        border-radius: 10px 10px 0 0;
        padding: 9px 13px 10px;
        font-size: 11px;
        color: #f2dfbc;
        background: linear-gradient(#8c3f32, #623025);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.22);
        transform: translateY(5px);
      }

      .notebook-bookmark:nth-child(3n+2) {
        background: linear-gradient(#5f6f4b, #3d4b32);
      }

      .notebook-bookmark:nth-child(3n+3) {
        background: linear-gradient(#9a7b38, #6e5529);
      }

      .notebook-bookmark.active {
        background: linear-gradient(#efe1b6, #d6bf84);
        color: #251c14;
        border-color: rgba(75,52,31,0.82);
        font-weight: 700;
        transform: translateY(0);
        z-index: 2;
      }

      .notebook-page {
        color: #32271b;
        background:
          linear-gradient(90deg, rgba(137,65,55,0.24) 0 1px, transparent 1px) 54px 0 / 1px 100% no-repeat,
          repeating-linear-gradient(to bottom, rgba(255,255,255,0.14) 0, rgba(255,255,255,0.14) 1px, transparent 1px, transparent 29px),
          linear-gradient(180deg, rgba(255,249,222,0.94), rgba(221,202,151,0.97));
        border-color: rgba(85,57,31,0.52);
        box-shadow: inset 0 0 35px rgba(60,35,16,0.16);
      }

      .notebook-page h3,
      .notebook-page h4,
      .notebook-page h5 {
        color: #251c14;
      }

      .notebook-page p,
      .notebook-page li,
      .notebook-page span {
        color: rgba(38,30,20,0.78);
      }

      .notebook-page .text-stone-100,
      .notebook-page .text-stone-200,
      .notebook-page .text-stone-300,
      .notebook-page .text-stone-400,
      .notebook-page .text-stone-500,
      .notebook-page .text-stone-600 {
        color: inherit;
      }

      .notebook-page article,
      .notebook-page .rounded-lg,
      .notebook-page .rounded-xl {
        background-color: rgba(255,248,218,0.42);
        border-color: rgba(93,64,36,0.28);
      }

      .notebook-page button {
        color: #2e2418;
        border-color: rgba(85,57,31,0.48);
        background-color: rgba(235,219,174,0.56);
      }

      .notebook-page button:hover {
        background-color: rgba(246,232,191,0.78);
      }

      .notebook-close-button {
        color: #efe3bd;
        background: #4c3521;
        border-color: #6f5432;
      }

      .notebook-close-button:hover {
        background: #62442a;
      }



      .notebook-shell-v2 {
        padding: 0;
        display: block;
      }

      .notebook-layout-v2 {
        position: relative;
        display: grid;
        grid-template-columns: 230px minmax(0, 1fr);
        height: 100%;
        min-height: 0;
      }

      .notebook-index-v2 {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 22px 16px 18px 22px;
        background:
          linear-gradient(180deg, rgba(77,47,25,0.32), rgba(35,22,13,0.16)),
          rgba(96, 60, 32, 0.14);
        border-right: 1px solid rgba(85,57,31,0.42);
        box-shadow: inset -10px 0 22px rgba(61,35,18,0.12);
        overflow: hidden;
      }

      .notebook-index-heading p {
        margin: 0 0 6px;
        font-size: 10px;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: rgba(43,36,27,0.62);
      }

      .notebook-index-heading h2 {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 26px;
        line-height: 1;
        color: #251c14;
      }

      .notebook-index-case {
        border: 1px solid rgba(85,57,31,0.34);
        border-radius: 14px;
        padding: 11px 12px;
        background: rgba(255,248,218,0.38);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
      }

      .notebook-index-case span {
        display: block;
        margin-bottom: 5px;
        font-size: 9px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: rgba(43,36,27,0.58);
      }

      .notebook-index-case strong {
        display: block;
        color: #251c14;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 14px;
        line-height: 1.25;
      }

      .notebook-title-with-portrait {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
      }

      .notebook-title-text {
        min-width: 0;
      }

      .notebook-header-portrait {
        width: 132px;
        flex: 0 0 132px;
        border: 1px solid rgba(85,57,31,0.34);
        border-radius: 14px;
        padding: 7px;
        background: rgba(255,248,218,0.30);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);
      }

      .notebook-header-portrait .ascii-portrait-react-slot,
      .notebook-header-portrait .ascii-portrait-slot {
        min-height: 102px !important;
        height: 102px;
        border-color: rgba(85,57,31,0.34) !important;
        background: rgba(31,22,14,0.82) !important;
      }

      .notebook-header-portrait .ascii-portrait-pre {
        font-size: 10px !important;
        line-height: 1.0 !important;
      }

      .notebook-index-nav {
        display: grid;
        grid-template-columns: 1fr;
        gap: 6px;
        min-height: 0;
      }

      .notebook-index-button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 34px;
        border: 1px solid rgba(85,57,31,0.36);
        border-radius: 10px;
        padding: 7px 9px 7px 11px;
        background: rgba(235,219,174,0.36);
        color: #352716;
        font-size: 12px;
        text-align: left;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.16);
      }

      .notebook-index-button:hover {
        background: rgba(246,232,191,0.7);
      }

      .notebook-index-button.active {
        color: #f7e8c8;
        background: linear-gradient(135deg, #5a3425, #7a4932);
        border-color: rgba(55,31,18,0.72);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.2),
          0 5px 12px rgba(60,35,16,0.22);
      }

      .notebook-index-button em {
        min-width: 24px;
        border-radius: 999px;
        padding: 2px 6px;
        font-size: 10px;
        font-style: normal;
        text-align: center;
        color: rgba(43,36,27,0.72);
        background: rgba(255,248,218,0.5);
      }

      .notebook-index-button.active em {
        color: #4a2d1f;
        background: rgba(255,235,190,0.86);
      }

      .notebook-close-button-v2 {
        margin-top: auto;
        width: 100%;
      }

      .notebook-main-v2 {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
        padding: 22px 22px 22px 18px;
      }

      .notebook-title-block-v2 {
        margin: 0 0 14px;
        padding: 0 0 12px;
        flex-shrink: 0;
      }

      .notebook-title-block-v2 h2 {
        color: #251c14;
      }

      .notebook-page-v2 {
        padding-left: 28px !important;
        padding-right: 28px !important;
      }

      .notebook-page-v2::-webkit-scrollbar {
        width: 10px;
      }

      .notebook-page-v2::-webkit-scrollbar-track {
        background: rgba(96,60,32,0.12);
        border-radius: 999px;
      }

      .notebook-page-v2::-webkit-scrollbar-thumb {
        background: rgba(88,55,30,0.42);
        border-radius: 999px;
      }

      @media (max-width: 860px) {
        .notebook-layout-v2 {
          grid-template-columns: 1fr;
        }

        .notebook-index-v2 {
          border-right: none;
          border-bottom: 1px solid rgba(85,57,31,0.42);
          padding: 16px;
        }

        .notebook-index-nav {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .notebook-main-v2 {
          padding: 16px;
        }
      }
      @keyframes sommeShake {
        0%, 100% { transform: translate(0, 0); }
        15% { transform: translate(5px, -3px); }
        30% { transform: translate(-5px, 4px); }
        45% { transform: translate(4px, 3px); }
        60% { transform: translate(-3px, -4px); }
        75% { transform: translate(3px, -2px); }
      }
      .somme-shake {
        animation: sommeShake 0.55s ease-in-out infinite;
      }
    `}</style>
  );
}

function ActivityLogViewer() {
  const { state } = useGame();
  const entries = (state.notebook.activityLog || []).slice(-10).reverse();

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-3 h-[260px] min-h-[260px] max-h-[260px] overflow-hidden flex flex-col flex-shrink-0">
      <p className="text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
        Registro reciente
      </p>
      {entries.length === 0 ? (
        <p className="text-xs text-stone-600 italic">Todavía no hay registros recientes.</p>
      ) : (
        <div className="space-y-1 text-xs text-stone-400 overflow-y-auto pr-1 flex-1 min-h-0">
          {entries.map((entry) => (
            <p key={entry.id} className="leading-snug" title={entry.text}>
              <span className="text-yellow-700">[{entry.type}]</span> {entry.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function GrimdarkAtmosphereOverlay({ time, bombardmentEffect }) {
  const overlayClass = VisibilitySystem.getAtmosphereOverlay(time, bombardmentEffect);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      <div className={`absolute inset-0 ${overlayClass}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(0,0,0,0.82)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/65" />
    </div>
  );
}

const spriteLoadStatusCache = new Map();

function getCachedSpriteStatus(spriteSrc) {
  if (!spriteSrc) return "none";
  return spriteLoadStatusCache.get(spriteSrc) || "loading";
}

function setCachedSpriteStatus(spriteSrc, status) {
  if (!spriteSrc) return;
  spriteLoadStatusCache.set(spriteSrc, status);
}

function MapCell({ cell, visualSettings, x, y }) {
  const spriteSrc = SpriteSystem.shouldAttemptSprite(visualSettings.renderMode) && cell.sprite?.src
    ? cell.sprite.src
    : "";

  const [spriteStatus, setSpriteStatus] = React.useState(() =>
    getCachedSpriteStatus(spriteSrc)
  );

  React.useEffect(() => {
    setSpriteStatus(getCachedSpriteStatus(spriteSrc));
  }, [spriteSrc]);

  const spriteLoaded = Boolean(spriteSrc && spriteStatus === "loaded");
  const spriteFailed = Boolean(spriteSrc && spriteStatus === "failed");

  // Regla visual del paso 3A:
  // - si hay sprite pendiente, no se muestra ASCII por debajo;
  // - si el sprite carga, se muestra la imagen;
  // - si el sprite falla, recién ahí aparece el ASCII de respaldo.
  const asciiVisible = !spriteSrc || spriteFailed;

  return (
    <span
      className={`inline-flex items-center justify-center relative overflow-hidden align-top ${cell.colorClass}`}
      style={{
        width: "var(--somme-map-cell-w, 15px)",
        minWidth: "var(--somme-map-cell-w, 15px)",
        maxWidth: "var(--somme-map-cell-w, 15px)",
        height: "var(--somme-map-cell-h, 21px)",
        minHeight: "var(--somme-map-cell-h, 21px)",
        maxHeight: "var(--somme-map-cell-h, 21px)",
        lineHeight: "var(--somme-map-cell-h, 21px)",
        fontSize: "var(--somme-map-font-size, 16px)",
      }}
      title={cell.title}
      data-sprite-status={spriteSrc ? spriteStatus : "ascii"}
    >
      {spriteSrc && !spriteFailed && (
        <img
          src={spriteSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={`absolute inset-0 h-full w-full object-contain pointer-events-none select-none ${
            spriteLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{ imageRendering: "pixelated" }}
          onLoad={() => {
            setCachedSpriteStatus(spriteSrc, "loaded");
            setSpriteStatus("loaded");
          }}
          onError={() => {
            setCachedSpriteStatus(spriteSrc, "failed");
            setSpriteStatus("failed");
          }}
        />
      )}
      <span
        className={`relative z-10 leading-none ${asciiVisible ? "opacity-100" : "opacity-0"}`}
        aria-hidden={spriteLoaded ? "true" : undefined}
      >
        {cell.char}
      </span>
    </span>
  );
}

function AsciiMapView() {
  const { state, actions } = useGame();
  const VIEWPORT_WIDTH = 52;
  const VIEWPORT_HEIGHT = 24;
  const MAP_CELL_BASE = React.useMemo(() => ({ width: 15, height: 21, fontSize: 16 }), []);
  const mapViewportRef = React.useRef(null);
  const [mapCellSize, setMapCellSize] = React.useState(MAP_CELL_BASE);

  const currentMap = AsciiMapEngine.getCurrentMap(state);

  const currentVisibilityRadius = TimeSystem.getVisibilityRadius(
    VisibilitySystem.DEFAULT_RADIUS,
    state.time,
    currentMap
  );

  const visibilityCache = React.useMemo(
    () =>
      VisibilitySystem.createVisibilityCache(
        currentMap,
        state.playerPosition,
        currentVisibilityRadius
      ),
    [currentMap, state.playerPosition.x, state.playerPosition.y, currentVisibilityRadius]
  );

  if (!currentMap) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-950/40 p-4 mb-4">
        <p className="text-sm text-stone-500">No hay mapa ASCII disponible para esta zona.</p>
      </div>
    );
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const effectiveViewportWidth = Math.min(VIEWPORT_WIDTH, currentMap.width || VIEWPORT_WIDTH);
  const effectiveViewportHeight = Math.min(VIEWPORT_HEIGHT, currentMap.height || VIEWPORT_HEIGHT);

  React.useLayoutEffect(() => {
    const element = mapViewportRef.current;
    if (!element) return undefined;

    const updateMapCellSize = () => {
      const rect = element.getBoundingClientRect();
      const availableWidth = Math.max(0, rect.width - 14);
      const availableHeight = Math.max(0, rect.height - 12);
      const widthScale = availableWidth / Math.max(1, effectiveViewportWidth * MAP_CELL_BASE.width);
      const heightScale = availableHeight / Math.max(1, effectiveViewportHeight * MAP_CELL_BASE.height);
      const scale = Math.max(0.58, Math.min(1, widthScale, heightScale));

      const nextSize = {
        width: Math.max(9, Math.floor(MAP_CELL_BASE.width * scale)),
        height: Math.max(12, Math.floor(MAP_CELL_BASE.height * scale)),
        fontSize: Math.max(10, Math.floor(MAP_CELL_BASE.fontSize * scale)),
      };

      setMapCellSize((previous) =>
        previous.width === nextSize.width &&
        previous.height === nextSize.height &&
        previous.fontSize === nextSize.fontSize
          ? previous
          : nextSize
      );
    };

    updateMapCellSize();

    // Mantener estable el tamaño del mapa durante el movimiento.
    // Antes se usaba ResizeObserver sobre el panel del mapa; cuando un NPC procedimental
    // intercambiaba lugar con el corresponsal, pequeños cambios de texto podían alterar
    // la altura disponible y el mapa "saltaba" de escala. Ahora solo recalculamos ante
    // cambios reales del tamaño de la ventana.
    let resizeFrame = null;
    const handleWindowResize = () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(updateMapCellSize);
    };

    window.addEventListener("resize", handleWindowResize);
    return () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [effectiveViewportWidth, effectiveViewportHeight, MAP_CELL_BASE]);

  const safePlayerX = clamp(state.playerPosition.x, 0, Math.max(0, currentMap.width - 1));
  const safePlayerY = clamp(state.playerPosition.y, 0, Math.max(0, currentMap.height - 1));

  const preferredViewportX = safePlayerX - Math.floor(effectiveViewportWidth / 2);
  const preferredViewportY = safePlayerY - Math.floor(effectiveViewportHeight / 2);

  const viewportX = clamp(
    preferredViewportX,
    0,
    Math.max(0, currentMap.width - effectiveViewportWidth)
  );

  const viewportY = clamp(
    preferredViewportY,
    0,
    Math.max(0, currentMap.height - effectiveViewportHeight)
  );

  function getRenderedCell(tileChar, worldX, worldY) {
    const visibility = VisibilitySystem.getCachedVisibilityLevel(
      visibilityCache,
      worldX,
      worldY
    );

    const entity = visibility !== "hidden" ? currentMap.getEntityAt(worldX, worldY, state) : null;

    if (state.playerPosition.x === worldX && state.playerPosition.y === worldY) {
      return {
        char: "@",
        colorClass: "text-red-300 font-bold drop-shadow",
        title: "Corresponsal",
        sprite: SpriteSystem.getSpriteForPlayer(),
      };
    }

    if (
      state.bombardmentEffect?.active &&
      state.bombardmentEffect?.impact?.x === worldX &&
      state.bombardmentEffect?.impact?.y === worldY
    ) {
      return {
        char: "*",
        colorClass: "text-yellow-200 font-bold animate-ping",
        title: "Impacto de artillería",
        sprite: SpriteSystem.getSpriteForImpact(),
      };
    }

    const tile = TileBehaviorSystem.getDefinition(tileChar);
    const elevation = tile.elevation || "surface";

    if (VisibilitySystem.isMapBoundary(currentMap, worldX, worldY)) {
      return {
        char: "#",
        colorClass:
          visibility === "hidden" || visibility === "memory"
            ? "text-lime-950 opacity-60"
            : VisibilitySystem.getExplorationPalette(visibility, elevation, tileChar),
        title: "Límite del mapa",
        sprite: visibility !== "hidden" ? SpriteSystem.getSpriteForTile(tile) : null,
      };
    }

    if (visibility === "hidden") {
      return {
        char: " ",
        colorClass: "text-black",
        title: "Fuera del campo visual",
      };
    }

    if (visibility === "memory") {
      return {
        char: tileChar === "." || tile.char === " " ? " " : tile.char,
        colorClass: VisibilitySystem.getExplorationPalette(
          "memory",
          elevation,
          tileChar
        ),
        title: "Recuerdo impreciso del terreno",
        sprite: SpriteSystem.getSpriteForTile(tile),
      };
    }

    if (entity) {
      return {
        char: entity.char,
        colorClass:
          visibility === "dim"
            ? "text-stone-500"
            : entity.colorClass || "text-stone-200",
        title: entity.label,
        sprite: SpriteSystem.getSpriteForEntity(entity),
      };
    }

    return {
      char: tile.char,
      colorClass: VisibilitySystem.getExplorationPalette(
        visibility,
        elevation,
        tileChar
      ),
      title: `${tile.label} · ${elevation}`,
      sprite: SpriteSystem.getSpriteForTile(tile),
    };
  }

  const renderedRows = Array.from({ length: effectiveViewportHeight }, (_, screenY) => {
    const worldY = viewportY + screenY;
    const row = currentMap.getNormalizedRow(worldY);

    return Array.from({ length: effectiveViewportWidth }, (_, screenX) => {
      const worldX = viewportX + screenX;
      const tileChar = row[worldX] || "#";
      return getRenderedCell(tileChar, worldX, worldY);
    });
  });

  const visualSettings = VisualSettingsSystem.normalize(state.visualSettings);
  const currentLocation = state.locations.find(
    (location) => location.id === state.currentLocationId
  );
  const activeCase =
    state.notebook?.activeCase ||
    state.cases?.find((caseFile) => caseFile.status === "active") ||
    null;
  const activeObjective =
    activeCase?.objectives?.find((objective) => !objective.completed) ||
    activeCase?.objectives?.[0] ||
    null;
  const dayMoment = TimeSystem.getDayMoment(state.time);

  return (
    <div className="rounded-xl border border-stone-800 bg-black/70 p-3 min-h-0 h-full overflow-hidden flex flex-col">
      <div className="relative mb-2 flex-shrink-0 pr-[280px] min-h-[86px]">
        <div className="min-w-0">
          <h3 className="font-semibold text-stone-100 text-base tracking-wide">Somme</h3>
          <p className="mt-1 text-[11px] leading-snug text-stone-500">
            {currentLocation?.name || "Frente occidental"} · {state.time.weather} · Día {state.time.day} · {String(state.time.hour).padStart(2, "0")}:{String(state.time.minute).padStart(2, "0")} · {dayMoment.label}
          </p>
          <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-stone-500">
            Caso: <span className="text-stone-300">{activeCase?.title || "sin expediente activo"}</span>
            {activeObjective ? <span> · {activeObjective.label || activeObjective.title}</span> : null}
          </p>
          <p className="mt-4 text-[11px] leading-snug text-stone-500">
            <span className="text-red-300">@</span> corresponsal · <span className="text-green-500">s</span> testigo · <span className="text-yellow-500">?</span> evidencia · <span className="text-lime-800">#</span> defensa · <span className="text-zinc-500">^</span> alambre · <span className="text-amber-500">*</span> impacto · <span className="text-red-500">x</span> cadáver · <span className="text-cyan-400">m</span> camillero · controles: WASD/flechas, E, Tab
          </p>
        </div>

        <div className="absolute right-0 top-8 flex h-9 w-[260px] shrink-0 items-center justify-end gap-2">
          <button
            className="h-9 min-w-[128px] rounded-lg border border-stone-700 bg-stone-950/70 px-3 text-xs text-stone-300 shadow-sm shadow-black/30 transition hover:bg-stone-800"
            onClick={() => actions.toggleNotebook(true)}
          >
            Cuaderno / Tab
          </button>
          <div className="flex h-9 min-w-[118px] items-center justify-center rounded-lg border border-stone-800 bg-stone-950/60 px-3 text-xs text-stone-500 shadow-sm shadow-black/30">
            E interactuar
          </div>
        </div>
      </div>

      <div
        ref={mapViewportRef}
        className={`relative font-mono overflow-hidden select-none bg-stone-950/95 rounded-lg border border-lime-950/70 flex-1 min-h-0 shadow-inner shadow-black ${
          "text-[12px] leading-none"
        } ${state.bombardmentEffect?.active ? "animate-pulse" : ""}`}
        style={{
          "--somme-map-cell-w": `${mapCellSize.width}px`,
          "--somme-map-cell-h": `${mapCellSize.height}px`,
          "--somme-map-font-size": `${mapCellSize.fontSize}px`,
        }}
      >
        <GrimdarkAtmosphereOverlay
          time={state.time}
          bombardmentEffect={state.bombardmentEffect}
        />
        <div className="relative z-10 grid h-full w-full place-content-center p-1">
          <div className="inline-block max-w-full rounded-md bg-black/20 px-1 py-0.5 ring-1 ring-stone-900/80">
            {renderedRows.map((row, y) => (
              <div key={y} className="whitespace-pre leading-none" style={{ height: "var(--somme-map-cell-h, 21px)" }}>
                {row.map((cell, x) => (
                  <MapCell
                    key={`${x}-${y}-${cell.sprite?.src || "ascii"}-${visualSettings.renderMode}`}
                    cell={cell}
                    visualSettings={visualSettings}
                    x={x}
                    y={y}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p
        className="mt-2 h-[18px] flex-shrink-0 truncate text-[11px] leading-[18px] text-stone-600"
        title={state.lastMapMessage || ""}
        aria-live="polite"
      >
        {state.lastMapMessage || ""}
      </p>

      <div className="hidden"><TacticalCompass /></div>

      </div>
  );
}

function GameplayScreen() {
  const { state, actions } = useGame();
  const canRestHere = RestRecoverySystem.canRest(state);
  const restBlockReason = RestRecoverySystem.getRestBlockReason(state);
  const canTalkToMedicalStaff = RestRecoverySystem.canTalkToMedicalStaff(state);
  const medicalTalkBlockReason = RestRecoverySystem.getMedicalTalkBlockReason(state);
  const canWritePersonalNote = RestRecoverySystem.canWritePersonalNote(state);
  const personalNoteBlockReason = RestRecoverySystem.getPersonalNoteBlockReason(state);
  const canSleepForHours = RestRecoverySystem.canSleepForHours(state);
  const sleepBlockReason = RestRecoverySystem.getSleepBlockReason(state);
  const canUseCivilianShelter = RestRecoverySystem.canUseCivilianShelter(state);
  const civilianShelterBlockReason = RestRecoverySystem.getCivilianShelterBlockReason(state);
  const canUseMedicalProtection = RestRecoverySystem.canUseMedicalProtection(state);
  const medicalProtectionBlockReason = RestRecoverySystem.getMedicalProtectionBlockReason(state);
  const actionsRef = React.useRef(actions);

  React.useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  React.useEffect(() => {
    function handleKeyDown(event) {
      const targetTag = event.target?.tagName?.toLowerCase();
      const typing = targetTag === "input" || targetTag === "textarea" || targetTag === "select";

      if (event.key === "Tab") {
        event.preventDefault();
        actionsRef.current.toggleNotebook();
        return;
      }

      if (
        typing ||
        state.notebookOpen ||
        state.evidenceInspection?.isOpen ||
        state.dialogueModal?.isOpen ||
        state.contradictionModal?.isOpen ||
        state.caseClosureModal?.isOpen
      ) return;

      const keyActions = {
        ArrowUp: () => actionsRef.current.movePlayerOnAsciiMap(0, -1),
        ArrowDown: () => actionsRef.current.movePlayerOnAsciiMap(0, 1),
        ArrowLeft: () => actionsRef.current.movePlayerOnAsciiMap(-1, 0),
        ArrowRight: () => actionsRef.current.movePlayerOnAsciiMap(1, 0),
        w: () => actionsRef.current.movePlayerOnAsciiMap(0, -1),
        W: () => actionsRef.current.movePlayerOnAsciiMap(0, -1),
        s: () => actionsRef.current.movePlayerOnAsciiMap(0, 1),
        S: () => actionsRef.current.movePlayerOnAsciiMap(0, 1),
        a: () => actionsRef.current.movePlayerOnAsciiMap(-1, 0),
        A: () => actionsRef.current.movePlayerOnAsciiMap(-1, 0),
        d: () => actionsRef.current.movePlayerOnAsciiMap(1, 0),
        D: () => actionsRef.current.movePlayerOnAsciiMap(1, 0),
        e: () => actionsRef.current.interactAsciiEntity(),
        E: () => actionsRef.current.interactAsciiEntity(),
      };

      if (keyActions[event.key]) {
        event.preventDefault();
        keyActions[event.key]();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    state.notebookOpen,
    state.evidenceInspection?.isOpen,
    state.dialogueModal?.isOpen,
    state.contradictionModal?.isOpen,
    state.caseClosureModal?.isOpen,
  ]);

  React.useEffect(() => {
    if (!state.bombardmentEffect?.active) return;

    const timeout = window.setTimeout(() => {
      actions.clearBombardmentEffect();
    }, state.bombardmentEffect.shakeMs || 700);

    return () => window.clearTimeout(timeout);
  }, [state.bombardmentEffect?.active, state.bombardmentEffect?.startedAt]);

  const currentLocation = state.locations.find(
    (location) => location.id === state.currentLocationId
  );

  const locationNpcIds = currentLocation?.npcIds || [];

  const visibleNpcIds = state.flags.ellisLeftFront
    ? locationNpcIds.filter((id) => id !== "npc_soldado_001")
    : locationNpcIds;

  const npc = state.npcs.find((item) => visibleNpcIds.includes(item.id));
  const [activeDialogueId, setActiveDialogueId] = React.useState("dlg_ellis_001");
  const dialogue = state.dialogues.find((item) => item.id === activeDialogueId);

  function consumeTime(minutes) {
    actions.advanceTime(minutes);
  }

  function executeEffect(effect) {
    if (!effect) return;

    switch (effect.type) {
      case "ADD_NOTE": {
        actions.addNote(effect.payload.text, effect.payload.relatedEvidenceIds || []);
        break;
      }

      case "ADD_CONTRADICTION": {
        actions.addContradiction(effect.payload);
        break;
      }

      case "STRESS": {
        actions.changeStress(effect.payload, "traumatic_exposure", "screams");
        break;
      }

      case "REPUTATION": {
        actions.changeReputation(effect.payload.faction, effect.payload.amount);
        break;
      }

      case "SET_FLAG": {
        actions.setFlag(effect.payload.key, effect.payload.value);
        break;
      }

      default:
        break;
    }
  }

  function choiceIsAvailable(choice) {
    if (!choice.conditions?.length) return true;
    return DialogueConditionSystem.all(choice.conditions, state);
  }

  function investigateLocation() {
    const alreadyDiscoveredIds = state.notebook.evidences.map((evidence) => evidence.id);

    const discoverableEvidence = state.evidenceDatabase.filter((evidence) => {
      if (alreadyDiscoveredIds.includes(evidence.id)) return false;
      if (evidence.locationId !== currentLocation?.id) return false;
      return evidence.canBeFound(state);
    });

    consumeTime(30);

    if (!discoverableEvidence.length) {
      actions.addNote(
        `No se encontraron nuevas evidencias en ${currentLocation?.name || "esta zona"}.`,
        []
      );
      return;
    }

    const foundEvidence = discoverableEvidence[0];

    actions.addEvidence(foundEvidence);
    actions.addNote(
      `Nueva evidencia encontrada: ${foundEvidence.title}.`,
      [foundEvidence.id]
    );
  }

  function selectChoice(choice) {
    consumeTime(12);

    if (choice.effect) {
      executeEffect(choice.effect);
    }

    if (choice.nextDialogueId) {
      const nextDialogue = state.dialogues.find((item) => item.id === choice.nextDialogueId);

      if (nextDialogue && nextDialogue.isAvailable(state)) {
        setActiveDialogueId(choice.nextDialogueId);
      }
    }
  }

  function moveTo(locationId) {
    const nextLocation = state.locations.find((location) => location.id === locationId);

    if (!nextLocation) return;

    actions.moveToLocation(locationId, 20);

    if (nextLocation.stressLevel > 0) {
      actions.changeStress(
        nextLocation.stressLevel,
        nextLocation.id === "loc_no_mans_land" ? "traumatic_exposure" : "front",
        nextLocation.id === "loc_no_mans_land" ? "corpses" : null
      );
    }
  }

  const bombardmentActive = state.bombardmentEffect?.active;
  const bombardmentShakeClass = bombardmentActive
    ? state.bombardmentEffect.intensity === "cercano"
      ? "animate-pulse"
      : ""
    : "";

  const activeCase = state.notebook?.activeCase || state.cases?.find((caseFile) => caseFile.status === "active") || null;
  const activeObjective = activeCase?.objectives?.find((objective) => !objective.completed) || activeCase?.objectives?.[0] || null;
  const recentActivityEntries = (state.notebook?.activityLog || []).slice(-3).reverse();
  const playerStress = NarrativeStressSystem.clampStress(
    Number(state.player?.stress ?? state.correspondent?.stress ?? 0)
  );
  const emotionalStateLabel = NarrativeStressSystem.getStressLabel(playerStress);
  const emotionalNarrative = PsychologicalStateSystem.getNarrativeDescription(playerStress);
  const clarityDescription = NarrativeStressSystem.getClarityDescription(playerStress);
  const hasContextualQuickActions = Boolean(
    canRestHere ||
      canTalkToMedicalStaff ||
      canSleepForHours ||
      canUseCivilianShelter ||
      canUseMedicalProtection
  );

  return (
    <main
      className={`typewriter-ui h-screen bg-stone-950 text-stone-200 relative overflow-hidden ${bombardmentActive ? "somme-shake" : ""}`}
    >
      <CombatVisualStyles />

      {bombardmentActive && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <div className="absolute inset-0 bg-white/30 animate-ping" />
          <div className="absolute inset-0 bg-yellow-200/10" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-yellow-300/40 bg-black/80 px-5 py-3 text-sm text-yellow-100 shadow-2xl">
            {state.bombardmentEffect.message}
          </div>
        </div>
      )}

      <section className="mx-auto grid h-full max-w-[1368px] grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-0 overflow-hidden rounded-2xl border border-stone-700 bg-[#171411]/95 p-3 shadow-2xl shadow-black/40">
          <AsciiMapView />
        </section>

        <aside className="grid min-h-0 grid-rows-[220px_auto_auto] gap-3 overflow-hidden">
          <section className="overflow-hidden rounded-2xl border border-stone-700 bg-[#171411]/95 p-3 shadow-xl shadow-black/30">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-stone-800/80 pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-amber-500/80">Bitácora</p>
                  <h2 className="mt-1 text-base font-bold text-stone-100">Registro reciente</h2>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-stone-600">Últimos eventos</p>
              </div>

              <div className="mt-3 flex-1 space-y-2 overflow-hidden text-xs text-stone-500">
                {recentActivityEntries.length === 0 ? (
                  <p className="rounded-lg border border-stone-800 bg-black/20 px-3 py-3 italic text-stone-600">
                    Todavía no hay registros recientes.
                  </p>
                ) : (
                  recentActivityEntries.map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-lg border border-stone-800 bg-black/20 px-3 py-2"
                      title={entry.text}
                    >
                      <p className="mb-0.5 text-[10px] uppercase tracking-wider text-stone-600">{entry.type}</p>
                      <p className="line-clamp-2 leading-snug text-stone-400">{entry.text}</p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-700 bg-[#171411]/95 p-3 text-xs leading-relaxed text-stone-400 shadow-xl shadow-black/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-amber-500/80">Corresponsal</p>
                <h3 className="mt-1 text-base font-bold text-stone-100">Estado emocional</h3>
              </div>
            </div>
            <p className="mt-3 text-base font-semibold text-stone-100">{emotionalStateLabel}</p>
            <p className="mt-2 text-stone-500">{emotionalNarrative}</p>
          </section>

          <section className="rounded-2xl border border-stone-700 bg-[#171411]/95 p-3 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-stone-100">Acciones rápidas</h3>
              <p className="text-[10px] uppercase tracking-widest text-stone-600">Contextuales</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {canRestHere && (
                <button
                  className="rounded-lg border border-stone-700 px-3 py-2 text-xs transition hover:bg-stone-800"
                  title="Reduce estrés y avanza 45 minutos."
                  onClick={() => actions.restInSafeZone(6, 45)}
                >
                  Descansar
                </button>
              )}

              {canTalkToMedicalStaff && (
                <button
                  className="rounded-lg border border-cyan-900 px-3 py-2 text-xs text-cyan-200 transition hover:bg-cyan-950/30"
                  title="Reduce estrés, mejora vínculo con médicos y avanza 25 minutos."
                  onClick={() => actions.talkToMedicalStaff(4, 25)}
                >
                  Personal médico
                </button>
              )}

              {canSleepForHours && (
                <button
                  className="rounded-lg border border-indigo-900 px-3 py-2 text-xs text-indigo-200 transition hover:bg-indigo-950/30"
                  title="Reduce mucho estrés, agrega entrada al diario y avanza 4 horas."
                  onClick={() => actions.sleepForHours(12, 240)}
                >
                  Dormir
                </button>
              )}

              {canUseCivilianShelter && (
                <button
                  className="rounded-lg border border-emerald-900 px-3 py-2 text-xs text-emerald-200 transition hover:bg-emerald-950/30"
                  title="Reduce estrés, agrega entrada al diario y avanza 2 horas."
                  onClick={() => actions.useCivilianShelter(10, 120)}
                >
                  Refugio civil
                </button>
              )}

              {canUseMedicalProtection && (
                <button
                  className="rounded-lg border border-sky-900 px-3 py-2 text-xs text-sky-200 transition hover:bg-sky-950/30"
                  title="Reduce estrés, activa protección contra confiscación y avanza 1 hora."
                  onClick={() => actions.useMedicalProtection(8, 60)}
                >
                  Protección médica
                </button>
              )}

              {!hasContextualQuickActions && (
                <p className="col-span-2 rounded-lg border border-stone-800 bg-black/20 px-3 py-3 text-xs italic text-stone-600">
                  No hay acciones contextuales disponibles en este lugar.
                </p>
              )}
            </div>
          </section>
        </aside>
        {state.notebookOpen && <NotebookPanel />}
        <EvidenceInspectionPanel />
        <DialogueModal />
        <ContradictionModal />
        <CaseClosureModal />
      </section>
    </main>
  );
}


function getCasePrimaryObjective(caseFile) {
  if (!caseFile) return null;
  const objectives = Array.isArray(caseFile.objectives) ? caseFile.objectives : [];
  return objectives.find((objective) => !objective.completed) || objectives[0] || null;
}

function getCaseStatusLabel(status) {
  const labels = {
    active: "Caso activo",
    available: "Caso disponible",
    locked: "Bloqueado",
    resolved: "Resuelto",
    solved: "Resuelto",
    failed: "Fallido",
  };
  return labels[status] || status || "Sin estado";
}

function makePlayerPortraitNpc(player) {
  if (!player) return null;
  const portraitSex =
    player.asciiPortrait?.sex ||
    (player.gender === "femenino" ? "female" : player.gender === "masculino" ? "male" : "unknown");

  return {
    id: "player_correspondent",
    name: player.name || "Corresponsal",
    sex: portraitSex,
    gasMask: false,
    portraitSeed: player.portraitSeed || player.asciiPortrait?.seed || `player_${player.name || "corresponsal"}`,
    asciiPortrait: {
      sex: portraitSex,
      gasMask: false,
      seed: player.portraitSeed || player.asciiPortrait?.seed || `player_${player.name || "corresponsal"}`,
    },
  };
}

function NotebookPanel() {
  const { state, actions } = useGame();
  const { notebook, player } = state;

  const handleSelectCase = React.useCallback(
    (caseFile) => {
      if (!caseFile || !["available", "active"].includes(caseFile.status)) return;
      actions.setActiveCase(caseFile);
    },
    [actions]
  );

  const investigationCount =
    (notebook.evidences?.length || 0) +
    (notebook.contradictions?.length || 0) +
    (notebook.hypotheses?.length || 0);

  const pages = [
    { id: "case", label: "Caso activo", count: notebook.activeCase ? 1 : 0 },
    { id: "investigation", label: "Investigación", count: investigationCount },
    {
      id: "notes",
      label: "Notas",
      count: (notebook.notes || []).filter((note) => !isPersonalDiaryNote(note)).length,
    },
    {
      id: "diary",
      label: "Diario",
      count: (notebook.notes || []).filter(isPersonalDiaryNote).length,
    },
    { id: "articles", label: "Artículos", count: notebook.articles?.length || 0 },
    { id: "status", label: "Estado", count: null },
    { id: "caseEvents", label: "Eventos", count: notebook.caseEvents?.length || 0 },
    { id: "archive", label: "Archivo", count: notebook.caseArchive?.length || 0 },
    { id: "guide", label: "Guía", count: null },
  ];

  const [activePage, setActivePage] = React.useState(() => (notebook.activeCase ? "case" : "guide"));
  const selectedPage = pages.find((page) => page.id === activePage) || pages[0];
  const activeCaseTitle = notebook.activeCase?.title || "Sin caso activo";
  const playerPortraitNpc = makePlayerPortraitNpc(player);

  return (
    <div className="notebook-backdrop fixed inset-0 z-40 p-4 flex items-center justify-center">
      <aside className="notebook-shell notebook-shell-v2 w-[min(1120px,calc(100vw-2rem))] h-[min(800px,calc(100vh-2rem))] border rounded-2xl overflow-hidden shadow-2xl">
        <div className="notebook-layout-v2">
          <aside className="notebook-index-v2">
            <div className="notebook-index-heading">
              <p>Cuaderno</p>
              <h2>Índice</h2>
            </div>

            <div className="notebook-index-case">
              <span>{notebook.activeCase ? "CASO ACTIVO" : "Sin expediente activo"}</span>
              <strong>{activeCaseTitle}</strong>
            </div>


            <nav className="notebook-index-nav" aria-label="Páginas del cuaderno">
              {pages.map((page) => {
                const selected = activePage === page.id;
                return (
                  <button
                    key={page.id}
                    className={`notebook-index-button ${selected ? "active" : ""}`}
                    onClick={() => setActivePage(page.id)}
                    type="button"
                  >
                    <span>
                      {page.id === "case" && notebook.activeCase ? "● " : ""}
                      {page.label}
                    </span>
                    {page.id === "case" && notebook.activeCase ? (
                      <em>ACTIVO</em>
                    ) : (
                      page.count !== null && <em>{page.count}</em>
                    )}
                  </button>
                );
              })}
            </nav>

            <button
              className="notebook-close-button notebook-close-button-v2 px-3 py-2 rounded-lg border text-xs transition"
              onClick={() => actions.toggleNotebook(false)}
              type="button"
            >
              Cerrar cuaderno
            </button>
          </aside>

          <section className="notebook-main-v2">
            <header className="notebook-title-block notebook-title-block-v2 notebook-title-with-portrait">
              <div className="notebook-title-text">
                <p className="uppercase tracking-[0.3em] text-xs mb-2">Herramienta de investigación</p>
                <h2 className="text-2xl font-serif">Cuaderno del corresponsal</h2>
                <p className="text-xs mt-1">Página abierta: {selectedPage.label} · Tab para cerrar / abrir</p>
              </div>

              <div className="notebook-header-portrait" aria-label="Retrato del corresponsal">
                <AsciiPortraitSlot
                  npc={playerPortraitNpc}
                  slotId="notebookPlayerPortraitSlot"
                  variant="card"
                />
              </div>
            </header>

            <div className="notebook-page notebook-page-v2 rounded-xl border p-5 overflow-y-auto flex-1 min-h-0">
              {activePage === "case" && (
                <NotebookCasePage
                  caseFile={notebook.activeCase}
                  cases={state.cases}
                  narrativeFlags={state.narrativeFlags}
                  onSelectCase={handleSelectCase}
                />
              )}
              {activePage === "investigation" && (
                <NotebookInvestigationPage
                  evidences={notebook.evidences || []}
                  contradictions={notebook.contradictions || []}
                  hypotheses={notebook.hypotheses || []}
                />
              )}
              {activePage === "notes" && (
                <NotebookNotesPage notes={(notebook.notes || []).filter((note) => !isPersonalDiaryNote(note))} />
              )}
              {activePage === "diary" && (
                <NotebookPersonalDiaryPage notes={(notebook.notes || []).filter(isPersonalDiaryNote)} />
              )}
              {activePage === "articles" && <NotebookArticlesPage articles={notebook.articles || []} />}
              {activePage === "status" && (
                <>
                  <AvailableCasesPanel
                    cases={state.cases}
                    narrativeFlags={state.narrativeFlags}
                    onSelectCase={handleSelectCase}
                  />

                  <NotebookStatusPage
                    player={player}
                    flags={state.flags}
                    worldState={state.worldState}
                    factionMemory={state.factionMemory}
                    persistentConsequences={state.persistentConsequences}
                  />

                  <NotebookConsequencesPage consequenceLog={notebook.consequenceLog || []} />
                </>
              )}
              {activePage === "caseEvents" && (
                <NotebookCaseEventsPage caseEvents={notebook.caseEvents || []} />
              )}
              {activePage === "archive" && (
                <NotebookArchivePage archive={notebook.caseArchive || []} />
              )}
              {activePage === "guide" && <NotebookGuidePage actions={actions} />}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function NotebookPageTitle({ title, subtitle }) {
  return (
    <header className="mb-4 border-b border-stone-800 pb-3">
      <h3 className="text-xl font-serif">{title}</h3>
      {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
    </header>
  );
}

function EmptyNotebookPage({ text }) {
  return <p className="text-sm text-stone-500 italic">{text}</p>;
}

function NotebookCasePage({ caseFile, cases = [], narrativeFlags = {}, onSelectCase }) {
  const availableCases = (cases || []).filter((item) => ["available", "active"].includes(item.status));
  const primaryObjective = getCasePrimaryObjective(caseFile);

  if (!caseFile) {
    return (
      <section>
        <NotebookPageTitle
          title="Caso activo"
          subtitle="Seleccioná una investigación disponible para iniciar el expediente."
        />

        {availableCases.length === 0 ? (
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">Sin caso activo</p>
            <h4 className="text-xl font-serif text-stone-200">No hay investigaciones disponibles</h4>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              Cuando aparezca un expediente nuevo, se mostrará aquí con un botón claro para activarlo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableCases.map((availableCase) => {
              const objective = getCasePrimaryObjective(availableCase);
              return (
                <article
                  key={availableCase.id}
                  className="rounded-xl border border-amber-800/70 bg-amber-950/15 p-5 shadow-inner shadow-black/20"
                >
                  <p className="text-xs uppercase tracking-[0.28em] text-amber-500 mb-2">Caso disponible</p>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h4 className="text-2xl font-serif text-stone-100">{availableCase.title}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-stone-400">{availableCase.summary}</p>
                      {objective && (
                        <div className="mt-4 rounded-lg border border-stone-800 bg-black/20 p-3">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Objetivo inicial</p>
                          <p className="mt-1 text-sm text-stone-300">{objective.label || objective.title || objective.description}</p>
                        </div>
                      )}
                      <p className="mt-3 text-xs text-stone-600">
                        Prioridad: {availableCase.getDerivedPriority?.(narrativeFlags) || "normal"} · Urgencia: {availableCase.getDerivedUrgency?.(narrativeFlags) || "media"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-amber-600 bg-amber-950/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-900/40"
                      onClick={() => onSelectCase?.(availableCase)}
                    >
                      Activar caso
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <section>
      <NotebookPageTitle title="Caso activo" subtitle="El expediente principal de la investigación actual." />

      <article className="rounded-xl border border-amber-700/70 bg-amber-950/15 p-5 shadow-inner shadow-black/20">
        <p className="text-xs uppercase tracking-[0.28em] text-amber-500 mb-2">
          {getCaseStatusLabel(caseFile.status)}
        </p>
        <h4 className="text-2xl font-serif text-stone-100">{caseFile.title}</h4>
        <p className="mt-3 text-sm leading-relaxed text-stone-400">{caseFile.summary}</p>

        {primaryObjective && (
          <div className="mt-4 rounded-lg border border-stone-800 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Objetivo actual</p>
            <p className="mt-1 text-sm font-medium text-stone-200">
              {primaryObjective.label || primaryObjective.title || primaryObjective.description}
            </p>
            {typeof primaryObjective.completed === "boolean" && (
              <p className="mt-1 text-xs text-stone-600">
                Estado: {primaryObjective.completed ? "completado" : "pendiente"}
              </p>
            )}
          </div>
        )}

        {(caseFile.timeline || caseFile.activation) && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {caseFile.timeline && (
              <div className="rounded-lg border border-stone-800 bg-black/15 p-3 text-xs text-stone-500">
                <p className="mb-1 uppercase tracking-[0.22em] text-stone-600">Temporalidad</p>
                <p>{caseFile.timeline.startDate || "Fecha no definida"} · {caseFile.timeline.startTime || "hora incierta"}</p>
                {caseFile.timeline.deadlineTime && <p>Límite: {caseFile.timeline.deadlineTime}</p>}
                {caseFile.timeline.historicalPhase && <p className="mt-1 italic">{caseFile.timeline.historicalPhase}</p>}
              </div>
            )}
            {caseFile.activation && (
              <div className="rounded-lg border border-stone-800 bg-black/15 p-3 text-xs text-stone-500">
                <p className="mb-1 uppercase tracking-[0.22em] text-stone-600">Activación</p>
                <p>{caseFile.activation.visibleFromStart ? "Visible desde el inicio" : "Visible por condiciones"}</p>
                <p>{caseFile.activation.autoActivate ? "Activación automática" : "Activación manual"}</p>
              </div>
            )}
          </div>
        )}
      </article>

      {caseFile.historicalContext && (
        <div className="mt-4 rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Contexto histórico</p>
          <p className="text-sm text-stone-400 leading-relaxed">{caseFile.historicalContext}</p>
        </div>
      )}

      {caseFile.status === "resolved" && (
        <div className="mt-4 rounded-lg border border-green-900 bg-green-950/20 p-3">
          <p className="text-sm text-green-200 leading-relaxed">
            Este expediente fue cerrado mediante la publicación de un artículo. Las consecuencias quedaron registradas en el cuaderno.
          </p>
        </div>
      )}
    </section>
  );
}

function NotebookEvidencesPage({ evidences, compactTitle = false }) {
  const { actions } = useGame();

  return (
    <section>
      {!compactTitle && <NotebookPageTitle title="Evidencias" subtitle="Documentos, objetos, fotografías y registros encontrados." />}
      {evidences.length === 0 ? (
        <EmptyNotebookPage text="Todavía no se registraron evidencias." />
      ) : (
        <div className="space-y-3">
          {evidences.map((evidence) => (
            <article key={evidence.id} className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
              <h4 className="font-semibold text-stone-200">{evidence.title}</h4>
              <p className="text-xs text-stone-500 mt-1">
                {evidence.type} · fuente: {evidence.source} · fiabilidad {evidence.reliability}
              </p>
              {evidence.sourceFlags?.length > 0 && (
                <p className="text-xs text-amber-500 mt-1">
                  Marcas críticas: {evidence.sourceFlags.join(", ")}
                </p>
              )}
              <p className="text-sm text-stone-400 mt-2 leading-relaxed">{evidence.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-stone-700 text-sm hover:bg-stone-800 transition"
                  onClick={() =>
                    actions.openEvidenceInspection(evidence.id, {
                      consumeTime: true,
                      minutes: 5,
                    })
                  }
                >
                  Inspeccionar evidencia
                </button>

                {SourceEvaluationSystem.FLAGS.map((flag) => {
                  const active = evidence.sourceFlags?.includes(flag.id);
                  const incompatibleFlags = SourceEvaluationSystem.INCOMPATIBLE_FLAGS[flag.id] || [];
                  const willReplaceFlags = (evidence.sourceFlags || []).filter((currentFlag) =>
                    incompatibleFlags.includes(currentFlag)
                  );

                  return (
                    <button
                      key={flag.id}
                      disabled={active}
                      title={
                        willReplaceFlags.length > 0
                          ? `Reemplazará: ${willReplaceFlags.join(", ")}`
                          : "Marcar fuente"
                      }
                      className="px-2 py-1 rounded border border-stone-800 text-xs text-stone-400 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => actions.applySourceFlag(evidence.id, flag.id)}
                    >
                      {active
                        ? `✓ ${flag.label}`
                        : willReplaceFlags.length > 0
                          ? `${flag.label} ↺`
                          : flag.label}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NotebookInvestigationPage({ evidences = [], contradictions = [], hypotheses = [] }) {
  const tabs = [
    { id: "evidences", label: "Evidencias", count: evidences.length },
    { id: "contradictions", label: "Contradicciones", count: contradictions.length },
    { id: "hypotheses", label: "Hipótesis", count: hypotheses.length },
  ];
  const [activeTab, setActiveTab] = React.useState("evidences");

  return (
    <section>
      <NotebookPageTitle
        title="Investigación"
        subtitle="Fuentes, contradicciones e hipótesis del expediente reunidas en una misma página."
      />

      <div className="mb-4 flex flex-wrap gap-2 border-b border-stone-800 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rounded-t-lg border px-3 py-2 text-sm transition ${
              activeTab === tab.id
                ? "border-stone-700 bg-stone-100 text-stone-950"
                : "border-stone-800 bg-stone-900/50 text-stone-400 hover:bg-stone-800"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === "evidences" && <NotebookEvidencesPage evidences={evidences} compactTitle />}
      {activeTab === "contradictions" && <NotebookContradictionsPage contradictions={contradictions} compactTitle />}
      {activeTab === "hypotheses" && <NotebookHypothesesPage hypotheses={hypotheses} compactTitle />}
    </section>
  );
}

function NotebookNotesPage({ notes }) {
  return (
    <section>
      <NotebookPageTitle title="Notas" subtitle="Observaciones de investigación vinculadas al expediente activo." />
      {notes.length === 0 ? (
        <EmptyNotebookPage text="No hay notas registradas." />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <article key={note.id} className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
              <p className="text-sm text-stone-300 leading-relaxed">{note.text}</p>
              <p className="text-xs text-stone-600 mt-2">Registrada: {new Date(note.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NotebookPersonalDiaryPage({ notes }) {
  const { state, actions } = useGame();
  const canWritePersonalNote = RestRecoverySystem.canWritePersonalNote(state);
  const personalNoteBlockReason = RestRecoverySystem.getPersonalNoteBlockReason(state);

  return (
    <section>
      <NotebookPageTitle
        title="Diario Personal"
        subtitle="Apuntes íntimos del corresponsal: recuperación emocional, silencios y pensamientos que no pertenecen al expediente formal."
      />
      <div className="mb-4 rounded-lg border border-amber-900/40 bg-amber-950/10 p-3">
        <h4 className="font-semibold text-stone-200 mb-1">Escritura privada</h4>
        <p className="text-sm text-stone-500 leading-relaxed mb-3">
          El corresponsal puede escribir una nota íntima solo cuando dispone de cierta protección y calma. Esto reduce un poco la tensión, avanza el tiempo y queda guardado en este diario, no en el expediente de investigación.
        </p>
        {canWritePersonalNote ? (
          <button
            className="px-3 py-2 rounded-lg border border-amber-900 text-amber-900 text-sm hover:bg-amber-100/40 transition"
            onClick={() => actions.writePersonalNote(3, 15)}
          >
            Escribir nota personal
          </button>
        ) : (
          <p className="text-xs text-stone-600 italic">{personalNoteBlockReason}</p>
        )}
      </div>
      {notes.length === 0 ? (
        <EmptyNotebookPage text="Todavía no hay entradas personales en el diario." />
      ) : (
        <div className="space-y-3">
          {notes.slice().reverse().map((note) => (
            <article key={note.id} className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-3">
              <p className="text-sm text-stone-300 leading-relaxed italic">{note.text}</p>
              {note.tags?.length > 0 && (
                <p className="text-xs text-stone-600 mt-2">
                  Etiquetas: {note.tags.filter((tag) => tag !== "silent").join(", ") || "personal"}
                </p>
              )}
              <p className="text-xs text-stone-600 mt-2">
                Registrada: {new Date(note.createdAt).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NotebookContradictionsPage({ contradictions, compactTitle = false }) {
  return (
    <section>
      {!compactTitle && <NotebookPageTitle title="Contradicciones" subtitle="Choques entre versiones oficiales, testimonios y documentos." />}
      {contradictions.length === 0 ? (
        <EmptyNotebookPage text="Aún no se detectaron contradicciones." />
      ) : (
        <div className="space-y-3">
          {contradictions.map((contradiction) => (
            <article key={contradiction.id} className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
              <h4 className="font-semibold text-stone-200">{contradiction.title}</h4>
              <p className="text-sm text-stone-400 mt-2 leading-relaxed">{contradiction.description}</p>
              <p className="text-xs text-stone-600 mt-2">
                Estado: {contradiction.resolved ? "resuelta" : "sin resolver"}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NotebookHypothesesPage({ hypotheses, compactTitle = false }) {
  const { state, actions } = useGame();
  const availableEvidences = state.notebook.evidences || [];

  return (
    <section>
      {!compactTitle && <NotebookPageTitle title="Hipótesis" subtitle="Interpretaciones provisorias construidas a partir de fuentes." />}
      {hypotheses.length === 0 ? (
        <EmptyNotebookPage text="No hay hipótesis formuladas." />
      ) : (
        <div className="space-y-3">
          {hypotheses.map((hypothesis) => (
            <article key={hypothesis.id} className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
              <h4 className="font-semibold text-stone-200">{hypothesis.title}</h4>
              <p className="text-sm text-stone-400 mt-2 leading-relaxed">{hypothesis.text}</p>
              <p className="text-xs text-stone-600 mt-2">
                A favor: {hypothesis.supportingEvidenceIds?.length || 0} · En contra: {hypothesis.opposingEvidenceIds?.length || 0} · Confianza: {hypothesis.confidence || "provisoria"} · Estado: {hypothesis.status || "abierta"}
              </p>

              {hypothesis.overloaded && (
                <div className="mt-3 rounded-lg border border-amber-900 bg-amber-950/30 p-3">
                  <p className="text-xs uppercase tracking-widest text-amber-500 mb-1">
                    Hipótesis saturada
                  </p>
                  <p className="text-sm text-amber-200 italic leading-relaxed">
                    “La reconstrucción comienza a absorber demasiadas piezas dispersas. Algunas conexiones podrían estar forzándose más allá de lo que las pruebas permiten.”
                  </p>
                  <p className="text-xs text-amber-400 mt-2">
                    Penalización de saturación: {hypothesis.overloadPenaltyLevel || 0}
                  </p>
                </div>
              )}

              {availableEvidences.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-stone-500">
                    Vincular evidencias
                  </p>
                  {availableEvidences.map((evidence) => {
                    const supports = hypothesis.supportingEvidenceIds?.includes(evidence.id);
                    const opposes = hypothesis.opposingEvidenceIds?.includes(evidence.id);

                    return (
                      <div key={evidence.id} className="rounded-lg border border-stone-800 bg-stone-950/40 p-2">
                        <p className="text-xs text-stone-400 mb-2">{evidence.title}</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="px-2 py-1 rounded border border-green-900 text-xs text-green-300 hover:bg-green-950/40 disabled:opacity-40"
                            disabled={supports}
                            onClick={() => actions.addSupportingEvidenceToHypothesis(hypothesis.id, evidence.id)}
                          >
                            {supports ? "Ya apoya" : "Apoya"}
                          </button>
                          <button
                            className="px-2 py-1 rounded border border-red-900 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-40"
                            disabled={opposes}
                            onClick={() => actions.addOpposingEvidenceToHypothesis(hypothesis.id, evidence.id)}
                          >
                            {opposes ? "Ya contradice" : "Contradice"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NotebookArticlesPage({ articles }) {
  const { state, actions } = useGame();
  const [previewArticle, setPreviewArticle] = React.useState(null);
  const evidenceCount = state.notebook.evidences.length;
  const hypothesisCount = state.notebook.hypotheses.length;
  const hasDraftArticle = (state.notebook.articles || []).some(
    (item) => !item.published && item.publicationStatus !== "censored"
  );

  React.useEffect(() => {
    setPreviewArticle(null);
  }, [state.notebook.activeCase?.id]);

  const canGenerateArticle =
    Boolean(state.notebook.activeCase) &&
    !hasDraftArticle &&
    evidenceCount >= 2 &&
    hypothesisCount >= 1;

  const articleReadinessText = canGenerateArticle
    ? "Ya hay material suficiente para preparar el artículo de cierre. Elegí una línea editorial para revisar el texto antes de publicarlo."
    : !state.notebook.activeCase
      ? "No hay un caso activo. Activá un expediente antes de preparar el artículo final."
      : evidenceCount === 0
      ? "Primero necesitás encontrar evidencias en el mapa o investigando una zona."
      : hypothesisCount === 0
        ? "Antes del artículo conviene generar o confirmar una hipótesis del caso."
        : evidenceCount < 2
          ? "Todavía conviene reunir al menos una evidencia más antes de redactar el artículo."
          : hasDraftArticle
            ? "Ya existe un artículo preparado o publicado para este expediente. Revisalo en esta página."
            : "El expediente aún no está listo.";

  function prepareArticlePreview(tone = "humanitario") {
    const article = AutoWritingSystem.buildArticleFromNotebook(
      state.notebook,
      state.player,
      state.worldState,
      tone
    );
    if (!article) return;
    setPreviewArticle(article);
  }

  function publishPreviewArticle() {
    if (!previewArticle) return;
    actions.addArticle({
      title: previewArticle.title,
      body: previewArticle.body,
      tone: previewArticle.tone,
    });
    setPreviewArticle(null);
  }

  return (
    <section>
      <NotebookPageTitle title="Artículos" subtitle="Preparación, revisión, censura y publicación de crónicas." />

      <div className="mb-4 rounded-lg border border-stone-800 bg-stone-900/60 p-3">
        <h4 className="font-semibold text-stone-200 mb-2">Preparar artículo final</h4>
        <p className="text-sm text-stone-500 leading-relaxed mb-2">
          El artículo final cierra el caso activo solamente después de publicarlo. Antes de confirmar, el corresponsal puede leer el texto y volver para elegir otro enfoque.
        </p>
        <div className={`rounded-lg border p-3 mb-3 ${canGenerateArticle ? "border-green-900 bg-green-950/20 text-green-200" : "border-amber-900 bg-amber-950/20 text-amber-200"}`}>
          <p className="text-sm">{articleReadinessText}</p>
        </div>

        {previewArticle ? (
          <div className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-3">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-amber-400">Vista previa del artículo</p>
                <h4 className="mt-1 text-base font-semibold text-amber-100">{previewArticle.title}</h4>
                <p className="mt-1 text-xs text-amber-300/80">
                  Tono: {previewArticle.tone} · riesgo de censura: {previewArticle.censorshipRisk}
                </p>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950/70 p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{previewArticle.body}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-200 transition hover:bg-stone-800"
                onClick={() => setPreviewArticle(null)}
              >
                Volver y cambiar artículo
              </button>
              <button
                className="rounded-lg bg-amber-200 px-3 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
                onClick={publishPreviewArticle}
              >
                Publicar artículo y cerrar caso
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <button
              className="px-3 py-2 rounded-lg border border-stone-700 text-sm hover:bg-stone-800 transition disabled:opacity-40 text-left"
              disabled={!canGenerateArticle}
              onClick={() => prepareArticlePreview("oficial")}
            >
              Versión oficial: prudente y aceptable para los mandos
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-stone-700 text-sm hover:bg-stone-800 transition disabled:opacity-40 text-left"
              disabled={!canGenerateArticle}
              onClick={() => prepareArticlePreview("humanitario")}
            >
              Crónica humanitaria: centrada en el sufrimiento humano
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-red-900 text-red-200 text-sm hover:bg-red-950/30 transition disabled:opacity-40 text-left"
              disabled={!canGenerateArticle}
              onClick={() => prepareArticlePreview("critico")}
            >
              Denuncia crítica: confronta documentos y contradicciones
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-yellow-900 text-yellow-200 text-sm hover:bg-yellow-950/30 transition disabled:opacity-40 text-left"
              disabled={!canGenerateArticle}
              onClick={() => prepareArticlePreview("propaganda")}
            >
              Propaganda: sacrifica verdad por moral y acceso militar
            </button>
          </div>
        )}
      </div>

      {articles.length === 0 ? (
        <EmptyNotebookPage text="Todavía no se redactaron artículos." />
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <article key={article.id} className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
              <h4 className="font-semibold text-stone-200">{article.title}</h4>
              <p className="text-xs text-stone-500 mt-1">
                Tono: {article.tone} · riesgo de censura: {article.censorshipRisk} · presión {article.censorshipScore || 0}
              </p>
              {article.censored && article.redactedBody ? (
                <div className="mt-2 rounded-lg border border-red-900 bg-red-950/20 p-3">
                  <p className="text-xs uppercase tracking-widest text-red-400 mb-2">
                    Versión intervenida por censura
                  </p>
                  <p className="text-sm text-red-100 leading-relaxed">{article.redactedBody}</p>
                </div>
              ) : (
                <p className="text-sm text-stone-400 mt-2 leading-relaxed">{article.body}</p>
              )}
              <p className="text-xs text-stone-600 mt-2">
                Estado: {article.published ? "publicado" : "borrador"}
              </p>
              {article.publicationStatus === "published" && !article.consequencesApplied && state.notebook.activeCase && (
                <button
                  className="mt-3 mr-2 px-3 py-2 rounded-lg bg-amber-200 text-amber-950 text-sm font-semibold hover:bg-amber-100 transition"
                  onClick={() => actions.applyArticleConsequences(article.id)}
                >
                  Cerrar caso con este artículo
                </button>
              )}

              {article.publicationStatus === "draft" && (
                <button
                  className="mt-3 mr-2 px-3 py-2 rounded-lg border border-stone-700 text-sm hover:bg-stone-800 transition"
                  onClick={() => actions.reviewArticleForCensorship(article.id)}
                >
                  Enviar a revisión
                </button>
              )}

              {article.publicationStatus === "censored" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="px-3 py-2 rounded-lg bg-red-200 text-red-950 text-sm font-semibold hover:bg-red-100 transition"
                    onClick={() => actions.forcePublishArticle(article.id)}
                  >
                    Desafiar censura
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg bg-stone-200 text-stone-950 text-sm font-semibold hover:bg-white transition"
                    onClick={() => actions.softenArticle(article.id)}
                  >
                    Suavizar artículo
                  </button>
                </div>
              )}

              {!article.published && article.publicationStatus === "reviewed" && (
                <button
                  className="mt-3 px-3 py-2 rounded-lg bg-stone-200 text-stone-950 text-sm font-semibold hover:bg-white transition"
                  onClick={() => actions.applyArticleConsequences(article.id)}
                >
                  Publicar y aplicar consecuencias
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NotebookReconstructionPage({ notebook, actions }) {
  const [interpretationType, setInterpretationType] = React.useState("critica");
  const [title, setTitle] = React.useState("");
  const [text, setText] = React.useState("");
  const [confidence, setConfidence] = React.useState("provisoria");
  const [selectedEvidenceIds, setSelectedEvidenceIds] = React.useState([]);
  const [selectedContradictionIds, setSelectedContradictionIds] = React.useState([]);

  const interpretationTypes = {
    oficial: "Versión oficial",
    humanitaria: "Lectura humanitaria",
    critica: "Interpretación crítica",
    propaganda: "Propaganda",
    ambigua: "Verdad parcial / ambigua",
  };

  function toggleEvidence(evidenceId) {
    setSelectedEvidenceIds((current) =>
      current.includes(evidenceId)
        ? current.filter((id) => id !== evidenceId)
        : [...current, evidenceId]
    );
  }

  function toggleContradiction(contradictionId) {
    setSelectedContradictionIds((current) =>
      current.includes(contradictionId)
        ? current.filter((id) => id !== contradictionId)
        : [...current, contradictionId]
    );
  }

  function saveReconstruction() {
    if (!title.trim() || !text.trim()) return;

    actions.addReconstruction({
      interpretationType,
      title: title.trim(),
      text: text.trim(),
      evidenceIds: selectedEvidenceIds,
      contradictionIds: selectedContradictionIds,
      confidence,
    });

    setTitle("");
    setText("");
    setSelectedEvidenceIds([]);
    setSelectedContradictionIds([]);
    setConfidence("provisoria");
    setInterpretationType("critica");
  }

  return (
    <section>
      <NotebookPageTitle
        title="Reconstrucción histórica"
        subtitle="Construye una interpretación a partir de fuentes, contradicciones y decisiones narrativas."
      />

      <div className="space-y-5">
        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <h4 className="font-semibold text-stone-200 mb-3">Nueva reconstrucción</h4>

          <label className="block mb-3">
            <span className="text-xs uppercase tracking-widest text-stone-500">Tipo de interpretación</span>
            <select
              className="mt-2 w-full rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-stone-400"
              value={interpretationType}
              onChange={(event) => setInterpretationType(event.target.value)}
            >
              {Object.entries(interpretationTypes).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block mb-3">
            <span className="text-xs uppercase tracking-widest text-stone-500">Título</span>
            <input
              className="mt-2 w-full rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-stone-400"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ejemplo: El avance que no fue avance"
            />
          </label>

          <label className="block mb-3">
            <span className="text-xs uppercase tracking-widest text-stone-500">Interpretación</span>
            <textarea
              className="mt-2 w-full min-h-28 rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-stone-400"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Explica qué pudo haber ocurrido realmente, qué fuentes sostienen tu lectura y qué dudas quedan abiertas."
            />
          </label>

          <label className="block mb-3">
            <span className="text-xs uppercase tracking-widest text-stone-500">Confianza</span>
            <select
              className="mt-2 w-full rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-stone-400"
              value={confidence}
              onChange={(event) => setConfidence(event.target.value)}
            >
              <option value="provisoria">Provisoria</option>
              <option value="moderada">Moderada</option>
              <option value="alta">Alta</option>
              <option value="dudosa">Dudosa</option>
            </select>
          </label>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <h4 className="font-semibold text-stone-200 mb-2">Vincular evidencias</h4>
          {notebook.evidences.length === 0 ? (
            <EmptyNotebookPage text="No hay evidencias disponibles para vincular." />
          ) : (
            <div className="space-y-2">
              {notebook.evidences.map((evidence) => (
                <label key={evidence.id} className="flex gap-2 items-start text-sm text-stone-400">
                  <input
                    type="checkbox"
                    checked={selectedEvidenceIds.includes(evidence.id)}
                    onChange={() => toggleEvidence(evidence.id)}
                    className="mt-1"
                  />
                  <span>{evidence.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <h4 className="font-semibold text-stone-200 mb-2">Vincular contradicciones</h4>
          {notebook.contradictions.length === 0 ? (
            <EmptyNotebookPage text="No hay contradicciones disponibles para vincular." />
          ) : (
            <div className="space-y-2">
              {notebook.contradictions.map((contradiction) => (
                <label key={contradiction.id} className="flex gap-2 items-start text-sm text-stone-400">
                  <input
                    type="checkbox"
                    checked={selectedContradictionIds.includes(contradiction.id)}
                    onChange={() => toggleContradiction(contradiction.id)}
                    className="mt-1"
                  />
                  <span>{contradiction.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          className="w-full px-4 py-3 rounded-lg bg-stone-200 text-stone-950 font-semibold hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!title.trim() || !text.trim()}
          onClick={saveReconstruction}
        >
          Guardar reconstrucción histórica
        </button>

        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <h4 className="font-semibold text-stone-200 mb-3">Reconstrucciones guardadas</h4>
          {!notebook.reconstructions?.length ? (
            <EmptyNotebookPage text="Aún no hay reconstrucciones guardadas." />
          ) : (
            <div className="space-y-3">
              {notebook.reconstructions.map((reconstruction) => (
                <article key={reconstruction.id} className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
                  <h5 className="font-semibold text-stone-200">{reconstruction.title}</h5>
                  <p className="text-xs text-stone-500 mt-1">
                    {interpretationTypes[reconstruction.interpretationType]} · confianza {reconstruction.confidence} · estado {reconstruction.status || "estable"}
                  </p>
                  <p className="text-sm text-stone-400 mt-2 leading-relaxed">{reconstruction.text}</p>
                  <p className="text-xs text-stone-600 mt-2">
                    Evidencias vinculadas: {reconstruction.evidenceIds.length} · contradicciones vinculadas: {reconstruction.contradictionIds.length} · inestabilidad {reconstruction.instabilityLevel || 0}
                  </p>
                  {reconstruction.narrativeFragments?.length > 0 && (
                    <div className="mt-3 rounded-lg border border-amber-900 bg-amber-950/20 p-3">
                      <p className="text-xs uppercase tracking-widest text-amber-500 mb-2">
                        Fragmentos de incertidumbre
                      </p>
                      <ul className="space-y-1 text-xs text-amber-200 italic">
                        {reconstruction.narrativeFragments.map((fragment) => (
                          <li key={fragment.id}>“{fragment.text}”</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    className="mt-3 px-3 py-2 rounded-lg bg-stone-200 text-stone-950 text-sm font-semibold hover:bg-white transition"
                    onClick={() => actions.applyReconstructionConsequences(reconstruction.id)}
                  >
                    Aplicar impacto narrativo
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AvailableCasesPanel({ cases = [], narrativeFlags = {}, onSelectCase }) {
  const availableCases = cases.filter(
    (caseFile) => ["available", "active"].includes(caseFile.status)
  );

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3 space-y-3">
      <p className="text-stone-500 text-xs uppercase tracking-widest">
        Casos disponibles
      </p>

      {availableCases.length === 0 ? (
        <p className="text-stone-500 italic text-sm">
          No hay nuevas investigaciones disponibles.
        </p>
      ) : (
        availableCases.map((caseFile) => (
          <div
            key={caseFile.id}
            className="rounded border border-stone-800 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-stone-200">
                  {caseFile.title}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Prioridad: {caseFile.getDerivedPriority(narrativeFlags)} ·
                  Urgencia: {caseFile.getDerivedUrgency(narrativeFlags)}
                </p>
              </div>

              <button
                className="px-3 py-1 rounded border border-stone-700 text-xs hover:bg-stone-800"
                onClick={() => onSelectCase(caseFile)}
              >
                Investigar
              </button>
            </div>

            <p className="text-sm text-stone-400 mt-3 leading-relaxed">
              {caseFile.summary}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

function NotebookStatusPage({
  player,
  flags,
  worldState,
  factionMemory,
  persistentConsequences = [],
}) {
  const activeFlags = Object.entries(flags || {}).filter(([, value]) => value === true);
  const worldNarrative = WorldStateSystem.getNarrativeState(worldState);
  const factionEffects = FactionMemorySystem.getGameplayEffects(factionMemory || {});

  return (
    <section>
      <NotebookPageTitle title="Estado del corresponsal" subtitle="Condición narrativa, credibilidad y vínculos." />
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <p className="text-stone-500 text-xs uppercase tracking-widest mb-1">Identidad</p>
          <p className="text-stone-300">{player.name || "Sin nombre registrado"}</p>
          <p className="text-stone-500">Perfil: {player.getProfileLabel()}</p>
          <p className="text-stone-500">Nacionalidad: {player.nationality || "no definida"}</p>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <p className="text-stone-500 text-xs uppercase tracking-widest mb-1">Condición</p>
          <p className="text-stone-300">Credibilidad: {player.credibility}</p>
          <p className="text-stone-300">
            Estado emocional: {NarrativeStressSystem.getStressLabel(player.stress)}
          </p>
          <p className="text-stone-500 mt-1 italic">
            {NarrativeStressSystem.getClarityDescription(player.stress)}
          </p>
          <p className="text-stone-600 mt-1">
            Sesgo interpretativo: {PsychologicalStateSystem.getInterpretationBias(player.stress)}
          </p>
          <div className="mt-3 text-xs text-stone-600 space-y-1">
            <p>Habituación a bombardeos: {player.psychologicalResistance?.bombardment || 0}</p>
            <p>Habituación a heridos: {player.psychologicalResistance?.wounded || 0}</p>
            <p>Habituación a cadáveres: {player.psychologicalResistance?.corpses || 0}</p>
            <p className="mt-2 italic">Recuperación: descansar en zonas seguras puede reducir el estrés, pero hace avanzar el tiempo del caso.</p>
            <p className="italic">En el puesto médico, hablar con el personal puede aliviar menos estrés, pero fortalece el vínculo con médicos.</p>
            <p className="italic">Escribir una nota personal en la trinchera o el puesto de mando reduce poco estrés, pero deja un registro íntimo del corresponsal.</p>
            <p className="italic">Dormir unas horas recupera mucho más, aunque hace avanzar el frente y puede cerrar oportunidades de investigación.</p>
            <p className="italic">El refugio civil requiere confianza con civiles: alivia mucho estrés y fortalece redes humanas fuera del control militar.</p>
            <p className="italic">Con suficiente confianza médica, el personal sanitario puede proteger temporalmente al corresponsal y reducir el riesgo de confiscación.</p>
            {flags?.medicalProtectionActive && (
              <p className="italic text-sky-700">
                Protección médica activa: el personal médico ayuda a resguardar al corresponsal ante revisiones extremas.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <p className="text-stone-500 text-xs uppercase tracking-widest mb-2">Reputación</p>
          <div className="grid grid-cols-2 gap-2 text-stone-400">
            <p>Soldados: {player.reputation.soldiers}</p>
            <p>Oficiales: {player.reputation.officers}</p>
            <p>Civiles: {player.reputation.civilians}</p>
            <p>Prensa: {player.reputation.press}</p>
          </div>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <p className="text-stone-500 text-xs uppercase tracking-widest mb-2">Estado histórico dinámico</p>
          <div className="space-y-2 text-stone-400">
            <p>Credibilidad pública: {worldState?.credibility ?? 50}</p>
            <p className="text-xs text-stone-600 italic">{worldNarrative.credibility}</p>
            <p>Presión militar: {worldState?.militaryPressure ?? 0}</p>
            <p className="text-xs text-stone-600 italic">{worldNarrative.militaryPressure}</p>
            <p>Moral pública: {worldState?.publicMorale ?? 50}</p>
            <p className="text-xs text-stone-600 italic">{worldNarrative.publicMorale}</p>
          </div>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <p className="text-stone-500 text-xs uppercase tracking-widest mb-2">Memoria de facciones</p>
          <div className="space-y-2 text-stone-400 text-sm">
            {Object.entries(factionMemory || {}).map(([faction, value]) => (
              <div key={faction}>
                <p>
                  {faction}: {value}
                </p>
                <p className="text-xs text-stone-600 italic">
                  {FactionMemorySystem.buildNarrative(faction, value)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-stone-600 space-y-1">
            {factionEffects.armyAccessBlocked && <p>• El ejército bloquea accesos clave.</p>}
            {factionEffects.armyCheckpointActive && <p>• Se activan controles militares adicionales.</p>}
            {factionEffects.deserterIntelUnlocked && <p>• Los desertores comparten información sensible.</p>}
            {factionEffects.deserterContactHidden && <p>• Los desertores evitan todo contacto.</p>}
            {factionEffects.medicProtection && <p>• Los médicos ayudan a ocultar al corresponsal.</p>}
            {factionEffects.medicRefusesHelp && <p>• El personal médico rechaza colaborar.</p>}
            {factionEffects.pressSupport && <p>• Parte de la prensa protege las publicaciones.</p>}
            {factionEffects.pressSmearsPlayer && <p>• Otros corresponsales desacreditan su trabajo.</p>}
            {factionEffects.civilianRumors && <p>• Los civiles difunden rumores negativos.</p>}
            {factionEffects.civilianShelter && <p>• Civiles simpatizantes ofrecen refugio temporal.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <p className="text-stone-500 text-xs uppercase tracking-widest mb-2">
            Consecuencias persistentes
          </p>
          {persistentConsequences.length === 0 ? (
            <p className="text-stone-500 italic">
              Aún no existen consecuencias históricas permanentes.
            </p>
          ) : (
            <div className="space-y-3 text-sm text-stone-400">
              {persistentConsequences.map((consequence) => (
                <div key={consequence.id} className="rounded border border-stone-800 p-2">
                  <p className="font-semibold text-stone-200">{consequence.title}</p>
                  <p className="text-xs text-stone-600 uppercase tracking-widest mt-1">
                    {consequence.severity}
                  </p>
                  <p className="mt-2 leading-relaxed">{consequence.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <p className="text-stone-500 text-xs uppercase tracking-widest mb-2">Flags narrativos</p>
          {activeFlags.length === 0 ? (
            <p className="text-stone-500 italic">No hay consecuencias narrativas activas.</p>
          ) : (
            <ul className="space-y-1 text-stone-400">
              {activeFlags.map(([key]) => (
                <li key={key}>• {key}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function NotebookCaseEventsPage({ caseEvents }) {
  function getSeverityStyle(severity) {
    const styles = {
      leve: "border-stone-500/50 bg-stone-200/30 text-stone-900",
      media: "border-red-800/50 bg-red-950/10 text-stone-900",
      grave: "border-red-950/70 bg-red-950/20 text-stone-950",
    };

    return styles[severity] || styles.media;
  }

  function getSeverityLabel(severity) {
    const labels = {
      leve: "Leve",
      media: "Media",
      grave: "Grave",
    };

    return labels[severity] || "Media";
  }

  return (
    <section>
      <NotebookPageTitle
        title="Eventos del caso"
        subtitle="Impactos automáticos de contradicciones, tensiones e inestabilidad histórica."
      />
      {caseEvents.length === 0 ? (
        <EmptyNotebookPage text="Todavía no hay eventos automáticos del caso." />
      ) : (
        <div className="space-y-3">
          {caseEvents.map((event) => (
            <article key={event.id} className={`rounded-lg border p-3 shadow-sm ${getSeverityStyle(event.severity)}`}>
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold text-red-950">{event.title}</h4>
                <span className="text-[10px] uppercase tracking-widest rounded-full border border-red-900/60 px-2 py-1 text-red-950 bg-red-950/5">
                  {getSeverityLabel(event.severity)}
                </span>
              </div>
              <p className="text-xs text-red-900/80 mt-1">Tipo: {event.type}</p>
              <p className="text-sm mt-2 leading-relaxed text-stone-950">{event.text}</p>
              <p className="text-xs text-red-900/70 mt-2">
                Registrado: {new Date(event.createdAt).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NotebookArchivePage({ archive = [] }) {
  const [selectedCaseId, setSelectedCaseId] = React.useState(archive[archive.length - 1]?.id || null);
  const selected = archive.find((entry) => entry.id === selectedCaseId) || archive[archive.length - 1] || null;
  const [section, setSection] = React.useState("evidences");
  const [selectedItemKey, setSelectedItemKey] = React.useState(null);

  React.useEffect(() => {
    if (!selectedCaseId && archive.length > 0) {
      setSelectedCaseId(archive[archive.length - 1].id);
    }
  }, [archive.length, selectedCaseId]);

  React.useEffect(() => {
    setSelectedItemKey(null);
  }, [selectedCaseId, section]);

  const sectionLabels = {
    evidences: "Evidencias",
    notes: "Notas",
    contradictions: "Contradicciones",
    hypotheses: "Hipótesis",
    article: "Artículo",
  };

  const currentItems = selected
    ? section === "article"
      ? selected.article ? [selected.article] : []
      : selected[section] || []
    : [];

  const selectedItem = currentItems.find((item, index) => getArchiveItemKey(item, index) === selectedItemKey) || currentItems[0] || null;

  function getArchiveItemKey(item, index) {
    return item?.id || `${section}_${index}`;
  }

  function getItemTitle(item, index) {
    if (!item) return "Registro archivado";
    return item.title || item.text?.slice(0, 42) || `Registro ${index + 1}`;
  }

  function getItemSubtitle(item) {
    if (!item) return "";

    if (section === "evidences") {
      return `${item.type || "evidencia"} · ${item.reliability || "fiabilidad no indicada"}`;
    }

    if (section === "notes") {
      return item.createdAt ? `Registrada: ${new Date(item.createdAt).toLocaleString()}` : "Nota del corresponsal";
    }

    if (section === "contradictions") {
      return `Severidad: ${item.severity || "media"}`;
    }

    if (section === "hypotheses") {
      return `Confianza: ${item.confidence || "provisoria"} · Estado: ${item.status || "abierta"}`;
    }

    return `Tono: ${item.tone || "neutral"} · Estado: ${item.publicationStatus || "archivado"}`;
  }

  function renderDetailList(title, values = []) {
    const safeValues = values.filter(Boolean);
    if (!safeValues.length) return null;

    return (
      <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
        <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">{title}</p>
        <ul className="space-y-1 text-sm text-stone-400">
          {safeValues.map((value, index) => (
            <li key={`${title}_${index}`}>• {value}</li>
          ))}
        </ul>
      </div>
    );
  }

  function renderSelectedDetail() {
    if (!selectedItem) {
      return <EmptyNotebookPage text={`No hay registros en ${sectionLabels[section].toLowerCase()} para este caso.`} />;
    }

    if (section === "evidences") {
      return (
        <article className="rounded-lg border border-stone-800 bg-stone-900/60 p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-stone-200">{selectedItem.title}</h4>
            <p className="text-xs text-stone-500 mt-1">
              {selectedItem.type} · fuente: {selectedItem.source} · fiabilidad {selectedItem.reliability}
            </p>
          </div>
          <p className="text-sm text-stone-400 leading-relaxed">{selectedItem.description}</p>
          {renderDetailList("Marcas críticas", selectedItem.sourceFlags || [])}
          {renderDetailList("Fuentes vinculadas", (selectedItem.sourceLinks || []).map((link) => `${link.sourceId} · ${link.relationType || "relación"} · confianza ${link.confidence || "media"}`))}
          <div className="grid md:grid-cols-2 gap-2 text-xs text-stone-600">
            <p>ID: {selectedItem.id}</p>
            <p>Ubicación original: {selectedItem.locationId || "sin ubicación"}</p>
          </div>
        </article>
      );
    }

    if (section === "notes") {
      return (
        <article className="rounded-lg border border-stone-800 bg-stone-900/60 p-4 space-y-3">
          <h4 className="font-semibold text-stone-200">Nota archivada</h4>
          <p className="text-sm text-stone-300 leading-relaxed">{selectedItem.text}</p>
          {renderDetailList("Evidencias relacionadas", selectedItem.relatedEvidenceIds || [])}
          {renderDetailList("Etiquetas", selectedItem.tags || [])}
          {selectedItem.createdAt && <p className="text-xs text-stone-600">Registrada: {new Date(selectedItem.createdAt).toLocaleString()}</p>}
        </article>
      );
    }

    if (section === "contradictions") {
      return (
        <article className="rounded-lg border border-red-900 bg-red-950/20 p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-stone-200">{selectedItem.title}</h4>
            <p className="text-xs text-stone-500 mt-1">Severidad: {selectedItem.severity} · Estado: {selectedItem.resolved ? "resuelta" : "sin resolver"}</p>
          </div>
          <p className="text-sm text-stone-400 leading-relaxed">{selectedItem.description}</p>
          {renderDetailList("Evidencias en tensión", selectedItem.evidenceIds || [])}
          <p className="text-xs text-stone-600">ID: {selectedItem.id}</p>
        </article>
      );
    }

    if (section === "hypotheses") {
      return (
        <article className="rounded-lg border border-stone-800 bg-stone-900/60 p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-stone-200">{selectedItem.title}</h4>
            <p className="text-xs text-stone-500 mt-1">Confianza: {selectedItem.confidence} · Estado: {selectedItem.status}</p>
          </div>
          <p className="text-sm text-stone-400 leading-relaxed">{selectedItem.text}</p>
          {renderDetailList("Evidencias que apoyan", selectedItem.supportingEvidenceIds || [])}
          {renderDetailList("Evidencias que contradicen", selectedItem.opposingEvidenceIds || [])}
          {renderDetailList("Etiquetas", selectedItem.tags || [])}
          <div className="grid md:grid-cols-2 gap-2 text-xs text-stone-600">
            <p>Saturada: {selectedItem.overloaded ? "sí" : "no"}</p>
            <p>Penalización: {selectedItem.overloadPenaltyLevel || 0}</p>
          </div>
        </article>
      );
    }

    return (
      <article className="rounded-lg border border-stone-800 bg-stone-900/60 p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-stone-200">{selectedItem.title}</h4>
          <p className="text-xs text-stone-500 mt-1">
            Tono: {selectedItem.tone} · Estado: {selectedItem.publicationStatus} · Riesgo de censura: {selectedItem.censorshipRisk}
          </p>
        </div>
        {selectedItem.redactedBody && (
          <div className="rounded-lg border border-red-900 bg-red-950/20 p-3">
            <p className="text-xs uppercase tracking-widest text-red-400 mb-2">Versión censurada</p>
            <p className="text-sm text-red-100 leading-relaxed">{selectedItem.redactedBody}</p>
          </div>
        )}
        <div className="rounded-lg border border-stone-800 bg-stone-950/40 p-3">
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Texto publicado</p>
          <p className="text-sm text-stone-400 leading-relaxed">{selectedItem.body}</p>
        </div>
      </article>
    );
  }

  return (
    <section>
      <NotebookPageTitle
        title="Archivo"
        subtitle="Expedientes cerrados. Seleccioná un caso y luego hacé click en cada registro para ver sus detalles."
      />

      {archive.length === 0 ? (
        <EmptyNotebookPage text="Todavía no hay casos archivados." />
      ) : (
        <div className="grid md:grid-cols-[240px_1fr] gap-4">
          <aside className="space-y-2">
            {archive.slice().reverse().map((entry) => (
              <button
                key={entry.id}
                className={`w-full text-left rounded-lg border p-3 text-sm transition ${selected?.id === entry.id ? "border-amber-700 bg-amber-950/25" : "border-stone-800 bg-stone-900/60 hover:bg-stone-800/60"}`}
                onClick={() => setSelectedCaseId(entry.id)}
              >
                <strong className="block text-stone-200">{entry.title}</strong>
                <span className="text-xs text-stone-600">{new Date(entry.closedAt).toLocaleString()}</span>
              </button>
            ))}
          </aside>

          {selected && (
            <div className="space-y-4 min-w-0">
              <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
                <h4 className="font-semibold text-stone-200">{selected.title}</h4>
                <p className="text-sm text-stone-400 mt-2 leading-relaxed">{selected.summary}</p>
                <p className="text-xs text-stone-600 mt-2">Cierre: {selected.closureType}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(sectionLabels).map(([id, label]) => (
                  <button
                    key={id}
                    className={`px-3 py-2 rounded-lg border text-xs transition ${section === id ? "border-stone-200 bg-stone-200 text-stone-950" : "border-stone-700 hover:bg-stone-800"}`}
                    onClick={() => setSection(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {currentItems.length === 0 ? (
                <EmptyNotebookPage text={`No hay registros en ${sectionLabels[section].toLowerCase()} para este caso.`} />
              ) : (
                <div className="grid md:grid-cols-[260px_1fr] gap-3">
                  <div className="space-y-2">
                    {currentItems.map((item, index) => {
                      const key = getArchiveItemKey(item, index);
                      const selectedButton = selectedItem?.id
                        ? selectedItem.id === item.id
                        : selectedItemKey === key || (!selectedItemKey && index === 0);

                      return (
                        <button
                          key={key}
                          className={`w-full text-left rounded-lg border p-3 text-sm transition ${selectedButton ? "border-stone-200 bg-stone-200/80 text-stone-950" : "border-stone-800 bg-stone-900/60 hover:bg-stone-800/60"}`}
                          onClick={() => setSelectedItemKey(key)}
                        >
                          <strong className="block text-sm">{getItemTitle(item, index)}</strong>
                          <span className="text-xs opacity-70">{getItemSubtitle(item)}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="min-w-0">
                    {renderSelectedDetail()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function NotebookConsequencesPage({ consequenceLog }) {
  return (
    <section>
      <NotebookPageTitle
        title="Consecuencias"
        subtitle="Registro de efectos provocados por publicaciones e interpretaciones."
      />
      {consequenceLog.length === 0 ? (
        <EmptyNotebookPage text="Todavía no se aplicaron consecuencias importantes." />
      ) : (
        <div className="space-y-3">
          {consequenceLog.map((entry) => (
            <article key={entry.id} className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
              <h4 className="font-semibold text-stone-200">{entry.title}</h4>
              <p className="text-xs text-stone-500 mt-1">Tipo: {entry.type}</p>
              <p className="text-sm text-stone-400 mt-2 leading-relaxed">{entry.summary}</p>
              <div className="mt-2 text-xs text-stone-600 space-y-1">
                <p>Credibilidad: {entry.credibilityChange >= 0 ? "+" : ""}{entry.credibilityChange}</p>
                <p>Impacto emocional: {entry.stressChange > 0 ? "aumenta la tensión" : entry.stressChange < 0 ? "alivia parcialmente" : "sin cambio visible"}</p>
                <p>
                  Reputación: {Object.entries(entry.reputationChanges || {})
                    .map(([faction, amount]) => `${faction} ${amount >= 0 ? "+" : ""}${amount}`)
                    .join(", ") || "sin cambios"}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function NotebookGuidePage({ actions }) {
  const { state } = useGame();
  const evidenceCount = state.notebook.evidences.length;
  const contradictionCount = state.notebook.contradictions.length;
  const hypothesisCount = state.notebook.hypotheses.length;
  const articleCount = state.notebook.articles.length;
  const hasDraftArticle = (state.notebook.articles || []).some(
    (item) => !item.published && item.publicationStatus !== "censored"
  );

  const canGenerateHypothesis = evidenceCount > 0;
  const canGenerateArticle =
    !hasDraftArticle &&
    evidenceCount >= 2 &&
    hypothesisCount >= 1;

  const articleReadinessText = canGenerateArticle
    ? "Ya hay material suficiente para preparar un artículo. Elegí una línea editorial."
    : evidenceCount === 0
      ? "Primero necesitás encontrar evidencias en el mapa o investigando una zona."
      : hypothesisCount === 0
        ? "Antes del artículo conviene generar o confirmar una hipótesis del caso."
        : evidenceCount < 2
          ? "Todavía conviene reunir al menos una evidencia más antes de redactar el artículo."
          : hasDraftArticle
            ? "Ya existe un borrador de artículo. Revisalo en la pestaña Artículos."
            : "El expediente aún no está listo.";

  function generateHypothesis() {
    const hypothesis = AutoWritingSystem.buildHypothesisFromNotebook(state.notebook);
    if (!hypothesis) return;
    actions.addHypothesis({
      title: hypothesis.title,
      text: hypothesis.text,
      supportingEvidenceIds: hypothesis.supportingEvidenceIds,
      opposingEvidenceIds: hypothesis.opposingEvidenceIds,
      confidence: hypothesis.confidence,
      status: hypothesis.status,
      tags: ["auto_generated", "manual_request"],
      consumeTime: true,
      minutes: 20,
    });
  }

  function generateArticle(tone = "humanitario") {
    const article = AutoWritingSystem.buildArticleFromNotebook(
      state.notebook,
      state.player,
      state.worldState,
      tone
    );
    if (!article) return;
    actions.addArticle({
      title: article.title,
      body: article.body,
      tone: article.tone,
    });
  }

  return (
    <section>
      <NotebookPageTitle
        title="Guía de investigación"
        subtitle="El cuaderno organiza el caso: primero reúne evidencias, luego formula hipótesis y finalmente prepara el artículo."
      />

      <div className="space-y-4">
        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <h4 className="font-semibold text-stone-200 mb-3">Estado del expediente</h4>
          <div className="grid md:grid-cols-4 gap-2 text-sm">
            <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
              <p className="text-stone-500 text-xs uppercase tracking-widest">Evidencias</p>
              <p className="text-2xl font-serif text-stone-100">{evidenceCount}</p>
              <p className="text-xs text-stone-600">Mínimo sugerido: 2</p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
              <p className="text-stone-500 text-xs uppercase tracking-widest">Contradicciones</p>
              <p className="text-2xl font-serif text-stone-100">{contradictionCount}</p>
              <p className="text-xs text-stone-600">Opcionales, pero enriquecen el caso</p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
              <p className="text-stone-500 text-xs uppercase tracking-widest">Hipótesis</p>
              <p className="text-2xl font-serif text-stone-100">{hypothesisCount}</p>
              <p className="text-xs text-stone-600">Necesaria para orientar el artículo</p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
              <p className="text-stone-500 text-xs uppercase tracking-widest">Artículos</p>
              <p className="text-2xl font-serif text-stone-100">{articleCount}</p>
              <p className="text-xs text-stone-600">Borradores o textos publicados</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
          <h4 className="font-semibold text-stone-200 mb-2">1. Formular hipótesis</h4>
          <p className="text-sm text-stone-500 leading-relaxed mb-3">
            La hipótesis no la escribe el jugador a mano. El corresponsal la genera a partir de las evidencias, contradicciones y notas registradas. También puede aparecer automáticamente cuando se encuentra una evidencia importante.
          </p>
          <button
            className="px-3 py-2 rounded-lg bg-stone-200 text-stone-950 text-sm font-semibold hover:bg-white transition disabled:opacity-40"
            disabled={!canGenerateHypothesis}
            onClick={generateHypothesis}
          >
            Generar / actualizar hipótesis del corresponsal
          </button>
          {!canGenerateHypothesis && (
            <p className="text-xs text-stone-600 mt-2">Necesitás registrar al menos una evidencia.</p>
          )}
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <h4 className="font-semibold text-stone-200 mb-2">2. Después de redactar</h4>
          <p className="text-sm text-stone-500 leading-relaxed">
            Cuando se genere el borrador, pasá a la pestaña <b>Artículos</b>. Allí podés enviarlo a revisión, publicarlo o enfrentar la censura según el tono elegido.
          </p>
        </div>
      </div>
    </section>
  );
}


const stableSommeArchiveSources = [
  {
    id: "stable_iwm_battle_of_the_somme",
    title: "Imperial War Museums — Battle of the Somme",
    type: "fuente institucional",
    archive: "Imperial War Museums",
    date: "consulta externa",
    author: "Imperial War Museums",
    location: "Reino Unido / archivo digital",
    reliability: "alta",
    url: "https://www.iwm.org.uk/history/first-world-war/somme",
    description:
      "Fuente útil para el contexto general del Somme: fechas, bajas, ofensiva inicial, experiencia de los soldados y dimensión histórica de la batalla. Sirve como base para ambientar casos sobre la primera oleada y para sostener la tensión entre el parte oficial y los testimonios del frente. El IWM señala que el primer día dejó más de 57.000 bajas británicas, con 19.240 muertos, convirtiéndolo en el día más sangriento de la historia militar británica."
  },
  {
    id: "stable_nam_battle_of_the_somme",
    title: "National Army Museum — Battle of the Somme",
    type: "fuente museística",
    archive: "National Army Museum",
    date: "consulta externa",
    author: "National Army Museum",
    location: "Reino Unido / archivo digital",
    reliability: "alta",
    url: "https://www.nam.ac.uk/explore/battle-somme",
    description:
      "Fuente utilizada para confirmar la cronología general, la duración de la batalla, el carácter fallido del avance decisivo y el dato de las 57.000 bajas británicas del 1 de julio de 1916. Resulta especialmente útil para casos vinculados a órdenes, avances frontales, desgaste, propaganda y consecuencias militares."
  },
  {
    id: "stable_cwgc_cemeteries_memorials_somme",
    title: "Commonwealth War Graves Commission — Cemeteries & Memorials of the Battle of the Somme",
    type: "fuente memorialística",
    archive: "Commonwealth War Graves Commission",
    date: "consulta externa",
    author: "Commonwealth War Graves Commission",
    location: "Francia / Reino Unido / archivo digital",
    reliability: "alta",
    url: "https://www.cwgc.org/our-work/blog/cemeteries-memorials-of-the-battle-of-the-somme/",
    description:
      "Fuente útil para la dimensión humana de la batalla: muertos, desaparecidos, memoriales, cementerios y memoria histórica. Sirve especialmente para casos como la zanja de los desaparecidos, el capellán y los nombres, la tumba sin cruz, el telegrama a casa o la madre de Manchester. La CWGC resume el Somme como una batalla de enorme desgaste, con unos 3,5 millones de combatientes y alrededor de un millón de bajas."
  },
  {
    id: "stable_britannica_first_battle_somme",
    title: "Encyclopaedia Britannica — First Battle of the Somme",
    type: "enciclopedia histórica",
    archive: "Encyclopaedia Britannica",
    date: "consulta externa",
    author: "Encyclopaedia Britannica",
    location: "archivo digital",
    reliability: "media-alta",
    url: "https://www.britannica.com/event/First-Battle-of-the-Somme",
    description:
      "Fuente de consulta general para fechas, ubicación, resultado y síntesis histórica. Funciona como fuente secundaria para verificar que la batalla se desarrolló entre el 1 de julio y mediados de noviembre de 1916, y que fue una ofensiva aliada costosa y en gran medida fallida."
  },
  {
    id: "stable_britannica_summary_somme_casualties",
    title: "Britannica Summary — Battle of the Somme casualties",
    type: "síntesis histórica",
    archive: "Encyclopaedia Britannica",
    date: "consulta externa",
    author: "Encyclopaedia Britannica",
    location: "archivo digital",
    reliability: "media-alta",
    url: "https://www.britannica.com/summary/First-Battle-of-the-Somme",
    description:
      "Fuente breve para verificar la idea central del bombardeo preliminar seguido de un asalto contra posiciones alemanas que seguían siendo fuertes. Resulta especialmente útil para casos como el alambre intacto, la ametralladora silenciosa, el testigo alemán y la foto desde el aire."
  },
  {
    id: "stable_long_long_trail_somme_1916",
    title: "The Long, Long Trail — The Battles of the Somme, 1916",
    type: "banco de referencia militar",
    archive: "The Long, Long Trail",
    date: "consulta externa",
    author: "The Long, Long Trail",
    location: "archivo digital",
    reliability: "media",
    url: "https://www.longlongtrail.co.uk/battles/battles-of-the-western-front-in-france-and-flanders/the-battles-of-the-somme-1916/",
    description:
      "Fuente que no conviene utilizar como único respaldo, pero que resulta muy útil para organización militar británica, unidades, divisiones, batallones, cronología de operaciones y frentes concretos. Puede servir para casos vinculados a los hombres de Accrington, Mametz Wood, Delville Wood, High Wood, Pozières y Mouquet Farm."
  },
  {
    id: "stable_history_com_battle_somme",
    title: "History.com — Battle of the Somme",
    type: "fuente divulgativa",
    archive: "History.com",
    date: "consulta externa",
    author: "History.com",
    location: "archivo digital",
    reliability: "media",
    url: "https://www.history.com/articles/battle-of-the-somme",
    description:
      "Fuente divulgativa útil para lectura rápida y contraste general, aunque el juego debe priorizar IWM, National Army Museum, CWGC y fuentes primarias cuando sea posible. Resume las bajas del primer día y ayuda a explicar el impacto del 1 de julio de 1916."
  }
];

function mergeHistoricalArchiveSources(dynamicSources = []) {
  const seen = new Set();
  return [...stableSommeArchiveSources, ...dynamicSources].filter((source) => {
    const key = String(source?.url || source?.id || source?.title || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function HistoricalArchivesScreen() {
  const { state, actions } = useGame();
  const sources = React.useMemo(
    () => mergeHistoricalArchiveSources(state.sourceLibrary?.sources || []),
    [state.sourceLibrary?.sources]
  );

  return (
    <main className="min-h-screen bg-stone-950 text-stone-200 p-6">
      <section className="max-w-6xl mx-auto border border-stone-700 bg-stone-900/80 rounded-2xl p-6 shadow-2xl">
        <p className="uppercase tracking-[0.35em] text-xs text-stone-500 mb-4">
          Fuera de la experiencia in game
        </p>
        <h2 className="text-3xl md:text-4xl font-serif mb-3">Archivos históricos</h2>
        <p className="text-stone-400 leading-relaxed mb-6">
          Este apartado reúne las fuentes históricas consultadas o vinculadas al diseño de evidencias, testimonios, fotografías, documentos y contexto. Durante la partida, estas referencias permanecen ocultas para sostener la inmersión narrativa.
        </p>

        <div className="max-h-[62vh] overflow-y-auto pr-2 mb-6 rounded-xl scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-stone-900/40">
          <div className="grid md:grid-cols-2 gap-4">
            {sources.map((source) => (
              <article key={source.id} className="rounded-xl border border-stone-800 bg-stone-950/50 p-4">
              <h3 className="text-xl font-semibold text-stone-100 mb-1">{source.title}</h3>
              <p className="text-xs text-stone-500 mb-3">
                {source.type} · {source.archive} · {source.date}
              </p>
              <p className="text-sm text-stone-400 leading-relaxed mb-3">{source.description}</p>
              <div className="text-xs text-stone-500 space-y-1 mb-3">
                <p>Autor / institución: {source.author}</p>
                <p>Ubicación: {source.location || "no especificada"}</p>
                <p>Confiabilidad: {source.reliability}</p>
              </div>
              {source.url && (
                <a
                  className="inline-block text-sm text-stone-200 underline underline-offset-4 hover:text-white"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir fuente original
                </a>
              )}
              </article>
            ))}
          </div>
        </div>

        <button
          className="px-5 py-3 rounded-xl bg-stone-200 text-stone-950 font-semibold hover:bg-white transition"
          onClick={() => actions.goToScreen("MENU")}
        >
          Volver al menú
        </button>
      </section>
    </main>
  );
}

function DebugStateScreen() {
  const { state, actions } = useGame();

  return (
    <main className="min-h-screen bg-stone-950 text-stone-200 p-6">
      <section className="max-w-5xl mx-auto border border-stone-700 bg-stone-900/80 rounded-2xl p-6">
        <h2 className="text-3xl font-serif mb-4">Estado técnico inicial</h2>
        <p className="text-stone-400 mb-4">
          Esta pantalla sirve para comprobar que Context, reducer, modelos y estado inicial están conectados.
        </p>
        <pre className="text-xs overflow-auto bg-black/50 border border-stone-800 rounded-xl p-4 max-h-[60vh]">
          {JSON.stringify(state, null, 2)}
        </pre>
        <button
          className="mt-5 px-5 py-3 rounded-xl bg-stone-200 text-stone-950 font-semibold hover:bg-white transition"
          onClick={() => actions.goToScreen("MENU")}
        >
          Volver al menú
        </button>
      </section>
    </main>
  );
}


class RuntimeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-stone-950 p-6 text-stone-200">
          <section className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-stone-900/90 p-6 shadow-2xl">
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-red-300">Error de interfaz</p>
            <h1 className="mb-3 text-2xl font-serif text-stone-100">La pantalla no pudo renderizarse</h1>
            <p className="mb-4 text-sm leading-relaxed text-stone-400">
              El motor sigue cargado, pero algún dato de guardado o módulo externo llegó con una forma inesperada.
              Copiá este mensaje de error para corregirlo sin que la aplicación quede en una pantalla vacía.
            </p>
            <pre className="max-h-[45vh] overflow-auto rounded-xl border border-stone-800 bg-black/60 p-4 text-xs text-red-200">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}


function buildRetirementSummary(state) {
  const notebook = state.notebook || {};
  const activeCase = notebook.activeCase || null;
  const archivedCases = notebook.archivedCases || [];
  const articles = notebook.articles || [];
  const evidences = notebook.evidences || [];
  const notes = notebook.notes || [];
  const contradictions = notebook.contradictions || [];
  const hypotheses = notebook.hypotheses || [];
  const consequences = notebook.consequenceLog || [];
  const timeLabel = TimeSystem.formatTime(state.time);
  const location = state.locations?.find((item) => item.id === state.currentLocationId);
  const stressLabel = NarrativeStressSystem.getStressLabel(state.player?.stress || 0);
  const credibility = state.player?.credibility ?? 0;
  const playerName = state.player?.name || "El corresponsal";

  const finishedCases = archivedCases.length;
  const openCaseText = activeCase
    ? `Dejó abierto el expediente “${activeCase.title}”.`
    : "No dejó un expediente activo al retirarse.";

  const articleText = articles.length > 0
    ? `Redactó ${articles.length} artículo${articles.length === 1 ? "" : "s"}, dejando una versión escrita de lo investigado.`
    : "No llegó a publicar un artículo final antes de retirarse.";

  const evidenceText = evidences.length > 0
    ? `Reunió ${evidences.length} evidencia${evidences.length === 1 ? "" : "s"}, registró ${notes.length} nota${notes.length === 1 ? "" : "s"}, formuló ${hypotheses.length} hipótesis y detectó ${contradictions.length} contradicción${contradictions.length === 1 ? "" : "es"}.`
    : "No reunió evidencias suficientes para sostener una investigación completa.";

  const consequenceText = consequences.length > 0
    ? `Sus decisiones dejaron ${consequences.length} consecuencia${consequences.length === 1 ? "" : "s"} registrada${consequences.length === 1 ? "" : "s"} en el cuaderno.`
    : "Sus decisiones todavía no produjeron consecuencias mayores registradas.";

  let closing = "Se retiró del frente con una parte de la verdad, pero no con toda la guerra explicada.";
  if (finishedCases > 0 && articles.length > 0) {
    closing = "Se retiró habiendo convertido parte del caos del frente en testimonio escrito.";
  } else if (activeCase && evidences.length > 0) {
    closing = "Se retiró dejando pistas reunidas, voces escuchadas y preguntas todavía abiertas.";
  } else if ((state.player?.stress || 0) >= 70) {
    closing = "Se retiró antes de quebrarse por completo; sobrevivir también fue una decisión.";
  }

  return {
    playerName,
    timeLabel,
    locationName: location?.name || "Frente del Somme",
    weather: state.time?.weather || "clima incierto",
    stressLabel,
    credibility,
    finishedCases,
    openCaseText,
    articleText,
    evidenceText,
    consequenceText,
    closing,
    counts: {
      evidences: evidences.length,
      notes: notes.length,
      contradictions: contradictions.length,
      hypotheses: hypotheses.length,
      articles: articles.length,
      archivedCases: archivedCases.length,
    },
  };
}

function RetirementSummaryScreen() {
  const { state, actions } = useGame();
  const summary = React.useMemo(() => buildRetirementSummary(state), [state]);

  return (
    <main className="min-h-screen bg-stone-950 p-6 text-stone-200">
      <section className="mx-auto max-w-5xl rounded-2xl border border-amber-900/60 bg-stone-900/90 p-6 shadow-2xl">
        <div className="mb-6 border-b border-stone-800 pb-4">
          <p className="text-[10px] uppercase tracking-[0.32em] text-amber-500/80">
            Final de la partida
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-stone-100">
            Retirada del corresponsal
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">
            {summary.playerName} abandona el frente en {summary.locationName}, durante {summary.weather.toLowerCase()}, en {summary.timeLabel}. Lo que queda escrito no cierra la guerra, pero conserva una parte de lo ocurrido.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-2xl border border-stone-800 bg-black/30 p-4">
            <h2 className="mb-3 font-serif text-xl text-stone-100">Balance</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-2">
                <dt className="text-stone-400">Evidencias</dt>
                <dd className="font-semibold text-amber-100">{summary.counts.evidences}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-2">
                <dt className="text-stone-400">Notas</dt>
                <dd className="font-semibold text-amber-100">{summary.counts.notes}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-2">
                <dt className="text-stone-400">Contradicciones</dt>
                <dd className="font-semibold text-amber-100">{summary.counts.contradictions}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-2">
                <dt className="text-stone-400">Hipótesis</dt>
                <dd className="font-semibold text-amber-100">{summary.counts.hypotheses}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-2">
                <dt className="text-stone-400">Artículos</dt>
                <dd className="font-semibold text-amber-100">{summary.counts.articles}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-stone-400">Casos archivados</dt>
                <dd className="font-semibold text-amber-100">{summary.counts.archivedCases}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/60 p-3 text-xs leading-relaxed text-stone-300">
              <p><span className="text-stone-500">Estado emocional:</span> {summary.stressLabel}</p>
              <p><span className="text-stone-500">Credibilidad:</span> {summary.credibility}</p>
            </div>
          </aside>

          <article className="rounded-2xl border border-stone-800 bg-stone-950/60 p-5">
            <h2 className="mb-3 font-serif text-xl text-stone-100">Resumen narrativo</h2>
            <div className="space-y-3 text-sm leading-relaxed text-stone-300">
              <p>{summary.evidenceText}</p>
              <p>{summary.articleText}</p>
              <p>{summary.openCaseText}</p>
              <p>{summary.consequenceText}</p>
              <p className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-amber-100">
                {summary.closing}
              </p>
            </div>
          </article>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-stone-800 pt-4">
          <button
            type="button"
            onClick={() => actions.saveGame()}
            className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-100 transition hover:border-amber-700 hover:bg-stone-800"
          >
            Guardar este estado
          </button>
          <button
            type="button"
            onClick={() => actions.goToScreen("MENU")}
            className="rounded-xl border border-amber-800/70 bg-amber-900/30 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-800/40"
          >
            Volver al menú principal
          </button>
        </div>
      </section>
    </main>
  );
}


function EscapeMenuOverlay({ open, onClose }) {
  const { state, actions } = useGame();

  if (!open) return null;

  const handleSave = () => {
    AudioSystem.play("save_game", state.visualSettings);
    actions.saveGame();
  };

  const handleLoad = () => {
    AudioSystem.play("load_game", state.visualSettings);
    actions.loadGame();
    onClose();
  };

  const handleExit = () => {
    actions.goToScreen("MENU");
    onClose();
  };

  const handleRetire = () => {
    actions.goToScreen("RETIREMENT_SUMMARY");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Menú de pausa"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="w-full max-w-sm rounded-2xl border border-amber-900/60 bg-stone-950/95 p-5 text-stone-100 shadow-2xl">
        <div className="mb-4 border-b border-stone-800 pb-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-amber-500/80">
            La Batalla de Somme
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-stone-100">
            Menú de pausa
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            La partida queda detenida mientras esta ventana está abierta.
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-left text-sm font-semibold text-stone-100 transition hover:border-amber-700 hover:bg-stone-800"
          >
            Guardar
          </button>

          <button
            type="button"
            onClick={handleLoad}
            className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-left text-sm font-semibold text-stone-100 transition hover:border-amber-700 hover:bg-stone-800"
          >
            Cargar
          </button>

          <button
            type="button"
            onClick={handleRetire}
            className="w-full rounded-xl border border-amber-900/70 bg-stone-900 px-4 py-3 text-left text-sm font-semibold text-amber-100 transition hover:border-amber-600 hover:bg-amber-950/40"
          >
            Retirarse del frente
          </button>

          <button
            type="button"
            onClick={handleExit}
            className="w-full rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-left text-sm font-semibold text-red-100 transition hover:border-red-700 hover:bg-red-950/60"
          >
            Salir al menú principal
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-amber-800/70 bg-amber-900/30 px-4 py-3 text-left text-sm font-semibold text-amber-100 transition hover:bg-amber-800/40"
          >
            Volver
          </button>
        </div>

        {state.lastSaveMessage ? (
          <p className="mt-4 rounded-xl border border-stone-800 bg-black/30 px-3 py-2 text-xs text-stone-300">
            {state.lastSaveMessage}
          </p>
        ) : null}

        <p className="mt-4 text-center text-[11px] text-stone-500">
          Escape también cierra esta ventana.
        </p>
      </section>
    </div>
  );
}

function AppShell() {
  const { state } = useGame();
  const [pauseOpen, setPauseOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      const tagName = String(event.target?.tagName || "").toLowerCase();
      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        Boolean(event.target?.isContentEditable);

      if (isTyping) return;

      event.preventDefault();
      setPauseOpen((current) => {
        if (!current) AudioSystem.play("pause_open", state.visualSettings);
        return !current;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.visualSettings]);

  React.useEffect(() => {
    setPauseOpen(false);
  }, [state.screen]);

  return (
    <>
      <Router />
      <EscapeMenuOverlay open={pauseOpen} onClose={() => setPauseOpen(false)} />
    </>
  );
}

function Router() {
  const { state } = useGame();

  if (state.screen === "MENU") return <MenuScreen />;
  if (state.screen === "CHARACTER_CREATION") return <CharacterCreationScreen />;
  if (state.screen === "INTRO") return <IntroScreen />;
  if (state.screen === "GAMEPLAY") return <GameplayScreen />;
  if (state.screen === "HISTORICAL_ARCHIVES") return <HistoricalArchivesScreen />;
  if (state.screen === "OPTIONS") return <OptionsScreen />;
  if (state.screen === "RETIREMENT_SUMMARY") return <RetirementSummaryScreen />;
  if (state.screen === "DEBUG_STATE") return <DebugStateScreen />;

  return <MenuScreen />;
}

export default function App() {
  return (
    <RuntimeErrorBoundary>
      <GameProvider>
        <AppShell />
      </GameProvider>
    </RuntimeErrorBoundary>
  );
}
