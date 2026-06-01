import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let dataLeft = [
  { city: "Leipzig", count: 15 },
  { city: "Berlin", count: 20 },
  { city: "Dresden", count: 8 },
];

let dataRight = [];

async function loadData() {
  try {
    const response = await fetch("/api/top-cities");
    const json = await response.json();

    if (response.ok && Array.isArray(json)) {
      dataRight = json;
      console.log("Data loaded:", dataRight);
    } else {
      console.error("API error:", json);
      dataRight = [];
    }
  } catch (error) {
    console.error("Error loading data:", error);
    dataRight = [];
  }
  initCharts();
}

function initCharts() {
  const width = 900;
  const height = 525;
  const margin = 100;

  const container = d3
    .select("body")
    .append("div")
    .style("display", "flex")
    .style("gap", "20px");

  const svgLeft = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("border", "2px solid black");

  const svgRight = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("border", "2px solid black");

  function drawScatter(svg, data) {
    svg.selectAll("*").remove();

    // Remove duplicate cities - keep only first occurrence per city
    const uniqueData = [];
    const seen = new Set();

    for (const point of data) {
      if (!seen.has(point.city)) {
        seen.add(point.city);
        uniqueData.push(point);
      }
    }

    if (!uniqueData || uniqueData.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("No data available");
      return;
    }

    const xScale = d3
      .scalePoint()
      .domain(uniqueData.map((d) => d.city))
      .range([margin + 50, width - margin - 50]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(uniqueData, (d) => d.count)])
      .range([height - margin, margin + 50]);


    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin})`)
      .style("font-size", "12px")
      .call(d3.axisBottom(xScale).tickFormat(""))
      .selectAll("text")
      .style("display", "none");

    svg
      .append("g")
      .attr("transform", `translate(${margin},0)`)
      .style("font-size", "14px")
      .call(d3.axisLeft(yScale));

    svg
      .selectAll("circle")
      .data(uniqueData)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.city))
      .attr("cy", (d) => yScale(d.count))
      .attr("r", 2)
      .attr("fill", "black");
  }

  // Diagramme zeichnen
  drawScatter(svgLeft, dataLeft);
  drawScatter(svgRight, dataRight);

  // Linker Titel (dynamisch)
  const graphTitleLeft = svgLeft
    .append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Keine Auswahl");

  // Rechter Titel (fest)
  svgRight
    .append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Straftaten pro 100.000 Einwohner");

  document.getElementById("bestaetigen").addEventListener("click", () => {
    const checked = document.querySelectorAll(
      'input[type="checkbox"]:checked'
    );

    const auswahl = Array.from(checked)
      .map((cb) => `${cb.name}: ${cb.value}`)
      .join(", ");

    graphTitleLeft.text(
      auswahl.length > 0
        ? auswahl
        : "Keine Auswahl"
    );
  });
}

document.addEventListener("DOMContentLoaded", loadData);
