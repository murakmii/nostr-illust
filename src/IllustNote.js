import './IllustNote.css';
import { IllustContext } from './App';
import { useContext } from 'react';
import { nip19 } from 'nostr-tools';

function IllustNote({ note }) {
  const { profiles } = useContext(IllustContext);
  const profile = profiles[note.pubkey];

  return (
    <a className={"IllustNote " + (note.isNew ? 'New' : '')}
      href={`https://snort.social/e/${nip19.noteEncode(note.id)}`}
      target="_blank"
      rel="noreferrer"
      style={{ backgroundImage: `url('${note.link}')` }}>
      
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
