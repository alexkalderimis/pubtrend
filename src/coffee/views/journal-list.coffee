define (require) ->

  Journal = require 'views/journal'
  L = require 'leaflet'
  S = require 'stamen'
  Markers = require 'awesome-markers'
  getAbstracts = require 'abstract-source'
  d3 = require 'd3'
  http = require 'http'
  html = require 'text!/html/journal-list.html'
  marker_title = require 'text!/html/marker-title.html'

  MAP_OPTS =
    center: new L.LatLng(20.0, 10.0),
    zoom: 2

  ICON_COLOURS = [
    'blue', 'red', 'green', 'darkred', 'orange', 'darkgreen',
    'purple', 'darkpuple', 'cadetblue'
  ]

  arcTween = (arc) -> (d, i) ->
    f = d3.interpolate @_current, d
    @_current = f 0
    _.compose arc, f

  class JournalList extends Backbone.View

    className: 'modal reveal-modal journal-list'

    initialize: ->
      @collection = new Backbone.Collection unless @collection?

      addToCollection = @collection.add.bind @collection
      @initialWidth = @model.get('limit')
      @maxSize = @model.get('offset') + @initialWidth

      @model.set({view: 'map'}) unless @model.has('view')
      @model.on 'change:offset', @getData
      @model.on 'change:offset', (model, offset) => @$('.summary .start-ord').text offset + 1
      @model.on 'change:limit', (model, limit) =>
        size = @maxSize
        offset = @model.get('offset')
        year = @model.get('year')
        adj_os = offset + size
        adj_lim = limit - size
        @maxSize += adj_lim
        @$('.summary .end-ord').text offset + limit
        for term in model.get('terms')
          getAbstracts(term, year, adj_os, adj_lim).then addToCollection

      @model.on 'change:view', (model, view) =>
        @$('input[name="view"]').each ->
          $r = $(this)
          $r.prop('checked', $r.val() is view)
        # TODO: replace switches with polymorphic dispatch.
        switch view
          when 'map'       then @showMap()
          when 'abstracts' then @showAbstractList()
          when 'journals'  then @showPieChart()
          else throw new Error("Unknown view: " + view)

      @collection.on 'add', (citation) =>
        switch self.model.get('view')
          when 'map'       then @addMarker(citation)
          when 'abstracts' then @addAbstract(citation)
          when 'journals'  then @updatePieChart(citation)
          else throw new Error('Unknown view: ' + @model.get('view'))

    getData: =>
      {offset, limit, terms, year} = @model.toJSON()
      addCitation = (xs) => @collection.add xs
      # Fetch in parallel.
      @collection.reset()
      for idx in [offset .. offset + limit]
        for term in terms
          getAbstracts(term, year, idx, 1).then addCitation

    events: ->
      'click .close': (evt) ->
        evt.preventDefault()
        evt.stopPropagation()
        @close()
      'change input[name="view"]': (evt) ->
        evt.preventDefault()
        evt.stopPropagation()
        @model.set 'view', $(evt.target).val()
      'click .get-more': (evt) ->
        evt.preventDefault()
        evt.stopPropagation()
        {offset, limit, view} = @model.attributes
        if view isnt 'abstracts'
          @model.set('limit', limit + @initialWidth)
        else
          @model.set('offset', offset + limit)

    template: _.template(html)

    show: ->
      @render()
      $('body').append @el
      @$el.foundation('reveal', 'open')
      @getData()
      return @

    close: ->
      @$el.foundation('reveal', 'close')
      @remove()

    addAbstract: (journal) =>
      journalView = new Journal model: journal
      @$('.journals > ul').append(journalView.render().el)

    showAbstractList: ->
      journals = @$('.journals')
      ul = document.createElement('ul')
      journals.html(ul)
      @collection.each @addAbstract

    citationMarkerTitle: _.template(marker_title)

    getIcon: (term) ->
      colour = ICON_COLOURS[@model.get('terms').indexOf(term)]
      icon = L.AwesomeMarkers.icon
        prefix: 'fa',
        icon: 'file-text',
        markerColor: colour
      return icon

    addMarker: (citation) =>

      unless citation.has 'affiliation'
        @_no_affil++
        @$('.no-affil').text self._no_affil + " publications without addresses"
        return

      console.log "Fetching location for", citation.get 'affiliation'
      http.getJSON('/location', {address: citation.get('affiliation')}).then (loc) =>
        if (loc && loc.lat && loc.lng)
          marker = L.marker([loc.lat, loc.lng])
          marker.bindPopup(@citationMarkerTitle(citation.toJSON()))
          marker.setIcon(@getIcon(citation.get('term')))
          marker.addTo(@map)
          @_markers++
          @$('.marker-count').text(@_markers + " locations found")
        else
          @_marker_misses++
          @$('.marker-miss-count').text @_marker_misses + " addresses without location"

    showPieChart: ->
      journals = @$('.journals').empty()
      $elem = $('<div/>').addClass('chart')
      journals.append($elem)
      height = $elem.height()
      width = $elem.width()
      radius = Math.min(width, height) / 2
      svg = d3.select($elem.get(0)).append('svg')
      moveToCenter = "translate(#{ width / 2},#{ height / 2})"
      detailG = svg.append('g').attr('class', 'details').attr('transform', moveToCenter)

      @layout = d3.layout.pie().sort(null).value ({values}) -> values
      @pieColour = d3.scale.category20c()
      @arc = d3.svg.arc().innerRadius(radius * 0.3).outerRadius(radius * 0.9)
      @path = detailG.selectAll('path')

      @updatePieChart()

    updatePieChart: =>
      data = d3.nest()
              .key(({journal: {title}}) -> title)
              .rollup(({length}) -> length)
              .entries(@collection.toJSON())
      data0 = @path.data()
      data1 = @layout(data)
      key   = ({data: {key}}) -> key
      title = ({data: {key}, value}) -> "#{ key } (#{ value })"
      findPreviousDatum = (tester) -> (i) ->
        test = tester i
        while d1 = test()
          k = key d1
          for datum in data0
            return datum if k is key datum
        return null
      findFollowing = findPreviousDatum (i) -> () -> data1[i] if ++i <  data1.length
      findPreceding = findPreviousDatum (i) -> () -> data1[i] if --i >= 0
      findNeighborArc = (i) ->
        if d = (findPreceding(i) or findFollowing(i))
          _.pick d, ['startAngle', 'endAngle']
      setCurrent = (d, i) -> @_current = findNeighborArc(i) or d
      onUpdate = @path = @path.data(data1, key)
      onUpdate.enter()
          .append('path')
          .each(setCurrent)
          .attr('fill', _.compose(@pieColour, key))
          .append('title').text(title)

      _.defer => onUpdate.transition().duration(250).attrTween('d', arcTween @arc)

      onUpdate.selectAll('title').text title

    showMap: ->
      journals = @$('.journals').empty()
      @_markers = @_marker_misses = @_no_affil = 0
      $elem = $('<div/>').addClass('map')
      journals.append """
        <div><span class="label marker-count"></span>
        <span class="label marker-miss-count"></span>
        <span class="label no-affil"></span></div>
      """
      journals.append($elem)
      layer = new L.StamenTileLayer @model.get 'mapStyle'
      @map = new L.Map $elem.get(0), MAP_OPTS
      @map.addLayer layer
      @collection.each @addMarker

    render: =>
      @$el.html @template @model.toJSON()
      kickOff = => @model.trigger 'change:view', @model, @model.get('view')
      setTimeout kickOff, 500
      return this

  return JournalList
