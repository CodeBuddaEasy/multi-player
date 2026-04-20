// client/js/npcConfig.js
// NPC configuration panel — difficulty presets + individual stat steppers

const PRESETS = {
    easy:   { speed: 3, aggression: 2, accuracy: 2 },
    medium: { speed: 6, aggression: 6, accuracy: 5 },
    hard:   { speed: 9, aggression: 9, accuracy: 9 },
};

// Current bot configs — each entry is { speed, aggression, accuracy } (1–10)
let npcSlots = [{ speed: 6, aggression: 6, accuracy: 5 }];

function statColor(value) {
    if (value <= 3) return '#44cc44';
    if (value <= 6) return '#ffaa00';
    return '#ff4444';
}

// Returns the name of the matching preset, or null if stats are custom
function activePreset(slot) {
    for (const [name, p] of Object.entries(PRESETS)) {
        if (slot.speed === p.speed && slot.aggression === p.aggression && slot.accuracy === p.accuracy) return name;
    }
    return null;
}

// Builds a single stepper row: LABEL  [−]  N  [+]
function makeStepper(label, value, onChange) {
    const row = document.createElement('div');
    row.className = 'stat-stepper-row';

    const lbl = document.createElement('span');
    lbl.className   = 'stat-stepper-label';
    lbl.textContent = label;

    const controls = document.createElement('div');
    controls.className = 'stat-stepper-controls';

    const minus = document.createElement('button');
    minus.className   = 'step-btn';
    minus.textContent = '−';

    const num = document.createElement('span');
    num.className   = 'stat-num';
    num.textContent = value;
    num.style.color = statColor(value);

    const plus = document.createElement('button');
    plus.className   = 'step-btn';
    plus.textContent = '+';

    function update(newVal) {
        newVal = Math.max(1, Math.min(10, newVal));
        num.textContent = newVal;
        num.style.color = statColor(newVal);
        onChange(newVal);
    }

    minus.addEventListener('click', () => update(parseInt(num.textContent) - 1));
    plus.addEventListener('click',  () => update(parseInt(num.textContent) + 1));

    controls.appendChild(minus);
    controls.appendChild(num);
    controls.appendChild(plus);
    row.appendChild(lbl);
    row.appendChild(controls);
    return row;
}

// Shows the panel and wires up the Add Bot button — only runs in single-player
function initNPCConfig() {
    const panel = document.getElementById('npc-config-panel');
    if (!panel) return;

    if (!window.isSinglePlayer) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';

    // Replace node to avoid stacking listeners on lobby re-entry
    const addBtn = document.getElementById('add-bot-btn');
    const newBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newBtn, addBtn);
    newBtn.addEventListener('click', () => {
        if (npcSlots.length < 3) {
            npcSlots.push({ speed: 6, aggression: 6, accuracy: 5 });
            renderNPCSlots();
        }
    });

    renderNPCSlots();
}

// Renders all bot slot cards inside #npc-slots-container
function renderNPCSlots() {
    const container = document.getElementById('npc-slots-container');
    const addBtn    = document.getElementById('add-bot-btn');
    if (!container) return;

    container.innerHTML = '';

    npcSlots.forEach((slot, i) => {
        const card = document.createElement('div');
        card.className = 'npc-slot-card';

        // ── Header: "BOT N" + remove ──
        const header = document.createElement('div');
        header.className = 'npc-card-header';

        const label = document.createElement('span');
        label.className   = 'npc-slot-label';
        label.textContent = `BOT ${i + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.className   = 'npc-remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', () => { npcSlots.splice(i, 1); renderNPCSlots(); });

        header.appendChild(label);
        header.appendChild(removeBtn);

        // ── Preset toggle buttons: EASY / MED / HARD ──
        const presetRow = document.createElement('div');
        presetRow.className = 'npc-preset-row';

        const presetBtns = {};
        ['easy', 'medium', 'hard'].forEach(name => {
            const btn = document.createElement('button');
            btn.className       = 'preset-btn';
            btn.textContent     = name === 'medium' ? 'MED' : name.toUpperCase();
            btn.dataset.preset  = name;
            if (activePreset(slot) === name) btn.classList.add('preset-active');
            btn.addEventListener('click', () => {
                Object.assign(npcSlots[i], PRESETS[name]);
                renderNPCSlots(); // full re-render so steppers update too
            });
            presetBtns[name] = btn;
            presetRow.appendChild(btn);
        });

        // ── Stat steppers ──
        const statsDiv = document.createElement('div');
        statsDiv.className = 'npc-stat-steppers';

        // When a stepper changes, update preset highlight without re-rendering
        function onStatChange(key) {
            return (v) => {
                npcSlots[i][key] = v;
                const current = activePreset(npcSlots[i]);
                Object.entries(presetBtns).forEach(([name, btn]) => {
                    btn.classList.toggle('preset-active', name === current);
                });
            };
        }

        statsDiv.appendChild(makeStepper('SPEED', slot.speed,      onStatChange('speed')));
        statsDiv.appendChild(makeStepper('AGGR',  slot.aggression, onStatChange('aggression')));
        statsDiv.appendChild(makeStepper('AIM',   slot.accuracy,   onStatChange('accuracy')));

        card.appendChild(header);
        card.appendChild(presetRow);
        card.appendChild(statsDiv);
        container.appendChild(card);
    });

    if (addBtn) addBtn.style.display = npcSlots.length >= 3 ? 'none' : 'inline-block';
}

// Clears all bots and re-renders an empty panel — called by "Edit Bots"
function resetNPCConfig() {
    npcSlots = [];
    const panel = document.getElementById('npc-config-panel');
    if (panel) panel.style.display = 'block';
    const addBtn = document.getElementById('add-bot-btn');
    if (addBtn) addBtn.style.display = 'inline-block';
    renderNPCSlots();
}

// Returns the current bot config array — called by lobby.js before START_GAME
function getNPCConfigs() {
    if (!window.isSinglePlayer) return [];
    return npcSlots.map(s => ({ speed: s.speed, aggression: s.aggression, accuracy: s.accuracy }));
}

window.initNPCConfig  = initNPCConfig;
window.resetNPCConfig = resetNPCConfig;
window.getNPCConfigs  = getNPCConfigs;
