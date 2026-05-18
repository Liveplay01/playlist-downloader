export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white/80">
      <div className="max-w-[680px] mx-auto px-5 pt-14 pb-24">

        {/* Back */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/50 transition-colors duration-150 mb-10"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5m7-7-7 7 7 7"/>
          </svg>
          Back
        </a>

        <h1 className="text-[22px] font-semibold text-white/90 tracking-[-0.5px] mb-1">Legal Notice</h1>
        <p className="text-[13px] text-white/35 mb-10">Terms of Service · Privacy Policy · Disclaimer</p>

        <div className="space-y-10">

          {/* Terms of Service */}
          <Section title="Terms of Service">
            <P>By using this service you agree to the following terms. If you do not agree, do not use the service.</P>

            <H3>1. Permitted Use</H3>
            <P>
              This tool is provided strictly for <strong className="text-white/70">personal, private, non-commercial use</strong>.
              You may only download content that you are legally entitled to download — for example, content you have
              purchased, content that is licensed under a permissive licence (e.g. Creative Commons), or content for
              which the rights holder has given explicit permission.
            </P>

            <H3>2. User Responsibility</H3>
            <P>
              You are solely and exclusively responsible for ensuring that any download you initiate complies with
              applicable copyright law in your jurisdiction. The operator of this service does not verify, monitor,
              or control which content users choose to download.
            </P>

            <H3>3. No Storage of Copyrighted Content</H3>
            <P>
              This service does <strong className="text-white/70">not</strong> store, host, cache, or distribute any
              music files or other copyrighted content on its servers. Downloads are resolved transiently via
              third-party sources and transferred directly to your device. The operator never holds a copy of
              any downloaded file.
            </P>

            <H3>4. Third-Party Services</H3>
            <P>
              This service interacts with third-party platforms (including but not limited to Spotify, YouTube,
              Apple Music, Amazon Music, and various download providers). Your use of those platforms remains
              subject to their own terms of service. The operator has no affiliation with and accepts no
              responsibility for those platforms.
            </P>

            <H3>5. Prohibited Uses</H3>
            <Ul items={[
              'Downloading content you do not have the right to copy.',
              'Redistributing, selling, or publicly sharing downloaded content.',
              'Using the service in a way that violates applicable law.',
              'Automated or bulk use beyond reasonable personal use.',
            ]} />

            <H3>6. Availability</H3>
            <P>
              The service is provided "as is" without any guarantee of availability, accuracy, or fitness for a
              particular purpose. The operator reserves the right to change, suspend, or discontinue the service
              at any time without notice.
            </P>
          </Section>

          {/* Disclaimer */}
          <Section title="Disclaimer of Liability">
            <P>
              The operator accepts <strong className="text-white/70">no liability</strong> whatsoever for:
            </P>
            <Ul items={[
              'Any infringement of copyright or other intellectual-property rights resulting from a user\'s actions.',
              'The availability, accuracy, or legality of content obtained via third-party sources.',
              'Any damages — direct or indirect — arising from use of or inability to use this service.',
              'Loss of data, files, or any other content.',
            ]} />
            <P>
              By using this service, you acknowledge that any legal consequences arising from your downloads
              are your responsibility alone.
            </P>
          </Section>

          {/* DMCA */}
          <Section title="Copyright & DMCA">
            <P>
              This service does not host or store copyrighted content. If you believe that this service is
              being used in a manner that infringes your copyright, please send a written notice to the
              contact address below containing:
            </P>
            <Ul items={[
              'Identification of the copyrighted work you claim is being infringed.',
              'A description of where the alleged infringing activity occurs.',
              'Your contact information (name, address, e-mail, phone number).',
              'A statement that you have a good-faith belief that the use is not authorised.',
              'A statement under penalty of perjury that the information is accurate and that you are the rights holder or authorised to act on their behalf.',
            ]} />
          </Section>

          {/* Privacy */}
          <Section title="Privacy Policy">
            <H3>Data We Collect</H3>
            <P>
              This service is designed to collect as little data as possible.
            </P>
            <Ul items={[
              'Playlist URLs you submit are processed in memory to retrieve track metadata and are not stored persistently.',
              'Downloaded files are held temporarily on the server during processing and deleted immediately after you download the ZIP archive.',
              'Standard server access logs (IP address, timestamp, request path) may be retained for up to 7 days for security and debugging purposes.',
            ]} />

            <H3>Data We Do Not Collect</H3>
            <Ul items={[
              'We do not create user accounts or require registration.',
              'We do not use tracking cookies or analytics.',
              'We do not sell or share any data with third parties.',
            ]} />

            <H3>Third-Party Requests</H3>
            <P>
              To resolve playlist metadata and download files, your submitted URL is forwarded to third-party
              services (e.g. the Spotify API, YouTube). Those services may log the request according to their
              own privacy policies.
            </P>

            <H3>Your Rights (GDPR)</H3>
            <P>
              If you are located in the European Economic Area, you have the right to access, correct, or
              request deletion of any personal data we hold about you. Since we collect minimal data, there
              is typically nothing to provide. For any privacy-related requests, contact us at the address below.
            </P>
          </Section>

          {/* Impressum */}
          <Section title="Impressum (Legal Notice — DE/AT/CH)">
            <P className="text-white/40 text-[12px] italic">
              The following information is required by German, Austrian, and Swiss law (§ 5 TMG / § 25 MedienG).
              Replace the placeholder fields with your actual details before publishing.
            </P>
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/50 space-y-1 font-mono">
              <p>[Your Full Name or Company Name]</p>
              <p>[Street Address]</p>
              <p>[Postcode, City, Country]</p>
              <p className="pt-2">E-Mail: [your@email.com]</p>
            </div>
            <P className="mt-4">
              Responsible for content in accordance with § 55 Abs. 2 RStV: [Your Name], address as above.
            </P>
          </Section>

          {/* Last updated */}
          <p className="text-[11px] text-white/20 pt-4 border-t border-white/[0.05]">
            Last updated: May 2026
          </p>

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[15px] font-semibold text-white/80 tracking-[-0.2px] mb-4 pb-3 border-b border-white/[0.07]">
        {title}
      </h2>
      <div className="space-y-3 text-[13px] leading-relaxed text-white/55">
        {children}
      </div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-semibold text-white/70 mt-5 mb-1">{children}</h3>;
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={className}>{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i} className="relative before:content-['–'] before:absolute before:-left-4 before:text-white/25">
          {item}
        </li>
      ))}
    </ul>
  );
}
