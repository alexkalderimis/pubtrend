'use strict';

define(["./trend", "./trend-view", "./trend-chart-view", "./dispatcher", "./messages"],
  function (Trend, TrendView, TrendChartView, dispatcher, Messages) {

  var msgTemp = _.template("Invalid range. using <%= start %> - <%= end %>");
    
  /**
   * Main entry point. Instantiates the moving parts and gets the ball rolling.
   */
  var main = function(opts) {
    var model, messages, view, chartView, chartElem, controlElem;

    model = new Trend();
    messages = new Messages();
    view = new TrendView({model: model})
    chartView = new TrendChartView({model: model})

    chartElem = document.getElementById('pubtrend-viz')
    controlElem = document.getElementById('pubtrend-terms');

    messages.setElement(document.getElementById("messages"));
    chartView.setElement(chartElem);
    view.setElement(controlElem);

    dispatcher.on("Trend:rejected-values", function (m, userStart, userEnd) {
      var msg = msgTemp(m.toJSON());
      messages.flash(msg);
    });
    ["earlier", "later"].forEach(function(direction) {
      $('#show-' + direction).click(function () {
        dispatcher.trigger("page-chart", direction);
      });
    });

    model.set(opts); // Kick everything off.
  };

  return main;
}); 
