/*
  asciiPortraits.js
  Módulo de retratos ASCII para La Batalla de Somme
  -------------------------------------------------
  Objetivo:
  - Generar un rostro ASCII estable para cada NPC.
  - Mostrarlo en la ficha del personaje, donde antes iría la foto.
  - Mostrarlo en los cuadros de diálogo del mismo NPC.
  - Mantenerlo modular, sin mezclarlo con la lógica de casos, evidencias o diálogos.

  Uso rápido:
  1) Cargar este archivo después de cargar los NPC.
  2) Cada NPC puede tener campos opcionales:

     {
       id: "npc_moreau",
       name: "Soldado Moreau",
       sex: "male",              // male | female | unknown
       gasMask: true,             // true | false
       portraitSeed: "moreau_01"  // opcional
     }

  3) Para ficha:
     AsciiPortraits.renderNpcCardPortrait(npc, "#npcPortraitSlot");

  4) Para diálogo:
     AsciiPortraits.renderDialoguePortrait(npc, "#dialoguePortraitSlot");
*/

(function () {
  "use strict";

  const NL = String.fromCharCode(10);
  const CACHE = new Map();

  function hashSeed(seed) {
    let h = 2166136261;
    const str = String(seed || "npc_unknown");
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function createRng(seed) {
    let state = hashSeed(seed);
    return function rng() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function normalizeSex(value) {
    const text = String(value || "unknown").toLowerCase();
    if (["male", "masculino", "m", "hombre", "soldado"].includes(text)) return "male";
    if (["female", "femenino", "f", "mujer", "enfermera"].includes(text)) return "female";
    return "unknown";
  }

  function translateSex(sex) {
    if (sex === "male") return "masculino";
    if (sex === "female") return "femenino";
    return "desconocido";
  }

  const FACE_PARTS = {
    male: {
      hair: [
        "  /////////  ",
        "  #######    ",
        "  /^^^^^/    ",
        "  _/////_    "
      ],
      brow: [
        " |  _   _  | ",
        " |  -   -  | ",
        " |  ^   ^  | ",
        " |  =   =  | "
      ],
      eyes: [
        " |  o   o  | ",
        " |  0   0  | ",
        " |  ¬   ¬  | ",
        " |  •   •  | "
      ],
      nose: [
        " |    >    | ",
        " |    ^    | ",
        " |    |    | "
      ],
      mouth: [
        " |   ___   | ",
        " |   ---   | ",
        " |   _-_   | "
      ],
      jaw: [
        "   \\_____/   ",
        "    \\___/    "
      ],
      traits: ["barba incipiente", "mandíbula marcada", "cejas pesadas", "mirada cansada"]
    },
    female: {
      hair: [
        "  ///|||///  ",
        "  /////////  ",
        "  /~~~~~/    ",
        "  ((^^^^))   "
      ],
      brow: [
        " |  ´   `  | ",
        " |  ^   ^  | ",
        " |  -   -  | ",
        " |  ~   ~  | "
      ],
      eyes: [
        " |  o   o  | ",
        " |  0   0  | ",
        " |  •   •  | ",
        " |  ◦   ◦  | "
      ],
      nose: [
        " |    '    | ",
        " |    ^    | ",
        " |    |    | "
      ],
      mouth: [
        " |   ___   | ",
        " |   ---   | ",
        " |   .-.   | "
      ],
      jaw: [
        "    \\___/    ",
        "   \\____/   "
      ],
      traits: ["mechones sueltos", "mirada firme", "rostro angosto", "expresión alerta"]
    },
    unknown: {
      hair: [
        "  ///////    ",
        "  #######    ",
        "  /^^^^/     ",
        "  ~~~~~~~    "
      ],
      brow: [
        " |  -   -  | ",
        " |  ^   ^  | ",
        " |  =   =  | "
      ],
      eyes: [
        " |  o   o  | ",
        " |  0   0  | ",
        " |  •   •  | "
      ],
      nose: [
        " |    |    | ",
        " |    ^    | "
      ],
      mouth: [
        " |   ---   | ",
        " |   ___   | ",
        " |   _-_   | "
      ],
      jaw: [
        "    \\___/    ",
        "   \\____/   "
      ],
      traits: ["rasgos ambiguos", "rostro cubierto de barro", "mirada agotada"]
    }
  };

  const MASKS = {
    standard: [
      "  .-=====-.  ",
      " /  _   _  / ",
      "|  (o) (o)  |",
      "|     ^     |",
      "|   .---.   |",
      "|  (  O  )  |",
      "|  /=====\\  |",
      "  \\_____/  "
    ],
    heavy: [
      "  .-#####-.  ",
      " /  @   @  / ",
      "|  (O) (O)  |",
      "|  == ^ ==  |",
      "|   .---.   |",
      "|  [  O  ]  |",
      "|  /#####\\  |",
      "  \\_____/  "
    ],
    cracked: [
      "  .-=====-.  ",
      " /  x   o  / ",
      "|  (O) (/)  |",
      "|    / ^    |",
      "|   .---.   |",
      "|  (  0  )  |",
      "|  /==#==\\  |",
      "  \\_____/  "
    ]
  };

  function getNpcId(npc) {
    return String(
      npc && (npc.id || npc.npcId || npc.key || npc.name || npc.nombre || "npc_unknown")
    );
  }

  function getNpcName(npc) {
    return String(npc && (npc.name || npc.nombre || npc.id || "NPC"));
  }

  function getGasMaskValue(npc) {
    if (!npc) return false;
    if (typeof npc.gasMask === "boolean") return npc.gasMask;
    if (typeof npc.hasGasMask === "boolean") return npc.hasGasMask;
    if (npc.portrait && typeof npc.portrait.gasMask === "boolean") return npc.portrait.gasMask;
    if (npc.asciiPortrait && typeof npc.asciiPortrait.gasMask === "boolean") return npc.asciiPortrait.gasMask;
    return false;
  }

  function getPortraitProfile(npc) {
    const profile = (npc && (npc.asciiPortrait || npc.portrait)) || {};
    const id = getNpcId(npc);
    const name = getNpcName(npc);
    const sex = normalizeSex(profile.sex || npc.sex || npc.gender || npc.genero);
    const gasMask = typeof profile.gasMask === "boolean" ? profile.gasMask : getGasMaskValue(npc);
    const seed = String(profile.seed || npc.portraitSeed || id || name);

    return { id, name, sex, gasMask, seed };
  }

  function generateUnmasked(profile, rng) {
    const p = FACE_PARTS[profile.sex] || FACE_PARTS.unknown;
    const scar = rng() < 0.25;
    const mud = rng() < 0.35;
    const traits = [pick(rng, p.traits)];
    const art = [];

    art.push(pick(rng, p.hair));
    art.push(" .---------.");
    art.push(pick(rng, p.brow));

    let eyes = pick(rng, p.eyes);
    if (scar) eyes = eyes.replace("| ", "|/");
    art.push(eyes);

    art.push(pick(rng, p.nose));
    art.push(pick(rng, p.mouth));
    art.push(pick(rng, p.jaw));

    if (scar) traits.push("cicatriz visible");
    if (mud) traits.push("barro en el rostro");

    return { art, traits };
  }

  function generateMasked(profile, rng) {
    const type = pick(rng, Object.keys(MASKS));
    const helmet = rng() < 0.55;
    const scarf = rng() < 0.35;
    const traits = [];
    let art = [];

    if (helmet) {
      art.push("   _______   ");
      art.push(" _/_______/_ ");
    }

    art = art.concat(MASKS[type]);

    if (type === "standard") traits.push("máscara estándar");
    if (type === "heavy") traits.push("máscara pesada");
    if (type === "cracked") traits.push("máscara dañada");
    if (helmet) traits.push("casco embarrado");
    if (scarf) traits.push("bufanda o venda");

    return { art, traits };
  }

  function generatePortrait(npcOrProfile) {
    const profile = getPortraitProfile(npcOrProfile);
    const cacheKey = profile.id + "::" + profile.seed + "::" + profile.sex + "::" + profile.gasMask;

    if (CACHE.has(cacheKey)) return CACHE.get(cacheKey);

    const rng = createRng(profile.seed);
    const generated = profile.gasMask
      ? generateMasked(profile, rng)
      : generateUnmasked(profile, rng);

    const art = generated.art.join(NL);
    const fullBlock = [
      "┌─ " + profile.name,
      "│ sexo: " + translateSex(profile.sex),
      "│ máscara de gas: " + (profile.gasMask ? "sí" : "no"),
      "│ rasgos: " + generated.traits.join(", "),
      "├────────────────",
      generated.art.map(line => "│ " + line).join(NL),
      "└────────────────"
    ].join(NL);

    const result = {
      id: profile.id,
      name: profile.name,
      sex: profile.sex,
      gasMask: profile.gasMask,
      seed: profile.seed,
      traits: generated.traits,
      art,
      fullBlock
    };

    CACHE.set(cacheKey, result);
    return result;
  }

  function ensureStyles() {
    if (document.getElementById("ascii-portrait-styles")) return;

    const style = document.createElement("style");
    style.id = "ascii-portrait-styles";
    style.textContent = `
      .ascii-portrait-slot {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 150px;
        border: 1px solid rgba(198, 155, 82, 0.45);
        border-radius: 14px;
        background: rgba(12, 10, 7, 0.72);
        padding: 10px;
        overflow: hidden;
      }

      .ascii-portrait-pre {
        margin: 0;
        white-space: pre;
        font-family: "Courier New", Consolas, monospace;
        font-size: 16px;
        line-height: 1.04;
        color: #f0dfb8;
        text-align: left;
        overflow: hidden;
      }

      .dialogue-box .ascii-portrait-slot,
      .dialogue-modal .ascii-portrait-slot,
      .npc-dialogue .ascii-portrait-slot {
        min-width: 150px;
        max-width: 190px;
        min-height: 150px;
      }

      .npc-card .ascii-portrait-slot,
      .character-sheet .ascii-portrait-slot,
      .journal-page .ascii-portrait-slot {
        min-height: 180px;
      }
    `;
    document.head.appendChild(style);
  }

  function resolveElement(target) {
    if (!target) return null;
    if (typeof target === "string") return document.querySelector(target);
    return target;
  }

  function renderPortrait(npc, target, options) {
    ensureStyles();

    const el = resolveElement(target);
    if (!el) return null;

    const portrait = generatePortrait(npc);
    const opts = options || {};
    const fontSize = opts.fontSize || null;

    el.classList.add("ascii-portrait-slot");
    el.innerHTML = "";

    const pre = document.createElement("pre");
    pre.className = "ascii-portrait-pre";
    pre.textContent = opts.fullBlock ? portrait.fullBlock : portrait.art;

    if (fontSize) pre.style.fontSize = fontSize;

    el.appendChild(pre);
    el.dataset.npcId = portrait.id;
    el.dataset.portraitSeed = portrait.seed;

    return portrait;
  }

  function renderNpcCardPortrait(npc, target) {
    return renderPortrait(npc, target, { fullBlock: false, fontSize: "17px" });
  }

  function renderDialoguePortrait(npc, target) {
    return renderPortrait(npc, target, { fullBlock: false, fontSize: "15px" });
  }

  function hydrateNpcPortraits(npcs) {
    if (!Array.isArray(npcs)) return npcs;

    return npcs.map(npc => {
      const portrait = generatePortrait(npc);
      return Object.assign({}, npc, {
        asciiPortraitGenerated: portrait
      });
    });
  }

  function findNpcById(npcs, id) {
    const targetId = String(id || "");
    if (!targetId) return null;

    if (Array.isArray(npcs)) {
      return npcs.find(npc => String(npc?.id || npc?.npcId || npc?.name || npc?.nombre) === targetId) || null;
    }

    if (npcs && Array.isArray(npcs.npcs)) return findNpcById(npcs.npcs, targetId);
    if (npcs && Array.isArray(npcs.npcCatalog)) return findNpcById(npcs.npcCatalog, targetId);
    if (npcs && Array.isArray(npcs.characters)) return findNpcById(npcs.characters, targetId);
    if (npcs instanceof Map) return npcs.get(targetId) || null;

    if (npcs && typeof npcs === "object") {
      if (npcs[targetId]) return npcs[targetId];
      const values = Object.values(npcs).filter(Boolean);
      return findNpcById(values, targetId);
    }

    return null;
  }

  const api = {
    generatePortrait,
    renderPortrait,
    renderNpcCardPortrait,
    renderDialoguePortrait,
    hydrateNpcPortraits,
    findNpcById,
    clearCache: () => CACHE.clear()
  };

  if (typeof window !== "undefined") {
    window.AsciiPortraits = api;
  } else if (typeof globalThis !== "undefined") {
    globalThis.AsciiPortraits = api;
  }
})();

/*
  Integración sugerida con el juego
  -------------------------------

  A) En la ficha del personaje:

     function openNpcCard(npc) {
       // ...código existente de la ficha...
       AsciiPortraits.renderNpcCardPortrait(npc, "#npcPortraitSlot");
     }

  B) En el cuadro de diálogo:

     function openDialogueWithNpc(npc, dialogueNode) {
       // ...código existente del diálogo...
       AsciiPortraits.renderDialoguePortrait(npc, "#dialoguePortraitSlot");
     }

  C) Si el diálogo solo conoce el npcId:

     const npc = AsciiPortraits.findNpcById(gameState.npcs, dialogueNode.npcId);
     AsciiPortraits.renderDialoguePortrait(npc, "#dialoguePortraitSlot");

  D) Estructura recomendada en npcs.json:

     {
       "id": "npc_moreau",
       "name": "Soldado Moreau",
       "sex": "male",
       "gasMask": true,
       "portraitSeed": "npc_moreau"
     }

  E) Alternativa más ordenada:

     {
       "id": "npc_moreau",
       "name": "Soldado Moreau",
       "asciiPortrait": {
         "sex": "male",
         "gasMask": true,
         "seed": "npc_moreau"
       }
     }
*/
