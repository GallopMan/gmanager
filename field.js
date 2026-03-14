// 축구장 선수 배치 기능

let players = [];
let fieldPlayers = [];
let subPlayers = [];
let reservePlayers = [];
let draggedElement = null;
let dragSource = null;

// 기본 포지션 (11명) - 참고용
const defaultPositions = [
    { x: 50, y: 15 },   // 골키퍼
    { x: 20, y: 30 },   // 수비수 1
    { x: 40, y: 30 },   // 수비수 2
    { x: 60, y: 30 },   // 수비수 3
    { x: 80, y: 30 },   // 수비수 4
    { x: 25, y: 50 },   // 미드필더 1
    { x: 50, y: 55 },   // 미드필더 2
    { x: 75, y: 50 },   // 미드필더 3
    { x: 20, y: 75 },   // 공격수 1
    { x: 50, y: 80 },   // 공격수 2
    { x: 80, y: 75 }    // 공격수 3
];

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('field.html 로드됨');
    initializeField();
});

// 필드 초기화
function initializeField() {
    console.log('필드 초기화 시작');

    // 팀 데이터 로드
    const teamDataStr = localStorage.getItem('currentTeam');
    const teamNameStr = localStorage.getItem('currentTeamName');

    let teamData = null;
    try {
        teamData = JSON.parse(teamDataStr);
    } catch (e) {
        console.log('팀 데이터 파싱 오류:', e);
    }

    if (!teamData) {
        players = [];
    } else {
        players = (teamData.players || []).map(p => ({
            ...p,
            id: p.number
        }));
    }

    // 팀 이름 표시
    const teamNameDisplay = document.getElementById('teamNameDisplay');
    if (teamNameDisplay && teamNameStr) {
        teamNameDisplay.textContent = teamNameStr;
    }

    // 저장된 배치 로드
    const savedSetup = localStorage.getItem('teamSetup');
    if (savedSetup) {
        try {
            const setup = JSON.parse(savedSetup);
            if (setup.fieldPlayers) {
                fieldPlayers = setup.fieldPlayers.map(p => ({ ...p, id: p.number }));
                subPlayers = (setup.subPlayers || []).map(p => ({ ...p, id: p.number }));
                reservePlayers = (setup.reservePlayers || []).map(p => ({ ...p, id: p.number }));
                console.log('저장된 배치 로드 완료');
            } else {
                fieldPlayers = [];
                subPlayers = [];
                reservePlayers = [...players];
            }
        } catch (e) {
            console.log('저장된 배치 로드 실패:', e);
            fieldPlayers = [];
            subPlayers = [];
            reservePlayers = [...players];
        }
    } else {
        fieldPlayers = [];
        subPlayers = [];
        reservePlayers = [...players];
    }

    updateFieldPlayers();
    updateSubPlayers();
    setupFieldDragDrop();
    updateTotalPlayers();
}

// 필드 선수 업데이트
function updateFieldPlayers() {
    const field = document.getElementById('soccerField');
    if (!field) return;

    field.querySelectorAll('.player-circle').forEach(el => el.remove());

    fieldPlayers.forEach((player) => {
        const circle = createPlayerCircle(player);
        field.appendChild(circle);
    });
}

// 선수 명단 패널 업데이트 (선발/교체/후보 3그룹)
function updateSubPlayers() {
    const container = document.getElementById('subPlayers');
    if (!container) return;
    container.innerHTML = '';

    container.appendChild(createRosterSection('선발', fieldPlayers, false));
    container.appendChild(createRosterSection('교체', subPlayers, true));
    container.appendChild(createRosterSection('후보', reservePlayers, true));
}

