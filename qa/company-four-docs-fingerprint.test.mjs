// 로블록스 조직의 원본 4개 중앙문서에 대한 실제 Git Blob 지문 고정 검사.
// 이 검사는 소스·런타임·출시 QA의 대체물이 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const originals=[["company-learning/platform-release-roadmap.json","54a08d0f2c3a74141fa0c9567ea77bcb1d4daa18"],["company-learning/company-log-map.json","070c19f8ea5a4688db4bcd4a18a1c1f271835887"],["company-learning/company-architecture-map.json","8c2ca717331cb9307c2f21b2b3660c0b63872def"],["company-learning/security-immune-system.json","ed60816da984e52fb4ae16b0836e14ca002bfeb4"]];
test('Roblox own four retained policy documents match exact approved source blobs',()=>{
  for(const [file,expectedBlob] of originals){
    const raw=fs.readFileSync(file),source=raw.toString('utf8');
    const actualBlob=crypto.createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
    assert.equal(actualBlob,expectedBlob,file+' changed without a new approved pin');
    const doc=JSON.parse(source);
    assert.ok(Number.isInteger(doc.version)&&doc.version>0);
    if(file!==originals[0][0])assert.ok([...source].length<1000,file+' compact summary exceeds limit');
  }
  const roadmap=JSON.parse(fs.readFileSync(originals[0][0],'utf8'));
  const architecture=JSON.parse(fs.readFileSync(originals[2][0],'utf8'));
  assert.equal(roadmap.developmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  for(const platform of ['WEB','UNITY','FORTNITE_UEFN','UNITY_WEB','UNITY_ANDROID'])
    assert.equal(roadmap.developmentAccess[platform],'OWNER_HOLD');
  assert.equal(architecture.repository?.fullName,'jaewoon-roblox/games');
  assert.equal(architecture.repository?.vibeExecution,'OWN_REPOSITORY_ONLY');
});
