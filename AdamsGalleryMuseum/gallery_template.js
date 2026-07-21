<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Adam's Gallery — Collection No. 01 / 2026</title>
<style>
  :root{
    --ink:#16140f;
    --paper:#f6f4ee;
    --muted:#8a857a;
    --line:rgba(20,18,14,.14);
    --font:"Helvetica Neue",Helvetica,Arial,"Inter",system-ui,sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:#0c0c0d;overflow:hidden;font-family:var(--font);color:var(--ink);-webkit-font-smoothing:antialiased;}
  #app{position:fixed;inset:0}
  canvas{display:block}

  /* ---------- Crosshair ---------- */
  #crosshair{position:fixed;left:50%;top:50%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;
    background:rgba(255,255,255,.85);box-shadow:0 0 0 1.5px rgba(0,0,0,.25),0 0 8px rgba(0,0,0,.2);
    pointer-events:none;z-index:20;opacity:0;transition:opacity .35s, transform .25s, background .25s, box-shadow .25s;}
  #crosshair.show{opacity:.9}
  #crosshair.hot{transform:scale(1.9);background:rgba(255,255,255,1);box-shadow:0 0 0 1.5px rgba(0,0,0,.35),0 0 14px rgba(255,255,255,.55)}

  /* ---------- Hover label ---------- */
  #hoverlabel{position:fixed;left:50%;top:calc(50% + 26px);transform:translate(-50%,4px);z-index:21;pointer-events:none;
    opacity:0;transition:opacity .28s ease, transform .28s ease;text-align:center;}
  #hoverlabel.show{opacity:1;transform:translate(-50%,0)}
  #hoverlabel .t{display:inline-block;background:rgba(18,17,14,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    color:#fff;padding:7px 14px;border-radius:2px;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:500;
    border:1px solid rgba(255,255,255,.14);}
  #hoverlabel .sub{display:block;margin-top:7px;color:rgba(255,255,255,.72);font-size:11px;letter-spacing:.18em;text-transform:uppercase}

  /* ---------- HUD top ---------- */
  #hud{position:fixed;top:18px;left:20px;z-index:18;color:#fff;mix-blend-mode:difference;pointer-events:none;
    opacity:0;transition:opacity .6s;}
  #hud.show{opacity:1}
  #hud .brand{font-size:13px;letter-spacing:.26em;text-transform:uppercase;font-weight:600}
  #hud .meta{font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;margin-top:4px;opacity:.7}

  /* ---------- Minimap ---------- */
  #map{position:fixed;top:16px;right:16px;z-index:18;width:178px;background:rgba(246,244,238,.92);
    backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid var(--line);border-radius:3px;
    padding:11px 11px 9px;box-shadow:0 12px 40px rgba(0,0,0,.28);opacity:0;transition:opacity .6s;transform:translateY(-4px)}
  #map.show{opacity:1;transform:none}
  #map .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px}
  #map .hd b{font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;font-weight:600}
  #map .hd span{font-size:9px;letter-spacing:.14em;color:#8a857a}
  #mapcanvas{display:block;width:100%;height:auto;border-radius:2px}
  #wings{display:flex;flex-direction:column;gap:4px;margin-top:9px}
  #wings button{font-family:var(--font);font-size:10px;letter-spacing:.16em;text-transform:uppercase;
    border:1px solid var(--line);background:transparent;color:var(--ink);padding:6px 8px;border-radius:2px;cursor:pointer;
    display:flex;justify-content:space-between;align-items:center;transition:background .18s,border-color .18s}
  #wings button:hover{background:rgba(20,18,14,.06)}
  #wings button .n{opacity:.45;font-size:9px}

  /* ---------- Sound toggle ---------- */
  #sound{position:fixed;bottom:18px;right:16px;z-index:18;display:flex;align-items:center;gap:9px;
    background:rgba(246,244,238,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    border:1px solid var(--line);border-radius:40px;padding:8px 14px 8px 12px;cursor:pointer;
    font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink);box-shadow:0 8px 28px rgba(0,0,0,.22);
    opacity:0;transition:opacity .6s}
  #sound.show{opacity:1}
  #sound .dot{width:9px;height:9px;border-radius:50%;background:#c4bfb2;transition:background .25s, box-shadow .25s}
  #sound.on .dot{background:#3a7d52;box-shadow:0 0 0 4px rgba(58,125,82,.18)}

  /* ---------- Mouse-look toggle (sits above sound) ---------- */
  #mlook{position:fixed;bottom:54px;right:16px;z-index:18;display:flex;align-items:center;gap:9px;
    background:rgba(246,244,238,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    border:1px solid var(--line);border-radius:40px;padding:8px 14px 8px 12px;cursor:pointer;
    font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink);box-shadow:0 8px 28px rgba(0,0,0,.22);
    opacity:0;transition:opacity .6s}
  #mlook.show{opacity:1}
  #mlook .dot{width:9px;height:9px;border-radius:50%;background:#c4bfb2;transition:background .25s, box-shadow .25s}
  #mlook.on .dot{background:#b06a2c;box-shadow:0 0 0 4px rgba(176,106,44,.18)}

  /* ---------- Help button + glossary ---------- */
  #helpbtn{position:fixed;bottom:18px;right:152px;z-index:18;width:34px;height:34px;border-radius:50%;
    background:rgba(246,244,238,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    border:1px solid var(--line);cursor:pointer;color:var(--ink);font-size:14px;font-weight:600;
    display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(0,0,0,.22);
    opacity:0;transition:opacity .6s}
  #helpbtn.show{opacity:1}
  #glossary{position:fixed;inset:0;z-index:55;display:none;align-items:center;justify-content:center;
    background:rgba(10,10,12,.62);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);opacity:0;transition:opacity .3s}
  #glossary.open{display:flex}
  #glossary.in{opacity:1}
  #glossary .panel{background:var(--paper);color:var(--ink);border-radius:4px;padding:34px 40px 30px;max-width:430px;width:90%;
    box-shadow:0 40px 120px rgba(0,0,0,.5);transform:translateY(8px);transition:transform .35s cubic-bezier(.16,1,.3,1)}
  #glossary.in .panel{transform:none}
  #glossary h2{margin:0 0 4px;font-size:14px;letter-spacing:.22em;text-transform:uppercase;font-weight:600}
  #glossary .kick{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#8a857a;margin-bottom:22px}
  #glossary .row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-top:1px solid var(--line);font-size:12.5px;letter-spacing:.02em}
  #glossary .row:first-of-type{border-top:none}
  #glossary .row .lab{color:#46433c}
  #glossary kbd{display:inline-block;border:1px solid var(--line);border-radius:4px;padding:3px 9px;margin-left:4px;
    font-family:var(--font);font-size:11px;background:#fff;letter-spacing:.04em}
  #glossary .close{margin-top:24px;width:100%;border:1px solid var(--line);background:transparent;cursor:pointer;
    font-family:var(--font);padding:12px;border-radius:3px;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink);transition:background .2s}
  #glossary .close:hover{background:rgba(20,18,14,.06)}

  /* ---------- Guard greeting toast ---------- */
  #greet{position:fixed;top:84px;left:50%;z-index:19;pointer-events:none;
    transform:translateX(-50%) translateY(-8px);opacity:0;transition:opacity .5s, transform .5s;text-align:center}
  #greet.show{opacity:1;transform:translateX(-50%) translateY(0)}
  #greet .b{display:inline-block;background:rgba(18,17,14,.7);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    color:#f6f4ee;padding:12px 22px;border-radius:3px;border:1px solid rgba(255,255,255,.14)}
  #greet .b .n{font-size:9.5px;letter-spacing:.28em;text-transform:uppercase;color:rgba(246,244,238,.55);display:block;margin-bottom:5px}
  #greet .b .m{font-size:13.5px;letter-spacing:.02em}

  /* ---------- Controls hint ---------- */
  #hint{position:fixed;bottom:18px;left:20px;z-index:18;color:#fff;mix-blend-mode:difference;pointer-events:none;
    font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;opacity:0;transition:opacity .6s;line-height:1.9}
  #hint.show{opacity:.78}
  #hint kbd{font-family:var(--font);border:1px solid rgba(255,255,255,.5);border-radius:3px;padding:1px 6px;margin:0 1px;font-size:10px}
  /* ---- Mobile joysticks ---- */
  .jpad{position:fixed;bottom:38px;width:108px;height:108px;border-radius:50%;background:rgba(255,255,255,0.10);border:2px solid rgba(255,255,255,0.22);touch-action:none;display:none;z-index:200;pointer-events:auto;backdrop-filter:blur(4px)}
  .jpad.show{display:block}
  #jleft{left:28px}
  #jright{right:28px}
  .jpad-knob{position:absolute;width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,0.30);border:2px solid rgba(255,255,255,0.55);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;transition:background .1s}
  .jpad:active .jpad-knob{background:rgba(255,255,255,0.45)}
  .jpad-label{position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.45);pointer-events:none;white-space:nowrap}
  body.mobile-mode #mlook,body.mobile-mode #helpbtn{display:none}
  @media(max-height:600px){#brochure .card{max-height:92vh;overflow-y:auto}}

  /* ---------- Contextual prompt (sit on bench) ---------- */
  #sitprompt{position:fixed;left:50%;bottom:80px;transform:translateX(-50%) translateY(6px);z-index:19;pointer-events:none;
    background:rgba(18,17,14,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    color:#f6f4ee;padding:9px 18px;border-radius:40px;border:1px solid rgba(255,255,255,.14);
    font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;opacity:0;transition:opacity .25s, transform .25s}
  #sitprompt.show{opacity:1;transform:translateX(-50%) translateY(0)}
  #sitprompt kbd{font-family:var(--font);border:1px solid rgba(246,244,238,.5);border-radius:3px;padding:1px 7px;margin:0 2px;font-size:11px}

  /* ---------- Lightbox ---------- */
  #lightbox{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;
    background:rgba(8,8,10,.74);backdrop-filter:blur(22px) saturate(.9);-webkit-backdrop-filter:blur(22px) saturate(.9);opacity:0;transition:opacity .4s}
  #lightbox.open{display:flex}
  #lightbox.in{opacity:1}
  #lbframe{position:relative;max-width:min(92vw,1320px);transform:scale(.965);transition:transform .45s cubic-bezier(.16,1,.3,1);
    display:flex;flex-direction:row;align-items:flex-start;gap:24px}
  #lightbox.in #lbframe{transform:none}
  #lbphoto-wrap{position:relative;display:flex;flex-direction:column;align-items:center;flex-shrink:0}
  #lbimg{max-height:78vh;max-width:min(72vw,900px);background:#fff;padding:14px;border-radius:2px;
    box-shadow:0 40px 120px rgba(0,0,0,.6);display:block;
    -webkit-touch-callout:none;-webkit-user-select:none;user-select:none;
    pointer-events:none}
  #lbimg-shield{position:absolute;inset:0;z-index:2;cursor:default}
  #lbskel{position:absolute;inset:14px;background:linear-gradient(110deg,#e9e7e1 30%,#f3f1ec 50%,#e9e7e1 70%);
    background-size:200% 100%;animation:shimmer 1.3s infinite;border-radius:2px;pointer-events:none;opacity:1;transition:opacity .35s}
  @keyframes shimmer{to{background-position:-200% 0}}
  #lbcap{margin-top:16px;text-align:center;color:#f6f4ee}
  #lbcap .ti{font-size:15px;letter-spacing:.04em;font-weight:500}
  #lbcap .me{font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:rgba(246,244,238,.6);margin-top:7px}
  #lbclose{position:absolute;top:-14px;right:-14px;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.25);
    background:rgba(20,20,22,.7);color:#fff;cursor:pointer;font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center;
    transition:background .2s,transform .2s}
  #lbclose:hover{background:rgba(40,40,44,.95);transform:rotate(90deg)}
  #lbnav{position:absolute;top:50%;display:flex;width:calc(100% + 120px);left:-60px;justify-content:space-between;transform:translateY(-50%);pointer-events:none}
  #lbnav button{pointer-events:auto;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.2);
    background:rgba(20,20,22,.55);color:#fff;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:background .2s}
  #lbnav button:hover{background:rgba(40,40,44,.9)}
  #lbhint{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);color:rgba(246,244,238,.5);
    font-size:10px;letter-spacing:.2em;text-transform:uppercase;z-index:41;pointer-events:none}
  /* caption panel */
  #lbcaption-panel{width:260px;min-width:220px;flex-shrink:0;padding:28px 22px 28px 22px;
    background:rgba(245,241,232,0.06);border:1px solid rgba(246,244,238,0.13);
    border-radius:3px;color:#f6f4ee;align-self:stretch;display:none;overflow:hidden}
  #lbcaption-panel.visible{display:flex;flex-direction:column}
  #lbcp-id{font-size:10.5px;letter-spacing:.3em;text-transform:uppercase;color:rgba(246,244,238,.4);margin-bottom:10px}
  #lbcp-title{font-size:21px;font-weight:600;line-height:1.2;letter-spacing:-.01em;margin-bottom:6px;color:#f6f4ee}
  #lbcp-medium{font-size:12px;font-style:italic;color:rgba(246,244,238,.48);margin-bottom:18px;letter-spacing:.02em}
  #lbcp-divider{height:1px;background:rgba(246,244,238,.13);margin-bottom:18px;flex-shrink:0}
  #lbcp-body{font-size:13px;line-height:1.75;font-style:italic;color:rgba(246,244,238,.72);letter-spacing:.01em}
  @media(max-width:820px){
    #lbframe{flex-direction:column;align-items:center;max-width:min(92vw,600px)}
    #lbimg{max-width:100%}
    #lbcaption-panel{width:100%;align-self:auto}
  }

  /* ---------- Start / pause overlay ---------- */
  #gate{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(120% 120% at 50% 30%, #1b1a17 0%, #0b0b0c 70%);color:#f6f4ee;transition:opacity .6s}
  #gate.hide{opacity:0;pointer-events:none}
  #gate .card{text-align:center;max-width:560px;padding:0 28px;transform:translateY(0)}
  #gate .kick{font-size:11px;letter-spacing:.4em;text-transform:uppercase;color:rgba(246,244,238,.5);margin-bottom:22px}
  #gate h1{font-size:clamp(30px,6vw,58px);font-weight:300;letter-spacing:-.01em;margin:0;line-height:1.04}
  #gate h1 b{font-weight:600}
  #gate .sub{margin-top:18px;font-size:13.5px;line-height:1.7;color:rgba(246,244,238,.66);letter-spacing:.02em}
  #gate .keys{margin:30px auto 0;display:flex;gap:26px;justify-content:center;flex-wrap:wrap;color:rgba(246,244,238,.78)}
  #gate .keys div{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase}
  #gate .keys b{display:block;margin-bottom:8px;font-size:11px;letter-spacing:.06em}
  #gate kbd{display:inline-block;border:1px solid rgba(246,244,238,.35);border-radius:4px;padding:3px 8px;margin:2px;font-family:var(--font);font-size:11px}
  #enter{margin-top:40px;display:inline-flex;align-items:center;gap:12px;cursor:pointer;
    border:1px solid rgba(246,244,238,.4);background:transparent;color:#f6f4ee;font-family:var(--font);
    padding:15px 34px;border-radius:40px;font-size:12px;letter-spacing:.26em;text-transform:uppercase;
    transition:background .25s,border-color .25s,letter-spacing .25s}
  #enter:hover{background:#f6f4ee;color:#16140f;border-color:#f6f4ee;letter-spacing:.32em}
  #gate .load{margin-top:24px;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(246,244,238,.4);height:12px}

  #err{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:#0b0b0c;color:#f6f4ee;text-align:center;padding:30px}
  #err.show{display:flex}
  #err div{max-width:440px;font-size:14px;line-height:1.7;letter-spacing:.02em}

  @media (max-width:640px){
    #map{width:140px} #wings button{font-size:9px}
    #gate .keys{gap:16px}
  }

  /* ---------- Welcome brochure ---------- */
  #brochure{position:fixed;inset:0;z-index:65;display:none;align-items:center;justify-content:center;
    background:rgba(8,8,10,.78);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);opacity:0;transition:opacity .45s}
  #brochure.open{display:flex}
  #brochure.in{opacity:1}
  #brochure .card{background:var(--paper);color:var(--ink);border-radius:4px;max-width:520px;width:90%;
    box-shadow:0 40px 120px rgba(0,0,0,.55);transform:translateY(14px);transition:transform .5s cubic-bezier(.16,1,.3,1);
    overflow:hidden}
  #brochure.in .card{transform:none}
  #brochure .bh{background:#1b1a17;color:#f6f4ee;padding:28px 32px 24px;text-align:center}
  #brochure .bh .kick{font-size:9.5px;letter-spacing:.42em;text-transform:uppercase;opacity:.55;margin-bottom:14px}
  #brochure .bh h2{font-size:clamp(22px,5vw,32px);font-weight:300;letter-spacing:-.01em;margin:0 0 6px}
  #brochure .bh h2 b{font-weight:600}
  #brochure .bh .line{width:40px;height:1px;background:rgba(246,244,238,.3);margin:16px auto 0}
  #brochure .bb{padding:26px 32px 28px}
  #brochure .wings{display:flex;flex-direction:column;gap:0;margin-bottom:22px}
  #brochure .wing-row{display:flex;gap:14px;padding:11px 0;border-bottom:1px solid var(--line);align-items:flex-start}
  #brochure .wing-row:first-child{border-top:1px solid var(--line)}
  #brochure .wing-num{font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#8a857a;min-width:52px;padding-top:2px}
  #brochure .wing-txt .wn{font-size:13px;font-weight:600;letter-spacing:.04em;margin-bottom:3px}
  #brochure .wing-txt .wd{font-size:12px;color:#6a6660;line-height:1.55;letter-spacing:.01em}
  #brochure .note{font-size:12.5px;line-height:1.65;color:#46433c;letter-spacing:.01em;margin-bottom:24px;
    padding:14px 16px;background:rgba(20,18,14,.04);border-left:2px solid #b06a2c;border-radius:1px}
  #brochure .note cite{display:block;margin-top:10px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#8a857a;font-style:normal}
  #brochure .benter{width:100%;border:1px solid #1b1a17;background:#1b1a17;color:#f6f4ee;cursor:pointer;
    font-family:var(--font);padding:14px;border-radius:3px;font-size:10.5px;letter-spacing:.28em;text-transform:uppercase;transition:background .2s,color .2s}
  #brochure .benter:hover{background:transparent;color:#1b1a17}

  /* ---------- Contact form ---------- */
  #contactoverlay{position:fixed;inset:0;z-index:62;display:none;align-items:center;justify-content:center;
    background:rgba(8,8,10,.72);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);opacity:0;transition:opacity .35s}
  #contactoverlay.open{display:flex}
  #contactoverlay.in{opacity:1}
  #contactoverlay .cp{background:var(--paper);color:var(--ink);border-radius:4px;max-width:440px;width:90%;
    padding:32px 36px 28px;box-shadow:0 40px 120px rgba(0,0,0,.5);transform:translateY(10px);transition:transform .4s cubic-bezier(.16,1,.3,1)}
  #contactoverlay.in .cp{transform:none}
  #contactoverlay h3{margin:0 0 4px;font-size:13px;letter-spacing:.22em;text-transform:uppercase;font-weight:600}
  #contactoverlay .ck{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#8a857a;margin-bottom:22px}
  #contactoverlay label{display:block;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:#6a6660;margin-bottom:6px;margin-top:16px}
  #contactoverlay label:first-of-type{margin-top:0}
  #contactoverlay input,#contactoverlay textarea{width:100%;border:1px solid var(--line);background:#fff;
    font-family:var(--font);font-size:13px;padding:10px 12px;border-radius:2px;outline:none;color:var(--ink);
    transition:border-color .18s}
  #contactoverlay input:focus,#contactoverlay textarea:focus{border-color:#b06a2c}
  #contactoverlay textarea{height:100px;resize:vertical}
  #contactoverlay .cbtns{display:flex;gap:10px;margin-top:22px}
  #contactoverlay .csend{flex:1;border:1px solid #1b1a17;background:#1b1a17;color:#f6f4ee;cursor:pointer;
    font-family:var(--font);padding:12px;border-radius:3px;font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;transition:background .2s,color .2s}
  #contactoverlay .csend:hover{background:transparent;color:#1b1a17}
  #contactoverlay .csend:disabled{opacity:.5;cursor:default}
  #contactoverlay .ccancel{border:1px solid var(--line);background:transparent;cursor:pointer;
    font-family:var(--font);padding:12px 18px;border-radius:3px;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink);transition:background .2s}
  #contactoverlay .ccancel:hover{background:rgba(20,18,14,.06)}
  #contactoverlay .cmsg{font-size:11.5px;margin-top:12px;color:#3a7d52;letter-spacing:.02em;min-height:16px}
  #contactoverlay .cmsg.err{color:#c0392b}
  #contactoverlay .cctx{font-size:11.5px;background:rgba(176,106,44,.1);border-left:2px solid #b06a2c;
    padding:9px 12px;border-radius:1px;color:#46433c;letter-spacing:.01em;margin-bottom:4px;display:none}
  #contactoverlay .cctx.show{display:block}

  /* ---------- Lightbox contact button ---------- */
  #lbcontact{margin-top:14px;border:1px solid rgba(246,244,238,.3);background:transparent;color:rgba(246,244,238,.78);
    cursor:pointer;font-family:var(--font);padding:9px 22px;border-radius:40px;font-size:10.5px;letter-spacing:.2em;
    text-transform:uppercase;transition:background .2s,color .2s,border-color .2s}
  #lbcontact:hover{background:rgba(246,244,238,.14);border-color:rgba(246,244,238,.55);color:#f6f4ee}
