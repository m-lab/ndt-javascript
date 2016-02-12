/*
 * @ndt-client.js
 * A WebSocket client for the Network Diagnostic Tool (NDT)
 *
 * This is an NDT client, written in javaScript.  It speaks the WebSocket
 * version of the NDT protocol.  The NDT protocol is documented at:
 * https://code.google.com/p/ndt/wiki/NDTProtocol
 */

/* jslint bitwise: true, browser: true, nomen: true, indent: 2, -W097 */
/* global Uint8Array, Blob, WebSocket, console */

'use strict';

/**
 * NDTjs Constructor.
 *
 * @param {String} serverAddress - NDT Server FQDN or IP Address
 * @param {Number} [serverPort="3001"] - NDT Server Port
 * @param {String} [serverPath="/ndt_protocol"] NDT Server URL Path
 * @param {Boolean} [verboseDebug="true"] Level of Debugging for NDTjs Client
 * @constructor
 */

var NDTjs = function(serverAddress, serverPort, serverPath, verboseDebug) {
  var defaultSettings = {
    serverPort: Number(3001),
    serverPath: String('/ndt_protocol'),
    verboseDebug: Boolean(true)
  };

  this.constants = {
    /*
     * NDT server version that the client is compatible with, sent in the
     * login process.
     */
    NDT_SERVER_VERSION: 'v3.5.5',
    /*
     * Sign up for every test except for TEST_MID and TEST_SFW - browsers can't
     * open server sockets, which makes those tests impossible, because they
     * require the server to open a connection to a port on the client.
     */
    NDT_DESIRED_TESTS: (2 | 4 | 32),
    /*
     * Send 1MiB websocket messages, as this seems to cause Chrome to have the
     * fewest performance problems.  It is important that this number be a
     * multiple of 8192, as the NDT protocol asks that we send 8192 bytes at a
     * time.  We can't force websocket implementations to hold to that (RFC6455
     * sec. 5.4 makes explicit that websocket clients may fragment messages in
     * any way they want), but we should at least make it possible for them to
     * send multiples of 8192 bytes.
     */
    SEND_BUFFER_SIZE: 8192 * 128,
    /** @enum {string} */
    SupportedTests: {
      TEST_C2S: '2',
      TEST_S2C: '4',
      TEST_META: '32'
    },
    SUPPORTED_TEST_IDS: ['2', '4', '32'],
    /** @enum {number} */
    MessageType: {
      COMM_FAILURE: 0,
      SRV_QUEUE: 1,
      MSG_LOGIN: 2,
      TEST_PREPARE: 3,
      TEST_START: 4,
      TEST_MSG: 5,
      TEST_FINALIZE: 6,
      MSG_ERROR: 7,
      MSG_RESULTS: 8,
      MSG_LOGOUT: 9,
      MSG_WAITING: 10,
      MSG_EXTENDED_LOGIN: 11
    },
    /** @enum {number} */
    TestState: {
      LOGIN_SENT: 0,
      WAIT_FOR_TEST_IDS: 1,
    },
    /** @enum {string} */
    SrvQueueMessages: {
      SRV_QUEUE_TEST_STARTS_NOW:  '0',
      SRV_QUEUE_SERVER_FAULT: '9977',
      SRV_QUEUE_SERVER_BUSY: '9987',
      SRV_QUEUE_HEARTBEAT: '9990',
      SRV_QUEUE_SERVER_BUSY_60S: '9999',
    },
    MESSAGE_NAME: ['COMM_FAILURE', 'SRV_QUEUE', 'MSG_LOGIN', 'TEST_PREPARE',
        'TEST_START', 'TEST_MSG', 'TEST_FINALIZE', 'MSG_ERROR', 'MSG_RESULTS',
        'MSG_LOGOUT', 'MSG_WAITING', 'MSG_EXTENDED_LOGIN']
  };
  this.settings = {
    metaInformation: {
      'client.application': String('NDTjs')
    }
  };
  this.results = {
    c2sRate: undefined,
    s2cRate: undefined
  };

  this.settings.serverAddress = String(serverAddress);
  this.settings.serverPort = (serverPort !== undefined) ? Number(serverPort) :
      defaultSettings.serverPort;
  this.settings.serverPath = (serverPath !== undefined) ? String(serverPath) :
      defaultSettings.serverPath;
  this.settings.verboseDebug = (verboseDebug !== undefined &&
      verboseDebug instanceof Boolean) ? verboseDebug :
      defaultSettings.verboseDebug;

  this.logger('Initialized NDTjs with the following settings: ' +
      JSON.stringify(this.settings));

  if (!this.checkEnvironmentSupport()) {
    this.logger('Browser or runtime environment does not support WebSockets');
    throw new Error('UnsupportedBrowser');
  }
};

