import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Shield, Smartphone, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSectionImage } from "@/lib/section-images";
import { makePreviewDataUrl } from "@/lib/media";

const highlights = [
  "Track client cargo, fleet trucks, garage work, and drivers in one place.",
  "Keep dispatch, mechanics, and drivers in separate work lanes.",
  "Move daily loads with fewer clicks and clearer handoffs.",
];

const sections = [
  {
    key: "vehicles",
    title: "Vehicles",
    text: "See heavy trucks, mileage, and service status at a glance.",
  },
  {
    key: "trips",
    title: "Trips",
    text: "Plan a client load, assign a truck, and follow it to delivery.",
  },
  {
    key: "garage",
    title: "Garage",
    text: "Open a truck repair job and keep parts and notes together.",
  },
  {
    key: "drivers",
    title: "Drivers",
    text: "Keep driver records, licenses, and documents easy to find.",
  },
];

function SectionCard({ title, text, imageKey }) {
  const image = getSectionImage(imageKey);
  return (
    <Link
      to="/login"
      className="group overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.2)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_-34px_rgba(15,23,42,0.24)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={image.src}
          alt={image.alt}
          onError={(event) => {
            event.currentTarget.src = makePreviewDataUrl({
              title,
              subtitle: image.subtitle,
              seed: imageKey,
            });
          }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/12 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
            Section
          </p>
          <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
            {title}
          </h3>
        </div>
      </div>
      <div className="flex items-start justify-between gap-4 p-5">
        <p className="text-sm leading-6 text-slate-500">{text}</p>
        <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
      </div>
    </Link>
  );
}

export default function Landing() {
  const heroImage = getSectionImage("hero");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_44%,#eef5ff_100%)]">
      <div className="page-shell">
        <header className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.65)]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
                Fleet app
              </p>
              <h1 className="text-base font-semibold text-slate-950">Logistics dashboard</h1>
            </div>
          </div>

          <Button asChild className="h-11 rounded-full px-5">
            <Link to="/login">Login</Link>
          </Button>
        </header>

        <section className="mt-8 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              <Shield className="h-3.5 w-3.5" />
              Demo logistics system
            </div>
            <h2 className="max-w-2xl text-4xl font-bold tracking-[-0.06em] text-slate-950 sm:text-5xl">
              One logistics board for moving goods every day.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-500">
              This platform helps a transport company track client cargo, dispatch heavy
              trucks, manage garage work, and keep driver records in one place. Sign in,
              pick your role, and stay focused on the next load.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6">
                <Link to="/login">Login</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-full px-6"
              >
                <a href="#sections">Explore sections</a>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.2)]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  <p className="text-sm leading-6 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-sky-200/50 blur-3xl" />
            <div className="absolute -bottom-8 right-6 h-32 w-32 rounded-full bg-blue-200/50 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white p-4 shadow-[0_36px_120px_-56px_rgba(15,23,42,0.35)]">
              <div className="overflow-hidden rounded-[1.5rem]">
                <img
                  src={heroImage.src}
                  alt={heroImage.alt}
                  onError={(event) => {
                    event.currentTarget.src = makePreviewDataUrl({
                      title: heroImage.title,
                      subtitle: heroImage.subtitle,
                      seed: "hero",
                    });
                  }}
                  className="h-[340px] w-full object-cover sm:h-[420px]"
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Client loads
                  </p>
                  <p className="mt-2 text-sm text-slate-300">See what is moving and where.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Garage work
                  </p>
                  <p className="mt-2 text-sm text-slate-600">Log repairs, parts, and status.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Driver records
                  </p>
                  <p className="mt-2 text-sm text-slate-600">Keep documents and trip history close.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="sections" className="mt-10 pb-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                What the system covers
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                Clear sections for dispatch, garage, and fleet control.
              </h3>
            </div>
            <div className="hidden items-center gap-2 text-sm text-slate-400 md:flex">
              <Smartphone className="h-4 w-4" />
              Built for dispatch desks and driver screens
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {sections.map((section) => (
              <SectionCard
                key={section.key}
                imageKey={section.key}
                title={section.title}
                text={section.text}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
