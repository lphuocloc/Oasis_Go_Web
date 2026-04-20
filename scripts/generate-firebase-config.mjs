import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(rootDir, '.env'), override: true })

const isStrict = process.argv.includes('--strict')

const vars = {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
    FIREBASE_WEB_PUSH_VAPID_KEY: process.env.FIREBASE_WEB_PUSH_VAPID_KEY || '',
}

const missing = Object.entries(vars)
    .filter(([, value]) => !value.trim())
    .map(([name]) => name)

if (isStrict && missing.length > 0) {
    console.error('Missing required Firebase environment variables:')
    for (const key of missing) {
        console.error(`- ${key}`)
    }
    process.exit(1)
}

if (!isStrict && missing.length > 0) {
    console.warn('Firebase config is incomplete in non-strict mode. Missing:')
    for (const key of missing) {
        console.warn(`- ${key}`)
    }
}

const replaceTokens = (template) => {
    return Object.entries(vars).reduce((acc, [key, rawValue]) => {
        const value = String(rawValue)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r?\n/g, '')

        const token = `__${key}__`
        return acc.replaceAll(token, value)
    }, template)
}

const writeFromTemplate = (templatePath, outputPath) => {
    const templateFullPath = path.join(rootDir, templatePath)
    const outputFullPath = path.join(rootDir, outputPath)

    const template = fs.readFileSync(templateFullPath, 'utf8')
    const compiled = replaceTokens(template)

    fs.mkdirSync(path.dirname(outputFullPath), { recursive: true })
    fs.writeFileSync(outputFullPath, compiled, 'utf8')
    console.log(`Generated ${outputPath}`)
}

writeFromTemplate('src/config/firebase.template.ts', 'src/config/firebase.ts')
writeFromTemplate('public/firebase-messaging-sw.template.js', 'public/firebase-messaging-sw.js')
