define (require) ->
  Q = require 'Q'
  _ = require 'underscore'
  http = require 'http'

  EFETCH = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'
  ESEARCH = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
  tool = "pubtrend"
  email = "alex.kalderimis+pubtrend-client@gmail.com"
  db = 'pubmed'
  retmode = 'xml'

  ## :: (Node, String) -> String? **/
  tagProp = (elem, tag) ->
    return null unless elem?
    child = elem.getElementsByTagName(tag)[0]
    child?.textContent

  parseAuthor = (elem) ->
    ret = {}
    ret.foreName = tagProp(elem, 'ForeName')
    ret.lastName = tagProp(elem, 'LastName')
    return ret

  ###
  * :: (Element) -> Object
  ###
  parseCitation = (art) ->
    ret = {journal: {}}
    journalInfo    = art.getElementsByTagName('Journal')[0]
    journalIssue   = art.getElementsByTagName('JournalIssue')[0]
    dateInfo       = art.getElementsByTagName('PubDate')[0]
    abstractInfo   = art.getElementsByTagName('Abstract')[0]
    authors        = art.getElementsByTagName('Author')

    ret.title          = tagProp(art, 'ArticleTitle')
    ret.affiliation    = tagProp(art, 'Affiliation')
    ret.year           = tagProp(dateInfo, 'Year')
    ret.month          = tagProp(dateInfo, 'Month')
    ret.abstract       = tagProp(abstractInfo, 'AbstractText')
    ret.copyright      = tagProp(abstractInfo, 'CopyrightInformation')
    ret.authors        = [].map.call(authors, parseAuthor)
    ret.journal.title  = tagProp(journalInfo, 'Title')
    ret.journal.issue  = tagProp(journalIssue, 'Issue')
    ret.journal.volume = tagProp(journalIssue, 'Volume')

    return ret

  ###
   * Process a pubmed medline citation result set and produce article
   * data objects.
   * :: (Document) -> Array<Journal>
  ###
  extractAbstracts = (term) -> (doc) ->
    (_.extend parseCitation(e), {term} for e in doc.getElementsByTagName('Article'))

  ###
   * Read out the ids as strings :: (Document) -> Array<String>
  ###
  extractIds = (doc) ->
    # They are integers, but we can treat them as strings.
    (elem.textContent for elem in doc.getElementsByTagName('Id'))

  ID_OPTS =
    type: "GET"
    url: ESEARCH
    dataType: "xml"

  ID_PARAMS =
    tool: tool
    email: email
    db: db
    rettype: "uilist",
    datetype: "pdat",

  idReqParams = (term, year, offset, limit) ->
    mindate = year + '/01'
    maxdate = year + '/12'
    retmax = (limit ? 100)
    retstart = (offset ? 0)

    _.extend {mindate, maxdate, retstart, term, retmax}, ID_PARAMS

  ## (string, int, int?, int?) -> Promise<Array<String>>
  getIds = (term, year, offset, limit) ->
    data = idReqParams term, year, offset, limit
    http.ajax(_.extend {data}, ID_OPTS).then extractIds

  ABSTRACT_OPTS =
    type: 'POST'
    url: EFETCH
    dataType: "xml"

  ## (string, int, int?, int?) -> Promise<Array<Journal>>
  getAbstracts = (term, year, offset, limit) ->
    idsToAbstractsDoc = (ids) ->
      id = ids.join ','
      http.ajax _.extend {data: {tool, email, db, retmode, id}}, ABSTRACT_OPTS
    getIds(term, year, offset, limit).then(idsToAbstractsDoc).then extractAbstracts term

  return getAbstracts
