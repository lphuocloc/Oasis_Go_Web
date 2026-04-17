import * as React from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost'
type ButtonSize = 'default' | 'sm' | 'icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
    default: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    secondary: 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    destructive: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100'
}

const sizeClasses: Record<ButtonSize, string> = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    icon: 'h-10 w-10'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:pointer-events-none disabled:opacity-60',
                variantClasses[variant],
                sizeClasses[size],
                className
            )}
            {...props}
        />
    )
)

Button.displayName = 'Button'

export { Button }
