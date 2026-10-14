// 화면 1: 업무 홈, 할 일, 지출·증빙(내 지출·스캔·제출 점검·대체 사유서·다른 계좌), 총무국 청구, 내가 받을 돈
const V = {};
const ACT = {};
let F = { st: 'all', grp: 'event' };

/* ---------- 업무 홈 ---------- */
V.home = () => {
  const me = ME();
  const mine = S.expenses.filter(e => e.uid === me.id && isMoney(e));
  const owe = mine.filter(e => mstage(e) < 5).reduce((a, e) => a + e.amt, 0);
  const q = myQueue(me.id);
  const draft = S.expenses.filter(e => e.uid === me.id && (e.status === 'draft' || e.status === 'rejected'));
  const warn = S.budgets.filter(b => b.dept === me.dept).map(b => budgetUse(b.dept, b.item)).filter(x => x.rate > x.pace + 0.05);
  let h = '<div class="g4">' + kp('내가 받을 돈', won(owe), mine.filter(e => mstage(e) < 5).length + '건 진행 중', 't') + kp('결재·확인 차례', q.length, q.length ? '검토함에서 처리' : '없음', 'b', '건') +
    kp('작성 중·보완', draft.length, '제출 전 점검 필요', 'a', '건') + kp('예산 주의', warn.length, me.dept + ' 진도선 초과 과목', warn.length ? 'rd' : '', '개') + '</div>';
  h += '<div class="g2"><div class="c"><h3>할 일 <span class="mut">가까운 순</span></h3>' + todoList(me.id, 6) + '</div>';
  h += '<div class="c"><h3>바로 가기</h3><div class="qk"><a href="#/expenses/list" data-a="scan">스캔으로 등록</a><a href="#/expenses/claims">총무국 청구</a><a href="#/expenses/money">내가 받을 돈</a>' +
    '<a href="#/review/approve">결재 차례</a><a href="#/inbox/cal">마감 달력</a><a href="#/budget">예산 현황</a></div>' +
    '<h3 style="margin-top:14px">이번 주 마감</h3>' + calList(TODAY, addDay(TODAY, 7)) + '</div></div>';
  return h;
};

