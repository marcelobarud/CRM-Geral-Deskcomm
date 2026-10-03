"use client";
import { useTags } from "@/hooks/tags/useTags";
import { presentTags } from "@/lib/tags/presentation";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/hooks/i18n/useT";
export function TagBadges({ tags, maxVisible }: { tags: string[]; maxVisible?: number }) {
  const query = useTags();
  const t = useT();
  if (!tags.length) return null;
  if (query.isError)
    return (
      <span className="text-xs" title={t("Não foi possível carregar tags.")}>
        {t("Tags indisponíveis")}
      </span>
    );
  if (!query.data) return <span className="text-xs">{t("Carregando tags…")}</span>;
  const canonical = presentTags(tags, query.data);
  const visible = maxVisible === undefined ? canonical : canonical.slice(0, maxVisible);
  return (
    <>
      {visible.map((tag) => (
        <Badge
          key={tag.id}
          variant="neutral"
          className="max-w-full gap-1 break-words whitespace-normal"
        >
          {tag.color && (
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: tag.color }}
            />
          )}
          {tag.name}
        </Badge>
      ))}
      {canonical.length > visible.length && (
        <span className="text-xs">+{canonical.length - visible.length}</span>
      )}
    </>
  );
}
