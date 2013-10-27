(ns pubtrend.handler
  (:use compojure.core
        [clojure.string :only (split)])
  (:require [pubtrend.data :as data]
            [pubtrend.views :as views]
            [compojure.handler :as handler]
            [cheshire.core :as json]
            [compojure.route :as route]))

(def to-json json/generate-string)

(defn disease-trend
  ([term start end]
    (let [years (range (Integer/valueOf start) (inc (Integer/valueOf end)))]
      (disease-trend term years)))
  ([term years]
   (let [trend (data/get-trend term years)]
    {:status 200
     :headers {"Content-Type" "application/json"}
     :body (json/generate-string trend)})))

(defroutes app-routes
  (GET "/" [] (views/index))
  (GET "/disease/:term/:start/:end" [term start end]
       (disease-trend term start end))
  (GET ["disease/:term/:years" :years #"(\d{4}-)*\d{4}"] [term years]
       (let [years (split years #"-")]
         (disease-trend term years)))
  (route/resources "/")
  (route/not-found "Not Found"))

(def app
  (handler/site app-routes))
