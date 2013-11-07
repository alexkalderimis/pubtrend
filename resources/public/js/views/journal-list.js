define([
    'abstract-source',
    'views/journal',
    'http',
    'text!/html/journal-list.html',
    'text!/html/marker-title.html'
    ],
    function(getAbstracts, Journal, http, html, marker_title) {

  var MAP_OPTS = {
    center: new google.maps.LatLng(20.0, 10.0),
    zoom: 2,
    mapTypeId: google.maps.MapTypeId.RoadMap
  };
  var ICONS = [
    'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    'http://maps.google.com/mapfiles/ms/icons/purple-dot.png',
    'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
    'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
  ];

  var JournalList = Backbone.View.extend({

    className: 'modal reveal-modal journal-list',

    initialize: function () {
      var self = this
        , model = this.model
        , collection = (this.collection || (this.collection = new Backbone.Collection))
        , addToCollection = collection.add.bind(collection);
      self.initialWidth = model.get('limit');
      if (!model.has('view')) model.set({view: 'map'});
      model.on('change:offset', this.getData.bind(this));
      model.on('change:offset', function (model, offset) {
        self.$('.summary .start-ord').text(offset + 1);
      });
      model.on('change:limit', function (model, limit) {
        var size = collection.length
          , offset = model.get('offset')
          , adj_os = offset + size
          , adj_lim = limit - size
          , year = model.get('year');
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
        switch(view) {
          case 'map':       return self.showMap();
          case 'abstracts': return self.showAbstractList();
          default: throw new Error("Unknown view: " + view);
        }
      });
      collection.on('add', function (citation) {
        switch(self.model.get('view')) {
          case 'map':       return self.addMarker(citation);
          case 'abstracts': return self.addAbstract(citation);
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
        if (this.model.get('view') === 'map') {
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
      setTimeout(this.getData.bind(this), 500);
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
      return ICONS[this.model.get('terms').indexOf(term)];
    },

    addMarker: function (citation) {
      if (!citation.has('affiliation')) return;
      var citationMarkerTitle = this.citationMarkerTitle;
      var map = this.map;
      var self = this;
      http.getJSON('/location', {address: citation.get('affiliation')})
          .then(function (loc) {
        if (!loc || !(loc.lat && loc.lng) ) return;
        var marker = new google.maps.Marker({
          position: new google.maps.LatLng(loc.lat, loc.lng),
          title: citationMarkerTitle(citation.toJSON())
        });
        marker.setIcon(self.getIcon(citation.get('term')));
        marker.setMap(map);
        self._markers++;
        self.$('.marker-count').text(self._markers + " locations found");
      });
    },

    showMap: function () {
      var self = this;
      var journals = this.$('.journals').empty();
      self._markers = 0;
      var $elem = $('<div/>').addClass('map');
      journals.append($elem);
      journals.append('<div><span class="label marker-count"></span></div>');
      this.map = new google.maps.Map($elem.get(0), MAP_OPTS);
      this.collection.each(this.addMarker.bind(this));
    },

    render: function () {
      var model = this.model;
      this.$el.html(this.template(model.toJSON()));
      model.trigger('change:view', model, model.get('view'));
      return this;
    }

  });

  return JournalList;

});
