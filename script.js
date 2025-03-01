document.addEventListener("DOMContentLoaded", function () {
    const moviesContainer = document.getElementById("movies");
    const modal = document.getElementById("movie-modal");
    const modalImage = document.getElementById("modal-image");
    const modalTitle = document.getElementById("modal-title");
    const modalRating = document.getElementById("modal-rating");
    const modalDirector = document.getElementById("modal-director");
    const modalCast = document.getElementById("modal-cast");
    const modalDescription = document.getElementById("modal-description");
    const modalClose = document.getElementById("modal-close");

    // Fetch Movies
    fetch("movies.json")
        .then(response => response.json())
        .then(data => {
            const moviesArray = Object.entries(data)
                .map(([title, details]) => ({ title, ...details }))
                .sort((a, b) => b.rating - a.rating);

            moviesContainer.innerHTML = moviesArray.map(movie => `
                <div class="movie-card" data-title="${movie.title}">
                    <div class="movie-image">
                        ${movie.cover ? `<img src="${movie.cover}" alt="${movie.title} Cover" style="width:100%; height:auto; border-radius: 8px;">` : "No Cover Yet"}
                    </div>
                    <div class="movie-title">${movie.title} (${movie.year})</div>
                    <div class="movie-rating">⭐ ${movie.rating}/100</div>
                </div>
            `).join("");

            // Add Click Event to Each Movie Card
            document.querySelectorAll(".movie-card").forEach(card => {
                card.addEventListener("click", function () {
                    const movie = moviesArray.find(m => m.title === card.dataset.title);
                    if (!movie) return;

                    // Populate Modal with Movie Details
                    modalImage.src = movie.cover || "";
                    modalTitle.textContent = `${movie.title} (${movie.year})`;
                    modalRating.textContent = `⭐ Rating: ${movie.rating}/100`;
                    modalDirector.textContent = `🎬 Director: ${movie.director}`;
                    modalCast.textContent = `🎭 Cast: ${movie.cast.join(", ")}`;
                    modalDescription.textContent = movie.description;

                    // Show Modal
                    modal.style.display = "flex";
                });
            });

            // Close Modal on Click
            modalClose.addEventListener("click", () => { modal.style.display = "none"; });

            // Close Modal When Clicking Outside Content
            modal.addEventListener("click", (event) => {
                if (event.target === modal) {
                    modal.style.display = "none";
                }
            });
        })
        .catch(error => console.error("Error loading movies:", error));
});
