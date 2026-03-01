'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F0E8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <p style={{ fontSize: 56, margin: '0 0 16px' }}>⚠️</p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#3D2B1F',
            margin: '0 0 8px',
            fontFamily: 'Georgia, serif',
          }}
        >
          Something went wrong
        </h1>
        <p style={{ fontSize: 15, color: '#3D2B1F99', margin: '0 0 28px' }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            backgroundColor: '#C4622D',
            color: '#FFFFFF',
            padding: '12px 28px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
