import { PropsWithChildren } from "react";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";

async function Topbar() {
  return (
    <header>
      <div className="mx-auto container flex">
        <Link href="/">
          <h1 className="text-lg py-2 text-white">
            Inner Ring <strong>Studio</strong>
          </h1>
        </Link>
        <div className="grow flex items-center ml-3">
          <NavigationMenu className="hidden md:block">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link
                  href="/playground"
                  passHref
                  className={navigationMenuTriggerStyle()}
                >
                  Playground
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="pr-4 flex items-center pt-1">
          <a
            className="github-button"
            href="https://github.com/your-moon/inner-ring-studio"
            data-color-scheme="no-preference: dark; light: light; dark: dark;"
            data-size="large"
            data-show-count="true"
            aria-label="Star your-moon/inner-ring-studio on GitHub"
          ></a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <div className="py-4 text-sm mx-auto container px-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="mb-8">
          <h1 className="text-lg text-white">
            Inner Ring <strong>Studio</strong>
          </h1>
          <p>© 2026 Inner Ring Studio — a fork of Outerbase Studio (© Outerbase Inc.)</p>
        </div>

        <div className="mb-8">
          <div className="font-bold">Developers</div>
          <ul className="flex flex-col gap-1 mt-3">
            <li>
              <Link href="/docs" className="hover:underline">
                Documentation
              </Link>
            </li>
            <li>
              <Link
                href="https://discord.gg/7zfESKF6Qp"
                className="hover:underline"
              >
                Community
              </Link>
            </li>
          </ul>
        </div>

        <div className="mb-8">
          <div className="font-bold">Legal & Compliance</div>
          <ul className="flex flex-col gap-1 mt-3">
            <li>
              <Link href="/terms" className="hover:underline">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function WebsiteLayout({ children }: PropsWithChildren) {
  return (
    <main className="bg-black">
      <Topbar />
      {children}
      <Footer />
    </main>
  );
}
