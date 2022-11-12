/*
 * Licensed to the Technische Universität Darmstadt under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The Technische Universität Darmstadt
 * licenses this file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import esbuild from 'esbuild'
import { sassPlugin } from 'esbuild-sass-plugin'
import fs from 'fs-extra'
import sass from 'sass'

const argv = yargs(hideBin(process.argv)).argv

const outbase = 'dist'

const defaults = {
  bundle: true,
  sourcemap: true,
  minify: !argv.live,
  target: 'es2018',
  loader: { '.ts': 'ts' },
  logLevel: 'info',
  plugins: [sassPlugin()]
}

if (argv.live) {
  defaults.watch = {
    onRebuild (error, result) {
      if (error) console.error('watch build failed:', error)
      else console.log('watch build succeeded:', result)
    }
  }
} else {
  fs.emptyDirSync(outbase)
}
fs.mkdirsSync(`${outbase}`)

for (const styleFile of fs.readdirSync('styles')) {
  if (!styleFile.endsWith('.scss') && fs.lstatSync(`styles/${styleFile}`).isDirectory()) {
    continue
  }

  const targetFile = `dist/${styleFile.substring(0, styleFile.length - 5)}.css`
  const result = sass.compile(`styles/${styleFile}`, { style: 'compressed' })
  fs.writeFileSync(targetFile, result.css)
}

esbuild.build(Object.assign({
  entryPoints: ['src/main.ts'],
  outfile: `${outbase}/ApacheAnnotatorEditor.min.js`,
  globalName: 'ApacheAnnotatorEditor'
}, defaults))
