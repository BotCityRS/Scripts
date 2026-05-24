// src/runtime/fletchCutLogsDialogCom.ts
var ID_LOGS = 1511;
var MULTIOBJ3_CLOSE_SHAFT = 2800;
var MULTIOBJ3_CLOSE_SHORT = 2801;
var MULTIOBJ3_CLOSE_LONG = 2802;
var MULTIOBJ2_SHORT = 144;
var MULTIOBJ2_LONG = 145;
function pickFletchKnifeDialogCom(logId, cutShafts, cutShortbow, cutLongbow) {
  if (logId === ID_LOGS) {
    if (cutShafts) {
      return MULTIOBJ3_CLOSE_SHAFT;
    }
    if (cutShortbow) {
      return MULTIOBJ3_CLOSE_SHORT;
    }
    if (cutLongbow) {
      return MULTIOBJ3_CLOSE_LONG;
    }
    return null;
  }
  if (cutShortbow) {
    return MULTIOBJ2_SHORT;
  }
  if (cutLongbow) {
    return MULTIOBJ2_LONG;
  }
  return null;
}

// src/runtime/Timer.ts
class Timer {
  static systemTimer;
  static TIMER_LOGIN_WAIT = "TIMER_LOGIN_WAIT";
  static TIMER_SETUP_ACCOUNT_ON_LOGIN = "TIMER_SETUP_ACCOUNT_ON_LOGIN";
  static TIMER_CREDENTIAL_WARN = "TIMER_CREDENTIAL_WARN";
  timers;
  timerNames;
  constructor() {
    this.timers = [];
    this.timerNames = [];
  }
  static resetSystemTimerForTests() {
    Timer.systemTimer = undefined;
  }
  static SystemTimer() {
    if (this.systemTimer) {
      throw "There should not be a system timer already. Do not create another.";
    }
    this.systemTimer = new Timer;
    this.systemTimer.defineTimer("TIMER_LOGIN_WAIT", 1);
    this.systemTimer.defineTimer("TIMER_SETUP_ACCOUNT_ON_LOGIN", 2);
    this.systemTimer.defineTimer("TIMER_CREDENTIAL_WARN", 3);
    return this.systemTimer;
  }
  defineTimer(name, id) {
    if (this.timerNames[id]) {
      throw "Timer already exists as " + this.timerNames[id];
    }
    this.timerNames[id] = name;
  }
  isTimerDefined(id) {
    return this.timerNames[id];
  }
  setTimer(id, ms) {
    if (!this.isTimerDefined(id)) {
      throw "Undefined timer ID " + id;
    }
    this.timers[id] = Date.now() + ms;
  }
  hasTimer(id) {
    if (!this.isTimerDefined(id)) {
      throw "Undefined timer ID " + id;
    }
    return (this.timers[id] || 0) > Date.now();
  }
  clearTimer(id) {
    if (!this.isTimerDefined(id)) {
      throw "Undefined timer ID " + id;
    }
    return this.timers[id] = 0;
  }
}

// src/runtime/Utility.ts
class Utility {
  static getDistance(x1, z1, x2, z2) {
    return Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(z1 - z2), 2));
  }
  static includes(arr, v) {
    const v2 = Number(v);
    if (Number.isNaN(v2)) {
      throw "Parse error " + v + " -> " + v2;
    }
    for (let i = 0;i < arr.length; ++i) {
      const arri2 = Number(arr[i]);
      if (Number.isNaN(arri2)) {
        throw "Parse error " + arr[i] + " -> " + arri2;
      }
      if (arri2 === v2) {
        return true;
      }
    }
    return false;
  }
}

// src/runtime/BotScript.ts
class BotScript {
  name;
  author;
  version;
  isSystemScript;
  isDebugScript;
  constructor(name, isSystemScript, metadata) {
    this.name = name;
    this.author = metadata.author;
    this.version = metadata.version;
    this.isSystemScript = isSystemScript;
    this.isDebugScript = metadata.isDebugScript ?? false;
  }
  start(_bot) {}
  update(_bot) {}
  stop(_bot) {}
  static htmlSetup(_base) {}
  static buildFromHtml(_base) {
    const Ctor = this;
    return new Ctor;
  }
}

