import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// ---------- Globale Variablen ----------
let dataLeft = [];
let dataRight = [];
let straftSortedCities = [];
let currentRegressionType = "linear";
let sparqlEngine = null;
let rdfStore = null;

const FIXED_WIDTH = 900;
const FIXED_HEIGHT = 525;
const MARGIN = 100;

// ---------- Hilfsfunktionen ----------
function deduplicateCities(data) {
  const seen = new Set();
  return data.filter((point) => {
    if (seen.has(point.city)) return false;
    seen.add(point.city);
    return true;
  });
}

function getRegression(regressionType, data) {
  try {
    let regression;
    switch (regressionType) {
      case "linear":
        regression = window.d3.regressionLinear();
        break;
      case "exponential":
        regression = window.d3.regressionExp();
        break;
      case "logarithmic":
        regression = window.d3.regressionLog();
        break;
      case "quadratic":
        regression = window.d3.regressionQuad();
        break;
      case "polynomial":
        regression = window.d3.regressionPoly().order(3);
        break;
      case "powerlaw":
        regression = window.d3.regressionPow();
        break;
      case "loess":
        regression = window.d3.regressionLoess();
        break;
      default:
        regression = window.d3.regressionLinear();
    }
    regression.x((d) => d[0]).y((d) => d[1]);
    const domainStart =
      regressionType === "logarithmic" || regressionType === "powerlaw" ? 1 : 0;
    regression.domain([domainStart, data.length - 1]);
    return regression(data);
  } catch (error) {
    console.warn(
      `Regression ${regressionType} fehlgeschlagen, verwende linear`,
    );
    return window.d3
      .regressionLinear()
      .x((d) => d[0])
      .y((d) => d[1])
      .domain([0, data.length - 1])(data);
  }
}

// ---------- RDF Store laden ----------
async function loadRdfStore() {
  const response = await fetch("daten_indikatoren.nt");
  const ntText = await response.text();
  const parser = new N3.Parser();
  const store = new N3.Store();
  return new Promise((resolve, reject) => {
    parser.parse(ntText, (error, quad) => {
      if (error) reject(error);
      else if (quad) store.addQuad(quad);
      else resolve(store);
    });
  });
}

// ---------- SPARQL Query ----------
async function fetchIndicatorData(indicator) {
  if (!sparqlEngine) throw new Error("SPARQL Engine nicht bereit");
  if (!rdfStore) throw new Error("RDF Store nicht geladen");
  const query = `
    PREFIX ind: <https://gitlab.dit.htwk-leipzig.de/results-sw/2026/stadt_kriminalitaet/indikator/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?kreisname ?value WHERE {
      ?kreis ind:${indicator} ?value .
      ?kreis rdfs:label ?kreisname .
    }
    ORDER BY ASC(?value)
  `;
  const result = await sparqlEngine.query(query, { sources: [rdfStore] });
  const data = [];
  if (result.resultType === "bindings") {
    const stream = await result.execute();
    for await (const binding of stream) {
      const keys = Array.from(binding.keys());
      const kreisname = binding.get(keys.find((k) => k.value === "kreisname"));
      const value = binding.get(keys.find((k) => k.value === "value"));
      if (!kreisname || !value) continue;
      let kreisnameStr = kreisname.value || "";
      const valueStr = value.value || "0";
      const kreisMatch = kreisnameStr.match(/^"([^"]+)"/);
      const city = kreisMatch ? kreisMatch[1] : kreisnameStr;
      const valueNum = parseFloat(valueStr);
      if (isNaN(valueNum)) continue;
      data.push({ city, count: valueNum });
    }
  }
  return data;
}

// ---------- Tabelle mit allen Daten (scrollbar damti es nicht so lang wird) ----------
function renderFullTable(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = "<p>Keine Daten</p>";
    return;
  }
  let html = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px;">
    <thead><tr><th>Kreis / Stadt</th><th>Wert</th></tr></thead><tbody>`;
  data.forEach((d) => {
    html += `<tr><td>${d.city}</td><td>${d.count.toFixed(2)}</td></tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

