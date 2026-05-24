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

// src/runtime/walk.ts
var HUB_ROUTE_OPTIONS = [
  { label: "Draynor <-> Lumbridge", from: "hub_draynor", to: "hub_lumbridge" },
  { label: "Draynor <-> Falador", from: "hub_draynor", to: "hub_falador" },
  { label: "Draynor <-> Barb Village", from: "hub_draynor", to: "hub_barbarian_village" },
  { label: "Barb Village <-> Varrock", from: "hub_barbarian_village", to: "hub_varrock" },
  { label: "Barb Village <-> Edgeville bank", from: "hub_barbarian_village", to: "bank_edgeville" },
  { label: "Falador <-> Varrock", from: "hub_falador", to: "hub_varrock" },
  { label: "Falador <-> Catherby bank", from: "hub_falador", to: "bank_catherby" },
  { label: "Varrock <-> Lumbridge", from: "hub_varrock", to: "hub_lumbridge" },
  { label: "Lumbridge <-> Al Kharid bank", from: "hub_lumbridge", to: "bank_al_kharid" },
  { label: "Lumbridge <-> Port Sarim", from: "hub_lumbridge", to: "hub_port_sarim" },
  { label: "Port Sarim <-> Rimmington", from: "hub_port_sarim", to: "hub_rimmington" },
  { label: "Rimmington <-> Falador", from: "hub_rimmington", to: "hub_falador" }
];

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

// src/scripts/AutoWalker.ts
var TIMER_GAME_INTERACT = 0;
var TIMER_ENABLE_RUN = 1;
var TIMER_NOT_MOVING = 2;
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
function getSelectNumber(id, fallback) {
  const raw = document.getElementById(id)?.value ?? "";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function getChecked(id) {
  return document.getElementById(id)?.checked ?? false;
}

class AutoWalker extends BotScript {
  timer;
  fromNode;
  toNode;
  traverse;
  constructor(routeIndex = 0, traverse = true) {
    super("AutoWalker", false);
    this.timer = new Timer;
    const route = HUB_ROUTE_OPTIONS[routeIndex] ?? HUB_ROUTE_OPTIONS[0];
    this.fromNode = route.from;
    this.toNode = route.to;
    this.traverse = traverse;
    this.timer.defineTimer("TIMER_GAME_INTERACT", TIMER_GAME_INTERACT);
    this.timer.defineTimer("TIMER_ENABLE_RUN", TIMER_ENABLE_RUN);
    this.timer.defineTimer("TIMER_NOT_MOVING", TIMER_NOT_MOVING);
  }
  static htmlSetup(base) {
    const desc = document.createElement("p");
    desc.className = "bot-description";
    desc.textContent = "Walks a hub route from the walk graph until arrival.";
    base.appendChild(desc);
    const elemLocation = document.createElement("select");
    elemLocation.id = "elemLocation";
    const elemReverse = document.createElement("input");
    elemReverse.id = "elemReverse";
    elemReverse.type = "checkbox";
    elemReverse.className = "bot-checkbox";
    HUB_ROUTE_OPTIONS.forEach((loc, i) => {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = loc.label;
      elemLocation.appendChild(option);
    });
    createField(base, "Route", elemLocation, "Choose a route pair. Script stops after arrival.");
    createField(base, "Walk route in reverse", elemReverse, "If enabled, walks from destination back to start.");
  }
  static buildFromHtml(_base) {
    const elemLocation = getSelectNumber("elemLocation", 0);
    const clampedLocation = Math.max(0, Math.min(elemLocation, HUB_ROUTE_OPTIONS.length - 1));
    const traverse = !getChecked("elemReverse");
    return new AutoWalker(clampedLocation, traverse);
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
    if (api.player.isMoving()) {
      this.timer.setTimer(TIMER_NOT_MOVING, 1200);
    }
    if (!this.timer.hasTimer(TIMER_NOT_MOVING)) {
      const from = this.traverse ? this.fromNode : this.toNode;
      const to = this.traverse ? this.toNode : this.fromNode;
      const planned = api.webWalk.planRoute(from, to);
      if (!planned || planned.length === 0) {
        api.bot.log("WARN", "AutoWalker", "no planned route", { from, to });
        return;
      }
      api.webWalk.walkPath(planned).then((result) => {
        if (result) {
          api.bot.stop();
        }
      });
      this.timer.setTimer(TIMER_NOT_MOVING, 1200);
    }
  }
  stop(bot) {
    bot.api.webWalk.stop();
  }
}
export {
  AutoWalker as default
};

//# debugId=F9E11A13F3AD02CA64756E2164756E21
