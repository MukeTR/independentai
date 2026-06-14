export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Tam ekran; chrome'u her sayfa kendi içinde kurar (AuthSplit / AuthCentered).
  return <div className="min-h-screen bg-paper">{children}</div>;
}