</style>
</head>
<body>

<div id="app"></div>

<div id="crosshair"></div>
<div id="hoverlabel"><span class="t" id="hl-t">Frame</span><span class="sub" id="hl-s"></span></div>

<div id="hud">
  <div class="brand">Adam's Gallery</div>
  <div class="meta">Collection No. 01 / 2026 — Light &amp; People</div>
</div>

<div id="map">
  <div class="hd"><b>Floor Plan</b><span id="map-here">Entrance</span></div>
  <canvas id="mapcanvas" width="312" height="416"></canvas>
  <div id="wings">
    <button data-wing="street"><span>Street</span><span class="n">28</span></button>
    <button data-wing="portraits"><span>Portraits</span><span class="n">16</span></button>
    <button data-wing="places"><span>Places</span><span class="n">45</span></button>
  </div>
</div>

<div id="sound"><span class="dot"></span><span id="sound-txt">Ambience Off</span></div>
<div id="mlook"><span class="dot"></span><span id="mlook-txt">Free Look</span><span style="font-size:10px;opacity:.45;margin-left:6px">[F]</span></div>
<button id="helpbtn" aria-label="Controls">?</button>

<div id="greet"><div class="b"><span class="n">Gallery Attendant</span><span class="m">Welcome to Adam's Gallery — enjoy the collection.</span></div></div>

<div id="glossary">
  <div class="panel">
    <h2>Controls</h2>
    <div class="kick">Adam's Gallery — Collection 01</div>
    <div class="row"><span class="lab">Walk</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span></div>
    <div class="row"><span class="lab">Look around</span><span>Drag the mouse</span></div>
    <div class="row"><span class="lab">View a work</span><span>Click a photo</span></div>
    <div class="row"><span class="lab">Hands-free look</span><span>Click <kbd>Free Look</kbd> or press <kbd>F</kbd></span></div>
    <div class="row"><span class="lab">This panel</span><span><kbd>H</kbd></span></div>
    <div class="row"><span class="lab">Pause / close</span><span><kbd>Esc</kbd></span></div>
    <button class="close" id="glossclose">Close</button>
  </div>
</div>

<div id="sitprompt">Press <kbd>E</kbd> to sit</div>

<div id="hint">
  <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Walk &nbsp;·&nbsp; Mouse Look</div>
  <div>Look at a work &amp; <kbd>Click</kbd> to view &nbsp;·&nbsp; <kbd>Esc</kbd> Pause</div>
</div>

<div id="lightbox">
  <div id="lbframe">
    <div id="lbphoto-wrap">
      <button id="lbclose" aria-label="Close">✕</button>
      <div id="lbnav"><button id="lbprev" aria-label="Previous">‹</button><button id="lbnext" aria-label="Next">›</button></div>
      <div style="position:relative"><img id="lbimg" alt=""><div id="lbskel"></div><div id="lbimg-shield"></div></div>
      <div id="lbcap"><div class="ti" id="lbti">Untitled</div><div class="me" id="lbme"></div></div>
      <button id="lbcontact">Contact Adam about this photo</button>
    </div>
    <div id="lbcaption-panel">
      <div id="lbcp-id"></div>
      <div id="lbcp-title"></div>
      <div id="lbcp-medium"></div>
      <div id="lbcp-divider"></div>
      <div id="lbcp-body"></div>
    </div>
  </div>
  <div id="lbhint">Click anywhere or press Esc to return to the gallery</div>
</div>

<div id="gate">
  <div class="card">
    <div class="kick">Film Photography · 89 Works</div>
    <h1>Adam's Gallery<br><b>Collection 01</b></h1>
    <div class="sub">A first-person walkthrough of three wings —<br>Street, Portraits &amp; Places.</div>
    <div class="keys">
      <div><b>Move</b><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>
      <div><b>Look</b>Mouse</div>
      <div><b>View a work</b>Click</div>
    </div>
    <button id="enter">Enter the Gallery</button>
    <div class="load" id="load">Preparing the rooms…</div>
  </div>
</div>

<div id="err"><div>This experience needs WebGL and network access to load. Please open it in an up-to-date browser with hardware acceleration enabled.</div></div>

<!-- Welcome brochure — shown once on first entry -->
<div id="brochure">
  <div class="card">
    <div class="bh">
      <div class="kick">Film Photography · 2026</div>
      <h2>Adam's Gallery<br><b>Collection 01</b></h2>
      <div style="font-size:12px;opacity:.6;letter-spacing:.08em;margin-top:8px">Light &amp; People</div>
      <div class="line"></div>
    </div>
    <div class="bb">
      <div class="wings">
        <div class="wing-row">
          <span class="wing-num">Wing I</span>
          <div class="wing-txt"><div class="wn">Street</div><div class="wd">Twenty-eight fragments of city life — the accidental geometry of people moving through shared space.</div></div>
        </div>
        <div class="wing-row">
          <span class="wing-num">Wing II</span>
          <div class="wing-txt"><div class="wn">Portraits</div><div class="wd">Sixteen studies of stillness — faces caught between moments, each frame a quiet negotiation between subject and lens.</div></div>
        </div>
        <div class="wing-row">
          <span class="wing-num">Wing III</span>
          <div class="wing-txt"><div class="wn">Places</div><div class="wd">Forty-five photographs of the world standing still — light on walls, empty chairs, rooms that hold their breath.</div></div>
        </div>
      </div>
      <div class="note">
        "These photographs were taken all over, capturing various stages of life. I used a variety of film cameras, and for the most part, developed and scanned my own film. I had no plans - what you see is simply what the light allowed."
        <cite>— Adam</cite>
      </div>
      <button class="benter" id="brochure-enter">Step Inside the Gallery</button>
    </div>
  </div>
</div>

<!-- Contact form overlay -->
<div id="contactoverlay">
  <div class="cp">
    <h3>Write to Adam</h3>
    <div class="ck">Adam's Gallery · Collection 01 / 2026</div>
    <div class="cctx" id="cf-context"></div>
    <label for="cf-name">Your name</label>
    <input type="text" id="cf-name" placeholder="Your name" autocomplete="name">
    <label for="cf-email">Email address</label>
    <input type="email" id="cf-email" placeholder="you@example.com" autocomplete="email" required>
    <label for="cf-msg">Message</label>
    <textarea id="cf-msg" placeholder="What would you like to say?"></textarea>
    <div class="cbtns">
      <button class="csend" id="cf-send">Send Message</button>
      <button class="ccancel" id="cf-cancel">Cancel</button>
    </div>
    <div class="cmsg" id="cf-status"></div>
  </div>
</div>

<script src="gallery-data.js"></script>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>

<script type="module">
/* ============================================================================
   ADAM'S GALLERY — 3D Virtual Museum
   Pure WebGL (Three.js) + HTML/CSS chrome.

   ► IMAGE SOURCE / WIX CONNECTION
     Photos are placeholders (Lorem Picsum). To wire this to your Wix site,
     replace the two functions below — thumbURL() / fullURL() — to return the
     URL of each artwork from your Wix Media / data collection, keyed by
     art.id (e.g. "P01") or art.seed. Everything else stays the same.
   ============================================================================ */

let THREE, PointerLockControls;
try {
  THREE = await import('three');
  ({ PointerLockControls } = await import('three/addons/controls/PointerLockControls.js'));
} catch (e) {
  document.getElementById('err').classList.add('show');
  throw e;
}

/* ---------- IMAGE CONFIG — Wix media (static.wixstatic.com) ----------
   Photos come from the user's Wix site "Adam's Gallery" (Store catalog).
   Each art carries a Wix mediaId; we build resized, cross-origin-friendly URLs.
   To refresh the set, re-run the Wix connector to regenerate gallery-data.js. */
function wixURL(art, w, h, q){
  // Wix on-the-fly transform: fit within w×h, keep aspect, no crop.
  return `https://static.wixstatic.com/media/${art.mediaId}/v1/fit/w_${w},h_${h},q_${q||85},enc_auto/file.jpg`;
}
function thumbURL(art){
  // wall texture — sized to the frame's on-wall footprint
  const w = Math.min(1280, Math.round((art.fw||1.4)*620));
  const h = Math.min(1280, Math.round((art.fh||1.4)*620));
  return wixURL(art, w, h, 82);
}
function fullURL(art){ return wixURL(art, 2000, 2000, 90); }

/* ============================== SCENE SETUP ============================== */
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance', preserveDrawingBuffer:true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#eceae3');
scene.fog = new THREE.Fog('#eceae3', 46, 120);

const camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, 0.1, 400);
const EYE_Y = 1.68;
camera.position.set(0, EYE_Y, 44);

/* ============================== LIGHTING (bright MoMA daylight) ========== */
scene.add(new THREE.HemisphereLight('#ffffff', '#d9d6cc', 1.05));
scene.add(new THREE.AmbientLight('#ffffff', 0.34));

const sun = new THREE.DirectionalLight('#fff7ec', 0.92);
sun.position.set(26, 52, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 180;
const S = 70;
sun.shadow.camera.left=-S; sun.shadow.camera.right=S; sun.shadow.camera.top=S; sun.shadow.camera.bottom=-S;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.05;
sun.shadow.radius = 3;
scene.add(sun);
// soft fill from opposite side (no shadow)
const fill = new THREE.DirectionalLight('#eaf0ff', 0.28);
fill.position.set(-30, 30, -20);
scene.add(fill);

/* ============================== MATERIALS / GEOMETRY ===================== */
const HALF_W = 11;          // room half-width (x)
const WALL_H = 6.2;         // wall height
const WALL_T = 0.34;        // wall thickness
const Z_SOUTH = 48;         // back wall of entrance
const Z_NORTH = -24;        // far wall of Places

const wallMat = new THREE.MeshStandardMaterial({ color:'#f4f2ec', roughness:0.94, metalness:0 });
const partMat = new THREE.MeshStandardMaterial({ color:'#efece4', roughness:0.95, metalness:0 });
const trimMat = new THREE.MeshStandardMaterial({ color:'#e7e3d8', roughness:0.9 });

const colliders = []; // {x1,z1,x2,z2,half}
function addWall(x1,z1,x2,z2,{h=WALL_H,t=WALL_T,mat=wallMat,collide=true,y=h/2}={}){
  const dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz);
  const geo = new THREE.BoxGeometry(len, h, t);
  const m = new THREE.Mesh(geo, mat);
  m.position.set((x1+x2)/2, y, (z1+z2)/2);
  m.rotation.y = -Math.atan2(dz, dx);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  if(collide) colliders.push({x1,z1,x2,z2,half:t/2});
  return m;
}

/* ----- outer shell ----- */
addWall(-HALF_W, Z_SOUTH, -HALF_W, Z_NORTH); // west
addWall( HALF_W, Z_SOUTH,  HALF_W, Z_NORTH); // east
addWall(-HALF_W, Z_SOUTH,  HALF_W, Z_SOUTH); // south (entrance back)
addWall(-HALF_W, Z_NORTH,  HALF_W, Z_NORTH); // north (places back)

/* ----- cross walls with central 5m doorway ----- */
const DOOR = 2.6;
function crossWall(z){
  addWall(-HALF_W, z, -DOOR, z);
  addWall( DOOR,  z,  HALF_W, z);
  // lintel above doorway (visual only)
  const lin = new THREE.Mesh(new THREE.BoxGeometry(DOOR*2, WALL_H-3.4, WALL_T), trimMat);
  lin.position.set(0, 3.4+(WALL_H-3.4)/2, z); lin.castShadow=true; lin.receiveShadow=true; scene.add(lin);
}
[36, 18, 4].forEach(crossWall);

/* ----- floor ----- */
const floorTex = makeFloorTexture();
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(11, 36);
floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
floorTex.colorSpace = THREE.SRGBColorSpace;
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(HALF_W*2, Z_SOUTH-Z_NORTH),
  new THREE.MeshStandardMaterial({ map:floorTex, roughness:0.4, metalness:0.04, color:'#e9e4d8' })
);
floor.rotation.x = -Math.PI/2;
floor.position.set(0, 0, (Z_SOUTH+Z_NORTH)/2);
floor.receiveShadow = true;
scene.add(floor);

/* ----- ceiling + skylight panels ----- */
const ceil = new THREE.Mesh(
  new THREE.PlaneGeometry(HALF_W*2, Z_SOUTH-Z_NORTH),
  new THREE.MeshStandardMaterial({ color:'#f7f6f1', roughness:1 })
);
ceil.rotation.x = Math.PI/2;
ceil.position.set(0, WALL_H, (Z_SOUTH+Z_NORTH)/2);
scene.add(ceil);
// glowing skylight strips
const skyMat = new THREE.MeshStandardMaterial({ color:'#ffffff', emissive:'#fffaf0', emissiveIntensity:0.85, roughness:1 });
for(let z=Z_NORTH+4; z<Z_SOUTH; z+=8){
  for(const x of [-5.5, 5.5]){
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.7), skyMat);
    p.rotation.x = Math.PI/2; p.position.set(x, WALL_H-0.02, z);
    scene.add(p);
  }
}
// baseboard trims along side walls
for(const x of [-HALF_W+WALL_T/2, HALF_W-WALL_T/2]){
  const bb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, Z_SOUTH-Z_NORTH), trimMat);
  bb.position.set(x, 0.08, (Z_SOUTH+Z_NORTH)/2); scene.add(bb);
}

/* ============================== HALLS + PARTITIONS ======================= */
const WIX = window.GALLERY_WIX || { counts:{portraits:30,street:30,places:29}, photos:[] };
const PHOTOS_BY_WING = {
  portraits: WIX.photos.filter(p=>p.wingKey==='portraits'),
  street:    WIX.photos.filter(p=>p.wingKey==='street'),
  places:    WIX.photos.filter(p=>p.wingKey==='places'),
};
const HALLS = [
  { key:'street',    name:'Street',    prefix:'S', z0:18,  z1:36,  quota:WIX.counts.street,    teleport:33  },
  { key:'portraits', name:'Portraits', prefix:'P', z0:4,   z1:18,  quota:WIX.counts.portraits, teleport:11  },
  { key:'places',    name:'Places',    prefix:'L', z0:-24, z1:4,   quota:WIX.counts.places,    teleport:-10, northEnd:true },
];

// central partitions (double-sided hanging walls)
for(const h of HALLS){
  const pa = h.z0+4.5, pb = h.z1-4.5;
  addWall(0, pa, 0, pb, { h:4.4, t:0.4, mat:partMat });
}

/* ============================== ARTWORK PLACEMENT ======================== */
const EYE = 2.02;
const MARGIN = 1.25;
const SPACING_MAX = 2.7, SPACING_MIN = 1.95;  // per-wing adaptive hang density

function buildFaces(h){
  const faces = [];
  // side walls (full length)
  faces.push({ axis:'z', fixed:-HALF_W+WALL_T/2+0.02, nx:1,  nz:0, a:h.z0, b:h.z1 });
  faces.push({ axis:'z', fixed: HALF_W-WALL_T/2-0.02, nx:-1, nz:0, a:h.z0, b:h.z1 });
  // partition both faces
  const pa=h.z0+4.5, pb=h.z1-4.5;
  faces.push({ axis:'z', fixed:-0.22, nx:-1, nz:0, a:pa, b:pb });
  faces.push({ axis:'z', fixed: 0.22, nx:1,  nz:0, a:pa, b:pb });
  // south cross wall (z=z1) faces toward interior (-z), two segments
  faces.push({ axis:'x', fixed:h.z1-WALL_T/2-0.02, nx:0, nz:-1, a:-HALF_W, b:-DOOR });
  faces.push({ axis:'x', fixed:h.z1-WALL_T/2-0.02, nx:0, nz:-1, a:DOOR,    b:HALF_W });
  // north wall (z=z0) faces +z
  if(h.northEnd){
    faces.push({ axis:'x', fixed:h.z0+WALL_T/2+0.02, nx:0, nz:1, a:-HALF_W, b:HALF_W });
  } else {
    faces.push({ axis:'x', fixed:h.z0+WALL_T/2+0.02, nx:0, nz:1, a:-HALF_W, b:-DOOR });
    faces.push({ axis:'x', fixed:h.z0+WALL_T/2+0.02, nx:0, nz:1, a:DOOR,    b:HALF_W });
  }
  return faces;
}
const capAt = (f, sp) => Math.max(0, Math.floor((Math.abs(f.b-f.a)-2*MARGIN)/sp)+1);

// frame sizing from a photo's real aspect ratio (fit within a bounding box)
const FRAME_H_MAX = 1.6, FRAME_W_MAX = 1.78;
function frameSize(w, h){
  const a = (w && h) ? w/h : 1.3;
  let fh = Math.min(FRAME_H_MAX, FRAME_W_MAX/a);
  let fw = fh*a;
  if(fw > FRAME_W_MAX){ fw = FRAME_W_MAX; fh = fw/a; }
  return { fw, fh };
}

