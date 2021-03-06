'use strict';

const common = require('../common');
const assert = require('assert');
const tick = require('./tick');
const initHooks = require('./init-hooks');
const { checkInvocations } = require('./hook-checks');

const binding = process.binding('http_parser');
const HTTPParser = binding.HTTPParser;

const CRLF = '\r\n';
const RESPONSE = HTTPParser.RESPONSE;
const kOnHeadersComplete = HTTPParser.kOnHeadersComplete | 0;
const kOnBody = HTTPParser.kOnBody | 0;

const hooks = initHooks();

hooks.enable();

const request = Buffer.from(
  'HTTP/1.1 200 OK' + CRLF +
  'Content-types: text/plain' + CRLF +
  'Content-Length: 4' + CRLF +
  CRLF +
  'pong'
);

const parser = new HTTPParser(RESPONSE);
const as = hooks.activitiesOfTypes('HTTPPARSER');
const httpparser = as[0];

assert.strictEqual(
  as.length, 1,
  '1 httpparser created synchronously when creating new httpparser');
assert.strictEqual(typeof httpparser.uid, 'number', 'uid is a number');
assert.strictEqual(typeof httpparser.triggerId,
                   'number', 'triggerId is a number');
checkInvocations(httpparser, { init: 1 }, 'when created new Httphttpparser');

parser[kOnHeadersComplete] = common.mustCall(onheadersComplete);
parser[kOnBody] = common.mustCall(onbody);
parser.execute(request, 0, request.length);

function onheadersComplete() {
  checkInvocations(httpparser, { init: 1, before: 1 },
                   'when onheadersComplete called');
}

function onbody(buf, start, len) {
  checkInvocations(httpparser, { init: 1, before: 2, after: 1 },
                   'when onbody called');
  tick(1, common.mustCall(tick1));
}

function tick1() {
  parser.close();
  tick(1);
}

process.on('exit', onexit);

function onexit() {
  hooks.disable();
  hooks.sanityCheck('HTTPPARSER');
  checkInvocations(httpparser, { init: 1, before: 2, after: 2, destroy: 1 },
                   'when process exits');
}
