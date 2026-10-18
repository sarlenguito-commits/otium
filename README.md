# 📖 OTIUM

App web para aprender cualquier tema de a escalones, o estudiar un libro EPUB, con ayuda de la IA. Anda en el celu y
en la PC, y se puede instalar.

👉 **Probala:** https://sarlenguito-commits.github.io/otium/ *(en prueba con probadores)*

## Qué hace
- **Tema:** escribís qué querés aprender y la IA arma un árbol de ramas. Cada rama tiene su ficha (idea, definición,
  origen, autores, error común, analogías y preguntas), chequeada con Wikipedia. Antes, el **escalón de abajo**: lo
  que la ficha da por sabido.
- **Libro (EPUB):** cada capítulo es una rama; se lee en la app y la ficha sale del texto del capítulo.
- **Comprobar:** preguntas que la IA corrige con pistas, "Contalo" con la ficha tapada y "Feynman" (explicárselo a un
  chico de 7 años).
- **Repaso espaciado** (1, 3, 7, 14, 30 y 60 días), racha semanal y temporizador.
- **Cerebro 🧠:** notas propias vinculadas a mapas, fichas y ramas, de ida y de vuelta.
- **Tus datos:** todo queda en tu navegador; se puede bajar una copia e importarla.

## Cómo está hecha
- HTML, SCSS y JavaScript con módulos, sin frameworks; instalable (PWA) y anda sin internet, menos la IA.
- La IA (Gemini) pasa por un servidor propio en Cloudflare Workers, con cupo por día; la clave nunca está en este
  repositorio.
- Este repositorio es solo lo publicado: el código fuente, las pruebas y el servidor viven aparte.

`JavaScript` `SCSS` `PWA` `Gemini` `Cloudflare Workers` `GitHub Pages`
