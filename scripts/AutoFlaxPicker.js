// src/runtime/actions.ts
var MiniMenuAction = {
  USEHELD_ONLOC: 810,
  USEHELD_ONHELD: 398,
  IF_BUTTON: 231,
  USEHELD_START: 102
};

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
  isSystemScript;
  isDebugScript;
  constructor(name, isSystemScript, isDebugScript = false) {
    this.name = name;
    this.isSystemScript = isSystemScript;
    this.isDebugScript = isDebugScript;
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

// src/scripts/AutoFlaxPicker.ts
var TIMER_GAME_INTERACT = 0;
var TIMER_ENABLE_RUN = 1;
var TIMER_SPIN_USE = 2;
var STAT_CRAFTING = 11;
var CRAFTING_LEVEL_FLAX_SPIN = 10;
var ID_FLAX_GROUND = 2646;
var ID_SPINNING_WHEEL = 2644;
var ID_DOOR_CLOSED = 1530;
var ID_LADDER_UP = 1747;
var ID_LADDER_DOWN = 1746;
var ID_FLAX = 1779;
var ID_BOW_STRING = 1777;
var FLAX_PICK_OP = 1;
var DOOR_OPEN_OP = 0;
var LADDER_OP = 0;
var FLAX_PATHFIND_MAX_STEPS = 100;
var FLAX_ANCHOR_MAX_DIST = 18;
var WORLD_OBJECT_TILE_TOLERANCE = 4;
var NEAR_FLAX_FIELD_DIST = 22;
var NEAR_SPIN_HOUSE_DIST = 14;
var NEAR_SPIN_DOOR_DIST = 8;
var NEAR_BANK_DIST = 16;
var SEERS_SPIN_DOOR = [2715, 3472];
var SEERS_SPIN_LADDER = [2715, 3470];
var SEERS_SPIN_WHEEL = [2711, 3471];
var SEERS_BANK = [2727, 3493];
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
}
function getChecked(id) {
  return document.getElementById(id)?.checked ?? false;
}
function findPickableFlax(api, anchor, anchorMaxDist) {
  const candidates = api.worldObject.getById([ID_FLAX_GROUND]);
  let best = null;
  let bestSteps = Number.POSITIVE_INFINITY;
  const baseX = api.surface.sceneBaseTileX;
  const baseZ = api.surface.sceneBaseTileZ;
  for (let i = 0;i < candidates.length; i++) {
    const wo = candidates[i];
    const wx = wo.x + baseX;
    const wz = wo.z + baseZ;
    const da = Utility.getDistance(wx, wz, anchor[0], anchor[1]);
    if (da > anchorMaxDist) {
      continue;
    }
    const steps = api.worldObject.getPathfindSteps(wo);
    if (steps < 0 || steps > FLAX_PATHFIND_MAX_STEPS) {
      continue;
    }
    if (steps < bestSteps) {
      bestSteps = steps;
      best = wo;
    }
  }
  return best;
}
function findWorldObjectNearTile(api, ids, worldX, worldZ, maxDist = WORLD_OBJECT_TILE_TOLERANCE) {
  const baseX = api.surface.sceneBaseTileX;
  const baseZ = api.surface.sceneBaseTileZ;
  const candidates = api.worldObject.getById(ids);
  let best = null;
  let bestDist = maxDist + 1;
  for (let i = 0;i < candidates.length; i++) {
    const wo = candidates[i];
    const wx = wo.x + baseX;
    const wz = wo.z + baseZ;
    const d = Utility.getDistance(wx, wz, worldX, worldZ);
    if (d <= maxDist && d < bestDist) {
      bestDist = d;
      best = wo;
    }
  }
  return best;
}
function findReachableWorldObjectNearTile(api, ids, worldX, worldZ, maxDist = WORLD_OBJECT_TILE_TOLERANCE, maxSteps = FLAX_PATHFIND_MAX_STEPS) {
  const baseX = api.surface.sceneBaseTileX;
  const baseZ = api.surface.sceneBaseTileZ;
  const candidates = api.worldObject.getById(ids);
  let best = null;
  let bestSteps = Number.POSITIVE_INFINITY;
  for (let i = 0;i < candidates.length; i++) {
    const wo = candidates[i];
    const wx = wo.x + baseX;
    const wz = wo.z + baseZ;
    if (Utility.getDistance(wx, wz, worldX, worldZ) > maxDist) {
      continue;
    }
    const steps = api.worldObject.getPathfindSteps(wo);
    if (steps < 0 || steps > maxSteps) {
      continue;
    }
    if (steps < bestSteps) {
      bestSteps = steps;
      best = wo;
    }
  }
  return best;
}
function useItemOnWorldObject(api, item, wo) {
  const lx = wo.typecode & 127;
  const lz = wo.typecode >> 7 & 127;
  api.doAction(MiniMenuAction.USEHELD_ONLOC, wo.typecode, lx, lz);
}

