const STORAGE_KEY = "running-race-tracker-data";

const form = document.getElementById("race-form");
const statusEl = document.getElementById("status");
const summaryCardsEl = document.getElementById("summary-cards");
const distanceStatsEl = document.getElementById("distance-stats");
const yearStatsEl = document.getElementById("year-stats");
const competitionStatsEl = document.getElementById("competition-stats");
const raceListEl = document.getElementById("race-list");
const clearButton = document.getElementById("clear-data");

let races = loadRaces();

form.addEventListener("submit", handleSubmit);
clearButton.addEventListener("click", clearAllData);

render();

function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const competitionName = String(formData.get("competitionName") || "").trim();
  const date = String(formData.get("raceDate") || "").trim();
  const officialDistance = Number(formData.get("officialDistance"));
  const officialResult = String(formData.get("officialResult") || "").trim();
  const actualDistance = Number(formData.get("actualDistance"));

  const resultSeconds = parseResultToSeconds(officialResult);
  if (!competitionName || !date || !officialDistance || !actualDistance || resultSeconds === null) {
    setStatus("Please enter a valid competition, date, distance and result.");
    return;
  }

  const race = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    competitionName,
    date,
    officialDistance,
    officialResult,
    officialResultSeconds: resultSeconds,
    actualDistance,
  };

  races = [race, ...races];
  saveRaces();
  form.reset();
  setStatus(`Saved ${competitionName} on ${formatDate(date)}.`);
  render();
}

function render() {
  const sortedRaces = [...races].sort((a, b) => b.date.localeCompare(a.date));

  renderSummaryCards(sortedRaces);
  renderDistanceStats(sortedRaces);
  renderYearStats(sortedRaces);
  renderCompetitionStats(sortedRaces);
  renderRaceList(sortedRaces);
}

function renderSummaryCards(racesToSummarize) {
  const totalRaces = racesToSummarize.length;
  const totalDistance = racesToSummarize.reduce((sum, race) => sum + race.actualDistance, 0);
  const averageTime = averageSeconds(racesToSummarize);
  const bestTime = bestRaceTime(racesToSummarize);

  const cards = [
    { label: "Total races", value: totalRaces },
    { label: "Total actual distance", value: `${totalDistance.toFixed(1)} km` },
    { label: "Best result", value: bestTime ? formatSeconds(bestTime) : "—" },
    { label: "Average result", value: averageTime ? formatSeconds(averageTime) : "—" },
  ];

  summaryCardsEl.innerHTML = cards
    .map(
      ({ label, value }) => `
        <article class="metric-card">
          <h3>${label}</h3>
          <p>${value}</p>
        </article>
      `
    )
    .join("");
}

function renderDistanceStats(racesToSummarize) {
  const grouped = new Map();

  for (const race of racesToSummarize) {
    const key = `${race.officialDistance.toFixed(1)} km`;
    if (!grouped.has(key)) {
      grouped.set(key, { count: 0, bestTime: Infinity, totalTime: 0, totalDistance: 0 });
    }
    const bucket = grouped.get(key);
    bucket.count += 1;
    bucket.totalTime += race.officialResultSeconds;
    bucket.totalDistance += race.actualDistance;
    bucket.bestTime = Math.min(bucket.bestTime, race.officialResultSeconds);
  }

  const rows = [...grouped.entries()]
    .sort((a, b) => Number(a[0].split(" ")[0]) - Number(b[0].split(" ")[0]))
    .map(([distance, values]) => `
      <tr>
        <td>${distance}</td>
        <td>${values.count}</td>
        <td>${values.bestTime === Infinity ? "—" : formatSeconds(values.bestTime)}</td>
        <td>${values.count ? formatSeconds(Math.round(values.totalTime / values.count)) : "—"}</td>
      </tr>
    `)
    .join("");

  distanceStatsEl.innerHTML = rows || `<tr><td colspan="4">No races yet.</td></tr>`;
}

