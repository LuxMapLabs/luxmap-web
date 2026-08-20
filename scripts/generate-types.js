import fs from 'fs'
import path from 'path'
import http from 'http'
import https from 'https'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootDir = path.resolve(__dirname, '..')
const typesDir = path.resolve(rootDir, 'src/types')

const swaggerUrl = process.env.API_URL || 'http://localhost:5141/swagger/v1/swagger.json'

console.log('🚀 [1/2] Đang lấy Swagger Schema từ: ' + swaggerUrl + '...')

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http
        client.get(url, { rejectUnauthorized: false }, (res) => {
            let data = ''
            res.on('data', (chunk) => (data += chunk))
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data))
                } catch (e) {
                    reject(e)
                }
            })
        }).on('error', reject)
    })
}

function openApiTypeToTs(prop) {
    if (!prop) return 'any'

    if (prop.$ref) {
        return prop.$ref.split('/').pop()
    }

    if (prop.enum) {
        return prop.enum.map(v => typeof v === 'string' ? `'${v}'` : v).join(' | ')
    }

    if (prop.type === 'array') {
        const itemType = openApiTypeToTs(prop.items)
        return `${itemType}[]`
    }

    if (prop.type === 'string') {
        return 'string | null'
    }

    if (prop.type === 'integer' || prop.type === 'number') {
        return 'number'
    }

    if (prop.type === 'boolean') {
        return 'boolean'
    }

    if (prop.type === 'object') {
        if (prop.additionalProperties) {
            const valType = openApiTypeToTs(prop.additionalProperties)
            return `Record<string, ${valType}>`
        }
        return 'Record<string, any>'
    }

    return 'any'
}

function generateInterface(name, schema) {
    if (schema.enum) {
        const enumValues = schema.enum.map(v => typeof v === 'string' ? `'${v}'` : v).join(' | ')
        return `export type ${name} = ${enumValues}\n`
    }

    let code = `export interface ${name} {\n`
    const props = schema.properties || {}
    const required = schema.required || []

    for (const [propName, propDef] of Object.entries(props)) {
        const isRequired = required.includes(propName)
        const optionalFlag = isRequired ? '' : '?'
        const tsType = openApiTypeToTs(propDef)
        code += `    ${propName}${optionalFlag}: ${tsType}\n`
    }

    code += '}\n'
    return code
}

