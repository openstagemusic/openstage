import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminMessagesPanel from "@/components/admin/AdminMessagesPanel";
import Link from "@/components/i18n/LocaleLink";
import { isCurrentUserAdmin } from "@/lib/claims/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { listAdminAssignees, listContactMessages, listContactReplies } from "@/lib/messages/queries";

/**
 * I messaggi del modulo contatti, visti dall'admin.
 *
 * La pagina è separata dalla coda di moderazione perché sono due lavori
 * diversi: uno decide cosa entra in piattaforma, l'altro risponde alle persone.
 * Chi non è admin riceve un 404, come per tutte le pagine di moderazione.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return {
    title: dict.admin.messagesTitle,
    description: dict.admin.messagesSubtitle,
    robots: { index: false, follow: false },
  };
}

export default async function AdminMessagesPage() {
  if (!(await isCurrentUserAdmin())) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const [messages, replies, admins] = await Promise.all([
    listContactMessages(),
    listContactReplies(),
    listAdminAssignees(),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/admin" className="text-sm text-muted transition-colors hover:text-white">
        ← {dict.admin.title}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
        {dict.admin.messagesTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{dict.admin.messagesSubtitle}</p>

      <AdminMessagesPanel
        messages={messages}
        replies={replies}
        admins={admins}
        dict={dict.admin}
        topics={dict.pages.contact.topics}
      />
    </main>
  );
}
