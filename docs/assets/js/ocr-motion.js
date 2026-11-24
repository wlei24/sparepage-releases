(()=>{
'use strict';
const demo=document.querySelector('[data-ocr]');if(!demo)return;
const $=s=>demo.querySelector(s),number=$('.ocr-number'),selection=$('.ocr-selection'),line=$('.ocr-scanline'),toolbar=$('.ocr-toolbar'),result=$('.ocr-result'),pointer=$('.ocr-pointer'),ring=$('.ocr-pointer>span'),copy=$('.ocr-copy'),toggle=$('.ocr-toggle'),label=$('.ocr-step');
const source=[...number.children],output=[...demo.querySelectorAll('.ocr-result strong>span')],reduced=matchMedia('(prefers-reduced-motion: reduce)');
let visible=false,manual=false,playing=false,elapsed=0,last=0,raf=0,geometry=null,actualCopied=false,copyTimer=0,lastPhase='';
const duration=12000,clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,t)=>a+(b-a)*ease(t);
function measure(){
 const d=demo.getBoundingClientRect(),n=number.getBoundingClientRect();
 geometry={x:n.left-d.left-10,y:n.top-d.top-7,w:n.width+20,h:n.height+14};
 const g=geometry,tw=toolbar.offsetWidth;
 toolbar.style.left=Math.min(d.width-tw-18,Math.max(18,g.x+g.w-tw))+'px';toolbar.style.top=g.y+g.h+12+'px';
 const tool=$('.ocr-tool').getBoundingClientRect(),c=copy.getBoundingClientRect();
 const ty=getComputedStyle(toolbar).transform, ry=getComputedStyle(result).transform;
 const shift=s=>s==='none'?0:new DOMMatrixReadOnly(s).m42;
 g.tx=tool.left-d.left+tool.width/2;g.ty=tool.top-d.top+tool.height/2-shift(ty);
 g.cx=c.left-d.left+c.width/2;g.cy=c.top-d.top+c.height/2-shift(ry);
 draw();
}
function draw(){
 if(!geometry)return;
 const g=geometry,t=reduced.matches?6500:elapsed%duration;
 const phase=t<2500?'select':t<3500?'tools':t<5600?'scan':t<7500?'result':'copied';
 if(phase!==lastPhase){demo.dataset.phase=phase;lastPhase=phase;label.textContent={select:'拖动框选屏幕上的内容',tools:'点一下「识字」',scan:'本机识别文字',result:'文字已提取，可以直接复制',copied:'复制文字，接着用'}[phase];}
 const ending=1-ease((t-11000)/700),drag=ease((t-800)/1600),selected=t>=800;
 selection.style.left=g.x+'px';selection.style.top=g.y+'px';selection.style.width=(g.w*drag)+'px';selection.style.height=(g.h*drag)+'px';selection.style.opacity=selected?ending:0;
 toolbar.style.opacity=ease((t-2450)/350)*ending;toolbar.style.transform=`translateY(${8*(1-ease((t-2450)/350))}px)`;
 const scan=ease((t-3550)/1800);line.style.left=`${scan*100}%`;line.style.opacity=t>=3550&&t<5450?Math.min(1,(t-3550)/120,(5450-t)/150):0;
 source.forEach((el,i)=>el.classList.toggle('lit',t>=3800+i*500&&t<5600));
 const shown=ease((t-5550)/450);result.style.opacity=shown*ending;result.style.transform=`translateY(${16*(1-shown)}px)`;result.style.pointerEvents=shown>.98&&ending>.98?'auto':'none';
 copy.tabIndex=shown>.98&&ending>.98?0:-1;result.setAttribute('aria-hidden',String(shown<.98||ending<.98));
 output.forEach((el,i)=>el.style.opacity=ease((t-5650-i*180)/200));
 const copied=actualCopied||t>=7500;copy.querySelector('img').src='assets/icons/'+(copied?'check':'copy')+'.svg';copy.style.background=copied?'#e9f5ef':'';
 let x,y;
 if(t<800){x=mix(g.x-20,g.x,t/800);y=mix(g.y+45,g.y,t/800)}
 else if(t<2400){x=g.x+g.w*drag;y=g.y+g.h*drag}
 else if(t<3150){x=mix(g.x+g.w,g.tx,(t-2500)/650);y=mix(g.y+g.h,g.ty,(t-2500)/650)}
 else if(t<6250){x=g.tx;y=g.ty}
 else if(t<7150){x=mix(g.tx,g.cx,(t-6250)/900);y=mix(g.ty,g.cy,(t-6250)/900)}
 else{x=g.cx;y=g.cy}
 pointer.style.transform=`translate(${x}px,${y}px)`;pointer.style.opacity=reduced.matches?0:(t<500?ease(t/500):ending);
 const clickAt=t<5000?3250:7400,click=clamp((t-clickAt)/500);
 ring.style.transform=`scale(${.35+click*1.1})`;ring.style.opacity=t>=clickAt&&t<clickAt+500?(1-click)*.7:0;
 demo.dataset.time=Math.round(t);
}
function frame(now){if(!playing)return;if(reduced.matches){update();return;}if(last)elapsed+=now-last;last=now;draw();raf=requestAnimationFrame(frame)}
function update(){
 const active=visible&&!manual&&!document.hidden&&!reduced.matches;
 if(active&&!playing){playing=true;last=0;raf=requestAnimationFrame(frame)}
 else if(!active&&playing){playing=false;cancelAnimationFrame(raf);last=0}
 demo.dataset.playing=String(playing);demo.dataset.reduced=String(reduced.matches);
 toggle.hidden=reduced.matches;toggle.textContent=playing?'Ⅱ':'▷';toggle.title=playing?'暂停操作演示':'继续操作演示';toggle.setAttribute('aria-label',toggle.title);draw();
}
toggle.addEventListener('click',()=>{manual=!manual;update()});
copy.addEventListener('focus',()=>{manual=true;update()});
copy.addEventListener('click',async()=>{manual=true;update();try{await navigator.clipboard.writeText('SP 0318 2607');actualCopied=true;$('.ocr-copy-feedback').textContent='已复制运单号';draw();clearTimeout(copyTimer);copyTimer=setTimeout(()=>{actualCopied=false;$('.ocr-copy-feedback').textContent='';draw()},2500)}catch{$('.ocr-copy-feedback').textContent='请选中上方文字，手动复制'}});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.25;update()},{threshold:[0,.25]}).observe(demo);
new ResizeObserver(measure).observe(demo);document.addEventListener('visibilitychange',update);
reduced.addEventListener('change',()=>{elapsed=0;manual=false;update()});
measure();update();
})();
