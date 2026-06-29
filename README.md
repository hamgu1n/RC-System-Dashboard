# RC System Information

A desktop IT diagnostics application built with Electron, React, and TypeScript, distributed by Roanoke College Information Technology.

It collects system information and sends structured reports to an internal IT system for support and asset tracking.

---

## Features

- Real-time system monitoring (CPU, RAM, Storage, Network)
- Device identification (serial, model, manufacturer, RC Tag)
- Network information (local + public IP, MAC address)
- Owner and department tracking via local info files
- One-click IT report submission with code verification
- Dark mode support

---

## How to Use

1. Open the application
2. Review system information
3. Click **Send To IT**
4. Enter your code when prompted
5. Wait for confirmation (button turns green or red)

---

## What "Send To IT" Does

When submitted, the app:

- Collects full system diagnostics (device, owner, network, hardware)
- Sends a structured report to the internal IT API
- IT receives it for support or asset tracking

---

## Requirements

- Internet connection required for sending reports
- Internal IT API access required
- Auth token must be present in `.env`

---

## Security Notes

- TLS verification uses the system certificate store via Electron's `net` module
- IPC is locked to a channel whitelist with frame URL validation
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`

---

## Tech Stack

- Electron
- React
- TypeScript
- systeminformation
- Vite

---

## Author

Haytham Rida Hlioui  
Roanoke College Information Technology
