define (require) ->

  Backbone = require 'backbone'
  _ = require 'underscore'
  d3 = require 'd3'
  html = require 'text!/html/journal-pie-chart.html'

  arcTween = (arc) -> (d, i) ->
    f = d3.interpolate @_current, d
    @_current = f 0
    _.compose arc, f

  key   = ({data: {key}}) -> key
  title = ({data: {key}, value}) -> "#{ key } (#{ value })"

  arcProps = ['startAngle', 'endAngle']

  setCurrent = (findNeighbour) -> (d, i) -> @_current = findNeighbour(i) or d

  findOldDatum = (oldData, tester) -> (i) ->
    test = tester i
    while d1 = test()
      k = key d1
      for datum in oldData
        return datum if k is key datum
    return null

  class JournalPieChart extends Backbone.View

    template: _.template html

    layout: d3.layout.pie().sort(null).value ({values}) -> values

    palette: d3.scale.category20c()

    render: ->
      @$el.html @template @model.toJSON()
      height = @$el.height()
      width = @$el.width()
      radius = Math.min(width, height) / 2
      svg = d3.select(@el).append('svg')
      moveToCenter = "translate(#{ width / 2},#{ height / 2})"
      detailG = svg.append('g').attr('class', 'details').attr 'transform', moveToCenter

      @arc = d3.svg.arc().innerRadius(radius * 0.3).outerRadius(radius * 0.9)
      @path = detailG.selectAll('path')

      @updatePieChart()
      @collection.on 'add', @updatePieChart

    updatePieChart: =>
      data = d3.nest()
              .key(({journal: {title}}) -> title)
              .rollup(({length}) -> length)
              .entries(@collection.toJSON())
      data0 = @path.data()
      data1 = @layout(data)
      wasBefore = findOldDatum data0, (i) -> -> data1[i] if ++i <  data1.length
      wasAfter = findOldDatum data0, (i) -> -> data1[i] if --i >= 0
      findNeighborArc = (i) ->
        if d = (wasBefore(i) or wasAfter(i))
          _.pick d, arcProps
      @path = @path.data data1, key
      @path.enter()
          .append('path')
          .each(setCurrent findNeighborArc)
          .attr('fill', _.compose(@palette, key))
          .append('title').text(title)

      _.defer => @path.transition().duration(250).attrTween('d', arcTween @arc)

      @path.selectAll('title').text title
