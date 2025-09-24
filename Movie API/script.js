const API_KEY = '891c39f0';
const API_BASE = 'https://www.omdbapi.com/';

const TOP_MOVIES = [
  'tt0111161', // The Shawshank Redemption (9.3)
  'tt0068646', // The Godfather (9.2)
  'tt0468569', // The Dark Knight (9.0)
  'tt0071562', // The Godfather Part II (9.0)
  'tt0050083', // 12 Angry Men (9.0)
  'tt0108052', // Schindler's List (9.0)
  'tt0167260', // The Lord of the Rings: The Return of the King (9.0)
  'tt0110912', // Pulp Fiction (8.9)
  'tt0060196', // The Good, the Bad and the Ugly (8.8)
  'tt0137523', // Fight Club (8.8)
  'tt0120737', // The Lord of the Rings: The Fellowship of the Ring (8.9)
  'tt0167261', // The Lord of the Rings: The Two Towers (8.8)
  'tt0109830', // Forrest Gump (8.8)
  'tt1375666', // Inception (8.8)
  'tt0080684', // Star Wars: Episode V - The Empire Strikes Back (8.7)
  'tt0099685', // Goodfellas (8.7)
  'tt0073486', // One Flew Over the Cuckoo's Nest (8.7)
  'tt0047478', // Seven Samurai (8.6)
  'tt0114369', // Se7en (8.6)
  'tt0317248', // City of God (8.6)
  'tt0102926', // The Silence of the Lambs (8.6)
];

const state = {
  query: '',   
  page: 1,
  totalResults: 0,
  type: '',
  yearFrom: null,
  yearTo: null,
  sortBy: 'rating',
  isSearchMode: false,
  topMoviesData: [], // cache for top movies
};

// helpers
function qs(selector){ return document.querySelector(selector) }
function qsa(selector){ return document.querySelectorAll(selector) }

// debounce utility
function debounce(fn, wait){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(()=>fn(...args), wait);
  }
}

// OMDb search URL
function buildSearchUrl(search, page=1, type='') {
  const url = new URL(API_BASE);
  url.searchParams.set('apikey', API_KEY);
  url.searchParams.set('s', search);
  url.searchParams.set('page', page);
  if (type) url.searchParams.set('type', type);
  return url.toString();
}

// OMDb detail URL
function buildDetailUrl(imdbID) {
  const url = new URL(API_BASE);
  url.searchParams.set('apikey', API_KEY);
  url.searchParams.set('i', imdbID);
  url.searchParams.set('plot', 'full');
  return url.toString();
}

async function fetchMovies(search, page=1, type='') {
  const url = buildSearchUrl(search, page, type);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error while fetching movies');
  const data = await res.json();
  return data;
}

// fetch detail by imdbID
async function fetchMovieDetails(imdbID) {
  const url = buildDetailUrl(imdbID);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Network error while fetching movie details');
  const data = await res.json();
  return data;
}

// fetch top movies by their IMDb IDs
async function fetchTopMovies() {
  if (state.topMoviesData.length > 0) {
    return state.topMoviesData; // return cached data
  }
  
  try {
    const promises = TOP_MOVIES.map(id => fetchMovieDetails(id));
    const results = await Promise.all(promises);
    state.topMoviesData = results.filter(movie => movie.Response === 'True');
    return state.topMoviesData;
  } catch (error) {
    console.error('Error fetching top movies:', error);
    throw error;
  }
}

/* --- 


Rendering functions


--- */

const resultsEl = qs('#results');
const pageInfoEl = qs('#pageInfo');
const prevBtn = qs('#prevPage');
const nextBtn = qs('#nextPage');

function renderMovies(list) {
  resultsEl.innerHTML = '';
  if (!list || list.length === 0) {
    resultsEl.innerHTML = `<p style="color:var(--muted)">No results found.</p>`;
    return;
  }

  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-imdb', item.imdbID);

    const poster = document.createElement('img');
    poster.className = 'card__poster';
    poster.alt = item.Title;
    poster.src = item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/300x450?text=No+Poster';

    const meta = document.createElement('div');
    meta.className = 'card__meta';

    const title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = item.Title;

    const sub = document.createElement('p');
    sub.className = 'card__sub';
    sub.textContent = `${item.Year} • ${item.Type}`;

    meta.appendChild(title);
    meta.appendChild(sub);

  
    if (item.imdbRating && item.imdbRating !== 'N/A') {
      const rating = document.createElement('p');
      rating.className = 'card__rating';
      rating.textContent = item.imdbRating;
      meta.appendChild(rating);
    }

    card.appendChild(poster);
    card.appendChild(meta);

    // click -> open details
    card.addEventListener('click', async () => {
      openModalLoading();
      try {
        const details = await fetchMovieDetails(item.imdbID);
        showModal(details);
      } catch (err) {
        showModalError(err.message);
      }
    });

    resultsEl.appendChild(card);
  });
}

