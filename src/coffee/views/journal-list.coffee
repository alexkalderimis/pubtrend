define (require) ->

  MapView = require 'views/distribution-map'
  PieChart = require 'views/journal-pie-chart'
  AbstractList = require 'views/abstract-list'
  getAbstracts = require 'abstract-source'
  http = require 'http'
  html = require 'text!/html/journal-list.html'

  class JournalList extends Backbone.View

    className: 'modal reveal-modal journal-list'

    initialize: ->
      @subviews = []
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

      #model.on 'change:view', (model, view) =>
      # @$('input[name="view"]').each ->
      #   $r = $(this)
      #   $r.prop('checked', $r.val() is view)
      # @evictKids()
      # switch view
      #   when 'map'       then @showMap()
      #   when 'abstracts' then @showAbstractList()
      #   when 'journals'  then @showPieChart()
      #   else throw new Error("Unknown view: " + view)

    getData: =>
      {offset, limit, terms, year} = @model.toJSON()
      addCitation = (xs) => @collection.add xs
      # Fetch in parallel.
      @collection.reset()
      for idx in [offset .. offset + limit]
        for term in terms
          getAbstracts(term, year, idx, 1).then addCitation

    events: ->
      'opened': ->
        @$el.foundation('section', 'reflow')
        @showAbstractList()
        @showPieChart()
        @showMap()
      'click .title.map': -> @model.set view: 'map'
      'click .title.abstracts': -> @model.set view: 'abstracts'
      'click .title.journals': -> @model.set view: 'journals'
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

    evictKids: ->
      while sv = @subviews.pop()
        sv.remove()

    remove: ->
      @collection.off()
      @model.off()
      @evictKids()
      super

    showSubView: (Clazz, selector) ->
      view = new Clazz {@collection, @model}
      @$(selector).html view.el
      view.render()
      @subviews.push view

    showAbstractList: -> @showSubView AbstractList, '.abstracts-panel'

    showPieChart: -> @showSubView PieChart, '.journals-panel'

    showMap: -> @showSubView MapView, '.map-panel'

    render: =>
      @$el.html @template @model.toJSON()
      return this

  return JournalList
