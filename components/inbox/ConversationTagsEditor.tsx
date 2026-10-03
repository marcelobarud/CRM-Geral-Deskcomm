"use client";
import { TagAssignmentPicker } from "@/components/tags/TagAssignmentPicker";
export function ConversationTagsEditor({ conversationId }: { conversationId: string; orgId: string; tags: string[]; }) {
 return <TagAssignmentPicker kind="conversation" entityId={conversationId} />;
}
