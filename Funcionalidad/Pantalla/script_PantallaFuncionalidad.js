/* Escaneo de pantalla: pinta las barras de avance a partir de data-progress (hoy todas en 0%). */
document.querySelectorAll("[data-progress]").forEach(bar => {
  const value = Math.max(0, Math.min(100, Number(bar.dataset.progress) || 0));
  bar.style.width = value + "%";
  const track = bar.closest(".progress");
  if (track) track.setAttribute("aria-valuenow", String(value));
});
const overall = document.getElementById("overall-bar");
const percent = document.getElementById("overall-percent");
if (overall && percent) percent.textContent = (Number(overall.dataset.progress) || 0) + "%";
document.querySelectorAll(".road-item").forEach(item => {
  const bar = item.querySelector("[data-progress]");
  const label = item.querySelector(".road-bar b");
  if (bar && label) label.textContent = (Number(bar.dataset.progress) || 0) + "%";
});