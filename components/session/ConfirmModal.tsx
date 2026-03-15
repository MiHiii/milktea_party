'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'destructive'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Huỷ',
  variant = 'primary',
  isLoading = false
}: ConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-white/10 bg-slate-900 p-6 backdrop-blur-xl">
        <DialogHeader className="flex flex-col items-center gap-4 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${variant === 'destructive' ? 'bg-rose-500/20 text-rose-500' : 'bg-sky-500/20 text-sky-500'}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
          <p className="text-sm text-white/60 leading-relaxed">
            {description}
          </p>
        </DialogHeader>
        <DialogFooter className="flex flex-row gap-3 mt-6">
          <Button 
            variant="ghost" 
            className="flex-1 rounded-2xl h-12 text-white/40 border border-white/5 hover:bg-white/5" 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button 
            className={`flex-1 rounded-2xl h-12 font-bold uppercase tracking-wider ${variant === 'destructive' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
