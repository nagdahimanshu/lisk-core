const { getFixtureUser, from } = require('../../utils');
const { config } = require('../../fixtures');

const I = actor();
const appConfig = config();
const { forging: { defaultPassword, delegates: [{ publicKey }] } } = appConfig;
let nodes;

Given('The node is forging', async () => {
  nodes = await I.getForgingDelegateNode(publicKey);

  expect(nodes).to.have.lengthOf(1);
});

When('I disable forging the node should stop forging', async () => {
  const api = await I.call();
  const params = {
    "forging": false,
    "password": defaultPassword,
    "publicKey": publicKey,
  };

  const { result, error } = await from(api.updateForgingStatus(params, nodes[0]));

  expect(error).to.be.null;
  expect(result.data[0].forging).to.deep.equal(false);
});

Given('The node is not forging', async () => {
  const api = await I.call();

  const { result, error } = await from(api.getForgingStatus({ publicKey, }, nodes[0]));

  expect(error).to.be.null;
  expect(result.data[0].forging).to.deep.equal(false);

});

When('I enable forging the node should start forging', async () => {
  const api = await I.call();

  const params = {
    "forging": true,
    "password": defaultPassword,
    "publicKey": publicKey,
  };

  const { result, error } = await from(api.updateForgingStatus(params, nodes[0]));

  expect(error).to.be.null;
  expect(result.data[0].forging).to.deep.equal(true);
});
