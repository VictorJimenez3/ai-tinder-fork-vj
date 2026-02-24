// app.js
// Plain global JS, no modules.

// -------------------
// Data generator
// -------------------
const TAGS = [
  "Coffee","Hiking","Movies","Live Music","Board Games","Cats","Dogs","Traveler",
  "Foodie","Tech","Art","Runner","Climbing","Books","Yoga","Photography"
];
const FIRST_NAMES = [
  "Alex","Sam","Jordan","Taylor","Casey","Avery","Riley","Morgan","Quinn","Cameron",
  "Jamie","Drew","Parker","Reese","Emerson","Rowan","Shawn","Harper","Skyler","Devon"
];
const CITIES = [
  "Brooklyn","Manhattan","Queens","Jersey City","Hoboken","Astoria",
  "Williamsburg","Bushwick","Harlem","Lower East Side"
];
const JOBS = [
  "Product Designer","Software Engineer","Data Analyst","Barista","Teacher",
  "Photographer","Architect","Chef","Nurse","Marketing Manager","UX Researcher"
];
const BIOS = [
  "Weekend hikes and weekday lattes.",
  "Dog parent. Amateur chef. Karaoke enthusiast.",
  "Trying every taco in the city — for science.",
  "Bookstore browser and movie quote machine.",
  "Gym sometimes, Netflix always.",
  "Looking for the best slice in town.",
  "Will beat you at Mario Kart.",
  "Currently planning the next trip."
];

const UNSPLASH_SEEDS = [
  "1515462277126-2b47b9fa09e6",
  "1520975916090-3105956dac38",
  "1519340241574-2cec6aef0c01",
  "1554151228-14d9def656e4",
  "1548142813-c348350df52b",
  "1517841905240-472988babdf9",
  "1535713875002-d1d0cf377fde",
  "1545996124-0501ebae84d0",
  "1524504388940-b1c1722653e1",
  "1531123897727-8f129e1688ce",
];

function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickTags() { return Array.from(new Set(Array.from({length:4}, ()=>sample(TAGS)))); }
function imgFor(seed) {
  return `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1200&q=80`;
}

function fisherYatesShuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickPhotos(n = 3) {
  return fisherYatesShuffle(UNSPLASH_SEEDS).slice(0, n).map(imgFor);
}

function generateProfiles(count = 12) {
  const profiles = [];
  for (let i = 0; i < count; i++) {
    profiles.push({
      id: `p_${i}_${Date.now().toString(36)}`,
      name: sample(FIRST_NAMES),
      age: 18 + Math.floor(Math.random() * 22),
      city: sample(CITIES),
      title: sample(JOBS),
      bio: sample(BIOS),
      tags: pickTags(),
      photos: pickPhotos(3),
      photoIdx: 0,
    });
  }
  return profiles;
}

// -------------------
// UI rendering
// -------------------
const deckEl = document.getElementById("deck");
const shuffleBtn = document.getElementById("shuffleBtn");
const likeBtn = document.getElementById("likeBtn");
const nopeBtn = document.getElementById("nopeBtn");
const superLikeBtn = document.getElementById("superLikeBtn");

let profiles = [];
let isSwiping = false; // guard against simultaneous swipes

// Build a single card DOM node for profile at profiles[idx].
function buildCard(idx) {
  const p = profiles[idx];

  const card = document.createElement("article");
  card.className = "card";

  // — Photo
  const img = document.createElement("img");
  img.className = "card__media";
  img.src = p.photos[p.photoIdx];
  img.alt = `${p.name} — profile photo`;
  img.draggable = false;

  // — Photo dots
  const dots = document.createElement("div");
  dots.className = "card__dots";
  p.photos.forEach((_, di) => {
    const dot = document.createElement("span");
    dot.className = "card__dot" + (di === p.photoIdx ? " card__dot--active" : "");
    dots.appendChild(dot);
  });

  // — Overlays (LIKE / NOPE / SUPER LIKE)
  const overlayLike = document.createElement("div");
  overlayLike.className = "card__overlay card__overlay--like";
  overlayLike.textContent = "LIKE";

  const overlayNope = document.createElement("div");
  overlayNope.className = "card__overlay card__overlay--nope";
  overlayNope.textContent = "NOPE";

  const overlaySuper = document.createElement("div");
  overlaySuper.className = "card__overlay card__overlay--super";
  overlaySuper.textContent = "SUPER";

  // — Body
  const body = document.createElement("div");
  body.className = "card__body";

  const titleRow = document.createElement("div");
  titleRow.className = "title-row";
  titleRow.innerHTML = `
    <h2 class="card__title">${p.name}</h2>
    <span class="card__age">${p.age}</span>
  `;

  const meta = document.createElement("div");
  meta.className = "card__meta";
  meta.textContent = `${p.title} • ${p.city}`;

  const chips = document.createElement("div");
  chips.className = "card__chips";
  p.tags.forEach((t) => {
    const c = document.createElement("span");
    c.className = "chip";
    c.textContent = t;
    chips.appendChild(c);
  });

  body.appendChild(titleRow);
  body.appendChild(meta);
  body.appendChild(chips);

  card.appendChild(img);
  card.appendChild(dots);
  card.appendChild(overlayLike);
  card.appendChild(overlayNope);
  card.appendChild(overlaySuper);
  card.appendChild(body);

  return card;
}

