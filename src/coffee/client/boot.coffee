require.config
  baseUrl: '/js',
  shim:
    backbone:
      deps: ['underscore', 'jquery']
      exports: 'Backbone'
    underscore:
      exports: '_'
    d3:
      exports: 'd3'
    jquery:
      exports: '$'
    stamen:
      deps: ['leaflet'],
      exports: 'Stamen'
    'awesome-markers':
      deps: ['leaflet'],
      exports: 'AwesomeMarkers'
    leaflet:
      exports: 'L'
  paths:
    "d3": "/vendor/d3.v3.js"
    "backbone": "/vendor/backbone/backbone-min"
    "underscore": "/vendor/underscore/underscore-min"
    "jquery": "/vendor/zepto"
    'leaflet': "http://cdn.leafletjs.com/leaflet-0.6.4/leaflet",
    'stamen': "http://maps.stamen.com/js/tile.stamen.js?v1.2.3",
    "Q": "/vendor/q/q",
    'awesome-markers': '/vendor/awesome-markers/leaflet.awesome-markers',
    "text": '/vendor/text',
    "data-source": "client/data-source",
    "abstract-source": "static/abstract-source"

require ['main', 'initargs'], (main, args) -> main(args)
