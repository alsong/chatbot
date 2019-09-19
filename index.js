'use strict';

//Import dependencies and setup http server
const express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()); //creates an http server

const request = require('request');

//sets up server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

//page access token
const PAGE_ACCESS_TOKEN = "EAARwivZAmUhcBANZCoNTNwEoml8GqJZC6eyB2twN1cm8WEQTrXH428C0XZBZCFFmy4sni51VDkDhCOVknucPZAys9yRqeLZADGtX1fwiqyZAyQgIgQ7P4ETQC3XpPpCcsE8csOvSxBoBGoy7n107F3bEAESqVGzqBMCh1AZAEghXe3wZDZD";

//creates the endpoint for our webhook
app.post('/webhook', (req, res) => {

    let body = req.body;

    //checks if this is an event from a page subscription
    if (body.object == "page") {

        //it iterates over each entry - there might be multiple if batched
        body.entry.forEach((entry) => {

            //Gets the message, entry.messaging is an array, but will
            //only ever contain one message. so we get index 0

            let webhook_event = entry.messaging[0];
            console.log(webhook_event);

            //Get the sender ID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            //Check if the event is a a message or a postback and
            //pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        })

        //returns a '200 OK' response to all requests
        res.status(200).send('EVENT RECEIVED');
    } else {
        //Returns '404 Not Found' if request is not from page subscription
        res.sendStatus(404);
    }
})

//Adds support for GET request for our webhook
app.get('/webhook', (req, res) => {

    //Your verification token
    let VERIFY_TOKEN = "12345";

    //Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];


    //Checks if a token and mode is in the query string of the request
    if (mode && token) {


        //checks if the mode and token sent are correct
        if (mode == 'subscribe' && token == VERIFY_TOKEN) {

            //responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            //Responds with '403 Forbidden' if verify tokens donot match
            res.sendStatus(403);
        }
    }
})

//Handles messages events
const handleMessage = (sender_psid, received_message) => {

    let response;

    //Check if the message contains text
    if (received_message.text) {

        //Create the payload for a basic text message
        response = {
            "text": `You sent the message: '${received_message.text}'. Now send me an image! `
        }
    }

    //Sends the response message
    callSendAPI(sender_psid, response);
}

//Handles messaging_postbacks events
const handlePostback = (sender_psid, received_postback) => {

}

//Sends response messages via the Send API
const callSendAPI = (sender_psid, response) => {

    //Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    //Send the HTTP request to the Messenger Platfrom
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": {
            "access_token": PAGE_ACCESS_TOKEN
        },
        "method": POST,
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent')
        } else {
            console.error('Unable to send message: ' + err);
        }
    })
}