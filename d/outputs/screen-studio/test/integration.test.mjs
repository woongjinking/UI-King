import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

test('실제 API: 엑셀 → 저장 → UI 버전 → 메모 → PPT/HTML → 이전 버전 보존',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'screen-studio-test-'));
 const port=14317,base=`http://127.0.0.1:${port}`;
 const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DB_PATH:path.join(dir,'test.sqlite'),OPENAI_API_KEY:'',OPENAI_MODEL:''},stdio:['ignore','pipe','pipe']});
 let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
 async function request(url,method='GET',body){const res=await fetch(base+'/api'+url,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const json=await res.json();return {status:res.status,json};}
 try {
  let ready=false;for(let i=0;i<80;i++){try{const r=await fetch(base+'/api/config');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs);
  assert.equal((await fetch(base)).status,200);
  const template=await fetch(base+'/api/template');assert.equal(template.status,200);
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(await template.arrayBuffer());assert.equal(wb.getWorksheet('요구사항').getRow(1).getCell(1).text,'화면 ID');
  const form=new FormData();form.append('file',new Blob([await wb.xlsx.writeBuffer()]),'requirements.xlsx');const uploaded=await fetch(base+'/api/import',{method:'POST',body:form});assert.equal(uploaded.status,200);const rows=await uploaded.json();assert.equal(rows.length,1);
  wb.getWorksheet('요구사항').getRow(2).getCell(1).value='';const invalid=new FormData();invalid.append('file',new Blob([await wb.xlsx.writeBuffer()]),'invalid.xlsx');assert.equal((await fetch(base+'/api/import',{method:'POST',body:invalid})).status,400);
  const created=await request('/projects','POST',{name:'통합 검증 프로젝트',users:'상담사',nature:'고객 정보 관리'});assert.equal(created.status,201);const pid=created.json.id;assert.equal(created.json.users,'상담사');
  const saved=await request(`/projects/${pid}/draft`,'PUT',{revision:0,rows});assert.equal(saved.json.revision,1);
  assert.equal((await request(`/projects/${pid}/draft`,'PUT',{revision:0,rows})).status,409);
  const first=await request(`/projects/${pid}/save`,'POST',{revision:1,rows,mode:'local',note:'첫 번째 버전'});assert.equal(first.status,201);const v1=first.json;assert.equal(v1.number,0);assert.equal(v1.label,'통합 검증 프로젝트_v000');
  const memo=await request(`/versions/${v1.id}/memos`,'POST',{screen:rows[0].id,target:'고객명',body:'고객 등급 필터를 추가해 주세요.',x:.2,y:.3});assert.equal(memo.status,201);assert.equal(memo.json.memos.length,1);assert.equal(memo.json.memos[0].x,.2);
  assert.equal((await request(`/versions/${v1.id}/memos`,'POST',{screen:rows[0].id,body:'잘못된 위치',x:2,y:.2})).status,400);
  const source=await fetch(base+`/api/versions/${v1.id}/source`);assert.equal(source.status,200);assert.ok((await source.text()).includes('고객 목록'));
  const ppt=await fetch(base+`/api/versions/${v1.id}/ppt`);assert.equal(ppt.status,200);const zip=await JSZip.loadAsync(await ppt.arrayBuffer());const slides=Object.keys(zip.files).filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x));assert.equal(slides.length,3);const xml=(await Promise.all(slides.map(x=>zip.file(x).async('string')))).join('');assert.ok(xml.includes('고객 등급 필터를 추가해 주세요.'));assert.ok(xml.includes('고객 목록'));
  const changed=rows.map(r=>({...r,name:'고객 검색 목록',fields:'고객명,이메일,등급'}));
  const second=await request(`/projects/${pid}/save`,'POST',{revision:2,rows:changed,mode:'local',note:'등급 추가'});assert.equal(second.status,201);assert.equal(second.json.number,1);assert.deepEqual(second.json.screens[0].fields,['고객명','이메일','등급']);
  const prior=(await request('/versions/'+v1.id)).json;assert.equal(prior.screens[0].name,'고객 목록');assert.equal(prior.memos.length,1);assert.equal(second.json.memos.length,0);
  assert.equal((await request('/projects/'+pid)).json.versions.length,2);
  assert.equal((await request(`/projects/${pid}/save`,'POST',{revision:3,rows,mode:'ai'})).status,400);
  assert.equal((await request('/projects/'+pid)).json.versions.length,2);
  assert.deepEqual((await request('/projects/'+pid)).json.draft,changed);
  assert.equal((await request(`/projects/${pid}/save`,'POST',{revision:2,rows,mode:'local'})).status,409);
  assert.equal((await request(`/versions/${second.json.id}/memos/${memo.json.memos[0].id}`,'DELETE')).status,404);
  const removed=await request(`/versions/${v1.id}/memos/${memo.json.memos[0].id}`,'DELETE');assert.equal(removed.status,200);assert.equal(removed.json.memos.length,0);
 }finally{server.kill();await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});const resolved=path.resolve(dir);assert.equal(path.dirname(resolved),path.resolve(tmpdir()));assert.ok(path.basename(resolved).startsWith('screen-studio-test-'));await rm(resolved,{recursive:true,force:true});}
});
