import type { NextConfig } from "next";

// Internal RangeError fix for String.repeat(-21) happening early in boot
if (typeof String.prototype.repeat === 'function') {
  const originalRepeat = String.prototype.repeat;
  String.prototype.repeat = function(count) {
    if (count < 0) {
      try {
        const fs = require('fs');
        const stack = new Error().stack;
        fs.appendFileSync('boot_error.log', `[${new Date().toISOString()}] Invalid count: ${count}\nStack: ${stack}\n\n`);
      } catch (e) {}
      return '';
    }
    return originalRepeat.call(this, count);
  };
}

// Catch crashes
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => {
    try {
      const fs = require('fs');
      fs.appendFileSync('crash.log', `[${new Date().toISOString()}] CRASH: ${err.message}\nStack: ${err.stack}\n\n`);
    } catch (e) {}
    console.error('CRASH:', err);
    process.exit(1);
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.vietqr.io',
      },
    ],
  },

  allowedDevOrigins: [
    "192.168.1.11",
    "localhost",
  ],
};

export default nextConfig;
