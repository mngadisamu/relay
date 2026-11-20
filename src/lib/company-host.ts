// Works out which company a visit is for, from its address (story P7).
// With RELAY_BASE_DOMAIN=relay.example:
//   kopano.relay.example        -> "kopano"
//   kopano.relay.example:3000   -> "kopano"
//   relay.example, www.relay.example, other.com, a.b.relay.example -> null
// When RELAY_BASE_DOMAIN is not set, every address gives null, so nothing changes.
export function companySlugFromHost(host: string | null, baseDomain: string | undefined): string | null {
  if (!host || !baseDomain) return null;
  const hostname = host.split(":")[0].toLowerCase();
  const base = baseDomain.trim().toLowerCase();
  if (!base || !hostname.endsWith("." + base)) return null;
  const label = hostname.slice(0, -(base.length + 1));
  if (!label || label.includes(".") || label === "www") return null;
  return label;
}
