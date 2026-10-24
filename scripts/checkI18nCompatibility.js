/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>')
global.window = dom.window
global.document = dom.window.document
global.navigator = dom.window.navigator
global.Element = dom.window.Element
global.SVGElement = dom.window.SVGElement
global.Node = dom.window.Node

const { createApp, defineComponent, h, nextTick } = require('vue')
const { createI18n, useI18n } = require('vue-i18n')

async function main() {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/i18n.ts'), 'utf8')
  const legacy = /legacy:\s*(true|false)/.exec(source)?.[1] === 'true'
  const allowComposition = /allowComposition:\s*(true|false)/.exec(source)?.[1] === 'true'
  const i18n = createI18n({
    legacy,
    allowComposition,
    locale: 'en',
    messages: { en: { login: 'Log in' }, zh: { login: 'Login ZH' } },
  })
  const app = createApp(defineComponent({
    setup() {
      const { t } = useI18n()
      return () => h('span', t('login'))
    },
  }))
  app.use(i18n)
  app.mount('#app')
  await nextTick()
  assert.strictEqual(document.querySelector('#app').textContent, 'Log in')
  i18n.global.locale = 'zh'
  await nextTick()
  assert.strictEqual(document.querySelector('#app').textContent, 'Login ZH')
  app.unmount()
  console.log('PASS legacy global API, composition components and locale changes')
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
