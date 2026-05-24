import type { WorldObjectEntity } from '../runtime/types';
import type { Path } from '../runtime/types';
import Timer from '../runtime/Timer';
import type { Bot } from '../runtime/types';
import BotScript from '../runtime/BotScript';

const TIMER_GAME_INTERACT = 0;
const TIMER_ENABLE_RUN = 1;
const TIMER_SPIN_USE = 2;

/** `stat.constant` */
const STAT_CRAFTING = 11;
const CRAFTING_LEVEL_FLAX_SPIN = 10;

/** `loc.pack` */
const ID_FLAX_GROUND = 2646;
const ID_SPINNING_WHEEL = 2644;
/** Closed — `op1=Open` (`desertdoor_animate` 1531 is the open stage). */
const ID_DOOR_CLOSED = 1530;
const ID_LADDER_UP = 1747;
const ID_LADDER_DOWN = 1746;

/** `obj.pack` */
const ID_FLAX = 1779;
const ID_BOW_STRING = 1777;

const FLAX_PICK_OP = 1;
const DOOR_OPEN_OP = 0;
const LADDER_OP = 0;

const FLAX_PATHFIND_MAX_STEPS = 100;
const FLAX_ANCHOR_MAX_DIST = 18;
const WORLD_OBJECT_TILE_TOLERANCE = 4;
/** World-tile radius for area checks (flax field, spin house, bank). */
const NEAR_FLAX_FIELD_DIST = 22;
const NEAR_SPIN_HOUSE_DIST = 14;
const NEAR_SPIN_DOOR_DIST = 8;
const NEAR_BANK_DIST = 16;

/** Seers flax spinning house (user-provided / map-verified). */
const SEERS_SPIN_DOOR: [number, number] = [2715, 3472];
const SEERS_SPIN_LADDER: [number, number] = [2715, 3470];
const SEERS_SPIN_WHEEL: [number, number] = [2711, 3471];
const SEERS_BANK: [number, number] = [2727, 3493];

type FlaxSpot = {
    label: string;
    anchor: [number, number];
    pathToBank: Path;
    pathToSpinHouse: Path;
    /** Ground floor: leave house and walk to bank booths. */
    pathFromSpinHouseToBank: Path;
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
}

function getChecked(id: string): boolean {
    return (document.getElementById(id) as HTMLInputElement | null)?.checked ?? false;
}

