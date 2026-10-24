// 기존 worker 컨텍스트 원본 경로를 복구한다. 검증은 무결성에 한정한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSharedWorkerContext,compileOwnerCanonicalConstitution,RETAINED_DOCUMENTS} from '../tools/company-shared-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fixture(fn){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-verified-context-'));
  try{
    for(const [,relative] of RETAINED_DOCUMENTS){
      const dest=path.join(tmp,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.copyFileSync(path.join(root,relative),dest);
    }
    return fn(tmp);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
test('Roblox original shared-worker four document integration is integrity-only',()=>{
  assert.equal(RETAINED_DOCUMENTS.length,4);
  const check=validateSharedWorkerContext({root});
  assert.equal(check.pass,true);
  assert.equal(check.scope,'ROBLOX_CANONICAL_FOUR_DOCUMENT_INTEGRITY_ONLY');
  assert.equal(check.policyAuthorityVerified,false);
  assert.equal(check.sourceWriteAuthorized,false);
  assert.equal(check.releaseAuthorized,false);
  assert.equal(check.hashes.directiveSha256,check.hashes.policySha256);
});
test('missing, corrupted, oversize or stale retained policy input fails closed',()=>{
  fixture(tmp=>{
    fs.unlinkSync(path.join(tmp,RETAINED_DOCUMENTS[1][1]));
    assert.throws(()=>validateSharedWorkerContext({root:tmp}),/LOG_DOCUMENT_MISSING_OR_INVALID/);
  });
  fixture(tmp=>{
    fs.writeFileSync(path.join(tmp,RETAINED_DOCUMENTS[0][1]),'{broken');
    assert.throws(()=>validateSharedWorkerContext({root:tmp}),/POLICY_DOCUMENT_MISSING_OR_INVALID/);
  });
  fixture(tmp=>{
    fs.appendFileSync(path.join(tmp,RETAINED_DOCUMENTS[2][1]),' '.repeat(1100));
    assert.throws(()=>validateSharedWorkerContext({root:tmp}),/ARCHITECTURE_DOCUMENT_TOO_LARGE/);
  });
  fixture(tmp=>{
    assert.throws(()=>validateSharedWorkerContext({root:tmp,expectedSecuritySha256:'0'.repeat(64)}),/SECURITY_SHA_MISMATCH/);
  });
});
test('unverified or incomplete constitutional rules never authorize a write',()=>{
  const result=compileOwnerCanonicalConstitution({});
  assert.equal(result.valid,false);
  const status=validateSharedWorkerContext({root});
  assert.equal(status.sourceWriteAuthorized,false);
  assert.equal(status.releaseAuthorized,false);
});
