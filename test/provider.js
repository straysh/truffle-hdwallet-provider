const Ganache = require('ganache-core');
const assert = require('assert');
const WalletProvider = require('../index.js');

describe("HD Wallet Provider", function() {
  this.timeout(31000000);
  let Web3 = require('web3');
  let web3 = new Web3();
  let port = 18545;
  let server;
  let provider;

  before(done => {
    server = Ganache.server();
    server.listen(port, done);
  });

  after(done => {
    provider.engine.stop();
    setTimeout(() => server.close(done), 2000); // :/
  })

  it('provides', function(done){
    provider = new WalletProvider(`9ab552a881856e6d1253c4b846c127cfdf90f1cf2e8f8408625e3ca6b111f9df`, `http://localhost:${port}`);
    web3.setProvider(provider);

    web3.eth.getBlockNumber((err, number) => {
      assert(number === 0);
      done();
    });
  })
});