/**
 * Log a message to the console if debugging is enabled.
 *
 * @param {String} logMessage - The message to log.
 */

NDTjs.prototype.logger = function(logMessage) {

  if (this.settings.verboseDebug) {
    console.log(logMessage);
  }
};

/**
 * Check that the environment supports the NDT test.
 *
 * @returns {Boolean} Browser supports necessary functions for test client.
 */

NDTjs.prototype.checkEnvironmentSupport = function() {

  if (WebSocket === undefined && window.WebSocket === undefined &&
      window.MozWebSocket === undefined) {
    return false;
  }
  return true;
};

/**
 * A generic login creation system for NDT.
 *
 * @param {Number} desiredTests The types of tests requested from the server
 *  signaled based on a bitwise operation of the test ids.
 * @returns {Uint8Array} An array of bytes suitable for sending on a binary
 *  websocket.
 */

NDTjs.prototype.makeNDTLogin = function(desiredTests) {
  var messageBody = '{ "msg": "' + this.constants.NDT_SERVER_VERSION + '", ' +
      '"tests": "' + String(desiredTests | 16) + '" }';

  return this.makeNDTMessageArray(this.constants.MessageType.MSG_EXTENDED_LOGIN,
      messageBody);
};

/**
 * A generic message creation system for NDT.
 *
 * @param {Number} messageType The type of message according to NDT's
 *  specification.
 * @param {String} messageContent The message to send the server.
 * @returns {Uint8Array} An array of bytes suitable for sending on a binary
 *  websocket.
 */

NDTjs.prototype.makeNDTMessage = function(messageType, messageContent) {
   var messageBody = '{ "msg": "' + messageContent + '" }';

   return this.makeNDTMessageArray(messageType, messageBody);
 };

/**
 * A helper function to consistently build Uint8Arrays for NDT messaging
 *
 * @param {Number} messageType The type of message according to NDT's
 *  specification.
 * @param {String} messageBody The String-encoded JSON message.
 * @returns {Uint8Array} An array of bytes suitable for sending on a binary
 *  websocket.
 */

NDTjs.prototype.makeNDTMessageArray = function(messageType, messageBody) {
  var NDTMessage;
  var i;

  NDTMessage = new Uint8Array(messageBody.length + 3);
  NDTMessage[0] = messageType;
  NDTMessage[1] = (messageBody.length >> 8) & 0xFF;
  NDTMessage[2] = messageBody.length & 0xFF;

  for (i = 0; i < messageBody.length; i += 1) {
    NDTMessage[i + 3] = messageBody.charCodeAt(i);
  }
  return NDTMessage;
};

/**
 * Parses messages received from the NDT server.
 *
 * @param {Buffer} passedBuffer Raw message received from the NDT server.
 * @returns {Object} Parsed messaged with type and message properties.
 */

