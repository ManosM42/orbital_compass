import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/Chrome";
import { useConsent } from "@/components/consent/ConsentProvider";
import { ADS_ENABLED } from "@/lib/ads-config";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy, Cookies & Advertising — ORBITAL" },
      {
        name: "description",
        content:
          "How ORBITAL handles your observer location, local caching of orbital element sets, cookies and Google AdSense advertising consent.",
      },
      { property: "og:title", content: "Privacy, Cookies & Advertising — ORBITAL" },
      {
        property: "og:description",
        content:
          "Observer location stays on your device. Advertising only loads after you consent, and your choice can be changed at any time.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel mt-4 rounded-2xl p-6">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  const { openManager, choice } = useConsent();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Legal"
        title="Privacy, cookies & advertising"
        description="What ORBITAL stores, what stays on your device, and how advertising consent works."
      />

      <Section title="Your location">
        <p>
          Observer coordinates — from browser geolocation or entered manually — are used only in
          your browser to compute look angles and passes with SGP4. They are stored in local
          storage on your device and are never uploaded to ORBITAL or shared with advertisers.
        </p>
      </Section>

      <Section title="Local storage">
        <p>
          ORBITAL caches published orbital element sets, your chosen observer location, the
          intro-sequence flag and your advertising choice in your browser's local storage. Clearing
          site data removes all of it.
        </p>
      </Section>

      <Section title="Advertising and cookies">
        {ADS_ENABLED ? (
          <>
            <p>
              ORBITAL uses Google AdSense on a small number of reference pages. No advertising
              script is loaded and no ad request is made until you make a choice. Google Consent
              Mode signals are set to denied by default and only updated after you decide.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Accept all</strong> — personalised ads; Google
                may set cookies and use ad identifiers.
              </li>
              <li>
                <strong className="text-foreground">Non-personalised ads</strong> — ads are
                requested with personalisation disabled (no profiling for ad selection).
              </li>
              <li>
                <strong className="text-foreground">Reject</strong> — the AdSense script is never
                loaded and no ad request is made.
              </li>
            </ul>
            <p>
              Current choice:{" "}
              <span className="text-foreground">{choice ?? "not set"}</span>.{" "}
              <button
                onClick={openManager}
                className="text-foreground underline underline-offset-4"
              >
                Change advertising preferences
              </button>
            </p>
          </>
        ) : (
          <p>
            Advertising is not enabled on this deployment: no advertising script is loaded and no
            advertising cookies are set.
          </p>
        )}
      </Section>

      <Section title="No accounts, no tracking analytics">
        <p>
          ORBITAL has no user accounts and runs no analytics tag. Element-set requests go through
          ORBITAL's server-side proxy to public providers such as CelesTrak; those providers see
          the proxy, not you.
        </p>
      </Section>
    </div>
  );
}
