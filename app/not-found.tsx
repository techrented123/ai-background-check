// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="max-w-md text-center">
        {/* Illustration (optional) */}
        <svg
          className="mx-auto mb-6 w-32 h-32 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="32" cy="32" r="30" strokeWidth="4" />
          <line x1="20" y1="20" x2="44" y2="44" strokeWidth="4" />
          <line x1="44" y1="20" x2="20" y2="44" strokeWidth="4" />
        </svg>

        <h1 className="text-4xl font-extrabold text-gray-800 mb-2">
          404: Page Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          Oops! It seems like your token has expired.
        </p>
        <Link
          href="https://rented123.com/product/ai-background-check"
          target="_blank"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
        >
          Get a New One
        </Link>
      </div>
    </div>
  );
}
