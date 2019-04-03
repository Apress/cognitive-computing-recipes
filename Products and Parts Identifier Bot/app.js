// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
var Promise = require('bluebird');
var request = require('request-promise').defaults({ encoding: null });

const API_URL = 'https://southcentralus.api.cognitive.microsoft.com/customvision/v2.0/Prediction/' +
  process.env.CUSTOM_VISION_PROJECT_ID + '/image';

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector();

// Listen for messages
server.post('/api/messages', connector.listen());

// Bot Storage: Here we register the state storage for your bot. 
// Default store: volatile in-memory store - Only for prototyping!
// We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
// For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
var inMemoryStorage = new builder.MemoryBotStorage();


var bot = new builder.UniversalBot(connector, function (session) {

  session.sendTyping();

  var msg = session.message;
  if (msg.attachments.length) {

    // Message with attachment, proceed to download it.
    // Skype & MS Teams attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
    var attachment = msg.attachments[0];
    var fileDownload = checkRequiresToken(msg)
      ? requestWithToken(attachment.contentUrl)
      : request(attachment.contentUrl);

    fileDownload.then(
      function (response) {

        // Make a POST request to Prediction API
        request({
          method: 'post',
          uri: API_URL,
          headers: {
            'Prediction-Key': '',
            'Content-Type': "multipart/form-data",
            'Prediction-key': process.env.CUSTOM_VISION_PREDICTION_KEY
          },
          formData: { data: response },
          json: true
        })
          // If request is successfull
          .then((response) => {

            // Check if response has predictions
            if (response && response.predictions && response.predictions.length) {

              let predictions = response.predictions;
              let best = predictions[0];

              // Find best prediction - with the highest probability
              for (let i = 1; i < predictions.length; i++) {
                if (predictions[i].probability > best.probability) {
                  best = predictions[i];
                }
              }

              // If the probability is high than the threshold, send message
              if (best.probability > parseFloat(process.env.CONFIDENCE_THRESHOLD)) {
                let fileName = best.tagName.replace(' ', '+') + '.jpg';
                session.send({
                  text: 'You have sent me an image of ' + best.tagName + '. This is the image of the product.',
                  attachments: [
                    {
                      contentType: 'image/jpeg',
                      contentUrl: process.env.S3_BUCKET_URL + fileName,
                      name: best.tagName
                    }
                  ]
                });
              }

              // If the probability is low than the threshold
              else {
                session.send("Sorry! I don't know what it is.");
              }
            }

            // If response does not have predictions
            else {
              session.send("Sorry! I don't know what it is.");
            }
          })

          // If there is an error in POST request, send this message
          .catch((err) => session.send("I can't process your request for some technical reasons."));

      }).catch(function (err) {
        console.log('Error downloading attachment:', { statusCode: err.statusCode, message: err.response.statusMessage });
      });

  } else {

    // No attachments were sent
    session.send('You did not send me a product image to recognize.')
  }

}).set('storage', inMemoryStorage); // Register in memory storage

// Request file with Authentication Header
var requestWithToken = function (url) {
  return obtainToken().then(function (token) {
    return request({
      url: url,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/octet-stream'
      }
    });
  });
};

// Promise for obtaining JWT Token (requested once)
var obtainToken = Promise.promisify(connector.getAccessToken.bind(connector));

var checkRequiresToken = function (message) {
  return message.source === 'skype' || message.source === 'msteams';
};

bot.on('conversationUpdate', function (activity) {
  if (activity.membersAdded) {
    const hello = new builder.Message()
      .address(activity.address)
      .text("Hello! Send me an image of the product and I'll send you the actual image of the product.");
    activity.membersAdded.forEach(function (identity) {
      // Send message when the bot joins the conversation   
      if (identity.id === activity.address.bot.id) {
        bot.send(hello);
      }
    });
  }
});