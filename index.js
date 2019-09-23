'use strict';
const FACEBOOK_GRAPH_API_BASE_URL = 'https://graph.facebook.com/v2.6/';
const GREETING = 'GREETING';
const START_SEARCH_NO = 'START_SEARCH_NO';
const START_SEARCH_YES = 'START_SEARCH_YES';
const VIEW_OPTIONS = 'VIEW_OPTIONS';
const VIEW_SERVICES = 'VIEW_SERVICES';

// Imports dependencies and set up http server
const
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()); // creates express http server

const request = require('request');
const dotenv = require('dotenv');
dotenv.config();

// Sets server port and logs message on success
app.listen(process.env.PORT || 3000, () => console.log('webhook is listening'));

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {

    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {

            // Iterate over each messaging event and handle accordingly
            entry.messaging.forEach((messagingEvent) => {
                console.log({
                    messagingEvent
                });

                // Check if the event is a message or postback and
                // pass the event to the appropriate handler function
                if (messagingEvent.postback) {
                    handlePostback(messagingEvent.sender.id, messagingEvent.postback);
                } else if (messagingEvent.message) {
                    if (messagingEvent.message.quick_reply) {
                        handlePostback(messagingEvent.sender.id, messagingEvent.message.quick_reply);
                    } else {
                        handleMessage(messagingEvent.sender.id, messagingEvent.message);
                    }
                } else {
                    console.log(
                        'Webhook received unknown messagingEvent: ',
                        messagingEvent
                    );
                }
            })
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "12345"

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

// Handles messages events
function handleMessage(sender_psid, received_message) {
    let response;

    // Check if the message contains text
    if (received_message.text) {

        // Create the payload for a basic text message
        response = {
            "text": `You sent the message: "${received_message.text}". Now send me an image!`
        }
    } else if (received_message.attachments) {
        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "image_url": attachment_url,
                        "buttons": [{
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            }
                        ],
                    }]
                }
            }
        }
    }

    // Sends the response message
    callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    switch (payload) {
        case GREETING:
            handleGreetingPostback(sender_psid);
            break;
        case START_SEARCH_YES:
            handleStartYesPostback(sender_psid);
            break;
        case START_SEARCH_NO:
            handleStartNoPostback(sender_psid);
            break;
        case VIEW_OPTIONS:
            handleViewOptions(sender_psid);
            break;
        case VIEW_SERVICES:
            handleViewServices(sender_psid);
            break;
        default:
            console.log('Cannot differentiate the payload type');
    }
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    console.log('message to be sent: ', response);
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": `${FACEBOOK_GRAPH_API_BASE_URL}me/messages`,
        "qs": {
            "access_token": PAGE_ACCESS_TOKEN
        },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}

//Handles Greeting postback 
function handleGreetingPostback(sender_psid) {
    request({
        url: `${FACEBOOK_GRAPH_API_BASE_URL}${sender_psid}`,
        qs: {
            access_token: PAGE_ACCESS_TOKEN,
            fields: "first_name"
        },
        method: "GET"
    }, function (error, response, body) {
        var greeting = "";
        if (error) {
            console.log("Error getting user's name: " + error);
        } else {
            var bodyObj = JSON.parse(body);
            const name = bodyObj.first_name;
            greeting = "Hi " + name + ". ";
        }
        const message = greeting + "Would you like to make an order in your area?";
        const greetingPayload = {
            "text": message,
            "quick_replies": [{
                    "content_type": "text",
                    "title": "Yes!",
                    "payload": START_SEARCH_YES
                },
                {
                    "content_type": "text",
                    "title": "No, thanks.",
                    "payload": START_SEARCH_NO
                }
            ]
        };
        callSendAPI(sender_psid, greetingPayload);
    });
}

//Handles Start No postback
function handleStartNoPostback(sender_psid) {
    const noPayload = {
        "text": "That's ok my friend, when you want to make an order try out our menu"
    };
    callSendAPI(sender_psid, noPayload);
}

//Handles Start Yes postback
function handleStartYesPostback(sender_psid) {
    const campaigns = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                        "title": "We need your help",
                        "image_url": "http://awsassets.panda.org/img/original/wwf_infographic_tropical_deforestation.jpg",
                        "subtitle": "to save our natural world",
                        "buttons": [{
                            "type": "postback",
                            "payload": VIEW_OPTIONS,
                            "title": "Javan Rhino Appeal"
                        }]
                    },
                    {
                        "title": "We need your help",
                        "image_url": "http://awsassets.panda.org/img/original/wwf_infographic_tropical_deforestation.jpg",
                        "subtitle": "to save our natural world",
                        "buttons": [{
                            "type": "postback",
                            "payload": VIEW_OPTIONS,
                            "title": "Javan Rhino Appeal"
                        }]
                    }
                ]
            }
        }
    };
    callSendAPI(sender_psid, campaigns);
}

//Handle View Options
function handleViewOptions(sender_psid) {
    const campaigns = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                        "title": "Panda ",
                        "image_url": "http://awsassets.panda.org/img/original/wwf_infographic_tropical_deforestation.jpg",
                        "subtitle": "to save our natural world",
                        "buttons": [{
                            "type": "postback",
                            "payload": VIEW_SERVICES,
                            "title": "Javan Rhino Appeal"
                        }]
                    },
                    {
                        "title": "Infograph",
                        "image_url": "http://awsassets.panda.org/img/original/wwf_infographic_tropical_deforestation.jpg",
                        "subtitle": "to save our natural world",
                        "buttons": [{
                            "type": "postback",
                            "payload": VIEW_SERVICES,
                            "title": "Javan Rhino Appeal"
                        }]
                    }
                ]
            }
        }
    };
    callSendAPI(sender_psid, campaigns);
}

//Hnadle View Services
function handleViewServices(sender_psid) {
    const campaigns = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                        "title": "Panda ",
                        "image_url": "http://awsassets.panda.org/img/original/wwf_infographic_tropical_deforestation.jpg",
                        "subtitle": "to save our natural world",
                        "buttons": [{
                            "type": "postback",
                            "payload": VIEW_SERVICES,
                            "title": "Javan Rhino Appeal"
                        }]
                    },
                    {
                        "title": "Infograph",
                        "image_url": "http://awsassets.panda.org/img/original/wwf_infographic_tropical_deforestation.jpg",
                        "subtitle": "to save our natural world",
                        "buttons": [{
                            "type": "postback",
                            "payload": VIEW_SERVICES,
                            "title": "Javan Rhino Appeal"
                        }]
                    }
                ]
            }
        }
    };
    callSendAPI(sender_psid, campaigns);
}