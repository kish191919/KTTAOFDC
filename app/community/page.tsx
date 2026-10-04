import { venues, venuesIntro } from "@/lib/content/venues";
import { pageMetadata } from "@/lib/metadata";
import { CommunityTabs } from "@/components/CommunityTabs";
import { PageHeader } from "@/components/PageHeader";
import { ClockIcon, GlobeIcon, InfoIcon, MapPinIcon, PhoneIcon } from "@/components/icons";

export const metadata = pageMetadata({
  title: "탁구 장소",
  description: "북버지니아에서 탁구를 칠 수 있는 장소와 시간, 연락처를 안내합니다.",
});

const mapUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

export default function VenuesPage() {
  return (
    <>
      <PageHeader eyebrow="Community" title="탁구 장소" description={venuesIntro}>
        <CommunityTabs current="/community" />
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-14">
        <ul className="grid gap-6 md:grid-cols-2">
          {venues.map((venue) => (
            <li key={venue.name} className="card flex flex-col p-6 md:p-7">
              <h2 className="text-xl font-black break-keep text-brand-950">{venue.name}</h2>
              {venue.subtitle && (
                <p className="mt-1 text-sm break-keep text-slate-500">{venue.subtitle}</p>
              )}

              <dl className="mt-5 space-y-3 text-[15px] text-slate-700">
                {venue.hours && (
                  <div className="flex gap-3">
                    <dt className="mt-0.5 shrink-0 text-brand-600">
                      <ClockIcon className="size-[18px]" />
                      <span className="sr-only">시간</span>
                    </dt>
                    <dd>
                      {venue.hours.map((line) => (
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
                    <span className="sr-only">주소</span>
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
                      <span className="sr-only">연락처</span>
                    </dt>
                    <dd className="break-keep">{venue.contact}</dd>
                  </div>
                )}
                {venue.website && (
                  <div className="flex gap-3">
                    <dt className="mt-0.5 shrink-0 text-brand-600">
                      <GlobeIcon className="size-[18px]" />
                      <span className="sr-only">홈페이지</span>
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
                  {venue.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