const artworks = [];      // {group, photo, art, basePos, hovered}
const photoMeshes = [];   // for raycaster

const matBorderMat = new THREE.MeshStandardMaterial({ color:'#fbfaf6', roughness:0.85 });
const frameEdgeMat = new THREE.MeshStandardMaterial({ color:'#26241f', roughness:0.6, metalness:0.1 });
const placeholderMat = () => new THREE.MeshStandardMaterial({ color:'#d8d4ca', roughness:0.9 });

const CAPTIONS = {
  'N04':{b:'The frame ruptures at its midpoint, gravity betraying the viewer\'s ability to orient — what reads as ground turns out to be sky, what reads as solid becomes its own inversion. The film grain dissolves the boundary between reflection and fact so the city refuses to confirm which version of itself is real. This is a quiet psychological trap: the moment you settle on an orientation, the other half reasserts its competing claim.'},
  'N19':{b:'An aggressive chromatic intervention converts the warmth of use and occupation into cold institutional distance, except for a single amber form that resists the blue field\'s totalizing logic. The shallow focus evacuates the background into abstraction, stranding that warm node in a space that no longer belongs to anyone. The tension sits between the democratic legibility of the scene and the color\'s insistence on rendering it alien.'},
  'M25':{b:'The aging surface is itself the argument — oxidized metal, blistered lacquer, the ghost of a former paint job bleeding through — a material autobiography laid across a single body. The warm film stock amplifies rather than softens the decay, giving corrosion a physical weight equal to intact form. The chromatic rupture between pale and saturated panels within a single continuous surface mirrors a broader logic of partial survival.'},
  'M07':{b:'Isolated against a near-featureless gray field, a typographic sign loses all functional meaning and becomes pure geometry, forcing the viewer to reckon with the symbol as object before language. The fine film grain and a faint seam bisecting the background introduce just enough tactility to prevent the image from collapsing into graphic design. The radical negative space weaponizes emptiness — the form floats in void, cut free from any ledger or system that would stabilize it.'},
  '076':{b:'The ascending geometry compresses spatial sense, converging walls and stacking planes reducing depth to a forced climb with no guarantee of arrival. Warm, overexposed light at the upper register reads not as sun but as pressure — something that draws without revealing what it holds. The film\'s slight softness fuses organic growth and stone into a single resistant mass, so the passage feels less traversable than inevitable.'},
  '012':{b:'Bilateral symmetry constructs a false promise of arrival — the vanishing point recedes rather than resolves, the hazy blown-out terminus functioning as a perceptual drain that consumes forward motion. The warm film cast converts what is structurally an ordered civic corridor into something closer to interior experience. The viewer is propelled forward without closing the distance, held in a perpetual approach that the image refuses to complete.'},
  '082':{b:'The disembodied hand entering the left edge breaks the scene\'s hermetic seal, collapsing the distance between observer and observed into something that implicates the viewer rather than positions them. Nocturnal warmth from the shop window layers two spatial registers — interior and exterior — without resolving which is the container for the other. The film grain thickens the shadows to the point of solidity, giving darkness a material presence equal to the lit figure.'},
  '072':{b:'The image redistributes visual mass so radically — atmosphere claiming three-quarters of the frame — that density reads as fragility and the built environment is rendered peripheral to its own portrait. Film grain blooms across the gradient sky, making atmospheric transition tactile rather than optical, a surface you could touch. At this compression, the city becomes a geological stratum rather than a human construction, and the viewer\'s sense of scale quietly inverts.'},
  'M32':{b:'A bicycle in the foreground functions as both compositional barrier and social threshold — the viewer is architecturally excluded from the gathering it partially obscures, made aware of their own position as outside. The cool-shifted film palette presses the warm human scene into something slightly removed, a register of past tense despite its evident present-ness. The graffiti wall competes for spatial authority at equal scale, so the social interaction exists simultaneously as subject and as background to someone else\'s prior claim.'},
  'M31':{b:'Three visual registers — the figure absorbed in private ritual, the monumental graphic field behind, and the cat moving autonomously at the right edge — operate in genuine independence rather than hierarchy, each refusing to serve the others. The flat midday light denies depth, pressing everything into a single plane where each element competes equally for primacy. The viewer\'s eye cycles without finding a fixed entry point, kept in motion by the image\'s refusal to subordinate any of its parts to a center.'},
  '055':{b:'The heavy film grain collapses the tunnel\'s depth into a single oppressive plane, compressing space rather than receding through it, so the viewer is denied the psychological relief of distance. Acid-green light punctures the dark at the far end — not as illumination but as something biological, a wrongness that the surrounding blackness cannot metabolize. The digital timestamp overhead introduces an almost absurd exactitude against the atmospheric decay, suspending the image between transit and abandonment.'},
  'M20':{b:'The expected medium is gone, inverting the spatial logic entirely so that what was built to disappear becomes the only surface — pale, cracked, overlit. A shadow cuts diagonally with the precision of a graphic decision, dividing the frame into latency and damage. The chrome curves still perform their intended elegance, which makes them the most unsettling element: function persisting after purpose has evacuated.'},
  'N03':{b:'Shot from below on medium format, the perspective is stretched past comfort — the repeating stair texture dissolves before reaching the white void at the top, so the viewer cannot determine scale or terminus. Parallel glass panels multiply the recession at the periphery, stacking reflections that destabilize any single fixed viewpoint. Movement is structurally implied everywhere; arrival is withheld entirely, and the blank ceiling above reads not as destination but as erasure.'},
  '057':{b:'The saturated orange field functions less as color than as pressure — it compresses everything within the frame into a single thermal plane, reducing figure and debris alike to incidental marks against an overwhelming surface. Film grain adds a granular heat that keeps the image from settling into documentation, holding it closer to sensation than reportage. The glass pane\'s layered reflections introduce a depth that the flat red repels, leaving the viewer caught between surface and recession with no resolution offered.'},
  'M13':{b:'The frame\'s most deliberate act is its omission — identity severed, the body reduced to posture alone, which reads here as collapse without diagnosis or context. Coarse concrete grain and a flat, textureless grey light refuse any softening, pressing the physical weight into the surface rather than against it. The precision of the crop is what finally unnerves: this is a formal decision about withholding, not a documentary accident of proximity.'},
  'N05':{b:'The vast red field to the left carries so much chromatic pressure that the bronze face reads as displaced rather than composed — not placed but pushed, occupying the right edge as a function of force rather than design. The patina absorbs and reflects the surrounding red simultaneously, collapsing the material boundary between surface and object until the eye cannot settle on either. The ring suspended below the gaze is the image\'s one unresolved element: an open form that introduces demand without specifying what it wants.'},
  'M02':{b:'The photograph turns looking back on itself — the seated figure attending to large painted surfaces forces the viewer into the position of the observed rather than the observer. The coffered grid overhead competes with the painted geometry below in an equal contest of pattern and weight, so the architecture refuses to recede and the art refuses to dominate. Scale becomes reversible: the monumental diminishes the human only if you decide that\'s what\'s happening.'},
  '011':{b:'The grain is thick enough to erode specificity — what would be legible as ordinary urban transaction becomes archaeological, as though the image is already documenting something receding. Stillness and transit share the same plane without hierarchy: those anchored absorb time at a different rate than those moving through, and the image holds both registers in genuine tension without resolving the difference. The street corner is the formal fulcrum — everything moves around or against it, but the corner itself remains structurally indifferent.'},
  'M11':{b:'The tree trunk bisects the frame with the bluntness of an editorial cut, forcing the oversaturated lettering behind it into peripheral vision and making legibility a structural problem rather than an incidental one. Film grain and soft, diffuse light flatten depth so that organic form, painted surface, and open air occupy the same visual register — depth is asserted and then denied within the same image. The solitary figure moving rightward is the only clear directional statement the work makes, and the fact that they are moving away is its only concession to resolution.'},
  'N22':{b:'Two figures on opposite trajectories — one descending into the camera\'s gaze, one ascending away from it — occupy parallel tracks converging toward a light source neither will reach at the same moment, giving the image a quiet structural grief. The raw concrete overhead softens the architecture\'s institutional authority into something more geological, which complicates the mechanical symmetry of metal and glass below. The descending figure\'s returned gaze breaks the image\'s drift toward abstraction; it refuses the passivity the composition was constructing around it.'},
  'M10':{b:'The film\'s warm chemical cast — that sulfurous yellowing — makes the eye work through a scrim of time before settling on the figures gathered behind. A diagonal intrusion in the foreground functions as a social barrier, rendering the act of looking itself a form of trespass rather than casual witness. The overlit architecture above pulls the composition apart from the sheltered warmth below, refusing to let either register dominate.'},
  'M04':{b:'The bottom half of the frame holds its inversion so calmly — forms hanging from a tiled ceiling, poles growing downward — that the viewer must actively reconstruct which register is reflected before they can name what they\'re seeing. What should be indexical here becomes an instrument of genuine spatial doubt, the photograph denying its own claim on the real. The warm monochrome seals the seam between the two orientations, making the image\'s duplicity feel structural rather than accidental.'},
  'N01':{b:'The frame has been surgically closed — no sky, no periphery, no exit — leaving the viewer locked inside a self-replicating geometry with no scale anchor to rescue them. A single raking light source drags shadow consistently across every cell, but the accumulated regularity tips from pattern into something closer to pressure. What began as architecture becomes a system, and the system feels both indifferent and total.'},
  '001':{b:'The painted marks on the surrounding surfaces create a density of observation that exceeds any single witness — the viewer is watched by imagery as much as by persons. The living figure\'s bowed posture compresses inward against this visual accumulation, enacting a private disappearance inside a public space already saturated with faces. Silver gelatin grain flattens the material distinction between painted surface and skin, collapsing the distance between the drawn and the animate.'},
  'M01':{b:'The camera refuses to offer a stable horizon — every plane is a diagonal, compressing spatial logic until the image approaches pure abstraction. The figure caught mid-distance provides the only human scale, but rather than orienting the viewer it emphasizes how thoroughly the architecture has swallowed proportion. Light falls flat and even, stripping shadow depth so that the surfaces read as cut paper rather than built space.'},
  '066':{b:'The upward angle subjects the viewer to structural vertigo — each flight presents its railing as a new barrier rather than a guide, multiplying the sensation of height without delivering arrival. Film grain and slight overexposure bleed the concrete edges into the sky, softening the boundary between built form and atmosphere so the structure reads as provisional, mid-collapse. The rust marks at the joints are the only concession to time.'},
  'M22':{b:'Three planes of reality compete in a single glance — the solid figure, its glass reflection, and a displaced apparition in the adjacent window — and the camera refuses to adjudicate between them. The sharp foreground and soft background establish a focal hierarchy the eye continuously overrides, drawn to the receding figure even as optics insist on the present. This is a picture about the unreliability of presence as a category.'},
  'N21':{b:'The human figure, reduced to a silhouette the width of a thumb, is framed by volumes so large they read as geological rather than constructed. The whiteness of the surfaces absorbs tonal contrast and eliminates texture, producing a cleanliness so extreme it registers as unreality — a condition the figure\'s dark shadow intensifies by contrast. The viewer cannot determine whether they are looking down into a void or up toward a ceiling, and the image withholds resolution.'},
  'N13':{b:'Light grazes only the surface of the face, holding the interior in darkness — this is less a portrait than a threshold between the illuminated and the withheld. Two soft points of light in the background function not as environmental context but as punctuation, marking the depth of the dark the subject is half-submerged in. The downcast eyes deny the exchange the composition otherwise demands, and that refusal is the work\'s entire psychological weight.'},
  'N15':{b:'The face occupies the right third of the frame and presses against an unseen support — the body behind barely legible as dark mass — so the figure reads as both held and hemmed in simultaneously. The left half of the image is pure tonal gradient, a void the gaze extends into rather than filling, displacing the viewer\'s expectation of centering. In the grain and the soft dissolution of the background, particularity begins to collapse into archetype.'},
  'N23':{b:'The shallow focal plane does something peculiar here — the face is rendered with near-clinical resolution while everything behind it dissolves into a warm, indeterminate haze, collapsing the sense of place without eliminating it. The gaze, fractionally offset from the lens, creates a social gap that proximity cannot close; you are invited into intimate distance that the subject declines to ratify. Color works against sentimentality rather than toward it — the cool lavender and plaid register as formal rather than warm, pulling the work away from document toward portrait.'},
  'N16':{b:'The tonal compression of monochrome has stripped this face down to topography — the deep furrows read less as skin and more as geological strata, a surface worked by time with the same indifference as erosion. The massive void of the left half — flat, featureless white — functions as a spatial pressure, as if the blank is actively displacing the figure toward the edge of its own frame. With eyes cast down or closed, the figure withdraws perceptual access entirely, inverting the portrait\'s basic contract.'},
  'N24':{b:'The directness of this gaze is confrontational in a way that unsettles scale — the child occupies the viewer\'s field with an authority that refuses the usual condescension of the photographed-child genre. The chalky residue across the forehead reads as trace evidence of a world already pressing its matter onto this face, while the garish signifiers on the headwear introduce a semiotic noise that the unblinking expression refuses to resolve. Something about that stillness does not match the chaos of the visual surface — the disconnect is the work.'},
  'N17':{b:'The thick-framed lenses function as a second optical system within the frame, creating a subtle recursion — eyes behind glass behind glass, a viewer confronting someone equipped with the apparatus of looking back. The bilateral symmetry of the composition is almost unsettling in its formality, as if the subject is presenting not a person but a position. The out-of-focus architectural background implies a public social space while telling you nothing about it, a deliberate withholding that shifts all weight onto the face.'},
  'N14':{b:'Light falls in a hard diagonal from above, carving the upper face into deep shadow while leaving the lower half and the hand in near-overexposure — the hierarchy of legibility is inverted, the eyes inaccessible, the hand and mouth dominant. The dense calligraphy behind reads simultaneously as decoration and as language, a semiotic field the figure has turned away from, absorbed in something smaller and more immediate. This double withdrawal — from the viewer\'s gaze, from the text behind — creates a spatial isolation that the tight framing intensifies rather than relieves.'},
  'N11':{b:'The laugh is so physiologically extreme that the monochrome\'s flattening of affect produces a perceptual wobble — the expression sits at the threshold between joy and something rawer, and the gray tonal register refuses to settle the question. The horizontal banding of the spent field behind creates a grinding textural contrast against the burst of the face, making the emotional intensity read as stranger than it would in isolation. The figure is small relative to the expanse of emptied ground and flat sky; the laughter expands to fill it, but the scale relationship never tips into comfort.'},
  'N10':{b:'By refusing the face — the single piece of information portraiture conventionally delivers — this image throws its full weight onto silhouette and gesture: a dense dark mass against a dissolving world of circular light. The extreme bokeh dematerializes everything the figure faces into pure luminous abstraction, so that what lies ahead is literally unknowable within the frame. The small ember held aloft at the fingertips becomes the only sharp-edged anchor in a composition otherwise given over to dissolution.'},
  'M09':{b:'The architectural partition bisects the frame vertically and organizes the entire spatial logic, confining the figure to a narrow zone between two kinds of blankness — the art-laden wall behind and the white void beside. The film grain is coarse and unmistakable, situating the image in an analog temporal register that the gallery\'s clinical modernism actively resists. The head-forward weight of the seated posture reads not as contemplation but as waiting, and the ambiguity of what exactly is being waited for — rest, recognition, exit — is precisely what the image refuses to resolve.'},
  'M03':{b:'The rough plank surface behind occupies more than half the frame, pressing the figure into the right edge with the weight of raw material, its grain visible and insistent even in deep shadow. The smile is knowing and slightly withheld — warmth the face chooses to share rather than perform — and the distinction between offered and performed expression is the exact tension the composition holds. Displaced to the margin, nearly cut from the frame, the figure appears simultaneously present and in the process of departing.'},
  'M05':{b:'The amber cast is so total and uniform that it eliminates depth cues, flattening the scene into something closer to a monochrome in a single hue — near and far rendered equally in the same warm glaze, space made ambiguous. The direct gaze and the raised fist under the chin create a posture of deliberate self-composition — this is someone aware of being looked at, and the awareness is not uncomfortable. The partially resolved figure behind introduces a doubling that troubles the singularity of the encounter without explaining it.'},
  'N07':{b:'Raking light from above slices the face into a sliver of presence before the right side is surrendered entirely to darkness — not shadow as drama but as literal erasure of identity. The heavy silver grain refuses documentary; it reads more like disintegration, the emulsion eating the subject inward from the edges. What remains is a partial record, and the viewer must resist the instinct to fill in what has been deliberately withheld.'},
  'M19':{b:'The near-closed eyes and the slight downward tilt deflect rather than return the gaze, creating an asymmetry of attention — we see everything, the subject registers nothing. Behind her the landscape collapses into warm chromatic noise, spatial recession flattened into a single atmospheric plane that makes proximity and distance indistinguishable. The film grain grounds what would otherwise feel suspended, making the moment feel less caught than endured.'},
  'N06':{b:'The face in full contraction — eyes sealed, every crease deepened — renders the subject simultaneously maximally present and entirely unreachable, offering the viewer complete access with zero entry. The wire grid behind operates as a structural counterpoint to the organic topography of the skin, and the monochrome strips any warmth from the exchange, leaving only form and its formal opposite. It is a portrait of a closed door mistaken for an open one.'},
  'M06':{b:'The frame is divided by a physical threshold into two zones that refuse to communicate — one figure withdrawn inward with eyes shut, the other turned entirely away. The repeating cylindrical forms lining the top band echo across both halves of the split, mocking the idea that both figures share the same world. Two people occupying the same space is not the same thing as two people being present to each other, and the photograph understands this distinction precisely.'},
  'M30':{b:'The stems\' downward arc and the upward-facing blooms produce a slow interior argument — aspiration against entropy — that the dense, almost audible silver grain makes feel urgent rather than elegiac. Shallow focus strips the surrounding room of specificity, placing the vessel in no identifiable hour, no particular domestic context, a stasis that is not peace. The work refuses nostalgia even as it deploys every material condition — analog grain, organic form, diffuse backlight — that nostalgia usually commandeers.'},
  '020':{b:'The light pressed low at the horizon destabilizes the image\'s vertical axis, merging dark earth and warm atmospheric glow into an unresolvable tonal register where ground and depth become indistinguishable. The migratory formation crossing the upper frame introduces the only legible geometry in an otherwise diffuse field, functioning less as subject than as evidence of directed movement through an undirected space. Film dust and scratches layer two timescales simultaneously — the moment of exposure and the decades the negative has been alive.'},
  'M29':{b:'The aggressive graphic architecture behind the seated figure doesn\'t frame him — it threatens to absorb him, reducing the human to a subordinate detail inside a composition that predates and will outlast his presence. His face is refused to the viewer (head bowed, brim down, hand raised), so the image offers two illegible surfaces in parallel: a face and a wall, both closed. The high-contrast rendering converts what was almost certainly a vivid painted surface into a vocabulary of mourning gray, applying grief to an environment built for assertion.'},
  'M28':{b:'The wall\'s scarred, pocked surface — each block weathered into its own particular form — is the event, and the frame offers no competing interest to relieve the viewer. The sealed aperture left of center is the image\'s lone gesture toward interior depth, and it refuses: louvers shut, nothing beyond accessible, the architecture performing pure surface. Pushed slightly off-axis, the composition insists there is a decision behind the framing and withholds what that decision was.'},
  'M26':{b:'The composition inverts landscape hierarchy entirely — the pale near-empty field dominates, and the forms anchoring the earth are pushed so far into the lower margin they read as almost excluded from the frame. The film\'s chromatic drift renders those forms in warm pink against a cool, neutralized sky, an opposition that refuses to resolve into atmosphere or depth. Scale is entirely absent; the sky presses down like a wall the forms are pinned against rather than open air they reach into.'},
  '051':{b:'Two adjacent faces — one absorbing light, one radiating it — share a surround that refuses to acknowledge their difference, and the bilateral geometry sits close enough to symmetry that every deviation registers as argument rather than variation. The warm film rendering works to reconcile what the chromatic contrast insists on keeping apart, and the sequential numbering imposes narrative continuity on what is visually a rupture. The viewer\'s eye is forced into oscillation, reading them simultaneously as a pair and as irreconcilable opposites.'},
  '018':{b:'The luminous column rising from below and the biological geometry of the flock above split the viewer\'s attention between ascent and descent simultaneously, with neither vector resolving. Film grain dissolves the boundary between atmosphere and solid matter until the entire frame feels suspended mid-state. The silhouettes at the base anchor nothing — they\'re afterthoughts that refuse to ground what happens above them.'},
  '005':{b:'Two ascending planes compete without resolution — one near, one receding — and the single blazing rectangle at the back is pure destination denied, intercepted by the railing\'s diagonal before the eye can arrive. Grain-heavy shadows press the walls inward, collapsing the spatial distance the composition promises. The architecture performs circulation without delivering it.'},
  '006':{b:'The diagonal slash renders depth illegible — what reads as a recession into space may equally be a flat plane tipped at an angle, and the image offers no ground to arbitrate between the two readings. Grain so dense and uniform that surface and void become tonally equivalent, stripping architectural space of hierarchy. The single hardware element at the top insists the frame has an orientation; the diagonal ignores it.'},
  '043':{b:'By exiling the structure to the frame\'s corner and removing its base, the work strips the form of function and reveals only geometry — a curved lattice that reads as architecture before it reads as anything else. Film grain imprints nostalgia onto a blue the blue actively resists, producing a temporal dissonance between medium and subject. The radical decentering forces the eye across empty space before it arrives at form, reversing the hierarchy of figure and ground.'},
  '042':{b:'The composition divides between a reflective surface that operates as a second sky and a dense, warm-toned settlement clinging to the margins, creating a spatial wobble where the viewer cannot determine whether they are looking out or looking down. The film\'s chromatic drift measures distance in temperature rather than meters — amber architecture, violet water — so the bay reads as both near and abstract. Scale refuses to fix: the scattered white forms on the water hover between intimacy and insignificance depending on where the eye lands.'},
  '059':{b:'The collective frontal orientation — uncoordinated yet unanimous — collapses the distinction between observed and observer, placing the viewer on the wrong end of the gaze without warning. The film\'s warm shift bleaches the sky to near-white while pushing foliage toward near-black, compressing tonal range so the light reads as both abundant and suffocating. The single vertical pole at the right edge punctuates what might otherwise resolve as pastoral with the infrastructure of something else entirely.'},
  '025':{b:'The blank screen exerts a pressure that exceeds its emptiness — it functions not as absence but as mass, a surface that has withheld something the warm seating below was arranged to receive. The green exit sign is the only active light source and the only legible instruction in the frame. At the edges, grain thickens until seat forms dematerialize, as if the room is already in the process of forgetting itself.'},
  '024':{b:'The low angle collapses the figure against a sky bleached to void, making the gesture of shading the eyes — a search for horizon — structurally futile from the start. Fragmentary text intrudes from the left with its incomplete message, trapping the viewer in a reading that never resolves. The rigging lines pull toward the upper right as if the entire image is listing, giving the figure\'s braced posture an urgency the blank sky neither confirms nor denies.'},
  '002':{b:'The suspended spray occupies middle space as neither liquid nor air, defeating the horizon\'s attempt to legislate a boundary between elements. Heavy grain creates tonal equivalence between the explosion and the overcast sky above it, so the violence reads simultaneously as intrusion and dissolution. The hard geometric darkness of the foreground makes the chaos above feel borrowed — a force that doesn\'t belong to the same physical register as what it strikes.'},
  '017':{b:'The formation\'s near-symmetry is just off enough to register as stress rather than equilibrium, and the grain degrades that geometric precision until individual marks become uncertain — birds, or emulsion artifacts. The glowing pressure in the upper right seems to push the formation leftward, so the spatial logic of the frame works actively against the movement it depicts. The purple-to-warm thermal gradient reads less as color than as a medium the formation is passing through.'},
  '008':{b:'The horizon is all but extinguished — a thin strip of earth clings to the bottom as the sky claims the rest without apology. Film grain and a warm cast on the clouds tip the light into the register of memory rather than observation, and the incidental structure marooned in the lower right only deepens the sense that the ground is actively leaving.'},
  'N09':{b:'Scale is the first casualty: shallow focus and a close focal plane transform domestic fabric into terrain — ridgelines, troughs, slow drift. The cool light refuses warmth to material that is by definition warm, and two competing textures — tight cellular weave against pooled linen — hold the frame in a state of unresolved physical tension.'},
  '034':{b:'The composition is structurally wrong by design — subjects hard-right, the left two-thirds almost entirely void, the frame\'s weight distributed in a way that refuses pictorial comfort. The warm light grounds the scene in the late-day register of the real, but the crumbling surface below reads as terminus, and the two figures angled slightly apart refuse to consolidate their gaze into anything the viewer can follow.'},
  'N18':{b:'The image is a spatial trap: the subject occupies only a narrow corridor in the middle third, glimpsed through a gap between two blurred foreground planes — one warm-fleshed, one white — that reduce the viewer to enforced, partial sight. The amber light at the far stair\'s landing pulls the eye toward a destination the frame structurally denies access to.'},
  '053':{b:'Proximity is weaponized: one form consumes the left half of the frame while the second retreats low and right, collapsing the viewer\'s ability to hold the two as spatial equivalents. The tessellated steel surfaces carry a fractured, near-digital texture that refuses the organic, and film grain laid over machined geometry creates a material contradiction the eye cannot settle — scale implied, scale withheld.'},
  'N12':{b:'The subject is reduced to a single luminous fragment compressed between two crushing masses of dark, rough-sawn timber, monochrome rendering the wood\'s grain as geological in weight. Darkness behind the gap refuses to disclose what lies beyond, and the viewer is positioned as witness to something simultaneously intimate and structurally constrained — the frame performing confinement rather than just depicting it.'},
  '052':{b:'The figure is too small for the space and seems to accept that: seated low, off-center, absorbed into open ground while an overcast sky layers above and a Gothic spire punctuates the treeline at the exact horizontal midpoint. Desaturated film greens and the fallen, arrested bicycle introduce a quiet instability into what would otherwise read as mere stillness.'},
  'N08':{b:'The square format creates strict bilateral tension — the bench anchors both sides with equal pressure, and the figure, back fully turned, is the only asymmetric element the composition offers. The vivid horizontal stripe is the frame\'s sole sharp chromatic insistence, pulling the eye to a body that withholds a face entirely; medium format film renders the mid-ground foliage with a tactile density that makes the background feel more present than the subject in front of it.'},
  '050':{b:'The image runs in sedimentary bands — clustered vessels in the foreground, exposed tidal flat, town silhouette, treeline, sky — each layer a different register of time and motion, all of them arrested. Film stock reads the raking warm light with a slight oversaturation that tips the scene toward unreality, the sand glowing too orange, the shadows too hard for a scene that is otherwise meant to pass as ordinary.'},
  'N20':{b:'The architectural form is denied its identity — cropped to its curved upper edge alone, it becomes pure white geometry dividing the frame from a dynamic backlit sky. Shot against hard light, the structure nearly dematerializes at its border, and without a single scale reference the viewer cannot fix whether what they are looking at is monumental or incidental.'},
  '049':{b:'The foreground mass absorbs nearly all light, reducing the primary subjects to pure silhouette while the space behind them — technically the background — becomes the composition\'s only source of luminance. This inversion of figure-ground logic forces the viewer to read presence as absence and vice versa. The warm film grain weaves through both zones, making the radical tonal split feel earned rather than theatrical.'},
  'M34':{b:'A lens artifact — circular, rust-orange, unmistakably mechanical — floats over the canopy like a second sun that the film itself introduced into the world. The right-weighted composition creates a gravitational lean the frame cannot resolve; the tree presses outward as much as upward. What might have been documentary becomes an argument about the camera\'s complicity in what it records.'},
  '028':{b:'Shot from just above the waterline, the image dissolves its own spatial logic: the foreground is simultaneously inside and outside the water, and a single shadow cast by an absent figure is the only vertical anchor in a composition otherwise ruled by horizontal shimmer. The film\'s warm, overexposed palette flattens recession, making near and far feel equally pressurized. Warning text in two languages intrudes on the visual calm without irony — depth is the point.'},
  '084':{b:'The sky occupies roughly two-thirds of the frame, rendered in clean, unglamorous blue that the film grain quietly destabilizes at the edges. A single form is pressed to the lower-left periphery — not centered, not symmetrical — creating a spatial pull that the void refuses to resolve. The viewer keeps returning to that lone form not out of interest in it, but because the emptiness surrounding it provides no other foothold.'},
  'M24':{b:'The camera looks straight up, stripping the scene of any horizon and leaving only vertical columns arrayed at competing depths. Film renders the sky as near-white pale blue — barely a sky at all, more like a bleached surface behind the forms. Without a visible ground plane, the viewer loses the body\'s primary spatial reference; the composition becomes a diagram of height rather than a depiction of place.'},
  'M23':{b:'The hill\'s slope runs diagonally across the frame in two distinct tonal bands — a green base surrendering to dry tan at the crest — and the sharpness of that transition makes the landform read as constructed rather than natural. Scale is entirely withheld: the mound could be intimate or monumental, and the framing refuses to decide. The tree at left is an anchor but an unreliable one, soft against the crisp geometry of the hill behind it.'},
  'N02':{b:'Gravity is suspended entirely: the black planes cut across each other at competing diagonals, and the sole point of white light at the top center provides no orientation, only a destination the eye reaches and then retreats from. The tonal compression — dense black against a single bright wedge at the lower right — makes the space feel less like an interior and more like a theoretical proposition about enclosure. Medium-format grain lends the shadows a fine, breathing texture that keeps them from reading as pure abstraction.'},
  'M21':{b:'The galactic core runs vertically down the frame like a river, inverting every expectation the viewer brings to astronomical imagery — we are trained to find the arc, and instead we fall. Heavy sensor noise throughout unifies the sky\'s distant light and the horizon\'s earthbound glow into a single grainy fabric, dissolving the boundary that normally separates the cosmic from the terrestrial. The warm light pollution at the base pulls the image toward the intimate while the scale above it insists on the opposite.'},
  'M18':{b:'Shallow depth of field fractures the space into competing planes: the saturated primary colors at upper-left are pin-sharp, the middle ground blurs into an impressionistic smear, and the foreground stools return to clarity. Film grain amplifies the tungsten warmth, making the space feel simultaneously preserved and slightly wrong — a vernacular interior made strange by the camera\'s selective attention. Two spatial lines pull against each other without resolution, and photographs within this photograph multiply the layers of representation until the room\'s reality becomes uncertain.'},
  '022':{b:'The entire foreground collapses into a near-featureless dark mass, and the sky above it compresses into a narrow band where the only drama unfolds — a burning core bisected by a vertical silhouette, hemmed above by deepening blue. Film grain saturates both the dark ground and the glowing sky, giving the image a tactile, almost smeared quality that pushes it away from document and toward memory. An infrastructure lattice of wires and poles maps a human geometry onto the sky that complicates any reading of the work as pastoral or elegiac.'},
  'M17':{b:'The diagonal procession of amber filaments doesn\'t illuminate so much as stage — the space performs warmth rather than harboring it. Framed images nested within the photograph pull the eye toward a quiet recursion that destabilizes any claim to documenting a single place. Film grain smooths the seam between the real and the reproduced, leaving the viewer uncertain whether they are inside a room or inside a representation of one.'},
  'M16':{b:'The organic form reads against a field of repeating modules whose color refuses to resolve — gradient or deterioration, dye or damage. The mechanical regularity of the textile ground renders the natural subject strange, its familiar geometry suddenly legible as pattern rather than growth. Scale becomes genuinely indeterminate: no stable spatial relationship between the two surfaces survives scrutiny.'},
  'M15':{b:'Two surfaces meet at a diagonal that refuses to explain itself — no ground, no horizon, no scale reference, nothing to orient the body. The structured weave against the loose, wrinkled plane sets up a dialectic between intention and entropy, but the tight framing ensures neither wins. The film grain operates as a third texture, collapsing the material distance between the two and making the image read as topographic rather than domestic.'},
  '023':{b:'The figure is grammatically subordinate — dark punctuation at the edge of a composition that belongs entirely to the kinetic surge ahead. The film stock\'s faded palette erodes the horizon, merging sky and sea into a single atmospheric register and with it any clear boundary between the human and what faces them. Temporality suspends: the wave neither arriving nor receding, the posture neither preparing nor reacting.'},
  'M08':{b:'The wire cuts the frame diagonally with the authority of a drafting instrument, and the lamp burns in full daylight — an anachronism that makes the pale sky feel slightly wrong. The birds clustered at the fulcrum introduce biological weight to what would otherwise read as pure infrastructure drawing. The radical compression of the upward angle evacuates depth, turning a vertical urban condition into a surface problem.'},
  '062':{b:'The grain is thick enough to read as memory rather than documentation — not how light fell in the room, but how it persists afterward. Flowers in varying states of opening collapse linear time into a single exposure, making the image feel like duration rather than moment. The domestic blur behind asserts intimacy while withholding legibility, trapping the viewer in a relationship to a space they cannot fully enter.'},
  '014':{b:'Saturated yellow holds the frame against surrounding entropy — a single chromatic anchor in a field of institutional grey and accumulated disorder. Diagonal light enters from outside and performs the room\'s chaos as chiaroscuro, briefly aestheticizing infrastructure that had no expectation of being seen this way. The consumer artifact cradled in the machine\'s arms conflates two economies of scale in a way that neither explains nor resolves.'},
  'M27':{b:'The film border bleeds into the left edge, reminding you this is an index not a window — a distinction the crashing foam immediately complicates by dissolving into the sky\'s tonal register. Kinetic energy frozen at peak dispersion turns the water indeterminate, a substance the eye reads as solid, liquid, and atmospheric simultaneously. Three horizontal bands — rock, spray, cloud — impose structural firmness that the content actively refuses to honor.'},
  'M12':{b:'The architectural surface fills three-quarters of the frame with near-featureless grey, and the diagonal lines bisect it with geometric certainty — the figures caught between them register as incidental rather than central. Tonal compression flattens depth until spatial recession becomes indistinguishable from surface, stranding two bodies in an environment with no measurable distance. They move in opposite directions without acknowledgment, and the work\'s entire emotional weight arrives through that silence.'}
};

