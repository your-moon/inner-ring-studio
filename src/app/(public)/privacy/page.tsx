import WebsiteLayout from "@/components/website-layout";
import { WEBSITE_NAME } from "@/const";

export default function PrivacyPage() {
  return (
    <WebsiteLayout>
      <div className="container mx-auto my-12 flex max-w-3xl flex-col gap-4">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-neutral-500">Last updated: August 22, 2026</p>

        <p>
          {`This Privacy Policy explains what information ${WEBSITE_NAME} (the "Service") collects, how it is used, and the choices you have. It applies to the hosted cloud edition. In the self-hosted and desktop editions, your data stays within your own infrastructure or on your own machine, and this policy describes only the limited information the software itself handles.`}
        </p>

        <h2 className="text-lg font-bold">1. Information We Collect</h2>
        <ul className="ml-6 list-disc">
          <li>
            <strong>Account information</strong> — the email address and password
            hash you use to sign in, and your workspace membership.
          </li>
          <li>
            <strong>Connection metadata</strong> — the connections you save
            (name, database type, host, and options). Connection secrets such as
            passwords are stored encrypted.
          </li>
          <li>
            <strong>Content you create</strong> — saved queries, dashboards,
            scheduled queries, and comments.
          </li>
          <li>
            <strong>Usage and diagnostic data</strong> — basic logs needed to
            operate and secure the Service, such as request timing and error
            events.
          </li>
        </ul>

        <h2 className="text-lg font-bold">2. Your Database Contents</h2>
        <p>
          The Service executes the queries you run against databases you connect,
          and returns their results to your session so you can view and edit
          them. The cloud edition does not durably store the contents of your
          databases beyond what is necessary to run a request and return its
          result, except for content you deliberately save (such as a query
          result attached to a dashboard).
        </p>

        <h2 className="text-lg font-bold">3. How We Use Your Information</h2>
        <ul className="ml-6 list-disc">
          <li>to provide, maintain, and secure the Service;</li>
          <li>to authenticate you and enforce access control;</li>
          <li>to run the queries and operations you request;</li>
          <li>to diagnose problems and improve reliability; and</li>
          <li>to communicate with you about the Service.</li>
        </ul>
        <p>We do not sell your personal information.</p>

        <h2 className="text-lg font-bold">4. Data Security</h2>
        <p>
          Connection secrets are encrypted at rest. Access to the Service
          requires authentication, and we take reasonable technical and
          organizational measures to protect the information we hold. No method
          of transmission or storage is completely secure, and you are
          responsible for scoping the database credentials you connect (for
          example, using least-privilege or read-only accounts where
          appropriate).
        </p>

        <h2 className="text-lg font-bold">5. Service Providers</h2>
        <p>
          The cloud edition may rely on infrastructure and email providers to
          operate — for example, to host the Service and to send account and
          notification emails. These providers process information only as needed
          to provide their services to us. The self-hosted and desktop editions
          do not send your data to us.
        </p>

        <h2 className="text-lg font-bold">6. Data Retention</h2>
        <p>
          We retain account information and content you save for as long as your
          account is active or as needed to provide the Service. You may delete
          content you have created, and you may request deletion of your account,
          after which we will remove associated data within a reasonable period
          except where retention is required by law.
        </p>

        <h2 className="text-lg font-bold">7. Your Rights</h2>
        <p>
          Depending on your location, you may have rights regarding your personal
          information:
        </p>
        <ul className="ml-6 list-disc">
          <li>Access — request a copy of your personal information.</li>
          <li>Correction — ask us to fix inaccurate information.</li>
          <li>Deletion — request deletion of your personal information.</li>
          <li>
            Objection — object to certain processing of your personal
            information.
          </li>
        </ul>

        <h2 className="text-lg font-bold">8. Children</h2>
        <p>
          The Service is not directed to children and is not intended for use by
          anyone under the age required to consent to online services in their
          jurisdiction.
        </p>

        <h2 className="text-lg font-bold">9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make
          material changes, we will take reasonable steps to notify you, and the
          &quot;Last updated&quot; date above will change.
        </p>

        <p>
          By using the Service, you acknowledge that you have read and understood
          this Privacy Policy.
        </p>
      </div>
    </WebsiteLayout>
  );
}
