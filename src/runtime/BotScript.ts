import type { Bot } from './types';

export default class BotScript {
  name: string;
  isSystemScript: boolean;
  isDebugScript: boolean;

  constructor(name: string, isSystemScript: boolean, isDebugScript = false) {
    this.name = name;
    this.isSystemScript = isSystemScript;
    this.isDebugScript = isDebugScript;
  }

  start(_bot: Bot): void {}
  update(_bot: Bot): void {}
  stop(_bot: Bot): void {}

  static htmlSetup(_base: HTMLElement): void {}

  static buildFromHtml(_base: HTMLElement): BotScript {
    const Ctor = this as unknown as { new (): BotScript };
    return new Ctor();
  }
}
