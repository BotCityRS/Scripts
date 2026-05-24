import Timer from '../runtime/Timer';
import { HUB_ROUTE_OPTIONS } from '../runtime/walk';
import type { WalkNodeId } from '../runtime/types';
import type { Bot } from '../runtime/types';
import BotScript from '../runtime/BotScript';

const TIMER_GAME_INTERACT = 0;
const TIMER_ENABLE_RUN = 1;
const TIMER_NOT_MOVING = 2;

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

function getChecked(id: string): boolean {
    return (document.getElementById(id) as HTMLInputElement | null)?.checked ?? false;
}

export default class AutoWalker extends BotScript {
    timer: Timer;
    fromNode: WalkNodeId;
    toNode: WalkNodeId;
    traverse: boolean;

    constructor(routeIndex = 0, traverse = true) {
        super('AutoWalker', false);
        this.timer = new Timer();
        const route = HUB_ROUTE_OPTIONS[routeIndex] ?? HUB_ROUTE_OPTIONS[0]!;
        this.fromNode = route.from;
        this.toNode = route.to;
        this.traverse = traverse;

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT);
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN);
        this.timer.defineTimer('TIMER_NOT_MOVING', TIMER_NOT_MOVING);
    }

    static htmlSetup(base: HTMLElement) {
        const desc = document.createElement('p');
        desc.className = 'bot-description';
        desc.textContent = 'Walks a hub route from the walk graph until arrival.';
        base.appendChild(desc);

        const elemLocation = document.createElement('select');
        elemLocation.id = 'elemLocation';

        const elemReverse = document.createElement('input');
        elemReverse.id = 'elemReverse';
        elemReverse.type = 'checkbox';
        elemReverse.className = 'bot-checkbox';

        HUB_ROUTE_OPTIONS.forEach((loc, i) => {
            const option = document.createElement('option');
            option.value = String(i);
            option.textContent = loc.label;
            elemLocation.appendChild(option);
        });

        createField(base, 'Route', elemLocation, 'Choose a route pair. Script stops after arrival.');
        createField(base, 'Walk route in reverse', elemReverse, 'If enabled, walks from destination back to start.');
    }

    static buildFromHtml(_base: HTMLElement) {
        const elemLocation = getSelectNumber('elemLocation', 0);
        const clampedLocation = Math.max(0, Math.min(elemLocation, HUB_ROUTE_OPTIONS.length - 1));
        const traverse = !getChecked('elemReverse');

        return new AutoWalker(clampedLocation, traverse);
    }

    override update(bot: Bot) {
        const api = bot.api;
        if (this.timer.hasTimer(TIMER_GAME_INTERACT)) {
            return;
        }
        api.tryLogin(() => {
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
        });
        if (api.player.isMoving()) {
            this.timer.setTimer(TIMER_NOT_MOVING, 1200);
        }
        if (!this.timer.hasTimer(TIMER_NOT_MOVING)) {
            const from = this.traverse ? this.fromNode : this.toNode;
            const to = this.traverse ? this.toNode : this.fromNode;
            const planned = api.webWalk.planRoute(from, to);
            if (!planned || planned.length === 0) {
                api.bot.log('WARN', 'AutoWalker', 'no planned route', { from, to });
                return;
            }
            void api.webWalk.walkPath(planned).then((result: boolean) => {
                if (result) {
                    api.bot.stop();
                }
            });
            this.timer.setTimer(TIMER_NOT_MOVING, 1200);
        }
    }

    override stop(bot: Bot) {
        bot.api.webWalk.stop();
    }
}