function updatePager() {
  if (!state.isSearchMode) {
    // For top movies, no pagination needed
    pageInfoEl.textContent = `Showing ${state.topMoviesData.length} top-rated movies`;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  const total = state.totalResults ? Number(state.totalResults) : 0;
  const pages = Math.ceil(total / 10) || 1;
  pageInfoEl.textContent = `Page ${state.page} / ${pages} (${total} results)`;
  prevBtn.disabled = state.page <= 1;
  nextBtn.disabled = state.page >= pages;
}

/* Modal helpers */
const modal = qs('#modal');
const modalBackdrop = qs('#modalBackdrop');
const modalBody = qs('#modalBody');
const closeModalBtn = qs('#closeModal');

function openModalLoading(){
  modalBody.innerHTML = `<p class="modal__text">Loading details...</p>`;
  modal.classList.remove('hidden');
}

function showModalError(msg){
  modalBody.innerHTML = `<p class="modal__text">Error: ${msg}</p>`;
  modal.classList.remove('hidden');
}

function showModal(data){
  // build modal HTML
  modalBody.innerHTML = `
    <div class="modal__info">
      <img class="modal__poster" src="${data.Poster !== 'N/A' ? data.Poster : 'https://via.placeholder.com/300x450?text=No+Poster'}" alt="${data.Title}">
      <div>
        <h2 class="modal__title">${data.Title} <small style="color:var(--muted)">(${data.Year})</small></h2>
        <p class="modal__text"><strong>Type:</strong> ${data.Type} • <strong>Runtime:</strong> ${data.Runtime}</p>
        <p class="modal__text"><strong>Genre:</strong> ${data.Genre}</p>
        <p class="modal__text"><strong>Director:</strong> ${data.Director}</p>
        <p class="modal__text"><strong>Actors:</strong> ${data.Actors}</p>
        <p class="modal__text"><strong>IMDB Rating:</strong> ${data.imdbRating} • <strong>Votes:</strong> ${data.imdbVotes}</p>
        <p class="modal__text" style="margin-top:10px"><strong>Plot:</strong> ${data.Plot}</p>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');
}

/* --- App logic --- */

async function loadAndDisplay() {
  try {
    let results = [];

    if (state.isSearchMode && state.query) {
      // Search mode - use OMDb search API
      const raw = await fetchMovies(state.query, state.page, state.type);
      if (raw.Response === 'False') {
        state.totalResults = 0;
        renderMovies([]);
        updatePager();
        return;
      }
      state.totalResults = raw.totalResults || 0;
      results = raw.Search || [];
    } else {
      // Home mode - show top 21 movies
      results = await fetchTopMovies();
      state.totalResults = results.length;
    }

    // Apply client-side year range filter if present
    function extractYear(y){
      if (!y) return null;
      const m = y.match(/\d{4}/);
      return m ? Number(m[0]) : null;
    }

    if (state.yearFrom || state.yearTo) {
      results = results.filter(r => {
        const y = extractYear(r.Year);
        if (!y) return false;
        if (state.yearFrom && y < state.yearFrom) return false;
        if (state.yearTo && y > state.yearTo) return false;
        return true;
      });
    }

    // Sorting
    if (state.sortBy === 'rating') {
      // Sort by IMDb rating (for top movies)
      results.sort((a,b)=> {
        const ratingA = parseFloat(a.imdbRating) || 0;
        const ratingB = parseFloat(b.imdbRating) || 0;
        return ratingB - ratingA;
      });
    } else if (state.sortBy === 'newest') {
      results.sort((a,b)=> (extractYear(b.Year) || 0) - (extractYear(a.Year) || 0));
    } else if (state.sortBy === 'oldest') {
      results.sort((a,b)=> (extractYear(a.Year) || 0) - (extractYear(b.Year) || 0));
    } else if (state.sortBy === 'title-asc') {
      results.sort((a,b)=> a.Title.localeCompare(b.Title));
    } else if (state.sortBy === 'title-desc') {
      results.sort((a,b)=> b.Title.localeCompare(a.Title));
    }

    renderMovies(results);
    updatePager();
  } catch (err) {
    resultsEl.innerHTML = `<p style="color:var(--muted)">Error loading movies: ${err.message}</p>`;
    console.error(err);
  }
}

/* --- 

UI wiring

--- */

const searchInput = qs('#searchInput');
const searchBtn = qs('#searchBtn');
const typeSelect = qs('#typeFilter');
const yearFromInput = qs('#yearFrom');
const yearToInput = qs('#yearTo');
const sortSelect = qs('#sortBy');

searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) {
    state.query = query;
    state.isSearchMode = true;
    state.page = 1;
    loadAndDisplay();
  } else {
    // Empty search - go back to top movies
    state.query = '';
    state.isSearchMode = false;
    state.page = 1;
    loadAndDisplay();
  }
});

// debounce the search as user types
const debouncedSearch = debounce(() => {
  const query = searchInput.value.trim();
  if (query) {
    state.query = query;
    state.isSearchMode = true;
    state.page = 1;
    loadAndDisplay();
  } else {
    // Empty search - go back to top movies
    state.query = '';
    state.isSearchMode = false;
    state.page = 1;
    loadAndDisplay();
  }
}, 600);

searchInput.addEventListener('input', debouncedSearch);

// filters change
[typeSelect, yearFromInput, yearToInput, sortSelect].forEach(el=>{
  el.addEventListener('change', () => {
    state.type = typeSelect.value;
    const yf = Number(yearFromInput.value) || null;
    const yt = Number(yearToInput.value) || null;
    state.yearFrom = yf;
    state.yearTo = yt;
    state.sortBy = sortSelect.value;
    state.page = 1;
    loadAndDisplay();
  });
});

// pager
prevBtn.addEventListener('click', () => {
  if (state.page > 1) {
    state.page -= 1;
    loadAndDisplay();
  }
});
nextBtn.addEventListener('click', () => {
  state.page += 1;
  loadAndDisplay();
});

/* 


modal close 


*/
closeModalBtn.addEventListener('click', ()=> modal.classList.add('hidden'));
modalBackdrop.addEventListener('click', ()=> modal.classList.add('hidden'));

// initial load
document.addEventListener('DOMContentLoaded', ()=> {
  // set default UI values
  searchInput.value = state.query;
  typeSelect.value = state.type;
  sortSelect.value = state.sortBy;
  loadAndDisplay();
});