/*
 * ntp-client
 * https://github.com/moonpyk/node-ntp
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */

(function (exports) {
    "use strict";

    var dgram = require('dgram');

    exports.defaultNtpPort = 123;
    exports.defaultNtpServer = "pool.ntp.org";

    /**
     * @param {string} server IP/Hostname of the remote NTP Server
     * @param {number} port Remote NTP Server port number
     * @param {function(Object, Date)} callback
     */
    exports.getNetworkTime = function (server, port, callback) {
        var client = dgram.createSocket("udp4"),
            ntpData = new Buffer(48);

        ntpData[0] = 0x1B; // RFC 2030

        for (var i = 1; i < 48; i++) {
            ntpData[i] = 0;
        }

        client.send(ntpData, 0, ntpData.length, port, server, function (err) {
            if (err) {
                callback(err, null);
                client.close();
                return;
            }

            client.on('message', function (msg) {
                client.close();

                // Offset to get to the "Transmit Timestamp" field (time at which the reply
                // departed the server for the client, in 64-bit timestamp format."
                var offsetTransmitTime = 40,
                    intpart = 0,
                    fractpart = 0;

                // Get the seconds part
                for (var i = 0; i <= 3; i++) {
                    intpart = 256 * intpart + msg[offsetTransmitTime + i];
                }

                // Get the seconds fraction
                for (i = 4; i <= 7; i++) {
                    fractpart = 256 * fractpart + msg[offsetTransmitTime + i];
                }

                var milliseconds = (intpart * 1000 + (fractpart * 1000) / 0x100000000);

                // **UTC** time
                var date = new Date("Jan 01 1900 GMT");
                date.setUTCMilliseconds(date.getUTCMilliseconds() + milliseconds);

                callback(err, date);
            });
        });
    };

    exports.demo = function (argv) {
        exports.getNetworkTime(
            exports.defaultNtpServer,
            exports.defaultNtpPort,
            function (err, date) {
                if (err) {
                    console.error(err);
                    return;
                }

                console.log(date);
            });
    };
}(exports));