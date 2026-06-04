# Simulación de Hormigas (p5.js)

Simulación interactiva sencilla de comportamiento de hormigas con feromonas.

## Características

- Añadir comida con click (se acumula si clicas cerca).
- Eliminar comida con Ctrl+Click.
- Shift+Click: añadir obstáculos que las hormigas bordean.
- Mover el nido arrastrándolo.
- Ajustar parámetros (número de hormigas, velocidad, evaporación, influencia, etc.).
- Doble feromona (comida + hogar) con colores configurables.
- Pausa (Espacio), paso a paso (S/→), reset, presets.
- Gráfico en vivo de FPS y comida.
- Tema claro/oscuro, panel colapsable, soporte táctil.
- Funciona offline (PWA con service worker).

## Uso

1. Abrir `index.html` en un navegador moderno (Chrome / Firefox / Edge).
2. Usar el panel lateral para cambiar parámetros en tiempo real.
3. Click en el lienzo: añade comida (40 unidades).
4. Ctrl + Click: elimina fuentes de comida cercanas u obstáculos.
5. Shift + Click: añade un obstáculo.
6. Arrastrar el círculo marrón del nido para recolocarlo.
7. Doble click en el lienzo: limpiar todas las feromonas.
8. Espacio: pausa. S o →: avanza un paso. R: reset. C: limpia feromonas.
   F: comida masiva. H: oculta panel. T: cambia tema.

## Desarrollo

Requiere [pnpm](https://pnpm.io) ≥ 9.

```sh
pnpm install
pnpm test          # corre los 36 tests
pnpm lint          # ESLint
pnpm format        # Prettier
```

## Parámetros

- Número de hormigas: escala de 10 a 800.
- Velocidad: magnitud del paso.
- Giro aleatorio: ruido direccional.
- Evaporación: factor de persistencia (más alto = dura más, cercano a 0.9 = se borra rápido).
- Depositar: cantidad de feromona por paso (cuando regresan con comida).
- Influencia rastro: peso al decidir giro según feromonas.
- Influencia hogar: peso al seguir feromona de regreso al nido.
- Radio / Ángulo de percepción: región de muestreo del campo de feromonas.
- Regeneración de comida: velocidad a la que las fuentes se rellenan.

## Licencia

Uso libre educativo.

## Online:
https://cgarciagl.github.io/AntSystem/
