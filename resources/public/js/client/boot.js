require.config({
  baseUrl: '/js',
  shim: {
    'stamen': {
      deps: ['leaflet'],
      exports: 'Stamen'
    },
    'awesome-markers': {
      deps: ['leaflet'],
      exports: 'AwesomeMarkers'
    },
    leaflet: {
      exports: 'L'
    }
  },
  paths: {
    'leaflet': "http://cdn.leafletjs.com/leaflet-0.6.4/leaflet",
    'stamen': "http://maps.stamen.com/js/tile.stamen.js?v1.2.3",
    "Q": "/vendor/q/q",
    'awesome-markers': '/vendor/awesome-markers/leaflet.awesome-markers',
    "text": '/vendor/text',
    "data-source": "client/data-source",
    "abstract-source": "static/abstract-source"
  }
});

require(['main', 'initargs'], function (main, args) {
  main(args);
});
