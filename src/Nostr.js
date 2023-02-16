import { relayInit } from 'nostr-tools';

export const Relays = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://relay.nostr.band',
];

// タイムアウト付きで接続する
function connectToRelay(url) {
  return new Promise((resolve, reject) => {
    const relay = relayInit(url);

    const timeout = setTimeout(() => {
      try { relay.close() } catch (_) { }

      console.warn(`timed out connecting to ${url}`);
      reject(url);
    }, 2000);

    relay.connect()
      .then(() => {
        clearTimeout(timeout);
        resolve(relay);
      })
      .catch(() => reject(url));
  });
}

export class MultiplexedRelays {
  constructor(guarantee, relayURLs) {
    this.guarantee = guarantee;
    this.relayURLs = relayURLs;
    this.activeRelays = [];
    this.deadRelays = [];
    this.conn = null;

    // deadRelaysをチェックし、可能ならactiveRelaysに戻す関数を定期的に実行する
    const keepaliver = () => {
      const connecting = [];
      this.deadRelays.forEach((relay) => {
        // 死んでから1分は時間をおく
        if (new Date().getTime() - relay.deadAt < 60000) {
          return;
        }

        console.info(`keepaliver start checking: ${relay.url}`);
        connecting.push(connectToRelay(relay.url));
      });

      Promise.allSettled(connecting)
        .then(result => {
          this.deadRelays = [];

          result.forEach(r => {
            if (r.status === 'fulfilled') {
              console.info(`recovered connection to: ${r.value.url}`);
              this.activeRelays.push(r.value);
            } else {
              console.info(`stay as dead relay connection to: ${r.reason}`);
              this.deadRelays.push({ url: r.reason, deadAt: new Date().getTime() });
            }
          });
        })
        .finally(() => setTimeout(keepaliver, 10000));
    }
    keepaliver();
  }

  connect() {
    if (this.conn) {
      return this.conn;
    }

    this.conn = new Promise((resolve, reject) => {
      Promise.allSettled(this.relayURLs.map(connectToRelay))
        .then(result => {
          const connected = [];
          result.forEach(r => {
            if (r.status === 'fulfilled') {
              connected.push(r.value);
            } else {
              // 接続に失敗したリレーはdeadRelays送りにし定期的にチェックする
              this.deadRelays.push({ url: r.reason, deadAt: new Date().getTime() });
              console.warn(`failed to connect relay server: ${r.reason}`);
            }
          });

          if (connected.length < this.guarantee) {
            connected.forEach(c => c.close());
            reject();
          } else {
            this.activeRelays = connected;
            console.info(`connected ${this.activeRelays.length} relay servers`);
            resolve();
          }
      });
    });

    return this.conn;
  }

  subscribe(filters, handleEvent, handleEOSE) {
    const receivedIDs = new Set();
    const allEOSE = [];

    let subscriptions = [];

    // 任意のタイミングでコールバック側からsubscribeを止めるための関数
    const stop = () => subscriptions.forEach(s => {
      s.sub.unsub();
      console.info(`close subscription for ${s.url}`);
    });

    this.activeRelays.forEach(r => {
      console.info(`start subscription for ${r.url}`, filters);

      const sub = r.sub(filters);
      subscriptions.push({sub, url: r.url});

      // eventハンドラは単にコールバックにイベントを渡すだけ
      sub.on('event', (event) => {
        if (receivedIDs.has(event.id)) {
          return;
        }

        receivedIDs.add(event.id);
        handleEvent(event, r.url, stop);
      });

      // EOSEの監視 or タイムアウト
      // 一定時間内にEOSEが来ない場合はタイムアウトさせsubscribeも止めておく
      allEOSE.push(new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn(`EOSE timed out from ${r.url}`);
          subscriptions = subscriptions.filter(s => s.url !== r.url); // stopで重複してunsubされないよう抜いておく
          try { sub.unsub() } catch (_) {}
          
          reject(r.url);
        }, 3000);

        sub.on('eose', () => {
          clearTimeout(timeout);
          resolve(r);
        });
      }));
    });

    Promise.allSettled(allEOSE)
      .then(result => {
        result.forEach(r => {
          if (r.status !== 'rejected') {
            return;
          }

          // EOSE受信がタイムアウトしたリレーはdeadRelays行き
          this.activeRelays = this.activeRelays.filter(ar => ar.url !== r.reason);
          if (!this.deadRelays.find(dr => dr.url !== r.reason)) {
            this.deadRelays.push({ url: r.reason, deadAt: new Date().getTime() });
          }
        });
      })
      .finally(() => handleEOSE && handleEOSE(stop));

    return stop;
  }

  close() {
    // RelayのcloseはPromiseを返すが、これを待つケースは当掲示板では無さそうなので無視する
    this.activeRelays.forEach(r => r.close());
  }
};
