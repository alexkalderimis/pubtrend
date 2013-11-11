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

    className: 'journal-pie-chart'

    initialize: ->
      @model.on 'change:view', (model, view) =>
        setTimeout(@reflow, 100) if view is 'journals'
      @on 'journal:interest', (journal) =>
        [ofInterest, boring] = (arcTween f for f in [@interestArc, @arc])
        tween = if journal?
          (d, i) ->
            f = if journal is key d then ofInterest else boring
            f.apply @, arguments
        else
          boring
        _.defer => @path.transition().duration(250).attrTween('d', tween)

    template: _.template html

    layout: d3.layout.pie().sort(null).value ({values}) -> values

    palette: d3.scale.category20c()

    reflow: =>
      height = @$el.height()
      width = @$el.width()
      ratio = width / height
      showTable = ratio >= 1.5
      radius = if showTable and ratio < 2 then width / 6 else 0.5 * Math.min width, height
      pieXOffset = if showTable then width / 4 else width /2
      moveToPosition = "translate(#{ pieXOffset },#{ height / 2})"

      @detailG.attr 'transform', moveToPosition
      @arc = d3.svg.arc().innerRadius(radius * 0.3).outerRadius(radius * 0.9)
      @interestArc = d3.svg.arc().innerRadius(radius * 0.4).outerRadius(radius)
      @$('.legend').toggle showTable
      data = d3.nest()
              .key(({journal: {title}}) -> title)
              .rollup(({length}) -> length)
              .entries(@collection.toJSON())
      @updateTable data.slice() if showTable
      @updatePieChart data.slice()

    render: ->
      @$el.html @template @model.toJSON()

      legend = d3.select(@el).append('div').attr('class', 'legend')
      table = legend.append('table')
      thead = table.append('thead')
      tbody = table.append('tbody')
      @rows = tbody.selectAll('tr')
      thead.append('tr')
           .selectAll('th')
           .data(['Journal', 'Count'])
           .enter().append('th').text(_.identity)

      svg = d3.select(@$('.pie.chart').get(0)).append('svg')
      @detailG = svg.append('g').attr('class', 'details')

      @path = @detailG.selectAll('path')

      @reflow()
      @collection.on 'add', @reflow

    updateTable: (data) ->
      rowKey = ({key}) -> key
      @rows = @rows.data data, rowKey
      reportInterest = (journal) => @trigger 'journal:interest', journal
      @rows.enter().append('tr')
           .on('mouseout', (d) -> reportInterest null)
           .on('mouseover', (d) -> reportInterest rowKey d)
      @rows.style 'background', _.compose(@palette, rowKey)

      @cells = @rows.selectAll('td').data(({key, values}) -> [key, values])
      @cells.enter().append('td')

      @cells.text _.identity

    updatePieChart: (data) ->
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
      @titles = @path.selectAll('title').data (d) -> [title d]
      @titles.enter().append('title')
      @titles.text _.identity

      _.defer => @path.transition().duration(250).attrTween('d', arcTween @arc)