// 로스터 섹션 생성
function createRosterSection(label, playerList, deletable) {
    const groupClass = label === '선발' ? 'starter' : label === '교체' ? 'sub' : 'reserve';
    const section = document.createElement('div');
    section.className = 'roster-group';
    section.dataset.group = groupClass;

    const header = document.createElement('div');
    header.className = `roster-group-header roster-${groupClass}`;
    header.textContent = `${label} (${playerList.length}명)`;
    section.appendChild(header);

    if (playerList.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'roster-empty';
        empty.textContent = '없음';
        section.appendChild(empty);
    }

    playerList.forEach(player => {
        const item = document.createElement('div');
        item.className = 'roster-player-item';
        item.draggable = true;
        item.dataset.playerId = player.id;

        const roleBadge = document.createElement('span');
        roleBadge.className = `roster-role-badge role-${groupClass}`;
        roleBadge.textContent = label;
        item.appendChild(roleBadge);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'roster-player-name';
        nameSpan.textContent = player.name;
        item.appendChild(nameSpan);

        // 모든 선수 드래그 가능
        item.addEventListener('dragstart', (e) => {
            draggedElement = player;
            dragSource = groupClass;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('playerId', player.id);
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => item.classList.remove('dragging'));

        // 교체/후보만 삭제 버튼
        if (deletable) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'roster-delete-btn';
            deleteBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deletePlayer(player.id, groupClass === 'sub' ? 'sub' : 'reserve');
            };
            item.appendChild(deleteBtn);
        }

        section.appendChild(item);
    });

    // 섹션을 드롭 타겟으로 설정
    section.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        section.style.outline = '2px dashed #aaa';
        section.style.borderRadius = '6px';
    });

    section.addEventListener('dragleave', (e) => {
        if (!section.contains(e.relatedTarget)) {
            section.style.outline = '';
        }
    });

    section.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        section.style.outline = '';

        if (!draggedElement) return;
        if (dragSource === groupClass) return; // 같은 그룹이면 무시

        movePlayerToRosterGroup(draggedElement, dragSource, groupClass);

        draggedElement = null;
        dragSource = null;

        updateFieldPlayers();
        updateSubPlayers();
        updateTotalPlayers();
    });

    return section;
}

// 선수를 특정 그룹으로 이동
function movePlayerToRosterGroup(player, fromSource, toGroup) {
    if (fromSource === toGroup) return;

    // 현재 그룹에서 제거
    if (fromSource === 'field' || fromSource === 'starter') {
        const idx = fieldPlayers.findIndex(p => p.id === player.id);
        if (idx !== -1) fieldPlayers.splice(idx, 1);
    } else if (fromSource === 'sub') {
        const idx = subPlayers.findIndex(p => p.id === player.id);
        if (idx !== -1) subPlayers.splice(idx, 1);
    } else if (fromSource === 'reserve') {
        const idx = reservePlayers.findIndex(p => p.id === player.id);
        if (idx !== -1) reservePlayers.splice(idx, 1);
    }

    // 대상 그룹에 추가
    const p = { ...player };
    if (toGroup === 'starter') {
        p.x = p.x || 50;
        p.y = p.y || 50;
        fieldPlayers.push(p);
    } else if (toGroup === 'sub') {
        p.x = undefined;
        p.y = undefined;
        subPlayers.push(p);
    } else if (toGroup === 'reserve') {
        p.x = undefined;
        p.y = undefined;
        reservePlayers.push(p);
    }
}

// 선수 삭제 (교체/후보만 가능)
function deletePlayer(playerId, group) {
    if (!confirm('선수를 삭제하시겠습니까?')) return;

    if (group === 'sub') {
        subPlayers = subPlayers.filter(p => p.id !== playerId);
    } else {
        reservePlayers = reservePlayers.filter(p => p.id !== playerId);
    }

    updateSubPlayers();
    updateTotalPlayers();
}

// 플레이어 원 생성
function createPlayerCircle(player) {
    const circle = document.createElement('div');
    circle.className = 'player-circle';

    const posX = player.x !== undefined ? player.x : 50;
    const posY = player.y !== undefined ? player.y : 50;

    circle.style.left = posX + '%';
    circle.style.top = posY + '%';
    circle.draggable = true;
    circle.dataset.playerId = player.id;

    circle.innerHTML = `
        <div class="player-name">${player.name}</div>
    `;

    circle.addEventListener('dragstart', (e) => {
        draggedElement = player;
        dragSource = 'field';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('playerId', player.id);
        circle.classList.add('dragging');
    });

    circle.addEventListener('dragend', () => {
        circle.classList.remove('dragging');
    });

    return circle;
}

