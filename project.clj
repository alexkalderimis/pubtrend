(defproject pubtrend "0.1.0-SNAPSHOT"
  :description "FIXME: write description"
  :url "http://example.com/FIXME"
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [org.clojure/tools.logging "0.2.3"]
                 [compojure "1.1.5"]
                 [hiccup "1.0.4"]
                 [org.clojure/java.jdbc "0.3.0-alpha5"]
                 [dieter "0.4.1"]
                 [org.xerial/sqlite-jdbc "3.7.2"]
                 [cheshire "5.2.0"]
                 [org.slf4j/slf4j-simple "1.7.5"]
                 [http.async.client "0.5.2"]]
  :plugins [[lein-ring "0.8.5"]]
  :source-paths ["src/clojure"]
  :ring {:handler pubtrend.handler/app}
  :aliases {"locations" ["run" "-m" "pubtrend.tasks/locations"]}
  :profiles {:dev {:dependencies [[ring-mock "0.1.5"]]}})
