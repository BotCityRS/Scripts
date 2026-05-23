import type { BotAPI } from '../runtime/types';
import Timer from '../runtime/Timer';
import type { WalkNodeId } from '../runtime/types';
import type { Bot } from '../runtime/types';
import BotScript from '../runtime/BotScript';

const TIMER_GAME_INTERACT = 0;
const TIMER_ENABLE_RUN = 1;

type FishLocation = {
    label: string,
    itemReq: number,
    baitReq: number,
    walkNodeId: WalkNodeId,
    bankNodeId: WalkNodeId,
    poolIds: number[],
    /** Exact NPC op label from content (e.g. `Net`, `Bait`) — uses config slot, not context-menu order. */
    poolInteractOp: string,
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

function getSelectNumber(id: string, fallback: number): number {
    const raw = (document.getElementById(id) as HTMLSelectElement | null)?.value ?? '';
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export default class AutoFisher extends BotScript {
    timer: Timer;

    static locations: FishLocation[] = [{
        label: 'Draynor Small Net',
        itemReq: 303,
        baitReq: -1,
        walkNodeId: 'fish_draynor_net',
        bankNodeId: 'bank_draynor',
        poolIds: [327],
        poolInteractOp: 'Net',
    }, {
        label: 'Draynor Bait',
        itemReq: 307,
        baitReq: 313,
        walkNodeId: 'fish_draynor_bait',
        bankNodeId: 'bank_draynor',
        poolIds: [327],
        poolInteractOp: 'Bait',
    }, {
        label: 'Barbarian Fly',
        itemReq: 309,
        baitReq: 314,
        walkNodeId: 'fish_barbarian_fly',
        bankNodeId: 'bank_edgeville',
        poolIds: [328],
        poolInteractOp: 'Lure',
    }, {
        label: 'Barbarian Bait',
        itemReq: 307,
        baitReq: 313,
        walkNodeId: 'fish_barbarian_bait',
        bankNodeId: 'bank_edgeville',
        poolIds: [328],
        poolInteractOp: 'Bait',
    }, {
        label: 'Catherby Cage',
        itemReq: 301,
        baitReq: -1,
        walkNodeId: 'fish_catherby_cage',
        bankNodeId: 'bank_catherby',
        poolIds: [321],
        poolInteractOp: 'Cage',
    }, {
        label: 'Catherby Harpoon (Swordfish)',
        itemReq: 311,
        baitReq: -1,
        walkNodeId: 'fish_catherby_harpoon_sword',
        bankNodeId: 'bank_catherby',
        poolIds: [321],
        poolInteractOp: 'Harpoon',
    }, {
        label: 'Catherby Harpoon (Shark)',
        itemReq: 311,
        baitReq: -1,
        walkNodeId: 'fish_catherby_harpoon_shark',
        bankNodeId: 'bank_catherby',
        poolIds: [322],
        poolInteractOp: 'Harpoon',
    }, {
        label: 'Catherby Big Net',
        itemReq: 305,
        baitReq: -1,
        walkNodeId: 'fish_catherby_big_net',
        bankNodeId: 'bank_catherby',
        poolIds: [322],
        poolInteractOp: 'Net',
    }]
    location: FishLocation;

    constructor(locationId = 0) {
        super('AutoFisher', false)
        this.timer = new Timer();
        this.location = AutoFisher.locations[locationId];

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT)
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN)
    }

    static htmlSetup(base: HTMLElement) {
        const desc = document.createElement('p');
        desc.className = 'bot-description';
        desc.textContent = 'Automates fishing and banking for the selected location and method.';
        base.appendChild(desc);

        const elemLocation = document.createElement('select')
        elemLocation.id = 'elemLocation'

        AutoFisher.locations.forEach((loc, i) => {
            const option = document.createElement('option');
            option.value = String(i);
            option.textContent = loc.label;
            elemLocation.appendChild(option);
        });

        createField(base, 'Fishing location', elemLocation, 'Choose a preset with tool, bait, and bank route.');
    }

    static buildFromHtml(_base: HTMLElement) {
        const elemLocation = getSelectNumber('elemLocation', 0);
        const clampedLocation = Math.max(0, Math.min(elemLocation, AutoFisher.locations.length - 1));

        return new AutoFisher(clampedLocation)
    }

    override async update(bot: Bot) {
        const api = bot.api;
        if (api.webWalk.isWalking()) {
            return;
        }
        if (this.timer.hasTimer(TIMER_GAME_INTERACT)) {
            return;
        }
        api.tryLogin(()=>{
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
        });
        if (!this.timer.hasTimer(TIMER_ENABLE_RUN)) {
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
        }
        if (api.player.isMoving()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 300);
            return;
        }

        const needBank =
            !api.inventory.hasItem(this.location.itemReq) ||
            (this.location.baitReq >= 0 && !api.inventory.hasItem(this.location.baitReq)) ||
            api.inventory.isFull();

        if (needBank) {
            if (!api.bank.isOpen()) {
                this.timer.setTimer(TIMER_GAME_INTERACT, 1600);
                if (!api.bank.open()) {
                    await api.webWalk.walkToNode(this.location.bankNodeId);
                }
                return;
            }

            const keepIds = [this.location.itemReq, ...(this.location.baitReq >= 0 ? [this.location.baitReq] : [])];
            if (api.bank.depositOneIfNotKept(keepIds)) {
                this.timer.setTimer(TIMER_GAME_INTERACT, 780);
                return;
            }

            this.timer.setTimer(TIMER_GAME_INTERACT, 600);
            if (!api.inventory.hasItem(this.location.itemReq)) {
                await api.bank.withdraw(this.location.itemReq);
                return;
            }
            if (this.location.baitReq >= 0 && !api.inventory.hasItemAmount(this.location.baitReq, 100)) {
                await api.bank.getItemById(this.location.baitReq)?.withdraw(1000);
            }
            return;
        }

        if (!api.player.isAnimating()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 2000);
            const nearestPool = api.npc.getNPCByIdsNearest(this.location.poolIds);
            if (nearestPool) {
                nearestPool.interactByOpEquals(this.location.poolInteractOp);
            } else if (api.webWalk.distanceToNode(this.location.walkNodeId) > 10) {
                await api.webWalk.walkToNode(this.location.walkNodeId);
            }
        }
    }
}
