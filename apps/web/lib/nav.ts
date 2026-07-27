export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Mission Control", icon: "◈" },
  { href: "/agents", label: "AI Agents", icon: "⬡" },
  { href: "/tasks", label: "Tasks", icon: "☰" },
  { href: "/products", label: "Products", icon: "▣" },
  { href: "/orders", label: "Orders", icon: "⬢" },
  { href: "/analytics", label: "Analytics", icon: "▲" },
  { href: "/marketing", label: "Marketing", icon: "✦" },
  { href: "/media", label: "Media Library", icon: "▤" },
  { href: "/reports", label: "Reports", icon: "▦" },
  { href: "/notifications", label: "Notifications", icon: "◉" },
  { href: "/memory", label: "Memory", icon: "◍" },
  { href: "/automation", label: "Automation", icon: "⟲" },
  { href: "/marketplace", label: "Marketplace", icon: "⬒" },
  { href: "/logs", label: "Logs", icon: "▥" },
  { href: "/terminal", label: "Terminal", icon: "❯" },
  { href: "/api-keys", label: "API Keys", icon: "⚿" },
  { href: "/setup", label: "Setup Wizard", icon: "✧" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];
