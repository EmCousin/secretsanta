import { Controller } from '../vendor/stimulus.js';
import { SecretSantaDraw } from '../../../packages/core/draw.js';
import { Invitation } from '../../../packages/core/invitations.js';
import { validateParticipants, validateExchange, ValidationError } from '../../../packages/core/validation.js';
import { saveCopy, restoreCopy, deleteCopy } from '../storage.js';

export default class extends Controller {
  static targets = ['controls', 'storageButton', 'form', 'people', 'personTemplate', 'ruleTemplate', 'rules', 'giver', 'recipient', 'name', 'budget', 'date', 'instructions', 'error', 'status', 'results', 'cards', 'cardTemplate', 'resultHeading', 'confirm'];

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
    if (this.peopleTarget.children.length >= 50) return this.fail('You can add up to 50 people.');
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
    this.exclusions = this.exclusions.filter(rule => rule.giverId !== row.dataset.personId && rule.recipientId !== row.dataset.personId);
    row.remove();
    this.updatePeople();
    this.peopleTarget.querySelector('input')?.focus();
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
      select.replaceChildren(new Option('Choose a person', ''));
      for (const [i, person] of people.entries()) select.add(new Option(person.name.trim() || `Person ${i + 1}`, person.id));
      if (people.some(person => person.id === previous)) select.value = previous;
    }
    for (const [i, row] of [...this.peopleTarget.children].entries()) {
      row.querySelector('[data-person-number]').textContent = `Person ${i + 1}`;
      row.querySelector('[data-remove]').setAttribute('aria-label', `Remove ${people[i].name.trim() || `person ${i + 1}`}`);
    }
    this.renderRules();
  }

  addRule() {
    const giverId = this.giverTarget.value;
    const recipientId = this.recipientTarget.value;
    if (!giverId || !recipientId) return this.fail('Choose both people for the exclusion.');
    if (giverId === recipientId) return this.fail('Nobody can draw themselves. You do not need to add that exclusion.');
    if (this.exclusions.some(rule => rule.giverId === giverId && rule.recipientId === recipientId)) return this.fail('That exclusion is already in the list.');
    this.exclusions.push({ giverId, recipientId });
    this.errorTarget.hidden = true;
    this.renderRules();
    this.say('Exclusion added.');
  }

  renderRules() {
    const people = this.readPeople();
    this.rulesTarget.replaceChildren();
    for (const [index, rule] of this.exclusions.entries()) {
      const row = this.ruleTemplateTarget.content.firstElementChild.cloneNode(true);
      const label = `${people.find(person => person.id === rule.giverId)?.name.trim() || 'Unnamed person'} should not draw ${people.find(person => person.id === rule.recipientId)?.name.trim() || 'unnamed person'}`;
      row.querySelector('span').textContent = label;
      const button = row.querySelector('button');
      button.dataset.exchangeIndexParam = index;
      button.setAttribute('aria-label', `Remove exclusion: ${label}`);
      this.rulesTarget.append(row);
    }
  }

  removeRule(event) {
    this.exclusions.splice(event.params.index, 1);
    this.renderRules();
    this.giverTarget.focus();
    this.say('Exclusion removed.');
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
      this.say('The draw is ready. Send each invitation privately. Nothing has been saved automatically.');
    } catch (error) { this.fail(error.message); }
  }

  showResults() {
    const people = new Map(this.readPeople().map(person => [person.id, person]));
    this.cardsTarget.replaceChildren();
    for (const item of this.invitations) {
      const card = this.cardTemplateTarget.content.firstElementChild.cloneNode(true);
      const giver = people.get(item.giverId).name.trim();
      card.dataset.shareGiverValue = giver;
      card.querySelector('h3').textContent = `Invitation for ${giver}`;
      const input = card.querySelector('input');
      input.id = `link-${item.giverId}`;
      input.value = Invitation.fromFragment(item.fragment).toUrl(location.href);
      card.querySelector('label').htmlFor = input.id;
      this.cardsTarget.append(card);
    }
    this.formTarget.hidden = true;
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
    this.nameTarget.focus();
    this.say('You can edit this exchange. Draw again and send everyone a new invitation. Any saved copy is unchanged until you save again.');
  }

  save() {
    try {
      saveCopy({ v: 1, draft: this.draft(), invitations: this.invitations });
      this.say('Saved on this device. This replaces the previous saved copy. Nothing was uploaded.');
    } catch (error) { this.say(error instanceof ValidationError ? error.message : 'This browser could not save a copy. Keep your invitation links somewhere safe; you can still use and share them.'); }
  }

  restore() {
    try {
      const saved = restoreCopy();
      if (!saved) return this.say('There is no saved copy on this device.');
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
        this.nameTarget.focus();
      }
      this.say('Saved copy restored. No new draw was made.');
    } catch (error) { this.say(error instanceof ValidationError ? error.message : 'This browser could not read its saved copy. You can still create a new draw.'); }
  }

  deleteSaved() {
    try {
      deleteCopy();
      this.say('Saved copy deleted from this device. The exchange on this screen and any shared links still work.');
    } catch { this.say('This browser could not delete its saved copy. Check your browser storage settings.'); }
  }

  fail(message) {
    this.errorTarget.textContent = message;
    this.errorTarget.hidden = false;
    this.errorTarget.focus();
  }

  say(message) { this.statusTarget.textContent = message; }
}
