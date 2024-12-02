let currentTool = 'floor';
let characters = [];
let selectedCharacter = null;
let currentCharacterId = null;

document.addEventListener('DOMContentLoaded', function() {
    const map = document.getElementById('map');
    for (let i = 0; i < 300; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.onclick = handleTileClick;
        map.appendChild(tile);
    }

    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {
        document.getElementById(ability).addEventListener('change', () => {
            updateModifier(ability);
        });
    });
});

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

function openCharacterSheet() {
    document.getElementById('charSheet').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function saveCharacter() {
    const name = document.getElementById('charName').value;
    if (!name) {
        alert('Please enter a character name');
        return;
    }

    const character = {
        id: Date.now(),
        name: name,
        class: document.getElementById('charClass').value,
        color: document.getElementById('charColor').value,
        stats: {
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10
        }
    };

    characters.push(character);
    updateCharacterList();
    closeModal('charSheet');
    document.getElementById('charName').value = '';
}

function updateCharacterList() {
    const list = document.getElementById('character-list');
    list.innerHTML = '<h3>Characters</h3>';
    characters.forEach(char => {
        const div = document.createElement('div');
        div.className = 'character-item';
        div.innerHTML = `
            <span>${char.name} (${char.class})</span>
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

function openStats(id) {
    currentCharacterId = id;
    const character = characters.find(c => c.id === id);
    if (character && character.stats) {
        document.getElementById('charInfo').innerHTML = `
            <h3>${character.name}</h3>
            <p>Class: ${character.class}</p>
        `;
        
        Object.keys(character.stats).forEach(stat => {
            document.getElementById(stat).value = character.stats[stat];
            updateModifier(stat);
        });
    }
    document.getElementById('statsSheet').style.display = 'block';
}

function updateModifier(ability) {
    const score = document.getElementById(ability).value;
    const mod = Math.floor((parseInt(score) - 10) / 2);
    document.getElementById(`${ability}Mod`).textContent = 
        (mod >= 0 ? '+' : '') + mod;
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