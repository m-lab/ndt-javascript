describe('tests for initialization functions', function() {
  'use strict';

  it('should properly instantiate server information and defaults', function() {
    var ndtClientObject = new NDTjs('test.address.measurement-lab.org');
    var defaultSettings = {
          serverPort: Number(3001),
          serverPath: String('/ndt_protocol'),
          verboseDebug: Boolean(true)
        };

    expect(ndtClientObject.serverAddress, 'test.address.measurement-lab.org');
    expect(ndtClientObject.serverPort, defaultSettings.serverPort);
    expect(ndtClientObject.serverPath, defaultSettings.serverPath);
    expect(ndtClientObject.verboseDebug, defaultSettings.verboseDebug);
  });

  it('should properly instantiate all passed information', function() {
    var ndtClientObject = new NDTjs('test.address.measurement-lab.org',
                                    3010,
                                    '/ndt_protocol_alternative',
                                    false);

    expect(ndtClientObject.serverAddress, 'test.address.measurement-lab.org');
    expect(ndtClientObject.serverPort, 3010);
    expect(ndtClientObject.serverPath, '/ndt_protocol_alternative');
    expect(ndtClientObject.verboseDebug, false);
  });
});

describe('tests that browser support checks work', function() {
  'use strict';

  var defaultWebSocket = window.WebSocket;
  var defaultMozWebSocket = window.MozWebSocket;

  afterEach(function() {
    window.WebSocket = defaultWebSocket;
    window.MozWebSocket = defaultMozWebSocket;
  });

  it('checkEnvironmentSupport returns false without WebSockets', function() {
    var WebSocket;
    var ndtClientObject = new NDTjs('test.address.measurement-lab.org');

    window.WebSocket = undefined;
    window.MozWebSocket = undefined;

    expect(ndtClientObject.checkEnvironmentSupport()).toEqual(false);
  });

  it('ndtClientObject throws Error without browser support', function() {
    var WebSocket;

    window.WebSocket = undefined;
    window.MozWebSocket = undefined;

    expect(function() { new NDTjs('test.address.measurement-lab.org'); })
        .toThrow(new Error('UnsupportedBrowser'));
  });
});

describe('tests for WebSockets functions', function() {
  beforeEach(function() {
    spyOn(window, 'WebSocket').and.callFake(function(url) {
      socketMock = {
        url: url,
        readyState: WebSocket.CONNECTING,
        send: jasmine.createSpy(),
        close: jasmine.createSpy().and.callFake(function() {
          socketMock.readyState = WebSocket.CLOSING;
        }),

        // methods to mock the internal behaviour of the real WebSocket
        _open: function() {
          socketMock.readyState = WebSocket.OPEN;
          // socketMock.onopen && socketMock.onopen();
        },
        _message: function(msg) {
          // socketMock.onmessage && socketMock.onmessage({data: msg});
        },
        _error: function() {
          socketMock.readyState = WebSocket.CLOSED;
          // socketMock.onerror && socketMock.onerror();
        },
        _close: function() {
          socketMock.readyState = WebSocket.CLOSED;
          // socketMock.onclose && socketMock.onclose();
        }
      };
      return socketMock;
    });
  });

  it('ndtClientObject creates WebSocket which connects to address', function() {
    var ndtServerAddress = 'test.address.measurement-lab.org';
    var ndtClientObject = new NDTjs(ndtServerAddress);
    var ndtExpectedPath = 'ws://' + ndtServerAddress + ':' +
        ndtClientObject.settings.serverPort +
        ndtClientObject.settings.serverPath;
    ndtClientObject.createWebSocket(ndtClientObject.settings.serverAddress,
                                    ndtClientObject.settings.serverPort,
                                    ndtClientObject.settings.serverPath,
                                    'unitTest');
    expect(window.WebSocket).toHaveBeenCalledWith(ndtExpectedPath, 'unitTest');
  });
});