for(const h of HALLS){
  const faces = buildFaces(h);
  const pool = (PHOTOS_BY_WING[h.key] || []).slice();  // real photos for this wing, in order
  const N = pool.length;
  if(!N) continue;

  // Build a continuous perimeter from all wall faces, then place photos at EVEN
  // arc-spacing around it — so frames never clump in corners or leave big gaps.
  const segs = faces.map(f=>{
    const len = Math.abs(f.b-f.a);
    return { f, usable: Math.max(0, len - 2*MARGIN) };
  }).filter(s=>s.usable > 0.2);
  const totalUsable = segs.reduce((s,x)=>s+x.usable, 0) || 1;

  for(let i=0;i<N;i++){
    const arc = (i + 0.5) * totalUsable / N;   // centered, uniform spacing
    let acc=0, seg=segs[segs.length-1], local=segs[segs.length-1].usable;
    for(const s of segs){ if(arc <= acc + s.usable){ seg=s; local=arc-acc; break; } acc+=s.usable; }
    const f = seg.f;
    const dir = Math.sign(f.b - f.a) || 1;
    const t = f.a + dir*(MARGIN + local);
    let x,z;
    if(f.axis==='z'){ x=f.fixed; z=t; } else { x=t; z=f.fixed; }
    placeArt({ x, z, nx:f.nx, nz:f.nz, hall:h, photo: pool[i] });
  }
}

function placeArt({x,z,nx,nz,hall,photo}){
  const group = new THREE.Group();
  group.position.set(x, EYE, z);
  // orient so +z of group points along (nx,nz)
  group.rotation.y = Math.atan2(nx, nz);

  const { fw, fh } = frameSize(photo.w, photo.h);
  // black float-frame backplate (sits flat against wall, has real depth)
  const edge = new THREE.Mesh(new THREE.BoxGeometry(fw+0.22, fh+0.22, 0.05), frameEdgeMat);
  edge.position.z = 0.025; edge.castShadow=true; edge.receiveShadow=true; group.add(edge);
  // white matte border, proud of the frame
  const mat = new THREE.Mesh(new THREE.BoxGeometry(fw+0.14, fh+0.14, 0.04), matBorderMat);
  mat.position.z = 0.058; mat.castShadow=true; mat.receiveShadow=true; group.add(mat);
  // photo, in front of the matte
  const photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), placeholderMat());
  photoMesh.position.z = 0.082; group.add(photoMesh);

  scene.add(group);
  const art = {
    id: photo.id, mediaId: photo.mediaId, name: photo.name,
    fw, fh, w:photo.w, h:photo.h,
    wing:hall.name, wingKey:hall.key,
    title: photo.name
  };
  const entry = { group, photo:photoMesh, edge, mat, art, base:1, hovered:false, loaded:false, loading:false, pos:new THREE.Vector3(x,EYE,z) };
  photoMesh.userData.entry = entry;
  artworks.push(entry);
  photoMeshes.push(photoMesh);

  // museum caption plaque — bottom-right of frame
  const cap = CAPTIONS[photo.id];
  if(cap){
    const CW=1024, pad=28;
    // measure body text wrapping with a temp canvas
    const tmpCv=document.createElement('canvas'); tmpCv.width=CW; tmpCv.height=64;
    const tmpC=tmpCv.getContext('2d');
    tmpC.font='italic 21px "Helvetica Neue",Helvetica,Arial,sans-serif';
    const bodyWords=cap.b.split(' '); const bodyLines=[]; let bLine='';
    for(const w of bodyWords){
      const t2=bLine?bLine+' '+w:w;
      if(tmpC.measureText(t2).width>CW-pad*2&&bLine){bodyLines.push(bLine);bLine=w;}else bLine=t2;
    }
    if(bLine)bodyLines.push(bLine);
    const CH=150+bodyLines.length*30+pad;
    const cv2=document.createElement('canvas'); cv2.width=CW; cv2.height=CH;
    const c2=cv2.getContext('2d');
    c2.fillStyle='rgba(245,241,232,0.93)';
    c2.fillRect(0,0,CW,CH);
    c2.strokeStyle='rgba(140,118,82,0.30)';
    c2.lineWidth=2; c2.strokeRect(1,1,CW-2,CH-2);
    c2.textAlign='left'; c2.textBaseline='alphabetic';
    // artist attribution
    c2.fillStyle='rgba(42,34,24,0.38)';
    c2.font='500 20px "Helvetica Neue",Helvetica,Arial,sans-serif';
    c2.fillText('Adam Disatnik', pad, 36);
    // title: "Frame N04"
    c2.fillStyle='#2a2218';
    c2.font='600 40px "Helvetica Neue",Helvetica,Arial,sans-serif';
    c2.fillText('Frame '+photo.id, pad, 86);
    // medium
    c2.fillStyle='rgba(42,34,24,0.52)';
    c2.font='italic 22px "Helvetica Neue",Helvetica,Arial,sans-serif';
    c2.fillText('35mm Film', pad, 116);
    // separator
    c2.strokeStyle='rgba(42,34,24,0.13)';
    c2.lineWidth=1;
    c2.beginPath(); c2.moveTo(pad,132); c2.lineTo(CW-pad,132); c2.stroke();
    // body lines
    c2.fillStyle='rgba(42,34,24,0.68)';
    c2.font='italic 21px "Helvetica Neue",Helvetica,Arial,sans-serif';
    let ty=150;
    for(const bl of bodyLines){ c2.fillText(bl, pad, ty); ty+=30; }
    const capTex=new THREE.CanvasTexture(cv2);
    capTex.colorSpace=THREE.SRGBColorSpace;
    const capW=0.40, capH=capW*CH/CW;
    const capMesh=new THREE.Mesh(
      new THREE.PlaneGeometry(capW,capH),
      new THREE.MeshBasicMaterial({map:capTex,transparent:true,side:THREE.DoubleSide})
    );
    capMesh.position.set(
      fw/2+0.07-capW/2,
      -(fh+0.14)/2-0.028-capH/2,
      0.09
    );
    group.add(capMesh);
  }
}

