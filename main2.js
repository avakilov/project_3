import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

const worldMapUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// --- Load both the map and (optional) CSV data ---
let data = [];
try {
  data = await d3.csv("economy-and-growth.csv", d3.autoType);
  console.log("Loaded CSV:", data.length, "rows");
} catch (err) {
  console.warn("CSV not found, showing sample map instead.");
}

// --- Build both charts ---
buildStacked();
buildMap();

// ================== STACKED BAR ==================
function buildStacked() {
  const svg = d3.select("#stacked");
  svg.selectAll("*").remove();

  const W = svg.node().clientWidth;
  const H = svg.node().clientHeight;
  const margin = { top: 30, right: 20, bottom: 50, left: 60 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Dummy data (if CSV not found)
  const years = d3.range(1990, 2021);
  const sDom = years.map(y => ({ year: y, sDom: Math.random() * 20 + 5, sGross: Math.random() * 20 + 10 }));

  const stack = d3.stack().keys(["sDom", "sGross"]);
  const color = d3.scaleOrdinal().domain(["sDom", "sGross"]).range(["#60a5fa", "#f59e0b"]);

  const x = d3.scaleBand().domain(years).range([0, innerW]).padding(0.1);
  const y = d3.scaleLinear().domain([0, 50]).range([innerH, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => !(i % 5))))
    .attr("color", "#bbb");

  g.append("g").call(d3.axisLeft(y)).attr("color", "#bbb");

  const stackedData = stack(sDom);
  g.selectAll(".layer")
    .data(stackedData)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d.map(v => ({ key: d.key, year: v.data.year, y0: v[0], y1: v[1] })))
    .join("rect")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.y1))
    .attr("height", d => y(d.y0) - y(d.y1))
    .attr("width", x.bandwidth());
}

// ================== MAP ==================
async function buildMap() {
  const world = await d3.json(worldMapUrl);
  const countries = feature(world, world.objects.countries);
  const svg = d3.select("#map");
  svg.selectAll("*").remove();

  const W = svg.node().clientWidth;
  const H = svg.node().clientHeight;

  const projection = d3.geoNaturalEarth1().scale(W / 6.2).translate([W / 2, H / 1.6]);
  const path = d3.geoPath(projection);

  const tooltip = makeTooltip();

  // Sample random data if CSV not available
  const mapData = new Map();
  countries.features.forEach(f => {
    mapData.set(f.id, Math.random() * 40);
  });

  const color = d3.scaleSequential(d3.interpolateYlGnBu).domain([0, 40]);

  svg.selectAll("path")
    .data(countries.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => color(mapData.get(d.id) || 0))
    .attr("stroke", "#333")
    .attr("stroke-width", 0.3)
    .on("mousemove", (event, d) => {
      const val = mapData.get(d.id);
      tooltip.show(event, `<b>${d.properties.name}</b><br>Gross savings: ${val ? val.toFixed(1) + "%" : "N/A"}`);
    })
    .on("mouseleave", () => tooltip.hide());

  // Legend
  const legendW = 200, legendH = 10;
  const legend = svg.append("g").attr("transform", `translate(60,40)`);

  const grad = legend.append("defs").append("linearGradient").attr("id", "mapGrad");
  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", color(t * 40));
  });

  legend.append("rect")
    .attr("width", legendW)
    .attr("height", legendH)
    .style("fill", "url(#mapGrad)");

  legend.append("text").attr("x", 0).attr("y", -5).attr("fill", "#ccc").text("Gross savings (% of GDP)");
  legend.append("text").attr("x", 0).attr("y", 25).attr("fill", "#ccc").text("Low");
  legend.append("text").attr("x", legendW - 25).attr("y", 25).attr("fill", "#ccc").text("High");
}

// ================== TOOLTIP ==================
function makeTooltip() {
  let div = d3.select(".tooltip");
  if (div.empty()) {
    div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
  }
  return {
    show(ev, html) {
      div.style("opacity", 1)
        .html(html)
        .style("left", ev.clientX + 12 + "px")
        .style("top", ev.clientY + 12 + "px");
    },
    hide() {
      div.style("opacity", 0);
    }
  };
}
