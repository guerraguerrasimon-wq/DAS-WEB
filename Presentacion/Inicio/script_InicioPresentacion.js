/* Carrusel del hero de Inicio */
const heroSection = document.querySelector(".hero");
const slides = [...document.querySelectorAll(".hero-slide")];
const dotsBox = document.querySelector(".hero-dots");
let current = 0;
let timer = null;

const dots = slides.map((_, i) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("role", "tab");
  dot.setAttribute("aria-label", `Ir a la diapositiva ${i + 1}`);
  dot.addEventListener("click", () => { goTo(i); startAutoplay(); });
  dotsBox.appendChild(dot);
  return dot;
});

function goTo(index) {
  current = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => {
    const active = i === current;
    slide.classList.toggle("is-active", active);
    slide.inert = !active;
    slide.setAttribute("aria-hidden", String(!active));
  });
  dots.forEach((dot, i) => dot.setAttribute("aria-selected", String(i === current)));
}
function startAutoplay() {
  stopAutoplay();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  timer = setInterval(() => goTo(current + 1), 8000);
}
function stopAutoplay() { clearInterval(timer); timer = null; }

document.querySelector(".hero-prev").addEventListener("click", () => { goTo(current - 1); startAutoplay(); });
document.querySelector(".hero-next").addEventListener("click", () => { goTo(current + 1); startAutoplay(); });
heroSection.addEventListener("mouseenter", stopAutoplay);
heroSection.addEventListener("mouseleave", startAutoplay);
heroSection.addEventListener("focusin", stopAutoplay);
heroSection.addEventListener("focusout", startAutoplay);

goTo(0);
startAutoplay();