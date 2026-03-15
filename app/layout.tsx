import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Internal RangeError fix for String.repeat(-21) happening in some dependencies in this environment
if (typeof String.prototype.repeat === 'function') {
  const originalRepeat = String.prototype.repeat;
  String.prototype.repeat = function(count) {
    if (count < 0) {
      if (typeof window === 'undefined') {
        try {
          const fs = require('fs');
          const stack = new Error().stack;
          fs.appendFileSync('error_debug.log', `[${new Date().toISOString()}] Invalid count: ${count}\nStack: ${stack}\n\n`);
        } catch (e) {
          // ignore
        }
      }
      return '';
    }
    return originalRepeat.call(this, count);
  };
}

const inter = Inter({ subsets: ['latin'] })

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
}: Readonly<{
  children: React.ReactNode
}>) {
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
