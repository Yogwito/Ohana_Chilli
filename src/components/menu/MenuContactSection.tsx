const contactItems = [
  { label: 'WhatsApp', value: 'WhatsApp pendiente' },
  { label: 'Instagram', value: 'Instagram pendiente' },
  { label: 'Direccion', value: 'Direccion pendiente' },
  { label: 'Horarios', value: 'Horarios pendientes' },
  { label: 'Entrega esperada', value: 'Entrega esperada pendiente' },
];

export default function MenuContactSection() {
  return (
    <section id="contacto-menu" className="rounded-[2rem] border bg-card p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Contacto</p>
        <h2 className="mt-2 text-2xl font-bold">Datos listos para completar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La seccion final quedo preparada con placeholders para WhatsApp, Instagram, direccion, horarios y tiempo de entrega.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {contactItems.map((item) => (
          <article key={item.label} className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-sm font-medium">{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
