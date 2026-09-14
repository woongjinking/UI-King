import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,generateLocal,validateScreens,screenHtml,sampleValue} from '../domain.mjs';
const row={id:'CUS-001',name:'고객 등록',description:'고객을 등록한다',path:'고객 > 등록',type:'자동',fields:''};
test('이메일과 날짜를 구분해 샘플 생성',()=>{assert.equal(sampleValue('이메일',0),'sample1@example.com');assert.equal(sampleValue('등록일',0),'2026-09-01');assert.equal(sampleValue('파일명',0),'파일명 1');});
test('필수값, 중복 ID, 유형, 개수 검증',()=>{assert.throws(()=>validate([{...row,name:''}]));assert.throws(()=>validate([row,row]));assert.throws(()=>validate([{...row,type:'임의'}]));assert.throws(()=>validate([]));assert.equal(validate([row])[0].id,row.id);});
test('업무 맥락 및 명시 필드 반영',()=>{const s=generateLocal(validate([row]))[0];assert.equal(s.type,'등록');assert.ok(s.fields.includes('고객명'));assert.deepEqual(generateLocal([{...row,fields:'이름,전화번호'}])[0].fields,['이름','전화번호']);});
test('잘못된 AI 출력 거절 및 원본 요구사항 보존',()=>{const ss=generateLocal([row]);assert.equal(validateScreens(ss,[row])[0].description,row.description);assert.throws(()=>validateScreens([{...ss[0],id:'other'}],[row]));assert.throws(()=>validateScreens([{...ss[0],fields:['x'.repeat(51)]}],[row]));});
test('사용자 입력 HTML 이스케이프',()=>{const s=generateLocal([{...row,name:'<script>alert(1)</script>',fields:'<img src=x onerror=alert(1)>'}])[0];const html=screenHtml(s);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;script&gt;'));});
