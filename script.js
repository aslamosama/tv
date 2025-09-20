document.addEventListener("DOMContentLoaded", () => {
  const app = {
    mediaData: {
      movies: [],
      series: [],
      all: [],
    },
    activeTab: "movies",
    elements: {
      mediaContainer: document.getElementById("media-container"),
      analysisContainer: document.getElementById("analysis-container"),
      modal: document.getElementById("media-modal"),
      modalImage: document.getElementById("modal-image"),
      modalTitle: document.getElementById("modal-title"),
      modalRating: document.getElementById("modal-rating"),
      modalDirector: document.getElementById("modal-director"),
      modalCast: document.getElementById("modal-cast"),
      modalDescription: document.getElementById("modal-description"),
      modalClose: document.getElementById("modal-close"),
      searchBar: document.getElementById("search-bar"),
      sortBy: document.getElementById("sort-by"),
      sortAsc: document.getElementById("sort-asc"),
      sortDesc: document.getElementById("sort-desc"),
      tabButtons: document.querySelectorAll(".tab-button"),
      genreFilter: document.getElementById("genre-filter"),
    },
    sortOrder: "asc", // <--- new state

    init() {
      // defaults
      this.sortOrder = "asc"; // fallback
      this.activeSort = "rating"; // default field

      this.loadAllMedia();
      this.addEventListeners();

      // initialize default sort states
      this.elements.sortBy.value = this.activeSort;
      this.updateSortDefaults();
    },

    async loadAllMedia() {
      this.showLoading(true);
      try {
        const [movies, series] = await Promise.all([
          this.fetchMedia("movies.json"),
          this.fetchMedia("series.json"),
        ]);
        this.mediaData.movies = movies;
        this.mediaData.series = series;
        this.mediaData.all = [...movies, ...series];

        this.populateGenreFilter(); // <--- populate genres
        this.updateView();
      } catch (error) {
        this.elements.mediaContainer.innerHTML =
          "<p>Error loading data. Please try again later.</p>";
        console.error("Error loading media data:", error);
      } finally {
        this.showLoading(false);
      }
    },

    async fetchMedia(jsonFile) {
      const response = await fetch(jsonFile);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },

    populateGenreFilter() {
      const genreSelect = this.elements.genreFilter;
      const genres = new Set();

      this.mediaData.all.forEach((item) => {
        if (Array.isArray(item.genres)) {
          item.genres.forEach((g) => genres.add(g));
        }
      });

      // Reset existing options (keep "All")
      genreSelect.innerHTML = `<option value="all">All</option>`;

      Array.from(genres)
        .sort()
        .forEach((genre) => {
          const option = document.createElement("option");
          option.value = genre;
          option.textContent = genre;
          genreSelect.appendChild(option);
        });
    },

    updateView() {
      if (this.activeTab === "analysis") {
        document.getElementById("results-count").style.display = "none";
        document.body.classList.add("analysis-mode");
        this.elements.mediaContainer.style.display = "none";
        this.elements.analysisContainer.style.display = "block";
        this.renderAnalysis();
      } else {
        document.body.classList.remove("analysis-mode");
        this.elements.mediaContainer.style.display = "grid";
        this.elements.analysisContainer.style.display = "none";
        this.renderMedia();
      }
    },

    renderMedia() {
      const mediaToRender = this.getFilteredAndSortedMedia();

      // Update count text
      const resultsCount = document.getElementById("results-count");
      if (resultsCount) {
        // resultsCount.textContent = `${mediaToRender.length} ${
        //   this.activeTab === "movies" ? "Movies" : "Series"
        // } found`;
        resultsCount.textContent = `${mediaToRender.length} result${mediaToRender.length !== 1 ? "s" : ""}`;
        resultsCount.style.display = "block";
      }

      this.elements.mediaContainer.innerHTML = mediaToRender
        .map(
          (media) => `
                <article class="media-card" data-title="${media.title}">
                    <div class="media-image">
                        <img src="${media.cover}" alt="${media.title} Cover" loading="lazy">
                        <div class="media-rating-badge">${media.rating}</div>
                    </div>
                    <div class="media-info">
                        <h3 class="media-title">${media.title}</h3>
                    </div>
                </article>
            `,
        )
        .join("");
    },

    getFilteredAndSortedMedia() {
      let media = [...this.mediaData[this.activeTab]];
      const searchTerm = (this.elements.searchBar?.value || "")
        .toLowerCase()
        .trim();
      const sortBy = this.elements.sortBy?.value || "title";
      const selectedGenre = this.elements.genreFilter?.value || "all";

      // default sort order if not explicitly set
      let sortOrder = this.sortOrder;
      if (!sortOrder) sortOrder = sortBy === "title" ? "asc" : "desc";

      // Genre filter (single-select, case-insensitive)
      if (selectedGenre && selectedGenre !== "all") {
        const gLower = selectedGenre.toLowerCase();
        media = media.filter(
          (item) =>
            Array.isArray(item.genres) &&
            item.genres.some((g) => String(g).toLowerCase() === gLower),
        );
      }

      // Search filter (title, director, cast)
      if (searchTerm) {
        media = media.filter((item) => {
          const titleMatch = (item.title || "")
            .toLowerCase()
            .includes(searchTerm);
          const directorMatch = (item.director || "")
            .toLowerCase()
            .includes(searchTerm);
          const castMatch =
            Array.isArray(item.cast) &&
            item.cast.some((actor) =>
              String(actor).toLowerCase().includes(searchTerm),
            );
          return titleMatch || directorMatch || castMatch;
        });
      }

      // Sorting
      media.sort((a, b) => {
        if (sortBy === "title") {
          const cmp = (a.title || "").localeCompare(b.title || "");
          return sortOrder === "asc" ? cmp : -cmp;
        }
        // numeric-safe sort for rating/year
        const av = Number(a[sortBy] ?? 0);
        const bv = Number(b[sortBy] ?? 0);
        return sortOrder === "asc" ? av - bv : bv - av;
      });

      return media;
    },

    // --- existing calculateAnalysisData + renderAnalysis unchanged ---
    calculateAnalysisData() {
      const personMap = {};
      const genreMap = {};

      this.mediaData.all.forEach((item) => {
        const rating =
          typeof item.rating === "number"
            ? item.rating
            : Number(item.rating) || 0;

        // ===== Directors =====
        if (item.director) {
          const name = item.director.trim();
          if (!personMap[name]) {
            personMap[name] = {
              name,
              appearancesByRole: { director: 0, actor: 0 },
              totalRatingByRole: { director: 0, actor: 0 },
            };
          }
          personMap[name].appearancesByRole.director++;
          personMap[name].totalRatingByRole.director += rating;
        }

        // ===== Actors =====
        if (Array.isArray(item.cast) && item.cast.length) {
          const seen = new Set();
          item.cast.forEach((rawActor) => {
            const actor = rawActor.trim();
            if (!actor || seen.has(actor)) return;
            seen.add(actor);

            if (!personMap[actor]) {
              personMap[actor] = {
                name: actor,
                appearancesByRole: { director: 0, actor: 0 },
                totalRatingByRole: { director: 0, actor: 0 },
              };
            }
            personMap[actor].appearancesByRole.actor++;
            personMap[actor].totalRatingByRole.actor += rating;
          });
        }

        // ===== Genres =====
        if (Array.isArray(item.genres)) {
          item.genres.forEach((genre) => {
            const g = genre.trim();
            if (!g) return;
            if (!genreMap[g]) genreMap[g] = 0;
            genreMap[g]++;
          });
        }
      });

      // Global rating baseline
      const globalRatings = this.mediaData.all.map((item) => item.rating);
      const globalAverage =
        globalRatings.reduce((a, b) => a + b, 0) / globalRatings.length;
      const m = 5; // shrinkage constant

      const buildList = (role) => {
        return Object.values(personMap)
          .filter((p) => p.appearancesByRole[role] > 0)
          .map((p) => {
            const appearances = p.appearancesByRole[role];
            const totalRating = p.totalRatingByRole[role];
            const avgRating = totalRating / appearances;

            // Bayesian shrinkage
            const bayesian =
              (avgRating * appearances + globalAverage * m) / (appearances + m);

            // Frequency multiplier capped at 2.0
            const multiplier = Math.min(Math.pow(appearances, 0.2), 2.0);
            const adjustedScore = bayesian * multiplier;

            return {
              name: p.name,
              appearances,
              averageRating: avgRating.toFixed(1),
              adjustedScore: adjustedScore.toFixed(2),
            };
          })
          .sort((a, b) => b.adjustedScore - a.adjustedScore)
          .slice(0, 15);
      };

      // Genre list sorted by count, top 10
      const genres = Object.entries(genreMap)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      return {
        directors: buildList("director"),
        actors: buildList("actor"),
        genres,
      };
    },

    renderAnalysis() {
      const { directors, actors, genres } = this.calculateAnalysisData();

      // tweakable exponent: >1 exaggerates gaps, <1 compresses
      const exponent = 3;

      const createChartHTML = (title, data, maxScore) => `
        <div class="chart-container">
            <h2 class="chart-title">${title}</h2>
            <div class="chart">
                ${data
                  .map((person) => {
                    const ratio = person.adjustedScore / maxScore;
                    const width = Math.pow(ratio, exponent) * 100;
                    return `
                        <div class="chart-bar">
                            <div class="chart-label">${person.name}</div>
                            <div class="chart-value" style="width:${width}%;">
                                <span>Appearances: ${person.appearances} | Avg Rating: ${person.averageRating}</span>
                            </div>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        </div>
      `;

      // genres don’t need bayesian scores, just counts
      const createGenreChartHTML = (title, data, total) => {
        const maxCount = data[0]?.count || 1;
        return `
          <div class="chart-container">
            <h2 class="chart-title">${title}</h2>
            <div class="chart">
              ${data
                .map((genre) => {
                  const width = (genre.count / maxCount) * 100;
                  const percent = ((genre.count / total) * 100).toFixed(1);
                  return `
                    <div class="chart-bar">
                      <div class="chart-label">${genre.genre}</div>
                      <div class="chart-value" style="width:${width}%;">
                        <span>${genre.count} (${percent}%)</span>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </div>
        `;
      };

      const maxDirectorScore = directors[0]?.adjustedScore || 1;
      const maxActorScore = actors[0]?.adjustedScore || 1;

      this.elements.analysisContainer.innerHTML = `
      <div class="totals-container chart-container">
        <p class="totals-line">
          <span class="totals-label">Movies:</span>
          <span class="totals-value">${this.mediaData.movies.length}</span>
        </p>
        <p class="totals-line">
          <span class="totals-label">Series:</span>
          <span class="totals-value">${this.mediaData.series.length}</span>
        </p>
      </div>

    ${createChartHTML("Top 15 Directors", directors, maxDirectorScore)}
    ${createChartHTML("Top 15 Actors", actors, maxActorScore)}
    ${createGenreChartHTML("Top 15 Genres", genres, this.mediaData.all.length)}

    <div class="explanation">
        <h2>How the Rankings Work</h2>
        <p>
            The ranking balances <strong>quality</strong> (average rating) with
            <strong>quantity</strong> (number of appearances). The goals of the ranking method used are:
        </p>
        <ul>
          <li>High averages + frequent contributions = top rank</li>
          <li>One-off masterpieces shouldn't dominate</li>
          <li>Prolific mediocrity should be capped</li>
        </ul>

        <h3>Bayesian Average</h3>
        <p>
            Each person’s raw average is adjusted toward the global mean
            rating (≈${this.globalAvgRating || "X"}).
            This prevents small sample sizes from dominating.
        </p>
        <pre>
Bayesian Average = (globalAvg * k + personTotal) / (appearances + k)
        </pre>
        <p>
            Where <code>k</code> is a smoothing constant (e.g., 3).
            More appearances → personal average dominates.
            Fewer appearances → global average has more influence.
        </p>

        <h3>Frequency Multiplier</h3>
        <p>
            The Bayesian average is scaled by the number of appearances,
            but capped to avoid unfair dominance.
        </p>
        <pre>
Multiplier = min(appearances^0.2, 2.0)
Adjusted Score = Bayesian Average * Multiplier
        </pre>

        <h3>Visualization Scaling</h3>
        <p>
            To make chart differences easier to see, scores are scaled
            non-linearly:
        </p>
        <pre>
Bar Width = (AdjustedScore / MaxScore)^3 × 100%
        </pre>
        <p>
            This exaggerates the gap between top ranks so that small
            rating differences are visible.
        </p>
    </div>
  `;
    },

    showModal(media) {
      this.elements.modalImage.src = media.cover || "";
      this.elements.modalTitle.textContent = `${media.title} (${media.year})`;
      this.elements.modalRating.innerHTML = `⭐ <strong>Rating:</strong> ${media.rating}/100`;
      this.elements.modalDirector.innerHTML = media.director
        ? `🎬 <strong>Director:</strong> ${media.director}`
        : "";
      this.elements.modalDirector.style.display = media.director
        ? "block"
        : "none";
      this.elements.modalCast.innerHTML =
        media.cast && media.cast.length > 0
          ? `🎭 <strong>Cast:</strong> ${media.cast.join(", ")}`
          : "";
      this.elements.modalDescription.textContent =
        media.description || "No description available.";

      this.elements.modal.classList.add("show");
      this.elements.modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    },

    closeModal() {
      this.elements.modal.classList.remove("show");
      this.elements.modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    },

    showLoading(isLoading) {
      if (isLoading) {
        this.elements.mediaContainer.innerHTML = '<div class="loader"></div>';
      } else {
        const loader = this.elements.mediaContainer.querySelector(".loader");
        if (loader) loader.remove();
      }
    },

    highlightSortIcon(order) {
      this.elements.sortAsc.classList.toggle("active", order === "asc");
      this.elements.sortDesc.classList.toggle("active", order === "desc");
    },

    addEventListeners() {
      // Tab switching
      this.elements.tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          this.elements.tabButtons.forEach((btn) =>
            btn.classList.remove("active"),
          );
          button.classList.add("active");
          this.activeTab = button.dataset.type;
          this.updateView();
        });
      });

      // Card click → modal
      this.elements.mediaContainer.addEventListener("click", (event) => {
        const card = event.target.closest(".media-card");
        if (card) {
          const title = card.dataset.title;
          const mediaList =
            this.activeTab === "movies"
              ? this.mediaData.movies
              : this.mediaData.series;
          const selectedMedia = mediaList.find((m) => m.title === title);
          if (selectedMedia) this.showModal(selectedMedia);
        }
      });

      // Modal close
      this.elements.modalClose.addEventListener("click", () =>
        this.closeModal(),
      );
      this.elements.modal.addEventListener("click", (event) => {
        if (event.target === this.elements.modal) this.closeModal();
      });

      // Search
      this.elements.searchBar.addEventListener("input", () =>
        this.renderMedia(),
      );

      // Sort by (field)
      this.elements.sortBy.addEventListener("change", () => {
        this.activeSort = this.elements.sortBy.value;
        this.updateSortDefaults();
        this.renderMedia();
      });

      // Sort order buttons
      this.elements.sortAsc = document.getElementById("sort-asc");
      this.elements.sortDesc = document.getElementById("sort-desc");

      [this.elements.sortAsc, this.elements.sortDesc].forEach((btn) => {
        btn.addEventListener("click", () => {
          this.sortOrder = btn.dataset.order;

          // update active state
          this.elements.sortAsc.classList.remove("active");
          this.elements.sortDesc.classList.remove("active");
          btn.classList.add("active");

          this.renderMedia();
        });
      });

      // Genre filter
      this.elements.genreFilter.addEventListener("change", () =>
        this.renderMedia(),
      );
    },
    // helper: apply correct default sort order depending on field
    updateSortDefaults() {
      if (this.activeSort === "title") {
        this.sortOrder = "asc";
      } else {
        this.sortOrder = "desc";
      }

      // update active button visuals
      this.elements.sortAsc.classList.remove("active");
      this.elements.sortDesc.classList.remove("active");
      if (this.sortOrder === "asc") {
        this.elements.sortAsc.classList.add("active");
      } else {
        this.elements.sortDesc.classList.add("active");
      }
    },
  };

  app.init();
});
