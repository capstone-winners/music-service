const _ = require("lodash");
const QRCode = require("qrcode");
const awsIot = require("aws-iot-device-sdk");
const { spawn } = require('child_process');

const config = require("../config/config.js");

class MusicManager {
  // holder for the current music process
  musicProc = null;
  songIndex = null;
  songList = null;
  musicState = null;
  // number of available songs
  nSongs = null;
  // path to song files
  songDir = null;
  // the AWS IoT device, used for subscribing to MQTT topics
  device = null;
  currentSong = null;

  constructor(deviceName, songFiles, songsLoc) {
    return (async songFiles => {
      this.songList = songFiles;
      this.songIndex = 0;
      this.nSongs = songList.length;
      this.songDir = songsLoc;

      this.updateState();

      // Create the AWS IoT device and subscribe to it's topics
      this.device = awsIot.device({
        keyPath: config.keyPath,
        certPath: config.certPath,
        caPath: config.caPath,
        clientId: config.clientId,
        host: config.host
      });

      this.device.on("connect", () => {
        console.log("connected");
        this.device.subscribe("music");
      });

      // bind the `handleAction` function to this `MusicManager` so that
      // `this` is in the correct context when a message is received and the
      // `handleAction` function is called
      const bindedFunc = this.handleAction.bind(this);
      this.device.on("message", bindedFunc);

      return this;
    })(songFiles);
  }

  async updateState() {
    const newState = convertState(this.currentSong);

    if (!_.isEqual(this.musicState, newState)) {
      // the light bulb state has changed
      console.debug("State has changed");
      this.musicState = newState;
      // TODO: remove console.log once we can correctly pad the image. Instead
      // of logging this object, we will display it on the e-ink display.
      generateQRCode(this.musicState);
    }
  }

  async playSong() {
    //var parsedIndex = parseInt(songName);
    if (parsedIndex >= this.nSongs) {
      songToPlay = songName;
    } else if (parsedIndex < this.nSongs) {
      songToPlay = this.songList[this.songIndex];
    } else {
      console.log(`Something went wrong when trying to play song.`);
    }
    tmpProc = spawn('omxplayer', [pathJoin([songDir, songToPlay], '/')]);
    tmpProc.on('close', (code) => {
      console.log(`Exited song process with code ${code}`);
      this.playing = false;
    });
  }

  async skipSong() {
    this.songIndex += 1;
    this.playSong();
  }

  async handleAction(topic, msg) {
    const payload = JSON.parse(msg.toString());
    if (payload["deviceId"] === this.musicState["super"]["deviceId"]) {
      console.log(
        `Received a message on topic ${topic} for ${payload["deviceId"]}`
      );

      /*
      if ("setSong" in payload) {
        await this.playSong(payload["setSong"]).catch(err => {
            console.error(err.message);
            generateErrorQRCode(`Could not play song on ${deviceName}`);
        })
      } else if ("setIndex" in payload) {
        await this.playSong(this.songList[payload["setIndex"]]).catch(err => {
            console.error(err.message);
            generateErrorQRCode(`Could not play song on ${deviceName}`);
          });
      }
      */
      if ("play" in payload) {
        if (payload["play"] == true) {
          await this.playSong().catch(err => {
            console.error(err.message);
            generateErrorQRCode(`Could not play song on ${deviceName}`);
          })
        }
      } else if ("skip" in payload) {
        if (payload["skip"] == true) {
          await this.skipSong().catch(err => {
            console.error(err.message);
            generateErrorQRCode(`Could not skip song on ${deviceName}`);
          })
        }
      }

      // the state has changed, so update the state and generate a new QR code
      this.updateState();
    }

  }
}

async function pollStatus(musicManager) {
  setTimeout(async () => {
    musicManager.updateState();
    pollStatus(musicManager);
  }, 10000);
}

async function pathJoin(parts, sep){
  var separator = sep || '/';
  var replace   = new RegExp(separator+'{1,}', 'g');
  return parts.join(separator).replace(replace, separator);
}


/**
 * Generate a QR code with an error message.
 */
function generateErrorQRCode(message) {
  const errorObject = { error: message };
  generateQRCode(errorObject);
}

/**
 * Generate a QR Code with the given status. Saves the generated QR code to
 * a file and then calls the Python script with the file name which manipulates
 * the image and then displays it on the e-ink display.
 */
function generateQRCode(status, deviceName) {
  QRCode.toFile(`./${deviceName}.bmp`, JSON.stringify(status), {
    "width": 176
  }, function (err) {
    if (err) throw err;
    console.debug('Saved a qr code from node');
  })
  const pyProg = spawn('python', ['../py-resize.py', '-f', `./${deviceName}.bmp`]);
}

function convertState(musicState, musicDeviceState) {
  return {
    currentSong = musicState.currentSong,
    super: {
      status: "ok", // TODO: don't hardcode
      deviceId: musicState.label,
      deviceType: "light",
      location: musicDeviceState.location.label,
      group: [musicDeviceState.group.label]
    }
  };
}

module.exports = {
  MusicManager,
  pollStatus,
};