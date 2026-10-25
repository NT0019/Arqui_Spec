/* ArquiSpec · escenas 3D con CSS (sin librerías): maqueta del hero y visor del muro */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };

  /* ---------- Caja 3D: 6 caras centradas en su origen ---------- */
  function caja(o) {
    var w = o.w, h = o.h, d = o.d;
    var el = document.createElement('div');
    el.className = 'cub';
    el.style.transform = 'translate3d(' + (o.x || 0) + 'px,' + (o.y || 0) + 'px,' + (o.z || 0) + 'px)';
    var caras = [
      ['front', w, h, 'translateZ(' + d / 2 + 'px)'],
      ['back', w, h, 'rotateY(180deg) translateZ(' + d / 2 + 'px)'],
      ['right', d, h, 'rotateY(90deg) translateZ(' + w / 2 + 'px)'],
      ['left', d, h, 'rotateY(-90deg) translateZ(' + w / 2 + 'px)'],
      ['top', w, d, 'rotateX(90deg) translateZ(' + h / 2 + 'px)'],
      ['bottom', w, d, 'rotateX(-90deg) translateZ(' + h / 2 + 'px)']
    ];
    var col = o.color || '#ccc', tex = o.tex || '', decor = o.decor || {};
    caras.forEach(function (c) {
      var n = c[0], f = document.createElement('div');
      var color = typeof col === 'string' ? col : (col[n] || col.all || '#ccc');
      var t = typeof tex === 'string' ? tex : (tex[n] || tex.all || '');
      f.className = 'f f-' + n + (t ? ' ' + t : '');
      f.style.width = c[1] + 'px';
      f.style.height = c[2] + 'px';
      f.style.margin = (-c[2] / 2) + 'px 0 0 ' + (-c[1] / 2) + 'px';
      f.style.transform = c[3];
      f.style.backgroundColor = color;
      if (decor[n]) f.innerHTML = decor[n];
      el.appendChild(f);
    });
    return el;
  }

  /* ---------- Escena: cámara orbital con arrastre, teclado y giro automático ---------- */
  function Escena(root, opt) {
    opt = opt || {};
    this.root = root;
    this.rig = root.querySelector('.rig');
    this.rx = opt.rx != null ? opt.rx : -22;
    this.ry = opt.ry != null ? opt.ry : -35;
    this.zoom = opt.zoom || 1;
    this.autoDeseado = !!opt.auto && !reduce;
    this.auto = this.autoDeseado;
    this.speed = opt.speed || 0.1;
    this.minRx = opt.minRx != null ? opt.minRx : -90;
    this.maxRx = opt.maxRx != null ? opt.maxRx : 15;
    this.visible = true;
    this.drag = null;
    this.timer = null;
    this.aplicar();
    this.eventos();
    this.bucle();
  }
  Escena.prototype.aplicar = function () {
    this.rig.style.transform = 'scale(' + this.zoom + ') rotateX(' + this.rx + 'deg) rotateY(' + this.ry + 'deg)';
  };
  Escena.prototype.vista = function (rx, ry) {
    var self = this;
    this.auto = false;
    var delta = ((ry - this.ry + 540) % 360) - 180; // giro por el camino corto
    this.rx = rx;
    this.ry = this.ry + delta;
    if (reduce) { this.aplicar(); return; }
    this.rig.classList.add('anim');
    this.aplicar();
    clearTimeout(this.animT);
    this.animT = setTimeout(function () { self.rig.classList.remove('anim'); }, 900);
  };
  Escena.prototype.girar = function (on) {
    this.autoDeseado = on && !reduce;
    this.auto = this.autoDeseado;
  };
  Escena.prototype.setZoom = function (z) { this.zoom = z; this.aplicar(); };
  Escena.prototype.eventos = function () {
    var self = this, root = this.root;
    root.addEventListener('pointerdown', function (e) {
      self.drag = { x: e.clientX, y: e.clientY, rx: self.rx, ry: self.ry };
      self.auto = false;
      self.rig.classList.remove('anim');
      try { root.setPointerCapture(e.pointerId); } catch (err) {}
    });
    root.addEventListener('pointermove', function (e) {
      if (!self.drag) return;
      self.ry = self.drag.ry + (e.clientX - self.drag.x) * 0.45;
      self.rx = Math.max(self.minRx, Math.min(self.maxRx, self.drag.rx - (e.clientY - self.drag.y) * 0.45));
      self.aplicar();
    });
    function fin() {
      if (!self.drag) return;
      self.drag = null;
      clearTimeout(self.timer);
      if (self.autoDeseado) self.timer = setTimeout(function () { self.auto = true; }, 4000);
    }
    root.addEventListener('pointerup', fin);
    root.addEventListener('pointercancel', fin);
    root.addEventListener('keydown', function (e) {
      var k = e.key, paso = 8, usado = true;
      if (k === 'ArrowLeft') self.ry -= paso;
      else if (k === 'ArrowRight') self.ry += paso;
      else if (k === 'ArrowUp') self.rx = Math.min(self.maxRx, self.rx + paso);
      else if (k === 'ArrowDown') self.rx = Math.max(self.minRx, self.rx - paso);
      else usado = false;
      if (usado) { e.preventDefault(); self.auto = false; self.aplicar(); }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; }).observe(root);
    }
  };
  Escena.prototype.bucle = function () {
    var self = this;
    (function paso() {
      if (self.auto && self.visible && !document.hidden && !self.drag) {
        self.ry += self.speed;
        self.aplicar();
      }
      requestAnimationFrame(paso);
    })();
  };

  /* ---------- Maqueta de vivienda para el hero ---------- */
  function construirCasa(rig) {
    var OFF = 58; // desplaza el modelo para girar cerca de su centro
    function p(o) { o.y = (o.y || 0) + OFF; rig.appendChild(caja(o)); }
    var oscuro = '#2b3440', blanco = '#ece8e1', madera = '#bb8c5c';
    var vidrioA = '<div class="win" style="left:6%;top:14%;width:50%;height:72%"></div>' +
                  '<div class="win door" style="left:62%;top:14%;width:13%;height:86%"></div>' +
                  '<div class="win" style="left:80%;top:14%;width:14%;height:46%"></div>';
    var vidrioB = '<div class="win" style="left:8%;top:28%;width:84%;height:40%"></div>';
    var lateral = '<div class="win" style="left:18%;top:20%;width:64%;height:56%"></div>';

    p({ w: 400, h: 10, d: 340, x: 0, y: 5, z: 0, color: { top: '#5e9a69', all: '#3f6b49' } });                 // jardín
    p({ w: 40, h: 2, d: 120, x: 45, y: -1, z: 110, color: '#d9d3c7' });                                      // sendero
    p({ w: 150, h: 6, d: 100, x: -105, y: -3, z: 100, color: { top: '#cfc8ba', all: '#a9a395' } });          // terraza
    p({ w: 240, h: 72, d: 140, x: 0, y: -36, z: -20, color: { all: blanco, top: '#8c9299' },
        decor: { front: vidrioA, right: lateral } });                                                         // volumen inferior
    p({ w: 150, h: 64, d: 110, x: 55, y: -104, z: -35, color: { all: blanco, front: madera, right: madera, top: oscuro },
        tex: { front: 'tex-madera', right: 'tex-madera' }, decor: { front: vidrioB } });                      // volumen superior
    p({ w: 164, h: 7, d: 124, x: 55, y: -139.5, z: -35, color: oscuro });                                     // losa de techo
    p({ w: 150, h: 4, d: 100, x: -105, y: -74, z: 100, color: oscuro });                                      // pérgola
    [[-169, 59], [-41, 59], [-169, 141], [-41, 141]].forEach(function (c) {
      p({ w: 6, h: 72, d: 6, x: c[0], y: -36, z: c[1], color: oscuro });                                      // columnas
    });
    p({ w: 7, h: 30, d: 7, x: 160, y: -15, z: 110, color: '#6b4a2f' });                                       // árbol
    p({ w: 42, h: 40, d: 42, x: 160, y: -50, z: 110, color: { all: '#3f7d4f', top: '#5aa06a' } });
    p({ w: 6, h: 22, d: 6, x: -170, y: -11, z: -120, color: '#6b4a2f' });
    p({ w: 30, h: 30, d: 30, x: -170, y: -37, z: -120, color: { all: '#3f7d4f', top: '#5aa06a' } });
  }

  /* ---------- Visor del muro (capas reales de la tabla) ---------- */
  var EXP = 2; // exageración de espesor para que las capas se distingan
  function matMeta(mat, nombre) {
    function buscar(t) {
      var n = norm(t);
      if (/ladrillo|caravista|king ?kong|pandereta|albanileria/.test(n)) return { c: '#b4553b', t: 'tex-ladrillo' };
      if (/concreto|hormigon|armado/.test(n)) return { c: '#9aa0a6', t: 'tex-concreto' };
      if (/placa|drywall|gypsum|yeso carton/.test(n)) return { c: '#ebe7de', t: 'tex-placa' };
      if (/aislan|lana|poliest|tecnopor|termic|\beps\b/.test(n)) return { c: '#e8c84a', t: 'tex-aislante' };
      if (/madera|listone|tablero|mdf/.test(n)) return { c: '#b98a5a', t: 'tex-madera' };
      if (/tarraj|mortero|enlucido|revoque|estuco|cemento|arena/.test(n)) return { c: '#d8ccb4', t: '' };
      if (/pintura|latex|esmalte/.test(n)) return { c: '#f1f5f9', t: '' };
      if (/perfil|montante|metal|acero/.test(n)) return { c: '#8d99a6', t: '' };
      return null;
    }
    return buscar(mat) || buscar(nombre) || { c: '#8fa3b8', t: '' };
  }

  var visor = {
    escena: null, explotado: false, ultimo: '',
    leerCapas: function () {
      var filas = document.querySelectorAll('#capas tbody tr'), out = [];
      filas.forEach(function (tr) {
        var ins = tr.querySelectorAll('input');
        var e = Math.max(0, Number(tr.querySelector('.espesor').value) || 0);
        if (e > 0) out.push({ nombre: ins[0].value, mat: ins[1].value, e: e });
      });
      return out.length ? out : [{ nombre: 'Sin capas definidas', mat: '', e: 10 }];
    },
    actualizar: function () {
      if (!this.escena) return;
      var L = Math.max(0.1, Number($('#largo').value) || 0.1);
      var H = Math.max(0.1, Number($('#altura').value) || 0.1);
      var capas = this.leerCapas();
      var huella = JSON.stringify([L, H, this.explotado, capas]);
      if (huella === this.ultimo) return;
      this.ultimo = huella;

      var s = Math.min(300 / L, 200 / H), W = L * s, A = H * s;
      var dz = capas.map(function (c) { return Math.max(4, c.e / 100 * s * EXP); });
      var D = dz.reduce(function (a, b) { return a + b; }, 0);
      var gap = this.explotado ? 28 : 0, n = capas.length;
      var rig = this.escena.rig;
      rig.innerHTML = '';

      var suelo = document.createElement('div');
      suelo.className = 'suelo';
      var sw = W + 140, sd = D + 140 + gap * n;
      suelo.style.cssText = 'width:' + sw + 'px;height:' + sd + 'px;margin:' + (-sd / 2) + 'px 0 0 ' + (-sw / 2) + 'px;transform:translate3d(0,' + (A / 2 + 1) + 'px,0) rotateX(90deg)';
      rig.appendChild(suelo);

      var cur = D / 2, leyenda = [];
      capas.forEach(function (c, i) {
        var m = matMeta(c.mat, c.nombre);
        var z = cur - dz[i] / 2 + (n - 1) * gap / 2 - i * gap;
        cur -= dz[i];
        rig.appendChild(caja({ w: W, h: A, d: dz[i], x: 0, y: 0, z: z, color: m.c, tex: m.t }));
        leyenda.push({ c: m.c, nombre: c.nombre || c.mat || 'Capa', mat: c.mat, e: c.e });
      });

      var ol = $('#legendCapas');
      if (ol) {
        ol.innerHTML = '';
        leyenda.forEach(function (l) {
          var li = document.createElement('li');
          var sw2 = document.createElement('span'); sw2.className = 'sw'; sw2.style.background = l.c;
          var tx = document.createElement('span'); tx.textContent = l.nombre + (l.mat ? ' · ' + l.mat : '');
          var b = document.createElement('b'); b.textContent = l.e.toLocaleString('es-PE', { maximumFractionDigits: 1 }) + ' cm';
          li.appendChild(sw2); li.appendChild(tx); li.appendChild(b);
          ol.appendChild(li);
        });
      }
      var total = capas.reduce(function (a, c) { return a + c.e; }, 0);
      var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
      set('v3dLargo', L.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m');
      set('v3dAlto', H.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m');
      set('v3dGrosor', total.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' cm');
    },
    vista: function (nombre) {
      var v = { iso: [-22, -35], frente: [0, 0], planta: [-90, 0], corte: [0, -90] }[nombre];
      if (!v || !this.escena) return false;
      this.escena.vista(v[0], v[1]);
      this.marcar('[data-vista]', function (b) { return b.dataset.vista === nombre; });
      this.marcar('[data-accion="girar"]', function () { return false; });
      return true;
    },
    explotar: function (on) {
      this.explotado = on == null ? !this.explotado : !!on;
      this.marcar('[data-accion="explotar"]', function () { return visor.explotado; });
      this.actualizar();
      return this.explotado;
    },
    girar: function (on) {
      if (!this.escena) return false;
      var nuevo = on == null ? !this.escena.autoDeseado : !!on;
      this.escena.girar(nuevo);
      this.marcar('[data-accion="girar"]', function () { return nuevo; });
      return nuevo;
    },
    marcar: function (sel, fn) {
      document.querySelectorAll('#sec-3d ' + sel).forEach(function (b) { b.setAttribute('aria-pressed', fn(b) ? 'true' : 'false'); });
    },
    iniciar: function () {
      var root = $('#escenaMuro');
      if (!root) return;
      this.escena = new Escena(root, { rx: -22, ry: -35, zoom: 1, auto: false });
      var self = this;
      document.querySelectorAll('#sec-3d [data-vista]').forEach(function (b) {
        b.addEventListener('click', function () { self.vista(b.dataset.vista); });
      });
      var bx = $('#sec-3d [data-accion="explotar"]'), bg = $('#sec-3d [data-accion="girar"]');
      if (bx) bx.addEventListener('click', function () { self.explotar(); });
      if (bg) bg.addEventListener('click', function () { self.girar(); });
      var z = $('#zoomMuro');
      if (z) z.addEventListener('input', function () { self.escena.setZoom(Number(z.value)); });
      this.marcar('[data-vista]', function (b) { return b.dataset.vista === 'iso'; });
      this.actualizar();
    }
  };
  window.Visor3D = visor;

  function arrancar() {
    var casa = $('#escenaCasa');
    if (casa) {
      construirCasa(casa.querySelector('.rig'));
      new Escena(casa, { rx: -24, ry: -38, zoom: 0.86, auto: true, speed: 0.12, minRx: -60, maxRx: 5 });
    }
    visor.iniciar();
    // el visor se redibuja cada vez que la ficha recalcula
    if (typeof window.calcular === 'function') {
      var original = window.calcular;
      window.calcular = function () { original.apply(this, arguments); visor.actualizar(); };
    }
  }
  arrancar();
})();
