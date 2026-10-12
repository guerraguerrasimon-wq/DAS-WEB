/* Cursos: búsqueda por nombre de ruta o de curso. */
const searchForm = document.getElementById("course-search");
const searchInput = document.getElementById("course-q");
const cards = [...document.querySelectorAll(".cat-card")];
const noResults = document.getElementById("no-results");

searchForm.addEventListener("submit", event => event.preventDefault());
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const match = !q || card.textContent.toLowerCase().includes(q);
    card.hidden = !match;
    if (match) visible++;
  });
  noResults.hidden = visible !== 0;
});