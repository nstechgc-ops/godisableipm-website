/* God Is Able — spinning prayer globe (d3-geo + topojson, canvas). Loads its libraries only when scrolled into view. */
(function(){
  var sec=document.getElementById('worldwide'); if(!sec) return;
  var list=sec.querySelector('.places'), btns=[].slice.call(sec.querySelectorAll('.place'));
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- live clocks ---------- */
  function offsetMin(tz,d){ // minutes east of UTC for tz at instant d
    var p={};new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(d).forEach(function(x){p[x.type]=x.value});
    return Math.round((Date.UTC(+p.year,p.month-1,+p.day,+p.hour,+p.minute)-Math.floor(d.getTime()/60000)*60000)/60000);
  }
  var startHM=(list.getAttribute('data-prayer-start')||'05:00').split(':');
  function prayerInstant(){ // next/today's morning prayer start, Eastern Time
    var now=new Date(), off=offsetMin('America/New_York',now);
    var p={};new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).forEach(function(x){p[x.type]=x.value});
    return new Date(Date.UTC(+p.year,p.month-1,+p.day,+startHM[0],+startHM[1])-off*60000);
  }
  function tick(){
    var now=new Date(), pi=prayerInstant();
    btns.forEach(function(b){
      var tz=b.getAttribute('data-tz'); try{
        b.querySelector('[data-time]').textContent=now.toLocaleTimeString(undefined,{timeZone:tz,hour:'numeric',minute:'2-digit'});
        var h=+new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',hourCycle:'h23'}).format(now);
        b.querySelector('[data-daynight]').textContent=(h>=6&&h<18?'☀️':'🌙')+' '+now.toLocaleDateString(undefined,{timeZone:tz,weekday:'short'});
        b.querySelector('[data-prayer]').textContent='· Prayer '+pi.toLocaleTimeString(undefined,{timeZone:tz,hour:'numeric',minute:'2-digit'});
      }catch(e){}
    });
  }
  tick(); setInterval(tick,20000);

  /* ---------- globe ---------- */
  var canvas=sec.querySelector('canvas.globe'), started=false;
  function load(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
  function start(){
    if(started) return; started=true;
    load('/js/vendor/d3-array.min.js').then(function(){return load('/js/vendor/d3-geo.min.js')}).then(function(){return load('/js/vendor/topojson-client.min.js')})
    .then(function(){return fetch('/data/countries-110m.json').then(function(r){return r.json()})}).then(init).catch(function(){canvas.style.display='none'});
  }
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){start();io.disconnect()}})},{rootMargin:'300px'});io.observe(sec)}
  // fallback: some embedded/older browsers never report intersection — start shortly after load anyway
  function late(){setTimeout(start,1800)} if(document.readyState==='complete') late(); else window.addEventListener('load',late);
  window.addEventListener('scroll',function sc(){var r=sec.getBoundingClientRect(); if(r.top<innerHeight+300){start();removeEventListener('scroll',sc)}},{passive:true});

  var ALIAS={'England':'United Kingdom','UK':'United Kingdom','United Kingdom':'United Kingdom','Scotland':'United Kingdom','Wales':'United Kingdom','USA':'United States of America','United States':'United States of America','US':'United States of America'};
  function init(world){
    var ctx=canvas.getContext('2d'), dpr=Math.min(window.devicePixelRatio||1,2), size=0;
    var countries=topojson.feature(world,world.objects.countries).features;
    var land=topojson.merge(world,world.objects.countries.geometries);
    var places=btns.map(function(b){var c=b.getAttribute('data-country');return{btn:b,name:c,lonlat:[+b.getAttribute('data-lng'),+b.getAttribute('data-lat')],geo:ALIAS[c]||c}});
    var active={};places.forEach(function(p){active[p.geo]=true});
    var activeFeat=countries.filter(function(f){return active[f.properties.name]});
    var homeName=list.getAttribute('data-home'), home=places.filter(function(p){return p.name===homeName})[0]||places[0];
    var arcs=places.filter(function(p){return p!==home}).map(function(p){return{type:'LineString',coordinates:[home.lonlat,p.lonlat]}});
    var proj=d3.geoOrthographic().clipAngle(90).precision(.5), path=d3.geoPath(proj,ctx), grat=d3.geoGraticule10();
    var rot=[-(home.lonlat[0]+40),-18,0], sel=null, dragging=false, pauseUntil=0, tween=null, t0=performance.now();

    function resize(){
      var w=canvas.parentNode.clientWidth; size=Math.min(w,520);
      canvas.style.width=size+'px';canvas.style.height=size+'px';canvas.width=size*dpr;canvas.height=size*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0); proj.translate([size/2,size/2]).scale(size/2-14);
    }
    resize(); window.addEventListener('resize',resize);

    function draw(now){
      var r=proj.scale(), c=size/2; proj.rotate(rot); ctx.clearRect(0,0,size,size);
      // halo
      var g=ctx.createRadialGradient(c,c,r*.9,c,c,r*1.08); g.addColorStop(0,'rgba(181,107,224,.35)'); g.addColorStop(1,'rgba(181,107,224,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(c,c,r*1.08,0,7); ctx.fill();
      // ocean
      var o=ctx.createRadialGradient(c-r*.35,c-r*.4,r*.1,c,c,r); o.addColorStop(0,'#4a2a66'); o.addColorStop(.7,'#2a0f3d'); o.addColorStop(1,'#1a0726');
      ctx.fillStyle=o; ctx.beginPath(); path({type:'Sphere'}); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=.6; ctx.beginPath(); path(grat); ctx.stroke();
      // land
      ctx.fillStyle='#6d5288'; ctx.beginPath(); path(land); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=.5; ctx.beginPath(); path(land); ctx.stroke();
      // active countries
      activeFeat.forEach(function(f){ var on=sel&&sel.geo===f.properties.name;
        ctx.fillStyle=on?'#F2D27A':'rgba(226,180,86,.88)'; ctx.beginPath(); path(f); ctx.fill();
        ctx.strokeStyle='rgba(255,240,200,.7)'; ctx.lineWidth=on?1.2:.6; ctx.stroke(); });
      // arcs (prayers travelling)
      ctx.save(); ctx.strokeStyle='rgba(242,210,122,.9)'; ctx.lineWidth=1.6; ctx.shadowColor='rgba(242,210,122,.9)'; ctx.shadowBlur=8;
      ctx.setLineDash([6,8]); ctx.lineDashOffset=reduce?0:-(now/40)%14;
      arcs.forEach(function(a){ctx.beginPath();path(a);ctx.stroke()}); ctx.restore();
      // markers + labels
      var center=[-rot[0],-rot[1]], pulse=reduce?0:(now/900)%1;
      var vis=places.filter(function(p){return d3.geoDistance(p.lonlat,center)<=Math.PI/2-.05}).map(function(p){return{p:p,xy:proj(p.lonlat)}});
      vis.forEach(function(v){ var on=sel===v.p;
        ctx.beginPath(); ctx.arc(v.xy[0],v.xy[1],4+pulse*12,0,7); ctx.fillStyle='rgba(242,210,122,'+(0.45*(1-pulse))+')'; ctx.fill();
        ctx.beginPath(); ctx.arc(v.xy[0],v.xy[1],on?6:4.5,0,7); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#C99436'; ctx.stroke(); });
      // labels with simple collision avoidance: try right-up, left-up, right-down, left-down
      var fs=size<380?11:13, boxes=[]; ctx.textBaseline='middle';
      vis.sort(function(a,b){return (sel===a.p?-1:0)-(sel===b.p?-1:0)||a.xy[1]-b.xy[1]});
      vis.forEach(function(v){ var on=sel===v.p; ctx.font=(on?'700 ':'600 ')+fs+'px Montserrat,system-ui,sans-serif';
        var w=ctx.measureText(v.p.name).width, h=fs+4, x=v.xy[0], y=v.xy[1];
        var opts=[[x+9,y-10,'left'],[x-9,y-10,'right'],[x+9,y+11,'left'],[x-9,y+11,'right']], pick=opts[0];
        for(var i=0;i<opts.length;i++){ var o=opts[i], bx=o[2]==='left'?o[0]:o[0]-w, b=[bx-2,o[1]-h/2,bx+w+2,o[1]+h/2];
          if(!boxes.some(function(q){return b[0]<q[2]&&b[2]>q[0]&&b[1]<q[3]&&b[3]>q[1]})){pick=o;boxes.push(b);break} }
        ctx.textAlign=pick[2]; ctx.lineWidth=3.5; ctx.strokeStyle='rgba(26,7,38,.85)'; ctx.strokeText(v.p.name,pick[0],pick[1]);
        ctx.fillStyle=on?'#F2D27A':'#fff'; ctx.fillText(v.p.name,pick[0],pick[1]); });
      ctx.textAlign='left';
      // inner shade for depth
      var s=ctx.createRadialGradient(c-r*.3,c-r*.35,r*.2,c,c,r); s.addColorStop(0,'rgba(255,255,255,.06)'); s.addColorStop(1,'rgba(10,0,20,.35)');
      ctx.fillStyle=s; ctx.beginPath(); path({type:'Sphere'}); ctx.fill();
    }
    function loop(now){
      var dt=Math.min(now-t0,60); t0=now;
      if(tween){ var k=Math.min((now-tween.t)/1100,1), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
        rot=[tween.a[0]+(tween.b[0]-tween.a[0])*e, tween.a[1]+(tween.b[1]-tween.a[1])*e, 0]; if(k>=1) tween=null; }
      else if(!dragging && !reduce && now>pauseUntil){ rot[0]+=dt*0.006; }
      draw(now); requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function focus(p){
      sel=p; btns.forEach(function(b){b.classList.toggle('on',b===p.btn)});
      var tgt=[-p.lonlat[0],-p.lonlat[1]*0.8,0], a=[rot[0],rot[1],0];
      var d=((tgt[0]-a[0])%360+540)%360-180; tween={a:a,b:[a[0]+d,tgt[1]],t:performance.now()}; pauseUntil=performance.now()+9000;
    }
    places.forEach(function(p){p.btn.addEventListener('click',function(){focus(p)})});

    // drag to rotate
    var last=null;
    canvas.addEventListener('pointerdown',function(e){dragging=true;tween=null;last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)});
    canvas.addEventListener('pointermove',function(e){ if(!dragging) return; var k=75/proj.scale();
      rot[0]+= (e.clientX-last[0])*k; rot[1]=Math.max(-60,Math.min(60,rot[1]-(e.clientY-last[1])*k)); last=[e.clientX,e.clientY]; });
    function up(){ if(dragging){dragging=false;pauseUntil=performance.now()+4000} }
    canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up);
  }
})();
