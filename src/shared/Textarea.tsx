import React, { TextareaHTMLAttributes } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className = '', children, ...args }, ref) => {
  return (
    <textarea
      ref={ref}
      className={`block w-full rounded-2xl border-neutral-200 bg-white focus:border-primary-300 focus:ring-3 focus:ring-primary-200/50 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:focus:ring-primary-600/25 ${className}`}
      rows={4}
      {...args}
    >
      {children}
    </textarea>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
