import { Session, OrderBatch } from './types'

const VIETQR_BASE = 'https://img.vietqr.io/image'

export interface QRInfo {
  bankName: string | null
  bankAccount: string | null
  qrPayload: string | null
}

export const BANK_OPTIONS = [
  { code: 'VCB', name: 'Vietcombank (VCB)', bin: '970436', shortName: 'VIETCOMBANK' },
  { code: 'MB', name: 'MB Bank (MB)', bin: '970422', shortName: 'MB' },
  { code: 'TCB', name: 'Techcombank (TCB)', bin: '970407', shortName: 'TECHCOMBANK' },
  { code: 'ACB', name: 'ACB', bin: '970416', shortName: 'ACB' },
  { code: 'VPB', name: 'VPBank (VPB)', bin: '970432', shortName: 'VPBANK' },
  { code: 'BIDV', name: 'BIDV', bin: '970418', shortName: 'BIDV' },
  { code: 'CTG', name: 'Vietinbank (CTG)', bin: '970415', shortName: 'VIETINBANK' },
  { code: 'TPB', name: 'TPBank (TPB)', bin: '970423', shortName: 'TPBANK' },
  { code: 'OCB', name: 'OCB', bin: '970448', shortName: 'OCB' },
  { code: 'MSB', name: 'MSB', bin: '970426', shortName: 'MSB' },
  { code: 'SHB', name: 'SHB', bin: '970443', shortName: 'SHB' },
  { code: 'STB', name: 'Sacombank (STB)', bin: '970403', shortName: 'SACOMBANK' },
  { code: 'EIB', name: 'Eximbank (EIB)', bin: '970431', shortName: 'EXIMBANK' },
  { code: 'HDB', name: 'HDBank (HDB)', bin: '970437', shortName: 'HDBANK' },
]

export function getPaymentQR(session: Session, batch?: OrderBatch): QRInfo {
  if (session.useDefaultQrForAll || !batch) {
    return {
      bankName: session.hostDefaultBankName,
      bankAccount: session.hostDefaultBankAccount,
      qrPayload: session.hostDefaultQrPayload
    }
  }

  return {
    bankName: batch.bankName || session.hostDefaultBankName,
    bankAccount: batch.bankAccount || session.hostDefaultBankAccount,
    qrPayload: batch.qrPayload || session.hostDefaultQrPayload
  }
}

/**
 * Thô sơ nhưng hiệu quả: Phân giải cấu trúc EMVCo (ID-Length-Value)
 */
function parseEMVCo(data: string): Record<string, string> {
  const tags: Record<string, string> = {}
  let i = 0
  while (i < data.length) {
    const id = data.substring(i, i + 2)
    const lenStr = data.substring(i + 2, i + 4)
    const len = parseInt(lenStr)
    if (isNaN(len)) break
    const val = data.substring(i + 4, i + 4 + len)
    tags[id] = val
    i += 4 + len
  }
  return tags
}

export function parseVietQR(data: string): { bankName: string | null; bankAccount: string | null } {
  try {
    // 1. Xử lý định dạng URL (vietqr.net/v2/...)
    if (data.includes('vietqr.net')) {
      const url = new URL(data)
      const pathParts = url.pathname.split('/')
      if (pathParts.length >= 3) {
        const potentialBank = pathParts[1]
        const bank = BANK_OPTIONS.find(b => b.code === potentialBank || b.bin === potentialBank || b.shortName === potentialBank)
        return {
          bankName: bank ? bank.code : potentialBank,
          bankAccount: pathParts[2]
        }
      }
    }

    // 2. Xử lý chuẩn EMVCo (000201...)
    if (data.startsWith('000201')) {
      const mainTags = parseEMVCo(data)
      const tag38Val = mainTags['38']
      if (tag38Val) {
        const tag38Sub = parseEMVCo(tag38Val)
        const tag01Val = tag38Sub['01'] // Merchant Info
        if (tag01Val) {
          const tag01Sub = parseEMVCo(tag01Val)
          const bin = tag01Sub['00']
          const acc = tag01Sub['01']
          
          const bank = BANK_OPTIONS.find(b => b.bin === bin)
          return {
            bankName: bank ? bank.code : bin,
            bankAccount: acc || null
          }
        }
      }
    }

    // 3. Xử lý chuỗi thô hoặc định dạng lạ
    const accountMatch = data.match(/([0-9]{6,15})/)
    if (accountMatch) {
      const acc = accountMatch[1]
      let finalAcc = acc
      if (data.startsWith('0') && acc.length > 10) {
          const tcbCandidate = data.match(/([0-9]{10,12})/)
          if (tcbCandidate) finalAcc = tcbCandidate[1]
      }

      return {
        bankName: null,
        bankAccount: finalAcc
      }
    }

    return { bankName: null, bankAccount: null }
  } catch (e) {
    console.error('VietQR Parse Error', e)
    return { bankName: null, bankAccount: null }
  }
}

export function buildQrUrl(
  bankCode: string,
  accountNumber: string,
  amount: number,
  addInfo: string,
  accountName: string = ''
): string {
  const encoded = encodeURIComponent(addInfo)
  const nameEncoded = encodeURIComponent(accountName)
  return `${VIETQR_BASE}/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encoded}&accountName=${nameEncoded}`
}
