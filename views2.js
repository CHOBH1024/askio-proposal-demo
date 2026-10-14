// 화면 2: 검토함(결재 차례·총무 확인·검토), 카드 대조, 결산·출력(결산·지급·전표·가지급), 예산, 행사, 운영 점검, 통계, 감사, 직원, 설정

/* ---------- 검토함 ---------- */
function reviewTable(list, opts) {
  if (!list.length) return '<div class="empty">' + (opts.empty || '처리할 지출이 없습니다.') + '</div>';
  return '<table class="tb"><thead><tr><th style="width:28px"><input type="checkbox" id="allSel"></th><th>날짜</th><th>쓴 사람</th><th>목적</th><th>구분</th><th>예산</th>' + (opts.extra ? '<th>' + opts.extra[0] + '</th>' : '') + '<th class="right">금액</th><th>진행</th><th></th></tr></thead><tbody>' +
    list.map(e => {
      const u = budgetUse(e.bdept || e.dept, e.item);
      return '<tr class="click" data-a="open" data-id="' + e.id + '"><td data-stop="1"><input type="checkbox" class="rsel" value="' + e.id + '"></td><td class="mut">' + e.date.slice(5) + '</td><td>' + esc(U(e.uid).name) + '<br><span class="mut">' + e.dept + '</span></td>' +
        '<td>' + esc(e.purpose) + (e.event ? '<br><span class="mut">' + esc(evName(e.event)) + '</span>' : '') + '</td><td>' + kindText(e) + '</td><td style="width:120px">' + (u ? bar(u.rate, u.pace) + '<span class="mut">' + Math.round(u.rate * 100) + '%</span>' : '') + '</td>' +
        (opts.extra ? '<td>' + opts.extra[1](e) + '</td>' : '') + '<td class="n"><b>' + won(e.amt) + '</b></td><td class="nw"><span class="mut">' + (e.cur + 1) + '/' + e.steps.length + '단계</span><br>' + e.steps.slice(0, e.cur).map(x => '<span class="bd ok" title="' + esc(stepWho(x)) + '">' + esc(x.label) + '</span>').join(' ') + ' <span class="bd b">' + esc(e.steps[e.cur].label) + '</span></td>' +
        '<td data-stop="1" style="white-space:nowrap"><button class="btn s r" data-a="rejectForm" data-id="' + e.id + '">보완</button> <button class="btn s p" data-a="approve" data-id="' + e.id + '">' + esc(e.steps[e.cur].label) + '</button></td></tr>';
    }).join('') + '</tbody></table>';
}
V['review/approve'] = () => {
  const me = ME();
  const list = S.expenses.filter(e => canAct(e, me.id) && e.steps[e.cur].uid || (e.status === 'progress' && e.steps[e.cur] && e.steps[e.cur].dele === me.id));
  const lim = (Object.values(S.lines).flat().find(a => a.uid === me.id) || {}).limit;
  let h = '<div class="note t">' + (lim === undefined ? '결재선에 등록되지 않은 사람입니다. 「보는 사람」을 결재자(정예시·최예시·한예시·윤예시)로 바꿔 보세요.' : me.name + ' ' + me.title + '님 결재 한도 ' + (lim ? won(lim) + '원' : '제한 없음') + '. 한도를 넘는 지출은 결재하면 다음 결재자에게 자동으로 올라갑니다.') + '</div>';
  h += '<div class="c"><div class="row"><h3 style="margin:0">결재 차례 <span class="mut">' + list.length + '건</span></h3><span class="grow"></span><button class="btn" data-a="deleForm">대결 지정</button><button class="btn p" data-a="bulkApprove">선택 결재</button></div>' + reviewTable(list, { empty: '지금 결재할 지출이 없습니다.' }) + '</div>';
  const mine = S.expenses.filter(e => e.steps.some((s, i) => (s.uid === me.id || s.dele === me.id) && i < e.cur));
  h += '<div class="c"><h3>내가 결재한 것 <span class="mut">' + mine.length + '건</span></h3>' + expRows(mine) + '</div>';
  return h;
};
V['review/ga'] = () => {
  const me = ME();
  const list = S.expenses.filter(e => e.status === 'progress' && e.steps[e.cur] && e.steps[e.cur].role === 'ga');
  let h = me.role !== 'ga' ? '<div class="note a">총무 확인은 총무국 담당(이예시 대리)이 합니다. 「보는 사람」을 이예시로 바꾸면 처리할 수 있습니다. 지금은 보기만 됩니다.</div>' : '<div class="note t">총무국 청구가 규정대로 계산됐는지 확인합니다. 시스템 계산값과 다르면 보완 요청하세요.</div>';
  h += '<div class="c"><div class="row"><h3 style="margin:0">총무 확인 대기 <span class="mut">' + list.length + '건</span></h3><span class="grow"></span>' + (me.role === 'ga' ? '<button class="btn p" data-a="bulkApprove">선택 확인</button>' : '') + '</div>' +
    reviewTable(list, { empty: '총무 확인 대기 중인 청구가 없습니다.', extra: ['규정 계산', e => e.calc ? '<span class="bd ok">규정값 ' + ruleVer(e.date) + ' 일치</span>' : '<span class="mut">해당 없음</span>'] }) + '</div>';
  const cl = S.carlog.slice().reverse();
  h += '<div class="c"><h3>법인차량 운행일지 <span class="mut">빈 구간 ' + rule().차량_빈구간km + 'km 넘으면 표시</span></h3><table class="tb"><thead><tr><th>날짜</th><th>운전</th><th>구간</th><th>목적</th><th class="right">출발</th><th class="right">도착</th><th class="right">거리</th><th>점검</th></tr></thead><tbody>' +
    cl.map(c => '<tr><td class="mut">' + c.date.slice(5) + '</td><td>' + esc(c.who) + '</td><td>' + esc(c.dest) + '</td><td>' + esc(c.purpose) + '</td><td class="n">' + won(c.from) + '</td><td class="n">' + won(c.to) + '</td><td class="n">' + (c.to - c.from) + 'km</td><td>' + (c.gap > rule().차량_빈구간km ? '<span class="bd rd">빈 구간 ' + c.gap + 'km</span>' : '<span class="bd ok">이어짐</span>') + '</td></tr>').join('') + '</tbody></table></div>';
  return h;
};
V['review/check'] = () => {
  const me = ME();
  const list = S.expenses.filter(e => e.status === 'progress' && e.steps[e.cur] && e.steps[e.cur].role === 'finance');
  let h = me.role !== 'finance' ? '<div class="note a">지금 화면(검토)은 재정 담당이 쓰는 기존 화면입니다. 「보는 사람」을 오예시(재정 담당)로 바꾸면 확인할 수 있습니다.</div>' : '';
  const red = list.filter(e => e.other);
  if (red.length) h += '<div class="note rd">「이번만 다른 계좌」가 ' + red.length + '건 있습니다. 50만원 이상이거나 처음 보는 계좌면 본인에게 전화로 확인한 뒤 확인 처리하세요.</div>';
  h += '<div class="c"><div class="row"><h3 style="margin:0">재정 확인 대기 <span class="mut">' + list.length + '건</span></h3><span class="grow"></span>' + (me.role === 'finance' ? '<button class="btn p" data-a="bulkApprove">선택 확인</button>' : '') + '</div>' +
    reviewTable(list, { empty: '재정 확인 대기 중인 지출이 없습니다.', extra: ['받을 계좌', e => !isMoney(e) ? '<span class="mut">카드</span>' : e.other ? '<span class="bd rd">다른 계좌' + (e.other.fresh ? ' · 처음' : '') + (e.amt >= 500000 ? ' · 50만↑' : '') + '</span><br><span class="mut">' + esc(e.other.holder) + '</span>' : '<span class="bd t">기본 계좌</span>'] }) + '</div>';
  return h;
};
ACT.approve = d => {
  const e = X(d.id);
  if (!canAct(e, S.me)) return toast('지금 이 지출을 처리할 차례가 아닙니다. 「보는 사람」을 확인하세요.');
  const s = e.steps[e.cur];
  if (s.role === 'finance' && e.other && (e.other.fresh || e.amt >= 500000) && !e.other.phone) {
    return modal('<h2>전화 확인이 필요합니다</h2><p>' + esc(U(e.uid).name) + '님이 이번만 다른 계좌(' + esc(accText(e.other)) + ')로 받겠다고 했습니다. ' + (e.other.fresh ? '처음 보는 계좌' : '') + (e.amt >= 500000 ? ' 50만원 이상' : '') + '이라 본인에게 전화로 확인해야 합니다.</p>' +
      '<p class="mut">사유: ' + esc(e.other.reason) + (e.other.evid ? ' · 증빙 ' + esc(e.other.evid) : '') + '</p><label class="ck"><input type="checkbox" id="ph_ok"> ' + esc(U(e.uid).name) + '님과 통화해 본인이 신청한 것을 확인했습니다.</label>' +
      '<div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn p" id="ph_go" disabled>확인 처리</button></div>');
  }
  doApprove(e); save(); close(); render(); toast(s.label + ' 처리했습니다.' + (e.status === 'progress' ? ' 다음: ' + e.steps[e.cur].label + ' · ' + stepWho(e.steps[e.cur]) : ''));
};
document.addEventListener('change', ev => {
  if (ev.target.id === 'ph_ok') $('#ph_go').disabled = !ev.target.checked;
  if (ev.target.id === 'allSel') $$('.rsel').forEach(x => x.checked = ev.target.checked);
});
document.addEventListener('click', ev => {
  if (ev.target.id !== 'ph_go') return;
  const e = S.expenses.find(x => x.status === 'progress' && x.other && canAct(x, S.me) && !x.other.phone);
  if (!e) return close();
  e.other.phone = S.me + ' ' + nowStamp(); S.otherSeen[e.other.no] = 1; log(S.me, '다른 계좌 전화 확인', e.vendor);
  doApprove(e); save(); close(); render(); toast('전화 확인을 기록하고 재정 확인했습니다. 지급은 별도 묶음으로 갑니다.');
});
function doApprove(e) {
  const s = e.steps[e.cur];
  s.done = true; s.by = S.me; s.at = nowStamp();
  log(S.me, s.label, e.vendor + ' ' + e.amt);
  e.cur++;
  if (e.cur >= e.steps.length) {
    e.status = 'confirmed';
    notify(e.uid, '「' + e.purpose + '」 ' + won(e.amt) + '원 확인이 끝났습니다.' + (isMoney(e) ? ' 다음 정기 지급(25일)에 들어갑니다.' : ''));
  } else notifyStep(e);
}
ACT.bulkApprove = () => {
  const ids = $$('.rsel:checked').map(x => x.value);
  if (!ids.length) return toast('먼저 고르세요.');
  let n = 0, skip = 0;
  ids.forEach(id => { const e = X(id); if (canAct(e, S.me) && !(e.steps[e.cur].role === 'finance' && e.other && !e.other.phone)) { doApprove(e); n++; } else skip++; });
  save(); render(); toast(n + '건 처리했습니다.' + (skip ? ' ' + skip + '건은 따로 확인이 필요해 남겼습니다.' : ''));
};
ACT.rejectForm = d => {
  const e = X(d.id);
  modal('<h2>보완 요청</h2><p>' + esc(U(e.uid).name) + ' · ' + esc(e.purpose) + ' · ' + won(e.amt) + '원</p>' + fld('사유', '<input id="rj" placeholder="무엇을 고쳐야 하는지">') +
    '<div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn r" data-a="reject" data-id="' + e.id + '">보완 요청 보내기</button></div>');
};
ACT.reject = d => {
  const e = X(d.id), why = $('#rj').value.trim() || '내용 확인 필요';
  e.status = 'rejected'; e.reject = why; e.steps[e.cur].back = true;
  log(S.me, '보완 요청', e.vendor + ' · ' + why); notify(e.uid, '「' + e.purpose + '」 보완 요청: ' + why); save(); close(); render(); toast('보완 요청을 보냈습니다.');
};
ACT.deleForm = () => {
  const me = ME();
  modal('<h2>대결 지정</h2><p>자리를 비우는 동안 내 결재 차례를 다른 사람이 대신 처리합니다. 지금 내 차례인 지출에 바로 적용됩니다.</p>' +
    fld('대신할 사람', '<select id="dl">' + S.users.filter(u => u.id !== me.id && (u.role === 'approver' || u.role === 'exec')).map(u => '<option value="' + u.id + '">' + u.name + ' ' + u.dept + ' ' + u.title + '</option>').join('') + '</select>') +
    fld('기간', '<input value="2026-10-15 ~ 2026-10-17">') + '<div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn p" data-a="deleSave">지정</button></div>');
};
ACT.deleSave = () => {
  const to = $('#dl').value; let n = 0;
  S.expenses.forEach(e => { const s = e.status === 'progress' && e.steps[e.cur]; if (s && s.uid === S.me && !s.dele) { s.dele = to; n++; notify(to, ME().name + '님 대결: 「' + e.purpose + '」 결재 차례가 넘어왔습니다.'); } });
  log(S.me, '대결 지정', U(to).name + ' ' + n + '건'); save(); close(); render(); toast(U(to).name + '님에게 ' + n + '건을 넘겼습니다.');
};

