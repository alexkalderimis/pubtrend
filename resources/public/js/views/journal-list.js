define([
    'abstract-source',
    'views/journal',
    'http',
    'leaflet',
    'stamen',
    'awesome-markers',
    'text!/html/journal-list.html',
    'text!/html/marker-title.html'
    ],
    function(getAbstracts, Journal, http, L, S, AM, html, marker_title) {

  var MAP_OPTS = {
    center: new L.LatLng(20.0, 10.0),
    zoom: 2
  };
  var ICON_COLOURS = [
    'blue', 'red', 'green', 'darkred', 'orange', 'darkgreen',
    'purple', 'darkpuple', 'cadetblue'
  ];

  var JournalList = Backbone.View.extend({

    className: 'modal reveal-modal journal-list',

    initialize: function () {
      var self = this
        , model = this.model
        , collection = (this.collection || (this.collection = new Backbone.Collection))
        , addToCollection = collection.add.bind(collection);
      self.initialWidth = model.get('limit');
      self.maxSize = model.get('offset') + self.initialWidth;
      if (!model.has('view')) model.set({view: 'map'});
      model.on('change:offset', this.getData.bind(this));
      model.on('change:offset', function (model, offset) {
        self.$('.summary .start-ord').text(offset + 1);
      });
      model.on('change:limit', function (model, limit) {
        var size = self.maxSize
          , offset = model.get('offset')
          , adj_os = offset + size
          , adj_lim = limit - size
          , year = model.get('year');
        self.maxSize += adj_lim;
        self.$('.summary .end-ord').text(offset + limit);
        _.each(model.get('terms'), function (term) {
          getAbstracts(term, year, adj_os, adj_lim).then(addToCollection);
        });
      });
      model.on('change:view', function (model, view) {
        self.$('input[name="view"]').each(function () {
          var $r = $(this);
          $r.prop('checked', $r.val() === view);
        });
        // TODO: replace switches with polymorphic dispatch.
        switch(view) {
          case 'map':       return self.showMap();
          case 'abstracts': return self.showAbstractList();
          case 'journals':  return self.showPieChart();
          default: throw new Error("Unknown view: " + view);
        }
      });
      collection.on('add', function (citation) {
        switch(self.model.get('view')) {
          case 'map':       return self.addMarker(citation);
          case 'abstracts': return self.addAbstract(citation);
          case 'journals':  return self.updatePieChart(citation);
          default: throw new Error("Unknown view: " + self.model.get('view'));
        }
      });
    },

    getData: function () {
        var offset = this.model.get('offset')
          , limit = this.model.get('limit')
          , terms = this.model.get('terms')
          , year = this.model.get('year')
          , addCitation = this.collection.add.bind(this.collection);
        // Fetch in parallel.
        this.collection.reset();
        _.each(_.range(offset, offset + limit), function (i) {
          _.each(terms, function (term) {
            getAbstracts(term, year, i, 1).then(addCitation);
          });
        });
    },

    events: {
      'click .close': function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        this.close();
      },
      'change input[name="view"]': function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        this.model.set('view', $(evt.target).val());
      },
      'click .get-more': function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var offset = this.model.get('offset')
          , limit = this.model.get('limit');
        if (this.model.get('view') !== 'abstracts') {
          this.model.set('limit', limit + this.initialWidth);
        } else {
          this.model.set('offset', offset + limit);
        }
      }
    },

    template: _.template(html),

    show: function () {
      this.render();
      $('body').append(this.el);
      this.$el.foundation('reveal', 'open');
      this.getData();
      return this;
    },

    close: function () {
      this.$el.foundation('reveal', 'close');
      this.remove();
    },

    addAbstract: function (journal) {
      var journalView = new Journal({model: journal});
      this.$('.journals > ul').append(journalView.render().el);
    },

    showAbstractList: function () {
      var journals = this.$('.journals');
      var ul = document.createElement('ul');
      journals.html(ul);
      this.collection.each(this.addAbstract.bind(this));
    },

    citationMarkerTitle: _.template(marker_title),

    getIcon: function (term) {
      var colour = ICON_COLOURS[this.model.get('terms').indexOf(term)];
      var icon = L.AwesomeMarkers.icon({
        prefix: 'fa',
        icon: 'file-text',
        markerColor: colour
      });
      return icon;
    },

    addMarker: function (citation) {
      var self = this;
      var map = this.map;
      if (!citation.has('affiliation')) {
        self._no_affil++;
        self.$('.no-affil').text(
          self._no_affil + " publications without addresses"
        );
        return;
      }
      var citationMarkerTitle = this.citationMarkerTitle;
      http.getJSON('/location', {address: citation.get('affiliation')})
          .then(function (loc) {
        if (loc && loc.lat && loc.lng) {

          var marker = L.marker([loc.lat, loc.lng]);
          marker.bindPopup(citationMarkerTitle(citation.toJSON()));
          marker.setIcon(self.getIcon(citation.get('term')));
          marker.addTo(map);
          self._markers++;
          self.$('.marker-count').text(self._markers + " locations found");
        } else {
          self._marker_misses++;
          self.$('.marker-miss-count').text(
            self._marker_misses + " addresses without location"
          );
        }
      });
    },

    showPieChart: function () {
      var self, journals, $elem, svg, dimensions, radius, colour, pie, 
          moveToCenter, path;
      self = this;
      journals = this.$('.journals').empty();
      self._markers = self._marker_misses = self._no_affil = 0;
      $elem = $('<div/>').addClass('chart');
      journals.append($elem);
      height = $elem.height();
      width = $elem.width();
      radius = Math.min(width, height) / 2;
      this.layout = d3.layout.pie().value(function (entry) { 
        return entry.values;
      }).sort(null);
      this.pieColour = d3.scale.category20c();
      this.arc = d3.svg.arc().innerRadius(radius * 0.3)
                            .outerRadius(radius * 0.9);
      svg = d3.select($elem.get(0)).append('svg');
      moveToCenter = 'translate(' +(width * 0.5)+ ',' +(height * 0.5) + ')';
      
      detailG = svg.append('g')
                   .attr('class', 'details')
                   .attr('transform', moveToCenter);

      this.path = detailG.selectAll('path');

      this.updatePieChart();
    },

    updatePieChart: function () {
      var data = d3.nest()
                   .key(function (cit) { return cit.journal.title; })
                   .rollup(function (leaves) { return leaves.length })
                   .entries(this.collection.toJSON());
      var colour = this.pieColour;
      var layout = this.layout;
      var arc = this.arc;
      var data0 = this.path.data();
      var data1 = layout(data);
      var onUpdate = this.path = this.path.data(data1, key);
      onUpdate.enter()
          .append('path')
          .each(setCurrent)
          .attr('fill', _.compose(colour, key))
          .append('title').text(title);

      _.defer(function() {
        onUpdate.transition().duration(250).attrTween('d', arcTween)
      });
      onUpdate.selectAll('title').text(title);

      function setCurrent(d, i) {
        this._current = findNeighborArc(i) || d;
      }

      function title (d) {
        return d.data.key + '(' + d.value + ')';
      }
  
      function findNeighborArc(i) {
        var d;
        var pos = function (d) {
          return {startAngle: d.endAngle, endAngle: d.endAngle};
        };

        if (d = findPreceding(i)) {
          return pos(d);
        } else if (d = findFollowing(i)) {
          return pos(d);
        } else {
          return null; 
        }
      }

      // Find the element in data0 that joins the highest preceding element in data1.
      function findPreceding(i) {
        var m = data0.length;
        while (--i >= 0) {
          var k = key(data1[i]);
          for (var j = 0; j < m; ++j) {
            if (key(data0[j]) === k) return data0[j];
          }
        }
      }

      // Find the element in data0 that joins the lowest following element in data1.
      function findFollowing(i) {
        var n = data1.length, m = data0.length;
        while (++i < n) {
          var k = key(data1[i]);
          for (var j = 0; j < m; ++j) {
            if (key(data0[j]) === k) return data0[j];
          }
        }
      }

      function key (d) {
        return d.data.key;
      }
      function arcTween (d, i) {
        var f = d3.interpolate(this._current, d);
        this._current = f(0);
        return function (time) { return arc(f(time)); };
      }
    },

    showMap: function () {
      var self = this;
      var journals = this.$('.journals').empty();
      self._markers = self._marker_misses = self._no_affil = 0;
      var $elem = $('<div/>').addClass('map');
      journals.append(
          '<div><span class="label marker-count"></span>' + 
          '<span class="label marker-miss-count"></span>' +
          '<span class="label no-affil"></span></div>'
      );
      journals.append($elem);
      var layer = new L.StamenTileLayer(this.model.get('mapStyle'));
      this.map = new L.Map($elem.get(0), MAP_OPTS);
      this.map.addLayer(layer);
      this.collection.each(this.addMarker.bind(this));
    },

    render: function () {
      var model = this.model;
      this.$el.html(this.template(model.toJSON()));
      setTimeout(function () {
        model.trigger('change:view', model, model.get('view'));
      }, 500);
      return this;
    }

  });

  return JournalList;

});
