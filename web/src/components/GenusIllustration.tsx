export function GenusIllustration({ genus, className = 'w-16 h-16' }: { genus: string; className?: string }) {
  if (genus === 'Acacia') {
    return (
      <svg viewBox="0 0 100 100" className={`${className} text-amber-500 stroke-current stroke-2 fill-none opacity-85`}>
        <path d="M50 85 V30 M50 65 Q65 60 75 65 M50 50 Q30 45 20 50 M50 35 Q70 25 80 30 M50 75 Q35 70 25 75" />
        <circle cx="75" cy="65" r="4" className="fill-amber-400 stroke-none" />
        <circle cx="20" cy="50" r="4" className="fill-amber-400 stroke-none" />
        <circle cx="80" cy="30" r="4" className="fill-amber-400 stroke-none" />
      </svg>
    )
  }
  if (genus === 'Eucalyptus' || genus === 'Corymbia') {
    return (
      <svg viewBox="0 0 100 100" className={`${className} text-emerald-600 stroke-current stroke-2 fill-none opacity-85`}>
        <path d="M50 90 Q48 50 30 25 M30 25 C25 35 28 55 50 90 M50 90 Q52 45 70 20 M70 20 C75 30 72 50 50 90" />
      </svg>
    )
  }
  if (genus === 'Grevillea') {
    return (
      <svg viewBox="0 0 100 100" className={`${className} text-rose-500 stroke-current stroke-2 fill-none opacity-85`}>
        <path d="M50 88 V40" />
        <path d="M50 42 L28 22 M50 42 L38 18 M50 42 L50 14 M50 42 L62 18 M50 42 L72 22" />
        <circle cx="28" cy="22" r="2.5" className="fill-rose-400 stroke-none" />
        <circle cx="50" cy="14" r="2.5" className="fill-rose-400 stroke-none" />
        <circle cx="72" cy="22" r="2.5" className="fill-rose-400 stroke-none" />
      </svg>
    )
  }
  if (genus === 'Correa') {
    return (
      <svg viewBox="0 0 100 100" className={`${className} text-pink-600 stroke-current stroke-2 fill-none opacity-85`}>
        <path d="M50 88 V48" />
        <path d="M38 48 Q50 28 62 48" className="fill-pink-200/80" />
        <path d="M42 48 Q50 36 58 48" />
      </svg>
    )
  }
  if (genus === 'Westringia') {
    return (
      <svg viewBox="0 0 100 100" className={`${className} text-slate-500 stroke-current stroke-2 fill-none opacity-85`}>
        <path d="M50 88 V30" />
        <path d="M50 45 L30 38 M50 45 L70 38 M50 58 L32 55 M50 58 L68 55 M50 70 L35 72 M50 70 L65 72" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-teal-600 stroke-current stroke-2 fill-none opacity-85`}>
      <path d="M50 90 V20 M50 70 L70 60 M50 55 L30 45" />
    </svg>
  )
}
