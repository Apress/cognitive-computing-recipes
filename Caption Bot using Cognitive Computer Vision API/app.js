// Load environment variables
require('dotenv').config()

const builder = require('botbuilder');
const restify = require('restify');
const request = require('request-promise').defaults({ encoding: null });

const API_URL = 'https://westcentralus.api.cognitive.microsoft.com/vision/v2.0/analyze?visualFeatures=Description';

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector();

// Listen for messages
server.post('/api/messages', connector.listen());

var inMemoryStorage = new builder.MemoryBotStorage();

var bot = new builder.UniversalBot(connector, (session) => {

  session.sendTyping();

  var msg = session.message;
  var isURL = msg.text.indexOf('http') !== -1 ? msg.text : null;

  if (msg.attachments.length || isURL) {

    // Message with attachment, proceed to download it.
    var attachment = isURL || msg.attachments[0].contentUrl;

    request(attachment)
      .then(
      function (response) {
        // Make a POST request to Prediction API
        request({
          method: 'post',
          uri: API_URL,
          headers: {
            'Content-Type': "multipart/form-data",
            'Ocp-Apim-Subscription-Key': process.env.COMPUTER_VISION_KEY
          },
          formData: { body: response },
          json: true
        })
          // If request is successfull
          .then((response) => {

            // Check if response has predictions
            if (response && response.description && response.description.captions) {

              let caption = response.description.captions;

              // If we have a caption
              if (caption.length) {
                session.send("It is " + caption[0].text);
              }

              // If we don't have a caption
              else {
                session.send("Sorry! I can't caption it.");
              }
            }

            // If response does not have data
            else {
              session.send("Sorry! I can't caption it.");
            }
          })

          // If there is an error in POST request, send this message
          .catch((err) => session.send("I can't process your request for some technical reasons."));
      })
      .catch((err) => {
        console.log('Error downloading attachment:', err);
      });
  } else {

    // No attachments were sent
    session.send('You did not send me an image or a link of the image to caption.')
  }

})
  .set('storage', inMemoryStorage);

bot.on('conversationUpdate', function (activity) {
  if (activity.membersAdded) {
    const hello = new builder.Message()
      .address(activity.address)
      .text("Hello! I'm a Caption Bot. Send me an image or a URL of an image and I'll caption it for you.");
    activity.membersAdded.forEach(function (identity) {
      // Send message when the bot joins the conversation   
      if (identity.id === activity.address.bot.id) {
        bot.send(hello);
      }
    });
  }
});