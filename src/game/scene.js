import { Scene } from 'dopaminejs';
import { step } from './world.js';
import { drawWorld } from './draw.js';

const FIXED_DT = 1 / 60;
const MAX_STEPS = 5;

export class FlightScene extends Scene {
  constructor({ world, onEvents }) {
    super();
    this.world = world;
    this.onEvents = onEvents;
    this.dpr = 1;
    this._flap = false;
    this._paused = false;
    this._acc = 0;
    this._onFixed = (e) => this._fixed(e.dt);
  }

  get paused() {
    return this._paused;
  }

  setWorld(world) {
    this.world = world;
    this._flap = false;
    this._acc = 0;
  }

  flap() {
    this._flap = true;
  }

  pause() {
    this._paused = true;
  }

  resume() {
    this._paused = false;
  }

  onEnter() {
    this.kernel.events.on('fixed_update', this._onFixed);
  }

  onExit() {
    this.kernel.events.off('fixed_update', this._onFixed);
  }

  update(dt) {
    if (this._paused) return;
    this._acc = Math.min(this._acc + dt, FIXED_DT * MAX_STEPS);
  }

  _fixed(dt) {
    if (this._paused) return;
    this._acc = Math.max(0, this._acc - dt);
    const { world } = this;
    world.bird.prevY = world.bird.y;
    const events = step(world, dt, { flap: this._flap });
    this._flap = false;
    this.onEvents(events);
  }

  render(ctx) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawWorld(ctx, this.world, this._acc / FIXED_DT, performance.now() / 1000);
  }
}
