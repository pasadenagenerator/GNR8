import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRetainedFunctions} from './retained-functions';

test('retained functions allow sites without forms while contact still requires explicit confirmation',()=>{
  assert.deepEqual(parseRetainedFunctions({kind:'retained-functions-v1'}),{kind:'retained-functions-v1'});
  const contact={recipient:'office@example.com',recipientConfirmed:true};
  assert.deepEqual(parseRetainedFunctions({kind:'retained-functions-v1',contact}),{kind:'retained-functions-v1',contact});
  assert.equal(parseRetainedFunctions({kind:'retained-functions-v1',contact:{...contact,recipientConfirmed:false}}),null);
  assert.equal(parseRetainedFunctions({kind:'retained-functions-v1',contact:{recipient:'office@example.com'}}),null);
  assert.equal(parseRetainedFunctions({kind:'retained-functions-v1',contact:null}),null);
});
