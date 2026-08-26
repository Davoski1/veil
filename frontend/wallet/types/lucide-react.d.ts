declare module 'lucide-react' {
  import type { ComponentType, SVGProps } from 'react'

  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: string | number
    strokeWidth?: string | number
  }
  export type LucideIcon = ComponentType<LucideProps>

  export const AlertCircle: LucideIcon
  export const ArrowUpDown: LucideIcon
  export const Check: LucideIcon
  export const ChevronLeft: LucideIcon
  export const Coins: LucideIcon
  export const Fingerprint: LucideIcon
  export const House: LucideIcon
  export const KeyRound: LucideIcon
  export const LockKeyhole: LucideIcon
  export const Plus: LucideIcon
  export const Settings: LucideIcon
  export const Share: LucideIcon
  export const ShieldCheck: LucideIcon
  export const Sparkles: LucideIcon
  export const SquarePlus: LucideIcon
  export const Trash2: LucideIcon
  export const X: LucideIcon
}
