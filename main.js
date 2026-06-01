import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let dataLeft = [];
let dataRight = [];
let straftSortedCities = [];
let currentRegressionType = "linear";

// Dimensiones fijas para el viewBox
const FIXED_WIDTH = 900;
const FIXED_HEIGHT = 525;
const MARGIN = 100;

async function loadData() {
  try {
    const response = await fetch("/api/top-cities");
    const json = await response.json();

    if (response.ok && Array.isArray(json)) {
      dataRight = json;
      straftSortedCities = json.map((d) => d.city);
    } else {
      dataRight = [];
      straftSortedCities = [];
    }
  } catch (error) {
    console.error("Error loading data:", error);
    dataRight = [];
    straftSortedCities = [];
  }
  initCharts();
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

    if (regressionType === "logarithmic" || regressionType === "powerlaw") {
      regression.domain([1, data.length]);
    } else {
      regression.domain([0, data.length - 1]);
    }

    return regression(data);
  } catch (error) {
    console.warn(`Regression ${regressionType} failed, using linear`);
    return window.d3
      .regressionLinear()
      .x((d) => d[0])
      .y((d) => d[1])
      .domain([0, data.length - 1])(data);
  }
}

function deduplicateCities(data) {
  const uniqueData = [];
  const seen = new Set();

  for (const point of data) {
    if (!seen.has(point.city)) {
      seen.add(point.city);
      uniqueData.push(point);
    }
  }
  return uniqueData;
}

function initCharts() {
  const isMobile = window.innerWidth <= 768;

  const container = d3
    .select("body")
    .append("div")
    .attr("id", "chartsContainer");

  // SVG izquierdo con viewBox responsivo
  const svgLeft = container
    .append("svg")
    .attr("viewBox", `0 0 ${FIXED_WIDTH} ${FIXED_HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("border", "2px solid black")
    .style("width", "100%")
    .style("height", "auto");

  // SVG derecho
  const svgRight = container
    .append("svg")
    .attr("viewBox", `0 0 ${FIXED_WIDTH} ${FIXED_HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("border", "2px solid black")
    .style("width", "100%")
    .style("height", "auto");

  // Título izquierdo
  const graphTitleLeft = svgLeft
    .append("text")
    .attr("x", FIXED_WIDTH / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "14px" : "16px")
    .style("font-weight", "bold")
    .text("Keine Auswahl");

  // Título derecho
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
    .text("400 Kreise/Kreisfreie Städte (Aufsteigend sortiert nach Straftaten)");

  svgLeft
    .append("text")
    .attr("x", FIXED_WIDTH / 2)
    .attr("y", FIXED_HEIGHT - MARGIN + 35)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "10px" : "12px")
    .style("fill", "#333")
    .text("400 Kreise/Kreisfreie Städte (Aufsteigend sortiert nach Straftaten)");

  // Función de dibujo (usa dimensiones fijas)
  function drawScatter(svg, data, useStraftAxis = false, isLeftPlot = false) {
    svg.selectAll("circle").remove();
    svg.selectAll("g").remove();
    svg.selectAll("path").remove();

    const uniqueData = deduplicateCities(data);

    if (!uniqueData || uniqueData.length === 0) {
      if (isLeftPlot) graphTitleLeft.text("Keine Auswahl");
      return;
    }

    const xDomain =
      useStraftAxis && straftSortedCities.length > 0
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

    // Eje X (sin etiquetas)
    svg
      .append("g")
      .attr("transform", `translate(0,${FIXED_HEIGHT - MARGIN})`)
      .style("font-size", isMobile ? "10px" : "12px")
      .call(d3.axisBottom(xScale).tickFormat(""))
      .selectAll("text")
      .style("display", "none");

    // Eje Y
    svg
      .append("g")
      .attr("transform", `translate(${MARGIN},0)`)
      .style("font-size", isMobile ? "10px" : "14px")
      .call(d3.axisLeft(yScale));

    // Círculos
    svg
      .selectAll("circle")
      .data(uniqueData)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.city))
      .attr("cy", (d) => yScale(d.count))
      .attr("r", isMobile ? 1.5 : 2)
      .attr("fill", "black");

    // Regresión
    const regressionData = uniqueData.map((d, i) => {
      const xValue =
        currentRegressionType === "logarithmic" || currentRegressionType === "powerlaw"
          ? i + 1
          : i;
      return [xValue, d.count];
    });

    const regressionLine = getRegression(currentRegressionType, regressionData);

    const lineGenerator = d3
      .line()
      .x((d) => {
        let index = d[0];
        if (currentRegressionType === "logarithmic" || currentRegressionType === "powerlaw") {
          index = Math.max(0, index - 1);
        }
        return xScale(xDomain[Math.round(index)]);
      })
      .y((d) => yScale(d[1]));

    svg
      .append("path")
      .datum(regressionLine)
      .attr("d", lineGenerator)
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("fill", "none");
  }

  drawScatter(svgLeft, dataLeft, false, true);
  drawScatter(svgRight, dataRight, false, false);

  // Comportamiento de checkboxes (exclusión mutua)
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        checkboxes.forEach((cb) => {
          if (cb !== e.target) cb.checked = false;
        });
      }
    });
  });

  // Cambio de tipo de regresión
  document.getElementById("regressionType").addEventListener("change", (e) => {
    currentRegressionType = e.target.value;
    drawScatter(svgLeft, dataLeft, true, true);
    drawScatter(svgRight, dataRight, false, false);
  });

  // Botón de confirmación
  document.getElementById("bestaetigen").addEventListener("click", async () => {
    const checked = document.querySelector('input[type="checkbox"]:checked');

    if (!checked) {
      graphTitleLeft.text("Keine Auswahl");
      dataLeft = [];
      drawScatter(svgLeft, dataLeft, true, true);
      return;
    }

    const indicator = checked.value;
    const categoryName = checked.name;
    const label = checked.parentElement.textContent.trim();

    try {
      const response = await fetch(`/api/top-cities?indicator=${encodeURIComponent(indicator)}`);
      const json = await response.json();

      if (response.ok && Array.isArray(json)) {
        dataLeft = json;
      } else {
        dataLeft = [];
      }
    } catch (error) {
      console.error("Error loading data:", error);
      dataLeft = [];
    }

    graphTitleLeft.text(`${categoryName}: ${label}`);
    drawScatter(svgLeft, dataLeft, true, true);
  });
}

document.addEventListener("DOMContentLoaded", loadData);
