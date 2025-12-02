import React, { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  sizeClass?: string
  fontClass?: string
  rounded?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      sizeClass = 'h-11 px-4 py-3',
      fontClass = 'sm:text-sm font-normal',
      rounded = 'rounded-2xl',
      children,
      type = 'text',
      ...args
    },
    ref
  ) => {
    return (
      <input
        ref={ref}
        type={type}
        className={`block w-full border-neutral-200 bg-white focus:border-primary-300 focus:ring-3 focus:ring-primary-200/50 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:ring-primary-600/25 ${rounded} ${fontClass} ${sizeClass} ${className}`}
        {...args}
      />
    )
  }
)

Input.displayName = 'Input'

export default Input
