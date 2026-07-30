import fs from 'fs';
const ROOT='/tmp/ld';
const rows=[];
const P=(c,lx,ly,lz,part,rot)=>rows.push('1 '+c+' '+lx+' '+ly+' '+lz+' '+(rot||'1 0 0 0 1 0 0 0 1')+' '+part);
// architectural detail set — lay out in a grid, on ground, identity
const SET=[
 ['3040.dat',72,'slope45_2x1'],['3039.dat',72,'slope45_2x2'],['3298.dat',72,'slope33_3x2'],
 ['3665.dat',72,'slopeInv_2x1'],['54200.dat',71,'cheese_1x1'],['4286.dat',72,'slope33_3x1'],
 ['3455.dat',71,'arch_1x4'],['3062.dat',15,'roundBrick_1x1'],['3941.dat',15,'roundBrick_2x2'],
 ['3070.dat',19,'tile_1x1'],['3068.dat',19,'tile_2x2'],['98138.dat',43,'roundTile_1x1'],
 ['60592.dat',15,'window_1x2x2'],['60596.dat',71,'door_1x4x6'],['3005.dat',71,'brick_1x1'],
 ['3004.dat',71,'brick_1x2'],['3010.dat',71,'brick_1x4'],['3020.dat',19,'plate_2x4'],
];
let i=0;const cols=6, sp=80;
for(const [part,c] of SET){ const gx=(i%cols)*sp, gz=Math.floor(i/cols)*sp; P(c,gx,0,gz,part); i++; }
let out='0 FILE set\n0 detail set\n'+rows.join('\n')+'\n';
function norm(n){return n.replace(/\\/g,'/').trim();}
function ff(n){n=norm(n);const c=[ROOT+'/parts/'+n,ROOT+'/p/'+n,ROOT+'/parts/s/'+n.replace(/^s\//,''),ROOT+'/p/48/'+n.replace(/^48\//,'')];for(const p of c)if(fs.existsSync(p))return p;return null;}
const files=new Map();const miss=[];
function col(name){name=norm(name).toLowerCase();if(files.has(name))return;const s=ff(name);if(!s){files.set(name,'0');miss.push(name);return;}const t=fs.readFileSync(s,'latin1');files.set(name,t);t.split('\n').forEach(l=>{const k=l.trim().split(/\s+/);if(k[0]==='1'&&k.length>=15)col(k.slice(14).join(' '));});}
SET.forEach(s=>col(s[0]));
for(const [n,cc] of files) out+='\n0 FILE '+n+'\n'+cc.replace(/\r/g,'')+'\n';
fs.writeFileSync('/sessions/great-stoic-feynman/mnt/headless-dmytroh/public/sanctum_packed.mpd',out);
console.log('set parts:',SET.length,' inlined:',files.size,' MISSING:',miss.filter(m=>SET.some(s=>s[0]===m)).join(',')||'(top-level ok)');
