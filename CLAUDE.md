# ArquiSpec

Sitio web para arquitectos: ficha de especificaciones técnicas de muros (capas constructivas, metrados, materiales, vista 3D). Publicado en GitHub Pages: https://nt0019.github.io/Arqui_Spec/

## Stack
- HTML, CSS y JavaScript puros. Sin frameworks, sin build, sin servidor ni claves.
- Archivos: `index.html`, `agentes.js` / `agentes.css` (asistentes dentro de la página), `visor3d.js` (vista 3D), `arquitectura.css`.
- Idioma de la interfaz: español (Perú). Números con `toLocaleString('es-PE')`.

## Reglas del proyecto
- Respetar exactamente lo que pide el usuario: si da 7 enlaces distintos, deben aparecer 7 distintos, sin duplicados.
- Temas claro y oscuro (oscuro en gris oscuro). Todo cambio visual debe verse bien en ambos.
- Los valores de materiales y consumos son referenciales y editables; no inventar normas ni cantidades como si fueran oficiales.
- El botón de sugerencias usa `mailto:` hacia jeanalexanderdelrio606@gmail.com.
- Accesibilidad: foco visible, etiquetas en formularios, respetar `prefers-reduced-motion`.
- No afirmar que algo está publicado si solo se subió a una rama.

## Agentes del proyecto (`.claude/agents/`)
- `arquispec-metrado`: cálculos de área, ladrillos, mortero y desperdicio.
- `arquispec-materiales`: plantillas de muros, capas y consumos.
- `arquispec-visor3d`: vista 3D (`visor3d.js`).
- `arquispec-interfaz`: diseño, temas, barra lateral y lista de recursos.
- `arquispec-revisor`: revisión antes de publicar (rutas, enlaces, duplicados, GitHub Pages).
