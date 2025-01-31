// Global Variables
let currentTool = 'floor';
let characters = [];
let selectedCharacter = null;
let currentCharacterId = null;
let selectedValues = new Set();
let characterCreationState = {
    step: 1,
    selectedRace: null,
    selectedClass: null,
    stats: null
};

// Game Data
const races = [
    {
        name: 'Dragonborn',
        description: 'Draconic humanoids with breath weapons and proud warrior culture.',
        traits: ['+2 Strength, +1 Charisma', 'Breath Weapon', 'Damage Resistance']
    },
    {
        name: 'Dwarf',
        description: 'Hardy miners and warriors with strong traditions.',
        traits: ['+2 Constitution', 'Darkvision', 'Dwarven Resilience']
    },
    {
        name: 'Elf',
        description: 'Graceful, long-lived people of otherworldly beauty.',
        traits: ['+2 Dexterity', 'Darkvision', 'Keen Senses']
    },
    {
        name: 'Halfling',
        description: 'Small but brave folk with luck on their side.',
        traits: ['+2 Dexterity', 'Lucky', 'Brave']
    },
    {
        name: 'Human',
        description: 'Versatile and ambitious, humans are the most adaptable race.',
        traits: ['+1 to All Ability Scores', 'Extra Language', 'Extra Skill']
    }
];

const classes = [
    {
        name: 'Fighter',
        description: 'Masters of martial combat, skilled with weapons and armor.',
        features: ['Second Wind', 'Action Surge', 'Martial Archetype']
    },
    {
        name: 'Wizard',
        description: 'Scholarly magic-users who wield powerful spells.',
        features: ['Spellcasting', 'Arcane Recovery', 'Arcane Tradition']
    },
    {
        name: 'Rogue',
        description: 'Skilled tricksters and precision strikers.',
        features: ['Sneak Attack', 'Cunning Action', 'Roguish Archetype']
    },
    {
        name: 'Cleric',
        description: 'Divine spellcasters who serve deities.',
        features: ['Spellcasting', 'Divine Domain', 'Channel Divinity']
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initializeStatListeners();
});

// Map Functions
function initializeMap() {
    const map = document.getElementById('map');
    for (let i = 0; i < 300; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.onclick = handleTileClick;
        map.appendChild(tile);
    }
}

function setTool(tool) {
    currentTool = tool;
    selectedCharacter = null;
}

function handleTileClick(e) {
    if (selectedCharacter) {
        placeCharacter(e.target);
    } else {
        e.target.style.background = currentTool === 'floor' ? 'white' : '#666';
    }
}

