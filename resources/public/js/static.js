require.config({
  paths: {
    "Q": "../vendor/q/q",
    "data-source": "./client-side-data-source"
  }
});

require(["./trend-view", "./trend-chart-view", "./dispatcher"],
  function (TrendView, TrendChartView, dispatcher) {
    
  var CURRENT_YEAR = (new Date()).getUTCFullYear();
  var model = new Backbone.Model();
  var main = function(opts) {
    ["earlier", "later"].forEach(function(direction) {
      $('#show-' + direction).click(function () {
        dispatcher.trigger("page-chart", direction);
      });
    });
    var view = new TrendView({model: model})
      , chartView = new TrendChartView({model: model})
      , chartElem = document.getElementById('pubtrend-viz')
      , controlElem = document.getElementById('pubtrend-terms');
    chartView.setElement(chartElem);
    view.setElement(controlElem);
    model.set(opts);
  };

  main({
    terms: ["asthma"],
    start: CURRENT_YEAR - 20,
    end: CURRENT_YEAR
  });
});
