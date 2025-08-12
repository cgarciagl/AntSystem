import { Simulation } from "./simulation.js";
import { setupGUI, updateStats } from "./gui.js";

let sim;
let gui;
let draggingNest = false;
let dragOffset;

window.setup = function () {
  const wrap = document.getElementById("canvas-wrapper");
  const c = createCanvas(window.innerWidth - 280, window.innerHeight);
  c.parent(wrap);
  pixelDensity(1);
  sim = new Simulation(width, height);
  gui = setupGUI(sim);
};

window.windowResized = function () {
  resizeCanvas(window.innerWidth - 280, window.innerHeight);
  sim.resize(width, height);
};

window.draw = function () {
  background(17);
  sim.update();
  sim.draw();
  updateStats(sim);
};

window.mousePressed = function () {
  if (mouseX < 0) return;
  const d = dist(mouseX, mouseY, sim.nest.pos.x, sim.nest.pos.y);
  if (d < sim.nest.radius) {
    draggingNest = true;
    dragOffset = createVector(mouseX - sim.nest.pos.x, mouseY - sim.nest.pos.y);
  } else {
    if (keyIsDown(CONTROL)) sim.removeFoodAt(mouseX, mouseY, 18);
    else sim.addFood(mouseX, mouseY, 40);
  }
};

window.mouseDragged = function () {
  if (draggingNest)
    sim.nest.pos.set(mouseX - dragOffset.x, mouseY - dragOffset.y);
};
window.mouseReleased = function () {
  draggingNest = false;
};
window.doubleClicked = function () {
  sim.pheromones.clearAll();
};