// ---------- Tabelle mit Extremwerten (je 10 niedrigste // höchste) ----------
function renderExtremesTable(containerId, data, title) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = "<p>Keine Daten</p>";
    return;
  }
  const topLow = data.slice(0, 10);
  const topHigh = data.slice(-10).reverse();
  let html = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px;">`;
  html += `<thead><tr><th>Kreis / Stadt</th><th>Wert</th></tr></thead><tbody>`;
  html += `<tr><td colspan="2"><strong>Niedrigste 10</strong></td></tr>`;
  topLow.forEach((d) => {
    html += `<tr><td>${d.city}</td><td>${d.count.toFixed(2)}</td></tr>`;
  });
  html += `<tr><td colspan="2"><strong>Höchste 10</strong></td></tr>`;
  topHigh.forEach((d) => {
    html += `<tr><td>${d.city}</td><td>${d.count.toFixed(2)}</td></tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

// ---------- Daten initial laden ----------
async function loadData() {
  try {
    if (typeof Comunica === "undefined")
      throw new Error("Comunica nicht geladen");
    if (typeof N3 === "undefined") throw new Error("N3 nicht geladen");
    sparqlEngine = new Comunica.QueryEngine();
    rdfStore = await loadRdfStore();
    dataRight = await fetchIndicatorData("straft");
    straftSortedCities = dataRight.map((d) => d.city);
    // Rechte Tabelle mit ALLEN Straftaten-Werten (scrollbar, aus QUERY)
    renderFullTable("straftTable", dataRight);
  } catch (error) {
    console.error("Fehler beim Laden:", error);
    dataRight = [];
    straftSortedCities = [];
  }
  initCharts();
}

// ---------- Zeichnen der Scatterplots ----------
function drawScatter(
  svg,
  data,
  useStraftAxis = false,
  isLeftPlot = false,
  graphTitleLeft = null,
) {
  svg.selectAll("circle").remove();
  svg.selectAll("g").remove();
  svg.selectAll("path").remove();

  const uniqueData = deduplicateCities(data);
  if (!uniqueData.length) {
    if (isLeftPlot && graphTitleLeft) graphTitleLeft.text("Keine Auswahl");
    return;
  }

  const xDomain =
    useStraftAxis && straftSortedCities.length
      ? straftSortedCities
      : uniqueData.map((d) => d.city);

  const xScale = d3
    .scalePoint()
    .domain(xDomain)
    .range([MARGIN + 30, FIXED_WIDTH - MARGIN - 30]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(uniqueData, (d) => d.count)])
    .range([FIXED_HEIGHT - MARGIN, MARGIN + 30]);

  const isMobile = window.innerWidth <= 768;
  const axisFontSize = isMobile ? "10px" : "12px";

  svg
    .append("g")
    .attr("transform", `translate(0,${FIXED_HEIGHT - MARGIN})`)
    .style("font-size", axisFontSize)
    .call(d3.axisBottom(xScale).tickFormat(""))
    .selectAll("text")
    .style("display", "none");

  svg
    .append("g")
    .attr("transform", `translate(${MARGIN},0)`)
    .style("font-size", isMobile ? "10px" : "14px")
    .call(d3.axisLeft(yScale));

  svg
    .selectAll("circle")
    .data(uniqueData)
    .enter()
    .append("circle")
    .attr("cx", (d) => xScale(d.city))
    .attr("cy", (d) => yScale(d.count))
    .attr("r", isMobile ? 1.5 : 2)
    .attr("fill", "black");

  const regressionData = uniqueData.map((d, i) => {
    const xVal =
      currentRegressionType === "logarithmic" ||
      currentRegressionType === "powerlaw"
        ? i + 1
        : i;
    return [xVal, d.count];
  });
  const regressionLine = getRegression(currentRegressionType, regressionData);
  const lineGen = d3
    .line()
    .x((d) => {
      let idx = d[0];
      if (
        currentRegressionType === "logarithmic" ||
        currentRegressionType === "powerlaw"
      )
        idx = Math.max(0, idx - 1);
      return xScale(xDomain[Math.round(idx)]);
    })
    .y((d) => yScale(d[1]));

  svg
    .append("path")
    .datum(regressionLine)
    .attr("d", lineGen)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("fill", "none");
}

// ---------- Charts initialisieren ----------
function initCharts() {
  const isMobile = window.innerWidth <= 768;
  const container = d3.select("body").select("#chartsContainer");
  if (container.empty()) return;

  const svgLeft = container
    .append("svg")
    .attr("viewBox", `0 0 ${FIXED_WIDTH} ${FIXED_HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("border", "2px solid black")
    .style("width", "100%")
    .style("height", "auto");

  const svgRight = container
    .append("svg")
    .attr("viewBox", `0 0 ${FIXED_WIDTH} ${FIXED_HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("border", "2px solid black")
    .style("width", "100%")
    .style("height", "auto");

  const graphTitleLeft = svgLeft
    .append("text")
    .attr("x", FIXED_WIDTH / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "14px" : "16px")
    .style("font-weight", "bold")
    .text("Keine Auswahl");

  svgRight
    .append("text")
    .attr("x", FIXED_WIDTH / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "14px" : "16px")
    .style("font-weight", "bold")
    .text("Straftaten pro 100.000 Einwohner (2022)");

  svgRight
    .append("text")
    .attr("x", FIXED_WIDTH / 2)
    .attr("y", FIXED_HEIGHT - MARGIN + 35)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "10px" : "12px")
    .style("fill", "#333")
    .text("400 Kreise/Kreisfreie Städte (aufsteigend sortiert)");

  svgLeft
    .append("text")
    .attr("x", FIXED_WIDTH / 2)
    .attr("y", FIXED_HEIGHT - MARGIN + 35)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "10px" : "12px")
    .style("fill", "#333")
    .text("400 Kreise/Kreisfreie Städte (aufsteigend sortiert)");

  drawScatter(svgLeft, dataLeft, true, true, graphTitleLeft);
  drawScatter(svgRight, dataRight, false, false);

  // Initial linke Tabelle leer
  renderExtremesTable("indicatorTable", [], "");

  // Checkboxen gegenseitig ausschließen
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", (e) => {
      if (e.target.checked) {
        checkboxes.forEach((other) => {
          if (other !== e.target) other.checked = false;
        });
      }
    });
  });

  document.getElementById("regressionType").addEventListener("change", (e) => {
    currentRegressionType = e.target.value;
    drawScatter(svgLeft, dataLeft, true, true, graphTitleLeft);
    drawScatter(svgRight, dataRight, false, false);
  });

  document.getElementById("bestaetigen").addEventListener("click", async () => {
    const checked = document.querySelector('input[type="checkbox"]:checked');
    if (!checked) {
      graphTitleLeft.text("Keine Auswahl");
      dataLeft = [];
      drawScatter(svgLeft, dataLeft, true, true, graphTitleLeft);
      renderExtremesTable("indicatorTable", [], "");
      return;
    }
    const indicator = checked.value;
    const categoryName = checked.name;
    const label = checked.parentElement.textContent.trim();
    try {
      dataLeft = await fetchIndicatorData(indicator);
    } catch (error) {
      console.error("Fehler:", error);
      dataLeft = [];
    }
    graphTitleLeft.text(`${categoryName}: ${label}`);
    drawScatter(svgLeft, dataLeft, true, true, graphTitleLeft);
    renderExtremesTable("indicatorTable", dataLeft);
  });
}

// ---------- Start ----------
document.addEventListener("DOMContentLoaded", () => {
  if (typeof Comunica !== "undefined" && typeof N3 !== "undefined") loadData();
  else console.error("Comunica oder N3 nicht geladen");
});
