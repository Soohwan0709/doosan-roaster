const KBO_URL = encodeURIComponent('https://www.koreabaseball.com/Player/Register.aspx');
// Use AllOrigins as a reliable CORS proxy
const PROXY_URL = `https://api.allorigins.win/get?url=${KBO_URL}`;
const UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hr

const positions = ['투수', '포수', '내야수', '외야수'];

document.addEventListener('DOMContentLoaded', () => {
    fetchRoster();
    setInterval(fetchRoster, UPDATE_INTERVAL);
    
    document.getElementById('retry-btn').addEventListener('click', fetchRoster);
});

async function fetchRoster() {
    showLoader();
    try {
        const response = await fetch(PROXY_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const html = data.contents;
        
        if (!html) throw new Error('No content received from CORS proxy');
        
        parseAndRender(html);
        updateTimestamp();
        showContent();
    } catch (error) {
        console.error('Fetch error:', error);
        showError(error.message);
    }
}

function parseAndRender(htmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    // Find all roster tables
    const tables = doc.querySelectorAll('table.tNData');
    
    // Reset grids
    positions.forEach(pos => {
        const listDiv = document.getElementById(`list-${pos}`);
        if(listDiv) listDiv.innerHTML = '';
        
        const countDiv = document.getElementById(`count-${pos}`);
        if(countDiv) countDiv.textContent = '0';
    });
    
    tables.forEach(table => {
        const thead = table.querySelector('thead tr');
        if (!thead) return;
        
        const ths = thead.querySelectorAll('th');
        if (ths.length < 2) return;
        
        const positionName = ths[1].textContent.trim(); // "투수", "포수", "내야수", "외야수" etc.
        
        // We only care about Players
        if (!positions.includes(positionName)) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        const players = [];
        
        rows.forEach(row => {
            const tds = row.querySelectorAll('td');
            if (tds.length === 1) {
                // Empty state message (e.g. "당일 1군 등록된 감독이 없습니다.")
                return;
            }
            if (tds.length >= 5) {
                const number = tds[0].textContent.trim();
                const nameLink = tds[1].querySelector('a');
                const name = nameLink ? nameLink.textContent.trim() : tds[1].textContent.trim();
                const profileUrl = nameLink ? 'https://www.koreabaseball.com' + nameLink.getAttribute('href') : '#';
                const type = tds[2].textContent.trim(); // 우투좌타 등
                const dob = tds[3].textContent.trim(); // 생년월일
                
                players.push({ number, name, profileUrl, type, dob });
            }
        });
        
        renderCategory(positionName, players);
    });
}

function renderCategory(position, players) {
    const listDiv = document.getElementById(`list-${position}`);
    const countDiv = document.getElementById(`count-${position}`);
    if (!listDiv || !countDiv) return;
    
    countDiv.textContent = players.length;
    
    if (players.length === 0) {
        listDiv.innerHTML = '<div class="empty-state">현재 등록된 선수가 없습니다.</div>';
        return;
    }
    
    let html = '';
    players.forEach(p => {
        const nameHtml = p.profileUrl !== '#' 
            ? `<a href="${p.profileUrl}" target="_blank" class="player-name player-name-link">${p.name}</a>` 
            : `<div class="player-name">${p.name}</div>`;
            
        html += `
            <div class="player-card">
                <div class="player-number">${p.number}</div>
                <div class="player-info">
                    ${nameHtml}
                    <div class="player-meta">
                        <span>${p.type}</span>
                        <span class="meta-divider">|</span>
                        <span>${p.dob}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    listDiv.innerHTML = html;
}

function updateTimestamp() {
    const now = new Date();
    const formatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 업데이트`;
    document.getElementById('last-updated').textContent = formatted;
}

function showLoader() {
    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('error-message').classList.add('hidden');
    document.getElementById('roster-content').classList.add('hidden');
}

function showContent() {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('error-message').classList.add('hidden');
    document.getElementById('roster-content').classList.remove('hidden');
}

function showError(msg) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('roster-content').classList.add('hidden');
    const errContainer = document.getElementById('error-message');
    errContainer.classList.remove('hidden');
    document.getElementById('error-text').textContent = msg + " (외부 데이터 요청이 차단되었을 수 있습니다.)";
}