/* ============================== 3D TEXT (title + wing labels) ============ */
function makeTextPlane(lines, {width, color='#1b1813', sub=[], font=600, sl=0.07, ch=1024, size=null, subSize=62}){
  const canvas = document.createElement('canvas');
  const W=2048, H=ch; canvas.width=W; canvas.height=H;
  const c = canvas.getContext('2d');
  c.clearRect(0,0,W,H);
  c.textAlign='center'; c.textBaseline='middle';
  c.fillStyle=color;
  let y = sub.length ? H*0.40 : H*0.5;
  const big = size || (lines.length>1 ? 168 : 210);
  lines.forEach((ln,i)=>{
    c.font = `${font} ${big}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
    c.save();
    // letter-spacing emulation
    drawSpaced(c, ln, W/2, y + i*big*1.08, sl*big);
    c.restore();
  });
  if(sub.length){
    c.fillStyle = color;
    c.globalAlpha = 0.62;
    let sy = H*0.66;
    sub.forEach((ln,i)=>{
      c.font = `400 ${subSize}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
      drawSpaced(c, ln.toUpperCase(), W/2, sy+i*(subSize*1.5), subSize*0.16);
    });
    c.globalAlpha=1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const aspect = W/H;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width/aspect),
    new THREE.MeshBasicMaterial({ map:tex, transparent:true })
  );
  return mesh;
}
function drawSpaced(c, text, cx, cy, ls){
  const widths = [...text].map(ch=>c.measureText(ch).width+ls);
  const total = widths.reduce((a,b)=>a+b,0)-ls;
  let x = cx - total/2;
  for(let i=0;i<text.length;i++){ c.fillText(text[i], x+widths[i]/2-ls/2, cy); x+=widths[i]; }
}

// Entrance banner — on the lobby wall (z=36), ABOVE the doorway so it isn't cut by the opening
const title = makeTextPlane(
  ['ADAM\u2019S GALLERY'],
  { width:10.5, size:150, subSize:52, ch:500, sl:0.03,
    sub:['Collection 01  ·  89 Works  ·  Light & People','W A S D — walk    ·    Mouse — look'] }
);
title.position.set(0, 4.8, 36+WALL_T/2+0.06);
title.rotation.y = 0; // front faces +z (toward the spawn / lobby)
scene.add(title);

// Big room-name labels — double-sided, moved to y=4.65 (above all photo frames)
// so they never overlap artwork. Visible from both entrance and inside each wing.
const wingLabelDefs = [
  { name:'STREET',    z:36 },
  { name:'PORTRAITS', z:18 },
  { name:'PLACES',    z:4  },
];
wingLabelDefs.forEach(d=>{
  // south-facing (visible from entrance / lobby side)
  const labS = makeTextPlane([d.name], { width:5.0, sl:0.12 });
  labS.position.set(-7.5, 4.65, d.z+WALL_T/2+0.08);
  labS.rotation.y = 0;
  scene.add(labS);
  // north-facing (visible from inside the wing)
  const labN = makeTextPlane([d.name], { width:5.0, sl:0.12 });
  labN.position.set(-7.5, 4.65, d.z-WALL_T/2-0.08);
  labN.rotation.y = Math.PI;
  scene.add(labN);
});

/* ---- Directory wayfinding plaques — hung at x=0 (doorway centre, no photos
        hang there) so they can never overlap frames. Double-sided.           ---- */
function makeSign(rows, {width=2.6}={}){
  const W=1024, H=384;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const c=cv.getContext('2d');
  // subtle parchment backing
  c.fillStyle='rgba(245,238,220,0.82)';
  const rx=28; c.beginPath(); c.moveTo(rx,0); c.lineTo(W-rx,0); c.quadraticCurveTo(W,0,W,rx);
  c.lineTo(W,H-rx); c.quadraticCurveTo(W,H,W-rx,H); c.lineTo(rx,H); c.quadraticCurveTo(0,H,0,H-rx);
  c.lineTo(0,rx); c.quadraticCurveTo(0,0,rx,0); c.closePath(); c.fill();
  c.strokeStyle='rgba(140,118,82,0.45)'; c.lineWidth=6; c.stroke();
  c.textAlign='center'; c.textBaseline='middle'; c.fillStyle='#2a2218';
  rows.forEach((r,i)=>{
    const y = rows.length===1 ? H*0.5 : H*(0.32 + i*0.38);
    c.font = `500 56px "Helvetica Neue",Helvetica,Arial,sans-serif`;
    const arr = r.dir==='left' ? '\u25c4' : '\u25ba'; // solid triangle arrows
    const s   = r.dir==='left' ? `${arr}  ${r.t}` : `${r.t}  ${arr}`;
    c.fillText(s, W/2, y);
  });
  const tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width, width*H/W),
    new THREE.MeshBasicMaterial({map:tex, transparent:true, side:THREE.DoubleSide}));
  return mesh;
}
const dirSignDefs = [
  { z:36, rows:[{t:'ENTRANCE',dir:'left'}, {t:'STREET',dir:'right'}]    },
  { z:18, rows:[{t:'STREET',dir:'left'},   {t:'PORTRAITS',dir:'right'}] },
  { z:4,  rows:[{t:'PORTRAITS',dir:'left'},{t:'PLACES',dir:'right'}]    },
];
dirSignDefs.forEach(d=>{
  const s = makeSign(d.rows, {width:2.6});
  s.position.set(0, 2.3, d.z);
  s.rotation.y = 0;
  scene.add(s);
});

/* ============================== BENCHES ================================= */
const SEAT_Y = 0.5;
function makeBench(x, z){
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const woodMat = new THREE.MeshStandardMaterial({ color:'#7a6446', roughness:0.55, metalness:0.04 });
  const legMat  = new THREE.MeshStandardMaterial({ color:'#33291f', roughness:0.7 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 1.7), woodMat);
  seat.position.y = SEAT_Y-0.045; seat.castShadow=true; seat.receiveShadow=true; g.add(seat);
  for(const lx of [-0.19, 0.19]) for(const lz of [-0.74, 0.74]){
    const lg = new THREE.Mesh(new THREE.BoxGeometry(0.08, SEAT_Y-0.09, 0.08), legMat);
    lg.position.set(lx, (SEAT_Y-0.09)/2, lz); lg.castShadow=true; g.add(lg);
  }
  scene.add(g);
  colliders.push({ x1:x, z1:z-0.85, x2:x, z2:z+0.85, half:0.34 });
  return g;
}
// benches in the aisles, facing a side wall (so a sitter looks at the photos)
const BENCHES = [
  // Street wing  z0=18 z1=36
  { x: 4.2, z: 30, wingKey:'street',    faceYaw:  Math.PI/2 },
  { x:-4.2, z: 24, wingKey:'street',    faceYaw: -Math.PI/2 },
  // Portraits wing  z0=4 z1=18
  { x: 4.2, z: 14, wingKey:'portraits', faceYaw:  Math.PI/2 },
  { x:-4.2, z:  8, wingKey:'portraits', faceYaw: -Math.PI/2 },
  // Places wing  z0=-24 z1=4
  { x: 4.2, z: -5, wingKey:'places',    faceYaw:  Math.PI/2 },
  { x:-4.2, z:-14, wingKey:'places',    faceYaw: -Math.PI/2 },
];
const benches = BENCHES.map(b=>{ makeBench(b.x, b.z); return { ...b, occupied:false }; });

/* ============================== CONTACT FRAME (entrance) ================ */
// Clickable "Write to Adam" plaque near the entrance on the east wall
const clickables = [];   // non-photo interactable meshes

(function makeContactFrame(){
  const g = new THREE.Group();
  // east wall, entrance — immediately visible on entry
  g.position.set(HALF_W-WALL_T/2-0.04, 1.85, 43.0);
  g.rotation.y = -Math.PI/2;

  // === GOLD FRAME ===
  const goldMat = new THREE.MeshBasicMaterial({ color:'#c9a84c' });
  // outer frame box
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.76, 0.055), goldMat);
  frame.castShadow = true; g.add(frame);
  // inner recess to simulate moulding depth — slightly inset dark plate
  const matMat = new THREE.MeshBasicMaterial({ color:'#0f0e0c' });
  const mat = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.58, 0.02), matMat);
  mat.position.z = 0.025; g.add(mat);

  // === CANVAS ARTWORK ===
  const cw=1024, ch=512;
  const cv=document.createElement('canvas'); cv.width=cw; cv.height=ch;
  const cx=cv.getContext('2d');

  // rich dark background with very slight warm tint
  cx.fillStyle='#100f0d'; cx.fillRect(0,0,cw,ch);

  // outer gold rule border
  cx.strokeStyle='rgba(201,168,76,0.55)'; cx.lineWidth=3;
  cx.strokeRect(38, 38, cw-76, ch-76);

  // inner gold rule border (tighter)
  cx.strokeStyle='rgba(201,168,76,0.28)'; cx.lineWidth=1.5;
  cx.strokeRect(56, 56, cw-112, ch-112);

  // corner diamond ornaments at outer border corners
  cx.fillStyle='rgba(201,168,76,0.75)';
  function diamond(x, y, r){
    cx.beginPath();
    cx.moveTo(x, y-r); cx.lineTo(x+r, y); cx.lineTo(x, y+r); cx.lineTo(x-r, y);
    cx.closePath(); cx.fill();
  }
  const cr = 9;
  diamond(38, 38, cr); diamond(cw-38, 38, cr);
  diamond(38, ch-38, cr); diamond(cw-38, ch-38, cr);

  // small accent diamonds at inner corners
  cx.fillStyle='rgba(201,168,76,0.40)';
  const ir = 5;
  diamond(56, 56, ir); diamond(cw-56, 56, ir);
  diamond(56, ch-56, ir); diamond(cw-56, ch-56, ir);

  // gallery byline — spaced small caps
  cx.fillStyle='rgba(201,168,76,0.65)';
  cx.font='300 26px "Helvetica Neue",Helvetica,Arial,sans-serif';
  cx.textAlign='center'; cx.textBaseline='middle';
  cx.letterSpacing='0.3em';
  cx.fillText('A D A M ’ S   G A L L E R Y', cw/2, ch*0.24);

  // thin gold rule under byline
  const rx=cw*0.28, rw=cw*0.44;
  cx.strokeStyle='rgba(201,168,76,0.5)'; cx.lineWidth=1;
  cx.beginPath(); cx.moveTo(rx, ch*0.33); cx.lineTo(rx+rw, ch*0.33); cx.stroke();
  // small centre diamond on rule
  cx.fillStyle='rgba(201,168,76,0.6)';
  diamond(cw/2, ch*0.33, 5);

  // main title
  cx.fillStyle='#f0ebe0';
  cx.font='600 80px "Helvetica Neue",Helvetica,Arial,sans-serif';
  cx.fillText('CONTACT ADAM', cw/2, ch*0.57);

  // lower rule above subtitle
  cx.strokeStyle='rgba(201,168,76,0.5)'; cx.lineWidth=1;
  cx.beginPath(); cx.moveTo(rx, ch*0.70); cx.lineTo(rx+rw, ch*0.70); cx.stroke();
  cx.fillStyle='rgba(201,168,76,0.6)'; diamond(cw/2, ch*0.70, 5);

  // subtitle — elegant instruction
  cx.fillStyle='rgba(240,235,224,0.42)';
  cx.font='300 32px "Helvetica Neue",Helvetica,Arial,sans-serif';
  cx.fillText('W R I T E   A   M E S S A G E', cw/2, ch*0.82);

  const tex=new THREE.CanvasTexture(cv);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const label=new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.54),
    new THREE.MeshBasicMaterial({map:tex}));
  label.position.z=0.038; g.add(label);

  scene.add(g);
  label.userData = { type:'contact', label:'Contact Adam' };
  clickables.push(label);
})();

/* ============================== PEOPLE (visitors + guard) ================ */
function makePerson({coat='#4a4742', pants='#2a2824', head='#bba98f', hair='#2e2820', shoes='#1c1a16', accent=null}={}){
  const g = new THREE.Group();
  const coatMat  = new THREE.MeshStandardMaterial({ color:coat,  roughness:0.82, metalness:0 });
  const pantsMat = new THREE.MeshStandardMaterial({ color:pants, roughness:0.88, metalness:0 });
  const headMat  = new THREE.MeshStandardMaterial({ color:head,  roughness:0.76, metalness:0 });
  const hairMat  = new THREE.MeshStandardMaterial({ color:hair,  roughness:0.90, metalness:0 });
  const shoesMat = new THREE.MeshStandardMaterial({ color:shoes, roughness:0.55, metalness:0.08 });

  const hipY = 0.95, legLen = 0.88;

  // legs — upper (pants) + shoe at bottom
  function leg(sx){
    const pivot = new THREE.Group(); pivot.position.set(sx, hipY, 0);
    // upper leg
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.062,legLen*0.54,12), pantsMat);
    upper.position.y = -legLen*0.27; upper.castShadow=true; pivot.add(upper);
    // lower leg
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.050,legLen*0.44,12), pantsMat);
    lower.position.y = -legLen*0.72; lower.castShadow=true; pivot.add(lower);
    // shoe
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.065, 0.22), shoesMat);
    shoe.position.set(0, -legLen+0.024, 0.04); shoe.castShadow=true; pivot.add(shoe);
    g.add(pivot); return pivot;
  }
  const legL = leg(0.095), legR = leg(-0.095);

  // torso — shirt/coat with slight taper
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.195,0.245,0.62,16), coatMat);
  torso.position.y = hipY+0.28; torso.castShadow=true; g.add(torso);
  // collar detail (slightly lighter)
  const collarCol = new THREE.Color(coat).lerp(new THREE.Color('#ffffff'), 0.12);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.100,0.100,0.07,14),
    new THREE.MeshStandardMaterial({color:collarCol, roughness:0.7}));
  collar.position.y = hipY+0.59; g.add(collar);
  // shoulders cap — slight ellipsoid
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.245,16,12), coatMat);
  sh.scale.set(1,0.46,0.80); sh.position.y = hipY+0.58; sh.castShadow=true; g.add(sh);

  // arms (pivot at shoulder) — upper arm + forearm two-part
  const shY = hipY+0.54, armLen=0.60;
  function arm(sx){
    const pivot=new THREE.Group(); pivot.position.set(sx, shY, 0);
    // upper arm
    const ua=new THREE.Mesh(new THREE.CylinderGeometry(0.056,0.048,armLen*0.52,12), coatMat);
    ua.position.y=-armLen*0.26; ua.castShadow=true; pivot.add(ua);
    // forearm
    const fa=new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.038,armLen*0.44,12), headMat);
    fa.position.y=-armLen*0.74; fa.castShadow=true; pivot.add(fa);
    // hand — sphere
    const hand=new THREE.Mesh(new THREE.SphereGeometry(0.048,10,8), headMat);
    hand.scale.set(0.9,0.75,1.1); hand.position.y=-armLen-0.02; hand.castShadow=true; pivot.add(hand);
    g.add(pivot); return pivot;
  }
  const armL=arm(0.265), armR=arm(-0.265);

  // neck
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.068,0.096,12), headMat);
  neck.position.y=hipY+0.638; g.add(neck);

  // head — slightly elongated sphere
  const headM=new THREE.Mesh(new THREE.SphereGeometry(0.132,20,16), headMat);
  headM.scale.set(0.97,1.08,0.96);
  headM.position.y=hipY+0.806; headM.castShadow=true; g.add(headM);

  // ears — flattened spheres
  for(const ex of [0.132, -0.132]){
    const ear=new THREE.Mesh(new THREE.SphereGeometry(0.038,8,6), headMat);
    ear.scale.set(0.38,0.62,0.55); ear.position.set(ex, hipY+0.80, 0); g.add(ear);
  }

  // hair cap — upper hemisphere
  const hairCap=new THREE.Mesh(new THREE.SphereGeometry(0.140,16,8,0,Math.PI*2,0,Math.PI*0.56), hairMat);
  hairCap.position.y=hipY+0.820; hairCap.castShadow=true; g.add(hairCap);

  // eyes — tiny dark spheres
  const eyeCol=new THREE.Color(hair).lerp(new THREE.Color('#060606'),0.7);
  const eyeMat=new THREE.MeshStandardMaterial({color:eyeCol, roughness:0.4});
  for(const ex of [0.048,-0.048]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.018,6,5), eyeMat);
    eye.position.set(ex, hipY+0.832, 0.118); g.add(eye);
  }

  if(accent){ // guard cap
    const capMat=new THREE.MeshStandardMaterial({color:accent,roughness:0.55});
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.148,0.148,0.085,18), capMat);
    cap.position.y=hipY+0.938; cap.castShadow=true; g.add(cap);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.192,0.192,0.018,18), capMat);
    brim.position.set(0,hipY+0.902,0.045); g.add(brim);
  }
  scene.add(g);
  return { group:g, legL, legR, armL, armR, baseY:0, targetYaw:0, phase:Math.random()*6 };
}
function animateGait(p, amp){
  const s=Math.sin(p.phase);
  p.legL.rotation.x =  s*0.55*amp;
  p.legR.rotation.x = -s*0.55*amp;
  p.armL.rotation.x = -s*0.40*amp;
  p.armR.rotation.x =  s*0.40*amp;
  p.group.position.y = amp>0 ? Math.abs(Math.sin(p.phase))*0.028 : p.baseY;
}
function setSeatedPose(p){
  // lower the body so the hips rest on the bench seat, thighs forward
  p.group.position.y = SEAT_Y - 0.92;
  p.legL.rotation.x = 1.45; p.legR.rotation.x = 1.45;
  p.armL.rotation.x = 0.35; p.armR.rotation.x = 0.35;
}
function lerpAngle(a,b,t){ let d=((b-a+Math.PI)%(Math.PI*2))-Math.PI; if(d<-Math.PI)d+=Math.PI*2; return a+d*t; }

