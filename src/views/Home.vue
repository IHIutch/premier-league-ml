<template>
  <div>
    <div>
      <div>
        <select v-model="playerName">
          <option :value="null">-- Choose a Player --</option>
          <option v-for="(player, idx) in players" :value="idx" :key="idx">
            {{ player }}
          </option>
        </select>
      </div>
      <div>
        <span>Predicted Points: {{ output }}</span>
      </div>
      <div>
        <span>Actual Points: {{ actual }}</span>
      </div>
      <div>
        <span>Error: {{ errorRate }}%</span>
      </div>
    </div>
    <button @click="trainBrain()">Train</button>
    <button @click="runBrain()">Run</button>
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
      playerName: null,
      output: null,
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
      trainingData: []
    };
  },
  methods: {
    runBrain() {
      let output = net.run(this.trainingData[this.playerName].input);
      this.output = (output * this.maxValues.total_points).toFixed(4);
      this.actual = this.csvData[this.playerName].total_points;
    },
    getTrainingData() {
      this.trainingData = this.csvData.map(data => {
        var inputs = [];
        var outputs = [];
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
    },
    loadData() {
      var self = this;
      Papa.parse(
        "https://raw.githubusercontent.com/IHIutch/Fantasy-Premier-League/master/data/2019-20/gws/gw1.csv",
        {
          download: true,
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: function(res) {
            self.csvData = res.data;
          }
        }
      );
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
        return pct.toFixed(4);
      } else {
        return null;
      }
    },
    players() {
      return this.csvData.map(data => {
        return data.name;
      });
    }
  }
};
</script>
