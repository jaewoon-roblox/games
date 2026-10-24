// Retained four-document compatibility. Integrity is not policy authority.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

// 파일명: tools/company-shared-context.mjs
// 메인: 로블록스 자체 정책 정본 4문서 해시 및 fail-closed 검증.
// 무결성 검사 통과는 소스 수정·출시 승인 증거가 아니다.
export const RETAINED_DOCUMENTS = Object.freeze([
  ['policy','company-learning/platform-release-roadmap.json','MACHINE_EXECUTION_CONTRACT','OWNER_DIRECT_LOCKED'],
  ['log','company-learning/company-log-map.json','MACHINE_EXECUTION_LOG_MAP','MINIMAL_RETAINED_SUMMARY_NON_EXECUTABLE'],
  ['architecture','company-learning/company-architecture-map.json','MACHINE_EXECUTION_ARCHITECTURE_MAP','MINIMAL_SUMMARY_NOT_EXECUTION_POLICY'],
  ['security','company-learning/security-immune-system.json','OWNER_DIRECTIVE_2026-09-19','MINIMAL_SUMMARY_NOT_SECURITY_VERIFICATION']
]);
const hash = contents => crypto.createHash('sha256').update(contents).digest('hex');
const error = code => { throw new Error('WORKER_CONTEXT_SYNC_FAILED:' + code); };

function readRetained(root, key, relative, authority, status) {
  let contents, data;
  try {
    contents=fs.readFileSync(path.join(root,relative),'utf8');
    data=JSON.parse(contents);
  } catch { return error(key.toUpperCase()+'_DOCUMENT_MISSING_OR_INVALID'); }
  if(key!=='policy' && [...contents].length >= 1000)
    error(key.toUpperCase()+'_DOCUMENT_TOO_LARGE');
  if(!Number.isInteger(data.version)||data.version<1||
      data.status!==status||data.authority!==authority||
      (data.sourceOfTruth!=null&&data.sourceOfTruth!==relative))
    error(key.toUpperCase()+'_DOCUMENT_CONTRACT_INVALID');
  return {data,sha256:hash(contents),format:key==='policy'?'CANONICAL_MACHINE_POLICY':'MINIMAL_SUMMARY'};
}
export function validateSharedWorkerContext({
  root=process.cwd(),expectedDirectiveSha256,expectedPolicySha256,
  expectedLogSha256,expectedArchitectureSha256,expectedSecuritySha256
}={}) {
  const docs={},hashes={},formats={};
  for(const [key,relative,authority,status] of RETAINED_DOCUMENTS){
    const item=readRetained(root,key,relative,authority,status);
    docs[key]=item.data;
    hashes[key+'Sha256']=item.sha256;
    formats[key]=item.format;
  }
  const {policy,log,architecture,security}=docs;
  if(policy.policySource!=='company-learning/platform-release-roadmap.json'||
      policy.machineSourceOfTruth!=='company-learning/platform-release-roadmap.json'||
      !policy.ownerCanonicalRules||!policy.ownerCanonicalRules.constitutionalBinding||
      policy.developmentAccess?.ROBLOX!=='ALWAYS_ALLOWED'||
      !['WEB','UNITY','FORTNITE_UEFN','UNITY_WEB','UNITY_ANDROID'].every(
        target=>policy.developmentAccess?.[target]==='OWNER_HOLD'))
    error('ROBLOX_CANONICAL_POLICY_CONTRACT_INVALID');
  if(log.requiredForAllWorkers!==false||
      log.retained?.primaryLog!=='GITHUB_ACTIONS_JOB_LOG'||
      log.retained?.unknownOrMissingPolicy!=='FAIL_CLOSED')
    error('LOG_DOCUMENT_CONTRACT_INVALID');
  if(architecture.centralPolicy!==null||
      architecture.repository?.fullName!=='jaewoon-roblox/games'||
      architecture.repository?.developmentPlatform!=='ROBLOX'||
      architecture.repository?.vibeExecution!=='OWN_REPOSITORY_ONLY'||
      architecture.branches?.main?.directGameWorkerWrite!==false||
      architecture.constitutionalEnforcement?.mode!=='FAIL_CLOSED'||
      architecture.release!=='UNVERIFIED_OR_MISSING_POLICY_MUST_NOT_PASS')
    error('ARCHITECTURE_DOCUMENT_CONTRACT_INVALID');
  if(security.policyFile!=='company-learning/security-immune-system.json'||
      security.defaultTrust!=='DENY_OR_QUARANTINE_UNTIL_VERIFIED'||
      security.enforcement?.unverified!=='BLOCK')
    error('SECURITY_DOCUMENT_CONTRACT_INVALID');
  const expected={policy:expectedPolicySha256??expectedDirectiveSha256,
    log:expectedLogSha256,architecture:expectedArchitectureSha256,security:expectedSecuritySha256};
  for(const [key,sha] of Object.entries(expected)){
    if(sha!==undefined&&sha!==hashes[key+'Sha256'])
      error(key.toUpperCase()+'_SHA_MISMATCH');
  }
  // 기존 실행기 입출력 이름을 유지하되 digest의 실체는 동일한 중앙 정책 원본이다.
  hashes.directiveSha256=hashes.policySha256;
  return {
    pass:true,scope:'ROBLOX_CANONICAL_FOUR_DOCUMENT_INTEGRITY_ONLY',
    policyAuthorityVerified:false,sourceWriteAuthorized:false,releaseAuthorized:false,
    canonicalRoadmapPresent:true,hashes,documentFormats:formats,
    documentVersions:Object.fromEntries(RETAINED_DOCUMENTS.map(([key])=>[key,docs[key].version]))
  };
}

