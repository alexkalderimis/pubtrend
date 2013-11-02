// Assumes non require loading of d3, Backbone and underscore.
define(["Q", "./dispatcher", "data-source", "abstract-source", './journal-list'],
    function(Q, dispatcher, getData, getAbstracts, JournalList) {

  // Utilities, helpers, constants, etc.
  var CURRENT_YEAR = (new Date()).getUTCFullYear();
  var first = function (xs) { return xs[0] };
  var rest = function (xs) { return xs.slice(1) };
  var slideTempl = _.template("translate(<%= x %>,0)");
  var notTruthy = function (x) { return !x };
  var asObj = function (k) {
    return function (val) { var o = {}; o[k] = val; return o; }
  };
  var mergeDataSets = function (datasets) {
    var i, j, ret = datasets[0].map(function (row) { return row.slice(0, 1) });
    for (i = 0; i < ret.length; i++) {
      for (j = 0; j < datasets.length; j++) {
        ret[i].push(datasets[j][i][1]);
      }
    }
    return ret;
  };
  var getParamsets = function (opts) {
    return opts.terms.map(function(term) {
      return {term: term, start: opts.start, end: opts.end};
    });
  };

  var popups = {};
  var clearPopups = function () {
    var k;
    for (k in popups) {
      popups[k].remove();
      delete popups[k];
    }
  };

  dispatcher.on("click:bar", function (term, year, count, coords) {
    var top, left, key = [term, year].join('')
      , isActive = !!popups[key]
      , popup = $('<div/>')
      , modalBtn = $('<a class="small button">See abstracts</a>')
      , templ = _.template([
        "<h4><%= year %>: <%= term %></h4>",
        "<p><%= count %> publications</p>"].join(''));
     
    clearPopups();
    if (isActive) return;

    modalBtn.click(function () {
      clearPopups();
      var offset = 0, limit = 25;
      getAbstracts(term, year, offset, limit).then(function (journals) {
        var coll = new Backbone.Collection(journals)
          , model = new Backbone.Model({
              term: term, year: year, count: count, offset: offset, limit: limit
            })
          , view = new JournalList({collection: coll, model: model});
        view.show();
      });
    });

    popups[key] = popup;
    popup.addClass("popup");

    popup.append(templ({term: term, count: count, year: year}));
    popup.append(modalBtn);

    popup.appendTo('body');

    top = Math.max(20, coords.y - 10 - popup.height());
    left = Math.max(20, coords.x - (popup.width() * 0.5) + 20);
    popup.css({
      position: "absolute",
      top: top,
      left: left
    });

    popup.addClass("arrowed");

    popup.click(popup.remove.bind(popup));

  });

  var TrendChartView = Backbone.View.extend({

    initialize: function () {
      var self = this;
      this.priorState = this.model.toJSON();
      this.data = [];
      this.model.on("change", this.refreshChart.bind(this));
      this.model.on("change:terms", function () {
        self._maxY = 0; // reset max
        if (self.title) self.title.text(self.model.get("terms").join(", "));
      });
      d3.select(window).on("keydown", this.onKeydown.bind(this));
      dispatcher.on("page-chart", this.pageChart.bind(this));
      dispatcher.on("rescale-y", function () {
        self._maxY = 0;
        self.refreshChart();
      });
    },

    render: function () {
      this.updateChart();
      return this;
    },

    refreshChart: function () {
      var termsWere = (this.priorState.terms || []).join(',')
        , termsAre = this.model.get('terms').join(',');
      clearPopups();
      if (termsWere === termsAre) {
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

    getBarX: function (barWidth, nBars) { return function (d, i) {
      var delta = barWidth * i
        , halfBar = barWidth / 2
        , shift = -(halfBar / nBars);
      return shift + delta;
    }},

    getBarColour: function (d, i) {
      var scale = (this._barScale || (this._barScale = d3.scale.category20()));
      return scale(i);
    },

    onBarClick: function () {
      var self = this;
      return function (count, i) {
        var term = self.model.get('terms')[i];
        var year = d3.select(this.parentElement).datum()[0];
        var coords = {
          yearX: self.getXScale()(year),
          x: d3.event.pageX,
          y: d3.event.pageY,
          barWidth: $(this).width(),
          barPos: $(this).position()
        };
        dispatcher.trigger('click:bar', term, year, count, coords);
      };
    },

    addBars: function (sel) {
      var barWidth = this.getBarWidth()
        , self = this
        , height = this.getBarHeight.bind(this)
        , y = this.getYScale()
        , nBars = rest(this.data[0]).length;

      return sel.selectAll("rect").data(rest)
                .attr("height", height)
              .enter().append("rect")
                .on("click", this.onBarClick())
                .attr("fill", this.getBarColour.bind(this))
                .attr("x", this.getBarX(barWidth, nBars))
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
      var words, i, j, titleText
        , lines = []
        , buffer = ""
        , terms = this.model.get("terms");

      // SVG text elements require us to manage our own
      // line breaks.
      for (i in terms) {
        if (buffer.length) buffer += ", ";
        words = terms[i].split(/\s+/);
        for (j = 0; j < words.length; j++) {
          if (buffer.length >= 20) { // break at 20 chrs
            lines.push(buffer);
            buffer = "";
          }
          buffer += words[j];
          if (j + 1 < words.length) buffer += ' ';
        }
      }
      lines.push(buffer);

      this.title = sel.append("text")
         .attr("class", "title")
         .attr("dy", ".25em");
      this.title.selectAll("tspan").data(lines)
          .enter()
          .append("tspan")
          .attr("x", 0)
          .attr("dy", "1.2em")
          .text(_.identity);
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
      var ret, self = this
        , current = this.model.toJSON()
        , promises = getParamsets(current).map(getData);

      var ret = Q.all(promises).then(mergeDataSets).then(function (data) {
        return self.data = data.slice();
      });
      ret.done(function () {
        var earlier = self.getNextState("earlier")
          , later = self.getNextState("later");
        // Warm the local cache by prefetching left and right pages.
        // only fetching later pages when they are different from the current one.
        getParamsets(earlier).forEach(getData);
        if (later.end > current.end) getParamsets(later).forEach(getData);
      });
      return ret;
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
      var nBars = rest(this.data[0]).length
        , width = this.getDimensions().width
        , nRows = this.data.length + 1
        , groupW = Math.floor(width / nRows) - 1;
      return Math.floor(groupW / nBars);
    },

    getXScale: function () {
        var nBars = rest(this.data[0]).length
          , bw = this.getBarWidth()
          , dims = this.getDimensions()
          , start = this.model.get('start')
          , end = this.model.get('end');
        return d3.scale.linear()
                 .range([bw, dims.width - (bw * nBars)])
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

    onUpdate: function (data) {
      var pubYears, bars, texts
        , currentState = this.model.toJSON()
        , dims = this.getDimensions()
        , x = this.getXScale()
        , y = this.getYScale()
        , transform = _.compose(slideTempl, asObj('x'), x, first)
        , barWidth = this.getBarWidth()
        , nBars = rest(this.data[0]).length
        , height = this.getBarHeight.bind(this);
      
      this.mainGroup.call(this.addYAxis.bind(this));

      pubYears = this.yearGroups.selectAll('.pubyear').data(data, first)
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
            .on("click", this.onBarClick())
            .attr("x", this.getBarX(barWidth, nBars))
            .attr("fill", this.getBarColour.bind(this))
            .attr("width", barWidth)
            .attr("y", dims.height)
            .attr("height", 0);
      bars.transition().duration(500)
            .attr("x", this.getBarX(barWidth, nBars))
            .attr("width", barWidth)
            .attr("y", y)
            .attr("height", height);

      texts = pubYears.selectAll("text").data(function (row) { return [row[0]]; });
      texts.enter().append("text").attr('y', dims.height - 4);
      texts.text(_.identity).attr('opacity', (barWidth < 20) ? 0 : 1); // hide when cramped.
    },

    updateYears: function updateYears () {
      this.fetchData(currentState).then(this.onUpdate.bind(this));
      var currentState = this.model.toJSON()
        , filtered = this.data.filter(function (datum) {
            var year = datum[0];
            return year >= currentState.start && year <= currentState.end;
        });
      this.onUpdate(filtered);
    },

    onKeydown: function () {
      switch (d3.event.keyCode) {
        case 37: // Left
          return this.pageChart("earlier");
        case 39: // Right
          return this.pageChart("later");
      }
    },

    getNextState: function (direction) {
      var opts = this.model.toJSON()
        , incr = Math.ceil(this.data.length / 3);
      if (direction == "earlier") {
          opts.start = opts.start - incr;
          opts.end = opts.end - incr;
      } else if (direction == "later") {
          opts.start = Math.min(CURRENT_YEAR + 1 - this.data.length,
            opts.start + incr);
          opts.end = Math.min(CURRENT_YEAR, opts.end + incr);
      }
      return opts;
    },

    pageChart: function (direction) {
      this.model.set(this.getNextState(direction));
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

  return TrendChartView;
});
