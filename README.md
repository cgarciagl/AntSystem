# Simulación de Hormigas (p5.js)

Simulación interactiva sencilla de comportamiento de hormigas con feromonas.

## Características

- Añadir comida con click (se acumula si clicas cerca).
- Eliminar comida con Ctrl+Click.
- Mover el nido arrastrándolo.
- Ajustar parámetros (número de hormigas, velocidad, evaporación, influencia, etc.).
- Limpiar feromonas y resembrar comida masiva.

## Uso

1. Abrir `index.html` en un navegador moderno (Chrome / Firefox / Edge).
2. Usar el panel lateral para cambiar parámetros en tiempo real.
3. Click en el lienzo: añade comida (40 unidades).
4. Ctrl + Click: elimina fuentes de comida cercanas.
5. Arrastrar el círculo marrón del nido para recolocarlo.
6. Doble click en el lienzo: limpiar todas las feromonas.

## Parámetros

- Número de hormigas: escala de 10 a 800.
- Velocidad: magnitud del paso.
- Giro aleatorio: ruido direccional.
- Evaporación: factor de persistencia (más alto = dura más, cercano a 0.9 = se borra rápido).
- Depositar: cantidad de feromona por paso (cuando regresan con comida).
- Influencia rastro: peso al decidir giro según feromonas.
- Radio / Ángulo de percepción: región de muestreo del campo de feromonas.

## Ideas de mejora

- Obstáculos.
- Diferentes tipos de feromona (ida / vuelta).
- Visualización de trayectorias individuales.
- Modo de cámara lenta / pausa.
- Exportar / importar configuración.

## Licencia

Uso libre educativo.

## Online:
https://cgarciagl.github.io/AntSystem/
