import { drawHero } from "./hero.js";

const search = document.querySelector("#release-search");
const list = document.querySelector("#release-list");
const results = document.querySelector("#search-results");
const archiveCount = document.querySelector("#archive-count");
const filters = Array.from(document.querySelectorAll("[data-filter]"));
const releaseDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const channelLabels = { beta: "Beta", production: "Production" };
const normalize = (value) => value.toLocaleLowerCase().replaceAll("’", "'");
const expanded = new Set();
let releases = [];
let category = "All";

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function releaseRow(release) {
  const article = element(
    "article",
    release === releases[0] ? "release is-latest" : "release",
  );
  article.id = release.id;
  const meta = element("div", "release-meta");
  const date = element("time", "", releaseDate.format(new Date(release.date)));
  date.dateTime = release.date;
  const channels = release.channels.map((channel) => channelLabels[channel]);
  meta.append(date, element("p", "", channels.join(" · ")));

  const detail = element("details");
  detail.open = expanded.has(release.id);
  detail.addEventListener("toggle", () => {
    if (detail.open) expanded.add(release.id);
    else expanded.delete(release.id);
  });
  const summary = element("summary");
  const heading = element("span", "release-heading");
  heading.append(
    element("span", "release-category", release.category),
    element("h3", "release-title", release.title),
    element("span", "release-summary", release.summary),
  );
  const chevron = element("span", "release-chevron");
  chevron.setAttribute("aria-hidden", "true");
  summary.append(heading, chevron);
  detail.append(summary);

  if (release.notes.length) {
    const notes = element("ul", "release-notes");
    for (const note of release.notes) notes.append(element("li", "", note));
    detail.append(notes);
  }
  const links = element("div", "release-links");
  const permalink = element("a", "", "Link to release");
  permalink.href = `#${release.id}`;
  links.append(permalink);
  detail.append(links);
  article.append(meta, detail);
  return article;
}

function render() {
  const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
  const matches = releases.filter(
    (release) =>
      (category === "All" || release.category === category) &&
      terms.every((term) => release.searchText.includes(term)),
  );
  if (matches.length) list.replaceChildren(...matches.map(releaseRow));
  else
    list.replaceChildren(
      element("p", "empty-state", "No releases match this search."),
    );
  results.textContent = `${matches.length} matching releases`;
}

function openLinkedRelease() {
  const targetId = location.hash.slice(1);
  if (!releases.some((release) => release.id === targetId)) return;
  expanded.add(targetId);
  if (!document.getElementById(targetId)) {
    search.value = "";
    category = "All";
    for (const filter of filters) {
      filter.setAttribute(
        "aria-pressed",
        String(filter.dataset.filter === category),
      );
    }
    render();
  }
  const target = document.getElementById(targetId);
  target.querySelector("details").open = true;
  target.scrollIntoView({ block: "start" });
}

async function initialize() {
  try {
    const response = await fetch(new URL("./releases.json", import.meta.url));
    if (!response.ok) throw new Error("Release notes unavailable");
    const entries = await response.json();
    releases = entries.map((release) => ({
      ...release,
      searchText: normalize(
        [
          release.title,
          release.summary,
          release.category,
          release.date,
          ...release.notes,
          ...release.channels,
        ].join(" "),
      ),
    }));
    archiveCount.textContent = `${releases.length} OTA RELEASES`;
    if (releases[0]) expanded.add(releases[0].id);
    render();
    openLinkedRelease();
  } catch {
    list.replaceChildren(
      element(
        "p",
        "empty-state",
        "Couldn’t load the release history. Reload the page to try again.",
      ),
    );
  } finally {
    list.setAttribute("aria-busy", "false");
  }
}

search.addEventListener("input", render);
for (const filter of filters) {
  filter.addEventListener("click", () => {
    category = filter.dataset.filter;
    for (const option of filters) {
      option.setAttribute("aria-pressed", String(option === filter));
    }
    render();
  });
}
document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.target.closest?.("input, textarea, select, [contenteditable]")
  ) {
    event.preventDefault();
    search.focus();
  }
});
window.addEventListener("hashchange", openLinkedRelease);
drawHero(document.querySelector(".hero-art"));
void initialize();
