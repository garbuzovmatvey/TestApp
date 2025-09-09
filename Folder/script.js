/* script.js
   UI and recommendation logic. Depends on data.js (movies, ratings, loadData, parse functions)
*/

/* Helper: get DOM elements used frequently */
const selectEl = () => document.getElementById("movie-select");
const resultEl = () => document.getElementById("result");

/**
 * populateMoviesDropdown()
 * - Sorts movies alphabetically by title (case-insensitive)
 * - Creates <option> elements and appends them to the #movie-select element
 */
function populateMoviesDropdown() {
  const sel = selectEl();
  if (!sel) return;

  // Clear any existing options
  sel.innerHTML = "";

  // Defensive: if movies is not populated
  if (!Array.isArray(movies) || movies.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.innerText = "No movies loaded";
    sel.appendChild(opt);
    return;
  }

  // Sort movies by title (case-insensitive)
  const sorted = movies.slice().sort((a, b) => {
    const ta = (a.title || "").toLowerCase();
    const tb = (b.title || "").toLowerCase();
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return 0;
  });

  // Add a default placeholder option
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.innerText = "-- Select a movie --";
  placeholder.selected = true;
  placeholder.disabled = true;
  sel.appendChild(placeholder);

  // Populate options
  for (const movie of sorted) {
    const option = document.createElement("option");
    option.value = String(movie.id);
    option.innerText = movie.title;
    sel.appendChild(option);
  }
}

/**
 * computeJaccard(setA, setB)
 * - setA, setB: JavaScript Set objects containing strings (genres)
 * - returns a number between 0 and 1
 */
function computeJaccard(setA, setB) {
  if (!(setA instanceof Set) || !(setB instanceof Set)) return 0;

  // If both empty, define similarity as 0 (no genre info)
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }
  const unionCount = new Set([...setA, ...setB]).size;
  if (unionCount === 0) return 0;
  return intersectionCount / unionCount;
}

/**
 * getRecommendations()
 * Main function invoked by the "Get Recommendations" button.
 *
 * Steps:
 * 1. Read selected movie id from #movie-select
 * 2. Find likedMovie in global movies
 * 3. Build candidate list (exclude liked movie)
 * 4. Compute Jaccard similarity on genres
 * 5. Sort descending by score
 * 6. Take top 2
 * 7. Display result text in #result
 */
function getRecommendations() {
  const result = resultEl();
  if (!result) return;

  try {
    const sel = selectEl();
    if (!sel) {
      result.innerText = "Internal error: movie select not found.";
      return;
    }

    const selectedValue = sel.value;
    if (!selectedValue) {
      result.innerText = "Please select a movie first.";
      return;
    }

    const selectedId = parseInt(selectedValue, 10);
    if (Number.isNaN(selectedId)) {
      result.innerText = "Invalid movie selection.";
      return;
    }

    // Step 2: find liked movie
    const likedMovie = movies.find(m => m.id === selectedId);
    if (!likedMovie) {
      result.innerText = "Selected movie not found in dataset.";
      return;
    }

    // Step 3: prepare for similarity
    const likedGenresSet = new Set(likedMovie.genres || []);
    const candidateMovies = movies.filter(m => m.id !== likedMovie.id);

    // Step 4: calculate scores
    const scoredMovies = candidateMovies.map(candidate => {
      const candSet = new Set(candidate.genres || []);
      const score = computeJaccard(likedGenresSet, candSet);
      return { ...candidate, score };
    });

    // Step 5: sort by score descending (tie-breaker by title)
    scoredMovies.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // stable tie-breaker: alphabetical title
      const ta = (a.title || "").toLowerCase();
      const tb = (b.title || "").toLowerCase();
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });

    // Step 6: take top two
    const top = scoredMovies.slice(0, 2).filter(m => m.score > 0);

    // Step 7: display result
    if (top.length === 0) {
      result.innerText = `Because you liked "${likedMovie.title}", we couldn't find very similar movies based on genre alone. Try another selection.`;
    } else if (top.length === 1) {
      result.innerText = `Because you liked "${likedMovie.title}", we recommend: ${top[0].title} (score: ${top[0].score.toFixed(2)})`;
    } else {
      result.innerText = `Because you liked "${likedMovie.title}", we recommend: ${top[0].title} (score: ${top[0].score.toFixed(2)}), ${top[1].title} (score: ${top[1].score.toFixed(2)})`;
    }
  } catch (err) {
    console.error("getRecommendations error:", err);
    resultEl().innerText = `Error computing recommendations: ${err.message}`;
  }
}

/* Initialization: load data, populate dropdown, set initial message */
window.onload = async function () {
  const result = resultEl();
  if (result) result.innerText = "Loading data...";

  try {
    await loadData(); // from data.js
    populateMoviesDropdown();
    if (result) result.innerText = "Data loaded. Please select a movie.";
  } catch (err) {
    // loadData already writes to result, but ensure message present
    if (result && !result.innerText) {
      result.innerText = `Error loading data: ${err.message}`;
    }
  }
};