/* ---------- 카드 대조 (M3 카드 자동 연결) ---------- */
function cardCands(c) {
  const ex = S.expenses.filter(e => e.kind === 'card' && e.card === c.card && !S.cards.some(x => x.exp === e.id));
  const exact = ex.find(e => e.date === c.date && e.amt === c.amt);
  if (exact) return { e: exact, how: 'exact' };
  const near = ex.find(e => Math.abs(new Date(e.date) - new Date(c.date)) <= 2 * 864e5 && Math.abs(e.amt - c.amt) <= Math.max(1000, c.amt * 0.05) && vkey(e.vendor) === vkey(c.vendor));
  if (near) return { e: near, how: 'near' };
  return null;
}
V.cards = () => {
  const on = sw(ME().dept, '카드자동연결');
  const linked = S.cards.filter(c => c.exp), open = S.cards.filter(c => !c.exp);
  let h = '<div class="g4">' + kp('카드 사용', S.cards.length, won(S.cards.reduce((a, c) => a + c.amt, 0)) + '원', '', '건') + kp('연결됨', linked.length, '등록된 지출과 맞음', 'ok', '건') + kp('연결 후보', open.filter(cardCands).length, '자동 연결 가능', 'b', '건') + kp('지출 없음', open.filter(c => !cardCands(c)).length, '사용자에게 등록 요청', 'rd', '건') + '</div>';
  h += '<div class="c"><div class="row"><h3 style="margin:0">10월 카드 사용 내역</h3><span class="grow"></span>' + (on ? '<button class="btn p" data-a="autoLink">자동 연결</button>' : '<span class="mut">이 국은 카드 자동 연결이 꺼져 있습니다</span>') + '</div><table class="tb"><thead><tr><th>카드</th><th>날짜</th><th>가맹점</th><th class="right">금액</th><th>등록된 지출</th><th></th></tr></thead><tbody>' +
    S.cards.slice().sort((a, b) => a.date < b.date ? -1 : 1).map(c => {
      const e = c.exp && X(c.exp), cand = !c.exp && cardCands(c);
      return '<tr><td>#' + c.card + ' <span class="mut">' + c.cname + '</span></td><td class="mut">' + c.date.slice(5) + '</td><td>' + esc(c.vendor) + '</td><td class="n"><b>' + won(c.amt) + '</b></td><td>' +
        (e ? '<span class="bd ok">연결됨</span> ' + esc(U(e.uid).name) + ' · ' + esc(e.purpose) : cand ? (cand.how === 'exact' ? '<span class="bd b">같은 날·같은 금액</span> ' : '<span class="bd a">금액 ' + won(Math.abs(cand.e.amt - c.amt)) + '원 차이</span> ') + esc(U(cand.e.uid).name) + ' · ' + esc(cand.e.vendor) + ' ' + won(cand.e.amt) + '원' : '<span class="bd rd">등록된 지출 없음</span>') + '</td><td style="white-space:nowrap">' +
        (e ? '<button class="btn s" data-a="unlink" data-id="' + c.id + '">끊기</button>' : cand ? '<button class="btn s p" data-a="link" data-id="' + c.id + '" data-e="' + cand.e.id + '">' + (cand.how === 'near' ? '확인 후 연결' : '연결') + '</button>' : '<button class="btn s" data-a="askReg" data-id="' + c.id + '">등록 요청</button>') + '</td></tr>';
    }).join('') + '</tbody></table><div class="mut" style="margin-top:6px">같은 카드·같은 날·같은 금액은 바로 연결하고, 2일·5% 안쪽으로 다른 것은 「금액 차이」로 보여 사람이 확인한 뒤 연결합니다.</div></div>';
  return h;
};
ACT.autoLink = () => {
  let n = 0, m = 0;
  S.cards.forEach(c => { if (c.exp) return; const k = cardCands(c); if (k && k.how === 'exact') { c.exp = k.e.id; n++; } else if (k) m++; });
  log(S.me, '카드 자동 연결', n + '건'); save(); render(); toast(n + '건 자동 연결했습니다.' + (m ? ' 금액이 조금 다른 ' + m + '건은 확인 후 연결하세요.' : ''));
};
ACT.link = d => {
  const c = S.cards.find(x => x.id === d.id), e = X(d.e);
  if (e.amt !== c.amt) { e.hist.push('금액 ' + won(e.amt) + ' > ' + won(c.amt) + ' (카드 내역 기준)'); e.amt = c.amt; }
  c.exp = e.id; log(S.me, '카드 연결', c.vendor + ' ' + c.amt); save(); render(); toast('연결했습니다. 금액은 카드 내역 기준으로 맞췄습니다.');
};
ACT.unlink = d => { const c = S.cards.find(x => x.id === d.id); c.exp = null; log(S.me, '카드 연결 끊기', c.vendor); save(); render(); };
ACT.askReg = d => { const c = S.cards.find(x => x.id === d.id); const owner = c.card === '5591' ? 'u3' : 'u1'; notify(owner, '카드 #' + c.card + ' ' + c.date.slice(5) + ' ' + c.vendor + ' ' + won(c.amt) + '원: 등록된 지출이 없습니다. 영수증을 올려 주세요.'); save(); toast(U(owner).name + '님에게 등록 요청을 보냈습니다.'); };

