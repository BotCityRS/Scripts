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

// src/scripts/PathRecorder.ts
var RECORD_INTERVAL_MS = 550;
var MIN_TILE_DELTA = 3;
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

class PathRecorder extends BotScript {
  recording = false;
  buffer = [];
  lastRecorded = null;
  intervalId = null;
  fromId;
  toId;
  constructor(fromId = "hub_lumbridge", toId = "bank_al_kharid") {
    super("PathRecorder", false, true);
    this.fromId = fromId;
    this.toId = toId;
  }
  getWorldPos(bot) {
    return bot.api.webWalk.getPlayerWorldPos();
  }
  tickRecord(bot) {
    const pos = this.getWorldPos(bot);
    if (!pos) {
      return;
    }
    if (this.lastRecorded) {
      const dx = pos[0] - this.lastRecorded[0];
      const dz = pos[1] - this.lastRecorded[1];
      if (Math.sqrt(dx * dx + dz * dz) < MIN_TILE_DELTA) {
        return;
      }
    }
    this.buffer.push([pos[0], pos[1]]);
    this.lastRecorded = [pos[0], pos[1]];
    this.updateOutput();
  }
  updateOutput() {
    const ta = document.getElementById("pathRecorderOutput");
    if (!ta) {
      return;
    }
    const snippet = JSON.stringify({
      from: this.fromId,
      to: this.toId,
      path: this.buffer,
      bidirectional: true
    }, null, 2);
    ta.value = snippet;
  }
  static htmlSetup(base) {
    const intro = document.createElement("p");
    intro.className = "bot-description";
    intro.textContent = "Walk a route in-game, then copy the edge JSON into walkGraph.ts. Requires debug mode.";
    base.appendChild(intro);
    const fromInput = document.createElement("input");
    fromInput.id = "pathRecorderFrom";
    fromInput.type = "text";
    fromInput.placeholder = "hub_lumbridge";
    fromInput.value = "hub_lumbridge";
    const toInput = document.createElement("input");
    toInput.id = "pathRecorderTo";
    toInput.type = "text";
    toInput.placeholder = "bank_al_kharid";
    toInput.value = "bank_al_kharid";
    const section = document.createElement("section");
    section.className = "bot-section";
    base.appendChild(section);
    createField(section, "From node id", fromInput, "WalkNodeId in walkGraph.ts");
    createField(section, "To node id", toInput);
    const actions = document.createElement("div");
    actions.className = "bot-actions";
    const startBtn = document.createElement("button");
    startBtn.className = "bot-button";
    startBtn.type = "button";
    startBtn.textContent = "Start recording";
    startBtn.onclick = () => {
      globalThis.bot.start(PathRecorder.buildFromHtml(base));
    };
    const stopBtn = document.createElement("button");
    stopBtn.className = "bot-button";
    stopBtn.type = "button";
    stopBtn.textContent = "Stop recording";
    stopBtn.onclick = () => {
      globalThis.bot.stop();
    };
    const copyBtn = document.createElement("button");
    copyBtn.className = "bot-button";
    copyBtn.type = "button";
    copyBtn.textContent = "Copy JSON";
    copyBtn.onclick = async () => {
      const ta = document.getElementById("pathRecorderOutput");
      if (ta?.value) {
        await navigator.clipboard.writeText(ta.value);
      }
    };
    actions.appendChild(startBtn);
    actions.appendChild(stopBtn);
    actions.appendChild(copyBtn);
    base.appendChild(actions);
    const output = document.createElement("textarea");
    output.id = "pathRecorderOutput";
    output.className = "bot-textarea";
    output.rows = 12;
    output.readOnly = true;
    output.spellcheck = false;
    base.appendChild(output);
  }
  static buildFromHtml(base) {
    const from = document.getElementById("pathRecorderFrom")?.value.trim() ?? "hub_lumbridge";
    const to = document.getElementById("pathRecorderTo")?.value.trim() ?? "bank_al_kharid";
    return new PathRecorder(from, to);
  }
  start(bot) {
    this.recording = true;
    this.buffer = [];
    this.lastRecorded = null;
    const pos = this.getWorldPos(bot);
    if (pos) {
      this.buffer.push(pos);
      this.lastRecorded = pos;
    }
    this.fromId = document.getElementById("pathRecorderFrom")?.value.trim() ?? this.fromId;
    this.toId = document.getElementById("pathRecorderTo")?.value.trim() ?? this.toId;
    this.updateOutput();
    this.intervalId = setInterval(() => this.tickRecord(bot), RECORD_INTERVAL_MS);
    bot.api.bot.log("INFO", "PathRecorder", "recording started", { from: this.fromId, to: this.toId });
  }
  stop(bot) {
    this.recording = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.updateOutput();
    bot.api.bot.log("INFO", "PathRecorder", "recording stopped", { points: this.buffer.length });
  }
}
export {
  PathRecorder as default
};

//# debugId=AD3F3328134C7EE264756E2164756E21
