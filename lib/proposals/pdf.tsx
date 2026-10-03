import React from "react";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ProposalSnapshot } from "./contracts";
import { formatCommercialCents } from "@/lib/reports/commercial";
/** Só snapshot versionado: nenhum join mutável ou busca externa durante render. */
export async function renderProposalPdf(snapshot: ProposalSnapshot, number: number) {
  return renderToBuffer(
    <Document
      title={snapshot.title}
      author={snapshot.brand?.nome ?? ""}
      creationDate={new Date(snapshot.created_at)}
      modificationDate={new Date(snapshot.created_at)}
    >
      <Page size="A4" style={{ padding: 36, fontSize: 11, fontFamily: "Helvetica" }}>
        <Text style={{ fontSize: 18, marginBottom: 12 }}>{snapshot.brand?.nome}</Text>
        <Text>
          {snapshot.title} · v{number}
        </Text>
        <Text>{snapshot.context?.contact.name ?? ""}</Text>
        <Text>{snapshot.context?.company?.name ?? ""}</Text>
        <Text>{snapshot.context?.contact.email ?? ""}</Text>
        <Text>{snapshot.context?.contact.phone ?? ""}</Text>
        {snapshot.items.map((item, i) => (
          <View key={i} wrap={false} style={{ marginTop: 12 }}>
            <Text>{item.description}</Text>
            <Text>
              {item.quantity} × {formatCommercialCents(item.unit_price_cents, snapshot.currency)} ={" "}
              {formatCommercialCents(item.total_cents, snapshot.currency)}
            </Text>
          </View>
        ))}
        <Text style={{ marginTop: 20 }}>
          Total: {formatCommercialCents(snapshot.total_cents, snapshot.currency)}
        </Text>
        <Text style={{ marginTop: 16 }}>{snapshot.notes}</Text>
        <Text style={{ marginTop: 24, fontSize: 8 }}>
          Versão {number} · {snapshot.created_at} · Documento comercial. O registro de envio não
          comprova entrega.
        </Text>
      </Page>
    </Document>,
  );
}