function findPickableFlax(
    api: Bot['api'],
    anchor: [number, number],
    anchorMaxDist: number
): WorldObjectEntity | null {
    const candidates = api.worldObject.getNear(anchor[0], anchor[1], anchorMaxDist, [ID_FLAX_GROUND]);
    let best: WorldObjectEntity | null = null;
    let bestSteps = Number.POSITIVE_INFINITY;
    for (let i = 0; i < candidates.length; i++) {
        const wo = candidates[i]!;
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

export default class AutoFlaxPicker extends BotScript {
    timer: Timer;
    spot: FlaxSpot;
    spinEnabled: boolean;

    private spinUseStep: 'idle' | 'need_use_on_wheel' = 'idle';
    private pendingSpinWheel: WorldObjectEntity | null = null;
    private craftingLevelWarned = false;

    static spots: FlaxSpot[] = [
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
        super('AutoFlaxPicker', false, { author: 'j', version: '1.0.0' });
        this.timer = new Timer();
        this.spinEnabled = spinEnabled;
        const i = Math.max(0, Math.min(spotIndex, AutoFlaxPicker.spots.length - 1));
        this.spot = AutoFlaxPicker.spots[i]!;

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT);
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN);
        this.timer.defineTimer('TIMER_SPIN_USE', TIMER_SPIN_USE);
    }

    static override htmlSetup(base: HTMLElement) {
        const desc = document.createElement('p');
        desc.className = 'bot-description';
        desc.textContent =
            "Picks flax at the Seers' Village field and banks at Seers' Village bank. Optionally spins flax upstairs at the Seers spinning wheel (level 10 Crafting).";
        base.appendChild(desc);

        const elemSpin = document.createElement('input');
        elemSpin.id = 'afpSpin';
        elemSpin.type = 'checkbox';
        elemSpin.className = 'bot-checkbox';

        createField(
            base,
            'Spin flax (Seers wheel)',
            elemSpin,
            'Uses the upstairs spinning wheel in the house by the ladder (door 1530, ladder 1747). Requires level 10 Crafting.'
        );
    }

    static override buildFromHtml(_base: HTMLElement) {
        return new AutoFlaxPicker(0, getChecked('afpSpin'));
    }

    private canSpinFlax(api: Bot['api']): boolean {
        if (!this.spinEnabled) {
            return false;
        }
        if (api.player.getLevel(STAT_CRAFTING) < CRAFTING_LEVEL_FLAX_SPIN) {
            if (!this.craftingLevelWarned) {
                this.craftingLevelWarned = true;
                api.bot.log('WARN', 'AutoFlaxPicker.update', 'spin disabled — Crafting level too low', {
                    required: CRAFTING_LEVEL_FLAX_SPIN,
                    current: api.player.getLevel(STAT_CRAFTING)
                });
            }
            return false;
        }
        return true;
    }

    private isNearFlaxField(api: Bot['api']): boolean {
        return api.world.distanceTo(this.spot.anchor[0], this.spot.anchor[1]) < NEAR_FLAX_FIELD_DIST;
    }

    private isNearSpinHouse(api: Bot['api']): boolean {
        return api.world.distanceTo(SEERS_SPIN_DOOR[0], SEERS_SPIN_DOOR[1]) < NEAR_SPIN_HOUSE_DIST;
    }

    private isNearSpinDoor(api: Bot['api']): boolean {
        return api.world.distanceTo(SEERS_SPIN_DOOR[0], SEERS_SPIN_DOOR[1]) < NEAR_SPIN_DOOR_DIST;
    }

    private isNearBank(api: Bot['api']): boolean {
        return api.world.distanceTo(SEERS_BANK[0], SEERS_BANK[1]) < NEAR_BANK_DIST;
    }

    /** Ground floor — open the house door only when adjacent and it is still closed (1530). */
    private openSpinHouseDoorIfClosed(api: Bot['api']): boolean {
        if (!this.isNearSpinDoor(api)) {
            return false;
        }
        const closedDoor = api.worldObject.getNear(
            SEERS_SPIN_DOOR[0],
            SEERS_SPIN_DOOR[1],
            WORLD_OBJECT_TILE_TOLERANCE,
            [ID_DOOR_CLOSED]
        )[0] ?? null;
        if (!closedDoor) {
            return false;
        }
        this.timer.setTimer(TIMER_GAME_INTERACT, 900);
        closedDoor.interact(DOOR_OPEN_OP);
        return true;
    }

    private async exitSpinHouseToBank(api: Bot['api']): Promise<boolean> {
        if (this.openSpinHouseDoorIfClosed(api)) {
            return true;
        }

        if (!this.isNearBank(api) && this.canWalk(api) && !api.world.hasPath()) {
            await this.safeWalkPath(api, this.spot.pathFromSpinHouseToBank);
            return true;
        }

        return false;
    }

    private beginSpinFlax(api: Bot['api'], wheel: WorldObjectEntity): boolean {
        const flax = api.inventory.getItemById(ID_FLAX);
        if (!flax) {
            return false;
        }
        this.pendingSpinWheel = wheel;
        this.spinUseStep = 'need_use_on_wheel';
        flax.use();
        this.timer.setTimer(TIMER_SPIN_USE, 120);
        this.timer.setTimer(TIMER_GAME_INTERACT, 400);
        return true;
    }

    private async handleSpinHouse(api: Bot['api']): Promise<boolean> {
        const level = api.surface.currentLevel;

        if (level === 0 && !this.isNearSpinHouse(api)) {
            return false;
        }

        if (this.spinUseStep === 'need_use_on_wheel' && !this.timer.hasTimer(TIMER_SPIN_USE)) {
            const wheel = this.pendingSpinWheel;
            if (wheel) {
                const flax = api.inventory.getItemById(ID_FLAX);
                if (flax) {
                    wheel.useItem(flax);
                }
            }
            this.spinUseStep = 'idle';
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
                const wheel =
                    api.worldObject.getNear(SEERS_SPIN_WHEEL[0], SEERS_SPIN_WHEEL[1], WORLD_OBJECT_TILE_TOLERANCE, [ID_SPINNING_WHEEL])
                        .find((wo: WorldObjectEntity) => wo.isReachable(FLAX_PATHFIND_MAX_STEPS)) ??
                    api.worldObject.getNearestByIdPath([ID_SPINNING_WHEEL], FLAX_PATHFIND_MAX_STEPS);
                if (wheel) {
                    this.beginSpinFlax(api, wheel);
                }
                return true;
            }

            const ladderDown =
                api.worldObject.getNear(SEERS_SPIN_LADDER[0], SEERS_SPIN_LADDER[1], WORLD_OBJECT_TILE_TOLERANCE, [ID_LADDER_DOWN])
                    .find((wo: WorldObjectEntity) => wo.isReachable(FLAX_PATHFIND_MAX_STEPS)) ??
                api.worldObject.getNearestByIdPath([ID_LADDER_DOWN], FLAX_PATHFIND_MAX_STEPS);

            const ladderDist = api.world.distanceTo(SEERS_SPIN_LADDER[0], SEERS_SPIN_LADDER[1]);
            if (ladderDist > 2 && this.canWalk(api) && !api.world.hasPath()) {
                await this.safeWalkPath(api, [[SEERS_SPIN_LADDER[0], SEERS_SPIN_LADDER[1]]], false);
                return true;
            }

            if (ladderDown) {
                this.timer.setTimer(TIMER_GAME_INTERACT, 2400);
                ladderDown.interact(LADDER_OP);
                api.bot.log('INFO', 'AutoFlaxPicker.handleSpinHouse', 'climb down ladder', {
                    locId: ladderDown.id,
                    worldX: ladderDown.x + api.surface.sceneBaseTileX,
                    worldZ: ladderDown.z + api.surface.sceneBaseTileZ
                });
                return true;
            }

            api.bot.log('WARN', 'AutoFlaxPicker.handleSpinHouse', 'no climb-down ladder (1746) in scene', {
                level,
                ladderDist
            });
            this.timer.setTimer(TIMER_GAME_INTERACT, 1500);
            return true;
        }

        if (this.openSpinHouseDoorIfClosed(api)) {
            return true;
        }

        const ladderUp = api.worldObject.getNear(
            SEERS_SPIN_LADDER[0],
            SEERS_SPIN_LADDER[1],
            WORLD_OBJECT_TILE_TOLERANCE,
            [ID_LADDER_UP]
        )[0] ?? null;
        if (ladderUp && api.world.distanceTo(SEERS_SPIN_LADDER[0], SEERS_SPIN_LADDER[1]) <= 6) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 1600);
            ladderUp.interact(LADDER_OP);
            return true;
        }

        return false;
    }

    private canWalk(api: Bot['api']): boolean {
        return api.isLoggedIn() && api.player.getLocalX() >= 0 && api.player.getLocalZ() >= 0;
    }

    private async safeWalkPath(api: Bot['api'], path: Path, traverse = true): Promise<void> {
        if (!this.canWalk(api) || api.world.hasPath()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 800);
            return;
        }
        this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
        await api.world.walkPath(path, traverse);
    }

    private async walkTowardSpinHouse(api: Bot['api']): Promise<void> {
        await this.safeWalkPath(api, this.spot.pathToSpinHouse);
    }

    private async walkTowardFlaxField(api: Bot['api']): Promise<void> {
        await this.safeWalkPath(api, [[this.spot.anchor[0], this.spot.anchor[1]]], false);
    }

    private async walkTowardBank(api: Bot['api'], fromSpinHouse: boolean): Promise<void> {
        await this.safeWalkPath(api, fromSpinHouse ? this.spot.pathFromSpinHouseToBank : this.spot.pathToBank);
    }

    override async update(bot: Bot) {
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

        const needBank =
            !shouldSpinNow &&
            !shouldDescendSpinHouse &&
            !shouldWalkToSpinHouse &&
            (api.inventory.isFull() ||
                hasBowString ||
                (api.bank.isOpen() && api.bank.hasDepositableItems([])));

        const shouldExitSpinHouse =
            this.spinEnabled && api.surface.currentLevel === 0 && needBank && nearSpinHouse && !nearBank;

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
