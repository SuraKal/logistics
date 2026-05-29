import { makePreviewDataUrl } from "@/lib/media";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function PageBannerSlider({
  eyebrow,
  title,
  description,
  stats = [],
  slides = [],
}) {
  const safeSlides = slides.length > 0 ? slides : [{ title, subtitle: description, image: null }];

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.26)]">
      <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="p-6 sm:p-7 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-950 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">
            {description}
          </p>

          {stats.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={`${stat.label}-${stat.value}`}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{stat.value}</p>
                  {stat.hint && <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative border-t border-slate-200/70 bg-slate-50/80 p-3 sm:p-4 lg:border-l lg:border-t-0">
          <Carousel opts={{ loop: true }} className="w-full">
            <CarouselContent>
              {safeSlides.map((slide, index) => {
                const image = slide.image || slide.src || null;
                const slideImage = image || makePreviewDataUrl({
                  title: slide.title || title,
                  subtitle: slide.subtitle || description,
                  seed: slide.seed || slide.title || title,
                });

                return (
                  <CarouselItem key={`${slide.title || title}-${index}`}>
                    <div className="relative overflow-hidden rounded-[1.75rem]">
                      <img
                        src={slideImage}
                        alt={slide.alt || slide.title || title}
                        onError={(event) => {
                          event.currentTarget.src = makePreviewDataUrl({
                            title: slide.title || title,
                            subtitle: slide.subtitle || description,
                            seed: slide.seed || slide.title || title,
                          });
                        }}
                        className="h-[280px] w-full object-cover sm:h-[340px]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/72 via-slate-950/16 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 backdrop-blur">
                            {slide.badge || "Logistics"}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                            {String(index + 1).padStart(2, "0")} / {String(safeSlides.length).padStart(2, "0")}
                          </span>
                        </div>
                        <h3 className="mt-4 max-w-lg text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                          {slide.title}
                        </h3>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-white/78">
                          {slide.subtitle}
                        </p>
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {safeSlides.length > 1 && (
              <>
                <CarouselPrevious className="left-4 top-1/2 z-10 border-white/60 bg-white/90 text-slate-900 shadow-sm hover:bg-white" />
                <CarouselNext className="right-4 top-1/2 z-10 border-white/60 bg-white/90 text-slate-900 shadow-sm hover:bg-white" />
              </>
            )}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
