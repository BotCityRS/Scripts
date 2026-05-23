export type PathNode = [number, number];
export type Path = PathNode[];
export type WalkNodeId = string;

export type BotAPI = any;
export type WorldObjectEntity = any;
export type InvInterfaceItem = any;
export type ClientNPCEntity = any;

export type Bot = {
  api: BotAPI;
  start(script: unknown): void;
  stop(): void;
  log?(level: string, source: string, message: string, detail?: unknown): void;
};
