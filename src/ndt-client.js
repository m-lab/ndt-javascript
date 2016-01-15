/*
 * @ndt-client.js
 * A WebSocket client for the Network Diagnostic Tool (NDT)
 *
 * This is an NDT client, written in javascript.  It speaks the WebSocket
 * version of the NDT protocol.  The NDT protocol is documented at:
 * https://code.google.com/p/ndt/wiki/NDTProtocol
 */

/* jslint bitwise: true, browser: true, nomen: true, indent: 2, -W097 */
/* global Uint8Array, Blob, WebSocket */

'use strict';

var NDTjs = function (serverAddress, serverPort, serverPath, updateInterval,
    verboseDebug) {

  this.constants = {
    /*
     * Send 1MiB websocket messages, as this seems to cause Chrome to have the
     * fewest performance problems.  It is important that this number be a
     * multiple of 8192, as the NDT protocol asks that we send 8192 bytes at a
     * time.  We can't force websocket implementations to hold to that (RFC6455
     * sec. 5.4 makes explicit that websocket clients may fragment messages in
     * any way they want), but we should at least make it possible for them to
     * send multiples of 8192 bytes.
     */
    SEND_BUFFER_SIZE: 8192 * 128
  };

  this.settings = {
    serverAddress: undefined,
    serverPort: 3001,
    serverPath: '/ndt_protocol',
    updateInterval: 0,
    metaInformation: {
      'client.application': 'NDTjs'
    },
    verboseDebug: false
  };

  this.results = {
    c2sRate: undefined,
    s2cRate: undefined
  };

  this.settings.serverAddress = String(serverAddress);
  this.settings.serverPort = (serverPort !== undefined) ? Number(serverPort) :
      this.settings.serverPort;
  this.settings.serverPath = (serverPath !== undefined) ? String(serverPath) :
      this.settings.serverPath;
  this.settings.updateInterval = (updateInterval !== undefined) ?
      Number(updateInterval) : this.settings.updateInterval;
  this.settings.verboseDebug = (verboseDebug !== undefined &&
      verboseDebug instanceof Boolean) ? verboseDebug :
      this.settings.verboseDebug;
};
