// globalThis 最小桩：document / window / MutationObserver（契约测试专用，全录制、无真 DOM）。
// 刻意不提供 reset/卸载：测试进程单次装配，不留死代码。

export function installClientEnv() {
  const observers = []; // MutationObserver 实例录制
  const docListeners = []; // { type, fn }
  const winListeners = []; // { type, fn }
  const storage = new Map(); // Map 版 localStorage

  globalThis.window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener(type, fn) {
      winListeners.push({ type, fn });
    },
    removeEventListener(type, fn) {
      const i = winListeners.findIndex((l) => l.type === type && l.fn === fn);
      if (i >= 0) winListeners.splice(i, 1);
    },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
  };

  globalThis.document = {
    hidden: false,
    documentElement: {},
    head: { appendChild() {} },
    createElement: () => ({}),
    addEventListener(type, fn) {
      docListeners.push({ type, fn });
    },
    removeEventListener(type, fn) {
      const i = docListeners.findIndex((l) => l.type === type && l.fn === fn);
      if (i >= 0) docListeners.splice(i, 1);
    },
  };

  globalThis.MutationObserver = class MutationObserverStub {
    constructor(cb) {
      this.cb = cb;
      this.observed = null;
      this.disconnected = false;
      observers.push(this);
    }
    observe(target, options) {
      this.observed = { target, options };
    }
    disconnect() {
      this.disconnected = true;
    }
  };

  return { observers, docListeners, winListeners, storage };
}
