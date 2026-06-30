import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Search, XCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

type VerifyResult = {
  valid: boolean;
  holderName?: string;
  type?: string;
  issuedAt?: string;
  expiresAt?: string;
  status?: string;
  certificateNumber?: string;
  badgeUrl?: string;
};

const certTypeLabel: Record<string, string> = {
  javarista_level_1: 'JavaRista Level 1',
  javarista_level_2: 'JavaRista Level 2',
  javarista_level_3: 'JavaRista Level 3',
  javarista_level_4: 'JavaRista Level 4',
  javarista_level_5: 'JavaRista Level 5',
  shift_supervisor: 'Shift Supervisor',
  store_manager: 'Store Manager',
  java_champion: 'Java Champion',
};

function typeLabel(type?: string) {
  return type ? (certTypeLabel[type] ?? type) : '—';
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function verifyCert(certNumber: string): Promise<VerifyResult> {
  const res = await axios.get<{ success: boolean; data: VerifyResult }>(
    `${API_BASE}/certifications/verify/${encodeURIComponent(certNumber)}`
  );
  return res.data.data;
}

export function CertificateVerifyPage() {
  const { certificateNumber } = useParams<{ certificateNumber?: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (certificateNumber) {
      void runVerify(certificateNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificateNumber]);

  async function runVerify(certNum: string) {
    setLoading(true);
    setResult(null);
    setNotFound(false);
    try {
      const data = await verifyCert(certNum);
      setResult(data);
      if (!data.valid && !data.holderName) {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const val = searchInput.trim();
    if (!val) return;
    navigate(`/verify/${encodeURIComponent(val)}`);
  }

  const isRevoked = result && !result.valid && result.holderName;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f1', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1a0a00', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: '#D62B2B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 18,
          }}>JT</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Java Times Caffè</div>
            <div style={{ color: '#c0392b', fontSize: 11, fontWeight: 600 }}>JavaRista Platform</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1a0a00', margin: 0 }}>Certificate Verification</h1>
          {certificateNumber && (
            <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>
              Verifying: <strong style={{ color: '#444' }}>{certificateNumber}</strong>
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', border: '3px solid #eee',
              borderTop: '3px solid #D62B2B', margin: '0 auto 16px',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: '#888' }}>Verifying certificate...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Not found */}
        {!loading && notFound && (
          <div style={{
            background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center',
            border: '1px solid #eee', boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}>
            <XCircle size={64} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ color: '#1a0a00', fontWeight: 800, margin: '0 0 8px' }}>Certificate Not Found</h2>
            <p style={{ color: '#888', margin: 0 }}>No certificate exists with this number.</p>
          </div>
        )}

        {/* Revoked */}
        {!loading && isRevoked && (
          <div style={{
            background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center',
            border: '1px solid #fca5a5', boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}>
            <XCircle size={64} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ color: '#ef4444', fontWeight: 800, margin: '0 0 8px' }}>Certificate Revoked</h2>
            <p style={{ color: '#888', marginBottom: 24 }}>This certificate has been revoked.</p>
            <div style={{ textAlign: 'left', background: '#fef2f2', borderRadius: 12, padding: 16 }}>
              <Row label="Holder" value={result?.holderName} />
              <Row label="Type" value={typeLabel(result?.type)} />
              <Row label="Issued" value={formatDate(result?.issuedAt)} />
            </div>
          </div>
        )}

        {/* Valid */}
        {!loading && result?.valid && (
          <div style={{
            background: '#fff', borderRadius: 16, padding: 40,
            border: '1px solid #bbf7d0', boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <CheckCircle2 size={64} color="#22c55e" style={{ margin: '0 auto 12px' }} />
              <h2 style={{ color: '#15803d', fontWeight: 800, margin: '0 0 4px' }}>Certificate Verified</h2>
              <p style={{ color: '#888', margin: 0 }}>This certificate is valid and active.</p>
            </div>

            {result.badgeUrl && (
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <img
                  src={result.badgeUrl}
                  alt="Badge"
                  style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #dcfce7' }}
                />
              </div>
            )}

            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16 }}>
              <Row label="Holder" value={result.holderName} />
              <Row label="Certificate #" value={result.certificateNumber} mono />
              <Row label="Type" value={typeLabel(result.type)} />
              <Row label="Issued Date" value={formatDate(result.issuedAt)} />
              {result.expiresAt && <Row label="Expiry Date" value={formatDate(result.expiresAt)} />}
            </div>
          </div>
        )}

        {/* Manual search */}
        <div style={{
          marginTop: 40, background: '#fff', borderRadius: 16, padding: 32,
          border: '1px solid #eee', boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ color: '#1a0a00', fontWeight: 700, margin: '0 0 16px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={16} /> Search by Certificate Number
          </h3>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. JT-2025-123456"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd',
                fontSize: 14, outline: 'none', fontFamily: 'monospace',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#D62B2B', color: '#fff', border: 'none', borderRadius: 10,
                padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Verify
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <span style={{ color: '#888', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#1a0a00', fontSize: 13, fontWeight: 600, fontFamily: mono ? 'monospace' : undefined }}>
        {value ?? '—'}
      </span>
    </div>
  );
}
