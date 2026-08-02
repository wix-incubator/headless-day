import fs from 'fs';
const ROOT='/tmp/ld';
const HDP=['3005','3004','3622','3010','3009','3003','3002','3001',
 '3024','3023','3710','3020','3070','3069','3068',
 '3040','3039','3665','54200','3298','4286',
 '3062','98138','3455','3942','60592','60596'];
function norm(n){return n.replace(/\\/g,'/').trim();}
function ff(n){n=norm(n);const c=[ROOT+'/parts/'+n,ROOT+'/p/'+n,ROOT+'/parts/s/'+n.replace(/^s\//,''),ROOT+'/p/48/'+n.replace(/^48\//,'')];for(const p of c)if(fs.existsSync(p))return p;return null;}
const files=new Map();
function col(ref){const dn=norm(ref).toLowerCase();
  const key=dn.startsWith('s/')?'parts/'+dn:dn;   // subparts need parts/ prefix; rest bare
  if(files.has(key))return;
  const s=ff(dn);if(!s){files.set(key,'0');return;}
  const t=fs.readFileSync(s,'latin1');files.set(key,t);
  t.split('\n').forEach(l=>{const k=l.trim().split(/\s+/);if(k[0]==='1'&&k.length>=15)col(k.slice(14).join(' '));});}
HDP.forEach(p=>col(p+'.dat'));
let out='0 FILE catalog.ldr\n0 Catalog\n';
HDP.forEach((id,i)=>{ out+='1 16 '+(i*60)+' 0 0 1 0 0 0 1 0 0 0 1 '+id+'.dat\n'; });
for(const [n,cc] of files) out+='\n0 FILE '+n+'\n'+cc.replace(/\r/g,'')+'\n';
fs.writeFileSync('/sessions/great-stoic-feynman/mnt/headless-dmytroh/public/parts_catalog.mpd',out);
console.log('parts:',HDP.length,' inlined:',files.size,' size:',(out.length/1024|0)+'KB');
