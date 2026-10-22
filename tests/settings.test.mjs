import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import '../public/settings-model.js';
const model = globalThis.GameSettings;

test('existing settings migrate safely, invalid colors are dropped, and numeric limits are enforced', () => {
  const settings = model.normalize({ totalJumps:250, sound:false, darkMode:true, volume:2,
    gravityScale:Infinity, characterSize:100, perfectsForLife:2.6,
    palette:{character:'#FF8800',background:'url(bad)',unknown:'#112233'} });
  assert.equal(settings.totalJumps,250);
  assert.equal(settings.sound,false);
  assert.equal(settings.darkMode,true);
  assert.equal(settings.volume,1);
  assert.equal(settings.characterSize,42);
  assert.equal(settings.perfectsForLife,3);
  assert.equal(settings.gravityScale,1);
  assert.deepEqual(settings.palette,{character:'#ff8800'});
});

test('cosmetic changes remain ranked and every gameplay customization gets separate stats', () => {
  const original=model.normalize({});
  assert.equal(model.isRanked(original),true);
  const appearance=model.normalize({palette:{character:'#ff8800'},motion:false,showTimer:false,characterRadius:0,eyeSize:5,platformHeight:12,volume:.25});
  assert.equal(model.isRanked(appearance),true);
  assert.equal(model.rulesKey(appearance),model.rulesKey(original));
  assert.equal(model.statsSuffix(appearance),'');
  for(const key of model.ruleKeys) {
    const changed=model.normalize(original);
    changed[key]=typeof changed[key]==='boolean'?!changed[key]:changed[key]+.1;
    assert.equal(model.isRanked(changed),false,key);
    assert.notEqual(model.rulesKey(changed),model.rulesKey(original),key);
    if(key!=='totalJumps') assert.match(model.statsSuffix(changed),/^_custom_/);
  }
});

test('ranked reset restores physics while retaining the chosen appearance and audio', () => {
  const custom=model.normalize({totalJumps:250,gravityScale:.5,startingLives:10,palette:{character:'#ff8800'},sound:false});
  const ranked=model.withDefaultRules(custom);
  assert.equal(model.isRanked(ranked),true);
  assert.equal(ranked.totalJumps,100);
  assert.equal(ranked.startingLives,0);
  assert.equal(ranked.palette.character,'#ff8800');
  assert.equal(ranked.sound,false);
});

test('runtime controls change gravity, jump timing, hitbox size, and life rules', () => {
  const source=readFileSync(new URL('../public/game.html',import.meta.url),'utf8');
  const fn=source.match(/function applyRuntimeSettings\(\) \{[\s\S]*?\n\}/)[0];
  const engine={settings:model.normalize({gravityScale:.5,speedScale:1.25,jumpScale:1.5,chargeTime:2,characterSize:35,startWidth:150,totalJumps:250,perfectZone:.4,perfectsForLife:5,landPause:.5}),PHYSICS:{},THEME:{character:{},platform:{}},GAMEPLAY:{},applyTheme(){}};
  vm.runInNewContext(fn+';applyRuntimeSettings();',engine);
  assert.equal(engine.PHYSICS.gravity,1128);
  assert.equal(engine.PHYSICS.maxVX,742.5);
  assert.equal(engine.PHYSICS.chargeTime,2);
  assert.equal(engine.THEME.character.width,35);
  assert.equal(engine.THEME.platform.startWidth,150);
  assert.equal(engine.GAMEPLAY.totalJumps,250);
  assert.equal(engine.GAMEPLAY.perfectZone,.4);
  assert.equal(engine.GAMEPLAY.perfectsForLife,5);
  assert.equal(engine.GAMEPLAY.landPause,.5);
});

