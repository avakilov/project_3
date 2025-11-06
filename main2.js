const width = 620, height = 420;

Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
  // Using smaller sample dataset for faster initial load
  d3.csv("https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv")
]).then(([world, savingsData]) => {

  const countries = topojson.feature(world, world.objects.countries);
  const projection = d3.geoNaturalEarth1().scale(130).translate([width / 2, height / 1.5]);
  const path = d3.geoPath(projection);

  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, 80000]);

  const mapSvg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const barSvg = d3.select("#bar-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Draw map
  mapSvg.selectAll("path")
    .data(countries.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const country = savingsData.find(s => s['CODE'] === d.id);
      return country ? color(+country['GDP (BILLIONS)'] * 1000) : "#333";
    })
    .attr("stroke", "#444")
    .on("mouseover", (event, d) => {
      const country = savingsData.find(s => s['CODE'] === d.id);
      tooltip.transition().duration(100).style("opacity", 1);
      tooltip.html(`<b>${country ? country['COUNTRY'] : d.properties.name}</b><br>GDP: ${country ? '$' + country['GDP (BILLIONS)'] + 'B' : 'N/A'}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));

  // Bar chart data
  const sorted = savingsData
    .sort((a, b) => d3.descending(+a['GDP (BILLIONS)'], +b['GDP (BILLIONS)']))
    .slice(0, 15);

  const x = d3.scaleBand()
    .domain(sorted.map(d => d['COUNTRY']))
    .range([60, width - 30])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(sorted, d => +d['GDP (BILLIONS)'])])
    .nice()
    .range([height - 50, 40]);

  barSvg.append("g")
    .attr("transform", `translate(0,${height - 50})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("fill", "#ccc")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end");

  barSvg.append("g")
    .attr("transform", `translate(60,0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .attr("fill", "#ccc");

  barSvg.selectAll(".bar")
    .data(sorted)
    .join("rect")
    .attr("class", "bar")
    .attr("x", d => x(d['COUNTRY']))
    .attr("y", d => y(+d['GDP (BILLIONS)']))
    .attr("width", x.bandwidth())
    .attr("height", d => height - 50 - y(+d['GDP (BILLIONS)']))
    .attr("fill", "#00b3ff")
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(100).style("opacity", 1);
      tooltip.html(`<b>${d['COUNTRY']}</b><br>GDP: $${d['GDP (BILLIONS)']}B`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));
});