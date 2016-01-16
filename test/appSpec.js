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
