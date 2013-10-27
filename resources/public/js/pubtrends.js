// TODOO - layer different diseases, better caching, 
(function($, Backbone, _, d3, Q) {
  var Trend, TrendView, dispatcher, drawChart, main, getData, getTrendUrl
    , model, CURRENT_YEAR, resultsCache, fromPairs, trendUrlTempl
    , getTermCache, addToCache, serveWithCacheHits, first, rest, slideTempl
    , notTruthy, asObj, TrendChartView;

  // Utilities and helpers
  first = function (xs) { return xs[0] };
  rest = function (xs) { return xs.slice(1) };
  slideTempl = _.template("translate(<%= x %>,0)");
  trendUrlTempl = _.template("/disease/<%= term %>/<%= years %>");
  notTruthy = function (x) { return !x };
  asObj = function (k) { return function (val) { var o = {}; o[k] = val; return o; }};
  fromPairs = function (pairs) {
    var idx, ret = {};
    for (idx in pairs) {
      ret[pairs[idx][0]] = pairs[idx][1];
    }
    return ret;
  };
  resultsCache = {};
  getTermCache = function (term) {
    return resultsCache[term] || (resultsCache[term] = {});
  };
  model = new Backbone.Model();
  dispatcher = _.clone(Backbone.Events);

  CURRENT_YEAR = (new Date()).getUTCFullYear();

  TrendView = Backbone.View.extend({
    model: Trend,
    initialize: function () {
      this.model.on('change', this.render.bind(this));
    },
    events: {
      "submit": "onSubmit"
    },
    onSubmit: function (evt) {
      evt.preventDefault();
      var newOpts = {
        term:  this.$('#pubtrends-term').val(),
        start: parseInt(this.$('#pubtrends-from').val(), 10),
        end:   parseInt(this.$('#pubtrends-til').val(), 10)
      };
      this.model.set(newOpts);
    },
    render: function () {
      this.$('#pubtrends-term').val(this.model.get('term'));
      this.$('#pubtrends-from').val(this.model.get('start'));
      this.$('#pubtrends-til').val(this.model.get('end'));
      return this.el;
    }
  });

  getTrendUrl = function (opts) {
    var i
      , term = opts.term
      , cache = getTermCache(term)
      , uncachedYears = []
      , years
      , nCacheMisses = 0;

    for (i = opts.start; i <= opts.end; i++) {
      if (cache[i] == null) {
        uncachedYears.push(i);
        nCacheMisses++;
      }
    }
    if (uncachedYears.length == 0) return null;

    if (nCacheMisses = (uncachedYears[nCacheMisses - 1] - uncachedYears[0] + 1)) {
      // Continuous range.
      years = [uncachedYears[0], uncachedYears[nCacheMisses - 1]].join('/');
    } else {
      // Discontinuous range.
      years = uncachedYears.join('-');
    }
    console.log(nCacheMisses + " cache misses");
    return trendUrlTempl({term: term, years: years });
  };

  addToCache = function (opts) {
    return function (data) {
      var i
        , term = opts.term
        , len = data.length
        , cache = getTermCache(term);

      for (i = 0; i < len; i++) {
        cache[data[i][0]] = data[i][1];
      }
      return data;
    };
  };

  serveWithCacheHits = function (opts) {
    return function (data) {
      var i, datum
        , cache = getTermCache(opts.term)
        , len = data.length
        , dataMap = fromPairs(data)
        , ret = [];

      for (i = opts.start; i <= opts.end; i++) {
        datum = [i, (cache[i] || dataMap[i])];
        ret.push(datum);
      }
      return ret;
    };
  };

  getData = function (opts) {
    var url, def;
    url = getTrendUrl(opts);
    def = Q.defer();
    if (url) {
      $.ajax({
        type: "GET",
        url: url,
        dataType: "json",
        error: def.reject.bind(def),
        success: def.resolve.bind(def)
      });
    } else {
      console.log("Full cache hit");
      def.resolve([]);
    }

    return def.promise.then(addToCache(opts)).then(serveWithCacheHits(opts));
  };

  TrendChartView = Backbone.View.extend({

    initialize: function () {
      var self = this;
      this.priorState = this.model.toJSON();
      this.data = [];
      this.model.on("change", this.refreshChart.bind(this));
      this.model.on("change:term", function () {
        if (self.title) self.title.text(self.model.get("term"));
      });
      d3.select(window).on("keydown", this.onKeydown.bind(this));
      dispatcher.on("page-chart", this.pageChart.bind(this));
    },

    render: function () {
      this.updateChart();
      return this;
    },

    refreshChart: function () {
      if (this.priorState.term == this.model.get("term")) {
        this.updateYears();
      } else {
        this.updateChart();
      }
      this.priorState = this.model.toJSON();
    },

    getMainGroup: function() {
      var dims = this.getDimensions()
        , centreBtmRight = _.template("translate(<%= left %>,<%= top %>)", dims.margin);
      return d3.select(this.el).append('svg')
                  .attr("width", dims.fullWidth)
                  .attr("height", dims.fullHeight)
                .append("g")
                  .attr("transform", centreBtmRight);
    },

    addBars: function (sel) {
      var barWidth = this.getBarWidth()
        , height = this.getBarHeight.bind(this)
        , y = this.getYScale();
      return sel.selectAll("rect").data(rest)
                .attr("height", height)
              .enter().append("rect")
                .attr("x", -barWidth / 2)
                .attr("width", barWidth)
                .attr("y", y)
                .attr("height", height);
    },

    addYearLabels: function (sel) {
      var dims = this.getDimensions();
      return sel.selectAll("text").data(function (row) { return [row[0]] })
                .text(_.identity)
                .enter()
                  .append("text")
                  .attr("y", dims.height - 4)
                  .text(_.identity);
    },

    positionYearGroup: function (sel) {
      var x = this.getXScale()
        , f = _.compose(slideTempl, asObj('x'), x, first);

      return sel.append("g")
                .attr("class", "pubyear")
                .attr("transform", f);
    },

    buildYearGroups: function (sel) {
      return sel.append("g").attr("class", "years");
    },

    addTitle: function (sel) {
      this.title = sel.append("text")
         .attr("class", "title")
         .attr("dy", ".71em")
         .text(this.model.get('term'));
      return this.title;
    },

    getYAxis: function () {
      var dims = this.getDimensions()
        , y = this.getYScale();
      return d3.svg.axis().scale(y).orient("right").tickSize(-dims.width);
    },

    addYAxis: function (sel) {
      sel.selectAll('.y.axis').remove();
      var dims = this.getDimensions()
        , yAxis = this.getYAxis();

      return sel.append("g")
        .attr("class", "y axis")
        .attr("transform", slideTempl({x: dims.width}))
        .call(yAxis)
        .selectAll("g")
        .filter(notTruthy).classed("zero", true);
    },

    fetchData: function () {
      var self = this;
      return getData(this.model.toJSON()).then(function (data) {
        return self.data = data.slice();
      });
    },
      
    updateChart: function updateChart () {
      this.fetchData().then(this.drawChart.bind(this));
    },

    getBarHeight: function (d) {
      var dims = this.getDimensions()
        , y = this.getYScale();
      return dims.height - y(d);
    },

    getBarWidth: function () {
      return Math.floor(this.getDimensions().width / this.data.length) - 1;
    },

    getXScale: function () {
        var halfBar = this.getBarWidth() / 2
          , dims = this.getDimensions()
          , start = this.model.get('start')
          , end = this.model.get('end');
        return d3.scale.linear()
                 .range([halfBar, dims.width - halfBar])
                 .domain([start, end]);
    },

    getMaxY: function () {
      // Remember the biggest value we have seen
      var currentMax = d3.max(this.data, _.compose(d3.max, rest));
      this._maxY = Math.max((this._maxY || 0), currentMax);
      return this._maxY;
    },

    getYScale: function () {
        var maxY = this.getMaxY()
          , dims = this.getDimensions();
        return d3.scale.linear()
                       .range([dims.height, 0])
                       .domain([0, maxY])
    },

    updateYears: function updateYears () {
      var priorState = this.priorState
        , currentState = this.model.toJSON()
        , self = this;
      this.fetchData(currentState).then(function () {
        var pubYears, bars, texts
          , dims = self.getDimensions()
          , x = self.getXScale()
          , y = self.getYScale()
          , transform = _.compose(slideTempl, asObj('x'), x, first)
          , barWidth = self.getBarWidth()
          , height = self.getBarHeight.bind(self);
        
        self.mainGroup.call(self.addYAxis.bind(self));

        pubYears = self.yearGroups.selectAll('.pubyear').data(self.data, first)
        pubYears.exit()
                .transition().duration(500)
                .each(function () {
                  d3.select(this).selectAll("rect")
                    .transition().duration(500)
                    .attr("y", dims.height)
                    .attr("height", 0);
                 })
                .attr("transform", function (row) {
                  var x = (row[0] > currentState.end) ? dims.width : 0;
                  return slideTempl({x: x});
                }).remove();
        pubYears.enter()
                .append("g")
                .attr("class", "pubyear")
                .attr("transform", transform);
        pubYears.transition().duration(500).attr("transform", transform);            

        bars = pubYears.selectAll("rect").data(rest);
        bars.exit().remove();
        bars.enter().append("rect")
              .attr("x", -barWidth / 2)
              .attr("width", barWidth)
              .attr("y", dims.height)
              .attr("height", 0);
        bars.transition().duration(500)
              .attr("x", -barWidth / 2)
              .attr("width", barWidth)
              .attr("y", y)
              .attr("height", height);

        texts = pubYears.selectAll("text").data(function (row) { return [row[0]]; });
        texts.enter().append("text").attr('y', dims.height - 4);
        texts.text(_.identity);
      });
    },

    onKeydown: function () {
      switch (d3.event.keyCode) {
        case 37: // Left
          return this.pageChart("earlier");
        case 39: // Right
          return this.pageChart("later");
      }
    },

    pageChart: function (direction) {
      var opts = this.model.toJSON()
        , incr = 5;
      if (direction == "earlier") {
          opts.start = opts.start - incr;
          opts.end = opts.end - incr;
      } else if (direction == "later") {
          opts.start = Math.min(CURRENT_YEAR + 1 - this.data.length,
            opts.start + incr);
          opts.end = Math.min(CURRENT_YEAR, opts.end + incr);
      }
      this.model.set(opts);
    },

    getDimensions: function () {
      var margin, width, fullWidth, fullHeight = 450, height;
      margin = {top: 20, right: 40, bottom: 30, left: 40};
      fullWidth = this.$el.width();
      width = fullWidth - margin.left - margin.right;
      height = fullHeight - margin.top - margin.bottom;
      return {
        margin: margin,
        height: height,
        width: width,
        fullWidth: fullWidth,
        fullHeight: fullHeight
      };
    },

    drawChart: function (results) {
      this.$el.empty();
      var svg, yearGroups, pubYears;

      svg = this.getMainGroup();
      this.mainGroup = svg;
      yearGroups = this.buildYearGroups(svg);
      pubYears = yearGroups.selectAll(".pubyear").data(this.data, first);

      this.yearGroups = yearGroups;
      this.pubYears = pubYears;

      this.addTitle(svg);
      this.addYAxis(svg);

      // Move into position.
      pubYears.enter().call(this.positionYearGroup.bind(this));

      // Add bars
      pubYears.call(this.addBars.bind(this));

      // Add labels
      pubYears.call(this.addYearLabels.bind(this));

      window.focus();
    }

  });

  main = function(opts) {
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
    term: "asthma",
    start: 2000,
    end: CURRENT_YEAR
  });

})($, Backbone, _, d3, Q);
