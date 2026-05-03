const { contextBridge, ipcRenderer } = require("electron");

/* =========================
   VALID CHANNELS (WHITELIST)
========================= */

const VALID_INVOKE_CHANNELS = ["getStaticData", "sendToIT"] as const;
const VALID_ON_CHANNELS = ["statistics"] as const;

/* =========================
   TYPE GUARDS
========================= */

function isValidInvokeChannel(
  channel: string,
): channel is (typeof VALID_INVOKE_CHANNELS)[number] {
  return VALID_INVOKE_CHANNELS.includes(channel as any);
}

function isValidOnChannel(
  channel: string,
): channel is (typeof VALID_ON_CHANNELS)[number] {
  return VALID_ON_CHANNELS.includes(channel as any);
}

/* =========================
   SAFE IPC INVOKE
========================= */

function ipcInvoke<Key extends (typeof VALID_INVOKE_CHANNELS)[number]>(
  key: Key,
  payload?: unknown,
): Promise<EventPayloadMapping[Key]> {
  if (!isValidInvokeChannel(key)) {
    throw new Error(`Invalid IPC invoke channel: ${key}`);
  }

  return ipcRenderer.invoke(key, payload);
}

/* =========================
   SAFE IPC LISTENER
========================= */

function ipcOn<Key extends (typeof VALID_ON_CHANNELS)[number]>(
  key: Key,
  callback: (payload: EventPayloadMapping[Key]) => void,
) {
  if (!isValidOnChannel(key)) {
    throw new Error(`Invalid IPC listener channel: ${key}`);
  }

  const cb = (_: Electron.IpcRendererEvent, payload: unknown) => {
    callback(payload as EventPayloadMapping[Key]);
  };

  ipcRenderer.on(key, cb);

  return () => {
    ipcRenderer.off(key, cb);
  };
}

/* =========================
   EXPOSED API (STRICT)
========================= */

contextBridge.exposeInMainWorld("electron", {
  subscribeStatistics: (callback: (statistics: Statistics) => void) => {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    return ipcOn("statistics", callback);
  },

  getStaticData: () => ipcInvoke("getStaticData"),

  sendToIT: (payload: { data: StaticData; stats: Statistics }) => {
    if (
      !payload ||
      typeof payload !== "object" ||
      !payload.data ||
      !payload.stats
    ) {
      throw new Error("Invalid payload for sendToIT");
    }

    return ipcInvoke("sendToIT", payload);
  },
} satisfies Window["electron"]);
