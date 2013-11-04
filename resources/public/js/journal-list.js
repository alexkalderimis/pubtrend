define([
    'abstract-source',
    './journal',
    './http',
    'text!/html/journal-list.html',
    'text!/html/marker-title.html'
    ],
    function(getAbstracts, Journal, http, html, marker_title) {

  var MAP_OPTS = {
    center: new google.maps.LatLng(30.0, 10.0),
    zoom: 2,
    mapTypeId: google.maps.MapTypeId.RoadMap
  };

  var JournalList = Backbone.View.extend({

    className: 'modal reveal-modal journal-list',

    initialize: function () {
      var self = this
        , collection = (this.collection || (this.collection = new Backbone.Collection))
        , addToCollection = collection.add.bind(collection);
      if (!this.model.has('view')) this.model.set({view: 'map'});
      this.model.on('change:offset', this.getData.bind(this));
      this.model.on('change:limit', function (model, limit) {
        var size = collection.length
          , offset = model.get('offset') + size
          , limit = model.get('limit') - size
          , term = model.get('term')
          , year = model.get('year');
        getAbstracts(term, year, offset, limit).then(addToCollection);
      });
      this.model.on('change:view', function (model, view) {
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
      this.collection.on('add', function (citation) {
        switch(self.model.get('view')) {
          case 'map':       return self.addMarker(citation);
          case 'abstracts': return self.addAbstract(citation);
          default: throw new Error("Unknown view: " + self.model.get('view'));
        }
      });
    },

    getData: function () {
        var i
          , offset = this.model.get('offset')
          , limit = this.model.get('limit')
          , term = this.model.get('term')
          , year = this.model.get('year')
          , addCitation = this.collection.add.bind(this.collection);
        // Fetch in parallel.
        this.collection.reset();
        for (i = offset; i < offset + limit; i++) {
          getAbstracts(term, year, i, 1).then(addCitation);
        }
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
          this.model.set('limit', limit + limit);
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

    addMarker: function (citation) {
      if (!citation.has('affiliation')) return;
      var citationMarkerTitle = this.citationMarkerTitle;
      var map = this.map;
      http.getJSON('/location', {address: citation.get('affiliation')})
          .then(function (loc) {
        if (!loc || !(loc.lat && loc.lng) ) return;
        var marker = new google.maps.Marker({
          position: new google.maps.LatLng(loc.lat, loc.lng),
          title: citationMarkerTitle(citation.toJSON())
        });
        marker.setMap(map);
      });
    },

    showMap: function () {
      var self = this;
      var journals = this.$('.journals').empty();
      var $elem = $('<div/>').addClass('map');
      journals.append($elem);
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
