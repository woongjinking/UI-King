import {api,e,notify,exportPpt} from './shared.js';
let sequence=0,topZ=100;
export async function openPreview(id){
 let version=await api('/versions/'+id),index=0,pinMode=false;
 const win=document.createElement('section');win.className='preview-window';win.setAttribute('role','dialog');win.setAttribute('aria-label',version.label);const n=sequence++;
 win.style.cssText=`left:${Math.min(50+(n%5)*34,window.innerWidth/4)}px;top:${75+(n%5)*27}px;z-index:${++topZ}`;
 win.innerHTML=`<div class="window-titlebar"><span class="window-icon">▣</span><h2>${e(version.label)}</h2><button class="window-max" title="창 최대화 / 복원">□</button><button class="window-close" title="미리보기 닫기">×</button></div><div class="preview-toolbar"><label>화면 <select class="screen-select">${version.screens.map((s,i)=>`<option value="${i}">${e(s.name)} · ${e(s.id)}</option>`).join('')}</select></label><button class="pin-toggle" aria-pressed="false">⌖ 핀</button><button class="preview-export">↓ 화면설계서추출</button></div><div class="pin-instruction">핀을 선택한 후 샘플 화면에서 메모를 남길 위치를 클릭하세요.</div><div class="preview-scroll"><div class="preview-stage"><iframe title="샘플 UI" sandbox="allow-scripts"></iframe><div class="pin-layer"></div></div></div><div class="preview-bottom"><span class="pin-count"></span><span>창 제목을 드래그해 이동 · 우측 하단에서 크기 조절</span></div>`;
 document.body.append(win);
 const stage=win.querySelector('.preview-stage'),frame=win.querySelector('iframe'),layer=win.querySelector('.pin-layer');
 const sc=()=>version.screens[index];
 const closeEditor=()=>{win.querySelector('.pin-editor')?.remove();win.querySelector('.pending-pin')?.remove();};
 function drawPins(){layer.innerHTML='';const pins=version.memos.filter(m=>m.screen===sc().id);win.querySelector('.pin-count').textContent=`${sc().name} · 핀 메모 ${pins.length}개`;
  pins.forEach((m,i)=>{if(m.x===null||m.y===null)return;const marker=document.createElement('div');marker.className='pin-marker';marker.style.left=`${m.x*100}%`;marker.style.top=`${m.y*100}%`;marker.innerHTML=`<button class="pin-delete" title="핀 ${i+1} 삭제" aria-label="핀 ${i+1} 삭제">×</button><button class="pin-number" title="${e(m.body)}" aria-label="핀 ${i+1} 메모 보기">${i+1}</button>`;marker.querySelector('.pin-number').onclick=ev=>{ev.stopPropagation();showMemo(m,i+1);};marker.querySelector('.pin-delete').onclick=async ev=>{ev.stopPropagation();try{const v=await api(`/versions/${id}/memos/${m.id}`,{method:'DELETE'});closeEditor();window.dispatchEvent(new CustomEvent('memos-updated',{detail:v}));notify('핀과 메모를 삭제했습니다.');}catch(err){notify(err.message);}};layer.append(marker);});
 }
 function showMemo(m,number){closeEditor();const editor=document.createElement('div');editor.className='pin-editor';editor.innerHTML=`<div class="editor-title"><b>핀 ${number} · ${e(m.target)}</b><button title="메모 닫기">×</button></div><p class="memo-body">${e(m.body)}</p><small>${new Date(m.created).toLocaleString('ko-KR')}</small>`;editor.querySelector('button').onclick=closeEditor;win.append(editor);}
 function createPin(x,y){closeEditor();const pending=document.createElement('span');pending.className='pending-pin';pending.textContent='+';pending.style.left=`${x*100}%`;pending.style.top=`${y*100}%`;layer.append(pending);
  const editor=document.createElement('form');editor.className='pin-editor';editor.innerHTML=`<div class="editor-title"><b>새 핀 메모</b><button type="button" class="cancel-pin" title="메모 취소">×</button></div><label>메모 대상<select name="target"><option>선택한 위치</option>${sc().fields.map(f=>`<option>${e(f)}</option>`).join('')}</select></label><label>설명<textarea name="body" required maxlength="1000" rows="5" placeholder="이 부분에 추가하거나 변경할 내용을 입력하세요."></textarea></label><p>샘플 UI는 유지되며, 메모는 화면설계서에 반영됩니다.</p><button class="primary">핀 메모 저장</button>`;win.append(editor);editor.querySelector('.cancel-pin').onclick=closeEditor;editor.querySelector('textarea').focus();
  const screenId=sc().id;editor.onsubmit=async ev=>{ev.preventDefault();const button=editor.querySelector('.primary');button.disabled=true;try{const data=Object.fromEntries(new FormData(editor));const v=await api(`/versions/${id}/memos`,{method:'POST',body:{...data,screen:screenId,x,y}});closeEditor();window.dispatchEvent(new CustomEvent('memos-updated',{detail:v}));notify('핀 메모를 저장했습니다.');}catch(err){notify(err.message);button.disabled=false;}};
 }
 layer.onclick=ev=>{if(!pinMode||ev.target!==layer)return;const r=layer.getBoundingClientRect();createPin(Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height)));};
 win.querySelector('.pin-toggle').onclick=()=>{pinMode=!pinMode;win.classList.toggle('pinning',pinMode);win.querySelector('.pin-toggle').setAttribute('aria-pressed',String(pinMode));win.querySelector('.pin-instruction').textContent=pinMode?'핀 모드 켜짐 · 화면에서 원하는 위치를 클릭하세요.':'핀을 선택한 후 샘플 화면에서 메모를 남길 위치를 클릭하세요.';};
 function load(){closeEditor();frame.src=`/api/versions/${id}/screen/${encodeURIComponent(sc().id)}`;drawPins();}
 win.querySelector('.screen-select').onchange=ev=>{index=+ev.target.value;load();};
 win.querySelector('.preview-export').onclick=()=>exportPpt(id).catch(err=>notify(err.message));
 const onMemos=ev=>{if(ev.detail.id===id){version=ev.detail;drawPins();}};window.addEventListener('memos-updated',onMemos);
 const resize=new ResizeObserver(()=>{const w=stage.clientWidth;frame.style.transform=`scale(${w/1100})`;stage.style.height=`${w*900/1100}px`;});resize.observe(stage);
 win.addEventListener('pointerdown',()=>win.style.zIndex=++topZ);
 const titlebar=win.querySelector('.window-titlebar');let drag;
 titlebar.onpointerdown=ev=>{if(ev.target.closest('button')||win.classList.contains('maximized'))return;const r=win.getBoundingClientRect();drag={x:ev.clientX,y:ev.clientY,left:r.left,top:r.top};titlebar.setPointerCapture(ev.pointerId);};
 titlebar.onpointermove=ev=>{if(!drag)return;win.style.left=`${Math.max(0,Math.min(window.innerWidth-160,drag.left+ev.clientX-drag.x))}px`;win.style.top=`${Math.max(0,Math.min(window.innerHeight-55,drag.top+ev.clientY-drag.y))}px`;};titlebar.onpointerup=()=>drag=null;titlebar.onlostpointercapture=()=>drag=null;
 win.querySelector('.window-max').onclick=()=>win.classList.toggle('maximized');
 win.querySelector('.window-close').onclick=()=>{resize.disconnect();window.removeEventListener('memos-updated',onMemos);win.remove();};
 load();
}