function renderYearStats(racesToSummarize) {
  const grouped = new Map();

  for (const race of racesToSummarize) {
    const year = new Date(race.date).getFullYear();
    const key = `${year}`;
    if (!grouped.has(key)) {
      grouped.set(key, { count: 0, bestTime: Infinity, totalTime: 0 });
    }
    const bucket = grouped.get(key);
    bucket.count += 1;
    bucket.totalTime += race.officialResultSeconds;
    bucket.bestTime = Math.min(bucket.bestTime, race.officialResultSeconds);
  }

  const rows = [...grouped.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, values]) => `
      <tr>
        <td>${year}</td>
        <td>${values.count}</td>
        <td>${values.bestTime === Infinity ? "—" : formatSeconds(values.bestTime)}</td>
        <td>${values.count ? formatSeconds(Math.round(values.totalTime / values.count)) : "—"}</td>
      </tr>
    `)
    .join("");

  yearStatsEl.innerHTML = rows || `<tr><td colspan="4">No races yet.</td></tr>`;
}

function renderCompetitionStats(racesToSummarize) {
  const grouped = new Map();

  for (const race of racesToSummarize) {
    const year = new Date(race.date).getFullYear();
    const key = `${race.competitionName.toLowerCase()}::${year}`;
    if (!grouped.has(key)) {
      grouped.set(key, { competitionName: race.competitionName, year, count: 0, bestTime: Infinity, totalTime: 0 });
    }
    const bucket = grouped.get(key);
    bucket.count += 1;
    bucket.totalTime += race.officialResultSeconds;
    bucket.bestTime = Math.min(bucket.bestTime, race.officialResultSeconds);
  }

  const rows = [...grouped.values()]
    .sort((a, b) => {
      if (a.competitionName === b.competitionName) return b.year - a.year;
      return a.competitionName.localeCompare(b.competitionName);
    })
    .map((values) => `
      <tr>
        <td>${values.competitionName}</td>
        <td>${values.year}</td>
        <td>${values.count}</td>
        <td>${values.bestTime === Infinity ? "—" : formatSeconds(values.bestTime)}</td>
        <td>${values.count ? formatSeconds(Math.round(values.totalTime / values.count)) : "—"}</td>
      </tr>
    `)
    .join("");

  competitionStatsEl.innerHTML = rows || `<tr><td colspan="5">No races yet.</td></tr>`;
}

function renderRaceList(racesToRender) {
  if (!racesToRender.length) {
    raceListEl.innerHTML = '<p class="status">No races recorded yet.</p>';
    return;
  }

  raceListEl.innerHTML = racesToRender
    .map(
      (race) => `
        <article class="race-item">
          <div>
            <strong>${escapeHtml(race.competitionName)}</strong>
            <div class="race-meta">${formatDate(race.date)} · ${race.officialDistance.toFixed(1)} km · result ${race.officialResult}</div>
            <div class="race-meta">Actual distance: ${race.actualDistance.toFixed(1)} km</div>
          </div>
          <button class="delete-btn" data-id="${race.id}">Delete</button>
        </article>
      `
    )
    .join("");

  raceListEl.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", () => deleteRace(button.dataset.id));
  });
}

function deleteRace(id) {
  races = races.filter((race) => race.id !== id);
  saveRaces();
  setStatus("Race removed.");
  render();
}

function clearAllData() {
  races = [];
  saveRaces();
  setStatus("All race data cleared.");
  render();
}

function saveRaces() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(races));
}

function loadRaces() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseResultToSeconds(value) {
  const parts = value.split(":").map((part) => Number(part.trim()));
  if (parts.some((part) => Number.isNaN(part))) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (minutes < 0 || seconds < 0) return null;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (hours < 0 || minutes < 0 || seconds < 0) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

function formatSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(String(hours).padStart(2, "0"));
  parts.push(String(minutes).padStart(2, "0"));
  parts.push(String(seconds).padStart(2, "0"));
  return parts.join(":");
}

function averageSeconds(racesToSummarize) {
  if (!racesToSummarize.length) return 0;
  const sum = racesToSummarize.reduce((total, race) => total + race.officialResultSeconds, 0);
  return Math.round(sum / racesToSummarize.length);
}

function bestRaceTime(racesToSummarize) {
  return racesToSummarize.reduce((best, race) => {
    if (!best) return race.officialResultSeconds;
    return Math.min(best, race.officialResultSeconds);
  }, null);
}

function formatDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function setStatus(message) {
  statusEl.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}
