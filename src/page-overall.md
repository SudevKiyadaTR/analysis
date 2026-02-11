---
theme: dashboard
title: Overall insights
toc: false
---

# ZIPNET Delhi analysis

<!-- Load and transform the data -->

```js
// maplibregl = require("maplibre-gl@2.1.9");
import maplibregl from "maplibre-gl";
import { circle } from "@turf/turf";

const data = await FileAttachment("data/zipnet_processed.csv").csv({
  typed: true,
});

const locationsData = await FileAttachment(
  "data/ps_locations_geocoded.csv",
).csv({
  typed: true,
});

const currentYear = new Date().getFullYear();
const dataCurrentYear = data.filter((x) => x.reportingYear == currentYear);

const currentRatio =
  dataCurrentYear.filter((x) => x.tracingStatus === "Traced").length /
  dataCurrentYear.length;
```

<div class="grid grid-cols-4">
  <div class="card">
    <h2>Total missing people</h2>
    <span class="big">${data.length}</span>
  </div>
  <div class="card">
    <h2>Total this year <span class="muted">${currentYear}</span></h2>
    <span class="big">${dataCurrentYear.length}</span>
  </div>
  <div class="card">
    <h2>Traced % this year</h2>
    <span class="big">${currentRatio.toFixed(2)}%</span>
  </div>
  <div class="card">
    <h2>Last updated</h2>
    <span class="big">${data.at(-1).reportingDate.toDateString()}</span>
  </div>
</div>

<!-- Plot of missing people over the years -->

```js
const overTheYearsData = d3.rollup(
  data.filter((x) => x.reportingYear >= 2000),
  (v) => v.length,
  (d) => d.reportingYear,
  (x) => x.tracingStatus,
);
const overTheYears = Object.entries(
  Object.fromEntries(overTheYearsData),
).flatMap(([year, map]) =>
  [...map].map((d) => ({
    year: parseInt(year),
    count: d[1],
    tracingStatus: d[0],
  })),
);
```

```js
function dv_years(data, { width } = {}) {
  return Plot.plot({
    title: "Missing people over the years",
    width,
    height: 300,
    color: { legend: true },
    y: { grid: true, label: "People missing" },
    marks: [
      Plot.barY(overTheYears, {
        x: "year",
        y: "count",
        fill: "tracingStatus",
        order: "tracingStatus",
        tip: true,
      }),
      Plot.ruleY([0]),
    ],
  });
}
```

<div class="grid grid-cols-1">
  <div class="card">
    ${resize((width) => dv_years(data, {width}))}
  </div>
</div>

---

<!-- Select year for focus -->

## Reports filed month wise

```js
const selectedYear = view(
  Inputs.range([1950, currentYear], {
    label: html`Year`,
    step: 1,
    value: 2025,
  }),
);
```

```js
const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const monthName = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "June",
  "July",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

function dv_selected_year(data, { width } = {}) {
  const selectedYearRaw = data.filter((x) => x.reportingYear == selectedYear);
  const selectedYearData = Object.entries(
    Object.fromEntries(
      d3.rollup(
        selectedYearRaw,
        (v) => v.length,
        (x) => x.reportingMonth,
        (x) => x.ageGroup,
      ),
    ),
  ).flatMap(([x, y]) =>
    [...y].map((d) => ({
      month: monthName[parseInt(x) - 1],
      ageGroup: d[0],
      count: d[1],
    })),
  );

  return Plot.plot({
    title: "Missing people over the years",
    width,
    height: 300,
    color: { legend: true },
    x: { domain: monthName, label: "Month" },
    y: { grid: true, label: "People missing", domain: [0, 5000] },
    marks: [
      Plot.rectY(selectedYearData, {
        x: "month",
        y: "count",
        fill: "ageGroup",
        order: "ageGroup",
        tip: true,
      }),
      Plot.ruleY([0]),
    ],
  });
}
```

<div class="grid grid-cols-1">
  <div class="card">
    ${resize((width) => dv_selected_year(data, {width}))}
  </div>
</div>

---

## Reports by date-month

```js
function dv_date_month(data, { width } = {}) {
  const procData = Object.entries(
    Object.fromEntries(
      d3.rollup(
        data.filter(
          (x) => x.reportingMonth !== null && x.reportingDay !== null,
        ),
        (v) => v.length,
        (x) => x.reportingDateMonth,
      ),
    ),
  );

  return Plot.plot({
    title: "Missing people over the years",
    width,
    height: 400,
    color: {
      scheme: "YlOrRd",
      legend: true,
    },
    y: { grid: true, label: "Month" },
    x: { grid: true, label: "Day" },
    marks: [
      Plot.cell(procData, {
        x: (d) => parseInt(d[0].split("-")[0]),
        y: (d) => parseInt(d[0].split("-")[1]),
        fill: (d) => d[1],
        inset: 0.5,
      }),
      Plot.text(procData, {
        x: (d) => parseInt(d[0].split("-")[0]),
        y: (d) => parseInt(d[0].split("-")[1]),
        text: (d) => d3.format(".2s")(d[1]),
        fill: "black",
        stroke: "#ffffff88",
        title: "title",
      }),
    ],
  });
}
```

<div class="grid grid-cols-1">
  <div class="card">
    ${resize((width) => dv_date_month(data, {width}))}
  </div>
</div>

---

## Reports by police stations

