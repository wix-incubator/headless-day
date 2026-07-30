import fs from 'fs';
const ROOT='/tmp/ld';
const rows=[];
const R={0:'1 0 0 0 1 0 0 0 1',1:'0 0 1 0 1 0 -1 0 0',2:'-1 0 0 0 1 0 0 0 -1',3:'0 0 -1 0 1 0 1 0 0'};
const P=(c,x,y,z,part,rot)=>rows.push('1 '+c+' '+(x*20)+' '+(-y*24)+' '+(z*20)+' '+R[rot||0]+' '+(part||'3005.dat'));
const SX=13,SZ=9,fh=4,floors=3,wallTop=fh*floors, mid=(SX/2)|0;
// colours: 71 stone, 15 white, 19 tan, 43 glass, 72 dark, 14 gold, 4 red, 70 brown, 1 blue, 0 black
const pil=x=>(x===0||x===3||x===6||x===9||x===12);
// ---- base ----
for(let x=-1;x<=SX;x++){P(0,x,-1,-1,'3024.dat');P(0,x,-1,SZ,'3024.dat');}
for(let z=0;z<SZ;z++){P(0,-1,-1,z,'3024.dat');P(0,SX,-1,z,'3024.dat');}
// ---- walls ----
for(let y=0;y<wallTop;y++){const fl=(y/fh)|0,yin=y%fh;
  for(let x=0;x<SX;x++)for(let z=0;z<SZ;z++){const onB=(x===0||x===SX-1||z===0||z===SZ-1);if(!onB)continue;
    let c=71;
    if(y===0)c=72;
    else if(yin===fh-1)c=15;                       // white cornice band
    else if(z===0){                                 // FRONT
      if(pil(x))c=15;                                // white pilasters
      else if(fl===0&&x>=5&&x<=7&&yin<=2)c=(x===6?1:15); // blue door + white surround
      else if(yin>=1&&yin<=2)c=43;                   // glass
      else c=19;                                     // tan bay
    } else if(x===0||x===SX-1){ c=(z>=2&&z<=SZ-3&&yin>=1&&yin<=2&&((z-2)%2===0))?43:71; }
    else { c=(x>=2&&x<=SX-3&&yin>=1&&yin<=2&&((x-2)%2===0))?43:71; }
    P(c,x,y,z);
  }}
// arched entrance
P(15,5,3,0,'3455.dat');   // arch 1x4 over door area (front)
// cornice overhang tiles at wallTop
for(let x=-1;x<=SX;x++){P(15,x,wallTop,-1,'3070.dat');P(15,x,wallTop,SZ,'3070.dat');}
for(let z=0;z<SZ;z++){P(15,-1,wallTop,z,'3070.dat');P(15,SX,wallTop,z,'3070.dat');}
// ---- MANSARD: near-vertical dark wall + round window + dormers, slope pitch on top ----
const mB=wallTop, mH=4;
for(let y=mB;y<mB+mH;y++){const yin=y-mB;
  for(let x=0;x<SX;x++)for(let z=0;z<SZ;z++){const onB=(x===0||x===SX-1||z===0||z===SZ-1);if(!onB)continue;
    let c=72;
    if(z===0){const cx=mid,cy=mB+2,dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);
      if(d<=2.2){ c=(d>=1.5||dx===0||dy===0)?14:43; }
      else if((x===2||x===SX-3)&&yin===1){ c=43; } }
    P(c,x,y,z);
  }}
// slope pitch ring on top of mansard wall (dark, facing outward)
const sy=mB+mH;
for(let x=0;x<SX-1;x+=2){P(72,x,sy,0,'3040.dat',0);P(72,x,sy,SZ-1,'3040.dat',2);}
for(let z=0;z<SZ-1;z+=2){P(72,0,sy,z,'3040.dat',1);P(72,SX-1,sy,z,'3040.dat',3);}
// flat dark tile top (interior)
for(let x=1;x<SX-1;x++)for(let z=1;z<SZ-1;z++)P(72,x,sy,z,'3070.dat');
// chimneys + round pots
[[2,SZ-2],[SX-3,SZ-2]].forEach(cc=>{for(let k=0;k<3;k++)P(70,cc[0],wallTop+k,cc[1]);P(72,cc[0],wallTop+3,cc[1],'3062.dat');});
// ---- pack (hybrid naming) ----
function norm(n){return n.replace(/\\/g,'/').trim();}
function ff(n){n=norm(n);const c=[ROOT+'/parts/'+n,ROOT+'/p/'+n,ROOT+'/parts/s/'+n.replace(/^s\//,''),ROOT+'/p/48/'+n.replace(/^48\//,'')];for(const p of c)if(fs.existsSync(p))return p;return null;}
const files=new Map();
function col(ref){const dn=norm(ref).toLowerCase();const key=dn.startsWith('s/')?'parts/'+dn:dn;if(files.has(key))return;const s=ff(dn);if(!s){files.set(key,'0');return;}const t=fs.readFileSync(s,'latin1');files.set(key,t);t.split('\n').forEach(l=>{const k=l.trim().split(/\s+/);if(k[0]==='1'&&k.length>=15)col(k.slice(14).join(' '));});}
['3005.dat','3024.dat','3040.dat','3455.dat','3070.dat','3062.dat'].forEach(col);
let out='0 FILE sanctum.ldr\n0 Sanctum HD\n'+rows.join('\n')+'\n';
for(const [n,cc] of files) out+='\n0 FILE '+n+'\n'+cc.replace(/\r/g,'')+'\n';
fs.writeFileSync('/sessions/great-stoic-feynman/mnt/headless-dmytroh/public/sanctum_packed.mpd',out);
console.log('placed:',rows.length,' inlined:',files.size,' size:',(out.length/1024|0)+'KB');
