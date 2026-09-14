export const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function api(url,options={}){const r=await fetch('/api'+url,{...options,headers:options.body instanceof FormData?{}:{'Content-Type':'application/json'},body:options.body instanceof FormData?options.body:options.body?JSON.stringify(options.body):undefined});const data=await r.json();if(!r.ok)throw new Error(data.error||'요청에 실패했습니다.');return data;}
let toastTimer;
export function notify(s){const t=document.querySelector('#toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),6000);}
const exportsInProgress=new Set();
export async function exportPpt(id){
 if(exportsInProgress.has(id))return notify('이 버전의 설계서를 생성 중입니다.');exportsInProgress.add(id);
 let frame;
 try{
  const v=await api('/versions/'+id),snapshots={};
  if(!window.html2canvas)throw new Error('화면 캡처 라이브러리를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.');
  for(let i=0;i<v.screens.length;i++){
   notify(`화면설계서 생성 중 · ${i+1}/${v.screens.length} 화면`);
   frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-same-origin');frame.style.cssText='position:fixed;left:-12000px;top:0;width:1100px;height:900px;border:0';
   const loaded=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(new Error('화면을 불러오지 못했습니다.'));});
   frame.src=`/api/versions/${id}/screen/${encodeURIComponent(v.screens[i].id)}`;document.body.append(frame);await loaded;
   await frame.contentDocument.fonts.ready;
   const canvas=await window.html2canvas(frame.contentDocument.body,{width:1100,height:900,windowWidth:1100,windowHeight:900,scale:1,backgroundColor:'#ffffff',logging:false});
   snapshots[v.screens[i].id]=canvas.toDataURL('image/png');frame.remove();frame=null;
  }
  const result=await fetch(`/api/versions/${id}/ppt`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshots})});
  if(!result.ok)throw new Error((await result.json()).error||'PPT 생성에 실패했습니다.');
  const url=URL.createObjectURL(await result.blob()),link=document.createElement('a');link.href=url;link.download=`${v.label.replace(/[\\/:*?"<>|]/g,'_')}.pptx`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);notify(`${v.label} 화면설계서를 추출했습니다.`);
 }finally{frame?.remove();exportsInProgress.delete(id);}
}
