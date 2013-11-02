(ns pubtrend.views
  (:import [java.util Calendar Date])
  (:require [hiccup.form :as form])
  (:use [hiccup.page :only (html5 include-css include-js)]
        [hiccup.element :only (javascript-tag mail-to)]))

(defn- get-current-year []
  (-> (doto (Calendar/getInstance)
        (.setTime (Date.)))
      (.get Calendar/YEAR)))

(defn- with-utf8-charset [[tag attrs]]
  [tag (assoc attrs :charset "utf-8")])

(def ^:dynamic require-js "/vendor/requirejs/require.js")

(defn- entry-point [ep]
  (->> (include-js require-js)
       (map (fn [[tag attrs]] [tag (assoc attrs :data-main ep)]))
       (first)))

(defn- num-field [id &[ min-val max-val value ]]
  (let [assoc-if (fn [m k v] (if (nil? v) m (assoc m k v)))
        attrs (-> {:type "number" :id id}
                  (assoc-if :min min-val)
                  (assoc-if :max max-val)
                  (assoc-if :value value))]
    [:input attrs]))

(def vendor-scripts [
                     "/vendor/zepto.js"
                     "/vendor/underscore/underscore-min.js"
                     "/vendor/backbone/backbone-min.js"
                     "/vendor/foundation.min.js"
                     "/js/d3.v3.js"])

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
     (include-css "http://fonts.googleapis.com/css?family=Rokkitt")]
    [:body
     [:nav {:class "top-bar hide-for-small"}
      [:ul {:class "title-area"}
       [:li {:class "name"}
        [:h1 title]]]
      [:section {:class "top-bar-section"}
       [:ul {:class "right"}
        [:li
         (mail-to "alex.kalderimis@gmail.com" "Contact")]
        [:li {:clsss "divider"}]
        [:li {:class "has-from"}
         [:a {:class "button"
              :href "https://github.com/alexkalderimis/pubtrend"}
             "View on github"]]]]]
     [:section {:id "content" :class "main"} body]]))

(defn four-oh-four []
  (common "Page Not Found"
          [:div {:id "four-oh-four"}
           "The page you requested could not be found"]))

(defn trend-controls []
  (let [this-year (get-current-year)]
    [:div {:class "row"}
     [:div {:class "large-5 columns"}
      [:div {:class "callout panel" :id "instructions"}
       [:h3 "Trend Parameters"]
       [:p "This application shows the number of publications published per year
           matching given search terms as reported by "
           [:a {:href "http://www.ncbi.nlm.nih.gov/pubmed"} "pubmed"]]
       [:p "Adjust the trend parameters here. You can search for one or
            more terms over a given period, up to the present day. Change
            the displayed window of time by using the pagination controls,
            or the left and right buttons on the keyboard."]]]
     [:div {:class "large-7 columns"}
      [:form {:id "pubtrend-terms"}
       [:fieldset
        [:legend "Parameters"]
        [:div {:class "row"}
         
         [:div {:class "large-6 columns"}
          (form/label "pubtrends-term" "Terms")
          [:div {:id "pubtrends-terms"}
           (form/text-field {:class "pubtrends-term"} "term")]
          [:div {:class "row"}
            [:button { :title "Add a search term" :id "add-term"
                      :class "small secondary button"} "+"]]]

         [:div {:class "large-3 columns"}
          [:div {:class "row"}
            (form/label "pubtrends-from" "Start")
            (num-field "pubtrends-from" 1800 this-year (- this-year 20))]
          [:div {:class "row"}
            (form/label "pubtrends-til" "End")
            (num-field "pubtrends-til" 1800 this-year this-year)]]

         [:div {:class "large-3 columns"}
          (form/submit-button {:class "button"} "get-data")]]]]]]))

(def pagination
  [:div {:class "row"}
   [:div {:class "small-3 columns"}
    [:button {:id "show-earlier" :class "small secondary button"}
     "See earlier"]]
   [:div {:class "small-6 columns"}
    [:button {:id "zoom-in" :class "small secondary button"}
     "zoom in"]
    [:button {:id "zoom-out" :class "small secondary button"}
     "zoom out"]
    [:button {:id "re-zero" :class "small secondary button"}
     "Rescale"]
    [:div {:id "messages"}]]
   [:div {:class "small-3 columns"}
    [:button {:id "show-later" :class "small secondary button"}
     "See later"]]])

(def chart-container 
    [:div {:class "row"} [:div {:id "pubtrend-viz"}]])

(defn index []
  (common "Publication Trends"
          chart-container
          pagination
          (trend-controls)
          (map with-utf8-charset
               (conj (apply include-js vendor-scripts)
                     (entry-point "/js/client")))
          (javascript-tag "$(document).foundation();")))