/* ---------- 결산·출력 > 결산 (M7 지출결의서) ---------- */
V['settle/report'] = () => {
  const dept = F.rdept || ME().dept;
  const list = S.expenses.filter(e => e.dept === dept && e.status !== 'draft' && e.status !== 'rejected' && e.date.slice(0, 7) === '2026-10');
  const depts = Object.keys(S.lines);
  let h = '<div class="c noprint"><div class="row"><b>지출결의서 미리 보기</b><span class="mut">결재가 끝났거나 진행 중인 10월 지출</span><span class="grow"></span><select id="rdept">' + depts.map(x => '<option' + (x === dept ? ' selected' : '') + '>' + x + '</option>').join('') + '</select><button class="btn prt" onclick="window.print()">인쇄</button></div></div>';
  const byItem = {}; list.forEach(e => spentOf(e).forEach(p => { byItem[p.item] = (byItem[p.item] || 0) + p.amt; }));
  h += '<div class="doc"><div class="t">지 출 결 의 서</div><div class="row" style="margin-bottom:6px"><span>결의부서: ' + dept + ' (' + (S.jr.g20[dept] || '') + ')</span><span class="grow"></span><span>2026년 10월분 · 작성 ' + TODAY + '</span></div>' +
    '<div class="sg" style="margin:0 0 8px"><span>담당</span><span>' + (dept === '기획국' ? '팀장' : '국장') + '</span><span>' + (dept === '기획국' ? '국장' : '사무총장') + '</span><span>재정</span></div>' +
    '<table><thead><tr><th>예산과목</th><th>계정코드</th><th style="text-align:right">금액</th></tr></thead><tbody>' + Object.entries(byItem).map(([k, v]) => '<tr><td>' + k + '</td><td>' + (S.jr.codes[k] || '') + '</td><td style="text-align:right">' + won(v) + '</td></tr>').join('') +
    '<tr><th>합계</th><th></th><th style="text-align:right">' + won(list.reduce((a, e) => a + e.amt, 0)) + '</th></tr></tbody></table><div style="height:10px"></div>' +
    '<table><thead><tr><th>날짜</th><th>쓴 사람</th><th>내용</th><th>구분</th><th>증빙</th><th style="text-align:right">금액</th></tr></thead><tbody>' +
    (list.length ? list.map(e => '<tr><td>' + e.date.slice(5) + '</td><td>' + esc(U(e.uid).name) + '</td><td>' + esc(e.vendor + ' · ' + e.purpose) + '</td><td>' + kindText(e) + '</td><td>' + (e.receipt ? '영수증' : e.sub ? '대체 사유서' : '없음') + '</td><td style="text-align:right">' + won(e.amt) + '</td></tr>').join('') : '<tr><td colspan="6" style="text-align:center">없음</td></tr>') + '</tbody></table></div>';
  return h;
};
document.addEventListener('change', ev => { if (ev.target.id === 'rdept') { F.rdept = ev.target.value; render(); } });

