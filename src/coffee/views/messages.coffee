define ['backbone'], ->

  class Messages extends Backbone.View
    
    rendered: false,

    render: ->
      @$el.html '<ul class="messages"></ul>'
      @rendered = true

    flash: (msg) ->
      return unless msg?
      @render() unless @rendered
      console.log("Received", msg)
      $msg = $('<li/>').text msg
      @$('ul.messages').append $msg
      setTimeout $msg.fadeToggle.bind($msg, true), 2500

  return Messages