function renderDeck() {
  deckEl.setAttribute("aria-busy", "true");
  deckEl.innerHTML = "";

  if (profiles.length === 0) {
    const empty = document.createElement("div");
    empty.className = "deck__empty";
    empty.innerHTML = `<p>No more profiles!</p><button class="ghost-btn" id="reloadBtn">Start over</button>`;
    deckEl.appendChild(empty);
    deckEl.removeAttribute("aria-busy");
    document.getElementById("reloadBtn").addEventListener("click", resetDeck);
    return;
  }

  // Render all cards; profile[0] = nth-child(1) = top of stack via z-index.
  profiles.forEach((_, idx) => {
    deckEl.appendChild(buildCard(idx));
  });

  deckEl.removeAttribute("aria-busy");
  attachTopCardHandlers();
}

// --- Swipe logic ---

const SWIPE_THRESHOLD_X = 80;  // px to trigger like/nope
const SWIPE_THRESHOLD_Y = -60; // px upward to trigger super like

function getTopCard() {
  return deckEl.querySelector(".card:not(.card--flying)");
}

function updateOverlays(card, dx, dy) {
  const likeOl   = card.querySelector(".card__overlay--like");
  const nopeOl   = card.querySelector(".card__overlay--nope");
  const superOl  = card.querySelector(".card__overlay--super");

  // Vertical super-like check takes priority when dragging sharply upward
  if (dy < -30 && Math.abs(dy) > Math.abs(dx)) {
    likeOl.style.opacity  = "0";
    nopeOl.style.opacity  = "0";
    superOl.style.opacity = Math.min(1, Math.abs(dy) / 80).toFixed(2);
  } else if (dx > 0) {
    likeOl.style.opacity  = Math.min(1, dx / 80).toFixed(2);
    nopeOl.style.opacity  = "0";
    superOl.style.opacity = "0";
  } else if (dx < 0) {
    likeOl.style.opacity  = "0";
    nopeOl.style.opacity  = Math.min(1, -dx / 80).toFixed(2);
    superOl.style.opacity = "0";
  } else {
    likeOl.style.opacity  = "0";
    nopeOl.style.opacity  = "0";
    superOl.style.opacity = "0";
  }
}

function clearOverlays(card) {
  card.querySelectorAll(".card__overlay").forEach(o => { o.style.opacity = "0"; });
}

// Fly the top card off-screen in the given direction, then remove it.
function flyCard(card, direction) {
  if (isSwiping) return;
  isSwiping = true;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tx, ty, rot;
  let overlaySelector;

  switch (direction) {
    case "like":
      tx = vw * 1.5; ty = 80; rot = 30;
      overlaySelector = ".card__overlay--like";
      break;
    case "nope":
      tx = -vw * 1.5; ty = 80; rot = -30;
      overlaySelector = ".card__overlay--nope";
      break;
    case "super":
      tx = 0; ty = -vh * 1.2; rot = 0;
      overlaySelector = ".card__overlay--super";
      break;
  }

  // Show the appropriate overlay fully
  card.querySelectorAll(".card__overlay").forEach(o => { o.style.opacity = "0"; });
  const ol = card.querySelector(overlaySelector);
  if (ol) ol.style.opacity = "1";

  card.classList.add("card--flying");
  card.style.transition = "transform 0.45s ease, opacity 0.45s ease";
  card.style.transform  = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
  card.style.opacity    = "0";

  let cleaned = false;
  function cleanupSwipe() {
    if (cleaned) return;
    cleaned = true;
    clearTimeout(safetyTimer);
    card.remove();
    profiles.shift(); // remove the top profile from state
    isSwiping = false;
    if (profiles.length === 0) {
      renderDeck(); // show empty state
    } else {
      attachTopCardHandlers();
    }
  }

  card.addEventListener("transitionend", cleanupSwipe, { once: true });
  // Safety valve: if transitionend never fires (e.g. card already off-screen),
  // clean up after the animation duration so isSwiping never gets stuck.
  const safetyTimer = setTimeout(cleanupSwipe, 600);
}

