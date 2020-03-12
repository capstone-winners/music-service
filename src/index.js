const awsIot = require("aws-iot-device-sdk");
const thingShadow = awsIot.thingShadow;
const _ = require("lodash");
const {
  MusicManager,
  pollStatus,
} = require("./music-manager");

async function main() {
  const musicManager = await new MusicManager(['song0.mp3', 'song1.mp3', 'song2.mp3']);
  console.debug(JSON.stringify(bulbManager.bulbState));

  pollStatus(musicManager);
}

main();