class AutoFlaxPicker extends BotScript {
  timer;
  spot;
  spinEnabled;
  spinUseStep = "idle";
  pendingSpinWheel = null;
  craftingLevelWarned = false;
  static spots = [
    {
      label: "Seers' Village flax field",
      anchor: [2744, 3445],
      pathToBank: [
        [2744, 3445],
        [2738, 3475],
        [2727, 3493]
      ],
      pathToSpinHouse: [
        [2744, 3445],
        [2730, 3465],
        [2715, 3472]
      ],
      pathFromSpinHouseToBank: [
        [2715, 3470],
        [2715, 3472],
        [2719, 3476],
        [2724, 3486],
        [2727, 3493]
      ]
    }
  ];
  constructor(spotIndex = 0, spinEnabled = false) {
    super("AutoFlaxPicker", false);
    this.timer = new Timer;
    this.spinEnabled = spinEnabled;
    const i = Math.max(0, Math.min(spotIndex, AutoFlaxPicker.spots.length - 1));
    this.spot = AutoFlaxPicker.spots[i];
    this.timer.defineTimer("TIMER_GAME_INTERACT", TIMER_GAME_INTERACT);
    this.timer.defineTimer("TIMER_ENABLE_RUN", TIMER_ENABLE_RUN);
    this.timer.defineTimer("TIMER_SPIN_USE", TIMER_SPIN_USE);
  }
  static htmlSetup(base) {
    const desc = document.createElement("p");
    desc.className = "bot-description";
    desc.textContent = "Picks flax at the Seers' Village field and banks at Seers' Village bank. Optionally spins flax upstairs at the Seers spinning wheel (level 10 Crafting).";
    base.appendChild(desc);
    const elemSpin = document.createElement("input");
    elemSpin.id = "afpSpin";
    elemSpin.type = "checkbox";
    elemSpin.className = "bot-checkbox";
    createField(base, "Spin flax (Seers wheel)", elemSpin, "Uses the upstairs spinning wheel in the house by the ladder (door 1530, ladder 1747). Requires level 10 Crafting.");
  }
  static buildFromHtml(_base) {
    return new AutoFlaxPicker(0, getChecked("afpSpin"));
  }
  canSpinFlax(api) {
    if (!this.spinEnabled) {
      return false;
    }
    if (api.player.getLevel(STAT_CRAFTING) < CRAFTING_LEVEL_FLAX_SPIN) {
      if (!this.craftingLevelWarned) {
        this.craftingLevelWarned = true;
        api.bot.log("WARN", "AutoFlaxPicker.update", "spin disabled — Crafting level too low", {
          required: CRAFTING_LEVEL_FLAX_SPIN,
          current: api.player.getLevel(STAT_CRAFTING)
        });
      }
      return false;
    }
    return true;
  }
  isNearFlaxField(api) {
    return api.world.distanceTo(this.spot.anchor[0], this.spot.anchor[1]) < NEAR_FLAX_FIELD_DIST;
  }
  isNearSpinHouse(api) {
    return api.world.distanceTo(SEERS_SPIN_DOOR[0], SEERS_SPIN_DOOR[1]) < NEAR_SPIN_HOUSE_DIST;
  }
  isNearSpinDoor(api) {
    return api.world.distanceTo(SEERS_SPIN_DOOR[0], SEERS_SPIN_DOOR[1]) < NEAR_SPIN_DOOR_DIST;
  }
  isNearBank(api) {
    return api.world.distanceTo(SEERS_BANK[0], SEERS_BANK[1]) < NEAR_BANK_DIST;
  }
  openSpinHouseDoorIfClosed(api) {
    if (!this.isNearSpinDoor(api)) {
      return false;
    }
    const closedDoor = findWorldObjectNearTile(api, [ID_DOOR_CLOSED], SEERS_SPIN_DOOR[0], SEERS_SPIN_DOOR[1]);
    if (!closedDoor) {
      return false;
    }
    this.timer.setTimer(TIMER_GAME_INTERACT, 900);
    closedDoor.interact(DOOR_OPEN_OP);
    return true;
  }
  async exitSpinHouseToBank(api) {
    if (this.openSpinHouseDoorIfClosed(api)) {
      return true;
    }
    if (!this.isNearBank(api) && this.canWalk(api) && !api.world.hasPath()) {
      await this.safeWalkPath(api, this.spot.pathFromSpinHouseToBank);
      return true;
    }
    return false;
  }
  beginSpinFlax(api, wheel) {
    const flax = api.inventory.getItemById(ID_FLAX);
    if (!flax) {
      return false;
    }
    this.pendingSpinWheel = wheel;
    this.spinUseStep = "need_use_on_wheel";
    api.doAction(MiniMenuAction.USEHELD_START, flax.id, flax.slot, flax.interfaceId);
    this.timer.setTimer(TIMER_SPIN_USE, 120);
    this.timer.setTimer(TIMER_GAME_INTERACT, 400);
    return true;
  }
  async handleSpinHouse(api) {
    const level = api.surface.currentLevel;
    if (level === 0 && !this.isNearSpinHouse(api)) {
      return false;
    }
    if (this.spinUseStep === "need_use_on_wheel" && !this.timer.hasTimer(TIMER_SPIN_USE)) {
      const wheel = this.pendingSpinWheel;
      if (wheel) {
        const flax = api.inventory.getItemById(ID_FLAX);
        if (flax) {
          useItemOnWorldObject(api, flax, wheel);
        }
      }
      this.spinUseStep = "idle";
      this.pendingSpinWheel = null;
      this.timer.setTimer(TIMER_GAME_INTERACT, 2200);
      return true;
    }
    if (level >= 1) {
      if (api.inventory.hasItem(ID_FLAX)) {
        this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
        if (api.player.isAnimating()) {
          return true;
        }
        const wheel = findReachableWorldObjectNearTile(api, [ID_SPINNING_WHEEL], SEERS_SPIN_WHEEL[0], SEERS_SPIN_WHEEL[1]) ?? api.worldObject.getNearestByIdPath([ID_SPINNING_WHEEL], FLAX_PATHFIND_MAX_STEPS);
        if (wheel) {
          this.beginSpinFlax(api, wheel);
        }
        return true;
      }
      const ladderDown = findReachableWorldObjectNearTile(api, [ID_LADDER_DOWN], SEERS_SPIN_LADDER[0], SEERS_SPIN_LADDER[1]) ?? api.worldObject.getNearestByIdPath([ID_LADDER_DOWN], FLAX_PATHFIND_MAX_STEPS);
      const ladderDist = api.world.distanceTo(SEERS_SPIN_LADDER[0], SEERS_SPIN_LADDER[1]);
      if (ladderDist > 2 && this.canWalk(api) && !api.world.hasPath()) {
        await this.safeWalkPath(api, [[SEERS_SPIN_LADDER[0], SEERS_SPIN_LADDER[1]]], false);
        return true;
      }
      if (ladderDown) {
        this.timer.setTimer(TIMER_GAME_INTERACT, 2400);
        ladderDown.interact(LADDER_OP);
        api.bot.log("INFO", "AutoFlaxPicker.handleSpinHouse", "climb down ladder", {
          locId: ladderDown.id,
          worldX: ladderDown.x + api.surface.sceneBaseTileX,
          worldZ: ladderDown.z + api.surface.sceneBaseTileZ
        });
        return true;
      }
      api.bot.log("WARN", "AutoFlaxPicker.handleSpinHouse", "no climb-down ladder (1746) in scene", {
        level,
        ladderDist
      });
      this.timer.setTimer(TIMER_GAME_INTERACT, 1500);
      return true;
    }
    if (this.openSpinHouseDoorIfClosed(api)) {
      return true;
    }
    const ladderUp = findWorldObjectNearTile(api, [ID_LADDER_UP], SEERS_SPIN_LADDER[0], SEERS_SPIN_LADDER[1]);
    if (ladderUp && api.world.distanceTo(SEERS_SPIN_LADDER[0], SEERS_SPIN_LADDER[1]) <= 6) {
      this.timer.setTimer(TIMER_GAME_INTERACT, 1600);
      ladderUp.interact(LADDER_OP);
      return true;
    }
    return false;
  }
  canWalk(api) {
    return api.isLoggedIn() && api.player.getLocalX() >= 0 && api.player.getLocalZ() >= 0;
  }
  async safeWalkPath(api, path, traverse = true) {
    if (!this.canWalk(api) || api.world.hasPath()) {
      this.timer.setTimer(TIMER_GAME_INTERACT, 800);
      return;
    }
    this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
    await api.world.walkPath(path, traverse);
  }
  async walkTowardSpinHouse(api) {
    await this.safeWalkPath(api, this.spot.pathToSpinHouse);
  }
  async walkTowardFlaxField(api) {
    await this.safeWalkPath(api, [[this.spot.anchor[0], this.spot.anchor[1]]], false);
  }
  async walkTowardBank(api, fromSpinHouse) {
    await this.safeWalkPath(api, fromSpinHouse ? this.spot.pathFromSpinHouseToBank : this.spot.pathToBank);
  }
  async update(bot) {
    const api = bot.api;
    if (api.world.hasPath()) {
      return;
    }
    if (this.timer.hasTimer(TIMER_GAME_INTERACT)) {
      return;
    }
    api.tryLogin(() => {
      api.player.enableRun();
      this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + Math.random() * 60000);
    });
    if (!this.timer.hasTimer(TIMER_ENABLE_RUN)) {
      api.player.enableRun();
      this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + Math.random() * 60000);
    }
    if (api.player.isMoving()) {
      this.timer.setTimer(TIMER_GAME_INTERACT, 300);
      return;
    }
    if (!api.isLoggedIn()) {
      return;
    }
    if (!this.canWalk(api)) {
      this.timer.setTimer(TIMER_GAME_INTERACT, 800);
      return;
    }
    const canSpin = this.canSpinFlax(api);
    const hasFlax = api.inventory.hasItem(ID_FLAX);
    const hasBowString = api.inventory.hasItem(ID_BOW_STRING);
    const onSpinFloor = api.surface.currentLevel >= 1;
    const nearFlaxField = this.isNearFlaxField(api);
    const nearSpinHouse = this.isNearSpinHouse(api);
    const nearBank = this.isNearBank(api);
    const wantsSpinTrip = canSpin && hasFlax && api.inventory.isFull();
    const shouldWalkToSpinHouse = wantsSpinTrip && !onSpinFloor && !nearSpinHouse;
    const shouldSpinNow = wantsSpinTrip && (onSpinFloor || nearSpinHouse);
    const shouldDescendSpinHouse = this.spinEnabled && onSpinFloor && !hasFlax;
    if (shouldWalkToSpinHouse) {
      await this.walkTowardSpinHouse(api);
      return;
    }
    if (shouldSpinNow || shouldDescendSpinHouse) {
      if (await this.handleSpinHouse(api)) {
        return;
      }
    }
    const needBank = !shouldSpinNow && !shouldDescendSpinHouse && !shouldWalkToSpinHouse && (api.inventory.isFull() || hasBowString || api.bank.isOpen() && api.bank.hasDepositableItems([]));
    const shouldExitSpinHouse = this.spinEnabled && api.surface.currentLevel === 0 && needBank && nearSpinHouse && !nearBank;
    if (needBank) {
      if (shouldExitSpinHouse) {
        if (await this.exitSpinHouseToBank(api)) {
          return;
        }
      }
      if (!api.bank.isOpen()) {
        this.timer.setTimer(TIMER_GAME_INTERACT, 1600);
        if (!api.bank.open()) {
          if (!nearBank) {
            await this.walkTowardBank(api, shouldExitSpinHouse || nearSpinHouse);
          }
        }
        return;
      }
      if (api.bank.hasDepositableItems([])) {
        api.bank.depositAllExcept([]);
        this.timer.setTimer(TIMER_GAME_INTERACT, 780);
        return;
      }
      this.timer.setTimer(TIMER_GAME_INTERACT, 600);
      return;
    }
    if (!nearFlaxField) {
      if (api.inventory.isFull()) {
        this.timer.setTimer(TIMER_GAME_INTERACT, 1000);
        return;
      }
      await this.walkTowardFlaxField(api);
      return;
    }
    if (!api.player.isAnimating()) {
      this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
      const flax = findPickableFlax(api, this.spot.anchor, FLAX_ANCHOR_MAX_DIST);
      if (flax) {
        flax.interact(FLAX_PICK_OP);
      }
    }
  }
}
export {
  AutoFlaxPicker as default
};

//# debugId=CB79D60D1DD4F21B64756E2164756E21
