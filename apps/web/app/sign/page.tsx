'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
          <p className="text-gray-600">No signing token provided.</p>
        </div>
      </div>
    );
  }

  let data: { tgUserId: number; intent: string; params?: Record<string, string>; exp: number };
  try {
    data = JSON.parse(atob(token));
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Token</h1>
          <p className="text-gray-600">The signing link is malformed.</p>
        </div>
      </div>
    );
  }

  if (data.exp < Date.now()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Link Expired</h1>
          <p className="text-gray-600">This signing link has expired. Please request a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Sign Transaction</h1>
        <div className="space-y-2 mb-6">
          <p>
            <strong>Intent:</strong> {data.intent}
          </p>
          {data.params &&
            Object.entries(data.params).map(([key, val]) => (
              <p key={key}>
                <strong>{key}:</strong> {String(val)}
              </p>
            ))}
        </div>
        <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition">
          Confirm &amp; Sign
        </button>
      </div>
    </div>
  );
}

export default function SignPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignContent />
    </Suspense>
  );
}
