// --- SVG setup ---
const width = 600, height = 400;

// Load map and savings data
Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
  d3.csv("https://raw.githubusercontent.com/owid/owid-datasets/master/datasets/Gross%20savings%20(%25%20of%20GDP)%20-%20World%20Bank/gross-savings.csv")
]).then(([world, savingsData]) => {

  const countries = topojson.feature(world, world.objects.countries);
  const mapSvg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "#1a1a1a");

  const projection = d3.geoNaturalEarth1().scale(130).translate([width/2, height/2]);
  const path = d3.geoPath(projection);

  const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, 40]);

  let year = 2019;

  // Bar chart
  const barSvg = d3.select("#bar-chart").append("svg")
    .attr("width", width)
    .attr("height", height);

  function updateCharts(selectedYear) {
    year = selectedYear;
    d3.select("#year-value").text(year);

    // --- Filter savings data ---
    const yearData = savingsData.filter(d => +d.Year === year);

    // --- Update map ---
    const valueByCountry = {};
    yearData.forEach(d => {
      valueByCountry[d.Entity] = +d["Gross savings (% of GDP)"];
    });

    mapSvg.selectAll("path").remove();
    mapSvg.selectAll("path")
      .data(countries.features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => color(valueByCountry[d.properties.name] || 0))
      .attr("stroke", "#333")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(100).style("opacity", 1);
        tooltip.html(`<b>${d.properties.name}</b><br>Gross Savings: ${valueByCountry[d.properties.name] || "N/A"}%`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));

    // --- Bar chart update ---
    const topCountries = yearData.sort((a,b) => d3.descending(+a["Gross savings (% of GDP)"], +b["Gross savings (% of GDP)"]))
      .slice(0, 20);

    const x = d3.scaleBand()
      .domain(topCountries.map(d => d.Entity))
      .range([50, width - 30])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(topCountries, d => +d["Gross savings (% of GDP)"])])
      .nice()
      .range([height - 50, 30]);

    barSvg.selectAll("*").remove();

    barSvg.append("g")
      .attr("transform", `translate(0,${height - 50})`)
      .call(d3.axisBottom(x).tickFormat(d => d.length > 8 ? d.slice(0,8) + "…" : d))
      .selectAll("text")
      .attr("fill", "#ddd")
      .attr("font-size", "10px");

    barSvg.append("g")
      .attr("transform", `translate(50,0)`)
      .call(d3.axisLeft(y).ticks(6))
      .selectAll("text")
      .attr("fill", "#ddd");

    barSvg.selectAll(".bar")
      .data(topCountries)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.Entity))
      .attr("y", d => y(+d["Gross savings (% of GDP)"]))
      .attr("width", x.bandwidth())
      .attr("height", d => height - 50 - y(+d["Gross savings (% of GDP)"]))
      .attr("fill", "#3fa9f5")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(100).style("opacity", 1);
        tooltip.html(`<b>${d.Entity}</b><br>${d["Gross savings (% of GDP)"]}%`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));
  }

  // Initial draw
  updateCharts(year);

  // Year slider
  d3.select("#year").on("input", function() {
    updateCharts(+this.value);
  });

  // Reset button
  d3.select("#reset").on("click", () => {
    d3.select("#country-filter").property("value", "");
    updateCharts(year);
  });
});
