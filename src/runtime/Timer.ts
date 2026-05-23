export default class Timer {
  private static systemTimer: Timer | undefined;

  static TIMER_LOGIN_WAIT = 'TIMER_LOGIN_WAIT';
  static TIMER_SETUP_ACCOUNT_ON_LOGIN = 'TIMER_SETUP_ACCOUNT_ON_LOGIN';
  static TIMER_CREDENTIAL_WARN = 'TIMER_CREDENTIAL_WARN';

  timers: number[];
  timerNames: string[];

  constructor() {
    this.timers = [];
    this.timerNames = [];
  }

  static resetSystemTimerForTests(): void {
    Timer.systemTimer = undefined;
  }

  static SystemTimer() {
    if (this.systemTimer) {
      throw 'There should not be a system timer already. Do not create another.';
    }
    this.systemTimer = new Timer();

    this.systemTimer.defineTimer('TIMER_LOGIN_WAIT', 1);
    this.systemTimer.defineTimer('TIMER_SETUP_ACCOUNT_ON_LOGIN', 2);
    this.systemTimer.defineTimer('TIMER_CREDENTIAL_WARN', 3);

    return this.systemTimer;
  }

  defineTimer(name: string, id: number): void {
    if (this.timerNames[id]) {
      throw 'Timer already exists as ' + this.timerNames[id];
    }
    this.timerNames[id] = name;
  }

  isTimerDefined(id: number): string | undefined {
    return this.timerNames[id];
  }

  setTimer(id: number, ms: number): void {
    if (!this.isTimerDefined(id)) {
      throw 'Undefined timer ID ' + id;
    }
    this.timers[id] = Date.now() + ms;
  }

  hasTimer(id: number): boolean {
    if (!this.isTimerDefined(id)) {
      throw 'Undefined timer ID ' + id;
    }
    return (this.timers[id] || 0) > Date.now();
  }

  clearTimer(id: number): number {
    if (!this.isTimerDefined(id)) {
      throw 'Undefined timer ID ' + id;
    }
    return (this.timers[id] = 0);
  }
}
