(ns pubtrend.views
  (:import [java.util Calendar Date])
  (:use [hiccup.page :only (html5 include-css include-js)]))

(defn- get-current-year []
  (-> (doto (Calendar/getInstance)
            (.setTime (Date.)))
      (.get Calendar/YEAR)))

(defn- with-utf8-charset [[tag attrs]]
  [tag (assoc attrs :charset "utf-8")])

(defn common [title & body]
  (html5
    [:head
     [:meta {:charset "utf-8"}]
     [:meta {:http-equiv "X-UA-Compatible" :content "IE=edge,chrome=1"}]
     [:meta {:name "viewport" :content "width=device-width, initial-scale=1, maximum-scale=1"}]
     [:title title]
     (include-css "/stylesheets/style.css"
                  "/stylesheets/foundation-4.3.2/normalize.css"
                  "/stylesheets/foundation-4.3.2/foundation.min.css")
     (include-css "http://fonts.googleapis.com/css?family=Sigmar+One&v1")]
    [:body
     [:nav {:class "top-bar hide-for-small"}
      [:ul {:class "title-area"}
       [:li {:class "name"}
        [:h1 title]]]]
      [:section {:id "content" :class "main"} body]]))

(defn four-oh-four []
  (common "Page Not Found"
          [:div {:id "four-oh-four"}
          "The page you requested could not be found"]))

(defn index []
  (let [this-year (get-current-year)]
    (common "Publication Trends"
            [:div {:class "row"}
              [:div {:id "pubtrend-viz"}]]
            [:div {:class "row"}
             [:div {:class "small-3 columns"}
              [:button {:id "show-earlier" :class "small secondary button"}
               "See earlier"]]
             [:div {:class "small-6 columns"}]
             [:div {:class "small-3 columns"}
              [:button {:id "show-later" :class "small secondary button"}
               "See later"]]]
            [:div {:class "row"}
             [:div {:class "large-3 columns"}
              [:div {:class "callout panel"}
               [:h3 "Trend Parameters"]
               [:p "Adjust the trend parameters here"]]]
             [:div {:class "large-9 columns"}
                [:form {:id "pubtrend-terms"}
                [:fieldset
                  [:legend "Parameters"]
                  [:div {:class "row"}
                  [:div {:class "large-3 columns"}
                    [:label "Term"]
                    [:input {:id "pubtrends-term" :type "text" }]]
                  [:div {:class "large-3 columns"}
                    [:label "Start"]
                    [:input {:id "pubtrends-from"
                            :type "number"
                            :min 1800 :max this-year}]]
                  [:div {:class "large-3 columns"}
                    [:label "End"]
                    [:input {:id "pubtrends-til"
                            :type "number"
                            :min 1800 :max this-year}]]
                  [:div {:class "large-3 columns"}
                    [:input {:class "button" :type "submit" :value "get data"}]]]]]]]
            (map with-utf8-charset
                 (include-js "/vendor/zepto/zepto.js"
                        "/vendor/underscore/underscore-min.js"
                        "/vendor/backbone/backbone-min.js"
                        "/vendor/q/q.js"
                        "/js/d3.v3.js"
                        "/js/pubtrends.js")))))

