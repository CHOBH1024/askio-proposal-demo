// 화면 전환과 버튼 연결
let PAGE = 'home', TAB = null;
function parse() {
  const [p, t] = location.hash.replace(/^#\/?/, '').split('/');
  PAGE = LABEL[p] ? p : 'home';
  TAB = TABS[PAGE] ? ((TABS[PAGE].find(x => x[0] === t) || TABS[PAGE][0])[0]) : null;
}
function render() {
  parse();
  const key = TAB ? PAGE + '/' + TAB : PAGE;
  const [title, sub] = TITLE[PAGE];
  let body;
  try { body = (V[key] || (() => '<div class="empty">준비 중</div>'))(); } catch (err) { console.error(err); body = '<div class="note rd">화면을 그리다 문제가 생겼습니다: ' + esc(err.message) + '</div>'; }
  const btn = PAGE === 'expenses' ? '<button class="btn p" data-a="newExp">+ 지출 등록</button>' : '';
  const scope = PAGE === 'settings' || PAGE === 'help' ? '' : '<div class="scopeline">≋ <b>전체 업무</b> · ' + esc(ME().name) + ' ' + esc(ME().dept) + ' ' + esc(ME().title) + '(' + ROLE(ME()) + ')로 보는 중</div>';
  $('#app').innerHTML = '<div class="app">' + sidebar(PAGE) + '<div class="main">' + topbar(PAGE) + '<div class="body"><div class="head"><div><div class="k">ACCOUNTING WORKSPACE</div><h1>' + title + '</h1><p>' + sub + '</p></div>' + btn + '</div>' +
    scope + tabsHtml(PAGE, TAB) + body + '</div></div></div>';
  document.title = (TAB ? TABS[PAGE].find(x => x[0] === TAB)[1] + ' · ' : '') + LABEL[PAGE] + ' · 아스키오 제안 시연';
}
document.addEventListener('click', ev => {
  const stop = ev.target.closest('[data-stop]');
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  if (stop && el.contains(stop)) return; // 체크박스 칸 클릭은 줄 열기로 가지 않음
  const f = ACT[el.dataset.a];
  if (!f) return;
  if (el.tagName === 'A') ev.preventDefault();
  ev.stopPropagation();
  f(Object.assign({}, el.dataset), el);
});
document.addEventListener('change', ev => {
  if (ev.target.id === 'whoSel') { S.me = ev.target.value; save(); close(); render(); toast(ME().name + ' ' + ME().title + '(' + ROLE(ME()) + ') 화면입니다.'); }
});
document.addEventListener('click', ev => {
  if (ev.target.id === 'resetBtn') modal('<h2>처음 상태로 되돌릴까요?</h2><p>이 브라우저에서 바꾼 내용이 모두 지워지고 예시 자료로 돌아갑니다.</p><div class="row end"><button class="btn" data-a="close">취소</button><button class="btn p" id="resetOk">되돌리기</button></div>');
  if (ev.target.id === 'resetOk') { const me = S.me; fresh(); S.me = me; save(); F = { st: 'all', grp: 'event' }; close(); render(); toast('처음 상태로 돌렸습니다.'); }
  if (ev.target.id === 'menuBtn') $('#side').classList.toggle('open');
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
window.addEventListener('hashchange', () => { close(); render(); window.scrollTo(0, 0); });
S = load();
if (!S) fresh();
render();
