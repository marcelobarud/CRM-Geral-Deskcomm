"use client";
import { TagAssignmentPicker } from "@/components/tags/TagAssignmentPicker";
export function ContactTagsEditor({ contactId }: { contactId: string; tags: string[]; }) {
 return <TagAssignmentPicker kind="contact" entityId={contactId} />;
}
