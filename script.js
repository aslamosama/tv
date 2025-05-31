document.addEventListener("DOMContentLoaded", function () {
  const mediaContainer = document.getElementById("media-container");
  const modal = document.getElementById("media-modal");
  const modalImage = document.getElementById("modal-image");
  const modalTitle = document.getElementById("modal-title");
  const modalRating = document.getElementById("modal-rating");
  const modalDirector = document.getElementById("modal-director");
  const modalCast = document.getElementById("modal-cast");
  const modalDescription = document.getElementById("modal-description");
  const modalClose = document.getElementById("modal-close");

  let mediaData = {};
  let activeTab = "movies"; // Default tab

  function loadMedia(jsonFile, type) {
    fetch(jsonFile)
      .then(response => response.json())
      .then(data => {
        const mediaArray = Object.entries(data).map(([title, details]) => ({ title, ...details }));
        mediaData[type] = mediaArray;
        if (activeTab === type) renderMedia(type);
      })
      .catch(error => console.error(`Error loading ${jsonFile}:`, error));
  }

  function renderMedia(type) {
    mediaContainer.innerHTML = mediaData[type].map(media => `
<div class="media-card" data-title="${media.title}">
<div class="media-image">
<img src="${media.cover}" alt="${media.title} Cover">
</div>
<div class="media-title">${media.title} (${media.year})</div>
<div class="media-rating">${media.rating}/100</div>
</div>
`).join("");

    document.querySelectorAll(".media-card").forEach(card => {
      card.addEventListener("click", function () {
        const selectedMedia = mediaData[type].find(m => m.title === card.dataset.title);
        if (!selectedMedia) return;
        showModal(selectedMedia);
      });
    });
  }

  function showModal(media) {
    modalImage.src = media.cover || "";
    modalTitle.textContent = `${media.title} (${media.year})`;
    modalRating.textContent = `⭐ Rating: ${media.rating}/100`;

    modalDirector.textContent = media.director ? `🎬 Director: ${media.director}` : "";
    modalDirector.style.display = media.director ? "block" : "none";

    modalCast.textContent = media.cast.length > 0 ? `🎭 Cast: ${media.cast.join(", ")}` : "";
    modalDescription.textContent = media.description || "No description available.";

    modal.style.display = "flex";
  }

  modalClose.addEventListener("click", () => { modal.style.display = "none"; });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.style.display = "none";
  });

  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", function () {
      document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
      this.classList.add("active");
      activeTab = this.dataset.type;
      renderMedia(activeTab);
    });
  });

  loadMedia("movies.json", "movies");
  loadMedia("series.json", "series");
});
