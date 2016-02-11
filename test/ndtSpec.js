describe('tests ndt message parsing function', function() {
  'use strict';

  var ndtClientObject;
  var buildMessageBuffer = function(messageType, messageBody) {
    var i;
    var messageBodyJSONString = JSON.stringify({msg: messageBody});
    var testBuffer = new ArrayBuffer(messageBodyJSONString.length + 3);
    var testBufferView = new Uint8Array(testBuffer);

    testBufferView[0] = messageType;

    for (i = 0; i < messageBodyJSONString.length; i += 1) {
      testBufferView[i + 3] = messageBodyJSONString.charCodeAt(i);
    }

    testBufferView[1] = (messageBodyJSONString.length >> 8) & 0xFF;
    testBufferView[2] = messageBodyJSONString.length & 0xFF;

    return testBuffer;
  };

  beforeEach(function() {
    ndtClientObject = new NDTjs('test.address.measurement-lab.org');
  });

  it('should properly parse an NDT message', function() {
    var returnedNDTMessage;
    var testBuffer = buildMessageBuffer(1, 'OK');

    returnedNDTMessage = ndtClientObject.parseNDTMessage(testBuffer);
    expect(returnedNDTMessage.type).toEqual(1);
    expect(returnedNDTMessage.message).toBe('OK');
  });

  it('should throw InvalidLengthError on invalid message length', function() {
    var returnedNDTMessage;
    var testBuffer = buildMessageBuffer(1, 'FAIL');
    var testBufferView = new Uint8Array(testBuffer);

    testBufferView[2] = 99;

    expect(function() { ndtClientObject.parseNDTMessage(testBuffer); })
        .toThrow(new Error('InvalidLengthError'));
  });

  it('should error NDTMessageParserError on undefined buffer', function() {
    expect(function() { ndtClientObject.parseNDTMessage(undefined); })
        .toThrow(new Error('NDTMessageParserError'));
  });
});

describe('tests NDT message creation function', function() {
  'use strict';

  var ndtClientObject;
  var compareMessageToParameters = function(NDTMessage, messageType,
      messageBody) {
    var i;

    expect(NDTMessage[0]).toEqual(messageType);
    expect(NDTMessage[1]).toEqual((messageBody.length >> 8) & 0xFF);
    expect(NDTMessage[2]).toEqual(messageBody.length & 0xFF);

    for (i = 0; i < messageBody.length; i += 1) {
      expect(NDTMessage[i + 3]).toEqual(messageBody.charCodeAt(i));
    }

  };

  beforeEach(function() {
    ndtClientObject = new NDTjs('test.address.measurement-lab.org');
  });

  it('should ensure NDT message constants are aligned', function() {
    var i;
    var constants = ndtClientObject.constants;

    for (i = 0; i < constants.MESSAGE_NAME.length; i += 1) {
      expect(constants.messageType[constants.MESSAGE_NAME[i]]).toEqual(i);
    }
  });

  it('should properly make a NDT login message', function() {
    var desiredTests = (2 | 4 | 32);
    var messageBody = '{ "msg": "' +
        ndtClientObject.constants.NDT_SERVER_VERSION + '", "tests": "' +
        String(desiredTests | 16) + '" }';

    compareMessageToParameters(ndtClientObject.makeNDTLogin(desiredTests), 11,
        messageBody);
  });

  it('should properly make a NDT message', function() {
    var desiredType = 99;
    var desiredMessage = 'OKAY';
    var messageBody = '{ "msg": "' + desiredMessage + '" }';

    compareMessageToParameters(ndtClientObject.makeNDTMessage(desiredType,
        desiredMessage), desiredType, messageBody);
  });

});

describe('tests ndt runtime', function() {
  'use strict';

  var ndtClientObject;

  beforeEach(function() {
    ndtClientObject = new NDTjs('test.address.measurement-lab.org');
  });

  it('should properly parse an NDT message', function() {
    ndtClientObject.startTest();
  });
});