// Character Creation Functions
function openCharacterSheet() {
    document.getElementById('charSheet').style.display = 'block';
    updateCharacterCreationStep(1);
    selectedValues.clear();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function rollStats() {
    const rolls = [];
    for (let i = 0; i < 6; i++) {
        let fourDice = [];
        for (let j = 0; j < 4; j++) {
            fourDice.push(Math.floor(Math.random() * 6) + 1);
        }
        fourDice.sort((a, b) => b - a);
        const sum = fourDice[0] + fourDice[1] + fourDice[2];
        rolls.push({
            value: sum,
            rolls: fourDice
        });
    }
    return rolls;
}

function updateCharacterCreationStep(step) {
    const stepContent = document.getElementById('creation-steps');
    switch(step) {
        case 1:
            stepContent.innerHTML = `
                <h3>Step 1: Choose Your Race</h3>
                <div class="race-grid">
                    ${races.map(race => `
                        <div class="race-card" onclick="selectRace('${race.name}')">
                            <h4>${race.name}</h4>
                            <p>${race.description}</p>
                            <ul>
                                ${race.traits.map(trait => `<li>${trait}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                <button onclick="nextStep(2)" disabled id="race-next">Next</button>
            `;
            break;
        case 2:
            stepContent.innerHTML = `
                <h3>Step 2: Choose Your Class</h3>
                <div class="class-grid">
                    ${classes.map(cls => `
                        <div class="class-card" onclick="selectClass('${cls.name}')">
                            <h4>${cls.name}</h4>
                            <p>${cls.description}</p>
                            <ul>
                                ${cls.features.map(feature => `<li>${feature}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                <div class="step-navigation">
                    <button onclick="previousStep(1)">Previous</button>
                    <button onclick="nextStep(3)" disabled id="class-next">Next</button>
                </div>
            `;
            break;
        case 3:
            const rolls = rollStats();
            stepContent.innerHTML = `
                <h3>Step 3: Roll Your Stats</h3>
                <div class="stats-roll-container">
                    <div class="rolls-display">
                        ${rolls.map((roll, index) => `
                            <div class="roll-result">
                                <span>Roll ${index + 1}: ${roll.value}</span>
                                <small>(${roll.rolls.join(', ')})</small>
                            </div>
                        `).join('')}
                    </div>
                    <button onclick="rerollStats()">Reroll</button>
                    <div class="stat-assignment">
                        ${['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']
                            .map(stat => `
                                <div class="stat-assign-row">
                                    <label>${stat}:</label>
                                    <select onchange="selectStat('${stat.toLowerCase()}', this.value)" 
                                            id="${stat.toLowerCase()}-assign">
                                        <option value="">Choose a value</option>
                                        ${rolls.map((roll, index) => `
                                            <option value="${roll.value}">
                                                ${roll.value} (Roll ${index + 1})
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            `).join('')}
                    </div>
                </div>
                <div class="step-navigation">
                    <button onclick="previousStep(2)">Previous</button>
                    <button onclick="finishCharacterCreation()" disabled id="stats-next">Finish</button>
                </div>
            `;
            break;
    }
}

function selectRace(raceName) {
    characterCreationState.selectedRace = raceName;
    document.getElementById('race-next').disabled = false;
    document.querySelectorAll('.race-card').forEach(card => {
        card.classList.remove('selected');
        if (card.querySelector('h4').textContent === raceName) {
            card.classList.add('selected');
        }
    });
}

function selectClass(className) {
    characterCreationState.selectedClass = className;
    document.getElementById('class-next').disabled = false;
    document.querySelectorAll('.class-card').forEach(card => {
        card.classList.remove('selected');
        if (card.querySelector('h4').textContent === className) {
            card.classList.add('selected');
        }
    });
}

function selectStat(statName, value) {
    const select = document.getElementById(`${statName}-assign`);
    const oldValue = select.value;
    
    if (oldValue) {
        selectedValues.delete(oldValue);
    }
    
    if (value) {
        selectedValues.add(value);
    }
    
    updateStatAssignment();
}

function updateStatAssignment() {
    const stats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    let allAssigned = true;

    const usedValues = new Set();
    stats.forEach(stat => {
        const value = document.getElementById(`${stat}-assign`).value;
        if (value) {
            usedValues.add(value);
        } else {
            allAssigned = false;
        }
    });

    stats.forEach(stat => {
        const select = document.getElementById(`${stat}-assign`);
        const currentValue = select.value;
        const rolls = Array.from(document.querySelectorAll('.roll-result')).map(el => 
            parseInt(el.querySelector('span').textContent.split(':')[1].trim())
        );
        
        select.innerHTML = '<option value="">Choose a value</option>';
        
        rolls.forEach((roll, index) => {
            if (!usedValues.has(roll.toString()) || roll.toString() === currentValue) {
                const option = document.createElement('option');
                option.value = roll;
                option.text = `${roll} (Roll ${index + 1})`;
                option.selected = roll.toString() === currentValue;
                select.appendChild(option);
            }
        });
    });

    document.getElementById('stats-next').disabled = !allAssigned;
}

function nextStep(step) {
    characterCreationState.step = step;
    updateCharacterCreationStep(step);
}

function previousStep(step) {
    characterCreationState.step = step;
    updateCharacterCreationStep(step);
}

function rerollStats() {
    selectedValues.clear();
    updateCharacterCreationStep(3);
}

function finishCharacterCreation() {
    const stats = {
        str: parseInt(document.getElementById('strength-assign').value),
        dex: parseInt(document.getElementById('dexterity-assign').value),
        con: parseInt(document.getElementById('constitution-assign').value),
        int: parseInt(document.getElementById('intelligence-assign').value),
        wis: parseInt(document.getElementById('wisdom-assign').value),
        cha: parseInt(document.getElementById('charisma-assign').value)
    };

    const character = {
        id: Date.now(),
        name: document.getElementById('charName').value,
        race: characterCreationState.selectedRace,
        class: characterCreationState.selectedClass,
        level: 1,
        stats: stats,
        color: document.getElementById('charColor').value
    };

    characters.push(character);
    updateCharacterList();
    closeModal('charSheet');
    selectedValues.clear();
}

// Stats Management
function initializeStatListeners() {
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {
        document.getElementById(ability).addEventListener('change', () => {
            updateModifier(ability);
        });
    });
}

function updateModifier(ability) {
    const score = document.getElementById(ability).value;
    const mod = Math.floor((parseInt(score) - 10) / 2);
    document.getElementById(`${ability}Mod`).textContent = 
        (mod >= 0 ? '+' : '') + mod;
}

function openStats(id) {
    currentCharacterId = id;
    const character = characters.find(c => c.id === id);
    if (character && character.stats) {
        document.getElementById('charInfo').innerHTML = `
            <h3>${character.name}</h3>
            <p>Race: ${character.race}</p>
            <p>Class: ${character.class}</p>
            <p>Level: ${character.level}</p>
        `;
        
        Object.keys(character.stats).forEach(stat => {
            document.getElementById(stat).value = character.stats[stat];
            updateModifier(stat);
        });
    }
    document.getElementById('statsSheet').style.display = 'block';
}

function saveStats() {
    const character = characters.find(c => c.id === currentCharacterId);
    if (character) {
        character.stats = {
            str: document.getElementById('str').value,
            dex: document.getElementById('dex').value,
            con: document.getElementById('con').value,
            int: document.getElementById('int').value,
            wis: document.getElementById('wis').value,
            cha: document.getElementById('cha').value
        };
        closeModal('statsSheet');
        updateCharacterList();
    }
}

// Character Management
function updateCharacterList() {
    const list = document.getElementById('character-list');
    list.innerHTML = '<h3>Characters</h3>';
    characters.forEach(char => {
        const div = document.createElement('div');
        div.className = 'character-item';
        div.innerHTML = `
            <span>${char.name} (Level ${char.level} ${char.class})</span>
            <div class="button-group">
                <button onclick="openStats(${char.id})">Stats</button>
                <button onclick="selectCharacter(${char.id})">Place</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function selectCharacter(id) {
    selectedCharacter = characters.find(c => c.id === id);
}

function placeCharacter(tile) {
    if (!selectedCharacter) return;
    const charDiv = document.createElement('div');
    charDiv.style.width = '80%';
    charDiv.style.height = '80%';
    charDiv.style.backgroundColor = selectedCharacter.color;
    charDiv.style.margin = 'auto';
    charDiv.style.borderRadius = '50%';
    tile.innerHTML = '';
    tile.appendChild(charDiv);
    selectedCharacter = null;
}