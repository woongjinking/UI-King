const base='http://127.0.0.1:4317';
const config=await fetch(base+'/api/config');
if(!config.ok)throw new Error('Server not healthy');
console.log('Server HTTP 200');
const projects=await fetch(base+'/api/projects').then(r=>r.json());
for(const p of projects){
 const d=await fetch(base+'/api/projects/'+p.id).then(r=>r.json());
 if(d.versions.length){const html=await fetch(base+'/api/versions/'+d.versions[0].id+'/source').then(r=>r.text());console.log(JSON.stringify({project:p.name,versions:d.versions.length,emailFix:html.includes('sample1@example.com')}));}
}
