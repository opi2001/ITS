(function () {
  var root = document.documentElement;

  /* Theme */
  try { var saved = localStorage.getItem('theme'); if (saved) root.dataset.theme = saved; } catch (e) {}
  document.getElementById('theme').addEventListener('click', function () {
    var cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    dispatchEvent(new Event('themechange'));
  });

  /* Message sign: rotates skills, or shows what the visitor types */
  var vms = document.getElementById('vms'), msg = document.getElementById('msg'), i = 0, custom = false;
  var auto = ['VDS  VMS  CCTV  SPEED ENFORCEMENT', 'CISCO  VLAN  OSPF  EIGRP  ACL', 'SOLARWINDS  NMS  MONITORING', 'DHAKA  BANGLADESH  HIGHWAYS'];
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(function () { if (!custom) { i = (i + 1) % auto.length; vms.textContent = auto[i]; } }, 3200);
  }
  function show() {
    var v = msg.value.trim();
    custom = v.length > 0;
    vms.textContent = custom ? v : auto[i];
    window.vmsText = custom ? v : '';
  }
  document.getElementById('send').addEventListener('click', show);
  msg.addEventListener('keydown', function (e) { if (e.key === 'Enter') show(); });

  /* Skill tabs */
  var tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (o) {
        var on = o === t;
        o.setAttribute('aria-selected', on);
        document.getElementById(o.getAttribute('aria-controls')).hidden = !on;
      });
    });
  });

  /* Photos */
  var G = [
    ['Highway', 'images/vms.jpg', 'Variable message sign with a camera on a highway pole, showing the 80 km/h speed limit in Bangla'],
    ['Highway', 'images/poles.jpg', 'Roadside poles carrying detection and enforcement cameras'],
    ['Highway', 'images/tower.jpg', 'Pan-tilt camera on a tower platform'],
    ['Cabinets', 'images/cab1.jpg', 'Outdoor cabinet with sign controller, fiber transport and surge protection'],
    ['Cabinets', 'images/cab2.jpg', 'Outdoor cabinet with controller, surge protection and a small switch'],
    ['Cabinets', 'images/cab3.jpg', 'Cabinet wiring: fiber media converter, power strip, surge protector and breaker'],
    ['Control centre', 'images/control.jpg', 'Control room with the video wall and operator desks'],
    ['Control centre', 'images/rack1.jpg', 'Server rack with the IP wall controller and HP servers'],
    ['Control centre', 'images/rack2.jpg', 'Server rack in the TMC server room'],
    ['Control centre', 'images/net.jpg', 'Network rack with Cisco routers, switches, firewall and VPN'],
    ['Control centre', 'images/core.jpg', 'Backbone switch and fiber transport rack'],
    ['People', 'images/meet.jpg', 'Technical meeting with project partners'],
    ['People', 'images/visit1.jpg', 'Walking visitors through the control room'],
    ['People', 'images/visit2.jpg', 'Visitors at the control room']
  ];
  var grid = document.getElementById('grid'), fl = document.getElementById('filters'), lb = document.getElementById('lb');
  G.forEach(function (g) {
    var f = document.createElement('figure'); f.dataset.g = g[0];
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Enlarge photo: ' + g[2]);
    var im = document.createElement('img'); im.src = g[1]; im.alt = g[2]; im.loading = 'lazy';
    var c = document.createElement('figcaption'); c.textContent = g[2];
    b.appendChild(im); f.appendChild(b); f.appendChild(c); grid.appendChild(f);
    b.addEventListener('click', function () {
      if (!lb.showModal) return;
      lb.querySelector('img').src = im.src; lb.querySelector('img').alt = g[2]; lb.querySelector('p').textContent = g[2]; lb.showModal();
    });
  });
  lb.addEventListener('click', function () { lb.close(); });
  ['All'].concat(G.map(function (g) { return g[0]; }).filter(function (v, k, a) { return a.indexOf(v) === k; })).forEach(function (name, k) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.setAttribute('aria-pressed', k === 0);
    b.addEventListener('click', function () {
      [].forEach.call(fl.children, function (o) { o.setAttribute('aria-pressed', o === b); });
      [].forEach.call(grid.children, function (f) { f.hidden = name !== 'All' && f.dataset.g !== name; });
    });
    fl.appendChild(b);
  });

  document.getElementById('yr').textContent = new Date().getFullYear();
})();
