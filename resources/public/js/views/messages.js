define(function() {
  var Messages = Backbone.View.extend({
    
    rendered: false,

    render: function() {
      this.$el.html('<ul class="messages"></ul>');
      this.rendered = true;
    },

    flash: function (msg) {
      if (!this.rendered) this.render();
      console.log("Received", msg);
      var msgCont = $('<li/>');
      msgCont.text(msg);
      this.$('ul.messages').append(msgCont);
      setTimeout(msgCont.fadeToggle.bind(msgCont, true), 2500);
    }

  });

  return Messages;
});
