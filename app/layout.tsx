import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'MilkTea Party 🧋 - Gọi đồ nhóm dễ dàng',
  description: 'App gọi đồ nhóm không cần đăng nhập. Tạo đơn, chia sẻ link, chia tiền tự động.',
  keywords: ['gọi đồ nhóm', 'chia tiền', 'milktea', 'order nhóm', 'VietQR'],
  openGraph: {
    title: 'MilkTea Party 🧋 - Gọi đồ nhóm dễ dàng',
    description: 'Tạo đơn, chia sẻ link cho bạn bè, tự động chia bill + ship. Không cần đăng nhập!',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'MilkTea Party',
  },
  twitter: {
    card: 'summary',
    title: 'MilkTea Party 🧋 - Gọi đồ nhóm dễ dàng',
    description: 'Tạo đơn, chia sẻ link cho bạn bè, tự động chia bill + ship.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className={`${inter.className} bg-app text-white`}>
        {children}
      </body>
    </html>
  )
}
