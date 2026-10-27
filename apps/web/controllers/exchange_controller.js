import { Controller } from '../vendor/stimulus.js';
import { SecretSantaDraw } from '../../../packages/core/draw.js';
import { Invitation } from '../../../packages/core/invitations.js';
import { validateParticipants, validateExchange, ValidationError } from '../../../packages/core/validation.js';
import { saveCopy, restoreCopy, deleteCopy } from '../storage.js';
import { i18n } from '../localization.js';

export default class extends Controller {
  static targets = ['controls', 'storageButton', 'form', 'setupHeading', 'people', 'addButton', 'personTemplate', 'ruleTemplate', 'rules', 'giver', 'recipient', 'name', 'budget', 'date', 'instructions', 'error', 'status', 'results', 'cards', 'cardTemplate', 'resultHeading', 'confirm'];

  connect() {
    this.exclusions = [];
    this.invitations = null;
    this.addPerson();
    this.addPerson();
    this.controlsTarget.disabled = false;
    this.storageButtonTargets.forEach(button => { button.disabled = false; });
    this.dispatch('ready');
  }

  addPerson(event, person) {
    if (this.peopleTarget.children.length >= 50) return this.fail('people.limit');
    const row = this.personTemplateTarget.content.firstElementChild.cloneNode(true);
    row.dataset.personId = person?.id ?? crypto.randomUUID();
    for (const field of ['name', 'hint']) {
      const input = row.querySelector(`[data-field="${field}"]`);
      input.id = `${row.dataset.personId}-${field}`;
      input.value = person?.[field] ?? '';
      row.querySelector(`[data-label="${field}"]`).htmlFor = input.id;
    }
    this.peopleTarget.append(row);
    this.updatePeople();
    if (event) row.querySelector('input').focus();
  }

  removePerson(event) {
    const row = event.currentTarget.closest('[data-person-id]');
    const neighbour = row.nextElementSibling || row.previousElementSibling;
    this.exclusions = this.exclusions.filter(rule => rule.giverId !== row.dataset.personId && rule.recipientId !== row.dataset.personId);
    row.remove();
    this.updatePeople();
    (neighbour?.querySelector('input') || this.addButtonTarget).focus();
  }

