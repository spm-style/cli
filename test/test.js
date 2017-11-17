let Assert = require('assert');
describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      Assert.equal(-1, [1,2,3].indexOf(4));
    });
    it('should return the correct index otherwise', function() {
      Assert.equal(2, [1,2,3].indexOf(3));
    });
  });
});