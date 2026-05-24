import { pickFletchKnifeDialogCom } from '../runtime/fletchCutLogsDialogCom';
import type { WorldObjectEntity } from '../runtime/types';
import type { WalkNodeId } from '../runtime/types';
import Timer from '../runtime/Timer';
import Utility from '../runtime/Utility';
import type { Bot } from '../runtime/types';
import BotScript from '../runtime/BotScript';

const TIMER_GAME_INTERACT = 0;
const TIMER_ENABLE_RUN = 1;
const TIMER_KNIFE_USE = 2;
const TIMER_TINDER_USE = 3;
const ENABLE_RUN_CHECK_MS = 10000;

const ID_KNIFE = 946;
const ID_TINDERBOX = 590;
const ID_FIRE_LOC = 2732;
const ID_LOGS = 1511;
const ID_OAK_LOGS = 1521;
const ID_WILLOW_LOGS = 1519;
const ID_MAPLE_LOGS = 1517;
const ID_YEW_LOGS = 1515;
const ID_MAGIC_LOGS = 1513;

/** Highest-tier log first (burn / drop / fletch priority). */
const ALL_LOG_IDS = [ID_MAGIC_LOGS, ID_YEW_LOGS, ID_MAPLE_LOGS, ID_WILLOW_LOGS, ID_OAK_LOGS, ID_LOGS] as const;

const AXE_IDS = [1349, 1351, 1353, 1355, 1357, 1359, 1361] as const;

/** Unstrung bows from knife fletching (`obj.pack`), highest tier first. */
const UNSTRUNG_BOW_IDS = [
    72, 70, 68, 66, 64, 62, // magic, yew, maple
    60, 58, 54, 56, 50, 48 // willow, oak, normal
] as const;

type TreeKind = 'normal' | 'oak' | 'willow' | 'maple' | 'yew' | 'magic';

const TREE_KINDS_HIGH_TO_LOW: TreeKind[] = ['magic', 'yew', 'maple', 'willow', 'oak', 'normal'];

type LogAction = 'none' | 'drop' | 'burn' | 'shafts' | 'shortbow' | 'longbow';

type FletchProduct = 'shafts' | 'shortbow' | 'longbow';

/** Matches `stat.constant`. */
const STAT_FIREMAKING = 17;
const STAT_WOODCUTTING = 18;
const STAT_FLETCHING = 19;

const WC_LEVEL_FOR_TREE: Record<TreeKind, number> = {
    normal: 0,
    oak: 15,
    willow: 30,
    maple: 45,
    yew: 60,
    magic: 75
};

const LOG_ID_BY_TREE_KIND: Record<TreeKind, number> = {
    normal: ID_LOGS,
    oak: ID_OAK_LOGS,
    willow: ID_WILLOW_LOGS,
    maple: ID_MAPLE_LOGS,
    yew: ID_YEW_LOGS,
    magic: ID_MAGIC_LOGS
};

const FM_LEVEL_FOR_LOG: Record<number, number> = {
    [ID_LOGS]: 1,
    [ID_OAK_LOGS]: 15,
    [ID_WILLOW_LOGS]: 30,
    [ID_MAPLE_LOGS]: 45,
    [ID_YEW_LOGS]: 60,
    [ID_MAGIC_LOGS]: 75
};

/** From `skill_fletching/configs/cut_logs/cut_logs.dbrow`. */
const FLETCH_LEVEL_FOR_LOG: Record<number, Partial<Record<FletchProduct, number>>> = {
    [ID_LOGS]: { shafts: 1, shortbow: 5, longbow: 10 },
    [ID_OAK_LOGS]: { shortbow: 20, longbow: 25 },
    [ID_WILLOW_LOGS]: { shortbow: 35, longbow: 40 },
    [ID_MAPLE_LOGS]: { shortbow: 50, longbow: 55 },
    [ID_YEW_LOGS]: { shortbow: 65, longbow: 70 },
    [ID_MAGIC_LOGS]: { shortbow: 80, longbow: 85 }
};

/** Loc type ids from `skill_woodcutting` tree tables / `loc.pack`. */
const TREE_LOC_IDS: Record<TreeKind, readonly number[]> = {
    normal: [
        1276, 1277, 1278, 1279, 1280, // tree, lighttree, tree2, tree3, lighttree2
        1282, 1283, 1284, 1285, 1286, 1289, 1290, 1291, // dead / snowy variants in normal table
        1315, 1316, 1318, 1319, 1330, 1331, 1332, 1365
    ],
    oak: [1281],
    willow: [1308],
    maple: [1307],
    yew: [1309],
    magic: [1306]
};

type WoodSpot = {
    label: string;
    treeKind: TreeKind;
    anchor: [number, number];
    anchorMaxDist?: number;
    walkNodeId: WalkNodeId;
    bankNodeId: WalkNodeId;
};

