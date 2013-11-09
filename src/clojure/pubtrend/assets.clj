(ns pubtrend.assets
  (:require [dieter.settings :as settings]
            [ring.util.codec :as codec]
            [clojure.java.io :as io])
  (:use clojure.tools.logging
        [dieter.asset.coffeescript :only (compile-coffeescript)]))

(defn asset-file-for [req options]
  (let [file (-> (:uri req)
                 codec/url-decode
                 (.replaceAll "\\.js" ".coffee") ;; needs refactoring
                 (.replaceAll (options :output-dir) "")
                 (#(str (options :coffee-route) %))
                 io/as-file)]
    (debug "Checking existence of" file)
    (when (.exists file) file)))

(defn is-asset-req [req]
  (and (= :get (:request-method req))
       (.endsWith (:uri req) ".js")))

;; Just coffeescript at the moment
(defn asset-pipeline [app & {:as options}]
  (fn [req]
    (if-not (is-asset-req req)
      (app req)
      (settings/with-options options
        (if-let [asset-file (asset-file-for req options)]
          {:body (compile-coffeescript asset-file)
           :status 200
           :headers {"Content-Type" "text/javascript"}}
        (app req))))))
