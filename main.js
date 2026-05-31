import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { dataLeft, dataRight } from "./data.js";

document.addEventListener("DOMContentLoaded", () => {


  const width = 800;
  const height = 425;
  const margin = 80;

  // Container für beide Diagramme
  const container = d3
    .select("body")
    .append("div")
    .style("display", "flex")
    .style("gap", "20px");

  // Linkes Diagramm
  const svgLeft = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("border", "2px solid black");

  // Rechtes Diagramm
  const svgRight = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("border", "2px solid black");

  // Diagramm zeichnen
  function drawScatter(svg, data) {

    const xScale = d3.scalePoint()
      .domain(data.map(d => d.city))
      .range([margin + 50, width - margin - 50]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .range([height - margin, margin + 50]);

    // X-Achse
    svg.append("g")
      .attr("transform", `translate(0,${height - margin})`)
      .style("font-size", "20px")
      .call(d3.axisBottom(xScale));

    // Y-Achse
    svg.append("g")
      .attr("transform", `translate(${margin},0)`)
      .style("font-size", "20px")
      .call(d3.axisLeft(yScale));

    // Punkte
    svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.city))
      .attr("cy", d => yScale(d.count))
      .attr("r", 3)
      .attr("fill", "black");
  }

  // Linker Titel (variabel)
  const graphTitleLeft = svgLeft
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .style("font-size", "32px")
    .style("font-weight", "bold")
    .text("Keine Auswahl");

  // Rechter Titel (fest)
  svgRight
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .style("font-size", "32px")
    .style("font-weight", "bold")
    .text("Straftaten insgesamt pro 100.000 Einwohnern");

  // Diagramme zeichnen
  drawScatter(svgLeft, dataLeft);
  drawScatter(svgRight, dataRight);

  // Button-Klick
  document
    .getElementById("bestaetigen")
    .addEventListener("click", () => {

      const checked = document.querySelectorAll(
        'input[type="checkbox"]:checked'
      );

    const auswahl = Array.from(checked)
    .map(cb => `${cb.name}: ${cb.value}`)
    .join(", ");

      graphTitleLeft.text(
        auswahl.length > 0
          ? auswahl
          : "Keine Auswahl"
      );

    });

});