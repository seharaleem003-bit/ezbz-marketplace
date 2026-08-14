import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="August 13, 2026">
      <LegalSection title="1. Overview">
        <p>
          This policy explains what EZBZ Marketplace (&ldquo;EZBZ&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;) collects when you use our website and services, why we collect it,
          who we share it with, and the choices you have. It applies to buyers, sellers, service
          providers, and visitors.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>We collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Account information</strong> — name, email address, and password (stored
            only as a salted hash, never in plain text).
          </li>
          <li>
            <strong>Transaction information</strong> — orders, shipping and billing addresses,
            order status, refunds, and store credit balances.
          </li>
          <li>
            <strong>Seller and provider information</strong> — business name, service area,
            payout onboarding status, and identity or background-check verification status.
          </li>
          <li>
            <strong>Content you submit</strong> — listings, photos, videos, support messages,
            and applications.
          </li>
          <li>
            <strong>Technical information</strong> — IP address, browser type, device
            information, and pages viewed.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Payment information">
        <p>
          <strong>We do not collect or store your full card number.</strong> Payments are
          processed by Stripe, and card details are submitted directly to Stripe&rsquo;s secure
          checkout. We receive only limited information such as the last four digits, card
          brand, and whether the payment succeeded. Stripe&rsquo;s handling of your data is
          governed by its own privacy policy.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use your information">
        <ul>
          <li>To create and maintain your account and authenticate you</li>
          <li>To process orders, payments, refunds, shipping, and seller payouts</li>
          <li>To display listings, Deal Score&trade; ratings, and price comparisons</li>
          <li>To send transactional email such as order confirmations and shipping updates</li>
          <li>To respond to support requests and resolve disputes</li>
          <li>To detect fraud, abuse, and violations of our Terms of Service</li>
          <li>To meet legal, tax, and accounting obligations</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Who we share information with">
        <p>
          We do not sell your personal information. We share it only with service providers who
          need it to operate the marketplace:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> — payment processing, seller payouts, and identity
            verification
          </li>
          <li>
            <strong>Shipping and fulfillment partners</strong> — to generate labels and deliver
            orders
          </li>
          <li>
            <strong>Email providers</strong> — to deliver transactional messages
          </li>
          <li>
            <strong>Background-check providers</strong> — for service providers who opt into
            verification
          </li>
        </ul>
        <p>
          When you place an order, the seller receives the shipping details needed to fulfill
          it. We may also disclose information where required by law, to enforce our terms, or
          to protect the rights and safety of our users.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies">
        <p>
          We use cookies that are necessary for the site to function — keeping you signed in and
          remembering the contents of a guest cart. Blocking these will prevent sign-in and
          checkout from working.
        </p>
      </LegalSection>

      <LegalSection title="7. Data retention">
        <p>
          We keep account and transaction records for as long as your account is active and
          afterwards for as long as needed to meet legal, tax, accounting, and dispute-resolution
          obligations. Support messages are retained for a reasonable period for quality and
          fraud-prevention purposes.
        </p>
      </LegalSection>

      <LegalSection title="8. Your rights and choices">
        <p>
          Depending on where you live, you may have the right to access, correct, export, or
          delete your personal information, and to object to or restrict certain processing. You
          can update your account details at any time from your account pages, or contact us
          using the details below to make a request. We will not discriminate against you for
          exercising these rights.
        </p>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>
          We protect your information using encryption in transit, hashed password storage, and
          access controls limiting who can view personal data. No system is perfectly secure, so
          we cannot guarantee absolute security — please use a strong, unique password and let us
          know immediately if you suspect unauthorized access to your account.
        </p>
      </LegalSection>

      <LegalSection title="10. Children">
        <p>
          EZBZ is not intended for anyone under 18, and we do not knowingly collect personal
          information from children. If we learn that we have, we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to this policy">
        <p>
          We may update this policy from time to time. When we make material changes we will
          revise the &ldquo;Last updated&rdquo; date above and, where appropriate, notify you by
          email or through the site.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact us">
        <p>
          Questions about this policy or your data? Reach us through our{" "}
          <a href="/contact">contact page</a> and we will respond by email.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
