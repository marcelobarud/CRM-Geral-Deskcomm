import { beforeEach, describe, expect, it, vi } from "vitest";
const dns = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup: dns, default: { lookup: dns } }));
import { assertUrlDeMidiaSegura } from "@/lib/messaging/media/url-de-midia-externa";
import { isMediaPathOwnedBy, isSafeMediaFilename } from "@/lib/messaging/media/upload-validation";
import { ipEhEspecial } from "@/lib/automation/outbound-ip";

describe("mídia externa anti-SSRF", () => {
  beforeEach(() => { dns.mockReset().mockResolvedValue([{ address: "8.8.8.8" }]); });
  it("permite destino público resolvido", async () => {
    await expect(assertUrlDeMidiaSegura("https://cdn.example.org/a.pdf")).resolves.toBeUndefined();
  });
  it.each(["http://localhost/a", "https://127.0.0.1/a", "https://[::1]/a", "https://10.1.1.1/a",
    "https://172.16.0.1/a", "https://192.168.0.1/a", "https://169.254.169.254/a",
    "file:///secret", "ftp://example.org/a", "invalid", "https://user:pass@example.org/a",
    "https://2130706433/a", "https://0x7f000001/a", "https://[::ffff:127.0.0.1]/a"])("rejeita %s", async url => {
    await expect(assertUrlDeMidiaSegura(url)).rejects.toThrow(/unsafe_url/);
  });
  it.each(["10.0.0.3", "172.31.255.255", "192.168.3.2", "169.254.1.2", "100.64.0.1",
    "0:0:0:0:0:0:0:1", "::ffff:7f00:1", "::ffff:0a00:1", "febf::1", "fc00::1"])("rejeita DNS privado %s", async address => {
    dns.mockResolvedValue([{ address: "8.8.8.8" }, { address }]);
    await expect(assertUrlDeMidiaSegura("https://example.org/a")).rejects.toThrow(/unsafe_url/);
    expect(ipEhEspecial(address)).toBe(true);
  });
  it("falha fechado com DNS vazio ou indisponível", async () => {
    dns.mockResolvedValue([]);
    await expect(assertUrlDeMidiaSegura("https://example.org/a")).rejects.toThrow(/dns_empty/);
    dns.mockRejectedValue(new Error("offline"));
    await expect(assertUrlDeMidiaSegura("https://example.org/a")).rejects.toThrow(/dns_failed/);
  });
});
describe("posse de mídia sem traversal", () => {
  it.each(["../../x", "..\\..\\x", "/absolute", "x/y", "x\\y", "..", ".", "",
    "%2e%2e%2fx", "%252e%252e", "．．／x", "x\u202eexe.pdf", "C:x", "x\u0000.pdf"])("rejeita %s", name => {
    expect(isSafeMediaFilename(name)).toBe(false);
    expect(isMediaPathOwnedBy(`org/conversation/${name}`, "org", "conversation")).toBe(false);
  });
  it.each(["out-abc.pdf", "foto.jpg", "áudio.ogg", "relatório final.docx"])("aceita %s", name => {
    expect(isMediaPathOwnedBy(`org/conversation/${name}`, "org", "conversation")).toBe(true);
    expect(isMediaPathOwnedBy(`other/conversation/${name}`, "org", "conversation")).toBe(false);
  });
});
