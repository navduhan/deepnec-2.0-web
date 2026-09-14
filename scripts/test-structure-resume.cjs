/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness for isolated server mocks. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/lib/structure.ts', 'utf8'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, esModuleInterop:true},
}).outputText;
let project = null, submissions = 0, failed = false, state = 'RUNNING', rateChecks = 0;
const context = {exports:{}, Buffer, AbortSignal, setTimeout, require: name =>
  name === './config' ? {PREDICTION_CONFIG:{structure:{swissModelToken:'test'}}} : require(name),
  fetch: async url => {
    if(url.endsWith('/automodel')) { submissions++; return {ok:true,json:async()=>({project_id:'saved-project'})}; }
    if(url.includes('/models/summary/')) return {ok:true,json:async()=>({status:state,models:[{coordinates_url:'https://example.test/model.pdb'}]})};
    return {ok:true,arrayBuffer:async()=>Buffer.from('ATOM model coordinates')};
  },
};
vm.runInNewContext(code, context);
const remote = {beforeEsm:()=>{},load:async()=>project,save:async id=>{project=id;},failed:async()=>{failed=true;},beforeSubmit:()=>{rateChecks++;}};
(async()=>{
  for(let i=0;i<65;i++) await assert.rejects(context.exports.predictTertiary('A'.repeat(450), remote), context.exports.StructurePending);
  assert.equal(submissions,1); assert.equal(rateChecks,1); assert.equal(project,'saved-project');
  state='COMPLETED';
  const result=await context.exports.predictTertiary('A'.repeat(450),remote);
  assert.equal(result.pdb,'ATOM model coordinates'); assert.equal(submissions,1);
  state='FAILED';
  await assert.rejects(context.exports.predictTertiary('A'.repeat(450),remote), /prediction failed/);
  assert.equal(failed,true); assert.equal(submissions,1);
  console.log('PASS: 65 pending checks, one submission, saved-project reuse, coordinates, explicit failure.');
})().catch(error=>{console.error(error);process.exitCode=1;});
