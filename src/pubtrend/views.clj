(ns pubtrend.views
  (:import [java.util Calendar Date])
  (:require [hiccup.form :as form])
  (:use [hiccup.page :only (html5 include-css include-js)]))

(defn- get-current-year []
  (-> (doto (Calendar/getInstance)
        (.setTime (Date.)))
      (.get Calendar/YEAR)))

(defn- with-utf8-charset [[tag attrs]]
  [tag (assoc attrs :charset "utf-8")])

(defn- num-field [attr-map name &[ min-val max-val value ]]
  (let [assoc-if (fn [m k v] (if (nil? v) m (assoc m k v)))
        attrs (-> (assoc attr-map :type "number")
                  (assoc-if :min min-val)
                  (assoc-if :max max-val)
                  (assoc-if :value value))]
    [:input attrs]))

(def vendor-scripts [
;;                     "/vendor/requirejs/require.js"
                     "/vendor/zepto/zepto.js"
                     "/vendor/underscore/underscore-min.js"
                     "/vendor/backbone/backbone-min.js"
                     "/vendor/q/q.js"
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

(defn trend-controls []
  (let [this-year (get-current-year)]
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
          (form/label "pubtrends-term" "Terms")
          [:div {:id "pubtrends-terms"}
           (form/text-field {:class "pubtrends-term"} "term")]]
          [:button { :title "Add a search term" :id "add-term"
                    :class "small secondary button"} "+"]]
         [:div {:class "large-3 columns"}
          (form/label "pubtrends-from" "Start")
          (num-field {:id "pubtrends-from"} 1800 this-year (- this-year 20))
         [:div {:class "large-3 columns"}
          (form/label "pubtrends-til" "End")
          (num-field {:id "pubtrends-til"} 1800 this-year this-year)]
         [:div {:class "large-3 columns"}
          (form/submit-button {:class "button"} "get-data")]]]]]]))

(def pagination
  [:div {:class "row"}
   [:div {:class "small-3 columns"}
    [:button {:id "show-earlier" :class "small secondary button"}
     "See earlier"]]
   [:div {:class "small-6 columns"}]
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
               (apply include-js (conj vendor-scripts "/js/pubtrends.js")))))

