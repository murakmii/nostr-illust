import './App.css';
import IllustList from './IllustList';
import AgeVerification from './AgeVerification';
import { useOutlet, Link } from 'react-router-dom';
import { useRef, useEffect, useState, createContext, useReducer } from 'react';
import { MultiplexedRelays } from './Nostr';

export const NostrContext = createContext();
export const IllustContext = createContext();

const linkMatcher = /https?:\/\/[\w!\?/\+\-_~=;\.,\*&@#\$%\(\)'\[\]]+/g;

function profilesReducer(state, action) {
  let newState = state;

  switch (action.type) {
    // 受信中のプロフィールを重複してsubscribeしないよう、先にキーだけ登録しておく
    case 'RECEIVING':
      newState = { ...state };
      action.pubkeys.forEach(p => newState[p] = null);
      break;

    // 受信したkind: 0なイベントによるプロフィールの追加
    case 'RECEIVED':
      // pubkeyにつき複数のイベントがある可能性があるため、まずはpubkey毎にまとめる
      const eachPubKeys = {}
      action.events.forEach(e => {
        if (!eachPubKeys[e.pubkey]) {
          eachPubKeys[e.pubkey] = [];
        }
        eachPubKeys[e.pubkey].push({ ...JSON.parse(e.content), created_at: e.created_at });
      });

      const mergedProfiles = {};
      Object.keys(eachPubKeys).forEach(p => {
        mergedProfiles[p] = eachPubKeys[p]
          .sort((a, b) => a.created_at - b.created_at)
          .reduce((a, b) => Object.assign(a, b));

        if (!mergedProfiles[p].picture) {
          mergedProfiles[p].picture = '/default-icon.jpg';
        }
      });

      // 取得できなかったプロフィールについてはデフォルト値を設定
      action.expected.forEach(p => {
        if (mergedProfiles[p]) {
          return;
        }
        mergedProfiles[p] = {name: 'Nostrich', picture: '/default-icon.jpg'};
      });

      newState = { ...state, ...mergedProfiles };
      break;
  }

  return newState;
}

function App() {
  const relayRef = useRef(null);
  if (relayRef.current === null) {
    relayRef.current = new MultiplexedRelays(1, [
      'wss://relay.damus.io',
      'wss://relay.snort.social',
      'wss://relay.nostr.band',
    ]);
  }

  const [connected, setConnected] = useState(false);
  const [notes, setNotes] = useState({});
  const [until, setUntil] = useState(Math.floor(new Date().getTime()/1000));
  const [profiles, profilesDispatch] = useReducer(profilesReducer, {});
  const [loading, setLoading] = useState(false);
  const [eose, setEOSE] = useState(false);
  const [over18, setOver18] = useState(!!window.localStorage.getItem('over18'));
  
  const receiveNote = (event, relayURL) => {
    setNotes(prev => ({ ...prev, [event.id]: {
      id: event.id,
      pubkey: event.pubkey, 
      createdAt: event.created_at,
      content: event.content,
      relayURL,
    }}));
  };

  useEffect(() => {
    if (loading) {
      return;
    }
    setLoading(true);

    (async () => {
      await relayRef.current.connect();
      setConnected(true);

      relayRef.current.subscribe(
        [
          {
            kinds: [1],
            '#t': ['illust', 'Illust', 'illustration', 'Illustration'],
            limit: 50,
            until,
          },
        ],
        receiveNote,
        (stop) => {
          setEOSE(true);
          stop();
        },
      )
    })();

    return () => relayRef.current.close();
  }, [until]);

  useEffect(() => {
    const exists = new Set(Object.keys(profiles));
    const pubkeys = Array.from(new Set(Object.values(notes).map(t => t.pubkey).filter(p => !exists.has(p))));

    if (pubkeys.length == 0 || !eose) {
      return;
    }

    profilesDispatch({ type: 'RECEIVING', pubkeys });

    const events = [];
    relayRef.current.subscribe(
      [
        { 
          kinds: [0],
          authors: pubkeys,
        },
      ],
      (event) => events.push(event),
      (stop) => {
        setLoading(false);
        setEOSE(false);
        profilesDispatch({ type: 'RECEIVED', events, expected: pubkeys });
        stop();
      },
      ['wss://relay.nostr.band'],
    );
  }, [eose]);

  const onVerifiedAge = () => {
    try {
      window.localStorage.setItem('over18', new Date().getTime());
    } catch (error) {
      // プライベートモード等では保存できない場合があるが、無視
    }
    setOver18(true);
  };

  const normalizedNotes = Object.values(notes).map(n => {
    const links = Array.from(n.content.matchAll(linkMatcher), m => m[0]);
    if (links.length == 0) {
      return null;
    }

    // TODO
    const link = (
      links.find(l => l.toLowerCase().includes('.webp')) ||
      links.find(l => l.toLowerCase().includes('.png')) ||
      links.find(l => l.toLowerCase().includes('.jpg')) ||
      links.find(l => l.toLowerCase().includes('.jpeg')) ||
      links.find(l => l.toLowerCase().includes('.gif'))
    );

    if (!link) {
      return null;
    }

    return { ...n, link, isNew: (new Date().getTime()/1000 - n.createdAt) < 3600*24*3 };
  }).filter(n => n !== null);

  const child = useOutlet();
  return (
    <div id="App">
      <div id="Header">
        <h1><Link to="/">#illust</Link></h1>
        <p>tagged notes on Nostr</p>
        <div className="Space"></div>
        <Link to="/about">#about</Link>
      </div>
      {connected && (
        <NostrContext.Provider value={{relay: relayRef}}>
          <IllustContext.Provider value={{ loading, notes: normalizedNotes.sort((a, b) => b.createdAt - a.createdAt), setUntil, profiles, profilesDispatch}}>
            <div id="Main">
              {child || (over18 ? <IllustList /> : <AgeVerification onVerified={onVerifiedAge} />)}
            </div>
          </IllustContext.Provider>
        </NostrContext.Provider>
      )}
    </div>
  );
}

export default App;
