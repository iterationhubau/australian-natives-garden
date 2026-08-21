import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const species = JSON.parse(fs.readFileSync(path.join(root, 'src/data/species.json'), 'utf8'))
let local = 0
let remote = 0
let empty = 0
let missingFile = 0
const emptyNames = []
const missingFiles = []
for (const r of species) {
  const u = r.image_url || ''
  if (!u) {
    empty++
    emptyNames.push(r.scientific_name)
    continue
  }
  if (u.startsWith('/catalog/')) {
    local++
    const f = path.join(root, 'public', u.slice(1))
    if (!fs.existsSync(f)) {
      missingFile++
      missingFiles.push(`${r.scientific_name} -> ${u}`)
    }
  } else {
    remote++
  }
}
console.log(JSON.stringify({ total: species.length, local, remote, empty, missingFile }, null, 2))
console.log('empty sample:', emptyNames.slice(0, 20))
console.log('missing files:', missingFiles.slice(0, 10))
