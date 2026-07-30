import fs from 'fs';
const ROOT='/tmp/ld';
const SX=8,SZ=6,fh=3,floors=4,wallTop=floors*fh,mTop=wallTop+4; // 4 floors, tall dark mansard
const rows=[];
const P=(c,lx,ly,lz,part,rot)=>rows.push('1 '+c+' '+lx+' '+ly+' '+lz+' '+(rot||'1 0 0 0 1 0 0 0 1')+' '+part);
const B=(c,x,y,z,part)=>P(c,x*20,-y*24,z*20,part||'3005.dat');
const mid=Math.floor(SX/2);
// base + sidewalk ring
for(let x=-1;x<=SX;x++){B(72,x,-1,-1,'3024.dat');B(72,x,-1,SZ,'3024.dat');}
for(let z=0;z<SZ;z++){B(72,-1,-1,z,'3024.dat');B(72,SX,-1,z,'3024.dat');}
// walls: grey stone piers (15/white + 71 grey) with TAN window bays + glass
function wall(x,y,z){const onB=(x===0||x===SX-1||z===0||z===SZ-1);if(!onB)return;
  const fl=Math.floor(y/fh),yin=y%fh;
  if(y===0){B(72,x,y,z);return;}
  if(yin===fh-1){B(15,x,y,z);return;}                    // white cornice band
  if(z===0){                                             // FRONT
    if(x===0||x===SX-1||x===mid){B(15,x,y,z);return;}    // white pilasters
    if(fl===0&&x===mid-1&&yin>=1){B(1,x,y,z);return;}    // blue door
    if(yin>=1&&yin<=2){B(43,x,y,z);return;}              // glass
    B(19,x,y,z);return;                                  // tan window-bay recess
  }
  if(x===0||x===SX-1){ if((z===2||z===3)&&yin>=1&&yin<=2){B(43,x,y,z);return;} if(z>=2&&z<=3){B(19,x,y,z);return;} B(71,x,y,z);return; }
  if(z===SZ-1){ if((x>=2&&x<=SX-3)&&yin>=1&&yin<=2){B(43,x,y,z);return;} if(x>=2&&x<=SX-3){B(19,x,y,z);return;} B(71,x,y,z);return; }
}
for(let y=0;y<wallTop;y++)for(let x=0;x<SX;x++)for(let z=0;z<SZ;z++)wall(x,y,z);
// DARK mansard roof (dark bluish gray) with round window (gold ring) + dormer windows
for(let y=wallTop;y<mTop;y++)for(let x=0;x<SX;x++)for(let z=0;z<SZ;z++){const onB=(x===0||x===SX-1||z===0||z===SZ-1);if(!onB)continue;
  if(z===0){const cx=mid,dx=x-cx,dy=y-(wallTop+1),d=Math.sqrt(dx*dx+dy*dy);
    if(d<=1.7){ B(d>=1.2?14:43,x,y,z); continue; }                 // round window: gold ring + glass
    if((x===1||x===SX-2)&&(y===wallTop+1)){B(43,x,y,z);continue;}  // dormer glints
  }
  B(72,x,y,z);}                                          // dark roof body
// flat black cap
for(let x=1;x<SX-1;x++)for(let z=1;z<SZ-1;z++)B(0,x,mTop,z);
// chimneys w/ round pots
[[1,SZ-2],[SX-2,SZ-2]].forEach(cc=>{for(let k=0;k<3;k++)B(70,cc[0],wallTop+k,cc[1]);B(72,cc[0],wallTop+3,cc[1],'3062.dat');});
// ---- pack ----
function norm(n){return n.replace(/\\/g,'/').trim();}
function findFile(n){n=norm(n);const c=[ROOT+'/parts/'+n,ROOT+'/p/'+n,ROOT+'/parts/s/'+n.replace(/^s\//,''),ROOT+'/p/48/'+n.replace(/^48\//,'')];for(const p of c)if(fs.existsSync(p))return p;return null;}
const files=new Map();
function collect(name){name=norm(name).toLowerCase();if(files.has(name))return;const src=findFile(name);if(!src){files.set(name,'0');return;}const t=fs.readFileSync(src,'latin1');files.set(name,t);t.split('\n').forEach(l=>{const k=l.trim().split(/\s+/);if(k[0]==='1'&&k.length>=15)collect(k.slice(14).join(' '));});}
['3005.dat','3024.dat','3062.dat'].forEach(collect);
let out='0 FILE sanctum.ldr\n0 Sanctum HD\n'+rows.join('\n')+'\n';
for(const [n,cc] of files) out+='\n0 FILE '+n+'\n'+cc.replace(/\r/g,'')+'\n';
fs.writeFileSync('/sessions/great-stoic-feynman/mnt/headless-dmytroh/public/sanctum_packed.mpd',out);
console.log('parts:',rows.length,' inlined:',files.size,' size:',(out.length/1024|0)+'KB');