/* ---------- 지급·송금 (M10, E11) ---------- */
V['settle/pay'] = () => {
  const me = ME(), fin = me.role === 'finance' || me.role === 'ga';
  const ready = S.expenses.filter(e => isMoney(e) && e.status === 'confirmed' && !S.batches.some(b => b.items.includes(e.id)));
  let h = fin ? '' : '<div class="note a">지급·송금은 재정 담당 화면입니다. 「보는 사람」을 오예시(재정 담당)로 바꾸면 묶음을 만들고 지급할 수 있습니다. 지금은 보기만 됩니다.</div>';
  h += '<div class="g4">' + kp('지급 대기', won(ready.reduce((a, e) => a + e.amt, 0)), ready.length + '건 · 확인 끝남', 't') + kp('지급 묶음', S.batches.filter(b => b.state !== 'paid').length, '송금 전', 'v', '개') +
    kp('다른 계좌 묶음', S.batches.filter(b => b.other && b.state !== 'paid').length, '2차 확인 필요', 'rd', '개') + kp('이번 달 지급', won(S.expenses.filter(e => e.status === 'paid' && (e.paidAt || '') >= '2026-10').reduce((a, e) => a + e.amt, 0)), '받음 처리 끝', 'ok') + '</div>';
  h += '<div class="c"><div class="row"><h3 style="margin:0">지급 대기 <span class="mut">재정 확인이 끝난 개인 돈·청구</span></h3><span class="grow"></span>' + (fin ? '<button class="btn p" data-a="mkBatch"' + (ready.length ? '' : ' disabled') + '>10/25 지급 묶음 만들기</button>' : '') + '</div>' +
    (ready.length ? '<table class="tb"><thead><tr><th>받는 사람</th><th>계좌</th><th>내용</th><th class="right">금액</th></tr></thead><tbody>' + ready.map(e => { const p = payeeOf(e); return '<tr class="click" data-a="open" data-id="' + e.id + '"><td>' + esc(U(claimPayTo(e)).name) + '</td><td>' + (e.other ? '<span class="bd rd">다른 계좌</span> ' : '') + esc(p ? p.bank + ' ' + p.no + ' (' + p.holder + ')' : '계좌 없음') + '</td><td>' + esc(e.purpose) + '</td><td class="n"><b>' + won(e.amt) + '</b></td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">지급 대기 중인 건이 없습니다. 「보는 사람」을 바꿔 결재·확인을 끝내 보세요.</div>') +
    '<div class="mut" style="margin-top:6px">다른 계좌로 받는 건은 자동으로 따로 묶이고, 묶음을 만든 사람과 다른 사람이 한 번 더 확인해야 송금할 수 있습니다.</div></div>';
  S.batches.slice().reverse().forEach(b => {
    const items = b.items.map(X).filter(Boolean), tot = items.reduce((a, e) => a + e.amt, 0);
    h += '<div class="c"><div class="row"><h3 style="margin:0">' + (b.other ? '<span class="bd rd">다른 계좌 묶음</span> ' : '') + '지급 묶음 ' + b.id.toUpperCase() + ' <span class="mut">' + b.date + ' · ' + items.length + '건 · ' + won(tot) + '원 · 만든 사람 ' + U(b.by).name + '</span></h3><span class="grow"></span>' +
      (b.state === 'paid' ? '<span class="bd ok">지급 완료 ' + (b.paidAt || '') + '</span>' : b.other && !b.check2 ? (fin ? '<button class="btn s r" data-a="check2" data-id="' + b.id + '">2차 확인</button>' : '<span class="bd rd">2차 확인 전</span>') : '<span class="bd v">송금 준비</span>') +
      '<button class="btn s" data-a="payDoc" data-id="' + b.id + '">송금요청서</button><button class="btn s" data-a="payCsv" data-id="' + b.id + '"' + (b.other && !b.check2 ? ' disabled' : '') + '>이체 파일</button>' +
      (b.state !== 'paid' && fin ? '<button class="btn s p" data-a="paid" data-id="' + b.id + '"' + (b.other && !b.check2 ? ' disabled' : '') + '>지급 완료</button>' : '') + '</div>' +
      (b.check2 ? '<div class="mut" style="margin-top:4px">2차 확인: ' + esc(U(b.check2.by).name) + ' ' + b.check2.at + '</div>' : '') + '</div>';
  });
  return h;
};
ACT.mkBatch = () => {
  const ready = S.expenses.filter(e => isMoney(e) && e.status === 'confirmed' && !S.batches.some(b => b.items.includes(e.id)));
  const normal = ready.filter(e => !e.other), other = ready.filter(e => e.other);
  if (normal.length) S.batches.push({ id: nid('b'), date: '2026-10-25', by: S.me, items: normal.map(e => e.id), other: false, state: 'ready', check2: null });
  if (other.length) S.batches.push({ id: nid('b'), date: '2026-10-25', by: S.me, items: other.map(e => e.id), other: true, state: 'ready', check2: null });
  ready.forEach(e => { e.status = 'scheduled'; notify(claimPayTo(e), '「' + e.purpose + '」 ' + won(e.amt) + '원이 10/25 지급 묶음에 들어갔습니다.'); });
  log(S.me, '지급 묶음', ready.length + '건'); save(); render(); toast('지급 묶음을 만들었습니다' + (other.length ? '(다른 계좌 ' + other.length + '건은 따로 묶음)' : '') + '.');
};
ACT.check2 = d => {
  const b = S.batches.find(x => x.id === d.id);
  if (b.by === S.me) return modal('<h2>2차 확인은 다른 사람이 합니다</h2><p>묶음을 만든 ' + esc(U(b.by).name) + '님이 아닌 사람이 확인해야 합니다. 「보는 사람」을 이예시(총무 확인 담당) 등으로 바꿔 확인하세요.</p><div class="row end"><button class="btn p" data-a="close">알겠습니다</button></div>');
  const items = b.items.map(X);
  modal('<h2>다른 계좌 묶음 2차 확인</h2><table class="tb"><tbody>' + items.map(e => '<tr><td>' + esc(U(e.uid).name) + '</td><td>' + esc(accText(e.other)) + '<br><span class="mut">사유: ' + esc(e.other.reason) + (e.other.phone ? ' · 전화 확인함' : '') + '</span></td><td class="n">' + won(e.amt) + '</td></tr>').join('') + '</tbody></table>' +
    '<label class="ck" style="margin-top:8px"><input type="checkbox" id="c2"> 계좌·예금주·사유·증빙을 확인했습니다.</label><div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn p" data-a="check2ok" data-id="' + b.id + '">2차 확인</button></div>');
};
ACT.check2ok = d => { if (!$('#c2').checked) return toast('확인란을 체크하세요.'); const b = S.batches.find(x => x.id === d.id); b.check2 = { by: S.me, at: nowStamp() }; log(S.me, '다른 계좌 묶음 2차 확인', b.id); save(); close(); render(); toast('2차 확인했습니다.'); };
ACT.payDoc = d => {
  const b = S.batches.find(x => x.id === d.id), items = b.items.map(X).filter(Boolean);
  const g = {}; items.forEach(e => { const p = payeeOf(e), k = p ? p.bank + '|' + p.no + '|' + p.holder : '?'; (g[k] = g[k] || []).push(e); });
  modal('<div class="doc"><div class="t">송 금 요 청 서</div><div class="row" style="margin-bottom:6px"><span>지급 예정일 ' + b.date + '</span><span class="grow"></span><span>묶음 ' + b.id.toUpperCase() + (b.other ? ' · 다른 계좌' : '') + '</span></div>' +
    '<table><thead><tr><th>번호</th><th>받는 사람</th><th>은행</th><th>계좌번호</th><th>예금주</th><th>내용</th><th style="text-align:right">금액</th></tr></thead><tbody>' +
    Object.entries(g).map(([k, l], i) => { const [bank, no, holder] = k.split('|'); return '<tr><td>' + (i + 1) + '</td><td>' + esc(U(claimPayTo(l[0])).name) + '</td><td>' + esc(bank) + '</td><td>' + esc(no) + '</td><td>' + esc(holder) + '</td><td>' + esc(l.map(e => e.purpose).join(', ')) + '</td><td style="text-align:right">' + won(l.reduce((a, e) => a + e.amt, 0)) + '</td></tr>'; }).join('') +
    '<tr><th colspan="6">합계 (' + Object.keys(g).length + '명 · ' + items.length + '건)</th><th style="text-align:right">' + won(items.reduce((a, e) => a + e.amt, 0)) + '</th></tr></tbody></table>' +
    '<p class="mut" style="margin:8px 0 0">같은 사람·같은 계좌는 한 줄로 합쳤습니다. 계좌번호는 시연용으로 가렸습니다.</p><div class="sg"><span>담당</span><span>재정</span><span>국장</span></div></div>' +
    '<div class="row end noprint" style="margin-top:12px"><button class="btn prt" onclick="window.print()">인쇄</button><button class="btn p" data-a="close">닫기</button></div>', 820);
};
ACT.payCsv = d => {
  const b = S.batches.find(x => x.id === d.id), items = b.items.map(X).filter(Boolean);
  const rows = [['은행', '계좌번호', '예금주', '금액', '받는 분 통장 표시', '내 통장 표시']].concat(items.map(e => { const p = payeeOf(e) || {}; return [p.bank, p.no, p.holder, e.amt, '협회' + (e.ck || '정산'), U(claimPayTo(e)).name + ' ' + (e.ck || '정산')]; }));
  download('이체파일_' + b.id + '_' + b.date + '.csv', rows.map(r => r.join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  log(S.me, '이체 파일', b.id); save();
};
ACT.paid = d => {
  const b = S.batches.find(x => x.id === d.id);
  b.state = 'paid'; b.paidAt = TODAY;
  b.items.map(X).filter(Boolean).forEach(e => { e.status = 'paid'; e.paidAt = TODAY; notify(claimPayTo(e), '「' + e.purpose + '」 ' + won(e.amt) + '원을 보냈습니다.'); });
  log(S.me, '지급 완료', b.id); save(); render(); toast('지급 완료로 바꿨습니다. 받는 사람의 「내가 받을 돈」이 「받음」으로 바뀝니다.');
};

/* ---------- 전표·G20 (M6) ---------- */
function journal() {
  const J = S.jr, out = [];
  const conf = S.expenses.filter(e => ['confirmed', 'scheduled', 'paid'].includes(e.status));
  const supplies = conf.filter(e => e.item === '소모품비' && !e.split);
  conf.filter(e => !supplies.includes(e)).forEach(e => out.push(voucher([e], e)));
  if (supplies.length) out.push(voucher(supplies, supplies[0], '10월 소모품비 월 합산'));
  function voucher(list, e0, title) {
    const lines = [];
    list.forEach(e => {
      const tail = e.kind === 'claim' ? '(청구정산)' : e.kind === 'personal' ? '(개인정산)' : '';
      spentOf(e).forEach(p => lines.push({ side: '차', code: J.codes[p.item] || '?', name: p.item, vendor: e.vendor, amt: p.amt, desc: e.purpose + tail }));
      const cr = e.kind === 'card' ? { code: J.card, name: '미지급금(법인카드)', vendor: '법인카드 #' + e.card } : { code: e.status === 'paid' && (e.paidAt || '').slice(8) <= '25' ? J.bank : J.personal, name: e.status === 'paid' ? '보통예금' : '미지급금(개인)', vendor: J.pvendor + ' ' + U(claimPayTo(e)).name };
      lines.push({ side: '대', code: cr.code, name: cr.name, vendor: cr.vendor, amt: e.amt, desc: e.purpose + tail });
      if (e.kind === 'claim') lines.push({ side: '대', code: J.adv, name: '선급금(청구 연결)', vendor: '', amt: 0, desc: '청구정산 연결 줄' });
    });
    return { no: 0, date: list[list.length - 1].date, dept: e0.bdept || e0.dept, g20: J.g20[e0.bdept || e0.dept], title: title || e0.purpose, lines, ok: lines.filter(l => l.side === '차').reduce((a, l) => a + l.amt, 0) === lines.filter(l => l.side === '대').reduce((a, l) => a + l.amt, 0) };
  }
  out.sort((a, b) => a.date < b.date ? -1 : 1).forEach((v, i) => v.no = i + 1);
  return out;
}
V['settle/journal'] = () => {
  const vs = journal();
  let h = '<div class="note t">재정 확인이 끝난 지출로 전표를 만듭니다. 분개 규칙(서비스 설정 > 분개 규칙)을 따르고, 결과는 굿바이G20 입력용 파일로 받습니다. 차변·대변 합이 다르면 빨간 표시가 납니다.</div>';
  h += '<div class="c"><div class="row"><h3 style="margin:0">전표 ' + vs.length + '장 <span class="mut">결의부서 코드는 G20 기준</span></h3><span class="grow"></span><button class="btn" data-a="jrCsv">G20 입력 파일(CSV)</button><button class="btn" data-a="jrJson">JSON</button></div>';
  vs.forEach(v => {
    h += '<div style="margin-top:12px"><div class="row"><b>#' + v.no + ' ' + v.date + ' · ' + esc(v.title) + '</b><span class="mut">결의부서 ' + v.dept + ' ' + v.g20 + '</span><span class="grow"></span>' + (v.ok ? '<span class="bd ok">차대 일치</span>' : '<span class="bd rd">차대 불일치</span>') + '</div>' +
      '<table class="tb" style="table-layout:fixed"><thead><tr><th style="width:48px">구분</th><th style="width:24%">계정</th><th style="width:20%">거래처</th><th>적요</th><th class="right" style="width:110px">금액</th></tr></thead><tbody>' +
      v.lines.map(l => '<tr><td>' + l.side + '</td><td>' + l.code + ' ' + esc(l.name) + '</td><td>' + esc(l.vendor) + '</td><td>' + esc(l.desc) + '</td><td class="n">' + won(l.amt) + '</td></tr>').join('') + '</tbody></table></div>';
  });
  if (!vs.length) h += '<div class="empty">아직 확인이 끝난 지출이 없습니다.</div>';
  return h + '</div>';
};
ACT.jrCsv = () => {
  const rows = [['전표번호', '일자', '결의부서', '구분', '계정코드', '계정', '거래처', '적요', '금액']];
  journal().forEach(v => v.lines.forEach(l => rows.push([v.no, v.date, v.g20, l.side, l.code, l.name, l.vendor, '"' + l.desc.replace(/"/g, "'") + '"', l.amt])));
  download('G20_전표_2026-10.csv', rows.map(r => r.join(',')).join('\r\n'), 'text/csv;charset=utf-8'); log(S.me, '전표 파일', 'CSV'); save();
};
ACT.jrJson = () => { download('G20_전표_2026-10.json', JSON.stringify(journal(), null, 1), 'application/json'); };

/* ---------- 가지급·선급 (E9) ---------- */
V['settle/advance'] = () => {
  const open = S.advances.filter(a => !a.done);
  let h = '<div class="g4">' + kp('정산 안 된 가지급', won(open.filter(a => a.type === '가지급').reduce((x, a) => x + a.amt, 0)), open.filter(a => a.type === '가지급').length + '건', 'a') +
    kp('정산 안 된 선급', won(open.filter(a => a.type === '선급').reduce((x, a) => x + a.amt, 0)), open.filter(a => a.type === '선급').length + '건', 'v') +
    kp('기한 지남', open.filter(a => a.due < TODAY).length, '알림 보냄', 'rd', '건') + kp('이번 달 정산', S.advances.filter(a => a.done && (a.doneAt || '') >= '2026-10').length, '', 'ok', '건') + '</div>';
  h += '<div class="c"><div class="row"><h3 style="margin:0">가지급·선급 대장</h3><span class="grow"></span><button class="btn" data-a="advNew">새로 등록</button></div><table class="tb"><thead><tr><th>구분</th><th>받은 사람·업체</th><th>날짜</th><th>내용</th><th class="right">금액</th><th class="right">쓴 돈</th><th class="right">돌려줄 돈</th><th>기한</th><th></th></tr></thead><tbody>' +
    S.advances.map(a => '<tr><td><span class="bd ' + (a.type === '가지급' ? 'a' : 'v') + '">' + a.type + '</span></td><td>' + esc(a.payee || U(a.uid).name) + '</td><td class="mut">' + a.date.slice(5) + '</td><td>' + esc(a.purpose) + '</td><td class="n">' + won(a.amt) + '</td><td class="n">' + won(a.used) + '</td><td class="n">' + won(a.amt - a.used) + '</td>' +
      '<td>' + (a.done ? '<span class="bd ok">정산 끝</span>' : a.due < TODAY ? '<span class="bd rd">' + a.due.slice(5) + ' 지남</span>' : '<span class="mut">' + a.due.slice(5) + '</span>') + '</td><td>' + (a.done ? '' : '<button class="btn s" data-a="advDone" data-id="' + a.id + '">정산</button>') + '</td></tr>').join('') + '</tbody></table></div>';
  return h;
};
ACT.advDone = d => {
  const a = S.advances.find(x => x.id === d.id);
  modal('<h2>' + a.type + ' 정산</h2><p>' + esc(a.purpose) + ' · ' + won(a.amt) + '원</p>' + fld('실제 쓴 돈', '<input id="ad_used" value="' + (a.used || a.amt) + '">') + '<div class="mut">남은 돈은 반납, 모자란 돈은 추가 지급으로 처리합니다.</div>' +
    '<div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn p" data-a="advDoneOk" data-id="' + a.id + '">정산</button></div>');
};
ACT.advDoneOk = d => { const a = S.advances.find(x => x.id === d.id); a.used = num($('#ad_used').value); a.done = true; a.doneAt = TODAY; log(S.me, a.type + ' 정산', a.purpose + ' ' + a.used); save(); close(); render(); toast('정산했습니다. ' + (a.amt - a.used > 0 ? '반납 ' + won(a.amt - a.used) + '원' : a.amt - a.used < 0 ? '추가 지급 ' + won(a.used - a.amt) + '원' : '차액 없음')); };
ACT.advNew = () => {
  modal('<h2>가지급·선급 등록</h2>' + fld('구분', '<select id="an_t"><option>가지급</option><option>선급</option></select>') + fld('받은 사람', '<select id="an_u">' + S.users.map(u => '<option value="' + u.id + '">' + u.name + '</option>').join('') + '</select>') +
    fld('내용', '<input id="an_p" value="추계 체육대회 현장 경비">') + fld('금액', '<input id="an_a" value="500000">') + fld('정산 기한', '<input type="date" id="an_d" value="2026-11-06">') +
    '<div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn p" data-a="advSave">등록</button></div>');
};
ACT.advSave = () => { S.advances.push({ id: nid('a'), uid: $('#an_u').value, type: $('#an_t').value, date: TODAY, amt: num($('#an_a').value), purpose: $('#an_p').value, due: $('#an_d').value, used: 0, done: false }); log(S.me, '가지급 등록', $('#an_p').value); save(); close(); render(); };

/* ---------- 예산 현황 (M4) ---------- */
V.budget = () => {
  let h = '<div class="note t">진도선(검은 세로줄)은 오늘까지 지난 시간 ' + Math.round(ELAPSED * 100) + '%입니다. 막대가 진도선보다 5%p 넘게 앞서면 노란색, 예산을 넘으면 빨간색입니다. 결재가 하나 끝날 때마다 바로 반영됩니다.</div>';
  Object.keys(S.lines).forEach(dept => {
    const bs = S.budgets.filter(b => b.dept === dept); if (!bs.length) return;
    h += '<div class="c"><h3>' + dept + ' <span class="mut">예산 초과 제출 ' + (sw(dept, '예산차단') ? '<b style="color:#c2410c">막음</b>' : '경고만') + '</span></h3><table class="tb"><thead><tr><th>예산과목</th><th class="right">연 예산</th><th class="right">집행</th><th style="width:28%">집행률</th><th class="right">연말 예상</th><th class="right">남은 돈</th><th>상태</th></tr></thead><tbody>' +
      bs.map(b => { const u = budgetUse(dept, b.item); const st = u.used > b.annual ? ['rd', '초과'] : u.fc > b.annual ? ['a', '연말 초과 예상'] : u.rate > u.pace + 0.05 ? ['a', '빠름'] : ['ok', '보통'];
        return '<tr><td>' + b.item + '</td><td class="n">' + won(b.annual) + '</td><td class="n">' + won(u.used) + '</td><td>' + bar(u.rate, u.pace) + '<span class="mut">' + (u.rate * 100).toFixed(1) + '%</span></td><td class="n">' + won(u.fc) + '</td><td class="n">' + won(u.left) + '</td><td><span class="bd ' + st[0] + '">' + st[1] + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
  });
  h += '<div class="c"><h3>행사 예산</h3><table class="tb"><tbody>' + S.events.filter(v => v.year === 2026).map(v => { const used = evUsed(v.id); return '<tr><td>' + v.name + ' <span class="mut">' + v.date.slice(5) + '</span></td><td class="n">' + won(used) + ' / ' + won(v.budget) + '</td><td style="width:40%">' + bar(used / v.budget, 0) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  return h;
};
function evUsed(id) { let s = 0; S.expenses.forEach(e => { if (e.status !== 'draft' && e.status !== 'rejected') spentOf(e).forEach(p => { if ((p.event || '') === id) s += p.amt; }); }); return s; }

/* ---------- 행사·프로젝트 (E15, E16) ---------- */
V.events = () => {
  const cur = S.events.filter(v => v.year === 2026), old = S.events.filter(v => v.year === 2025 && !cur.some(c => c.from === v.id));
  let h = '<div class="c"><h3>2026 행사</h3><table class="tb"><thead><tr><th>행사</th><th>국</th><th>날짜</th><th class="right">예산</th><th class="right">지출</th><th>참가자</th><th class="right">1인당</th><th></th></tr></thead><tbody>' +
    cur.map(v => { const used = evUsed(v.id), n = v.count || v.people.length; return '<tr><td><b>' + esc(v.name) + '</b>' + (v.from ? ' <span class="bd g">작년 복사</span>' : '') + '</td><td>' + v.dept + '</td><td class="mut">' + v.date.slice(5) + '</td><td class="n">' + won(v.budget) + '</td><td class="n">' + won(used) + '</td><td>' + n + '명</td><td class="n">' + (n ? won(Math.round(used / n)) : '-') + '</td><td><button class="btn s" data-a="evPeople" data-id="' + v.id + '">참가자</button></td></tr>'; }).join('') + '</tbody></table></div>';
  h += '<div class="c"><h3>작년 행사 복사 <span class="mut">예산 항목과 거래처를 그대로 가져와 새 행사를 만듭니다</span></h3>' + (old.length ? '<table class="tb"><tbody>' + old.map(v => '<tr><td>' + esc(v.name) + ' <span class="mut">' + v.date + '</span></td><td>' + (v.plan || []).map(p => esc(p[0]) + ' ' + won(p[1])).join(' · ') + '</td><td class="n">' + won(v.budget) + '</td><td><button class="btn s p" data-a="evCopy" data-id="' + v.id + '">2026으로 복사</button></td></tr>').join('') + '</tbody></table>' : '<div class="empty">복사할 작년 행사가 없습니다.</div>') + '</div>';
  h += '<div class="c"><h3>작년 같은 행사 지출 <span class="mut">과거 지출 참고</span></h3><table class="tb"><tbody>' + S.hist.filter(x => x.event).map(x => '<tr><td class="mut">' + x.date + '</td><td>' + esc(x.event) + '</td><td>' + esc(x.vendor) + '</td><td>' + esc(x.purpose) + '</td><td class="n">' + won(x.amt) + '</td></tr>').join('') + '</tbody></table></div>';
  return h;
};
ACT.evCopy = d => {
  const o = EV(d.id);
  const n = { id: nid('ev'), name: o.name, year: 2026, dept: o.dept, date: '2026-' + o.date.slice(5), budget: Math.round(o.budget * 1.03 / 10000) * 10000, item: o.item, people: [], count: 0, from: o.id };
  S.events.push(n); log(S.me, '작년 행사 복사', o.name); save(); render(); toast('「' + o.name + '」을 2026년으로 복사했습니다. 예산은 3% 올려 잡았습니다.');
};
ACT.evPeople = d => {
  const v = EV(d.id);
  modal('<h2>' + esc(v.name) + ' 참가자</h2><p class="mut">명단을 넣으면 1인당 비용과 식사 인원 점검에 씁니다. 명단 파일을 붙여 넣어도 됩니다(한 줄에 한 명).</p>' +
    '<textarea id="pp" rows="8" style="width:100%;border:1px solid #dfe6ea;border-radius:8px;padding:8px">' + esc(v.people.join('\n')) + '</textarea>' + fld('총 인원', '<input id="pc" value="' + (v.count || v.people.length) + '">', '<span class="mut">명단 외 인원 포함</span>') +
    '<div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn p" data-a="evPeopleSave" data-id="' + v.id + '">저장</button></div>');
};
ACT.evPeopleSave = d => { const v = EV(d.id); v.people = $('#pp').value.split(/\n/).map(s => s.trim()).filter(Boolean); v.count = Math.max(num($('#pc').value), v.people.length); log(S.me, '참가자 명단', v.name + ' ' + v.count + '명'); save(); close(); render(); };

/* ---------- 운영 점검 (A3 월말 대사, M8, E8, A7) ---------- */
V.operations = () => {
  const oct = S.expenses.filter(e => e.date.slice(0, 7) === '2026-10');
  const cardTot = S.cards.reduce((a, c) => a + c.amt, 0), linkTot = S.cards.filter(c => c.exp).reduce((a, c) => a + c.amt, 0);
  const noRec = oct.filter(e => !e.receipt && !e.sub), draft = oct.filter(e => e.status === 'draft');
  const dupList = []; S.expenses.forEach((a, i) => S.expenses.slice(i + 1).forEach(b => { if (a.amt === b.amt && a.date === b.date && vkey(a.vendor) === vkey(b.vendor)) dupList.push([a, b]); }));
  const near = S.expenses.filter(e => e.amt % 10000 === 0 && e.amt >= 300000 && e.kind === 'personal');
  const locked = !!S.lock['2026-10'];
  let h = '<div class="c"><div class="row"><h3 style="margin:0">10월 월말 대사</h3><span class="grow"></span>' + (locked ? '<span class="bd rd">마감 잠금 ' + S.lock['2026-10'] + '</span><button class="btn s" data-a="unlock">잠금 풀기</button>' : '<button class="btn p" data-a="lockMonth">10월 마감 잠금</button>') + '</div><div class="g4" style="margin-top:10px">' +
    kp('카드 사용 / 연결', won(linkTot), '카드 합계 ' + won(cardTot) + '원', cardTot === linkTot ? 'ok' : 'a') + kp('증빙 없음', noRec.length, '대체 사유서 필요', noRec.length ? 'rd' : 'ok', '건') + kp('제출 안 함', draft.length, '작성 중', draft.length ? 'a' : 'ok', '건') + kp('가지급 미정산', S.advances.filter(a => !a.done).length, '', 'v', '건') + '</div>' +
    '<div class="mut" style="margin-top:6px">잠그면 10월 날짜로 새 지출을 등록·제출할 수 없습니다. 고칠 일이 생기면 재정 담당이 풀고, 푼 기록은 감사 열람에 남습니다.</div></div>';
  h += '<div class="g2"><div class="c"><h3>중복·이상 점검</h3>' + (dupList.length ? dupList.map(([a, b]) => '<div class="note rd" style="margin-bottom:6px">중복 의심: ' + esc(a.vendor) + ' ' + won(a.amt) + '원 ' + a.date.slice(5) + ' (' + esc(U(a.uid).name) + ' · ' + esc(U(b.uid).name) + ')</div>').join('') : '<div class="note t">같은 날·같은 가맹점·같은 금액 중복 없음</div>') +
    (near.length ? near.map(e => '<div class="note a" style="margin-top:6px">딱 떨어지는 큰 금액(개인 돈): ' + esc(e.vendor) + ' ' + won(e.amt) + '원. 견적서·세금계산서 확인 권장</div>').join('') : '') +
    S.carlog.filter(c => c.gap > rule().차량_빈구간km).map(c => '<div class="note a" style="margin-top:6px">차량 빈 구간 ' + c.gap + 'km (' + c.date.slice(5) + ' ' + esc(c.who) + ')</div>').join('') +
    S.expenses.filter(e => e.other).map(e => '<div class="note a" style="margin-top:6px">이번만 다른 계좌: ' + esc(U(e.uid).name) + ' > ' + esc(e.other.holder) + ' ' + won(e.amt) + '원' + (e.other.phone ? ' (전화 확인함)' : ' (전화 확인 전)') + '</div>').join('') + '</div>';
  h += '<div class="c"><h3>인수인계 점검표 <span class="mut">자리를 옮기거나 그만두는 사람</span></h3>' + fld('대상', '<select id="hoU">' + S.users.map(u => '<option value="' + u.id + '"' + (u.id === (F.ho || 'u3') ? ' selected' : '') + '>' + u.name + ' ' + u.dept + '</option>').join('') + '</select>') + handover(F.ho || 'u3') + '</div></div>';
  h += '<div class="c"><h3>백업·복원 리허설</h3><div class="row"><button class="btn" data-a="backup">지금 상태 백업 받기</button><label class="btn">백업 파일로 복원<input type="file" id="restore" accept=".json" class="hide"></label><span class="mut">실제 운영에서는 암호를 걸어 매일 자동 백업하고, 분기마다 복원 연습을 합니다. 시연에서는 이 브라우저 자료를 파일로 받고 되돌립니다.</span></div></div>';
  return h;
};
function handover(uid) {
  const u = U(uid), my = S.expenses.filter(e => e.uid === uid);
  const rows = [
    ['작성 중·보완 요청 지출', my.filter(e => e.status === 'draft' || e.status === 'rejected').length, '건'], ['결재 진행 중 지출', my.filter(e => e.status === 'progress').length, '건'],
    ['아직 받지 않은 돈', my.filter(e => isMoney(e) && mstage(e) < 5).length, '건'], ['내 결재 차례', myQueue(uid).length, '건'],
    ['정산 안 된 가지급·선급', S.advances.filter(a => a.uid === uid && !a.done).length, '건'], ['담당 행사', S.events.filter(v => v.year === 2026 && v.people.includes(u.name)).length, '개'],
  ];
  return '<table class="tb"><tbody>' + rows.map(([a, n, unit]) => '<tr><td>' + a + '</td><td class="n">' + (n ? '<span class="bd a">' + n + unit + '</span>' : '<span class="bd ok">없음</span>') + '</td></tr>').join('') + '</tbody></table>';
}
document.addEventListener('change', ev => {
  if (ev.target.id === 'hoU') { F.ho = ev.target.value; render(); }
  if (ev.target.id === 'restore') {
    const f = ev.target.files[0]; if (!f) return;
    f.text().then(t => { try { const o = JSON.parse(t); if (o.v !== 1 || !o.expenses) throw 0; S = o; log(S.me, '백업 복원', f.name); save(); render(); toast('백업에서 복원했습니다.'); } catch (e) { toast('이 파일은 백업 파일이 아닙니다.'); } });
  }
});
ACT.lockMonth = () => { S.lock['2026-10'] = TODAY + ' ' + ME().name; log(S.me, '마감 잠금', '2026-10'); save(); render(); toast('10월을 잠갔습니다.'); };
ACT.unlock = () => { delete S.lock['2026-10']; log(S.me, '마감 잠금 해제', '2026-10'); save(); render(); };
ACT.backup = () => { download('아스키오_시연_백업_' + TODAY + '.json', JSON.stringify(S), 'application/json'); log(S.me, '백업', ''); save(); };

/* ---------- 지출 통계 (M9) ---------- */
V.statistics = () => {
  const q = (F.q || '').trim();
  const items = Array.from(new Set(S.budgets.map(b => b.item)));
  const depts = Object.keys(S.lines).filter(d => S.budgets.some(b => b.dept === d));
  let h = '<div class="c"><h3>예산과목 × 국 <span class="mut">2026년 1~10월 집행(결재 진행 중 포함)</span></h3><table class="tb"><thead><tr><th>예산과목</th>' + depts.map(d => '<th class="right">' + d + '</th>').join('') + '<th class="right">합계</th></tr></thead><tbody>' +
    items.map(it => { let t = 0; return '<tr><td>' + it + '</td>' + depts.map(d => { const u = budgetUse(d, it); const v = u ? u.used : 0; t += v; return '<td class="n">' + (v ? won(v) : '-') + '</td>'; }).join('') + '<td class="n"><b>' + won(t) + '</b></td></tr>'; }).join('') + '</tbody></table></div>';
  const all = S.hist.map(x => Object.assign({ y: '2025' }, x)).concat(S.expenses.filter(e => e.status !== 'draft').map(e => ({ y: '2026', date: e.date, dept: e.dept, event: evName(e.event), vendor: e.vendor, purpose: e.purpose, amt: e.amt })));
  const hit = q ? all.filter(x => (x.vendor + x.purpose + x.event + x.dept).includes(q)) : [];
  h += '<div class="c"><h3>과거 지출 찾기 <span class="mut">가맹점·내용·행사로 작년 것까지 찾습니다</span></h3><div class="row"><input id="q" value="' + esc(q) + '" placeholder="예: 도시락, 워크숍, 현수막" style="flex:1;border:1px solid #dfe6ea;border-radius:9px;padding:7px 10px"><button class="btn p" data-a="search">찾기</button></div>' +
    (q ? (hit.length ? '<table class="tb" style="margin-top:8px"><thead><tr><th>연도</th><th>날짜</th><th>국</th><th>행사</th><th>가맹점</th><th>내용</th><th class="right">금액</th></tr></thead><tbody>' + hit.map(x => '<tr><td><span class="bd ' + (x.y === '2025' ? 'g' : 't') + '">' + x.y + '</span></td><td class="mut">' + x.date.slice(5) + '</td><td>' + x.dept + '</td><td>' + esc(x.event || '') + '</td><td>' + esc(x.vendor) + '</td><td>' + esc(x.purpose) + '</td><td class="n">' + won(x.amt) + '</td></tr>').join('') + '</tbody></table><div class="mut" style="margin-top:6px">' + hit.length + '건 · 합계 ' + won(hit.reduce((a, x) => a + x.amt, 0)) + '원 · 평균 ' + won(Math.round(hit.reduce((a, x) => a + x.amt, 0) / hit.length)) + '원</div>' : '<div class="empty">찾은 지출이 없습니다.</div>') : '') + '</div>';
  return h;
};
ACT.search = () => { F.q = $('#q').value; render(); };
document.addEventListener('keydown', ev => { if (ev.target.id === 'q' && ev.key === 'Enter') ACT.search(); });

/* ---------- 감사 열람 (A2) ---------- */
V.audit = () => {
  const bad = F.auditRes;
  let h = '<div class="c"><div class="row"><h3 style="margin:0">처리 기록 ' + S.audit.length + '건 <span class="mut">각 줄이 앞 줄의 지문을 품고 있어, 한 줄만 고쳐도 그 뒤가 모두 어긋납니다</span></h3><span class="grow"></span><button class="btn" data-a="tamper">변조 시험(한 줄 고치기)</button><button class="btn p" data-a="verify">변조 검사</button></div>' +
    (bad === undefined ? '' : bad === -1 ? '<div class="note t" style="margin-top:8px">검사 결과: 기록 ' + S.audit.length + '건 모두 이어져 있습니다. 고친 흔적 없음.</div>' : '<div class="note rd" style="margin-top:8px">검사 결과: ' + (bad + 1) + '번째 기록부터 지문이 맞지 않습니다. 누군가 기록을 고쳤습니다.</div>') +
    '<table class="tb" style="margin-top:8px"><thead><tr><th>#</th><th>시각</th><th>누가</th><th>무엇을</th><th>대상</th><th>지문</th></tr></thead><tbody>' +
    S.audit.slice().reverse().map((a, i) => { const n = S.audit.length - i; return '<tr' + (bad !== undefined && bad !== -1 && n - 1 >= bad ? ' style="background:#fdede4"' : '') + '><td class="mut">' + n + '</td><td class="mut">' + a.t.slice(5) + '</td><td>' + esc(U(a.who).name) + '</td><td>' + esc(a.act) + '</td><td>' + esc(a.ref) + '</td><td class="mut" style="font-family:Consolas,monospace;font-size:11px">' + a.h.slice(0, 10) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  return h;
};
ACT.verify = () => { F.auditRes = verifyAudit(); render(); };
ACT.tamper = () => {
  if (S.audit.length < 2) return toast('기록이 더 쌓인 뒤 해 보세요.');
  const a = S.audit[Math.max(0, S.audit.length - 3)];
  a.ref = a.ref + ' (금액 고침)'; save(); F.auditRes = undefined; render(); toast('기록 한 줄을 몰래 고쳤습니다. 이제 「변조 검사」를 눌러 보세요.');
};

/* ---------- 부서·직원 관리 ---------- */
V.people = () => '<div class="c"><h3>직원 <span class="mut">결재 한도는 서비스 설정 > 결재선에서 바꿉니다</span></h3><table class="tb"><thead><tr><th>이름</th><th>국</th><th>직위</th><th>역할</th><th>출장 등급</th><th class="right">결재 한도</th><th>받을 계좌</th></tr></thead><tbody>' +
  S.users.map(u => { const l = Object.values(S.lines).flat().find(a => a.uid === u.id); return '<tr><td><b>' + u.name + '</b></td><td>' + u.dept + '</td><td>' + u.title + '</td><td>' + ROLE(u) + '</td><td>' + u.grade + '</td><td class="n">' + (l ? (l.limit ? won(l.limit) + '원' : '제한 없음') : '-') + '</td><td>' + (accOf(u.id) ? esc(accOf(u.id).bank + ' ' + accOf(u.id).no) : '<span class="bd rd">없음</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';

/* ---------- 서비스 설정 ---------- */
V['settings/view'] = V['settings/card'] = V['settings/basis'] = V['settings/org'] = () => '<div class="c"><div class="empty">지금 아스키오에 있는 화면 그대로 둡니다. 이번 제안에서 바꾸는 것이 없습니다.</div></div>';
V['settings/account'] = () => {
  const me = ME(), a = accOf(me.id);
  return '<div class="g2"><div class="c"><h3>내 정보</h3><table class="tb"><tbody><tr><td class="mut">이름</td><td>' + me.name + '</td></tr><tr><td class="mut">소속</td><td>' + me.dept + ' ' + me.title + '</td></tr><tr><td class="mut">2단계 인증</td><td>' + (me.role === 'finance' || me.role === 'exec' ? '<span class="bd ok">켜짐(필수)</span>' : '<span class="bd g">선택</span>') + '</td></tr></tbody></table></div>' +
    '<div class="c"><h3>받을 계좌 <span class="bd a">새</span></h3>' + (a ? '<table class="tb"><tbody><tr><td class="mut">은행</td><td>' + esc(a.bank) + '</td></tr><tr><td class="mut">계좌번호</td><td>' + esc(a.no) + '</td></tr><tr><td class="mut">예금주</td><td>' + esc(a.holder) + '</td></tr><tr><td class="mut">등록일</td><td>' + a.since + '</td></tr></tbody></table>' : '<div class="note rd">받을 계좌가 없습니다. 개인 돈·청구를 받으려면 등록하세요.</div>') +
    '<div class="row end" style="margin-top:10px"><button class="btn p" data-a="accChange">' + (a ? '기본 계좌 바꾸기' : '계좌 등록') + '</button></div>' +
    '<div class="mut" style="margin-top:8px">기본 계좌를 바꾸면 비밀번호를 다시 확인하고, 본인에게 바로 알림이 가며, 바꾼 뒤 첫 지급은 재정 담당이 전화로 확인합니다. 한 번만 다른 계좌로 받으려면 지출마다 「이번만 다른 계좌로 받기」를 쓰세요.</div></div></div>';
};
ACT.accChange = () => {
  const me = ME();
  otherDialog(o => {
    S.accounts[me.id] = { bank: o.bank, no: o.no, holder: o.holder, since: TODAY, changed: true };
    notify(me.id, '[보안 알림] 기본 받을 계좌가 ' + o.bank + ' ' + o.no + '로 바뀌었습니다.');
    S.users.filter(u => u.role === 'finance').forEach(u => notify(u.id, me.name + '님 기본 계좌 변경. 다음 첫 지급 전에 전화 확인이 필요합니다.'));
    log(me.id, '기본 계좌 변경', o.bank + ' ' + o.no); save(); close(); render(); toast('기본 계좌를 바꿨습니다.');
  }, () => close());
  $('h2').textContent = '기본 받을 계좌 ' + (accOf(me.id) ? '바꾸기' : '등록');
  const n = $('.note.a'); if (n) n.textContent = '앞으로 받는 모든 돈이 이 계좌로 갑니다. 예금주는 본인이어야 합니다.';
};
V['settings/rules'] = () => {
  const vs = S.rules.slice().sort((a, b) => a.from < b.from ? 1 : -1), keys = Object.keys(S.rules[0].v);
  let h = '<div class="note t">규정이 바뀌면 값을 고치지 않고 「새 버전」을 시행일과 함께 추가합니다. 지출 날짜에 맞는 버전으로 계산하므로, 지난 지출은 그때 규정대로 남습니다.</div>';
  h += '<div class="c"><div class="row"><h3 style="margin:0">규정값 버전 ' + vs.length + '개</h3><span class="grow"></span><button class="btn p" data-a="ruleNew">새 버전 추가</button></div><table class="tb" style="margin-top:8px"><thead><tr><th>항목</th>' + vs.map(r => '<th class="right">' + r.ver + '<br><span class="mut">' + r.from + '부터</span></th>').join('') + '</tr></thead><tbody>' +
    keys.map(k => '<tr><td>' + k.replace(/_/g, ' ') + '</td>' + vs.map((r, i) => { const v = r.v[k], prev = vs[i + 1] && vs[i + 1].v[k]; return '<td class="n"' + (prev !== undefined && prev !== v ? ' style="background:#fcf4da;font-weight:800"' : '') + '>' + (typeof v === 'number' && v >= 100 ? won(v) : v) + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>';
  h += '<div class="c"><h3>출장 여비 등급 · 경조사 규정 <span class="mut">claims.py 시범값과 같음</span></h3><div class="g2"><table class="tb"><thead><tr><th>등급</th><th class="right">일비</th><th class="right">식비</th><th class="right">숙박 서울·광역·기타</th></tr></thead><tbody>' +
    Object.entries(S.grade).map(([g, v]) => '<tr><td>' + g + '</td><td class="n">' + won(v.일비) + '</td><td class="n">' + won(v.식비) + '</td><td class="n">' + won(v.서울) + ' · ' + won(v.광역시) + ' · ' + won(v.기타) + '</td></tr>').join('') + '</tbody></table>' +
    '<table class="tb"><tbody>' + Object.entries(S.gyeong).map(([k, v]) => '<tr><td>' + k + '</td><td class="n">' + won(v[0]) + '</td><td class="mut">휴가 ' + v[1] + '일' + (v[2] ? ' · 화환' : '') + '</td></tr>').join('') + '</tbody></table></div></div>';
  return h;
};
ACT.ruleNew = () => {
  const base = S.rules.slice().sort((a, b) => a.from < b.from ? 1 : -1)[0];
  modal('<h2>규정값 새 버전</h2>' + fld('버전 이름', '<input id="rv" value="2026-11">') + fld('시행일', '<input type="date" id="rf" value="2026-11-01">') + fld('근거', '<input id="rn" placeholder="예: 2026-10 이사회 의결">') +
    Object.entries(base.v).map(([k, v]) => fld(k.replace(/_/g, ' '), '<input class="rk" data-k="' + k + '" value="' + v + '">')).join('') +
    '<div class="row end" style="margin-top:12px"><button class="btn" data-a="close">취소</button><button class="btn p" data-a="ruleSave">추가</button></div>', 620);
};
ACT.ruleSave = () => {
  const v = {}; $$('.rk').forEach(x => { const o = S.rules[0].v[x.dataset.k]; v[x.dataset.k] = typeof o === 'number' ? Number(x.value) : x.value; });
  const from = $('#rf').value;
  if (S.rules.some(r => r.from === from)) return toast('같은 시행일의 버전이 이미 있습니다.');
  S.rules.push({ ver: $('#rv').value, from, note: $('#rn').value, v }); log(S.me, '규정값 새 버전', $('#rv').value + ' ' + from); save(); close(); render(); toast('새 버전을 추가했습니다. ' + from + ' 이후 지출부터 적용됩니다.');
};
V['settings/lines'] = () => {
  const amt = F.pv || 450000, who = F.pvu || 'u3', u = U(who);
  let h = '<div class="note t">국마다 결재자와 결재 한도를 순서대로 등록합니다. 지출 금액이 앞사람 한도를 넘으면 다음 사람에게 올라가고, 국 안에서 끝나지 않으면 임원실로 갑니다. 총무국 청구는 「총무 확인」, 모든 지출은 마지막에 「재정 확인」을 거칩니다.</div><div class="g2">';
  h += '<div class="c"><h3>국별 결재선</h3>' + Object.entries(S.lines).map(([d, l]) => '<div style="margin-bottom:10px"><b>' + d + '</b><table class="tb"><tbody>' + l.map((a, i) => '<tr><td style="width:30px" class="mut">' + (i + 1) + '</td><td>' + esc(U(a.uid).name + ' ' + U(a.uid).title) + '</td><td class="n"><input class="lim" data-d="' + d + '" data-i="' + i + '" value="' + a.limit + '" style="width:110px;text-align:right;border:1px solid #dfe6ea;border-radius:7px;padding:3px 6px">원</td></tr>').join('') + '</tbody></table></div>').join('') +
    '<div class="mut">0은 제한 없음. 값을 바꾸면 바로 저장되고, 이미 올라간 지출에는 영향이 없습니다.</div></div>';
  h += '<div class="c"><h3>결재선 미리 보기</h3>' + fld('누가', '<select id="pvu">' + S.users.map(x => '<option value="' + x.id + '"' + (x.id === who ? ' selected' : '') + '>' + x.name + ' ' + x.dept + '</option>').join('') + '</select>') +
    fld('금액', '<input id="pv" value="' + amt + '">') + fld('종류', '<select id="pvk"><option value="personal"' + (F.pvk !== 'claim' ? ' selected' : '') + '>일반 지출</option><option value="claim"' + (F.pvk === 'claim' ? ' selected' : '') + '>총무국 청구</option></select>') +
    '<div style="margin-top:8px">' + chainHtml(chainFor(who, u.dept, amt, F.pvk || 'personal'), 0, 'draft') + '</div></div></div>';
  return h;
};
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.classList.contains('lim')) { S.lines[t.dataset.d][+t.dataset.i].limit = num(t.value); log(S.me, '결재 한도 변경', t.dataset.d + ' ' + U(S.lines[t.dataset.d][+t.dataset.i].uid).name + ' ' + num(t.value)); save(); render(); }
  if (t.id === 'pvu' || t.id === 'pvk') { F[t.id] = t.value; render(); }
  if (t.classList.contains('swc')) { S.switches[t.dataset.d][t.dataset.k] = t.checked; log(S.me, '기능 스위치', t.dataset.d + ' ' + t.dataset.k + ' ' + (t.checked ? '켬' : '끔')); save(); render(); }
});
document.addEventListener('input', ev => { if (ev.target.id === 'pv') { F.pv = num(ev.target.value); clearTimeout(F._t); F._t = setTimeout(() => { render(); const i = $('#pv'); if (i) { i.focus(); i.setSelectionRange(99, 99); } }, 350); } });
V['settings/journal'] = () => {
  const J = S.jr;
  return '<div class="g2"><div class="c"><h3>예산과목 > 계정코드</h3><table class="tb"><tbody>' + Object.entries(J.codes).map(([k, v]) => '<tr><td>' + k + '</td><td class="n">' + v + '</td></tr>').join('') + '</tbody></table>' +
    '<h3 style="margin-top:12px">G20 결의부서 코드</h3><table class="tb"><tbody>' + Object.entries(J.g20).map(([k, v]) => '<tr><td>' + k + '</td><td class="n">' + v + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="c"><h3>분개 규칙</h3><table class="tb"><tbody>' + [
      ['기본', '차변·대변을 항상 1:1 짝으로 만듭니다.'], ['법인카드', '대변 ' + J.card + ' 미지급금, 거래처는 카드(#번호)'], ['개인 돈 정산', '대변 거래처 ' + J.pvendor + ', 적요 끝에 (개인정산)'],
      ['총무국 청구', '대변 2줄에 ' + J.adv + ' 0원 연결 줄을 더해 3줄, 적요 끝에 (청구정산)'], ['25일 규칙', '25일 정기 지급으로 나간 것은 ' + J.bank + ' 보통예금, 지급 전이면 ' + J.personal + ' 미지급금'],
      ['소모품비', '한 달 치를 전표 1장으로 합칩니다.'], ['나눠 배정', '차변을 예산과목별로 나누고 대변은 1줄'],
    ].map(([a, b]) => '<tr><td style="width:110px"><b>' + a + '</b></td><td>' + b + '</td></tr>').join('') + '</tbody></table><div class="mut" style="margin-top:6px">총무국 굿바이G20 전표입력 도구의 규칙을 옮긴 것입니다. 국마다 다르면 국별로 덮어쓸 수 있게 합니다.</div></div></div>';
};
V['settings/switch'] = () => {
  const keys = [['총무국청구', '총무국 청구 9종'], ['스캔등록', '스캔으로 등록'], ['받을돈', '내가 받을 돈'], ['카드자동연결', '카드 자동 연결'], ['다른계좌', '이번만 다른 계좌'], ['예산차단', '예산 초과 제출 막기']];
  let h = '<div class="note t">새 기능을 국마다 켜고 끕니다. 총무국에서 먼저 써 보고 다른 국으로 넓히는 식으로 들여올 수 있습니다. 바꾸면 바로 반영됩니다.</div>';
  h += '<div class="c"><table class="tb"><thead><tr><th>기능</th>' + Object.keys(S.switches).map(d => '<th style="text-align:center">' + d + '</th>').join('') + '</tr></thead><tbody>' +
    keys.map(([k, l]) => '<tr><td>' + l + '</td>' + Object.keys(S.switches).map(d => '<td style="text-align:center"><input type="checkbox" class="swc" data-d="' + d + '" data-k="' + k + '"' + (S.switches[d][k] ? ' checked' : '') + '></td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  h += '<div class="c"><h3>보안 관문 <span class="mut">전사 오픈 전에 모두 켜져 있어야 합니다</span></h3><table class="tb"><tbody>' + [
    ['G1', '영수증 판독에 외부 AI 쓰지 않기(협회 서버 안에서만)', 1], ['G2', '개인정보 처리방침 공개', 1], ['G3', '가입 메일 확인', 1], ['G4', '관리자·재정 담당 2단계 인증', 1],
    ['G5', '계좌 보호(비밀번호 재확인·본인 알림·전화 확인·별도 묶음·2차 확인)', 1],
  ].map(([c, t, on]) => '<tr><td style="width:44px"><b>' + c + '</b></td><td>' + t + '</td><td><span class="bd ' + (on ? 'ok' : 'rd') + '">' + (on ? '켜짐' : '꺼짐') + '</span></td></tr>').join('') + '</tbody></table></div>';
  return h;
};

/* ---------- 업무 안내 ---------- */
V.help = () => '<div class="c"><h3>이 사이트에서 해 볼 것</h3><ol style="margin:0;padding-left:20px;line-height:1.9">' +
  '<li>지출·증빙 > 내 지출: 「스캔으로 등록」에서 예시 영수증을 골라 판독 결과를 봅니다(카드 자동 연결, 흐린 사진 경고, 한 사진 2장 나누기).</li>' +
  '<li>작성 중인 지출을 골라 「선택 제출」: 처음 한 번은 각자 올리기 안내, 그다음 제출 전 점검이 뜹니다. 증빙 없는 것은 대체 사유서를 씁니다.</li>' +
  '<li>지출·증빙 > 총무국 청구: 야근식대에서 같은 날 같은 사람을 다시 넣으면 막힙니다. 받을 계좌에서 「이번만 다른 계좌로 받기」를 해 봅니다.</li>' +
  '<li>위 「보는 사람」을 정예시(총무국장)로 바꿔 검토함 > 결재 차례에서 결재, 이예시로 바꿔 총무 확인, 오예시로 바꿔 검토(재정 확인)와 결산·출력 > 지급·송금을 합니다.</li>' +
  '<li>다시 김정래로 돌아와 지출·증빙 > 내가 받을 돈에서 단계가 바뀐 것을 봅니다.</li>' +
  '<li>결산·출력 > 전표·G20, 예산 현황, 운영 점검(마감 잠금·백업), 감사 열람(변조 시험 > 변조 검사), 서비스 설정(규정값 새 버전, 결재 한도, 기능 스위치)도 눌러 봅니다.</li></ol>' +
  '<p class="mut" style="margin:10px 0 0">위쪽 「처음 상태로」를 누르면 예시 자료가 처음으로 돌아갑니다.</p></div>';
