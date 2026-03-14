const VIETQR_BASE = 'https://img.vietqr.io/image'

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
