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
    testBufferView[1] = 2;
    testBufferView[2] = 3;
    testBufferView[3] = String('O').charCodeAt();
    testBufferView[4] = String('K').charCodeAt();

    returnedNDTMessage = ndtClientObject.parseNDTMessage(testBuffer);
    expect(returnedNDTMessage.type).toEqual([1, 2, 3]);
    expect(returnedNDTMessage.message).toBe('OK');
  });

  it('should error NDTMessageParserError on undefined buffer', function() {
    expect(function() { ndtClientObject.parseNDTMessage(undefined); })
        .toThrow(new Error('NDTMessageParserError'));
  });
});
