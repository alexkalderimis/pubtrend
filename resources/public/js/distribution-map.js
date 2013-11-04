define(function () {

  var GlobalDistributionMap = Backbone.View.extend({
    className: 'modal reveal-modal',
    events: {
      'click .close': function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        this.close();
      },
      'click .get-more': function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var offset = this.model.get('offset')
          , limit = this.model.get('limit');
        this.model.set('offset', offset + limit);
      }
    },
    show: function () {
      this.render();
      $('body').append(this.el);
      this.$el.foundation('reveal', 'open');
      setTimeout(this.showMap.bind(this), 500);
      return this;
    },
    getCitationTitle: function (citation) {
      var title = citation.get('title')
        , auth0 = (citation.get('authors')[0] || {})
        , aname = auth0['fore-name']
        , lname = auth0['last-name']
        , location = citation.get('affiliation')
        , journal = citation.get('journal');
      return [title, '(' + aname, lname + ',', location + ')', '-', journal].join(' ');
    },
    showMap: function () {
      var LatLng = google.maps.LatLng;
      var opts = {
        center: new LatLng(30.0, 10.0),
        zoom: 2,
        mapTypeId: google.maps.MapTypeId.RoadMap
      };
      var map = new google.maps.Map(this.$('.map').get(0), opts);
      var getTitle = this.getCitationTitle.bind(this);
      this.collection.each(function (citation) {
        var location = citation.get('location');
        if (!location || !(location.lat && location.lng) ) return;
        var marker = new google.maps.Marker({
          position: new LatLng(location.lat, location.lng),
          title: getTitle(citation)
        });
        marker.setMap(map);
      });
    },
    render: function () {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    template: _.template([
      '<div class="modal-header">',
        '<a class="close-reveal-modal close">close</a>',
        '<h3>',
          'Publications matching <i><%- term %></i> in <%- year %>',
        '</h3>',
      '</div>',
      '<div class="modal-body">',
        '<p>Showing publications <%= offset + 1 %> to <%= limit + offset %>',
        ' of <%= count %></p>',
        '<div class="map"></div>',
        '<button class="get-more small button">More</button>',
      '</div>',
      '<div class="modal-footer right">',
        '<a href="#" class="button left ok success close">close</a>',
      '</div>'].join('')),
  }); 
  return GlobalDistributionMap;
});
