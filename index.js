'use strict';

//Import dependencies and setup http server
const express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()); //creates an http server

//sets up server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

//creates the endpoint for our webhook
app.post('/webhook', (req,res) =>{

    let body = req.body;

    //checks if this is an event from a page subscription
    if(body.object == "page"){

        //it iterates over each entry - there might be multiple if batched
        body.entry.forEach((entry) =>{

            //Gets the message, entry.messaging is an array, but will
            //only ever contain one message. so we get index 0

            let webhook_event = entry.messaging[0];
            console.log(webhook_event);
        })

        //returns a '200 OK' response to all requests
        res.status(200).send('EVENT RECEIVED');
    }else{
        //Returns '404 Not Found' if request is not from page subscription
        res.sendStatus(404);
    }
})

//Adds support for GET request for our webhook
app.get('/webhook', (req,res) =>{

    //Your verification token
    let VERIFY_TOKEN = "12345";

    //Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

   
    //Checks if a token and mode is in the query string of the request
    if(mode && token){

        
        //checks if the mode and token sent are correct
        if(mode == 'subscribe' && token == VERIFY_TOKEN){

            //responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        }else{
            //Responds with '403 Forbidden' if verify tokens donot match
            res.sendStatus(403);
        }
    }
})