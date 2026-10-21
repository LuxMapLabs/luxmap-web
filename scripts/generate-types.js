import fs from 'fs'
import path from 'path'
import http from 'http'
import https from 'https'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootDir = path.resolve(__dirname, '..')
const typesDir = path.resolve(rootDir, 'src/types')

// Tự động đọc file .env nếu có
const envPath = path.resolve(rootDir, '.env')
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf-8').split('\n')
    for (const line of envLines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const [key, ...vals] = trimmed.split('=')
        if (key && vals.length > 0) {
            process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '')
        }
    }
}

const baseUrl = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:5141'
const swaggerUrl = baseUrl.endsWith('.json') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/swagger/v1/swagger.json`

console.log('🚀 [1/3] Đang lấy Swagger Schema từ: ' + swaggerUrl + '...')

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http
        const req = client.get(url, { rejectUnauthorized: false }, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Server phản hồi mã lỗi HTTP ${res.statusCode}`))
            }
            let data = ''
            res.on('data', (chunk) => (data += chunk))
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data))
                } catch (e) {
                    reject(new Error(`Dữ liệu nhận được không phải là JSON hợp lệ: ${e.message}`))
                }
            })
        })
        req.on('error', (err) => {
            reject(new Error(`Không thể kết nối tới Backend tại ${url}. Hãy chắc chắn Backend đang chạy! (${err.message})`))
        })
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
        let itemType = openApiTypeToTs(prop.items)
        if (itemType === 'string | null') {
            itemType = 'string'
        }
        return itemType.includes('|') ? `(${itemType})[]` : `${itemType}[]`
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

// Router phân loại Endpoint thành { folder, file }
function routeEndpoint(epPath, op) {
    const client = op['x-luxmap-client']
    const summary = op.summary || ''

    // 🔴 LỌC BỎ 100% CÁC API DÀNH RIÊNG CHO MOBILE
    if (client === 'mobile' || summary.startsWith('[Mobile]')) {
        return null
    }

    const stripped = epPath.replace(/^\/api\/(?:v\d+\/)?/i, '')
    const segments = stripped.split('/').filter(Boolean)

    let folder = segments[0] || 'common'
    let file = segments[1] || segments[0] || 'common'

    if (file.startsWith('{')) {
        file = folder
    }

    // Chuẩn hóa tên folder và file theo đúng resource
    if (folder === 'auth') {
        if (file === 'web') file = 'web'
        else if (file === 'me') file = 'me'
    } else if (folder === 'assets') {
        if (file === 'import') file = 'import'
        else if (file === 'fixtures') file = 'fixtures'
        else if (file === 'poles') file = 'poles'
        else if (file === 'feeders') file = 'feeders'
        else if (file === 'segments') file = 'segments'
    } else if (folder === 'map') {
        if (file === 'poles') file = 'poles'
        else if (file === 'segments') file = 'segments'
        else if (file === 'iot-nodes') file = 'iot-nodes'
    } else if (folder === 'lux-readings') {
        folder = 'luxreadings'
        file = 'readings'
    } else if (folder === 'work-orders') {
        folder = 'workorders'
        file = 'orders'
    }

    return { folder, file }
}

