/*global
 define, console, window
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'bluebird',
    'kb_common_dom',
    'kb_common_html'
],
    function (Promise, dom, html) {
        'use strict';
        function factory(config) {
            var mount, container, mountedWidget, runtime;

            mount = config.node;
            if (!mount) {
                throw new Error('Cannot create widget mount without a parent node. Pass it as "node"');
            }
            runtime = config.runtime;
            if (!runtime) {
                throw new Error('The widget mounter needs a runtime object in order to find and mount widgets.');
            }
            container = dom.createElement('div');
            container = mount.appendChild(container);
            container.id = html.genId();
            // container = dom.append(mount, dom.createElement('div'));

            function mountWidget(widgetId, params) {
                // stop the old one
                    // Stop and unmount current widget.
                    return Promise.try(function () {
                        if (mountedWidget) {
                            var widget = mountedWidget.widget;
                            return widget.stop()
                                .then(function () {
                                    return widget.detach();
                                })
                                .then(function () {
                                    if (widget.destroy) {
                                        return widget.destroy();
                                    }
                                });
                        }
                    })
                        .then(function () {
                            // return runtime.ask('widgetManager', 'makeWidget', widgetId);
                            return runtime.getService('widget').makeWidget(widgetId, {
                                runtime: runtime
                            });
                        })
                        .then(function (widget) {
                            if (widget === undefined) {
                                throw new Error('Widget could not be created: ' + widgetId);
                            }
                            mountedWidget = {
                                id: html.genId(),
                                widget: widget,
                                container: null,
                                state: 'created'
                            };

                            /* TODO: config threaded here? */
                            // init method is optional
                            return Promise.try(function () {
                                if (widget.init) {
                                    return widget.init();
                                }
                            })
                        })
                        .then(function () {
                            var c = dom.createElement('div');
                            c.id = mountedWidget.id;
                            container.innerHTML = '';
                            dom.append(container, c);
                            mountedWidget.container = c;
                            return widget.attach(c);
                        })
                                .then(function () {
                                    if (widget.start) {
                                        return widget.start(params);
                                    }
                                })
                                .then(function () {
                                    if (widget.run) {
                                        return widget.run(params);
                                    }
                                })
                                .then(function () {
                                    resolve();
                                })
                                .catch(function (err) {
                                    console.log('ERROR initializing widget');
                                    console.log(err);
                                    reject(err);
                                });

                        })
                        .catch(function (err) {
                            console.log('ERROR');
                            console.log(err);
                            reject(err);
                        });
                });
            }
            return {
                mountWidget: mountWidget
            };
        }
        return {
            make: function (config) {
                return factory(config);
            }
        };
    });