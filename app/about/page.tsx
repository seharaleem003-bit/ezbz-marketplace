export const metadata = {
  title: "About Us",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
      <h1 className="text-3xl font-heading font-semibold">About EZBZ</h1>
      <p className="mt-4 text-muted-foreground">
        EZBZ Marketplace connects shoppers with discounted inventory at real
        discounts. Every listing carries a Deal Score™ so you know at a glance how good the
        deal really is, backed by Amazon price comparisons and video walkarounds.
      </p>
    </div>
  );
}