  nextPerson(event) {
    // Enter can confirm an IME composition; it must not add a row in that case.
    if (event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const input = event.currentTarget;
    if (!input.value.trim()) return;
    const next = input.closest('[data-person-id]').nextElementSibling;
    if (next) next.querySelector('[data-field="name"]').focus();
    else this.addPerson(event);
  }

  showInvalid(event) {
    // Native validation must be able to focus fields inside collapsed details.
    for (let parent = event.target.parentElement; parent && parent !== this.element; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
  }

  prepareDraw() {
    // Enter often leaves an unused last row. Discard only empty trailing rows
    // before native validation, never hints, exclusions, or the first two people.
    while (this.peopleTarget.children.length > 2) {
      const row = this.peopleTarget.lastElementChild;
      if (row.querySelector('[data-field="name"]').value.trim() || row.querySelector('[data-field="hint"]').value.trim()
        || this.exclusions.some(rule => rule.giverId === row.dataset.personId || rule.recipientId === row.dataset.personId)) break;
      row.remove();
    }
    this.updatePeople();
  }

  readPeople() {
    return [...this.peopleTarget.children].map(row => ({
      id: row.dataset.personId,
      name: row.querySelector('[data-field="name"]').value,
      hint: row.querySelector('[data-field="hint"]').value,
    }));
  }

  updatePeople() {
    const people = this.readPeople();
    for (const select of [this.giverTarget, this.recipientTarget]) {
      const previous = select.value;
      select.replaceChildren(new Option(i18n.t('form.choosePerson'), ''));
      for (const [i, person] of people.entries()) select.add(new Option(person.name.trim() || i18n.t('people.person', { number: i + 1 }), person.id));
      if (people.some(person => person.id === previous)) select.value = previous;
    }
    for (const [i, row] of [...this.peopleTarget.children].entries()) {
      row.querySelector('[data-person-number]').textContent = i18n.t('people.person', { number: i + 1 });
      row.querySelector('[data-remove]').setAttribute('aria-label', i18n.t('people.remove', { name: people[i].name.trim() || i18n.t('people.person', { number: i + 1 }) }));
    }
    this.renderRules();
  }

  addRule() {
    const giverId = this.giverTarget.value;
    const recipientId = this.recipientTarget.value;
    if (!giverId || !recipientId) return this.fail('people.chooseBoth');
    if (giverId === recipientId) return this.fail('people.self');
    if (this.exclusions.some(rule => rule.giverId === giverId && rule.recipientId === recipientId)) return this.fail('validation.duplicateRule');
    this.exclusions.push({ giverId, recipientId });
    this.errorTarget.hidden = true;
    this.renderRules();
    this.say('status.exclusionAdded');
  }

  renderRules() {
    const people = this.readPeople();
    this.rulesTarget.replaceChildren();
    for (const [index, rule] of this.exclusions.entries()) {
      const row = this.ruleTemplateTarget.content.firstElementChild.cloneNode(true);
      const label = i18n.t('people.exclusion', {
        giver: people.find(person => person.id === rule.giverId)?.name.trim() || i18n.t('people.unnamed'),
        recipient: people.find(person => person.id === rule.recipientId)?.name.trim() || i18n.t('people.unnamed'),
      });
      row.querySelector('span').textContent = label;
      const button = row.querySelector('button');
      button.dataset.exchangeIndexParam = index;
      button.setAttribute('aria-label', i18n.t('people.removeExclusion', { rule: label }));
      this.rulesTarget.append(row);
    }
  }

  removeRule(event) {
    this.exclusions.splice(event.params.index, 1);
    this.renderRules();
    this.giverTarget.focus();
    this.say('status.exclusionRemoved');
  }

  draft() {
    return {
      participants: this.readPeople(),
      exclusions: this.exclusions,
      exchange: { name: this.nameTarget.value, budget: this.budgetTarget.value, date: this.dateTarget.value, instructions: this.instructionsTarget.value },
    };
  }

  draw(event) {
    event.preventDefault();
    this.errorTarget.hidden = true;
    try {
      const draft = this.draft();
      const participants = validateParticipants(draft.participants);
      const exchange = validateExchange(draft.exchange);
      const draw = new SecretSantaDraw(participants, draft.exclusions);
      const assignments = draw.generate();
      const people = new Map(participants.map(person => [person.id, person]));
      this.invitations = assignments.map(({ giverId, recipientId }) => {
        const giver = people.get(giverId);
        const recipient = people.get(recipientId);
        const invitation = new Invitation({ v: 1, giver: giver.name, recipient: recipient.name, hint: recipient.hint, exchange });
        return { giverId, fragment: invitation.toFragment() };
      });
      this.showResults();
      this.say('status.ready');
    } catch (error) { this.fail(error); }
  }

  showResults() {
    const people = new Map(this.readPeople().map(person => [person.id, person]));
    this.cardsTarget.replaceChildren();
    for (const item of this.invitations) {
      const card = this.cardTemplateTarget.content.firstElementChild.cloneNode(true);
      const giver = people.get(item.giverId).name.trim();
      card.dataset.shareGiverValue = giver;
      card.querySelector('h3').textContent = i18n.t('people.invitationFor', { name: giver });
      const input = card.querySelector('input');
      input.id = `link-${item.giverId}`;
      input.value = Invitation.fromFragment(item.fragment).toUrl(location.href);
      card.querySelector('label').htmlFor = input.id;
      this.cardsTarget.append(card);
    }
    this.formTarget.hidden = true;
    this.setupHeadingTarget.hidden = true;
    this.element.setAttribute('aria-labelledby', 'results-title');
    this.resultsTarget.hidden = false;
    this.resultHeadingTarget.focus();
  }

  requestEdit() { this.confirmTarget.showModal(); }
  cancelEdit() { this.confirmTarget.close(); }

  edit() {
    this.confirmTarget.close();
    this.invitations = null;
    this.cardsTarget.replaceChildren();
    this.resultsTarget.hidden = true;
    this.formTarget.hidden = false;
    this.setupHeadingTarget.hidden = false;
    this.element.setAttribute('aria-labelledby', 'organiser-title');
    this.peopleTarget.querySelector('input')?.focus();
    this.say('status.edited');
  }

  save() {
    try {
      saveCopy({ v: 1, draft: this.draft(), invitations: this.invitations });
      this.say('storage.saved');
    } catch (error) { this.say(error instanceof ValidationError ? error : 'storage.saveFailed'); }
  }

  restore() {
    try {
      const saved = restoreCopy();
      if (!saved) return this.say('storage.missing');
      this.peopleTarget.replaceChildren();
      this.exclusions = [];
      for (const person of saved.draft.participants) this.addPerson(null, person);
      this.exclusions = saved.draft.exclusions;
      for (const key of ['name', 'budget', 'date', 'instructions']) this[`${key}Target`].value = saved.draft.exchange[key];
      this.updatePeople();
      this.invitations = saved.invitations;
      this.errorTarget.hidden = true;
      if (this.invitations) this.showResults();
      else {
        this.resultsTarget.hidden = true;
        this.cardsTarget.replaceChildren();
        this.formTarget.hidden = false;
        this.setupHeadingTarget.hidden = false;
        this.element.setAttribute('aria-labelledby', 'organiser-title');
        (this.peopleTarget.querySelector('input') || this.addButtonTarget).focus();
      }
      this.say('storage.restored');
    } catch (error) { this.say(error instanceof ValidationError ? error : 'storage.restoreFailed'); }
  }

  deleteSaved() {
    try {
      deleteCopy();
      this.say('storage.deleted');
    } catch { this.say('storage.deleteFailed'); }
  }

  fail(message, params = {}) {
    this.errorMessage = { message, params };
    this.errorTarget.textContent = this.messageText(this.errorMessage);
    this.errorTarget.hidden = false;
    this.errorTarget.focus();
  }

  say(message, params = {}) {
    this.statusMessage = { message, params };
    this.statusTarget.textContent = this.messageText(this.statusMessage);
  }

  messageText({ message, params }) {
    return typeof message === 'string' ? i18n.t(message, params) : i18n.error(message);
  }

  localize() {
    this.updatePeople();
    for (const card of this.cardsTarget.children) {
      card.querySelector('h3').textContent = i18n.t('people.invitationFor', { name: card.dataset.shareGiverValue });
    }
    if (this.statusMessage) this.statusTarget.textContent = this.messageText(this.statusMessage);
    if (this.errorMessage) this.errorTarget.textContent = this.messageText(this.errorMessage);
  }
}
