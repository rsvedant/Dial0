export const Email = ({ username }: { username: string }) => {
    return (
        <div className="font-sans max-w-[600px] mx-auto p-5">
            <h1 className="text-black text-2xl font-semibold mb-5">
                Welcome to Dial0
            </h1>

            <p className="text-gray-800 text-base leading-relaxed mb-5">
                Hello, {username}!
            </p>

            <p className="text-gray-800 text-base leading-relaxed mb-5">
                Thank you for joining Dial0! Please confirm your email address to
                complete your signup.
            </p>

            <p className="text-gray-500 text-sm mt-8">
                This link will expire in 24 hours.
            </p>

            <hr className="border-t border-gray-200 my-8" />

            <p className="text-gray-400 text-xs text-center">
                Dial0 - Never take calls again
                <br />
            </p>
        </div>
    )
}