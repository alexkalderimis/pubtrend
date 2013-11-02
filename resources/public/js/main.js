'use strict';

define(["./trend", "./trend-view", "./trend-chart-view", "./dispatcher", "./messages"],
  function (Trend, TrendView, TrendChartView, dispatcher, Messages) {

  var msgTemp = _.template("Invalid range: <%= start %> - <%= end %>");
    
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

    dispatcher.on("Trend:rejected-values", function (m, start, end) {
      var msg = msgTemp({start: start, end: end});
      messages.flash(msg);
    });
    // Simple global events and messages.
    $('#instructions h3').click(function() {
      $('#instructions p').fadeToggle();
    });
    $('#re-zero').click(function (evt) {
      dispatcher.trigger("rescale-y");
    });
    ['in', 'out'].forEach(function(direction) {
      var command = 'zoom-' + direction
        , elemId = '#' + command;
        $(elemId).click(function (evt) {
          var state = model.toJSON()
            , width = state.end - state.start + 1
            , round = (direction === 'out') ? Math.ceil : Math.floor
            , delta = round((direction === 'out') ? (width / 2) : (-width / 3));
          console.log(delta);
          state.start = Math.max(Trend.MIN, state.start - delta);
          state.end = Math.min(Trend.MAX, state.end + delta);
          model.set(state);
        });
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