NDTjs.prototype.parseNDTMessage = function(passedBuffer) {
  var i;
  var bufferUint8;
  var bufferJSON;
  var NDTMessage = {
    'type': undefined,
    'message': undefined,
  };
  try {
    bufferUint8 = new Uint8Array(passedBuffer);
    bufferJSON = JSON.parse(String.fromCharCode.apply(null,
        new Uint8Array(passedBuffer.slice(3))));
  } catch (caughtError) {
    this.logger('Caught exception: ' + caughtError);
    throw new Error('NDTMessageParserError');
  }

  if ((bufferUint8.length - 3) !== ((bufferUint8[1] << 8) | bufferUint8[2])) {
    throw new Error('InvalidLengthError');
  }

  NDTMessage.type = Number(bufferUint8[0]);
  if (!this.constants.MESSAGE_NAME[NDTMessage.type]) {
    throw new Error('UnknownNDTMessageType');
  }
  if (bufferJSON.msg) {
    NDTMessage.message = bufferJSON.msg;
  }
  return NDTMessage;
};

/**
 * A simple helper function to create a WebSocket consistently.
 *
 * @param {String} serverAddress The FQDN or IP of the NDT server.
 * @param {Number} serverPort The port expected for the NDT test.
 * @param {String} serverPath The path of the resource to request from NDT.
 * @param {String} websocketProtocol The WebSocket protocol to build for.
 * @returns {WebSocket} The WebSocket we created;
 */

NDTjs.prototype.createWebSocket = function(serverAddress, serverPort,
                                           serverPath, websocketProtocol) {
  var createdWebSocket;
  createdWebSocket = new WebSocket('ws://' + serverAddress + ':' +
      String(serverPort) + serverPath, websocketProtocol);
  createdWebSocket.binaryType = 'arraybuffer';
  return createdWebSocket;
};

/**
 * Start a series of NDT tests.
 **/

