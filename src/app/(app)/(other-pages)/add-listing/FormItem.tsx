import { Description, Field, Label } from '@/shared/fieldset'
import React, { FC } from 'react'

interface FormItemProps {
  className?: string
  label?: string
  desccription?: string
  children?: React.ReactNode
}

const FormItem: FC<FormItemProps> = ({ children, className = '', label, desccription }) => {
  return (
    <Field className={className}>
      {label && <Label>{label}</Label>}
      <div className="mt-1">{children}</div>
      {desccription && <Description className="mt-3 block text-xs">{desccription}</Description>}
    </Field>
  )
}

export default FormItem
