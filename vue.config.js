module.exports = {
  devServer: {
    proxy: {
      "/api": {
        target: "https://fantasy.premierleague.com/api/bootstrap-static/",
        changeOrigin: true,
        pathRewrite: {
          "^/api": ""
        }
      }
    }
  }
};
