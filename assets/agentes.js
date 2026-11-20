/* ArquiSpec · agentes asistentes (funcionan en el navegador, sin servidor ni claves) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };
  var num = function (x) { return parseFloat(String(x).replace(',', '.')); };
  var fmt = function (n, d) { d = d == null ? 2 : d; return n.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var AG = {
    guia:       { n: 'Agente Guía',          i: '🧭', tab: 'Guía',       saludo: 'Soy el Agente Guía. Te enseño a usar la ficha paso a paso y te llevo a cada sección.',
      chips: ['Recorrido guiado', '¿Cómo uso la ficha?', 'Recursos de arquitectura', 'Enviar una sugerencia', 'Imprimir / guardar PDF'] },
    metrado:    { n: 'Agente de Metrado',    i: '📐', tab: 'Metrado',    saludo: 'Soy el Agente de Metrado. Dime las medidas de tu muro y calculo el área y las cantidades. Ejemplo: “muro de 5 x 3”.',
      chips: ['Muro de 5 x 3', 'Resumen de la ficha', '¿Cuánto ladrillo necesito?', 'Desperdicio 8%', '¿Descuenta puertas y ventanas?'] },
    materiales: { n: 'Agente de Materiales', i: '🧱', tab: 'Materiales', saludo: 'Soy el Agente de Materiales. Puedo cargar capas y consumos típicos según el tipo de muro (valores referenciales, tú los ajustas).',
      chips: ['Ladrillo visto', 'Albañilería tarrajeada', 'Tabique interior', 'Concreto armado', 'Drywall', 'Agregar una capa'] },
    visor:      { n: 'Agente 3D',            i: '🧊', tab: 'Vista 3D',   saludo: 'Soy el Agente 3D. Controlo la vista previa del muro: cámara, corte de capas y vista explotada.',
      chips: ['Vista isométrica', 'Vista en planta', 'Ver corte de capas', 'Explotar capas', 'Girar automáticamente'] }
  };

  /* ---------- Plantillas de muro (valores referenciales y editables) ---------- */
  var PRESETS = {
    visto: { tipo: 'Muro de ladrillo visto',
      capas: [{ f: 'Estructura y acabado exterior', m: 'Ladrillo caravista (soga)', e: 13, env: 'Envolvente', n: 'Definir aparejo, junta y protección hidrófuga' },
              { f: 'Acabado interior', m: 'Tarrajeo cemento-arena', e: 1.5, env: 'Sin envolvente', n: 'Listo para pintar' }],
      mats: [['Ladrillo caravista', 38, 'unidades'], ['Mortero de asentado', 0.02, 'm³'], ['Cemento (referencial)', 7, 'kg'], ['Arena (referencial)', 0.015, 'm³']] },
    tarrajeado: { tipo: 'Muro de albañilería tarrajeado',
      capas: [{ f: 'Acabado exterior', m: 'Tarrajeo cemento-arena', e: 1.5, env: 'Envolvente', n: 'Según exposición' },
              { f: 'Estructura', m: 'Ladrillo cerámico (soga)', e: 13, env: 'Sin envolvente', n: 'Definir tipo y aparejo' },
              { f: 'Acabado interior', m: 'Tarrajeo cemento-arena', e: 1.5, env: 'Sin envolvente', n: 'Listo para pintar' }],
      mats: [['Ladrillo cerámico', 38, 'unidades'], ['Mortero de asentado', 0.02, 'm³'], ['Cemento (referencial)', 7, 'kg'], ['Arena (referencial)', 0.015, 'm³']] },
    tabique: { tipo: 'Tabique interior',
      capas: [{ f: 'Acabado', m: 'Tarrajeo cemento-arena', e: 1.5, env: 'Sin envolvente', n: 'Cara A' },
              { f: 'Estructura', m: 'Ladrillo pandereta', e: 12, env: 'Sin envolvente', n: 'No portante' },
              { f: 'Acabado', m: 'Tarrajeo cemento-arena', e: 1.5, env: 'Sin envolvente', n: 'Cara B' }],
      mats: [['Ladrillo pandereta', 40, 'unidades'], ['Mortero de asentado', 0.018, 'm³'], ['Cemento (referencial)', 6, 'kg'], ['Arena (referencial)', 0.013, 'm³']] },
    concreto: { tipo: 'Muro de concreto armado',
      capas: [{ f: 'Acabado exterior', m: 'Tarrajeo cemento-arena', e: 1.5, env: 'Envolvente', n: 'Según exposición' },
              { f: 'Estructura', m: 'Concreto armado', e: 20, env: 'Sin envolvente', n: 'Resistencia y cuantía según cálculo estructural' },
              { f: 'Acabado interior', m: 'Tarrajeo cemento-arena', e: 1.5, env: 'Sin envolvente', n: 'Listo para pintar' }],
      mats: [['Concreto', 0.2, 'm³'], ['Acero de refuerzo (referencial)', 16, 'kg'], ['Encofrado (contacto)', 2, 'm²']] },
    drywall: { tipo: 'Drywall',
      capas: [{ f: 'Acabado', m: 'Placa de yeso 12.7 mm', e: 1.3, env: 'Sin envolvente', n: 'Cara A' },
              { f: 'Estructura', m: 'Montantes y rieles metálicos', e: 6.4, env: 'Sin envolvente', n: 'Cámara; admite aislante térmico/acústico' },
              { f: 'Acabado', m: 'Placa de yeso 12.7 mm', e: 1.3, env: 'Sin envolvente', n: 'Cara B' }],
      mats: [['Placa de yeso 1.22 × 2.44 m', 0.67, 'unidades'], ['Perfiles (montantes y rieles)', 0.9, 'unidades'], ['Tornillos', 25, 'unidades'], ['Masilla para juntas', 0.5, 'kg']] }
  };

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function opts(lista, sel) { return lista.map(function (o) { return '<option' + (o === sel ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join(''); }
  var UNIDADES = ['unidades', 'kg', 'bolsas', 'm³', 'litros', 'm²'];
  function filaCapa(c) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td></td><td><input value="' + esc(c.f) + '"></td><td><input value="' + esc(c.m) + '"></td>' +
      '<td><input class="espesor" type="number" min="0" step="0.1" value="' + c.e + '"></td>' +
      '<td><select>' + opts(['Envolvente', 'Sin envolvente'], c.env) + '</select></td><td><input value="' + esc(c.n) + '"></td>' +
      '<td class="no-print"><button class="danger" onclick="eliminarFila(this)">Quitar</button></td>';
    return tr;
  }
  function filaMat(m) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><input value="' + esc(m[0]) + '"></td><td><input class="consumo" type="number" min="0" step="0.001" value="' + m[1] + '"></td>' +
      '<td><select>' + opts(UNIDADES, m[2]) + '</select></td><td class="cantidad">—</td>' +
      '<td class="no-print"><button class="danger" onclick="eliminarFila(this)">Quitar</button></td>';
    return tr;
  }

  /* ---------- Acciones sobre la página ---------- */
  function campo(id, v) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function foco(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('ag-flash'); void el.offsetWidth; el.classList.add('ag-flash');
    setTimeout(function () { el.classList.remove('ag-flash'); }, 1900);
  }
  function stat(id) { var e = document.getElementById(id); return e ? e.textContent.trim() : '—'; }
  function material(re) {
    var out = null;
    document.querySelectorAll('#materiales tbody tr').forEach(function (tr) {
      var nombre = tr.querySelector('td input').value;
      if (!out && re.test(norm(nombre))) out = { nombre: nombre, cant: tr.querySelector('.cantidad').textContent.trim() };
    });
    return out;
  }
  function resumen() {
    var l = material(/ladrillo|placa|concreto/), mo = material(/mortero/);
    var lineas = ['Muro de ' + stat('resDim') + ' (' + stat('resArea') + ' sin descontar vanos).',
      'Grosor total: ' + stat('grosor') + ' · desperdicio: ' + stat('resDesperdicio') + '.'];
    if (l) lineas.push(l.nombre + ': ' + l.cant + '.');
    if (mo) lineas.push(mo.nombre + ': ' + mo.cant + '.');
    return lineas.join('\n');
  }
  function aplicarPlantilla(clave) {
    var p = PRESETS[clave];
    if (!p) return false;
    if (!window.confirm('Esto reemplaza las capas y materiales actuales por la plantilla "' + p.tipo + '". ¿Continuar?')) return false;
    var cb = $('#capas tbody'), mb = $('#materiales tbody');
    cb.innerHTML = ''; mb.innerHTML = '';
    p.capas.forEach(function (c) { cb.appendChild(filaCapa(c)); });
    p.mats.forEach(function (m) { mb.appendChild(filaMat(m)); });
    campo('tipo', p.tipo);
    return true;
  }

  /* ---------- Interfaz ---------- */
  var ui = {}, activo = 'guia', visto = {}, tour = -1, ocupado = false;

  function construir() {
    var fab = document.createElement('button');
    fab.className = 'ag-fab no-print'; fab.type = 'button';
    fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'agPanel');
    fab.innerHTML = '<span aria-hidden="true">🤖</span> Agentes';
    var panel = document.createElement('section');
    panel.className = 'ag-panel no-print'; panel.id = 'agPanel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Agentes asistentes de ArquiSpec');
    panel.innerHTML =
      '<div class="ag-head"><span aria-hidden="true" style="font-size:24px">🤖</span><div><strong>Agentes ArquiSpec</strong><small>Te ayudo a completar la ficha</small></div>' +
      '<button class="ag-close" type="button" aria-label="Cerrar agentes">×</button></div>' +
      '<div class="ag-tabs" role="tablist" aria-label="Elegir agente"></div>' +
      '<div class="ag-msgs" role="log" aria-live="polite"></div>' +
      '<div class="ag-chips" aria-label="Sugerencias"></div>' +
      '<form class="ag-form" autocomplete="off"><input type="text" aria-label="Escribe tu consulta" placeholder="Escribe tu consulta…" maxlength="200"><button class="primary" type="submit">Enviar</button></form>' +
      '<div class="ag-foot">Asistentes locales: no envían tus datos a ningún servidor. Estimaciones preliminares.</div>';
    document.body.appendChild(fab); document.body.appendChild(panel);
    ui = { fab: fab, panel: panel, tabs: $('.ag-tabs', panel), msgs: $('.ag-msgs', panel), chips: $('.ag-chips', panel), form: $('.ag-form', panel), input: $('.ag-form input', panel) };

    Object.keys(AG).forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.agente = k;
      b.textContent = AG[k].i + ' ' + AG[k].tab;
      b.addEventListener('click', function () { elegir(k); });
      ui.tabs.appendChild(b);
    });
    fab.addEventListener('click', function () { ui.panel.hidden ? abrir() : cerrar(); });
    $('.ag-close', panel).addEventListener('click', cerrar);
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
    ui.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = ui.input.value; ui.input.value = '';
      preguntar(t);
    });
    pista();
  }

  function pista() {
    try { if (localStorage.getItem('arquispec-ag-hint')) return; } catch (e) {}
    var h = document.createElement('div');
    h.className = 'ag-hint no-print'; h.setAttribute('role', 'status');
    h.innerHTML = '<button type="button" aria-label="Cerrar aviso">×</button>¿Primera vez aquí? Los agentes te guían y calculan por ti.';
    function quitar() { h.remove(); try { localStorage.setItem('arquispec-ag-hint', '1'); } catch (e) {} }
    h.querySelector('button').addEventListener('click', quitar);
    ui.fab.addEventListener('click', quitar);
    setTimeout(function () { document.body.appendChild(h); setTimeout(quitar, 12000); }, 1400);
  }

  function abrir() {
    ui.panel.hidden = false; ui.fab.setAttribute('aria-expanded', 'true');
    var hint = $('.ag-hint'); if (hint) hint.remove();
    if (!ui.msgs.children.length) {
      decir('guia', '¡Hola! Somos cuatro agentes para que la ficha sea más fácil. Elige uno arriba, toca una sugerencia o escribe lo que necesitas.');
      elegir('guia', true);
    }
    ui.input.focus();
  }
  function cerrar() { ui.panel.hidden = true; ui.fab.setAttribute('aria-expanded', 'false'); ui.fab.focus(); }

  function elegir(k, silencioso) {
    activo = k;
    ui.tabs.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.agente === k ? 'true' : 'false'); });
    fichas(AG[k].chips);
    if (!silencioso && !visto[k]) decir(k, AG[k].saludo);
    visto[k] = true;
  }
  function fichas(lista) {
    ui.chips.innerHTML = '';
    lista.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = t;
      b.addEventListener('click', function () { preguntar(t); });
      ui.chips.appendChild(b);
    });
  }
  function burbuja(clase, quien, texto, links) {
    var d = document.createElement('div');
    d.className = 'ag-msg ' + clase;
    if (quien) { var w = document.createElement('span'); w.className = 'who'; w.textContent = quien; d.appendChild(w); }
    d.appendChild(document.createTextNode(texto));
    (links || []).forEach(function (l) {
      var a = document.createElement('a'); a.href = l.href; a.textContent = l.t;
      if (/^https?:/.test(l.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      d.appendChild(a);
    });
    ui.msgs.appendChild(d); ui.msgs.scrollTop = ui.msgs.scrollHeight;
    return d;
  }
  function decir(k, texto, links) { return burbuja('bot', AG[k].i + ' ' + AG[k].n, texto, links); }

  function preguntar(texto) {
    texto = String(texto || '').trim();
    if (!texto || ocupado) return;
    burbuja('me', '', texto);
    ocupado = true;
    var t = burbuja('bot', '', '');
    t.innerHTML = '<span class="ag-typing"><i></i><i></i><i></i></span>';
    setTimeout(function () {
      t.remove();
      var r;
      try { r = resolver(texto); } catch (err) { r = { a: 'guia', t: 'Algo salió mal al ejecutar esa acción. Revisa los valores de la ficha e inténtalo de nuevo.' }; }
      ocupado = false;
      if (r.a !== activo) elegir(r.a, true);
      decir(r.a, r.t, r.links);
      fichas(r.chips || AG[r.a].chips);
      if (r.despues) setTimeout(r.despues, 350);
    }, reduce ? 0 : 380);
  }

  /* ---------- Cerebro de los agentes ---------- */
  var PAR = /(\d+(?:[.,]\d+)?)\s*(?:m|mt|mts|metros?)?\s*(?:x|×|\*|por)\s*(\d+(?:[.,]\d+)?)/g;
  function pares(n) { var out = [], m; PAR.lastIndex = 0; while ((m = PAR.exec(n))) out.push([num(m[1]), num(m[2])]); return out; }
  function valorCerca(n, re) { var m = n.match(re); return m ? num(m[1]) : NaN; }

  var PASOS = [
    { id: 'sec-datos', t: 'Paso 1 · Datos del muro. Escribe proyecto, tipo, longitud, altura y desperdicio. El área se calcula sola (largo × altura).' },
    { id: 'sec-3d', t: 'Paso 2 · Vista 3D. Aquí ves tu muro con sus capas reales. Arrástralo para girarlo, o usa Planta, Corte y Explotar capas.' },
    { id: 'sec-capas', t: 'Paso 3 · Capas constructivas, de exterior a interior. Cambia materiales y espesores: el grosor total y el modelo 3D se actualizan.' },
    { id: 'sec-materiales', t: 'Paso 4 · Materiales y cantidades. Ajusta el consumo por m² a tu ficha técnica; la cantidad incluye el desperdicio.' },
    { id: 'sec-resumen', t: 'Paso 5 · Resumen y observaciones. Cuando termines, usa “Imprimir / Guardar PDF” arriba para llevarte la ficha.' }
  ];
  function paso(i) {
    if (i >= PASOS.length) { tour = -1; return { a: 'guia', t: '¡Listo! Terminamos el recorrido. Recuerda que las cantidades son estimaciones preliminares: valídalas con planos y un profesional.' }; }
    tour = i;
    return { a: 'guia', t: PASOS[i].t, chips: i === PASOS.length - 1 ? ['Terminar recorrido'] : ['Siguiente', 'Salir del recorrido'], despues: function () { foco(PASOS[i].id); } };
  }

  function resolver(raw) {
    var n = norm(raw);

    // recorrido guiado en curso
    if (tour >= 0) {
      if (/^(siguiente|continuar|next|ok|si|vale|dale|terminar recorrido)/.test(n)) return paso(tour + 1);
      if (/salir|cancel|parar|terminar/.test(n)) { tour = -1; return { a: 'guia', t: 'Recorrido cancelado. Cuando quieras, escribe “recorrido guiado”.' }; }
    }
    if (/recorrido|\btour\b|guiame|paso a paso|como uso|como se usa|como funciona/.test(n)) return paso(0);

    // acciones combinables: medidas + tipo de muro + desperdicio
    var acciones = [], hayVanos = /vano|puerta|ventana|hueco|abertura/.test(n);
    var p = pares(n);
    if (!hayVanos && p.length) {
      var L = p[0][0], A = p[0][1];
      if (L > 0 && A > 0 && L <= 500 && A <= 100) { campo('largo', L); campo('altura', A); acciones.push('largo ' + fmt(L) + ' m y altura ' + fmt(A) + ' m'); }
    } else if (!hayVanos) {
      var l2 = valorCerca(n, /(?:largo|longitud|ancho)\D{0,12}?(\d+(?:[.,]\d+)?)/), a2 = valorCerca(n, /(?:altura|alto)\D{0,12}?(\d+(?:[.,]\d+)?)/);
      if (l2 > 0) { campo('largo', l2); acciones.push('largo ' + fmt(l2) + ' m'); }
      if (a2 > 0) { campo('altura', a2); acciones.push('altura ' + fmt(a2) + ' m'); }
    }
    var d = valorCerca(n, /(?:desperdicio|merma)\D{0,12}?(\d+(?:[.,]\d+)?)/);
    if (isNaN(d)) d = valorCerca(n, /(\d+(?:[.,]\d+)?)\s*%/);
    if (!isNaN(d) && /desperdicio|merma|%/.test(n)) {
      var dd = Math.min(50, Math.max(0, d)); campo('desperdicio', dd);
      acciones.push('desperdicio ' + fmt(dd, 0) + ' %' + (dd !== d ? ' (el máximo permitido es 50 %)' : ''));
    }
    var clave = null;
    if (/drywall|placa de yeso|tabiqueria seca|gypsum/.test(n)) clave = 'drywall';
    else if (/concreto|hormigon/.test(n)) clave = 'concreto';
    else if (/tabique/.test(n)) clave = 'tabique';
    else if (/visto|caravista|cara vista/.test(n)) clave = 'visto';
    else if (/albanileria|tarraj/.test(n)) clave = 'tarrajeado';
    if (clave && !/\bagregar|\banadir/.test(n) && PRESETS[clave]) {
      if (aplicarPlantilla(clave)) acciones.push('plantilla “' + PRESETS[clave].tipo + '” (capas y consumos referenciales)');
      else if (!acciones.length) return { a: 'materiales', t: 'De acuerdo, no cambié nada. Tus capas y materiales siguen igual.' };
    }
    if (acciones.length) {
      var ag = clave ? 'materiales' : 'metrado';
      return { a: ag, t: 'Listo, apliqué: ' + acciones.join(', ') + '.\n\n' + resumen() + (clave ? '\n\nRevisa los consumos: son valores típicos, no una especificación aprobada.' : ''),
               despues: function () { foco(clave ? 'sec-capas' : 'sec-datos'); } };
    }

    // vanos (puertas y ventanas)
    if (hayVanos) {
      var vanos = p.reduce(function (a, v) { return a + v[0] * v[1]; }, 0);
      var L0 = num($('#largo').value) || 0, A0 = num($('#altura').value) || 0, bruta = L0 * A0;
      if (vanos > 0 && bruta > 0) {
        var neta = Math.max(0, bruta - vanos);
        return { a: 'metrado', t: 'Área bruta: ' + fmt(bruta) + ' m²\nVanos indicados: ' + fmt(vanos) + ' m²\nÁrea neta: ' + fmt(neta) + ' m²\n\nLa ficha no descuenta vanos por sí sola. Para que las cantidades usen el área neta, puedes poner una altura equivalente de ' + fmt(neta / L0) + ' m (área neta ÷ largo). Ojo: eso también cambia el modelo 3D.' };
      }
      return { a: 'metrado', t: 'La ficha calcula el área bruta (largo × altura) y no descuenta puertas ni ventanas. Dime los vanos y te calculo el área neta. Ejemplo: “puerta 0.9 x 2.1 y ventana 1.5 x 1.2”.', chips: ['puerta 0.9 x 2.1 y ventana 1.5 x 1.2', 'Resumen de la ficha'] };
    }

    // vista 3D
    if (/3d|vista|planta|frente|frontal|corte|seccion|isometric|explot|despiece|girar|rotar|gira|camara/.test(n)) {
      var V = window.Visor3D;
      if (!V) return { a: 'visor', t: 'El visor 3D no está disponible en este navegador.' };
      var txt = '';
      if (/explot|despiece|separar/.test(n)) { var on = V.explotar(); txt = on ? 'Separé las capas para que veas cada una (vista explotada). Vuelve a pedirlo para juntarlas.' : 'Junté de nuevo las capas.'; }
      else if (/planta|arriba|cenital/.test(n)) { V.vista('planta'); txt = 'Vista en planta: así se ve el muro desde arriba, con el espesor de cada capa.'; }
      else if (/corte|seccion|perfil|lateral/.test(n)) { V.vista('corte'); txt = 'Vista en corte: las capas aparecen como franjas, con el exterior a la izquierda y el interior a la derecha. El espesor está exagerado ×2.'; }
      else if (/frente|frontal|elevacion/.test(n)) { V.vista('frente'); txt = 'Vista frontal del muro (elevación).'; }
      else if (/girar|rotar|gira|automatic/.test(n)) { var g = V.girar(); txt = g ? 'Activé el giro automático. Arrastra el modelo para tomar el control.' : 'Detuve el giro automático.'; }
      else { V.vista('iso'); txt = 'Vista isométrica. Puedes arrastrar el modelo con el mouse o el dedo, o usar las flechas del teclado.'; }
      return { a: 'visor', t: txt, despues: function () { foco('sec-3d'); } };
    }

    // agregar capa / material
    if (/(agregar|anadir|nueva|nuevo|crear).{0,12}capa|capa.{0,12}(nueva|mas)/.test(n)) {
      window.agregarCapa(); return { a: 'materiales', t: 'Agregué una capa nueva al final de la tabla. Escribe su material y espesor; el modelo 3D la mostrará enseguida.', despues: function () { foco('sec-capas'); } };
    }
    if (/(agregar|anadir|nuevo|crear).{0,12}material/.test(n)) {
      window.agregarMaterial(); return { a: 'materiales', t: 'Agregué una fila de material. Completa el nombre, el consumo por m² y la unidad.', despues: function () { foco('sec-materiales'); } };
    }

    // consultas de cantidades
    var mat = null;
    if (/ladrillo/.test(n)) mat = material(/ladrillo/);
    else if (/mortero/.test(n)) mat = material(/mortero/);
    else if (/cemento/.test(n)) mat = material(/cemento/);
    else if (/arena/.test(n)) mat = material(/arena/);
    else if (/placa/.test(n)) mat = material(/placa/);
    else if (/concreto/.test(n)) mat = material(/concreto/);
    if (/ladrillo|mortero|cemento|arena|placa/.test(n) && /cuanto|cantidad|necesit|hacen falta|calcul/.test(n) || (mat && /cuanto|cantidad/.test(n))) {
      return mat ? { a: 'metrado', t: mat.nombre + ': ' + mat.cant + ' (incluye ' + stat('resDesperdicio') + ' de desperdicio) para ' + stat('resArea') + '.', despues: function () { foco('sec-materiales'); } }
                 : { a: 'metrado', t: 'No encuentro ese material en la tabla. Puedes agregarlo con “agregar material”.' };
    }
    if (/resumen|cuanto|cantidades|materiales necesarios|material necesito|area|metrado|calcula/.test(n)) return { a: 'metrado', t: resumen(), despues: function () { foco('sec-resumen'); } };
    if (/grosor|espesor/.test(n)) return { a: 'metrado', t: 'El grosor total de las capas es ' + stat('grosor') + ' (suma de los espesores de la tabla de capas).', despues: function () { foco('sec-capas'); } };
    if (/desperdicio|merma/.test(n)) return { a: 'metrado', t: 'El desperdicio cubre cortes, roturas y mermas. En obra suele estimarse entre 5 % y 10 % según el material; ahora la ficha usa ' + stat('resDesperdicio') + '. Escribe, por ejemplo, “desperdicio 8%” y lo cambio.', despues: function () { foco('desperdicio'); } };

    // utilidades de la página
    if (/modo (oscuro|claro)|\boscuro\b|\btema\b|cambiar.{0,10}modo/.test(n)) { window.toggleTheme(); return { a: 'guia', t: 'Cambié el tema de la página.' }; }
    if (/imprimir|pdf|guardar|descargar|exportar/.test(n)) return { a: 'guia', t: 'Abriendo la ventana de impresión. Elige “Guardar como PDF” como destino. En el PDF se ocultan los controles y la vista 3D.', despues: function () { window.print(); } };
    if (/restablecer|reiniciar|reset|borrar todo|empezar de nuevo/.test(n)) return { a: 'guia', t: 'Te pregunto en pantalla si quieres volver a los valores de ejemplo.', despues: function () { window.restablecer(); } };
    if (/sugerencia|contacto|correo|mail|opinion|reportar|error|falla/.test(n)) {
      var mailto = $('.suggestion-btn'); return { a: 'guia', t: '¡Gracias por ayudarnos a mejorar! Puedes escribirnos aquí:', links: mailto ? [{ t: '✉ Enviar una sugerencia', href: mailto.getAttribute('href') }] : [] };
    }
    if (/recurso|enlace|\blinks?\b|inspiracion|\bcad\b|bloques|biblioteca|referencias/.test(n)) {
      var links = [];
      document.querySelectorAll('.resource-link').forEach(function (a) { links.push({ t: a.querySelector('strong').textContent + ' · ' + a.querySelector('small').textContent, href: a.href }); });
      return { a: 'guia', t: 'Estas son las bibliotecas externas de la barra lateral:', links: links };
    }
    if (/\bhola\b|\bbuenas\b|\bbuenos\b|\bhey\b|\bayuda|que puedes|que haces|quien eres/.test(n)) return { a: 'guia', t: 'Puedo: llevarte en un recorrido por la ficha, calcular el metrado con tus medidas, cargar plantillas de muro (ladrillo, drywall, concreto…) y controlar la vista 3D. Toca una sugerencia o escribe tu consulta.', chips: ['Recorrido guiado', 'Muro de 5 x 3', 'Drywall', 'Vista en planta'] };
    if (/gracias|genial|perfecto|excelente/.test(n)) return { a: 'guia', t: '¡Con gusto! Si necesitas algo más, aquí estoy.' };

    return { a: activo, t: 'No estoy seguro de haber entendido. Prueba con frases como:\n• “muro de 6 x 2.5”\n• “drywall” o “concreto armado”\n• “¿cuántos ladrillos necesito?”\n• “vista en corte”\n• “recorrido guiado”', chips: AG[activo].chips };
  }

  window.Agentes = { abrir: abrir, cerrar: cerrar, preguntar: function (t) { abrir(); preguntar(t); } };
  construir();
})();
