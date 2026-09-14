const {spawn}=require('node:child_process');
const {openSync}=require('node:fs');
const path=require('node:path');
const cwd=path.resolve(__dirname,'../outputs/screen-studio');
const stdout=openSync(path.join(__dirname,'server.stdout.log'),'a');
const stderr=openSync(path.join(__dirname,'server.stderr.log'),'a');
const child=spawn(process.execPath,['--env-file-if-exists=.env','server.mjs'],{cwd,detached:true,windowsHide:true,stdio:['ignore',stdout,stderr]});
child.unref();console.log('Started Screen Studio PID '+child.pid);
