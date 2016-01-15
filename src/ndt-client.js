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

var NDTjs = {};

NDTjs.constants = {
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

NDTjs.settings = {
  serverAddress: undefined,
  serverPort: 3001,
  serverPath: '/ndt_protocol',
  updateInterval: 0,
  metaInformation: {
    'client.application': 'NDTjs'
  },
  verboseDebug: false
};

NDTjs.results = {
  c2sRate: undefined,
  s2cRate: undefined
};

NDTjs.init = function(serverAddress, serverPort, serverPath, updateInterval,
    verboseDebug) {

  if (serverPort !== undefined) {
    this.settings.serverPort = Number(serverPort);
  }
  if (serverPath !== undefined) {
    this.settings.serverPath = String(serverPath);
  }
  if (updateInterval !== undefined) {
    this.settings.updateInterval = Number(updateInterval);
  }
  if (verboseDebug !== undefined && verboseDebug instanceof Boolean) {
    this.settings.verboseDebug = verboseDebug;
  }
};
