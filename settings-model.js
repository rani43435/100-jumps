/* Shared, validated customization model. No game state or DOM dependencies. */
(function (root) {
    var defaults = {
        sound: true, vibration: true, volume: 0.8, darkMode: false, totalJumps: 100, goalMode: 'fixed', mysteryFrom: 25, mysteryTo: 100,
        palette: {}, preset: 'original', showTimer: true, showHint: true, motion: true, effects: true,
        characterSize: 27, characterRadius: 5.5, eyeSize: 3.7, platformHeight: 8, platformRadius: 3.5,
        startWidth: 110, widthScale: 1, gapScale: 1, verticalScale: 1,
        gravityScale: 1, speedScale: 1, jumpScale: 1, minJumpScale: 1, chargeTime: 1.1, minPower: 0.07,
        perfectZone: 0.2, perfectsForLife: 3, startingLives: 0, cameraSpeed: 1, landPause: 0, confidenceTraps: true
    };
    var limits = {
        totalJumps: [1,10000,true], mysteryFrom: [1,10000,true], mysteryTo: [1,10000,true], volume: [0,1], characterSize: [16,42], characterRadius: [0,21], eyeSize: [2,6],
        platformHeight: [3,20], platformRadius: [0,10], startWidth: [60,180], widthScale: [.5,1.75], gapScale: [.5,1.5], verticalScale: [0,1.5],
        gravityScale: [.5,1.75], speedScale: [.5,1.5], jumpScale: [.5,1.5], minJumpScale: [.5,1.5], chargeTime: [.3,2.5], minPower: [.02,.3],
        perfectZone: [.05,.8], perfectsForLife: [1,10,true], startingLives: [0,20,true], cameraSpeed: [.5,2], landPause: [0,1.5]
    };
    var ruleKeys = ['totalJumps','characterSize','startWidth','widthScale','gapScale','verticalScale','gravityScale','speedScale','jumpScale','minJumpScale','chargeTime','minPower','perfectZone','perfectsForLife','startingLives','cameraSpeed','landPause','confidenceTraps'];
    var colorLabels = { character:'Character', background:'Background', platform:'Platforms', score:'Score', secondary:'Secondary text', accent:'Interface accent', perfect:'Perfect landing', life:'Hearts & lives', eyeWhite:'Eye whites', pupil:'Pupils & mouth', hint:'Instruction text', streak:'Empty streak dots' };
    var light = {character:'#6366f1',background:'#edf2f8',platform:'#9aa8bd',score:'#23304d',secondary:'#9aa8bd',accent:'#6366f1',perfect:'#24c78b',life:'#ff5b78',eyeWhite:'#ffffff',pupil:'#312e81',hint:'#64748b',streak:'#b7dec9'};
    var dark = Object.assign({},light,{background:'#111827',platform:'#4b5563',score:'#e2e8f0',secondary:'#64748b',perfect:'#34d399',life:'#fb7185',hint:'#94a3b8',streak:'#2d4a3e'});
    var presets = {
        original:{name:'Original',dark:true,palette:{}},
        ocean:{name:'Ocean',dark:true,palette:{character:'#38bdf8',background:'#082f49',platform:'#0e7490',score:'#e0f2fe',secondary:'#7dd3fc',accent:'#0ea5e9',perfect:'#5eead4',life:'#fda4af',pupil:'#0c4a6e',hint:'#7dd3fc',streak:'#155e75'}},
        sunset:{name:'Sunset',dark:true,palette:{character:'#fb923c',background:'#2e1833',platform:'#87506d',score:'#fff1e6',secondary:'#d9a5bd',accent:'#f97316',perfect:'#fcd34d',life:'#fb7185',pupil:'#7c2d12',hint:'#d9a5bd',streak:'#65384f'}},
        forest:{name:'Forest',dark:true,palette:{character:'#a3e635',background:'#102a23',platform:'#497562',score:'#f0fdf4',secondary:'#9dc4ac',accent:'#84cc16',perfect:'#4ade80',life:'#fda4af',pupil:'#365314',hint:'#9dc4ac',streak:'#315743'}},
        candy:{name:'Candy',dark:false,palette:{character:'#e879f9',background:'#fdf2f8',platform:'#d8b4fe',score:'#581c87',secondary:'#a21caf',accent:'#c026d3',perfect:'#10b981',life:'#f43f5e',pupil:'#701a75',hint:'#a21caf',streak:'#a7f3d0'}}
    };
    function normalize(raw, systemDark) {
        raw = raw && typeof raw === 'object' ? raw : {};
        var result = Object.assign({},defaults,{darkMode:!!systemDark,palette:{}});
        Object.keys(defaults).forEach(function (key) {
            if (typeof defaults[key] === 'boolean' && typeof raw[key] === 'boolean') result[key] = raw[key];
        });
        Object.keys(limits).forEach(function(key) {
            var value = raw[key], range = limits[key];
            if (typeof value !== 'number' || !Number.isFinite(value)) return;
            value = Math.min(range[1],Math.max(range[0],value));
            result[key] = range[2] ? Math.round(value) : Math.round(value*1000000)/1000000;
        });
        Object.keys(colorLabels).forEach(function(key) {
            var value = raw.palette && raw.palette[key];
            if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) result.palette[key] = value.toLowerCase();
        });
        if (raw.goalMode === 'mystery') result.goalMode = 'mystery';
        if (result.mysteryFrom > result.mysteryTo) { var swap=result.mysteryFrom;result.mysteryFrom=result.mysteryTo;result.mysteryTo=swap; }
        if (raw.preset === 'custom' || presets[raw.preset]) result.preset = raw.preset;
        return result;
    }
    function colors(settings, characterColor) {
        var values = Object.assign({},settings.darkMode ? dark : light);
        if (characterColor) values.character = characterColor;
        return Object.assign(values,settings.palette);
    }
    function rulesKey(settings) {
        var key=ruleKeys.map(function(name){return name === 'totalJumps' && settings.goalMode === 'mystery' ? 'mystery' : String(settings[name]);}).join('|');
        return key + (settings.goalMode === 'mystery' ? '|'+settings.mysteryFrom+'|'+settings.mysteryTo : '');
    }
    function standardRules(settings) { return settings.goalMode === 'fixed' && ruleKeys.every(function(key){return settings[key] === defaults[key];}); }
    function withDefaultRules(settings) { var copy=normalize(settings);copy.goalMode='fixed';ruleKeys.forEach(function(key){copy[key]=defaults[key];});return copy; }
    function statsSuffix(settings) {
        var changed = settings.goalMode === 'mystery' || ruleKeys.some(function(key){return key !== 'totalJumps' && settings[key] !== defaults[key];});
        if (!changed) return '';
        var value=rulesKey(settings),hash=2166136261;
        for(var i=0;i<value.length;i++) hash=Math.imul(hash^value.charCodeAt(i),16777619);
        return '_custom_'+(hash>>>0).toString(36);
    }
    function pickTarget(settings, random) {
        if (settings.goalMode !== 'mystery') return settings.totalJumps;
        var value=(random || Math.random)();
        return settings.mysteryFrom + Math.floor(Math.min(1-Number.EPSILON,Math.max(0,value)) * (settings.mysteryTo-settings.mysteryFrom+1));
    }
    function validTarget(settings,target) {
        return Number.isInteger(target) && (settings.goalMode === 'mystery' ? target>=settings.mysteryFrom && target<=settings.mysteryTo : target===settings.totalJumps);
    }
    function winTitle(settings,target) { return settings.goalMode === 'mystery' ? 'Mystery run complete!' : 'You completed '+target+(target===1?' jump!':' jumps!'); }
    root.GameSettings = {pickTarget:pickTarget,validTarget:validTarget,winTitle:winTitle,defaults:defaults,limits:limits,ruleKeys:ruleKeys,colorLabels:colorLabels,presets:presets,normalize:normalize,colors:colors,rulesKey:rulesKey,isRanked:standardRules,withDefaultRules:withDefaultRules,statsSuffix:statsSuffix};
})(globalThis);
