import type { Bot } from './types';

export type BotScriptMetadata = {
  author: string;
  version: string;
  isDebugScript?: boolean;
};

export default class BotScript {
  name: string;
  author: string;
  version: string;
  isSystemScript: boolean;
  isDebugScript: boolean;

  constructor(name: string, isSystemScript: boolean, metadata: BotScriptMetadata) {
    this.name = name;
    this.author = metadata.author;
    this.version = metadata.version;
    this.isSystemScript = isSystemScript;
    this.isDebugScript = metadata.isDebugScript ?? false;
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
