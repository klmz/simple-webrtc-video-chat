express = require 'express'
app = express()
ws = require 'websocket.io'
uuid = require 'node-uuid'

app.use express.static './public'

app.get '/viewer/:room', (req, res) ->
  res.render 'viewer.jade', params: req.query, room_count: io.clientsByRoom[req.params.room]?.length || 0

app.get '/broadcast/:room', (req, res) ->
  res.render 'broadcast.jade', params: req.query, room_count: io.clientsByRoom[req.params.room]?.length || 0

server =  app.listen 5002
console.log 'started'
io = ws.attach server

io.clientsById ||= {}
io.clientsByRoom ||= {}

io.on 'connection', (socket) ->
  url = /\/(.+)/.exec(socket.req.url)[1]
  index = url.lastIndexOf("/");
  room = url.substr(index)
  socket.id = uuid.v1()
  socket.room = room
  console.log room
  if !room
    socket.close()
    return

  io.clientsByRoom[room] ||= []
  io.clientsByRoom[room].push socket
  io.clientsById[socket.id] = socket
  
  socket.send JSON.stringify
    type: 'assigned_id'
    id: socket.id

  socket.on 'message', (data) ->
    msg = JSON.parse(data)

    switch msg.type
      when 'received_offer', 'received_candidate', 'received_answer'
        # broadcast to all connected clients in the room
        # except for the socket that initiated this message
        for sock in io.clientsByRoom[socket.room]
          if sock.id != socket.id
            sock.send(JSON.stringify msg)
      when 'lights'
        console.log 'test'
      when 'close'
        socket.close()
