import Link from "next/link";
import BrandLogo from "@/components/layout/BrandLogo";

const columns = [
  {
    title: "Platform",
    links: [
      { href: "/battles", label: "Roast Battles" },
      { href: "/leaderboard", label: "Leaderboards" },
      { href: "/groups", label: "Rage Groups" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Sign up" },
      { href: "/profile", label: "Profile" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "#", label: "Code of Conduct" },
      { href: "#", label: "AI Moderation Policy" },
      { href: "#", label: "Report a Problem" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo size="sm" />
            <p className="mt-3 max-w-xs text-sm text-white/50">
              Win the roast. Claim the Aura. A competitive platform for humor,
              wit, and creativity — kept fair by AI moderation.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-white">{col.title}</p>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 transition hover:text-white/65"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/8 pt-6 text-xs text-white/40">
          © {new Date().getFullYear()} Ragebait. All Aura earned, none for sale.
        </div>
      </div>
    </footer>
  );
}
