const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const spawn = require('child_process').spawn;

const app = express();

app.get('/', function (req, res) {
  res.send(`<!doctype html>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/static/css/main.css">
    <body>
    <script src="/static/third_party/showdown.min.js"></script>
    <script src="/static/third_party/immutable.min.js"></script>
    <script src="/static/third_party/preact.min.js"></script>
    <script src="/static/js/app.js"></script>
    </body>`);
});

app.get('/api/courses/:name', function (req, res) {
  const fileName = `./courses/${req.params.name}.json`;
  fs.readFile(fileName, function(err, data) {
    if (err) {
      res.end('ERROR');
    } else {
      res.end(data);
    }
  })
});

app.use('/static', express.static(path.join(__dirname, 'static')))


app.get('/static/ws.js', function (req, res) {
  var data = fs.readFileSync('ws.js');
  res.send(data.toString());
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


wss.on('connection', function connection(ws) {

  const py = spawn('python', ['-u', '-i']);
  py.stdout.on('data', function (data) {
    ws.send(data.toString());
  });

  py.stderr.on('data', function (data) {
    ws.send(data.toString());
  });

  py.on('close', function(){
    ws.send('CLOSE');
  });

  ws.on('message', function incoming(message) {
    if (message[0] == 'C') { // Console
      py.stdin.write(message.substring(1) + '\n');
    } else if (message[0] == 'S') {
      fs.writeFileSync('script.py', message.substring(1));
      py.stdin.write('execfile("script.py")\n');
    }
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function listening() {
  console.log('Listening on %d', server.address().port);
});

