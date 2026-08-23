"use client";

import Block from "@/components/orbit/block";
import EnvBadge from "@/components/orbit/env-badge";
import Inset from "@/components/orbit/inset";
import Section from "@/components/orbit/section";
import Kbd from "@/components/ui/kbd";
import { KEY_BINDING } from "@/lib/key-matcher";

export default function BadgesStorybook() {
  return (
    <Section>
      <Inset>
        <Block title="Environment badge">
          <div className="flex items-center gap-3">
            <span className="text-[13px]">prod-main</span>
            <EnvBadge environment="production" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px]">staging-eu</span>
            <EnvBadge environment="staging" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px]">local-dev</span>
            <EnvBadge environment={undefined} />
            <span className="text-[11px] text-muted-foreground">
              (unmarked renders nothing)
            </span>
          </div>
        </Block>

        <Block title="Kbd — keyboard hints">
          <div className="flex items-center gap-2 text-[13px]">
            Run query <Kbd>{KEY_BINDING.run.toString()}</Kbd>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            Command palette <Kbd>⌘K</Kbd>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            Close panel <Kbd>Esc</Kbd>
          </div>
          <p className="max-w-md text-[12px] text-muted-foreground">
            Always render key hints through Kbd, and always derive chords from
            KEY_BINDING so they read ⌘ on Mac and Ctrl elsewhere.
          </p>
        </Block>
      </Inset>
    </Section>
  );
}
