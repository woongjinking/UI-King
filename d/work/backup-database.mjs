import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const db=new DatabaseSync(path.resolve(here,'../outputs/screen-studio/data/studio.sqlite'));
const target=path.join(here,`studio-before-layout-${Date.now()}.sqlite`);
db.exec(`VACUUM INTO '${target.replaceAll("'","''")}'`);db.close();console.log('Database snapshot saved.');
