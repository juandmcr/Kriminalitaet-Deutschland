import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const data = [
  { city: "Leipzig", count: 15 },
  { city: "Berlin", count: 20 },
  { city: "Dresden", count: 8 }
];

const svg = d3
  .select("body")
  .append("svg")
  .attr("width", 400)
  .attr("height", 250)
  .style("border", "1px solid black");

svg
  .selectAll("rect")
  .data(data)
  .enter()
  .append("rect")
  .attr("x", (d, i) => i * 120 + 30)
  .attr("y", d => 200 - d.count * 8)
  .attr("width", 80)
  .attr("height", d => d.count * 8)
  .attr("fill", "steelblue");

svg
  .selectAll(".city")
  .data(data)
  .enter()
  .append("text")
  .attr("x", (d, i) => i * 120 + 70)
  .attr("y", 220)
  .attr("text-anchor", "middle")
  .text(d => d.city);

svg
  .selectAll(".value")
  .data(data)
  .enter()
  .append("text")
  .attr("x", (d, i) => i * 120 + 70)
  .attr("y", d => 190 - d.count * 8)
  .attr("text-anchor", "middle")
  .text(d => d.count);