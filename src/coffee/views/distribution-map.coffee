define (require) ->

  Backbone = require 'backbone'
  L = require 'leaflet'
  S = require 'stamen'
  Markers = require 'awesome-markers'
  _ = require 'underscore'
  http = require 'http'
  html = require 'text!/html/distribution-map.html'
  marker_title = require 'text!/html/marker-title.html'

  ICON_COLOURS = [
    'blue', 'red', 'green', 'darkred', 'orange', 'darkgreen',
    'purple', 'darkpuple', 'cadetblue'
  ]

  MAP_OPTS =
    center: new L.LatLng(20.0, 10.0),
    zoom: 2
  
  class MapView extends Backbone.View

    className: 'distribution'

    initialize: ->
      @counts = new Backbone.Model
        found: 0
        notFound: 0
        notAvailable: 0

      @counts.on 'change', @showCounts

    showCounts: =>
      @$('.found .count').text @counts.get('found')
      @$('.not-found .count').text @counts.get('notFound')
      @$('.unavailable .count').text @counts.get('notAvailable')

    template: _.template html

    citationMarkerTitle: _.template marker_title

    render: ->
      @$el.html @template @model.toJSON()
      layer = new L.StamenTileLayer @model.get 'mapStyle'
      @map = new L.Map @$('.map').get(0), MAP_OPTS
      @map.addLayer layer
      @collection.each @addMarker
      @collection.on 'add', @addMarker

    bumpCount: (count) -> @counts.set count, @counts.get(count) + 1

    addMarker: (citation) =>

      address = citation.get 'affiliation'

      unless address
        @bumpCount 'notAvailable'
        return

      http.getJSON('/location', {address}).then (loc) =>
        if (loc && loc.lat && loc.lng)
          @bumpCount 'found'
          marker = L.marker([loc.lat, loc.lng])
          marker.bindPopup(@citationMarkerTitle(citation.toJSON()))
          marker.setIcon(@getIcon(citation.get('term')))
          marker.addTo(@map)
        else
          @bumpCount 'notFound'

    getIcon: (term) ->
      colour = ICON_COLOURS[@model.get('terms').indexOf(term)]
      icon = L.AwesomeMarkers.icon
        prefix: 'fa',
        icon: 'file-text',
        markerColor: colour
      return icon

    remove: ->
      @map?.remove()
      super
