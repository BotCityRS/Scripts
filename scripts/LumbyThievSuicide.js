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

// src/scripts/LumbyThievSuicide.ts
var TIMER_GAME_INTERACT = 0;
var TIMER_ENABLE_RUN = 1;
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

class LumbyThievSuicide extends BotScript {
  timer;
  pickupCoins;
  constructor(pickupCoins = true) {
    super("LumbyThievSuicide", false);
    this.timer = new Timer;
    this.pickupCoins = pickupCoins;
    this.timer.defineTimer("TIMER_GAME_INTERACT", TIMER_GAME_INTERACT);
    this.timer.defineTimer("TIMER_ENABLE_RUN", TIMER_ENABLE_RUN);
  }
  static htmlSetup(base) {
    const desc = document.createElement("p");
    desc.className = "bot-description";
    desc.textContent = "Steals from Lumbridge NPCs and optionally collects dropped coins.";
    base.appendChild(desc);
    const elemPickupCoins = document.createElement("input");
    elemPickupCoins.id = "elemPickupCoins";
    elemPickupCoins.type = "checkbox";
    elemPickupCoins.checked = true;
    elemPickupCoins.className = "bot-checkbox";
    createField(base, "Pick up coins", elemPickupCoins, "Collects nearby coin drops before thieving again.");
  }
  static buildFromHtml(_base) {
    const pickupCoins = getChecked("elemPickupCoins");
    return new LumbyThievSuicide(pickupCoins);
  }
  update(bot) {
    const api = bot.api;
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
    if (api.player.isMoving() || api.player.isAnimating()) {
      this.timer.setTimer(TIMER_GAME_INTERACT, 300);
      return;
    }
    const groundItem = this.pickupCoins && api.groundItem.getNearestGroundItemById([995], 20);
    if (groundItem) {
      groundItem.pickUp();
      this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
    } else {
      const mark = api.npc.getNPCByIdsNearestIf([1, 2, 3, 4], (npc) => {
        return !npc.isInArea(3202, 3209, 3216, 3228);
      });
      if (mark) {
        const stole = mark.interactByOpIncludes("pickpocket") || mark.interactByOpIncludes("steal") || mark.interactByOpIncludes("pick-pocket");
        if (!stole) {
          mark.interact(0);
        }
      }
      this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
    }
  }
}
export {
  LumbyThievSuicide as default
};

//# debugId=0F101D9B869511C564756E2164756E21
