export const ResetPasswordEmail = ({ username }: { username: string }) => {
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
        Reset your password
      </h1>
      <p className="text-gray-800 text-base leading-relaxed mb-5">
        Hello {username},
      </p>
      <p className="text-gray-800 text-base leading-relaxed mb-5">
        We received a request to reset your Dial0 password. Click the button below to choose a new one. This link will expire in 1 hour.
      </p>
      <p className="text-gray-500 text-sm mt-8">
        If you didn’t request a password reset, you can ignore this email. Your password will remain unchanged.
      </p>
      <hr className="border-t border-gray-200 my-8" />
      <p className="text-gray-400 text-xs text-center">
        Dial0 – Never take calls again
        <br />
      </p>
    </div>
  );
};
