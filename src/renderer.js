const cardsEl = document.querySelector('#cards');
const statusLine = document.querySelector('#statusLine');
const refreshAllButton = document.querySelector('#refreshAllButton');
const pinButton = document.querySelector('#pinButton');
const configButton = document.querySelector('#configButton');

let config = null;
let snapshots = new Map();
let refreshTimer = null;

function formatTime(value) {
  if (!value) return '아직 없음';
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function render() {
  cardsEl.innerHTML = config.sources.map((source) => {
    const state = snapshots.get(source.id);
    const snippets = state?.snippets?.length
      ? state.snippets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
      : '<li class="muted">아직 사용량 문구를 찾지 못했습니다. 창에서 로그인 후 새로고침하세요.</li>';
    const preview = state?.visibleTextPreview
      ? `<details><summary>페이지 텍스트 미리보기</summary><p>${escapeHtml(state.visibleTextPreview)}</p></details>`
      : '';
    const loginBadge = state?.loginLikely ? '<span class="badge warn">로그인 필요 가능성</span>' : '<span class="badge ok">연결됨</span>';

    return `
      <article class="card" style="--accent: ${escapeHtml(source.accent)}">
        <div class="cardHead">
          <div>
            <h2>${escapeHtml(source.label)}</h2>
            <p>${escapeHtml(new URL(source.url).host)}</p>
          </div>
          ${state ? loginBadge : '<span class="badge idle">대기</span>'}
        </div>
        <ul class="snippets">${snippets}</ul>
        ${preview}
        <div class="cardMeta">마지막 캡처: ${formatTime(state?.capturedAt)}</div>
        <div class="cardActions">
          <button data-action="open" data-id="${escapeHtml(source.id)}">창 열기</button>
          <button data-action="refresh" data-id="${escapeHtml(source.id)}">캡처</button>
        </div>
      </article>`;
  }).join('');
}

async function refreshSource(id) {
  const source = config.sources.find((item) => item.id === id);
  statusLine.textContent = `${source?.label || id} 캡처 중...`;
  try {
    const data = await window.usageMonitor.snapshotSource(id);
    snapshots.set(id, data);
    statusLine.textContent = `${data.label} 업데이트 완료 · ${formatTime(data.capturedAt)}`;
  } catch (error) {
    statusLine.textContent = `${source?.label || id} 업데이트 실패: ${error.message}`;
  }
  render();
}

async function refreshAll() {
  statusLine.textContent = '전체 소스 캡처 중...';
  refreshAllButton.disabled = true;
  try {
    const results = await window.usageMonitor.snapshotAll();
    for (const result of results) {
      if (result.ok) snapshots.set(result.data.id, result.data);
      else console.warn('snapshot failed', result);
    }
    const successCount = results.filter((result) => result.ok).length;
    statusLine.textContent = `${successCount}/${results.length}개 업데이트 완료 · ${formatTime(new Date().toISOString())}`;
  } finally {
    refreshAllButton.disabled = false;
    render();
  }
}

cardsEl.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === 'open') {
    await window.usageMonitor.openSource(id);
    statusLine.textContent = '사용량 창을 열었습니다. 로그인 후 캡처를 눌러주세요.';
  }
  if (button.dataset.action === 'refresh') {
    await refreshSource(id);
  }
});

refreshAllButton.addEventListener('click', refreshAll);
pinButton.addEventListener('click', async () => {
  const pinned = await window.usageMonitor.toggleAlwaysOnTop();
  pinButton.classList.toggle('active', pinned);
  statusLine.textContent = pinned ? '항상 위에 고정됨' : '항상 위 고정 해제됨';
});
configButton.addEventListener('click', () => window.usageMonitor.openConfig());

async function init() {
  config = await window.usageMonitor.getConfig();
  render();
  statusLine.textContent = '준비 완료. 먼저 각 창에서 로그인하세요.';
  refreshTimer = setInterval(refreshAll, config.refreshIntervalMs);
}

window.addEventListener('beforeunload', () => {
  if (refreshTimer) clearInterval(refreshTimer);
});

init();
