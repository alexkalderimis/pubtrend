define(['text!/html/journal.html'], function(journal_html) {

  var Journal = Backbone.View.extend({

    tagName: 'li',
    className: 'journal',

    template: _.template(journal_html),

    render: function () {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });

  return Journal;
});
