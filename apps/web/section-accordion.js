// Header and content are sibling flex items, matching the reference accordion.
export class SectionAccordion {
  constructor(root, panels) {
    this.root = root;
    this.panels = panels;
    this.active = panels.find(panel => panel.classList.contains('is-active')) || null;
    this.select(this.active, { animate: false });
  }

  body(panel) { return panel.querySelector('.workflow-body'); }
  summary(panel) { return panel.querySelector('.workflow-header'); }

  async select(next, { animate = true } = {}) {
    this.active = next;
    this.root.classList.toggle('no-accordion-motion', !animate);
    for (const panel of this.panels) {
      const active = panel === next;
      const body = this.body(panel);
      if (!active && body.contains(document.activeElement)) this.summary(panel).focus({ preventScroll: true });
      body.inert = !active;
      this.summary(panel).setAttribute('aria-expanded', String(active));
      panel.classList.toggle('is-active', active);
    }
    if (!animate) requestAnimationFrame(() => this.root.classList.remove('no-accordion-motion'));
    return true;
  }

  focusHeader(event) {
    const index = this.panels.findIndex(panel => this.summary(panel) === event.currentTarget);
    const destinations = { ArrowDown: (index + 1) % this.panels.length, ArrowUp: (index + this.panels.length - 1) % this.panels.length, Home: 0, End: this.panels.length - 1 };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    this.summary(this.panels[destinations[event.key]]).focus();
  }

  disconnect() {}
}
