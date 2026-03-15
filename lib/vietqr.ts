import { Session, OrderBatch } from './types'

const VIETQR_BASE = 'https://img.vietqr.io/image'

export interface QRInfo {
  bankName: string | null
  bankAccount: string | null
  qrPayload: string | null
}

/**
 * Resolves the QR info for a specific batch based on system priorities.
 * Priority: 
 * 1. session.use_default_qr_for_all -> Use session defaults
 * 2. batch.bank_account/qr_payload -> Use batch specific info
 * 3. session.host_default_bank_account/qr_payload -> Use session defaults as fallback
 */
export function getPaymentQR(session: Session, batch?: OrderBatch): QRInfo {
  if (session.use_default_qr_for_all || !batch) {
    return {
      bankName: session.host_default_bank_name,
      bankAccount: session.host_default_bank_account,
      qrPayload: session.host_default_qr_payload
    }
  }

  return {
    bankName: batch.bank_name || session.host_default_bank_name,
    bankAccount: batch.bank_account || session.host_default_bank_account,
    qrPayload: batch.qr_payload || session.host_default_qr_payload
  }
}

/**
 * Parses a VietQR data string to extract bank code and account number.
 * Supports:
 * 1. URL format: https://vietqr.net/v2/bank/account/...
 * 2. Standard EMVCo format (Basic extraction)
 */
export function parseVietQR(data: string): { bankCode: string | null; accountNumber: string | null } {
  try {
    // Handle URL format
    if (data.includes('vietqr.net')) {
      const url = new URL(data)
      const pathParts = url.pathname.split('/')
      if (pathParts.length >= 3) {
        return {
          bankCode: pathParts[1],
          accountNumber: pathParts[2]
        }
      }
    }

    // Handle Standard EMVCo format (minimal implementation for common cases)
    // Looking for Tag 38 (VietQR sub-tags) or similar patterns
    // This is a simplified regex-based approach for common formats
    const bankMatch = data.match(/0010([A-Z0-9]{3,})/)
    const accountMatch = data.match(/011([0-9]{6,})/)

    return {
      bankCode: bankMatch ? bankMatch[1] : null,
      accountNumber: accountMatch ? accountMatch[1] : null
    }
  } catch (e) {
    console.error('VietQR Parse Error', e)
    return { bankCode: null, accountNumber: null }
  }
}

/**
 * Build a VietQR image URL for a given bank account and amount.

/**
 * Build a VietQR image URL for a given bank account and amount.
 *
 * @param bankCode - VietQR bank code (e.g. "MB", "VCB", "TCB")
 * @param accountNumber - Bank account number
 * @param amount - Amount in VND (integer)
 * @param addInfo - Payment description / transfer note
 * @returns URL string for the QR image
 */
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

// Common Vietnamese banks for the dropdown
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
