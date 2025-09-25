export const MagicLinkEmail = ({ username }: { username: string }) => {
  return (
    <div className="font-sans max-w-[600px] mx-auto p-5">
      {(() => {
        const base = (process.env.SITE_URL || "").replace(/\/$/, "");
        const logoUrl = base ? `${base}/DialZero.svg` : "/DialZero.svg";
        return (
          <div className="mb-6 text-center">
            <img
              src={logoUrl}
              alt="Dial0 Logo"
              width={120}
              height={40}
              style={{ display: 'inline-block' }}
            />
          </div>
        );
      })()}
      <h1 className="text-black text-2xl font-semibold mb-5">
        Sign in to Dial0
      </h1>
      <p className="text-gray-800 text-base leading-relaxed mb-5">
        Hi {username},
      </p>
      <p className="text-gray-800 text-base leading-relaxed mb-5">
        You requested a magic link to sign in. Click the button in this email to continue. For your security this link will only work once and expires in 5 minutes.
      </p>
      <p className="text-gray-500 text-sm mt-8">
        Didn’t request this? You can safely ignore this email.
      </p>
      <hr className="border-t border-gray-200 my-8" />
      <p className="text-gray-400 text-xs text-center">
        Dial0 – Never take calls again
        <br />
      </p>
    </div>
  );
};
