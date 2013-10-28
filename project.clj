(defproject pubtrend "0.1.0-SNAPSHOT"
  :description "FIXME: write description"
  :url "http://example.com/FIXME"
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [org.clojure/tools.logging "0.2.3"]
                 [compojure "1.1.5"]
                 [hiccup "1.0.4"]
                 [cheshire "5.2.0"]
                 [org.slf4j/slf4j-simple "1.7.5"]
                 [http.async.client "0.5.2"]]
  :plugins [[lein-ring "0.8.5"]]
  :ring {:handler pubtrend.handler/app}
  :profiles {:dev {:dependencies [[ring-mock "0.1.5"]]}})
