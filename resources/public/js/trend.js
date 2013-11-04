define(['./dispatcher'], function (dispatcher) {

  var Trend = Backbone.Model.extend({

    set: function(attrs, opts) {
      var start, end;
      if (typeof arguments[0] === 'string') {
        attrs = {};
        attrs[arguments[0]] = arguments[1];
        opts = arguments[2];
      }
      start = (attrs.start || this.attributes.start);
      end = (attrs.end || this.attributes.end);

      if (start < Trend.MIN || start > end || start > Trend.MAX
         || end > Trend.MAX || end < start || end < Trend.MIN) {
        this.trigger("reject-values", this, start, end);
        return dispatcher.trigger("Trend:rejected-values", this, start, end);
      }
      return Backbone.Model.prototype.set.call(this, attrs, opts);
    },

    width: function () {
      var start = this.attributes.start
        , end = this.attributes.end;

      if (start && end) {
        return end + 1 - start;
      } else {
        return null;
      }
    }

  });

  Trend.MIN = 1900;
  Trend.MAX = (new Date()).getUTCFullYear();
  return Trend;

});