// visitors patrol within a single wing (never cross the doorway walls at z=36/18/4)
const VISITORS = [
  // Street wing  z0=18 z1=36
  { x: 6.2,  zA:20, zB:34, coat:'#4a4742', pants:'#2e2b28', head:'#c2b29a', hair:'#1e1810', shoes:'#181614', speed:1.05, wingKey:'street' },
  { x:-6.2,  zA:34, zB:20, coat:'#6b6256', pants:'#343026', head:'#b59c82', hair:'#8a5c28', shoes:'#1c1814', speed:0.95, wingKey:'street' },
  // paired couple: Street
  { x: 5.6,  zA:22, zB:33, coat:'#c8bfb0', pants:'#3a3630', head:'#d4a882', hair:'#4a3420', shoes:'#2a2420', speed:0.88, wingKey:'street', pairedIdx:3 },
  { x: 6.4,  zA:22, zB:33, coat:'#3c5248', pants:'#282e2a', head:'#c0a888', hair:'#2a2018', shoes:'#1e1c18', speed:0.88, wingKey:'street', pairedIdx:2 },
  // Portraits wing  z0=4 z1=18
  { x: 6.0,  zA:6,  zB:16, coat:'#2c2a26', pants:'#1e1c18', head:'#a88e72', hair:'#0e0c0a', shoes:'#141210', speed:1.15, wingKey:'portraits' },
  { x:-6.0,  zA:16, zB:6,  coat:'#8a8175', pants:'#4a4640', head:'#cab08e', hair:'#c8a258', shoes:'#2a2620', speed:0.9,  wingKey:'portraits' },
  // Places wing  z0=-24 z1=4
  { x: 6.2,  zA:-21,zB:-4, coat:'#46504e', pants:'#282e2c', head:'#9c8268', hair:'#1a1614', shoes:'#1c1e1c', speed:1.0,  wingKey:'places' },
  { x:-5.8,  zA:-4, zB:-21,coat:'#5a4f46', pants:'#302a26', head:'#bba98f', hair:'#3c3028', shoes:'#1e1a16', speed:1.1,  wingKey:'places' },
];
const visitors = VISITORS.map((c,i)=>{
  const person = makePerson({ coat:c.coat, pants:c.pants||'#2a2824', head:c.head, hair:c.hair||'#1e1810', shoes:c.shoes||'#1c1a16' });
  const ptA={x:c.x,z:c.zA}, ptB={x:c.x,z:c.zB};
  person.group.position.set(c.x, 0, c.zA);
  return { person, x:c.x, ptA, ptB, target:ptB, state:'walk', timer:0, speed:c.speed, wingKey:c.wingKey, bench:null, artTarget:null, pairedIdx:c.pairedIdx??null };
});

// guard at the entrance, just inside the doorway, off to one side
const guard = makePerson({ coat:'#23262b', pants:'#1c1e22', head:'#c2b29a', hair:'#1a1612', shoes:'#0e1012', accent:'#1a1c20' });
guard.group.position.set(-5.2, 0, 41.5);
guard.targetYaw = 0.6;

const NPC_R = 0.38; // NPC collision radius
function resolveNPC(px, pz){
  for(let it=0;it<4;it++){
    for(const s of colliders){
      const [cx,cz]=closestOnSeg(px,pz,s);
      let dx=px-cx, dz=pz-cz; let d=Math.hypot(dx,dz);
      const min=NPC_R+s.half;
      if(d<min){ if(d<1e-4){dx=1;dz=0;d=1;} px=cx+dx/d*min; pz=cz+dz/d*min; }
    }
  }
  px=Math.max(-HALF_W+NPC_R+0.05, Math.min(HALF_W-NPC_R-0.05, px));
  pz=Math.max(Z_NORTH+NPC_R+0.05, Math.min(Z_SOUTH-NPC_R-0.05, pz));
  return [px,pz];
}

function moveToward(p, tx, tz, sp, dt){
  const px=p.group.position.x, pz=p.group.position.z;
  const dx=tx-px, dz=tz-pz, d=Math.hypot(dx,dz);
  if(d<0.22) return true;
  const ux=dx/d, uz=dz/d;
  p._yaw = Math.atan2(ux,uz);
  let nx=px+ux*sp*dt, nz=pz+uz*sp*dt;
  // don't walk through the player: pause politely if too close
  const o=controls.getObject().position;
  if(Math.hypot(nx-o.x, nz-o.z) < 0.95) return false;
  // apply wall/bench collision
  [nx,nz] = resolveNPC(nx, nz);
  p.group.position.x=nx; p.group.position.z=nz;
  p.phase += dt*sp*3.4;
  return false;
}

// wing z-bounds for clamping NPC z so they never cross a doorway
const WING_Z = {
  portraits: { min:12.6, max:35.4 },
  street:    { min:-11.4, max:11.4 },
  places:    { min:-35.4, max:-12.6 },
};

function updatePeople(dt, time){
  const o = controls.getObject();
  for(let vi=0;vi<visitors.length;vi++){
    const v=visitors[vi];
    const p=v.person;

    if(v.state==='walk'){
      // clamp target to wing bounds so NPCs never cross doorways
      const wb=WING_Z[v.wingKey];
      const tz=Math.max(wb.min, Math.min(wb.max, v.target.z));
      const _bx=p.group.position.x, _bz=p.group.position.z;
      if(moveToward(p, v.target.x, tz, v.speed, dt)){
        v._stuckTime=0;
        // clamp current position too
        p.group.position.z = Math.max(wb.min, Math.min(wb.max, p.group.position.z));
        // decide next state: look at art, bench, or patrol view
        const artInWing = artworks.filter(a=>a.art.wingKey===v.wingKey);
        // only pick artworks on the same side as this visitor (avoids cross-room walks)
        const sideArt = artInWing.filter(a=>{
          const fwd2=new THREE.Vector3(0,0,1).applyEuler(a.group.rotation);
          const sx=a.group.position.x+fwd2.x*1.7;
          return v.x>=0 ? sx>-1.0 : sx<1.0;
        });
        const artPool = sideArt.length ? sideArt : artInWing;
        const roll = Math.random();
        if(artPool.length && roll<0.58){
          // pick a random artwork to stand in front of
          const pick = artPool[Math.floor(Math.random()*artPool.length)];
          // stand ~1.6m in front of the artwork, facing it
          const ag=pick.group;
          const fwd=new THREE.Vector3(0,0,1).applyEuler(ag.rotation);
          const rawX=ag.position.x+fwd.x*1.6, rawZ=ag.position.z+fwd.z*1.6;
          const clampedZ=Math.max(wb.min,Math.min(wb.max,rawZ));
          // resolve stand position through collision so it's never inside a wall/bench
          const [sx,sz]=resolveNPC(rawX, clampedZ);
          v.artTarget={ x:sx, z:sz, yaw:Math.atan2(-fwd.x,-fwd.z) };
          v.state='toArt'; v.timer=0;
        } else if(artPool.length===0 || roll<0.76){
          v.state='view'; v.timer=2+Math.random()*3;
        } else {
          const free=benches.filter(b=>b.wingKey===v.wingKey&&!b.occupied);
          if(free.length){
            v.bench=free[Math.floor(Math.random()*free.length)];
            v.bench.occupied=true; v.state='toBench';
          } else { v.state='view'; v.timer=2+Math.random()*3; }
        }
      } else {
        // clamp z while walking
        const wb2=WING_Z[v.wingKey];
        p.group.position.z=Math.max(wb2.min, Math.min(wb2.max, p.group.position.z));
        // always pull x back toward the patrol column to undo any sideways drift
        p.group.position.x += (v.x - p.group.position.x)*Math.min(1, dt*2.5);
        v.targetYaw=p._yaw; animateGait(p, 1);
        // stuck detection: if barely moving, flip to other patrol point
        const _moved=Math.hypot(p.group.position.x-_bx, p.group.position.z-_bz);
        if(_moved < v.speed*dt*0.25){ v._stuckTime=(v._stuckTime||0)+dt; }
        else { v._stuckTime=0; }
        if((v._stuckTime||0)>2.5){
          v._stuckTime=0;
          v.target=(v.target===v.ptA)?v.ptB:v.ptA;
          p.group.position.x = v.x;  // hard snap to column on stuck
        }
      }
      // paired: offset slightly to walk side-by-side
      if(v.pairedIdx!=null && v.state==='walk'){
        const partner=visitors[v.pairedIdx];
        if(partner && partner.state==='walk'){
          // nudge our x slightly toward our natural column
          const nudge=(v.x-p.group.position.x)*0.6*dt;
          p.group.position.x=Math.max(-HALF_W+NPC_R, Math.min(HALF_W-NPC_R, p.group.position.x+nudge));
        }
      }
    } else if(v.state==='view'){
      v.timer-=dt;
      v.targetYaw=v.x>0 ? Math.PI/2 : -Math.PI/2;
      animateGait(p, 0);
      if(v.timer<=0){ v.target=(v.target===v.ptA)?v.ptB:v.ptA; v.state='walk'; }
    } else if(v.state==='toArt'){
      const _ax=p.group.position.x, _az=p.group.position.z;
      if(moveToward(p, v.artTarget.x, v.artTarget.z, v.speed*0.75, dt)){
        v._stuckTime=0;
        v.state='lookArt'; v.timer=12+Math.random()*14;
        v.targetYaw=v.artTarget.yaw;
      } else {
        v.targetYaw=p._yaw; animateGait(p, 1);
        const _am=Math.hypot(p.group.position.x-_ax, p.group.position.z-_az);
        if(_am < v.speed*dt*0.25){ v._stuckTime=(v._stuckTime||0)+dt; }
        else { v._stuckTime=0; }
        if((v._stuckTime||0)>2.5){
          v._stuckTime=0; v.artTarget=null;
          v.target=(v.target===v.ptA)?v.ptB:v.ptA; v.state='walk';
        }
      }
    } else if(v.state==='lookArt'){
      v.timer-=dt;
      v.targetYaw=v.artTarget.yaw;
      animateGait(p, 0);
      // slight head-tilt idle: rock arms gently
      p.armL.rotation.x=Math.sin(time*0.7+vi)*0.04;
      p.armR.rotation.x=Math.sin(time*0.7+vi+1)*0.04;
      if(v.timer<=0){
        v.artTarget=null;
        const free=benches.filter(b=>b.wingKey===v.wingKey&&!b.occupied);
        if(free.length && Math.random()<0.52){
          v.bench=free[Math.floor(Math.random()*free.length)];
          v.bench.occupied=true; v.state='toBench';
        } else { v.target=(v.target===v.ptA)?v.ptB:v.ptA; v.state='walk'; }
      }
    } else if(v.state==='toBench'){
      const _bbx=p.group.position.x, _bbz=p.group.position.z;
      if(moveToward(p, v.bench.x, v.bench.z, v.speed*0.82, dt)){
        v._stuckTime=0;
        v.state='sit'; v.timer=18+Math.random()*22;
        p.group.position.set(v.bench.x, SEAT_Y-0.92, v.bench.z);
        v.targetYaw=v.bench.faceYaw;
        p.group.rotation.y=v.bench.faceYaw;
      } else {
        v.targetYaw=p._yaw; animateGait(p, 1);
        const _bm=Math.hypot(p.group.position.x-_bbx, p.group.position.z-_bbz);
        if(_bm < v.speed*dt*0.25){ v._stuckTime=(v._stuckTime||0)+dt; }
        else { v._stuckTime=0; }
        if((v._stuckTime||0)>2.5){
          v._stuckTime=0;
          v.bench.occupied=false; v.bench=null;
          v.target=(v.target===v.ptA)?v.ptB:v.ptA; v.state='walk';
        }
      }
    } else if(v.state==='sit'){
      v.timer-=dt;
      setSeatedPose(p);
      p.group.rotation.y=v.bench.faceYaw;
      if(v.timer<=0){
        p.group.position.y=0;
        v.bench.occupied=false; v.bench=null;
        v.target=(v.target===v.ptA)?v.ptB:v.ptA; v.state='walk';
      }
      continue;
    }
    p.group.rotation.y=lerpAngle(p.group.rotation.y, v.targetYaw, Math.min(1,dt*5));
  }
  // guard: gentle idle; turn to face & greet an approaching visitor
  const gdx=o.position.x-guard.group.position.x, gdz=o.position.z-guard.group.position.z;
  const gd=Math.hypot(gdx,gdz);
  if(gd<11 && active()){ guard.targetYaw = Math.atan2(gdx,gdz); }
  else { guard.targetYaw = 0.6 + Math.sin(time*0.4)*0.12; }
  guard.group.rotation.y = lerpAngle(guard.group.rotation.y, guard.targetYaw, Math.min(1,dt*3));
  animateGait(guard, 0);
  // greeting toast
  const near = gd<7.5 && active() && !lbOpen;
  if(near && !greetShown){ greetShown=true; greetEl.classList.add('show'); }
  else if(!near && greetShown){ greetShown=false; greetEl.classList.remove('show'); }
}
let greetShown=false;
const greetEl=document.getElementById('greet');

/* ============================== CONTROLS ================================= */
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());
camera.rotation.order = 'YXZ';

/* ---- Look state: pointer-lock when available, drag-look fallback otherwise ---- */
let fallback = false;            // true when pointer lock is unavailable (e.g. embedded iframe)
let paused = false;              // fallback pause state
let _brochureActive = false;     // true while welcome brochure is visible (blocks look in all modes)
const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');

const keys = {};
// Mobile detection: touch device with a narrow viewport
const isMobile = ('ontouchstart' in window) && navigator.maxTouchPoints > 0 && window.innerWidth < 1024;
if(isMobile) document.body.classList.add('mobile-mode');
// Joystick axes — set by setupJoystick(), consumed by updateMovement + animate loop
let jMoveX = 0, jMoveY = 0;  // left pad: x=strafe, y=forward (-1..1)
let jLookX = 0, jLookY = 0;  // right pad: x=yaw, y=pitch (raw)
let jLookXS = 0, jLookYS = 0; // smoothed look axes

addEventListener('keydown', e=>{
  keys[e.code]=true;
  if(e.code==='Escape'){
    if(lbOpen){ closeLightbox(); }
    else if(fallback && active()){ pauseFallback(); }
  }
});
addEventListener('keyup', e=>{ keys[e.code]=false; });

const gate = document.getElementById('gate');
const enterBtn = document.getElementById('enter');

// Is the player currently "in" the gallery (either locked or fallback-active)?
function active(){ return controls.isLocked || (fallback && !paused); }

function showChrome(){
  gate.classList.add('hide');
  ['hud','map','sound','hint','helpbtn'].forEach(id=>document.getElementById(id).classList.add('show'));
  document.getElementById('crosshair').classList.add('show');
  ensureAudio();
  // show welcome brochure once on first entry (brochureShown + openBrochure defined further below)
  if(typeof brochureShown!=='undefined' && !brochureShown){
    brochureShown=true;
    _brochureActive=true;
    if(fallback) paused=true;               // freeze drag-look immediately
    else if(controls.isLocked) controls.unlock(); // release pointer lock so camera doesn't spin
    setTimeout(()=>{ if(typeof openBrochure==='function') openBrochure(null); }, 160);
  }
}
function hideChrome(){
  document.getElementById('crosshair').classList.remove('show');
}

let lockAttempts = 0;
function enterGallery(){
  if(fallback){ resumeFallback(); return; }
  // Mobile: pointer lock doesn't exist; go straight to fallback drag/joystick mode
  if(isMobile){ enableFallback(); return; }
  lockAttempts++;
  // Pointer lock requires the 'allow-pointer-lock' permission, which embedded
  // (sandboxed) iframes don't have. In that case go straight to free mouse-look.
  const inIframe = (()=>{ try { return window.self !== window.top; } catch(e){ return true; } })();
  if(inIframe){ enableFallback(); return; }
  // Standalone tab: try true pointer lock; fall back if the environment blocks it.
  let resolved = false;
  const onErr = ()=>{ resolved = true; document.removeEventListener('pointerlockerror', onErr); enableFallback(); };
  document.addEventListener('pointerlockerror', onErr, { once:true });
  try {
    const p = renderer.domElement.requestPointerLock();
    if(p && p.catch) p.catch(()=>{ if(!fallback) enableFallback(); });
  } catch(e){ enableFallback(); return; }
  setTimeout(()=>{
    document.removeEventListener('pointerlockerror', onErr);
    if(!resolved && !controls.isLocked && !fallback){ enableFallback(); }
  }, 400);
}
enterBtn.addEventListener('click', ()=>{
  // Show the brochure BEFORE acquiring pointer lock / enabling fallback.
  // This ensures the camera is completely static during the welcome screen.
  // enterGallery() (pointer lock or fallback) is only called when "Step Inside" is clicked.
  if(!brochureShown){
    brochureShown = true;
    _brochureActive = true;
    gate.classList.add('hide');
    setTimeout(()=>{ openBrochure(null); }, 160);
  } else {
    enterGallery();
  }
});

