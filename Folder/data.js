/* data.js
   Responsible for loading and parsing movie and rating data from local files:
   - u.item  -> movies metadata
   - u.data  -> user ratings
   Exposes global variables:
     let movies = []
     let ratings = []
   and functions:
     async function loadData()
     function parseItemData(text)
     function parseRatingData(text)
*/

/* Global containers */
let movies = [];
let ratings = [];

/**
 * parseItemData(text)
 * - text: raw contents of u.item
 * - populates the global `movies` array with objects:
 *     { id: Number, title: String, genres: Array<String> }
 *
 * Note: the function expects the genre flag columns to match the
 *       length of the `genreNames` array. It will slice the last
 *       N fields from each line, where N = genreNames.length.
 */
function parseItemData(text) {
  // Genre names from "Action" to "Western" (18 items)
  const genreNames = [
    "Action",
    "Adventure",
    "Animation",
    "Children's",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Fantasy",
    "Film-Noir",
    "Horror",
    "Musical",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Thriller",
    "War",
    "Western"
  ];

  movies = []; // reset if re-parsing

  // Split into lines
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;

    // Each record in u.item is 'id|title|release_date|...|genre_flags...'
    const parts = line.split("|");

    // Guard: need at least id and title
    if (parts.length < 2) continue;

    const id = parseInt(parts[0], 10);
    const title = parts[1].trim();

    // The flag columns are assumed to be the last genreNames.length columns.
    const flagsStartIndex = Math.max(0, parts.length - genreNames.length);
    const flags = parts.slice(flagsStartIndex);

    const genres = [];
    for (let i = 0; i < genreNames.length; i++) {
      const flag = flags[i] !== undefined ? flags[i].trim() : "0";
      if (flag === "1") {
        genres.push(genreNames[i]);
      }
    }

    movies.push({ id, title, genres });
  }
}

/**
 * parseRatingData(text)
 * - text: raw contents of u.data
 * - populates global `ratings` array with objects:
 *     { userId: Number, itemId: Number, rating: Number, timestamp: Number }
 */
function parseRatingData(text) {
  ratings = []; // reset

  // u.data lines are normally tab-separated: userId \t itemId \t rating \t timestamp
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;

    const parts = line.split("\t");
    if (parts.length < 4) continue;

    const userId = parseInt(parts[0], 10);
    const itemId = parseInt(parts[1], 10);
    const rating = parseInt(parts[2], 10);
    const timestamp = parseInt(parts[3], 10);

    ratings.push({ userId, itemId, rating, timestamp });
  }
}

/**
 * loadData()
 * - loads u.item and u.data using fetch()
 * - calls parseItemData and parseRatingData
 * - displays an error message in #result if something goes wrong
 */
async function loadData() {
  // Try to find the result paragraph to show any errors
  const resultEl = (typeof document !== "undefined") ? document.getElementById("result") : null;

  try {
    // Load items file
    const itemsResp = await fetch("u.item");
    if (!itemsResp.ok) {
      const msg = `Failed to load u.item (HTTP ${itemsResp.status})`;
      if (resultEl) resultEl.innerText = msg;
      throw new Error(msg);
    }
    const itemsText = await itemsResp.text();
    parseItemData(itemsText);

    // Load ratings file
    const ratingsResp = await fetch("u.data");
    if (!ratingsResp.ok) {
      const msg = `Failed to load u.data (HTTP ${ratingsResp.status})`;
      if (resultEl) resultEl.innerText = msg;
      throw new Error(msg);
    }
    const ratingsText = await ratingsResp.text();
    parseRatingData(ratingsText);

    // If we reach here, data was loaded successfully.
    return;
  } catch (err) {
    console.error("loadData error:", err);
    if (resultEl && !resultEl.innerText) {
      resultEl.innerText = `Error loading data: ${err.message}`;
    } else if (resultEl) {
      // If resultEl already had a message, append additional info
      resultEl.innerText = `Error loading data: ${err.message}`;
    }
    // Re-throw to let caller optionally handle
    throw err;
  }
}
