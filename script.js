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
      modalGenre: document.getElementById("modal-genre"),
      modalLanguage: document.getElementById("modal-language"),
      modalDuration: document.getElementById("modal-duration"),
      modalAvgDuration: document.getElementById("modal-avg-duration"),
      modalEpisodes: document.getElementById("modal-episodes"),
      modalDescription: document.getElementById("modal-description"),
      modalClose: document.getElementById("modal-close"),
      searchBar: document.getElementById("search-bar"),
      sortBy: document.getElementById("sort-by"),
      sortAsc: document.getElementById("sort-asc"),
      sortDesc: document.getElementById("sort-desc"),
      tabButtons: document.querySelectorAll(".tab-button"),
      genreFilter: document.getElementById("genre-filter"),
    },
    sortOrder: "asc",

    init() {
      this.sortOrder = "asc";
      this.activeSort = "rating";

      this.loadAllMedia();
      this.addEventListeners();

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

        this.populateGenreFilter();
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
      const resultsCount = document.getElementById("results-count");

      if (resultsCount) {
        resultsCount.textContent = `${mediaToRender.length} result${
          mediaToRender.length !== 1 ? "s" : ""
        }`;
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
      let sortOrder = this.sortOrder;

      if (!sortOrder) {
        sortOrder = sortBy === "title" ? "asc" : "desc";
      }

      if (selectedGenre && selectedGenre !== "all") {
        const gLower = selectedGenre.toLowerCase();
        media = media.filter(
          (item) =>
            Array.isArray(item.genres) &&
            item.genres.some((g) => String(g).toLowerCase() === gLower),
        );
      }

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

      media.sort((a, b) => {
        if (sortBy === "title") {
          const cmp = (a.title || "").localeCompare(b.title || "");
          return sortOrder === "asc" ? cmp : -cmp;
        }
        if (sortBy === "duration") {
          const aDuration = a.duration || a.total_duration || 0;
          const bDuration = b.duration || b.total_duration || 0;
          return sortOrder === "asc"
            ? aDuration - bDuration
            : bDuration - aDuration;
        }
        const av = Number(a[sortBy] ?? 0);
        const bv = Number(b[sortBy] ?? 0);
        return sortOrder === "asc" ? av - bv : bv - av;
      });

      return media;
    },

    calculateAnalysisData() {
      const personMap = {};
      const genreMap = {};

      this.mediaData.all.forEach((item) => {
        const rating =
          typeof item.rating === "number"
            ? item.rating
            : Number(item.rating) || 0;

        if (item.director) {
          const name = item.director.trim();
          if (!personMap[name]) {
            personMap[name] = {
              name,
              appearancesByRole: {
                director: 0,
                actor: 0,
              },
              totalRatingByRole: {
                director: 0,
                actor: 0,
              },
            };
          }
          personMap[name].appearancesByRole.director++;
          personMap[name].totalRatingByRole.director += rating;
        }

        if (Array.isArray(item.cast) && item.cast.length) {
          const seen = new Set();
          item.cast.forEach((rawActor) => {
            const actor = rawActor.trim();
            if (!actor || seen.has(actor)) return;
            seen.add(actor);

            if (!personMap[actor]) {
              personMap[actor] = {
                name: actor,
                appearancesByRole: {
                  director: 0,
                  actor: 0,
                },
                totalRatingByRole: {
                  director: 0,
                  actor: 0,
                },
              };
            }
            personMap[actor].appearancesByRole.actor++;
            personMap[actor].totalRatingByRole.actor += rating;
          });
        }

        if (Array.isArray(item.genres)) {
          item.genres.forEach((genre) => {
            const g = genre.trim();
            if (!g) return;
            if (!genreMap[g]) genreMap[g] = 0;
            genreMap[g]++;
          });
        }
      });

      const globalRatings = this.mediaData.all.map((item) => item.rating);
      const globalAverage =
        globalRatings.reduce((a, b) => a + b, 0) / globalRatings.length;
      const m = 5;

      const buildList = (role) => {
        return Object.values(personMap)
          .filter((p) => p.appearancesByRole[role] > 0)
          .map((p) => {
            const appearances = p.appearancesByRole[role];
            const totalRating = p.totalRatingByRole[role];
            const avgRating = totalRating / appearances;
            const bayesian =
              (avgRating * appearances + globalAverage * m) / (appearances + m);
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
          .slice(0, 10);
      };

      const genres = Object.entries(genreMap)
        .map(([genre, count]) => ({
          genre,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const languageMap = {};
      this.mediaData.all.forEach((item) => {
        if (Array.isArray(item.language)) {
          item.language.forEach((lang) => {
            const l = lang.trim();
            if (!l) return;
            if (!languageMap[l]) languageMap[l] = 0;
            languageMap[l]++;
          });
        }
      });

      const languages = Object.entries(languageMap)
        .map(([language, count]) => ({
          language,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        directors: buildList("director"),
        actors: buildList("actor"),
        genres,
        languages,
      };
    },

    renderAnalysis() {
      const { directors, actors, genres, languages } =
        this.calculateAnalysisData();
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

      const createCountChartHTML = (title, data, total, propertyName) => {
        const maxCount = data[0]?.count || 1;
        return `
          <div class="chart-container">
            <h2 class="chart-title">${title}</h2>
            <div class="chart">
              ${data
                .map((item) => {
                  const width = (item.count / maxCount) * 100;
                  const percent = ((item.count / total) * 100).toFixed(1);
                  return `
                    <div class="chart-bar">
                      <div class="chart-label">${item[propertyName]}</div>
                      <div class="chart-value" style="width:${width}%;">
                        <span>${item.count} (${percent}%)</span>
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
      const totalMovieDuration = this.mediaData.movies.reduce(
        (sum, movie) => sum + (movie.duration || 0),
        0,
      );
      const totalSeriesDuration = this.mediaData.series.reduce(
        (sum, series) => sum + (series.total_duration || 0),
        0,
      );
      const combinedDuration = totalMovieDuration + totalSeriesDuration;

      this.elements.analysisContainer.innerHTML = `
        <div class="totals-container chart-container">
          <p class="totals-line">
            <span class="totals-label">Movies:</span>
            <span class="totals-value">${
              this.mediaData.movies.length
            } (${this.formatDuration(totalMovieDuration)})</span>
          </p>
          <p class="totals-line">
            <span class="totals-label">Series:</span>
            <span class="totals-value">${
              this.mediaData.series.length
            } (${this.formatDuration(totalSeriesDuration)})</span>
          </p>
          <p class="totals-line">
            <span class="totals-label">Total Duration:</span>
            <span class="totals-value">${this.formatDuration(
              combinedDuration,
            )}</span>
          </p>
        </div>

        ${createChartHTML("Top 10 Directors", directors, maxDirectorScore)}
        ${createChartHTML("Top 10 Actors", actors, maxActorScore)}
        ${createCountChartHTML(
          "Top 10 Genres",
          genres,
          this.mediaData.all.length,
          "genre",
        )}
        ${createCountChartHTML(
          "Top 10 Languages",
          languages,
          this.mediaData.all.length,
          "language",
        )}

        <div class="explanation">
          <h2>How the Rankings Work</h2>
          <p>
            The ranking for <strong>directors and actors</strong> balances <strong>quality</strong> (average rating) with
            <strong>quantity</strong> (number of appearances). The goals of this ranking method are:
          </p>
          <ul>
            <li>High averages + frequent contributions = top rank</li>
            <li>One-off masterpieces shouldn't dominate</li>
            <li>Prolific mediocrity should be capped</li>
          </ul>
          <p>
            The rankings for <strong>genres and languages</strong> are simpler, based directly on the number and percentage of appearances in the library.
          </p>

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

    formatDuration(minutes) {
      if (!minutes || minutes <= 0) {
        return "";
      }
      const d = Math.floor(minutes / (24 * 60));
      const h = Math.floor((minutes % (24 * 60)) / 60);
      const m = minutes % 60;
      const parts = [];

      if (d > 0) {
        parts.push(`${d} day${d > 1 ? "s" : ""}`);
      }
      if (h > 0) {
        parts.push(`${h} hour${h > 1 ? "s" : ""}`);
      }
      if (m > 0) {
        parts.push(`${m} min${m > 1 ? "s" : ""}`);
      }

      return parts.join(", ");
    },

    showModal(media) {
      this.elements.modalImage.src = media.cover || "";
      this.elements.modalTitle.textContent = `${media.title} (${media.year})`;
      this.elements.modalRating.innerHTML =
        media.rating !== undefined
          ? `<span class="modal-label">Rating:</span> <span class="modal-value">${media.rating}</span>`
          : "";
      this.elements.modalGenre.innerHTML =
        media.genres && media.genres.length > 0
          ? `<span class="modal-label">Genre:</span> <span class="modal-value">${media.genres.join(
              ", ",
            )}</span>`
          : "";
      this.elements.modalDirector.innerHTML = media.director
        ? `<span class="modal-label">Director:</span> <span class="modal-value">${media.director}</span>`
        : "";
      this.elements.modalCast.classList.add("modal-info", "cast");
      this.elements.modalCast.innerHTML =
        media.cast && media.cast.length > 0
          ? `<span class="modal-label">Cast:</span> <span class="modal-value">${media.cast.join(
              ", ",
            )}</span>`
          : "";
      this.elements.modalLanguage.innerHTML =
        media.language && media.language.length > 0
          ? `<span class="modal-label">Language:</span> <span class="modal-value">${
              Array.isArray(media.language)
                ? media.language.join(", ")
                : media.language
            }</span>`
          : "";

      const totalDuration = media.duration || media.total_duration;
      if (totalDuration) {
        this.elements.modalDuration.innerHTML = `<span class="modal-label">Duration:</span> <span class="modal-value">${this.formatDuration(
          totalDuration,
        )}</span>`;
        this.elements.modalDuration.style.display = "block";
      } else {
        this.elements.modalDuration.style.display = "none";
      }

      if (media.total_episodes) {
        this.elements.modalEpisodes.innerHTML = `<span class="modal-label">Episodes:</span> <span class="modal-value">${media.total_episodes}</span>`;
        this.elements.modalEpisodes.style.display = "block";
        this.elements.modalAvgDuration.innerHTML = `<span class="modal-label">Avg Duration:</span> <span class="modal-value">${this.formatDuration(
          media.avg_episode_duration,
        )}</span>`;
        this.elements.modalAvgDuration.style.display = "block";
      } else {
        this.elements.modalEpisodes.style.display = "none";
        this.elements.modalAvgDuration.style.display = "none";
      }

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
        if (loader) {
          loader.remove();
        }
      }
    },

    highlightSortIcon(order) {
      this.elements.sortAsc.classList.toggle("active", order === "asc");
      this.elements.sortDesc.classList.toggle("active", order === "desc");
    },

    addEventListeners() {
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

      this.elements.mediaContainer.addEventListener("click", (event) => {
        const card = event.target.closest(".media-card");
        if (card) {
          const title = card.dataset.title;
          const mediaList =
            this.activeTab === "movies"
              ? this.mediaData.movies
              : this.mediaData.series;
          const selectedMedia = mediaList.find((m) => m.title === title);
          if (selectedMedia) {
            this.showModal(selectedMedia);
          }
        }
      });

      this.elements.modalClose.addEventListener("click", () =>
        this.closeModal(),
      );
      this.elements.modal.addEventListener("click", (event) => {
        if (event.target === this.elements.modal) {
          this.closeModal();
        }
      });

      this.elements.searchBar.addEventListener("input", () =>
        this.renderMedia(),
      );

      this.elements.sortBy.addEventListener("change", () => {
        this.activeSort = this.elements.sortBy.value;
        this.updateSortDefaults();
        this.renderMedia();
      });

      this.elements.sortAsc = document.getElementById("sort-asc");
      this.elements.sortDesc = document.getElementById("sort-desc");
      [this.elements.sortAsc, this.elements.sortDesc].forEach((btn) => {
        btn.addEventListener("click", () => {
          this.sortOrder = btn.dataset.order;
          this.elements.sortAsc.classList.remove("active");
          this.elements.sortDesc.classList.remove("active");
          btn.classList.add("active");
          this.renderMedia();
        });
      });
      this.elements.genreFilter.addEventListener("change", () =>
        this.renderMedia(),
      );
    },

    updateSortDefaults() {
      if (this.activeSort === "title") {
        this.sortOrder = "asc";
      } else {
        this.sortOrder = "desc";
      }
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