// Compile real canonical rules when an actual complete policy document exists.
// This function never synthesizes missing rules or treats four short reference
// documents as owner policy. A missing/invalid policy returns valid:false.
export function compileOwnerCanonicalConstitution(policy={}) {
  const owner=policy?.ownerCanonicalRules;
  const binding=owner?.constitutionalBinding;
  const errors=[];
  if(!owner||typeof owner!=='object'||!binding||typeof binding!=='object'){
    errors.push('CONSTITUTION_AUTHORITY_UNAVAILABLE');
  }
  const entries=owner&&typeof owner==='object'
    ?Object.entries(owner).filter(([key,rule])=>/^rule\d+$/i.test(key)&&rule?.enabled===true)
    :[];
  const entryIds=new Set(),prefixIds=new Set();
  for(const [key,rule] of entries){
    if(typeof rule.id!=='string'||!/^RULE_\d+_/i.test(rule.id)){
      errors.push('INVALID_CANONICAL_RULE_ID:'+key);continue;
    }
    if(entryIds.has(rule.id))errors.push('DUPLICATE_CANONICAL_RULE_ID:'+rule.id);
    entryIds.add(rule.id);
    const prefix=rule.id.match(/^RULE_\d+/i)?.[0];
    if(prefixIds.has(prefix))errors.push('DUPLICATE_CANONICAL_RULE_PREFIX:'+prefix);
    prefixIds.add(prefix);
    if(!rule.machineEnforcement||!Array.isArray(rule.machineEnforcement.assertions)
      ||rule.machineEnforcement.assertions.length===0)
      errors.push('MACHINE_ENFORCEMENT_MISSING:'+rule.id);
  }
  if(entries.length===0)errors.push('CANONICAL_RULE_SET_EMPTY');
  const declaredOrder=Array.isArray(owner?.implementationOrder)?owner.implementationOrder:[];
  const byPrefix=id=>String(id).match(/^RULE_\d+/i)?.[0]||'';
  const rank=new Map(declaredOrder.map((prefix,index)=>[String(prefix),index]));
  const sorted=entries.sort((a,b)=>{
    const ra=rank.get(byPrefix(a[1].id)),rb=rank.get(byPrefix(b[1].id));
    if(ra!==undefined||rb!==undefined)return (ra??Infinity)-(rb??Infinity);
    return Number(a[0].match(/\d+/)?.[0]||0)-Number(b[0].match(/\d+/)?.[0]||0);
  });
  const rules=sorted.map(([key,contract])=>({
    key,id:contract.id,
    number:Number(key.match(/\d+/)?.[0]||0),
    label:contract.label??null,
    authority:contract.authority??null,
    objective:contract.objective??null,
    contract,
    fingerprint:hash(JSON.stringify({key,id:contract.id,contract}))
  }));
  return {
    valid:errors.length===0,
    errors,version:Number(owner?.version)||0,
    authority:owner?.authority||null,
    constitutionalAuthority:owner?.constitutionalAuthority||null,
    binding:binding||{},
    fingerprint:errors.length===0?hash(JSON.stringify({
      version:owner.version,binding,orderedRules:rules.map(x=>({id:x.id,fingerprint:x.fingerprint}))
    })):null,
    orderedRuleIds:rules.map(x=>x.id),
    rules
  };
}