NDTjs.prototype.startTest = function() {
  var ndtControlSocket;
  var ndtState;
  var remainingTests = [];
  var that = this;

  ndtControlSocket = this.createWebSocket(this.settings.serverAddress,
                                          this.settings.serverPort,
                                          this.settings.serverPath,
                                          'ndt');
  this.logger('Test started.  Waiting for connection to server...');

  ndtControlSocket.onopen = function() {
    // When the NDT control socket is opened, send a message requesting the
    // series of tests set in the NDT_DESIRED_TESTS constant.
    that.logger('Opened connection on port ' + that.settings.serverPort);
    ndtControlSocket.send(that.makeNDTLogin(that.constants.NDT_DESIRED_TESTS));
    ndtState = that.constant.TestState.LOGIN_SENT;
  };

  ndtControlSocket.onmessage = function(response) {
    var parsedMessage = that.parseNDTMessage(response.data);
    var testInProgress = false;
    var parsedTestIds;

    that.logger('type = ' + parsedMessage.type + ' (' +
                that.constants.MESSAGE_NAME[parsedMessage.type] + ') body = "' +
                parsedMessage.message + '"');

    if (!testInProgress && remainingTests.length > 0) {
      testInProgress = true;
      that.logger('Calling subtest');
      if (remainingTests.pop()(parsedMessage) === 'DONE') {
        testInProgress = false;
        that.logger('Completed subtest');
      } else {
        throw new Error('SubTestFailure');
      }
      return;
    }
    if (ndtState === that.constant.TestState.LOGIN_SENT) {
      // If the client does not receive MSG_LOGIN from the server in response
      // to NDT_LOGIN, it should receive SRV_QUEUE messages until the
      // server sends SRV_QUEUE_TEST_STARTS_NOW.
      if (parsedMessage.type === that.constants.MessageType.SRV_QUEUE) {
        if (parsedMessage.message ===
            that.constants.SrvQueueMessages.SRV_QUEUE_TEST_STARTS_NOW) {
          that.logger('The test session will start now');
        } else if (parsedMessage.message ===
            that.constants.SrvQueueMessages.SRV_QUEUE_HEARTBEAT) {
          ndtControlSocket.send(that.makeNDTMessage(
              that.constants.MessageType.MSG_WAITING, ''));
        } else if (parsedMessage.message ===
            that.constants.SrvQueueMessages.SRV_QUEUE_SERVER_FAULT) {
          throw new Error('SrvQueueServerFault');
        } else if (parsedMessage.message ===
            that.constants.SrvQueueMessages.SRV_QUEUE_SERVER_BUSY) {
          throw new Error('SrvQueueServerBusy');
        } else if (parsedMessage.message ===
            that.constants.SrvQueueMessages.SRV_QUEUE_SERVER_BUSY_60S) {
          that.logger('Received wait notice: server estimates 1 minute ' +
              'before the test will begin');
        } else {
          that.logger('Received wait notice: server estimates %d minutes ' +
              'before the test will begin', parsedMessage.message);
        }
        that.logger('Recieved SRV_QUEUE. Ignoring and waiting for MSG_LOGIN');
      } else if (parsedMessage.type === that.constants.MessageType.MSG_LOGIN) {
        // Currently any client capable of connecting through WebSocket
        // is compatible with the JavaScript client, so we check that we have
        // received the correct message (a server version), but we do not do
        // any further validation.
        if (parsedMessage.message[0] !== 'v') {
          throw new Error('BadMessage');
        }
        ndtState = that.constant.TestState.WAIT_FOR_TEST_IDS;
      } else {
        that.logger('Bad type %s when we wanted a SRV_QUEUE or MSG_LOGIN',
            that.constants.MESSAGE_NAME[parsedMessage.type]);
        throw Error('UnexpectedStateTransition');
      }
    } else if (ndtState === that.constant.TestState.WAIT_FOR_TEST_IDS &&
        parsedMessage.type === that.constants.MessageType.MSG_LOGIN) {
      parsedTestIds = parsedMessage.message.split(' ');

      // Tests that are supported by this client. NDT spec requires that if we
      // receive a test id that we do not support, we terminate the connection.
      parsedTestIds.foreach(function(testID) {
        if (!(testID in that.constants.SUPPORTED_TEST_IDS)) {
          throw Error('ReceivedUnsupportedTest');
        }
      });

      if (that.constants.SupportedTestIDs.TEST_C2S in parsedTestIds) {
        remainingTests.push(that.testC2S());
      }
      if (that.constants.SupportedTestIDs.TEST_S2C in parsedTestIds) {
        remainingTests.push(that.testS2C(ndtControlSocket));
      }
      if (that.constants.SupportedTestIDs.TEST_META in parsedTestIds) {
        remainingTests.push(that.testMeta(ndtControlSocket));
      }

      ndtState = that.constant.TestState.WAIT_FOR_MSG_RESULTS;
    } else if (ndtState === that.constant.TestState.WAIT_FOR_MSG_RESULTS &&
        parsedMessage.type === that.constants.MessageType.MSG_RESULTS) {
      // [To Complete] Receive Test Results.
    } else if (ndtState === that.constant.TestState.WAIT_FOR_MSG_RESULTS &&
        parsedMessage.type === that.constants.MessageType.MSG_LOGOUT) {
      // Finished, close down.
      ndtControlSocket.close();
      return;
    } else {
      throw Error('UnexpectedStateTransition');
    }
  };

  ndtControlSocket.onerror = function(response) {
    var errorMessage = that.parseNDTMessage(response.data);
    that.logger('Received fatal testing error ' + errorMessage.message);
    throw new Error('ConnectionException');
  };
};

NDTjs.prototype.testS2C = function() {
  return function(ndtMessage) {
    // [To Complete] S2C Test Functionality
  };
};

NDTjs.prototype.testC2S = function(ndtControlSocket) {
  return function(ndtMessage) {
    // [To Complete] C2S Test Functionality
  };
};

NDTjs.prototype.testMeta = function(ndtControlSocket) {
  return function(ndtMessage) {
    // [To Complete] Meta Test Functionality
  };
};
