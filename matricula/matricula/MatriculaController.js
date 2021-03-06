const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var Matricula = require('./Matricula');

// CREATES A NEW MATRICULA
router.post('/', function (req, res) {
    console.log(req);
    Matricula.create({
        name: req.body.name,
        email: req.body.email,
        docId: req.body.docId
    },
        function (err, matricula) {
            if (err) return res.status(500).send("There was a problem adding the information to the database.");

            var request = require('request');
            request('https://xraxrqeie8.execute-api.us-east-1.amazonaws.com/dev/inscricao?email=' + req.body.email, function (error, response, body) {
                console.log('error: ',error);
                console.log('statusCode: ', response && response.statusCode); // Print the response status code if a response was received
                console.log('body: ', body);
                console.log('inscricao: ', body);
            });

            sendMessage('INSERT', matricula, null);
            res.status(200).send(matricula);
        });
});

// RETURNS ALL THE MATRICULAS IN THE DATABASE
router.get('/', function (req, res) {
    Matricula.find({}, function (err, matricula) {
        if (err) return res.status(500).send("There was a problem finding the matricula.");
        res.status(200).send(matricula);
    });
});

// GETS A SINGLE MATRICULA FROM THE DATABASE
router.get('/:id', function (req, res) {
    Matricula.findById(req.params.id, function (err, matricula) {
        if (err) return res.status(500).send("There was a problem finding the matricula.");
        if (!matricula) return res.status(404).send("No matricula found.");
        res.status(200).send(matricula);
    });
});

// DELETES A MATRICULA FROM THE DATABASE
router.delete('/:id', function (req, res) {
    Matricula.findByIdAndRemove(req.params.id, function (err, matricula) {
        if (err) return res.status(500).send("There was a problem deleting the matricula.");
        sendMessage('REMOVE', null, matricula);
        res.status(200).send("Name: " + matricula.name + " was deleted.");
    });
});

// UPDATES A SINGLE MATRICULA IN THE DATABASE
router.put('/:id', function (req, res) {
    // var oldMatricula;
    // Matricula.findById(req.params.id, function (err, matricula) {
    //     if (err) return res.status(500).send("There was a problem updating the matricula.");
    //     oldMatricula = matricula;
    //     matricula.name = req.body.name;
    //     matricula.id = req.body.id;
    //     matricula.docId = req.body.docId;
    //     matricula.email = req.body.email;
    //     matricula.save(function (err) {
    //         if (err) return res.status(500).send("There was a problem updating the matricula.");
    //         sendMessage('MODIFY', matricula, oldMatricula);
    //         res.status(200).send(matricula);
    //     });
    // });
    Matricula.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, matricula) {
        if (err) return res.status(500).send("There was a problem updating the matricula.");
        sendMessage('MODIFY', matricula, null);
        res.status(200).send(matricula);
    });
});

/* Send message to SQS topic */
function sendMessage(eventType, newImg, oldImg) {

    console.log(eventType);

    const timestamp = new Date().getTime();

    body = {
        event: eventType,
        eventId: Math.random().toString(36).slice(2),
        ApproximateCreationDateTime: timestamp,
        oldImage: oldImg,
        newImage: newImg
    };

    var params = {
        DelaySeconds: 10,
        //MessageBody: JSON.stringify(record.dynamodb),
        MessageBody: JSON.stringify(body),
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/523005990244/events'
    };

    sqs.sendMessage(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data.MessageId);
        }
    });
}

module.exports = router;