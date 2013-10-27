# pubtrend

A demonstration web-app for illustrating the use of d3 for
visualising the results of NIH ESearch web-services.

![Image](../master/resources/pubtrend.png?raw=true)

You can see a demonstration of the server-less version of this
program on [gh-pages][2]. See below for instructions on
installing the middle-ware server.

[2]: https://alexkalderimis.github.io/pubtrend

## Prerequisites

There are no prerequisites for the client side version, although
modern web browsers are definitely recommended.

### Server Side Installation Instructions

You will need [Leiningen][1] 1.7.0 or above installed. 

[1]: https://github.com/technomancy/leiningen

### Running

To start a web server for the application, run:

    lein ring server

The port may be supplied through the `PORT` parameter. See `lein
help ring` for further details.

## Usage

The web-app loads initally showing the publication trend for
pubmed entries that match "asthma" since 2000. The window of time
can be changed by entering a start and end year in the control
form, pressing the `earlier` and `later` buttons or pressing the
`left` and `right` arrows on your keyboard.

One or more search terms can be entered, and the data for each
trend will be overlaid in the chart area.

## License

Copyright © 2013 Alexis Kalderimis
