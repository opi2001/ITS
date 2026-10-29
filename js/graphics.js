(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var C = {};
  function colors() {
    var s = getComputedStyle(document.documentElement);
    ['--road', '--lane', '--amber', '--sign', '--ink', '--mute', '--line', '--card'].forEach(function (k) { C[k] = s.getPropertyValue(k).trim(); });
  }
  colors();
  addEventListener('themechange', function () { colors(); });

  function fit(c) {
    var r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
    var x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
    return { x: x, w: r.width, h: r.height };
  }
  function run(c, draw) {
    var v = fit(c), vis = false, running = false, last = 0;
    function tick(n) {
      if (!vis) { running = false; return; }
      var dt = Math.min((n - last) / 1000, 0.05); last = n;
      draw(v, dt);
      requestAnimationFrame(tick);
    }
    function start() { if (running || reduce) return; running = true; last = performance.now(); requestAnimationFrame(tick); }
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis) start(); }).observe(c);
    addEventListener('resize', function () { v = fit(c); draw(v, 0); });
    addEventListener('themechange', function () { draw(v, 0); });
    draw(v, 0);
  }
  function rr(x, a, b, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h); x.fill(); }

  /* Highway with roadside poles (CCTV, VDS, VMS, speed camera) and a pointer-driven radar */
  var road = document.getElementById('road');
  if (road) {
    var FONT = 'Overpass,system-ui,sans-serif', cars = [], t = 0, mx = -999, my = -999, L = 4, R = 5, TOP = 140, flash = { vds: 0, speed: 0 }, evs = [], evT = 2.5, evI = 0, alertT = 0, alertTxt = '';
    var pal = ['#d9e2dd', '#7fa8c9', '#c9a77f', '#9b9fa4', '#b86b5e', '#e8e2c8'];
    var poles = [
      { k: 'cctv', n: 'CCTV camera', f: .12 },
      { k: 'vds', n: 'Vehicle detection (VDS)', f: .34, avg: 0 },
      { k: 'vms', n: 'Variable message sign (VMS)', f: .58 },
      { k: 'speed', n: 'Speed enforcement camera', f: .82 }
    ];
    road.addEventListener('pointermove', function (e) { var r = road.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    road.addEventListener('pointerleave', function () { mx = -999; my = -999; });
    var wrapMsg = function (s) {
      var w = String(s || 'MAX 80 KM/H').toUpperCase().split(/\s+/), a = '', b = '';
      w.forEach(function (q) { if (!b && (a + ' ' + q).trim().length <= 9) a = (a + ' ' + q).trim(); else b = (b + ' ' + q).trim(); });
      if (!a) { a = b.slice(0, 9); b = b.slice(9); }
      if (b.length > 9) b = b.slice(0, 8) + '…';
      return [a, b];
    };
    run(road, function (v, dt) {
      var x = v.x, w = v.w, h = v.h, lh = (h - TOP) / R, base = TOP - 4, ink = '#d6dfda'; t += dt;
      flash.vds -= dt; flash.speed -= dt;
      function mk(px) {
        var l = Math.floor(Math.random() * L), s = 130 + Math.random() * 150;
        return { l: l, s: s, len: 30 + Math.random() * 12, c: pal[Math.floor(Math.random() * pal.length)], x: px === null ? (l < 2 ? -60 : w + 60) : px };
      }
      if (!cars.length && w) for (var i = 0; i < 12; i++) cars.push(mk(Math.random() * w));
      if (cars.length < 16 && Math.random() < dt * 1.6) cars.push(mk(null));
      var vx = poles[1].f * w + 26;
      evT -= dt; alertT -= dt;
      if (evT <= 0 && w) {
        evT = 7 + Math.random() * 3; var kind = ['stop', 'wrong', 'ped'][evI++ % 3];
        evs.push(kind === 'wrong' ? { k: kind, x: w + 50, y: 1, vx: -190, life: 99 }
          : kind === 'stop' ? { k: kind, x: vx + (Math.random() * 160 - 80), y: 4, vx: 0, life: 6.5 }
          : { k: kind, x: vx - 130, y: 4, vx: 24, life: 9 });
      }
      evs = evs.filter(function (e) { e.x += e.vx * dt; e.life -= dt; return e.life > 0 && e.x > -80; });
      evs.forEach(function (e) { if (Math.abs(e.x - vx) < 150) { alertT = 0.3; alertTxt = { stop: 'Stopped vehicle', wrong: 'Wrong-way driving', ped: 'Pedestrian on road' }[e.k]; } });
      x.clearRect(0, 0, v.w, h);
      x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(0, TOP - 4, w, 4);
      x.fillStyle = C['--road']; x.fillRect(0, TOP, w, h - TOP);
      x.lineWidth = 2;
      x.strokeStyle = 'rgba(255,255,255,.45)'; x.setLineDash([26, 22]); x.lineDashOffset = -t * 60;
      [1, 3].forEach(function (k) { x.beginPath(); x.moveTo(0, TOP + lh * k); x.lineTo(w, TOP + lh * k); x.stroke(); });
      x.strokeStyle = C['--lane']; x.setLineDash([]); x.beginPath(); x.moveTo(0, TOP + lh * 2); x.lineTo(w, TOP + lh * 2); x.stroke();
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, TOP + lh * 4, w, lh);
      x.strokeStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.moveTo(0, TOP + lh * 4); x.lineTo(w, TOP + lh * 4); x.stroke();
      x.fillStyle = 'rgba(255,176,0,.07)'; x.fillRect(vx - 150, TOP, 300, h - TOP);
      cars = cars.filter(function (c) { return c.x > -90 && c.x < w + 90; });
      cars.forEach(function (c) {
        var dir = c.l < 2 ? 1 : -1, cy = TOP + lh * (c.l + 0.5), pcx = c.x + c.len / 2, kmh = Math.round(c.s * 0.38);
        c.x += dir * c.s * dt;
        var cx = c.x + c.len / 2;
        poles.forEach(function (p) {
          var X = p.f * w + (p.k === 'vds' ? 26 : 0);
          if (pcx !== cx && (pcx - X) * (cx - X) <= 0) {
            if (p.k === 'vds') { p.avg = p.avg ? p.avg * 0.85 + kmh * 0.15 : kmh; flash.vds = 0.2; }
            if (p.k === 'speed' && kmh > 80) flash.speed = 0.25;
          }
        });
        x.fillStyle = c.c; rr(x, c.x, cy - 6, c.len, 12, 4);
        x.fillStyle = 'rgba(255,230,160,.95)'; x.fillRect(dir > 0 ? c.x + c.len - 3 : c.x, cy - 5, 3, 3); x.fillRect(dir > 0 ? c.x + c.len - 3 : c.x, cy + 2, 3, 3);
        if (Math.abs(cx - mx) < 46 && my > TOP) {
          x.font = '700 12px ' + FONT; x.textAlign = 'center';
          x.fillStyle = kmh > 80 ? '#ff7a6b' : C['--amber'];
          x.fillText(kmh + ' km/h', cx, cy - 10);
        }
      });
      evs.forEach(function (e) {
        var cy = TOP + lh * (e.y + 0.5), hot = Math.abs(e.x - vx) < 150;
        if (e.k === 'ped') {
          x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 2;
          x.beginPath(); x.arc(e.x, cy - 8, 3, 0, 7); x.fill();
          x.beginPath(); x.moveTo(e.x, cy - 5); x.lineTo(e.x, cy + 3); x.lineTo(e.x - 3, cy + 9); x.moveTo(e.x, cy + 3); x.lineTo(e.x + 3, cy + 9); x.moveTo(e.x - 4, cy - 2); x.lineTo(e.x + 4, cy - 2); x.stroke();
        } else {
          x.fillStyle = e.k === 'wrong' ? '#d9e2dd' : '#e8e2c8'; rr(x, e.x - 18, cy - 6, 36, 12, 4);
          if (e.k === 'stop' && Math.floor(t * 3) % 2) { x.fillStyle = C['--amber']; x.fillRect(e.x - 18, cy - 6, 4, 3); x.fillRect(e.x + 14, cy - 6, 4, 3); x.fillRect(e.x - 18, cy + 3, 4, 3); x.fillRect(e.x + 14, cy + 3, 4, 3); }
          if (e.k === 'wrong') { x.fillStyle = 'rgba(255,230,160,.95)'; x.fillRect(e.x - 18, cy - 5, 3, 3); x.fillRect(e.x - 18, cy + 2, 3, 3); }
        }
        if (hot) { x.strokeStyle = '#ff5a4d'; x.lineWidth = 2; x.setLineDash([]); x.strokeRect(e.x - 24, cy - 13, 48, 26); }
      });
      if (mx > 0 && my > TOP) { x.strokeStyle = C['--amber']; x.lineWidth = 1; x.setLineDash([4, 5]); x.beginPath(); x.moveTo(mx, TOP); x.lineTo(mx, h); x.stroke(); x.setLineDash([]); }
      function cone(ax, ay, a) { x.fillStyle = 'rgba(255,176,0,' + a + ')'; x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax - 34, TOP + 48); x.lineTo(ax + 34, TOP + 48); x.closePath(); x.fill(); }
      function beam(X, y, a) { x.strokeStyle = 'rgba(255,176,0,' + a + ')'; x.lineWidth = 2; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(X, y); x.lineTo(X, h); x.stroke(); x.setLineDash([]); }
      poles.forEach(function (p) {
        var px = p.f * w, ty = base - (p.k === 'vms' ? 84 : 76), near = Math.abs(mx - px) < 40 && my < TOP;
        x.setLineDash([]); x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 4;
        x.beginPath(); x.moveTo(px, base); x.lineTo(px, ty); x.stroke();
        x.fillRect(px - 9, base - 3, 18, 5);
        if (p.k === 'cctv') {
          x.fillRect(px - 2, ty - 8, 22, 10);
          x.fillStyle = Math.floor(t * 2) % 2 ? '#ff5a4d' : '#7a2d28'; x.fillRect(px + 15, ty - 6, 3, 3);
          cone(px + 20, ty - 2, near ? 0.24 : 0.08);
        } else if (p.k === 'vds') {
          var X = px + 26; x.fillRect(px - 2, ty - 2, 30, 4); x.fillRect(X - 6, ty, 12, 8);
          beam(X, ty + 8, flash.vds > 0 ? 0.95 : 0.25);
          x.fillStyle = '#fff'; x.font = '600 11px ' + FONT; x.textAlign = 'center'; x.fillText(p.avg ? 'Avg ' + Math.round(p.avg) + ' km/h' : 'Avg --', X, ty - 8);
          if (alertT > 0) { x.font = '700 11px ' + FONT; var aw = x.measureText(alertTxt).width + 14, ax = Math.max(aw / 2 + 4, Math.min(w - aw / 2 - 4, X)); x.fillStyle = '#d93b2f'; rr(x, ax - aw / 2, ty - 36, aw, 18, 4); x.fillStyle = '#fff'; x.fillText(alertTxt, ax, ty - 23); }
        } else if (p.k === 'vms') {
          x.fillStyle = '#15191A'; x.fillRect(px - 50, ty - 32, 100, 40);
          x.strokeStyle = '#6b7770'; x.lineWidth = 2; x.strokeRect(px - 50, ty - 32, 100, 40);
          var ln = wrapMsg(window.vmsText); x.fillStyle = C['--amber']; x.font = '700 12px ' + FONT; x.textAlign = 'center';
          x.fillText(ln[0], px, ty - 14); if (ln[1]) x.fillText(ln[1], px, ty + 2);
        } else {
          x.fillRect(px - 8, ty - 8, 24, 12); x.fillStyle = '#222'; x.fillRect(px + 10, ty - 5, 5, 6);
          cone(px + 12, ty + 2, flash.speed > 0 ? 0.3 : 0.07);
          if (flash.speed > 0) { x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(px + 13, ty - 2, 8 + flash.speed * 20, 0, 7); x.fill(); }
        }
        if (near) {
          x.font = '700 12px ' + FONT; x.textAlign = 'center';
          var tw = x.measureText(p.n).width + 16, lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, px)), ly = p.k === 'vms' ? 14 : p.k === 'vds' ? ty - 46 : ty - 24;
          x.fillStyle = 'rgba(0,0,0,.7)'; rr(x, lx - tw / 2, ly - 13, tw, 20, 4); x.fillStyle = '#fff'; x.fillText(p.n, lx, ly + 2);
        }
      });
    });
  }

  /* Network explorer */
  var net = document.getElementById('net');
  if (!net) return;
  var N = [
    { id: 'tmc', n: 'TMC servers', l: 'TMC', x: .1, y: .5, r: 20, t: 'Operators watch the whole corridor from here. I monitor server health and device status in SolarWinds and the NMS, run backups, store logs and troubleshoot servers.' },
    { id: 'core', n: 'Core switch', l: 'Core', x: .33, y: .5, r: 16, t: 'The hub that moves traffic between servers and field devices. I practice VLANs, inter-VLAN routing, OSPF, EIGRP, EtherChannel and ACLs on Cisco equipment.' },
    { id: 'fiber', n: 'Fiber backbone', l: 'Fiber', x: .56, y: .5, r: 16, t: 'Roadside cabinets connect back to the centre over fiber. When a new device goes in, I help with installation, network integration and configuration so it connects properly.' },
    { id: 'vds', n: 'Vehicle detection', l: 'VDS', x: .86, y: .14, r: 14, t: 'Measures average speed and flags pedestrians, stopped vehicles and wrong-way driving, so operators can react fast. I manage and maintain these devices.' },
    { id: 'vms', n: 'Message signs', l: 'VMS', x: .86, y: .38, r: 14, t: 'Variable message signs show speed limits and warnings to drivers. I maintain them and fix faults reported from the field.' },
    { id: 'cctv', n: 'CCTV', l: 'CCTV', x: .86, y: .62, r: 14, t: 'Cameras give operators a live view of the road. I install, configure and troubleshoot them.' },
    { id: 'speed', n: 'Speed enforcement', l: 'Speed', x: .86, y: .86, r: 14, t: 'Speed cameras along the corridor. I maintain these systems and write reports on system faults.' }
  ];
  var E = [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5], [2, 6]];
  var P = [], sel = 0, hov = -1, T = 0, box = document.getElementById('nodebtns'), info = document.getElementById('info');
  function pos(v, i) { return [N[i].x * v.w, N[i].y * v.h]; }
  function select(i) {
    sel = i; info.querySelector('h3').textContent = N[i].n; info.querySelector('p').textContent = N[i].t;
    [].forEach.call(box.children, function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
  }
  N.forEach(function (n, i) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = n.n;
    b.addEventListener('click', function () { select(i); }); box.appendChild(b);
  });
  select(0);
  function hit(e, v) {
    var r = net.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, k = -1;
    N.forEach(function (n, i) { var p = pos(v, i); if (Math.hypot(px - p[0], py - p[1]) < n.r + 10) k = i; });
    return k;
  }
  var cv;
  net.addEventListener('pointermove', function (e) { hov = hit(e, cv); net.style.cursor = hov > -1 ? 'pointer' : 'default'; });
  net.addEventListener('pointerleave', function () { hov = -1; });
  net.addEventListener('click', function (e) { var k = hit(e, cv); if (k > -1) select(k); });
  run(net, function (v, dt) {
    cv = v; var x = v.x; T += dt;
    x.clearRect(0, 0, v.w, v.h);
    x.lineWidth = 2; x.strokeStyle = C['--line'];
    E.forEach(function (e) { var a = pos(v, e[0]), b = pos(v, e[1]); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); });
    if (Math.random() < dt * 5) { var k = Math.floor(Math.random() * E.length); P.push({ e: k, t: 0, up: Math.random() < 0.6 }); }
    P = P.filter(function (p) { return p.t < 1; });
    P.forEach(function (p) {
      p.t += dt * 0.5;
      var a = pos(v, E[p.e][p.up ? 1 : 0]), b = pos(v, E[p.e][p.up ? 0 : 1]);
      x.fillStyle = C['--amber']; x.beginPath(); x.arc(a[0] + (b[0] - a[0]) * p.t, a[1] + (b[1] - a[1]) * p.t, 3.5, 0, 7); x.fill();
    });
    N.forEach(function (n, i) {
      var p = pos(v, i), on = i === sel, rad = n.r + (i === hov ? 3 : 0);
      if (on) { x.strokeStyle = C['--lane']; x.lineWidth = 3; x.beginPath(); x.arc(p[0], p[1], rad + 6 + Math.sin(T * 4) * 2, 0, 7); x.stroke(); }
      x.fillStyle = on ? C['--sign'] : C['--card']; x.strokeStyle = C['--sign']; x.lineWidth = 3;
      x.beginPath(); x.arc(p[0], p[1], rad, 0, 7); x.fill(); x.stroke();
      x.fillStyle = C['--ink']; x.font = '600 13px Overpass,system-ui,sans-serif'; x.textAlign = 'center';
      x.fillText(n.l, p[0], p[1] + rad + 20);
    });
  });
})();
