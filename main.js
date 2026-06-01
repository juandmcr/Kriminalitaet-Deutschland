import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let dataLeft = [];
let dataRight = [];
let straftSortedCities = []; // Cities sorted by straft for left plot X axis

async function loadData() {
  try {
    const response = await fetch("/api/top-cities");
    const json = await response.json();

    if (response.ok && Array.isArray(json)) {
      dataRight = json;
      // Extract cities in order from right plot (sorted by straft)
      straftSortedCities = json.map((d) => d.city);
      console.log("Data loaded:", dataRight);
    } else {
      console.error("API error:", json);
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

  // Create title elements first
  const graphTitleLeft = svgLeft
    .append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Keine Auswahl");

  const graphTitleRight = svgRight
    .append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Straftaten pro 100.000 Einwohner");

  function drawScatter(svg, data, useStraftAxis = false, isLeftPlot = false) {
    // Don't remove everything - just remove the circles and axes
    svg.selectAll("circle").remove();
    svg.selectAll("g").remove();
    svg.selectAll("path").remove();

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
      if (isLeftPlot) {
        graphTitleLeft.text("Keine Auswahl");
      }
      return;
    }

    // Determine X axis domain
    let xDomain;
    if (useStraftAxis && straftSortedCities.length > 0) {
      // Use the straft-sorted cities for left plot
      xDomain = straftSortedCities;
    } else {
      // Use data's own city order
      xDomain = uniqueData.map((d) => d.city);
    }

    const xScale = d3
      .scalePoint()
      .domain(xDomain)
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

    // Draw data points
    svg
      .selectAll("circle")
      .data(uniqueData)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.city))
      .attr("cy", (d) => yScale(d.count))
      .attr("r", 2)
      .attr("fill", "black");

    // Calculate and draw linear regression line using window.d3
    const regressionData = uniqueData.map((d, i) => [i, d.count]);
    const regression = window.d3
      .regressionLinear()
      .x((d) => d[0])
      .y((d) => d[1])
      .domain([0, uniqueData.length - 1]);

    const regressionLine = regression(regressionData);

    // Create line generator for regression
    const lineGenerator = d3
      .line()
      .x((d, i) => xScale(xDomain[Math.round(d[0])]))
      .y((d) => yScale(d[1]));

    svg
      .append("path")
      .datum(regressionLine)
      .attr("d", lineGenerator)
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("fill", "none");
  }

  // Draw initial plots
  drawScatter(svgLeft, dataLeft, false, true);
  drawScatter(svgRight, dataRight, false, false);

  // Make checkboxes mutually exclusive
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        // Uncheck all other checkboxes
        checkboxes.forEach((cb) => {
          if (cb !== e.target) {
            cb.checked = false;
          }
        });
      }
    });
  });

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
      const response = await fetch(
        `/api/top-cities?indicator=${encodeURIComponent(indicator)}`,
      );
      const json = await response.json();

      if (response.ok && Array.isArray(json)) {
        dataLeft = json;
        console.log("Left data loaded:", dataLeft);
      } else {
        console.error("API error:", json);
        dataLeft = [];
      }
    } catch (error) {
      console.error("Error loading left data:", error);
      dataLeft = [];
    }

    graphTitleLeft.text(`${categoryName}: ${label}`);
    drawScatter(svgLeft, dataLeft, true, true);
  });
}

document.addEventListener("DOMContentLoaded", loadData);
