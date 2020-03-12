const _ = require("lodash");
const QRCode = require("qrcode");
const awsIot = require("aws-iot-device-sdk");
const { spawn } = require('child_process');

const config = require("../config/config.js");

class MusicManager {


    constructor(songFiles) {
        return (async songFiles => {
            return this;
        })(songFiles);
    }
}

async function pollStatus(musicManager) {
    setTimeout(async () => {
      musicManager.updateState();
      if (musicManager.songEnd()) {
        musicManager.playNext();
      }
      pollStatus(musicManager);
    }, 10000);
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
  
  module.exports = {
    MusicManager,
    pollStatus,
  };