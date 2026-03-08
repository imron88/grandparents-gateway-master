/**
 * BehaviorCollector — tracks passive behavioral signals during a session.
 */
export class BehaviorCollector {
  constructor() {
    this.signals = {
      clickCount: 0,
      totalPressure: 0,
      scrollEvents: [],
      dwellTimes: [],
      keystrokeIntervals: [],
      tabSwitches: 0,
      sessionStart: Date.now(),
    };

    this._lastKeyTime = null;
    this._pageEnterTime = Date.now();
    this._handlers = {};
    this._active = false;

    // Anti-bot flags
    this.flags = {
      rapidFormFill: false,
      impossibleSpeed: false,
    };
  }

  start() {
    if (this._active) return;
    this._active = true;

    this._handlers.click = (e) => {
      this.signals.clickCount++;
      // Pressure (0-1 range simulation from pointer events if available)
      const pressure = e.pressure != null && e.pressure > 0 ? e.pressure : 0.5;
      this.signals.totalPressure += pressure;
    };

    this._handlers.scroll = () => {
      const now = Date.now();
      if (this.signals.scrollEvents.length > 0) {
        const lastTime = this.signals.scrollEvents[this.signals.scrollEvents.length - 1];
        const velocity = 1000 / (now - lastTime); // events per second
        if (velocity > 50) this.flags.impossibleSpeed = true; // too fast
      }
      this.signals.scrollEvents.push(now);
    };

    this._handlers.keydown = (e) => {
      const now = Date.now();
      if (this._lastKeyTime) {
        const interval = now - this._lastKeyTime;
        this.signals.keystrokeIntervals.push(interval);
        if (interval < 10) this.flags.impossibleSpeed = true; // physically impossible
      }
      this._lastKeyTime = now;
    };

    this._handlers.visibilityChange = () => {
      if (document.hidden) {
        this.signals.tabSwitches++;
        // Record dwell time
        this.signals.dwellTimes.push(Date.now() - this._pageEnterTime);
      } else {
        this._pageEnterTime = Date.now();
      }
    };

    document.addEventListener('click', this._handlers.click);
    document.addEventListener('scroll', this._handlers.scroll, { passive: true });
    document.addEventListener('keydown', this._handlers.keydown);
    document.addEventListener('visibilitychange', this._handlers.visibilityChange);
  }

  stop() {
    if (!this._active) return;
    this._active = false;

    document.removeEventListener('click', this._handlers.click);
    document.removeEventListener('scroll', this._handlers.scroll);
    document.removeEventListener('keydown', this._handlers.keydown);
    document.removeEventListener('visibilitychange', this._handlers.visibilityChange);
  }

  getSignals() {
    const { clickCount, totalPressure, scrollEvents, dwellTimes, keystrokeIntervals, tabSwitches, sessionStart } = this.signals;

    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    // Compute scroll velocity: total scroll events per minute
    const sessionMinutes = (Date.now() - sessionStart) / 60000 || 1;
    const avgScrollVelocity = scrollEvents.length / sessionMinutes;

    return {
      avgClickPressure: clickCount > 0 ? totalPressure / clickCount : 0.5,
      avgScrollVelocity,
      avgDwellTime: avg(dwellTimes),
      avgKeystrokeInterval: avg(keystrokeIntervals),
      sessionDuration: Date.now() - sessionStart,
      tabSwitches,
      flags: { ...this.flags },
    };
  }
}
