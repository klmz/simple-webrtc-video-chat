var app, express, hue, io, lightOn, request, server, uuid, ws;

express = require('express');
request = require('request');
// var hue = require('hue-module');

// hue.discover(function(e) {
//     console.log(e)
// });
// hue.load("192.168.178.19", "174fb5a039dabc8f3b1a51f02a78ec7f");
var url = "http://192.168.178.19/api/174fb5a039dabc8f3b1a51f02a78ec7f/lights/1/state";

app = express();
ws = require('websocket.io');
uuid = require('node-uuid');
app.use(express["static"]('./public'));

app.get('/viewer/:room', function(req, res) {
    var ref;
    return res.render('viewer.jade', {
        params: req.query,
        room_count: ((ref = io.clientsByRoom[req.params.room]) != null ? ref.length : void 0) || 0
    });
});

app.get('/broadcast/:room', function(req, res) {
    var ref;
    return res.render('broadcast.jade', {
        params: req.query,
        room_count: ((ref = io.clientsByRoom[req.params.room]) != null ? ref.length : void 0) || 0
    });
});

lightOn = true;

server = app.listen(5002);

console.log('started');

io = ws.attach(server);

io.clientsById || (io.clientsById = {});

io.clientsByRoom || (io.clientsByRoom = {});

io.on('connection', function(socket) {
    var base, index, room, url;
    url = /\/(.+)/.exec(socket.req.url)[1];
    index = url.lastIndexOf("/");
    room = url.substr(index);
    socket.id = uuid.v1();
    socket.room = room;
    console.log(room);
    if (!room) {
        socket.close();
        return;
    }
    (base = io.clientsByRoom)[room] || (base[room] = []);
    io.clientsByRoom[room].push(socket);
    io.clientsById[socket.id] = socket;
    socket.send(JSON.stringify({
        type: 'assigned_id',
        id: socket.id
    }));
    return socket.on('message', function(data) {
        var i, len, msg, ref, results, sock;
        msg = JSON.parse(data);
        switch (msg.type) {
            case 'received_offer':
            case 'received_candidate':
            case 'received_answer':
                ref = io.clientsByRoom[socket.room];
                results = [];
                for (i = 0, len = ref.length; i < len; i++) {
                    sock = ref[i];
                    if (sock.id !== socket.id) {
                        results.push(sock.send(JSON.stringify(msg)));
                    } else {
                        results.push(void 0);
                    }
                }
                return results;
                break;
            case 'lights':
                if (msg.data == 'on') {
                    console.log("Turn light on");
                    request({
                        url: url,
                        method: 'PUT',
                        json: {
                            "on": true,
                            "bri": msg.data.bri
                        }
                    }, function(e) {
                            console.log(e);
                        })
                // hue.light(1, function(light) {
                //     hue.change(light.set({
                //         "on": true,
                //         "bri": msg.data.bri
                //     }));
                // });
                } else if (msg.data == 'off') {
                    console.log("Turn light off");
                    request({
                        url: url,
                        method: 'PUT',
                        json: {
                            "on": false
                        }
                    }, function(e) {
                            console.log(e);
                        })
                }

                break;
            case 'close':
                return socket.close();
        }
    });
});

// ---
// generated by coffee-script 1.9.2