// src/scripts/AutoWoodcutter.ts
var TIMER_GAME_INTERACT = 0;
var TIMER_ENABLE_RUN = 1;
var TIMER_KNIFE_USE = 2;
var TIMER_TINDER_USE = 3;
var ENABLE_RUN_CHECK_MS = 1e4;
var ID_KNIFE = 946;
var ID_TINDERBOX = 590;
var ID_FIRE_LOC = 2732;
var ID_LOGS2 = 1511;
var ID_OAK_LOGS = 1521;
var ID_WILLOW_LOGS = 1519;
var ID_MAPLE_LOGS = 1517;
var ID_YEW_LOGS = 1515;
var ID_MAGIC_LOGS = 1513;
var ALL_LOG_IDS = [ID_MAGIC_LOGS, ID_YEW_LOGS, ID_MAPLE_LOGS, ID_WILLOW_LOGS, ID_OAK_LOGS, ID_LOGS2];
var AXE_IDS = [1349, 1351, 1353, 1355, 1357, 1359, 1361];
var UNSTRUNG_BOW_IDS = [
  72,
  70,
  68,
  66,
  64,
  62,
  60,
  58,
  54,
  56,
  50,
  48
];
var TREE_KINDS_HIGH_TO_LOW = ["magic", "yew", "maple", "willow", "oak", "normal"];
var STAT_FIREMAKING = 17;
var STAT_WOODCUTTING = 18;
var STAT_FLETCHING = 19;
var WC_LEVEL_FOR_TREE = {
  normal: 0,
  oak: 15,
  willow: 30,
  maple: 45,
  yew: 60,
  magic: 75
};
var LOG_ID_BY_TREE_KIND = {
  normal: ID_LOGS2,
  oak: ID_OAK_LOGS,
  willow: ID_WILLOW_LOGS,
  maple: ID_MAPLE_LOGS,
  yew: ID_YEW_LOGS,
  magic: ID_MAGIC_LOGS
};
var FM_LEVEL_FOR_LOG = {
  [ID_LOGS2]: 1,
  [ID_OAK_LOGS]: 15,
  [ID_WILLOW_LOGS]: 30,
  [ID_MAPLE_LOGS]: 45,
  [ID_YEW_LOGS]: 60,
  [ID_MAGIC_LOGS]: 75
};
var FLETCH_LEVEL_FOR_LOG = {
  [ID_LOGS2]: { shafts: 1, shortbow: 5, longbow: 10 },
  [ID_OAK_LOGS]: { shortbow: 20, longbow: 25 },
  [ID_WILLOW_LOGS]: { shortbow: 35, longbow: 40 },
  [ID_MAPLE_LOGS]: { shortbow: 50, longbow: 55 },
  [ID_YEW_LOGS]: { shortbow: 65, longbow: 70 },
  [ID_MAGIC_LOGS]: { shortbow: 80, longbow: 85 }
};
var TREE_LOC_IDS = {
  normal: [
    1276,
    1277,
    1278,
    1279,
    1280,
    1282,
    1283,
    1284,
    1285,
    1286,
    1289,
    1290,
    1291,
    1315,
    1316,
    1318,
    1319,
    1330,
    1331,
    1332,
    1365
  ],
  oak: [1281],
  willow: [1308],
  maple: [1307],
  yew: [1309],
  magic: [1306]
};
function createField(container, label, input, hint) {
  const field = document.createElement("div");
  field.className = "bot-field";
  const labelElem = document.createElement("label");
  labelElem.className = "bot-label";
  labelElem.textContent = label;
  field.appendChild(labelElem);
  field.appendChild(input);
  if (hint) {
    const hintElem = document.createElement("small");
    hintElem.className = "bot-hint";
    hintElem.textContent = hint;
    field.appendChild(hintElem);
  }
  container.appendChild(field);
  return field;
}
function getSelectNumber(id, fallback) {
  const raw = document.getElementById(id)?.value ?? "";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function getChecked(id) {
  return document.getElementById(id)?.checked ?? false;
}
function getOptionalNonNegativeNumber(id) {
  const raw = document.getElementById(id)?.value.trim() ?? "";
  if (raw === "") {
    return null;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
function logGameInteraction(api, action, detail = {}) {
  const player = api.surface.localPlayer;
  api.bot.log("INFO", "AutoWoodcutter.gameInteraction", action, {
    ...detail,
    playerLocalX: api.player.getLocalX(),
    playerLocalZ: api.player.getLocalZ(),
    isAnimating: api.player.isAnimating(),
    isMoving: api.player.isMoving(),
    primaryAnim: player?.primaryAnim ?? -1,
    primaryAnimFrame: player?.primaryAnimFrame ?? -1,
    primaryAnimDelay: player?.primaryAnimDelay ?? -1,
    primaryAnimLoop: player?.primaryAnimLoop ?? -1
  });
}
function hasAnyAxe(api) {
  for (let i = 0;i < AXE_IDS.length; i++) {
    const axeId = AXE_IDS[i];
    if (api.inventory.hasItem(axeId) || api.equipment.hasItem(axeId)) {
      return true;
    }
  }
  return false;
}
function hasAnyFletchLog(api) {
  for (let i = 0;i < ALL_LOG_IDS.length; i++) {
    if (api.inventory.hasItem(ALL_LOG_IDS[i])) {
      return true;
    }
  }
  return false;
}
function hasFireAtTile(api, tileX, tileZ) {
  const fires = api.worldObject.getById([ID_FIRE_LOC]);
  for (let i = 0;i < fires.length; i++) {
    const fire = fires[i];
    if (fire.x === tileX && fire.z === tileZ) {
      return true;
    }
  }
  return false;
}
function isStandingOnFire(api) {
  const px = api.player.getLocalX();
  const pz = api.player.getLocalZ();
  if (px < 0 || pz < 0) {
    return false;
  }
  return hasFireAtTile(api, px, pz);
}
function isFiremakingComplete(api, fireTileX, fireTileZ) {
  if (fireTileX >= 0 && fireTileZ >= 0 && hasFireAtTile(api, fireTileX, fireTileZ)) {
    return true;
  }
  return isStandingOnFire(api);
}
var BURN_FIRE_WAIT_MS = 16000;
var TREE_PATHFIND_MAX_STEPS = 100;
var WOODCUTTING_ACTIVITY_GRACE_MS = 400;
var LOG_DROP_SPACING_MS = 100;
var LOG_DROP_COOLDOWN_MS = 2000;
function findChoppableTree(api, treeKind, anchor, anchorMaxDist) {
  const candidates = api.worldObject.getById([...TREE_LOC_IDS[treeKind]]);
  let best = null;
  let bestSteps = Number.POSITIVE_INFINITY;
  const baseX = api.surface.sceneBaseTileX;
  const baseZ = api.surface.sceneBaseTileZ;
  for (let i = 0;i < candidates.length; i++) {
    const wo = candidates[i];
    if (anchor && anchorMaxDist !== null) {
      const wx = wo.x + baseX;
      const wz = wo.z + baseZ;
      const da = Utility.getDistance(wx, wz, anchor[0], anchor[1]);
      if (da > anchorMaxDist) {
        continue;
      }
    }
    const steps = api.worldObject.getPathfindSteps(wo);
    if (steps < 0 || steps > TREE_PATHFIND_MAX_STEPS) {
      continue;
    }
    if (steps < bestSteps) {
      bestSteps = steps;
      best = wo;
    }
  }
  return best;
}
function getWoodSpotTreeAnchor(spot) {
  return spot.pathBankToTrees[spot.pathBankToTrees.length - 1];
}
function reverseWoodSpotPath(spot) {
  return spot.pathBankToTrees.map(([x, z]) => [x, z]).reverse();
}
function fletchFlagsForAction(action) {
  return {
    cutShafts: action === "shafts",
    cutShortbow: action === "shortbow",
    cutLongbow: action === "longbow"
  };
}
function wantsFletchOnLog(logId, cutShafts, cutShortbow, cutLongbow) {
  if (logId === ID_LOGS2) {
    return cutShafts || cutShortbow || cutLongbow;
  }
  const table = FLETCH_LEVEL_FOR_LOG[logId];
  if (!table) {
    return false;
  }
  return cutShortbow && table.shortbow !== undefined || cutLongbow && table.longbow !== undefined;
}
function fletchLevelRequired(logId, product) {
  return FLETCH_LEVEL_FOR_LOG[logId]?.[product] ?? null;
}
function canFletchLog(api, logId, action) {
  const level = api.player.getLevel(STAT_FLETCHING);
  if (action === "shafts") {
    const req = fletchLevelRequired(logId, "shafts");
    return req !== null && level >= req;
  }
  if (action === "shortbow") {
    const req = fletchLevelRequired(logId, "shortbow");
    return req !== null && level >= req;
  }
  if (action === "longbow") {
    const req = fletchLevelRequired(logId, "longbow");
    return req !== null && level >= req;
  }
  return false;
}
function canBurnLog(api, logId) {
  const req = FM_LEVEL_FOR_LOG[logId];
  return req !== undefined && api.player.getLevel(STAT_FIREMAKING) >= req;
}
function pickBurnableLogId(api) {
  for (let i = 0;i < ALL_LOG_IDS.length; i++) {
    const logId = ALL_LOG_IDS[i];
    if (api.inventory.hasItem(logId) && canBurnLog(api, logId)) {
      return logId;
    }
  }
  return null;
}
function resolveEffectiveTreeKind(api, requested) {
  const wc = api.player.getLevel(STAT_WOODCUTTING);
  const startIdx = TREE_KINDS_HIGH_TO_LOW.indexOf(requested);
  for (let i = Math.max(0, startIdx);i < TREE_KINDS_HIGH_TO_LOW.length; i++) {
    const kind = TREE_KINDS_HIGH_TO_LOW[i];
    if (wc >= WC_LEVEL_FOR_TREE[kind]) {
      return kind;
    }
  }
  return "normal";
}
function fallbackLogAction(bankEnabled) {
  return bankEnabled ? "none" : "drop";
}
function resolveEffectiveLogAction(api, action, treeKind, bankEnabled) {
  if (action === "none" || action === "drop") {
    return action;
  }
  const fl = api.player.getLevel(STAT_FLETCHING);
  if (action === "burn") {
    if (canBurnLog(api, logIdForTreeKind(treeKind))) {
      return "burn";
    }
    if (pickBurnableLogId(api) !== null) {
      return "burn";
    }
    return fallbackLogAction(bankEnabled);
  }
  if (action === "shafts") {
    if (fl >= (fletchLevelRequired(ID_LOGS2, "shafts") ?? 99)) {
      return "shafts";
    }
    return fallbackLogAction(bankEnabled);
  }
  const logId = logIdForTreeKind(treeKind);
  if (action === "shortbow") {
    const req = fletchLevelRequired(logId, "shortbow");
    if (req !== null && fl >= req) {
      return "shortbow";
    }
    return fallbackLogAction(bankEnabled);
  }
  if (action === "longbow") {
    const longReq = fletchLevelRequired(logId, "longbow");
    const shortReq = fletchLevelRequired(logId, "shortbow");
    if (longReq !== null && fl >= longReq) {
      return "longbow";
    }
    if (shortReq !== null && fl >= shortReq) {
      return "shortbow";
    }
    return fallbackLogAction(bankEnabled);
  }
  return action;
}
function parseLogAction(raw) {
  if (raw === "none" || raw === "drop" || raw === "burn" || raw === "shafts" || raw === "shortbow" || raw === "longbow") {
    return raw;
  }
  return "none";
}
function defaultLogActionForBanking(banking) {
  return banking ? "none" : "drop";
}
function sanitizeLogAction(action, banking) {
  const opt = AutoWoodcutter.logActionOptions.find((o) => o.value === action);
  if (banking) {
    if (action === "drop" || action === "burn" || opt?.requiresNoBank) {
      return "none";
    }
    return action;
  }
  if (action === "none" || opt?.requiresBank) {
    return "drop";
  }
  return action;
}
function dropOneUnstrungBow(api) {
  for (let i = 0;i < UNSTRUNG_BOW_IDS.length; i++) {
    const item = api.inventory.getItemById(UNSTRUNG_BOW_IDS[i]);
    if (item) {
      logGameInteraction(api, "drop unstrung bow", {
        itemId: item.id,
        slot: item.slot,
        interfaceId: item.interfaceId
      });
      item.drop();
      return true;
    }
  }
  return false;
}
function isLogId(id) {
  return ALL_LOG_IDS.includes(id);
}
function collectLogDropSlots(api) {
  const slots = [];
  const size = api.inventory.getContainerSize();
  for (let slot = 0;slot < size; slot++) {
    const item = api.inventory.getItemBySlot(slot);
    if (item && isLogId(item.id)) {
      slots.push(slot);
    }
  }
  return slots;
}
function logIdForTreeKind(kind) {
  return LOG_ID_BY_TREE_KIND[kind];
}

class AutoWoodcutter extends BotScript {
  timer;
  spot;
  treeKind;
  bankEnabled;
  logAction;
  maxRadius;
  knifeUseStep = "idle";
  tinderUseStep = "idle";
  pendingDialogCom = null;
  pendingBurnLogId = null;
  burnFireTileX = -1;
  burnFireTileZ = -1;
  burnWaitStartedAt = 0;
  fletchDialogAt = 0;
  levelFallbackKey = "";
  startPosition = null;
  lastWoodcutActivityAt = 0;
  pendingLogDropSlots = [];
  static spots = [
    {
      label: "Draynor tree",
      treeKind: "normal",
      pathBankToTrees: [[3087, 3238], [3088, 3235]],
      walkNodeId: "wc_draynor_tree",
      bankNodeId: "bank_draynor"
    },
    {
      label: "Draynor oak",
      treeKind: "oak",
      pathBankToTrees: [[3087, 3238], [3083, 3250]],
      walkNodeId: "wc_draynor_oak",
      bankNodeId: "bank_draynor"
    },
    {
      label: "Draynor willow",
      treeKind: "willow",
      pathBankToTrees: [[3087, 3238], [3084, 3230]],
      walkNodeId: "wc_draynor_willow",
      bankNodeId: "bank_draynor"
    },
    {
      label: "Varrock east tree",
      treeKind: "normal",
      pathBankToTrees: [[3255, 3420], [3275, 3425], [3289, 3428]],
      walkNodeId: "wc_varrock_east_tree",
      bankNodeId: "bank_varrock_east"
    },
    {
      label: "Varrock east oak",
      treeKind: "oak",
      pathBankToTrees: [[3255, 3420], [3262, 3423], [3275, 3426]],
      walkNodeId: "wc_varrock_east_oak",
      bankNodeId: "bank_varrock_east"
    },
    {
      label: "Varrock north yew",
      treeKind: "yew",
      pathBankToTrees: [[3185, 3440], [3185, 3448], [3194, 3462], [3200, 3484], [3205, 3502]],
      walkNodeId: "wc_varrock_north_yew",
      bankNodeId: "bank_varrock_west"
    },
    {
      label: "Falador south yew",
      treeKind: "yew",
      pathBankToTrees: [[3011, 3341], [3005, 3330], [2997, 3312]],
      walkNodeId: "wc_falador_south_yew",
      bankNodeId: "bank_falador_east"
    },
    {
      label: "Catherby oak",
      treeKind: "oak",
      pathBankToTrees: [[2809, 3440], [2788, 3440]],
      walkNodeId: "wc_catherby_oak",
      bankNodeId: "bank_catherby"
    },
    {
      label: "Catherby willow",
      treeKind: "willow",
      pathBankToTrees: [[2809, 3440], [2795, 3435], [2783, 3428]],
      walkNodeId: "wc_catherby_willow",
      bankNodeId: "bank_catherby"
    },
    {
      label: "Catherby yew",
      treeKind: "yew",
      pathBankToTrees: [[2809, 3440], [2784, 3437], [2760, 3434]],
      walkNodeId: "wc_catherby_yew",
      bankNodeId: "bank_catherby"
    },
    {
      label: "Seers maple",
      treeKind: "maple",
      pathBankToTrees: [[2727, 3493], [2720, 3475]],
      walkNodeId: "wc_seers_maple",
      bankNodeId: "bank_seers"
    },
    {
      label: "Seers willow",
      treeKind: "willow",
      pathBankToTrees: [[2727, 3493], [2710, 3504]],
      walkNodeId: "wc_seers_willow",
      bankNodeId: "bank_seers"
    },
    {
      label: "Seers yew",
      treeKind: "yew",
      pathBankToTrees: [[2727, 3493], [2718, 3478], [2707, 3465]],
      walkNodeId: "wc_seers_yew",
      bankNodeId: "bank_seers"
    },
    {
      label: "Edgeville yew",
      treeKind: "yew",
      pathBankToTrees: [[3093, 3490], [3093, 3480]],
      walkNodeId: "wc_edgeville_yew",
      bankNodeId: "bank_edgeville"
    },
    {
      label: "Seers magic",
      treeKind: "magic",
      pathBankToTrees: [[2727, 3493], [2705, 3396]],
      walkNodeId: "wc_seers_magic",
      bankNodeId: "bank_seers"
    },
    {
      label: "Seers magic north",
      treeKind: "magic",
      pathBankToTrees: [[2727, 3493], [2704, 3454], [2692, 3425]],
      anchorMaxDist: 12,
      walkNodeId: "wc_seers_magic_north",
      bankNodeId: "bank_seers"
    },
    {
      label: "Gnome Stronghold magic west",
      treeKind: "magic",
      pathBankToTrees: [[2371, 3426]],
      anchorMaxDist: 10,
      walkNodeId: "wc_gnome_magic_west",
      bankNodeId: "bank_gnome_stronghold"
    },
    {
      label: "Gnome Stronghold magic central",
      treeKind: "magic",
      pathBankToTrees: [[2432, 3410]],
      anchorMaxDist: 10,
      walkNodeId: "wc_gnome_magic_central",
      bankNodeId: "bank_gnome_stronghold"
    },
    {
      label: "Gnome Stronghold magic east",
      treeKind: "magic",
      pathBankToTrees: [[2490, 3414]],
      anchorMaxDist: 10,
      walkNodeId: "wc_gnome_magic_east",
      bankNodeId: "bank_gnome_stronghold"
    }
  ];
  static treeKindOptions = [
    { label: "Tree (normal logs)", kind: "normal" },
    { label: "Oak", kind: "oak" },
    { label: "Willow", kind: "willow" },
    { label: "Maple", kind: "maple" },
    { label: "Yew", kind: "yew" },
    { label: "Magic", kind: "magic" }
  ];
  static logActionOptions = [
    {
      value: "none",
      label: "None (chop only)",
      hint: "Only woodcut; the bank stores logs and products.",
      requiresBank: true
    },
    {
      value: "drop",
      label: "Drop logs",
      hint: "Drops logs when inventory is full (no banking). Prefers logs matching the selected tree type.",
      requiresNoBank: true
    },
    {
      value: "burn",
      label: "Burn logs",
      hint: "Uses a tinderbox on logs matching the selected tree type (no banking).",
      requiresNoBank: true
    },
    {
      value: "shafts",
      label: "Arrow shafts",
      hint: "Knife on normal logs (members fletching dialog). Withdraws a knife from the bank when banking."
    },
    {
      value: "shortbow",
      label: "Shortbows (unstrung)",
      hint: "Knife fletching dialog for your log type. Withdraws a knife from the bank when banking."
    },
    {
      value: "longbow",
      label: "Longbows (unstrung)",
      hint: "Knife fletching dialog for your log type. Withdraws a knife from the bank when banking."
    }
  ];
  static keepWhenBanking = [ID_KNIFE, ID_TINDERBOX, ...AXE_IDS];
  constructor(spotIndex = 0, bankEnabled = false, treeKindIndex = 0, logAction = "none", maxRadius = null) {
    super("AutoWoodcutter", false, { author: "j", version: "1.1.0" });
    this.timer = new Timer;
    this.bankEnabled = bankEnabled;
    this.logAction = logAction;
    this.maxRadius = bankEnabled ? null : maxRadius;
    if (bankEnabled) {
      const i = Math.max(0, Math.min(spotIndex, AutoWoodcutter.spots.length - 1));
      this.spot = AutoWoodcutter.spots[i];
      this.treeKind = this.spot.treeKind;
    } else {
      this.spot = null;
      const ki = Math.max(0, Math.min(treeKindIndex, AutoWoodcutter.treeKindOptions.length - 1));
      this.treeKind = AutoWoodcutter.treeKindOptions[ki].kind;
    }
    this.timer.defineTimer("TIMER_GAME_INTERACT", TIMER_GAME_INTERACT);
    this.timer.defineTimer("TIMER_ENABLE_RUN", TIMER_ENABLE_RUN);
    this.timer.defineTimer("TIMER_KNIFE_USE", TIMER_KNIFE_USE);
    this.timer.defineTimer("TIMER_TINDER_USE", TIMER_TINDER_USE);
  }
  static htmlSetup(base) {
    const desc = document.createElement("p");
    desc.className = "bot-description";
    desc.textContent = "Woodcuts trees near you or at a preset spot. Choose what to do with logs: chop only, burn, or fletch. Banking deposits products and can withdraw tools.";
    base.appendChild(desc);
    const elemBank = document.createElement("input");
    elemBank.id = "awcBank";
    elemBank.type = "checkbox";
    elemBank.className = "bot-checkbox";
    const elemLogAction = document.createElement("select");
    elemLogAction.id = "awcLogAction";
    const elemLocation = document.createElement("select");
    elemLocation.id = "awcSpot";
    AutoWoodcutter.spots.forEach((s, idx) => {
      const option = document.createElement("option");
      option.value = String(idx);
      option.textContent = s.label;
      elemLocation.appendChild(option);
    });
    const elemTreeKind = document.createElement("select");
    elemTreeKind.id = "awcTreeKind";
    AutoWoodcutter.treeKindOptions.forEach((opt, idx) => {
      const option = document.createElement("option");
      option.value = String(idx);
      option.textContent = opt.label;
      elemTreeKind.appendChild(option);
    });
    const elemMaxRadius = document.createElement("input");
    elemMaxRadius.id = "awcMaxRadius";
    elemMaxRadius.type = "number";
    elemMaxRadius.min = "0";
    elemMaxRadius.step = "1";
    elemMaxRadius.placeholder = "No limit";
    elemMaxRadius.className = "bot-input";
    createField(base, "Bank logs / bows", elemBank, "Walks to the bank, deposits, and returns to the grove.");
    const fieldSpot = createField(base, "Tree area (when banking)", elemLocation, "Preset grove and bank route. Withdraws a bronze hatchet from the bank if you have none.");
    const fieldTreeKind = createField(base, "Tree type (no banking)", elemTreeKind, "Chops the nearest tree of this type wherever you are.");
    const fieldMaxRadius = createField(base, "Max radius (no banking)", elemMaxRadius, "Optional distance in tiles from where the script starts. Leave blank for no limit.");
    const logActionHint = document.createElement("small");
    logActionHint.className = "bot-hint";
    logActionHint.id = "awcLogActionHint";
    const fieldLogAction = createField(base, "Log processing", elemLogAction);
    fieldLogAction.appendChild(logActionHint);
    let bankModeWasEnabled = elemBank.checked;
    let logActionUiInitialized = false;
    const populateLogActionOptions = (banking, resetDefault) => {
      const prev = parseLogAction(elemLogAction.value);
      elemLogAction.replaceChildren();
      for (let i = 0;i < AutoWoodcutter.logActionOptions.length; i++) {
        const opt = AutoWoodcutter.logActionOptions[i];
        if (banking && opt.requiresNoBank) {
          continue;
        }
        if (!banking && opt.requiresBank) {
          continue;
        }
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        elemLogAction.appendChild(option);
      }
      const next = resetDefault ? defaultLogActionForBanking(banking) : sanitizeLogAction(prev, banking);
      elemLogAction.value = next;
      const selected = AutoWoodcutter.logActionOptions.find((o) => o.value === elemLogAction.value);
      logActionHint.textContent = selected?.hint ?? "";
    };
    elemLogAction.addEventListener("change", () => {
      const selected = AutoWoodcutter.logActionOptions.find((o) => o.value === elemLogAction.value);
      logActionHint.textContent = selected?.hint ?? "";
    });
    const syncBankMode = () => {
      const bank = elemBank.checked;
      const bankToggled = bank !== bankModeWasEnabled;
      fieldSpot.style.display = bank ? "" : "none";
      fieldTreeKind.style.display = bank ? "none" : "";
      fieldMaxRadius.style.display = bank ? "none" : "";
      populateLogActionOptions(bank, !logActionUiInitialized || bankToggled);
      logActionUiInitialized = true;
      bankModeWasEnabled = bank;
    };
    elemBank.addEventListener("change", syncBankMode);
    syncBankMode();
  }
  static buildFromHtml(_base) {
    const spot = getSelectNumber("awcSpot", 0);
    const bank = getChecked("awcBank");
    const treeKind = getSelectNumber("awcTreeKind", 0);
    const maxRadius = bank ? null : getOptionalNonNegativeNumber("awcMaxRadius");
    const logActionRaw = document.getElementById("awcLogAction")?.value ?? "none";
    const logAction = sanitizeLogAction(parseLogAction(logActionRaw), bank);
    return new AutoWoodcutter(spot, bank, treeKind, logAction, maxRadius);
  }
  logLevelFallback(api, requestedTree, effectiveTree, requestedAction, effectiveAction) {
    const key = `${requestedTree}>${effectiveTree}|${requestedAction}>${effectiveAction}`;
    if (key === this.levelFallbackKey) {
      return;
    }
    this.levelFallbackKey = key;
    if (requestedTree === effectiveTree && requestedAction === effectiveAction) {
      return;
    }
    api.bot.log("INFO", "AutoWoodcutter.update", "level fallback", {
      requestedTree,
      effectiveTree,
      requestedAction,
      effectiveAction,
      woodcutting: api.player.getLevel(STAT_WOODCUTTING),
      fletching: api.player.getLevel(STAT_FLETCHING),
      firemaking: api.player.getLevel(STAT_FIREMAKING)
    });
  }
  getNoBankRadiusAnchor(api) {
    if (this.bankEnabled || this.maxRadius === null) {
      return null;
    }
    if (this.startPosition) {
      return this.startPosition;
    }
    const x = api.player.getLocalX();
    const z = api.player.getLocalZ();
    if (x < 0 || z < 0) {
      return null;
    }
    this.startPosition = [x + api.surface.sceneBaseTileX, z + api.surface.sceneBaseTileZ];
    return this.startPosition;
  }
  refreshWoodcutActivity(api) {
    if (api.player.isAnimating()) {
      this.lastWoodcutActivityAt = Date.now();
    }
  }
  hasRecentWoodcutActivity(api) {
    this.refreshWoodcutActivity(api);
    return this.lastWoodcutActivityAt > 0 && Date.now() - this.lastWoodcutActivityAt <= WOODCUTTING_ACTIVITY_GRACE_MS;
  }
  beginLogDropSequence(api) {
    this.pendingLogDropSlots = collectLogDropSlots(api);
    if (this.pendingLogDropSlots.length === 0) {
      return false;
    }
    api.bot.log("INFO", "AutoWoodcutter.dropLogs", "start log drop sequence", {
      slots: this.pendingLogDropSlots
    });
    return this.dropNextQueuedLog(api);
  }
  dropNextQueuedLog(api) {
    while (this.pendingLogDropSlots.length > 0) {
      const slot = this.pendingLogDropSlots.shift();
      const item = api.inventory.getItemBySlot(slot);
      if (!item || !isLogId(item.id)) {
        continue;
      }
      logGameInteraction(api, "drop queued log", {
        itemId: item.id,
        slot: item.slot,
        interfaceId: item.interfaceId,
        remainingQueuedLogs: this.pendingLogDropSlots.length
      });
      item.drop();
      this.timer.setTimer(TIMER_GAME_INTERACT, LOG_DROP_SPACING_MS);
      return true;
    }
    this.timer.setTimer(TIMER_GAME_INTERACT, LOG_DROP_COOLDOWN_MS);
    api.bot.log("INFO", "AutoWoodcutter.dropLogs", "finished log drop sequence", {});
    return true;
  }
  beginKnifeFletch(api, logId, logAction) {
    if (!canFletchLog(api, logId, logAction)) {
      return false;
    }
    const knife = api.inventory.getItemById(ID_KNIFE);
    const log = api.inventory.getItemById(logId);
    const fletch = fletchFlagsForAction(logAction);
    const com = pickFletchKnifeDialogCom(logId, fletch.cutShafts, fletch.cutShortbow, fletch.cutLongbow);
    if (!knife || !log || com === null) {
      return false;
    }
    this.pendingDialogCom = com;
    this.knifeUseStep = "need_use_on_log";
    logGameInteraction(api, "start knife use", {
      knifeId: knife.id,
      knifeSlot: knife.slot,
      logId,
      dialogCom: com,
      logAction
    });
    knife.use();
    this.timer.setTimer(TIMER_KNIFE_USE, 120);
    this.timer.setTimer(TIMER_GAME_INTERACT, 400);
    return true;
  }
  beginBurnLog(api, logId) {
    if (isStandingOnFire(api) || !canBurnLog(api, logId)) {
      return false;
    }
    const tinder = api.inventory.getItemById(ID_TINDERBOX);
    const log = api.inventory.getItemById(logId);
    if (!tinder || !log) {
      return false;
    }
    this.pendingBurnLogId = logId;
    this.tinderUseStep = "need_use_on_log";
    logGameInteraction(api, "start tinderbox use", {
      tinderboxId: tinder.id,
      tinderboxSlot: tinder.slot,
      logId,
      logSlot: log.slot
    });
    tinder.use();
    this.timer.setTimer(TIMER_TINDER_USE, 120);
    this.timer.setTimer(TIMER_GAME_INTERACT, 400);
    return true;
  }
  async update(bot) {
    const api = bot.api;
    this.refreshWoodcutActivity(api);
    if (this.fletchDialogAt > 0 && Date.now() >= this.fletchDialogAt) {
      const com = this.pendingDialogCom;
      this.fletchDialogAt = 0;
      this.pendingDialogCom = null;
      if (com !== null) {
        logGameInteraction(api, "choose fletching dialog option", { com });
        api.interface.clickComponent(com);
      }
      this.timer.setTimer(TIMER_GAME_INTERACT, 2200);
      return;
    }
    if (this.tinderUseStep === "awaiting_fire") {
      if (isFiremakingComplete(api, this.burnFireTileX, this.burnFireTileZ)) {
        this.tinderUseStep = "idle";
        this.pendingBurnLogId = null;
        this.burnFireTileX = -1;
        this.burnFireTileZ = -1;
        this.burnWaitStartedAt = 0;
        this.timer.setTimer(TIMER_GAME_INTERACT, 800);
        return;
      }
      if (this.burnWaitStartedAt > 0 && Date.now() - this.burnWaitStartedAt > BURN_FIRE_WAIT_MS) {
        api.bot.log("WARN", "AutoWoodcutter.update", "firemaking timed out waiting for fire", {});
        this.tinderUseStep = "idle";
        this.pendingBurnLogId = null;
        this.burnFireTileX = -1;
        this.burnFireTileZ = -1;
        this.burnWaitStartedAt = 0;
        this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
        return;
      }
      this.timer.setTimer(TIMER_GAME_INTERACT, 350);
      return;
    }
    if (this.timer.hasTimer(TIMER_GAME_INTERACT)) {
      return;
    }
    if (api.world.hasPath() || api.webWalk.isWalking()) {
      return;
    }
    if (api.player.isMoving()) {
      this.timer.setTimer(TIMER_GAME_INTERACT, 300);
      return;
    }
    if (this.pendingLogDropSlots.length > 0) {
      this.dropNextQueuedLog(api);
      return;
    }
    if (this.knifeUseStep === "need_use_on_log" && !this.timer.hasTimer(TIMER_KNIFE_USE)) {
      let log = null;
      for (let i = 0;i < ALL_LOG_IDS.length; i++) {
        log = api.inventory.getItemById(ALL_LOG_IDS[i]);
        if (log) {
          break;
        }
      }
      const knife = api.inventory.getItemById(ID_KNIFE);
      if (knife && log) {
        logGameInteraction(api, "use knife on log", {
          logId: log.id,
          logSlot: log.slot,
          interfaceId: log.interfaceId
        });
        knife.useOnItem(log);
      }
      this.knifeUseStep = "idle";
      if (this.pendingDialogCom !== null) {
        this.fletchDialogAt = Date.now() + 450;
      }
      this.timer.setTimer(TIMER_GAME_INTERACT, 3600);
      return;
    }
    if (this.tinderUseStep === "need_use_on_log" && !this.timer.hasTimer(TIMER_TINDER_USE)) {
      const log = this.pendingBurnLogId !== null ? api.inventory.getItemById(this.pendingBurnLogId) : null;
      const tinder = api.inventory.getItemById(ID_TINDERBOX);
      if (tinder && log) {
        this.burnFireTileX = api.player.getLocalX();
        this.burnFireTileZ = api.player.getLocalZ();
        logGameInteraction(api, "use tinderbox on log", {
          logId: log.id,
          logSlot: log.slot,
          interfaceId: log.interfaceId,
          fireTileX: this.burnFireTileX,
          fireTileZ: this.burnFireTileZ
        });
        tinder.useOnItem(log);
      }
      this.tinderUseStep = "awaiting_fire";
      this.burnWaitStartedAt = Date.now();
      this.timer.setTimer(TIMER_GAME_INTERACT, 350);
      return;
    }
    if (!this.bankEnabled && !hasAnyAxe(api)) {
      api.bot.log("WARN", "AutoWoodcutter.update", "no hatchet in inventory", {});
      this.timer.setTimer(TIMER_GAME_INTERACT, 2500);
      return;
    }
    const chopTreeKindForLevel = this.bankEnabled && this.spot ? this.spot.treeKind : this.treeKind;
    const effectiveTreeKind = resolveEffectiveTreeKind(api, chopTreeKindForLevel);
    const effectiveLogAction = resolveEffectiveLogAction(api, this.logAction, effectiveTreeKind, this.bankEnabled);
    if (!this.bankEnabled || !this.spot) {
      this.logLevelFallback(api, this.treeKind, effectiveTreeKind, this.logAction, effectiveLogAction);
    } else if (effectiveLogAction !== this.logAction) {
      this.logLevelFallback(api, this.treeKind, this.spot.treeKind, this.logAction, effectiveLogAction);
    }
    const fletch = fletchFlagsForAction(effectiveLogAction);
    const fletchEnabled = fletch.cutShafts || fletch.cutShortbow || fletch.cutLongbow;
    if (!this.bankEnabled && (effectiveLogAction === "shortbow" || effectiveLogAction === "longbow")) {
      if (dropOneUnstrungBow(api)) {
        this.timer.setTimer(TIMER_GAME_INTERACT, 600);
        return;
      }
    }
    for (let li = 0;li < ALL_LOG_IDS.length; li++) {
      const lid = ALL_LOG_IDS[li];
      if (!api.inventory.hasItem(lid) || !wantsFletchOnLog(lid, fletch.cutShafts, fletch.cutShortbow, fletch.cutLongbow) || !canFletchLog(api, lid, effectiveLogAction)) {
        continue;
      }
      if (!api.inventory.hasItem(ID_KNIFE)) {
        break;
      }
      if (this.beginKnifeFletch(api, lid, effectiveLogAction)) {
        return;
      }
    }
    if (!this.bankEnabled && effectiveLogAction === "burn" && api.inventory.hasItem(ID_TINDERBOX) && !isStandingOnFire(api)) {
      const burnLogId = pickBurnableLogId(api);
      if (burnLogId !== null && this.beginBurnLog(api, burnLogId)) {
        return;
      }
    }
    if (!this.bankEnabled && effectiveLogAction === "drop" && api.inventory.isFull()) {
      if (dropOneUnstrungBow(api)) {
        this.timer.setTimer(TIMER_GAME_INTERACT, 600);
        return;
      }
      if (this.beginLogDropSequence(api)) {
        return;
      }
    }
    const needsKnifeForFletch = fletchEnabled && hasAnyFletchLog(api) && !api.inventory.hasItem(ID_KNIFE);
    const keepWhenBanking = [...AutoWoodcutter.keepWhenBanking];
    const hasItemsToDeposit = api.bank.hasDepositableItems(keepWhenBanking);
    const needBank = this.bankEnabled && (api.inventory.isFull() || !hasAnyAxe(api) || needsKnifeForFletch || api.bank.isOpen() && hasItemsToDeposit);
    if (needBank && this.spot) {
      if (!api.bank.isOpen()) {
        this.timer.setTimer(TIMER_GAME_INTERACT, 1600);
        logGameInteraction(api, "open bank", { bankNodeId: this.spot.bankNodeId });
        if (!api.bank.open()) {
          const pathToBank = this.spot.pathBankToTrees.length > 1 ? reverseWoodSpotPath(this.spot) : null;
          if (pathToBank) {
            logGameInteraction(api, "walk path to bank", {
              bankNodeId: this.spot.bankNodeId,
              pathToBank
            });
            const walkedPath = await api.webWalk.walkPath(pathToBank);
            if (!walkedPath) {
              logGameInteraction(api, "walk to bank node", { bankNodeId: this.spot.bankNodeId });
              await api.webWalk.walkToNode(this.spot.bankNodeId);
            }
          } else {
            logGameInteraction(api, "walk to bank node", { bankNodeId: this.spot.bankNodeId });
            await api.webWalk.walkToNode(this.spot.bankNodeId);
          }
        }
        return;
      }
      if (hasItemsToDeposit) {
        logGameInteraction(api, "deposit all except kept items", { keepWhenBanking });
        api.bank.depositAllExcept(keepWhenBanking);
        this.timer.setTimer(TIMER_GAME_INTERACT, 780);
        return;
      }
      this.timer.setTimer(TIMER_GAME_INTERACT, 600);
      if (!hasAnyAxe(api)) {
        logGameInteraction(api, "withdraw bronze hatchet", { itemId: 1351, count: 1 });
        await api.bank.withdraw(1351, 1);
        return;
      }
      if (fletchEnabled && !api.inventory.hasItem(ID_KNIFE)) {
        logGameInteraction(api, "withdraw knife", { itemId: ID_KNIFE, count: 1 });
        await api.bank.withdraw(ID_KNIFE, 1);
      }
      return;
    }
    if (this.hasRecentWoodcutActivity(api)) {
      this.timer.setTimer(TIMER_GAME_INTERACT, 300);
      return;
    }
    this.timer.setTimer(TIMER_GAME_INTERACT, 2000);
    const spotTreeAnchor = this.bankEnabled && this.spot ? getWoodSpotTreeAnchor(this.spot) : null;
    const anchor = spotTreeAnchor ?? this.getNoBankRadiusAnchor(api);
    const anchorMaxDist = this.bankEnabled && this.spot ? this.spot.anchorMaxDist ?? 14 : this.maxRadius;
    const chopTreeKind = this.bankEnabled && this.spot ? this.spot.treeKind : effectiveTreeKind;
    const tree = findChoppableTree(api, chopTreeKind, anchor, anchorMaxDist);
    if (tree) {
      if (!this.timer.hasTimer(TIMER_ENABLE_RUN)) {
        logGameInteraction(api, "enable run before tree click");
        api.player.enableRun();
        this.timer.setTimer(TIMER_ENABLE_RUN, ENABLE_RUN_CHECK_MS);
      }
      logGameInteraction(api, "chop tree", {
        treeId: tree.id,
        treeLocalX: tree.x,
        treeLocalZ: tree.z,
        treeWorldX: tree.x + api.surface.sceneBaseTileX,
        treeWorldZ: tree.z + api.surface.sceneBaseTileZ,
        chopTreeKind,
        anchor,
        anchorMaxDist,
        pathfindSteps: api.worldObject.getPathfindSteps(tree)
      });
      tree.interact(0);
      this.lastWoodcutActivityAt = Date.now();
    } else if (this.bankEnabled && this.spot && spotTreeAnchor && api.world.distanceTo(spotTreeAnchor[0], spotTreeAnchor[1]) > 8) {
      logGameInteraction(api, "walk path to trees", {
        walkNodeId: this.spot.walkNodeId,
        pathBankToTrees: this.spot.pathBankToTrees
      });
      const walkedPath = await api.webWalk.walkPath(this.spot.pathBankToTrees);
      if (!walkedPath) {
        logGameInteraction(api, "walk to woodcutting node", { walkNodeId: this.spot.walkNodeId });
        await api.webWalk.walkToNode(this.spot.walkNodeId);
      }
    }
  }
}
export {
  AutoWoodcutter as default
};

//# debugId=C5378F54CD6E470064756E2164756E21
