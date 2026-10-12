/* Blog: filtro de artículos por categoría */
const chips = document.querySelectorAll(".chip");
const posts = document.querySelectorAll(".post-card");

chips.forEach(chip => chip.addEventListener("click", () => {
  chips.forEach(c => c.setAttribute("aria-pressed", String(c === chip)));
  const filter = chip.dataset.filter;
  posts.forEach(post => { post.hidden = filter !== "todos" && post.dataset.tag !== filter; });
}));