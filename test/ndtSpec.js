describe('tests ndt message parsing function', function() {
  'use strict';

  var ndtClientObject;

  beforeEach(function() {
    ndtClientObject = new NDTjs('test.address.measurement-lab.org');
  });

  it('should properly parse an NDT message', function() {
    var returnedNDTMessage;
    var testBuffer = new ArrayBuffer(5);
    var testBufferView = new Uint8Array(testBuffer);

    testBufferView[0] = 1;
    testBufferView[1] = 0;
    testBufferView[2] = 2;
    testBufferView[3] = String('O').charCodeAt();
    testBufferView[4] = String('K').charCodeAt();

    returnedNDTMessage = ndtClientObject.parseNDTMessage(testBuffer);
    expect(returnedNDTMessage.type).toEqual(1);
    expect(returnedNDTMessage.message).toBe('OK');
  });

  it('should throw InvalidLengthError on invalid message length', function() {
    var returnedNDTMessage;
    var testBuffer = new ArrayBuffer(5);
    var testBufferView = new Uint8Array(testBuffer);

    testBufferView[0] = 1;
    testBufferView[1] = 1;
    testBufferView[2] = 9;
    testBufferView[3] = String('F').charCodeAt();
    testBufferView[4] = String('A').charCodeAt();
    testBufferView[4] = String('I').charCodeAt();
    testBufferView[4] = String('L').charCodeAt();

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

  it('should properly make a NDT login message', function() {
    var desiredTests = (2 | 4 | 32);
    var messageBody = '{ "msg": "v3.5.5", "tests": "' +
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
