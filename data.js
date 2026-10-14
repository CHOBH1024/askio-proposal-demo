// 시연용 예시 데이터와 규정값. 실제 인물·계좌가 아닙니다(김정래 과장 이름만 실제).
window.SEED = function () {
  const users = [
    { id: 'u1', name: '김정래', dept: '총무국', title: '과장', role: 'staff', grade: '직원' },
    { id: 'u2', name: '정예시', dept: '총무국', title: '국장', role: 'approver', grade: '국장급' },
    { id: 'u8', name: '이예시', dept: '총무국', title: '대리', role: 'ga', grade: '직원' },
    { id: 'u3', name: '박예시', dept: '기획국', title: '주임', role: 'staff', grade: '직원' },
    { id: 'u4', name: '최예시', dept: '기획국', title: '팀장', role: 'approver', grade: '직원' },
    { id: 'u5', name: '한예시', dept: '기획국', title: '국장', role: 'approver', grade: '국장급' },
    { id: 'u6', name: '윤예시', dept: '임원실', title: '사무총장', role: 'exec', grade: '임원' },
    { id: 'u7', name: '오예시', dept: '재정국', title: '과장', role: 'finance', grade: '직원' },
  ];
  const lines = {
    '총무국': [{ uid: 'u2', limit: 1000000 }],
    '기획국': [{ uid: 'u4', limit: 300000 }, { uid: 'u5', limit: 1000000 }],
    '재정국': [{ uid: 'u2', limit: 1000000 }],
    '임원실': [{ uid: 'u6', limit: 0 }],
  };
  const accounts = {
    u1: { bank: '우리은행', no: '1002-***-**4821', holder: '김정래', since: '2026-03-02' },
    u3: { bank: '농협', no: '302-****-7733-**', holder: '박예시', since: '2026-02-11' },
    u8: { bank: '신한은행', no: '110-***-**2045', holder: '이예시', since: '2026-05-20' },
    u2: { bank: '국민은행', no: '6942-**-***118', holder: '정예시', since: '2025-12-01' },
  };
  const budgets = [
    // [국, 예산과목, 연 예산, 1~9월 집행]
    ['총무국', '복리후생비(기타)', 6000000, 4310000], ['총무국', '여비교통비(단기)', 4800000, 3420000], ['총무국', '소모품비', 3600000, 3150000],
    ['총무국', '차량유지비', 4200000, 2980000], ['총무국', '도서인쇄비', 1200000, 640000], ['총무국', '통신비', 1800000, 1310000],
    ['기획국', '주요행사비', 12000000, 7400000], ['기획국', '여비교통비(단기)', 3000000, 2050000], ['기획국', '소모품비', 1500000, 870000], ['기획국', '도서인쇄비', 900000, 820000],
  ].map(([dept, item, annual, base]) => ({ dept, item, annual, base }));
  const events = [
    { id: 'ev1', name: '청년리더 워크숍', year: 2026, dept: '기획국', date: '2026-10-24', budget: 3000000, item: '주요행사비', people: ['박예시', '최예시', '한예시'], count: 24, from: 'ev0' },
    { id: 'ev2', name: '추계 직원 체육대회', year: 2026, dept: '총무국', date: '2026-10-30', budget: 2500000, item: '복리후생비(기타)', people: [], count: 0 },
    { id: 'ev0', name: '청년리더 워크숍', year: 2025, dept: '기획국', date: '2025-10-25', budget: 2800000, item: '주요행사비', people: [], count: 22,
      plan: [['장소 대관', 900000], ['식사(2끼)', 1100000], ['다과', 300000], ['인쇄물', 250000], ['기념품', 250000]] },
    { id: 'ev9', name: '추계 직원 체육대회', year: 2025, dept: '총무국', date: '2025-10-31', budget: 2300000, item: '복리후생비(기타)', people: [], count: 41,
      plan: [['운동장 대관', 600000], ['도시락', 1230000], ['상품', 400000], ['현수막', 70000]] },
  ];
  // 지난해 지출(과거 지출 찾기용)
  const hist = [
    ['2025-10-25', '기획국', '청년리더 워크숍', '한빛컨벤션', '장소 대관', 900000], ['2025-10-25', '기획국', '청년리더 워크숍', '맛있는도시락', '식사 22명 2끼', 1056000],
    ['2025-10-24', '기획국', '청년리더 워크숍', '한빛문구', '명찰·필기구', 88000], ['2025-10-31', '총무국', '추계 직원 체육대회', '맛있는도시락', '도시락 41개', 1230000],
    ['2025-10-31', '총무국', '추계 직원 체육대회', '서울현수막', '현수막 2개', 70000], ['2025-11-03', '총무국', '', '오피스디포 종로점', '복사용지 10박스', 245000],
    ['2025-09-17', '총무국', '', '교보문고 광화문', '회계 실무서', 46000], ['2025-12-19', '총무국', '송년회', '한식당 소담', '송년 만찬', 1480000],
  ].map(([date, dept, event, vendor, purpose, amt]) => ({ date, dept, event, vendor, purpose, amt }));
  const cards = [
    { id: 'c1', card: '3418', cname: '총무국 공용', date: '2026-10-02', vendor: '오피스디포 종로점', amt: 86000, exp: 'e1' },
    { id: 'c2', card: '3418', cname: '총무국 공용', date: '2026-10-07', vendor: 'GS25 광화문점', amt: 12300, exp: null },
    { id: 'c3', card: '2171', cname: '총무국 차량', date: '2026-10-05', vendor: 'SK에너지 종로주유소', amt: 70000, exp: null },
    { id: 'c4', card: '5591', cname: '기획국 공용', date: '2026-10-09', vendor: '김밥천국 시청점', amt: 64000, exp: 'e8' },
    { id: 'c5', card: '3418', cname: '총무국 공용', date: '2026-10-12', vendor: '쿠팡(주)', amt: 41900, exp: null },
    { id: 'c6', card: '3418', cname: '총무국 공용', date: '2026-10-08', vendor: '스타벅스 광화문점', amt: 18500, exp: null },
    { id: 'c7', card: '3418', cname: '총무국 공용', date: '2026-10-13', vendor: '맛나김밥 종로점', amt: 32000, exp: null },
  ];
  const E = (o) => Object.assign({ kind: 'personal', event: '', receipt: true, sub: null, other: null, split: null, steps: [], cur: 0, status: 'draft', hist: [] }, o);
  const expenses = [
    E({ id: 'e1', uid: 'u1', dept: '총무국', date: '2026-10-02', vendor: '오피스디포 종로점', amt: 86000, purpose: '복사용지·토너 구입', item: '소모품비', kind: 'card', card: '3418', status: 'confirmed', _done: 99 }),
    E({ id: 'e2', uid: 'u1', dept: '총무국', date: '2026-10-06', vendor: '한솥도시락 종로점', amt: 30000, purpose: '10/6 야근 저녁 3명(김정래·이예시·정예시)', item: '복리후생비(기타)', kind: 'claim', ck: '야근식대', status: 'scheduled', _done: 99, batch: 'b1',
      calc: { 끼니: '저녁', 인원: 3, 한도: 30000, 퇴근: '21:10', 명단: ['김정래', '이예시', '정예시'] } }),
    E({ id: 'e3', uid: 'u1', dept: '총무국', date: '2026-10-08', vendor: '카카오T', amt: 23400, purpose: '10/8 야근 뒤 귀가 택시(23:20 퇴근)', item: '여비교통비(단기)', kind: 'claim', ck: '시내교통', status: 'progress', _done: 1 }),
    E({ id: 'e4', uid: 'u1', dept: '총무국', date: '2026-09-30', vendor: '코레일 외', amt: 279600, purpose: '부산교구 회계 점검 출장(9/29~30)', item: '여비교통비(단기)', kind: 'claim', ck: '출장여비', status: 'paid', _done: 99, paidAt: '2026-10-10',
      calc: { 등급: '직원', 일수: 2, 박수: 1, 일비: 40000, 식비: 50000, 숙박: 70000, 교통: 119600 } }),
    E({ id: 'e5', uid: 'u1', dept: '총무국', date: '2026-10-10', vendor: '교보문고 광화문', amt: 38000, purpose: '세무 실무서 1권', item: '도서인쇄비' }),
    E({ id: 'e6', uid: 'u1', dept: '총무국', date: '2026-10-11', vendor: '바로퀵', amt: 15000, purpose: '교구 공문 원본 퀵 발송', item: '통신비', receipt: false }),
    E({ id: 'e7', uid: 'u3', dept: '기획국', date: '2026-10-09', vendor: '달콤제과', amt: 420000, purpose: '청년리더 워크숍 다과 24명분 선주문', item: '주요행사비', event: 'ev1', status: 'progress', _done: 1 }),
    E({ id: 'e8', uid: 'u3', dept: '기획국', date: '2026-10-09', vendor: '김밥천국 시청점', amt: 64000, purpose: '워크숍 준비 회의 점심 8명', item: '주요행사비', event: 'ev1', kind: 'card', card: '5591', status: 'progress', _done: 0 }),
    E({ id: 'e9', uid: 'u8', dept: '총무국', date: '2026-10-07', vendor: '경조사 규정 지급', amt: 150000, purpose: '부모 회갑(10/17) 경조사비', item: '복리후생비(기타)', kind: 'claim', ck: '경조사', status: 'progress', _done: 2,
      calc: { 대상: '이예시', 구분: '부모 회갑·칠순·팔순 (택일)', 휴가: 1, 화환: false },
      other: { bank: '국민은행', no: '9-***-**3310', holder: '이순자', reason: '부모님 행사 비용으로 어머니 계좌로 바로 받기', evid: '가족관계증명서.pdf', fresh: true, at: '2026-10-07 14:02' } }),
    E({ id: 'e10', uid: 'u1', dept: '총무국', date: '2026-10-08', vendor: '스타벅스 광화문점', amt: 18000, purpose: '외부 감사인 면담 음료', item: '복리후생비(기타)', kind: 'card', card: '3418' }),
    E({ id: 'e11', uid: 'u1', dept: '총무국', date: '2026-10-12', vendor: '쿠팡(주)', amt: 41900, purpose: '사무실 멀티탭·케이블', item: '소모품비', kind: 'card', card: '3418' }),
    E({ id: 'e12', uid: 'u3', dept: '기획국', date: '2026-10-02', vendor: '한빛문구', amt: 58000, purpose: '워크숍 명찰·필기구', item: '주요행사비', event: 'ev1', status: 'rejected', _done: 0, reject: '행사 참가 인원과 수량이 맞지 않습니다. 수량 다시 적어 주세요.' }),
  ];
  const advances = [
    { id: 'a1', uid: 'u3', type: '가지급', date: '2026-10-01', amt: 1000000, purpose: '청년리더 워크숍 현장 경비', due: '2026-10-31', used: 0, done: false },
    { id: 'a2', uid: 'u1', type: '가지급', date: '2026-09-15', amt: 300000, purpose: '교구 순회 점검 현장 경비', due: '2026-09-30', used: 262000, done: false },
    { id: 'a3', uid: 'u3', type: '선급', date: '2026-09-20', amt: 500000, purpose: '한빛컨벤션 대관 계약금', due: '2026-10-24', used: 0, done: false, payee: '한빛컨벤션' },
    { id: 'a4', uid: 'u1', type: '가지급', date: '2026-08-20', amt: 200000, purpose: '하계 수련 현장 경비', due: '2026-08-31', used: 200000, done: true },
  ];
  const rules = [{
    ver: '2026-01', from: '2026-01-01', note: '2026년 시범값',
    v: { 야근식대_1인: 10000, 야근_평일시각: '19:00', 야근_월횟수: 12, 귀가_시각: '22:00', 귀가_1회: 40000, 외근택시_1회: 30000, 직접구매_1건: 100000, 비품_단가: 1000000,
      자가용_km: 200, 학자금_비율: 0.5, 학자금_학기최고: 2000000, 학자금_학기수: 8, 차량_빈구간km: 2 },
  }];
  const grade = {
    '임원': { 일비: 30000, 식비: 30000, 서울: 120000, 광역시: 100000, 기타: 80000 },
    '국장급': { 일비: 25000, 식비: 25000, 서울: 100000, 광역시: 80000, 기타: 70000 },
    '직원': { 일비: 20000, 식비: 25000, 서울: 80000, 광역시: 70000, 기타: 60000 },
  };
  const gyeong = {
    '본인 결혼': [300000, 5, true], '자녀 결혼': [200000, 1, true], '부모 회갑·칠순·팔순 (택일)': [150000, 1, false], '배우자 회갑·칠순·팔순 (택일)': [100000, 1, false],
    '본인 성화': [1000000, 0, true], '부모 성화 (배우자 부모 포함)': [300000, 5, true], '배우자 성화': [300000, 5, true], '자녀 성화': [300000, 5, true],
    '조부모 성화 (배우자 조부모 포함)': [200000, 3, true], '자녀 출산 (배우자 출산 포함)': [100000, 3, false], '자녀 돌': [100000, 0, false],
  };
  const jr = {
    codes: { '복리후생비(기타)': '81101', '여비교통비(단기)': '81201', '소모품비': '83001', '차량유지비': '82201', '도서인쇄비': '82601', '통신비': '81401', '주요행사비': '45102' },
    g20: { '기획국': '6010', '총무국': '1041', '재정국': '1042', '임원실': '1001' },
    card: '26201', personal: '26202', bank: '10301', pvendor: '10024', adv: '13500',
  };
  const switches = {};
  ['총무국', '기획국', '재정국', '임원실'].forEach(d => switches[d] = { 총무국청구: true, 스캔등록: true, 받을돈: true, 예산차단: d === '기획국', 카드자동연결: true, 다른계좌: true });
  switches['임원실'].총무국청구 = false;
  const carlog = [
    { date: '2026-10-05', from: 52210, to: 52288, dest: '종로 > 용산 교구', purpose: '공문 원본 전달', who: '김정래' },
    { date: '2026-10-08', from: 52288, to: 52340, dest: '종로 > 마포 거래처', purpose: '견적 협의', who: '이예시' },
  ];
  return {
    v: 1, me: 'u1', users, lines, accounts, budgets, events, hist, cards, expenses, advances, rules, grade, gyeong, jr, switches, carlog,
    batches: [{ id: 'b1', date: '2026-10-13', by: 'u7', items: ['e2'], other: false, state: 'ready', check2: null }],
    notes: [
      { to: 'u1', t: '2026-10-13 17:40', msg: '야근식대 30,000원이 10/25 지급 묶음에 들어갔습니다.', read: false },
      { to: 'u3', t: '2026-10-12 10:12', msg: '「워크숍 명찰·필기구」가 보완 요청으로 돌아왔습니다.', read: false },
    ],
    audit: [], guide: {}, lock: {}, seq: 20, otherSeen: {},
  };
};
