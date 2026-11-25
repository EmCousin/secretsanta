// Presentation-only state for the native details panels. Draw logic stays in core.
export class SectionAccordion {
  constructor(root, panels) {
    this.root = root;
    this.panels = panels;
    this.active = panels.find(panel => panel.open) || null;
    this.animations = new Map();
    this.abort = new AbortController();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.mobile = matchMedia('(max-width: 650px)');
    for (const panel of panels) panel.removeAttribute('name');
    this.reduced.addEventListener('change', () => this.select(this.active, { animate: false }), { signal: this.abort.signal });
    this.select(this.active, { animate: false });
  }

  body(panel) { return panel.querySelector('.workflow-body'); }
  summary(panel) { return panel.querySelector(':scope > summary'); }

  settle(panel, opening) {
    const body = this.body(panel);
    panel.open = opening;
    body.classList.remove('is-transitioning');
    body.style.height = '';
    body.style.overflow = '';
  }

  async select(next, { animate = true } = {}) {
    animate = animate && !this.mobile.matches && !this.reduced.matches;
    const heights = animate ? new Map(this.panels.map(panel => [panel, panel.open ? this.body(panel).getBoundingClientRect().height : 0])) : null;
    this.active = next;
    for (const animation of this.animations.values()) animation.cancel();
    this.animations.clear();
    const visible = [];
    for (const panel of this.panels) {
      const opening = panel === next;
      const body = this.body(panel);
      this.summary(panel).setAttribute('aria-expanded', String(opening));
      panel.classList.toggle('is-active', opening);
      if (!opening && body.contains(document.activeElement)) this.summary(panel).focus({ preventScroll: true });
      body.inert = !opening;
      if (!animate) {
        this.settle(panel, opening);
        continue;
      }
      if (opening) panel.open = true;
      if (!panel.open) continue;
      body.classList.remove('is-transitioning');
      if (opening) body.style.height = '';
      visible.push({ panel, body, opening, from: heights.get(panel) });
    }

    // Read target geometry together, then write starting heights together. This
    // avoids forcing a fresh layout separately for each opening/closing panel.
    for (const item of visible) item.to = item.opening ? item.body.getBoundingClientRect().height : 0;
    const transitioning = [];
    for (const { panel, body, opening, from, to } of visible) {
      if (from === to) {
        this.settle(panel, opening);
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
    for (const { panel, body, opening } of transitioning) {
      const animation = body.getAnimations?.().find(item => item.transitionProperty === 'height');
      if (!animation) {
        this.settle(panel, opening);
        continue;
      }
      this.animations.set(panel, animation);
      pending.push(animation.finished.then(() => {
        if (this.animations.get(panel) !== animation) return;
        this.animations.delete(panel);
        this.settle(panel, opening);
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
    this.select(this.active, { animate: false });
  }
}
