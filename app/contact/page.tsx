import { ContactForm } from "@/app/contact/contact-form";

export const metadata = {
  title: "Contact Us",
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="text-3xl font-heading font-semibold">Contact Us</h1>
      <p className="mt-2 text-muted-foreground">
        Have a question about an order or a listing? Send us a message and we&apos;ll reply
        by email.
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
