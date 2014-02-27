#!/usr/bin/node

/**
 * hide -- Surf the Web through SSH.
 */

require('shelljs/global');

/**
 * Configs containing username, pass, local port, and server to connect to
 */

var conf = require('./.myConfig.js');

var SSH_COMMAND = "ssh -t -t -D " + conf.local + " " + conf.username + "@" + conf.server; //Store here so getPid() can also use.
var IP_CHECKER_URL = "http://gys.herokuapp.com/myip";


(function main() {
    /**
     * If receive one argument, the program will reset proxy
     */

    var arg = process.argv.slice(2)[0];
    if (arg == 'none' || arg == 'off') {
        setProxy('none');
        echo('Turning off proxy...');
        exit();
    }

    echo('Setting up to surf anonymously... \n');

    /**
     * Turn off first, else cannot connect to proxy
     */

    var type = getProxy().replace(/\n/, ''); // Get rid of newlines.

    if (type == "'manual'") {
        echo('Turning off proxy route to connect first...\n');
        setProxy('none');
    }

    readInput(setProxy, 'none');

    setProxy('manual', ssh);



})();

/**
 * Function definitions
 */

function setProxy(type, callback) {
    if (type == 'manual' || type == 'none') {
        exec("gsettings set org.gnome.system.proxy mode '" + type + "'", function() {
            if (callback) {
                callback();
            }
        });
    }
}

function getProxy() {
    return exec("gsettings get org.gnome.system.proxy mode", {silent: true}).output;
}

function ssh() {
    echo('ssh-ing into ' + conf.server + ', waiting for response...\n');
    var child = exec(SSH_COMMAND, {async: true, silent: true});
    var loggedin = false;
    child.stdout.on('data', function(data) {
        if (!loggedin) {
            console.log('successfully connected to ' + conf.server + '!');
            showIPAddress();
            loggedin = true;
        }
    });
}

function readInput(callback, args) {
    var rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('SIGINT', function() {
        rl.question('\nI will put you back to your original IP address.\nAre you sure you want to exit?\n', function(answer) {
            if (answer.match(/^y(es)?$/i)) {
                rl.pause();
                callback(args);
                var pids = getPid(SSH_COMMAND);
                killProcesses(pids, exitMessage);
            }
        });
    });
}

function getPid(command) {
    var psline = exec('ps aux | grep "' + command + '" | grep -v grep | awk \'{ printf $2" "}\'', {silent: true}).output;
    return psline.split(" ");
}

function killProcesses(pids, callback) {

    pids.forEach(function(elem, index, array) {
        process.kill(elem);
        console.log('\nOk, I\'ve killed ssh process on pid ' + elem);
        callback();
    });
}

function exitMessage() {
    showIPAddress();
    console.log("Bye bye!");
    exit();
}

function showIPAddress() {
    exec('google-chrome ' + IP_CHECKER_URL);
}
