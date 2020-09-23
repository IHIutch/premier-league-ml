<template>
  <div id="app">
    <b-container class="mt-5">
      <b-row class="mb-4">
        <b-col>
          <div class="mb-4">
            <b-form-select v-model="player" :options="players">
              <template v-slot:first>
                <b-form-select-option :value="null" disabled
                  >-- Select a Player --</b-form-select-option
                >
              </template>
            </b-form-select>
          </div>
          <div class="d-flex mb-4">
            <div class="mr-4">
              <span>Predicted Points: {{ output | round(3) }}</span>
            </div>
            <div class="mr-4">
              <span>Actual Points: {{ actualPoints }}</span>
            </div>
            <div>
              <span>Error: {{ errorRate | round(3) }}%</span>
            </div>
          </div>
          <div>
            <b-button class="mr-4" @click="trainBrain()">Train</b-button>
            <b-button
              variant="primary"
              @click="runBrain()"
              :disabled="!didTrain"
              >Run</b-button
            >
          </div>
        </b-col>
      </b-row>
      <b-row>
        <b-col cols="6">
          <b-form-group class="mb-0">
            <b-input-group>
              <b-form-input
                v-model="table.filter"
                type="search"
                id="filterInput"
                placeholder="Type to Search"
              ></b-form-input>
              <b-input-group-append>
                <b-button :disabled="!table.filter" @click="table.filter = ''"
                  >Clear</b-button
                >
              </b-input-group-append>
            </b-input-group>
          </b-form-group>
        </b-col>
        <b-col cols="6">
          <b-pagination
            v-model="table.currentPage"
            :total-rows="players.length"
            :per-page="table.perPage"
            align="fill"
            class="my-0"
          ></b-pagination>
        </b-col>
        <b-col>
          <b-table
            class="mt-4"
            striped
            hover
            small
            :items="players"
            :fields="['name']"
            :current-page="table.currentPage"
            :per-page="table.perPage"
            :filter="table.filter"
          >
            <template v-slot:cell(name)="data">
              {{ data.value }}
            </template>
          </b-table>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script>
import * as brain from "brain.js";
import * as Papa from "papaparse";

const config = {
  binaryThresh: 0.5,
  hiddenLayers: [8, 8],
  activation: "sigmoid"
};

const net = new brain.NeuralNetwork(config);

export default {
  name: "App",
  data() {
    return {
      table: {
        perPage: 25,
        currentPage: 1,
        filter: ""
      },
      didTrain: false,
      weeksOfData: 10,
      dataRange: 5,
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
        "threat",
        "value",
        "minutes",
        "team_a_score",
        "team_h_score",
        "transfers_in",
        "transfers_out"
      ],
      player: null,
      output: 0,
      csvData: [],
      maxValues: {},
      trainingData: [],
      normalizedData: []
    };
  },
  methods: {
    getMaxValues() {
      const cols = [...this.columns, "total_points"];

      cols.forEach(col => {
        this.maxValues[col] = this.csvData.reduce((acc, row) => {
          return Math.max(acc, row[col]);
        }, 0);
      });
    },
    runBrain() {
      let value = [];
      Object.keys(this.playerWeek).forEach(key => {
        if (this.columns.indexOf(key) != -1 && key != "total_points")
          value.push(this.playerWeek[key] / this.maxValues[key]);
      });
      let output = net.run(value);
      this.output = output * this.maxValues.total_points;
    },
    setTrainingData() {
      return this.csvData.reduce((acc, player) => {
        acc[player.name] = [...(acc[player.name] || []), player];
        return acc;
      }, {});
    },
    formatData() {
      let playersList = this.setTrainingData();
      let formattedData = [];
      Object.keys(playersList).forEach(player => {
        if (playersList[player].length == this.weeksOfData) {
          for (
            var range = 0;
            range < this.weeksOfData - this.dataRange;
            range++
          ) {
            let tmpObj = { input: [], output: [] };
            for (var week = range; week < range + this.dataRange; week++) {
              var { total_points, ...input } = playersList[player][week];
              tmpObj.input = [].concat(
                ...tmpObj.input,
                Object.keys(input).map(key => {
                  return input[key];
                })
              );
              tmpObj.output = [playersList[player][week + 1]["total_points"]];
            }
            formattedData.push(tmpObj);
          }
        }
      });
      console.log(formattedData);
      return formattedData;
    },
    trainBrain() {
      const config = {
        errorThresh: 0.0005,
        learningRate: 0.4,
        log: log => {
          console.log(log);
        }
      };
      const data = this.formatData();
      net.train(data, config);
    },
    loadData() {
      var self = this;
      let i;
      for (i = 1; i <= this.weeksOfData; i++) {
        Papa.parse(
          `https://raw.githubusercontent.com/IHIutch/Fantasy-Premier-League/master/data/2019-20/gws/gw${i}.csv`,
          {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(res) {
              self.csvData.push(...res.data);
            }
          }
        );
      }
    }
  },
  mounted() {
    this.loadData();
  },
  computed: {
    errorRate() {
      return this.output && this.actualPoints
        ? (Math.abs(this.output - this.actualPoints) / this.actualPoints) * 100
        : 0;
    },
    players() {
      let uniquePlayers = [
        ...new Set(this.csvData.map(row => row.name))
      ].sort();
      return uniquePlayers.map(p => {
        return { name: p };
      });
    },
    playerWeek() {
      return this.player != null && this.week != null
        ? this.players[this.player][this.week]
        : null;
    },
    actualPoints() {
      return this.playerWeek ? this.playerWeek.total_points : null;
    }
  },
  filters: {
    round(val, dec) {
      return val.toFixed(dec);
    }
  }
};
</script>
