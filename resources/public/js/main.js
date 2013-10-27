define(["./trend-view", "./trend-chart-view", "./dispatcher"],
  function (TrendView, TrendChartView, dispatcher) {
    
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

  return main;
}); 