// Compile selected implementation topology from the actual central roadmap.
export function compileCentralArchitectureProjection(policy={}) {
  const canonical='company-learning/platform-release-roadmap.json';
  const documentation=policy?.centralDocumentation;
  const lifecycle=policy?.developmentLifecycleMachine;
  const errors=[];
  if(documentation?.canonicalSet?.policy!==canonical || !lifecycle ||
     typeof lifecycle!=='object') errors.push('CENTRAL_POLICY_SOURCE_UNAVAILABLE');
  const foundation=lifecycle?.nativeGameFoundationValidationStack;
  const requiredLayers=Array.isArray(foundation?.layers)
    ? foundation.layers.filter(layer=>layer?.alwaysRequired===true).map(layer=>layer.id) : [];
  const nativeFoundation=foundation&&typeof foundation==='object' ? {
    version:foundation.version??null,
    status:foundation.status??null,
    ownership:foundation.ownership??null,
    requiredFoundationLayers:requiredLayers,
    testerQaFlow:foundation.testerQaFlow??[],
    releaseGate:foundation.releaseGate??null
  }:null;
  const contract={
    sourceOfTruth:canonical,
    authorityOrder:['OWNER_CANONICAL_RULES','CANONICAL_ROADMAP','EXISTING_GAME_EXECUTION'],
    nativeFoundation,
    implementationOwnership:lifecycle?.primaryAiOrchestration?.internalVibeAiCollaboration?.capabilityGrowthRoleLock??null,
    machineProjectionSynchronization:documentation?.machineProjectionSynchronization??null,
    sharedWorkerContext:lifecycle?.sharedWorkerContext?.compiledArchitectureProjection??null
  };
  return{
    valid:errors.length===0,
    errors,
    fingerprint:errors.length?null:hash(JSON.stringify(contract)),
    contract
  };
}

export function verifyPinnedSharedWorkerContext(options={}) {
  return validateSharedWorkerContext(options);
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {
    const result=validateSharedWorkerContext();
    const output=process.argv.slice(2).find(v=>v.startsWith('--output='));
    if(output) fs.writeFileSync(output.slice('--output='.length),JSON.stringify(result,null,2)+'\n');
    console.log('WORKER_CONTEXT_SCOPE='+result.scope);
    console.log('WORKER_CONTEXT_POLICY_AUTHORITY=UNVERIFIED');
    for(const key of ['policy','log','architecture','security']) {
      console.log('WORKER_CONTEXT_'+key.toUpperCase()+'_SHA256='+result.hashes[key+'Sha256']);
    }
    console.log('WORKER_CONTEXT_SYNC=INTEGRITY_ONLY');
    console.log('WORKER_CONTEXT_MUTATION_AUTHORITY=DENIED');
  } catch(e) {
    console.error('WORKER_CONTEXT_SYNC=FAIL');
    console.error(String(e.message));
    process.exitCode=1;
  }
}