async function run() {
    try {
        const swagger = await fetchJson(swaggerUrl)
        const schemas = swagger.components?.schemas || {}
        const paths = swagger.paths || {}

        console.log('📦 [2/3] Phân tích API, lọc bỏ Mobile và ánh xạ thư mục sau /api/v1/...')

        // 1. Phân loại Enums và Base types
        const allEnums = new Set()
        for (const [sName, sDef] of Object.entries(schemas)) {
            if (sDef.enum) allEnums.add(sName)
        }

        const commonBaseSchemas = new Set(['ApiError', 'ApiErrorResponse', 'PageQuery', 'AssetLocation', 'Geometry', 'UserDto'])

        // 2. Định tuyến các endpoint và gom nhóm schemas theo từng file đích
        const fileTargetSchemas = {}
        const schemaLocations = {} // Schema -> fileKey ('folder/file')

        // Enums luôn vào common/enums
        for (const e of allEnums) {
            schemaLocations[e] = 'common/enums'
        }
        // Base types luôn vào common/base
        for (const b of commonBaseSchemas) {
            schemaLocations[b] = 'common/base'
        }

        let skippedMobileCount = 0
        let acceptedWebCount = 0

        for (const [epPath, methods] of Object.entries(paths)) {
            for (const [m, op] of Object.entries(methods)) {
                const route = routeEndpoint(epPath, op)
                if (!route) {
                    skippedMobileCount++
                    continue
                }
                acceptedWebCount++
                const fileKey = `${route.folder}/${route.file}`
                if (!fileTargetSchemas[fileKey]) {
                    fileTargetSchemas[fileKey] = new Set()
                }

                // Quét schema liên quan trực tiếp
                const opStr = JSON.stringify(op)
                for (const sName of Object.keys(schemas)) {
                    if (allEnums.has(sName) || commonBaseSchemas.has(sName)) continue
                    if (opStr.includes(`"#/components/schemas/${sName}"`)) {
                        fileTargetSchemas[fileKey].add(sName)
                        if (!schemaLocations[sName]) {
                            schemaLocations[sName] = fileKey
                        }
                    }
                }
            }
        }

        // Đảm bảo các schema chuyên biệt được đặt về đúng file chủ quản
        const explicitHome = {
            'ActiveFixture': 'assets/fixtures',
            'CreateFixtureRequest': 'assets/fixtures',
            'RetireFixtureRequest': 'assets/fixtures',
            'PoleListItem': 'assets/poles',
            'PoleDetail': 'assets/poles',
            'CreatePoleRequest': 'assets/poles',
            'UpdatePoleRequest': 'assets/poles',
            'SetPoleFeederRequest': 'assets/poles',
            'PoleListItemPagedResult': 'assets/poles',
            'FeederListItem': 'assets/feeders',
            'FeederDetail': 'assets/feeders',
            'CreateFeederRequest': 'assets/feeders',
            'UpdateFeederRequest': 'assets/feeders',
            'FeederListItemPagedResult': 'assets/feeders',
            'SegmentListItem': 'assets/segments',
            'SegmentDetail': 'assets/segments',
            'CreateSegmentRequest': 'assets/segments',
            'UpdateSegmentRequest': 'assets/segments',
            'SegmentListItemPagedResult': 'assets/segments',
            'TopologyPole': 'assets/segments',
            'TopologyPolePagedResult': 'assets/segments',
            'ImportResult': 'assets/import',
            'ImportRowError': 'assets/import',
            'WebLoginRequest': 'auth/web',
            'WebAuthTokenResponse': 'auth/web',
            'CurrentUserResponse': 'auth/me'
        }

        for (const [sName, destKey] of Object.entries(explicitHome)) {
            schemaLocations[sName] = destKey
            if (!fileTargetSchemas[destKey]) fileTargetSchemas[destKey] = new Set()
            fileTargetSchemas[destKey].add(sName)
        }

        // Mở rộng đệ quy cho các DTO lồng nhau (sub-properties)
        for (const [fileKey, sSet] of Object.entries(fileTargetSchemas)) {
            const queue = Array.from(sSet)
            while (queue.length > 0) {
                const sName = queue.pop()
                const sDef = schemas[sName]
                if (!sDef) continue
                const sDefStr = JSON.stringify(sDef)
                for (const otherSchema of Object.keys(schemas)) {
                    if (allEnums.has(otherSchema) || commonBaseSchemas.has(otherSchema)) continue
                    if (sDefStr.includes(`"#/components/schemas/${otherSchema}"`)) {
                        if (!schemaLocations[otherSchema]) {
                            schemaLocations[otherSchema] = fileKey
                            sSet.add(otherSchema)
                            queue.push(otherSchema)
                        }
                    }
                }
            }
        }

        console.log(`  ✓ Đã lọc bỏ ${skippedMobileCount} API Mobile`)
        console.log(`  ✓ Đã giữ lại ${acceptedWebCount} API Web / Dùng chung`)

        // 3. Dọn dẹp thư mục src/types/ (Xóa các file phẳng cũ để thay bằng folder mới)
        console.log('🧹 [3/3] Dọn dẹp các file cũ và tạo cây thư mục types con...')

        // Xóa các file type phẳng cũ ở root src/types/
        if (fs.existsSync(typesDir)) {
            const oldFlatFiles = ['assets.ts', 'poles.ts', 'segments.ts', 'auth.ts', 'luxreadings.ts', 'iotnodes.ts', 'workorders.ts', 'common.ts']
            for (const f of oldFlatFiles) {
                const fullP = path.resolve(typesDir, f)
                if (fs.existsSync(fullP)) {
                    fs.unlinkSync(fullP)
                }
            }
        } else {
            fs.mkdirSync(typesDir, { recursive: true })
        }

        // Helper tính toán đường dẫn tương đối import giữa 2 fileKey (ví dụ 'assets/poles' và 'common/enums')
        function getRelativeImport(fromKey, toKey) {
            const fromDir = path.dirname(fromKey)
            const rel = path.relative(fromDir, toKey).replace(/\\/g, '/')
            return rel.startsWith('.') ? rel : `./${rel}`
        }

        // 4. Sinh file: common/enums.ts
        const commonDir = path.resolve(typesDir, 'common')
        fs.mkdirSync(commonDir, { recursive: true })

        let enumsContent = `/**\n * Domain Enums (Dùng chung toàn hệ thống)\n * Tự động sinh từ Backend Swagger\n */\n\n`
        for (const eName of Array.from(allEnums).sort()) {
            enumsContent += generateInterface(eName, schemas[eName]) + '\n'
        }
        fs.writeFileSync(path.resolve(commonDir, 'enums.ts'), enumsContent, 'utf-8')
        console.log(`  ✓ Đã tạo: src/types/common/enums.ts (${allEnums.size} enums)`)

        // 5. Sinh file: common/base.ts
        let baseContent = `/**\n * Base Types & Error Wrappers\n * Tự động sinh từ Backend Swagger\n */\n`
        for (const bName of Array.from(commonBaseSchemas).sort()) {
            if (schemas[bName]) {
                baseContent += generateInterface(bName, schemas[bName]) + '\n'
            }
        }
        if (!schemas['UserDto']) {
            baseContent += `export interface UserDto {\n    id?: string | null\n    username?: string | null\n    email?: string | null\n    full_name?: string | null\n    role?: string | null\n    commune_ids?: string[]\n}\n\n`
        }
        baseContent += `export interface PaginationMeta {\n    page: number\n    pageSize: number\n    total: number\n    totalPages: number\n}\n`
        fs.writeFileSync(path.resolve(commonDir, 'base.ts'), baseContent, 'utf-8')
        console.log(`  ✓ Đã tạo: src/types/common/base.ts`)

        // 6. Sinh từng file domain
        for (const [fileKey, sSet] of Object.entries(fileTargetSchemas)) {
            const [folderName, fileName] = fileKey.split('/')
            const targetDir = path.resolve(typesDir, folderName)
            fs.mkdirSync(targetDir, { recursive: true })

            const schemaList = Array.from(sSet).sort()
            let fileContent = `/**\n * Auto-generated Types for: ${folderName}/${fileName}\n * Sinh tự động từ endpoint Backend\n */\n`

            // Tính toán dependencies cần import
            const neededImports = {} // toKey -> Set of schema names
            const schemasInThisFile = new Set(schemaList)

            for (const sName of schemaList) {
                const sDef = schemas[sName]
                if (!sDef) continue
                const sStr = JSON.stringify(sDef)

                // Kiểm tra có dùng Enum nào không
                for (const eName of allEnums) {
                    if (sStr.includes(`"#/components/schemas/${eName}"`)) {
                        if (!neededImports['common/enums']) neededImports['common/enums'] = new Set()
                        neededImports['common/enums'].add(eName)
                    }
                }

                // Kiểm tra có dùng Base schema nào không
                for (const bName of commonBaseSchemas) {
                    if (sStr.includes(`"#/components/schemas/${bName}"`)) {
                        if (!neededImports['common/base']) neededImports['common/base'] = new Set()
                        neededImports['common/base'].add(bName)
                    }
                }

                // Kiểm tra có dùng schema ở file khác không
                for (const otherS of Object.keys(schemas)) {
                    if (allEnums.has(otherS) || commonBaseSchemas.has(otherS)) continue
                    if (schemasInThisFile.has(otherS)) continue
                    if (sStr.includes(`"#/components/schemas/${otherS}"`)) {
                        const otherLocation = schemaLocations[otherS]
                        if (otherLocation && otherLocation !== fileKey) {
                            if (!neededImports[otherLocation]) neededImports[otherLocation] = new Set()
                            neededImports[otherLocation].add(otherS)
                        }
                    }
                }
            }

            // Ghi các câu lệnh import
            for (const [otherKey, names] of Object.entries(neededImports)) {
                const relPath = getRelativeImport(fileKey, otherKey)
                fileContent += `import type { ${Array.from(names).sort().join(', ')} } from '${relPath}'\n`
            }
            if (Object.keys(neededImports).length > 0) {
                fileContent += '\n'
            }

            // Ghi các interface
            for (const sName of schemaList) {
                if (fileKey === 'auth/web' && (sName === 'WebAuthTokenResponse' || sName === 'WebLoginRequest')) {
                    continue // Sẽ được định nghĩa mở rộng bên dưới
                }
                const sDef = schemas[sName]
                if (sDef) {
                    fileContent += generateInterface(sName, sDef) + '\n'
                }
            }

            // Bổ trợ riêng cho auth/web.ts để tương thích với auth slice
            if (fileKey === 'auth/web') {
                fileContent += `export interface WebAuthTokenResponse {\n    accessToken?: string\n    access_token?: string | null\n    tokenType?: string\n    token_type?: string | null\n    expiresIn?: number\n    expires_in?: number\n}\n\n`
                fileContent += `export interface WebLoginRequest {\n    username?: string | null\n    password?: string | null\n    rememberMe?: boolean\n    remember_me?: boolean\n    emailOrPhone?: string\n}\n\n`
                fileContent += `export enum UserRole {\n  ManagementAgency = 0,\n  MaintenanceEngineer = 1,\n  FieldCrew = 2,\n  Admin = 3,\n}\n`
                fileContent += `\nexport interface User {\n  id?: string\n  userId?: string\n  fullName: string\n  username?: string\n  email: string | null\n  phoneNumber?: string | null\n  role: UserRole\n  roleString?: string\n  administrativeUnitId?: string\n  communeIds?: string[]\n  mapBounds?: import('./me').MapBounds | null\n}\n`
                fileContent += `\nexport interface JwtPayloadClaims {\n  sub: string\n  role: string\n  commune_ids: string[]\n  exp: number\n  iat: number\n  iss?: string\n  aud?: string\n}\n`
                fileContent += `\nexport interface AuthState {\n  user: User | null\n  isAuthenticated: boolean\n  accessToken?: string | null\n  refreshToken?: string | null\n  loading: boolean\n  isRefreshingProfile?: boolean\n  error: string | null\n}\n`
                fileContent += `\nexport interface LoginRequest {\n  emailOrPhone: string\n  password: string\n  rememberMe?: boolean\n  username?: string\n  remember_me?: boolean\n}\n`
                fileContent += `\nexport interface RegisterRequest {\n  username?: string | null\n  fullName?: string\n  full_name?: string | null\n  email?: string | null\n  phoneNumber?: string | null\n  password?: string | null\n  administrativeUnitId?: string\n  role?: UserRole\n}\n`
                fileContent += `\nexport interface RegisterResponse {\n  user_id?: string | null\n  username?: string | null\n  email?: string | null\n  full_name?: string | null\n  role?: string | null\n  commune_ids?: string | null[]\n  message?: string | null\n}\n`
                fileContent += `\nexport interface ApiResponse<T> {\n  data: T | null\n  error?: {\n    code: string\n    message: string\n    details?: Record<string, string[]>\n  } | null\n}\n`
                fileContent += `\nexport interface CurrentUserResponse {\n  user_id: string\n  username: string\n  email: string\n  full_name: string\n  role: string\n  commune_ids: string[]\n  map_bounds?: import('./me').MapBounds | null\n}\n`
            }

            const outPath = path.resolve(targetDir, `${fileName}.ts`)
            fs.writeFileSync(outPath, fileContent, 'utf-8')
            console.log(`  ✓ Đã tạo: src/types/${folderName}/${fileName}.ts`)
        }

        console.log('\n✨ XONG! Đã cấu trúc lại types theo folder sau v1, lọc sạch Mobile và không dùng barrel index.ts!')
    } catch (err) {
        console.error('❌ Lỗi:', err.message)
        process.exit(1)
    }
}

run()
