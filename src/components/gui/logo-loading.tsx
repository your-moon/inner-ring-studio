export default function LogoLoading() {
  return (
    <div className="flex gap-2 items-center">
      <div className="w-12 h-12 bg-black dark:bg-white items-center justify-center flex rounded-lg text-white dark:text-black">
        <svg
          className="w-8 h-8"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Inner Ring Studio</h1>
      </div>
    </div>
  );
}
