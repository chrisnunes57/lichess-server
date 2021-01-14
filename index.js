const fs = require('fs');
const express = require('express')
const app = express()
const port = process.env.PORT || 5000

let rawdata = fs.readFileSync('games.json');
let games = JSON.parse(rawdata);
console.log(games);

games["test"] = "hello, world!";
backupGameData();

function backupGameData() {
  let data = JSON.stringify(games);
  fs.writeFileSync("games.json", data);
}

app.get('/', (req, res) => {
  res.send('Lichess Server for https://chrisnun.es!')
})

// This method is used when a web client wants to begin a game. 
// they send in the request, and we use the Lichess API to send the challenge. 
// Input: None
// Response: Stream of ndjson, ending with a gameID for the client to connect to
app.get('/challenge', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  var seq = 0
  setInterval(function () {
    res.write(JSON.stringify({ value: seq++ }) + '\n')
  }, 100)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