function createField(container: HTMLElement, label: string, input: HTMLElement, hint?: string) {
    const field = document.createElement('div');
    field.className = 'bot-field';

    const labelElem = document.createElement('label');
    labelElem.className = 'bot-label';
    labelElem.textContent = label;
    field.appendChild(labelElem);

    field.appendChild(input);

    if (hint) {
        const hintElem = document.createElement('small');
        hintElem.className = 'bot-hint';
        hintElem.textContent = hint;
        field.appendChild(hintElem);
    }

    container.appendChild(field);
    return field;
}

function getSelectNumber(id: string, fallback: number): number {
    const raw = (document.getElementById(id) as HTMLSelectElement | null)?.value ?? '';
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getChecked(id: string): boolean {
    return (document.getElementById(id) as HTMLInputElement | null)?.checked ?? false;
}

function getOptionalNonNegativeNumber(id: string): number | null {
    const raw = (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
    if (raw === '') {
        return null;
    }
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function logGameInteraction(api: Bot['api'], action: string, detail: Record<string, unknown> = {}): void {
    const player = api.surface.localPlayer;
    api.bot.log('INFO', 'AutoWoodcutter.gameInteraction', action, {
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

function hasAnyAxe(api: Bot['api']): boolean {
    for (let i = 0; i < AXE_IDS.length; i++) {
        const axeId = AXE_IDS[i]!;
        if (api.inventory.hasItem(axeId) || api.equipment.hasItem(axeId)) {
            return true;
        }
    }
    return false;
}

function hasAnyFletchLog(api: Bot['api']): boolean {
    for (let i = 0; i < ALL_LOG_IDS.length; i++) {
        if (api.inventory.hasItem(ALL_LOG_IDS[i]!)) {
            return true;
        }
    }
    return false;
}

function hasFireAtTile(api: Bot['api'], tileX: number, tileZ: number): boolean {
    const fires = api.worldObject.getById([ID_FIRE_LOC]);
    for (let i = 0; i < fires.length; i++) {
        const fire = fires[i]!;
        if (fire.x === tileX && fire.z === tileZ) {
            return true;
        }
    }
    return false;
}

function isStandingOnFire(api: Bot['api']): boolean {
    const px = api.player.getLocalX();
    const pz = api.player.getLocalZ();
    if (px < 0 || pz < 0) {
        return false;
    }
    return hasFireAtTile(api, px, pz);
}

function isFiremakingComplete(api: Bot['api'], fireTileX: number, fireTileZ: number): boolean {
    if (fireTileX >= 0 && fireTileZ >= 0 && hasFireAtTile(api, fireTileX, fireTileZ)) {
        return true;
    }
    return isStandingOnFire(api);
}

const BURN_FIRE_WAIT_MS = 16000;

const TREE_PATHFIND_MAX_STEPS = 100;
const WOODCUTTING_ACTIVITY_GRACE_MS = 400;
const LOG_DROP_SPACING_MS = 100;
const LOG_DROP_COOLDOWN_MS = 2000;

function findChoppableTree(
    api: Bot['api'],
    treeKind: TreeKind,
    anchor: [number, number] | null,
    anchorMaxDist: number | null
): WorldObjectEntity | null {
    const candidates = api.worldObject.getById([...TREE_LOC_IDS[treeKind]]);
    let best: WorldObjectEntity | null = null;
    let bestSteps = Number.POSITIVE_INFINITY;
    const baseX = api.surface.sceneBaseTileX;
    const baseZ = api.surface.sceneBaseTileZ;
    for (let i = 0; i < candidates.length; i++) {
        const wo = candidates[i]!;
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

function fletchFlagsForAction(action: LogAction): { cutShafts: boolean; cutShortbow: boolean; cutLongbow: boolean } {
    return {
        cutShafts: action === 'shafts',
        cutShortbow: action === 'shortbow',
        cutLongbow: action === 'longbow'
    };
}

function wantsFletchOnLog(logId: number, cutShafts: boolean, cutShortbow: boolean, cutLongbow: boolean): boolean {
    if (logId === ID_LOGS) {
        return cutShafts || cutShortbow || cutLongbow;
    }
    const table = FLETCH_LEVEL_FOR_LOG[logId];
    if (!table) {
        return false;
    }
    return (cutShortbow && table.shortbow !== undefined) || (cutLongbow && table.longbow !== undefined);
}

function fletchLevelRequired(logId: number, product: FletchProduct): number | null {
    return FLETCH_LEVEL_FOR_LOG[logId]?.[product] ?? null;
}

function canFletchLog(api: Bot['api'], logId: number, action: LogAction): boolean {
    const level = api.player.getLevel(STAT_FLETCHING);
    if (action === 'shafts') {
        const req = fletchLevelRequired(logId, 'shafts');
        return req !== null && level >= req;
    }
    if (action === 'shortbow') {
        const req = fletchLevelRequired(logId, 'shortbow');
        return req !== null && level >= req;
    }
    if (action === 'longbow') {
        const req = fletchLevelRequired(logId, 'longbow');
        return req !== null && level >= req;
    }
    return false;
}

function canBurnLog(api: Bot['api'], logId: number): boolean {
    const req = FM_LEVEL_FOR_LOG[logId];
    return req !== undefined && api.player.getLevel(STAT_FIREMAKING) >= req;
}

function pickBurnableLogId(api: Bot['api']): number | null {
    for (let i = 0; i < ALL_LOG_IDS.length; i++) {
        const logId = ALL_LOG_IDS[i]!;
        if (api.inventory.hasItem(logId) && canBurnLog(api, logId)) {
            return logId;
        }
    }
    return null;
}

function resolveEffectiveTreeKind(api: Bot['api'], requested: TreeKind): TreeKind {
    const wc = api.player.getLevel(STAT_WOODCUTTING);
    const startIdx = TREE_KINDS_HIGH_TO_LOW.indexOf(requested);
    for (let i = Math.max(0, startIdx); i < TREE_KINDS_HIGH_TO_LOW.length; i++) {
        const kind = TREE_KINDS_HIGH_TO_LOW[i]!;
        if (wc >= WC_LEVEL_FOR_TREE[kind]) {
            return kind;
        }
    }
    return 'normal';
}

function fallbackLogAction(bankEnabled: boolean): LogAction {
    return bankEnabled ? 'none' : 'drop';
}

function resolveEffectiveLogAction(
    api: Bot['api'],
    action: LogAction,
    treeKind: TreeKind,
    bankEnabled: boolean
): LogAction {
    if (action === 'none' || action === 'drop') {
        return action;
    }

    const fl = api.player.getLevel(STAT_FLETCHING);

    if (action === 'burn') {
        if (canBurnLog(api, logIdForTreeKind(treeKind))) {
            return 'burn';
        }
        if (pickBurnableLogId(api) !== null) {
            return 'burn';
        }
        return fallbackLogAction(bankEnabled);
    }

    if (action === 'shafts') {
        if (fl >= (fletchLevelRequired(ID_LOGS, 'shafts') ?? 99)) {
            return 'shafts';
        }
        return fallbackLogAction(bankEnabled);
    }

    const logId = logIdForTreeKind(treeKind);

    if (action === 'shortbow') {
        const req = fletchLevelRequired(logId, 'shortbow');
        if (req !== null && fl >= req) {
            return 'shortbow';
        }
        return fallbackLogAction(bankEnabled);
    }

    if (action === 'longbow') {
        const longReq = fletchLevelRequired(logId, 'longbow');
        const shortReq = fletchLevelRequired(logId, 'shortbow');
        if (longReq !== null && fl >= longReq) {
            return 'longbow';
        }
        if (shortReq !== null && fl >= shortReq) {
            return 'shortbow';
        }
        return fallbackLogAction(bankEnabled);
    }

    return action;
}

function parseLogAction(raw: string): LogAction {
    if (raw === 'none' || raw === 'drop' || raw === 'burn' || raw === 'shafts' || raw === 'shortbow' || raw === 'longbow') {
        return raw;
    }
    return 'none';
}

function defaultLogActionForBanking(banking: boolean): LogAction {
    return banking ? 'none' : 'drop';
}

function sanitizeLogAction(action: LogAction, banking: boolean): LogAction {
    const opt = AutoWoodcutter.logActionOptions.find(o => o.value === action);
    if (banking) {
        if (action === 'drop' || action === 'burn' || opt?.requiresNoBank) {
            return 'none';
        }
        return action;
    }
    if (action === 'none' || opt?.requiresBank) {
        return 'drop';
    }
    return action;
}

function dropOneUnstrungBow(api: Bot['api']): boolean {
    for (let i = 0; i < UNSTRUNG_BOW_IDS.length; i++) {
        const item = api.inventory.getItemById(UNSTRUNG_BOW_IDS[i]!);
        if (item) {
            logGameInteraction(api, 'drop unstrung bow', {
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

function isLogId(id: number): boolean {
    return ALL_LOG_IDS.includes(id as (typeof ALL_LOG_IDS)[number]);
}

function collectLogDropSlots(api: Bot['api']): number[] {
    const slots: number[] = [];
    const size = api.inventory.getContainerSize();
    for (let slot = 0; slot < size; slot++) {
        const item = api.inventory.getItemBySlot(slot);
        if (item && isLogId(item.id)) {
            slots.push(slot);
        }
    }
    return slots;
}

function logIdForTreeKind(kind: TreeKind): number {
    return LOG_ID_BY_TREE_KIND[kind];
}

export default class AutoWoodcutter extends BotScript {
    timer: Timer;

    spot: WoodSpot | null;
    treeKind: TreeKind;
    bankEnabled: boolean;
    logAction: LogAction;
    maxRadius: number | null;

    private knifeUseStep: 'idle' | 'need_use_on_log' = 'idle';
    private tinderUseStep: 'idle' | 'need_use_on_log' | 'awaiting_fire' = 'idle';
    private pendingDialogCom: number | null = null;
    private pendingBurnLogId: number | null = null;
    private burnFireTileX = -1;
    private burnFireTileZ = -1;
    private burnWaitStartedAt = 0;
    private fletchDialogAt = 0;
    private levelFallbackKey = '';
    private startPosition: [number, number] | null = null;
    private lastWoodcutActivityAt = 0;
    private pendingLogDropSlots: number[] = [];

    static spots: WoodSpot[] = [
        {
            label: 'Draynor tree',
            treeKind: 'normal',
            anchor: [3088, 3235],
            walkNodeId: 'wc_draynor_tree',
            bankNodeId: 'bank_draynor'
        },
        {
            label: 'Draynor oak',
            treeKind: 'oak',
            anchor: [3083, 3250],
            walkNodeId: 'wc_draynor_oak',
            bankNodeId: 'bank_draynor'
        },
        {
            label: 'Draynor willow',
            treeKind: 'willow',
            anchor: [3084, 3230],
            walkNodeId: 'wc_draynor_willow',
            bankNodeId: 'bank_draynor'
        },
        {
            label: 'Varrock east tree',
            treeKind: 'normal',
            anchor: [3289, 3428],
            walkNodeId: 'wc_varrock_east_tree',
            bankNodeId: 'bank_varrock_east'
        },
        {
            label: 'Varrock east oak',
            treeKind: 'oak',
            anchor: [3275, 3426],
            walkNodeId: 'wc_varrock_east_oak',
            bankNodeId: 'bank_varrock_east'
        },
        {
            label: 'Varrock north yew',
            treeKind: 'yew',
            anchor: [3205, 3502],
            walkNodeId: 'wc_varrock_north_yew',
            bankNodeId: 'bank_varrock_west'
        },
        {
            label: 'Falador south yew',
            treeKind: 'yew',
            anchor: [2997, 3312],
            walkNodeId: 'wc_falador_south_yew',
            bankNodeId: 'bank_falador_east'
        },
        {
            label: 'Catherby oak',
            treeKind: 'oak',
            anchor: [2788, 3440],
            walkNodeId: 'wc_catherby_oak',
            bankNodeId: 'bank_catherby'
        },
        {
            label: 'Catherby willow',
            treeKind: 'willow',
            anchor: [2783, 3428],
            walkNodeId: 'wc_catherby_willow',
            bankNodeId: 'bank_catherby'
        },
        {
            label: 'Catherby yew',
            treeKind: 'yew',
            anchor: [2760, 3434],
            walkNodeId: 'wc_catherby_yew',
            bankNodeId: 'bank_catherby'
        },
        {
            label: 'Seers maple',
            treeKind: 'maple',
            anchor: [2720, 3475],
            walkNodeId: 'wc_seers_maple',
            bankNodeId: 'bank_seers'
        },
        {
            label: 'Seers willow',
            treeKind: 'willow',
            anchor: [2710, 3504],
            walkNodeId: 'wc_seers_willow',
            bankNodeId: 'bank_seers'
        },
        {
            label: 'Seers yew',
            treeKind: 'yew',
            anchor: [2707, 3465],
            walkNodeId: 'wc_seers_yew',
            bankNodeId: 'bank_seers'
        },
        {
            label: 'Edgeville yew',
            treeKind: 'yew',
            anchor: [3221, 3504],
            walkNodeId: 'wc_edgeville_yew',
            bankNodeId: 'bank_edgeville'
        },
        {
            label: 'Seers magic',
            treeKind: 'magic',
            anchor: [2705, 3396],
            walkNodeId: 'wc_seers_magic',
            bankNodeId: 'bank_seers'
        },
        {
            label: 'Seers magic north',
            treeKind: 'magic',
            anchor: [2692, 3425],
            anchorMaxDist: 12,
            walkNodeId: 'wc_seers_magic_north',
            bankNodeId: 'bank_seers'
        },
        {
            label: 'Gnome Stronghold magic west',
            treeKind: 'magic',
            anchor: [2371, 3426],
            anchorMaxDist: 10,
            walkNodeId: 'wc_gnome_magic_west',
            bankNodeId: 'bank_gnome_stronghold'
        },
        {
            label: 'Gnome Stronghold magic central',
            treeKind: 'magic',
            anchor: [2432, 3410],
            anchorMaxDist: 10,
            walkNodeId: 'wc_gnome_magic_central',
            bankNodeId: 'bank_gnome_stronghold'
        },
        {
            label: 'Gnome Stronghold magic east',
            treeKind: 'magic',
            anchor: [2490, 3414],
            anchorMaxDist: 10,
            walkNodeId: 'wc_gnome_magic_east',
            bankNodeId: 'bank_gnome_stronghold'
        }
    ];

    static treeKindOptions: { label: string; kind: TreeKind }[] = [
        { label: 'Tree (normal logs)', kind: 'normal' },
        { label: 'Oak', kind: 'oak' },
        { label: 'Willow', kind: 'willow' },
        { label: 'Maple', kind: 'maple' },
        { label: 'Yew', kind: 'yew' },
        { label: 'Magic', kind: 'magic' }
    ];

    static logActionOptions: { value: LogAction; label: string; hint: string; requiresBank?: boolean; requiresNoBank?: boolean }[] = [
        {
            value: 'none',
            label: 'None (chop only)',
            hint: 'Only woodcut; the bank stores logs and products.',
            requiresBank: true
        },
        {
            value: 'drop',
            label: 'Drop logs',
            hint: 'Drops logs when inventory is full (no banking). Prefers logs matching the selected tree type.',
            requiresNoBank: true
        },
        {
            value: 'burn',
            label: 'Burn logs',
            hint: 'Uses a tinderbox on logs matching the selected tree type (no banking).',
            requiresNoBank: true
        },
        {
            value: 'shafts',
            label: 'Arrow shafts',
            hint: 'Knife on normal logs (members fletching dialog). Withdraws a knife from the bank when banking.'
        },
        {
            value: 'shortbow',
            label: 'Shortbows (unstrung)',
            hint: 'Knife fletching dialog for your log type. Withdraws a knife from the bank when banking.'
        },
        {
            value: 'longbow',
            label: 'Longbows (unstrung)',
            hint: 'Knife fletching dialog for your log type. Withdraws a knife from the bank when banking.'
        }
    ];

    static keepWhenBanking: readonly number[] = [ID_KNIFE, ID_TINDERBOX, ...AXE_IDS];

    constructor(
        spotIndex = 0,
        bankEnabled = false,
        treeKindIndex = 0,
        logAction: LogAction = 'none',
        maxRadius: number | null = null
    ) {
        super('AutoWoodcutter', false, { author: 'j', version: '1.0.0' });
        this.timer = new Timer();
        this.bankEnabled = bankEnabled;
        this.logAction = logAction;
        this.maxRadius = bankEnabled ? null : maxRadius;

        if (bankEnabled) {
            const i = Math.max(0, Math.min(spotIndex, AutoWoodcutter.spots.length - 1));
            this.spot = AutoWoodcutter.spots[i]!;
            this.treeKind = this.spot.treeKind;
        } else {
            this.spot = null;
            const ki = Math.max(0, Math.min(treeKindIndex, AutoWoodcutter.treeKindOptions.length - 1));
            this.treeKind = AutoWoodcutter.treeKindOptions[ki]!.kind;
        }

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT);
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN);
        this.timer.defineTimer('TIMER_KNIFE_USE', TIMER_KNIFE_USE);
        this.timer.defineTimer('TIMER_TINDER_USE', TIMER_TINDER_USE);
    }

    static override htmlSetup(base: HTMLElement) {
        const desc = document.createElement('p');
        desc.className = 'bot-description';
        desc.textContent =
            'Woodcuts trees near you or at a preset spot. Choose what to do with logs: chop only, burn, or fletch. Banking deposits products and can withdraw tools.';
        base.appendChild(desc);

        const elemBank = document.createElement('input');
        elemBank.id = 'awcBank';
        elemBank.type = 'checkbox';
        elemBank.className = 'bot-checkbox';

        const elemLogAction = document.createElement('select');
        elemLogAction.id = 'awcLogAction';

        const elemLocation = document.createElement('select');
        elemLocation.id = 'awcSpot';

        AutoWoodcutter.spots.forEach((s, idx) => {
            const option = document.createElement('option');
            option.value = String(idx);
            option.textContent = s.label;
            elemLocation.appendChild(option);
        });

        const elemTreeKind = document.createElement('select');
        elemTreeKind.id = 'awcTreeKind';

        AutoWoodcutter.treeKindOptions.forEach((opt, idx) => {
            const option = document.createElement('option');
            option.value = String(idx);
            option.textContent = opt.label;
            elemTreeKind.appendChild(option);
        });

        const elemMaxRadius = document.createElement('input');
        elemMaxRadius.id = 'awcMaxRadius';
        elemMaxRadius.type = 'number';
        elemMaxRadius.min = '0';
        elemMaxRadius.step = '1';
        elemMaxRadius.placeholder = 'No limit';
        elemMaxRadius.className = 'bot-input';

        createField(base, 'Bank logs / bows', elemBank, 'Walks to the bank, deposits, and returns to the grove.');

        const fieldSpot = createField(
            base,
            'Tree area (when banking)',
            elemLocation,
            'Preset grove and bank route. Withdraws a bronze hatchet from the bank if you have none.'
        );
        const fieldTreeKind = createField(
            base,
            'Tree type (no banking)',
            elemTreeKind,
            'Chops the nearest tree of this type wherever you are.'
        );
        const fieldMaxRadius = createField(
            base,
            'Max radius (no banking)',
            elemMaxRadius,
            'Optional distance in tiles from where the script starts. Leave blank for no limit.'
        );

        const logActionHint = document.createElement('small');
        logActionHint.className = 'bot-hint';
        logActionHint.id = 'awcLogActionHint';

        const fieldLogAction = createField(base, 'Log processing', elemLogAction);
        fieldLogAction.appendChild(logActionHint);

        let bankModeWasEnabled = elemBank.checked;
        let logActionUiInitialized = false;

        const populateLogActionOptions = (banking: boolean, resetDefault: boolean) => {
            const prev = parseLogAction(elemLogAction.value);
            elemLogAction.replaceChildren();
            for (let i = 0; i < AutoWoodcutter.logActionOptions.length; i++) {
                const opt = AutoWoodcutter.logActionOptions[i]!;
                if (banking && opt.requiresNoBank) {
                    continue;
                }
                if (!banking && opt.requiresBank) {
                    continue;
                }
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                elemLogAction.appendChild(option);
            }
            const next = resetDefault ? defaultLogActionForBanking(banking) : sanitizeLogAction(prev, banking);
            elemLogAction.value = next;
            const selected = AutoWoodcutter.logActionOptions.find(o => o.value === elemLogAction.value);
            logActionHint.textContent = selected?.hint ?? '';
        };

        elemLogAction.addEventListener('change', () => {
            const selected = AutoWoodcutter.logActionOptions.find(o => o.value === elemLogAction.value);
            logActionHint.textContent = selected?.hint ?? '';
        });

        const syncBankMode = () => {
            const bank = elemBank.checked;
            const bankToggled = bank !== bankModeWasEnabled;
            fieldSpot.style.display = bank ? '' : 'none';
            fieldTreeKind.style.display = bank ? 'none' : '';
            fieldMaxRadius.style.display = bank ? 'none' : '';
            populateLogActionOptions(bank, !logActionUiInitialized || bankToggled);
            logActionUiInitialized = true;
            bankModeWasEnabled = bank;
        };
        elemBank.addEventListener('change', syncBankMode);
        syncBankMode();
    }

    static override buildFromHtml(_base: HTMLElement) {
        const spot = getSelectNumber('awcSpot', 0);
        const bank = getChecked('awcBank');
        const treeKind = getSelectNumber('awcTreeKind', 0);
        const maxRadius = bank ? null : getOptionalNonNegativeNumber('awcMaxRadius');
        const logActionRaw = (document.getElementById('awcLogAction') as HTMLSelectElement | null)?.value ?? 'none';
        const logAction = sanitizeLogAction(parseLogAction(logActionRaw), bank);
        return new AutoWoodcutter(spot, bank, treeKind, logAction, maxRadius);
    }

    private logLevelFallback(
        api: Bot['api'],
        requestedTree: TreeKind,
        effectiveTree: TreeKind,
        requestedAction: LogAction,
        effectiveAction: LogAction
    ): void {
        const key = `${requestedTree}>${effectiveTree}|${requestedAction}>${effectiveAction}`;
        if (key === this.levelFallbackKey) {
            return;
        }
        this.levelFallbackKey = key;
        if (requestedTree === effectiveTree && requestedAction === effectiveAction) {
            return;
        }
        api.bot.log('INFO', 'AutoWoodcutter.update', 'level fallback', {
            requestedTree,
            effectiveTree,
            requestedAction,
            effectiveAction,
            woodcutting: api.player.getLevel(STAT_WOODCUTTING),
            fletching: api.player.getLevel(STAT_FLETCHING),
            firemaking: api.player.getLevel(STAT_FIREMAKING)
        });
    }

    private getNoBankRadiusAnchor(api: Bot['api']): [number, number] | null {
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

    private refreshWoodcutActivity(api: Bot['api']): void {
        if (api.player.isAnimating()) {
            this.lastWoodcutActivityAt = Date.now();
        }
    }

    private hasRecentWoodcutActivity(api: Bot['api']): boolean {
        this.refreshWoodcutActivity(api);
        return this.lastWoodcutActivityAt > 0 && Date.now() - this.lastWoodcutActivityAt <= WOODCUTTING_ACTIVITY_GRACE_MS;
    }

    private beginLogDropSequence(api: Bot['api']): boolean {
        this.pendingLogDropSlots = collectLogDropSlots(api);
        if (this.pendingLogDropSlots.length === 0) {
            return false;
        }

        api.bot.log('INFO', 'AutoWoodcutter.dropLogs', 'start log drop sequence', {
            slots: this.pendingLogDropSlots
        });
        return this.dropNextQueuedLog(api);
    }

    private dropNextQueuedLog(api: Bot['api']): boolean {
        while (this.pendingLogDropSlots.length > 0) {
            const slot = this.pendingLogDropSlots.shift()!;
            const item = api.inventory.getItemBySlot(slot);
            if (!item || !isLogId(item.id)) {
                continue;
            }

            logGameInteraction(api, 'drop queued log', {
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
        api.bot.log('INFO', 'AutoWoodcutter.dropLogs', 'finished log drop sequence', {});
        return true;
    }

    private beginKnifeFletch(api: Bot['api'], logId: number, logAction: LogAction): boolean {
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
        this.knifeUseStep = 'need_use_on_log';
        logGameInteraction(api, 'start knife use', {
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

    private beginBurnLog(api: Bot['api'], logId: number): boolean {
        if (isStandingOnFire(api) || !canBurnLog(api, logId)) {
            return false;
        }
        const tinder = api.inventory.getItemById(ID_TINDERBOX);
        const log = api.inventory.getItemById(logId);
        if (!tinder || !log) {
            return false;
        }
        this.pendingBurnLogId = logId;
        this.tinderUseStep = 'need_use_on_log';
        logGameInteraction(api, 'start tinderbox use', {
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

    override async update(bot: Bot) {
        const api = bot.api;
        this.refreshWoodcutActivity(api);

        if (this.fletchDialogAt > 0 && Date.now() >= this.fletchDialogAt) {
            const com = this.pendingDialogCom;
            this.fletchDialogAt = 0;
            this.pendingDialogCom = null;
            if (com !== null) {
                logGameInteraction(api, 'choose fletching dialog option', { com });
                api.interface.clickComponent(com);
            }
            this.timer.setTimer(TIMER_GAME_INTERACT, 2200);
            return;
        }

        if (this.tinderUseStep === 'awaiting_fire') {
            if (isFiremakingComplete(api, this.burnFireTileX, this.burnFireTileZ)) {
                this.tinderUseStep = 'idle';
                this.pendingBurnLogId = null;
                this.burnFireTileX = -1;
                this.burnFireTileZ = -1;
                this.burnWaitStartedAt = 0;
                this.timer.setTimer(TIMER_GAME_INTERACT, 800);
                return;
            }
            if (this.burnWaitStartedAt > 0 && Date.now() - this.burnWaitStartedAt > BURN_FIRE_WAIT_MS) {
                api.bot.log('WARN', 'AutoWoodcutter.update', 'firemaking timed out waiting for fire', {});
                this.tinderUseStep = 'idle';
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

        if (this.knifeUseStep === 'need_use_on_log' && !this.timer.hasTimer(TIMER_KNIFE_USE)) {
            let log = null;
            for (let i = 0; i < ALL_LOG_IDS.length; i++) {
                log = api.inventory.getItemById(ALL_LOG_IDS[i]!);
                if (log) {
                    break;
                }
            }
            const knife = api.inventory.getItemById(ID_KNIFE);
            if (knife && log) {
                logGameInteraction(api, 'use knife on log', {
                    logId: log.id,
                    logSlot: log.slot,
                    interfaceId: log.interfaceId
                });
                knife.useOnItem(log);
            }
            this.knifeUseStep = 'idle';
            if (this.pendingDialogCom !== null) {
                this.fletchDialogAt = Date.now() + 450;
            }
            this.timer.setTimer(TIMER_GAME_INTERACT, 3600);
            return;
        }

        if (this.tinderUseStep === 'need_use_on_log' && !this.timer.hasTimer(TIMER_TINDER_USE)) {
            const log =
                this.pendingBurnLogId !== null ? api.inventory.getItemById(this.pendingBurnLogId) : null;
            const tinder = api.inventory.getItemById(ID_TINDERBOX);
            if (tinder && log) {
                this.burnFireTileX = api.player.getLocalX();
                this.burnFireTileZ = api.player.getLocalZ();
                logGameInteraction(api, 'use tinderbox on log', {
                    logId: log.id,
                    logSlot: log.slot,
                    interfaceId: log.interfaceId,
                    fireTileX: this.burnFireTileX,
                    fireTileZ: this.burnFireTileZ
                });
                tinder.useOnItem(log);
            }
            this.tinderUseStep = 'awaiting_fire';
            this.burnWaitStartedAt = Date.now();
            this.timer.setTimer(TIMER_GAME_INTERACT, 350);
            return;
        }

        if (!this.bankEnabled && !hasAnyAxe(api)) {
            api.bot.log('WARN', 'AutoWoodcutter.update', 'no hatchet in inventory', {});
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
        if (!this.bankEnabled && (effectiveLogAction === 'shortbow' || effectiveLogAction === 'longbow')) {
            if (dropOneUnstrungBow(api)) {
                this.timer.setTimer(TIMER_GAME_INTERACT, 600);
                return;
            }
        }

        for (let li = 0; li < ALL_LOG_IDS.length; li++) {
            const lid = ALL_LOG_IDS[li]!;
            if (
                !api.inventory.hasItem(lid) ||
                !wantsFletchOnLog(lid, fletch.cutShafts, fletch.cutShortbow, fletch.cutLongbow) ||
                !canFletchLog(api, lid, effectiveLogAction)
            ) {
                continue;
            }
            if (!api.inventory.hasItem(ID_KNIFE)) {
                break;
            }
            if (this.beginKnifeFletch(api, lid, effectiveLogAction)) {
                return;
            }
        }

        if (
            !this.bankEnabled &&
            effectiveLogAction === 'burn' &&
            api.inventory.hasItem(ID_TINDERBOX) &&
            !isStandingOnFire(api)
        ) {
            const burnLogId = pickBurnableLogId(api);
            if (burnLogId !== null && this.beginBurnLog(api, burnLogId)) {
                return;
            }
        }

        if (!this.bankEnabled && effectiveLogAction === 'drop' && api.inventory.isFull()) {
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
        const needBank =
            this.bankEnabled &&
            (api.inventory.isFull() ||
                !hasAnyAxe(api) ||
                needsKnifeForFletch ||
                (api.bank.isOpen() && hasItemsToDeposit));

        if (needBank && this.spot) {
            if (!api.bank.isOpen()) {
                this.timer.setTimer(TIMER_GAME_INTERACT, 1600);
                logGameInteraction(api, 'open bank', { bankNodeId: this.spot.bankNodeId });
                if (!api.bank.open()) {
                    logGameInteraction(api, 'walk to bank node', { bankNodeId: this.spot.bankNodeId });
                    await api.webWalk.walkToNode(this.spot.bankNodeId);
                }
                return;
            }

            if (hasItemsToDeposit) {
                logGameInteraction(api, 'deposit all except kept items', { keepWhenBanking });
                api.bank.depositAllExcept(keepWhenBanking);
                this.timer.setTimer(TIMER_GAME_INTERACT, 780);
                return;
            }

            this.timer.setTimer(TIMER_GAME_INTERACT, 600);
            if (!hasAnyAxe(api)) {
                logGameInteraction(api, 'withdraw bronze hatchet', { itemId: 1351, count: 1 });
                await api.bank.withdraw(1351, 1);
                return;
            }
            if (fletchEnabled && !api.inventory.hasItem(ID_KNIFE)) {
                logGameInteraction(api, 'withdraw knife', { itemId: ID_KNIFE, count: 1 });
                await api.bank.withdraw(ID_KNIFE, 1);
            }
            return;
        }

        if (this.hasRecentWoodcutActivity(api)) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 300);
            return;
        }

        this.timer.setTimer(TIMER_GAME_INTERACT, 2000);
        const anchor = this.bankEnabled && this.spot ? this.spot.anchor : this.getNoBankRadiusAnchor(api);
        const anchorMaxDist = this.bankEnabled && this.spot ? (this.spot.anchorMaxDist ?? 14) : this.maxRadius;
        const chopTreeKind = this.bankEnabled && this.spot ? this.spot.treeKind : effectiveTreeKind;
        const tree = findChoppableTree(api, chopTreeKind, anchor, anchorMaxDist);
        if (tree) {
            if (!this.timer.hasTimer(TIMER_ENABLE_RUN)) {
                logGameInteraction(api, 'enable run before tree click');
                api.player.enableRun();
                this.timer.setTimer(TIMER_ENABLE_RUN, ENABLE_RUN_CHECK_MS);
            }
            logGameInteraction(api, 'chop tree', {
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
        } else if (this.bankEnabled && this.spot && api.world.distanceTo(this.spot.anchor[0], this.spot.anchor[1]) > 8) {
            logGameInteraction(api, 'walk to woodcutting node', { walkNodeId: this.spot.walkNodeId });
            await api.webWalk.walkToNode(this.spot.walkNodeId);
        }
    }
}
