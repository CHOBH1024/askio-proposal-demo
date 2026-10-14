// 공통: 상태 저장, 결재선 계산, 감사 기록, 화면 틀, 팝업
const KEY = 'askio-proposal-v1';
const TODAY = '2026-10-14';
let S;

function load() {
  try { const t = localStorage.getItem(KEY); if (t) { const o = JSON.parse(t); if (o && o.v === 1) return o; } } catch (e) { }
  return null;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
function fresh() {
  S = SEED();
  S.expenses.forEach(e => {
    e.steps = buildSteps(e);
    if (e.status === 'draft') return;
    e.cur = Math.min(e._done, e.steps.length);
    e.steps.forEach((s, i) => { if (i < e.cur) { s.done = true; s.by = s.uid || pickRole(s.role); s.at = addDay(e.date, 1 + i) + ' 10:0' + i; } });
    if (e.status === 'rejected') e.steps[0].back = true;
    delete e._done;
  });
  log('u7', '시연 자료 준비', '처음 상태');
  save();
}

/* ---------- 작은 도구 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = n => (Math.round(Number(n) || 0)).toLocaleString('ko-KR');
const U = id => S.users.find(u => u.id === id) || { name: '?', dept: '', title: '' };
const ME = () => U(S.me);
const X = id => S.expenses.find(e => e.id === id);
const EV = id => S.events.find(e => e.id === id);
const nid = p => p + (++S.seq);
function addDay(d, n) { const t = new Date(d + 'T00:00:00'); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }
function nowStamp() { const d = new Date(); return TODAY + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function pickRole(role) { const u = S.users.find(x => x.role === role); return u ? u.id : ''; }
function rule(date) {
  const vs = S.rules.filter(r => r.from <= (date || TODAY)).sort((a, b) => a.from < b.from ? 1 : -1);
  return (vs[0] || S.rules[0]).v;
}
function ruleVer(date) { const vs = S.rules.filter(r => r.from <= (date || TODAY)).sort((a, b) => a.from < b.from ? 1 : -1); return (vs[0] || S.rules[0]).ver; }
function sw(dept, key) { return !!(S.switches[dept] && S.switches[dept][key]); }

/* ---------- 결재선 (M1) ---------- */
function chainFor(uid, dept, amt, kind) {
  const steps = [];
  const line = (S.lines[dept] || []).filter(a => a.uid !== uid);
  let ok = false;
  for (const a of line) {
    steps.push({ uid: a.uid, label: '결재', lim: a.limit });
    if (a.limit >= amt) { ok = true; break; }
  }
  if (!ok) {
    const ex = (S.lines['임원실'] || []).find(a => a.uid !== uid);
    if (ex) steps.push({ uid: ex.uid, label: '전결', lim: 0 });
  }
  if (kind === 'claim') steps.push({ role: 'ga', label: '총무 확인' });
  steps.push({ role: 'finance', label: '재정 확인' });
  return steps;
}
function buildSteps(e) { return chainFor(e.uid, e.dept, e.amt, e.kind); }
function stepWho(s) {
  if (s.dele) return U(s.dele).name + '(대결)';
  if (s.uid) return U(s.uid).name + ' ' + U(s.uid).title;
  return s.label === '총무 확인' ? '총무국 담당' : '재정 담당';
}
function canAct(e, uid) {
  if (e.status !== 'progress') return false;
  const s = e.steps[e.cur]; if (!s) return false;
  const u = U(uid);
  if (s.dele) return s.dele === uid;
  if (s.uid) return s.uid === uid;
  return u.role === s.role;
}
function chainHtml(steps, cur, status) {
  return '<div class="chain"><span class="done">작성</span>' + steps.map((s, i) => {
    let c = '';
    if (status === 'confirmed' || status === 'scheduled' || status === 'paid' || i < cur) c = 'done';
    else if (status === 'progress' && i === cur) c = 'cur';
    return '<i>›</i><span class="' + c + '">' + esc(s.label) + ' · ' + esc(stepWho(s)) + '</span>';
  }).join('') + '</div>';
}

/* ---------- 상태 이름 ---------- */
const STATUS = { draft: ['작성 중', 'g'], progress: ['결재 중', 'b'], rejected: ['보완 요청', 'rd'], confirmed: ['확인 완료', 't'], scheduled: ['지급 예정', 'v'], paid: ['지급 완료', 'ok'] };
function stLabel(e) {
  if (e.status === 'progress') { const s = e.steps[e.cur]; return s ? s.label + ' 대기' : '결재 중'; }
  if (e.status === 'confirmed' && e.kind === 'card') return '확인 완료';
  if (e.status === 'confirmed') return '지급 대기';
  return STATUS[e.status][0];
}
function stBadge(e) {
  let c = STATUS[e.status][1];
  if (e.status === 'progress' && e.steps[e.cur] && e.steps[e.cur].role === 'ga') c = 'a';
  return '<span class="bd ' + c + '">' + stLabel(e) + '</span>';
}
// 받을 돈 단계 (M5): 작성 중 > 결재 중 > 총무 확인 > 재정 확인 > 지급 예정 > 받음
const MSTAGE = ['작성 중', '결재 중', '총무 확인', '재정 확인', '지급 예정', '받음'];
const MCOL = ['#9aa7b1', '#1d6fd8', '#e9a020', '#0f766e', '#6d4fd6', '#15803d'];
function mstage(e) {
  if (e.status === 'draft' || e.status === 'rejected') return 0;
  if (e.status === 'paid') return 5;
  if (e.status === 'scheduled') return 4;
  if (e.status === 'confirmed') return 4;
  const s = e.steps[e.cur];
  if (!s) return 1;
  if (s.role === 'ga') return 2;
  if (s.role === 'finance') return 3;
  return 1;
}
const isMoney = e => e.kind === 'personal' || e.kind === 'claim';

/* ---------- 감사 기록 (A2) ---------- */
function hash(str) { // 시연용 53비트 해시
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
function log(who, act, ref) {
  const prev = S.audit.length ? S.audit[S.audit.length - 1].h : '0'.repeat(14);
  const t = nowStamp();
  S.audit.push({ t, who, act, ref, prev, h: hash(prev + '|' + t + '|' + who + '|' + act + '|' + ref) });
}
function verifyAudit() {
  let prev = '0'.repeat(14);
  for (let i = 0; i < S.audit.length; i++) {
    const a = S.audit[i];
    if (a.prev !== prev || a.h !== hash(prev + '|' + a.t + '|' + a.who + '|' + a.act + '|' + a.ref)) return i;
    prev = a.h;
  }
  return -1;
}
function notify(to, msg) { S.notes.unshift({ to, t: nowStamp(), msg, read: false }); }

/* ---------- 예산 (M4) ---------- */
const ELAPSED = (9 + 14 / 31) / 12; // 10월 14일 기준 경과율
function spentOf(e) { return e.split ? e.split : [{ item: e.item, amt: e.amt, event: e.event }]; }
function budgetUse(dept, item, extra) {
  const b = S.budgets.find(x => x.dept === dept && x.item === item);
  if (!b) return null;
  let live = 0;
  S.expenses.forEach(e => { if ((e.bdept || e.dept) === dept && e.status !== 'draft' && e.status !== 'rejected' && e.date >= '2026-10-01') spentOf(e).forEach(p => { if (p.item === item) live += p.amt; }); });
  const used = b.base + live + (extra || 0);
  return { b, used, rate: used / b.annual, pace: ELAPSED, fc: Math.round((b.base + live) / ELAPSED), left: b.annual - used };
}

/* ---------- 중복 점검 (M8) ---------- */
function vkey(v) { return String(v || '').replace(/\(주\)|㈜|\s|점$/g, '').slice(0, 4); }
function findDup(o, skipId) {
  return S.expenses.find(e => e.id !== skipId && e.date === o.date && Math.abs(e.amt - o.amt) <= 0 && vkey(e.vendor) === vkey(o.vendor) && e.uid === o.uid);
}

/* ---------- 화면 틀 ---------- */
function ico(name) {
  const P = {
    home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    inbox: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    expenses: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    review: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    cards: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    events: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
    operations: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    statistics: '<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>',
    audit: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    budget: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
    settle: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
    people: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>',
  };
  return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + P[name] + '</svg>';
}
const MENU = [['home', '업무 홈'], ['inbox', '할 일·알림'], ['expenses', '지출·증빙'], ['review', '검토함'], ['cards', '카드 대조'], ['events', '행사·프로젝트'],
  ['operations', '운영 점검'], ['statistics', '지출 통계'], ['audit', '감사 열람'], ['budget', '예산 현황'], ['settle', '결산·출력'], ['people', '부서·직원 관리']];
const LABEL = Object.assign(Object.fromEntries(MENU), { settings: '서비스 설정', help: '업무 안내' });
// 페이지 안 탭. 두 번째 값이 1이면 이번 제안으로 새로 생기는 탭
const TABS = {
  expenses: [['list', '내 지출', 0], ['claims', '총무국 청구', 1], ['money', '내가 받을 돈', 1]],
  review: [['check', '검토', 0], ['approve', '결재 차례', 1], ['ga', '총무 확인', 1]],
  settle: [['report', '결산', 0], ['pay', '지급·송금', 1], ['journal', '전표·G20', 1], ['advance', '가지급·선급', 1]],
  inbox: [['todo', '할 일', 0], ['cal', '마감 달력', 1]],
  settings: [['view', '화면 설정', 0], ['account', '내 계정', 0], ['card', '카드 등록', 0], ['basis', '회계 기준', 0], ['org', '협회 운영', 0],
    ['rules', '규정값', 1], ['lines', '결재선', 1], ['journal', '분개 규칙', 1], ['switch', '기능 스위치', 1]],
};
const TITLE = {
  home: ['업무 홈', '내 할 일과 받을 돈, 결재 차례를 한눈에 봅니다.'],
  inbox: ['할 일·알림', '처리할 일과 알림, 이번 달 마감일을 모았습니다.'],
  expenses: ['지출·증빙', '지출을 등록하고 증빙을 붙여 제출합니다.'],
  review: ['검토함', '결재와 확인이 필요한 지출입니다.'],
  cards: ['카드 대조', '법인카드 사용 내역과 등록된 지출을 맞춰 봅니다.'],
  events: ['행사·프로젝트', '행사별 예산과 지출, 참가자를 관리합니다.'],
  operations: ['운영 점검', '월말 대사, 중복·이상 점검, 인수인계, 백업을 합니다.'],
  statistics: ['지출 통계', '예산과목·월·국별로 지출을 나눠 보고 과거 지출을 찾습니다.'],
  audit: ['감사 열람', '모든 처리 기록과 변조 여부를 확인합니다.'],
  budget: ['예산 현황', '예산 대비 집행과 연말 예상을 실시간으로 봅니다.'],
  settle: ['결산·출력', '지출결의서, 지급·송금, 전표를 만듭니다.'],
  people: ['부서·직원 관리', '부서와 직원, 결재 한도를 봅니다.'],
  settings: ['서비스 설정', '계정과 규정값, 결재선, 기능 켜기·끄기를 설정합니다.'],
  help: ['업무 안내', '이 시연 사이트에서 무엇을 눌러 보면 되는지 안내합니다.'],
};
const LOGO = '<div class="logo"><svg viewBox="0 0 64 48" width="46" height="34"><path d="M4 46 L26 2 L38 2 L60 46 L46 46 L32 17 L18 46 Z" fill="#0f766e"/><path d="M4 38 H60 V46 H4 Z" fill="#0f766e"/></svg><div><b>아스키오</b><small>A S K I O</small></div></div><div class="logo-sub">FFWPU 투명회계</div>';

function myQueue(uid) { return S.expenses.filter(e => canAct(e, uid)); }
function sidebar(page) {
  const q = myQueue(S.me).length;
  let h = '<aside class="side" id="side">' + LOGO + '<div class="scope"><span class="i">' + ico('budget') + '</span><div><small>내 업무 범위</small><b>전체 업무</b></div></div><div class="grp">회계 업무</div>';
  MENU.forEach(([k, l]) => { h += '<a class="mi ' + (k === page ? 'on' : '') + '" href="#/' + k + '">' + ico(k) + '<span>' + l + '</span>' + (k === 'review' && q ? '<em>' + q + '</em>' : '') + '</a>'; });
  h += '<div class="sep"></div><a class="mi ' + (page === 'settings' ? 'on' : '') + '" href="#/settings">' + ico('settings') + '<span>서비스 설정</span></a>';
  h += '<a class="mi ' + (page === 'help' ? 'on' : '') + '" href="#/help">' + ico('help') + '<span>업무 안내</span></a></aside>';
  return h;
}
function ROLE(u) { return { staff: '직원', approver: '결재자', exec: '임원', finance: '재정 담당', ga: '총무 확인 담당' }[u.role]; }
function topbar(page) {
  const unread = S.notes.filter(n => n.to === S.me && !n.read).length;
  const opts = S.users.map(u => '<option value="' + u.id + '"' + (u.id === S.me ? ' selected' : '') + '>' + u.name + ' · ' + u.dept + ' ' + u.title + ' (' + ROLE(u) + ')</option>').join('');
  return '<div class="top"><button class="btn s noprint" id="menuBtn" style="display:none">☰ 메뉴</button><span class="crumb">전체 업무 › <b>' + LABEL[page] + '</b></span><span class="search">⌕ 메뉴·지출 검색</span>' +
    '<a class="bell" href="#/inbox" title="알림">' + ico('inbox') + (unread ? '<em>' + unread + '</em>' : '') + '</a>' +
    '<label class="who">보는 사람 <select id="whoSel">' + opts + '</select></label></div>' +
    '<div class="demo">시연 사이트 · 이름·금액·계좌는 모두 예시이고, 입력한 내용은 이 브라우저에만 저장됩니다. 위 「보는 사람」을 바꾸면 결재자·재정 담당 화면이 됩니다.<button id="resetBtn">처음 상태로</button></div>';
}
function tabsHtml(page, tab) {
  if (!TABS[page]) return '';
  return '<div class="ptabs">' + TABS[page].map(([k, l, n]) => '<a class="pt ' + (k === tab ? 'on' : '') + '" href="#/' + page + '/' + k + '">' + l + (n ? '<i>새</i>' : '') + '</a>').join('') + '</div>';
}

/* ---------- 팝업·알림 ---------- */
function modal(html, wide) {
  close();
  const d = document.createElement('div');
  d.className = 'dim'; d.id = 'dim';
  d.innerHTML = '<div class="modal" role="dialog" aria-modal="true" style="' + (wide ? 'width:min(' + wide + 'px,100%)' : '') + '">' + html + '</div>';
  d.addEventListener('mousedown', ev => { if (ev.target === d) close(); });
  document.body.appendChild(d);
  const f = d.querySelector('input,select,textarea'); if (f) setTimeout(() => f.focus(), 30);
  return d;
}
function close() { const d = $('#dim'); if (d) d.remove(); }
function toast(msg) {
  $$('.toast').forEach(x => x.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
let ART = false; try { ART = window.self !== window.top; } catch (e) { ART = true; } // claude.ai 게시본처럼 틀 안에서 열리면 저장·인쇄가 막힘
if (ART) document.documentElement.classList.add('art');
function download(name, text, type) {
  if (ART) { // 게시된 페이지에서는 파일 저장이 막혀 있어 내용을 보여 주고 복사하게 함
    modal('<h2>' + esc(name) + '</h2><p class="mut">이 페이지에서는 파일을 바로 받을 수 없어 내용을 보여 드립니다. 복사해서 메모장이나 엑셀에 붙여 넣으세요.</p><textarea id="dlText" readonly rows="14" style="width:100%;border:1px solid #dfe6ea;border-radius:8px;padding:8px;font:12px Consolas,monospace">' + esc(text) + '</textarea><div class="row end" style="margin-top:10px"><button class="btn" data-a="close">닫기</button><button class="btn p" id="dlCopy">복사</button></div>', 760);
    $('#dlCopy').addEventListener('click', () => { const t = $('#dlText'); const sel = () => { t.focus(); t.select(); toast('선택했습니다. Ctrl+C로 복사하세요.'); }; try { navigator.clipboard.writeText(text).then(() => toast('복사했습니다.'), sel); } catch (e) { sel(); } });
    return;
  }
  const b = new Blob(['﻿' + text], { type: type || 'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function kp(label, val, sub, c, unit) { return '<div class="kp ' + (c || '') + '"><span>' + label + '</span><b>' + val + '<small>' + (unit == null ? '원' : unit) + '</small></b><em>' + (sub || '') + '</em></div>'; }
function bar(rate, pace) {
  const c = rate > 1 ? 'rd' : rate > pace + 0.05 ? 'w' : '';
  return '<div class="bar"><i class="' + c + '" style="width:' + Math.min(100, rate * 100).toFixed(1) + '%"></i>' + (pace ? '<em style="left:' + (pace * 100).toFixed(1) + '%" title="진도선"></em>' : '') + '</div>';
}
function accOf(uid) { return S.accounts[uid]; }
function accText(a) { return a ? a.bank + ' ' + a.no + ' (' + a.holder + ')' : '<span class="bd rd">계좌 없음</span>'; }
function payeeOf(e) { return e.other ? e.other : accOf(e.calc && e.calc.대상uid ? e.calc.대상uid : e.uid); }
function evName(id) { const v = EV(id); return v ? v.name : ''; }
