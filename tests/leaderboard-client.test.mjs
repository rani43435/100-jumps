import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import '../public/settings-model.js';
function client() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {hidden:false, value:'', textContent:'', disabled:false, listeners:{}, addEventListener(type, fn) { this.listeners[type] = fn; }});
    return elements.get(id);
  }
  const context = vm.createContext({
    document: {getElementById: element, querySelector: element, addEventListener() {}},
    Date, String, Math, Promise, Error, JSON, AbortController, setTimeout, clearTimeout,
    GameSettings: globalThis.GameSettings, settings: globalThis.GameSettings.normalize({totalJumps:100}), GAMEPLAY: {totalJumps: 100}, activeLevel: 0, player: {platIdx: 0}, attempts: {active: 2},
    mSub: element('mSub'), saveState() {},
    localStorage: {getItem() {return 'Player';}, setItem() {}},
  });
  vm.runInContext(readFileSync(new URL('../public/leaderboard.js', import.meta.url), 'utf8'), context);
  return {context, element};
}

test('finish form shows the recorded server time, posts the name, and excludes custom goals', async () => {
  const {context:c, element} = client();
  c.ranking.startedAt = Date.now() - 130000;
  c.ranking.run = {id:'test-run', durationMs:123450, submitted:false, queue:Promise.resolve()};
  c.ranking.finish();
  await c.ranking.run.queue;
  assert.equal(element('ranked-name-fields').hidden, false);
  assert.equal(c.mSub.textContent, '2:03.45 · 2 attempts');
  let submitted;
  c.ranking.api = async body => { submitted = body; return {name:body.name, rank:3, durationMs:123450}; };
  element('leaderboard-name').value = 'Player';
  await element('ranked-name-fields').listeners.submit({preventDefault(){},stopPropagation(){}});
  assert.equal(submitted.action, 'submit');
  assert.equal(submitted.name, 'Player');
  assert.equal(element('ranked-name-fields').hidden, true);
  assert.match(element('ranked-finish-status').textContent, /#3.*2:03.45/);
  c.GAMEPLAY.totalJumps = 1;
  c.ranking.finish();
  assert.equal(element('ranked-name-fields').hidden, true);
  assert.match(element('ranked-finish-status').textContent, /exactly 100/);
});

test('checkpoints are sent in order and run snapshots contain no promises', async () => {
  const {context:c} = client();
  const sent = [];
  c.ranking.api = async body => {
    sent.push(body.action + ':' + (body.progress || 0));
    return body.action === 'start' ? {runId:'run-token'} : {progress:body.progress,durationMs:null};
  };
  c.ranking.start();
  c.ranking.checkpoint(1);
  c.ranking.checkpoint(2);
  await c.ranking.run.queue;
  assert.deepEqual(sent, ['start:0','checkpoint:1','checkpoint:2']);
  const saved = JSON.parse(JSON.stringify(c.ranking.snapshot()));
  c.ranking.restore(saved);
  assert.equal(c.ranking.run.id, 'run-token');
  assert.equal(c.ranking.run.progress, 2);
});

test('a mystery target of 100 stays unranked and a hidden timer stays out of the finish text', () => {
  const {context:c,element}=client();
  c.settings=c.GameSettings.normalize({goalMode:'mystery',mysteryFrom:100,mysteryTo:100,showTimer:false});
  assert.equal(c.ranking.eligible(),false);
  c.ranking.start();
  assert.equal(c.ranking.run,null);
  c.ranking.finish();
  assert.equal(c.mSub.textContent,'2 attempts');
  assert.equal(element('ranked-name-fields').hidden,true);
  assert.match(element('ranked-finish-status').textContent,/stays secret/);
});