// Attach pointer + double-tap handlers to the current top card only.
function attachTopCardHandlers() {
  const card = getTopCard();
  if (!card) return;

  let startX = 0, startY = 0, currentX = 0, currentY = 0;
  let dragging = false;
  let lastTapTime = 0;
  const DRAG_START_THRESHOLD = 10; // px — prevents snap-back flicker on quick taps

  card.addEventListener("pointerdown", onDown);

  function onDown(e) {
    if (isSwiping) return;

    // Double-tap detection
    const now = Date.now();
    if (now - lastTapTime < 300) {
      cyclePhoto(card);
      lastTapTime = 0;
      return;
    }
    lastTapTime = now;

    startX = e.clientX;
    startY = e.clientY;
    currentX = 0;
    currentY = 0;
    dragging = false; // becomes true only once movement threshold is exceeded

    card.setPointerCapture(e.pointerId);

    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerup",   onUp);
    card.addEventListener("pointercancel", onCancel);
  }

  function onMove(e) {
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;

    if (!dragging) {
      // Don't start the drag until the finger has clearly moved
      if (Math.hypot(currentX, currentY) < DRAG_START_THRESHOLD) return;
      dragging = true;
      card.style.transition = "none";
    }

    const rot = currentX * 0.07;
    card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rot}deg)`;
    updateOverlays(card, currentX, currentY);
  }

  function onUp() {
    removeListeners();
    if (!dragging) return; // quick tap — threshold never reached, nothing to snap back
    dragging = false;
    decideSwipe(card);
  }

  function onCancel() {
    dragging = false;
    removeListeners();
    snapBack(card);
  }

  function removeListeners() {
    card.removeEventListener("pointermove", onMove);
    card.removeEventListener("pointerup",   onUp);
    card.removeEventListener("pointercancel", onCancel);
  }

  function decideSwipe(card) {
    const goSuper = currentY < SWIPE_THRESHOLD_Y && Math.abs(currentY) > Math.abs(currentX);
    if (goSuper) {
      flyCard(card, "super");
    } else if (currentX > SWIPE_THRESHOLD_X) {
      flyCard(card, "like");
    } else if (currentX < -SWIPE_THRESHOLD_X) {
      flyCard(card, "nope");
    } else {
      snapBack(card);
    }
  }
}

function snapBack(card) {
  clearOverlays(card);
  card.style.transition = "transform 0.35s cubic-bezier(.175,.885,.32,1.275), opacity 0.35s ease";
  card.style.transform  = "";
  card.style.opacity    = "";
}

// Cycle through photos on double-tap.
// The top card is always profiles[0]; no index arg needed.
function cyclePhoto(card) {
  const p = profiles[0];
  if (!p || p.photos.length < 2) return;

  p.photoIdx = (p.photoIdx + 1) % p.photos.length;
  const img  = card.querySelector(".card__media");
  img.src    = p.photos[p.photoIdx];

  // Update dots
  card.querySelectorAll(".card__dot").forEach((dot, di) => {
    dot.classList.toggle("card__dot--active", di === p.photoIdx);
  });
}

// --- Button-triggered swipes ---
function triggerButtonSwipe(direction) {
  if (isSwiping) return;
  const card = getTopCard();
  if (!card) return;
  flyCard(card, direction);
}

function resetDeck() {
  isSwiping = false;
  profiles = generateProfiles(12);
  renderDeck();
}

likeBtn.addEventListener("click",      () => triggerButtonSwipe("like"));
nopeBtn.addEventListener("click",      () => triggerButtonSwipe("nope"));
superLikeBtn.addEventListener("click", () => triggerButtonSwipe("super"));
shuffleBtn.addEventListener("click",   resetDeck);

// Boot
resetDeck();
