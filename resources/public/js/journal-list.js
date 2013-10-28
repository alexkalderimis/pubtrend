define(['abstract-source'], function(getAbstracts) {

  var Journal = Backbone.View.extend({

    tagName: 'li',
    className: 'journal',

    template: _.template([
      '<div class="row">',
        '<div class="small-4 columns">',
        '  <table class="journal-details">',
        '    <tbody>',
        '      <tr>',
        '        <td class="key">title</td>',
        '        <td class="val"><%- title %></th>',
        '      </tr>',
        '      <tr>',
        '        <td class="key">journal</td>',
        '        <td class="val">',
        '          <i><%- journal.title %></i>',
        '         (<%- journal.issue %>, <%- journal.volume %>)',
        '        </td>',
        '      </tr>',
        '      <tr>',
        '        <td class="key">affiliation</td>',
        '        <td class="val"><%- affiliation %></td>',
        '      </tr>',
        '      <tr>',
        '        <td class="key">date</td>',
        '        <td class="val"><%- month %> <%- year %></td>',
        '      </tr>',
        '      <tr>',
        '        <td class="key">first author</td>',
        '        <td class="val"><%- firstAuthor %></td>',
        '      </tr>',
        '    </tbody>',
        '  </table>',
        '</div>',
        '<div class="small-8 columns">',
        '  <% if (abstract) { %>',
          '  <p><%- abstract %></p>',
          '<% } else { %>',
          '  <i>No abstract available</i>',
          '<% } %>',
        '  <% if (copyright) { %>',
        '    <span class="copyright">Copyright <%- copyright %></span>',
        '  <% } %>',
        '</div>',
      '</div>'].join('')),

    render: function () {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });

  var JournalList = Backbone.View.extend({

    className: 'modal reveal-modal',

    initialize: function () {
      var self = this;
      this.model.on('change:offset', function () {
        var offset = self.model.get('offset')
          , limit = self.model.get('limit')
          , term = self.model.get('term')
          , year = self.model.get('year');
        getAbstracts(term, year, offset, limit).then(function (journals) {
          self.collection.reset(journals);
          self.render();
        });
      });
    },

    events: {
      'click .close': function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        this.close();
      },
      'click .get-more': function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var offset = this.model.get('offset')
          , limit = this.model.get('limit');
        this.model.set('offset', offset + limit);
      }
    },

    template: _.template([
      '<div class="modal-header">',
        '<a class="close-reveal-modal close">close</a>',
        '<h3>',
          'Publications matching <i><%- term %></i> in <%- year %>',
        '</h3>',
      '</div>',
      '<div class="modal-body">',
        '<p>Showing publications <%= offset + 1 %> to <%= limit + offset %>',
        ' of <%= count %></p>',
        '<ul class="journals"></ul>',
        '<button class="get-more small button">More</button>',
      '</div>',
      '<div class="modal-footer right">',
        '<a href="#" class="button left ok success close">close</a>',
      '</div>'].join('')),

    show: function () {
      this.render();
      $('body').append(this.el);
      this.$el.foundation('reveal', 'open');
      return this;
    },

    close: function () {
      this.$el.foundation('reveal', 'close');
      this.remove();
    },

    insertJournals: function () {
      var journals = this.$('.journals').empty();
      this.collection.each(function (journal) {
        var journalView = new Journal({model: journal});
        journals.append(journalView.render().el);
      });
    },

    render: function () {
      this.$el.html(this.template(this.model.toJSON()));
      this.insertJournals();
      return this;
    }

  });

  return JournalList;

});
