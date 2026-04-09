import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-800 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-sm text-slate-400 hover:text-white transition-colors"
        >
          &larr; Back to home
        </button>

        <div className="rounded-2xl bg-slate-900 p-6 sm:p-10 text-slate-300 space-y-6">
          <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
          <p className="text-xs text-slate-500">Last updated: April 9, 2026</p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">What is qhat?</h2>
            <p className="text-sm leading-relaxed">
              qhat is a lightweight, no-account video chat web application with live text translation.
              You can create or join a room, have a 1:1 video conversation, and exchange text messages
              that are automatically translated into the other person's language.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">What data do we process?</h2>
            <div className="space-y-3 text-sm leading-relaxed">
              <div>
                <h3 className="font-medium text-slate-200">Display name</h3>
                <p>You enter a name when joining a room or the public lobby. This name is stored only
                  in the server's memory (RAM) for the duration of the session and is deleted when
                  you leave or disconnect. It is not saved to any database.</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-200">Text messages</h3>
                <p>Chat messages you send are held temporarily in server memory for the duration of
                  the room session. They are sent to DeepL API for translation (see Third Parties below).
                  Messages are permanently deleted when the room closes. We do not store, log, or archive
                  message content.</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-200">IP address</h3>
                <p>Your IP address is visible in standard server logs and is used for rate limiting
                  (preventing abuse). Rate limit data is stored in memory only and expires automatically.
                  Server logs may be retained for up to 30 days for security purposes.</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-200">Language preference</h3>
                <p>Your selected language is stored in your browser's session storage and in server
                  memory for the duration of the session.</p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Video and audio</h2>
            <p className="text-sm leading-relaxed">
              Video and audio streams are transmitted <strong>peer-to-peer</strong> using WebRTC technology.
              This means your video and audio data travels directly between you and your conversation partner
              without passing through our server. We cannot see, record, or access your video or audio content.
            </p>
            <p className="text-sm leading-relaxed">
              In cases where a direct connection is not possible (restrictive firewalls or mobile networks),
              the media may be relayed through our TURN server. Even in this case, the data is encrypted
              (SRTP) and we cannot decrypt or access the content.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Data stored in your browser</h2>
            <p className="text-sm leading-relaxed">
              qhat stores the following data locally in your browser (not on our servers):
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-slate-400">
              <li><strong>sessionStorage:</strong> your name, language preference, room session info (cleared when you close the tab)</li>
              <li><strong>localStorage:</strong> conversation history (room codes, names, dates), video quality preference, camera selection (persists until you clear it)</li>
            </ul>
            <p className="text-sm leading-relaxed">
              You can clear this data at any time using the "Clear" button on the home page or by clearing
              your browser's site data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">No accounts, no tracking</h2>
            <p className="text-sm leading-relaxed">
              qhat does not require registration or login. We do not use cookies for tracking,
              analytics, or advertising. We do not use any analytics services (no Google Analytics,
              no Mixpanel, etc.). We do not create user profiles or track you across sessions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Third parties</h2>
            <div className="space-y-3 text-sm leading-relaxed">
              <div>
                <h3 className="font-medium text-slate-200">DeepL API</h3>
                <p>Your text messages are sent to <a href="https://www.deepl.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">DeepL</a> for
                  translation. DeepL processes the text content to provide the translation. Please refer
                  to DeepL's privacy policy for details on how they handle data.</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-200">Cloudflare</h3>
                <p>Our service is proxied through <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Cloudflare</a> for
                  security and performance. Cloudflare may process your IP address and request metadata.</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-200">Google STUN</h3>
                <p>We use Google's public STUN server (stun.l.google.com) to help establish peer-to-peer
                  connections. This service sees your IP address to determine your public network address.</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-200">Hetzner</h3>
                <p>Our server is hosted on <a href="https://www.hetzner.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Hetzner</a> infrastructure
                  in the EU (Finland).</p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Data retention</h2>
            <p className="text-sm leading-relaxed">
              All in-memory data (names, messages, room state) is deleted immediately when a room closes
              or when the server restarts. We do not have a database. Server logs (containing IP addresses
              and connection timestamps) may be retained for up to 30 days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Your rights (GDPR)</h2>
            <p className="text-sm leading-relaxed">
              If you are in the European Economic Area, you have rights under the General Data Protection
              Regulation including the right to access, rectify, or delete your personal data. Since we
              do not store persistent personal data (no accounts, no database), there is typically no data
              to retrieve or delete. If you have concerns, please contact us.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Children</h2>
            <p className="text-sm leading-relaxed">
              qhat is not intended for children under 13. We do not knowingly collect data from children.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p className="text-sm leading-relaxed">
              If you have any questions about this privacy policy, please contact us at:{' '}
              <a href="mailto:privacy@thisisgreat.app" className="text-blue-400 hover:underline">
                privacy@thisisgreat.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
