<template>
  <div id="app">
    <b-container class="mt-5">
      <b-row class="mb-4">
        <b-col>
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
            :total-rows="Object.keys(players).length"
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
            :fields="[
              { key: 'first_name', sortable: true },
              { key: 'second_name', sortable: true, label: 'Last Name' },
              { key: 'position', sortable: true },
              { key: 'team', sortable: true },
              { key: 'now_cost', sortable: true },
              {
                key: 'chance_of_playing_this_round',
                label: 'Chance of Playing',
                sortable: true
              },
              { key: 'total_points', sortable: true, label: 'Points' },
              { key: 'predicted_points', sortable: true }
            ]"
            :current-page="table.currentPage"
            :per-page="table.perPage"
            :filter="table.filter"
            sort-by="now_cost"
            :sort-desc="true"
            ref="table"
          >
            <template #cell(now_cost)="data"> ${{ data.value }} </template>
          </b-table>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script>
import * as brain from "brain.js";
import * as Papa from "papaparse";
import * as fs from "fs";
import dayjs from "dayjs";
import trainings from "@/trainings";
import axios from "axios";

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
      weeksOfData: 17,
      dataRange: 5,
      columns: [
        // "xP",
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
        "minutes",
        "opponent_team",
        "own_goals",
        "penalties_missed",
        "penalties_saved",
        "red_cards",
        "round",
        "saves",
        "selected",
        "team_a_score",
        "team_h_score",
        "threat",
        "transfers_balance",
        "transfers_in",
        "transfers_out",
        "value",
        "was_home",
        "yellow_cards"
      ],
      csvData: [],
      calculatedData: [],
      players: [],
      apiUrl: "https://fantasy.premierleague.com/api/bootstrap-static/"
    };
  },
  methods: {
    fetchPlayers() {
      axios
        .get("/api")
        .then(res => {
          this.players = res.data.elements.map(player => {
            return {
              first_name: player.first_name,
              second_name: player.second_name,
              now_cost: player.now_cost,
              total_points: player.total_points,
              id: player.id,
              chance_of_playing_this_round: player.chance_of_playing_this_round,
              key: `${player.first_name}_${player.second_name}_${player.id}`
            };
          });
        })
        .catch(err => {
          console.log(err);
        });
    },
    getMinMaxValues() {
      const cols = [...this.columns, "total_points"];
      cols.forEach(col => {
        this.minValues[col] = this.csvData.reduce((acc, row) => {
          return Math.min(acc, row[col]);
        }, 0);
        this.maxValues[col] = this.csvData.reduce((acc, row) => {
          return Math.max(acc, row[col]);
        }, 0);
      });
    },
    runBrain() {
      Object.keys(this.playerData).forEach(name => {
        const data = this.playerData[name].sort((a, b) => {
          return a.round - b.round;
        });
        if (data.length > this.dataRange) {
          const input = [...data]
            .splice(this.dataRange * -1, this.dataRange)
            .map(row => {
              return this.columns.map(col => {
                return this.normalize(
                  row[col],
                  this.minMaxValues.min[col],
                  this.minMaxValues.max[col]
                );
              });
            })
            .flat();
          let prediction = net.run(input);
          prediction = Array.from(prediction).pop();

          let currentPlayer = this.players.find(player => {
            return `${player.first_name} ${player.second_name}` == name;
          });

          if (currentPlayer) {
            currentPlayer["team"] = this.playerData[name][0].team;
            currentPlayer["position"] = this.playerData[name][0].position;
            currentPlayer["predicted_points"] = this.denormalize(
              prediction,
              this.minMaxValues.min["total_points"],
              this.minMaxValues.max["total_points"]
            ).toFixed(3);
          }
        }
      });
      this.$refs.table.refresh();
    },
    formatData() {
      let formattedData = [];
      Object.keys(this.playerData).forEach(name => {
        const data = this.playerData[name].sort((a, b) => {
          return a.round - b.round;
        });
        if (data.length >= this.dataRange + 1) {
          for (var range = 0; range < data.length - this.dataRange; range++) {
            const input = [...data]
              .splice(range, this.dataRange)
              .map(row => {
                return this.columns.map(col => {
                  return this.normalize(
                    row[col],
                    this.minMaxValues.min[col],
                    this.minMaxValues.max[col]
                  );
                });
              })
              .flat();
            const output = [
              this.normalize(
                [data[range + this.dataRange]][0]["total_points"],
                this.minMaxValues.min["total_points"],
                this.minMaxValues.max["total_points"]
              )
            ];
            formattedData.push({
              input,
              output
            });
          }
        }
      });
      // console.log(formattedData);
      return formattedData;
    },
    saveBrain() {
      const date = dayjs().format("YYYY-MM-DD");
      const json = net.toJSON();
      const a = document.createElement("a");
      const file = new Blob([JSON.stringify(json)], { type: "text/plain" });
      a.href = URL.createObjectURL(file);
      a.download = `trained-${date}.json`;
      a.click();
    },
    trainBrain() {
      let self = this;
      const config = {
        errorThresh: 0.003,
        learningRate: 0.05,
        log: info => {
          console.log(info);
          // console.log(`Progress: ${((0.003 / info.error) * 100).toFixed(2)}%`);
        }
      };
      const data = this.formatData();
      net.train(data, config);
      this.saveBrain();
      this.didTrain = true;
    },
    loadData() {
      var self = this;
      for (let i = 1; i <= this.weeksOfData; i++) {
        Papa.parse(
          // `https://raw.githubusercontent.com/IHIutch/Fantasy-Premier-League/master/data/2020-21/gws/gw${i}.csv`,
          `https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2020-21/gws/gw${i}.csv`,
          {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: res => {
              self.csvData.push(
                ...res.data.map(d => {
                  return {
                    ...d,
                    was_home: d.was_home === "True" ? 1 : 0
                  };
                })
              );
            }
          }
        );
      }
    },
    importTraining() {
      const weeks = Object.keys(trainings);
      const latest = trainings[weeks[weeks.length - 1]];
      net.fromJSON(latest);
      this.didTrain = true;
    },
    normalize(val, min, max) {
      return (val - min) / (max - min);
    },
    denormalize(val, min, max) {
      return max * val - val * min + min;
    }
  },
  mounted() {
    // Dont import training before running the new training
    this.importTraining();
    this.loadData();
    this.fetchPlayers();
  },
  computed: {
    minMaxValues() {
      let min = {};
      let max = {};
      const cols = [...this.columns, "total_points"];
      cols.forEach(col => {
        min[col] = Math.min(...this.csvData.map(row => row[col]));
        max[col] = Math.max(...this.csvData.map(row => row[col]));
      });
      return { min, max };
    },
    playerData() {
      let data = this.csvData.reduce((acc, row) => {
        acc[row.name] = [...(acc[row.name] || []), row];
        return acc;
      }, {});
      return data;
    },
    playerWeek() {
      return this.player != null && this.week != null
        ? this.playerData[this.player][this.week]
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
