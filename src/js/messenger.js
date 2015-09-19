/*global define: true */
/*jslint browser:true  vars: true */
define(['bluebird'],
    function (Promise) {


        function factory(config) {
            // Very simple message system.
            var channels = {};
            var listeners = {};
            var subId = 0;
            function nextSubId() {
                subId += 1;
                return 'sub_' + subId;
            }
            function fail(msg) {
                throw new Error(msg);
            }
            function receive(subDef) {
                var channelName = subDef.chan || subDef.channel || 'default',
                    messageName = subDef.msg || subDef.message || fail('Message is required for a sub');

                // Get the channel, and create it if it doesn't exist.
                var channel = channels[channelName];
                if (!channel) {
                    channel = {
                        messages: {}
                    };
                    channels[channelName] = channel;
                }

                // Get the message definitions for this message, create if doesn't exist
                var messageListener = channel.messages[messageName];
                if (!messageListener) {
                    messageListener = {
                        listeners: [],
                        byId: {}
                    };
                    channel.messages[messageName] = messageListener;
                }

                // Add our message definition
                var subId = nextSubId();
                subDef.subId = subId;
                messageListener.byId[subId] = subDef;
                messageListener.listeners.push(subDef);
                return {
                    chan: channelName,
                    msg: messageName,
                    id: subId
                };
            }
            function unreceive(sub) {
                var channel = channels[sub.chan];
                if (!channel) {
                    return false;
                }
                var messageListener = channel.messages[sub.msg];
                if (!messageListener) {
                    return false;
                }

                var subDef = messageListener.byId[sub.id];
                if (!subDef) {
                    return false;
                }
                delete messageListener.byId[sub.id];
                messageListener.listeners = messageListener.listeners.filter(function (item) {
                    if (item.subId === sub.id) {
                        return false;
                    }
                    return true;
                });
                return true;
            }
            // syncronous publication
            // TODO: async version.
            function emptyPromiseList() {
                return [new Promise(function (resolve) {
                        resolve();
                    })];
            }
            function send(pubDef) {
                var channelName = pubDef.chan || pubDef.channel,
                    messageName = pubDef.msg || pubDef.message;
                
                var channel = channels[channelName];
                if (!channel) {
                    return emptyPromiseList();
                }
                var messageListener = channel.messages[messageName];
                if (!messageListener) {
                    return emptyPromiseList();
                }

                var listeners = messageListener.listeners;

                var ps = listeners.map(function (subDef) {
                    return new Promise(function (resolve, reject) {
                        try {
                            subDef.handler(pubDef.data)
                                .then(function (result) {
                                    resolve(result);
                                })
                                .catch(function (err) {
                                    reject(err);
                                });
                        } catch (ex) {
                            reject({
                                message: 'Exception running message ' + messageName + ', sub ' + subId,
                                exception: ex
                            });
                        }
                    });
                });
                console.log(ps);
                return Promise.all(ps);
            }
            return {
                receive: receive,
                unreceive: unreceive,
                send: send
            };
        }
        ;

        return {
            make: function (config) {
                return factory(config);
            }
        };

    });