/* ---- Mobile joystick setup ---- */
(function(){
  if(!isMobile) return;

  function setupJoystick(padId, knobId, onMove){
    const pad = document.getElementById(padId);
    const knob = document.getElementById(knobId);
    const MAXR = 30; // max knob travel radius (pad radius 54 - knob radius 23 - 1)
    let tid = -1;
    function move(cx, cy){
      const rect = pad.getBoundingClientRect();
      const dx = cx - (rect.left + rect.width/2);
      const dy = cy - (rect.top + rect.height/2);
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, MAXR);
      const ratio = clamped / (dist || 1);
      const ox = dx * ratio, oy = dy * ratio;
      knob.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
      onMove(ox / MAXR, oy / MAXR);
    }
    function reset(){ tid = -1; knob.style.transform='translate(-50%,-50%)'; onMove(0,0); }
    pad.addEventListener('touchstart', e=>{
      e.preventDefault();
      if(tid !== -1) return;
      tid = e.changedTouches[0].identifier;
      move(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, {passive:false});
    pad.addEventListener('touchmove', e=>{
      e.preventDefault();
      for(const t of e.changedTouches){ if(t.identifier===tid) move(t.clientX, t.clientY); }
    }, {passive:false});
    pad.addEventListener('touchend', e=>{
      for(const t of e.changedTouches){ if(t.identifier===tid) reset(); }
    });
    pad.addEventListener('touchcancel', e=>{
      for(const t of e.changedTouches){ if(t.identifier===tid) reset(); }
    });
  }

  setupJoystick('jleft',  'jlknob', (x,y)=>{ jMoveX=x; jMoveY=-y; }); // -y: up=forward
  setupJoystick('jright', 'jrknob', (x,y)=>{ jLookX=x; jLookY=y;  });

  // Touch-tap on canvas → open lightbox / contact (only if it's a true tap, not a joystick drag)
  let tapX=0, tapY=0, tapT=0;
  renderer.domElement.addEventListener('touchstart', e=>{
    if(e.touches.length!==1) return;
    tapX=e.touches[0].clientX; tapY=e.touches[0].clientY; tapT=Date.now();
  }, {passive:true});
  renderer.domElement.addEventListener('touchend', e=>{
    if(e.changedTouches.length!==1) return;
    const dx=e.changedTouches[0].clientX-tapX, dy=e.changedTouches[0].clientY-tapY;
    if(Math.hypot(dx,dy)<18 && Date.now()-tapT<320){
      if(!active()||lbOpen||contactOpen||_brochureActive) return;
      if(hoveredClickable && hoveredClickable.userData.type==='contact') openContactForm();
      else if(hovered) openLightbox(hovered);
    }
  }, {passive:true});
})();

// Swallow benign pointer-lock rejections (sandboxed iframes block the API).
addEventListener('unhandledrejection', e=>{
  if(e.reason && /pointer ?lock/i.test(String(e.reason.message||e.reason))){ e.preventDefault(); }
});

controls.addEventListener('lock', ()=>{ showChrome(); });
controls.addEventListener('unlock', ()=>{
  if(lbOpen || fallback || _brochureActive) return; // lightbox / fallback / brochure manage their own state
  gate.classList.remove('hide');
  gate.querySelector('h1').innerHTML='Paused';
  gate.querySelector('.sub').innerHTML='Take a breath. The gallery is right where you left it.';
  enterBtn.textContent='Resume';
  document.getElementById('load').textContent='';
  hideChrome();
});

/* ---- Fallback drag-look (works inside iframes / when pointer lock is denied) ---- */
function enableFallback(){
  fallback = true; paused = false;
  // sync look euler from current camera orientation
  lookEuler.setFromQuaternion(camera.quaternion);
  lookEuler.z = 0;
  showChrome();
  mlookEl.classList.add('show');
  freeBaseYaw = lookEuler.y;
  document.getElementById('hint').innerHTML = isMobile
    ? '<div>Left stick to walk &nbsp;·&nbsp; Right stick to look</div><div>Tap a work to view it</div>'
    : '<div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Walk &nbsp;·&nbsp; Drag mouse to look</div>'+
      '<div>Click a work to view &nbsp;·&nbsp; <kbd>H</kbd> Controls &nbsp;·&nbsp; <kbd>Esc</kbd> Pause</div>';
}
function pauseFallback(){
  paused = true;
  gate.classList.remove('hide');
  gate.querySelector('h1').innerHTML='Paused';
  gate.querySelector('.sub').innerHTML='Drag to look · WASD to walk. The gallery is right where you left it.';
  enterBtn.textContent='Resume';
  document.getElementById('load').textContent='';
  hideChrome();
}
function resumeFallback(){
  paused = false;
  showChrome();
}

let dragging=false, lastX=0, lastY=0, dragMoved=0;
const LOOK_SENS = 0.0024;
function setCursor(){
  const cv = renderer.domElement;
  if(!fallback || paused || lbOpen || glossOpen || _brochureActive){ cv.style.cursor='default'; return; }
  cv.style.cursor = mouseLook ? 'crosshair' : (dragging ? 'grabbing' : 'grab');
}
renderer.domElement.addEventListener('pointerdown', e=>{
  if(!fallback || paused || lbOpen || _brochureActive) return;
  dragging=true; dragMoved=0; lastX=e.clientX; lastY=e.clientY;
  renderer.domElement.setPointerCapture?.(e.pointerId);
  setCursor();
});
addEventListener('pointermove', e=>{
  if(!dragging || mouseLook || _brochureActive) return;   // when free-look is on, steering handles rotation
  const dx=e.clientX-lastX, dy=e.clientY-lastY;
  lastX=e.clientX; lastY=e.clientY;
  dragMoved += Math.abs(dx)+Math.abs(dy);
  lookEuler.y -= dx*LOOK_SENS;
  lookEuler.x -= dy*LOOK_SENS;
  lookEuler.x = Math.max(-Math.PI/2+0.08, Math.min(Math.PI/2-0.08, lookEuler.x));
  camera.quaternion.setFromEuler(lookEuler);
});
addEventListener('pointerup', e=>{
  if(!dragging) return;
  dragging=false; setCursor();
  // a tap (negligible drag) on a hovered work opens it
  if(dragMoved < 7 && !lbOpen && !contactOpen){
    if(hoveredClickable && hoveredClickable.userData.type==='contact'){ openContactForm(); }
    else if(hovered){ openLightbox(hovered); }
  }
});

/* ---- Hands-free look (toggle): eased, settling; pans only near the screen edges ---- */
let mouseLook = false;           // default OFF → smooth drag-look (most predictable)
let mInside = false, mX = 0, mY = 0;
let freeBaseYaw = 0;             // yaw the view eases around / pans from
renderer.domElement.addEventListener('mousemove', e=>{
  const r = renderer.domElement.getBoundingClientRect();
  mX = ((e.clientX-r.left)/r.width)*2 - 1;
  mY = ((e.clientY-r.top)/r.height)*2 - 1;
  mInside = true;
});
renderer.domElement.addEventListener('mouseleave', ()=>{ mInside=false; });
function updateMouseLook(dt){
  if(!mouseLook || lbOpen || paused || _brochureActive) return;
  if(!(fallback && active())) return;
  const k = Math.min(1, dt*14);    // fast, responsive easing
  if(mInside){
    // edge pan: outer 35% of screen continuously rotates the base yaw
    const EDGE = 0.65, PAN = 2.4;
    if(Math.abs(mX) > EDGE){
      freeBaseYaw -= Math.sign(mX) * ((Math.abs(mX)-EDGE)/(1-EDGE)) * PAN * dt;
    }
    // cursor maps to eased look angle — wider range for intuitive sweep
    const innerX = Math.max(-1, Math.min(1, mX / EDGE));
    const yawTarget   = freeBaseYaw - innerX * 1.1;             // ±~63°
    const pitchTarget = -Math.max(-1, Math.min(1, mY)) * 0.65;  // ±~37°
    lookEuler.y += (yawTarget - lookEuler.y) * k;
    lookEuler.x += (pitchTarget - lookEuler.x) * k;
  }
  lookEuler.x = Math.max(-Math.PI/2+0.08, Math.min(Math.PI/2-0.08, lookEuler.x));
  camera.quaternion.setFromEuler(lookEuler);
}
const mlookEl = document.getElementById('mlook');
function setMouseLook(on){
  mouseLook = on;
  mlookEl.classList.toggle('on', on);
  document.getElementById('mlook-txt').textContent = on ? 'Free Look On' : 'Free Look';
  if(on) freeBaseYaw = lookEuler.y;   // start panning from wherever we're facing
  setCursor();
}
mlookEl.addEventListener('click', ()=> setMouseLook(!mouseLook));

/* ---- Controls glossary (H / ? button) ---- */
const glossary = document.getElementById('glossary');
let glossOpen = false;
function openGlossary(){
  glossOpen = true;
  if(controls.isLocked) controls.unlock();
  glossary.classList.add('open');
  requestAnimationFrame(()=>glossary.classList.add('in'));
}
function closeGlossary(){
  glossOpen = false;
  glossary.classList.remove('in');
  setTimeout(()=>glossary.classList.remove('open'), 300);
}
function toggleGlossary(){ glossOpen ? closeGlossary() : openGlossary(); }
document.getElementById('helpbtn').addEventListener('click', toggleGlossary);
document.getElementById('glossclose').addEventListener('click', closeGlossary);
glossary.addEventListener('click', e=>{ if(e.target===glossary) closeGlossary(); });
addEventListener('keydown', e=>{
  if(e.code==='KeyH' && !lbOpen){ e.preventDefault(); toggleGlossary(); }
  else if(e.code==='Escape' && glossOpen){ closeGlossary(); }
  else if(e.code==='KeyF' && active() && !lbOpen){ e.preventDefault(); setMouseLook(!mouseLook); }
});

/* ============================== COLLISION ================================ */
const PR = 0.42; // player radius
function closestOnSeg(px,pz,s){
  const dx=s.x2-s.x1, dz=s.z2-s.z1;
  const l2=dx*dx+dz*dz || 1e-6;
  let t=((px-s.x1)*dx+(pz-s.z1)*dz)/l2; t=Math.max(0,Math.min(1,t));
  return [s.x1+t*dx, s.z1+t*dz];
}
function resolve(px,pz){
  for(let it=0;it<3;it++){
    for(const s of colliders){
      const [cx,cz]=closestOnSeg(px,pz,s);
      let dx=px-cx, dz=pz-cz; let d=Math.hypot(dx,dz);
      const min=PR+s.half;
      if(d<min){
        if(d<1e-4){ dx=1; dz=0; d=1; }
        px=cx+dx/d*min; pz=cz+dz/d*min;
      }
    }
  }
  // hard outer clamp
  px=Math.max(-HALF_W+PR+0.05, Math.min(HALF_W-PR-0.05, px));
  pz=Math.max(Z_NORTH+PR+0.05, Math.min(Z_SOUTH-PR-0.05, pz));
  return [px,pz];
}

/* ============================== MOVEMENT + HEADBOB ====================== */
const SPEED = 6.2;
let bobT = 0, walkDist = 0, lastStepDist = 0;
const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3(0,1,0);
const velocity = new THREE.Vector3();

/* ---- player sit-on-bench ---- */
let seated=false, sitBench=null;
const sitPromptEl = document.getElementById('sitprompt');
function nearestBench(){
  const o=controls.getObject().position;
  let best=null, bd=1e9;
  for(const b of benches){ const d=Math.hypot(o.x-b.x, o.z-b.z); if(d<bd){bd=d;best=b;} }
  return { b:best, d:bd };
}
function sitOnBench(b){
  seated=true; sitBench=b;
  const o=controls.getObject();
  o.position.set(b.x, SEAT_Y+0.62, b.z);   // seated eye height
  velocity.set(0,0,0);
  lookEuler.set(0, b.faceYaw, 0); camera.quaternion.setFromEuler(lookEuler);
  camera.rotation.z = 0;
}
function standUp(){
  if(!seated) return;
  seated=false;
  const o=controls.getObject();
  o.position.set(sitBench.x, EYE_Y, sitBench.z);
  sitBench=null;
}
function updateSitPrompt(){
  if(!sitPromptEl) return;
  if(seated){ sitPromptEl.innerHTML='Press <kbd>E</kbd> or move to stand'; sitPromptEl.classList.add('show'); return; }
  if(active() && !lbOpen){
    const {d}=nearestBench();
    if(d < 1.7){ sitPromptEl.innerHTML='Press <kbd>E</kbd> to sit'; sitPromptEl.classList.add('show'); return; }
  }
  sitPromptEl.classList.remove('show');
}
addEventListener('keydown', e=>{
  if(e.code!=='KeyE' || lbOpen) return;
  if(seated){ standUp(); return; }
  if(active()){ const {b,d}=nearestBench(); if(d<1.7) sitOnBench(b); }
});

function updateMovement(dt){
  if(seated){
    // any movement key stands you back up
    if(keys['KeyW']||keys['KeyS']||keys['KeyA']||keys['KeyD']||keys['ArrowUp']||keys['ArrowDown']||keys['ArrowLeft']||keys['ArrowRight']) standUp();
    return;
  }
  let f = (keys['KeyW']||keys['ArrowUp']?1:0) - (keys['KeyS']||keys['ArrowDown']?1:0) + jMoveY;
  let r = (keys['KeyD']||keys['ArrowRight']?1:0) - (keys['KeyA']||keys['ArrowLeft']?1:0) + jMoveX;
  f = Math.max(-1, Math.min(1, f)); r = Math.max(-1, Math.min(1, r));
  camera.getWorldDirection(_fwd); _fwd.y=0; _fwd.normalize();
  _right.crossVectors(_fwd, _up).normalize();
  const want = new THREE.Vector3()
    .addScaledVector(_fwd, f)
    .addScaledVector(_right, r);
  const moving = want.lengthSq()>0;
  if(moving) want.normalize();
  // smooth accel
  const target = want.multiplyScalar(SPEED);
  velocity.x += (target.x - velocity.x)*Math.min(1, dt*12);
  velocity.z += (target.z - velocity.z)*Math.min(1, dt*12);

  const obj = controls.getObject();
  let nx = obj.position.x + velocity.x*dt;
  let nz = obj.position.z + velocity.z*dt;
  [nx,nz] = resolve(nx,nz);
  const moved = Math.hypot(nx-obj.position.x, nz-obj.position.z);
  obj.position.x = nx; obj.position.z = nz;

  // headbob
  const speedNow = Math.hypot(velocity.x, velocity.z);
  if(speedNow>0.4){
    bobT += dt * speedNow * 1.55;
    walkDist += moved;
  } else { bobT += dt*0.6; }
  const bob = Math.sin(bobT*2)*0.035*Math.min(1, speedNow/SPEED);
  const sway = Math.cos(bobT)*0.022*Math.min(1, speedNow/SPEED);
  obj.position.y = EYE_Y + bob;
  camera.rotation.z = sway*0.5;

  // footsteps
  if(walkDist - lastStepDist > 2.05 && speedNow>1){
    lastStepDist = walkDist; footstep(Math.min(1, speedNow/SPEED));
  }
}

/* ============================== HOVER (raycaster) ======================= */
const ray = new THREE.Raycaster();
ray.far = 16;
const center = new THREE.Vector2(0,0);
let hovered = null;
const crosshair = document.getElementById('crosshair');
const hoverlabel = document.getElementById('hoverlabel');
const hlT = document.getElementById('hl-t'), hlS = document.getElementById('hl-s');

let hoveredClickable = null;  // non-photo clickable currently hovered

function updateHover(){
  if(lbOpen || contactOpen || !active()){ setHover(null); setHoverClickable(null); return; }
  ray.setFromCamera(center, camera);
  // check clickables first (contact plaque etc.)
  const chits = ray.intersectObjects(clickables, false);
  if(chits.length && chits[0].distance < 8){
    setHover(null);
    setHoverClickable(chits[0].object);
    return;
  }
  setHoverClickable(null);
  const hits = ray.intersectObjects(photoMeshes, false);
  let found=null;
  if(hits.length){ found = hits[0].object.userData.entry; }
  setHover(found);
}
function setHoverClickable(obj){
  if(hoveredClickable===obj) return;
  hoveredClickable=obj;
  if(obj){
    crosshair.classList.add('hot');
    hlT.textContent = obj.userData.label || 'Contact';
    hlS.textContent = 'Click to open';
    hoverlabel.classList.add('show');
  } else if(!hovered){
    crosshair.classList.remove('hot');
    hoverlabel.classList.remove('show');
  }
}
function setHover(e){
  if(hovered===e) return;
  hovered = e;
  if(e){
    crosshair.classList.add('hot');
    hlT.textContent = `Frame ${e.art.id} — ${e.art.wing}`;
    hlS.textContent = 'Click to view';
    hoverlabel.classList.add('show');
  } else {
    crosshair.classList.remove('hot');
    hoverlabel.classList.remove('show');
  }
}

/* ============================== LAZY TEXTURE LOADING ==================== */
const texLoader = new THREE.TextureLoader();
texLoader.crossOrigin = 'anonymous';
let activeLoads = 0;
const LOAD_DIST = 30;

function pumpLoads(){
  if(activeLoads>=6) return;
  // sort nearest unloaded
  const obj = controls.getObject();
  let best=null, bestD=Infinity;
  for(const e of artworks){
    if(e.loaded||e.loading) continue;
    const d = e.pos.distanceTo(obj.position);
    if(d<LOAD_DIST && d<bestD){ bestD=d; best=e; }
  }
  if(!best) return;
  best.loading = true; activeLoads++;
  texLoader.load(thumbURL(best.art),
    tex=>{
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      best.photo.material.dispose();
      best.photo.material = new THREE.MeshStandardMaterial({ map:tex, roughness:0.62, metalness:0 });
      best.loaded=true; best.loading=false; activeLoads--;
      loadedCount++;
    },
    undefined,
    ()=>{ best.loading=false; activeLoads--; best.loaded=true; /* leave placeholder */ loadedCount++; }
  );
}
let loadedCount=0;

/* ============================== LIGHTBOX ================================ */
const lightbox=document.getElementById('lightbox');
const lbimg=document.getElementById('lbimg'), lbskel=document.getElementById('lbskel');
const lbti=document.getElementById('lbti'), lbme=document.getElementById('lbme');
let lbOpen=false, lbIndex=-1;

function openLightbox(entry){
  lbIndex = artworks.indexOf(entry);
  lbOpen = true;
  if(controls.isLocked) controls.unlock();
  dragging = false;
  document.getElementById('crosshair').classList.remove('show');
  hoverlabel.classList.remove('show');
  setHover(null);
  lightbox.classList.add('open');
  requestAnimationFrame(()=>lightbox.classList.add('in'));
  loadLightbox(entry);
}
function loadLightbox(entry){
  const a = entry.art;
  lbskel.style.opacity='1';
  lbti.textContent = a.title;
  lbme.textContent = `${a.wing} · Adam's Gallery · Film, 2026`;
  lbimg.style.opacity='0';
  // populate caption panel
  const cap = CAPTIONS[a.id];
  const panel = document.getElementById('lbcaption-panel');
  if(cap){
    document.getElementById('lbcp-id').textContent = 'Adam Disatnik';
    document.getElementById('lbcp-title').textContent = 'Frame ' + a.id + ', 2026';
    document.getElementById('lbcp-medium').textContent = '35mm Film';
    document.getElementById('lbcp-body').textContent = cap.b;
    panel.classList.add('visible');
  } else {
    panel.classList.remove('visible');
  }
  const img = new Image();
  img.crossOrigin='anonymous';
  img.onload = ()=>{ lbimg.src=img.src; lbimg.style.opacity='1'; lbskel.style.opacity='0'; };
  img.onerror = ()=>{ lbskel.style.opacity='0'; };
  img.src = fullURL(a);
}
function stepLightbox(dir){
  if(lbIndex<0) return;
  lbIndex = (lbIndex+dir+artworks.length)%artworks.length;
  loadLightbox(artworks[lbIndex]);
}
function closeLightbox(){
  if(!lbOpen) return;
  lbOpen=false;
  lightbox.classList.remove('in');
  setTimeout(()=>{ lightbox.classList.remove('open'); }, 400);
  // return to gallery at exact same position
  setTimeout(()=>{
    if(lbOpen || contactOpen) return;
    if(fallback){ document.getElementById('crosshair').classList.add('show'); }
    else { controls.lock(); }
  }, 120);
}
document.getElementById('lbclose').addEventListener('click', e=>{ e.stopPropagation(); closeLightbox(); });
document.getElementById('lbprev').addEventListener('click', e=>{ e.stopPropagation(); stepLightbox(-1); });
document.getElementById('lbnext').addEventListener('click', e=>{ e.stopPropagation(); stepLightbox(1); });
lightbox.addEventListener('click', e=>{ if(e.target===lightbox || e.target.id==='lbframe' || e.target.id==='lbphoto-wrap') closeLightbox(); });
// Block casual photo saving — right-click, drag, iOS long-press
lbimg.addEventListener('contextmenu', e=>e.preventDefault());
lbimg.addEventListener('dragstart',   e=>e.preventDefault());
document.getElementById('lbimg-shield').addEventListener('contextmenu', e=>e.preventDefault());
document.getElementById('lbimg-shield').addEventListener('dragstart',   e=>e.preventDefault());
// Block canvas right-click too
renderer.domElement.addEventListener('contextmenu', e=>e.preventDefault());
document.getElementById('lbcontact').addEventListener('click', e=>{
  e.stopPropagation();
  const entry = lbIndex >= 0 ? artworks[lbIndex] : null;
  const photoRef = entry ? `${entry.art.title} (${entry.art.id})` : '';
  closeLightbox();
  setTimeout(()=> openContactForm(photoRef), 80);
});

// click in 3D world to open (pointer-lock mode)
renderer.domElement.addEventListener('click', ()=>{
  if(controls.isLocked && hoveredClickable && hoveredClickable.userData.type==='contact'){
    openContactForm(); return;
  }
  if(controls.isLocked && hovered){ openLightbox(hovered); }
});

/* ============================== MINIMAP ================================= */
const mapCanvas=document.getElementById('mapcanvas');
const mc=mapCanvas.getContext('2d');
const MAP_W=mapCanvas.width, MAP_H=mapCanvas.height;
// world bounds for map
const wxMin=-HALF_W-1, wxMax=HALF_W+1, wzMin=Z_NORTH-1, wzMax=Z_SOUTH+1;
function w2m(x,z){
  const u=(x-wxMin)/(wxMax-wxMin);
  const v=(z-wzMin)/(wzMax-wzMin); // z increases downward south; we want south at bottom
  return [u*MAP_W, (1-v)*MAP_H]; // invert so north(top) ... actually map south(big z)=bottom
}
const HERE = document.getElementById('map-here');
function drawMap(){
  mc.clearRect(0,0,MAP_W,MAP_H);
  // rooms
  const rooms=[
    {z0:36, z1:48, label:'Entrance',  fill:'#efe9dc'},
    {z0:18, z1:36, label:'Street',    fill:'#f5f2ea'},
    {z0:4,  z1:18, label:'Portraits', fill:'#f5f2ea'},
    {z0:-24,z1:4,  label:'Places',    fill:'#f5f2ea'},
  ];
  rooms.forEach(r=>{
    const [x1,y1]=w2m(-HALF_W,r.z1), [x2,y2]=w2m(HALF_W,r.z0);
    mc.fillStyle=r.fill; mc.fillRect(x1,y1,x2-x1,y2-y1);
    mc.strokeStyle='rgba(20,18,14,.28)'; mc.lineWidth=2; mc.strokeRect(x1,y1,x2-x1,y2-y1);
    mc.fillStyle='rgba(20,18,14,.5)'; mc.font='600 17px Helvetica,Arial'; mc.textAlign='center';
    mc.fillText(r.label.toUpperCase(), (x1+x2)/2, (y1+y2)/2+5);
  });
  // partitions
  mc.strokeStyle='rgba(20,18,14,.32)'; mc.lineWidth=3;
  HALLS.forEach(h=>{
    const [px,py1]=w2m(0,h.z1-4.5),[,py2]=w2m(0,h.z0+4.5);
    mc.beginPath(); mc.moveTo(px,py1); mc.lineTo(px,py2); mc.stroke();
  });
  // player
  const obj=controls.getObject();
  const [px,py]=w2m(obj.position.x, obj.position.z);
  camera.getWorldDirection(_fwd);
  const ang=Math.atan2(_fwd.x, _fwd.z); // heading
  mc.save(); mc.translate(px,py); mc.rotate(-ang);
  // view cone
  mc.fillStyle='rgba(58,125,82,.22)';
  mc.beginPath(); mc.moveTo(0,0); mc.arc(0,0,34,-Math.PI/2-0.5,-Math.PI/2+0.5); mc.closePath(); mc.fill();
  // dot
  mc.fillStyle='#3a7d52'; mc.beginPath(); mc.arc(0,0,6,0,7); mc.fill();
  mc.fillStyle='#fff'; mc.beginPath(); mc.arc(0,0,2.4,0,7); mc.fill();
  mc.restore();

  // update "here"
  const z=obj.position.z;
  let here='Entrance';
  if(z<=36&&z>12)here='Portraits'; else if(z<=12&&z>-12)here='Street'; else if(z<=-12)here='Places';
  if(HERE.textContent!==here) HERE.textContent=here;
}

document.querySelectorAll('#wings button').forEach(btn=>{
  // reflect the real per-wing photo counts
  const c = (window.GALLERY_WIX && window.GALLERY_WIX.counts) ? window.GALLERY_WIX.counts[btn.dataset.wing] : null;
  if(c!=null){ const n = btn.querySelector('.n'); if(n) n.textContent = c; }
  btn.addEventListener('click', ()=>{
    const wing=btn.dataset.wing;
    const h=HALLS.find(x=>x.key===wing);
    const obj=controls.getObject();
    obj.position.set(0, EYE_Y, h.teleport);
    velocity.set(0,0,0);
    if(!controls.isLocked && !lbOpen) controls.lock();
  });
});

/* ============================== AUDIO (synth) ========================== */
let audioCtx=null, master=null, ambientGain=null, ambientOn=false, ambientBuilt=false;
function ensureAudio(){
  if(!audioCtx){
    try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
    master=audioCtx.createGain(); master.gain.value=0.85; master.connect(audioCtx.destination);
  }
  if(audioCtx.state==='suspended') audioCtx.resume();
}
function noiseBuffer(sec){
  const len=audioCtx.sampleRate*sec;
  const buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
  const d=buf.getChannelData(0);
  let last=0;
  for(let i=0;i<len;i++){ const w=Math.random()*2-1; d[i]=(last+0.02*w)/1.02; last=d[i]; d[i]*=3.2; }
  return buf;
}
function buildAmbient(){
  if(ambientBuilt) return; ambientBuilt=true;
  ambientGain=audioCtx.createGain(); ambientGain.gain.value=0; ambientGain.connect(master);
  // airy room tone
  const src=audioCtx.createBufferSource(); src.buffer=noiseBuffer(4); src.loop=true;
  const bp=audioCtx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=520; bp.Q.value=0.6;
  const ng=audioCtx.createGain(); ng.gain.value=0.10;
  src.connect(bp); bp.connect(ng); ng.connect(ambientGain);
  // slow filter sweep
  const lfo=audioCtx.createOscillator(); lfo.frequency.value=0.05;
  const lfoG=audioCtx.createGain(); lfoG.gain.value=180;
  lfo.connect(lfoG); lfoG.connect(bp.frequency);
  // low pad
  [60,90.5,135].forEach((f,i)=>{
    const o=audioCtx.createOscillator(); o.type='sine'; o.frequency.value=f;
    const g=audioCtx.createGain(); g.gain.value=0.018-(i*0.004);
    o.connect(g); g.connect(ambientGain); o.start();
  });
  src.start(); lfo.start();

  // ---- soft distant chatter / murmur (part of the ambience bed) ----
  const chSrc=audioCtx.createBufferSource(); chSrc.buffer=noiseBuffer(6); chSrc.loop=true;
  const chbp=audioCtx.createBiquadFilter(); chbp.type='bandpass'; chbp.frequency.value=760; chbp.Q.value=1.4;
  const chhp=audioCtx.createBiquadFilter(); chhp.type='highpass'; chhp.frequency.value=320;
  const chGain=audioCtx.createGain(); chGain.gain.value=0.0;
  chSrc.connect(chbp); chbp.connect(chhp); chhp.connect(chGain); chGain.connect(ambientGain);
  // murmur swells (voices rising & falling)
  const chBase=audioCtx.createConstantSource(); chBase.offset.value=0.05;
  const chSwell=audioCtx.createOscillator(); chSwell.type='sine'; chSwell.frequency.value=0.11;
  const chSwellG=audioCtx.createGain(); chSwellG.gain.value=0.035;
  chBase.connect(chGain.gain); chSwell.connect(chSwellG); chSwellG.connect(chGain.gain);
  // formant wobble so it reads as speech, not hiss
  const chForm=audioCtx.createOscillator(); chForm.type='sine'; chForm.frequency.value=0.7;
  const chFormG=audioCtx.createGain(); chFormG.gain.value=240;
  chForm.connect(chFormG); chFormG.connect(chbp.frequency);
  chSrc.start(); chBase.start(); chSwell.start(); chForm.start();
}
function toggleAmbient(){
  ensureAudio(); if(!audioCtx) return;
  buildAmbient();
  ambientOn=!ambientOn;
  const t=audioCtx.currentTime;
  ambientGain.gain.cancelScheduledValues(t);
  ambientGain.gain.setTargetAtTime(ambientOn?1:0, t, 0.6);
  const el=document.getElementById('sound');
  el.classList.toggle('on', ambientOn);
  document.getElementById('sound-txt').textContent = ambientOn?'Ambience On':'Ambience Off';
}
document.getElementById('sound').addEventListener('click', toggleAmbient);

let stepBuf=null;
function footstep(vol){
  ensureAudio(); if(!audioCtx) return;
  if(!stepBuf) stepBuf=noiseBuffer(0.16);
  const t=audioCtx.currentTime;
  const s=audioCtx.createBufferSource(); s.buffer=stepBuf;
  const lp=audioCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=360+Math.random()*80;
  const g=audioCtx.createGain();
  const peak=0.022*vol;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0005,t+0.13);
  s.connect(lp); lp.connect(g); g.connect(master);
  s.start(t); s.stop(t+0.16);
}

