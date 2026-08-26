type BlockProps = {
  children: React.ReactNode
  title?: string
}

const Block = ({ children, title }: BlockProps) => {
  return (
    <>
      {title && (
        <header>
          <h2 className="mt-10 mb-4 text-heading-medium font-semibold tracking-[var(--tracking-heading)]">
            {title}
          </h2>
        </header>
      )}
      <div className="flex aspect-video w-full items-center justify-center gap-4 rounded-[var(--radius-panel)] border border-border-default bg-surface-canvas p-10 transition-colors">
        {children}
      </div>
    </>
  )
}

export default Block