```js
const PSRecordsToShow = view(
  Inputs.range([1, 50], {
    label: html`Records to show`,
    step: 1,
    value: 10,
  }),
);
```

```js
function dv_ps(data, { width } = {}) {
  const dataPS = Object.entries(
    Object.fromEntries(
      d3.rollup(
        data,
        (v) => v.length,
        (x) => x.policeStation,
        (x) => x.reportingYear,
      ),
    ),
  )
    .sort(
      (a, b) =>
        [...b[1]].map((x) => x[1]).reduce((a, c) => a + c) -
        [...a[1]].map((x) => x[1]).reduce((a, c) => a + c),
    )
    .slice(0, PSRecordsToShow);

  const flatDataPS = dataPS.flatMap(([ps, map]) =>
    [...map].map((d) => ({
      station: ps,
      year: d[0],
      count: d[1],
    })),
  );

  return Plot.plot({
    title: "Missing people over the years",
    width,
    height: 400,
    color: {
      scheme: "Reds",
      legend: true,
    },
    x: {
      domain: [...dataPS].map((x) => x[0]),
      label: "Police Station",
    },
    y: { grid: true, label: "People missing" },
    marks: [
      Plot.barY(flatDataPS, {
        x: "station",
        y: "count",
        fill: "count",
        order: "year",
        tip: {
          format: {
            station: true,
            count: true,
            year: true,
            stroke: false,
          },
        },
        channels: { count: "count", year: "year" },
        stroke: "white",
        strokeWidth: 0.2,
      }),
      Plot.ruleY([0]),
    ],
  });
}
```

<div class="grid grid-cols-1">
  <div class="card">
    ${resize((width) => dv_ps(data, {width}))}
  </div>
</div>

---

## Map

```js
const dataPS = Object.entries(
  Object.fromEntries(
    d3.rollup(
      data,
      (v) => v.length,
      (x) => x.policeStation,
    ),
  ),
).sort((a, b) => b[1] - a[1]);

let PSLocations = dataPS.map((x) => ({
  station: x[0],
  count: x[1],
  latitude:
    locationsData.find((z) => z.police_station == x[0])?.latitude ?? null,
  longitude:
    locationsData.find((z) => z.police_station == x[0])?.longitude ?? null,
}));

PSLocations = PSLocations.filter((x) => x.latitude && x.longitude);

// function dv_map(data, { width } = {}) {
const div = display(document.createElement("div"));
div.style = "height: 400px; position: relative;";

const map = new maplibregl.Map({
  container: div,
  style: "https://tiles.openfreemap.org/styles/bright",
  center: [77.21541462223604, 28.647338438783706],
  zoom: 10,
  attributionControl: false,
});

function constrain(n, low, high) {
  return Math.max(Math.min(n, high), low);
}

function lerp(n, start1, stop1, start2, stop2, withinBounds = true) {
  const newval = ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
  if (!withinBounds) {
    return newval;
  }
  if (start2 < stop2) {
    return constrain(newval, start2, stop2);
  } else {
    return constrain(newval, stop2, start2);
  }
}

map.on("load", () => {
  const radiusCenter = [77.21541462223604, 28.647338438783706];

  const coords = PSLocations.map((x) => [x.longitude, x.latitude]);
  console.log(coords);

  const countExtent = d3.extent(PSLocations.map((x) => x.count));

  // 2) Build a GeoJSON FeatureCollection
  const pointsGeoJSON = {
    type: "FeatureCollection",
    features: PSLocations.map((c, i) => ({
      type: "Feature",
      properties: {
        id: i,
        name: `Point ${i + 1}`,
        count: c.count,
        station: c.station,
        size: lerp(c.count, countExtent[0], countExtent[1], 1, 20),
      },
      geometry: {
        type: "Point",
        coordinates: [c.longitude, c.latitude],
      },
    })),
  };

  // Create a popup, but don't add it to the map yet.
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  // Add the circle as a GeoJSON source
  map.addSource("points", {
    type: "geojson",
    data: pointsGeoJSON,
  });

  //   // Add a fill layer with some transparency
  map.addLayer({
    id: "stations",
    type: "circle",
    source: "points",
    paint: {
      "circle-color": "#aa0000",
      "circle-radius": ["get", "size"],
      "circle-opacity": 0.5,
    },
  });

  let currentFeatureCoordinates = undefined;
  map.on("mousemove", "stations", (e) => {
    const featureCoordinates = e.features[0].geometry.coordinates.toString();
    if (currentFeatureCoordinates !== featureCoordinates) {
      currentFeatureCoordinates = featureCoordinates;

      // Change the cursor style as a UI indicator.
      map.getCanvas().style.cursor = "pointer";

      const coordinates = e.features[0].geometry.coordinates.slice();
      const description = `${e.features[0].properties.station}</br>${e.features[0].properties.count}`;

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      // Populate the popup and set its coordinates
      // based on the feature found.
      popup.setLngLat(coordinates).setHTML(description).addTo(map);
    }
  });

  map.on("mouseleave", "stations", () => {
    currentFeatureCoordinates = undefined;
    map.getCanvas().style.cursor = "";
    popup.remove();
  });
});
```

<style>
.maplibregl-popup {
	background-color: rgba(0, 0, 0, 0.8);
	top: 0%;
	left: 0%;
	position: absolute;
	pointer-events: none;
	padding: 8px;
	border-radius: 4px;
}
</style>