test('mystery goals include both range endpoints, normalize bounds, and remain unranked', () => {
  const settings=model.normalize({goalMode:'mystery',mysteryFrom:4,mysteryTo:9});
  assert.equal(model.pickTarget(settings,()=>0),4);
  assert.equal(model.pickTarget(settings,()=>1-Number.EPSILON),9);
  assert.deepEqual(Array.from({length:6},(_,i)=>model.pickTarget(settings,()=>i/6)),[4,5,6,7,8,9]);
  assert.equal(model.pickTarget(model.normalize({goalMode:'mystery',mysteryFrom:7,mysteryTo:7})),7);
  assert.equal(model.isRanked(model.normalize({goalMode:'mystery',mysteryFrom:100,mysteryTo:100})),false);
  assert.equal(model.isRanked(model.withDefaultRules(settings)),true);
  const corrected=model.normalize({goalMode:'mystery',mysteryFrom:9,mysteryTo:4});
  assert.equal(corrected.mysteryFrom,4);
  assert.equal(corrected.mysteryTo,9);
  assert.equal(model.winTitle(settings,7),'Mystery run complete!');
  const hiddenTimer=model.normalize({...settings,showTimer:false});
  assert.equal(model.rulesKey(hiddenTimer),model.rulesKey(settings));
  assert.notEqual(model.statsSuffix(settings),model.statsSuffix(model.normalize({...settings,mysteryTo:10})));
});

test('mystery HUD hides the countdown and the timer toggle removes the clock', () => {
  const source=readFileSync(new URL('../public/game.html',import.meta.url),'utf8');
  const draw=source.match(/function drawHUD\(\) \{[\s\S]*?\n\}/)[0];
  const text=[];
  const engine={settings:model.normalize({goalMode:'mystery',showTimer:false}),score:{remaining:57},state:'idle',winHudMode:false,hudFadeAlpha:1,safeTop:0,S:1,W:400,lives:0,streak:0,
    fonts:{},THEME:{ui:{}},ctx:{save(){},restore(){},fillText(value){text.push(value);}},ranking:{format(){return '0:12.34';},elapsed(){return 12340;}}};
  vm.runInNewContext(draw+';drawHUD();',engine);
  assert.deepEqual(text,['?','mystery goal']);
  text.length=0;engine.settings=model.normalize({showTimer:true});
  vm.runInNewContext(draw+';drawHUD();',engine);
  assert.deepEqual(text,[57,'jumps remaining','0:12.34']);
});

test('refresh restores the existing mystery target and rejects targets outside its range', () => {
  const source=readFileSync(new URL('../public/game.html',import.meta.url),'utf8');
  const restore=source.match(/function restoreState\(\) \{[\s\S]*?\n\}/)[0];
  const settings=model.normalize({goalMode:'mystery',mysteryFrom:1,mysteryTo:3});
  const saved={totalJumps:2,activeLevel:0,rulesKey:model.rulesKey(settings),platforms:[{x:25,y:300,w:110},{x:200,y:300,w:100}],player:{x:30,platIdx:0},cam:{x:0,target:0},score:{remaining:1}};
  const engine={settings,GameSettings:{...model,pickTarget(){throw new Error('Refresh must not reroll');}},GAMEPLAY:{totalJumps:100},LEVELS:[{}],sessionStorage:{getItem(){return JSON.stringify(saved);}},loadLevelStats(){},applyRuntimeSettings(){},resize(){},ranking:{restore(){}},modal:{classList:{remove(){}}},ensurePlatforms(){},setCamTarget(){},getY(p){return p.y;},THEME:{character:{height:27}},S:1,runSeed:null,runStartTime:null,maxStreak:0,totalPerfects:0,totalLivesGained:0,showWin(){}};
  vm.runInNewContext(restore+';restored=restoreState();',engine);
  assert.equal(engine.restored,true);
  assert.equal(engine.GAMEPLAY.totalJumps,2);
  assert.equal(engine.score.remaining,1);
  saved.totalJumps=4;
  vm.runInNewContext('restored=restoreState();',engine);
  assert.equal(engine.restored,false);
});
