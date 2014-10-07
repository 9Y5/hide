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
    var platform = process.platform;
    var setProxyCommand = '';

    switch(platform) {
        case 'darwin': // for osx
            var proxyToggle = '';
            // convert linux's toggle terms for osx to understand.
            if (type == 'manual') {
                proxyToggle = 'on';
            } else if (type == 'none') {
                proxyToggle = 'off';
            }
            setProxyCommand = 'networksetup -setsocksfirewallproxystate Wi-Fi ' + proxyToggle;
            break;
        default: // to linux
            setProxyCommand = "gsettings set org.gnome.system.proxy mode '" + type + "'";
    }

    if (type == 'manual' || type == 'none') {
        exec(setProxyCommand, function() {
            if (callback) {
                callback();
            }
        });
    }
}

function getProxy() {
    var platform = process.platform;
    var getProxyCommand = '';

    switch(platform) {
        case 'darwin': // for osx
            getProxyCommand = 'networksetup -getsocksfirewallproxystate Wi-Fi';
        default: // to linux
            getProxyCommand = "gsettings get org.gnome.system.proxy mode";
    }
    return exec(getProxyCommand, {silent: true}).output;
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
    var platform = process.platform;
    var browser = '';
    switch(platform) {
        case 'darwin':
            browser = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome';
            break;
        default:
            browser = 'google-chrome';
    }
    exec(browser + ' ' + IP_CHECKER_URL);
}
