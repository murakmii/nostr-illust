import './IllustNote.css';
import { IllustContext } from './App';
import { doCache, fromCache } from './Cache';
import { useContext, useRef, useEffect, useState } from 'react';
import { nip19 } from 'nostr-tools';

function IllustNote({ note }) {
  const canvasRef = useRef(null);
  const { profiles } = useContext(IllustContext);
  const profile = profiles[note.pubkey];
  const [fallbackImg, setFallbackImg] = useState(false);
  const cache = fromCache(note);
  const imageUrl = fallbackImg ? note.link : cache;

  useEffect(() => {
    if (cache) {
      return;
    }

    const img = new Image();

    img.crossOrigin="anonymous";
    img.onload = () => {
      var sx, sy, sw, sh;
      if (img.width < img.height) {
        sw = sh = img.width;
        sx = 0;
        sy = Math.floor((img.height - img.width)/2);
      } else {
        sw = sh = img.height;
        sx = Math.floor((img.width - img.height)/2);
        sy = 0;
      }

      const canvasSize = 600;

      canvasRef.current.width = canvasSize;
      canvasRef.current.height = canvasSize;

      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasSize, canvasSize);

      canvasRef.current.toBlob((blob) => doCache(note, blob), "image/webp", 0.6);
    };
    img.onerror = () => setFallbackImg(true);
    img.src = note.link;
  }, []);

  return (
    <a className={"IllustNote " + (note.isNew ? 'New' : '')}
      href={`https://snort.social/e/${nip19.noteEncode(note.id)}`}
      target="_blank"
      rel="noreferrer"
      style={{ backgroundImage: imageUrl ? `url('${imageUrl}')` : null }}>

      {!cache && !fallbackImg && <canvas ref={canvasRef}  />}
      
      {profile && <div className="Profile">
        <img src={profile.picture} />
        <p>
          <b>{profile.display_name || profile.name}</b><br/>
          <span>@{profile.display_name && profile.name}</span>
        </p>
      </div>}
    </a>
  );
}

export default IllustNote;
