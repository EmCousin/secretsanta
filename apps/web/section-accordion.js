// Presentation-only state for the native details panels. Draw logic stays in core.
export class SectionAccordion {
  constructor(root, panels) {
    this.root = root;
    this.panels = panels;
    this.active = panels.find(panel => panel.open) || null;
    this.animations = new Map();
    this.abort = new AbortController();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.contained = matchMedia('(min-width: 960px) and (min-height: 700px)');
    this.mobile = matchMedia('(max-width: 650px)');
    for (const panel of panels) panel.removeAttribute('name');
    for (const media of [this.reduced, this.contained]) {
      media.addEventListener('change', () => this.select(this.active, { animate: false }), { signal: this.abort.signal });
    }
    this.observer = new ResizeObserver(() => {
      if (!this.animations.size) this.layout();
    });
    this.observer.observe(root);
    this.select(this.active, { animate: false });
  }

  body(panel) { return panel.querySelector('.workflow-body'); }
  summary(panel) { return panel.querySelector(':scope > summary'); }

  height(panel) {
    if (!this.contained.matches) {
      return this.body(panel).getBoundingClientRect().height;
    }
    const actions = this.root.querySelector('.draw-action');
    const headers = this.panels.reduce((height, item) => height + this.summary(item).getBoundingClientRect().height, 0);
    const gap = parseFloat(getComputedStyle(this.root).rowGap) || 0;
    const actionHeight = actions.hidden ? 0 : actions.getBoundingClientRect().height;
    const gaps = gap * (this.panels.length - 1 + Number(!actions.hidden));
    return Math.max(0, Math.floor(this.root.clientHeight - headers - actionHeight - gaps));
  }

  layout() {
    if (!this.active || !this.active.open) return;
    this.body(this.active).style.height = this.contained.matches ? `${this.height(this.active)}px` : '';
  }

  async select(next, { animate = true } = {}) {
    // Isolate the cost of section motion on mobile without changing the
    // independent festive animations or desktop behavior.
    if (this.mobile.matches) animate = false;
    const heights = new Map(this.panels.map(panel => [panel, panel.open ? this.body(panel).getBoundingClientRect().height : 0]));
    this.active = next;
    for (const animation of this.animations.values()) animation.cancel();
    this.animations.clear();
    const visible = [];
    for (const panel of this.panels) {
      const opening = panel === next;
      const body = this.body(panel);
      this.summary(panel).setAttribute('aria-expanded', String(opening));
      panel.classList.toggle('is-active', opening);
      body.inert = !opening;
      if (!opening && body.contains(document.activeElement)) this.summary(panel).focus({ preventScroll: true });
      if (opening) panel.open = true;
      if (!panel.open) continue;
      body.classList.remove('is-transitioning');
      if (opening && !this.contained.matches) body.style.height = '';
      visible.push({ panel, body, opening, from: heights.get(panel) });
    }

    // Read target geometry together, then write starting heights together. This
    // avoids forcing a fresh layout separately for each opening/closing panel.
    for (const item of visible) item.to = item.opening ? this.height(item.panel) : 0;
    const transitioning = [];
    for (const { panel, body, opening, from, to } of visible) {
      if (!animate || this.reduced.matches || from === to) {
        panel.open = opening;
        body.style.height = opening && this.contained.matches ? `${to}px` : '';
        body.style.overflow = '';
        continue;
      }
      body.style.height = `${from}px`;
      body.style.overflow = 'hidden';
      transitioning.push({ panel, body, opening, to });
    }
    if (transitioning.length) void this.root.offsetHeight;
    for (const { body, to } of transitioning) {
      body.classList.add('is-transitioning');
      body.style.height = `${to}px`;
    }
    const pending = [];
    for (const { panel, body, opening, to } of transitioning) {
      const animation = body.getAnimations?.().find(item => item.transitionProperty === 'height');
      if (!animation) {
        panel.open = opening;
        body.classList.remove('is-transitioning');
        body.style.overflow = '';
        body.style.height = opening && this.contained.matches ? `${this.height(panel)}px` : '';
        continue;
      }
      this.animations.set(panel, animation);
      pending.push(animation.finished.then(() => {
        if (this.animations.get(panel) !== animation) return;
        this.animations.delete(panel);
        panel.open = opening;
        body.classList.remove('is-transitioning');
        body.style.overflow = '';
        body.style.height = opening && this.contained.matches ? `${this.height(panel)}px` : '';
      }).catch(() => { /* A newer selection or system preference replaces this animation. */ }));
    }
    await Promise.all(pending);
    return this.active === next;
  }

  focusHeader(event) {
    const index = this.panels.findIndex(panel => this.summary(panel) === event.currentTarget);
    const destinations = { ArrowDown: (index + 1) % this.panels.length, ArrowUp: (index + this.panels.length - 1) % this.panels.length, Home: 0, End: this.panels.length - 1 };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    this.summary(this.panels[destinations[event.key]]).focus();
  }

  disconnect() {
    this.abort.abort();
    this.observer.disconnect();
    this.select(this.active, { animate: false });
  }
}
