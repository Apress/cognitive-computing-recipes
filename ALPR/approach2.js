require('dotenv').config();
const request = require('request');
const fs = require('fs');
const sharp = require('sharp');
const recognizeImage = require('./approach1.js');

function detectNumberPlate(fileName) {
  return new Promise((resolve, reject) => {

    request({
      method: 'post',
      uri: process.env.CUSTOM_VISION_API_ENDPOINT,
      formData: {
        body: fs.readFileSync(fileName)
      },
      headers: {
        'Prediction-Key': '',
        'Prediction-key': process.env.CUSTOM_VISION_PREDICTION_KEY,
        'Content-Type': "multipart/form-data"
      },
      json: true,
    }, (error, response, data) => {
      if (error) return reject(error);

      let predictions = data.predictions.slice();
      let bestResult = { probability: 0 };
      predictions.forEach((prediction) => {
        prediction.probability > bestResult.probability && (bestResult = prediction);
      });

      const options = bestResult.boundingBox;
      const multiFactor = 5;

      const image = sharp(fileName);
      image
        .metadata()
        .then((metadata) => {
          options.left = Math.floor(options.left * metadata.width);
          options.top = Math.floor(options.top * metadata.height);
          options.width = Math.floor(options.width * metadata.width);
          options.height = Math.floor(options.height * metadata.height);
        })
        .then(() => {
          image
            .extract(options)
            .toBuffer()
            .then(buffer => {
              sharp({
                create: {
                  width: options.width * multiFactor,
                  height: options.height * multiFactor,
                  channels: 3,
                  background: { r: 255, g: 255, b: 255 }
                }
              })
                .overlayWith(buffer)
                .toFile('numberPlate.jpg', function (err) {
                  if (err) return console.error(err);
                  resolve('FILE SAVED!');
                })
            })
            .catch(err => reject(err));
        })
        .catch((err) => reject(err));
    });
  });
}

detectNumberPlate('./bean.jpg')
  .then((data) => {
    recognizeImage('./numberPlate.jpg')
      .then(data => {
        if (data.recognitionResult && data.recognitionResult.lines) {
          let lines = data.recognitionResult.lines;
          lines.forEach(line => {
            console.log(line.text || 'N/A');
          });
        }
      })
      .catch(error => {
        console.log(error)
      });
  })
  .catch((error) => {
    console.log(error);
  });