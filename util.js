const fs = require("fs");
const fetch = require('node-fetch');

let rawdata = fs.readFileSync('config.json');
let config = JSON.parse(rawdata);

async function addListener(URL, callback) {

    console.log(URL)

    fetch(URL, {
        headers: {
            "Authorization": "Bearer " + config["token"]
        }
    })
        .then(response => response.body)
        .then(res => res.on('readable', () => {
            let chunk;
            while (null !== (chunk = res.read())) {
                let content = chunk.toString().trim();
                if (content) 
                    callback(content)
            }
        }))
        .catch(err => console.log(err));
}

async function sendChallenge () {
    let URL = "https://lichess.org/api/challenge/chrisnunes";

    const response = await fetch(URL, {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + config["token"]
        }
    });

    try {
        const json = await response.json();
    } catch (e) {
        return "Too Many Requests";
    }   

    return json.challenge.id;
}

module.exports = { addListener, sendChallenge }