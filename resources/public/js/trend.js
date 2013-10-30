define(['./dispatcher'], function (dispatcher) {

  var Trend = Backbone.Model.extend({

    set: function(attrs, opts) {
      var start, userStart, userEnd;
      if (typeof arguments[0] === 'string') {
        attrs = {};
        attrs[arguments[0]] = arguments[1];
        opts = arguments[2];
      }
      userStart = attrs.start;
      userEnd = attrs.end;
      if (attrs.start != null) {
        attrs.start = Math.max(Trend.MIN, attrs.start);
        attrs.start = Math.min(Trend.MAX, attrs.start);
      }
      if (attrs.end != null) {
        attrs.end = Math.max(Trend.MIN, attrs.end);
        attrs.end = Math.min(Trend.MAX, attrs.end);
        start = (attrs.start == null) ? this.attributes.start : attrs.start;
        attrs.end = Math.max(start, attrs.end);
      }
      if (attrs.start !== userStart || attrs.end !== userEnd) {
        dispatcher.trigger("Trend:rejected-values", this, userStart, userEnd);
      }
      return Backbone.Model.prototype.set.call(this, attrs, opts);
    }

  });

  Trend.MIN = 1900;
  Trend.MAX = (new Date()).getUTCFullYear();
  return Trend;

});
