import * as Papa from "papaparse";
import Plotly from "plotly.js-dist";
import _ from "lodash";

Papa.parsePromise = function(file) {
  return new Promise(function(complete, error) {
    Papa.parse(file, {
      header: true,
      download: true,
      dynamicTyping: true,
      complete,
      error
    });
  });
};

const loadData = async () => {
  const csv = await Papa.parsePromise(
    "https://raw.githubusercontent.com/IHIutch/Fantasy-Premier-League/master/data/2019-20/gws/gw1.csv"
  );
  return csv.data;
};

const renderOutcomes = data => {
  const names = data.map(r => r.name);
  const weekPoints = data.map(r => r.total_points);

  console.log(weekPoints);

  const chartData = [
    {
      x: names,
      y: weekPoints,
      type: "bar"
    }
  ];

  Plotly.newPlot("outcomes", chartData);
};

const run = async () => {
  const data = await loadData();
  renderOutcomes(data);
};

document.addEventListener("DOMContentLoaded", run);
