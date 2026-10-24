/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const ts = require('typescript')

const filename = process.argv[2] || path.resolve(__dirname, '../src/hooks/Rule/useDataHandler.ts')
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText
const loaded = { exports: {} }
vm.runInNewContext(
  source,
  {
    exports: loaded.exports,
    require(id) {
      // These dependencies are unrelated to copying; keep the real data handlers and lodash.
      if (id === '@/common/tools') {
        return { checkNOmitFromObj: (value) => value }
      }
      if (id === '@/hooks/useSSL') {
        return { default: () => ({ handleSSLDataBeforeSubmit: (value) => value }) }
      }
      return require(id)
    },
  },
  { filename },
)
const { useConnectorDataHandler } = loaded.exports
const handlers = useConnectorDataHandler()
const json = (value) => JSON.parse(JSON.stringify(value))

const original = {
  id: 'kafka_producer:original',
  type: 'kafka_producer',
  name: 'original',
  enable: false,
  password: '******',
  parameters: { password: '******', topic: 'events' },
  authentication: { mechanism: 'scram_sha_512', username: 'test-user', password: '******' },
}
const snapshot = json(original)
const copy = handlers.handleConnectorDataForCopy(original)
assert.deepStrictEqual(json(original), snapshot, 'Copying must not modify the original connector')
assert.strictEqual(copy.password, '')
assert.strictEqual(copy.parameters.password, '')
assert.strictEqual(copy.authentication.password, '')
assert.strictEqual(copy.authentication.username, 'test-user')
assert.strictEqual(copy.authentication.mechanism, 'scram_sha_512')
assert.strictEqual(copy.parameters.topic, 'events')
assert.strictEqual(copy.id, undefined)
assert.strictEqual(copy.enable, undefined)

const { get } = require('lodash')
assert(
  handlers.likePasswordFieldKeys.some(
    (key) => get(original, key) === original.authentication.password,
  ),
)
const authOnly = { authentication: { password: '******' } }
assert(
  handlers.likePasswordFieldKeys.some((key) => get(authOnly, key) === '******'),
  'Save-as-copy validation must detect a masked SASL password',
)
assert.deepStrictEqual(json(handlers.handleConnectorDataForCopy({ authentication: 'none' })), {
  authentication: 'none',
})
console.log('PASS connector copy: nested secrets cleared, original preserved, save-as-copy guarded')
