import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import opentype from 'opentype.js'

const fontPath = fileURLToPath(new URL('../resources/fonts/Anton-Regular.ttf', import.meta.url))
const outputPath = fileURLToPath(new URL('../src/fonts/anton.typeface.json', import.meta.url))

const fontBuffer = fs.readFileSync(fontPath)
const font = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength))
const resolution = font.unitsPerEm

let flipY = null
const glyphs = {}

const round = (n) => Math.round(n * 100) / 100

for(let code = 32; code <= 126; code++)
{
    const char = String.fromCharCode(code)
    const glyph = font.charToGlyph(char)
    if(!glyph || !glyph.path)
        continue

    const pathData = glyph.getPath(0, 0, resolution)
    if(pathData.commands.length === 0)
        continue

    if(flipY === null)
    {
        const ys = pathData.commands.flatMap((_command) => ('y' in _command) ? [_command.y] : [])
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        flipY = maxY < 0 && minY < 0
    }

    let outline = ''
    for(const command of pathData.commands)
    {
        if(command.type === 'M')
        {
            outline += `m ${round(command.x)} ${round(flipY ? - command.y : command.y)} `
        }
        else if(command.type === 'L')
        {
            outline += `l ${round(command.x)} ${round(flipY ? - command.y : command.y)} `
        }
        else if(command.type === 'Q')
        {
            // three.js FontLoader expects: end point first, then control point
            outline += `q ${round(command.x)} ${round(flipY ? - command.y : command.y)} ${round(command.x1)} ${round(flipY ? - command.y1 : command.y1)} `
        }
        else if(command.type === 'C')
        {
            // three.js FontLoader expects: end point first, then control point 2, then control point 1
            outline += `b ${round(command.x)} ${round(flipY ? - command.y : command.y)} ${round(command.x2)} ${round(flipY ? - command.y2 : command.y2)} ${round(command.x1)} ${round(flipY ? - command.y1 : command.y1)} `
        }
    }

    const box = pathData.getBoundingBox()

    glyphs[char] = {
        ha: glyph.advanceWidth,
        x_min: Math.round(box.x1),
        x_max: Math.round(box.x2),
        o: outline.trim()
    }
}

// Cap height (glyph H height), used to size letters at runtime
const capPath = font.charToGlyph('H').getPath(0, 0, resolution)
const capBox = capPath.getBoundingBox()

const data = {
    glyphs,
    resolution,
    familyName: 'Anton',
    ascender: font.ascender,
    descender: font.descender,
    underlinePosition: font.tables.post ? font.tables.post.underlinePosition : 0,
    underlineThickness: font.tables.post ? font.tables.post.underlineThickness : 0,
    boundingBox: {
        yMin: Math.round(capBox.y1),
        yMax: Math.round(capBox.y2),
        xMin: - 10000,
        xMax: 10000
    },
    capHeight: Math.round(capBox.y2 - Math.min(0, capBox.y1))
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, JSON.stringify(data))

console.log(`Wrote ${outputPath} (${Object.keys(glyphs).length} glyphs, resolution ${resolution}, capHeight ${data.capHeight}, flipY ${flipY})`)
