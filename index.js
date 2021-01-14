const fs = require('fs');
const express = require('express');
var cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { addListener, sendChallenge } = require("./util.js");

app.use(cors());

// read existing game data from file
let rawdata = fs.readFileSync('games.json');
let games = JSON.parse(rawdata);

games["test"] = "hello, world!";
backupGameData();

// set up a queue of games waiting to be played
let gameQueue = [];
// set up a queue of challenges waiting to be claimed by clients
let challengeQueue = [];
// set up a queue of challenges that have been declined, so clients can recognize when challenges are declined.
let declinedQueue = [];

// start listening for lichess events
function startEventListener() {
  let URL = "https://lichess.org/api/stream/event";
  addListener(URL, handleEvent);
}

// handle all events that come through the event loop, specifically game starts and ends
function handleEvent(rawData) {
  let data = JSON.parse(rawData);

  if (data.type === "gameStart") {
    // need to add this new game to gameQueue
    let id = data.game.id;
    gameQueue.push(id);
    console.log("new game started with id:" + id);
  } else if (data.type === "gameFinish") {
    // need to remove this finished game from list of active games
    let id = data.game.id;
    console.log("game ended:" + id);
  } else if (data.type === "challenge") {
    // new challenge created
    let id = data.challenge.id;
    challengeQueue.push(id);
  } else if (data.type === "challengeDeclined") {
    // user (chrisnunes) has rejected the challenge
    let id = data.challenge.id;
    declinedQueue.push(id);
  }

  console.log(data);
  console.log("challengeQueue: " + challengeQueue);
  console.log("gameQueue: " + gameQueue);
  console.log("declinedQueue: " + declinedQueue);
};

// back up game data 
function backupGameData() {
  let data = JSON.stringify(games);
  fs.writeFileSync("games.json", data);
}

app.get('/', (req, res) => {
  res.send('Lichess Server for https://chrisnun.es!');
})

// This method is used when a web client wants to begin a game. 
// they send in the request, and we use the Lichess API to send the challenge. 
// Input: None
// Response: Three different responses are possible
// 1: 'challengeCreated', sending client the gameID
// 1: 'challengeDeclined', sending client the gameID
// 1: 'challengeAccepted', sending client the gameID
app.get('/challenge', (req, res) => {
  res.setHeader('Content-Type', 'application/json')

  // create new challenge
  sendChallenge();

  // we create a challenge variable to store our challenge ID
  let challengeID = null;
  // start checking to see if there are any games to claim
  let interval = setInterval(function () {

    // checks if we have a challenge ID, and it is equal to the first game in the game queue
    // if this is the case, we take remove it from the game queue and send a "game started" message
    if (challengeID !== null && gameQueue.length > 0 && gameQueue[0] === challengeID) {
      gameQueue.shift();
      clearInterval(interval);
      let msg = {
        type: "challengeAccepted",
        gameID: challengeID
      }
      res.write(JSON.stringify(msg) + "\n");
      console.log("Game " + challengeID + " assigned to this user!");
      res.end();
      return;
    }

    // checks if we are missing a challenge ID, and there is one available in the challenge Queue
    if (challengeID === null && challengeQueue.length > 0) {
      // we claim the challenge id and inform client
      challengeID = challengeQueue.shift();
      console.log("client claimed challenge " + challengeID);
      let msg = {
        type: "challengeCreated",
        gameID: challengeID
      };
      res.write(JSON.stringify(msg) + "\n");
      console.log("Challenge " + challengeID + " assigned to this user!");
    }

    // checks if we have a challenge ID, but it has been declined
    if (challengeID !== null && declinedQueue.length > 0 && declinedQueue[0] === challengeID) {
      // remove value from declined queue and terminate
      declinedQueue.shift();
      clearInterval(interval);
      let msg = {
        type: "challengeDeclined",
        gameID: challengeID
      }
      res.write(JSON.stringify(msg) + "\n");
      console.log("Challenge " + challengeID + " was declined");
      res.end();
      return;
    }

    // default, nothing new to report
    res.write('\n');
  }, 100)
})

// start app
app.listen(port, () => {
  startEventListener();
  console.log(`Example app listening at http://localhost:${port}`)
});