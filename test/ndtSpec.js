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
