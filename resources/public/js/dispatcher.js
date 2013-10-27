define(function () {
  // Singleton dispatcher.
  window.pubtrendsDispatcher = (window.pubtrendsDispatcher || _.clone(Backbone.Events));
  return window.pubtrendsDispatcher;
});
