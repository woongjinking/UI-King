export const columns = ['화면 ID','화면명','업무 설명','메뉴 경로','화면 유형','필드'];
export function validate(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw new Error('화면은 1~100개 등록해 주세요.');
  const ids = new Set();
  return rows.map((r,i) => {
    const v = Object.fromEntries(['id','name','description','path','type','fields'].map(k=>[k,String(r[k]??'').trim()]));
    for (const k of ['id','name','description','path']) if(!v[k]) throw new Error(`${i+2}행: ${columns[['id','name','description','path'].indexOf(k)]} 필수값이 없습니다.`);
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(v.id)) throw new Error(`${i+2}행: 화면 ID는 영문·숫자·밑줄·하이픈 40자 이내입니다.`);
    if(ids.has(v.id)) throw new Error(`${i+2}행: 화면 ID 중복 (${v.id})`); ids.add(v.id);
    if(v.name.length>80 || v.description.length>2000 || v.path.length>200 || v.fields.length>500) throw new Error(`${i+2}행: 입력 길이를 초과했습니다.`);
    v.type ||= '자동';
    if(!['자동','조회','등록','상세'].includes(v.type)) throw new Error(`${i+2}행: 화면 유형은 자동/조회/등록/상세입니다.`);
    if(v.fields.split(',').filter(x=>x.trim()).length>12) throw new Error(`${i+2}행: 필드는 최대 12개입니다.`);
    return v;
  });
}
export function generateLocal(rows) {
  return rows.map(r=>{
    const type = r.type==='자동' ? (/등록|신청|수정/.test(r.name)?'등록':/상세/.test(r.name)?'상세':'조회') : r.type;
    const topic = /고객|회원/.test(r.description+r.name)?['고객명','이메일','연락처','상태']:/주문|발주/.test(r.description+r.name)?['주문번호','주문자','상품명','금액','상태']:/직원|인사/.test(r.description+r.name)?['사번','성명','부서','직급','상태']:['번호','제목','담당자','상태','등록일'];
    return {...r,type,fields:(r.fields?r.fields.split(',').map(x=>x.trim()).filter(Boolean):topic),actions:type==='조회'?['조회','신규 등록']:type==='등록'?['취소','저장']:['목록','수정'],assumptions:['명시되지 않은 필드와 동작은 기획 검토용 제안입니다.','버튼은 샘플 동작이며 업무 API를 호출하지 않습니다.']};
  });
}
export function validateScreens(screens, rows) {
  if(!Array.isArray(screens)||screens.length!==rows.length) throw new Error('AI가 올바른 화면 목록을 반환하지 않았습니다.');
  return rows.map(r=>{
    const s=screens.find(x=>x.id===r.id);
    if(!s || !['조회','등록','상세'].includes(s.type)) throw new Error('AI 화면 유형이 올바르지 않습니다.');
    for(const k of ['fields','actions','assumptions']) if(!Array.isArray(s[k])||!s[k].length||s[k].length>(k==='fields'?12:6)||s[k].some(x=>typeof x!=='string'||!x.trim()||x.length>(k==='assumptions'?300:50))) throw new Error('AI 화면 데이터 형식이 올바르지 않습니다.');
    return {...r,type:s.type,fields:s.fields,actions:s.actions,assumptions:s.assumptions};
  });
}
export const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sampleValue(field,i) {
  if(/이메일|email/i.test(field)) return `sample${i+1}@example.com`;
  if(/전화|연락처/.test(field)) return `010-0000-${String(i+1).padStart(4,'0')}`;
  if(/상태/.test(field)) return ['검토 중','완료','진행 중'][i%3];
  if(/일자|날짜|일시|등록일|수정일|시작일|종료일|생년월일/.test(field)) return `2026-09-${String(i+1).padStart(2,'0')}`;
  if(/금액|가격/.test(field)) return `${(i+1)*12000} 원`;
  return `${field} ${i+1}`;
}
export function screenHtml(s) {
 const e=escapeHtml;
 return `<div class="sample"><small>${e(s.path)}</small><h2>${e(s.name)}</h2><p>${e(s.description)}</p>${s.type==='조회'?`<div class="filters"><label>검색어 <input placeholder="검색어를 입력하세요"></label><label>상태 <select><option>전체</option><option>진행 중</option><option>완료</option></select></label><button onclick="document.getElementById('feedback').textContent='샘플 조회입니다. API 연결 지점: search'">조회</button></div><p>전체 <b>5</b>건 · 가상 샘플 데이터</p><div class="table-wrap"><table><thead><tr>${s.fields.map(f=>`<th>${e(f)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:5},(_,i)=>`<tr>${s.fields.map(f=>`<td>${e(sampleValue(f,i))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="fields">${s.fields.map(f=>`<label>${e(f)}${s.type==='상세'?`<div class="value">${e(sampleValue(f,0))}</div>`:`<input placeholder="${e(f)} 입력">`}</label>`).join('')}</div>`}<div class="actions">${s.actions.map(a=>`<button onclick="document.getElementById('feedback').textContent='샘플 동작입니다. 업무 API 연결이 필요합니다.'">${e(a)}</button>`).join('')}</div><p id="feedback" role="status"></p></div>`;
}
export const sampleCss = `*{box-sizing:border-box}body{font:14px 'Malgun Gothic',sans-serif;color:#25324b;margin:0;background:#fff}.sample{padding:32px}small{color:#8791a3}h2{font-size:26px;margin:18px 0 10px}p{color:#778399;line-height:1.7}.filters{display:flex;align-items:end;gap:16px;background:#f6f8fc;padding:22px;border-radius:8px;margin:28px 0}label{display:grid;gap:10px;font-size:13px}input,select{padding:11px;border:1px solid #dfe4ed;border-radius:5px;min-width:140px;background:white}button{padding:11px 20px;background:#4e62e8;color:white;border:0;border-radius:5px;cursor:pointer}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;white-space:nowrap}td,th{text-align:left;padding:16px;border-bottom:1px solid #edf0f5}th{background:#f8f9fc;color:#78849a;font-size:12px}.actions{display:flex;justify-content:end;gap:8px;margin-top:24px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:30px}.value{background:#f6f8fc;padding:14px}`;
