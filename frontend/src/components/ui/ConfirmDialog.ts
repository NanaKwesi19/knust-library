import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/classNames';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const colors = {
    danger: 'bg-rose-800',
    warning: 'bg-amber-700',
  };

  return React.createElement(
    AnimatePresence,
    null,
    isOpen &&
      React.createElement(
        React.Fragment,
        null,
        React.createElement(motion.div, {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          className: 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm',
          onClick: onClose,
        }),
        React.createElement(
          'div',
          {
            className:
              'fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none',
          },
          React.createElement(
            motion.div,
            {
              initial: { opacity: 0, scale: 0.95 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 0.95 },
              transition: { duration: 0.2 },
              className:
                'bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md pointer-events-auto overflow-hidden',
            },
            React.createElement(
              'div',
              {
                className: cn(
                  'px-6 py-4 flex items-center gap-2 text-white',
                  colors[variant]
                ),
              },
              React.createElement(AlertTriangle, {
                className: 'w-4 h-4 text-amber-300 shrink-0',
              }),
              React.createElement(
                'h4',
                { className: 'text-xs font-bold uppercase tracking-wider' },
                title
              )
            ),
            React.createElement(
              'div',
              { className: 'p-6 space-y-4' },
              React.createElement(
                'p',
                {
                  className:
                    'text-xs text-slate-600 leading-relaxed font-medium',
                },
                description
              ),
              React.createElement(
                'div',
                { className: 'flex justify-end gap-3 pt-2' },
                React.createElement(
                  Button,
                  {
                    variant: 'ghost',
                    size: 'sm',
                    onClick: onClose,
                    disabled: isLoading,
                  },
                  cancelText
                ),
                React.createElement(
                  Button,
                  {
                    variant: variant === 'danger' ? 'danger' : 'primary',
                    size: 'sm',
                    onClick: onConfirm,
                    isLoading: isLoading,
                  },
                  confirmText
                )
              )
            )
          )
        )
      )
  );
};