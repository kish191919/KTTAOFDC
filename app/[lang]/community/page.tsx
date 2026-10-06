import type { Metadata } from "next";
import { venues, venuesIntro } from "@/lib/content/venues";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { CommunityTabs } from "@/components/CommunityTabs";
import { PageHeader } from "@/components/PageHeader";
import { VenueCard } from "@/components/VenueCard";
import { ClockIcon, GlobeIcon, InfoIcon, MapPinIcon, PhoneIcon } from "@/components/icons";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const d = getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/community",
    title: d.community.venues,
    description: d.venues.metaDescription,
  });
}

const mapUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

export default async function VenuesPage({ params }: Props) {
  const lang = await readLang(params);
  const d = getDictionary(lang);
  const t = d.venues;

  return (
    <>
      <PageHeader
        eyebrow={d.community.eyebrow}
        title={d.community.venues}
        description={venuesIntro[lang]}
      >
        <CommunityTabs lang={lang} current="/community" />
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-14">
        <ul className="grid gap-3 md:grid-cols-2 md:gap-6">
          {venues.map((venue) => (
            <VenueCard
              key={venue.address}
              name={venue.name[lang]}
              subtitle={venue.subtitle?.[lang] || undefined}
            >
              <dl className="space-y-3 text-[15px] text-slate-700">
                {venue.hours && (
                  <div className="flex gap-3">
                    <dt className="mt-0.5 shrink-0 text-brand-600">
                      <ClockIcon className="size-[18px]" />
                      <span className="sr-only">{t.hours}</span>
                    </dt>
                    <dd>
                      {venue.hours[lang].map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                <div className="flex gap-3">
                  <dt className="mt-0.5 shrink-0 text-brand-600">
                    <MapPinIcon className="size-[18px]" />
                    <span className="sr-only">{t.address}</span>
                  </dt>
                  <dd>
                    <a
                      href={mapUrl(venue.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-brand-200 underline-offset-2 hover:text-brand-700 hover:decoration-brand-700"
                    >
                      {venue.address}
                    </a>
                  </dd>
                </div>
                {venue.contact && (
                  <div className="flex gap-3">
                    <dt className="mt-0.5 shrink-0 text-brand-600">
                      <PhoneIcon className="size-[18px]" />
                      <span className="sr-only">{t.contact}</span>
                    </dt>
                    <dd className="break-keep">{venue.contact[lang]}</dd>
                  </div>
                )}
                {venue.website && (
                  <div className="flex gap-3">
                    <dt className="mt-0.5 shrink-0 text-brand-600">
                      <GlobeIcon className="size-[18px]" />
                      <span className="sr-only">{t.website}</span>
                    </dt>
                    <dd className="min-w-0">
                      <a
                        href={venue.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium break-all text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-700"
                      >
                        {hostOf(venue.website)}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {venue.note && (
                <p className="mt-5 flex gap-2.5 rounded-xl bg-brand-50 p-4 text-sm leading-relaxed break-keep text-slate-600">
                  <InfoIcon className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  {venue.note[lang]}
                </p>
              )}
            </VenueCard>
          ))}
        </ul>
      </div>
    </>
  );
}
