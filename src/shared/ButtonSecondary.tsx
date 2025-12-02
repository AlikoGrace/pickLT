import React from 'react'
import { Button, ButtonProps } from './Button'

const ButtonSecondary: React.FC<ButtonProps> = ({ color, outline, plain, children, ...props }) => {
  return (
    <Button color="light" {...props}>
      {children}
    </Button>
  )
}

export default ButtonSecondary
