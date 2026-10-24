/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const ts = require('typescript')
const axios = require('axios')

const filename = path.resolve(__dirname, '../src/common/requestAuthorization.js')
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText
const loaded = { exports: {} }
vm.runInNewContext(source, { exports: loaded.exports, require, URL }, { filename })
const { setApiAuthorization } = loaded.exports

async function main() {
  const client = axios.create({
    baseURL: 'api/v5',
    adapter: async (config) => ({ config, status: 200, data: null, headers: {} }),
  })
  client.interceptors.request.use((config) =>
    setApiAuthorization(config, 'test-token', 'api/v5', 'https://broker.example/'),
  )
  const requests = [
    [{ url: '/nodes' }, true],
    [{ url: 'nodes' }, true],
    [{ url: 'https://broker.example/api/v5/nodes' }, true],
    [{ url: 'https://attacker.example/api/v5/nodes' }, false],
    [{ url: '//attacker.example/api/v5/nodes' }, false],
    [{ url: '/api/v5/nodes', baseURL: 'https://attacker.example/' }, false],
    [{ url: 'http://broker.example/api/v5/nodes' }, false],
    [{ url: 'version', baseURL: '' }, false],
    [{ url: 'https://broker.example/api/v50/nodes' }, false],
    [{ url: '../admin' }, false],
    [{ url: '%2e%2e/admin' }, false],
  ]
  for (const [request, authorized] of requests) {
    const { config } = await client.request({
      ...request,
      headers: { authorization: 'stale-secret', 'X-Request-ID': 'preserved' },
    })
    assert.strictEqual(
      config.headers.get('Authorization'),
      authorized ? 'Bearer test-token' : undefined,
      JSON.stringify(request),
    )
    assert.strictEqual(config.headers.get('X-Request-ID'), 'preserved')
  }
  const config = { url: 'nodes', baseURL: 'api/v5' }
  setApiAuthorization(config, '', 'api/v5', 'https://broker.example/')
  assert.strictEqual(config.headers.get('Authorization'), undefined)
  assert.strictEqual(require('vue-i18n/package.json').version, '9.14.5')
  assert.strictEqual(require('axios/package.json').version, '1.20.0')
  console.log('PASS API authorization: origins, paths, redirects in paths, headers and dependency pins')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
