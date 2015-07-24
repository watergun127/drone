var Cylon = require('cylon');
var ws = require('nodejs-websocket');
var bot;

// Initialise the robot
Cylon.robot()
    .connection("ardrone", {
        adaptor: 'ardrone',
        port: '192.168.1.1'
    })
    .device("drone", {
        driver: "ardrone",
        connection: "ardrone"
    })
    .device("nav", {
        driver: "ardrone-nav",      // Combine with a second device to have more information
        connection: "ardrone"
    })
    .on("ready", fly);

// Fly the bot
function fly(robot) {
    // Only retrieve a limited amount of navigation data
    // As recommended by Parrot AR Drone developer's guide
    bot = robot;
    bot.drone.config('general:navdata_demo', 'TRUE');

    bot.nav.on("navdata", function(data) {
        // console.log(data);
    });

    bot.nav.on("altitudeChange", function(data) {
        // console.log("Altitude:", data);
    });

    bot.nav.on("batteryChange", function(data) {
        console.log("Battery level:", data);
    });

    // Get the stream of images from the drone
    bot.drone.getPngStream().on("data", processFrame);

    // Disable emergency setting if there was any
    bot.drone.disableEmergency();
    // Tell the drone it is lying horizontally
    bot.drone.ftrim();

    // Take off
    bot.drone.takeoff();

    // after(3*1000, function() {
    //     bot.drone.up(0.4);
    // })

    after(60*1000, function() {
        bot.drone.land();
    });
    after(65*1000, function() {
        bot.drone.stop();
    });
}

// Create a server for the client to receive the data from
var server = ws.createServer(receiveConnection).listen(8001);

function receiveConnection(connection) {
    console.log("New connection");
    connection.on("close", function(message) {
        console.log("Connection closed", message);
    });
    connection.on("error", function(error) {
        console.log("Connection error", error);
    });
    connection.on("text", moveDrone);
    connection.sendText("Hi!");
}

var sending = false;
function processFrame(png) {
    // Only send if not sending a message already
    // Improves responsiveness
    if (!sending) {
        sending = true;
        server.connections.forEach(function(conn) {
            conn.sendBinary(png);
        });
        // Wait a little before sending the next frame
        setTimeout(function(){ sending = false}, 200);
    }
    else {
        // console.log("Already sending, dropping frame")
    }
}

function moveDrone(message) {
    var move = JSON.parse(message);
    // console.log("Got move:", move);

    if (move.up) {
        bot.drone.up(0.4);
        after(2*1000, function() {
            bot.drone.up(0);
        });
    }

    if (move.down) {
        bot.drone.down(0.4);
        after(2*1000, function() {
            bot.drone.down(0);
        });
    }

    if (move.forward) {
        bot.drone.forward(0.4);
        after(2*1000, function() {
            bot.drone.forward(0);
        });
    }
}

Cylon.start();