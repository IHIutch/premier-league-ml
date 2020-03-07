<template>
  <div>
    <div>
      <div>
        <select v-model="player">
          <option :value="null">-- Choose a Player --</option>
          <option
            v-for="(player, idx, count) in players"
            :value="idx"
            :key="count"
          >
            {{ idx }}
          </option>
        </select>
        <select v-model="week">
          <option :value="null">-- Choose a GW --</option>
          <option v-for="(num, idx) in urls.length" :value="idx" :key="idx">
            {{ num }}
          </option>
        </select>
      </div>
      <div>
        <span>Predicted Points: {{ output | roundToThousandths }}</span>
      </div>
      <div>
        <span>Actual Points: {{ actual }}</span>
      </div>
      <div>
        <span>Error: {{ errorRate | roundToThousandths }}%</span>
      </div>
    </div>
    <button @click="trainBrain()">Train</button>
    <button @click="runBrain()" :disabled="!didTrain">Run</button>
  </div>
</template>

<script>
import * as brain from "brain.js";
import * as Papa from "papaparse";

const config = {
  binaryThresh: 0.5,
  hiddenLayers: [3],
  activation: "sigmoid"
};

const net = new brain.NeuralNetwork(config);

export default {
  name: "Home",
  data() {
    return {
      urls: [
        "https://raw.githubusercontent.com/IHIutch/Fantasy-Premier-League/master/data/2019-20/gws/gw1.csv",
        "https://raw.githubusercontent.com/IHIutch/Fantasy-Premier-League/master/data/2019-20/gws/gw2.csv"
      ],
      player: null,
      week: null,
      output: 0,
      actual: null,
      csvData: [],
      columns: [
        "assists",
        "bonus",
        "bps",
        "clean_sheets",
        "creativity",
        "element",
        "fixture",
        "goals_conceded",
        "goals_scored",
        "ict_index",
        "influence",
        "selected",
        "total_points"
      ],
      maxValues: {},
      trainingData: [],
      didTrain: false
    };
  },
  methods: {
    runBrain() {
      let value = [];
      Object.keys(this.playerWeek).forEach(key => {
        if (this.columns.indexOf(key) != -1 && key != "total_points")
          value.push(this.playerWeek[key] / this.maxValues[key]);
      });
      let output = net.run(value);
      this.output = output * this.maxValues.total_points;
      this.actual = this.playerWeek.total_points;
    },
    getTrainingData() {
      this.trainingData = this.csvData.map(data => {
        let inputs = [];
        let outputs = [];
        this.columns.forEach(idx => {
          if (idx == "total_points") {
            outputs.push(data[idx] / this.maxValues[idx]);
          } else {
            inputs.push(data[idx] / this.maxValues[idx]);
          }
        });
        return {
          input: inputs,
          output: outputs
        };
      });
    },
    trainBrain() {
      const config = {
        errorThresh: 0.001,
        learningRate: 0.4,
        log: log => {
          console.log(log.error);
        }
      };
      this.getMaxValues();
      this.getTrainingData();
      net.train(this.trainingData, config);
      this.didTrain = true;
    },
    loadData() {
      var self = this;
      this.urls.forEach(url => {
        Papa.parse(url, {
          download: true,
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: function(res) {
            self.csvData = [].concat(...self.csvData, res.data);
          }
        });
      });
    },
    getMaxValues() {
      this.csvData.forEach(data => {
        this.columns.forEach(col => {
          if (!this.maxValues[col]) this.maxValues[col] = 0;
          if (this.maxValues[col] < data[col]) this.maxValues[col] = data[col];
        });
      });
    }
  },
  mounted() {
    this.loadData();
    // this.trainBrain();
  },
  computed: {
    errorRate() {
      if (this.output && this.actual) {
        var pct = (Math.abs(this.output - this.actual) / this.actual) * 100;
        return pct;
      } else {
        return 0;
      }
    },
    players() {
      return this.csvData.reduce((obj, data) => {
        if (!obj[data.name]) {
          obj[data.name] = [];
          obj[data.name].push(data);
        } else {
          obj[data.name].push(data);
        }
        return obj;
      }, {});
    },
    playerWeek() {
      if (this.player != null && this.week != null) {
        return this.players[this.player][this.week];
      } else {
        return null;
      }
    }
  },
  filters: {
    roundToThousandths(val) {
      return val.toFixed(3);
    }
  }
};
</script>