/* ============================== FLOOR TEXTURE =========================== */
function makeFloorTexture(){
  const c=document.createElement('canvas'); c.width=256; c.height=512;
  const x=c.getContext('2d');
  // pale oak base
  x.fillStyle='#e7e1d3'; x.fillRect(0,0,256,512);
  // planks
  const pw=256/3;
  for(let i=0;i<3;i++){
    const base=[233,225,210][0]; // unused
    const tint = 222 + (i%2)*6;
    x.fillStyle=`rgb(${tint},${tint-8},${tint-22})`;
    x.fillRect(i*pw,0,pw-1.5,512);
    // grain
    for(let g=0; g<60; g++){
      x.strokeStyle=`rgba(150,135,110,${0.04+Math.random()*0.05})`;
      x.lineWidth=Math.random()*1.2;
      x.beginPath();
      const gx=i*pw+Math.random()*pw;
      x.moveTo(gx,0); x.bezierCurveTo(gx+ (Math.random()*8-4),170, gx+(Math.random()*8-4),340, gx,512);
      x.stroke();
    }
    // plank seam
    x.fillStyle='rgba(120,105,85,.28)'; x.fillRect(i*pw,0,1.5,512);
  }
  return new THREE.CanvasTexture(c);
}

/* ============================== WELCOME BROCHURE ======================== */
let brochureShown = false;
const brochureEl = document.getElementById('brochure');

function openBrochure(onClose){
  brochureEl.classList.add('open');
  requestAnimationFrame(()=>brochureEl.classList.add('in'));
  document.getElementById('brochure-enter').onclick = ()=>{
    _brochureActive=false;
    brochureEl.classList.remove('in');
    setTimeout(()=>{
      brochureEl.classList.remove('open');
      if(onClose) onClose();
      if(fallback){ mInside=false; paused=false; setMouseLook(true); }
      else { enterGallery(); }   // pointer lock only AFTER brochure is fully gone
    }, 350);
  };
}

// Brochure fires once via the showChrome function (see its definition above).

/* ============================== CONTACT FORM ============================ */
const contactOverlay = document.getElementById('contactoverlay');
let contactOpen = false;

function openContactForm(photoRef){
  contactOpen = true;
  if(controls.isLocked) controls.unlock();
  dragging = false;
  contactOverlay.classList.add('open');
  requestAnimationFrame(()=>contactOverlay.classList.add('in'));
  document.getElementById('cf-status').textContent = '';
  document.getElementById('cf-name').value = '';
  document.getElementById('cf-email').value = '';
  const ctxEl = document.getElementById('cf-context');
  if(photoRef){
    ctxEl.textContent = `Re: ${photoRef}`;
    ctxEl.classList.add('show');
    document.getElementById('cf-msg').value = `Hi Adam,\n\nI'd like to ask about "${photoRef}".\n\n`;
  } else {
    ctxEl.classList.remove('show');
    document.getElementById('cf-msg').value = '';
  }
  // focus email if name is filled, else focus name
  setTimeout(()=> document.getElementById('cf-name').focus(), 80);
}
function closeContactForm(){
  if(!contactOpen) return;
  contactOpen = false;
  contactOverlay.classList.remove('in');
  document.getElementById('cf-context').classList.remove('show');
  setTimeout(()=>{ contactOverlay.classList.remove('open'); }, 350);
  setTimeout(()=>{ if(!lbOpen && !fallback) controls.lock(); }, 150);
}
document.getElementById('cf-cancel').addEventListener('click', closeContactForm);
contactOverlay.addEventListener('click', e=>{ if(e.target===contactOverlay) closeContactForm(); });
addEventListener('keydown', e=>{ if(e.code==='Escape' && contactOpen){ closeContactForm(); } });

// Wix anonymous token → Form submission (Gallery Contact Form)
const _SITE_ID = 'b5ad9dc2-082a-4284-8838-ae817fa63c81';
const _APP_ID  = '68196db0-0877-4d46-97e5-26ecca8479c8';
const _FORM_ID = 'd79b9afe-6c1b-46c1-9d7b-d74fa8b22b5a';

async function submitViaWixForm(name, email, message, photoRef){
  const tokResp = await fetch('https://www.wixapis.com/oauth2/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:`grant_type=anonymous&client_id=${_APP_ID}`
  });
  if(!tokResp.ok) throw new Error('token '+tokResp.status);
  const { access_token } = await tokResp.json();
  const hdrs = { 'Authorization':'Bearer '+access_token, 'Content-Type':'application/json' };
  const submissions = {
    first_name_05df: name,
    email_39f4: email,
    long_answer_ea78: message
  };
  if(photoRef) submissions.short_answer_8148 = photoRef;
  const resp = await fetch('https://www.wixapis.com/form-submission-service/v4/submissions', {
    method:'POST', headers:hdrs,
    body:JSON.stringify({ submission:{ formId:_FORM_ID, submissions } })
  });
  if(!resp.ok) throw new Error('submit '+resp.status);
}

document.getElementById('cf-send').addEventListener('click', async ()=>{
  const name = document.getElementById('cf-name').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  const msg  = document.getElementById('cf-msg').value.trim();
  const status = document.getElementById('cf-status');
  if(!name){ status.textContent = 'Please enter your name.'; status.className='cmsg err'; return; }
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    status.textContent = 'A valid email address is required.';
    status.className = 'cmsg err';
    document.getElementById('cf-email').focus();
    return;
  }
  if(!msg){ status.textContent = 'Please write a message.'; status.className='cmsg err'; return; }
  const btn = document.getElementById('cf-send');
  btn.disabled = true; btn.textContent = 'Sending…';
  status.textContent = ''; status.className = 'cmsg';
  const photoRef = (document.getElementById('cf-context').textContent || '').replace(/^Re:\s*/,'').trim();
  try {
    await submitViaWixForm(name, email, msg, photoRef||null);
    status.textContent = 'Message sent — thank you.';
    status.className = 'cmsg';
    btn.textContent = 'Sent ✓';
    setTimeout(closeContactForm, 2200);
  } catch(err){
    console.warn('Wix form error:', err);
    status.textContent = 'Something went wrong — please try again.';
    status.className = 'cmsg err';
    btn.disabled=false; btn.textContent='Send Message';
  }
});

/* ============================== LOADING PROGRESS ======================== */
const loadEl=document.getElementById('load');

/* ============================== RESIZE / LOOP =========================== */
addEventListener('resize', ()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock=new THREE.Clock();
let hoverScaleTarget;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(), 0.05);
  const overlayOpen = lbOpen || contactOpen || _brochureActive || (typeof brochureShown!=='undefined' && brochureEl && brochureEl.classList.contains('open'));
  if(active() && !overlayOpen){
    updateMovement(dt);
    updateMouseLook(dt);
    if(isMobile){
      // smooth the raw axis toward target — feels fluid, not jerky
      jLookXS += (jLookX - jLookXS) * Math.min(1, dt * 9);
      jLookYS += (jLookY - jLookYS) * Math.min(1, dt * 9);
      // dead-zone: ignore micro drift near center
      const lx = Math.abs(jLookXS) > 0.07 ? jLookXS : 0;
      const ly = Math.abs(jLookYS) > 0.07 ? jLookYS : 0;
      if(lx !== 0 || ly !== 0){
        // apply gentle curve: sign(v)*v^1.6 — slow near center, faster at edge
        const curve = v => Math.sign(v) * Math.pow(Math.abs(v), 1.6);
        lookEuler.y -= curve(lx) * 1.5 * dt;
        lookEuler.x -= curve(ly) * 1.1 * dt;
        lookEuler.x = Math.max(-Math.PI/2+0.08, Math.min(Math.PI/2-0.08, lookEuler.x));
        camera.quaternion.setFromEuler(lookEuler);
      }
    }
  }
  if(isMobile){
    const showJoy = fallback && !paused && !lbOpen && !contactOpen && !_brochureActive &&
                    !(typeof brochureShown!=='undefined' && brochureEl && brochureEl.classList.contains('open'));
    document.getElementById('jleft').classList.toggle('show', showJoy);
    document.getElementById('jright').classList.toggle('show', showJoy);
  }
  setCursor();
  updateSitPrompt();
  updatePeople(dt, clock.elapsedTime);
  updateHover();

  // smooth hover scale + accent
  for(const e of artworks){
    const want = (e===hovered)?1.021:1.0;
    e.group.scale.lerp(new THREE.Vector3(want,want,want), Math.min(1,dt*10));
  }
  pumpLoads();
  drawMap();
  renderer.render(scene, camera);
}
animate();

// initial preload near spawn so first room looks ready
let warm=0; const warmTimer=setInterval(()=>{
  pumpLoads(); warm++;
  if(loadedCount>=10 || warm>40){ loadEl.textContent='Ready'; clearInterval(warmTimer); }
  else loadEl.textContent=`Preparing the rooms…  ${loadedCount}/89`;
}, 250);

window.__gallery = { scene, camera, artworks, controls };

// --- debug preview (real capture only): #debug positions camera in a wing ---
if(location.hash.includes('debug')){
  gate.style.transition='none';
  gate.classList.add('hide');
  ['hud','map','sound','hint'].forEach(id=>document.getElementById(id).classList.add('show'));
  crosshair.classList.add('show');
  const o=controls.getObject();
  const dv = (location.hash.match(/view=(\w+)/)||[])[1] || 'wing';
  if(dv==='lobby'){ o.position.set(0,1.9,46); camera.lookAt(0,4.7,36); }
  else if(dv==='room'){ o.position.set(-2,1.68,8); camera.lookAt(7,1.4,0); }
  else { o.position.set(8.6,1.68,21); camera.lookAt(-11,2.0,21); }
  const warm2=setInterval(()=>{for(let i=0;i<8;i++)pumpLoads();},120);
  setTimeout(()=>clearInterval(warm2),6000);
}
</script>

<!-- Mobile joystick pads — only shown on touch devices after entering gallery -->
<div id="jleft" class="jpad"><div class="jpad-knob" id="jlknob"></div><span class="jpad-label">Move</span></div>
<div id="jright" class="jpad"><div class="jpad-knob" id="jrknob"></div><span class="jpad-label">Look</span></div>

</body></html>