import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

// Load dataset and map
const file = "economy-and-growth.csv";
const worldMapUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const cols = {
  name: "Country Name",
  code: "Country Code",
  year: "Year",
  s_dom: "average_value_Gross domestic savings (% of GDP)",
  s_gross: "average_value_Gross savings (% of GDP)",
  gdp_usd: "average_value_GDP (current US$)",
  gdp_pc_usd: "average_value_GDP per capita (current US$)",
  gdp_pc_ppp: "average_value_GDP per capita, PPP (constant 2017 international $)",
  gdp_growth: "average_value_GDP growth (annual %)"
};

const [raw, world] = await Promise.all([
  d3.csv(file, d3.autoType),
  d3.json(worldMapUrl)
]);

const data = raw.map(d => ({
  name: d[cols.name],
  code: d[cols.code],
  year: +d[cols.year],
  sDom: +d[cols.s_dom],
  sGross: +d[cols.s_gross],
}));

const countries = feature(world, world.objects.countries);

const years = d3.extent(data, d => d.year);
const state = { year: years[1] || 2019 };

// Build charts
buildStacked();
buildMap();

let updateStacked = () => {};
let updateMap = () => {};

// ================= STACKED BAR ===================
function buildStacked() {
  const svg = d3.select("#stacked");
  svg.selectAll("*").remove();

  const W = svg.node().clientWidth,
    H = svg.node().clientHeight;
  const margin = { top: 30, right: 20, bottom: 50, left: 60 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const byYear = d3.rollups(
    data,
    v => ({
      sDom: d3.mean(v, d => d.sDom),
      sGross: d3.mean(v, d => d.sGross)
    }),
    d => d.year
  ).sort((a, b) => a[0] - b[0]);

  const stack = d3.stack().keys(["sDom", "sGross"]);
  const color = d3.scaleOrdinal()
    .domain(["sDom", "sGross"])
    .range(["#60a5fa", "#f59e0b"]);

  const x = d3.scaleBand()
    .domain(byYear.map(d => d[0]))
    .range([0, innerW])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(byYear, ([, v]) => (v.sDom + v.sGross))])
    .nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => !(i % 5))))
    .attr("color", "#bbb");

  g.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d + "%"))
    .attr("color", "#bbb");

  const yearData = byYear.map(([year, vals]) => ({ year, ...vals }));
  const stackedData = stack(yearData);

  g.selectAll(".layer")
    .data(stackedData)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d.map(v => ({ key: d.key, data: v.data, y0: v[0], y1: v[1] })))
    .join("rect")
    .attr("x", d => x(d.data.year))
    .attr("y", d => y(d.y1))
    .attr("height", d => y(d.y0) - y(d.y1))
    .attr("width", x.bandwidth());

  updateStacked = (year) => {
    const highlight = g.selectAll(".highlightRect").data([year]);
    highlight.join("rect")
      .attr("class", "highlightRect")
      .attr("x", x(year))
      .attr("width", x.bandwidth())
      .attr("y", 0)
      .attr("height", innerH)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2);
  };
}

// ================= WORLD MAP ===================
function buildMap() {
  const svg = d3.select("#map");
  svg.selectAll("*").remove();

  const W = svg.node().clientWidth,
    H = svg.node().clientHeight;
  const projection = d3.geoNaturalEarth1().scale(W / 6.2).translate([W / 2, H / 1.7]);
  const path = d3.geoPath(projection);
  const tooltip = makeTooltip();

  const color = d3.scaleSequential(d3.interpolateYlOrBr).domain([0, 40]);

  function render(year) {
    const yearData = new Map(data.filter(d => d.year === year).map(d => [d.code, d.sGross]));

    svg.selectAll("path")
      .data(countries.features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const val = yearData.get(d.id) ?? NaN;
        return isNaN(val) ? "#333" : color(val);
      })
      .attr("stroke", "#222")
      .attr("stroke-width", 0.3)
      .on("mousemove", (event, d) => {
        const val = yearData.get(d.id);
        tooltip.show(event, `<b>${d.properties.name}</b><br>Gross savings: ${val ? val.toFixed(1) + "%" : "N/A"}`);
      })
      .on("mouseleave", () => tooltip.hide());
  }

  updateMap = render;
  render(state.year);
}

// ================= TOOLTIP ===================
function makeTooltip() {
  let div = d3.select(".tooltip");
  if (div.empty()) {
    div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
  }
  return {
    show(ev, html) {
      div.style("opacity", 1).html(html)
        .style("left", ev.clientX + 12 + "px")
        .style("top", ev.clientY + 12 + "px");
    },
    hide() {
      div.style("opacity", 0);
    }
  };
}

// ================== EVENT HANDLERS ==================
d3.select("#yearRange").on("input", e => {
  state.year = +e.target.value;
  d3.select("#yearLabel").text(state.year);
  updateStacked(state.year);
  updateMap(state.year);
});
