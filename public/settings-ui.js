var Customizer = {
    draft: null, tab: 'appearance', overlay: null,
    sections: {
        appearance: {title:'Appearance',subtitle:'Your game. Your palette.',icon:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'},
        gameplay: {title:'Gameplay',subtitle:'Dial in the way you jump.',icon:'M4 16c4 0 4-10 9-10h5M14 2l4 4-4 4M4 20h16'},
        world: {title:'World',subtitle:'Shape the platforms and camera.',icon:'M3 18h7M14 13h7M6 6h8'},
        feedback: {title:'Audio & display',subtitle:'Keep the feedback you like.',icon:'M4 9h4l5-4v14l-5-4H4zM17 8q6 4 0 8'}
    },
    groups: {
        appearance: [
            ['Character details',[
                ['characterRadius','Corner radius',0,21,.5,'px'],['eyeSize','Eye size',2,6,.1,'px'],
                ['platformHeight','Platform thickness',3,20,1,'px'],['platformRadius','Platform corners',0,10,.5,'px']
            ]]
        ],
        gameplay: [
            ['Run rules',[
                ['totalJumps','Number of jumps',1,10000,1,'jumps','number'],
                ['showTimer','Show run timer','Display elapsed time during play. Times are still recorded.','toggle'],
                ['startingLives','Starting lives',0,20,1,'lives'],['perfectZone','Perfect landing zone',5,80,5,'%',null,100],
                ['perfectsForLife','Perfects for an extra life',1,10,1,'landings'],['characterSize','Character size',16,42,1,'px']
            ]],
            ['Jump feel',[
                ['gravityScale','Gravity',50,175,5,'%',null,100],['speedScale','Horizontal speed',50,150,5,'%',null,100],
                ['jumpScale','Jump height',50,150,5,'%',null,100],['minJumpScale','Minimum jump height',50,150,5,'%',null,100],
                ['chargeTime','Full charge time',.3,2.5,.1,'s'],['minPower','Minimum charge',2,30,1,'%',null,100]
            ]]
        ],
        world: [
            ['Platforms',[
                ['startWidth','Starting platform width',60,180,5,'px'],['widthScale','Platform width',50,175,5,'%',null,100],
                ['gapScale','Gap between platforms',50,150,5,'%',null,100],['verticalScale','Height variation',0,150,5,'%',null,100],
                ['confidenceTraps','Surprise difficulty','Occasional tougher jumps to keep you on your toes.','toggle']
            ]],
            ['Camera & rhythm',[
                ['cameraSpeed','Camera speed',50,200,5,'%',null,100],['landPause','Pause after landing',0,1.5,.1,'s']
            ]]
        ],
        feedback: [
            ['Audio & touch',[
                ['sound','Sound effects','Jump, land, and celebrate.','toggle'],['volume','Master volume',0,100,1,'%',null,100],
                ['vibration','Haptic feedback','A little feedback on supported devices.','toggle']
            ]],
            ['Display & animation',[
                ['darkMode','Dark interface','Switch between a light and dark base.','toggle'],
                ['showHint','Show instructions','Display the hold-to-jump hint.','toggle'],
                ['motion','Character & world motion','Squish, stretch, wobble, and platform entrances.','toggle'],
                ['effects','Celebration effects','Landing rings and floating messages.','toggle']
            ]]
        ]
    },
    field: function (field) {
        var key=field[0],label=field[1];
        if(field[3]==='toggle') return '<div class="studio-toggle-row"><div><label id="label-'+key+'">'+label+'</label><p>'+field[2]+'</p></div><button type="button" class="studio-switch" data-toggle="'+key+'" role="switch" aria-labelledby="label-'+key+'" aria-checked="'+this.draft[key]+'"><span></span></button></div>';
        var factor=field[7]||1,value=Math.round(this.draft[key]*factor*10000)/10000;
        var number='<div class="studio-number"><input id="'+(key==='totalJumps'?'jump-count':'setting-'+key)+'" aria-label="'+label+'" data-setting="'+key+'" data-factor="'+factor+'" type="number" min="'+field[2]+'" max="'+field[3]+'" step="'+field[4]+'" value="'+value+'" required><span>'+field[5]+'</span></div>';
        return '<div class="studio-range-row" data-setting-row="'+key+'"><div class="studio-range-heading"><label for="'+(key==='totalJumps'?'jump-count':'setting-'+key)+'">'+label+'</label>'+number+'</div>'+(field[6]==='number'?'<p class="studio-field-help">From a quick warm-up to a 10,000-jump marathon.</p>':'<input aria-label="'+label+' slider" data-setting="'+key+'" data-factor="'+factor+'" type="range" min="'+field[2]+'" max="'+field[3]+'" step="'+field[4]+'" value="'+value+'">')+'</div>';
    },
    render: function () {
        var self=this,colors=GameSettings.colors(this.draft, LEVELS[activeLevel].color);
        document.getElementById('studio-navigation').innerHTML=Object.keys(this.sections).map(function(key){var s=self.sections[key];return '<button type="button" role="tab" id="tab-'+key+'" aria-controls="panel-'+key+'" aria-selected="'+(self.tab===key)+'" data-tab="'+key+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+s.icon+'"/></svg><span>'+s.title+'</span></button>';}).join('');
        document.getElementById('studio-panels').innerHTML=Object.keys(this.sections).map(function(key){
            var section=self.sections[key],intro='';
            if(key==='appearance') {
                intro='<div class="studio-preview" id="studio-preview"><div class="studio-preview-top"><span>LIVE PREVIEW</span><span id="studio-preview-mode"></span></div><div class="studio-preview-score">'+self.draft.totalJumps+'<small>jumps remaining</small></div><div class="studio-preview-feedback"><span>●</span><i>○</i><b>♥</b></div><div class="studio-preview-character"><i></i><i></i><b></b></div><div class="studio-preview-platform one"></div><div class="studio-preview-platform two"></div></div><div class="studio-section-heading"><h4>Theme presets</h4><span>A starting point for your style</span></div><div class="studio-presets">'+Object.keys(GameSettings.presets).map(function(p){var v=GameSettings.presets[p],c=GameSettings.colors({darkMode:v.dark,palette:v.palette});return '<button type="button" data-preset="'+p+'" aria-pressed="'+(self.draft.preset===p)+'"><span class="studio-preset-art" style="background:'+c.background+'"><i style="background:'+c.character+'"></i><b style="background:'+c.platform+'"></b></span>'+v.name+'</button>';}).join('')+'</div><div class="studio-section-heading"><h4>Game colors</h4><span>Pick a color or enter a hex code</span></div><div class="studio-colors">'+Object.keys(GameSettings.colorLabels).map(function(c){return '<div class="studio-color"><label class="studio-swatch" style="--swatch:'+colors[c]+'"><input type="color" data-color="'+c+'" aria-label="'+GameSettings.colorLabels[c]+' color" value="'+colors[c]+'"></label><div><label for="hex-'+c+'">'+GameSettings.colorLabels[c]+'</label><input id="hex-'+c+'" data-hex="'+c+'" aria-label="'+GameSettings.colorLabels[c]+' hex code" value="'+colors[c].toUpperCase()+'" pattern="#[0-9a-fA-F]{6}" maxlength="7" spellcheck="false" required></div></div>';}).join('')+'</div>';
            }
            if(key==='gameplay') {
                intro='<div class="studio-goal-mode"><div class="studio-section-heading"><h4>Goal mode</h4></div><div class="studio-mode-buttons" role="group" aria-label="Goal mode"><button type="button" data-goal-mode="fixed" aria-pressed="false"><strong>Fixed goal</strong><span>Choose your jump count</span></button><button type="button" data-goal-mode="mystery" aria-pressed="false"><strong>Mystery goal</strong><span>A secret target every run</span></button></div><div id="mystery-range" class="studio-mystery-range"><p>A number is picked from your range, including both ends. The target stays hidden. Each new run picks again.</p><div class="studio-range-inputs"><label>From<input id="mystery-from" data-setting="mysteryFrom" aria-label="Mystery range from" type="number" min="1" max="10000" step="1" value="'+self.draft.mysteryFrom+'" required aria-describedby="mystery-range-error"></label><span aria-hidden="true">→</span><label>To<input id="mystery-to" data-setting="mysteryTo" aria-label="Mystery range to" type="number" min="1" max="10000" step="1" value="'+self.draft.mysteryTo+'" required aria-describedby="mystery-range-error"></label></div><div id="mystery-range-error" role="alert"></div></div></div>';
            }
            return '<section role="tabpanel" aria-labelledby="tab-'+key+'" id="panel-'+key+'" '+(self.tab===key?'':'hidden')+'><div class="studio-page-heading"><h3>'+section.title+'</h3><p>'+section.subtitle+'</p></div>'+intro+self.groups[key].map(function(group){return '<div class="studio-group"><div class="studio-section-heading"><h4>'+group[0]+'</h4></div><div class="studio-group-body">'+group[1].map(function(f){return self.field(f);}).join('')+'</div></div>';}).join('')+(key==='feedback'?'<button type="button" id="studio-test-sound" class="studio-text-button">♫ Preview sound</button>':'')+'</section>';
        }).join('');
        this.update();
    },
    update: function () {
        var colors=GameSettings.colors(this.draft, LEVELS[activeLevel].color),shell=document.getElementById('studio-shell');
        shell.dataset.theme=this.draft.darkMode?'dark':'light';
        shell.style.setProperty('--studio-accent',colors.accent);
        var rgb=colors.accent.slice(1).match(/../g).map(function(v){return parseInt(v,16);});
        shell.style.setProperty('--studio-accent-ink',rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>165?'#111827':'#ffffff');
        var preview=document.getElementById('studio-preview');
        Object.keys(colors).forEach(function(key){preview.style.setProperty('--preview-'+key,colors[key]);});
        preview.style.setProperty('--preview-size',this.draft.characterSize*1.5+'px');
        preview.style.setProperty('--preview-radius',this.draft.characterRadius*1.5+'px');
        preview.style.setProperty('--preview-eye',this.draft.eyeSize*1.5+'px');
        preview.style.setProperty('--preview-thickness',this.draft.platformHeight+'px');
        preview.style.setProperty('--preview-platform-radius',this.draft.platformRadius+'px');
        var mystery=this.draft.goalMode==='mystery';
        preview.querySelector('.studio-preview-score').firstChild.textContent=mystery?'?':this.draft.totalJumps;
        preview.querySelector('.studio-preview-score small').textContent=mystery?'mystery goal':'jumps remaining';
        this.overlay.querySelectorAll('[data-goal-mode]').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.goalMode===Customizer.draft.goalMode));});
        var fixedRow=this.overlay.querySelector('[data-setting-row="totalJumps"]');
        fixedRow.hidden=mystery;fixedRow.querySelector('input').disabled=mystery;
        document.getElementById('mystery-range').hidden=!mystery;
        var from=document.getElementById('mystery-from'),to=document.getElementById('mystery-to');
        from.disabled=to.disabled=!mystery;
        var rangeError=mystery&&Number(from.value)>Number(to.value)?'From must be less than or equal to To.':'';
        to.setCustomValidity(rangeError);document.getElementById('mystery-range-error').textContent=rangeError;
        var ranked=GameSettings.isRanked(this.draft)&&activeLevel===0;
        document.getElementById('studio-preview-mode').textContent=mystery?'MYSTERY MODE':ranked?'RANKED RULES':'CUSTOM RULES';
        document.getElementById('studio-rule-status').textContent=mystery?'Mystery · unranked':ranked?'Ranked compatible':'Custom gameplay';
        document.getElementById('studio-rule-status').dataset.ranked=String(ranked);
        var rulesChanged=GameSettings.rulesKey(this.draft)!==GameSettings.rulesKey(settings);
        document.getElementById('studio-save-hint').textContent=rulesChanged?'Saving starts a new run. Custom rules stay off the leaderboard.':'Your preferences are saved on this device.';
        var changed=JSON.stringify(GameSettings.normalize(this.draft))!==JSON.stringify(GameSettings.normalize(settings));
        document.getElementById('studio-save-state').textContent=changed?'Unsaved changes':'All changes saved';
        document.getElementById('settings-done').textContent=changed?'Save changes':'Done';
        this.overlay.querySelectorAll('[data-preset]').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.preset===Customizer.draft.preset));});
    },
    open: function () {
        this.draft=GameSettings.normalize(settings);this.tab='appearance';this.render();
        if(state==='charging'){state='idle';power=0;}
        settingsOpen=true;this.overlay.inert=false;this.overlay.classList.add('show');
        document.getElementById('studio-close').focus();
    },
    cancel: function () {
        settingsOpen=false;this.overlay.classList.remove('show');this.overlay.inert=true;
        document.getElementById('settings-btn').focus();
    },
    apply: function () {
        var form=document.getElementById('studio-form');
        var invalid=Array.from(form.querySelectorAll('input')).find(function(input){return !input.validity.valid;});
        if(invalid){var panel=invalid.closest('[role="tabpanel"]');if(panel){this.tab=panel.id.replace('panel-','');this.selectTab(this.tab);}invalid.reportValidity();return;}
        var next=GameSettings.normalize(this.draft),restartNeeded=GameSettings.rulesKey(next)!==GameSettings.rulesKey(settings);
        settings=next;applyRuntimeSettings();saveSettings();
        if(restartNeeded){stopOmtCountdown();omtOverlay.classList.remove('show');winModalOpen=false;hideLevelSelect();if(!isLevelUnlocked(LEVELS[activeLevel]))activeLevel=0;loadLevelStats(activeLevel);restart();saveState();}
        else saveState();
        this.cancel();
    },
    selectTab: function (tab) {
        this.tab=tab;
        this.overlay.querySelectorAll('[data-tab]').forEach(function(button){button.setAttribute('aria-selected',String(button.dataset.tab===tab));});
        this.overlay.querySelectorAll('[role="tabpanel"]').forEach(function(panel){panel.hidden=panel.id!=='panel-'+tab;});
        document.getElementById('studio-panels').scrollTop=0;
    },
    bind: function () {
        this.overlay=document.getElementById('settings-overlay');this.overlay.inert=true;
        this.draft=GameSettings.normalize(settings);this.render();
        document.getElementById('settings-btn').addEventListener('click',function(){Customizer.open();});
        document.getElementById('studio-close').addEventListener('click',function(){Customizer.cancel();});
        document.getElementById('studio-cancel').addEventListener('click',function(){Customizer.cancel();});
        document.getElementById('studio-form').addEventListener('submit',function(e){e.preventDefault();Customizer.apply();});
        document.getElementById('studio-reset').addEventListener('click',function(){Customizer.draft=GameSettings.normalize({},_darkMQ.matches);Customizer.render();});
        this.overlay.addEventListener('click',function(e){
            if(e.target===Customizer.overlay){Customizer.cancel();return;}
            var tab=e.target.closest('[data-tab]');if(tab){Customizer.selectTab(tab.dataset.tab);return;}
            var mode=e.target.closest('[data-goal-mode]');if(mode){Customizer.draft.goalMode=mode.dataset.goalMode;Customizer.update();return;}
            var toggle=e.target.closest('[data-toggle]');if(toggle){var key=toggle.dataset.toggle;Customizer.draft[key]=!Customizer.draft[key];toggle.setAttribute('aria-checked',String(Customizer.draft[key]));Customizer.update();return;}
            var preset=e.target.closest('[data-preset]');if(preset){var key=preset.dataset.preset,p=GameSettings.presets[key];Customizer.draft.palette=Object.assign({},p.palette);Customizer.draft.preset=key;if(key!=='original')Customizer.draft.darkMode=p.dark;Customizer.render();return;}
            if(e.target.closest('#studio-test-sound')){var sound=settings.sound,volume=settings.volume;settings.sound=true;settings.volume=Customizer.draft.volume;initAudio();playTone(523,'sine',.15,.25);settings.sound=sound;settings.volume=volume;}
        });
        this.overlay.addEventListener('input',function(e){
            var field=e.target,key=field.dataset.setting;
            if(key==='mysteryFrom'||key==='mysteryTo')document.getElementById('mystery-to').setCustomValidity('');
            if(key){var value=Number(field.value),factor=Number(field.dataset.factor)||1;if(!field.validity.valid||!Number.isFinite(value))return;Customizer.draft[key]=value/factor;Customizer.overlay.querySelectorAll('[data-setting="'+key+'"]').forEach(function(other){if(other!==field)other.value=field.value;});}
            var color=field.dataset.color||field.dataset.hex;
            if(color){if(!/^#[0-9a-f]{6}$/i.test(field.value))return;Customizer.draft.palette[color]=field.value.toLowerCase();Customizer.draft.preset='custom';var hex=document.getElementById('hex-'+color),picker=Customizer.overlay.querySelector('[data-color="'+color+'"]');hex.value=field.value.toUpperCase();picker.value=field.value;picker.closest('.studio-swatch').style.setProperty('--swatch',field.value);}
            Customizer.update();
        });
        this.overlay.addEventListener('touchmove',function(e){e.stopPropagation();},{passive:true});
        this.overlay.addEventListener('keydown',function(e){
            if(e.key==='Escape'){e.preventDefault();e.stopPropagation();Customizer.cancel();}
            if(e.key==='Tab'){
                var items=Array.from(Customizer.overlay.querySelectorAll('button:not(:disabled),input')).filter(function(el){return el.offsetParent!==null;});
                var first=items[0],last=items[items.length-1];
                if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
            }
        });
    }
};
