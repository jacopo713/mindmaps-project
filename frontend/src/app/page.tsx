import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
              Brainstorming e mappe concettuali, insieme alla tua chat AI
            </h1>
            <p className="text-slate-600 mb-6">
              Crea mappe concettuali con collegamenti logici, genera idee, e aggiungi tutto
              al contesto della chat per conversazioni più informate e operative.
            </p>
            <div className="flex gap-3">
              <Link href="/chatbot" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Apri Chat</Link>
              <Link href="/mindmap" className="px-4 py-2 rounded bg-slate-900 hover:bg-black text-white text-sm font-medium">Apri Mappa</Link>
            </div>
          </div>
          <div className="border border-dashed border-gray-300 rounded-xl h-56 md:h-64 flex items-center justify-center text-slate-400">
            Anteprima semplice della mappa/ chat
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-16 grid md:grid-cols-3 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-1">Mappe concettuali con relazioni</h3>
          <p className="text-sm text-slate-600">
            Collega idee con relazioni causali e non-causali, con icone e colori dedicati.
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-1">Agenti per nodi iniziali</h3>
          <p className="text-sm text-slate-600">
            Definisci prompt/regole per un agente associato al nodo radice e ai suoi correlati.
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-1">Idee da brainstorming sempre nel contesto</h3>
          <p className="text-sm text-slate-600">
            Aggiungi le tue note/idee ai nodi per arricchire il contesto della chat in modo continuo.
          </p>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border border-gray-200 rounded-xl p-4">
          <div>
            <h4 className="font-semibold">Inizia ora</h4>
            <p className="text-sm text-slate-600">Crea una mappa o apri la chat e collega subito le tue idee.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/mindmap" className="px-4 py-2 rounded bg-slate-900 hover:bg-black text-white text-sm font-medium">Nuova Mappa</Link>
            <Link href="/chatbot" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Apri Chat</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