async function run() {
    try {
        const swagger = await fetchJson(swaggerUrl)
        const schemas = swagger.components?.schemas || {}
        const paths = swagger.paths || {}

        console.log('📦 [2/2] Tự động phân tích Endpoint sau /api/v1/ và tạo các file Types thuần...')

        // Xóa sạch toàn bộ file cũ trong src/types/ (kể cả api.d.ts)
        if (fs.existsSync(typesDir)) {
            for (const f of fs.readdirSync(typesDir)) {
                fs.unlinkSync(path.resolve(typesDir, f))
            }
        } else {
            fs.mkdirSync(typesDir, { recursive: true })
        }

        const commonSchemas = ['ApiError', 'PaginationMeta', 'ObjectApiResponse', 'UserDto', 'UserRole']
        const moduleSchemas = {}

        moduleSchemas['common'] = new Set(commonSchemas.filter(s => schemas[s]))

        // 1. Phân loại theo Endpoint path: /api/v1/{module}/...
        for (const [endpointPath, methods] of Object.entries(paths)) {
            let moduleName = 'common'
            const match = endpointPath.match(/\/api\/(?:v\d+\/)?([^\/]+)/i)
            if (match && match[1]) {
                moduleName = match[1].toLowerCase().replace(/[^a-z0-9]/g, '')
            }

            if (!moduleSchemas[moduleName]) {
                moduleSchemas[moduleName] = new Set()
            }

            const endpointStr = JSON.stringify(methods)
            for (const schemaName of Object.keys(schemas)) {
                if (!commonSchemas.includes(schemaName) && endpointStr.includes(`"#/components/schemas/${schemaName}"`)) {
                    moduleSchemas[moduleName].add(schemaName)
                }
            }
        }

        // 2. Tìm tất cả các schemas lồng nhau đệ quy
        for (const [mod, sSet] of Object.entries(moduleSchemas)) {
            const queue = Array.from(sSet)
            while (queue.length > 0) {
                const sName = queue.pop()
                const sDef = schemas[sName]
                if (!sDef) continue
                const sDefStr = JSON.stringify(sDef)
                for (const otherSchema of Object.keys(schemas)) {
                    if (sDefStr.includes(`"#/components/schemas/${otherSchema}"`)) {
                        if (!commonSchemas.includes(otherSchema) && !sSet.has(otherSchema)) {
                            sSet.add(otherSchema)
                            queue.push(otherSchema)
                        }
                    }
                }
            }
        }

        // Sắp xếp sao cho Base Schema đứng trước Wrapper Schema
        function sortSchemas(list) {
            return list.sort((a, b) => {
                if (a.includes('ApiResponse') && !b.includes('ApiResponse')) return 1
                if (!a.includes('ApiResponse') && b.includes('ApiResponse')) return -1
                return a.localeCompare(b)
            })
        }

        const generatedFiles = []

        // 1. Tạo src/types/common.ts
        if (moduleSchemas['common'] && moduleSchemas['common'].size > 0) {
            let commonContent = `/**\n * Common Types & Response Wrappers\n * Auto-generated from Backend Swagger\n */\n\n`
            for (const sName of sortSchemas(Array.from(moduleSchemas['common']))) {
                const sDef = schemas[sName]
                if (sDef) {
                    commonContent += generateInterface(sName, sDef) + '\n'
                }
            }
            fs.writeFileSync(path.resolve(typesDir, 'common.ts'), commonContent, 'utf-8')
            console.log(`  ✓ Đã tạo: src/types/common.ts`)
            generatedFiles.push('common')
        }

        // 2. Tạo từng file module
        for (const [modName, schemaSet] of Object.entries(moduleSchemas)) {
            if (modName === 'common' || schemaSet.size === 0) continue

            const schemaList = Array.from(schemaSet)
            const filename = `${modName}.ts`
            let fileContent = `/**\n * Auto-generated Types for Module: ${modName}\n * Tự động tạo dựa trên endpoint: /api/v1/${modName}/*\n */\n`

            // Check which common imports are needed
            const combinedSchemaStr = JSON.stringify(schemaList.map(s => schemas[s]))
            const neededImports = commonSchemas.filter(cs => combinedSchemaStr.includes(`"#/components/schemas/${cs}"`))
            if (modName === 'auth') {
                if (!neededImports.includes('UserDto')) neededImports.push('UserDto')
            }

            if (neededImports.length > 0) {
                fileContent += `import type { ${neededImports.join(', ')} } from './common'\n\n`
            }

            for (const sName of sortSchemas(schemaList)) {
                const sDef = schemas[sName]
                if (sDef) {
                    fileContent += generateInterface(sName, sDef) + '\n'
                }
            }

            if (modName === 'auth') {
                fileContent += `\nexport interface AuthState {\n    user: UserDto | null\n    accessToken: string | null\n    refreshToken: string | null\n    loading: boolean\n    error: string | null\n}\n`
            }

            fs.writeFileSync(path.resolve(typesDir, filename), fileContent, 'utf-8')
            console.log(`  ✓ Đã tạo: src/types/${filename}`)
            generatedFiles.push(modName)
        }

        // 3. Tạo src/types/index.ts
        let indexContent = `/**\n * Barrel export cho toàn bộ Types trong dự án\n */\n`
        for (const mod of generatedFiles) {
            indexContent += `export * from './${mod}'\n`
        }
        fs.writeFileSync(path.resolve(typesDir, 'index.ts'), indexContent, 'utf-8')
        console.log(`  ✓ Đã cập nhật: src/types/index.ts`)

        console.log('✨ XONG! Đã xóa sạch api.d.ts, thư mục chỉ còn các file domain thuần túy!')
    } catch (err) {
        console.error('❌ Lỗi:', err.message)
        process.exit(1)
    }
}

run()
