deps = [ 'dispatcher', 'models/trend', 'views/trend', 'views/trend-chart', 'views/messages' ]

define deps, (dispatcher, Trend, TrendView, TrendChartView, Messages) ->

  msgTemp = ({start, end}) -> "Invalid range: #{ start } - #{ end }"
    
  ###
  # Main entry point. Instantiates the moving parts and gets the ball rolling.
  ###
  main = (opts) ->

    model = new Trend
    messages = new Messages
    view = new TrendView {model}
    chartView = new TrendChartView {model}

    chartElem = document.getElementById('pubtrend-viz')
    controlElem = document.getElementById('pubtrend-terms')

    messages.setElement(document.getElementById("messages"))
    chartView.setElement(chartElem)
    view.setElement(controlElem)

    dispatcher.on "Trend:rejected-values", (m, start, end) ->
      msg = msgTemp {start, end}
      messages.flash(msg)

    # Simple global events and messages.
    $('#instructions h3').click -> $('#instructions p').fadeToggle()

    $('#re-zero').click (evt) -> dispatcher.trigger("rescale-y")

    # Dispatch zooming evens.
    for direction in ['in', 'out'] then do (direction) ->
      command = 'zoom-' + direction
      elemId = '#' + command
      $(elemId).click (evt) ->
        state = model.toJSON()
        width = state.end - state.start + 1
        round = if (direction is 'out') then Math.ceil else Math.floor
        delta = round if (direction is 'out') then (width / 2) else (-width / 3)
        state.start = Math.max Trend.MIN, state.start - delta
        state.end = Math.min Trend.MAX, state.end + delta
        model.set(state)

    # Dispatch paging events.
    for direction in ['earlier', 'later'] then do (direction) ->
      $('#show-' + direction).click -> dispatcher.trigger "page-chart", direction

    # start everything going...
    model.set(opts)