// 축구장 드래그 앤 드롭 설정
function setupFieldDragDrop() {
    const field = document.getElementById('soccerField');
    if (!field) return;

    field.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    field.addEventListener('drop', (e) => {
        e.preventDefault();

        if (!draggedElement) return;

        const rect = field.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (dragSource === 'sub') {
            const playerIndex = subPlayers.findIndex(p => p.id === draggedElement.id);
            if (playerIndex !== -1) {
                const player = subPlayers.splice(playerIndex, 1)[0];
                player.x = Math.max(5, Math.min(95, x));
                player.y = Math.max(5, Math.min(95, y));
                fieldPlayers.push(player);
            }
        } else if (dragSource === 'reserve') {
            const playerIndex = reservePlayers.findIndex(p => p.id === draggedElement.id);
            if (playerIndex !== -1) {
                const player = reservePlayers.splice(playerIndex, 1)[0];
                player.x = Math.max(5, Math.min(95, x));
                player.y = Math.max(5, Math.min(95, y));
                fieldPlayers.push(player);
            }
        } else if (dragSource === 'field') {
            const player = fieldPlayers.find(p => p.id === draggedElement.id);
            if (player) {
                player.x = Math.max(5, Math.min(95, x));
                player.y = Math.max(5, Math.min(95, y));
            }
        }

        draggedElement = null;
        dragSource = null;

        updateFieldPlayers();
        updateSubPlayers();
        updateTotalPlayers();
    });

    // 선수 명단 패널 드래그 앤 드롭 (필드 → 교체)
    const subSection = document.getElementById('subPlayers');
    if (!subSection) return;

    subSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        subSection.style.backgroundColor = '#f0f7ee';
    });

    subSection.addEventListener('dragleave', (e) => {
        const rect = subSection.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX >= rect.right ||
            e.clientY < rect.top || e.clientY >= rect.bottom) {
            subSection.style.backgroundColor = '';
        }
    });

    subSection.addEventListener('drop', (e) => {
        e.preventDefault();
        subSection.style.backgroundColor = '';

        if (dragSource === 'field' && draggedElement) {
            const playerIndex = fieldPlayers.findIndex(p => p.id === draggedElement.id);
            if (playerIndex !== -1) {
                const player = fieldPlayers.splice(playerIndex, 1)[0];
                player.x = undefined;
                player.y = undefined;
                subPlayers.push(player);  // 필드 → 교체
            }
        }

        draggedElement = null;
        dragSource = null;

        updateFieldPlayers();
        updateSubPlayers();
        updateTotalPlayers();
    });
}

// 선수 추가 (후보로 추가)
function addNewPlayer() {
    const input = document.getElementById('newPlayerName');
    const name = input.value.trim();

    if (!name) {
        alert('선수 이름을 입력하세요!');
        return;
    }

    const allPlayers = [...fieldPlayers, ...subPlayers, ...reservePlayers];
    const maxNumber = allPlayers.length > 0
        ? Math.max(...allPlayers.map(p => p.number))
        : 0;
    const newNumber = maxNumber + 1;

    const newPlayer = {
        id: newNumber,
        number: newNumber,
        name: name
    };

    reservePlayers.push(newPlayer);
    input.value = '';

    updateSubPlayers();
    updateTotalPlayers();
}

// 전체 선수 수 업데이트
function updateTotalPlayers() {
    const totalElement = document.getElementById('totalPlayers');
    if (totalElement) {
        const total = fieldPlayers.length + subPlayers.length + reservePlayers.length;
        totalElement.textContent = `전체 선수: ${total}명 (선발: ${fieldPlayers.length}명, 교체: ${subPlayers.length}명, 후보: ${reservePlayers.length}명)`;
    }
}

// 팀 배치 저장
function saveTeamSetup() {
    const teamName = localStorage.getItem('currentTeamName') || '우리팀';

    const allPlayers = [];

    fieldPlayers.forEach(player => {
        allPlayers.push({
            id: player.number,
            number: player.number,
            name: player.name,
            onField: true,
            role: 'starter',
            x: player.x,
            y: player.y
        });
    });

    subPlayers.forEach(player => {
        allPlayers.push({
            id: player.number,
            number: player.number,
            name: player.name,
            onField: false,
            role: 'sub'
        });
    });

    reservePlayers.forEach(player => {
        allPlayers.push({
            id: player.number,
            number: player.number,
            name: player.name,
            onField: false,
            role: 'reserve'
        });
    });

    const setup = {
        teamName: teamName,
        players: allPlayers,
        fieldPlayers: fieldPlayers,
        subPlayers: subPlayers,
        reservePlayers: reservePlayers,
        savedDate: new Date().toISOString()
    };

    localStorage.setItem('teamSetup', JSON.stringify(setup));

    const currentTeam = {
        name: teamName,
        players: allPlayers.map(p => ({
            id: p.number,
            number: p.number,
            name: p.name,
            onField: p.onField,
            role: p.role
        })),
        createdDate: new Date().toISOString()
    };
    localStorage.setItem('currentTeam', JSON.stringify(currentTeam));

    const message = document.getElementById('successMessage');
    if (message) {
        message.style.display = 'block';
        setTimeout(() => {
            message.style.display = 'none';
            window.location.href = 'index.html';
        }, 1500);
    } else {
        alert('팀 배치가 저장되었습니다!');
        window.location.href = 'index.html';
    }
}