/* ---------- 할 일·알림 ---------- */
function todos(uid) {
  const u = U(uid), out = [];
  myQueue(uid).forEach(e => out.push({ d: e.date, t: (e.steps[e.cur].label) + ' 차례', m: U(e.uid).name + ' · ' + e.purpose + ' · ' + won(e.amt) + '원', go: e.id, c: 'b' }));
  S.expenses.filter(e => e.uid === uid && e.status === 'rejected').forEach(e => out.push({ d: e.date, t: '보완 요청', m: e.purpose + ' · ' + (e.reject || ''), go: e.id, c: 'rd' }));
  S.expenses.filter(e => e.uid === uid && e.status === 'draft' && !e.receipt && !e.sub).forEach(e => out.push({ d: e.date, t: '증빙 없음', m: e.vendor + ' ' + won(e.amt) + '원 · 대체 사유서를 쓰거나 영수증을 붙여 주세요', go: e.id, c: 'a' }));
  S.expenses.filter(e => e.uid === uid && e.status === 'draft' && (e.receipt || e.sub)).forEach(e => out.push({ d: e.date, t: '제출 전', m: e.vendor + ' ' + won(e.amt) + '원', go: e.id, c: 'g' }));
  S.advances.filter(a => a.uid === uid && !a.done).forEach(a => out.push({ d: a.due, t: a.due < TODAY ? '정산 기한 지남' : a.type + ' 정산', m: a.purpose + ' · ' + won(a.amt) + '원 · 기한 ' + a.due, href: '#/settle/advance', c: a.due < TODAY ? 'rd' : 'a' }));
  if (!accOf(uid)) out.push({ d: TODAY, t: '계좌 등록', m: '받을 계좌가 없습니다. 서비스 설정 > 내 계정에서 등록해 주세요.', href: '#/settings/account', c: 'rd' });
  return out.sort((a, b) => a.d < b.d ? -1 : 1);
}
function todoList(uid, n) {
  const t = todos(uid).slice(0, n || 99);
  if (!t.length) return '<div class="empty">처리할 일이 없습니다.</div>';
  return '<table class="tb"><tbody>' + t.map(x => '<tr class="click" ' + (x.go ? 'data-a="open" data-id="' + x.go + '"' : 'data-a="go" data-href="' + x.href + '"') + '><td style="width:118px"><span class="bd ' + x.c + '">' + x.t + '</span></td><td>' + esc(x.m) + '</td><td class="n mut">' + x.d.slice(5) + '</td></tr>').join('') + '</tbody></table>';
}
V['inbox/todo'] = () => {
  const ns = S.notes.filter(n => n.to === S.me);
  return '<div class="g2"><div class="c"><h3>할 일 <span class="mut">' + todos(S.me).length + '건</span></h3>' + todoList(S.me) + '</div>' +
    '<div class="c"><h3>알림 <span class="mut">' + ns.filter(n => !n.read).length + '건 안 읽음</span><span class="grow"></span><button class="btn s" data-a="readAll">모두 읽음</button></h3>' +
    (ns.length ? '<table class="tb"><tbody>' + ns.map(n => '<tr><td>' + (n.read ? '' : '<span class="bd t">새</span> ') + esc(n.msg) + '</td><td class="n mut">' + n.t.slice(5) + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">알림이 없습니다.</div>') + '</div></div>';
};
ACT.readAll = () => { S.notes.forEach(n => { if (n.to === S.me) n.read = true; }); save(); render(); };

/* ---------- 마감 달력 (E17) ---------- */
function calItems() {
  const out = [
    ['2026-10-05', '9월 법인카드 내역 마감', 'e1'], ['2026-10-10', '9월 결산 마감', 'e5'], ['2026-10-15', '개인 정산 제출 마감', 'e2'], ['2026-10-17', '통신비·정수기 정기 지출', 'e3'],
    ['2026-10-20', '행사 결산 제출', 'e2'], ['2026-10-25', '정기 지급(25일)', 'e4'], ['2026-10-30', '법인카드 결제일', 'e1'], ['2026-10-31', '월말 대사·마감 잠금', 'e5'],
    ['2026-10-05', '공휴일(대체)', 'e5'], ['2026-10-09', '한글날', 'e5'],
  ].map(([d, t, c]) => ({ d, t, c }));
  S.events.filter(v => v.year === 2026).forEach(v => out.push({ d: v.date, t: v.name, c: 'e3' }));
  S.advances.filter(a => !a.done && a.uid === S.me).forEach(a => out.push({ d: a.due, t: a.type + ' 정산 기한', c: 'e5' }));
  return out;
}
function calList(from, to) {
  const l = calItems().filter(x => x.d >= from && x.d <= to).sort((a, b) => a.d < b.d ? -1 : 1);
  return l.length ? '<table class="tb"><tbody>' + l.map(x => '<tr><td style="width:60px" class="mut">' + x.d.slice(5) + '</td><td><span class="bd ' + ({ e1: 'b', e2: 'a', e3: 'v', e4: 'ok', e5: 'rd' })[x.c] + '">' + esc(x.t) + '</span></td></tr>').join('') + '</tbody></table>' : '<div class="empty">없음</div>';
}
V['inbox/cal'] = () => {
  const items = calItems();
  let h = '<div class="c"><h3>2026년 10월 <span class="mut">오늘 10월 14일 · 마감 3일 전에 알림을 보냅니다</span></h3><div class="cal">' + '일월화수목금토'.split('').map(d => '<div class="h">' + d + '</div>').join('');
  for (let i = 0; i < 4; i++) h += '<div class="d e"></div>'; // 2026-10-01은 목요일
  for (let d = 1; d <= 31; d++) {
    const ds = '2026-10-' + String(d).padStart(2, '0');
    h += '<div class="d' + (ds === TODAY ? ' today' : '') + '"><b>' + d + '</b>' + items.filter(x => x.d === ds).map(x => '<i class="' + x.c + '">' + esc(x.t) + '</i>').join('') + '</div>';
  }
  h += '</div><div class="stg" style="margin-top:10px"><span><i style="background:#1d6fd8"></i>카드</span><span><i style="background:#e9a020"></i>제출 마감</span><span><i style="background:#6d4fd6"></i>행사</span><span><i style="background:#15803d"></i>지급</span><span><i style="background:#c2410c"></i>마감·기한</span></div></div>';
  return h;
};

/* ---------- 지출·증빙 > 내 지출 ---------- */
function kindText(e) {
  if (e.kind === 'card') return '카드 #' + e.card;
  if (e.kind === 'claim') return '청구 · ' + e.ck;
  return '개인 돈';
}
function evid(e) {
  if (e.receipt) return '<span class="bd t">있음</span>';
  if (e.sub) return '<span class="bd v">대체 사유서</span>';
  return '<span class="bd rd">없음</span>';
}
function expRows(list, chk) {
  if (!list.length) return '<div class="empty">해당하는 지출이 없습니다.</div>';
  return '<table class="tb"><thead><tr>' + (chk ? '<th style="width:28px"></th>' : '') + '<th>날짜</th><th>가맹점·내용</th><th>목적</th><th>예산과목 · 행사</th><th>구분</th><th>증빙</th><th class="right">금액</th><th>상태</th></tr></thead><tbody>' +
    list.map(e => '<tr class="click" data-a="open" data-id="' + e.id + '">' + (chk ? '<td data-stop="1">' + ((e.status === 'draft' || e.status === 'rejected') && e.uid === S.me ? '<input type="checkbox" class="sel" value="' + e.id + '">' : '') + '</td>' : '') +
      '<td class="mut nw">' + e.date.slice(5) + '</td><td><b>' + esc(e.vendor) + '</b>' + (e.other ? ' <span class="bd rd">다른 계좌</span>' : '') + '</td><td>' + esc(e.purpose) + '</td><td>' + esc(e.split ? '나눠 배정 ' + e.split.length + '건' : e.item) + (e.event ? '<br><span class="mut">' + esc(evName(e.event)) + '</span>' : '') + '</td><td>' + kindText(e) + '</td><td>' + evid(e) + '</td><td class="n"><b>' + won(e.amt) + '</b></td><td>' + stBadge(e) + '</td></tr>').join('') + '</tbody></table>';
}
V['expenses/list'] = () => {
  const mine = S.expenses.filter(e => e.uid === S.me);
  const groups = [['all', '전체'], ['draft', '작성 중'], ['progress', '결재 중'], ['rejected', '보완 요청'], ['confirmed', '확인 완료'], ['pay', '지급']];
  const pick = e => F.st === 'all' || e.status === F.st || (F.st === 'pay' && (e.status === 'scheduled' || e.status === 'paid'));
  const list = mine.filter(pick).sort((a, b) => a.date < b.date ? 1 : -1);
  const nRec = mine.filter(e => e.status === 'draft' && e.kind !== 'card' && /통신|정수기/.test(e.purpose)).length;
  let h = '<div class="c"><div class="row">' + groups.map(([k, l]) => '<button class="st ' + (F.st === k ? 'on' : '') + '" data-a="fst" data-k="' + k + '">' + l + ' ' + mine.filter(e => k === 'all' || e.status === k || (k === 'pay' && (e.status === 'scheduled' || e.status === 'paid'))).length + '</button>').join('') +
    '<span class="grow"></span>' + (sw(ME().dept, '스캔등록') ? '<button class="btn" data-a="scan">스캔으로 등록</button>' : '') + '<button class="btn" data-a="newExp">직접 등록</button>' +
    (nRec ? '' : '<button class="btn" data-a="recur" title="매달 나가는 지출을 작성 중으로 미리 만듭니다">정기 지출 초안</button>') + '<button class="btn p" data-a="submitSel">선택 제출</button></div>' +
    '<div class="row" style="margin-top:8px"><span class="mut">작성 중·보완 요청인 것만 고를 수 있습니다. 줄을 누르면 자세히 봅니다.</span><span class="grow"></span><span class="mut">' + list.length + '건 · ' + won(list.reduce((a, e) => a + e.amt, 0)) + '원</span></div>' +
    expRows(list, true) + '</div>';
  return h;
};
ACT.fst = d => { F.st = d.k; render(); };

/* 지출 자세히 */
ACT.open = d => {
  const e = X(d.id); if (!e) return;
  const mine = e.uid === S.me, editable = mine && (e.status === 'draft' || e.status === 'rejected');
  let h = '<h2>' + esc(e.vendor) + ' · ' + won(e.amt) + '원 ' + stBadge(e) + '</h2>';
  if (e.status === 'rejected') h += '<div class="note rd" style="margin-bottom:8px">보완 요청: ' + esc(e.reject || '') + '</div>';
  h += '<table class="tb"><tbody>' +
    '<tr><td class="mut" style="width:110px">쓴 사람</td><td>' + esc(U(e.uid).name) + ' · ' + esc(e.dept) + '</td></tr>' +
    '<tr><td class="mut">날짜</td><td>' + e.date + '</td></tr><tr><td class="mut">목적</td><td>' + esc(e.purpose) + '</td></tr>' +
    '<tr><td class="mut">예산과목</td><td>' + (e.split ? e.split.map(p => esc(p.item) + (p.event ? '(' + esc(evName(p.event)) + ')' : '') + ' ' + won(p.amt) + '원').join(' / ') : esc(e.item) + (e.bdept && e.bdept !== e.dept ? ' <span class="mut">(' + e.bdept + ' 예산)</span>' : '')) + '</td></tr>' +
    (e.event ? '<tr><td class="mut">행사</td><td>' + esc(evName(e.event)) + '</td></tr>' : '') +
    '<tr><td class="mut">구분</td><td>' + kindText(e) + '</td></tr><tr><td class="mut">증빙</td><td>' + evid(e) + (e.sub ? ' <button class="btn s" data-a="subView" data-id="' + e.id + '">사유서 보기</button>' : '') + '</td></tr>';
  if (e.calc) h += '<tr><td class="mut">규정 계산</td><td>' + Object.entries(e.calc).filter(([k]) => k !== '대상uid').map(([k, v]) => esc(k) + ' ' + esc(Array.isArray(v) ? v.join('·') : typeof v === 'number' && v >= 1000 ? won(v) : v)).join(' · ') + ' <span class="mut">(규정값 ' + ruleVer(e.date) + ')</span></td></tr>';
  if (isMoney(e)) {
    const p = payeeOf(e);
    h += '<tr><td class="mut">받을 계좌</td><td>' + (e.other ? '<span class="bd rd">이번만 다른 계좌</span> ' + esc(accText(e.other)) + '<br><span class="mut">사유: ' + esc(e.other.reason) + (e.other.evid ? ' · 증빙 ' + esc(e.other.evid) : '') + '</span>' : accText(p) + ' <span class="mut">(기본 계좌)</span>') + '</td></tr>';
  }
  h += '</tbody></table>';
  if (e.status !== 'draft') h += '<h3 style="margin:12px 0 6px;font-size:13.5px">결재선</h3>' + chainHtml(e.steps, e.cur, e.status);
  else h += '<h3 style="margin:12px 0 6px;font-size:13.5px">제출하면 이렇게 올라갑니다</h3>' + chainHtml(chainFor(e.uid, e.dept, e.amt, e.kind), 0, 'draft');
  h += '<div class="row end" style="margin-top:14px">';
  if (editable) {
    if (!e.receipt && !e.sub) h += '<button class="btn" data-a="subForm" data-id="' + e.id + '">대체 사유서 쓰기</button>';
    if (isMoney(e) && sw(ME().dept, '다른계좌')) h += '<button class="btn" data-a="otherForm" data-id="' + e.id + '">' + (e.other ? '다른 계좌 해제' : '이번만 다른 계좌로 받기') + '</button>';
    h += '<button class="btn r" data-a="delExp" data-id="' + e.id + '">삭제</button><button class="btn p" data-a="submitOne" data-id="' + e.id + '">제출</button>';
  }
  if (canAct(e, S.me)) h += '<button class="btn r" data-a="rejectForm" data-id="' + e.id + '">보완 요청</button><button class="btn p" data-a="approve" data-id="' + e.id + '">' + esc(e.steps[e.cur].label) + '</button>';
  h += '<button class="btn" data-a="close">닫기</button></div>';
  modal(h, 720);
};
ACT.close = () => close();
ACT.go = d => { location.hash = d.href; };
ACT.delExp = d => { const e = X(d.id); S.expenses = S.expenses.filter(x => x !== e); S.cards.forEach(c => { if (c.exp === e.id) c.exp = null; }); log(S.me, '지출 삭제', e.vendor + ' ' + e.amt); save(); close(); render(); toast('삭제했습니다.'); };

/* 직접 등록 (E6 나눠 배정 포함) */
function itemOpts(dept, sel) { return S.budgets.filter(b => b.dept === dept).map(b => '<option' + (b.item === sel ? ' selected' : '') + '>' + b.item + '</option>').join(''); }
function evOpts(dept, sel) { return '<option value="">(행사 아님)</option>' + S.events.filter(v => v.year === 2026 && v.dept === dept).map(v => '<option value="' + v.id + '"' + (v.id === sel ? ' selected' : '') + '>' + v.name + '</option>').join(''); }
function fld(label, input, tail, cls) { return '<div class="fld ' + (cls || '') + '"><b>' + label + '</b>' + input + (tail || '<span></span>') + '</div>'; }
ACT.newExp = () => {
  const me = ME();
  modal('<h2>지출 직접 등록</h2>' +
    fld('날짜', '<input type="date" id="f_date" value="' + TODAY + '">') + fld('가맹점', '<input id="f_vendor" placeholder="예: 교보문고 광화문">') +
    fld('금액', '<input id="f_amt" inputmode="numeric" placeholder="숫자만">') + fld('목적', '<input id="f_purpose" placeholder="누가·무엇을·왜. 예: 10/14 교구 회의 다과 8명">') +
    fld('결제', '<select id="f_kind"><option value="personal">개인 돈(받을 돈)</option><option value="card:3418">법인카드 #3418</option><option value="card:2171">법인카드 #2171</option><option value="card:5591">법인카드 #5591</option></select>') +
    fld('예산과목', '<select id="f_item">' + itemOpts(me.dept) + '</select>') + fld('행사', '<select id="f_event">' + evOpts(me.dept) + '</select>') +
    fld('증빙', '<label><input type="checkbox" id="f_rec" checked> 영수증 있음</label>') +
    '<label class="ck" style="margin-top:6px"><input type="checkbox" id="f_split"> 두 예산과목·행사에 나눠 배정하기</label>' +
    '<div id="splitBox" class="hide" style="margin-top:6px">' + fld('첫째', '<select id="s1_item">' + itemOpts(me.dept) + '</select>', '<input id="s1_amt" inputmode="numeric" placeholder="금액" style="width:110px">') +
    fld('둘째', '<select id="s2_item">' + itemOpts(me.dept) + '</select>', '<input id="s2_amt" inputmode="numeric" placeholder="금액" style="width:110px">') + '<div class="mut">두 금액의 합이 총액과 같아야 합니다.</div></div>' +
    '<div id="f_msg" style="margin-top:8px"></div><div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn p" data-a="saveExp">작성 중으로 저장</button></div>', 640);
  $('#f_split').addEventListener('change', ev => $('#splitBox').classList.toggle('hide', !ev.target.checked));
  $('#f_amt').addEventListener('input', () => budgetHint($('#f_item').value, num($('#f_amt').value)));
  $('#f_item').addEventListener('change', () => budgetHint($('#f_item').value, num($('#f_amt').value)));
};
const num = v => Number(String(v || '').replace(/[^\d]/g, '')) || 0;
function budgetHint(item, amt) {
  const u = budgetUse(ME().dept, item, amt), box = $('#f_msg'); if (!u || !box) return;
  const over = u.used > u.b.annual;
  box.innerHTML = '<div class="note ' + (over ? 'rd' : u.rate > u.pace + 0.05 ? 'a' : 't') + '">' + esc(item) + ' 예산 ' + won(u.b.annual) + '원 중 이것까지 ' + won(u.used) + '원(' + Math.round(u.rate * 100) + '%) · 진도선 ' + Math.round(u.pace * 100) + '%' +
    (over ? (sw(ME().dept, '예산차단') ? ' · 예산을 넘어 제출이 막힙니다' : ' · 예산을 넘습니다') : '') + '</div>';
}
ACT.saveExp = () => {
  const me = ME();
  const k = $('#f_kind').value;
  const o = { id: nid('e'), uid: me.id, dept: me.dept, date: $('#f_date').value, vendor: $('#f_vendor').value.trim(), amt: num($('#f_amt').value), purpose: $('#f_purpose').value.trim(),
    item: $('#f_item').value, event: $('#f_event').value, receipt: $('#f_rec').checked, kind: k.startsWith('card') ? 'card' : 'personal', card: k.startsWith('card') ? k.slice(5) : '',
    sub: null, other: null, split: null, steps: [], cur: 0, status: 'draft' };
  const msg = $('#f_msg');
  if (!o.vendor || !o.amt) { msg.innerHTML = '<div class="note rd">가맹점과 금액을 적어 주세요.</div>'; return; }
  if ($('#f_split').checked) {
    const a1 = num($('#s1_amt').value), a2 = num($('#s2_amt').value);
    if (a1 + a2 !== o.amt) { msg.innerHTML = '<div class="note rd">나눈 금액 합(' + won(a1 + a2) + '원)이 총액(' + won(o.amt) + '원)과 다릅니다.</div>'; return; }
    o.split = [{ item: $('#s1_item').value, amt: a1, event: o.event }, { item: $('#s2_item').value, amt: a2, event: '' }];
  }
  if (S.lock[o.date.slice(0, 7)]) { msg.innerHTML = '<div class="note rd">' + o.date.slice(0, 7) + '은 마감 잠금 상태라 등록할 수 없습니다.</div>'; return; }
  const dup = findDup(o);
  if (dup) { msg.innerHTML = '<div class="note rd">같은 날, 같은 가맹점, 같은 금액의 지출이 이미 있습니다(' + stLabel(dup) + '). 중복 등록을 막았습니다. <button class="btn s" data-a="open" data-id="' + dup.id + '">기존 것 보기</button></div>'; return; }
  if (o.kind === 'card') autoLinkOne(o);
  S.expenses.push(o); log(me.id, '지출 등록', o.vendor + ' ' + o.amt); save(); close(); F.st = 'all'; render(); toast('작성 중으로 저장했습니다.' + (o.cardLinked ? ' 카드 내역과 자동으로 연결했습니다.' : ''));
};
function autoLinkOne(o) {
  const c = S.cards.find(c => !c.exp && c.card === o.card && c.date === o.date && c.amt === o.amt);
  if (c) { c.exp = o.id; o.cardLinked = true; }
}

/* 정기 지출 초안 (E5) */
ACT.recur = () => {
  const me = ME();
  [['SK텔레콤', 55000, '10월 업무용 휴대폰 요금(총무국 공용)', '통신비'], ['코웨이', 33000, '10월 사무실 정수기 렌탈', '소모품비']].forEach(([v, a, p, it]) => {
    S.expenses.push({ id: nid('e'), uid: me.id, dept: me.dept, date: '2026-10-17', vendor: v, amt: a, purpose: p, item: it, event: '', receipt: false, kind: 'card', card: '3418', sub: null, other: null, split: null, steps: [], cur: 0, status: 'draft', recur: true });
  });
  log(me.id, '정기 지출 초안', '2건'); save(); F.st = 'draft'; render(); toast('지난달과 같은 정기 지출 2건을 작성 중으로 만들었습니다. 청구서가 오면 붙여서 제출하세요.');
};

/* ---------- 스캔으로 등록 (M3, E1, E2) ---------- */
const SAMPLES = [
  { id: 's1', name: '김밥집 카드 영수증', note: '선명함', rc: ['맛나김밥 종로점', '서울 종로구 종로 12', '2026-10-13 12:41', '김밥 x4  16,000', '라면 x2  10,000', '음료 x4   6,000', '합계     32,000', '카드 ****-3418 일시불'],
    items: [{ vendor: ['맛나김밥 종로점', 'hi'], date: ['2026-10-13', 'hi'], amt: [32000, 'hi'], card: ['3418', 'hi'] }] },
  { id: 's2', name: '문구점 현금 영수증', note: '가맹점 일부 흐림', rc: ['ㅎ빛문구', '현금영수증(소득공제)', '2026.10.12', '견출지 외 5종', '공급가   20,910', '부가세    2,090', '합계     23,000'],
    items: [{ vendor: ['한빛문구', 'mid', 'ㅎ빛문구'], date: ['2026-10-12', 'hi'], amt: [23000, 'hi'], card: ['', 'hi'] }] },
  { id: 's3', name: '흐리게 찍힌 영수증', note: '흐림', blur: true, rc: ['???마트', '2026-1?-11', '..........', '합 계  9,8?0'],
    items: [{ vendor: ['', 'lo'], date: ['2026-10-11', 'lo'], amt: [9800, 'lo'], card: ['', 'mid'] }] },
  { id: 's4', name: '한 사진에 영수증 2장', note: '여러 장', rc: ['[1] 다이소 종로점  2026-10-13', '    케이블타이 외  5,000', '----------- 잘린 선 -----------', '[2] 세븐일레븐 광화문  2026-10-13', '    생수 2       2,400'],
    items: [{ vendor: ['다이소 종로점', 'hi'], date: ['2026-10-13', 'hi'], amt: [5000, 'hi'], card: ['', 'hi'] }, { vendor: ['세븐일레븐 광화문', 'hi'], date: ['2026-10-13', 'hi'], amt: [2400, 'mid'], card: ['', 'hi'] }] },
];
const CF = { hi: ['높음', 'hi'], mid: ['확인 필요', 'mid'], lo: ['낮음', 'lo'] };
ACT.scan = () => {
  modal('<h2>스캔으로 등록</h2><div class="row" style="margin-bottom:10px"><span class="bd t">PC에서 올리기</span><span class="bd b">휴대폰 공유하기로 올리기</span><span class="bd v">메일로 보내기(예: scan@협회 주소)</span><span class="bd g">판독은 협회 서버 안에서만 · 외부 AI 꺼짐</span></div>' +
    '<p class="mut" style="margin:0 0 8px">시연에서는 아래 예시 영수증 중 하나를 고르면 판독 결과가 나옵니다.</p><div class="pick">' +
    SAMPLES.map(s => '<button data-a="scanPick" data-id="' + s.id + '"><b>' + s.name + '</b><br><span class="mut">' + s.note + '</span></button>').join('') + '</div>' +
    '<div class="row end" style="margin-top:12px"><button class="btn" data-a="close">닫기</button></div>', 720);
};
ACT.scanPick = d => {
  const s = SAMPLES.find(x => x.id === d.id), me = ME();
  let h = '<h2>판독 결과 · ' + s.name + '</h2>';
  if (s.blur) h += '<div class="note a" style="margin-bottom:8px">사진이 흐려서 글자를 확실히 읽지 못했습니다. 다시 찍으면 더 정확합니다. 그대로 쓰려면 노란·빨간 칸을 직접 고쳐 주세요.</div>';
  if (s.items.length > 1) h += '<div class="note t" style="margin-bottom:8px">한 사진에서 영수증 ' + s.items.length + '장을 찾아 따로 나눴습니다.</div>';
  h += '<div class="split"><div><div class="rc" style="' + (s.blur ? 'filter:blur(.6px);opacity:.75' : '') + '">' + s.rc.map((l, i) => '<p class="' + (i === 0 ? 'h' : '') + '">' + esc(l) + '</p>').join('') + '</div></div><div>';
  s.items.forEach((it, i) => {
    const c = it.card[0] ? S.cards.find(c => !c.exp && c.card === it.card[0] && c.date === it.date[0] && c.amt === it.amt[0]) : null;
    const cls = k => it[k][1] === 'lo' ? 'miss' : it[k][1] === 'mid' ? 'warn' : '';
    const cf = k => '<span class="cf ' + CF[it[k][1]][1] + '">' + CF[it[k][1]][0] + '</span>';
    h += '<div class="c" style="margin-bottom:8px;padding:10px 12px" data-item="' + i + '"><h3>' + (s.items.length > 1 ? '영수증 ' + (i + 1) : '읽은 내용') + (c ? ' <span class="bd t">카드 내역 #' + c.card + '과 자동 연결</span>' : it.card[0] ? '' : ' <span class="bd g">개인 돈으로 등록</span>') + '</h3>' +
      fld('가맹점', '<input class="i_vendor" value="' + esc(it.vendor[0]) + '" placeholder="읽지 못함">', cf('vendor'), cls('vendor')) +
      (it.vendor[2] ? '<div class="mut" style="margin:-3px 0 6px 6px">「' + esc(it.vendor[2]) + '」로 읽혀 거래처 목록의 「' + esc(it.vendor[0]) + '」로 고쳤습니다.</div>' : '') +
      fld('날짜', '<input type="date" class="i_date" value="' + it.date[0] + '">', cf('date'), cls('date')) +
      fld('금액', '<input class="i_amt" value="' + it.amt[0] + '">', cf('amt'), cls('amt')) +
      fld('목적', '<input class="i_purpose" placeholder="누가·무엇을·왜">', '<span class="cf lo">직접 입력</span>', '') +
      fld('예산과목', '<select class="i_item">' + itemOpts(me.dept) + '</select>') +
      '<input type="hidden" class="i_card" value="' + (c ? c.card : '') + '"><input type="hidden" class="i_cid" value="' + (c ? c.id : '') + '"></div>';
  });
  h += '</div></div><div id="f_msg"></div><div class="row end" style="margin-top:10px"><button class="btn" data-a="scan">다른 영수증</button><button class="btn p" data-a="scanSave">' + s.items.length + '건 작성 중으로 저장</button></div>';
  modal(h, 900);
};
ACT.scanSave = () => {
  const me = ME(), made = [], msg = $('#f_msg');
  for (const box of $$('[data-item]')) {
    const o = { id: nid('e'), uid: me.id, dept: me.dept, vendor: $('.i_vendor', box).value.trim(), date: $('.i_date', box).value, amt: num($('.i_amt', box).value), purpose: $('.i_purpose', box).value.trim() || '(목적 미입력)',
      item: $('.i_item', box).value, event: '', receipt: true, kind: $('.i_card', box).value ? 'card' : 'personal', card: $('.i_card', box).value, sub: null, other: null, split: null, steps: [], cur: 0, status: 'draft', scanned: true };
    if (!o.vendor || !o.amt) { msg.innerHTML = '<div class="note rd">가맹점·금액이 빈 영수증이 있습니다. 고친 뒤 저장해 주세요.</div>'; S.seq--; return; }
    const dup = findDup(o);
    if (dup) { msg.innerHTML = '<div class="note rd">「' + esc(o.vendor) + ' ' + won(o.amt) + '원」은 이미 등록돼 있습니다. 중복 등록을 막았습니다.</div>'; return; }
    made.push([o, $('.i_cid', box).value]);
  }
  made.forEach(([o, cid]) => { if (cid) { const c = S.cards.find(x => x.id === cid); if (c) c.exp = o.id; } S.expenses.push(o); log(me.id, '스캔 등록', o.vendor + ' ' + o.amt); });
  save(); close(); F.st = 'draft'; location.hash = '#/expenses/list'; render(); toast(made.length + '건을 작성 중으로 저장했습니다. 목적을 확인하고 제출하세요.');
};

/* ---------- 제출 전 점검 (E4) + 각자 올리기 안내 (E7) ---------- */
function checks(e) {
  const out = [];
  const add = (ok, t, lvl) => out.push({ ok, t, lvl: ok ? 'ok' : (lvl || 'no') });
  add(e.receipt || !!e.sub, e.receipt ? '증빙 있음' : e.sub ? '대체 사유서 있음' : '증빙이 없습니다. 영수증을 붙이거나 대체 사유서를 써 주세요.');
  add(e.purpose && e.purpose.length >= 6 && !/미입력/.test(e.purpose), e.purpose && e.purpose.length >= 6 && !/미입력/.test(e.purpose) ? '목적 기재' : '목적을 「누가·무엇을·왜」로 적어 주세요.');
  add(!(e.item === '주요행사비' && !e.event), e.item === '주요행사비' && !e.event ? '행사 지출이면 행사를 골라 주세요.' : '예산과목·행사 지정');
  const dup = findDup(e, e.id);
  add(!dup, dup ? '같은 날·가맹점·금액의 지출이 이미 있습니다.' : '중복 없음');
  if (isMoney(e)) add(!!(accOf(e.uid) || e.other), accOf(e.uid) || e.other ? '받을 계좌 확인' : '받을 계좌가 없습니다(서비스 설정 > 내 계정).');
  if (e.kind === 'card') { const c = S.cards.find(c => c.exp === e.id); add(!!c, c ? '카드 내역과 연결됨' : '카드 내역과 아직 연결되지 않았습니다(카드 대조에서 연결).', 'warn'); }
  (e.split || [{ item: e.item, amt: e.amt }]).forEach(p => {
    const u = budgetUse(e.bdept || e.dept, p.item, p.amt);
    if (!u) return;
    if (u.used > u.b.annual) add(!sw(e.bdept || e.dept, '예산차단') ? null : false, p.item + ' 예산을 ' + won(u.used - u.b.annual) + '원 넘습니다' + (sw(e.bdept || e.dept, '예산차단') ? '. 이 국은 예산 초과 제출이 막혀 있습니다.' : '. 결재자에게 표시됩니다.'), sw(e.bdept || e.dept, '예산차단') ? 'no' : 'warn');
    else add(true, p.item + ' 예산 여유 ' + won(u.left) + '원');
  });
  add(!S.lock[e.date.slice(0, 7)], S.lock[e.date.slice(0, 7)] ? e.date.slice(0, 7) + '은 마감 잠금 상태입니다.' : '마감 전');
  out.forEach(c => { if (c.ok === null) { c.ok = true; c.lvl = 'warn'; } });
  return out;
}
function ensureGuide(next) {
  if (S.guide[S.me]) return next();
  modal('<h2>지출은 쓴 사람이 직접 올립니다</h2><ol><li>대신 올리지 마세요. 쓴 사람(책임자) 이름으로 올라가야 결재와 지급이 맞게 갑니다.</li>' +
    '<li>목적은 「누가·무엇을·왜」로 정확히 적어 주세요. 예: 「10/6 야근 저녁 3명(김정래·이예시·정예시)」</li><li>행사 지출이면 행사를 꼭 골라 주세요. 행사 예산에 바로 잡힙니다.</li>' +
    '<li>영수증이 없으면 대체 사유서를 함께 냅니다.</li></ol><label class="ck"><input type="checkbox" id="g_ok"> 위 내용을 확인했습니다. 다음부터는 이 안내를 띄우지 않습니다.</label>' +
    '<div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn p" id="g_go" disabled>계속</button></div>');
  $('#g_ok').addEventListener('change', ev => { $('#g_go').disabled = !ev.target.checked; });
  $('#g_go').addEventListener('click', () => { S.guide[S.me] = TODAY; log(S.me, '각자 올리기 안내 확인', ''); save(); close(); next(); });
}
ACT.submitOne = d => openCheck([d.id]);
ACT.submitSel = () => {
  const ids = $$('.sel:checked').map(x => x.value);
  if (!ids.length) return toast('제출할 지출을 먼저 고르세요.');
  openCheck(ids);
};
function openCheck(ids) {
  ensureGuide(() => {
    let h = '<h2>제출 전 점검 · ' + ids.length + '건</h2>', okIds = [];
    ids.forEach(id => {
      const e = X(id), cs = checks(e), pass = cs.every(c => c.ok);
      if (pass) okIds.push(id);
      h += '<div class="c" style="margin-bottom:8px;padding:10px 12px"><h3>' + esc(e.vendor) + ' · ' + won(e.amt) + '원 ' + (pass ? '<span class="bd ok">제출 가능</span>' : '<span class="bd rd">고칠 것 있음</span>') + '</h3>' +
        cs.map(c => '<div style="font-size:12.5px">' + (c.lvl === 'ok' ? '<span style="color:#15803d">✓</span> ' : c.lvl === 'warn' ? '<span style="color:#a16207">!</span> ' : '<span style="color:#c2410c">✕</span> ') + esc(c.t) + '</div>').join('') +
        (pass ? '<div style="margin-top:6px">' + chainHtml(chainFor(e.uid, e.dept, e.amt, e.kind), 0, 'draft') + '</div>' : '') + '</div>';
    });
    h += '<div class="row end"><button class="btn" data-a="close">닫기</button><button class="btn p" data-a="doSubmit" data-ids="' + okIds.join(',') + '"' + (okIds.length ? '' : ' disabled') + '>' + okIds.length + '건 제출</button></div>';
    modal(h, 720);
  });
}
ACT.doSubmit = d => {
  d.ids.split(',').filter(Boolean).forEach(id => submitExp(X(id)));
  save(); close(); render(); toast('제출했습니다. 결재 차례인 사람에게 알림이 갔습니다.');
};
function submitExp(e) {
  e.steps = buildSteps(e); e.cur = 0; e.status = 'progress'; delete e.reject;
  log(e.uid, '제출', e.vendor + ' ' + e.amt);
  notifyStep(e);
}
function notifyStep(e) {
  const s = e.steps[e.cur]; if (!s) return;
  const to = s.dele || s.uid ? [s.dele || s.uid] : S.users.filter(u => u.role === s.role).map(u => u.id);
  to.forEach(t => notify(t, U(e.uid).name + '님의 「' + e.purpose + '」 ' + won(e.amt) + '원이 ' + s.label + ' 차례입니다.'));
}

/* ---------- 대체 사유서 (E3) ---------- */
ACT.subForm = d => {
  const e = X(d.id);
  modal('<h2>지출증빙 대체 사유서</h2>' + fld('사유', '<select id="u_why"><option>영수증 분실</option><option>영수증 발급이 안 되는 거래(개인 간 거래 등)</option><option>현장 사정으로 영수증 못 받음</option></select>') +
    fld('거래 내용', '<input id="u_what" value="' + esc(e.vendor + ' · ' + e.purpose) + '">') + fld('지급 상대', '<input id="u_to" value="' + esc(e.vendor) + '">') +
    fld('확인자', '<select id="u_by">' + S.users.filter(u => u.dept === e.dept && u.id !== e.uid).map(u => '<option value="' + u.id + '">' + u.name + ' ' + u.title + '</option>').join('') + '</select>') +
    fld('함께 낼 자료', '<input id="u_att" placeholder="예: 이체 확인증, 퀵 발송 문자">') +
    '<div class="row end" style="margin-top:12px"><button class="btn" data-a="open" data-id="' + e.id + '">뒤로</button><button class="btn p" data-a="subSave" data-id="' + e.id + '">사유서 붙이기</button></div>');
};
ACT.subSave = d => {
  const e = X(d.id);
  e.sub = { why: $('#u_why').value, what: $('#u_what').value, to: $('#u_to').value, by: $('#u_by').value, att: $('#u_att').value, at: TODAY };
  log(S.me, '대체 사유서', e.vendor); notify(e.sub.by, U(e.uid).name + '님이 대체 사유서 확인자로 지정했습니다: ' + e.vendor + ' ' + won(e.amt) + '원'); save();
  ACT.subView(d);
};
ACT.subView = d => {
  const e = X(d.id), s = e.sub;
  modal('<div class="doc" id="printDoc"><div class="t">지출증빙 대체 사유서</div><table><tbody><tr><th style="width:110px">소속·성명</th><td>' + esc(e.dept + ' ' + U(e.uid).title + ' ' + U(e.uid).name) + '</td><th style="width:80px">작성일</th><td>' + s.at + '</td></tr>' +
    '<tr><th>지출일</th><td>' + e.date + '</td><th>금액</th><td>' + won(e.amt) + '원</td></tr><tr><th>거래 내용</th><td colspan="3">' + esc(s.what) + '</td></tr><tr><th>지급 상대</th><td colspan="3">' + esc(s.to) + '</td></tr>' +
    '<tr><th>사유</th><td colspan="3">' + esc(s.why) + '</td></tr><tr><th>함께 낸 자료</th><td colspan="3">' + esc(s.att || '없음') + '</td></tr></tbody></table>' +
    '<p style="margin:10px 0 0">위 지출은 사실이며, 정규 증빙을 받지 못한 사유를 위와 같이 확인합니다.</p><div class="sg"><span>작성자<br><br>' + esc(U(e.uid).name) + '</span><span>확인자<br><br>' + esc(U(s.by).name) + '</span></div></div>' +
    '<div class="row end noprint" style="margin-top:12px"><button class="btn prt" onclick="window.print()">인쇄</button><button class="btn p" data-a="open" data-id="' + e.id + '">확인</button></div>', 680);
  render();
};

/* ---------- 이번만 다른 계좌 (G5 계좌 보호) ---------- */
let OTHER = null;
ACT.otherForm = d => {
  const e = X(d.id) || null;
  if (e && e.other) { e.other = null; log(S.me, '다른 계좌 해제', e.vendor); save(); render(); return ACT.open(d); }
  otherDialog(o => { e.other = o; log(S.me, '이번만 다른 계좌', e.vendor + ' > ' + o.bank + ' ' + o.no); save(); render(); ACT.open(d); }, () => ACT.open(d));
};
function otherDialog(done, back) {
  const me = ME();
  modal('<h2>이번만 다른 계좌로 받기</h2><div class="note a" style="margin-bottom:8px">이 지출 1건에만 적용됩니다. 기본 계좌는 바뀌지 않습니다. 기본 계좌를 바꾸려면 서비스 설정 > 내 계정에서 따로 변경하세요.</div>' +
    fld('은행', '<select id="o_bank"><option>국민은행</option><option>신한은행</option><option>우리은행</option><option>하나은행</option><option>농협</option><option>기업은행</option></select>') +
    fld('계좌번호', '<input id="o_no" placeholder="숫자와 -">') + fld('예금주', '<input id="o_holder" value="' + esc(me.name) + '">') +
    fld('사유', '<input id="o_reason" placeholder="예: 행사 비용을 업체에 바로 보내야 함">') +
    '<div id="o_evbox" class="hide">' + fld('증빙', '<input type="file" id="o_ev">', '<span class="cf mid">필수</span>', 'warn') + '<div class="mut" style="margin:-2px 0 6px 6px">예금주가 본인이 아니면 관계나 사정을 보여 주는 자료가 필요합니다(가족관계증명서, 업체 계좌 사본 등).</div></div>' +
    '<div id="o_msg"></div><div class="row end" style="margin-top:12px"><button class="btn" id="o_back">취소</button><button class="btn p" id="o_next">다음: 본인 확인</button></div>');
  const chk = () => $('#o_evbox').classList.toggle('hide', $('#o_holder').value.trim() === me.name);
  $('#o_holder').addEventListener('input', chk);
  $('#o_back').addEventListener('click', back);
  $('#o_next').addEventListener('click', () => {
    const o = { bank: $('#o_bank').value, no: $('#o_no').value.trim(), holder: $('#o_holder').value.trim(), reason: $('#o_reason').value.trim(), evid: '', at: nowStamp() };
    const f = $('#o_ev').files[0]; if (f) o.evid = f.name;
    const m = $('#o_msg');
    if (!/^[\d-]{8,}$/.test(o.no)) return m.innerHTML = '<div class="note rd">계좌번호를 숫자와 -로 8자 이상 적어 주세요.</div>';
    if (!o.holder || o.reason.length < 4) return m.innerHTML = '<div class="note rd">예금주와 사유를 적어 주세요.</div>';
    if (o.holder !== me.name && !o.evid) return m.innerHTML = '<div class="note rd">예금주가 본인이 아니어서 증빙 파일이 필요합니다.</div>';
    o.fresh = !S.otherSeen[o.no];
    o.no = o.no.replace(/^(\d+-?)(.*)(\d{4})$/, (a, p, mid, last) => p + mid.replace(/\d/g, '*') + last);
    modal('<h2>본인 확인</h2><p>계좌를 바꾸는 일이라 로그인 비밀번호를 한 번 더 확인합니다. <span class="mut">(시연: 아무 글자 4자 이상)</span></p>' +
      fld('비밀번호', '<input type="password" id="o_pw" autocomplete="off">') + '<div id="o_msg2"></div><div class="row end" style="margin-top:12px"><button class="btn" id="o_cancel">취소</button><button class="btn p" id="o_ok">확인</button></div>');
    $('#o_cancel').addEventListener('click', back);
    $('#o_ok').addEventListener('click', () => {
      if ($('#o_pw').value.length < 4) return $('#o_msg2').innerHTML = '<div class="note rd">비밀번호를 다시 입력해 주세요.</div>';
      notify(me.id, '[보안 알림] ' + o.bank + ' ' + o.no + '(' + o.holder + ')로 「이번만 다른 계좌」가 설정됐습니다. 본인이 한 일이 아니면 바로 총무국에 알려 주세요.');
      toast('설정했습니다. 본인 알림을 보냈고, 재정 담당에게 빨간 표시로 보입니다.');
      done(o);
    });
  });
}

/* ---------- 총무국 청구 9종 (M2) ---------- */
const CK = [
  ['야근식대', '야근·휴일 식대', '1인 한도 안에서. 함께 먹은 사람으로 월 횟수·중복 자동 점검'],
  ['출장여비', '출장 여비', '교통·숙박 실비와 직급별 일비·식비를 규정대로 계산'],
  ['시내교통', '시내 교통 · 야근 귀가 택시', '외근 택시, 늦은 야근 뒤 귀가 택시를 모아 청구'],
  ['소모품', '소모품 신청', '총무국 구매 요청 또는 급히 직접 산 것 청구'],
  ['경조사', '직원 경조사비', '결혼·출산·조사 규정 금액 자동, 대상 직원에게 지급'],
  ['차량운행', '법인차량 운행일지', '계기판 km·목적지·목적. 빈 구간 자동 찾기'],
  ['자녀학자금', '임직원 자녀 학자금', '납입액의 1/2, 학기당 최고 200만원, 8학기까지'],
  ['도서인쇄', '도서 · 인쇄', '업무용 도서·자료, 명함·인쇄물'],
  ['우편택배', '우편 · 택배', '업무 우편·등기·택배 요금'],
];
const CKITEM = { 야근식대: '복리후생비(기타)', 출장여비: '여비교통비(단기)', 시내교통: '여비교통비(단기)', 소모품: '소모품비', 경조사: '복리후생비(기타)', 차량운행: '차량유지비', 자녀학자금: '복리후생비(기타)', 도서인쇄: '도서인쇄비', 우편택배: '통신비' };
V['expenses/claims'] = () => {
  const me = ME();
  if (!sw(me.dept, '총무국청구')) return '<div class="note a">' + me.dept + '은 「총무국 청구」 기능이 꺼져 있습니다. 서비스 설정 > 기능 스위치에서 켤 수 있습니다.</div>';
  const mine = S.expenses.filter(e => e.uid === me.id && e.kind === 'claim');
  return '<div class="note t">총무국 예산으로 나가는 9가지 청구입니다. 규정값(' + ruleVer(TODAY) + ')으로 금액을 계산하고, 같은 청구가 두 번 들어가지 않게 막습니다. 결재선은 금액에 맞춰 자동으로 정해집니다.</div>' +
    '<div class="cards9">' + CK.map(([k, n, d]) => '<div class="c"><b style="font-size:14px">' + n + '</b><span class="mut">' + d + '</span><span class="mut">예산과목 ' + CKITEM[k] + '</span><button class="btn p s" data-a="claim" data-k="' + k + '">' + (k === '차량운행' ? '운행 기록' : k === '소모품' ? '신청' : '청구하기') + '</button></div>').join('') + '</div>' +
    '<div class="c"><h3>내 청구 <span class="mut">' + mine.length + '건</span></h3>' + expRows(mine.sort((a, b) => a.date < b.date ? 1 : -1)) + '</div>';
};
function userChecks(sel) { return S.users.map(u => '<label style="margin-right:10px;white-space:nowrap"><input type="checkbox" class="c_ppl" value="' + u.name + '"' + (sel.includes(u.name) ? ' checked' : '') + '> ' + u.name + '</label>').join(''); }
function isHoliday(d) { const w = new Date(d + 'T00:00:00').getDay(); return w === 0 || w === 6 || ['2026-10-05', '2026-10-09', '2026-12-25'].includes(d); }
const CFORM = {
  야근식대: me => fld('날짜', '<input type="date" id="c_date" value="2026-10-13">') + fld('끼니', '<select id="c_meal"><option>저녁</option><option>야식(22시 이후)</option><option>휴일 식사</option></select>') +
    fld('퇴근 시각', '<input type="time" id="c_time" value="20:30">') + fld('가게', '<input id="c_vendor" value="한솥도시락 종로점">') + fld('실제 금액', '<input id="c_amt" value="36000" inputmode="numeric">') +
    '<div class="fld"><b>함께 먹은 사람</b><div>' + userChecks([me.name, '이예시', '정예시']) + '</div><span></span></div>',
  출장여비: me => fld('출발일', '<input type="date" id="c_d1" value="2026-10-20">') + fld('돌아온 날', '<input type="date" id="c_d2" value="2026-10-21">') +
    fld('지역', '<select id="c_area"><option>광역시</option><option>서울</option><option>기타</option></select>') + fld('목적지', '<input id="c_dest" value="대구교구">') +
    fld('교통 실비', '<input id="c_tr" value="87600" inputmode="numeric">', '<span class="mut">KTX 등</span>') + fld('자가용 km', '<input id="c_km" value="0" inputmode="numeric">') +
    fld('숙박', '<label><input type="checkbox" id="c_card"> 법인카드로 냄(지급에서 뺌)</label>') + fld('직급 구분', '<input id="c_grade" value="' + me.grade + '" disabled>'),
  시내교통: () => [0, 1, 2].map(i => '<div class="fld"><b>' + (i + 1) + '번째</b><div class="row"><input type="date" class="t_d" value="' + ['2026-10-12', '2026-10-13', ''][i] + '" style="width:140px"><select class="t_k" style="width:130px"><option>야근 귀가 택시</option><option' + (i === 1 ? ' selected' : '') + '>외근 택시</option><option>버스·지하철</option></select><input type="time" class="t_t" value="' + ['23:10', '14:20', ''][i] + '" style="width:100px"><input class="t_a" value="' + ['31200', '12800', ''][i] + '" placeholder="금액" style="width:90px"></div><span></span></div>').join(''),
  소모품: () => fld('방식', '<select id="c_mode"><option>직접 구매(청구)</option><option>총무국에 구매 요청</option></select>') + fld('품목', '<input id="c_what" value="A4 클리어파일 20개">') +
    fld('단가', '<input id="c_unit" value="1200" inputmode="numeric">') + fld('수량', '<input id="c_qty" value="20" inputmode="numeric">') + fld('가게', '<input id="c_vendor" value="한빛문구">') + fld('날짜', '<input type="date" id="c_date" value="' + TODAY + '">'),
  경조사: me => fld('대상 직원', '<select id="c_who">' + S.users.map(u => '<option value="' + u.id + '"' + (u.id === me.id ? ' selected' : '') + '>' + u.name + ' (' + u.dept + ')</option>').join('') + '</select>') +
    fld('구분', '<select id="c_kind">' + Object.keys(S.gyeong).map(k => '<option>' + k + '</option>').join('') + '</select>') + fld('행사일', '<input type="date" id="c_date" value="2026-10-24">'),
  차량운행: () => { const last = S.carlog[S.carlog.length - 1]; return fld('운행일', '<input type="date" id="c_date" value="' + TODAY + '">') + fld('출발 km', '<input id="c_from" value="' + (last ? last.to + 6 : 0) + '" inputmode="numeric">', '<span class="mut">지난 도착 ' + (last ? won(last.to) : '-') + '</span>') + fld('도착 km', '<input id="c_to" value="' + (last ? last.to + 40 : 0) + '" inputmode="numeric">') + fld('목적지', '<input id="c_dest" value="종로 > 여의도 거래처">') + fld('목적', '<input id="c_why" value="계약서 원본 전달">'); },
  자녀학자금: () => fld('자녀 이름', '<input id="c_child" value="김예시">') + fld('학교', '<input id="c_school" value="예시대학교">') + fld('학기 차수', '<input id="c_sem" value="3" inputmode="numeric">', '<span class="mut">1~8</span>') + fld('실제 납입액', '<input id="c_paid" value="3850000" inputmode="numeric">') + fld('납입일', '<input type="date" id="c_date" value="2026-09-01">'),
  도서인쇄: () => fld('품목', '<input id="c_what" value="명함 200매">') + fld('가게', '<input id="c_vendor" value="종로인쇄">') + fld('금액', '<input id="c_amt" value="22000" inputmode="numeric">') + fld('날짜', '<input type="date" id="c_date" value="' + TODAY + '">'),
  우편택배: () => fld('내용', '<input id="c_what" value="교구 공문 등기 발송">') + fld('건수', '<input id="c_cnt" value="6" inputmode="numeric">') + fld('금액', '<input id="c_amt" value="16800" inputmode="numeric">') + fld('날짜', '<input type="date" id="c_date" value="' + TODAY + '">'),
};
// 계산: { amt, date, vendor, purpose, calc, block:[...], warn:[...], payTo, noMoney, request }
const CCALC = {
  야근식대: me => {
    const r = rule($('#c_date').value), date = $('#c_date').value, meal = $('#c_meal').value, time = $('#c_time').value, ppl = $$('.c_ppl:checked').map(x => x.value), real = num($('#c_amt').value);
    const lim = r.야근식대_1인 * ppl.length, amt = Math.min(real, lim), block = [], warn = [];
    if (!ppl.length) block.push('함께 먹은 사람을 1명 이상 고르세요.');
    const hol = isHoliday(date);
    if (!hol && meal === '저녁' && time < r.야근_평일시각) block.push('평일 저녁은 ' + r.야근_평일시각 + ' 이후 퇴근일 때만 청구할 수 있습니다.');
    if (!hol && meal.startsWith('야식') && time < '22:00') block.push('야식은 22:00 이후 퇴근일 때만 청구할 수 있습니다.');
    if (meal === '휴일 식사' && !hol) block.push(date + '은 휴일이 아닙니다.');
    if (real > lim && ppl.length) warn.push('한도 ' + won(lim) + '원(1인 ' + won(r.야근식대_1인) + '원 × ' + ppl.length + '명)을 넘은 ' + won(real - lim) + '원은 본인 부담입니다.');
    ppl.forEach(p => {
      const same = S.expenses.find(e => e.ck === '야근식대' && e.date === date && e.calc && e.calc.끼니 === meal.slice(0, 2) && (e.calc.명단 || []).includes(p));
      if (same) block.push(p + '님은 ' + date + ' ' + meal.slice(0, 2) + ' 식대가 이미 청구돼 있습니다(' + U(same.uid).name + ' 청구).');
      const cnt = S.expenses.filter(e => e.ck === '야근식대' && e.date.slice(0, 7) === date.slice(0, 7) && (e.calc && e.calc.명단 || []).includes(p)).length;
      if (cnt >= r.야근_월횟수) block.push(p + '님은 이번 달 ' + r.야근_월횟수 + '회를 다 썼습니다.');
    });
    return { amt, date, vendor: $('#c_vendor').value, purpose: date.slice(5).replace('-', '/') + ' 야근 ' + meal.slice(0, 2) + ' ' + ppl.length + '명(' + ppl.join('·') + ')', calc: { 끼니: meal.slice(0, 2), 인원: ppl.length, 한도: lim, 퇴근: time, 명단: ppl }, block, warn,
      show: [['1인 한도', won(r.야근식대_1인) + '원'], ['인원', ppl.length + '명'], ['한도', won(lim) + '원'], ['청구 금액', won(amt) + '원']] };
  },
  출장여비: me => {
    const r = rule($('#c_d1').value), g = S.grade[me.grade], d1 = $('#c_d1').value, d2 = $('#c_d2').value;
    const days = Math.max(1, Math.round((new Date(d2) - new Date(d1)) / 864e5) + 1), nights = days - 1, area = $('#c_area').value;
    const il = g.일비 * days, sik = g.식비 * days, suk = $('#c_card').checked ? 0 : g[area] * nights, tr = num($('#c_tr').value), km = num($('#c_km').value) * r.자가용_km;
    const amt = il + sik + suk + tr + km, block = [];
    if (d2 < d1) block.push('돌아온 날이 출발일보다 앞섭니다.');
    return { amt, date: d2, vendor: '출장 여비(' + $('#c_dest').value + ')', purpose: $('#c_dest').value + ' 출장(' + d1.slice(5) + '~' + d2.slice(5) + ')', calc: { 등급: me.grade, 일수: days, 박수: nights, 일비: il, 식비: sik, 숙박: suk, 교통: tr + km }, block, warn: [],
      show: [['일비', won(g.일비) + ' × ' + days + '일 = ' + won(il)], ['식비', won(g.식비) + ' × ' + days + '일 = ' + won(sik)], ['숙박', ($('#c_card').checked ? '법인카드(0)' : won(g[area]) + ' × ' + nights + '박 = ' + won(suk))], ['교통', won(tr + km) + (km ? ' (자가용 ' + won(km) + ' 포함)' : '')], ['청구 금액', won(amt) + '원']] };
  },
  시내교통: () => {
    const r = rule(TODAY), rows = $$('.t_d').map((x, i) => ({ d: x.value, k: $$('.t_k')[i].value, t: $$('.t_t')[i].value, a: num($$('.t_a')[i].value) })).filter(x => x.d && x.a);
    const warn = [], block = []; let amt = 0;
    rows.forEach(x => {
      let a = x.a;
      if (x.k === '야근 귀가 택시') { if (x.t < r.귀가_시각) { warn.push(x.d.slice(5) + ' 귀가 택시는 ' + r.귀가_시각 + ' 이후만 됩니다(제외).'); a = 0; } else if (a > r.귀가_1회) { warn.push(x.d.slice(5) + ' 귀가 택시 1회 한도 ' + won(r.귀가_1회) + '원 적용'); a = r.귀가_1회; } }
      if (x.k === '외근 택시' && a > r.외근택시_1회) { warn.push(x.d.slice(5) + ' 외근 택시 1회 한도 ' + won(r.외근택시_1회) + '원 적용'); a = r.외근택시_1회; }
      x.ok = a; amt += a;
      const dup = S.expenses.find(e => e.ck === '시내교통' && e.date === x.d && e.uid === S.me);
      if (dup) block.push(x.d.slice(5) + ' 시내교통은 이미 청구돼 있습니다.');
    });
    if (!rows.length) block.push('한 줄 이상 적어 주세요.');
    return { amt, date: rows.length ? rows[rows.length - 1].d : TODAY, vendor: '시내교통 ' + rows.length + '건', purpose: '시내교통 ' + rows.map(x => x.d.slice(5) + ' ' + x.k).join(', '), calc: { 건수: rows.length }, block, warn, show: rows.map(x => [x.d.slice(5) + ' ' + x.k, won(x.ok) + '원']).concat([['청구 금액', won(amt) + '원']]) };
  },
  소모품: () => {
    const r = rule(TODAY), unit = num($('#c_unit').value), qty = num($('#c_qty').value), amt = unit * qty, mode = $('#c_mode').value, block = [], warn = [];
    if (unit >= r.비품_단가) block.push('단가 ' + won(r.비품_단가) + '원 이상은 비품(자산)입니다. 비품 구입 절차로 진행하세요.');
    if (mode.startsWith('직접') && amt > r.직접구매_1건) block.push('직접 구매는 1건 ' + won(r.직접구매_1건) + '원까지입니다. 총무국 구매 요청으로 바꿔 주세요.');
    return { amt, date: $('#c_date').value, vendor: $('#c_vendor').value, purpose: $('#c_what').value + (mode.startsWith('직접') ? ' 직접 구매' : ' 구매 요청'), calc: { 방식: mode.slice(0, 5), 단가: unit, 수량: qty }, block, warn, request: !mode.startsWith('직접'),
      show: [['금액', won(unit) + ' × ' + qty + ' = ' + won(amt) + '원'], ['방식', mode]] };
  },
  경조사: () => {
    const who = U($('#c_who').value), k = $('#c_kind').value, [amt, leave, flower] = S.gyeong[k], block = [];
    const dup = S.expenses.find(e => e.ck === '경조사' && e.calc && e.calc.대상 === who.name && e.calc.구분 === k && e.date.slice(0, 4) === '2026');
    if (dup) block.push(who.name + '님의 「' + k + '」 경조사비가 이미 청구돼 있습니다.');
    return { amt, date: $('#c_date').value, vendor: '경조사 규정 지급', purpose: who.name + ' ' + k + '(' + $('#c_date').value.slice(5) + ') 경조사비', calc: { 대상: who.name, 대상uid: who.id, 구분: k, 휴가: leave, 화환: flower }, block, warn: [], payTo: who.id,
      show: [['규정 금액', won(amt) + '원'], ['경조 휴가', leave + '일'], ['화환', flower ? '총무국이 주문' : '없음'], ['받는 사람', who.name]] };
  },
  차량운행: () => {
    const r = rule(TODAY), last = S.carlog[S.carlog.length - 1], from = num($('#c_from').value), to = num($('#c_to').value), warn = [], block = [];
    if (to <= from) block.push('도착 km가 출발 km보다 커야 합니다.');
    const gap = last ? from - last.to : 0;
    if (gap > r.차량_빈구간km) warn.push('지난 도착(' + won(last.to) + 'km)과 이번 출발 사이에 ' + gap + 'km 빈 구간이 있습니다. 감사 점검 대상으로 표시됩니다.');
    return { amt: 0, noMoney: true, date: $('#c_date').value, purpose: $('#c_dest').value, block, warn, rec: { date: $('#c_date').value, from, to, dest: $('#c_dest').value, purpose: $('#c_why').value, who: ME().name, gap },
      show: [['운행 거리', (to - from) + 'km'], ['빈 구간', gap > r.차량_빈구간km ? gap + 'km' : '없음']] };
  },
  자녀학자금: () => {
    const r = rule($('#c_date').value), paid = num($('#c_paid').value), sem = num($('#c_sem').value), amt = Math.min(Math.round(paid * r.학자금_비율), r.학자금_학기최고), block = [];
    const child = $('#c_child').value.trim();
    if (sem < 1 || sem > r.학자금_학기수) block.push('학기 차수는 1~' + r.학자금_학기수 + '학기만 됩니다.');
    if (S.expenses.find(e => e.ck === '자녀학자금' && e.calc && e.calc.자녀 === child && e.calc.학기 === sem)) block.push(child + ' ' + sem + '학기분은 이미 청구돼 있습니다.');
    return { amt, date: $('#c_date').value, vendor: $('#c_school').value, purpose: child + ' ' + sem + '학기 등록금 학자금', calc: { 자녀: child, 학기: sem, 납입: paid }, block, warn: [],
      show: [['납입액 × ' + r.학자금_비율, won(Math.round(paid * r.학자금_비율)) + '원'], ['학기 최고', won(r.학자금_학기최고) + '원'], ['청구 금액', won(amt) + '원']] };
  },
  도서인쇄: () => ({ amt: num($('#c_amt').value), date: $('#c_date').value, vendor: $('#c_vendor').value, purpose: $('#c_what').value, calc: null, block: [], warn: [], show: [['청구 금액', won(num($('#c_amt').value)) + '원']] }),
  우편택배: () => ({ amt: num($('#c_amt').value), date: $('#c_date').value, vendor: '우체국 외', purpose: $('#c_what').value + ' ' + num($('#c_cnt').value) + '건', calc: { 건수: num($('#c_cnt').value) }, block: [], warn: [], show: [['청구 금액', won(num($('#c_amt').value)) + '원']] }),
};
let CLAIM = null;
ACT.claim = d => {
  const me = ME(), k = d.k, nm = CK.find(x => x[0] === k)[1];
  CLAIM = { k, other: null };
  modal('<h2>' + nm + '</h2><div class="split"><div id="c_form">' + CFORM[k](me) + '</div><div><div class="c" style="background:#f9fbfb"><h3>규정 계산 <span class="mut">규정값 ' + ruleVer(TODAY) + '</span></h3><div id="c_out"></div></div>' +
    (k === '차량운행' || k === '소모품' ? '' : '<div class="c" style="margin-top:8px"><h3>받을 계좌</h3><div id="c_acc"></div></div>') + '<div class="c" style="margin-top:8px"><h3>결재선 미리 보기</h3><div id="c_chain"></div></div></div></div>' +
    '<div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn p" id="c_go">' + (k === '차량운행' ? '운행 기록 저장' : '제출') + '</button></div>', 980);
  const upd = () => {
    const o = CCALC[k](me);
    CLAIM.o = o;
    $('#c_out').innerHTML = '<table class="tb"><tbody>' + o.show.map(([a, b]) => '<tr><td class="mut">' + esc(a) + '</td><td class="n"><b>' + esc(b) + '</b></td></tr>').join('') + '</tbody></table>' +
      o.warn.map(w => '<div class="note a" style="margin-top:6px">' + esc(w) + '</div>').join('') + o.block.map(w => '<div class="note rd" style="margin-top:6px">' + esc(w) + '</div>').join('');
    if ($('#c_acc')) {
      const to = o.payTo || me.id;
      $('#c_acc').innerHTML = (CLAIM.other ? '<span class="bd rd">이번만 다른 계좌</span> ' + esc(accText(CLAIM.other)) + ' <button class="btn s" id="c_oth">해제</button>' :
        accText(accOf(to)) + (to === me.id && sw(me.dept, '다른계좌') ? '<br><label class="ck" style="margin-top:6px"><input type="checkbox" id="c_oth"> 이번만 다른 계좌로 받기</label>' : to !== me.id ? '<div class="mut">대상 직원 계좌로 지급</div>' : ''));
      const ob = $('#c_oth');
      if (ob) ob.addEventListener(ob.tagName === 'BUTTON' ? 'click' : 'change', () => {
        if (CLAIM.other) { CLAIM.other = null; upd(); return; }
        const keep = $('#c_form').innerHTML, vals = $$('#c_form input,#c_form select').map(x => x.type === 'checkbox' ? x.checked : x.value);
        otherDialog(oo => { reopen(keep, vals); CLAIM.other = oo; upd(); }, () => reopen(keep, vals));
      });
    }
    $('#c_chain').innerHTML = o.noMoney ? '<span class="mut">운행 기록은 결재 없이 저장되고, 월말에 총무국이 확인합니다.</span>' : o.request ? '<span class="mut">구매 요청은 총무국 담당에게 바로 갑니다.</span>' : chainHtml(chainFor(me.id, me.dept, o.amt, 'claim'), 0, 'draft');
    $('#c_go').disabled = o.block.length > 0;
  };
  const reopen = (keep, vals) => { ACT.claim(d); $('#c_form').innerHTML = keep; $$('#c_form input,#c_form select').forEach((x, i) => { if (x.type === 'checkbox') x.checked = vals[i]; else x.value = vals[i]; }); bindC(); upd(); };
  const bindC = () => { $$('#c_form input,#c_form select').forEach(x => { x.addEventListener('input', upd); x.addEventListener('change', upd); }); $('#c_go').onclick = go; };
  const go = () => {
    const o = CLAIM.o; if (o.block.length) return;
    ensureGuide(() => {
      if (o.noMoney) { S.carlog.push(o.rec); log(me.id, '차량 운행 기록', o.rec.dest + ' ' + (o.rec.to - o.rec.from) + 'km'); save(); close(); render(); return toast('운행 기록을 저장했습니다.' + (o.warn.length ? ' 빈 구간이 있어 표시해 두었습니다.' : '')); }
      if (o.request) { S.users.filter(u => u.role === 'ga').forEach(u => notify(u.id, me.name + '님 소모품 구매 요청: ' + o.purpose + ' ' + won(o.amt) + '원')); log(me.id, '소모품 구매 요청', o.purpose); save(); close(); render(); return toast('총무국에 구매 요청을 보냈습니다.'); }
      const e = { id: nid('e'), uid: me.id, dept: me.dept, bdept: '총무국', date: o.date, vendor: o.vendor, amt: o.amt, purpose: o.purpose, item: CKITEM[k], event: '', receipt: true, kind: 'claim', ck: k, calc: o.calc,
        sub: null, other: CLAIM.other, split: null, steps: [], cur: 0, status: 'draft' };
      if (o.payTo && o.payTo !== me.id) e.calc.대상uid = o.payTo;
      S.expenses.push(e); submitExp(e); save(); close(); location.hash = '#/expenses/money'; render(); toast('제출했습니다. 「내가 받을 돈」에서 진행 단계를 볼 수 있습니다.');
    });
  };
  bindC(); upd();
};
function claimPayTo(e) { return e.calc && e.calc.대상uid ? e.calc.대상uid : e.uid; }

/* ---------- 내가 받을 돈 (M5) ---------- */
V['expenses/money'] = () => {
  const me = ME();
  if (!sw(me.dept, '받을돈')) return '<div class="note a">이 국은 「내가 받을 돈」 기능이 꺼져 있습니다.</div>';
  const list = S.expenses.filter(e => isMoney(e) && claimPayTo(e) === me.id || (isMoney(e) && e.uid === me.id && claimPayTo(e) === me.id));
  const uniq = Array.from(new Set(list));
  const waiting = uniq.filter(e => mstage(e) < 5), sum = a => a.reduce((x, e) => x + e.amt, 0);
  const sched = uniq.filter(e => mstage(e) === 4), got = uniq.filter(e => e.status === 'paid' && (e.paidAt || '').slice(0, 7) === '2026-10');
  let h = '<div class="g4">' + kp('아직 받지 않은 돈', won(sum(waiting)), waiting.length + '건', 't') + kp('지급 예정', won(sum(sched)), sched.length ? '10/25 정기 지급' : '없음', 'v') +
    kp('이번 달 받은 돈', won(sum(got)), got.length + '건', 'ok') + kp('작성 중·보완', won(sum(uniq.filter(e => mstage(e) === 0))), '제출해야 받습니다', 'a') + '</div>';
  const tot = sum(uniq) || 1;
  h += '<div class="c"><h3>단계별 <span class="mut">결재가 하나 끝날 때마다 바로 바뀝니다</span></h3><div class="pipe">' + MSTAGE.map((s, i) => { const v = sum(uniq.filter(e => mstage(e) === i)); return v ? '<i style="flex:' + v + ';background:' + MCOL[i] + '" title="' + s + ' ' + won(v) + '원"></i>' : ''; }).join('') + '</div>' +
    '<div class="stg">' + MSTAGE.map((s, i) => '<span><i style="background:' + MCOL[i] + '"></i>' + s + ' ' + won(sum(uniq.filter(e => mstage(e) === i))) + '원</span>').join('') + '</div></div>';
  const by = { event: e => e.event ? evName(e.event) : e.kind === 'claim' ? '총무국 청구' : '행사 외', kind: e => e.kind === 'claim' ? e.ck : '개인 돈 지출', month: e => e.date.slice(0, 7) }[F.grp];
  const gs = {}; uniq.forEach(e => (gs[by(e)] = gs[by(e)] || []).push(e));
  h += '<div class="c"><div class="row"><h3 style="margin:0">' + uniq.length + '건</h3><span class="grow"></span>' + [['event', '행사별'], ['kind', '종류별'], ['month', '월별']].map(([k, l]) => '<button class="st ' + (F.grp === k ? 'on' : '') + '" data-a="fgrp" data-k="' + k + '">' + l + '</button>').join('') + '</div>';
  Object.keys(gs).sort().forEach(g => {
    const l = gs[g].sort((a, b) => a.date < b.date ? 1 : -1);
    h += '<h3 style="margin:14px 0 6px">' + esc(g) + ' <span class="mut">' + l.length + '건 · ' + won(sum(l)) + '원</span></h3><table class="tb"><tbody>' + l.map(e => {
      const st = mstage(e), b = S.batches.find(x => x.items.includes(e.id));
      const when = st === 5 ? (e.paidAt || '') + ' 받음' : st === 4 ? (b ? '10/25 지급 묶음' : '다음 정기 지급') : st === 3 ? '재정 확인 뒤 25일 지급' : st === 0 ? '제출 전' : '결재 진행 중';
      return '<tr class="click" data-a="open" data-id="' + e.id + '"><td class="mut" style="width:56px">' + e.date.slice(5) + '</td><td>' + esc(e.purpose) + (e.other ? ' <span class="bd rd">다른 계좌</span>' : '') + '</td><td style="width:400px"><div class="stg sm">' +
        MSTAGE.map((s, i) => '<span style="' + (i === st ? 'color:' + MCOL[i] + ';font-weight:800' : i < st ? 'color:#15803d' : '') + '">' + (i < st ? '✓' : '') + s + '</span>').join('') + '</div></td><td class="mut" style="width:140px">' + when + '</td><td class="n" style="width:90px"><b>' + won(e.amt) + '</b></td></tr>';
    }).join('') + '</tbody></table>';
  });
  if (!uniq.length) h += '<div class="empty">받을 돈이 없습니다.</div>';
  return h + '</div>';
};
ACT.fgrp = d => { F.grp = d.k; render(); };
