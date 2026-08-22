import WebsiteLayout from "@/components/website-layout";
import { WEBSITE_NAME } from "@/const";

export default function TermPage() {
  return (
    <WebsiteLayout>
      <div className="container mx-auto my-12 flex max-w-3xl flex-col gap-4">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-sm text-neutral-500">Last updated: August 22, 2026</p>

        <p>
          {`These Terms of Service ("Terms") govern your access to and use of ${WEBSITE_NAME} (the "Service"), a database workspace for browsing, querying, and editing your own databases. By creating an account or otherwise using the Service, you agree to these Terms. If you are using the Service on behalf of an organization, you agree on its behalf and represent that you have authority to do so.`}
        </p>

        <h2 className="text-lg font-bold">1. The Service</h2>
        <p>
          {`${WEBSITE_NAME} lets you connect to databases you control and run queries, browse data, edit records, and build dashboards. It is offered as a hosted cloud service, as software you can self-host, and as a desktop application. Features vary by edition, and we may add, change, or remove features over time.`}
        </p>

        <h2 className="text-lg font-bold">2. Your Account</h2>
        <p>
          You are responsible for the credentials to your account and for all
          activity under it. Keep your password secure and notify us promptly of
          any unauthorized use. You must provide accurate information and be old
          enough to form a binding contract in your jurisdiction.
        </p>

        <h2 className="text-lg font-bold">3. Your Data and Databases</h2>
        <p>
          You retain all rights to the databases you connect and the data they
          contain (&quot;Your Content&quot;). You are solely responsible for
          having the legal right to access those databases and for the
          consequences of the queries and edits you run through the Service. You
          are responsible for maintaining your own backups; the Service is not a
          backup solution.
        </p>

        <h2 className="text-lg font-bold">4. Connection Credentials</h2>
        <p>
          Database connection details you save are encrypted. In the self-hosted
          and desktop editions they never leave your own infrastructure or
          machine. In the cloud edition they are stored encrypted and used only
          to execute the operations you request. You are responsible for scoping
          the database accounts you connect — for example, using read-only or
          least-privilege credentials where appropriate.
        </p>

        <h2 className="text-lg font-bold">5. Acceptable Use</h2>
        <p>You agree not to use the Service to:</p>
        <ul className="ml-6 list-disc">
          <li>access data or systems you are not authorized to access;</li>
          <li>violate any law or the rights of others;</li>
          <li>
            interfere with, disrupt, or attempt to gain unauthorized access to
            the Service or its infrastructure;
          </li>
          <li>
            reverse engineer or circumvent security or access controls, except
            to the extent this restriction is prohibited by applicable law; or
          </li>
          <li>
            resell or provide the hosted Service to third parties except as
            expressly permitted.
          </li>
        </ul>

        <h2 className="text-lg font-bold">6. Availability</h2>
        <p>
          We work to keep the cloud Service available and reliable, but it is
          provided on an &quot;as is&quot; and &quot;as available&quot; basis. We
          may perform maintenance, and features may be temporarily unavailable.
          Self-hosted and desktop editions run in environments you control, and
          their availability is your responsibility.
        </p>

        <h2 className="text-lg font-bold">7. Disclaimers</h2>
        <p>
          To the maximum extent permitted by law, the Service is provided without
          warranties of any kind, whether express or implied, including
          merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Service will be
          uninterrupted or error-free, or that any query will produce a
          particular result. You are responsible for reviewing the effect of
          destructive operations before you run them.
        </p>

        <h2 className="text-lg font-bold">8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, {WEBSITE_NAME} and its
          operators will not be liable for any indirect, incidental, special,
          consequential, or punitive damages, or for any loss of data, profits,
          or revenue, arising out of or related to your use of the Service. Our
          total liability for any claim will not exceed the amount you paid us
          for the Service in the twelve months before the claim.
        </p>

        <h2 className="text-lg font-bold">9. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate
          access if you materially breach these Terms or use the Service in a way
          that risks harm to others or to the Service. On termination, your right
          to use the hosted Service ends; you remain responsible for exporting
          any content you wish to keep before termination takes effect.
        </p>

        <h2 className="text-lg font-bold">10. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material
          changes, we will take reasonable steps to notify you. Your continued
          use of the Service after the changes take effect constitutes acceptance
          of the revised Terms.
        </p>

        <p>
          By using the Service, you acknowledge that you have read and understood
          these Terms.
        </p>
      </div>
    </WebsiteLayout>
  );
}
