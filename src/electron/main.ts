import { app, BrowserWindow, Tray, Menu, nativeImage } from "electron";
import path from "path";

import { isDev, ipcMainHandle } from "./util.js";
import {
  getStaticData,
  pullResources,
  sendReportToApi,
} from "./resourceManager.js";
import { getPreloadPath, getUIPath } from "./pathResolver.js";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

/* =========================
   TRAY SETUP
========================= */
function createTray() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", "Tray_Icon_16.png")
    : path.join(app.getAppPath(), "assets", "Tray_Icon_16.png");

  const icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    console.error("❌ Tray icon failed to load:", iconPath);
  }

  icon.setTemplateImage(true);

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        if (!mainWindow) return;
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Hide App",
      click: () => {
        mainWindow?.hide();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("RC System Dashboard");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (!mainWindow) return;

    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/* =========================
   APP READY
========================= */
app.on("ready", () => {
  mainWindow = new BrowserWindow({
    title: "RC System Dashboard",
    webPreferences: {
      preload: app.isPackaged
        ? path.join(process.resourcesPath, "dist-electron", "preload.cjs")
        : getPreloadPath(),

      // 🔒 SECURITY LOCKDOWN
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev()) {
    mainWindow.loadURL("http://127.0.0.1:5123/");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(getUIPath());
  }

  // 🔒 Prevent navigation / new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  pullResources(mainWindow);

  createTray();

  /* =========================
     IPC (SECURED)
  ========================= */

  ipcMainHandle("getStaticData", async () => {
    return getStaticData();
  });

  ipcMainHandle("sendToIT", async (_event, payload) => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid payload");
    }

    const { data, stats } = payload as {
      data: StaticData;
      stats: Statistics;
    };

    if (!data || !stats) {
      throw new Error("Missing data or stats");
    }

    if (typeof stats.cpuUsage !== "number") {
      throw new Error("Invalid stats format");
    }

    try {
      await sendReportToApi(data, stats);
      return { success: true };
    } catch (err) {
      console.error("Failed to send report to API:", err);
      return { success: false, error: String(err) };
    }
  });

  /* =========================
     WINDOW BEHAVIOR
  ========================= */

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
});

/* =========================
   CLEAN EXIT
========================= */

app.on("before-quit", () => {
  isQuitting = true;
  tray?.destroy();
});
