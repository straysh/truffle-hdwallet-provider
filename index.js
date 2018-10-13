const ProviderEngine = require("web3-provider-engine");
const FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js');
const NonceSubProvider = require('web3-provider-engine/subproviders/nonce-tracker.js');
const HookedSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js');
const ProviderSubprovider = require("web3-provider-engine/subproviders/provider.js");
const Web3 = require("web3");
const Transaction = require('ethereumjs-tx');
const CryptoJS = require('crypto-js');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

function privateKeyToAccount(priv){
  let keyPair = ec.genKeyPair();
  keyPair._importPrivate(priv, 'hex');
  let compact = false;
  let pubKey = keyPair.getPublic(compact, 'hex').slice(2);
  let pubKeyWordArray = CryptoJS.enc.Hex.parse(pubKey);
  let hash = CryptoJS.SHA3(pubKeyWordArray, { outputLength: 256 });
  let address = hash.toString(CryptoJS.enc.Hex).slice(24);

  return {privateKey: priv, address};
}

// This line shares nonce state across multiple provider instances. Necessary
// because within truffle the wallet is repeatedly newed if it's declared in the config within a
// function, resetting nonce from tx to tx. An instance can opt out
// of this behavior by passing `shareNonce=false` to the constructor.
// See issue #65 for more
////////////////////////////////////
//
//  provider By privateKey
///////////////////////////////////
const singletonNonceSubProvider = new NonceSubProvider();

function HDWalletProvider(
  privkey,
  provider_url,
  shareNonce=true
) {

  const web3 = new Web3();
  const self = this;
  let account = privateKeyToAccount(privkey);
  this.address = account.address;
  this.privkey = privkey;

  this.engine = new ProviderEngine();
  this.engine.addProvider(new HookedSubprovider({
    getAccounts: function(cb) { cb(null, [self.address]) },
    getPrivateKey: function(address, cb) {
      if (!self.address) { return cb('Account not found'); }
      else { cb(null, self.privkey); }
    },
    signTransaction: function(txParams, cb) {
      let pkey;
      if(txParams.from !== self.address) { cb('Account not found'); }
      let tx = new Transaction(txParams);
      tx.sign(self.privkey);
      let rawTx = '0x' + tx.serialize().toString('hex');
      cb(null, rawTx);
    }
  }));

  (!shareNonce)
    ? this.engine.addProvider(new NonceSubProvider())
    : this.engine.addProvider(singletonNonceSubProvider);

  this.engine.addProvider(new FiltersSubprovider());
  this.engine.addProvider(new ProviderSubprovider(new Web3.providers.HttpProvider(provider_url)));
  this.engine.start(); // Required by the provider engine.
}

HDWalletProvider.prototype.sendAsync = function() {
  this.engine.sendAsync.apply(this.engine, arguments);
};

HDWalletProvider.prototype.send = function() {
  return this.engine.send.apply(this.engine, arguments);
};

// returns the address of the given address_index, first checking the cache
HDWalletProvider.prototype.getAddress = function(idx) {
  console.log('getting addresses', this.address, idx)
  return this.address;
}

// returns the addresses cache
HDWalletProvider.prototype.getAddresses = function() {
  return [this.address];
}

module.exports = HDWalletProvider;
