# Assumes non require loading of d3, Backbone and underscore.

define (require) ->
  d3 = require 'd3'
  Q = require 'Q'
  getAbstracts = require 'abstract-source'
  dispatcher = require 'dispatcher'
  JournalList = require 'journal-list'
  http = require 'http'

  # Utilities, helpers, constants, etc.
  CURRENT_YEAR = (new Date()).getUTCFullYear()
  first = (xs) -> xs[0]
  rest = (xs) -> xs.slice(1)
  slideTempl = ({x}) -> "translate(#{ x })"
  notTruthy = (x) -> not x
  LEFT = 37
  RIGHT = 39
  asObj = (k) -> (val) ->
    o = {}
    o[k] = val
    return o
  mergeDataSets = (datasets) ->
    ret = ([first row] for row in first datasets)
    for row, idx in ret
      for ds in datasets
        row.push ds[idx][1]
    return ret

  getParamsets = ({terms, start, end}) -> ({term, start, end} for term in terms)

  popups = {}

  clearPopups = () ->
    for own k, popup of popups
      popup.remove()
      delete popups[k]

  dispatcher.on "click:bar", (term, year, count, coords) ->
    key = [term, year].join('')
    isActive = !!popups[key]
    popup = $ '<div/>'
    modalBtn = $ '<a class="small button">See abstracts</a>'
    templ = _.template """
        <h4><%= year %>: <%= term %></h4>
        <p><%= count %> publications</p>
    """
     
    clearPopups()
    return if isActive

    modalBtn.click ->
      clearPopups()
      offset = 0
      limit = 25
      getAbstracts(term, year, offset, limit).then (journals) ->
        collection = new Backbone.Collection(journals)
        model = new Backbone.Model {term, year, count, offset, limit}
        view = new JournalList {collection, model}
        view.show()

    popups[key] = popup
    popup.addClass("popup")

    popup.append templ {term, count, year}
    popup.append modalBtn

    popup.appendTo 'body'

    top = Math.max 20, coords.y - 10 - popup.height()
    left = Math.max 20, coords.x - (popup.width() * 0.5) + 20
    popup.css
      position: "absolute",
      top: top,
      left: left

    popup.addClass "arrowed"

    popup.click -> popup.remove()

  class TrendChartView extends Backbone.View

    initialize: () ->
      @priorState = @model.toJSON()
      @data = []
      @model.on "change", @refreshChart
      @model.on "change:terms", =>
        @_maxY = 0; # reset max
        @title.text(@model.get("terms").join(", ")) if @title?
      d3.select(window).on "keydown", @onKeydown
      dispatcher.on "page-chart", @pageChart
      dispatcher.on "rescale-y", =>
        @_maxY = 0
        @refreshChart()

    render: ->
      @refreshChart()
      return this

    clearBrush: () ->
      return unless @brush?
      # Clear and redraw.
      d3.select(".brush")
        .call(@brush.clear())
        .selectAll('rect.background')
          .attr('width', @getDimensions().width)

    drawDetailedAnalysis: ->
      terms = @model.get('terms')
      y = @model.get('start')
      # Ok to get-data - coming straight from cache.
      promises = (getData {term, start: y, end: y} for term in terms)
      Q.all(promises).then (results) ->
        total = _.reduce results, ((sum, res) -> sum + res[0][1]), 0
        model = new Backbone.Model
          terms: terms.slice(),
          year: y,
          count: total,
          offset: 0,
          limit: 50,
          mapStyle: 'toner-lite',
          view: 'map'
        jl = new JournalList {model}
        jl.show()

    clearDetails: -> # Dummy hook for removing other views.

    refreshChart: =>
      termsWere = (@priorState.terms || []).join(',')
      termsAre = @model.get('terms').join(',')

      clearPopups()
      @clearBrush()
      @clearDetails()

      if termsWere.length and termsWere is termsAre
        action = @onUpdate
        @updateYears()
      else
        action = @drawChart

      fetching = @fetchData()
      fetching.then(action.bind(this))
      if @model.width() is 1
        fetching.then(@drawDetailedAnalysis.bind(this))
      @priorState = @model.toJSON()

    getMainGroup: () ->
      {margin: {left, top}, fullWidth, fullHeight} = @getDimensions()
      centreBtmRight = "translate(#{ left },#{ top })"
      return d3.select(@el).append('svg')
                  .attr("width", fullWidth)
                  .attr("height", fullHeight)
                .append("g")
                  .attr("transform", centreBtmRight)

    getBarX: (barWidth, nBars) -> (d, i) ->
      delta = barWidth * i
      halfBar = barWidth / 2
      shift = -(halfBar / nBars)
      return shift + delta

    getBarColour: (d, i) =>
      scale = (@_barScale ?= d3.scale.category20())
      return scale(i)

    onBarClick: () ->
      self = this # need to enable d3 this binding
      (count, i) ->
        term = self.model.get('terms')[i]
        year = d3.select(@parentElement).datum()[0]
        coords =
          yearX: self.getXScale()(year),
          x: d3.event.pageX,
          y: d3.event.pageY,
          barWidth: $(this).width(),
          barPos: $(this).position()
        dispatcher.trigger('click:bar', term, year, count, coords)

    addBars: (sel) =>
      barWidth = @getBarWidth()
      height = @getBarHeight.bind(this)
      y = @getYScale()
      nBars = rest(@data[0]).length

      return sel.selectAll('rect').data(rest)
                .attr('height', height)
              .enter().append('rect')
                .on('click', @onBarClick())
                .attr('fill', @getBarColour)
                .attr('x', @getBarX(barWidth, nBars))
                .attr('width', barWidth)
                .attr('y', y)
                .attr('height', height)

    addYearLabels: (sel) =>
      dims = @getDimensions()
      # Use d3 data fn idiom to set data set for year groups.
      return sel.selectAll('text').data( ([year]) -> [year] )
                .text(_.identity)
                .enter()
                  .append('text')
                  .attr('y', dims.height - 4)
                  .text(_.identity)

    positionYearGroup: (sel) =>
      f = _.compose slideTempl, asObj('x'), @getXScale(), first
      sel.append('g').attr('class', 'pubyear').attr('transform', f)

    buildYearGroups: (sel) -> sel.append('g').attr('class', 'years')

    addTitle: (sel) ->
      lines = []
      buffer = ''
      terms = @model.get 'terms'

      # SVG text elements require us to manage our own line breaks.
      for term in terms
        buffer += ', ' if buffer.length
        words = term.split /\s+/
        for word, wi in words
          if (buffer.length >= 20) # break at 20 chrs
            lines.push(buffer)
            buffer = ''
          buffer += word
          buffer += ' ' if (wi + 1 < words.length)
      lines.push(buffer)

      @title = sel.append('text')
         .attr('class', 'title')
         .attr('dy', '.25em')
      @title.selectAll('tspan').data(lines)
          .enter()
          .append('tspan')
          .attr('x', 0)
          .attr('dy', '1.2em')
          .text(_.identity)
      return @title

    getYAxis: ->
      dims = @getDimensions()
      y = @getYScale()
      return d3.svg.axis().scale(y).orient('right').tickSize(-dims.width)

    addYAxis: (sel) =>
      sel.selectAll('.y.axis').remove()
      dims = @getDimensions()
      yAxis = @getYAxis()

      return sel.append('g')
        .attr('class', 'y axis')
        .attr('transform', slideTempl({x: dims.width}))
        .call(yAxis)
        .selectAll('g')
        .filter(notTruthy).classed('zero', true)

    fetchData: () ->
      current = @model.toJSON()
      process = _.compose ((data) => @data = data.slice()), mergeDataSets
      promises = getParamsets(current).map(getData)

      fetching = Q.all promises
      
      fetching.done ->
        earlier = @getNextState('earlier')
        later = @getNextState('later')
        # Warm the local cache by prefetching left and right pages.
        # only fetching later pages when they are different from the current one.
        getParamsets(earlier).forEach(getData)
        getParamsets(later).forEach(getData) if (later.end > current.end)

      return fetching.then process
      
    getBarHeight: (d) -> @getDimensions().height - @getYScale()(d)

    getBarWidth: () ->
      nBars = rest(@data[0]).length
      width = @getDimensions().width
      nRows = @data.length + 1
      groupW = Math.floor(width / nRows) - 1
      return Math.floor(groupW / nBars)

    getXScale: () ->
      nBars = rest(@data[0]).length
      bw = @getBarWidth()
      {width} = @getDimensions()
      {start, end} = @model.attributes
      return d3.scale.linear()
                .range([bw / 2, width - (bw * nBars)])
                .domain([start, end])

    getMaxY: () ->
      # Remember the biggest value we have seen
      currentMax = d3.max(@data, _.compose(d3.max, rest))
      @_maxY = Math.max((@_maxY || 0), currentMax)
      return @_maxY

    getYScale: () ->
      maxY = @getMaxY()
      {height} = @getDimensions()
      d3.scale.linear().range([height, 0]).domain([0, maxY])

    zoomToBrush: =>
      return if @brush.empty()
      [start, end] = @brush.extent()
      @model.set({start: Math.ceil(start), end: Math.floor(end)})

    onUpdate: (data) ->
      currentState = @model.toJSON()
      dims = @getDimensions()
      x = @getXScale()
      y = @getYScale()
      transform = _.compose(slideTempl, asObj('x'), x, first)
      barWidth = @getBarWidth()
      nBars = rest(@data[0]).length
      height = @getBarHeight.bind(this)

      @brush.x(x)

      if @data.length is 1
        d3.selectAll('.brush')
          .selectAll('rect').attr('height', 0)
      else
        d3.selectAll('.brush')
          .selectAll('rect').attr('height', dims.height)
      
      @mainGroup.call @addYAxis

      pubYears = @yearGroups.selectAll('.pubyear').data(data, first)

      removePubYear = ->
        d3.select(this).selectAll('rect')
          .transition().duration(500)
          .attr('y', dims.height)
          .attr('height', 0)
      slideAway = ([year]) ->
        x = if (year > currentState.end) then dims.width else 0
        return slideTempl {x}

      pubYears.exit()
              .transition().duration(500)
              .each(removePubYear)
              .attr('transform', slideAway)
              .remove()
      pubYears.enter()
              .append('g')
              .attr('class', 'pubyear')
              .attr('transform', transform)

      pubYears.transition().duration(500).attr('transform', transform)

      bars = pubYears.selectAll('rect').data(rest)
      bars.exit().remove()
      bars.enter().append('rect')
            .on('click', @onBarClick())
            .attr('x', @getBarX(barWidth, nBars))
            .attr('fill', @getBarColour)
            .attr('width', barWidth)
            .attr('y', dims.height)
            .attr('height', 0)
      bars.transition().duration(500)
            .attr('x', @getBarX(barWidth, nBars))
            .attr('width', barWidth)
            .attr('y', y)
            .attr('height', height)

      texts = pubYears.selectAll('text').data (row) -> [row[0]]
      texts.enter().append('text').attr('y', dims.height - 4)
      texts.text(_.identity).attr('opacity', (barWidth < 20) ? 0 : 1) # hide when cramped.

    updateYears: ->
      {start, end} = @model.toJSON()
      filtered = @data.filter ([year]) -> year >= start and year <= end
      @onUpdate filtered

    onKeydown: () =>
      switch (d3.event.keyCode)
        when LEFT then @pageChart("earlier")
        when RIGHT then @pageChart("later")

    getNextState: (direction) ->
      {start, end} = @model.toJSON()
      incr = Math.ceil(@data.length / 3)
      if direction is "earlier"
          start -= incr
          end -= incr
      else if direction is"later"
          start = Math.min(CURRENT_YEAR + 1 - @data.length, start + incr)
          end = Math.min(CURRENT_YEAR, end + incr)
      return _.extend @model.toJSON(), {start, end}

    pageChart: (direction) => @model.set @getNextState direction

    getDimensions: ->
      fullHeight = 450
      margin = {top: 20, right: 40, bottom: 30, left: 40}
      fullWidth = @$el.width()
      width = fullWidth - margin.left - margin.right
      height = fullHeight - margin.top - margin.bottom
      return {margin, height, width, fullWidth, fullHeight}

    drawChart: (results) ->
      @$el.empty()

      svg = @getMainGroup()
      @mainGroup = svg
      yearGroups = @buildYearGroups(svg)
      pubYears = yearGroups.selectAll(".pubyear").data(@data, first)

      @yearGroups = yearGroups
      @pubYears = pubYears

      @addTitle(svg)
      @addYAxis(svg)

      @brush = d3.svg.brush().x(@getXScale()).on("brushend", @zoomToBrush)

      # Move into position.
      pubYears.enter().call @positionYearGroup

      # Add bars
      pubYears.call @addBars

      # Add labels
      pubYears.call @addYearLabels

      dims = @getDimensions()
      bg = svg.append('g')
         .attr('class', 'x brush')
         .call(@brush)
      bg.selectAll('rect')
          .attr('y', 0)
          .attr('height', dims.height)
      bg.selectAll('rect.background').attr('width', dims.width)

      window.focus()

  return TrendChartView
