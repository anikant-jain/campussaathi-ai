import * as Primitive from '@radix-ui/react-dialog';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';

export const Dialog=Primitive.Root;
export const DialogTitle=Primitive.Title;
export const DialogClose=Primitive.Close;

export const DialogContent=forwardRef<ElementRef<typeof Primitive.Content>,ComponentPropsWithoutRef<typeof Primitive.Content>>(
  ({children,className,...props},ref)=><Primitive.Portal>
    <Primitive.Overlay className="dialog-overlay"/>
    <Primitive.Content ref={ref} className={['dialog',className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Primitive.Content>
  </Primitive.Portal>,
);
DialogContent.displayName='DialogContent';

