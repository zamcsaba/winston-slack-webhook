'use strict';

var util = require('util');
var https = require('https');
var url = require('url');

var winston = require('winston');

var SlackWebHook = exports.SlackWebHook = winston.transports.SlackWebHook = function (options) {
    winston.Transport.call(this, options);

    options = options || {};
    this.name = options.name || 'slackWebHook';
    this.level = options.level || 'info';
    this.formatter = options.formatter || null;

    this.webhookUrl = options.webhookUrl || '';
    this.channel = options.channel || '';
    this.username = options.username || '';
    this.iconEmoji = options.iconEmoji || '';
    this.iconUrl = options.iconUrl || '';
    this.unfurlLinks = !!options.unfurlLinks;

    var parsedUrl = url.parse(this.webhookUrl);
    this.host = parsedUrl.hostname;
    this.port = parsedUrl.port || 443;
    this.path = parsedUrl.path;

    this.logKeys = options.logKeys || ['action', 'exception', 'request', 'other', 'level', 'timestamp'];
}

util.inherits(SlackWebHook, winston.Transport);

SlackWebHook.prototype.log = function (info, callback) {
    if (typeof this.formatter === 'function') {
        info = this.formatter(info);
    }

    var payload = {
        text: info.action ? info.action : info.exception.message,
        channel: this.channel,
        username: this.username,
        icon_emoji: this.iconEmoji,
        icon_url: this.iconUrl,
        unfurl_links: this.unfurlLinks,
    };

    var color;
    switch (info.level) {
        case 'error':
            color = "danger";
            break;
        case 'crit':
            color = "danger";
            break;
        case 'alert':
            color = "danger";
            break;
        case 'emerg':
            color = "danger";
            break;
        case 'warning':
            color = "warning";
            break;
        default:
            color = "good";
    }
    var attachments = [];
    Object.keys(info).forEach(k => {
        if (this.logKeys.indexOf(k) > -1) {
            attachments.push({
                fallback: util.inspect(info[k]),
                text: `${k}: ${util.inspect(info[k])}`,
                color: color,
            })
        }
    });
    payload.attachments = attachments;

    var data = JSON.stringify(payload);

    var req = https.request({
        host: this.host,
        port: this.port,
        path: this.path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    }, function (res) {
        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function () {
            if (res.statusCode === 200) {
                callback(null, body);
            } else {
                callback(new Error('https request fails. statusCode ' + res.statusCode + ', body ' + body));
            }
        });
    });

    req.write(data);
    req.end();
};
