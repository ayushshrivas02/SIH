import { toast as newToast } from '@/components/ui/toast';

export function useToast() {
  return {
    toast: (props: { title?: string; description?: string; variant?: string }) => {
      newToast.add({
        title: props.title,
        description: props.description,
        type: props.variant === 'destructive' ? 'error' : 'success'
      });
    }
  };
}
